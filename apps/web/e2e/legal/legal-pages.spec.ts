import { test, expect } from '@playwright/test';

/**
 * Legal Pages Tests (Section 3.14)
 *
 * Validates the legal page content: GINA notice, data retention policy table,
 * privacy policy, and terms of service. These tests verify that required
 * legal content is present and rendered correctly.
 */
test.describe('Legal Pages', () => {
  // ── Scenario 1 (P1): GINA notice section is present and visible on /legal ──
  test('GINA notice visible on /legal', async ({ page }) => {
    await page.goto('/legal');

    // Verify the page loaded
    await expect(page.getByRole('heading', { level: 1, name: /Legal/i })).toBeVisible();

    // Navigate to or scroll to the GINA section
    // The GINA section has id="gina"
    const ginaSection = page.locator('section#gina');
    await ginaSection.scrollIntoViewIfNeeded();
    await expect(ginaSection).toBeVisible();

    // Verify the GINA heading
    await expect(
      ginaSection.getByRole('heading', { name: /Your Rights Under GINA/i }),
    ).toBeVisible();

    // Verify key GINA content is present
    await expect(ginaSection.getByText(/Genetic Information Nondiscrimination Act/i)).toBeVisible();

    // Verify Title I and Title II sections
    await expect(ginaSection.getByText(/Title I.*Health Insurance/i)).toBeVisible();
    await expect(ginaSection.getByText(/Title II.*Employment/i)).toBeVisible();

    // Verify GINA limitations section
    await expect(ginaSection.getByText(/What GINA Does NOT Cover/i)).toBeVisible();
    await expect(ginaSection.getByText(/Life insurance/i)).toBeVisible();
    await expect(ginaSection.getByText(/Disability insurance/i)).toBeVisible();

    // Verify recommendation to consult genetic counselor
    await expect(
      ginaSection.getByText(/Consult a genetic counselor before making decisions/i),
    ).toBeVisible();
  });

  // ── Scenario 2 (P1): Data retention policy table is visible with correct info ──
  test('data retention policy table visible', async ({ page }) => {
    await page.goto('/legal');

    // Scroll to the privacy section which contains the data retention table
    const privacySection = page.locator('section#privacy');
    await privacySection.scrollIntoViewIfNeeded();
    await expect(privacySection).toBeVisible();

    // Verify the data retention heading
    await expect(privacySection.getByText(/Data Retention Policy/i)).toBeVisible();

    // Verify the data retention table exists
    const retentionTable = privacySection.getByRole('table');
    await retentionTable.scrollIntoViewIfNeeded();
    await expect(retentionTable).toBeVisible();

    // Verify table column headers
    await expect(retentionTable.getByRole('columnheader', { name: /Data Type/i })).toBeVisible();
    await expect(
      retentionTable.getByRole('columnheader', { name: /Retention Period/i }),
    ).toBeVisible();
    await expect(
      retentionTable.getByRole('columnheader', { name: /Deletion Method/i }),
    ).toBeVisible();

    // Verify specific data retention rows are present
    const tableBody = retentionTable.locator('tbody');

    // Account profile row
    await expect(tableBody.getByText('Account profile')).toBeVisible();
    await expect(tableBody.getByText(/Until account deletion/i)).toBeVisible();

    // Saved analysis results row
    await expect(tableBody.getByText('Saved analysis results')).toBeVisible();
    await expect(tableBody.getByText(/Until deleted by user/i)).toBeVisible();

    // Payment records row
    await expect(tableBody.getByText('Payment records')).toBeVisible();
    await expect(tableBody.getByText(/7 years.*record-keeping/i)).toBeVisible();

    // Consent records row
    await expect(tableBody.getByText('Consent records')).toBeVisible();

    // Audit logs row
    await expect(tableBody.getByText('Audit logs')).toBeVisible();
    await expect(tableBody.getByText(/90 days/i)).toBeVisible();

    // Genetic data row — most critical: never stored
    await expect(tableBody.getByText(/Genetic data.*DNA files/i)).toBeVisible();
    await expect(tableBody.getByText(/Never stored/i)).toBeVisible();
    await expect(tableBody.getByText(/processed client-side only/i)).toBeVisible();
  });

  // ── Scenario 3 (P1): Privacy policy accessible and renders correctly ──
  test('privacy policy accessible and renders', async ({ page }) => {
    await page.goto('/legal');

    // Verify the privacy section is present
    const privacySection = page.locator('section#privacy');
    await privacySection.scrollIntoViewIfNeeded();
    await expect(privacySection).toBeVisible();

    // Verify the Privacy Policy heading
    await expect(privacySection.getByRole('heading', { name: /Privacy Policy/i })).toBeVisible();

    // Verify key privacy policy content sections
    await expect(privacySection.getByText(/Genetic Data/i).first()).toBeVisible();
    await expect(privacySection.getByText(/Your DNA data never leaves your device/i)).toBeVisible();

    // Verify Account Data section
    await expect(privacySection.getByText(/Account Data/i)).toBeVisible();
    await expect(privacySection.getByText(/email address, hashed password/i)).toBeVisible();

    // Verify Analytics section
    await expect(privacySection.getByText(/Analytics/).first()).toBeVisible();
    await expect(privacySection.getByText(/anonymous usage analytics/i)).toBeVisible();

    // Verify Third-Party Sharing section
    await expect(privacySection.getByText(/Third-Party Sharing/i)).toBeVisible();
    await expect(
      privacySection.getByText(/We do not sell, share, or provide your personal or genetic data/i),
    ).toBeVisible();

    // Verify Data Deletion section
    await expect(privacySection.getByText(/Data Deletion/i)).toBeVisible();

    // Verify Security section
    await expect(privacySection.getByText(/Security/).first()).toBeVisible();
    await expect(privacySection.getByText(/HTTPS, hashed passwords/i)).toBeVisible();

    // Verify GDPR Rights section
    await expect(privacySection.getByText(/GDPR Rights/i)).toBeVisible();
    await expect(privacySection.getByText(/Right of Access/i)).toBeVisible();
    await expect(privacySection.getByText(/Right to Erasure/i)).toBeVisible();

    // Verify CCPA Rights section
    await expect(privacySection.getByText(/CCPA Rights/i)).toBeVisible();

    // Verify it's also accessible via direct hash link
    await page.goto('/legal#privacy');
    await expect(privacySection).toBeVisible();
  });

  // ── Scenario 4 (P1): Terms of Service accessible and renders correctly ──
  test('terms of service accessible and renders', async ({ page }) => {
    await page.goto('/legal');

    // Verify the terms section is present
    const termsSection = page.locator('section#terms');
    await expect(termsSection).toBeVisible();

    // Verify the Terms of Service heading
    await expect(termsSection.getByRole('heading', { name: /Terms of Service/i })).toBeVisible();

    // Verify key terms sections are present
    await expect(termsSection.getByText(/Acceptance of Terms/i)).toBeVisible();
    await expect(termsSection.getByText(/Service Description/i)).toBeVisible();
    await expect(termsSection.getByText(/Not Medical Advice/i)).toBeVisible();
    await expect(termsSection.getByText(/User Accounts/i)).toBeVisible();
    await expect(termsSection.getByText(/Payment Terms/i)).toBeVisible();
    await expect(termsSection.getByText(/Limitation of Liability/i)).toBeVisible();
    await expect(termsSection.getByText(/Changes to Terms/i)).toBeVisible();
    await expect(termsSection.getByText(/Accuracy Limitations/i)).toBeVisible();

    // Verify key content strings
    await expect(
      termsSection.getByText(/Mergenix provides genetic offspring analysis tools/i),
    ).toBeVisible();
    await expect(termsSection.getByText(/Results are NOT medical diagnoses/i)).toBeVisible();
    await expect(
      termsSection.getByText(/Premium and Pro tiers are one-time purchases/i),
    ).toBeVisible();

    // Verify the "Last updated" date is visible on the page
    await expect(page.getByText(/Last updated:/i)).toBeVisible();

    // Verify it's also accessible via direct hash link
    await page.goto('/legal#terms');
    await expect(termsSection).toBeVisible();
  });
});
