/**
 * API Contract Tests — Authentication Endpoints
 *
 * These tests use Playwright's APIRequestContext (`request` fixture)
 * to verify the backend auth API contract without a browser.
 * Each test validates the HTTP status code and response shape.
 *
 * Backend endpoints under test:
 * - POST /auth/login      — Authenticate with email and password
 * - GET  /auth/me         — Get current user profile
 * - POST /auth/register   — Create a new account
 *
 * @see docs/PHASE_8C_PLAN.md section 3.22
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';

// ── Configuration ────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Generate a unique email for register tests to avoid collision
 * with previously-seeded test accounts.
 */
function uniqueEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `e2e-register-${timestamp}-${random}@test.mergenix.com`;
}

// ── P1: Auth API Contract Tests ──────────────────────────────────────────

test.describe('Auth API Contract — P1', () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_LIVE_API, 'Requires running backend (set E2E_LIVE_API=1)');
  });

  test('1. POST /auth/login returns token for valid credentials', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: TEST_USERS.free.email,
        password: TEST_USERS.free.password,
      },
    });

    // Should return 200 OK
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Response must contain an access_token string
    expect(body).toHaveProperty('access_token');
    expect(typeof body.access_token).toBe('string');
    expect(body.access_token.length).toBeGreaterThan(0);

    // Response must contain token_type
    expect(body).toHaveProperty('token_type');
    expect(body.token_type).toBe('bearer');

    // Response must contain expires_in (number of seconds)
    expect(body).toHaveProperty('expires_in');
    expect(typeof body.expires_in).toBe('number');
    expect(body.expires_in).toBeGreaterThan(0);

    // The response may also set a refresh_token httpOnly cookie.
    // Verify the Set-Cookie header is present.
    const setCookie = response.headers()['set-cookie'] ?? '';
    if (setCookie) {
      // If a cookie is set, it should be the refresh token with httpOnly
      expect(setCookie).toContain('refresh_token');
      expect(setCookie.toLowerCase()).toContain('httponly');
    }
  });

  test('2. GET /auth/me with valid token returns user data', async ({ request }) => {
    // First, obtain a valid access token by logging in
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: TEST_USERS.free.email,
        password: TEST_USERS.free.password,
      },
    });

    expect(loginResponse.status()).toBe(200);
    const loginBody = await loginResponse.json();
    const accessToken = loginBody.access_token;
    expect(accessToken).toBeTruthy();

    // Now call GET /auth/me with the access token
    const meResponse = await request.get(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Should return 200 OK
    expect(meResponse.status()).toBe(200);

    const profile = await meResponse.json();

    // Response must contain user profile fields
    expect(profile).toHaveProperty('id');
    expect(typeof profile.id).toBe('string');
    expect(profile.id.length).toBeGreaterThan(0);

    expect(profile).toHaveProperty('email');
    expect(profile.email).toBe(TEST_USERS.free.email);

    expect(profile).toHaveProperty('name');
    expect(typeof profile.name).toBe('string');

    expect(profile).toHaveProperty('tier');
    expect(['free', 'premium', 'pro']).toContain(profile.tier);

    expect(profile).toHaveProperty('email_verified');
    expect(typeof profile.email_verified).toBe('boolean');

    expect(profile).toHaveProperty('totp_enabled');
    expect(typeof profile.totp_enabled).toBe('boolean');

    expect(profile).toHaveProperty('created_at');
    expect(typeof profile.created_at).toBe('string');
  });

  test('3. POST /auth/register returns 201 for valid new user', async ({ request }) => {
    const newEmail = uniqueEmail();

    const response = await request.post(`${API_BASE}/auth/register`, {
      data: {
        name: 'E2E API Test User',
        email: newEmail,
        password: 'StrongE2EPass!234',
      },
    });

    // Should return 201 Created
    expect(response.status()).toBe(201);

    const body = await response.json();

    // Response must contain a success message
    expect(body).toHaveProperty('message');
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);

    // The message should reference registration or email verification
    expect(body.message.toLowerCase()).toMatch(/registration|verify|email/);
  });

  test('4. POST /auth/login returns 401 for invalid credentials', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: 'nonexistent-user-abc@test.mergenix.com',
        password: 'CompletelyWrongPassword!123',
      },
    });

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();

    // Response body should contain error details.
    // The FastAPI backend wraps errors in { detail: { error, code } }.
    const detail = body.detail ?? body;

    expect(detail).toHaveProperty('error');
    expect(typeof detail.error).toBe('string');
    expect(detail.error.length).toBeGreaterThan(0);

    expect(detail).toHaveProperty('code');
    expect(detail.code).toBe('INVALID_CREDENTIALS');

    // The response should NOT contain any token
    expect(body).not.toHaveProperty('access_token');
    expect(body).not.toHaveProperty('refresh_token');
  });
});
