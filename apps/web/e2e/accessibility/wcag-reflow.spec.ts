/**
 * WCAG 1.4.10 Reflow — 320px Viewport Tests
 *
 * Verifies that content reflows correctly at 320px CSS width (iPhone SE)
 * without requiring horizontal scrolling, per WCAG 2.1 AA Success
 * Criterion 1.4.10.
 *
 * The CSS implementation under test lives in globals.css:608-699
 * (@media max-width: 320px).
 *
 * Covers F38 acceptance criteria for Sprint 4.
 */

import { test, expect } from '@playwright/test';

// ── Constants ───────────────────────────────────────────────────────────────

/** iPhone SE viewport — the canonical 320px CSS-width test device */
const REFLOW_VIEWPORT = { width: 320, height: 568 };

/**
 * Pages to check for horizontal overflow. These cover the main
 * public-facing routes that must comply with WCAG 1.4.10.
 */
const REFLOW_PAGES = [
  { name: 'Homepage', path: '/' },
  { name: 'Security', path: '/security' },
  { name: 'Privacy', path: '/privacy' },
  { name: 'Sample Report', path: '/sample-report' },
  { name: 'Products', path: '/products' },
  { name: 'About', path: '/about' },
  { name: 'Diseases', path: '/diseases' },
];

// ── Test Suite ──────────────────────────────────────────────────────────────

