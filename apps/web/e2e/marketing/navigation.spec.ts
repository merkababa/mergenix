import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';

/**
 * Site Navigation Tests (Section 3.10)
 *
 * Validates navbar links, footer links, mobile menu, theme toggle,
 * and authentication-dependent navigation state.
 */
test.describe('Site Navigation', () => {
  // ── Scenario 1 (P1): All primary navbar links navigate correctly ──
  test('navbar links navigate correctly', async ({ page }) => {
    await page.goto('/');

    const navLinks = [
      { label: 'Home', expectedPath: '/' },
      { label: 'Analysis', expectedPath: '/analysis' },
      { label: 'Disease Catalog', expectedPath: '/diseases' },
      { label: 'Pricing', expectedPath: '/products' },
      { label: 'About', expectedPath: '/about' },
    ];

    for (const { label, expectedPath } of navLinks) {
      // Navigate back to home first to reset state
      await page.goto('/');

      // Find the navbar link within the main navigation
      const nav = page.getByRole('navigation', { name: /Main navigation/i });
      const link = nav.getByRole('link', { name: label });

      // Click the link (skip Home when already on / since it won't change URL)
      await link.click();
      await page.waitForURL(`**${expectedPath}`, { timeout: 10_000 });

      // Verify we navigated to the correct URL
      expect(new URL(page.url()).pathname).toBe(expectedPath);
    }
  });

  // ── Scenario 2 (P1): All footer links navigate correctly ──
  test('footer links navigate correctly', async ({ page }) => {
    await page.goto('/');

    // Footer has link columns: Product, Resources, Legal, Company
    // We test a representative sample from each column
    const footerLinks = [
      // Product column
      { label: 'Pricing', expectedPath: '/products' },
      // Resources column
      { label: 'Disease Catalog', expectedPath: '/diseases' },
      { label: 'Glossary', expectedPath: '/glossary' },
      { label: 'How It Works', expectedPath: '/about' },
      // Legal column
      { label: 'Terms of Service', expectedPathContains: '/legal' },
      { label: 'Privacy Policy', expectedPathContains: '/legal' },
      { label: 'Cookie Policy', expectedPathContains: '/legal' },
      // Company column
      { label: 'About Us', expectedPath: '/about' },
    ];

    const footer = page.locator('footer');

    for (const linkInfo of footerLinks) {
      // Navigate home to reset
      await page.goto('/');

      const link = footer.getByRole('link', { name: linkInfo.label }).first();
      await expect(link).toBeVisible();

      await link.click();

      // Verify URL changed to expected destination
      if ('expectedPath' in linkInfo && linkInfo.expectedPath) {
        await page.waitForURL(`**${linkInfo.expectedPath}*`, {
          timeout: 10_000,
        });
        expect(new URL(page.url()).pathname).toBe(linkInfo.expectedPath);
      } else if (
        'expectedPathContains' in linkInfo &&
        linkInfo.expectedPathContains
      ) {
        await page.waitForURL(`**${linkInfo.expectedPathContains}*`, {
          timeout: 10_000,
        });
        expect(page.url()).toContain(linkInfo.expectedPathContains);
      }
    }
  });

  // ── Scenario 3 (P1): Mobile hamburger menu opens/closes and links work ──
  test.describe('mobile hamburger menu', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('opens/closes and links work', async ({ page }) => {
      await page.goto('/');

      // The hamburger button should be visible on mobile
      const hamburger = page.getByRole('button', { name: /Open menu/i });
      await expect(hamburger).toBeVisible();

      // Open the mobile menu
      await hamburger.click();

      // The mobile menu dialog should appear
      const mobileMenu = page.getByRole('dialog', {
        name: /Mobile navigation menu/i,
      });
      await expect(mobileMenu).toBeVisible();

      // Verify the hamburger button now shows "Close menu"
      const closeButton = page.getByRole('button', {
        name: /Close menu|Close navigation menu/i,
      });
      await expect(closeButton).toBeVisible();

      // Verify all nav links are visible in the mobile menu
      const navLabels = [
        'Home',
        'Analysis',
        'Disease Catalog',
        'Pricing',
        'About',
      ];
      for (const label of navLabels) {
        await expect(mobileMenu.getByRole('link', { name: label })).toBeVisible();
      }

      // Verify auth links are visible (anonymous state: Sign In + Get Started)
      await expect(
        mobileMenu.getByRole('link', { name: /Sign In/i }),
      ).toBeVisible();
      await expect(
        mobileMenu.getByRole('link', { name: /Get Started/i }),
      ).toBeVisible();

      // Close the menu
      await closeButton.click();

      // Menu should be hidden after closing
      await expect(mobileMenu).toBeHidden();

      // Test that clicking a link navigates and closes the menu
      await hamburger.click();
      await expect(mobileMenu).toBeVisible();

      const aboutLink = mobileMenu.getByRole('link', { name: 'About' });
      await aboutLink.click();
      await page.waitForURL('**/about', { timeout: 10_000 });

      // Menu should close after navigation
      await expect(mobileMenu).toBeHidden();
      expect(new URL(page.url()).pathname).toBe('/about');
    });
  });

  // ── Scenario 3b (P2): Tablet viewport navigation renders correctly ──
  test.describe('Navigation — Tablet Viewport', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('Navigation renders correctly at tablet breakpoint', async ({ page }) => {
      await page.goto('/');

      // At 768px, verify the navbar is visible
      const navbar = page.getByRole('navigation').first();
      await expect(navbar).toBeVisible();

      // At this breakpoint either the hamburger or the desktop nav links should be visible.
      // Use Playwright's .or() composite locator for a single web-first assertion
      // (no .isVisible().catch() TOCTOU pattern).
      const hamburger = page.getByRole('button', { name: /Open menu/i });
      const desktopNavLink = navbar.getByRole('link', { name: /Pricing/i });

      // At least one navigation pattern must be visible
      await expect(hamburger.or(desktopNavLink)).toBeVisible();

      // Verify a key link is reachable — if hamburger is the visible element, open it first
      const hamburgerCount = await hamburger.count();
      const hamburgerIsVisible = hamburgerCount > 0 && await hamburger.isVisible();

      if (hamburgerIsVisible) {
        await hamburger.click();
        // After opening mobile menu, verify a nav link is accessible
        await expect(page.getByRole('link', { name: /Pricing/i })).toBeVisible();
      } else {
        // Desktop nav links should already be visible
        await expect(desktopNavLink).toBeVisible();
      }
    });
  });

  // ── Scenario 4 (P2): Dark/light theme toggle works and persists ──
  test('theme toggle works and persists', async ({ page }) => {
    await page.goto('/');

    // The theme toggle is a switch button
    const themeToggle = page.getByRole('switch', { name: /theme|mode/i });
    await expect(themeToggle).toBeVisible();

    // Read the initial theme state from the toggle's aria-checked
    const initialChecked = await themeToggle.getAttribute('aria-checked');
    const initialIsDark = initialChecked === 'true';

    // Click to toggle the theme
    await themeToggle.click();

    // Wait for the toggle state to change (replaces waitForTimeout)
    if (initialChecked === 'true') {
      await expect(themeToggle).toHaveAttribute('aria-checked', 'false');
    } else {
      await expect(themeToggle).toHaveAttribute('aria-checked', 'true');
    }

    // Verify the toggle state changed
    const newChecked = await themeToggle.getAttribute('aria-checked');
    expect(newChecked).not.toBe(initialChecked);

    // Verify the DOM reflects the theme change (check <html> class or attribute)
    const htmlElement = page.locator('html');
    if (initialIsDark) {
      // Switched from dark to light
      await expect(htmlElement).toHaveAttribute('class', /light/);
    } else {
      // Switched from light to dark
      await expect(htmlElement).toHaveAttribute('class', /dark/);
    }

    // Verify localStorage stores the theme preference
    const storedTheme = await page.evaluate(() =>
      localStorage.getItem('theme'),
    );
    expect(storedTheme).toBeTruthy();
    if (initialIsDark) {
      expect(storedTheme).toBe('light');
    } else {
      expect(storedTheme).toBe('dark');
    }

    // Reload the page and verify the theme persists
    await page.reload();
    await expect(themeToggle).toBeVisible();

    const persistedChecked = await themeToggle.getAttribute('aria-checked');
    expect(persistedChecked).toBe(newChecked);

    // Verify localStorage still has the correct theme
    const persistedTheme = await page.evaluate(() =>
      localStorage.getItem('theme'),
    );
    expect(persistedTheme).toBe(storedTheme);
  });

  // ── Scenario 5 (P1): Anonymous vs authenticated nav items ──
  test('anonymous user sees Sign In and Get Started buttons', async ({
    page,
  }) => {
    await page.goto('/');

    // Desktop nav should show Sign In and Get Started
    const nav = page.getByRole('navigation', { name: /Main navigation/i });
    await expect(
      nav.getByRole('link', { name: /Sign In/i }),
    ).toBeVisible();
    await expect(
      nav.getByRole('link', { name: /Get Started/i }),
    ).toBeVisible();
  });
});

