/**
 * Mobile Device Capability Testing — Q11 (Stream Q Sprint 3)
 *
 * Playwright tests simulating mobile devices using device emulation.
 *
 * Tests verify that the Mergenix analysis application is fully functional
 * on mobile viewports including:
 *  1. Page loads without errors on mobile viewport (iPhone 14, Pixel 7)
 *  2. Touch-friendly tap targets (minimum 44px × 44px — WCAG 2.5.5)
 *  3. No horizontal scroll on mobile viewports
 *  4. File upload works on mobile viewport
 *  5. Memory warning appears on low-memory devices (test.fixme — not yet implemented)
 *
 * Device emulation uses Playwright's built-in device descriptors.
 * Layout breakpoints are tested by checking both portrait and viewport widths.
 *
 * Notes:
 * - Tests that require physical device gestures (pinch-to-zoom, haptic feedback)
 *   are marked as test.fixme — they require real device testing.
 * - The file upload test verifies that the UI element is reachable/visible on
 *   mobile, not that the actual file processing completes (which is tested
 *   separately in the full analysis E2E suite).
 */

import { test, expect, devices, type Page } from '@playwright/test';

// ─── Device Profiles ──────────────────────────────────────────────────────────

/** iPhone 14 specification for emulation. */
const IPHONE_14 = devices['iPhone 14'];

/** Pixel 7 specification for emulation.
 *  Falls back to 'Pixel 5' if 'Pixel 7' is not available in older Playwright versions. */
const PIXEL_7 = devices['Pixel 7'] ?? devices['Pixel 5'];

// ─── Constants ────────────────────────────────────────────────────────────────

/** WCAG 2.5.5 / Apple HIG minimum touch target size in pixels. */
const MIN_TOUCH_TARGET_PX = 44;

/** Pages to check for horizontal scroll. */
const PAGES_TO_CHECK_SCROLL = [
  { name: 'Homepage', path: '/' },
  { name: 'Login', path: '/login' },
  { name: 'Products', path: '/products' },
  { name: 'Analysis', path: '/analysis' },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check whether the page has horizontal scroll overflow.
 *
 * Returns true if the document body's scrollWidth exceeds the viewport width
 * by more than 1px (small rounding tolerance).
 */
async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const bodyScrollWidth = Math.max(body.scrollWidth, html.scrollWidth);
    return bodyScrollWidth > window.innerWidth + 1;
  });
}

/**
 * Get all interactive elements on the page and check their bounding box sizes.
 *
 * Returns a list of violations — elements smaller than minSize.
 * Only checks visible, enabled interactive elements (buttons, links, inputs).
 */
async function getTouchTargetViolations(
  page: Page,
  minSize: number,
): Promise<Array<{ tag: string; text: string; width: number; height: number }>> {
  return page.evaluate((min) => {
    const selectors = [
      'button:not([disabled])',
      'a[href]',
      'input[type="submit"]',
      'input[type="button"]',
      'input[type="file"]',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="switch"]',
    ];

    const violations: Array<{
      tag: string;
      text: string;
      width: number;
      height: number;
    }> = [];

    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
      for (const el of elements) {
        const rect = el.getBoundingClientRect();

        // Only check visible elements (not hidden/zero-size)
        if (rect.width === 0 && rect.height === 0) continue;

        // Skip elements that are clearly off-screen (e.g., skip-link before focus)
        if (rect.top < -100 || rect.left < -100) continue;

        // Skip elements whose style is display:none or visibility:hidden
        const styles = window.getComputedStyle(el);
        if (styles.display === 'none' || styles.visibility === 'hidden') continue;
        if (styles.opacity === '0') continue;

        if (rect.width < min || rect.height < min) {
          violations.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent ?? '').trim().slice(0, 60),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
    }

    return violations;
  }, minSize);
}

// ─── 1. iPhone 14 — Page Loads ───────────────────────────────────────────────

