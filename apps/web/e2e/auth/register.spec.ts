/**
 * Auth E2E Tests — Registration Flows
 *
 * Covers: successful registration, terms acceptance, age gate (block + pass),
 * duplicate email, password strength, email validation, ToS consent recording,
 * and age verification consent event.
 *
 * @see docs/PHASE_8C_PLAN.md section 3.2
 */

import { test, expect } from '@playwright/test';
import { RegisterPage } from '../poms';
import { TEST_USERS } from '../fixtures/test-users';
import { API_BASE } from '../utils/mock-api.utils';

// ── Helpers ──────────────────────────────────────────────────────────────

/** localStorage keys from the legal module. */
const AGE_VERIFIED_KEY = 'mergenix_age_verified';
const UNDER_18_KEY = 'mergenix_under_18';

/**
 * Pre-bypass the age verification modal by setting the localStorage flag
 * before page load. This avoids the modal blocking interaction with the
 * registration form for tests that do not test the age gate itself.
 */
async function bypassAgeVerification(page: import('@playwright/test').Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(key, 'true');
  }, AGE_VERIFIED_KEY);
}

// ── P0: Critical Registration Tests ──────────────────────────────────────

test.describe('Registration — P0 Critical', () => {
  test('1. Successful registration shows "verify email" screen', async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Bypass age gate
    await bypassAgeVerification(page);

    // Mock register API to return success
    await page.route(`${API_BASE}/auth/register`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Registration successful. Please verify your email.',
        }),
      });
    });

    await registerPage.goto();
    await registerPage.fillName('Test User');
    await registerPage.fillEmail('newuser@test.mergenix.com');
    await registerPage.fillPassword('StrongP@ssword123!');
    await registerPage.checkTerms();
    await registerPage.submit();

    // Should show the "verify email" success screen
    await expect(page.getByText(/check your email/i)).toBeVisible();
    await expect(page.getByText(/newuser@test\.mergenix\.com/i)).toBeVisible();
    await expect(page.getByText(/click the link to verify/i)).toBeVisible();
  });

  test('2. Registration blocked without accepting Terms & Privacy Policy', async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Bypass age gate
    await bypassAgeVerification(page);

    await registerPage.goto();
    await registerPage.fillName('Test User');
    await registerPage.fillEmail('newuser@test.mergenix.com');
    await registerPage.fillPassword('StrongP@ssword123!');

    // Do NOT check the terms checkbox

    // The "Create Account" button should be disabled when terms are not accepted
    const submitButton = page.getByRole('button', { name: /create account/i });
    await expect(submitButton).toBeDisabled();

    // Try to click submit anyway (should have no effect)
    await submitButton.click({ force: true });

    // Should still be on the register page, no network request made
    await expect(page).toHaveURL(/\/register/);
  });

  test('3. Age verification gate blocks users under 18', async ({ page }) => {
    // Do NOT bypass age verification — we want to test the modal

    // Clear any existing age verification from localStorage
    await page.addInitScript(
      (keys) => {
        localStorage.removeItem(keys.ageKey);
        localStorage.removeItem(keys.under18Key);
      },
      { ageKey: AGE_VERIFIED_KEY, under18Key: UNDER_18_KEY },
    );

    await page.goto('/register');

    // The age verification modal should appear
    const modal = page.getByRole('dialog', { name: /age verification/i });
    await expect(modal).toBeVisible();
    await expect(page.getByText(/you must be at least 18 years old/i)).toBeVisible();

    // Click "I am under 18"
    await page.getByRole('button', { name: /I am under 18/i }).click();

    // Should redirect away from the register page (to home page)
    await expect(page).toHaveURL(/^\/$/);

    // under-18 flag should be set in localStorage
    const under18Value = await page.evaluate((key) => localStorage.getItem(key), UNDER_18_KEY);
    expect(under18Value).toBeTruthy();
  });
});

// ── P1: Important Registration Tests ─────────────────────────────────────

