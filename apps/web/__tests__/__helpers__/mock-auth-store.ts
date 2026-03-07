import { vi } from 'vitest';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MockUser {
  id: string;
  name: string;
  email: string;
  tier: 'free' | 'premium' | 'pro';
  is_verified: boolean;
  has_2fa: boolean;
  created_at: string;
}

interface MockAuthStoreState {
  user: MockUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requires2FA: boolean;
  challengeToken: string | null;
  error: string | null;
  _tokenExpiresAt: number | null;
  login: ReturnType<typeof vi.fn>;
  login2FA: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  refreshTokens: ReturnType<typeof vi.fn>;
  forgotPassword: ReturnType<typeof vi.fn>;
  resetPassword: ReturnType<typeof vi.fn>;
  verifyEmail: ReturnType<typeof vi.fn>;
  fetchProfile: ReturnType<typeof vi.fn>;
  updateProfile: ReturnType<typeof vi.fn>;
  changePassword: ReturnType<typeof vi.fn>;
  deleteAccount: ReturnType<typeof vi.fn>;
  getSessions: ReturnType<typeof vi.fn>;
  revokeSession: ReturnType<typeof vi.fn>;
  revokeAllSessions: ReturnType<typeof vi.fn>;
  resendVerification: ReturnType<typeof vi.fn>;
  setup2FA: ReturnType<typeof vi.fn>;
  verify2FA: ReturnType<typeof vi.fn>;
  disable2FA: ReturnType<typeof vi.fn>;
  getGoogleOAuthUrl: ReturnType<typeof vi.fn>;
  googleCallback: ReturnType<typeof vi.fn>;
  clearError: ReturnType<typeof vi.fn>;
}

// ─── Default user fixture ────────────────────────────────────────────────────

const DEFAULT_USER: MockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  tier: 'free' as const,
  is_verified: true,
  has_2fa: false,
  created_at: '2025-01-01T00:00:00Z',
};

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates a mock module for `@/lib/stores/auth-store`.
 *
 * The mock implements the Zustand selector pattern used throughout the codebase:
 *   `useAuthStore: (selector) => selector(state)`
 *
 * It also provides `getState()` and `setState()` on the store function,
 * matching the Zustand API shape expected by components.
 *
 * @param overrides - Optional partial state to override defaults. Can include
 *   custom user data, loading states, error messages, or action mocks.
 * @returns A mock module object suitable for `vi.mock('@/lib/stores/auth-store', () => ...)`.
 *
 * @example
 * // Basic usage — unauthenticated state
 * vi.mock('@/lib/stores/auth-store', () => mockAuthStoreFactory());
 *
 * @example
 * // Authenticated user with custom data
 * vi.mock('@/lib/stores/auth-store', () => mockAuthStoreFactory({
 *   user: { id: 'u2', name: 'Jane', email: 'jane@test.com', tier: 'premium' as const },
 *   isAuthenticated: true,
 * }));
 *
 * @example
 * // Access the state for per-test mutations
 * const { storeState } = mockAuthStoreFactory();
 * // In beforeEach: storeState.isLoading = true;
 */
export function mockAuthStoreFactory(overrides?: Partial<MockAuthStoreState>) {
  const storeState: MockAuthStoreState = {
    user: { ...DEFAULT_USER },
    token: 'mock-token',
    isAuthenticated: true,
    isLoading: false,
    requires2FA: false,
    challengeToken: null,
    error: null,
    _tokenExpiresAt: null,
    login: vi.fn().mockResolvedValue({ success: true }),
    login2FA: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue({ success: true }),
    refreshTokens: vi.fn().mockResolvedValue(undefined),
    forgotPassword: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    verifyEmail: vi.fn().mockResolvedValue(undefined),
    fetchProfile: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    changePassword: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    getSessions: vi.fn().mockResolvedValue([]),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    revokeAllSessions: vi.fn().mockResolvedValue(undefined),
    resendVerification: vi.fn().mockResolvedValue(undefined),
    setup2FA: vi.fn().mockResolvedValue({ qrCode: 'mock-qr', secret: 'mock-secret' }),
    verify2FA: vi.fn().mockResolvedValue(undefined),
    disable2FA: vi.fn().mockResolvedValue(undefined),
    getGoogleOAuthUrl: vi.fn().mockResolvedValue({ authorizationUrl: 'https://accounts.google.com/o/oauth2', state: 'mock-state' }),
    googleCallback: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
    ...overrides,
  };

  return {
    useAuthStore: Object.assign(
      (selector: (state: MockAuthStoreState) => unknown) => selector(storeState),
      {
        getState: () => storeState,
        setState: vi.fn((partial: Partial<MockAuthStoreState>) => {
          Object.assign(storeState, partial);
        }),
      },
    ),
    /** Exposed for per-test state mutations in beforeEach */
    storeState,
  };
}
