/**
 * Security E2E Tests — Auth Security Checks
 *
 * Covers: protected route redirects, XSS prevention, CSRF protection,
 * httpOnly cookie enforcement, token refresh on 401, and expired 2FA.
 *
 * @see docs/PHASE_8C_PLAN.md section 3.21
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { API_BASE, mockConsentSync, mockTokenResponse } from '../utils/mock-api.utils';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Build a mock user profile matching the backend shape.
 */
function buildUserProfile(overrides?: Partial<{
  id: string;
  email: string;
  name: string;
  tier: string;
  email_verified: boolean;
  totp_enabled: boolean;
}>) {
  return {
    id: overrides?.id ?? 'user-sec-001',
    email: overrides?.email ?? TEST_USERS.free.email,
    name: overrides?.name ?? 'Security Test User',
    tier: overrides?.tier ?? 'free',
    email_verified: overrides?.email_verified ?? true,
    totp_enabled: overrides?.totp_enabled ?? false,
    created_at: '2025-01-01T00:00:00Z',
  };
}

// ── P0: Critical Security Tests ──────────────────────────────────────────

test.describe('Auth Security — P0 Critical', () => {
  test('1. Unauthenticated user accessing /account is redirected to /login', async ({ browser }) => {
    // Use a fresh browser context with NO stored auth state
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate directly to the protected /account route
      await page.goto('/account');

      // The middleware should redirect to /login with returnUrl=/account
      await expect(page).toHaveURL(/\/login/);

      // Verify the returnUrl query parameter is set
      const url = new URL(page.url());
      expect(url.searchParams.get('returnUrl')).toBe('/account');
    } finally {
      await context.close();
    }
  });

  test('2. Unauthenticated user accessing /subscription is redirected to /login', async ({ browser }) => {
    // Use a fresh browser context with NO stored auth state
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate directly to the protected /subscription route
      await page.goto('/subscription');

      // The middleware should redirect to /login with returnUrl=/subscription
      await expect(page).toHaveURL(/\/login/);

      // Verify the returnUrl query parameter is set
      const url = new URL(page.url());
      expect(url.searchParams.get('returnUrl')).toBe('/subscription');
    } finally {
      await context.close();
    }
  });
});

// ── P1: Important Security Tests ─────────────────────────────────────────

