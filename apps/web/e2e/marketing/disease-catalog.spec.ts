import { test, expect } from '@playwright/test';

/**
 * Disease Catalog Tests (Section 3.11)
 *
 * Validates the disease catalog page: listing, search, filtering,
 * disease detail navigation, and medical disclaimer visibility.
 */
test.describe('Disease Catalog', () => {
  // ── Scenario 1 (P1): Disease catalog page loads with list of diseases ──
  test('catalog loads with disease list', async ({ page }) => {
    await page.goto('/diseases');

    // Verify the page heading
    const heading = page.getByRole('heading', { name: /Disease Catalog/i });
    await expect(heading).toBeVisible();

    // Verify stats section shows disease count (derived from carrier panel data)
    await expect(page.getByText(/Diseases/i).first()).toBeVisible();
    await expect(page.getByText(/SNPs Tracked/i)).toBeVisible();
    await expect(page.getByText(/Inheritance Models/i)).toBeVisible();
    await expect(page.getByText(/Categories/i).first()).toBeVisible();

    // Verify disease cards are rendered (the catalog has paginated cards)
    // Each disease card has a link to /diseases/{slug}
    const diseaseCards = page.locator('a[href^="/diseases/"]');
    const cardCount = await diseaseCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Verify the results status text shows a non-zero count
    const resultsStatus = page.locator('[role="status"]');
    await expect(resultsStatus).toContainText(/Showing \d+ of \d+ diseases/);
  });

  // ── Scenario 2 (P1): User can search diseases by name ──
  test('search by name filters results', async ({ page }) => {
    await page.goto('/diseases');

    // Find the search input
    const searchInput = page.getByLabel(/Search diseases/i);
    await expect(searchInput).toBeVisible();

    // Search for a known disease: "Sickle Cell"
    await searchInput.fill('Sickle Cell');

    // Wait for filtering to update by asserting the results status changes
    const resultsStatus = page.locator('[role="status"]');
    await expect(resultsStatus).toContainText(/matching/i);

    // The Sickle Cell Disease card should be visible
    await expect(page.getByRole('heading', { name: /Sickle Cell Disease/i })).toBeVisible();

    // Clear the search and verify full list returns
    await searchInput.clear();

    // Wait for filter to reset by asserting "matching" text disappears
    await expect(resultsStatus).not.toContainText(/matching/i);
  });

  // ── Scenario 3 (P1): User can filter by category and severity ──
  test('filter by category and severity', async ({ page }) => {
    await page.goto('/diseases');

    // Wait for catalog to load
    const resultsStatus = page.locator('[role="status"]');
    await expect(resultsStatus).toContainText(/Showing/);

    // Get the initial results count
    const initialText = await resultsStatus.textContent();
    const initialMatch = initialText?.match(/of (\d+) diseases/);
    const initialCount = initialMatch ? parseInt(initialMatch[1], 10) : 0;
    expect(initialCount).toBeGreaterThan(0);

    // Filter by category using the category select
    const categoryFilter = page.getByLabel(/Filter by category/i);
    await expect(categoryFilter).toBeVisible();

    // Select "Hematological" category
    await categoryFilter.selectOption('Hematological');

    // Wait for filtering to update by asserting "matching" appears in results
    await expect(resultsStatus).toContainText(/matching/i);

    // Verify results are filtered (count should change)
    const categoryFilteredText = await resultsStatus.textContent();
    const categoryMatch = categoryFilteredText?.match(/of (\d+) diseases/);
    const categoryCount = categoryMatch ? parseInt(categoryMatch[1], 10) : 0;
    expect(categoryCount).toBeGreaterThan(0);
    expect(categoryCount).toBeLessThanOrEqual(initialCount);

    // Now also filter by severity
    const severityFilter = page.getByLabel(/Filter by severity/i);
    await expect(severityFilter).toBeVisible();

    // Select "high" severity
    await severityFilter.selectOption('high');

    // Wait for the results count to update (it should differ from category-only count)
    await expect
      .poll(
        async () => {
          const text = await resultsStatus.textContent();
          return text !== categoryFilteredText;
        },
        { timeout: 5_000 },
      )
      .toBe(true);

    // Verify results are further filtered
    const severityFilteredText = await resultsStatus.textContent();
    const severityMatch = severityFilteredText?.match(/of (\d+) diseases/);
    const severityCount = severityMatch ? parseInt(severityMatch[1], 10) : 0;
    expect(severityCount).toBeGreaterThan(0);
    expect(severityCount).toBeLessThanOrEqual(categoryCount);

    // Verify the Reset button appears when filters are active
    const resetButton = page.getByRole('button', { name: /Reset/i });
    await expect(resetButton).toBeVisible();

    // Reset all filters
    await resetButton.click();

    // Wait for filters to clear — "matching" text should disappear
    await expect(resultsStatus).not.toContainText(/matching/i);

    // Verify count returns to initial
    const resetText = await resultsStatus.textContent();
    const resetMatch = resetText?.match(/of (\d+) diseases/);
    const resetCount = resetMatch ? parseInt(resetMatch[1], 10) : 0;
    expect(resetCount).toBe(initialCount);
  });

  // ── Scenario 4 (P1): User can navigate to a disease detail page ──
  test('navigate to disease detail page', async ({ page }) => {
    await page.goto('/diseases');

    // Wait for disease cards to load
    const firstCard = page.locator('a[href^="/diseases/"]').first();
    await expect(firstCard).toBeVisible();

    // Get the disease name from the first card
    const diseaseName = await firstCard.locator('h3').first().textContent();
    expect(diseaseName).toBeTruthy();

    // Click on the first disease card
    await firstCard.click();

    // Verify the URL changed to a disease detail page
    await page.waitForURL('**/diseases/**', { timeout: 10_000 });
    expect(page.url()).toMatch(/\/diseases\/[a-z0-9-]+$/);

    // Verify we're on the correct disease detail page
    const detailHeading = page.getByRole('heading', {
      name: diseaseName!.trim(),
    });
    await expect(detailHeading).toBeVisible();
  });

  // ── Scenario 5 (P1): Disease detail shows inheritance, severity, SNPs ──
  test('disease detail shows inheritance, severity, and SNPs', async ({ page }) => {
    // Navigate to a known disease with SNPs: Sickle Cell Disease
    await page.goto('/diseases/sickle-cell-disease');

    // Verify the page heading
    await expect(page.getByRole('heading', { name: /Sickle Cell Disease/i })).toBeVisible();

    // Verify severity card is present
    await expect(page.getByText('Severity').first()).toBeVisible();
    await expect(page.getByText('HIGH')).toBeVisible();

    // Verify inheritance card is present
    await expect(page.getByText('Inheritance').first()).toBeVisible();
    await expect(page.getByText(/Autosomal Recessive/i)).toBeVisible();

    // Verify confidence card is present
    await expect(page.getByText('Confidence').first()).toBeVisible();

    // Verify carrier/affected frequency sections
    await expect(page.getByText(/Carrier Frequency/i)).toBeVisible();
    await expect(page.getByText(/Affected Frequency/i)).toBeVisible();

    // Verify the SNPs table is present with column headers
    const snpHeading = page.getByRole('heading', { name: /Related SNPs/i });
    await expect(snpHeading).toBeVisible();

    const snpTable = page.getByRole('table');
    await expect(snpTable).toBeVisible();

    // Verify table has correct column headers
    await expect(snpTable.getByRole('columnheader', { name: /rsID/i })).toBeVisible();
    await expect(snpTable.getByRole('columnheader', { name: /Gene/i })).toBeVisible();
    await expect(snpTable.getByRole('columnheader', { name: /Allele Change/i })).toBeVisible();
    await expect(snpTable.getByRole('columnheader', { name: /Source/i })).toBeVisible();

    // Verify at least one SNP row exists
    const snpRows = snpTable.locator('tbody tr');
    const rowCount = await snpRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify the first SNP row contains an rsID (rs-prefixed identifier)
    const firstRsId = snpRows.first().locator('td').first();
    await expect(firstRsId).toHaveText(/^rs\d+$/);
  });

  // ── Scenario 6 (P2): Medical disclaimer visible on disease detail page ──
  test('medical disclaimer visible on disease detail page', async ({ page }) => {
    // Navigate to a disease detail page
    await page.goto('/diseases/sickle-cell-disease');

    // Verify the page loaded
    await expect(page.getByRole('heading', { name: /Sickle Cell Disease/i })).toBeVisible();

    // Verify the medical disclaimer is visible
    await expect(page.getByText(/Medical Disclaimer/i)).toBeVisible();

    // Verify the disclaimer contains key phrases
    await expect(page.getByText(/educational purposes only/i)).toBeVisible();
    await expect(page.getByText(/not medical advice/i)).toBeVisible();
    await expect(page.getByText(/consult a healthcare professional/i)).toBeVisible();
  });
});
