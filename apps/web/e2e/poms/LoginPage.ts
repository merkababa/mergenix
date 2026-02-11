/**
 * Page Object Model for the Login page (/login).
 *
 * Selectors are derived from the actual LoginContent component in
 * apps/web/app/(auth)/login/_components/login-content.tsx.
 *
 * Uses semantic selectors (getByRole, getByLabel, getByText) as primary
 * strategy; falls back to data-testid only when necessary.
 */

import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // ── Locators ───────────────────────────────────────────────────────

  /** The main heading "Welcome Back" */
  readonly heading: Locator;

  /** Email input field (label="Email") */
  readonly emailInput: Locator;

  /** Password input field (label="Password") */
  readonly passwordInput: Locator;

  /** "Remember me" checkbox */
  readonly rememberMeCheckbox: Locator;

  /** Primary "Sign In" submit button */
  readonly submitButton: Locator;

  /** "Sign in with Google" OAuth button */
  readonly googleOAuthButton: Locator;

  /** "Forgot password?" link */
  readonly forgotPasswordLink: Locator;

  /** "Create one free" registration link */
  readonly registerLink: Locator;

  /** Error banner (role="alert") */
  readonly errorBanner: Locator;

  /** 2FA verification code input (label="Verification Code") */
  readonly twoFAInput: Locator;

  /** 2FA "Verify & Sign In" button */
  readonly twoFASubmitButton: Locator;

  /** "Use a different account" button in 2FA step */
  readonly useDifferentAccountButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Welcome Back' });
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.rememberMeCheckbox = page.getByLabel('Remember me');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.googleOAuthButton = page.getByRole('button', { name: /sign in with google/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
    this.registerLink = page.getByRole('link', { name: /create one free/i });
    this.errorBanner = page.getByRole('alert');
    this.twoFAInput = page.getByLabel(/verification code/i);
    this.twoFASubmitButton = page.getByRole('button', { name: /verify & sign in/i });
    this.useDifferentAccountButton = page.getByRole('button', {
      name: /use a different account/i,
    });
  }

  // ── Actions ────────────────────────────────────────────────────────

  /** Navigate to the login page. */
  async goto(returnUrl?: string): Promise<void> {
    const url = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login';
    await this.page.goto(url);
  }

  /** Fill the email input field. */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /** Fill the password input field. */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /** Click the primary Sign In submit button. */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Fill email and password, then submit the login form. */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /** Fill the 2FA verification code input. */
  async fill2FA(code: string): Promise<void> {
    await this.twoFAInput.fill(code);
  }

  /** Get the text content of the error banner. Returns null if not visible. */
  async getErrorMessage(): Promise<string | null> {
    const isVisible = await this.errorBanner.isVisible();
    if (!isVisible) return null;
    return this.errorBanner.textContent();
  }

  /** Get the Google OAuth button locator for assertions. */
  getGoogleOAuthButton(): Locator {
    return this.googleOAuthButton;
  }

  /** Check whether the submit button is disabled. */
  async isSubmitDisabled(): Promise<boolean> {
    return this.submitButton.isDisabled();
  }

  /** Toggle the "Remember me" checkbox. */
  async toggleRememberMe(): Promise<void> {
    await this.rememberMeCheckbox.check();
  }
}
