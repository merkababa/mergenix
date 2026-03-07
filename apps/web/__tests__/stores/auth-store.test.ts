import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock the base HTTP client (must be before auth-store import) ──────────
vi.mock('@/lib/api/client', () => ({
  setTokenAccessor: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
      public code = 'UNKNOWN',
      public fieldErrors: any[] = [],
      public challengeToken?: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// ── Mock the auth client ──────────────────────────────────────────────────
const mockLogin = vi.fn();
const mockLogin2FA = vi.fn();
const mockRegister = vi.fn();
const mockLogout = vi.fn();
const mockRefreshTokens = vi.fn();
const mockGetProfile = vi.fn();
const mockUpdateProfile = vi.fn();
const mockChangePassword = vi.fn();
const mockForgotPassword = vi.fn();
const mockResetPassword = vi.fn();
const mockVerifyEmail = vi.fn();
const mockResendVerification = vi.fn();
const mockSetup2FA = vi.fn();
const mockVerify2FA = vi.fn();
const mockDisable2FA = vi.fn();
const mockGetGoogleOAuthUrl = vi.fn();
const mockGoogleCallback = vi.fn();
const mockGetSessions = vi.fn();
const mockRevokeSession = vi.fn();
const mockRevokeAllSessions = vi.fn();
const mockDeleteAccount = vi.fn();

vi.mock('@/lib/api/auth-client', () => ({
  login: (...args: any[]) => mockLogin(...args),
  login2FA: (...args: any[]) => mockLogin2FA(...args),
  register: (...args: any[]) => mockRegister(...args),
  logout: (...args: any[]) => mockLogout(...args),
  refreshTokens: (...args: any[]) => mockRefreshTokens(...args),
  getProfile: (...args: any[]) => mockGetProfile(...args),
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
  changePassword: (...args: any[]) => mockChangePassword(...args),
  forgotPassword: (...args: any[]) => mockForgotPassword(...args),
  resetPassword: (...args: any[]) => mockResetPassword(...args),
  verifyEmail: (...args: any[]) => mockVerifyEmail(...args),
  resendVerification: (...args: any[]) => mockResendVerification(...args),
  setup2FA: (...args: any[]) => mockSetup2FA(...args),
  verify2FA: (...args: any[]) => mockVerify2FA(...args),
  disable2FA: (...args: any[]) => mockDisable2FA(...args),
  getGoogleOAuthUrl: (...args: any[]) => mockGetGoogleOAuthUrl(...args),
  googleCallback: (...args: any[]) => mockGoogleCallback(...args),
  getSessions: (...args: any[]) => mockGetSessions(...args),
  revokeSession: (...args: any[]) => mockRevokeSession(...args),
  revokeAllSessions: (...args: any[]) => mockRevokeAllSessions(...args),
  deleteAccount: (...args: any[]) => mockDeleteAccount(...args),
}));

import { useAuthStore } from '@/lib/stores/auth-store';

// ── Fixtures ──────────────────────────────────────────────────────────────

const mockTokens = { accessToken: 'access-123', expiresIn: 3600 };
const mockProfile = {
  id: 'u1',
  email: 'test@example.com',
  name: 'Test User',
  tier: 'free' as const,
  emailVerified: true,
  totpEnabled: false,
  createdAt: '2024-01-01T00:00:00Z',
};

// ── Helpers ───────────────────────────────────────────────────────────────

function resetStore() {
  useAuthStore.setState({
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

// ── Tests ─────────────────────────────────────────────────────────────────

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
    // Reset document.cookie for indicator cookie tests
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  // ── Initial state ─────────────────────────────────────────────────────

  describe('initial state', () => {
    it('has null user', () => {
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('has null token', () => {
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('isAuthenticated is false', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('isLoading is false', () => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('requires2FA is false', () => {
      expect(useAuthStore.getState().requires2FA).toBe(false);
    });

    it('error is null', () => {
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('challengeToken is null', () => {
      expect(useAuthStore.getState().challengeToken).toBeNull();
    });
  });

  // ── login ─────────────────────────────────────────────────────────────

  describe('login', () => {
    it('sets token and user on successful login', async () => {
      mockLogin.mockResolvedValue({ success: true, tokens: mockTokens });
      mockGetProfile.mockResolvedValue(mockProfile);

      const result = await useAuthStore.getState().login('test@example.com', 'password');

      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
      expect(result).toEqual({ success: true, tokens: mockTokens });
      const state = useAuthStore.getState();
      expect(state.token).toBe('access-123');
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockProfile);
      expect(state.isLoading).toBe(false);
    });

    it('sets indicator cookie on successful login', async () => {
      mockLogin.mockResolvedValue({ success: true, tokens: mockTokens });
      mockGetProfile.mockResolvedValue(mockProfile);

      await useAuthStore.getState().login('test@example.com', 'password', true);

      expect(document.cookie).toContain('mergenix_logged_in=1');
      expect(document.cookie).toContain('max-age=604800');
    });

    it('sets session-scoped cookie when rememberMe is false', async () => {
      mockLogin.mockResolvedValue({ success: true, tokens: mockTokens });
      mockGetProfile.mockResolvedValue(mockProfile);

      await useAuthStore.getState().login('test@example.com', 'password', false);

      expect(document.cookie).toContain('mergenix_logged_in=1');
      expect(document.cookie).not.toContain('max-age=604800');
    });

    it('returns requires2FA when 2FA is needed', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        requires2FA: true,
        challengeToken: 'challenge-abc',
      });

      const result = await useAuthStore.getState().login('test@example.com', 'password');

      expect(result).toEqual({
        success: false,
        requires2FA: true,
        challengeToken: 'challenge-abc',
      });
      const state = useAuthStore.getState();
      expect(state.requires2FA).toBe(true);
      expect(state.challengeToken).toBe('challenge-abc');
      expect(state.isLoading).toBe(false);
    });

    it('sets error and throws on failure', async () => {
      const error = new Error('Invalid credentials');
      mockLogin.mockRejectedValue(error);

      await expect(useAuthStore.getState().login('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials',
      );

      const state = useAuthStore.getState();
      expect(state.error).toBe('Invalid credentials');
      expect(state.isLoading).toBe(false);
    });

    it('sets generic error message for non-Error throws', async () => {
      mockLogin.mockRejectedValue('string error');

      await expect(useAuthStore.getState().login('test@example.com', 'pw')).rejects.toBe(
        'string error',
      );

      expect(useAuthStore.getState().error).toBe('Login failed');
    });
  });

  // ── login2FA ──────────────────────────────────────────────────────────

  describe('login2FA', () => {
    it('completes 2FA login with challenge token', async () => {
      // Set up 2FA challenge state
      useAuthStore.setState({ requires2FA: true, challengeToken: 'challenge-abc' });
      mockLogin2FA.mockResolvedValue(mockTokens);
      mockGetProfile.mockResolvedValue(mockProfile);

      await useAuthStore.getState().login2FA('123456');

      expect(mockLogin2FA).toHaveBeenCalledWith('challenge-abc', '123456');
      const state = useAuthStore.getState();
      expect(state.token).toBe('access-123');
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockProfile);
      expect(state.requires2FA).toBe(false);
      expect(state.challengeToken).toBeNull();
    });

    it('throws when no challenge token is set', async () => {
      await expect(useAuthStore.getState().login2FA('123456')).rejects.toThrow(
        'No 2FA challenge in progress',
      );
    });

    it('sets error on 2FA failure', async () => {
      useAuthStore.setState({ requires2FA: true, challengeToken: 'c-1' });
      mockLogin2FA.mockRejectedValue(new Error('Invalid code'));

      await expect(useAuthStore.getState().login2FA('000000')).rejects.toThrow('Invalid code');

      expect(useAuthStore.getState().error).toBe('Invalid code');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // ── register ──────────────────────────────────────────────────────────

  describe('register', () => {
    it('calls authClient.register and sets isLoading during call', async () => {
      let loadingDuringCall = false;
      mockRegister.mockImplementation(async () => {
        loadingDuringCall = useAuthStore.getState().isLoading;
        return 'Check your email';
      });

      await useAuthStore.getState().register('Test', 'test@example.com', 'Password123!');

      expect(mockRegister).toHaveBeenCalledWith('Test', 'test@example.com', 'Password123!');
      expect(loadingDuringCall).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error and throws on failure', async () => {
      mockRegister.mockRejectedValue(new Error('Email already exists'));

      await expect(
        useAuthStore.getState().register('Test', 'dup@example.com', 'Pw'),
      ).rejects.toThrow('Email already exists');

      expect(useAuthStore.getState().error).toBe('Email already exists');
    });
  });

  // ── logout ────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('calls authClient.logout and clears all state', async () => {
      useAuthStore.setState({
        user: mockProfile,
        token: 'tok',
        isAuthenticated: true,
      });
      mockLogout.mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      expect(mockLogout).toHaveBeenCalled();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('clears indicator cookie on logout', async () => {
      document.cookie = 'mergenix_logged_in=1; path=/';
      mockLogout.mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      expect(document.cookie).toContain('max-age=0');
    });

    it('still clears state even if API logout fails', async () => {
      useAuthStore.setState({
        user: mockProfile,
        token: 'tok',
        isAuthenticated: true,
      });
      mockLogout.mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ── refreshTokens ─────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('updates token on successful refresh', async () => {
      useAuthStore.setState({ user: mockProfile, token: 'old' });
      mockRefreshTokens.mockResolvedValue({ accessToken: 'new-tok', expiresIn: 7200 });

      await useAuthStore.getState().refreshTokens();

      expect(useAuthStore.getState().token).toBe('new-tok');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toEqual(mockProfile);
    });

    it('clears all auth state on refresh failure', async () => {
      useAuthStore.setState({
        user: mockProfile,
        token: 'old',
        isAuthenticated: true,
      });
      mockRefreshTokens.mockRejectedValue(new Error('Refresh failed'));

      await expect(useAuthStore.getState().refreshTokens()).rejects.toThrow('Refresh failed');

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('re-fetches user profile after token refresh to pick up tier changes', async () => {
      // Start with a "free" user
      useAuthStore.setState({
        user: { ...mockProfile, tier: 'free' as const },
        token: 'old-tok',
        isAuthenticated: true,
      });

      // Simulate a successful token refresh
      mockRefreshTokens.mockResolvedValue({ accessToken: 'refreshed-tok', expiresIn: 7200 });

      // Simulate the profile now returning "pro" (e.g. user upgraded tier in DB)
      mockGetProfile.mockResolvedValue({ ...mockProfile, tier: 'pro' as const });

      await useAuthStore.getState().refreshTokens();

      // Regression: getProfile MUST be called after refresh to pick up tier changes
      expect(mockGetProfile).toHaveBeenCalled();
      expect(useAuthStore.getState().user?.tier).toBe('pro');
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('calls authClient.forgotPassword and resets loading', async () => {
      mockForgotPassword.mockResolvedValue(undefined);

      await useAuthStore.getState().forgotPassword('user@example.com');

      expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockForgotPassword.mockRejectedValue(new Error('User not found'));

      await expect(useAuthStore.getState().forgotPassword('no@example.com')).rejects.toThrow(
        'User not found',
      );

      expect(useAuthStore.getState().error).toBe('User not found');
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('calls authClient.resetPassword', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      await useAuthStore.getState().resetPassword('reset-tok', 'NewPassword123!');

      expect(mockResetPassword).toHaveBeenCalledWith('reset-tok', 'NewPassword123!');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockResetPassword.mockRejectedValue(new Error('Token expired'));

      await expect(useAuthStore.getState().resetPassword('bad', 'pw')).rejects.toThrow(
        'Token expired',
      );

      expect(useAuthStore.getState().error).toBe('Token expired');
    });
  });

  // ── verifyEmail ───────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('calls authClient.verifyEmail', async () => {
      mockVerifyEmail.mockResolvedValue(undefined);

      await useAuthStore.getState().verifyEmail('verify-tok');

      expect(mockVerifyEmail).toHaveBeenCalledWith('verify-tok');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockVerifyEmail.mockRejectedValue(new Error('Invalid token'));

      await expect(useAuthStore.getState().verifyEmail('bad')).rejects.toThrow('Invalid token');

      expect(useAuthStore.getState().error).toBe('Invalid token');
    });
  });

  // ── updateProfile ─────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('calls authClient.updateProfile and updates user', async () => {
      const updatedProfile = { ...mockProfile, name: 'New Name' };
      mockUpdateProfile.mockResolvedValue(updatedProfile);

      await useAuthStore.getState().updateProfile({ name: 'New Name' });

      expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'New Name' });
      expect(useAuthStore.getState().user).toEqual(updatedProfile);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockUpdateProfile.mockRejectedValue(new Error('Profile update failed'));

      await expect(useAuthStore.getState().updateProfile({ name: 'X' })).rejects.toThrow(
        'Profile update failed',
      );

      expect(useAuthStore.getState().error).toBe('Profile update failed');
    });
  });

  // ── changePassword ────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('calls authClient.changePassword', async () => {
      mockChangePassword.mockResolvedValue(undefined);

      await useAuthStore.getState().changePassword('old-pw', 'NewPassword123!');

      expect(mockChangePassword).toHaveBeenCalledWith('old-pw', 'NewPassword123!');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockChangePassword.mockRejectedValue(new Error('Wrong current password'));

      await expect(useAuthStore.getState().changePassword('wrong', 'new')).rejects.toThrow(
        'Wrong current password',
      );

      expect(useAuthStore.getState().error).toBe('Wrong current password');
    });
  });

  // ── deleteAccount ─────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('calls authClient.deleteAccount and clears state', async () => {
      useAuthStore.setState({
        user: mockProfile,
        token: 'tok',
        isAuthenticated: true,
      });
      mockDeleteAccount.mockResolvedValue(undefined);

      await useAuthStore.getState().deleteAccount('my-password');

      expect(mockDeleteAccount).toHaveBeenCalledWith('my-password');
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('sets error on failure', async () => {
      mockDeleteAccount.mockRejectedValue(new Error('Wrong password'));

      await expect(useAuthStore.getState().deleteAccount('bad-pw')).rejects.toThrow(
        'Wrong password',
      );

      expect(useAuthStore.getState().error).toBe('Wrong password');
    });
  });

  // ── resendVerification ────────────────────────────────────────────────

  describe('resendVerification', () => {
    it('calls authClient.resendVerification', async () => {
      mockResendVerification.mockResolvedValue(undefined);

      await useAuthStore.getState().resendVerification('test@example.com');

      expect(mockResendVerification).toHaveBeenCalledWith('test@example.com');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // ── Sessions ──────────────────────────────────────────────────────────

  describe('getSessions', () => {
    it('returns sessions from authClient', async () => {
      const sessions = [
        {
          id: 's1',
          device: 'Chrome',
          ip: '1.2.3.4',
          location: 'US',
          lastActive: '2024-01-01',
          isCurrent: true,
        },
      ];
      mockGetSessions.mockResolvedValue(sessions);

      const result = await useAuthStore.getState().getSessions();

      expect(result).toEqual(sessions);
    });
  });

  describe('revokeSession', () => {
    it('calls authClient.revokeSession with id', async () => {
      mockRevokeSession.mockResolvedValue(undefined);

      await useAuthStore.getState().revokeSession('sess-1');

      expect(mockRevokeSession).toHaveBeenCalledWith('sess-1');
    });
  });

  describe('revokeAllSessions', () => {
    it('calls authClient.revokeAllSessions', async () => {
      mockRevokeAllSessions.mockResolvedValue(undefined);

      await useAuthStore.getState().revokeAllSessions();

      expect(mockRevokeAllSessions).toHaveBeenCalled();
    });
  });

  // ── 2FA setup/verify/disable ──────────────────────────────────────────

  describe('setup2FA', () => {
    it('returns qrUri and secret', async () => {
      mockSetup2FA.mockResolvedValue({ secret: 'ABCDE', qrUri: 'otpauth://...' });

      const result = await useAuthStore.getState().setup2FA();

      expect(result).toEqual({ secret: 'ABCDE', qrUri: 'otpauth://...' });
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockSetup2FA.mockRejectedValue(new Error('2FA setup failed'));

      await expect(useAuthStore.getState().setup2FA()).rejects.toThrow('2FA setup failed');
      expect(useAuthStore.getState().error).toBe('2FA setup failed');
    });
  });

  describe('verify2FA', () => {
    it('returns backup codes and refetches profile', async () => {
      mockVerify2FA.mockResolvedValue({ backupCodes: ['code1', 'code2'] });
      const updatedProfile = { ...mockProfile, totpEnabled: true };
      mockGetProfile.mockResolvedValue(updatedProfile);

      const result = await useAuthStore.getState().verify2FA('123456');

      expect(result).toEqual({ backupCodes: ['code1', 'code2'] });
      expect(useAuthStore.getState().user).toEqual(updatedProfile);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockVerify2FA.mockRejectedValue(new Error('Invalid TOTP'));

      await expect(useAuthStore.getState().verify2FA('000000')).rejects.toThrow('Invalid TOTP');
      expect(useAuthStore.getState().error).toBe('Invalid TOTP');
    });
  });

  describe('disable2FA', () => {
    it('disables 2FA and refetches profile', async () => {
      mockDisable2FA.mockResolvedValue(undefined);
      const updatedProfile = { ...mockProfile, totpEnabled: false };
      mockGetProfile.mockResolvedValue(updatedProfile);

      await useAuthStore.getState().disable2FA('123456');

      expect(mockDisable2FA).toHaveBeenCalledWith('123456');
      expect(useAuthStore.getState().user).toEqual(updatedProfile);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockDisable2FA.mockRejectedValue(new Error('Wrong code'));

      await expect(useAuthStore.getState().disable2FA('bad')).rejects.toThrow('Wrong code');
      expect(useAuthStore.getState().error).toBe('Wrong code');
    });
  });

  // ── Google OAuth ──────────────────────────────────────────────────────

  describe('getGoogleOAuthUrl', () => {
    it('returns URL and state', async () => {
      mockGetGoogleOAuthUrl.mockResolvedValue({
        authorizationUrl: 'https://accounts.google.com/o/oauth2/auth?...',
        state: 'rand-state',
      });

      const result = await useAuthStore.getState().getGoogleOAuthUrl();

      expect(result).toEqual({
        authorizationUrl: 'https://accounts.google.com/o/oauth2/auth?...',
        state: 'rand-state',
      });
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockGetGoogleOAuthUrl.mockRejectedValue(new Error('OAuth unavailable'));

      await expect(useAuthStore.getState().getGoogleOAuthUrl()).rejects.toThrow(
        'OAuth unavailable',
      );
      expect(useAuthStore.getState().error).toBe('OAuth unavailable');
    });
  });

  describe('googleCallback', () => {
    it('sets auth state and fetches profile', async () => {
      mockGoogleCallback.mockResolvedValue(mockTokens);
      mockGetProfile.mockResolvedValue(mockProfile);

      await useAuthStore.getState().googleCallback('auth-code', 'state-val');

      expect(mockGoogleCallback).toHaveBeenCalledWith('auth-code', 'state-val');
      const state = useAuthStore.getState();
      expect(state.token).toBe('access-123');
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockProfile);
    });

    it('sets error on failure', async () => {
      mockGoogleCallback.mockRejectedValue(new Error('OAuth login failed'));

      await expect(useAuthStore.getState().googleCallback('bad', 'state')).rejects.toThrow(
        'OAuth login failed',
      );

      expect(useAuthStore.getState().error).toBe('OAuth login failed');
    });
  });

  // ── fetchProfile ──────────────────────────────────────────────────────

  describe('fetchProfile', () => {
    it('updates user on success', async () => {
      mockGetProfile.mockResolvedValue(mockProfile);

      await useAuthStore.getState().fetchProfile();

      expect(useAuthStore.getState().user).toEqual(mockProfile);
    });

    it('silently fails on error (does not throw)', async () => {
      mockGetProfile.mockRejectedValue(new Error('Unauthorized'));

      // Should not throw
      await useAuthStore.getState().fetchProfile();

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  // ── clearError ────────────────────────────────────────────────────────

  describe('clearError', () => {
    it('sets error to null', () => {
      useAuthStore.setState({ error: 'some error' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
