import { test, expect } from '@playwright/test';
import { CARRIER_PANEL_COUNT_DISPLAY } from '@mergenix/genetics-data';

/**
 * Marketing Page Smoke Tests (Section 3.9)
 *
 * Validates that all primary marketing pages load correctly and contain
 * expected content. These are fast, broad checks to catch deployment
 * regressions before deeper tests run.
 */
test.describe('Marketing Page Smoke Tests', () => {
  // ── Scenario 1 (P1): Homepage loads and contains hero headline text ──
  test('homepage loads with hero headline', async ({ page }) => {
    await page.goto('/');

    // Verify the page loads successfully
    await expect(page).toHaveTitle(/Mergenix/);

    // Verify the hero headline is visible
    const heroHeadline = page.getByRole('heading', {
      name: /Know Your Genetic Future/i,
    });
    await expect(heroHeadline).toBeVisible();

    // Verify key marketing content is present
    await expect(page.getByText(new RegExp(`${CARRIER_PANEL_COUNT_DISPLAY} Disease Screening`, 'i'))).toBeVisible();
    await expect(page.getByText(/79 Trait Predictions/i)).toBeVisible();
  });

  // ── Scenario 2 (P1): About page loads with main content ──
  test('about page loads with content', async ({ page }) => {
    await page.goto('/about');

    // Verify the page loaded
    await expect(page).toHaveTitle(/About/i);

    // Verify the about page heading
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    // Verify key about page content
    await expect(
      page.getByText(/Mendelian Inheritance Modeling/i),
    ).toBeVisible();
    await expect(page.getByText(/Curated SNP Database/i)).toBeVisible();
  });

  // ── Scenario 3 (P1): Products/Pricing page with tier comparison table ──
  test('products/pricing page loads with tier comparison table', async ({
    page,
  }) => {
    await page.goto('/products');

    // Verify the page loaded
    await expect(page).toHaveTitle(/Pricing/i);

    // Verify all three pricing tiers are present
    await expect(page.getByText('Top 25')).toBeVisible();
    await expect(page.getByText('500+')).toBeVisible();
    await expect(page.getByText(`All ${CARRIER_PANEL_COUNT_DISPLAY}`)).toBeVisible();

    // Verify the comparison table is visible with key features
    await expect(page.getByText(/Disease screening/i)).toBeVisible();
    await expect(page.getByText(/Trait predictions/i)).toBeVisible();
    await expect(page.getByText(/Pharmacogenomics/i)).toBeVisible();

    // Verify the table element exists
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
  });

  // ── Scenario 4 (P2): Glossary page loads ──
  test('glossary page loads', async ({ page }) => {
    await page.goto('/glossary');

    // Verify the page loaded
    await expect(page).toHaveTitle(/Glossary/i);

    // Verify the glossary heading is present
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Glossary/i);
  });

  // ── Scenario 5 (P2): No broken links on primary marketing pages ──
  test('no broken links on primary marketing pages', async ({ page }) => {
    const marketingPages = ['/', '/about', '/products', '/glossary'];
    const brokenLinks: { page: string; href: string; status: number }[] = [];

    for (const marketingPage of marketingPages) {
      await page.goto(marketingPage, { waitUntil: 'networkidle' });

      // Collect all anchor hrefs on this page
      const anchors = await page.locator('a[href]').all();
      const hrefs = new Set<string>();

      for (const anchor of anchors) {
        const href = await anchor.getAttribute('href');
        if (!href) continue;

        // Skip external links, mailto:, tel:, hash-only anchors, and javascript:
        if (
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('javascript:') ||
          href === '#' ||
          (href.startsWith('#') && !href.includes('/'))
        ) {
          continue;
        }

        // For absolute URLs, only check same-origin
        if (href.startsWith('http://') || href.startsWith('https://')) {
          try {
            const url = new URL(href);
            const baseUrl = new URL(page.url());
            if (url.origin !== baseUrl.origin) continue;
            hrefs.add(url.pathname);
          } catch {
            // Invalid URL — skip
            continue;
          }
        } else {
          // Relative paths: strip hash fragments
          const cleanHref = href.split('#')[0];
          if (cleanHref) {
            hrefs.add(cleanHref);
          }
        }
      }

      // Check each unique internal link for 404 responses
      for (const href of hrefs) {
        const response = await page.request.get(href);
        if (response.status() === 404) {
          brokenLinks.push({
            page: marketingPage,
            href,
            status: response.status(),
          });
        }
      }
    }

    // Assert no broken links found
    expect(
      brokenLinks,
      `Found broken links:\n${brokenLinks.map((bl) => `  Page "${bl.page}" -> "${bl.href}" (${bl.status})`).join('\n')}`,
    ).toHaveLength(0);
  });
});
