import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRefreshTokens = vi.fn();
const mockLogout = vi.fn();
let mockTokenExpiresAt: number | null = null;
let mockIsAuthenticated = false;

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: (selector: (state: any) => any) => {
    const state = {
      refreshTokens: mockRefreshTokens,
      logout: mockLogout,
      _tokenExpiresAt: mockTokenExpiresAt,
      isAuthenticated: mockIsAuthenticated,
    };
    return selector(state);
  },
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { AuthProvider, useAuth } from '../../components/providers/auth-provider';

// ─── Test helper ─────────────────────────────────────────────────────────────

function TestChild() {
  const { isHydrated } = useAuth();
  return <div data-testid="hydrated">{isHydrated ? 'yes' : 'no'}</div>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockTokenExpiresAt = null;
    mockIsAuthenticated = false;
    mockRefreshTokens.mockResolvedValue(undefined);
    mockLogout.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls refreshTokens on mount', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestChild />
        </AuthProvider>,
      );
    });

    expect(mockRefreshTokens).toHaveBeenCalledTimes(1);
  });

  it('isHydrated=false initially, then true after refresh resolves', async () => {
    let resolveRefresh!: () => void;
    mockRefreshTokens.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    await act(async () => {
      render(
        <AuthProvider>
          <TestChild />
        </AuthProvider>,
      );
    });

    // Before resolution, isHydrated is false
    expect(screen.getByTestId('hydrated').textContent).toBe('no');

    // Resolve the promise
    await act(async () => {
      resolveRefresh();
    });

    expect(screen.getByTestId('hydrated').textContent).toBe('yes');
  });

  it('isHydrated=true even if refresh fails', async () => {
    mockRefreshTokens.mockRejectedValue(new Error('No refresh token'));

    await act(async () => {
      render(
        <AuthProvider>
          <TestChild />
        </AuthProvider>,
      );
    });

    // Should still set hydrated to true after catch
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('hydrated').textContent).toBe('yes');
  });

  it('children rendered with auth context', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <div data-testid="child">Hello Auth</div>
        </AuthProvider>,
      );
    });

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello Auth')).toBeInTheDocument();
  });

  it('when authenticated + tokenExpiresAt set: schedules refresh timer', async () => {
    mockIsAuthenticated = true;
    mockTokenExpiresAt = Date.now() + 120_000; // 2 minutes from now

    await act(async () => {
      render(
        <AuthProvider>
          <TestChild />
        </AuthProvider>,
      );
    });

    // Clear the initial refresh call count
    mockRefreshTokens.mockClear();

    // Advance time to trigger the scheduled refresh
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    // The scheduled refresh timer should have fired
    expect(mockRefreshTokens).toHaveBeenCalled();
  });

  it('when authenticated: idle timer triggers logout after 15 minutes', async () => {
    mockIsAuthenticated = true;

    await act(async () => {
      render(
        <AuthProvider>
          <TestChild />
        </AuthProvider>,
      );
    });

    mockLogout.mockClear();

    // Advance just under 15 minutes — logout should NOT have fired yet
    await act(async () => {
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    });

    expect(mockLogout).not.toHaveBeenCalled();

    // Advance past the 15-minute mark — idle timeout fires
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    });

    expect(mockLogout).toHaveBeenCalled();
  });

  it('cleanup: timers cleared on unmount', async () => {
    mockIsAuthenticated = true;
    mockTokenExpiresAt = Date.now() + 60_000;

    let unmount: () => void;
    await act(async () => {
      const result = render(
        <AuthProvider>
          <TestChild />
        </AuthProvider>,
      );
      unmount = result.unmount;
    });

    // Unmount the provider
    act(() => {
      unmount();
    });

    // Clear mocks after unmount
    mockRefreshTokens.mockClear();
    mockLogout.mockClear();

    // Advance time — no timers should fire
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    // Neither refresh nor logout should have been called after unmount
    expect(mockRefreshTokens).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('when not authenticated: no idle/absolute timers set', async () => {
    mockIsAuthenticated = false;

    await act(async () => {
      render(
        <AuthProvider>
          <TestChild />
        </AuthProvider>,
      );
    });

    mockLogout.mockClear();

    // Advance well past idle timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20 * 60 * 1000);
    });

    // Logout should not have been called (not authenticated = no timers)
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
