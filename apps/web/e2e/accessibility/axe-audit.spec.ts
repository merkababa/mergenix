/**
 * Q17: axe-core Automated Accessibility Audit
 *
 * Runs @axe-core/playwright against all key pages to detect WCAG 2.1 AA
 * violations. Only critical and serious violations are treated as hard
 * failures. Minor/moderate violations are captured in the skiplist below
 * and logged but do not block the test suite.
 *
 * Pages covered:
 *   - Home / landing page (/)
 *   - Analysis / results page (/analysis, with demo data)
 *   - Login page (/login)
 *   - Pricing / subscription page (/products and /subscription)
 *
 * Pattern used:
 *   const results = await new AxeBuilder({ page }).analyze();
 *   expect(results.violations.filter(v =>
 *     ['critical', 'serious'].includes(v.impact!)
 *   )).toHaveLength(0);
 *
 * @axe-core/playwright ^4.11.1 is already in devDependencies.
 */

import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import AxeBuilder from '@axe-core/playwright';

// ── Known Minor/Moderate Issues (skiplist) ────────────────────────────────
//
// Add rule IDs here to suppress minor or moderate violations that are
// accepted as known issues. This NEVER suppresses critical or serious
// violations — those always fail.
//
// Format: { ruleId: string; reason: string }
//
// Example:
//   { ruleId: 'color-contrast', reason: 'Recharts tooltips use dynamic colors; tracked in #123' }
//
const KNOWN_MINOR_ISSUES: Array<{ ruleId: string; reason: string }> = [
  // Uncomment and fill in as known issues are identified, e.g.:
  // { ruleId: 'color-contrast', reason: 'Recharts chart labels: tracked in issue #xxx' },
];

const KNOWN_MINOR_RULE_IDS = new Set(KNOWN_MINOR_ISSUES.map((i) => i.ruleId));

// ── WCAG tag set ──────────────────────────────────────────────────────────

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Runs a full axe scan on the current page and returns only critical or
 * serious violations. Minor/moderate violations are logged to the console
 * for visibility but do not cause the test to fail.
 *
 * @param page - The Playwright page to scan.
 * @param label - Human-readable label for console output (e.g. "Login page").
 */
async function runAxeAudit(
  page: import('@playwright/test').Page,
  label: string,
): Promise<import('axe-core').Result[]> {
  const results = await new AxeBuilder({ page })
    .withTags([...WCAG_TAGS])
    .analyze();

  const critical = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );

  const minorModerate = results.violations.filter(
    (v) => v.impact === 'minor' || v.impact === 'moderate',
  );

  // Log all violations for diagnostics (does not cause failure)
  if (results.violations.length > 0) {
    console.log(`\n[axe-audit] ${label} — ${results.violations.length} total violation(s):`);
    for (const v of results.violations) {
      const suppressed = KNOWN_MINOR_RULE_IDS.has(v.id) ? ' [SUPPRESSED]' : '';
      console.log(
        `  [${v.impact?.toUpperCase()}] ${v.id}: ${v.description}${suppressed}`,
        `\n    Nodes: ${v.nodes.length}`,
        `\n    Help: ${v.helpUrl}`,
      );
    }
  }

  // Minor/moderate violations in the skiplist are not returned as failures
  const unsuppressedMinorModerate = minorModerate.filter(
    (v) => !KNOWN_MINOR_RULE_IDS.has(v.id),
  );

  if (unsuppressedMinorModerate.length > 0) {
    console.warn(
      `[axe-audit] ${label} — ${unsuppressedMinorModerate.length} unsuppressed minor/moderate violation(s).`,
      `Consider adding them to KNOWN_MINOR_ISSUES if they are acceptable.`,
    );
  }

  return critical;
}

// ── Public page scans (no auth required) ─────────────────────────────────

