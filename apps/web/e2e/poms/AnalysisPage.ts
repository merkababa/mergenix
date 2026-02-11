/**
 * Page Object Model for the Analysis page (/analysis).
 *
 * Selectors are derived from the actual AnalysisPage component in
 * apps/web/app/(app)/analysis/page.tsx and its sub-components:
 * - FileDropzone (components/genetics/file-dropzone.tsx)
 * - AnalysisProgress (components/genetics/analysis-progress.tsx)
 * - PopulationSelector (components/genetics/population-selector.tsx)
 * - TierUpgradePrompt (components/genetics/tier-upgrade-prompt.tsx)
 * - MedicalDisclaimer (components/genetics/medical-disclaimer.tsx)
 * - SaveResultDialog (components/analysis/save-result-dialog.tsx)
 * - SavedResultsList (components/analysis/saved-results-list.tsx)
 */

import type { Page, Locator } from '@playwright/test';
import * as path from 'path';

/** Tab keys matching the RESULT_TABS config in the analysis page. */
export type ResultTabName = 'Overview' | 'Carrier Risk' | 'Traits' | 'PGx' | 'PRS' | 'Counseling';

export class AnalysisPage {
  readonly page: Page;

  // ── Locators ───────────────────────────────────────────────────────

  /** Main page heading "Genetic Analysis" */
  readonly heading: Locator;

  /** "Parent A (Mother)" file dropzone */
  readonly parentADropzone: Locator;

  /** "Parent B (Father)" file dropzone */
  readonly parentBDropzone: Locator;

  /** "Try Demo Analysis" button */
  readonly demoButton: Locator;

  /** "Start Analysis" button */
  readonly startAnalysisButton: Locator;

  /** "Cancel Analysis" button */
  readonly cancelButton: Locator;

  /** Progress indicator container (role="progressbar") */
  readonly progressStepper: Locator;

  /** Tab list container (role="tablist") */
  readonly tabList: Locator;

  /** Tab panel (role="tabpanel") */
  readonly tabPanel: Locator;

  /** Demo banner indicating synthetic data */
  readonly demoBanner: Locator;

  /** Error display container */
  readonly errorDisplay: Locator;

  /** Tier notice / upgrade prompt at top of page */
  readonly tierNotice: Locator;

  /** Medical disclaimer (role="note" with aria-label="Medical disclaimer") */
  readonly medicalDisclaimer: Locator;

  /** "Save Analysis" button */
  readonly saveAnalysisButton: Locator;

  /** "New Analysis" button */
  readonly newAnalysisButton: Locator;

  /** "My Saved Analyses" section heading */
  readonly savedAnalysesSection: Locator;

  /** Population selector (aria-label="Select ancestral population") */
  readonly populationSelector: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Genetic Analysis' });
    this.parentADropzone = page.getByRole('button', { name: /parent a.*mother/i });
    this.parentBDropzone = page.getByRole('button', { name: /parent b.*father/i });
    this.demoButton = page.getByRole('button', { name: /try demo analysis/i });
    this.startAnalysisButton = page.getByRole('button', { name: /start analysis/i });
    this.cancelButton = page.getByRole('button', { name: /cancel analysis/i });
    this.progressStepper = page.getByRole('progressbar');
    this.tabList = page.getByRole('tablist', { name: /analysis results/i });
    this.tabPanel = page.getByRole('tabpanel');
    this.demoBanner = page.getByText("You're viewing demo results with synthetic data");
    this.errorDisplay = page.getByText('Analysis Error');
    this.tierNotice = page.getByText(/free tier|premium tier/i);
    this.medicalDisclaimer = page.locator('[aria-label="Medical disclaimer"]');
    this.saveAnalysisButton = page.getByRole('button', { name: /save analysis/i });
    this.newAnalysisButton = page.getByRole('button', { name: /new analysis/i });
    this.savedAnalysesSection = page.getByRole('heading', { name: /my saved analyses/i });
    this.populationSelector = page.locator('[aria-label="Select ancestral population"]');
  }

  // ── Actions ────────────────────────────────────────────────────────

  /** Navigate to the analysis page. */
  async goto(): Promise<void> {
    await this.page.goto('/analysis');
  }

  /**
   * Upload a file to a parent slot by triggering the hidden file input.
   *
   * @param slot - Which parent slot: 'A' or 'B'
   * @param filePath - Absolute or relative path to the file to upload
   */
  async uploadFile(
    slot: 'A' | 'B',
    filePath: string,
  ): Promise<void> {
    const dropzone = slot === 'A' ? this.parentADropzone : this.parentBDropzone;

    // The dropzone has a hidden file input inside it. We use setInputFiles
    // to programmatically set the file without relying on drag-and-drop.
    const fileInput = dropzone.locator('input[type="file"]');

    // Resolve the path to an absolute path if it isn't already
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

    await fileInput.setInputFiles(absolutePath);
  }

  /** Click the "Try Demo Analysis" button to load demo results. */
  async clickDemo(): Promise<void> {
    await this.demoButton.click();
  }

  /** Click the "Start Analysis" button. */
  async clickStartAnalysis(): Promise<void> {
    await this.startAnalysisButton.click();
  }

  /** Get the progress stepper locator for assertions. */
  getProgressStepper(): Locator {
    return this.progressStepper;
  }

  /**
   * Select a result tab by its visible label text.
   * Tab labels: "Overview", "Carrier Risk", "Traits", "PGx", "PRS", "Counseling"
   */
  async selectTab(name: ResultTabName): Promise<void> {
    await this.tabList.getByRole('tab', { name }).click();
  }

  /** Get the tab panel content locator for assertions. */
  getResultsContent(): Locator {
    return this.tabPanel;
  }

  /** Get the tier upgrade prompt locator. */
  getTierUpgradePrompt(): Locator {
    return this.page.getByText(/upgrade plan/i);
  }

  /** Get the medical disclaimer locator for assertions. */
  getMedicalDisclaimer(): Locator {
    return this.medicalDisclaimer;
  }

  /**
   * Select an ancestral population from the population selector dropdown.
   */
  async selectPopulation(name: string): Promise<void> {
    await this.populationSelector.selectOption({ label: name });
  }

  /** Click the "Cancel Analysis" button. */
  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Save the current analysis with a given label.
   * Handles the consent dialog if it appears for the first time.
   */
  async saveAnalysis(label: string): Promise<void> {
    await this.saveAnalysisButton.click();

    // Handle consent dialog if it appears
    const consentButton = this.page.getByRole('button', { name: /i understand/i });
    const consentVisible = await consentButton.isVisible().catch(() => false);
    if (consentVisible) {
      await consentButton.click();
    }

    // Fill the label input in the save dialog
    const labelInput = this.page.getByLabel('Analysis Label');
    await labelInput.fill(label);

    // Click the "Save" button inside the dialog
    const saveButton = this.page.getByRole('dialog').getByRole('button', { name: 'Save' });
    await saveButton.click();
  }

  /**
   * Load a saved analysis by clicking its "Load" button.
   *
   * @param label - The label text of the saved analysis to load
   */
  async loadAnalysis(label: string): Promise<void> {
    const resultItem = this.page.locator('li', { hasText: label });
    await resultItem.getByRole('button', { name: /load/i }).click();
  }
}