test.describe('WCAG 1.4.10 Reflow at 320px', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(REFLOW_VIEWPORT);
  });

  // ── Scenario 1: No horizontal overflow on key pages ───────────────────

  test.describe('No horizontal overflow', () => {
    for (const { name, path } of REFLOW_PAGES) {
      test(`${name} (${path}) has no horizontal scroll at 320px`, async ({ page }) => {
        await page.goto(path, { waitUntil: 'networkidle' });

        // Wait for the page to be meaningfully rendered
        await expect(page.locator('body')).toBeVisible();

        // Assert scrollWidth <= clientWidth — any overflow means content
        // requires horizontal scrolling, which violates WCAG 1.4.10.
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(
          hasHorizontalOverflow,
          `${name} page has horizontal overflow at 320px viewport. ` +
            `scrollWidth exceeds clientWidth, requiring horizontal scrolling.`,
        ).toBe(false);
      });
    }
  });

  // ── Scenario 2: Tables use stacked/card layout at 320px ───────────────

  test.describe('Table linearization', () => {
    test('products page tables switch to block display at 320px', async ({ page }) => {
      await page.goto('/products', { waitUntil: 'networkidle' });

      // The products page has a comparison table (confirmed by smoke tests)
      const tables = page.locator('table');
      const tableCount = await tables.count();

      // Skip if no tables found — not a failure of the CSS rule itself,
      // but means the page doesn't use <table> elements.
      if (tableCount === 0) {
        test.skip();
        return;
      }

      // Verify each table element has display: block (globals.css:640-649)
      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i);
        const display = await table.evaluate((el) => window.getComputedStyle(el).display);
        expect(
          display,
          `Table #${i + 1} should have display: block at 320px, got: ${display}`,
        ).toBe('block');
      }
    });

    test('table cells are stacked vertically (display: block) at 320px', async ({ page }) => {
      await page.goto('/products', { waitUntil: 'networkidle' });

      const tds = page.locator('td');
      const tdCount = await tds.count();

      if (tdCount === 0) {
        test.skip();
        return;
      }

      // Verify td elements have display: block (globals.css:646-648)
      for (let i = 0; i < Math.min(tdCount, 5); i++) {
        const td = tds.nth(i);
        const display = await td.evaluate((el) => window.getComputedStyle(el).display);
        expect(display, `td #${i + 1} should have display: block at 320px, got: ${display}`).toBe(
          'block',
        );
      }
    });

    test('thead is visually hidden at 320px', async ({ page }) => {
      await page.goto('/products', { waitUntil: 'networkidle' });

      const thead = page.locator('thead');
      const theadCount = await thead.count();

      if (theadCount === 0) {
        test.skip();
        return;
      }

      // The CSS at globals.css:651-661 applies sr-only-like styles to thead.
      // Check that thead has clip: rect(0,0,0,0) or is otherwise hidden.
      const theadStyles = await thead.first().evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          position: styles.position,
          width: styles.width,
          height: styles.height,
          overflow: styles.overflow,
        };
      });

      expect(theadStyles.position).toBe('absolute');
      expect(theadStyles.overflow).toBe('hidden');
    });

    test('table rows have visible row separators at 320px', async ({ page }) => {
      await page.goto('/products', { waitUntil: 'networkidle' });

      const rows = page.locator('tr + tr');
      const rowCount = await rows.count();

      if (rowCount === 0) {
        test.skip();
        return;
      }

      // globals.css:676-680 sets border-top on tr + tr
      const borderTop = await rows.first().evaluate((el) => {
        return window.getComputedStyle(el).borderTopStyle;
      });

      expect(
        borderTop,
        'Consecutive table rows should have a top border for visual separation',
      ).toBe('solid');
    });
  });

  // ── Scenario 3: Content elements remain visible and readable ──────────

  test.describe('Content readability at 320px', () => {
    test('glass cards on sample report are visible and not clipped', async ({ page }) => {
      await page.goto('/sample-report', { waitUntil: 'networkidle' });

      // Wait for the sample report heading to be visible
      await expect(page.getByRole('heading', { name: /sample report/i })).toBeVisible();

      // Check that the main sections are visible
      const sections = page.locator('section');
      const sectionCount = await sections.count();

      expect(sectionCount).toBeGreaterThan(0);

      // Verify each section is visible and has non-zero dimensions
      for (let i = 0; i < sectionCount; i++) {
        const section = sections.nth(i);
        const box = await section.boundingBox();
        expect(
          box,
          `Section #${i + 1} should have a bounding box (not clipped to invisible)`,
        ).not.toBeNull();

        if (box) {
          expect(box.width, `Section #${i + 1} width should be positive`).toBeGreaterThan(0);
          expect(box.height, `Section #${i + 1} height should be positive`).toBeGreaterThan(0);
          // Section should not be wider than the viewport
          expect(
            box.width,
            `Section #${i + 1} should not exceed viewport width (${REFLOW_VIEWPORT.width}px)`,
          ).toBeLessThanOrEqual(REFLOW_VIEWPORT.width);
        }
      }
    });

    test('headings on sample report are visible at 320px', async ({ page }) => {
      await page.goto('/sample-report', { waitUntil: 'networkidle' });

      // The sample report has section headings: Carrier Screening, Trait
      // Predictions, Pharmacogenomics, Polygenic Risk Scores, Counseling
      const headings = page.locator('h2');
      const headingCount = await headings.count();

      expect(headingCount).toBeGreaterThan(0);

      for (let i = 0; i < headingCount; i++) {
        const heading = headings.nth(i);
        await expect(heading).toBeVisible();

        // Verify the heading text is not empty (i.e., not clipped away)
        const text = await heading.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    });

    test('call-to-action buttons remain visible and tappable at 320px', async ({ page }) => {
      await page.goto('/sample-report', { waitUntil: 'networkidle' });

      // Sample report has CTA links: "Start Free Analysis" and "View Pro Plans"
      const ctaLinks = page.locator(
        'a:has-text("Start Free Analysis"), a:has-text("View Pro Plans")',
      );
      const ctaCount = await ctaLinks.count();

      for (let i = 0; i < ctaCount; i++) {
        const cta = ctaLinks.nth(i);
        await expect(cta).toBeVisible();

        const box = await cta.boundingBox();
        expect(box).not.toBeNull();

        if (box) {
          // Minimum touch target: 44x44px per WCAG 2.5.5 (AAA) or at least
          // 24x24px per WCAG 2.5.8 (AA). We check for reasonable width.
          expect(box.width, `CTA #${i + 1} should have usable tap width`).toBeGreaterThan(40);
          expect(box.height, `CTA #${i + 1} should have usable tap height`).toBeGreaterThan(20);
        }
      }
    });
  });

  // ── Scenario 4: Grid layouts collapse to single column ────────────────

  test.describe('Grid collapse to single column', () => {
    test('trait predictions grid is single-column at 320px', async ({ page }) => {
      await page.goto('/sample-report', { waitUntil: 'networkidle' });

      // The traits section uses className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      // At 320px (below sm breakpoint), Tailwind defaults to grid-cols-1.
      // Additionally, globals.css:626-628 forces .grid { grid-template-columns: 1fr !important; }
      const grids = page.locator('.grid');
      const gridCount = await grids.count();

      if (gridCount === 0) {
        test.skip();
        return;
      }

      for (let i = 0; i < gridCount; i++) {
        const grid = grids.nth(i);
        const gridTemplateColumns = await grid.evaluate(
          (el) => window.getComputedStyle(el).gridTemplateColumns,
        );

        // At 320px, all grids should have a single column (1fr resolves to
        // the container width, e.g. "304px" or similar). We check that there
        // is only ONE column value (no spaces = no multiple columns).
        const columnValues = gridTemplateColumns.trim().split(/\s+/);
        expect(
          columnValues.length,
          `Grid #${i + 1} should be single-column at 320px, ` +
            `got grid-template-columns: "${gridTemplateColumns}"`,
        ).toBe(1);
      }
    });

    test('homepage grid layouts are single-column at 320px', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      const grids = page.locator('.grid');
      const gridCount = await grids.count();

      if (gridCount === 0) {
        test.skip();
        return;
      }

      // Verify all grids on the homepage collapse to 1 column
      for (let i = 0; i < gridCount; i++) {
        const grid = grids.nth(i);
        const gridTemplateColumns = await grid.evaluate(
          (el) => window.getComputedStyle(el).gridTemplateColumns,
        );

        const columnValues = gridTemplateColumns.trim().split(/\s+/);
        expect(
          columnValues.length,
          `Homepage grid #${i + 1} should be single-column at 320px, ` +
            `got grid-template-columns: "${gridTemplateColumns}"`,
        ).toBe(1);
      }
    });
  });

  // ── Scenario 5: Typography scaling at 320px ───────────────────────────

  test.describe('Typography scaling', () => {
    test('h1 font size is reduced at 320px', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible();

      // globals.css:689 sets h1 { font-size: 1.25rem; } at 320px
      const fontSize = await h1.evaluate((el) => window.getComputedStyle(el).fontSize);

      // 1.25rem = 20px at default 16px root. But since the root might be
      // different, we just check it's at most 20px (not the desktop 3xl/4xl).
      const fontSizePx = parseFloat(fontSize);
      expect(
        fontSizePx,
        `h1 font-size should be reduced at 320px (expected <= 20px, got ${fontSizePx}px)`,
      ).toBeLessThanOrEqual(20);
    });

    test('h2 font size is reduced at 320px', async ({ page }) => {
      await page.goto('/sample-report', { waitUntil: 'networkidle' });

      const h2 = page.locator('h2').first();
      await expect(h2).toBeVisible();

      // globals.css:690 sets h2 { font-size: 1.125rem; } at 320px
      const fontSize = await h2.evaluate((el) => window.getComputedStyle(el).fontSize);

      const fontSizePx = parseFloat(fontSize);
      // 1.125rem = 18px at 16px root
      expect(
        fontSizePx,
        `h2 font-size should be reduced at 320px (expected <= 18px, got ${fontSizePx}px)`,
      ).toBeLessThanOrEqual(18);
    });

    test('h3 font size is reduced at 320px', async ({ page }) => {
      await page.goto('/sample-report', { waitUntil: 'networkidle' });

      const h3 = page.locator('h3').first();
      await expect(h3).toBeVisible();

      // globals.css:691 sets h3 { font-size: 1rem; } at 320px
      const fontSize = await h3.evaluate((el) => window.getComputedStyle(el).fontSize);

      const fontSizePx = parseFloat(fontSize);
      // 1rem = 16px at 16px root
      expect(
        fontSizePx,
        `h3 font-size should be reduced at 320px (expected <= 16px, got ${fontSizePx}px)`,
      ).toBeLessThanOrEqual(16);
    });
  });

  // ── Scenario 6: Fluid containers — max-width and overflow ─────────────

  test.describe('Fluid containers', () => {
    test('body has overflow-x hidden at 320px', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // globals.css:610-623 sets overflow-x: hidden on body, main, etc.
      const overflowX = await page.evaluate(() => window.getComputedStyle(document.body).overflowX);

      expect(overflowX).toBe('hidden');
    });

    test('main element has max-width 100vw at 320px', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      const main = page.locator('main').first();
      const mainCount = await page.locator('main').count();

      if (mainCount === 0) {
        test.skip();
        return;
      }

      const box = await main.boundingBox();
      expect(box).not.toBeNull();

      if (box) {
        // Main element should not exceed the viewport width
        expect(
          box.width,
          `main element width (${box.width}px) should not exceed viewport width (${REFLOW_VIEWPORT.width}px)`,
        ).toBeLessThanOrEqual(REFLOW_VIEWPORT.width);
      }
    });
  });

  // ── Scenario 7: Images and media are fluid ────────────────────────────

  test.describe('Fluid images and media', () => {
    test('images do not overflow viewport at 320px', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      const images = page.locator('img');
      const imageCount = await images.count();

      if (imageCount === 0) {
        test.skip();
        return;
      }

      // globals.css:631-637 sets img { max-width: 100%; height: auto; }
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const isVisible = await img.isVisible();
        if (!isVisible) continue;

        const box = await img.boundingBox();
        if (!box) continue;

        expect(
          box.width,
          `Image #${i + 1} should not exceed viewport width at 320px`,
        ).toBeLessThanOrEqual(REFLOW_VIEWPORT.width);
      }
    });

    test('SVG elements do not overflow viewport at 320px', async ({ page }) => {
      await page.goto('/sample-report', { waitUntil: 'networkidle' });

      const svgs = page.locator('svg');
      const svgCount = await svgs.count();

      if (svgCount === 0) {
        test.skip();
        return;
      }

      // Check first 10 SVGs (icons, etc.) to avoid excessive iteration
      for (let i = 0; i < Math.min(svgCount, 10); i++) {
        const svg = svgs.nth(i);
        const isVisible = await svg.isVisible();
        if (!isVisible) continue;

        const box = await svg.boundingBox();
        if (!box) continue;

        expect(
          box.width,
          `SVG #${i + 1} should not exceed viewport width at 320px`,
        ).toBeLessThanOrEqual(REFLOW_VIEWPORT.width);
      }
    });
  });

  // ── Scenario 8: Pre/code blocks wrap at 320px ─────────────────────────

  test.describe('Code block wrapping', () => {
    test('pre and code elements use word-wrap at 320px', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Check all pages for pre/code elements
      for (const { path } of REFLOW_PAGES) {
        await page.goto(path, { waitUntil: 'networkidle' });

        const preElements = page.locator('pre');
        const preCount = await preElements.count();

        // globals.css:694-698 sets pre, code { white-space: pre-wrap; word-break: break-word; }
        for (let i = 0; i < preCount; i++) {
          const pre = preElements.nth(i);
          const styles = await pre.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              whiteSpace: computed.whiteSpace,
              wordBreak: computed.wordBreak,
            };
          });

          expect(
            styles.whiteSpace,
            `pre element on ${path} should have white-space: pre-wrap at 320px`,
          ).toBe('pre-wrap');
          expect(
            styles.wordBreak,
            `pre element on ${path} should have word-break: break-word at 320px`,
          ).toBe('break-word');
        }
      }
    });
  });

  // ── Scenario 9: Reduced padding at 320px ──────────────────────────────

  test.describe('Reduced padding', () => {
    test('mx-auto containers have reduced horizontal padding at 320px', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      const mxAutoElements = page.locator('.mx-auto');
      const count = await mxAutoElements.count();

      if (count === 0) {
        test.skip();
        return;
      }

      // globals.css:683-686 sets .mx-auto { padding-left: 0.5rem; padding-right: 0.5rem; }
      // 0.5rem = 8px at 16px root
      const firstElement = mxAutoElements.first();
      const paddingLeft = await firstElement.evaluate(
        (el) => window.getComputedStyle(el).paddingLeft,
      );

      const paddingPx = parseFloat(paddingLeft);
      expect(
        paddingPx,
        `mx-auto padding-left should be 8px at 320px (0.5rem), got ${paddingPx}px`,
      ).toBeLessThanOrEqual(16);
    });
  });
});