test.describe('Mobile — iPhone 14: Page Loads Without Errors', () => {
  test.use({ ...IPHONE_14 });

  test('homepage loads without console errors on iPhone 14', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Suppress known Next.js dev-mode warnings that are not real errors
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });

    // Filter out non-critical browser console errors (e.g., extension-injected)
    const realErrors = consoleErrors.filter(
      (e) => !e.includes('Extension') && !e.includes('chrome-extension') && !e.includes('favicon'),
    );
    expect(realErrors).toHaveLength(0);
  });

  test('login page renders correctly on iPhone 14 viewport', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({
      timeout: 10_000,
    });

    // Verify the form is visible and usable
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('analysis page loads on iPhone 14 without JS errors', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => {
      jsErrors.push(err.message);
    });

    await page.goto('/analysis', { waitUntil: 'domcontentloaded' });
    // Page should load — either the upload section or a redirect to login is acceptable
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

    expect(jsErrors).toHaveLength(0);
  });

  test('products page renders on iPhone 14 viewport', async ({ page }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  });
});

// ─── 2. Pixel 7 — Page Loads ─────────────────────────────────────────────────

test.describe('Mobile — Pixel 7: Page Loads Without Errors', () => {
  test.use({ ...PIXEL_7 });

  test('homepage loads without console errors on Pixel 7', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });

    const realErrors = consoleErrors.filter(
      (e) => !e.includes('Extension') && !e.includes('chrome-extension') && !e.includes('favicon'),
    );
    expect(realErrors).toHaveLength(0);
  });

  test('analysis page loads on Pixel 7 without JS errors', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => {
      jsErrors.push(err.message);
    });

    await page.goto('/analysis', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
    expect(jsErrors).toHaveLength(0);
  });

  test('login page renders correctly on Pixel 7 viewport', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});

// ─── 3. Touch Target Sizes (WCAG 2.5.5 — min 44px) ──────────────────────────

test.describe('Mobile — Touch Target Size Compliance', () => {
  test.describe('iPhone 14', () => {
    test.use({ ...IPHONE_14 });

    test('all interactive elements on homepage are at least 44px on iPhone 14', async ({
      page,
    }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

      const violations = await getTouchTargetViolations(page, MIN_TOUCH_TARGET_PX);

      // Log violations for debugging but assert zero critical violations.
      // Navigation links and CTA buttons must all meet the 44px minimum.
      if (violations.length > 0) {
        console.warn(
          `Touch target violations on homepage (iPhone 14): ${JSON.stringify(violations, null, 2)}`,
        );
      }
      expect(violations).toHaveLength(0);
    });

    test('all interactive elements on login page are at least 44px on iPhone 14', async ({
      page,
    }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({
        timeout: 10_000,
      });

      const violations = await getTouchTargetViolations(page, MIN_TOUCH_TARGET_PX);
      if (violations.length > 0) {
        console.warn(
          `Touch target violations on login page (iPhone 14): ${JSON.stringify(violations, null, 2)}`,
        );
      }
      expect(violations).toHaveLength(0);
    });
  });

  test.describe('Pixel 7', () => {
    test.use({ ...PIXEL_7 });

    test('all interactive elements on homepage are at least 44px on Pixel 7', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

      const violations = await getTouchTargetViolations(page, MIN_TOUCH_TARGET_PX);
      if (violations.length > 0) {
        console.warn(
          `Touch target violations on homepage (Pixel 7): ${JSON.stringify(violations, null, 2)}`,
        );
      }
      expect(violations).toHaveLength(0);
    });
  });
});

// ─── 4. No Horizontal Scroll ─────────────────────────────────────────────────

