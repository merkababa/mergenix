/**
 * Page Object Model for the Subscription page (/subscription).
 *
 * Selectors are derived from the actual SubscriptionPage component in
 * apps/web/app/(app)/subscription/page.tsx.
 */

import type { Page, Locator } from '@playwright/test';

export class SubscriptionPage {
  readonly page: Page;

  // ── Locators ───────────────────────────────────────────────────────

  /** Main page heading "Subscription" */
  readonly heading: Locator;

  /** "Current Plan" section heading */
  readonly currentPlanHeading: Locator;

  /** The tier name displayed (e.g., "Free", "Premium", "Pro") */
  readonly currentTierName: Locator;

  /** "Your Current Plan" badge */
  readonly currentPlanBadge: Locator;

  /** "Payment History" section heading */
  readonly paymentHistoryHeading: Locator;

  /** "Compare All Plans" link */
  readonly compareAllPlansLink: Locator;

  /** "No payments yet" empty state text */
  readonly noPaymentsText: Locator;

  /** "You have the best plan" text (shown for Pro users) */
  readonly bestPlanText: Locator;

  /** Error banner (role="alert") */
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Subscription', exact: true }).first();
    this.currentPlanHeading = page.getByRole('heading', { name: 'Current Plan' });
    // The tier name is in a large text span next to the "Active"/"Inactive" badge
    this.currentTierName = page.locator('[data-testid="current-tier-name"]').or(
      page.locator('span.font-heading.text-3xl'),
    );
    this.currentPlanBadge = page.getByText('Your Current Plan');
    this.paymentHistoryHeading = page.getByRole('heading', { name: 'Payment History' });
    this.compareAllPlansLink = page.getByRole('link', { name: /compare all plans/i });
    this.noPaymentsText = page.getByText('No payments yet');
    this.bestPlanText = page.getByText('You have the best plan');
    this.errorBanner = page.getByRole('alert');
  }

  // ── Actions ────────────────────────────────────────────────────────

  /** Navigate to the subscription page. */
  async goto(): Promise<void> {
    await this.page.goto('/subscription');
  }

  /** Get the current tier text (e.g., "Free", "Premium", "Pro"). */
  async getCurrentTier(): Promise<string> {
    const text = await this.currentTierName.textContent();
    return text?.trim() ?? '';
  }

  /**
   * Click the "Upgrade to {tier}" button.
   *
   * @param tierName - The tier name as displayed, e.g., "Premium" or "Pro"
   */
  async clickUpgrade(tierName: string): Promise<void> {
    await this.page
      .getByRole('button', { name: new RegExp(`upgrade to ${tierName}`, 'i') })
      .click();
  }

  /**
   * Get all tier cards displayed on the page.
   * These are the upgrade option cards showing tier name, features, and price.
   */
  getTierCards(): Locator {
    return this.page.locator('h3', { hasText: /upgrade to/i });
  }

  /** Get the payment history section content. */
  viewPaymentHistory(): Locator {
    return this.page.locator('div', { has: this.paymentHistoryHeading });
  }
}
