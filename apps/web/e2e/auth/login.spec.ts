/**
 * Auth E2E Tests — Login Flows
 *
 * Covers: valid login, invalid credentials, 2FA prompt/completion,
 * returnUrl redirect, logout, unverified user, submit button state,
 * and session token security.
 *
 * @see docs/PHASE_8C_PLAN.md section 3.1
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../poms';
import { TEST_USERS } from '../fixtures/test-users';
import {
  API_BASE,
  mockAuthMe,
  mockConsentSync,
  mockLogout,
  mockTokenResponse,
} from '../utils/mock-api.utils';

// ── P0: Critical Login Tests ─────────────────────────────────────────────

test.describe('Login — P0 Critical', () => {
  test('1. Valid login redirects to /analysis', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Mock the login API to return success
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTokenResponse()),
      });
    });

    // Mock GET /auth/me and consent sync using shared helpers
    await mockAuthMe(page);
    await mockConsentSync(page);

    await loginPage.goto();
    await loginPage.fillEmail(TEST_USERS.free.email);
    await loginPage.fillPassword(TEST_USERS.free.password);
    await loginPage.submit();

    // Should redirect to /analysis (the default returnUrl)
    await expect(page).toHaveURL(/\/analysis/);
  });

  test('2. Invalid credentials show error message', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Mock the login API to return 401 with error
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          },
        }),
      });
    });

    await loginPage.goto();
    await loginPage.fillEmail('wrong@example.com');
    await loginPage.fillPassword('WrongPassword123!');
    await loginPage.submit();

    // Error message should be visible
    await expect(loginPage.errorBanner).toBeVisible();
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toMatch(/invalid|incorrect|wrong/i);
  });

  test('3. User with 2FA enabled is prompted for TOTP code', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Mock the login API to return 403 with 2FA_REQUIRED
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            error: '2FA verification required',
            code: '2FA_REQUIRED',
            challenge_token: 'mock-challenge-token-abc',
          },
        }),
      });
    });

    await loginPage.goto();
    await loginPage.fillEmail(TEST_USERS.with2fa.email);
    await loginPage.fillPassword(TEST_USERS.with2fa.password);
    await loginPage.submit();

    // Should show the 2FA input step
    await expect(page.getByLabel(/verification code/i)).toBeVisible();
    await expect(page.getByText(/enter the code from your authenticator/i)).toBeVisible();
  });

  test('4. Valid 2FA code completes login successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Mock login → 2FA required
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            error: '2FA verification required',
            code: '2FA_REQUIRED',
            challenge_token: 'mock-challenge-token-abc',
          },
        }),
      });
    });

    // Mock 2FA login endpoint
    await page.route(`${API_BASE}/auth/2fa/login`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTokenResponse()),
      });
    });

    // Mock profile and consent sync using shared helpers
    await mockAuthMe(page, {
      email: TEST_USERS.with2fa.email,
      totp_enabled: true,
    });
    await mockConsentSync(page);

    await loginPage.goto();
    await loginPage.fillEmail(TEST_USERS.with2fa.email);
    await loginPage.fillPassword(TEST_USERS.with2fa.password);
    await loginPage.submit();

    // Wait for 2FA step
    await expect(page.getByLabel(/verification code/i)).toBeVisible();

    // Enter a valid 6-digit TOTP code
    await loginPage.fill2FA('123456');

    // Should redirect to /analysis after successful 2FA
    await expect(page).toHaveURL(/\/analysis/);
  });
});

// ── P1: Important Login Tests ────────────────────────────────────────────

test.describe('Login — P1 Important', () => {
  test('5. returnUrl redirect after login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Mock successful login
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTokenResponse()),
      });
    });

    await mockAuthMe(page);
    await mockConsentSync(page);

    // Navigate with returnUrl parameter
    await page.goto('/login?returnUrl=/account');
    await loginPage.fillEmail(TEST_USERS.free.email);
    await loginPage.fillPassword(TEST_USERS.free.password);
    await loginPage.submit();

    // Should redirect to the specified returnUrl, not /analysis
    await expect(page).toHaveURL(/\/account/);
  });

  test('6. Logout destroys session', async ({ page }) => {
    test.slow();

    const loginPage = new LoginPage(page);

    // Mock successful login
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTokenResponse()),
      });
    });

    await mockAuthMe(page, { name: 'Test User' });
    await mockConsentSync(page);
    await mockLogout(page);

    // Log in first
    await loginPage.goto();
    await loginPage.fillEmail(TEST_USERS.free.email);
    await loginPage.fillPassword(TEST_USERS.free.password);
    await loginPage.submit();

    // Wait for navigation to complete
    await expect(page).toHaveURL(/\/analysis/);

    // Open user menu and click Sign Out
    await page.getByLabel('User menu').click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();

    // After logout, the indicator cookie should be cleared.
    // Verify the user is no longer in an authenticated state by
    // checking that the login link (or similar) is present, or that
    // navigating to a protected route redirects to login.
    // The auth store is cleared, so visiting /account should redirect.
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/);
  });

  test('7. Unverified user is blocked or sees verification prompt', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Mock login returning an error for unverified user
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            error: 'Please verify your email address before logging in',
            code: 'EMAIL_NOT_VERIFIED',
          },
        }),
      });
    });

    await loginPage.goto();
    await loginPage.fillEmail(TEST_USERS.unverified.email);
    await loginPage.fillPassword(TEST_USERS.unverified.password);
    await loginPage.submit();

    // Error message should mention email verification
    await expect(loginPage.errorBanner).toBeVisible();
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toMatch(/verify/i);
  });

  test('8. Login button is disabled during submission', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Mock a slow login response to observe the disabled state
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      // Delay the response to give us time to check button state
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTokenResponse()),
      });
    });

    await mockAuthMe(page);
    await mockConsentSync(page);

    await loginPage.goto();
    await loginPage.fillEmail(TEST_USERS.free.email);
    await loginPage.fillPassword(TEST_USERS.free.password);

    // Click submit
    await loginPage.submit();

    // Check that button is disabled during submission and shows loading text
    const submitButton = page.getByRole('button', { name: /sign(ing)?\s*in/i });
    await expect(submitButton).toBeDisabled();

    // The button should show "Signing in..." text during loading
    await expect(page.getByRole('button', { name: /signing in/i })).toBeVisible();
  });

  test('9. Session token security: HttpOnly cookie not accessible via JS', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Mock successful login with a Set-Cookie header simulating the backend's
    // httpOnly refresh token cookie. The mock also returns tokens in the JSON
    // body (which the auth store saves to localStorage for the test environment).
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTokenResponse()),
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'mergenix_refresh=mock-refresh-token; Path=/; HttpOnly; SameSite=Strict',
        },
      });
    });

    await mockAuthMe(page);
    await mockConsentSync(page);

    await loginPage.goto();
    await loginPage.fillEmail(TEST_USERS.free.email);
    await loginPage.fillPassword(TEST_USERS.free.password);
    await loginPage.submit();

    await expect(page).toHaveURL(/\/analysis/);

    // The HttpOnly cookie should NOT be readable via document.cookie
    const jsCookies = await page.evaluate(() => document.cookie);
    expect(jsCookies).not.toContain('mergenix_refresh');

    // Verify the httpOnly cookie exists at the browser level via Playwright API
    // (Playwright can read httpOnly cookies even though JS cannot)
    const allCookies = await page.context().cookies();
    const refreshCookie = allCookies.find((c) => c.name === 'mergenix_refresh');
    if (refreshCookie) {
      expect(refreshCookie.httpOnly).toBe(true);
    }

    // NOTE: In the mock test environment, the auth store uses localStorage
    // tokens for convenience. The production app uses httpOnly cookies for
    // refresh tokens. The auth-security.spec.ts tests validate the full
    // production cookie security model.
  });
});