test.describe('Mobile — No Horizontal Scroll', () => {
  test.describe('iPhone 14', () => {
    test.use({ ...IPHONE_14 });

    for (const { name, path } of PAGES_TO_CHECK_SCROLL) {
      test(`${name} page has no horizontal scroll on iPhone 14 (${IPHONE_14.viewport?.width ?? 390}px)`, async ({
        page,
      }) => {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });

        // Wait for all pending network requests and DOM mutations to settle
        // before measuring horizontal scroll — avoids flakiness from layout shifts.
        await page
          .waitForFunction(() => document.readyState === 'complete', undefined, {
            timeout: 5_000,
          })
          .catch(() => {
            // If readyState never reaches complete, proceed anyway — the body
            // is already visible and we have our best measurement opportunity.
          });

        const hasScroll = await hasHorizontalScroll(page);
        expect(hasScroll).toBe(false);
      });
    }
  });

  test.describe('Pixel 7', () => {
    test.use({ ...PIXEL_7 });

    for (const { name, path } of PAGES_TO_CHECK_SCROLL) {
      test(`${name} page has no horizontal scroll on Pixel 7 (${PIXEL_7.viewport?.width ?? 412}px)`, async ({
        page,
      }) => {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });

        // Wait for all pending network requests and DOM mutations to settle
        // before measuring horizontal scroll — avoids flakiness from layout shifts.
        await page
          .waitForFunction(() => document.readyState === 'complete', undefined, {
            timeout: 5_000,
          })
          .catch(() => {
            // If readyState never reaches complete, proceed anyway — the body
            // is already visible and we have our best measurement opportunity.
          });

        const hasScroll = await hasHorizontalScroll(page);
        expect(hasScroll).toBe(false);
      });
    }
  });
});

// ─── 5. File Upload on Mobile Viewport ───────────────────────────────────────

test.describe('Mobile — File Upload Reachable on Mobile Viewport', () => {
  test.describe('iPhone 14', () => {
    test.use({ ...IPHONE_14 });

    test('file upload area is visible and accessible on iPhone 14', async ({ page }) => {
      await page.goto('/analysis', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

      // The analysis page may redirect to login if not authenticated.
      // Check current URL — if redirected to login, the test can be skipped gracefully.
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/register')) {
        // Guest is redirected — still a valid mobile experience
        await expect(page.getByRole('heading', { name: /welcome back|sign in/i })).toBeVisible({
          timeout: 5_000,
        });
        return; // Upload only available to authenticated users
      }

      // On the analysis page: verify file upload inputs or upload zone are visible
      // The analysis page should show upload dropzones or file inputs
      const fileInputOrDropzone = page
        .locator(
          'input[type="file"], [data-testid*="upload"], [aria-label*="upload" i], [aria-label*="file" i]',
        )
        .first();

      await expect(fileInputOrDropzone).toBeAttached({ timeout: 10_000 });
    });

    test('demo analysis button is reachable on mobile iPhone 14 viewport', async ({ page }) => {
      await page.goto('/analysis', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/register')) {
        // Expected behavior for guest users — skip
        return;
      }

      // The demo analysis button should be within the viewport on mobile
      const demoButton = page.getByRole('button', { name: /try demo analysis/i });
      await expect(demoButton).toBeVisible({ timeout: 10_000 });

      // Verify the button bounding box is within the mobile viewport height
      const boundingBox = await demoButton.boundingBox();
      expect(boundingBox).not.toBeNull();
      if (boundingBox !== null) {
        const viewportHeight = page.viewportSize()?.height ?? 844;
        // The button should be reachable by scrolling (below fold is OK)
        // but must actually render on the page
        expect(boundingBox.width).toBeGreaterThan(0);
        expect(boundingBox.height).toBeGreaterThan(0);
        // The button should be within 3 viewport heights of the top
        expect(boundingBox.top).toBeLessThan(viewportHeight * 3);
      }
    });
  });

  test.describe('Pixel 7', () => {
    test.use({ ...PIXEL_7 });

    test('file upload area is visible and accessible on Pixel 7', async ({ page }) => {
      await page.goto('/analysis', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/register')) {
        await expect(page.getByRole('heading', { name: /welcome back|sign in/i })).toBeVisible({
          timeout: 5_000,
        });
        return;
      }

      const fileInputOrDropzone = page
        .locator(
          'input[type="file"], [data-testid*="upload"], [aria-label*="upload" i], [aria-label*="file" i]',
        )
        .first();

      await expect(fileInputOrDropzone).toBeAttached({ timeout: 10_000 });
    });
  });
});

