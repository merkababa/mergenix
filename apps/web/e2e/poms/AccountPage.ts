/**
 * Page Object Model for the Account Settings page (/account).
 *
 * Selectors are derived from the actual account page components:
 * - AccountContent (app/(app)/account/_components/account-content.tsx)
 * - ProfileSection (app/(app)/account/_components/profile-section.tsx)
 * - SecuritySection (app/(app)/account/_components/security-section.tsx)
 * - SessionsSection (app/(app)/account/_components/sessions-section.tsx)
 * - DangerZone (app/(app)/account/_components/danger-zone.tsx)
 * - DataExportCard (components/account/data-export-card.tsx)
 */

import type { Page, Locator } from '@playwright/test';

export class AccountPage {
  readonly page: Page;

  // ── Locators ───────────────────────────────────────────────────────

  /** Main page heading "Account Settings" */
  readonly heading: Locator;

  /** Profile section heading */
  readonly profileHeading: Locator;

  /** Display Name input (label="Display Name") */
  readonly displayNameInput: Locator;

  /** "Save Changes" button in the profile section */
  readonly saveChangesButton: Locator;

  /** Security section heading */
  readonly securityHeading: Locator;

  /** "Change" password button */
  readonly changePasswordButton: Locator;

  /** "Enable" 2FA button */
  readonly enable2FAButton: Locator;

  /** "Disable" 2FA button */
  readonly disable2FAButton: Locator;

  /** Active Sessions section heading */
  readonly sessionsHeading: Locator;

  /** "Export Your Data" section heading */
  readonly dataExportHeading: Locator;

  /** "Export as JSON" button */
  readonly exportDataButton: Locator;

  /** Danger Zone section heading/toggle */
  readonly dangerZoneToggle: Locator;

  /** "Delete My Account Permanently" button */
  readonly deleteAccountButton: Locator;

  /** Account deletion confirmation checkbox */
  readonly deleteConfirmCheckbox: Locator;

  /** Account deletion password input (label="Confirm your password") */
  readonly deletePasswordInput: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Account Settings' });
    this.profileHeading = page.getByRole('heading', { name: 'Profile' });
    this.displayNameInput = page.getByLabel('Display Name');
    this.saveChangesButton = page.getByRole('button', { name: /save changes/i });
    this.securityHeading = page.getByRole('heading', { name: 'Security' });
    this.changePasswordButton = page.getByRole('button', { name: 'Change' });
    this.enable2FAButton = page.getByRole('button', { name: 'Enable' });
    this.disable2FAButton = page.getByRole('button', { name: 'Disable' });
    this.sessionsHeading = page.getByRole('heading', { name: 'Active Sessions' });
    this.dataExportHeading = page.getByRole('heading', { name: /export your data/i });
    this.exportDataButton = page.getByRole('button', { name: /export as json/i });
    this.dangerZoneToggle = page.getByRole('button', { name: /danger zone/i });
    this.deleteAccountButton = page.getByRole('button', {
      name: /delete my account permanently/i,
    });
    this.deleteConfirmCheckbox = page.getByRole('checkbox', {
      name: /i understand this action is permanent/i,
    });
    this.deletePasswordInput = page.getByLabel(/confirm your password/i);
  }

  // ── Actions ────────────────────────────────────────────────────────

  /** Navigate to the account page. */
  async goto(): Promise<void> {
    await this.page.goto('/account');
  }

  /** Get the current display name value from the input. */
  async getDisplayName(): Promise<string> {
    return this.displayNameInput.inputValue();
  }

  /** Update the display name and save. */
  async updateDisplayName(newName: string): Promise<void> {
    await this.displayNameInput.clear();
    await this.displayNameInput.fill(newName);
    await this.saveChangesButton.click();
  }

  /**
   * Open the change password modal and fill in the fields.
   * The modal has "Current Password" and "New Password" inputs.
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.changePasswordButton.click();

    // Wait for the modal to appear
    const dialog = this.page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });

    await dialog.getByLabel(/current password/i).fill(currentPassword);
    await dialog.getByLabel(/new password/i).fill(newPassword);
    await dialog.getByRole('button', { name: /change password/i }).click();
  }

  /**
   * Toggle 2FA on or off. When enabling, opens the 2FA setup modal.
   * Returns the locator for the 2FA setup modal if enabling.
   */
  async toggle2FA(): Promise<Locator> {
    // Click whichever button is visible: Enable or Disable
    const enableVisible = await this.enable2FAButton.isVisible().catch(() => false);
    if (enableVisible) {
      await this.enable2FAButton.click();
    } else {
      await this.disable2FAButton.click();
    }
    return this.page.getByRole('dialog');
  }

  /**
   * Get the backup codes displayed after 2FA setup.
   * These appear in the 2FA setup modal after verification.
   */
  async getBackupCodes(): Promise<string[]> {
    const dialog = this.page.getByRole('dialog');
    // Backup codes are typically displayed as a list of code elements
    const codeElements = dialog.locator('[data-testid="backup-code"]');
    const count = await codeElements.count();
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await codeElements.nth(i).textContent();
      if (text) codes.push(text.trim());
    }
    return codes;
  }

  /** Get the sessions section for assertions. */
  async viewSessions(): Promise<Locator> {
    // Sessions are loaded automatically on the account page
    await this.sessionsHeading.scrollIntoViewIfNeeded();
    return this.page.locator('section', { has: this.sessionsHeading });
  }

  /**
   * Revoke a specific session by clicking its "Revoke" button.
   *
   * @param deviceName - The device name text to identify the session
   */
  async revokeSession(deviceName: string): Promise<void> {
    const sessionRow = this.page.locator('div', { hasText: deviceName });
    await sessionRow.getByRole('button', { name: /revoke/i }).click();
  }

  /** Click the "Export as JSON" button to trigger data export. */
  async exportData(): Promise<void> {
    await this.exportDataButton.scrollIntoViewIfNeeded();
    await this.exportDataButton.click();
  }

  /**
   * Expand the danger zone, fill in password and confirm checkbox,
   * then click the delete button.
   */
  async deleteAccount(password: string): Promise<void> {
    // Expand the danger zone
    await this.dangerZoneToggle.click();

    // Wait for the expandable content to become visible
    await this.deletePasswordInput.waitFor({ state: 'visible' });

    // Fill password
    await this.deletePasswordInput.fill(password);

    // Check the confirmation checkbox
    await this.deleteConfirmCheckbox.check();

    // Click the delete button
    await this.deleteAccountButton.click();
  }

  /** Get the confirmation checkbox locator for assertions. */
  getConfirmCheckbox(): Locator {
    return this.deleteConfirmCheckbox;
  }
}
