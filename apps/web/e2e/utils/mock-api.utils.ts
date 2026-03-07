/**
 * Shared mock API helpers for E2E tests.
 *
 * These functions set up page.route() interceptors that mock backend API
 * responses, allowing E2E tests to run against the Next.js frontend without
 * requiring a live FastAPI backend.
 *
 * Used by: account.spec.ts, subscription.spec.ts, and any future spec files
 * that need mocked authenticated state.
 */

import type { Page } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';

// ── Constants ────────────────────────────────────────────────────────────

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ── Auth Overrides Type ──────────────────────────────────────────────────

export interface AuthMeOverrides {
  id?: string;
  email?: string;
  name?: string;
  tier?: string;
  totp_enabled?: boolean;
}

// ── Auth Mocks ───────────────────────────────────────────────────────────

/**
 * Mock the auth/me endpoint to return an authenticated user.
 */
export async function mockAuthMe(page: Page, overrides?: Partial<AuthMeOverrides>): Promise<void> {
  await page.route(`${API_BASE}/auth/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: overrides?.id ?? 'user-001',
        email: overrides?.email ?? TEST_USERS.free.email,
        name: overrides?.name ?? 'Free User',
        tier: overrides?.tier ?? 'free',
        email_verified: true,
        totp_enabled: overrides?.totp_enabled ?? false,
        created_at: '2025-01-01T00:00:00Z',
      }),
    });
  });
}

/**
 * Mock the consent sync endpoint.
 */
export async function mockConsentSync(page: Page): Promise<void> {
  await page.route(`${API_BASE}/auth/consents/**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

/**
 * Mock the logout endpoint.
 */
export async function mockLogout(page: Page): Promise<void> {
  await page.route(`${API_BASE}/auth/logout`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Logged out' }),
    });
  });
}

// ── Session Mocks ────────────────────────────────────────────────────────

/**
 * Mock the sessions endpoint with test data.
 * Handles both GET (list sessions) and DELETE (revoke all sessions).
 */
export async function mockSessions(page: Page, sessions?: unknown[]): Promise<void> {
  await page.route(`${API_BASE}/auth/sessions`, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          sessions ?? [
            {
              id: 'session-current',
              device: 'Chrome on Windows',
              ip: '192.168.1.1',
              location: 'New York, US',
              lastActive: new Date().toISOString(),
              isCurrent: true,
            },
            {
              id: 'session-other',
              device: 'Safari on iPhone',
              ip: '192.168.1.2',
              location: 'San Francisco, US',
              lastActive: new Date(Date.now() - 3600_000).toISOString(),
              isCurrent: false,
            },
          ],
        ),
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'All sessions revoked' }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock the revoke session endpoint.
 */
export async function mockRevokeSession(page: Page): Promise<void> {
  await page.route(`${API_BASE}/auth/sessions/*`, async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Session revoked' }),
      });
    } else {
      await route.continue();
    }
  });
}

// ── Profile Mocks ────────────────────────────────────────────────────────

/**
 * Mock the profile update endpoint.
 */
export async function mockUpdateProfile(page: Page): Promise<void> {
  await page.route(`${API_BASE}/auth/profile`, async (route) => {
    if (route.request().method() === 'PATCH' || route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-001',
          email: TEST_USERS.free.email,
          name: body?.name ?? 'Updated Name',
          tier: 'free',
          email_verified: true,
          totp_enabled: false,
          created_at: '2025-01-01T00:00:00Z',
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock the change password endpoint.
 */
export async function mockChangePassword(page: Page, shouldSucceed = true): Promise<void> {
  await page.route(`${API_BASE}/auth/password`, async (route) => {
    if (shouldSucceed) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Password updated successfully' }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: { error: 'Current password is incorrect', code: 'INVALID_PASSWORD' },
        }),
      });
    }
  });
}

// ── 2FA Mocks ────────────────────────────────────────────────────────────

/**
 * Mock the 2FA setup endpoint.
 */
export async function mock2FASetup(page: Page): Promise<void> {
  await page.route(`${API_BASE}/auth/2fa/setup`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        secret: 'JBSWY3DPEHPK3PXP',
        qr_code_url:
          'otpauth://totp/Mergenix:test@test.com?secret=JBSWY3DPEHPK3PXP&issuer=Mergenix',
        backup_codes: [
          'ABCD-1234',
          'EFGH-5678',
          'IJKL-9012',
          'MNOP-3456',
          'QRST-7890',
          'UVWX-2345',
          'YZAB-6789',
          'CDEF-0123',
        ],
      }),
    });
  });
}

