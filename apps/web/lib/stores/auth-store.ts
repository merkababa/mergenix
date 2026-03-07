'use client';

import { create } from 'zustand';
import { setTokenAccessor, setUnauthorizedHandler } from '@/lib/api/client';
import * as authClient from '@/lib/api/auth-client';
import { extractErrorMessage } from '@/lib/utils/extract-error';
import { useLegalStore } from '@/lib/stores/legal-store';
import type {
  LoginResult,
  UserProfile,
  Session,
  TwoFactorSetupResponse,
  TwoFactorEnabledResponse,
  GoogleOAuthUrlResponse,
} from '@/lib/api/auth-client';

// ── Indicator cookie helpers ─────────────────────────────────────────────
// The actual refresh token is sent as an httpOnly cookie by the backend.
// We only set a lightweight "logged in" indicator that the middleware can
// check (contains no sensitive data).

const INDICATOR_COOKIE = 'mergenix_logged_in';

function setIndicatorCookie(persistent: boolean): void {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const parts = [`${INDICATOR_COOKIE}=1`, 'path=/', 'SameSite=Strict'];
  if (persistent) {
    parts.push('max-age=604800'); // 7 days
  }
  // When persistent is false, omit max-age for a session-scoped cookie
  if (secure) parts.push('Secure');
  document.cookie = parts.join('; ');
}

function clearIndicatorCookie(): void {
  document.cookie = `${INDICATOR_COOKIE}=; path=/; max-age=0`;
}

// ── Auth Store State & Actions ──────────────────────────────────────────

interface AuthState {
  /** Current user profile, null if not authenticated */
  user: UserProfile | null;
  /** Access token kept in memory (never persisted to storage) */
  token: string | null;
  /** Derived: true when user and token are present */
  isAuthenticated: boolean;
  /** True during any async auth operation */
  isLoading: boolean;
  /** True when login succeeded but 2FA code is required */
  requires2FA: boolean;
  /** Opaque challenge token for completing 2FA login */
  challengeToken: string | null;
  /** Current error message, null when no error */
  error: string | null;
  /** Access token expiry timestamp (ms since epoch) */
  _tokenExpiresAt: number | null;

  // ── Async actions ───────────────────────────────────────────────────

  /** Log in with email/password. Returns result indicating success or 2FA.
   *  When rememberMe is true (default), the indicator cookie persists 7 days.
   *  When false, the indicator cookie is session-scoped. */
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResult>;
  /** Complete 2FA login with TOTP code. */
  login2FA: (code: string) => Promise<void>;
  /** Register a new account. */
  register: (name: string, email: string, password: string) => Promise<void>;
  /** Log out — revoke refresh token and clear all state. */
  logout: () => Promise<void>;
  /** Refresh the access/refresh token pair. */
  refreshTokens: () => Promise<void>;
  /** Request a password reset email. */
  forgotPassword: (email: string) => Promise<void>;
  /** Complete password reset with token and new password. */
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  /** Verify email with verification token. */
  verifyEmail: (token: string) => Promise<void>;
  /** Update user profile fields. */
  updateProfile: (data: { name?: string }) => Promise<void>;
  /** Change password (requires current password). */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Delete the user's account. Requires password confirmation. */
  deleteAccount: (password: string) => Promise<void>;
  /** Get all active sessions. */
  getSessions: () => Promise<Session[]>;
  /** Revoke a specific session. */
  revokeSession: (id: string) => Promise<void>;
  /** Revoke all sessions except current. */
  revokeAllSessions: () => Promise<void>;
  /** Resend verification email. */
  resendVerification: (email: string) => Promise<void>;
  /** Start 2FA setup — returns QR URI and secret. */
  setup2FA: () => Promise<TwoFactorSetupResponse>;
  /** Verify TOTP code to finalize 2FA enrollment — returns backup codes. */
  verify2FA: (code: string) => Promise<TwoFactorEnabledResponse>;
  /** Disable 2FA (requires TOTP code for confirmation). */
  disable2FA: (code: string) => Promise<void>;
  /** Get Google OAuth authorization URL and state. */
  getGoogleOAuthUrl: () => Promise<GoogleOAuthUrlResponse>;
  /** Complete Google OAuth flow with authorization code. */
  googleCallback: (code: string, state: string) => Promise<void>;
  /** Fetch and update the current user's profile. */
  fetchProfile: () => Promise<void>;
  /** Clear the current error. */
  clearError: () => void;
}

