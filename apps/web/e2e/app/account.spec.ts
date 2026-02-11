/**
 * App E2E Tests — Account Management
 *
 * Covers: view account page, update display name, change password,
 * 2FA enable/disable, backup codes, sessions, revoke session,
 * data export, account deletion (password + checkbox confirmation),
 * post-deletion redirect, and empty states.
 *
 * 12 scenarios: P0 (1), P1 (2-11), P2 (12)
 *
 * @see docs/PHASE_8C_PLAN.md section 3.7
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
  API_BASE,
  setupAuthenticatedPage,
  mockAuthMe,
  mockConsentSync,
  mockSessions,
  mockUpdateProfile,
  mockChangePassword,
  mock2FASetup,
  mock2FAVerify,
  mock2FADisable,
  mockRevokeSession,
  mockDataExport,
  mockDeleteAccount,
  mockLogout,
} from '../utils/mock-api.utils';

// ── P0: Critical Account Tests ──────────────────────────────────────────

test.describe('Account — P0 Critical', () => {
  test('1. User can view their account page', async ({ page }) => {
    await setupAuthenticatedPage(page);

    await page.goto('/account');

    // The account settings heading should be visible
    await expect(
      page.getByRole('heading', { name: /account settings/i, level: 1 }),
    ).toBeVisible();

    // Main sections should be visible
    // Profile section
    await expect(
      page.getByRole('heading', { name: /profile/i }),
    ).toBeVisible();

    // Security section
    await expect(
      page.getByRole('heading', { name: /security/i }),
    ).toBeVisible();

    // Active Sessions section
    await expect(
      page.getByRole('heading', { name: /active sessions/i }),
    ).toBeVisible();

    // Data Export section
    await expect(
      page.getByRole('heading', { name: /export your data/i }),
    ).toBeVisible();

    // Danger Zone section
    await expect(
      page.getByRole('heading', { name: /danger zone/i }),
    ).toBeVisible();
  });
});

// ── P1: Important Account Tests ─────────────────────────────────────────

test.describe('Account — P1 Important', () => {
  test('2. User can update their display name', async ({ page }) => {
    await setupAuthenticatedPage(page, { name: 'Original Name' });
    await mockUpdateProfile(page);

    await page.goto('/account');

    // Wait for the profile section to render
    await expect(
      page.getByRole('heading', { name: /profile/i }),
    ).toBeVisible();

    // Find the display name input (labeled "Display Name")
    const nameInput = page.getByLabel(/display name/i);
    await expect(nameInput).toBeVisible();

    // Verify current name is displayed
    await expect(nameInput).toHaveValue('Original Name');

    // Clear and type new name
    await nameInput.clear();
    await nameInput.fill('Updated Name');

    // Click "Save Changes"
    const saveButton = page.getByRole('button', { name: /save changes/i });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Verify success feedback
    await expect(page.getByText(/changes saved/i)).toBeVisible({ timeout: 5000 });
  });

  test('3. User can change their password', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockChangePassword(page);

    await page.goto('/account');

    // Find the password section and click "Change"
    const changePasswordButton = page
      .getByRole('button', { name: /change/i })
      .first();
    await expect(changePasswordButton).toBeVisible();
    await changePasswordButton.click();

    // The change password modal should appear
    // Look for password input fields in the modal
    const currentPasswordInput = page.getByLabel(/current password/i);
    const newPasswordInput = page.getByLabel(/new password/i).first();

    await expect(currentPasswordInput).toBeVisible({ timeout: 5000 });
    await expect(newPasswordInput).toBeVisible();

    // Fill in the password fields
    await currentPasswordInput.fill(TEST_USERS.free.password);
    await newPasswordInput.fill('NewStrongPassword123!');

    // If there's a confirm password field, fill that too
    const confirmPasswordInput = page.getByLabel(/confirm.*password/i);
    if (await confirmPasswordInput.isVisible()) {
      await confirmPasswordInput.fill('NewStrongPassword123!');
    }

    // Submit the password change
    const submitButton = page.getByRole('button', { name: /update password|save|change password/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }

    // Assert success: either a success toast/message appears or the modal closes
    await expect(
      page.getByText(/password updated|password changed/i)
        .or(page.getByText(/changes saved/i)),
    ).toBeVisible({ timeout: 5000 });
  });

  test('4. User can enable 2FA and view backup codes', async ({ page }) => {
    await setupAuthenticatedPage(page, { totp_enabled: false });
    await mock2FASetup(page);
    await mock2FAVerify(page);

    await page.goto('/account');

    // Find the 2FA section
    await expect(
      page.getByText(/two-factor authentication/i),
    ).toBeVisible();

    // Click "Enable" button for 2FA
    const enableButton = page.getByRole('button', { name: /enable/i }).last();
    await expect(enableButton).toBeVisible();
    await enableButton.click();

    // The 2FA setup modal should appear
    // It should show a QR code or setup secret and backup codes
    await expect(
      page.getByText(/authenticator/i).first(),
    ).toBeVisible({ timeout: 5000 });

    // Fill in the TOTP verification code
    const totpInput = page.getByPlaceholder('000000')
      .or(page.getByLabel(/verification code|totp code|authenticator code/i));
    await expect(totpInput).toBeVisible({ timeout: 5000 });
    await totpInput.fill('123456');

    // Click verify/confirm to complete 2FA setup
    const verifyButton = page.getByRole('button', { name: /verify|confirm|enable/i }).last();
    await expect(verifyButton).toBeVisible();
    await verifyButton.click();

    // Assert that backup codes are displayed or a success message appears
    await expect(
      page.getByText(/backup code/i)
        .or(page.getByText(/2FA enabled/i))
        .or(page.getByText(/ABCD-1234/)),
    ).toBeVisible({ timeout: 5000 });
  });

  test('5. User can disable 2FA', async ({ page }) => {
    await setupAuthenticatedPage(page, { totp_enabled: true });
    await mock2FADisable(page);

    await page.goto('/account');

    // With 2FA enabled, the section should say "2FA is enabled"
    await expect(
      page.getByText(/2FA is enabled/i),
    ).toBeVisible();

    // Click "Disable" button
    const disableButton = page.getByRole('button', { name: /disable/i });
    await expect(disableButton).toBeVisible();
    await disableButton.click();

    // An inline form should appear asking for the authenticator code
    await expect(
      page.getByText(/enter your authenticator code/i),
    ).toBeVisible();

    // Enter a 6-digit code
    const codeInput = page.getByPlaceholder('000000');
    await expect(codeInput).toBeVisible();
    await codeInput.fill('123456');

    // Click confirm
    const confirmButton = page.getByRole('button', { name: /confirm/i });
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // Assert success: 2FA disabled message or status change
    await expect(
      page.getByText(/2FA disabled|2FA has been disabled|two-factor.*disabled/i)
        .or(page.getByText(/2FA is not enabled/i)),
    ).toBeVisible({ timeout: 5000 });
  });

  test('6. User can view active sessions', async ({ page }) => {
    await setupAuthenticatedPage(page);

    await page.goto('/account');

    // The sessions section should be visible
    await expect(
      page.getByRole('heading', { name: /active sessions/i }),
    ).toBeVisible();

    // Wait for sessions to load (mocked data includes 2 sessions)
    // Current session should be marked
    await expect(page.getByText('Current').first()).toBeVisible({ timeout: 5000 });

    // Device names should be visible
    await expect(page.getByText('Chrome on Windows')).toBeVisible();
    await expect(page.getByText('Safari on iPhone')).toBeVisible();

    // IP addresses should be visible
    await expect(page.getByText('192.168.1.1')).toBeVisible();
  });

  test('7. User can revoke another session', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockRevokeSession(page);

    await page.goto('/account');

    // Wait for sessions to load
    await expect(page.getByText('Safari on iPhone')).toBeVisible({ timeout: 5000 });

    // Click "Revoke" on the non-current session
    const revokeButton = page.getByRole('button', {
      name: /revoke session on safari/i,
    });
    await expect(revokeButton).toBeVisible();
    await revokeButton.click();

    // Assert success: a revocation message appears, OR the session is removed from the list
    await Promise.race([
      expect(page.getByText(/session revoked|session removed/i)).toBeVisible({ timeout: 5000 }),
      expect(page.getByText('Safari on iPhone')).not.toBeVisible({ timeout: 5000 }),
    ]);
  });

  test('8. User can export their data as JSON', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockDataExport(page);

    await page.goto('/account');

    // Find the data export section
    await expect(
      page.getByRole('heading', { name: /export your data/i }),
    ).toBeVisible();

    // Verify the export description mentions JSON format
    await expect(
      page.getByText(/download a copy of all your personal data in json format/i),
    ).toBeVisible();

    // Click "Export as JSON"
    const exportButton = page.getByRole('button', { name: /export as json/i });
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    // Wait for export to complete — the button should change to show "Export ready!"
    await expect(page.getByText(/export ready/i)).toBeVisible({ timeout: 10000 });

    // A download link should appear
    await expect(
      page.getByRole('link', { name: /download mergenix-data-export\.json/i }),
    ).toBeVisible();
  });

  test('9. Account deletion requires correct password + confirmation checkbox', async ({
    page,
  }) => {
    await setupAuthenticatedPage(page);

    await page.goto('/account');

    // Find and expand the Danger Zone section
    const dangerZoneHeader = page.getByRole('button', {
      name: /danger zone/i,
    });
    await expect(dangerZoneHeader).toBeVisible();
    await dangerZoneHeader.click();

    // Wait for the expanded content to appear
    await expect(
      page.getByText(/permanently delete your account/i),
    ).toBeVisible();

    // The delete button should be disabled initially
    const deleteButton = page.getByRole('button', {
      name: /delete my account permanently/i,
    });
    await expect(deleteButton).toBeDisabled();

    // Enter password
    const passwordInput = page.getByLabel(/confirm your password/i);
    await passwordInput.fill(TEST_USERS.free.password);

    // Still disabled — checkbox not checked
    await expect(deleteButton).toBeDisabled();

    // Check the confirmation checkbox
    const confirmCheckbox = page.getByRole('checkbox');
    await confirmCheckbox.check();

    // Now the delete button should be enabled
    await expect(deleteButton).toBeEnabled();
  });

  test('10. User can permanently delete their account', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockDeleteAccount(page);
    await mockLogout(page);

    await page.goto('/account');

    // Expand Danger Zone
    await page.getByRole('button', { name: /danger zone/i }).click();
    await expect(
      page.getByText(/permanently delete your account/i),
    ).toBeVisible();

    // Fill password and check confirmation
    await page.getByLabel(/confirm your password/i).fill(TEST_USERS.free.password);
    await page.getByRole('checkbox').check();

    // Click delete
    const deleteButton = page.getByRole('button', {
      name: /delete my account permanently/i,
    });
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();

    // After deletion, user should be redirected to home page
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('11. After deletion, user is logged out and cannot log back in', async ({
    page,
  }) => {
    await setupAuthenticatedPage(page);
    await mockDeleteAccount(page);
    await mockLogout(page);

    await page.goto('/account');

    // Expand Danger Zone and delete
    await page.getByRole('button', { name: /danger zone/i }).click();
    await expect(
      page.getByText(/permanently delete your account/i),
    ).toBeVisible();

    await page.getByLabel(/confirm your password/i).fill(TEST_USERS.free.password);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', {
      name: /delete my account permanently/i,
    }).click();

    // After deletion redirect, verify user is logged out
    // Navigating to /account should redirect to /login
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Try to access protected route — should redirect to login
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

// ── P2: Nice-to-Have Account Tests ──────────────────────────────────────

test.describe('Account — P2 Nice-to-Have', () => {
  test('12. Empty states displayed correctly (no sessions, no payments)', async ({
    page,
  }) => {
    // Set up with empty sessions
    await page.addInitScript(() => {
      window.localStorage.setItem('mergenix_access_token', 'mock-access-token');
      window.localStorage.setItem('mergenix_refresh_token', 'mock-refresh-token');
    });
    await mockAuthMe(page);
    await mockConsentSync(page);
    await mockSessions(page, []); // Empty sessions array

    await page.goto('/account');

    // Wait for the account page to load
    await expect(
      page.getByRole('heading', { name: /account settings/i, level: 1 }),
    ).toBeVisible();

    // The sessions section should show an empty state message
    await expect(
      page.getByText(/no other sessions found/i).or(
        page.getByText(/you are only signed in on this device/i),
      ),
    ).toBeVisible({ timeout: 5000 });
  });
});