/**
 * Mock the 2FA enable (verify) endpoint.
 */
export async function mock2FAVerify(page: Page): Promise<void> {
  await page.route(`${API_BASE}/auth/2fa/verify`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: '2FA enabled successfully' }),
    });
  });
}

/**
 * Mock the 2FA disable endpoint.
 */
export async function mock2FADisable(page: Page): Promise<void> {
  await page.route(`${API_BASE}/auth/2fa/disable`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: '2FA disabled successfully' }),
    });
  });
}

// ── Data & Account Mocks ─────────────────────────────────────────────────

/**
 * Mock the data export endpoint.
 */
export async function mockDataExport(page: Page): Promise<void> {
  await page.route(`${API_BASE}/legal/export`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {
          id: 'user-001',
          email: TEST_USERS.free.email,
          name: 'Free User',
          tier: 'free',
        },
        consents: [],
        payments: [],
        exported_at: new Date().toISOString(),
      }),
    });
  });
}

/**
 * Mock the delete account endpoint.
 */
export async function mockDeleteAccount(page: Page, shouldSucceed = true): Promise<void> {
  await page.route(`${API_BASE}/auth/account`, async (route) => {
    if (route.request().method() === 'DELETE') {
      if (shouldSucceed) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Account deleted' }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: { error: 'Incorrect password', code: 'INVALID_PASSWORD' },
          }),
        });
      }
    } else {
      await route.continue();
    }
  });
}

// ── Payment Mocks ────────────────────────────────────────────────────────

/**
 * Mock the payment history endpoint.
 */
export async function mockPaymentHistory(page: Page, payments?: unknown[]): Promise<void> {
  await page.route(`${API_BASE}/payments/history`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payments ?? []),
    });
  });
}

/**
 * Mock the subscription status endpoint.
 */
export async function mockSubscriptionStatus(
  page: Page,
  status?: Partial<{
    tier: string;
    isActive: boolean;
    purchaseDate: string;
  }>,
): Promise<void> {
  await page.route(`${API_BASE}/payments/status`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tier: status?.tier ?? 'free',
        isActive: status?.isActive ?? false,
        purchaseDate: status?.purchaseDate ?? null,
      }),
    });
  });
}

/**
 * Mock the Stripe checkout session creation endpoint.
 * Returns a fake checkout URL that we can intercept.
 */
export async function mockCreateCheckout(page: Page, tier = 'premium'): Promise<void> {
  await page.route(`${API_BASE}/payments/checkout`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkoutUrl: `https://checkout.stripe.com/pay/mock_session_${tier}`,
        sessionId: `cs_mock_${tier}_${Date.now()}`,
      }),
    });
  });
}

// ── Token Helpers ─────────────────────────────────────────────────────────

/**
 * Build a mock token response matching the backend shape.
 */
export function mockTokenResponse(
  overrides?: Partial<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>,
) {
  return {
    access_token: overrides?.access_token ?? 'mock-access-token-xyz',
    refresh_token: overrides?.refresh_token ?? 'mock-refresh-token-xyz',
    token_type: 'bearer',
    expires_in: overrides?.expires_in ?? 3600,
  };
}

// ── Page Setup Helpers ───────────────────────────────────────────────────

/**
 * Set up a fully mocked authenticated page for account tests.
 * Injects tokens via localStorage so the auth store considers the user authenticated.
 * Also sets up session mocks (needed for the account page).
 */
export async function setupAuthenticatedPage(
  page: Page,
  userOverrides?: Partial<{
    email: string;
    name: string;
    tier: string;
    totp_enabled: boolean;
  }>,
): Promise<void> {
  // Inject auth tokens into localStorage before navigation
  await page.addInitScript(() => {
    window.localStorage.setItem('mergenix_access_token', 'mock-access-token');
    window.localStorage.setItem('mergenix_refresh_token', 'mock-refresh-token');
  });

  // Set up API mocks
  await mockAuthMe(page, userOverrides);
  await mockConsentSync(page);
  await mockSessions(page);
}
