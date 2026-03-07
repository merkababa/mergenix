/**
 * Page Object Model for the Register page (/register).
 *
 * Selectors are derived from the actual RegisterContent component in
 * apps/web/app/(auth)/register/_components/register-content.tsx.
 */

import type { Page, Locator } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;

  // ── Locators ───────────────────────────────────────────────────────

  /** The main heading "Create Account" */
  readonly heading: Locator;

  /** Full Name input field (label="Full Name") */
  readonly nameInput: Locator;

  /** Email input field (label="Email") */
  readonly emailInput: Locator;

  /** Password input field (label="Password") */
  readonly passwordInput: Locator;

  /**
   * Terms & Privacy Policy checkbox.
   * The checkbox label contains "I agree to the Terms of Service and Privacy Policy".
   */
  readonly termsCheckbox: Locator;

  /** "Create Account" submit button */
  readonly submitButton: Locator;

  /** "Sign up with Google" OAuth button */
  readonly googleOAuthButton: Locator;

  /** General error banner (role="alert") */
  readonly errorBanner: Locator;

  /** "Sign in" link for existing users */
  readonly signInLink: Locator;

  /** Success screen heading "Check your email" */
  readonly successHeading: Locator;

  /** "Resend Email" button on the success screen */
  readonly resendButton: Locator;

  /** "Back to Sign In" button on the success screen */
  readonly backToSignInButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Create Account' });
    this.nameInput = page.getByLabel('Full Name');
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    // The terms checkbox is inside a label that starts with "I agree to the"
    this.termsCheckbox = page.getByRole('checkbox', { name: /i agree to the/i });
    this.submitButton = page.getByRole('button', { name: 'Create Account' });
    this.googleOAuthButton = page.getByRole('button', { name: /sign up with google/i });
    this.errorBanner = page.getByRole('alert');
    this.signInLink = page.getByRole('link', { name: /sign in/i });
    this.successHeading = page.getByRole('heading', { name: /check your email/i });
    this.resendButton = page.getByRole('button', { name: /resend email/i });
    this.backToSignInButton = page.getByRole('button', { name: /back to sign in/i });
  }

  // ── Actions ────────────────────────────────────────────────────────

  /** Navigate to the register page. */
  async goto(): Promise<void> {
    await this.page.goto('/register');
  }

  /** Fill the Full Name input field. */
  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  /** Fill the Email input field. */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /** Fill the Password input field. */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Fill the Confirm Password input field.
   * Note: The current RegisterContent component does not have a separate
   * "confirm password" field. This method is a placeholder for when one
   * is added. Currently it is a no-op.
   */
  async fillConfirmPassword(_password: string): Promise<void> {
    // The registration form currently does not include a confirm password field.
    // This method is included for interface completeness per the plan.
  }

  /** Check the Terms & Privacy Policy checkbox. */
  async checkTerms(): Promise<void> {
    await this.termsCheckbox.check();
  }

  /**
   * Handle the age verification modal if it appears.
   * The AgeVerificationModal is rendered on the register page and blocks
   * interaction until the user confirms they are 18+.
   */
  async checkAgeVerification(): Promise<void> {
    // The age verification modal uses a dialog role or a visible confirm button.
    // Look for the "I am 18 or older" / age confirmation button.
    const confirmButton = this.page.getByRole('button', { name: /i am 18/i });
    const isVisible = await confirmButton.isVisible().catch(() => false);
    if (isVisible) {
      await confirmButton.click();
    }
  }

  /** Click the "Create Account" submit button. */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Complete the full registration flow. */
  async register(name: string, email: string, password: string): Promise<void> {
    await this.fillName(name);
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.checkTerms();
    await this.submit();
  }

  /** Get the text content of the error banner. Returns null if not visible. */
  async getErrorMessage(): Promise<string | null> {
    const isVisible = await this.errorBanner.isVisible();
    if (!isVisible) return null;
    return this.errorBanner.textContent();
  }
}
