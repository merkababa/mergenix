/**
 * Predefined test user accounts for E2E tests.
 *
 * Passwords are read from environment variables via requireEnv().
 * In CI, missing env vars cause a hard error (no fallbacks).
 * In local development, fallback defaults are used for convenience.
 * The corresponding accounts must be seeded in the E2E database
 * before the test suite runs (see apps/api/app/scripts/seed_e2e_data.py).
 */

export interface TestUser {
  email: string;
  password: string;
  tier: 'free' | 'premium' | 'pro';
  name?: string;
  totpSecret?: string;
}

/**
 * Read a required environment variable, with an optional fallback
 * that is only used in local development (non-CI) environments.
 * In CI, the env var MUST be set — otherwise this throws.
 */
function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key];
  if (val) return val;
  if (fallback && !process.env.CI) return fallback;
  throw new Error(
    `Missing required environment variable: ${key}. ` + 'Set it in your .env file or CI secrets.',
  );
}

// Default passwords are for LOCAL development only.
// In CI, all passwords MUST come from environment variables.
// Call validateTestUserEnv() in global setup to enforce this.
export const TEST_USERS: Record<string, TestUser> = {
  free: {
    email: 'free@test.mergenix.com',
    password: requireEnv('E2E_FREE_PASSWORD', 'TestPass123!Free'),
    tier: 'free',
    name: 'Free User',
  },
  premium: {
    email: 'premium@test.mergenix.com',
    password: requireEnv('E2E_PREMIUM_PASSWORD', 'TestPass123!Premium'),
    tier: 'premium',
    name: 'Premium User',
  },
  pro: {
    email: 'pro@test.mergenix.com',
    password: requireEnv('E2E_PRO_PASSWORD', 'TestPass123!Pro'),
    tier: 'pro',
    name: 'Pro User',
  },
  with2fa: {
    email: '2fa@test.mergenix.com',
    password: requireEnv('E2E_2FA_PASSWORD', 'TestPass123!2FA'),
    tier: 'free',
    name: '2FA User',
    totpSecret: requireEnv('E2E_2FA_TOTP_SECRET', 'JBSWY3DPEHPK3PXP'),
  },
  unverified: {
    email: 'unverified@test.mergenix.com',
    password: requireEnv('E2E_UNVERIFIED_PASSWORD', 'TestPass123!Unverified'),
    tier: 'free',
    name: 'Unverified User',
  },
  lockout: {
    email: 'lockout@test.mergenix.com',
    password: requireEnv('E2E_LOCKOUT_PASSWORD', 'TestPass123!Lockout'),
    tier: 'free',
    name: 'Lockout User',
  },
} satisfies Record<string, TestUser>;

/**
 * Validate that all required E2E environment variables are set.
 * Call this in CI to ensure no default passwords are used.
 */
export function validateTestUserEnv(): void {
  if (process.env.CI) {
    const required = [
      'E2E_FREE_PASSWORD',
      'E2E_PREMIUM_PASSWORD',
      'E2E_PRO_PASSWORD',
      'E2E_2FA_PASSWORD',
      'E2E_UNVERIFIED_PASSWORD',
      'E2E_LOCKOUT_PASSWORD',
    ];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required E2E environment variables in CI: ${missing.join(', ')}. ` +
          'Default passwords must not be used in CI environments.',
      );
    }
  }
}

// Eagerly validate in CI to fail fast if env vars are missing.
if (process.env.CI) {
  validateTestUserEnv();
}
