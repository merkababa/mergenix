/**
 * Auth utility functions for E2E tests.
 *
 * Provides helpers for logging in via UI, programmatic login via API,
 * and registering new users. These complement the pre-authenticated
 * fixtures in auth.fixture.ts for tests that need to exercise the
 * actual auth flows.
 */

import type { Page } from '@playwright/test';
import { LoginPage } from '../poms/LoginPage';
import { RegisterPage } from '../poms/RegisterPage';
import type { TestUser } from '../fixtures/test-users';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

/**
 * Log in a user through the UI by filling the login form.
 *
 * Use this when the test needs to verify the login flow itself.
 * For tests that just need an authenticated state, use the
 * pre-authenticated fixtures (freeUserPage, premiumUserPage, etc.) instead.
 *
 * @param page - Playwright page instance
 * @param email - User email address
 * @param password - User password
 * @param options - Optional configuration
 * @param options.returnUrl - URL to redirect to after login
 * @param options.rememberMe - Whether to check the "Remember me" checkbox
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string,
  options?: {
    returnUrl?: string;
    rememberMe?: boolean;
  },
): Promise<void> {
  const loginPage = new LoginPage(page);

  await loginPage.goto(options?.returnUrl);
  await loginPage.fillEmail(email);
  await loginPage.fillPassword(password);

  if (options?.rememberMe) {
    await loginPage.toggleRememberMe();
  }

  await loginPage.submit();
}

/**
 * Log in a user programmatically via the API without touching the UI.
 *
 * Calls POST /auth/login directly, then injects the resulting tokens
 * into the page's localStorage so the auth store picks them up on
 * the next navigation.
 *
 * This is faster than loginViaUI and suitable for setup steps where
 * you need an authenticated page but don't need to test the login flow.
 *
 * @param page - Playwright page instance
 * @param user - Test user to log in as
 * @returns The access token (useful for subsequent direct API calls)
 */
export async function loginProgrammatically(page: Page, user: TestUser): Promise<string> {
  const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  if (!loginResponse.ok) {
    const errorBody = await loginResponse.text();
    throw new Error(
      `Programmatic login failed for ${user.email}: ${loginResponse.status} ${errorBody}`,
    );
  }

  const tokens = (await loginResponse.json()) as {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };

  // Inject tokens into localStorage via page evaluation
  await page.evaluate(
    ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
      window.localStorage.setItem('mergenix_access_token', accessToken);
      window.localStorage.setItem('mergenix_refresh_token', refreshToken);
    },
    {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    },
  );

  return tokens.access_token;
}

/**
 * Register a new user through the UI by filling the registration form.
 *
 * Use this for tests that need to verify the registration flow itself.
 * Does NOT complete email verification (that requires a separate step).
 *
 * @param page - Playwright page instance
 * @param name - Full name
 * @param email - Email address
 * @param password - Password (must meet strength requirements)
 */
export async function registerNewUser(
  page: Page,
  name: string,
  email: string,
  password: string,
): Promise<void> {
  const registerPage = new RegisterPage(page);

  await registerPage.goto();
  await registerPage.checkAgeVerification();
  await registerPage.register(name, email, password);
}

/**
 * Log in a user with 2FA via the UI.
 *
 * Fills the email/password form, then enters a TOTP code when the
 * 2FA challenge screen appears. Requires the `otplib` package to
 * generate time-based codes from the TOTP secret.
 *
 * @param page - Playwright page instance
 * @param email - User email address
 * @param password - User password
 * @param totpSecret - The TOTP secret for generating verification codes
 */
export async function loginWith2FAViaUI(
  page: Page,
  email: string,
  password: string,
  totpSecret: string,
): Promise<void> {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(email, password);

  // Wait for the 2FA input to appear
  await loginPage.twoFAInput.waitFor({ state: 'visible' });

  // Generate the TOTP code dynamically using otplib.
  // Tests using this helper must have `otplib` available.
  const { authenticator } = await import('otplib');
  const totpCode = authenticator.generate(totpSecret);

  await loginPage.fill2FA(totpCode);
  await loginPage.twoFASubmitButton.click();
}

/**
 * Register a new user via the API programmatically (bypassing UI).
 *
 * Calls POST /auth/register directly. Note that the registered user
 * will still need email verification before they can log in, unless
 * the test database seed marks them as verified.
 *
 * @param name - Full name
 * @param email - Email address
 * @param password - Password
 * @returns The response message from the API
 */
export async function registerProgrammatically(
  name: string,
  email: string,
  password: string,
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Programmatic registration failed for ${email}: ${response.status} ${errorBody}`,
    );
  }

  const data = (await response.json()) as { message: string };
  return data.message;
}
