/**
 * Page Object Model for the Disease Catalog page (/diseases).
 *
 * Selectors are derived from the actual CatalogContent component in
 * apps/web/app/(marketing)/diseases/_components/catalog-content.tsx
 * and the disease detail page at
 * apps/web/app/(marketing)/diseases/[slug]/page.tsx.
 */

import type { Page, Locator } from '@playwright/test';

export class DiseaseCatalogPage {
  readonly page: Page;

  // ── Locators ───────────────────────────────────────────────────────

  /** Main page heading "Disease Catalog" */
  readonly heading: Locator;

  /** Search input (aria-label="Search diseases") */
  readonly searchInput: Locator;

  /** Category filter select (aria-label="Filter by category") */
  readonly categoryFilter: Locator;

  /** Severity filter select (aria-label="Filter by severity") */
  readonly severityFilter: Locator;

  /** Inheritance filter select (aria-label="Filter by inheritance model") */
  readonly inheritanceFilter: Locator;

  /** "Reset" / "Reset All Filters" button */
  readonly resetFiltersButton: Locator;

  /** Results count status text (role="status") */
  readonly resultsCount: Locator;

  /** Pagination container (aria-label="Disease catalog pagination") */
  readonly pagination: Locator;

  /** "No diseases found" empty state heading */
  readonly emptyStateHeading: Locator;

  /** Disease detail page - Medical Disclaimer text */
  readonly detailDisclaimer: Locator;

  /** Disease detail page - "Related SNPs" heading */
  readonly relatedSnpsHeading: Locator;

  /** Disease detail page - SNPs table */
  readonly snpsTable: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Disease Catalog' });
    this.searchInput = page.getByPlaceholder('Search diseases, categories...');
    this.categoryFilter = page.locator('[aria-label="Filter by category"]');
    this.severityFilter = page.locator('[aria-label="Filter by severity"]');
    this.inheritanceFilter = page.locator('[aria-label="Filter by inheritance model"]');
    this.resetFiltersButton = page.getByRole('button', { name: /reset/i });
    this.resultsCount = page.locator('[role="status"]', { hasText: /showing/i });
    this.pagination = page.locator('nav[aria-label="Disease catalog pagination"]');
    this.emptyStateHeading = page.getByRole('heading', { name: /no diseases found/i });
    this.detailDisclaimer = page.getByText('Medical Disclaimer');
    this.relatedSnpsHeading = page.getByRole('heading', { name: 'Related SNPs' });
    this.snpsTable = page.getByRole('table');
  }

  // ── Actions ────────────────────────────────────────────────────────

  /** Navigate to the disease catalog page. */
  async goto(): Promise<void> {
    await this.page.goto('/diseases');
  }

  /**
   * Search for diseases by typing a query into the search input.
   */
  async searchDisease(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /**
   * Filter diseases by category using the category select dropdown.
   *
   * @param category - The category label to select, e.g., "Metabolic", "Neurological"
   */
  async filterByCategory(category: string): Promise<void> {
    await this.categoryFilter.selectOption({ label: category });
  }

  /**
   * Filter diseases by severity using the severity select dropdown.
   *
   * @param severity - The severity level: "High", "Moderate", or "Low"
   */
  async filterBySeverity(severity: string): Promise<void> {
    await this.severityFilter.selectOption({ label: severity });
  }

  /**
   * Filter diseases by inheritance model.
   *
   * @param inheritance - The inheritance model label
   */
  async filterByInheritance(inheritance: string): Promise<void> {
    await this.inheritanceFilter.selectOption({ label: inheritance });
  }

  /**
   * Get all disease card links currently visible on the page.
   * Each card is a link to a disease detail page.
   */
  getDiseaseList(): Locator {
    return this.page.locator('a[href^="/diseases/"]');
  }

  /**
   * Navigate to a specific disease by clicking its card.
   *
   * @param name - The disease name text to click
   */
  async navigateToDisease(name: string): Promise<void> {
    await this.page.getByRole('heading', { name, level: 3 }).click();
  }

  /**
   * Get the disease detail content locator.
   * Useful for asserting that the detail page rendered correctly.
   * Returns the container with severity, inheritance, and confidence cards.
   */
  getDiseaseDetail(): Locator {
    return this.page.locator('[data-testid="disease-detail"]').or(
      this.page.locator('.max-w-4xl'),
    );
  }
}