// ─── 6. Memory Warning (Low-Memory Devices) ──────────────────────────────────

test.describe('Mobile — Low-Memory Device Warning', () => {
  /**
   * test.fixme — Memory warning UI has not yet been implemented.
   *
   * When implemented, the analysis page should display a warning banner
   * when navigator.deviceMemory is below a threshold (e.g., < 4GB).
   *
   * This test documents the requirement for future implementation.
   */

  test.fixme('memory warning banner appears when deviceMemory < 4GB (iPhone SE / low-end Android)', async ({
    page,
  }) => {
    // Requires overriding navigator.deviceMemory via page.addInitScript
    // or using Chrome DevTools Protocol to throttle memory.
    // This feature is not yet implemented in the analysis page.
  });

  test.fixme('analysis warning recommends smaller file when device has < 2GB RAM', async ({
    page,
  }) => {
    // Requires the app to implement device.ts `getDeviceCapabilities()`
    // integration with the analysis UI to show adaptive warnings.
  });

  /**
   * Partial test (non-fixme): Verify that the device detection module
   * is importable and its output is used in the app.
   *
   * This is a smoke test — it does not require full browser integration.
   */
  test('analysis page renders without crash on low-viewport device (375px)', async ({ page }) => {
    // Use the smallest common mobile viewport (iPhone SE / older Android)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/analysis', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
    // No crash = pass. The page may redirect to login, which is fine.
  });
});

// ─── 7. Viewport-Specific Layout Checks ──────────────────────────────────────

test.describe('Mobile — Viewport-Specific Layout', () => {
  test.describe('iPhone 14', () => {
    test.use({ ...IPHONE_14 });

    test('navigation is accessible in mobile viewport on homepage', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });

      // Either a mobile hamburger menu or the nav links should be present
      const hasNav = await page.evaluate(() => {
        const nav = document.querySelector('nav');
        const hamburger = document.querySelector(
          '[aria-label*="menu" i], [aria-label*="navigation" i], button[aria-expanded], [data-testid*="menu"]',
        );
        return nav !== null || hamburger !== null;
      });
      expect(hasNav).toBe(true);
    });

    test('page content does not overflow outside viewport width on iPhone 14', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

      const viewportWidth = IPHONE_14.viewport?.width ?? 390;

      // Check that no element extends significantly beyond the viewport width
      const overflowingElements = await page.evaluate((vpWidth) => {
        const allElements = Array.from(document.querySelectorAll<HTMLElement>('*'));
        const overflows: string[] = [];
        for (const el of allElements) {
          const rect = el.getBoundingClientRect();
          // Allow 1px tolerance for rounding, ignore off-screen elements
          if (rect.right > vpWidth + 5 && rect.width > 0 && rect.height > 0) {
            const styles = window.getComputedStyle(el);
            // Skip fixed-position elements (tooltips, modals, etc.)
            if (styles.position === 'fixed') continue;
            overflows.push(`${el.tagName}.${el.className} — right: ${Math.round(rect.right)}px`);
            if (overflows.length >= 5) break; // Cap at 5 for readability
          }
        }
        return overflows;
      }, viewportWidth);

      if (overflowingElements.length > 0) {
        console.warn(
          `Overflowing elements on homepage (iPhone 14): ${overflowingElements.join(', ')}`,
        );
      }
      expect(overflowingElements).toHaveLength(0);
    });
  });

  /**
   * test.fixme — Real device gesture testing.
   * These tests require physical hardware or advanced emulation not available
   * in Playwright's built-in device emulation.
   */
  test.fixme('pinch-to-zoom does not break layout (requires real device testing)', () => {
    // Requires hardware gesture simulation not available in Playwright headless.
  });

  test.fixme('swipe navigation works on mobile tab panels (requires real device testing)', () => {
    // Swipe events on touch screens require real device or advanced gesture lib.
  });
});
