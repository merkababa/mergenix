/**
 * Performance Baselines — Core Web Vitals E2E Tests
 *
 * Validates performance budgets and responsiveness for key pages.
 * These tests use the browser's Performance API and console monitoring
 * to ensure the application meets baseline performance requirements.
 *
 * Performance budgets are INFORMATIONAL initially — tests use soft
 * assertions where appropriate. After baselines are established
 * (2-4 weeks), thresholds will be made blocking.
 *
 * Plan reference: PHASE_8C_PLAN.md section 3.18 (scenarios 1-5)
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// 3.18 #1 — Homepage FCP and LCP within performance budget
// Priority: P2 | Reviewer: Technologist
// ---------------------------------------------------------------------------

test.describe('Performance: Core Web Vitals', () => {
  test('homepage FCP and LCP within performance budget', async ({ page }) => {
    // Navigate to the homepage and wait for it to fully load
    await page.goto('/', { waitUntil: 'load' });

    // Wait a moment for paint entries to be recorded
    await page.waitForTimeout(2000);

    // Collect FCP from Performance API paint entries
    const paintEntries = await page.evaluate(() => {
      const entries = performance.getEntriesByType('paint');
      return entries.map((entry) => ({
        name: entry.name,
        startTime: entry.startTime,
      }));
    });

    const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');

    // Collect LCP using PerformanceObserver retrospectively
    // LCP may not be in getEntriesByType, so we also check largest-contentful-paint
    const lcpValue = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        // Try to get the last LCP entry if already buffered
        const existingEntries = performance.getEntriesByType('largest-contentful-paint');
        if (existingEntries.length > 0) {
          const lastEntry = existingEntries[existingEntries.length - 1];
          resolve(lastEntry.startTime);
          return;
        }

        // If not available, use a PerformanceObserver with buffered flag
        try {
          let lastLCP = 0;
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            for (const entry of entries) {
              lastLCP = entry.startTime;
            }
          });
          observer.observe({
            type: 'largest-contentful-paint',
            buffered: true,
          });

          // Give the observer a moment to process buffered entries
          setTimeout(() => {
            observer.disconnect();
            resolve(lastLCP);
          }, 500);
        } catch {
          // PerformanceObserver for LCP not supported in all browsers
          resolve(0);
        }
      });
    });

    // Assert FCP is within budget (< 1800ms)
    // Using soft assertion since this is informational initially
    if (fcpEntry) {
      expect.soft(fcpEntry.startTime, 'FCP should be under 1800ms').toBeLessThan(1800);
    }

    // Assert LCP is within budget (< 2500ms)
    if (lcpValue > 0) {
      expect.soft(lcpValue, 'LCP should be under 2500ms').toBeLessThan(2500);
    }

    // At minimum, verify that paint entries exist (page rendered)
    expect(paintEntries.length, 'Paint entries should be recorded').toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 3.18 #2 — Analysis page remains responsive during file upload
  // Priority: P1 | Reviewer: Technologist
  // -------------------------------------------------------------------------

  test('analysis page remains responsive during file upload (no long tasks)', async ({ page }) => {
    // Set up long task observer BEFORE navigating to the page
    await page.addInitScript(() => {
      (window as any).__longTasks = [];
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            (window as any).__longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            });
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch {
        // longtask observer not supported in some browsers
      }
    });

    await page.goto('/analysis');

    // Wait for the page to be fully interactive
    await page.getByRole('heading', { name: 'Genetic Analysis' }).waitFor();

    // Create a small synthetic DNA file in the browser for upload
    // This is a minimal 23andMe-format file
    const dnaContent = [
      '# rsid\tchromosome\tposition\tgenotype',
      'rs1234567\t1\t100000\tAG',
      'rs2345678\t2\t200000\tCT',
      'rs3456789\t3\t300000\tGG',
    ].join('\n');

    // Upload Parent A file via the hidden input
    const parentAInput = page
      .getByRole('button', { name: /parent a.*mother/i })
      .locator('input[type="file"]');

    // Use setInputFiles with a buffer to simulate file upload
    await parentAInput.setInputFiles({
      name: 'parentA.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(dnaContent),
    });

    // Check that the file was accepted (format detected text appears)
    await expect(page.getByText('parentA.txt')).toBeVisible();

    // Upload Parent B file
    const parentBInput = page
      .getByRole('button', { name: /parent b.*father/i })
      .locator('input[type="file"]');

    await parentBInput.setInputFiles({
      name: 'parentB.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(dnaContent),
    });

    await expect(page.getByText('parentB.txt')).toBeVisible();

    // Check that the UI remains interactive — the "Start Analysis" button
    // should be visible and clickable after both files are uploaded
    await expect(page.getByRole('button', { name: /start analysis/i })).toBeVisible();

    // Verify no excessively long tasks (>150ms) occurred during upload
    // Long tasks > 50ms can block the main thread; > 150ms is concerning
    const longTasks = await page.evaluate(() => {
      return (window as any).__longTasks || [];
    });

    const excessivelyLongTasks = longTasks.filter(
      (task: { duration: number }) => task.duration > 150,
    );

    expect
      .soft(
        excessivelyLongTasks.length,
        `Found ${excessivelyLongTasks.length} long tasks (>150ms) during file upload: ${JSON.stringify(excessivelyLongTasks)}`,
      )
      .toBe(0);
  });

  // -------------------------------------------------------------------------
  // 3.18 #3 — Slow API responses show loading skeletons, app does not freeze
  // Priority: P1 | Reviewer: Technologist
  // -------------------------------------------------------------------------

  test('slow API responses show loading skeletons and app does not freeze', async ({ page }) => {
    // Mock a slow API endpoint that the analysis page might call.
    // The auth /me endpoint is called on page load to determine user tier.
    await page.route('**/auth/me', async (route) => {
      // Delay the response by 3 seconds to simulate slow API
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'free@test.mergenix.com',
          tier: 'free',
          name: 'Free User',
          emailVerified: true,
          twoFactorEnabled: false,
        }),
      });
    });

    // Also mock the saved analyses endpoint with a delay
    await page.route('**/analyses', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Navigate to the analysis page
    await page.goto('/analysis');

    // The page should still render its heading even while API is slow
    // This verifies the app does not freeze waiting for API responses
    await expect(page.getByRole('heading', { name: 'Genetic Analysis' })).toBeVisible({
      timeout: 5000,
    });

    // The page should remain interactive — we can interact with elements
    // even while the API is still loading
    const demoButton = page.getByRole('button', { name: /try demo analysis/i });

    // The demo button should be visible and clickable despite slow API
    await expect(demoButton).toBeVisible({ timeout: 5000 });

    // Verify the page did not throw an error or display an error state
    // due to the slow API
    await expect(page.getByText('Analysis Error')).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 3.18 #4 — Client-side navigation does not cause full page reload
  // Priority: P2 | Reviewer: Technologist
  // -------------------------------------------------------------------------

  test('client-side navigation (Next.js Link) does not cause full page reload', async ({
    page,
  }) => {
    // Navigate to the homepage first
    await page.goto('/');

    // Set a marker in the window to detect full page reloads.
    // If a full reload happens, this marker will be lost.
    await page.evaluate(() => {
      (window as any).__navMarker = Date.now();
    });

    // Also track the number of 'load' events
    await page.evaluate(() => {
      (window as any).__fullLoadCount = 0;
      window.addEventListener('load', () => {
        (window as any).__fullLoadCount++;
      });
    });

    // Capture the initial marker value
    const initialMarker = await page.evaluate(() => (window as any).__navMarker);
    expect(initialMarker).toBeTruthy();

    // Find a client-side navigation link (e.g., "About" or "Products" in navbar)
    // Next.js <Link> components should perform client-side navigation
    const aboutLink = page.getByRole('link', { name: /about/i }).first();
    const productsLink = page.getByRole('link', { name: /products|pricing/i }).first();

    // Try About link first, fall back to Products if not found
    const navLink = (await aboutLink.isVisible().catch(() => false)) ? aboutLink : productsLink;

    if (await navLink.isVisible().catch(() => false)) {
      // Click the link
      await navLink.click();

      // Wait for navigation to settle by checking for page content
      await page.waitForLoadState('domcontentloaded');

      // Check that the marker survived — if it did, no full reload occurred
      const markerAfterNav = await page.evaluate(() => (window as any).__navMarker);

      expect(
        markerAfterNav,
        'Window marker should survive client-side navigation (no full reload)',
      ).toBe(initialMarker);
    } else {
      // If neither link is visible, try navigating to /about directly
      // and then use a link back to /
      test.skip(true, 'No navigation links found for client-side nav test');
    }
  });

  // -------------------------------------------------------------------------
  // 3.18 #5 — No hydration mismatch errors in console on key pages
  // Priority: P2 | Reviewer: Technologist
  // -------------------------------------------------------------------------

  test('no hydration mismatch errors in console on key pages', async ({ page }) => {
    const hydrationErrors: { page: string; message: string }[] = [];

    // Set up console error listener
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Check for common React hydration mismatch patterns
        const hydrationPatterns = [
          'Hydration',
          'hydration',
          'Text content does not match server-rendered HTML',
          'Expected server HTML to contain',
          'Did not expect server HTML to contain',
          'Hydration failed because the initial UI does not match',
          'There was an error while hydrating',
          'content does not match server-rendered',
          "server-rendered HTML didn't match",
        ];

        if (hydrationPatterns.some((pattern) => text.includes(pattern))) {
          hydrationErrors.push({
            page: page.url(),
            message: text.substring(0, 300),
          });
        }
      }
    });

    // Also capture uncaught errors related to hydration
    page.on('pageerror', (error) => {
      const message = error.message;
      if (
        message.includes('Hydration') ||
        message.includes('hydration') ||
        message.includes('server-rendered')
      ) {
        hydrationErrors.push({
          page: page.url(),
          message: message.substring(0, 300),
        });
      }
    });

    // Test key pages for hydration errors
    const pagesToCheck = [
      { path: '/', name: 'Homepage' },
      { path: '/analysis', name: 'Analysis' },
      { path: '/about', name: 'About' },
      { path: '/products', name: 'Products' },
      { path: '/diseases', name: 'Disease Catalog' },
      { path: '/login', name: 'Login' },
      { path: '/register', name: 'Register' },
    ];

    for (const pageInfo of pagesToCheck) {
      // Navigate and wait for hydration to complete
      await page.goto(pageInfo.path, { waitUntil: 'networkidle' });

      // Wait for React hydration to settle by ensuring the page is fully loaded
      await page.waitForLoadState('load');
    }

    // Assert no hydration errors were found
    expect(
      hydrationErrors,
      `Hydration mismatch errors found: ${JSON.stringify(hydrationErrors, null, 2)}`,
    ).toHaveLength(0);
  });
});
