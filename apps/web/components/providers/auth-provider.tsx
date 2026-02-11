"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

// ── Constants ────────────────────────────────────────────────────────────

/** Idle timeout: log out after 15 minutes of no activity. */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

/** Absolute session timeout: log out after 8 hours regardless of activity. */
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000;

/** Throttle activity tracking to avoid excessive event handling. */
const ACTIVITY_THROTTLE_MS = 30_000;

// ── Context ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Whether the initial hydration attempt has completed. */
  isHydrated: boolean;
}

const AuthContext = createContext<AuthContextValue>({ isHydrated: false });

/** Hook to access the auth context (hydration state). */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

// ── Provider ────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — handles token hydration on mount and automatic
 * token refresh before expiry.
 *
 * Wrap this around the app in the root layout. It:
 * 1. On mount, attempts to restore the session by refreshing tokens
 *    using the httpOnly refresh token cookie (sent by browser automatically).
 * 2. Schedules automatic refresh 60 seconds before the access token
 *    expires (using the _tokenExpiresAt state).
 * 3. Provides `isHydrated` so pages can show a loading skeleton until
 *    the auth state is known.
 * 4. Tracks user activity and logs out after 15 min idle or 8 hr absolute.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const absoluteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const refreshTokens = useAuthStore((s) => s.refreshTokens);
  const logout = useAuthStore((s) => s.logout);
  const tokenExpiresAt = useAuthStore((s) => s._tokenExpiresAt);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Hydration: attempt token refresh on mount ──────────────────────
  useEffect(() => {
    let cancelled = false;
    // Try to restore session from httpOnly refresh token cookie
    refreshTokens()
      .catch(() => {
        // No valid refresh token — user stays logged out
      })
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTokens]);

  // ── Auto-refresh: schedule refresh before token expiry ─────────────
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!tokenExpiresAt || !isAuthenticated) return;

    const msUntilRefresh = tokenExpiresAt - Date.now();

    if (msUntilRefresh <= 0) {
      // Token already expired or about to — refresh immediately
      refreshTokens().catch(() => {
        // Refresh failed — user will be redirected by middleware
      });
      return;
    }

    refreshTimerRef.current = setTimeout(() => {
      refreshTokens().catch(() => {
        // Refresh failed
      });
    }, msUntilRefresh);
  }, [tokenExpiresAt, isAuthenticated, refreshTokens]);

  useEffect(() => {
    scheduleRefresh();
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [scheduleRefresh]);

  // ── Idle timeout: log out after 15 min of no activity ──────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      logout();
    }, IDLE_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear timers when not authenticated
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (absoluteTimerRef.current) clearTimeout(absoluteTimerRef.current);
      sessionStartRef.current = null;
      return;
    }

    // Start absolute session timer
    if (!sessionStartRef.current) {
      sessionStartRef.current = Date.now();
    }
    const elapsed = Date.now() - sessionStartRef.current;
    const remaining = ABSOLUTE_TIMEOUT_MS - elapsed;
    if (remaining <= 0) {
      logout();
      return;
    }
    absoluteTimerRef.current = setTimeout(() => {
      logout();
    }, remaining);

    // Start idle timer
    resetIdleTimer();

    // Throttled activity listener
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityRef.current = now;
      resetIdleTimer();
    };

    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("scroll", onActivity);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (absoluteTimerRef.current) clearTimeout(absoluteTimerRef.current);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("scroll", onActivity);
    };
  }, [isAuthenticated, logout, resetIdleTimer]);

  return (
    <AuthContext.Provider value={{ isHydrated }}>
      {children}
    </AuthContext.Provider>
  );
}
