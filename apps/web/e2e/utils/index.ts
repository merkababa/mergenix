/**
 * Barrel export for all E2E utility modules.
 */

export {
  loginViaUI,
  loginProgrammatically,
  registerNewUser,
  loginWith2FAViaUI,
  registerProgrammatically,
} from './auth.utils';

export {
  DEMO_EXPECTED,
  GOLDEN_EXPECTED,
  TIER_LIMITS,
  ROUTES,
  RESULT_TAB_NAMES,
  NAV_LINK_LABELS,
} from './test-data';

export {
  API_BASE,
  mockAuthMe,
  mockConsentSync,
  mockLogout,
  mockSessions,
  mockRevokeSession,
  mockTokenResponse,
  mockUpdateProfile,
  mockChangePassword,
  mock2FASetup,
  mock2FAVerify,
  mock2FADisable,
  mockDataExport,
  mockDeleteAccount,
  mockPaymentHistory,
  mockSubscriptionStatus,
  mockCreateCheckout,
  setupAuthenticatedPage,
} from './mock-api.utils';

export type { AuthMeOverrides } from './mock-api.utils';
