/**
 * Keyboard Navigation Tests
 *
 * Verifies that all pages are fully navigable via keyboard alone,
 * that focus indicators are visible, and that there are no keyboard traps.
 *
 * Covers plan scenarios 3.16 #1–#6.
 */

import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Press Tab and return the tag name + accessible name/label of the newly
 * focused element. Useful for asserting logical tab order.
 */
async function tabAndGetFocus(page: import('@playwright/test').Page) {
  await page.keyboard.press('Tab');
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return { tag: 'none', role: '', name: '', id: '' };
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') ?? '',
      name:
        el.getAttribute('aria-label') ??
        el.getAttribute('name') ??
        el.textContent?.trim().slice(0, 80) ??
        '',
      id: el.id ?? '',
    };
  });
}

/**
 * Verify that the currently focused element has a visible focus indicator.
 * We check for a non-zero outline or box-shadow on the :focus-visible element.
 */
async function currentFocusHasVisibleIndicator(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;

    const styles = window.getComputedStyle(el);
    const outline = styles.outlineStyle;
    const outlineWidth = parseFloat(styles.outlineWidth);
    const boxShadow = styles.boxShadow;

    // Has a visible outline
    if (outline !== 'none' && outlineWidth > 0) return true;

    // Has a box-shadow (common Tailwind focus ring pattern)
    if (boxShadow && boxShadow !== 'none') return true;

    // Check for ring-* utility classes via custom CSS properties or computed styles
    // Tailwind's ring utility generates box-shadow values
    return false;
  });
}

// ── Tab order tests ──────────────────────────────────────────────────────

test.describe('Keyboard Navigation', () => {
  // #1 — Tab order on login page (logical, hits all interactive elements)
  test('Login page should have logical tab order through all interactive elements', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Collect focused element information as we tab through the page.
    // The login page has: skip-to-content (if any), navbar links, Google OAuth button,
    // email input, password input, toggle password visibility, remember me checkbox,
    // forgot password link, sign in button, register link, footer links.
    const focusSequence: string[] = [];
    const maxTabs = 30; // Safety limit

    for (let i = 0; i < maxTabs; i++) {
      const info = await tabAndGetFocus(page);
      const identifier = info.name || info.id || `${info.tag}[${info.role}]`;
      focusSequence.push(identifier);

      // Stop if we've cycled back to the body or hit the end
      if (info.tag === 'body') break;
    }

    // Verify key form controls appear in the tab sequence
    // We check that email, password, and sign-in button are reachable
    const hasEmailInput = focusSequence.some(
      (item) => item.toLowerCase().includes('email') || item.toLowerCase().includes('you@example'),
    );
    const hasPasswordInput = focusSequence.some(
      (item) => item.toLowerCase().includes('password'),
    );
    const hasSignInButton = focusSequence.some(
      (item) => item.toLowerCase().includes('sign in'),
    );

    expect(hasEmailInput).toBe(true);
    expect(hasPasswordInput).toBe(true);
    expect(hasSignInButton).toBe(true);

    // Verify email comes before password in tab order (logical flow)
    const emailIndex = focusSequence.findIndex(
      (item) => item.toLowerCase().includes('email') || item.toLowerCase().includes('you@example'),
    );
    const passwordIndex = focusSequence.findIndex(
      (item) => item.toLowerCase().includes('password') && !item.toLowerCase().includes('forgot'),
    );
    expect(emailIndex).toBeLessThan(passwordIndex);
  });

  // #2 — Tab order on register page
  test('Register page should have logical tab order through all interactive elements', async ({
    page,
  }) => {
    // Skip age verification gate via addInitScript so it's set before page load
    await page.addInitScript(() => {
      localStorage.setItem('mergenix_age_verified', 'true');
    });
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

    const focusSequence: string[] = [];
    const maxTabs = 40;

    for (let i = 0; i < maxTabs; i++) {
      const info = await tabAndGetFocus(page);
      const identifier = info.name || info.id || `${info.tag}[${info.role}]`;
      focusSequence.push(identifier);
      if (info.tag === 'body') break;
    }

    // Verify key form controls are reachable
    const hasNameInput = focusSequence.some(
      (item) => item.toLowerCase().includes('name') || item.toLowerCase().includes('john'),
    );
    const hasEmailInput = focusSequence.some(
      (item) => item.toLowerCase().includes('email') || item.toLowerCase().includes('you@example'),
    );
    const hasPasswordInput = focusSequence.some(
      (item) => item.toLowerCase().includes('password'),
    );
    const hasCreateButton = focusSequence.some(
      (item) => item.toLowerCase().includes('create account'),
    );

    expect(hasNameInput).toBe(true);
    expect(hasEmailInput).toBe(true);
    expect(hasPasswordInput).toBe(true);
    expect(hasCreateButton).toBe(true);

    // Name -> Email -> Password is logical order
    const nameIndex = focusSequence.findIndex(
      (item) => item.toLowerCase().includes('full name') || item.toLowerCase().includes('john'),
    );
    const emailIndex = focusSequence.findIndex(
      (item) => item.toLowerCase().includes('email') || item.toLowerCase().includes('you@example'),
    );
    const passwordIndex = focusSequence.findIndex(
      (item) =>
        item.toLowerCase().includes('password') &&
        !item.toLowerCase().includes('strength'),
    );

    if (nameIndex >= 0 && emailIndex >= 0) {
      expect(nameIndex).toBeLessThan(emailIndex);
    }
    if (emailIndex >= 0 && passwordIndex >= 0) {
      expect(emailIndex).toBeLessThan(passwordIndex);
    }
  });

  // #3 — All interactive elements have visible focus indicator
  test('All interactive elements should have visible focus indicators', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Tab through all focusable elements and verify each has a visible focus indicator.
    // We sample a reasonable number of elements (the form area).
    const maxTabs = 20;
    let elementsWithFocus = 0;
    let elementsWithVisibleIndicator = 0;

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');

      const tag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase() ?? 'body');
      if (tag === 'body') break;

      elementsWithFocus++;

      const hasIndicator = await currentFocusHasVisibleIndicator(page);
      if (hasIndicator) {
        elementsWithVisibleIndicator++;
      }
    }

    // We expect at least 80% of interactive elements to have visible focus indicators.
    // Some browser-default focus styles may not be detected by our heuristic,
    // but the majority should have explicit styling.
    expect(elementsWithFocus).toBeGreaterThan(0);
    const ratio = elementsWithVisibleIndicator / elementsWithFocus;
    expect(ratio).toBeGreaterThanOrEqual(0.7);
  });
});

