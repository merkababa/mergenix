/**
 * Page Object Model for site-wide navigation components.
 *
 * Selectors are derived from the actual Navbar and Footer components:
 * - Navbar (components/layout/navbar.tsx)
 * - Footer (components/layout/footer.tsx)
 * - ThemeToggle (components/layout/theme-toggle.tsx)
 * - UserMenu (components/auth/user-menu.tsx)
 */

import type { Page, Locator } from '@playwright/test';

export class NavigationComponent {
  readonly page: Page;

  // ── Navbar Locators ────────────────────────────────────────────────

  /** Main navigation container (aria-label="Main navigation") */
  readonly navbar: Locator;

  /** Mergenix logo link (aria-label="Mergenix home") */
  readonly logoLink: Locator;

  /** Desktop nav links container */
  readonly desktopNavLinks: Locator;

  /** Mobile hamburger menu button */
  readonly mobileMenuButton: Locator;

  /** Mobile menu dialog (role="dialog") */
  readonly mobileMenu: Locator;

  /** "Sign In" link in the navbar */
  readonly signInLink: Locator;

  /** "Get Started" link in the navbar */
  readonly getStartedLink: Locator;

  /** Theme toggle switch (role="switch") */
  readonly themeToggle: Locator;

  /** User menu trigger button (aria-label="User menu") */
  readonly userMenuButton: Locator;

  /** User menu dropdown (role="menu") */
  readonly userMenuDropdown: Locator;

  /** "Sign Out" button inside user menu */
  readonly signOutButton: Locator;

  /** "Skip to main content" accessibility link */
  readonly skipToMainLink: Locator;

  // ── Footer Locators ────────────────────────────────────────────────

  /** Footer element */
  readonly footer: Locator;

  constructor(page: Page) {
    this.page = page;

    this.navbar = page.locator('nav[aria-label="Main navigation"]');
    this.logoLink = page.getByRole('link', { name: /mergenix home/i });
    this.desktopNavLinks = this.navbar
      .locator('[data-testid="desktop-nav"]')
      .or(this.navbar.locator('.hidden.md\\:flex'))
      .first();
    this.mobileMenuButton = page.getByRole('button', { name: /open menu|close menu/i });
    this.mobileMenu = page.getByRole('dialog', { name: /mobile navigation/i });
    this.signInLink = page.getByRole('link', { name: 'Sign In' }).first();
    this.getStartedLink = page.getByRole('link', { name: 'Get Started' }).first();
    this.themeToggle = page.getByRole('switch', { name: /switch to/i });
    this.userMenuButton = page.getByRole('button', { name: 'User menu' });
    this.userMenuDropdown = page.getByRole('menu', { name: 'User menu' });
    this.signOutButton = page.getByRole('menuitem', { name: /sign out/i });
    this.skipToMainLink = page
      .locator('a[href="#main-content"]')
      .or(page.locator('a.skip-to-main'));
    this.footer = page.locator('footer');
  }

  // ── Actions ────────────────────────────────────────────────────────

  /**
   * Get all navigation links in the desktop navbar.
   * Returns locators for: Home, Analysis, Disease Catalog, Pricing, About
   */
  getNavLinks(): Locator {
    return this.navbar.getByRole('link');
  }

  /**
   * Get all footer links.
   * The footer contains Product, Resources, Legal, and Company columns.
   */
  getFooterLinks(): Locator {
    return this.footer.getByRole('link');
  }

  /**
   * Toggle the mobile hamburger menu open or closed.
   */
  async toggleMobileMenu(): Promise<void> {
    await this.mobileMenuButton.click();
  }

  /**
   * Toggle the dark/light theme using the theme switch.
   */
  async toggleTheme(): Promise<void> {
    await this.themeToggle.click();
  }

  /**
   * Get the current theme state.
   * The theme toggle has aria-checked="true" for dark mode
   * and aria-checked="false" for light mode.
   *
   * @returns 'dark' | 'light'
   */
  async getTheme(): Promise<'dark' | 'light'> {
    const isDark = await this.themeToggle.getAttribute('aria-checked');
    return isDark === 'true' ? 'dark' : 'light';
  }

  /**
   * Get the user menu state: whether the dropdown is open and user details.
   * Returns an object with the isOpen state.
   */
  async getUserMenuState(): Promise<{ isOpen: boolean }> {
    const expanded = await this.userMenuButton.getAttribute('aria-expanded').catch(() => null);
    return { isOpen: expanded === 'true' };
  }

  /**
   * Open the user menu dropdown by clicking the trigger.
   */
  async openUserMenu(): Promise<void> {
    const state = await this.getUserMenuState();
    if (!state.isOpen) {
      await this.userMenuButton.click();
    }
  }

  /**
   * Sign out via the user menu.
   */
  async signOut(): Promise<void> {
    await this.openUserMenu();
    await this.signOutButton.click();
  }

  /**
   * Navigate to a specific page via a navbar link.
   *
   * @param label - The visible text of the nav link (e.g., "Home", "Analysis", "Pricing")
   */
  async clickNavLink(label: string): Promise<void> {
    await this.navbar.getByRole('link', { name: label }).click();
  }
}
