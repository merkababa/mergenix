/**
 * Auth E2E Tests — Google OAuth Flows
 *
 * Covers: initiating OAuth flow (mocked redirect), successful OAuth callback,
 * and OAuth error handling.
 *
 * External Google services are mocked via page.route() as per the plan.
 *
 * @see docs/PHASE_8C_PLAN.md section 3.4
 */

import { test, expect } from '@playwright/test';
import { API_BASE, mockTokenResponse, mockAuthMe, mockConsentSync } from '../utils/mock-api.utils';

// ── P1: Important OAuth Tests ────────────────────────────────────────────

test.describe('Google OAuth — P1 Important', () => {
  test('1. User can initiate Google OAuth flow (mocked redirect)', async ({ page }) => {
    const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=mock';

    // Mock the GET /auth/oauth/google endpoint to return an authorization URL
    await page.route(`${API_BASE}/auth/oauth/google`, async (route) => {
      // Only intercept GET requests (not the callback)
      if (route.request().url().includes('/callback')) {
        return route.fallback();
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authorization_url: mockAuthUrl,
          state: 'mock-csrf-state-xyz',
        }),
      });
    });

    // Intercept the Google redirect so the browser does not actually navigate
    // to accounts.google.com (which would fail in tests). Instead, verify
    // that window.location.href is set to the expected URL.
    const captured: { redirectUrl: string | null } = { redirectUrl: null };

    await page.route('https://accounts.google.com/**', async (route) => {
      captured.redirectUrl = route.request().url();
      // Return a simple page instead of navigating to Google
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>Redirected to Google OAuth</body></html>',
      });
    });

    await page.goto('/login');

    // Find and click the Google OAuth button
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleButton).toBeVisible();
    await googleButton.click();

    // Wait for the route handler to capture the redirect
    // The Google OAuth button either navigates directly or the API mock provides a URL
    await expect
      .poll(() => captured.redirectUrl, {
        message: 'Expected redirect to Google OAuth',
        timeout: 5000,
      })
      .toBeTruthy();

    // Verify the redirect was to Google OAuth
    expect(captured.redirectUrl).toContain('accounts.google.com');
  });

  test('2. Successful OAuth callback creates account and logs in', async ({ page }) => {
    // Mock the OAuth callback endpoint — returns tokens on success
    await page.route(`${API_BASE}/auth/oauth/google/callback**`, async (route) => {
      // Verify the callback includes code and state parameters
      const url = new URL(route.request().url());
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (code && state) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockTokenResponse()),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: {
              error: 'Missing authorization parameters',
              code: 'INVALID_CALLBACK',
            },
          }),
        });
      }
    });

    // Mock the profile endpoint for the newly logged-in OAuth user
    await mockAuthMe(page, {
      id: 'user-oauth-001',
      email: 'googleuser@gmail.com',
      name: 'Google User',
    });

    // Mock the legal consent sync (fire-and-forget after login)
    await mockConsentSync(page);

    // Simulate the OAuth callback redirect from Google.
    // In a real flow, Google redirects to /callback?code=xxx&state=yyy
    await page.goto('/callback?code=mock-auth-code-123&state=mock-csrf-state-xyz');

    // The callback page shows "Completing sign in..." while processing
    await expect(page.getByText(/completing sign in/i)).toBeVisible();

    // After successful callback, should redirect to /account
    await expect(page).toHaveURL(/\/account/, { timeout: 10000 });
  });
});

// ── P2: Nice-to-Have OAuth Tests ─────────────────────────────────────────

test.describe('Google OAuth — P2 Nice-to-Have', () => {
  test('3. OAuth error callback handled gracefully', async ({ page }) => {
    // Case 1: Missing parameters — no code or state in the callback URL
    await page.goto('/callback');

    // Should immediately show error state (missing parameters)
    await expect(page.getByRole('heading', { name: /sign in failed/i })).toBeVisible();
    await expect(page.getByText(/missing authorization parameters/i)).toBeVisible();

    // "Try Again" link should navigate back to login
    const tryAgainLink = page.getByRole('link', { name: /try again/i });
    await expect(tryAgainLink).toBeVisible();
  });

  test('3b. OAuth API error handled gracefully', async ({ page }) => {
    // Case 2: Backend returns an error during callback processing
    await page.route(`${API_BASE}/auth/oauth/google/callback**`, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            error: 'OAuth authorization failed. The code may have expired.',
            code: 'OAUTH_FAILED',
          },
        }),
      });
    });

    // Navigate to callback with valid-looking parameters that the backend rejects
    await page.goto('/callback?code=expired-code&state=invalid-state');

    // Should show error state
    await expect(page.getByRole('heading', { name: /sign in failed/i })).toBeVisible({
      timeout: 10000,
    });

    // Error message from the backend should be displayed
    await expect(page.getByText(/failed|expired/i)).toBeVisible();

    // Navigation options should be available
    await expect(page.getByRole('link', { name: /try again/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
  });

  test('4. OAuth callback with mismatched state is rejected', async ({ page }) => {
    // Mock the OAuth callback endpoint — reject if state does not match expected value
    await page.route(`${API_BASE}/auth/oauth/google/callback**`, async (route) => {
      const url = new URL(route.request().url());
      const state = url.searchParams.get('state');

      if (state !== 'mock-csrf-state-xyz') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: {
              error: 'CSRF state mismatch',
              code: 'CSRF_VALIDATION_FAILED',
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockTokenResponse()),
        });
      }
    });

    // Navigate to callback with a valid code but WRONG state
    await page.goto('/callback?code=valid-code&state=WRONG_STATE');

    // Should show error state — the "Sign in failed" heading
    await expect(page.getByRole('heading', { name: /sign in failed/i })).toBeVisible({
      timeout: 10000,
    });

    // Error message indicating failure/mismatch/invalid should be displayed
    await expect(page.getByText(/failed|mismatch|invalid/i)).toBeVisible();
  });
});