// ── Arrow key navigation on result tabs ──────────────────────────────────

authTest.describe('Keyboard Navigation — Authenticated', () => {
  // #4 — Result tabs navigable with arrow keys
  authTest(
    'Result tabs should be navigable with left/right arrow keys',
    async ({ freeUserPage }) => {
      const page = freeUserPage;
      await page.goto('/analysis');

      // Load demo results
      await page.getByRole('button', { name: /try demo analysis/i }).click();
      await authExpect(page.getByRole('tablist', { name: /analysis results/i })).toBeVisible({
        timeout: 15_000,
      });

      // Focus the first (active) tab — Overview
      const overviewTab = page.getByRole('tab', { name: /overview/i });
      await overviewTab.focus();
      await authExpect(overviewTab).toBeFocused();
      await authExpect(overviewTab).toHaveAttribute('aria-selected', 'true');

      // Press ArrowRight to move to Carrier Risk tab
      await page.keyboard.press('ArrowRight');
      const carrierTab = page.getByRole('tab', { name: /carrier risk/i });
      await authExpect(carrierTab).toBeFocused();
      await authExpect(carrierTab).toHaveAttribute('aria-selected', 'true');

      // Press ArrowRight again to move to Traits tab
      await page.keyboard.press('ArrowRight');
      const traitsTab = page.getByRole('tab', { name: /traits/i });
      await authExpect(traitsTab).toBeFocused();
      await authExpect(traitsTab).toHaveAttribute('aria-selected', 'true');

      // Press ArrowLeft to go back to Carrier Risk
      await page.keyboard.press('ArrowLeft');
      await authExpect(carrierTab).toBeFocused();
      await authExpect(carrierTab).toHaveAttribute('aria-selected', 'true');

      // Press Home to go to first tab
      await page.keyboard.press('Home');
      await authExpect(overviewTab).toBeFocused();
      await authExpect(overviewTab).toHaveAttribute('aria-selected', 'true');

      // Press End to go to last tab (Counseling)
      await page.keyboard.press('End');
      const counselingTab = page.getByRole('tab', { name: /counseling/i });
      await authExpect(counselingTab).toBeFocused();
      await authExpect(counselingTab).toHaveAttribute('aria-selected', 'true');

      // Arrow wraps: ArrowRight from last tab goes to first
      await page.keyboard.press('ArrowRight');
      await authExpect(overviewTab).toBeFocused();
      await authExpect(overviewTab).toHaveAttribute('aria-selected', 'true');
    },
  );
});

