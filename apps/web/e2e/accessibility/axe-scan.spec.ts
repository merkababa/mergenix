/**
 * Automated Accessibility Scans — axe-core WCAG 2.1 AA
 *
 * Runs @axe-core/playwright against key pages in both themes.
 * Fails on critical or serious impact violations only. Minor and
 * moderate violations are logged but do not block.
 *
 * Covers plan scenarios 3.15 #1–#11.
 */

import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import AxeBuilder from '@axe-core/playwright';

// ── Shared WCAG tag set ──────────────────────────────────────────────────

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

/**
 * Helper: run axe analysis and return only critical/serious violations.
 */
async function getCriticalViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags([...WCAG_TAGS])
    .analyze();

  return results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
}

// ── Page-level scans ─────────────────────────────────────────────────────

test.describe('Axe Accessibility Scans', () => {
  test.describe('Homepage', () => {
    // #1 — Homepage dark mode: zero critical/serious violations
    test('should have zero critical/serious axe violations in dark mode', async ({
      page,
    }) => {
      await page.goto('/');
      // Ensure dark theme is active (default theme)
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      // Wait for page to be fully loaded and rendered
      await expect(page.locator('h1').first()).toBeVisible();

      const violations = await getCriticalViolations(page);
      expect(violations).toEqual([]);
    });

    // #2 — Homepage light mode: zero critical/serious violations
    test('should have zero critical/serious axe violations in light mode', async ({
      page,
    }) => {
      await page.goto('/');
      // Toggle to light mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await expect(page.locator('h1').first()).toBeVisible();

      const violations = await getCriticalViolations(page);
      expect(violations).toEqual([]);
    });
  });

  // #3 — Login page: zero critical/serious violations
  test('Login page should have zero critical/serious axe violations', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    const violations = await getCriticalViolations(page);
    expect(violations).toEqual([]);
  });

  // #4 — Register page: zero critical/serious violations
  test('Register page should have zero critical/serious axe violations', async ({
    page,
  }) => {
    // Set localStorage before page load to skip the age verification modal
    await page.addInitScript(() => {
      localStorage.setItem('mergenix_age_verified', 'true');
    });
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

    const violations = await getCriticalViolations(page);
    expect(violations).toEqual([]);
  });

  // #7 — Products page: zero critical/serious violations
  test('Products page should have zero critical/serious axe violations', async ({
    page,
  }) => {
    await page.goto('/products');
    await expect(page.locator('h1').first()).toBeVisible();

    const violations = await getCriticalViolations(page);
    expect(violations).toEqual([]);
  });

  // #3b — Login page (dark mode): zero critical/serious violations
  test('Login page (dark mode) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/login');
    // Ensure dark theme is active
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    const violations = await getCriticalViolations(page);
    expect(violations).toEqual([]);
  });

  // #4b — Register page (dark mode): zero critical/serious violations
  test('Register page (dark mode) passes axe accessibility scan', async ({
    page,
  }) => {
    // Set localStorage before page load to skip the age verification modal
    await page.addInitScript(() => {
      localStorage.setItem('mergenix_age_verified', 'true');
    });
    await page.goto('/register');
    // Ensure dark theme is active
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

    const violations = await getCriticalViolations(page);
    expect(violations).toEqual([]);
  });

  // #7b — Products page (dark mode): zero critical/serious violations
  test('Products page (dark mode) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/products');
    // Ensure dark theme is active
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await expect(page.locator('h1').first()).toBeVisible();

    const violations = await getCriticalViolations(page);
    expect(violations).toEqual([]);
  });

  // #8 — Disease catalog page: zero critical/serious violations
  test('Disease catalog page should have zero critical/serious axe violations', async ({
    page,
  }) => {
    await page.goto('/diseases');
    await expect(page.locator('h1').first()).toBeVisible();

    const violations = await getCriticalViolations(page);
    expect(violations).toEqual([]);
  });
});

// ── Auth-required page scans ─────────────────────────────────────────────

authTest.describe('Axe Scans — Authenticated Pages', () => {
  // #5 — Analysis page (results state): zero critical/serious violations
  authTest(
    'Analysis page with results should have zero critical/serious axe violations',
    async ({ freeUserPage }) => {
      const page = freeUserPage;
      await page.goto('/analysis');

      // Trigger demo results to get the page into "results" state quickly,
      // avoiding the need for full file upload and worker processing.
      await page.getByRole('button', { name: /try demo analysis/i }).click();

      // Wait for results to render — the tablist indicates results are shown
      await authExpect(page.getByRole('tablist', { name: /analysis results/i })).toBeVisible({
        timeout: 15_000,
      });

      const violations = await getCriticalViolations(page);
      authExpect(violations).toEqual([]);
    },
  );

  // #6 — Account page: zero critical/serious violations
  authTest(
    'Account page should have zero critical/serious axe violations',
    async ({ freeUserPage }) => {
      const page = freeUserPage;
      await page.goto('/account');
      await authExpect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

      const violations = await getCriticalViolations(page);
      authExpect(violations).toEqual([]);
    },
  );
});

// ── Cross-cutting accessibility checks ───────────────────────────────────

test.describe('Cross-cutting Accessibility', () => {
  // #9 — All form controls have programmatic labels
  test('All form controls on login page should have programmatic labels', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withRules(['label'])
      .analyze();

    const violations = results.violations;
    expect(violations).toEqual([]);
  });

  test('All form controls on register page should have programmatic labels', async ({
    page,
  }) => {
    // Skip age gate via addInitScript so localStorage is set before page load
    await page.addInitScript(() => {
      localStorage.setItem('mergenix_age_verified', 'true');
    });
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withRules(['label'])
      .analyze();

    const violations = results.violations;
    expect(violations).toEqual([]);
  });

  // #10 — All images have appropriate alt text
  test('All images on the homepage should have appropriate alt text', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze();

    const violations = results.violations;
    expect(violations).toEqual([]);
  });

  test('All images on the products page should have appropriate alt text', async ({
    page,
  }) => {
    await page.goto('/products');
    await expect(page.locator('h1').first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze();

    const violations = results.violations;
    expect(violations).toEqual([]);
  });

  // #11 — Heading hierarchy: one h1, no skipped levels per page
  const pagesToCheck = [
    { name: 'Homepage', path: '/' },
    { name: 'Login', path: '/login' },
    { name: 'Products', path: '/products' },
    { name: 'Diseases', path: '/diseases' },
  ];

  for (const { name, path } of pagesToCheck) {
    test(`${name} should have exactly one h1 and no skipped heading levels`, async ({
      page,
    }) => {
      // Skip age gate on register page
      if (path === '/register') {
        await page.addInitScript(() => {
          localStorage.setItem('mergenix_age_verified', 'true');
        });
      }

      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();

      // Verify exactly one h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);

      // Verify no skipped heading levels using axe
      const results = await new AxeBuilder({ page })
        .withRules(['heading-order'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