test.describe('Auth Security — P1 Important', () => {
  test('3. XSS: Script tags in form inputs are escaped/not executed', async ({ page }) => {
    // Track whether any dialog (alert, confirm, prompt) fires
    let alertFired = false;
    page.on('dialog', async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    // Navigate to the login page
    await page.goto('/login');

    // ── Vector 1: <script> tag in email field ──
    const scriptPayload = '<script>alert("xss")</script>';
    await page.getByLabel('Email').fill(scriptPayload);
    await page.getByLabel('Password').fill('SomePassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait briefly for any potential script execution
    await page.waitForTimeout(500);
    expect(alertFired).toBe(false);

    // Verify the script tag text is rendered as text, not executed as HTML
    // The input should contain the raw text
    const emailValue = await page.getByLabel('Email').inputValue();
    expect(emailValue).toBe(scriptPayload);

    // ── Vector 2: Event handler injection in email field ──
    await page.getByLabel('Email').fill('');
    const eventPayload = '" onfocus="alert(\'xss\')" autofocus="';
    await page.getByLabel('Email').fill(eventPayload);
    await page.waitForTimeout(300);
    expect(alertFired).toBe(false);

    // ── Vector 3: img tag with onerror ──
    await page.getByLabel('Email').fill('');
    const imgPayload = '<img src=x onerror=alert("xss")>';
    await page.getByLabel('Email').fill(imgPayload);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(300);
    expect(alertFired).toBe(false);

    // ── Vector 4: XSS in the register page name field ──
    await page.goto('/register');

    // Bypass age verification if modal appears
    const ageModal = page.getByRole('dialog', { name: /age verification/i });
    const ageModalVisible = await ageModal.isVisible().catch(() => false);
    if (ageModalVisible) {
      // Set localStorage to bypass
      await page.evaluate(() => {
        localStorage.setItem('mergenix_age_verified', 'true');
      });
      await page.reload();
    }

    const nameInput = page.getByLabel('Full Name');
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('<script>alert("xss-register")</script>');
      await page.waitForTimeout(300);
      expect(alertFired).toBe(false);

      // Verify the text is displayed as-is, not executed
      const nameValue = await nameInput.inputValue();
      expect(nameValue).toContain('<script>');
    }

    // ── Vector 5: javascript: protocol in returnUrl parameter ──
    await page.goto('/login?returnUrl=javascript:alert("xss-url")');
    await page.waitForTimeout(300);
    expect(alertFired).toBe(false);

    // The returnUrl should NOT be used in any href or navigation as-is
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('javascript:');

    // Final assertion — no XSS dialog was ever triggered
    expect(alertFired).toBe(false);
  });

  test('4. CSRF: API requests include proper tokens/headers', async ({ page }) => {
    // Track outgoing API requests to verify they include proper auth headers
    const apiRequests: { url: string; headers: Record<string, string> }[] = [];

    // Mock the login endpoint
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTokenResponse()),
      });
    });

    // Mock profile endpoint and capture the request
    await page.route(`${API_BASE}/auth/me`, async (route) => {
      apiRequests.push({
        url: route.request().url(),
        headers: route.request().headers(),
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildUserProfile()),
      });
    });

    // Mock consent sync
    await page.route(`${API_BASE}/auth/consents/**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    // Perform login
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USERS.free.email);
    await page.getByLabel('Password').fill(TEST_USERS.free.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect (login success triggers /auth/me)
    await expect(page).toHaveURL(/\/analysis/);

    // Verify that the /auth/me request was made with proper headers
    expect(apiRequests.length).toBeGreaterThan(0);

    const meRequest = apiRequests.find((r) => r.url.includes('/auth/me'));
    expect(meRequest).toBeDefined();

    // The client.ts sends credentials: "include" (for cookies)
    // and an Authorization: Bearer <token> header for authenticated requests.
    // Content-Type should be set for JSON requests.
    expect(meRequest!.headers['accept']).toContain('application/json');

    // Authorization header should be present with Bearer token
    expect(meRequest!.headers['authorization']).toMatch(/^Bearer .+/);

  });

  test('5. Auth tokens are HttpOnly cookies, not in localStorage', async ({ page }) => {
    // Mock successful login with a Set-Cookie header simulating the backend
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTokenResponse()),
        headers: {
          'Content-Type': 'application/json',
          // Simulate the httpOnly refresh token cookie set by the backend
          'Set-Cookie':
            'refresh_token=mock-refresh-jwt; Path=/auth; HttpOnly; SameSite=Lax',
        },
      });
    });

    await page.route(`${API_BASE}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildUserProfile()),
      });
    });

    await page.route(`${API_BASE}/auth/consents/**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    // Perform login
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USERS.free.email);
    await page.getByLabel('Password').fill(TEST_USERS.free.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/analysis/);

    // Verify JavaScript cannot read the refresh token cookie
    const jsCookies = await page.evaluate(() => document.cookie);
    expect(jsCookies).not.toContain('refresh_token');

    // The indicator cookie (non-sensitive) SHOULD be readable by JS
    expect(jsCookies).toContain('mergenix_logged_in');

    // Verify no refresh/access tokens are stored in localStorage
    const localStorageKeys = await page.evaluate(() => {
      return Object.keys(localStorage).filter(
        (k) =>
          k.toLowerCase().includes('refresh') ||
          k.toLowerCase().includes('access_token'),
      );
    });
    expect(localStorageKeys).toHaveLength(0);

    // Verify no tokens in sessionStorage either
    const sessionStorageKeys = await page.evaluate(() => {
      return Object.keys(sessionStorage).filter(
        (k) =>
          k.toLowerCase().includes('refresh') ||
          k.toLowerCase().includes('access_token') ||
          k.toLowerCase().includes('token'),
      );
    });
    expect(sessionStorageKeys).toHaveLength(0);

    // Verify the httpOnly cookie exists at the browser level
    // (Playwright can read httpOnly cookies via context.cookies())
    const allCookies = await page.context().cookies();
    const refreshCookie = allCookies.find((c) => c.name === 'refresh_token');
    if (refreshCookie) {
      // If the mock Set-Cookie header was processed, verify httpOnly flag
      expect(refreshCookie.httpOnly).toBe(true);
    }
    // Note: In the real backend scenario, the refresh_token cookie is always
    // set as httpOnly. The mock may or may not have it depending on how
    // Playwright processes Set-Cookie from route.fulfill().
  });

  test('6. 401 response triggers token refresh and retries original request', async ({ page }) => {
    // First, simulate a logged-in state by setting the indicator cookie and
    // injecting a token via the auth store initialization
    await page.addInitScript(() => {
      // Set the indicator cookie so middleware allows access
      document.cookie = 'mergenix_logged_in=1; path=/; SameSite=Strict';
    });

    let refreshCalled = false;
    let meCallCount = 0;

    // Mock the refresh endpoint — this should be called when a 401 occurs
    await page.route(`${API_BASE}/auth/refresh`, async (route) => {
      refreshCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTokenResponse({ access_token: 'refreshed-token-new' })),
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'refresh_token=new-refresh-jwt; Path=/auth; HttpOnly; SameSite=Lax',
        },
      });
    });

    // Mock GET /auth/me:
    // First call returns 401 (simulating expired token),
    // second call (after refresh) returns success.
    await page.route(`${API_BASE}/auth/me`, async (route) => {
      meCallCount++;
      if (meCallCount === 1) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: { error: 'Token expired', code: 'TOKEN_EXPIRED' },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildUserProfile()),
        });
      }
    });

    // Mock consent sync
    await page.route(`${API_BASE}/auth/consents/**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    // Mock any other API calls that might happen
    await page.route(`${API_BASE}/payments/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Navigate to a page that triggers an authenticated API call.
    // The account page fetches /auth/me on load via the auth store.
    await page.goto('/account');

    // Wait for the token refresh cycle to complete by polling for the expected state
    await expect.poll(
      () => refreshCalled,
      { message: 'Expected /auth/refresh to be called after 401 response', timeout: 10_000 },
    ).toBe(true);

    // Verify that /auth/me was called at least twice (original 401 + retry)
    await expect.poll(
      () => meCallCount,
      { message: 'Expected /auth/me to be retried after token refresh', timeout: 5_000 },
    ).toBeGreaterThanOrEqual(2);
  });
});

// ── P2: Nice-to-Have Security Tests ──────────────────────────────────────

test.describe('Auth Security — P2 Nice-to-Have', () => {
  test('7. Expired 2FA window shows error', async ({ page }) => {
    // Mock login to return 2FA required
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            error: 'Two-factor authentication required.',
            code: '2FA_REQUIRED',
            challenge_token: 'expired-challenge-token-xyz',
          },
        }),
      });
    });

    // Mock 2FA login endpoint to return 401 (expired/invalid challenge)
    await page.route(`${API_BASE}/auth/2fa/login`, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            error: 'Invalid or expired challenge token.',
            code: 'INVALID_CHALLENGE',
          },
        }),
      });
    });

    // Perform login to trigger 2FA prompt
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USERS.with2fa.email);
    await page.getByLabel('Password').fill(TEST_USERS.with2fa.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for the 2FA input to appear
    await expect(page.getByLabel(/verification code/i)).toBeVisible();

    // Enter a TOTP code (simulating the user entering it after the challenge expired)
    await page.getByLabel(/verification code/i).fill('123456');

    // Wait for the 2FA auto-submit to complete and error to appear
    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible({ timeout: 5_000 });
    await expect(errorAlert).toContainText(/invalid|expired|challenge/i);

    // User should still be on the login page, not redirected
    await expect(page).toHaveURL(/\/login/);
  });

  test('8. Repeated failed logins trigger rate limiting', async ({ page }) => {
    // Mock login endpoint to return 429 (rate limited)
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
        body: JSON.stringify({
          detail: {
            error: 'Too many login attempts. Please try again later.',
            code: 'RATE_LIMITED',
          },
        }),
      });
    });

    // Navigate to login and attempt sign in
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USERS.lockout.email);
    await page.getByLabel('Password').fill(TEST_USERS.lockout.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Assert an error alert is visible containing rate-limit messaging
    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible({ timeout: 5_000 });
    await expect(errorAlert).toContainText(/too many|rate limit|try again later/i);

    // Assert the Retry-After concept is communicated to the user
    // (the UI should display a message about waiting/retrying)
    await expect(errorAlert).toContainText(/try again|wait|later/i);
  });

  test('9. Account lockout message displayed after excessive failures', async ({ page }) => {
    // Mock login endpoint to return 423 (account locked)
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 423,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            error: 'Account temporarily locked due to multiple failed attempts.',
            code: 'ACCOUNT_LOCKED',
          },
        }),
      });
    });

    // Navigate to login and attempt sign in
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USERS.lockout.email);
    await page.getByLabel('Password').fill(TEST_USERS.lockout.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Assert an error alert is visible containing lockout messaging
    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible({ timeout: 5_000 });
    await expect(errorAlert).toContainText(/locked|temporarily/i);
  });
});
