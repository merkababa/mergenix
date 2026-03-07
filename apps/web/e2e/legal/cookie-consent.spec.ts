import { test, expect } from '@playwright/test';

/**
 * Cookie Consent Tests (Section 3.12)
 *
 * Validates the cookie consent banner behavior: appearance on first visit,
 * analytics cookie blocking before consent, accept/reject flows, and
 * persistence across reloads.
 *
 * IMPORTANT: These tests clear ALL cookies and localStorage in beforeEach
 * to ensure a clean state for each test scenario.
 */

const COOKIE_CONSENT_KEY = 'mergenix_cookie_consent';

test.describe('Cookie Consent', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear ALL cookies
    await context.clearCookies();

    // Navigate to a page first so we can access localStorage
    await page.goto('/');

    // Clear ALL localStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Clear cookies again (in case page load set any)
    await context.clearCookies();
  });

  // ── Scenario 1 (P0): Cookie banner appears on first visit with clean session ──
  test('banner appears on first visit', async ({ page }) => {
    // Navigate fresh (after clearing state in beforeEach)
    await page.goto('/');

    // The cookie consent banner should appear
    const banner = page.getByRole('dialog', { name: /Cookie consent/i });
    await expect(banner).toBeVisible();

    // Verify the banner contains expected content
    await expect(banner.getByText(/Cookie Preferences/i)).toBeVisible();
    await expect(
      banner.getByText(/We use essential cookies for authentication and theme/i),
    ).toBeVisible();

    // Verify action buttons are present
    await expect(banner.getByRole('button', { name: /Accept All/i })).toBeVisible();
    await expect(banner.getByRole('button', { name: /Essential Only/i })).toBeVisible();
    await expect(banner.getByRole('button', { name: /Customize/i })).toBeVisible();
  });

  // ── Scenario 2 (P0): No analytics cookies set before consent ──
  test('no analytics cookies before consent', async ({ page, context }) => {
    // Navigate fresh
    await page.goto('/');

    // Wait for the banner to appear
    const banner = page.getByRole('dialog', { name: /Cookie consent/i });
    await expect(banner).toBeVisible();

    // Before any consent action, check that no analytics cookies exist
    const cookies = await context.cookies();

    // Filter for analytics-related cookies (common analytics cookie names)
    const analyticsCookieNames = [
      '_ga',
      '_gid',
      '_gat',
      '_gtm',
      'mp_',
      '_pk_id',
      '_pk_ses',
      '__mp',
      'amplitude',
      'posthog',
      'ph_',
    ];

    const analyticsCookies = cookies.filter((cookie) =>
      analyticsCookieNames.some(
        (name) => cookie.name.startsWith(name) || cookie.name.includes('analytics'),
      ),
    );

    expect(
      analyticsCookies,
      `Found analytics cookies before consent: ${analyticsCookies.map((c) => c.name).join(', ')}`,
    ).toHaveLength(0);

    // Also verify localStorage doesn't have analytics consent yet
    const consentValue = await page.evaluate(
      (key) => localStorage.getItem(key),
      COOKIE_CONSENT_KEY,
    );
    expect(consentValue).toBeNull();
  });

  // ── Scenario 3 (P1): "Accept Essential Only" hides banner and blocks analytics ──
  test('accept essential only blocks analytics', async ({ page, context }) => {
    // Navigate fresh
    await page.goto('/');

    // Wait for the banner
    const banner = page.getByRole('dialog', { name: /Cookie consent/i });
    await expect(banner).toBeVisible();

    // Click "Essential Only"
    await banner.getByRole('button', { name: /Essential Only/i }).click();

    // Banner should disappear
    await expect(banner).toBeHidden();

    // Verify localStorage records the choice
    const consentValue = await page.evaluate(
      (key) => localStorage.getItem(key),
      COOKIE_CONSENT_KEY,
    );
    expect(consentValue).toBe('essential_only');

    // Verify no analytics cookies were set
    const cookies = await context.cookies();
    const analyticsCookieNames = [
      '_ga',
      '_gid',
      '_gat',
      '_gtm',
      'mp_',
      '_pk_id',
      '_pk_ses',
      '__mp',
      'amplitude',
      'posthog',
      'ph_',
    ];
    const analyticsCookies = cookies.filter((cookie) =>
      analyticsCookieNames.some(
        (name) => cookie.name.startsWith(name) || cookie.name.includes('analytics'),
      ),
    );
    expect(analyticsCookies).toHaveLength(0);
  });

  // ── Scenario 4 (P1): "Accept All" hides banner and enables analytics ──
  test('accept all enables analytics', async ({ page }) => {
    // Navigate fresh
    await page.goto('/');

    // Wait for the banner
    const banner = page.getByRole('dialog', { name: /Cookie consent/i });
    await expect(banner).toBeVisible();

    // Click "Accept All"
    await banner.getByRole('button', { name: /Accept All/i }).click();

    // Banner should disappear
    await expect(banner).toBeHidden();

    // Verify localStorage records the "accepted_all" choice
    const consentValue = await page.evaluate(
      (key) => localStorage.getItem(key),
      COOKIE_CONSENT_KEY,
    );
    expect(consentValue).toBe('accepted_all');
  });

  // ── Scenario 5 (P1): Consent choice persists across page reloads ──
  test('consent persists across reloads', async ({ page }) => {
    // Navigate fresh
    await page.goto('/');

    // Wait for the banner
    const banner = page.getByRole('dialog', { name: /Cookie consent/i });
    await expect(banner).toBeVisible();

    // Accept all cookies
    await banner.getByRole('button', { name: /Accept All/i }).click();
    await expect(banner).toBeHidden();

    // Verify the consent is stored
    const consentBefore = await page.evaluate(
      (key) => localStorage.getItem(key),
      COOKIE_CONSENT_KEY,
    );
    expect(consentBefore).toBe('accepted_all');

    // Reload the page
    await page.reload();

    // The banner should NOT reappear after reload
    // Wait for page to settle, then verify banner does not reappear
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('dialog', { name: /Cookie consent/i })).toBeHidden();

    // Verify localStorage still has the consent
    const consentAfter = await page.evaluate(
      (key) => localStorage.getItem(key),
      COOKIE_CONSENT_KEY,
    );
    expect(consentAfter).toBe('accepted_all');

    // Navigate to a different page and verify banner still doesn't appear
    await page.goto('/about');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('dialog', { name: /Cookie consent/i })).toBeHidden();
  });

  // ── Scenario 6 (P2): Customize button opens granular consent controls ──
  test('customize button opens granular consent controls', async ({ page }) => {
    // Navigate fresh
    await page.goto('/');

    // Wait for the banner
    const banner = page.getByRole('dialog', { name: /Cookie consent/i });
    await expect(banner).toBeVisible();

    // Click "Customize"
    await banner.getByRole('button', { name: /Customize/i }).click();

    // Granular category toggles should appear inside the banner dialog
    // (scoped to the dialog to avoid matching page content elsewhere)
    await expect(banner.getByText(/analytics|performance|functional/i).first()).toBeVisible();
  });

  // ── Scenario 7 (P2): User can withdraw cookie consent after accepting all (GDPR Art. 7(3)) ──
  // Requires a "Cookie Settings" / "Manage Cookies" button in the footer or settings page.
  // Marked fixme until the consent-management UI is implemented.
  test.fixme('user can withdraw cookie consent after accepting all', async ({ page }) => {
    // Navigate fresh
    await page.goto('/');

    // Wait for the banner
    const banner = page.getByRole('dialog', { name: /Cookie consent/i });
    await expect(banner).toBeVisible();

    // Accept all cookies
    await banner.getByRole('button', { name: /Accept All/i }).click();

    // Banner should disappear
    await expect(banner).toBeHidden();

    // Verify localStorage records "accepted_all"
    const consentBefore = await page.evaluate(
      (key) => localStorage.getItem(key),
      COOKIE_CONSENT_KEY,
    );
    expect(consentBefore).toBe('accepted_all');

    // Look for a "Cookie Settings" or "Manage Cookies" link to re-open preferences
    const cookieSettingsLink = page
      .getByRole('button', { name: /cookie settings|manage cookies/i })
      .or(page.getByRole('link', { name: /cookie settings|manage cookies/i }));

    // Click the cookie settings link to re-open the consent dialog
    await cookieSettingsLink.first().click();

    // The cookie consent dialog should reappear
    const reopenedBanner = page.getByRole('dialog', { name: /Cookie consent/i });
    await expect(reopenedBanner).toBeVisible();

    // Change preference to "Essential Only"
    await reopenedBanner.getByRole('button', { name: /Essential Only/i }).click();

    // Banner should close
    await expect(reopenedBanner).toBeHidden();

    // Verify localStorage is updated to "essential_only"
    const consentAfter = await page.evaluate(
      (key) => localStorage.getItem(key),
      COOKIE_CONSENT_KEY,
    );
    expect(consentAfter).toBe('essential_only');
  });
});