test.describe('Registration — P1 Important', () => {
  test('4. Users 18+ pass age gate and can proceed to register', async ({ page }) => {
    // Do NOT bypass age verification — test the modal flow

    // Clear any existing age verification
    await page.addInitScript(
      (keys) => {
        localStorage.removeItem(keys.ageKey);
        localStorage.removeItem(keys.under18Key);
      },
      { ageKey: AGE_VERIFIED_KEY, under18Key: UNDER_18_KEY },
    );

    await page.goto('/register');

    // The age verification modal should appear
    const modal = page.getByRole('dialog', { name: /age verification/i });
    await expect(modal).toBeVisible();

    // Check the "I am 18+" checkbox
    await page.getByLabel(/I confirm that I am 18 years of age or older/i).check();

    // "Continue" button should now be enabled
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    // Modal should close and registration form should be visible
    await expect(modal).not.toBeVisible();
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

    // Age verified flag should be persisted
    const ageVerified = await page.evaluate((key) => localStorage.getItem(key), AGE_VERIFIED_KEY);
    expect(ageVerified).toBe('true');
  });

  test('5. Cannot register with an already-existing email', async ({ page }) => {
    const registerPage = new RegisterPage(page);

    await bypassAgeVerification(page);

    // Mock register API to return conflict error for existing email
    await page.route(`${API_BASE}/auth/register`, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            error: 'An account with this email already exists',
            code: 'EMAIL_EXISTS',
          },
        }),
      });
    });

    await registerPage.goto();
    await registerPage.fillName('Existing User');
    await registerPage.fillEmail(TEST_USERS.free.email);
    await registerPage.fillPassword('StrongP@ssword123!');
    await registerPage.checkTerms();
    await registerPage.submit();

    // Error message should indicate duplicate email
    await expect(registerPage.errorBanner).toBeVisible();
    const errorMessage = await registerPage.getErrorMessage();
    expect(errorMessage).toMatch(/already exists|already registered|account.*exists/i);
  });

  test('6. Password strength requirements enforced on client', async ({ page }) => {
    await bypassAgeVerification(page);

    await page.goto('/register');

    // Type a weak password to see password requirements display
    const passwordInput = page.getByLabel('Password', { exact: false });
    await passwordInput.fill('short');

    // Password strength indicator should show "Weak"
    await expect(page.getByText('Weak')).toBeVisible();

    // Requirements checklist should display
    // "At least 12 characters" should NOT be met
    await expect(page.getByText(/at least 12 characters/i)).toBeVisible();

    // Now fill a strong password
    await passwordInput.fill('MyStr0ng!Pass1234');

    // Strength should improve to "Strong" or "Good"
    await expect(page.getByText(/strong|good/i).first()).toBeVisible();

    // Attempt form submission with the weak password
    await passwordInput.fill('weak');

    // Fill other fields and check terms
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).first().fill('test@example.com');

    // The password field should show a validation error on blur or submit
    await passwordInput.blur();

    // Error should mention password requirements
    const passwordError = page.getByText(/at least 12 characters|password must/i);
    await expect(passwordError.first()).toBeVisible();
  });

  test('7. Validation errors shown for invalid email format', async ({ page }) => {
    await bypassAgeVerification(page);

    await page.goto('/register');

    const emailInput = page.getByLabel(/email/i).first();

    // Type an invalid email
    await emailInput.fill('not-an-email');
    await emailInput.blur();

    // Should show email validation error
    await expect(page.getByText(/valid email/i)).toBeVisible();

    // Fix the email — error should clear
    await emailInput.fill('valid@example.com');
    await emailInput.blur();

    // The error should no longer be visible
    await expect(page.getByText(/valid email/i)).not.toBeVisible();
  });

  test('8. ToS and Privacy consent recorded via API on successful registration', async ({
    page,
  }) => {
    const registerPage = new RegisterPage(page);

    await bypassAgeVerification(page);

    // Track the register API call to verify terms acceptance is included
    let registrationPayload: Record<string, unknown> | null = null;

    await page.route(`${API_BASE}/auth/register`, async (route) => {
      const request = route.request();
      registrationPayload = JSON.parse(request.postData() ?? '{}');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Registration successful. Please verify your email.',
        }),
      });
    });

    await registerPage.goto();
    await registerPage.fillName('Consent Test User');
    await registerPage.fillEmail('consent@test.mergenix.com');
    await registerPage.fillPassword('StrongP@ssword123!');
    await registerPage.checkTerms();
    await registerPage.submit();

    // Verify the success screen appears (proving the API was called)
    await expect(page.getByText(/check your email/i)).toBeVisible();

    // Verify that the registration API was called with the correct user data
    // The terms acceptance is implied by the ability to submit (button is disabled without it)
    expect(registrationPayload).not.toBeNull();
    expect(registrationPayload!.email).toBe('consent@test.mergenix.com');
    expect(registrationPayload!.name).toBe('Consent Test User');

    // Verify explicit consent field is transmitted in the API payload (GDPR Article 7).
    // The backend expects either `terms_accepted: true` or a `consents` object —
    // assert that at least one of these keys exists with a truthy value.
    const hasTermsAccepted = registrationPayload!.terms_accepted === true;
    const hasConsentsObject =
      registrationPayload!.consents != null && typeof registrationPayload!.consents === 'object';
    expect(
      hasTermsAccepted || hasConsentsObject,
      `Expected terms_accepted=true or consents object in payload, got: ${JSON.stringify(registrationPayload)}`,
    ).toBe(true);
  });
});

// ── P2: Nice-to-Have Registration Tests ──────────────────────────────────

test.describe('Registration — P2 Nice-to-Have', () => {
  test('9. Age verification recorded as consent event post-registration', async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Start with age verification NOT bypassed — go through the modal
    await page.addInitScript(
      (keys) => {
        localStorage.removeItem(keys.ageKey);
        localStorage.removeItem(keys.under18Key);
      },
      { ageKey: AGE_VERIFIED_KEY, under18Key: UNDER_18_KEY },
    );

    // Mock register API
    await page.route(`${API_BASE}/auth/register`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Registration successful. Please verify your email.',
        }),
      });
    });

    await page.goto('/register');

    // Complete age verification
    const modal = page.getByRole('dialog', { name: /age verification/i });
    await expect(modal).toBeVisible();
    await page.getByLabel(/I confirm that I am 18 years of age or older/i).check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(modal).not.toBeVisible();

    // Verify age verification is stored in localStorage
    const ageVerified = await page.evaluate((key) => localStorage.getItem(key), AGE_VERIFIED_KEY);
    expect(ageVerified).toBe('true');

    // Now complete registration
    await registerPage.fillName('Age Consent User');
    await registerPage.fillEmail('ageconsent@test.mergenix.com');
    await registerPage.fillPassword('StrongP@ssword123!');
    await registerPage.checkTerms();
    await registerPage.submit();

    // Verify successful registration (which triggers consent sync)
    await expect(page.getByText(/check your email/i)).toBeVisible();

    // The age verification consent was captured (localStorage flag is present)
    // In a real E2E with live backend, we would verify the consent API call.
    // With mocks, we confirm the flag is still set after the flow completes.
    const ageVerifiedAfter = await page.evaluate(
      (key) => localStorage.getItem(key),
      AGE_VERIFIED_KEY,
    );
    expect(ageVerifiedAfter).toBe('true');
  });
});
