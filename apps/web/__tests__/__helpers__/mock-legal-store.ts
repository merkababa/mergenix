import { vi } from 'vitest';

// ─── Types ───────────────────────────────────────────────────────────────────

type CookieConsentStatus = 'pending' | 'accepted_all' | 'essential_only' | 'custom';

interface MockLegalStoreState {
  cookieConsent: CookieConsentStatus;
  analyticsEnabled: boolean;
  marketingEnabled: boolean;
  ageVerified: boolean;
  geneticDataConsentGiven: boolean;
  partnerConsentGiven: boolean;
  chipLimitationAcknowledged: boolean;
  consentWithdrawn: boolean;
  consents: unknown[];
  isLoading: boolean;
  error: string | null;
  acceptAllCookies: ReturnType<typeof vi.fn>;
  acceptEssentialOnly: ReturnType<typeof vi.fn>;
  updateCookiePrefs: ReturnType<typeof vi.fn>;
  verifyAge: ReturnType<typeof vi.fn>;
  syncAgeVerification: ReturnType<typeof vi.fn>;
  setGeneticDataConsent: ReturnType<typeof vi.fn>;
  setPartnerConsent: ReturnType<typeof vi.fn>;
  setChipLimitationAcknowledged: ReturnType<typeof vi.fn>;
  resetPartnerConsent: ReturnType<typeof vi.fn>;
  withdrawGeneticConsent: ReturnType<typeof vi.fn>;
  reGrantGeneticConsent: ReturnType<typeof vi.fn>;
  recordConsent: ReturnType<typeof vi.fn>;
  flushPendingConsents: ReturnType<typeof vi.fn>;
  loadConsents: ReturnType<typeof vi.fn>;
  loadCookiePreferences: ReturnType<typeof vi.fn>;
  clearError: ReturnType<typeof vi.fn>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates a mock module for `@/lib/stores/legal-store`.
 *
 * The mock implements the Zustand selector pattern used throughout the codebase:
 *   `useLegalStore: (selector) => selector(state)`
 *
 * It also provides `getState()` and `setState()` on the store function,
 * matching the Zustand API shape expected by components.
 *
 * @param overrides - Optional partial state to override defaults.
 * @returns A mock module object suitable for `vi.mock('@/lib/stores/legal-store', () => ...)`.
 *
 * @example
 * // Basic usage
 * vi.mock('@/lib/stores/legal-store', () => mockLegalStoreFactory());
 *
 * @example
 * // With analytics enabled
 * vi.mock('@/lib/stores/legal-store', () => mockLegalStoreFactory({
 *   analyticsEnabled: true,
 *   cookieConsent: 'accepted_all',
 * }));
 *
 * @example
 * // Access state for per-test mutations
 * const { storeState } = mockLegalStoreFactory();
 * // In beforeEach: storeState.geneticDataConsentGiven = false;
 */
export function mockLegalStoreFactory(overrides?: Partial<MockLegalStoreState>) {
  const storeState: MockLegalStoreState = {
    cookieConsent: 'pending',
    analyticsEnabled: false,
    marketingEnabled: false,
    ageVerified: false,
    geneticDataConsentGiven: true,
    partnerConsentGiven: false,
    chipLimitationAcknowledged: false,
    consentWithdrawn: false,
    consents: [],
    isLoading: false,
    error: null,
    acceptAllCookies: vi.fn().mockResolvedValue(undefined),
    acceptEssentialOnly: vi.fn().mockResolvedValue(undefined),
    updateCookiePrefs: vi.fn().mockResolvedValue(undefined),
    verifyAge: vi.fn(),
    syncAgeVerification: vi.fn().mockResolvedValue(undefined),
    setGeneticDataConsent: vi.fn(),
    setPartnerConsent: vi.fn(),
    setChipLimitationAcknowledged: vi.fn(),
    resetPartnerConsent: vi.fn(),
    withdrawGeneticConsent: vi.fn(),
    reGrantGeneticConsent: vi.fn(),
    recordConsent: vi.fn().mockResolvedValue(undefined),
    flushPendingConsents: vi.fn().mockResolvedValue(undefined),
    loadConsents: vi.fn().mockResolvedValue(undefined),
    loadCookiePreferences: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
    ...overrides,
  };

  return {
    useLegalStore: Object.assign(
      (selector: (state: MockLegalStoreState) => unknown) => selector(storeState),
      {
        getState: () => storeState,
        setState: vi.fn((partial: Partial<MockLegalStoreState>) => {
          Object.assign(storeState, partial);
        }),
      },
    ),
    /** Exposed for per-test state mutations in beforeEach */
    storeState,
  };
}