test.describe('Q17: axe-core Automated A11y Audit', () => {
  // ── Home / landing page ───────────────────────────────────────────────

  test.describe('Home / landing page', () => {
    test.slow(); // Full axe scans are heavier than typical interaction tests

    test('home page has zero critical/serious axe violations (light mode)', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await expect(page.locator('h1').first()).toBeVisible();

      const critical = await runAxeAudit(page, 'Home (light)');
      expect(
        critical,
        `Found ${critical.length} critical/serious axe violation(s) on the home page (light mode). ` +
          `See console output above for details.`,
      ).toHaveLength(0);
    });

    test('home page has zero critical/serious axe violations (dark mode)', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await expect(page.locator('h1').first()).toBeVisible();

      const critical = await runAxeAudit(page, 'Home (dark)');
      expect(
        critical,
        `Found ${critical.length} critical/serious axe violation(s) on the home page (dark mode).`,
      ).toHaveLength(0);
    });
  });

  // ── Login page ────────────────────────────────────────────────────────

  test.describe('Login page', () => {
    test.slow();

    test('login page has zero critical/serious axe violations', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

      const critical = await runAxeAudit(page, 'Login');
      expect(
        critical,
        `Found ${critical.length} critical/serious axe violation(s) on the login page.`,
      ).toHaveLength(0);
    });

    test('login page passes axe scan in dark mode', async ({ page }) => {
      await page.goto('/login');
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

      const critical = await runAxeAudit(page, 'Login (dark)');
      expect(
        critical,
        `Found ${critical.length} critical/serious axe violation(s) on the login page (dark mode).`,
      ).toHaveLength(0);
    });
  });

  // ── Pricing / subscription page ───────────────────────────────────────
  //
  // The public pricing page is at /products (tier comparison + plans).
  // The authenticated subscription management page is tested in the auth block.

  test.describe('Pricing / products page (public)', () => {
    test.slow();

    test('products/pricing page has zero critical/serious axe violations', async ({ page }) => {
      await page.goto('/products');
      await expect(page.locator('h1').first()).toBeVisible();

      const critical = await runAxeAudit(page, 'Products/Pricing');
      expect(
        critical,
        `Found ${critical.length} critical/serious axe violation(s) on the products/pricing page.`,
      ).toHaveLength(0);
    });

    test('products/pricing page passes axe scan in dark mode', async ({ page }) => {
      await page.goto('/products');
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await expect(page.locator('h1').first()).toBeVisible();

      const critical = await runAxeAudit(page, 'Products/Pricing (dark)');
      expect(
        critical,
        `Found ${critical.length} critical/serious axe violation(s) on the products/pricing page (dark mode).`,
      ).toHaveLength(0);
    });
  });

  // ── Additional public pages ───────────────────────────────────────────

  test.describe('Additional public pages', () => {
    test.slow();

    test('register page has zero critical/serious axe violations', async ({ page }) => {
      // Skip the age verification gate by setting localStorage before page load
      await page.addInitScript(() => {
        localStorage.setItem('mergenix_age_verified', 'true');
      });
      await page.goto('/register');
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

      const critical = await runAxeAudit(page, 'Register');
      expect(
        critical,
        `Found ${critical.length} critical/serious axe violation(s) on the register page.`,
      ).toHaveLength(0);
    });

    test('diseases catalog page has zero critical/serious axe violations', async ({ page }) => {
      await page.goto('/diseases');
      await expect(page.locator('h1').first()).toBeVisible();

      const critical = await runAxeAudit(page, 'Diseases catalog');
      expect(
        critical,
        `Found ${critical.length} critical/serious axe violation(s) on the diseases catalog page.`,
      ).toHaveLength(0);
    });
  });

  // ── Cross-cutting: form labels ────────────────────────────────────────

  test.describe('Form label compliance (cross-cutting)', () => {
    test('all form controls on the login page have programmatic labels', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withRules(['label'])
        .analyze();

      expect(
        results.violations,
        `Login page has form controls without programmatic labels.`,
      ).toHaveLength(0);
    });

    test('all form controls on the register page have programmatic labels', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('mergenix_age_verified', 'true');
      });
      await page.goto('/register');
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withRules(['label'])
        .analyze();

      expect(
        results.violations,
        `Register page has form controls without programmatic labels.`,
      ).toHaveLength(0);
    });
  });

  // ── Cross-cutting: image alt text ─────────────────────────────────────

  test.describe('Image alt text (cross-cutting)', () => {
    test('all images on the home page have appropriate alt text', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h1').first()).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withRules(['image-alt'])
        .analyze();

      expect(
        results.violations,
        `Home page contains images missing alt text.`,
      ).toHaveLength(0);
    });

    test('all images on the products page have appropriate alt text', async ({ page }) => {
      await page.goto('/products');
      await expect(page.locator('h1').first()).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withRules(['image-alt'])
        .analyze();

      expect(
        results.violations,
        `Products page contains images missing alt text.`,
      ).toHaveLength(0);
    });
  });
});

// ── Authenticated page scans ──────────────────────────────────────────────

authTest.describe('Q17: axe-core Audit — Authenticated Pages', () => {
  // ── Analysis / results page ───────────────────────────────────────────

  authTest(
    'analysis page (with demo results) has zero critical/serious axe violations',
    async ({ freeUserPage }) => {
      authTest.slow();

      const page = freeUserPage;
      await page.goto('/analysis');

      // Load demo data to get the page into the "results" state without
      // requiring a real file upload and Web Worker processing cycle.
      await page.getByRole('button', { name: /try demo analysis/i }).click();

      // Wait for the results tablist — this confirms results are rendered
      await authExpect(
        page.getByRole('tablist', { name: /analysis results/i }),
      ).toBeVisible({ timeout: 15_000 });

      const critical = await runAxeAudit(page, 'Analysis (results state)');
      authExpect(
        critical,
        `Found ${critical.length} critical/serious axe violation(s) on the analysis results page.`,
      ).toHaveLength(0);
    },
  );

  // ── Subscription management page ─────────────────────────────────────

  authTest(
    'subscription management page has zero critical/serious axe violations',
    async ({ freeUserPage }) => {
      authTest.slow();

      const page = freeUserPage;
      await page.goto('/subscription');

      // Wait for meaningful content before scanning
      await authExpect(page.locator('h1, h2').first()).toBeVisible();

      const critical = await runAxeAudit(page, 'Subscription management');
      authExpect(
        critical,
        `Found ${critical.length} critical/serious axe violation(s) on the subscription page.`,
      ).toHaveLength(0);
    },
  );

  // ── Account page ──────────────────────────────────────────────────────

  authTest(
    'account page has zero critical/serious axe violations',
    async ({ freeUserPage }) => {
      authTest.slow();

      const page = freeUserPage;
      await page.goto('/account');
      await authExpect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

      const critical = await runAxeAudit(page, 'Account');
      authExpect(
        critical,
        `Found ${critical.length} critical/serious axe violation(s) on the account page.`,
      ).toHaveLength(0);
    },
  );
});
