import { test, expect } from '@playwright/test';

/**
 * Age Verification Tests (Section 3.13)
 *
 * Validates the age gate modal on the registration page: appearance for
 * new sessions, under-18 blocking, 18+ pass-through, and localStorage
 * persistence.
 */

const AGE_VERIFIED_KEY = 'mergenix_age_verified';
const UNDER_18_KEY = 'mergenix_under_18';

test.describe('Age Verification', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear ALL cookies and localStorage for a clean state
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await context.clearCookies();
  });

  // ── Scenario 1 (P0): Age verification modal appears on /register for new sessions ──
  test('age modal appears on /register', async ({ page }) => {
    // Navigate to the registration page
    await page.goto('/register');

    // The age verification modal should appear
    const modal = page.getByRole('dialog', {
      name: /Age Verification Required/i,
    });
    await expect(modal).toBeVisible();

    // Verify the modal contains expected content
    await expect(
      modal.getByText(/Age Verification Required/i),
    ).toBeVisible();
    await expect(
      modal.getByText(/You must be at least 18 years old/i),
    ).toBeVisible();

    // Verify the confirmation checkbox is present
    const checkbox = modal.getByRole('checkbox', {
      name: /I confirm that I am 18 years of age or older/i,
    });
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();

    // Verify the Continue button is present but disabled
    const continueButton = modal.getByRole('button', { name: /Continue/i });
    await expect(continueButton).toBeVisible();
    await expect(continueButton).toBeDisabled();

    // Verify the "I am under 18" link is present
    await expect(
      modal.getByRole('button', { name: /I am under 18/i }),
    ).toBeVisible();
  });

  // ── Scenario 2 (P0): Users under 18 are blocked from registering ──
  test('under 18 blocked from registering', async ({ page }) => {
    // Navigate to the registration page
    await page.goto('/register');

    // Wait for the age verification modal
    const modal = page.getByRole('dialog', {
      name: /Age Verification Required/i,
    });
    await expect(modal).toBeVisible();

    // Click the "I am under 18" button
    const under18Button = modal.getByRole('button', {
      name: /I am under 18/i,
    });
    await under18Button.click();

    // User should be redirected away from the registration page (to homepage)
    await page.waitForURL('**/', { timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe('/');

    // Verify the under-18 flag is stored in localStorage
    const under18Value = await page.evaluate(
      (key) => localStorage.getItem(key),
      UNDER_18_KEY,
    );
    expect(under18Value).toBeTruthy();
    // The value should be a timestamp
    expect(Number(under18Value)).toBeGreaterThan(0);

    // Try navigating back to /register — should be redirected again
    await page.goto('/register');
    await page.waitForURL('**/', { timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe('/');
  });

  // ── Scenario 3 (P1): Users 18+ can proceed to registration form ──
  test('18+ proceeds to registration form', async ({ page }) => {
    // Navigate to the registration page
    await page.goto('/register');

    // Wait for the age verification modal
    const modal = page.getByRole('dialog', {
      name: /Age Verification Required/i,
    });
    await expect(modal).toBeVisible();

    // Check the age confirmation checkbox
    const checkbox = modal.getByRole('checkbox', {
      name: /I confirm that I am 18 years of age or older/i,
    });
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // The Continue button should now be enabled
    const continueButton = modal.getByRole('button', { name: /Continue/i });
    await expect(continueButton).toBeEnabled();

    // Click Continue
    await continueButton.click();

    // The modal should close
    await expect(modal).toBeHidden();

    // The registration page should now be accessible (the form should be visible)
    // We should still be on /register
    expect(new URL(page.url()).pathname).toBe('/register');

    // Verify the age_verified flag is set in localStorage
    const ageVerified = await page.evaluate(
      (key) => localStorage.getItem(key),
      AGE_VERIFIED_KEY,
    );
    expect(ageVerified).toBe('true');
  });

  // ── Scenario 4 (P2): Age verification persists in localStorage ──
  test('age verification persists in localStorage', async ({ page }) => {
    // Navigate to /register and complete age verification
    await page.goto('/register');

    const modal = page.getByRole('dialog', {
      name: /Age Verification Required/i,
    });
    await expect(modal).toBeVisible();

    // Complete age verification
    const checkbox = modal.getByRole('checkbox', {
      name: /I confirm that I am 18 years of age or older/i,
    });
    await checkbox.check();
    await modal.getByRole('button', { name: /Continue/i }).click();
    await expect(modal).toBeHidden();

    // Verify localStorage has the age verified flag
    const ageVerifiedBefore = await page.evaluate(
      (key) => localStorage.getItem(key),
      AGE_VERIFIED_KEY,
    );
    expect(ageVerifiedBefore).toBe('true');

    // Reload the page
    await page.reload();

    // Wait for page to settle, then verify the modal does NOT reappear
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('dialog', { name: /Age Verification Required/i }),
    ).toBeHidden();

    // Verify localStorage still has the flag
    const ageVerifiedAfter = await page.evaluate(
      (key) => localStorage.getItem(key),
      AGE_VERIFIED_KEY,
    );
    expect(ageVerifiedAfter).toBe('true');

    // Navigate away and come back to /register
    await page.goto('/');
    await page.goto('/register');

    // Wait for page to settle, then verify the modal still does not appear
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('dialog', { name: /Age Verification Required/i }),
    ).toBeHidden();
  });
});
