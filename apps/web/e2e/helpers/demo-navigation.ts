/**
 * Shared E2E navigation helpers for tests that require the demo analysis results.
 *
 * These helpers are shared across multiple spec files to avoid copy-paste duplication:
 *   - compliance/disclaimer-visibility.spec.ts
 *   - compliance/status-distinction.spec.ts
 *   - interaction/blur-reveal.spec.ts
 */

import { type Page, expect } from '@playwright/test';

/**
 * Navigates to /analysis, clicks "Try Demo Analysis", and waits for the
 * results dashboard heading to confirm the full render is complete.
 */
export async function loadDemoResults(page: Page): Promise<void> {
  await page.goto('/analysis');

  const demoButton = page.getByRole('button', { name: /try demo analysis/i });
  await expect(demoButton).toBeVisible({ timeout: 10_000 });
  await demoButton.click();

  // Wait for the results dashboard heading to confirm render
  await expect(page.getByRole('heading', { name: /analysis results/i, level: 2 })).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Navigates to a specific result tab by its accessible tab name.
 * Waits for the tab to become selected before returning.
 */
export async function switchToTab(page: Page, tabName: string): Promise<void> {
  const tablist = page.getByRole('tablist', { name: /analysis results/i });
  const tab = tablist.getByRole('tab', { name: tabName });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}
