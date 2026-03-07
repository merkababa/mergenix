/**
 * Pre-authenticated page fixtures for E2E tests.
 *
 * Extends Playwright's base `test` to provide page objects that are
 * already logged in as specific user tiers. Authentication is done
 * programmatically via the API (POST /auth/login) and saved as
 * storageState to avoid repeating UI login in every test.
 */

/**
 * ARCHITECTURE NOTE — Two-Layer Auth Testing Strategy:
 *
 * 1. Feature tests (account, analysis, subscription) use localStorage token injection
 *    via setupAuthenticatedPage() or this fixture. This is a TEST-ONLY shortcut to
 *    get pages into authenticated state without needing a running backend.
 *
 * 2. Security tests (auth-security.spec.ts) separately validate the PRODUCTION auth
 *    mechanism — verifying HttpOnly cookies, token refresh, and that tokens are NOT
 *    exposed in localStorage in the real application.
 *
 * These two layers are complementary, not contradictory:
 * - Layer 1 tests WHAT authenticated users can do
 * - Layer 2 tests HOW authentication actually works in production
 */

import { test as base, expect } from '@playwright/test';
import type { Page, Browser } from '@playwright/test';
import { TEST_USERS } from './test-users';
import type { TestUser } from './test-users';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

/**
 * Programmatically log in a test user via the API and configure
 * the browser context with the resulting auth tokens.
 */
async function createAuthenticatedContext(
  browser: Browser,
  user: TestUser,
  baseURL: string,
): Promise<{ context: import('@playwright/test').BrowserContext; page: Page }> {
  // Hit the login endpoint directly
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
    throw new Error(`Failed to log in as ${user.email}: ${loginResponse.status} ${errorBody}`);
  }

  const tokens = (await loginResponse.json()) as {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };

  // Create a new browser context
  const context = await browser.newContext({
    baseURL,
  });

  // Inject the access token into localStorage so the auth store picks it up.
  // The auth store reads from localStorage on initialization.
  await context.addInitScript(
    ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
      window.localStorage.setItem('mergenix_access_token', accessToken);
      window.localStorage.setItem('mergenix_refresh_token', refreshToken);
    },
    {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    },
  );

  // Also set cookies from the login response if the backend uses httpOnly cookies
  const setCookieHeaders = loginResponse.headers.getSetCookie?.() ?? [];
  for (const cookieStr of setCookieHeaders) {
    const parts = cookieStr.split(';')[0].split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      await context.addCookies([
        {
          name,
          value,
          domain: new URL(baseURL).hostname,
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ]);
    }
  }

  const page = await context.newPage();
  return { context, page };
}

// ── Fixture type definitions ────────────────────────────────────────────

interface AuthFixtures {
  freeUserPage: Page;
  premiumUserPage: Page;
  proUserPage: Page;
  user2faPage: Page;
}

// ── Extended test with auth fixtures ────────────────────────────────────

export const test = base.extend<AuthFixtures>({
  freeUserPage: async ({ browser }, use) => {
    const baseURL = test.info().project.use.baseURL ?? 'http://localhost:3000';
    const { context, page } = await createAuthenticatedContext(browser, TEST_USERS.free, baseURL);
    await use(page);
    await context.close();
  },

  premiumUserPage: async ({ browser }, use) => {
    const baseURL = test.info().project.use.baseURL ?? 'http://localhost:3000';
    const { context, page } = await createAuthenticatedContext(
      browser,
      TEST_USERS.premium,
      baseURL,
    );
    await use(page);
    await context.close();
  },

  proUserPage: async ({ browser }, use) => {
    const baseURL = test.info().project.use.baseURL ?? 'http://localhost:3000';
    const { context, page } = await createAuthenticatedContext(browser, TEST_USERS.pro, baseURL);
    await use(page);
    await context.close();
  },

  user2faPage: async ({ browser }, use) => {
    const baseURL = test.info().project.use.baseURL ?? 'http://localhost:3000';
    const { context, page } = await createAuthenticatedContext(
      browser,
      TEST_USERS.with2fa,
      baseURL,
    );
    await use(page);
    await context.close();
  },
});

export { expect };
