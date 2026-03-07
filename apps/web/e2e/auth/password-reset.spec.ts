/**
 * Auth E2E Tests — Password Reset Flows
 *
 * Covers: requesting reset link, setting new password with valid token,
 * invalid/expired token error, and reset link reuse prevention.
 *
 * @see docs/PHASE_8C_PLAN.md section 3.3
 */

import { test, expect } from '@playwright/test';
import { API_BASE } from '../utils/mock-api.utils';

// ── Constants ─────────────────────────────────────────────────────────────

/** Password used in reset-password test flows. */
const RESET_PASSWORD = 'NewStr0ngP@ss!2024';

/** Passwords used in the reset-link-reuse test flow. */
const RESET_PASSWORD_FIRST = 'FirstNewP@ss!2024';
const RESET_PASSWORD_SECOND = 'SecondNewP@ss!2024';

// ── P1: Important Password Reset Tests ───────────────────────────────────

test.describe('Password Reset — P1 Important', () => {
  test('1. User can request a password reset link', async ({ page }) => {
    // Mock the forgot-password API — returns success regardless of email
    // (anti-enumeration pattern)
    await page.route(`${API_BASE}/auth/forgot-password`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'If an account exists, a reset link has been sent.',
        }),
      });
    });

    await page.goto('/forgot-password');

    // Page should display the forgot password form
    await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
    await expect(page.getByText(/enter your email.*reset/i)).toBeVisible();

    // Fill in an email and submit
    await page.getByLabel(/email/i).fill('user@test.mergenix.com');
    await page.getByRole('button', { name: /send reset link/i }).click();

    // Should show the success confirmation screen
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();
    await expect(page.getByText(/user@test\.mergenix\.com/i)).toBeVisible();
    await expect(page.getByText(/reset link/i)).toBeVisible();
  });

  test('2. User can set a new password using a valid token', async ({ page }) => {
    // Mock the reset-password API to succeed
    await page.route(`${API_BASE}/auth/reset-password`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Password reset successful.',
        }),
      });
    });

    // Navigate to the reset-password page with a valid token
    await page.goto('/reset-password?token=valid-mock-token-123');

    // Page should show the reset password form
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    await expect(page.getByText(/choose a new password/i)).toBeVisible();

    // Fill in the new password and confirmation
    await page.getByLabel(/new password/i).fill(RESET_PASSWORD);
    await page.getByLabel(/confirm password/i).fill(RESET_PASSWORD);

    // Submit the form
    await page.getByRole('button', { name: /reset password/i }).click();

    // Should show the success state
    await expect(page.getByRole('heading', { name: /password reset!/i })).toBeVisible();
    await expect(page.getByText(/successfully reset/i)).toBeVisible();

    // A "Sign In" button should be available to navigate to login
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});

// ── P2: Nice-to-Have Password Reset Tests ────────────────────────────────

test.describe('Password Reset — P2 Nice-to-Have', () => {
  test('3. Invalid or expired token shows error', async ({ page }) => {
    // Case 1: No token in URL → immediate error state
    await page.goto('/reset-password');

    // Should show error about missing/invalid token
    await expect(page.getByRole('heading', { name: /reset failed/i })).toBeVisible();
    await expect(page.getByText(/no reset token found|please request a new/i)).toBeVisible();

    // A link to request a new reset link should be available
    await expect(page.getByRole('link', { name: /request new link/i })).toBeVisible();
  });

  test('4. Reset link reuse prevented after password change', async ({ page }) => {
    test.slow();

    let resetCallCount = 0;

    // Mock the reset-password API: first call succeeds, second call fails
    await page.route(`${API_BASE}/auth/reset-password`, async (route) => {
      resetCallCount++;

      if (resetCallCount === 1) {
        // First use: success
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Password reset successful.',
          }),
        });
      } else {
        // Second use: token is now invalid (already consumed)
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: {
              error: 'This reset link has already been used or has expired.',
              code: 'TOKEN_EXPIRED',
            },
          }),
        });
      }
    });

    // First use of the reset token — should succeed
    await page.goto('/reset-password?token=one-time-token-xyz');

    await page.getByLabel(/new password/i).fill(RESET_PASSWORD_FIRST);
    await page.getByLabel(/confirm password/i).fill(RESET_PASSWORD_FIRST);
    await page.getByRole('button', { name: /reset password/i }).click();

    await expect(page.getByRole('heading', { name: /password reset!/i })).toBeVisible();

    // Second use of the same token — navigate back and try again
    await page.goto('/reset-password?token=one-time-token-xyz');

    await page.getByLabel(/new password/i).fill(RESET_PASSWORD_SECOND);
    await page.getByLabel(/confirm password/i).fill(RESET_PASSWORD_SECOND);
    await page.getByRole('button', { name: /reset password/i }).click();

    // Should show error indicating the token is consumed/expired
    await expect(page.getByRole('heading', { name: /reset failed/i })).toBeVisible();
    await expect(page.getByText(/already been used|expired/i)).toBeVisible();

    // Verify the API was called twice
    expect(resetCallCount).toBe(2);
  });
});