/** Compute token expiry timestamp from expiresIn (seconds). */
function computeExpiry(expiresIn: number): number {
  // Subtract 60 seconds buffer for pre-expiry refresh
  return Date.now() + (expiresIn - 60) * 1000;
}

export const useAuthStore = create<AuthState>()((set, get) => {
  // ── Helper to set tokens and user after successful auth ─────────────
  function setAuthState(
    tokens: { accessToken: string; expiresIn: number },
    user?: UserProfile | null,
    persistent = true,
  ) {
    setIndicatorCookie(persistent);
    set({
      token: tokens.accessToken,
      _tokenExpiresAt: computeExpiry(tokens.expiresIn),
      isAuthenticated: true,
      isLoading: false,
      requires2FA: false,
      challengeToken: null,
      error: null,
      ...(user !== undefined ? { user } : {}),
    });
  }

  function clearAuthState() {
    clearIndicatorCookie();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      requires2FA: false,
      challengeToken: null,
      error: null,
      _tokenExpiresAt: null,
    });
  }

  // Register token accessor for the base HTTP client
  setTokenAccessor(() => get().token);
  setUnauthorizedHandler(async () => {
    try {
      await get().refreshTokens();
      return true;
    } catch {
      return false;
    }
  });

  return {
    // ── Initial state ───────────────────────────────────────────────────
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    requires2FA: false,
    challengeToken: null,
    error: null,
    _tokenExpiresAt: null,

    // ── Actions ─────────────────────────────────────────────────────────

    login: async (email, password, rememberMe = true) => {
      set({ isLoading: true, error: null });
      try {
        const result = await authClient.login(email, password);
        if (result.success) {
          setAuthState(result.tokens, undefined, rememberMe);
          // Fetch full profile after login
          const profile = await authClient.getProfile();
          set({ user: profile });
          // Sync age verification audit trail (fire-and-forget)
          useLegalStore.getState().syncAgeVerification();
          return result;
        }
        // 2FA required
        set({
          isLoading: false,
          requires2FA: true,
          challengeToken: result.challengeToken,
        });
        return result;
      } catch (error) {
        const message = extractErrorMessage(error, 'Login failed');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    login2FA: async (code) => {
      const { challengeToken } = get();
      if (!challengeToken) {
        throw new Error('No 2FA challenge in progress');
      }
      set({ isLoading: true, error: null });
      try {
        const tokens = await authClient.login2FA(challengeToken, code);
        setAuthState(tokens);
        const profile = await authClient.getProfile();
        set({ user: profile });
        // Sync age verification audit trail (fire-and-forget)
        useLegalStore.getState().syncAgeVerification();
      } catch (error) {
        const message = extractErrorMessage(error, '2FA verification failed');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    register: async (name, email, password) => {
      set({ isLoading: true, error: null });
      try {
        await authClient.register(name, email, password);
        set({ isLoading: false });
      } catch (error) {
        const message = extractErrorMessage(error, 'Registration failed');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    logout: async () => {
      try {
        // Backend reads refresh token from httpOnly cookie
        await authClient.logout();
      } catch {
        // Logout API failure is non-critical — clear state anyway
      } finally {
        clearAuthState();
      }
    },

    refreshTokens: async () => {
      // The refresh token is sent automatically as an httpOnly cookie
      // via credentials: "include". We don't access it from JS.
      try {
        const tokens = await authClient.refreshTokens();
        setAuthState(tokens, get().user);
        // Re-fetch profile so tier changes propagate within one refresh cycle
        const profile = await authClient.getProfile();
        set({ user: profile });
      } catch (error) {
        clearAuthState();
        throw error;
      }
    },

    forgotPassword: async (email) => {
      set({ isLoading: true, error: null });
      try {
        await authClient.forgotPassword(email);
        set({ isLoading: false });
      } catch (error) {
        const message = extractErrorMessage(error, 'Failed to send reset email');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    resetPassword: async (token, newPassword) => {
      set({ isLoading: true, error: null });
      try {
        await authClient.resetPassword(token, newPassword);
        set({ isLoading: false });
      } catch (error) {
        const message = extractErrorMessage(error, 'Password reset failed');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    verifyEmail: async (token) => {
      set({ isLoading: true, error: null });
      try {
        await authClient.verifyEmail(token);
        set({ isLoading: false });
      } catch (error) {
        const message = extractErrorMessage(error, 'Email verification failed');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    updateProfile: async (data) => {
      set({ isLoading: true, error: null });
      try {
        const profile = await authClient.updateProfile(data);
        set({ user: profile, isLoading: false });
      } catch (error) {
        const message = extractErrorMessage(error, 'Profile update failed');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    changePassword: async (currentPassword, newPassword) => {
      set({ isLoading: true, error: null });
      try {
        await authClient.changePassword(currentPassword, newPassword);
        set({ isLoading: false });
      } catch (error) {
        const message = extractErrorMessage(error, 'Password change failed');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    deleteAccount: async (password) => {
      set({ isLoading: true, error: null });
      try {
        await authClient.deleteAccount(password);
        clearAuthState();
      } catch (error) {
        const message = extractErrorMessage(error, 'Account deletion failed');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    getSessions: async () => {
      const sessions = await authClient.getSessions();
      return sessions;
    },

    revokeSession: async (id) => {
      await authClient.revokeSession(id);
    },

    revokeAllSessions: async () => {
      await authClient.revokeAllSessions();
    },

    resendVerification: async (email) => {
      set({ isLoading: true, error: null });
      try {
        await authClient.resendVerification(email);
        set({ isLoading: false });
      } catch (error) {
        const message = extractErrorMessage(error, 'Failed to resend verification email');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    setup2FA: async () => {
      set({ isLoading: true, error: null });
      try {
        const result = await authClient.setup2FA();
        set({ isLoading: false });
        return result;
      } catch (error) {
        const message = extractErrorMessage(error, '2FA setup failed');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    verify2FA: async (code) => {
      set({ isLoading: true, error: null });
      try {
        const result = await authClient.verify2FA(code);
        // Update user profile to reflect 2FA enabled
        const profile = await authClient.getProfile();
        set({ user: profile, isLoading: false });
        return result;
      } catch (error) {
        const message = extractErrorMessage(error, '2FA verification failed');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    disable2FA: async (code) => {
      set({ isLoading: true, error: null });
      try {
        await authClient.disable2FA(code);
        // Update user profile to reflect 2FA disabled
        const profile = await authClient.getProfile();
        set({ user: profile, isLoading: false });
      } catch (error) {
        const message = extractErrorMessage(error, 'Failed to disable 2FA');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    getGoogleOAuthUrl: async () => {
      set({ isLoading: true, error: null });
      try {
        const result = await authClient.getGoogleOAuthUrl();
        set({ isLoading: false });
        return result;
      } catch (error) {
        const message = extractErrorMessage(error, 'Failed to get OAuth URL');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    googleCallback: async (code, state) => {
      set({ isLoading: true, error: null });
      try {
        const tokens = await authClient.googleCallback(code, state);
        setAuthState(tokens);
        const profile = await authClient.getProfile();
        set({ user: profile });
        // Sync age verification audit trail (fire-and-forget)
        useLegalStore.getState().syncAgeVerification();
      } catch (error) {
        const message = extractErrorMessage(error, 'OAuth login failed');
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    fetchProfile: async () => {
      try {
        const profile = await authClient.getProfile();
        set({ user: profile });
      } catch {
        // Silent failure — user may not be authenticated
      }
    },

    clearError: () => set({ error: null }),
  };
});