// Authenticated navigation state test (uses auth fixture)
authTest.describe('Authenticated Navigation', () => {
  // ── Scenario 5 continued: Authenticated user sees user menu ──
  authTest(
    'authenticated user sees user menu instead of login buttons',
    async ({ freeUserPage }) => {
      await freeUserPage.goto('/');

      // The UserMenu component should be present (contains Account Settings, Subscription, etc.)
      // When authenticated, "Sign In" and "Get Started" should NOT be visible
      const nav = freeUserPage.getByRole('navigation', {
        name: /Main navigation/i,
      });

      // Sign In / Get Started should not be visible for authenticated users
      await authExpect(
        nav.getByRole('link', { name: /Sign In/i }),
      ).toBeHidden();
      await authExpect(
        nav.getByRole('link', { name: /Get Started/i }),
      ).toBeHidden();

      // User menu trigger button should be visible (the UserMenu component)
      // The user menu shows the user's avatar/icon and opens a dropdown
      const userMenuTrigger = nav.getByRole('button', {
        name: /user menu|account|profile/i,
      });
      await authExpect(userMenuTrigger).toBeVisible();

      // Open the user menu and verify it contains expected links
      await userMenuTrigger.click();

      await authExpect(
        freeUserPage.getByRole('link', { name: /Account Settings/i }),
      ).toBeVisible();
      await authExpect(
        freeUserPage.getByRole('link', { name: /Subscription/i }),
      ).toBeVisible();
      await authExpect(
        freeUserPage.getByText(/Sign Out/i),
      ).toBeVisible();
    },
  );
});
