/**
 * App E2E Tests — Payments & Subscriptions
 *
 * Covers: view tier status, pricing page accuracy, Stripe checkout redirect
 * (mocked), premium-to-pro upgrade, success/cancel pages, payment history,
 * and pro user seeing no upgrade options.
 *
 * All Stripe interactions are mocked via page.route() — no real payment
 * processing occurs during tests.
 *
 * 11 scenarios: P0 (1-3), P1 (4-11)
 *
 * Tier pricing (from packages/shared-types/src/payments.ts):
 *   - Free:    $0.00  (free forever)
 *   - Premium: $14.99 (one-time)
 *   - Pro:     $34.99 (one-time)
 *
 * @see docs/PHASE_8C_PLAN.md section 3.8
 */

/**
 * NOTE: These tests use a fully mocked approach (setupAuthenticatedPage + page.route)
 * rather than the auth.fixture.ts which requires a live backend API.
 * This is intentional: the Playwright suite runs against the Next.js frontend only
 * (no FastAPI backend in CI). The auth fixture is reserved for future backend E2E tests.
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import {
  setupAuthenticatedPage,
  mockPaymentHistory,
  mockSubscriptionStatus,
  mockCreateCheckout,
} from '../utils/mock-api.utils';

// ── P0: Critical Subscription Tests ─────────────────────────────────────

test.describe('Subscription — P0 Critical', () => {
  test('1. User can view current subscription/tier status', async ({ page }) => {
    await setupAuthenticatedPage(page, { tier: 'free' });
    await mockPaymentHistory(page);
    await mockSubscriptionStatus(page, { tier: 'free', isActive: false });

    await page.goto('/subscription');

    // The subscription heading should be visible
    await expect(page.getByRole('heading', { name: /subscription/i, level: 1 })).toBeVisible();

    // "Current Plan" section should be visible
    await expect(page.getByRole('heading', { name: /current plan/i })).toBeVisible();

    // The user's current tier should be displayed (Free)
    await expect(page.getByText('Free').first()).toBeVisible();

    // The price should show "$0.00"
    await expect(page.getByText('$0.00')).toBeVisible();

    // "Your Current Plan" badge should be visible
    await expect(page.getByText('Your Current Plan')).toBeVisible();
  });

  test('2. Products page displays all tiers with correct prices and features', async ({ page }) => {
    await setupAuthenticatedPage(page, { tier: 'free' });
    await mockPaymentHistory(page);
    await mockSubscriptionStatus(page, { tier: 'free', isActive: false });

    await page.goto('/subscription');

    // Wait for the page to fully load
    await expect(page.getByRole('heading', { name: /subscription/i, level: 1 })).toBeVisible();

    // Upgrade options should be visible for free users
    // Premium upgrade card
    await expect(page.getByRole('heading', { name: /upgrade to premium/i })).toBeVisible();

    // Verify Premium price: $14.99
    await expect(page.getByText('$14.99').first()).toBeVisible();

    // Pro upgrade card
    await expect(page.getByRole('heading', { name: /upgrade to pro/i })).toBeVisible();

    // Verify Pro price: $34.99
    await expect(page.getByText('$34.99').first()).toBeVisible();

    // Verify key feature descriptions
    await expect(page.getByText(/500\+ diseases/i).first()).toBeVisible();
    await expect(page.getByText(/\d+ traits/i).first()).toBeVisible();
    await expect(page.getByText(/pharmacogenomics/i).first()).toBeVisible();

    // "Compare All Plans" link should be visible
    await expect(page.getByRole('link', { name: /compare all plans/i })).toBeVisible();
  });

  test('3. Free user redirected to Stripe checkout for upgrade (mocked)', async ({ page }) => {
    await setupAuthenticatedPage(page, { tier: 'free' });
    await mockPaymentHistory(page);
    await mockSubscriptionStatus(page, { tier: 'free', isActive: false });
    await mockCreateCheckout(page, 'premium');

    // Intercept the Stripe checkout redirect
    let checkoutUrl: string | null = null;
    await page.route('https://checkout.stripe.com/**', async (route) => {
      checkoutUrl = route.request().url();
      // Abort the navigation — we just want to verify the redirect was attempted
      await route.abort();
    });

    await page.goto('/subscription');

    // Click "Upgrade to Premium"
    const upgradeButton = page.getByRole('button', {
      name: /upgrade to premium/i,
    });
    await expect(upgradeButton).toBeVisible();
    await upgradeButton.click();

    // Wait for the checkout redirect to be initiated by polling for the intercepted URL
    await expect
      .poll(() => checkoutUrl, {
        message: 'Stripe checkout URL should be captured by route interceptor',
        timeout: 10_000,
      })
      .toBeTruthy();

    // Verify the checkout endpoint was called
    // (The mock returns a Stripe URL, and the code does window.location.href = checkoutUrl)
    // Since we intercepted the Stripe domain, verify the pattern
    expect(checkoutUrl).toContain('checkout.stripe.com');
  });
});

// ── P1: Important Subscription Tests ────────────────────────────────────

test.describe('Subscription — P1 Important', () => {
  test('4. Premium-to-Pro upgrade flow with prorated display', async ({ page }) => {
    await setupAuthenticatedPage(page, {
      tier: 'premium',
      email: TEST_USERS.premium.email,
      name: 'Premium User',
    });
    await mockPaymentHistory(page, [
      {
        id: 'pay-001',
        amount: 1499,
        currency: 'usd',
        status: 'succeeded',
        tierGranted: 'premium',
        createdAt: '2025-01-15T10:00:00Z',
      },
    ]);
    await mockSubscriptionStatus(page, {
      tier: 'premium',
      isActive: true,
      purchaseDate: '2025-01-15T10:00:00Z',
    });

    await page.goto('/subscription');

    // Current plan should show Premium
    await expect(page.getByText('Premium').first()).toBeVisible();
    await expect(page.getByText('$14.99').first()).toBeVisible();

    // Only Pro upgrade should be shown (not Premium again)
    await expect(page.getByRole('heading', { name: /upgrade to pro/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /upgrade to premium/i })).not.toBeVisible();

    // Prorated display: "Pay $20.00 to upgrade"
    // Pro ($34.99) - Premium ($14.99) = $20.00
    await expect(page.getByText(/\$20\.00/)).toBeVisible();
  });

  test('5. Successful payment redirects to /payment/success page', async ({ page }) => {
    await setupAuthenticatedPage(page, {
      tier: 'premium',
      email: TEST_USERS.premium.email,
      name: 'Premium User',
    });

    // Navigate directly to the success page with a mock session ID
    await page.goto('/payment/success?session_id=cs_mock_test_session');

    // The success page should show a "Payment Successful!" heading
    await expect(page.getByRole('heading', { name: /payment successful/i })).toBeVisible({
      timeout: 15000,
    });

    // Should show "Your account has been upgraded"
    await expect(page.getByText(/your account has been upgraded/i)).toBeVisible();

    // Should display the session ID
    await expect(page.getByText('cs_mock_test_session')).toBeVisible();

    // Should have a "Go to My Plan" link
    await expect(page.getByRole('link', { name: /go to my plan/i })).toBeVisible();

    // Should show a countdown for auto-redirect
    await expect(page.getByText(/redirecting in/i)).toBeVisible();
  });

  test('6. Cancelled payment redirects to /payment/cancel page', async ({ page }) => {
    await page.goto('/payment/cancel');

    // The cancel page should show "Payment Cancelled" heading
    await expect(page.getByRole('heading', { name: /payment cancelled/i })).toBeVisible();

    // Should explain no charges were made
    await expect(page.getByText(/your payment was not completed/i)).toBeVisible();
    await expect(page.getByText(/no charges were made/i)).toBeVisible();

    // Should have a "Try Again" link to /products
    const tryAgainLink = page.getByRole('link', { name: /try again/i });
    await expect(tryAgainLink).toBeVisible();
    await expect(tryAgainLink).toHaveAttribute('href', '/products');

    // Should have a "Go to Dashboard" link to /analysis
    const dashboardLink = page.getByRole('link', { name: /go to dashboard/i });
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute('href', '/analysis');
  });

  test('7. After upgrade, subscription page shows new active tier', async ({ page }) => {
    // Simulate a user who just upgraded to Premium
    await setupAuthenticatedPage(page, {
      tier: 'premium',
      email: TEST_USERS.premium.email,
      name: 'Premium User',
    });
    await mockPaymentHistory(page, [
      {
        id: 'pay-001',
        amount: 1499,
        currency: 'usd',
        status: 'succeeded',
        tierGranted: 'premium',
        createdAt: new Date().toISOString(),
      },
    ]);
    await mockSubscriptionStatus(page, {
      tier: 'premium',
      isActive: true,
      purchaseDate: new Date().toISOString(),
    });

    await page.goto('/subscription');

    // Current plan should show Premium
    await expect(page.getByText('Premium').first()).toBeVisible();

    // Active badge should be visible
    await expect(page.getByText('Active').first()).toBeVisible();

    // Price should show $14.99
    await expect(page.getByText('$14.99').first()).toBeVisible();

    // Description should say "One-time purchase - Lifetime access"
    await expect(page.getByText(/one-time purchase/i).first()).toBeVisible();
  });

  test('8. Payment history displays accurately', async ({ page }) => {
    await setupAuthenticatedPage(page, {
      tier: 'premium',
      email: TEST_USERS.premium.email,
    });
    await mockPaymentHistory(page, [
      {
        id: 'pay-001',
        amount: 1499,
        currency: 'usd',
        status: 'succeeded',
        tierGranted: 'premium',
        createdAt: '2025-06-15T10:30:00Z',
      },
    ]);
    await mockSubscriptionStatus(page, {
      tier: 'premium',
      isActive: true,
    });

    await page.goto('/subscription');

    // The payment history section should be visible
    await expect(page.getByRole('heading', { name: /payment history/i })).toBeVisible();

    // Verify payment entry is displayed
    await expect(page.getByText('Premium Plan Purchase')).toBeVisible();

    // Verify the amount ($14.99 displayed from 1499 cents)
    await expect(page.getByText('$14.99').first()).toBeVisible();

    // Verify the status is shown
    await expect(page.getByText(/succeeded/i).first()).toBeVisible();
  });

  test('9. Empty payment history shows appropriate message', async ({ page }) => {
    await setupAuthenticatedPage(page, { tier: 'free' });
    await mockPaymentHistory(page, []);
    await mockSubscriptionStatus(page, { tier: 'free', isActive: false });

    await page.goto('/subscription');

    // The payment history section should be visible
    await expect(page.getByRole('heading', { name: /payment history/i })).toBeVisible();

    // With an empty payment history, an empty-state message should appear
    await expect(page.getByText(/no payment|no purchases|no transactions/i)).toBeVisible();
  });

  test('10. Pro tier user redirected to Stripe checkout for Pro upgrade', async ({ page }) => {
    await setupAuthenticatedPage(page, { tier: 'free' });
    await mockPaymentHistory(page);
    await mockSubscriptionStatus(page, { tier: 'free', isActive: false });
    await mockCreateCheckout(page, 'pro');

    // Intercept the Stripe checkout redirect
    let checkoutUrl: string | null = null;
    await page.route('https://checkout.stripe.com/**', async (route) => {
      checkoutUrl = route.request().url();
      // Abort the navigation — we just want to verify the redirect was attempted
      await route.abort();
    });

    await page.goto('/subscription');

    // Click "Upgrade to Pro"
    const upgradeButton = page.getByRole('button', {
      name: /upgrade to pro/i,
    });
    await expect(upgradeButton).toBeVisible();
    await upgradeButton.click();

    // Wait for the checkout redirect to be initiated by polling for the intercepted URL
    await expect
      .poll(() => checkoutUrl, {
        message: 'Stripe checkout URL should be captured by route interceptor',
        timeout: 10_000,
      })
      .toBeTruthy();

    // Verify the checkout endpoint was called with the "pro" tier
    expect(checkoutUrl).toContain('checkout.stripe.com');
    expect(checkoutUrl).toContain('pro');
  });

  test('11. Pro user sees active plan with no upgrade options', async ({ page }) => {
    await setupAuthenticatedPage(page, {
      tier: 'pro',
      email: TEST_USERS.pro.email,
      name: 'Pro User',
    });
    await mockPaymentHistory(page, [
      {
        id: 'pay-001',
        amount: 3499,
        currency: 'usd',
        status: 'succeeded',
        tierGranted: 'pro',
        createdAt: '2025-06-01T10:00:00Z',
      },
    ]);
    await mockSubscriptionStatus(page, {
      tier: 'pro',
      isActive: true,
      purchaseDate: '2025-06-01T10:00:00Z',
    });

    await page.goto('/subscription');

    // Current plan should show Pro
    await expect(page.getByText('Pro').first()).toBeVisible();

    // Price should show $34.99
    await expect(page.getByText('$34.99').first()).toBeVisible();

    // Active badge
    await expect(page.getByText('Active').first()).toBeVisible();

    // No upgrade options should be shown
    // Instead, a "You have the best plan" message should appear
    await expect(page.getByRole('heading', { name: /you have the best plan/i })).toBeVisible();

    await expect(page.getByText(/Pro plan with full access to all features/i)).toBeVisible();

    // No "Upgrade to" headings should be present
    await expect(page.getByRole('heading', { name: /upgrade to premium/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: /upgrade to pro/i })).not.toBeVisible();
  });
});
