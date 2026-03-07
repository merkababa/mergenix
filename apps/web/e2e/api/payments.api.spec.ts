/**
 * API Contract Tests — Payment Endpoints
 *
 * These tests use Playwright's APIRequestContext (`request` fixture)
 * to verify the backend payments API contract without a browser.
 *
 * Backend endpoints under test:
 * - POST /payments/checkout — Create a Stripe checkout session (requires auth)
 *
 * The actual endpoint path is /payments/checkout (not /payments/create-checkout-session).
 * The accepted tier values are "premium" and "pro" per the CreateCheckoutRequest schema.
 *
 * @see docs/PHASE_8C_PLAN.md section 3.23
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';

// ── Configuration ────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Log in as a test user and return the access token.
 */
async function getAccessToken(
  request: import('@playwright/test').APIRequestContext,
  user: { email: string; password: string },
): Promise<string> {
  const loginResponse = await request.post(`${API_BASE}/auth/login`, {
    data: {
      email: user.email,
      password: user.password,
    },
  });

  if (loginResponse.status() !== 200) {
    const errorBody = await loginResponse.text();
    throw new Error(`Failed to log in as ${user.email}: ${loginResponse.status()} ${errorBody}`);
  }

  const body = await loginResponse.json();
  return body.access_token;
}

// ── P2: Payment API Contract Tests ───────────────────────────────────────

test.describe('Payments API Contract — P2', () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_LIVE_API, 'Requires running backend (set E2E_LIVE_API=1)');
  });

  test('1. POST /payments/checkout requires auth (401 without token)', async ({ request }) => {
    // Attempt to create a checkout session WITHOUT an Authorization header
    const response = await request.post(`${API_BASE}/payments/checkout`, {
      data: {
        tier: 'premium',
      },
    });

    // Should return 401 Unauthorized — the endpoint requires a valid token
    expect(response.status()).toBe(401);

    const body = await response.json();

    // Response should contain an error indication
    const detail = body.detail ?? body;
    expect(detail).toBeDefined();

    // Should NOT contain checkout URL or session ID
    expect(body).not.toHaveProperty('checkout_url');
    expect(body).not.toHaveProperty('session_id');
  });

  test('2. POST /payments/checkout rejects invalid tier (400)', async ({ request }) => {
    // First, obtain a valid access token
    const accessToken = await getAccessToken(request, TEST_USERS.free);

    // Attempt to create a checkout session with an invalid tier value.
    // The CreateCheckoutRequest schema only accepts "premium" or "pro".
    // Sending an invalid tier like "platinum" should fail validation.
    const response = await request.post(`${API_BASE}/payments/checkout`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        tier: 'platinum',
      },
    });

    // Should return 400 Bad Request or 422 Unprocessable Entity
    // (Pydantic validation errors return 422 in FastAPI)
    expect([400, 422]).toContain(response.status());

    const body = await response.json();

    // Response should indicate a validation or input error
    const detail = body.detail ?? body;
    expect(detail).toBeDefined();

    // Should NOT return a checkout URL since the tier is invalid
    expect(body).not.toHaveProperty('checkout_url');
    expect(body).not.toHaveProperty('session_id');
  });
});
