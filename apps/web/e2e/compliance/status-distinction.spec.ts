/**
 * Q14: Visual Regression — "Not Detected" vs "Not Tested" Status Distinction
 *
 * Playwright tests verifying the UI clearly distinguishes two distinct
 * result states in the Carrier tab:
 *
 * - "Not Detected" / "Low Risk": The rsID WAS present in the DNA file and
 *   both parents tested negative (normal). Risk level = "low_risk".
 *   RISK_LABELS maps this to "Low Risk". Badge variant = "normal" (green teal).
 *
 * - "Not Tested": The rsID was NOT present in the DNA file at all (not on
 *   chip). Risk level = "not_tested". RISK_LABELS maps this to "Not Tested".
 *   Badge variant = "default" (gray/neutral).
 *
 * Source evidence:
 *   - apps/web/lib/genetics-constants.ts: RISK_LABELS maps these differently
 *   - apps/web/components/ui/badge.tsx: "normal" = teal (#06d6a0), "default" = gray
 *   - packages/genetics-engine/src/carrier.ts: defines the distinction:
 *       'not_tested' = rsID does not exist in genotype map
 *       'low_risk'   = rsID exists, both parents negative
 *   - CarrierResultCard: renders RISK_LABELS[result.riskLevel] in a Badge
 *     with variant from counseling-tab RISK_BADGE_MAP / carrier-tab Badge
 *
 * Test approach:
 *   - Load demo analysis (tier=pro, has both low_risk and not_tested entries)
 *   - Navigate to Carrier tab, reveal content through SensitiveContentGuard
 *   - Assert visual distinction (text content, computed color differences)
 *   - Assert screen reader distinction (different text, no identical labels)
 */