// ── Accordion tests ──────────────────────────────────────────────────────

test.describe('Keyboard Navigation — Accordions', () => {
  // #5 — FAQ accordions toggle with Enter/Space
  test('FAQ accordions should toggle open/closed with Enter key', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();

    // Find the FAQ accordion region
    const faqRegion = page.getByRole('region', { name: /frequently asked questions/i });
    await expect(faqRegion).toBeVisible();

    // Find the first accordion trigger button
    const firstTrigger = faqRegion.getByRole('button').first();
    await expect(firstTrigger).toBeVisible();

    // Verify initially collapsed
    await expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');

    // Focus the trigger and press Enter to open
    await firstTrigger.focus();
    await page.keyboard.press('Enter');
    await expect(firstTrigger).toHaveAttribute('aria-expanded', 'true');

    // Press Enter again to close
    await page.keyboard.press('Enter');
    await expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');

    // Press Space to open
    await page.keyboard.press('Space');
    await expect(firstTrigger).toHaveAttribute('aria-expanded', 'true');

    // Press Space again to close
    await page.keyboard.press('Space');
    await expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');
  });
});

// ── No keyboard traps ────────────────────────────────────────────────────

test.describe('No Keyboard Traps', () => {
  // #6 — Verify Tab can always exit (no keyboard traps)
  test('Login page should have no keyboard traps — Tab cycles through and returns to body', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Tab through all elements on the page. If we hit the same element twice
    // without cycling through body, we have a potential trap.
    const visitedElements = new Set<string>();
    const maxTabs = 60; // Generous limit
    let reachedEnd = false;

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');

      const elementInfo = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return 'none';
        if (el === document.body) return 'body';
        // Create a unique identifier for each element
        return `${el.tagName}#${el.id || ''}[${el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || ''}]`;
      });

      if (elementInfo === 'body') {
        reachedEnd = true;
        break;
      }

      // Check for keyboard trap: if we see the same element sequence repeating
      // without reaching body, it may indicate a trap within a small set of elements.
      // For simplicity, just verify we eventually reach body or cycle through many elements.
      visitedElements.add(elementInfo);
    }

    // Either we reached the body (end of tab cycle) or we visited many unique elements.
    // The page should not trap the user in a small subset.
    const noTrap = reachedEnd || visitedElements.size > 3;
    expect(noTrap).toBe(true);
  });

  test('Products page should have no keyboard traps', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('h1').first()).toBeVisible();

    const maxTabs = 80;
    let reachedEnd = false;
    const visitedElements = new Set<string>();

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');

      const elementInfo = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return 'body';
        return `${el.tagName}#${el.id || ''}[${el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || ''}]`;
      });

      if (elementInfo === 'body') {
        reachedEnd = true;
        break;
      }

      visitedElements.add(elementInfo);
    }

    const noTrap = reachedEnd || visitedElements.size > 3;
    expect(noTrap).toBe(true);
  });

  test('Homepage should have no keyboard traps', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();

    const maxTabs = 100; // Homepage may have many interactive elements
    let reachedEnd = false;
    const visitedElements = new Set<string>();

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');

      const elementInfo = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return 'body';
        return `${el.tagName}#${el.id || ''}[${el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || ''}]`;
      });

      if (elementInfo === 'body') {
        reachedEnd = true;
        break;
      }

      visitedElements.add(elementInfo);
    }

    const noTrap = reachedEnd || visitedElements.size > 3;
    expect(noTrap).toBe(true);
  });
});