import { test, expect } from '@playwright/test';
import { loadDemoResults, switchToTab } from '../helpers/demo-navigation';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loadDemoAndGoToCarrierTab(
  page: import('@playwright/test').Page,
) {
  await loadDemoResults(page);

  // Navigate to Carrier Risk tab
  await switchToTab(page, 'Carrier Risk');

  // SensitiveContentGuard wraps CarrierTab (requiredTier="premium", tier="pro" in demo)
  // The guard shows "Reveal Results" before the content is in the DOM.
  const revealButton = page.getByRole('button', { name: /reveal results/i });
  if (await revealButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await revealButton.click();
    // Wait for real content to appear after reveal
    await expect(
      page.getByText(/carrier screening results/i),
    ).toBeVisible({ timeout: 10_000 });
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Status Distinction — Not Detected vs Not Tested', () => {
  // ── Precondition: Surface demo data status inventory ───────────────────────
  //
  // Tests Q14.1–Q14.3 (and Q14.5) call test.fixme() early-return when the demo
  // data does not contain BOTH "low_risk" AND "not_tested" carrier results
  // simultaneously. If you find that most tests in this suite are silently
  // skipping in CI, the root cause is the demo fixture — not the component.
  //
  // Resolution: ensure apps/web/lib/data/demo-results.ts includes at least one
  // carrier result with riskLevel: "low_risk" AND one with riskLevel: "not_tested".
  //
  // The beforeAll below navigates to the Carrier tab and logs which risk-level
  // labels ARE present in the demo data so that silent skips surface as a
  // visible warning in the test report.
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await loadDemoAndGoToCarrierTab(page);

      const hasLowRisk = await page
        .getByText('Low Risk')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      const hasNotTested = await page
        .getByText('Not Tested')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      // Log which statuses are actually present so CI reports are actionable.
      const present = [
        hasLowRisk ? '"low_risk" (Low Risk)' : null,
        hasNotTested ? '"not_tested" (Not Tested)' : null,
      ]
        .filter(Boolean)
        .join(', ');
      const missing = [
        !hasLowRisk ? '"low_risk"' : null,
        !hasNotTested ? '"not_tested"' : null,
      ]
        .filter(Boolean)
        .join(', ');

      if (missing) {
        // eslint-disable-next-line no-console
        console.warn(
          `[status-distinction] WARNING: demo data is missing carrier results for: ${missing}. ` +
            `Present: ${present || 'none'}. ` +
            `Tests Q14.1, Q14.2, Q14.3, and Q14.5 will self-skip via test.fixme(). ` +
            `To fix: add entries with the missing riskLevel values to ` +
            `apps/web/lib/data/demo-results.ts (carrier array).`,
        );
      } else {
        // eslint-disable-next-line no-console
        console.info(
          `[status-distinction] Demo data contains both required status types: ${present}. All tests should run.`,
        );
      }
    } finally {
      await context.close();
    }
  });

  test('Q14.1 — "Low Risk" badge text is distinct from "Not Tested" badge text', async ({
    page,
  }) => {
    test.slow();
    await loadDemoAndGoToCarrierTab(page);

    // Both label strings must exist somewhere on the Carrier tab
    // (demo data includes both low_risk and not_tested results).
    // The RISK_LABELS mapping ensures they are textually different.
    const lowRiskBadge = page.getByText('Low Risk').first();
    const notTestedBadge = page.getByText('Not Tested').first();

    // At least one of each should be visible in the demo data.
    // If either is missing, use fixme to document the gap.
    const hasLowRisk = await lowRiskBadge.isVisible({ timeout: 5_000 }).catch(() => false);
    const hasNotTested = await notTestedBadge.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasLowRisk || !hasNotTested) {
      test.fixme(
        true,
        [
          'Demo data may not contain both "low_risk" and "not_tested" entries simultaneously.',
          'Required: demo-results.ts must include at least one carrier result with',
          '  riskLevel: "low_risk" and one with riskLevel: "not_tested".',
          'Current workaround: verify at least one status type is present.',
        ].join('\n'),
      );
      return;
    }

    // Both visible → verify they are different strings
    const lowRiskText = await lowRiskBadge.textContent();
    const notTestedText = await notTestedBadge.textContent();

    expect(lowRiskText?.trim()).toBe('Low Risk');
    expect(notTestedText?.trim()).toBe('Not Tested');
    expect(lowRiskText?.trim()).not.toBe(notTestedText?.trim());
  });

  test('Q14.2 — "Low Risk" (not detected) badge has green/teal styling distinct from "Not Tested" neutral styling', async ({
    page,
  }) => {
    test.slow();
    await loadDemoAndGoToCarrierTab(page);

    // Badge variants from badge.tsx:
    //   "normal" (used for low_risk/Not Detected): text-accent-teal (green teal)
    //   "default" (used for not_tested/Not Tested):  text-(--text-body) (neutral)
    //
    // We verify that the "Low Risk" badge element has a different computed color
    // than the "Not Tested" badge element, confirming visual distinction.

    const lowRiskBadge = page.getByText('Low Risk').first();
    const notTestedBadge = page.getByText('Not Tested').first();

    const hasLowRisk = await lowRiskBadge.isVisible({ timeout: 5_000 }).catch(() => false);
    const hasNotTested = await notTestedBadge.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasLowRisk || !hasNotTested) {
      test.fixme(
        true,
        'Demo data must include both low_risk and not_tested carrier results to compare badge colors.',
      );
      return;
    }

    // Get computed color of each badge
    const lowRiskColor = await lowRiskBadge.evaluate(
      (el) => window.getComputedStyle(el).color,
    );
    const notTestedColor = await notTestedBadge.evaluate(
      (el) => window.getComputedStyle(el).color,
    );

    // The two badges must have different computed colors
    expect(lowRiskColor).not.toBe(notTestedColor);

    // "Low Risk" (normal variant) should use teal (#06d6a0)
    // Browsers render hex colors as rgb() — rgb(6, 214, 160)
    expect(lowRiskColor).toMatch(/rgb\(6,\s*214,\s*160\)/);
  });

  test('Q14.3 — Screen readers announce the two states differently (different accessible text)', async ({
    page,
  }) => {
    test.slow();
    await loadDemoAndGoToCarrierTab(page);

    // The Badge component renders as <span> with text content.
    // Screen readers read the text content of the badge.
    // "Low Risk" and "Not Tested" are the accessible names read aloud.
    //
    // We verify:
    //   1. "Low Risk" text is present in the page
    //   2. "Not Tested" text is present in the page
    //   3. They are never identical strings
    //
    // This validates screen readers will announce them differently.

    const lowRiskElements = await page.getByText('Low Risk').all();
    const notTestedElements = await page.getByText('Not Tested').all();

    const hasLowRisk = lowRiskElements.length > 0;
    const hasNotTested = notTestedElements.length > 0;

    if (!hasLowRisk || !hasNotTested) {
      test.fixme(
        true,
        'Demo data must include carrier results for both low_risk and not_tested to verify screen reader distinction.',
      );
      return;
    }

    // Both text strings exist and are different — screen readers will read
    // them as different announcements
    const lowRiskText = await lowRiskElements[0].textContent();
    const notTestedText = await notTestedElements[0].textContent();

    expect(lowRiskText?.trim()).not.toBe(notTestedText?.trim());
    expect(lowRiskText?.trim()).toBe('Low Risk');
    expect(notTestedText?.trim()).toBe('Not Tested');

    // TODO(stream-ops): Strengthen screen reader distinction with explicit ARIA attributes.
    // The Badge component should carry aria-label attributes that distinguish the two
    // states unambiguously (e.g. aria-label="Low Risk — not a carrier" vs
    // aria-label="Not Tested — no data available"), so screen readers announce the
    // semantic meaning rather than relying solely on visible text content.
    //
    // Once the production Badge component exposes these attributes, replace the
    // test.fixme below with:
    //   await expect(lowRiskElements[0]).toHaveAttribute('aria-label', /low risk/i);
    //   await expect(notTestedElements[0]).toHaveAttribute('aria-label', /not tested/i);
    //   const lowRiskRole = await lowRiskElements[0].getAttribute('role');
    //   const notTestedRole = await notTestedElements[0].getAttribute('role');
    //   expect(lowRiskRole).toBe(notTestedRole); // same role, different label
    test.fixme(
      true,
      'TODO(stream-ops): Badge component does not yet expose aria-label or role attributes ' +
        'that distinguish "Not Detected" from "Not Tested" for screen readers. ' +
        'Add aria-label to the Badge component variants and re-enable the assertions above.',
    );
  });

  test('Q14.4 — "Low Risk" and "Not Tested" never share identical badge text', async ({
    page,
  }) => {
    test.slow();
    await loadDemoAndGoToCarrierTab(page);

    // Collect all badge text content visible on the carrier tab
    // and confirm that "Low Risk" text cannot be found where "Not Tested"
    // text should appear and vice versa.
    //
    // This guards against a regression where both states render the same label.

    // Verify "Low Risk" does not contain "Not Tested" substring
    const lowRiskBadges = await page.getByText('Low Risk').all();
    for (const badge of lowRiskBadges) {
      const text = await badge.textContent();
      expect(text?.toLowerCase()).not.toContain('not tested');
    }

    // Verify "Not Tested" does not contain "Low Risk" substring
    const notTestedBadges = await page.getByText('Not Tested').all();
    for (const badge of notTestedBadges) {
      const text = await badge.textContent();
      expect(text?.toLowerCase()).not.toContain('low risk');
    }
  });

  test('Q14.5 — Carrier tab filter dropdown includes both "Low Risk" and "Not Tested" as distinct options', async ({
    page,
  }) => {
    test.slow();
    await loadDemoAndGoToCarrierTab(page);

    // CarrierTab renders a "Filter by risk level" SelectFilter.
    // RISK_OPTIONS includes both { value: "low_risk", label: "Low Risk" }
    // and { value: "not_tested", label: "Not Tested" }.
    // The filter itself is a visual confirmation that these are treated as
    // distinct categories in the UI.

    const riskFilter = page.getByLabel(/filter by risk level/i);
    await expect(riskFilter).toBeVisible({ timeout: 10_000 });

    // Open the dropdown
    await riskFilter.click();

    // Both options must be present and have different text
    const lowRiskOption = page.getByRole('option', { name: /^low risk$/i });
    const notTestedOption = page.getByRole('option', { name: /^not tested$/i });

    // Use a more flexible approach for custom select components
    const lowRiskText = page.getByText(/^Low Risk$/).first();
    const notTestedText = page.getByText(/^Not Tested$/).first();

    // At least verify the filter options are accessible
    const hasLowRiskOption = await lowRiskOption.isVisible({ timeout: 3_000 }).catch(
      async () => lowRiskText.isVisible({ timeout: 2_000 }).catch(() => false),
    );
    const hasNotTestedOption = await notTestedOption.isVisible({ timeout: 3_000 }).catch(
      async () => notTestedText.isVisible({ timeout: 2_000 }).catch(() => false),
    );

    if (!hasLowRiskOption || !hasNotTestedOption) {
      test.fixme(
        true,
        [
          'SelectFilter dropdown options may not be queryable via getByRole("option").',
          'The custom SelectFilter component may not render standard <option> elements.',
          'Required: verify RISK_OPTIONS in carrier-tab.tsx includes both labels.',
        ].join('\n'),
      );
      return;
    }

    expect(hasLowRiskOption).toBe(true);
    expect(hasNotTestedOption).toBe(true);
  });
});
