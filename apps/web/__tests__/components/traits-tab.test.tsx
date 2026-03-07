import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TraitsTab } from '../../components/genetics/results/traits-tab';
import { useAnalysisStore } from '../../lib/stores/analysis-store';
import type { FullAnalysisResult } from '@mergenix/shared-types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseMockResults: FullAnalysisResult = {
  carrier: [],
  traits: [
    {
      trait: 'Eye Color',
      gene: 'HERC2/OCA2',
      rsid: 'rs12913832',
      chromosome: '15',
      description: 'Primary determinant of iris color.',
      confidence: 'high',
      inheritance: 'codominant',
      status: 'success',
      parentAGenotype: 'AG',
      parentBGenotype: 'AG',
      offspringProbabilities: { Blue: 25, 'Green/Hazel': 50, Brown: 25 },
      category: 'Physical Appearance',
    },
    {
      trait: 'Hair Color',
      gene: 'MC1R',
      rsid: 'rs1805007',
      chromosome: '16',
      description: 'Controls red hair pigmentation.',
      confidence: 'medium',
      inheritance: 'recessive',
      status: 'success',
      parentAGenotype: 'CT',
      parentBGenotype: 'CC',
      offspringProbabilities: { 'Dark (non-red)': 50, 'Light Brown (carrier)': 50 },
      category: 'Physical Appearance',
    },
    {
      trait: 'Muscle Composition',
      gene: 'ACTN3',
      rsid: 'rs1815739',
      chromosome: '11',
      description: 'Encodes alpha-actinin-3 in fast-twitch muscle fibers.',
      confidence: 'high',
      inheritance: 'codominant',
      status: 'missing',
      parentAGenotype: '--',
      parentBGenotype: 'CT',
      offspringProbabilities: {},
      note: 'Parent A genotype unavailable at this locus.',
      category: 'Athletic/Fitness',
    },
  ],
  pgx: {
    genesAnalyzed: 0,
    tier: 'free',
    isLimited: true,
    results: {},
    upgradeMessage: null,
    disclaimer: '',
  },
  prs: {
    conditions: {},
    metadata: { source: '', version: '', conditionsCovered: 0, lastUpdated: '', disclaimer: '' },
    tier: 'free',
    conditionsAvailable: 0,
    conditionsTotal: 0,
    disclaimer: '',
    isLimited: true,
    upgradeMessage: null,
  },
  counseling: {
    recommend: false,
    urgency: 'informational',
    reasons: [],
    nsgcUrl: '',
    summaryText: null,
    keyFindings: null,
    recommendedSpecialties: null,
    referralLetter: null,
    upgradeMessage: null,
  },
  metadata: {
    parent1Format: '23andme',
    parent2Format: 'vcf',
    parent1SnpCount: 600000,
    parent2SnpCount: 450000,
    analysisTimestamp: '2025-01-15T12:00:00Z',
    engineVersion: '3.0.0',
    tier: 'free',
  },
  coupleMode: false,
  coverageMetrics: { totalDiseases: 0, diseasesWithCoverage: 0, perDisease: {} },
  chipVersion: null,
  genomeBuild: 'GRCh37',
};

const emptyTraitsResults: FullAnalysisResult = {
  ...baseMockResults,
  traits: [],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TraitsTab', () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
    localStorage.clear();
  });

  it('returns null when fullResults is null', () => {
    const { container } = render(<TraitsTab />);
    expect(container.innerHTML).toBe('');
  });

  it('shows empty state when traits array is empty', () => {
    useAnalysisStore.setState({ fullResults: emptyTraitsResults });

    render(<TraitsTab />);

    expect(screen.getByText('No trait predictions available.')).toBeInTheDocument();
  });

  it('renders the heading', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    expect(screen.getByText('Trait Predictions')).toBeInTheDocument();
  });

  it('renders successful trait cards with name, gene, and rsid', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    // Two successful traits should display their names
    expect(screen.getByText('Eye Color')).toBeInTheDocument();
    expect(screen.getByText('Hair Color')).toBeInTheDocument();

    // Gene and rsid are rendered together in a single text node: "HERC2/OCA2 · rs12913832"
    // Check the gene and rsid are present in the document
    expect(screen.getByText(/HERC2\/OCA2/)).toBeInTheDocument();
    expect(screen.getByText(/rs12913832/)).toBeInTheDocument();
    expect(screen.getByText(/MC1R/)).toBeInTheDocument();
    expect(screen.getByText(/rs1805007/)).toBeInTheDocument();
  });

  it('renders confidence badges (high, medium)', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    // Eye Color has "high" confidence, Hair Color has "medium" confidence
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('renders probability bars with correct percentages', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    // Eye Color probabilities
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Green/Hazel')).toBeInTheDocument();
    expect(screen.getByText('Brown')).toBeInTheDocument();

    // Percentage values — "25%" appears for both Blue and Brown
    const twentyFivePercents = screen.getAllByText('25%');
    expect(twentyFivePercents.length).toBeGreaterThanOrEqual(2);
    // "50%" appears multiple times (Green/Hazel 50%, and Hair Color has two 50% entries)
    const fiftyPercents = screen.getAllByText('50%');
    expect(fiftyPercents.length).toBeGreaterThanOrEqual(1);

    // Hair Color probabilities
    expect(screen.getByText('Dark (non-red)')).toBeInTheDocument();
    expect(screen.getByText('Light Brown (carrier)')).toBeInTheDocument();
  });

  it('shows missing data section when some traits have status "missing"', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    // Missing data section should describe the issue
    expect(
      screen.getByText(/could not be predicted because one or both parents/),
    ).toBeInTheDocument();

    // The missing trait name should appear as a badge in the missing section
    expect(screen.getByText('Muscle Composition')).toBeInTheDocument();
  });

  it('counts missing traits correctly', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    // "Missing Data (1 trait)" — singular because only 1 missing
    expect(screen.getByText(/Missing Data \(1 trait\)/)).toBeInTheDocument();
  });

  it('shows plural count when multiple traits are missing', () => {
    const twoMissing: FullAnalysisResult = {
      ...baseMockResults,
      traits: [
        ...baseMockResults.traits,
        {
          trait: 'Caffeine Metabolism',
          gene: 'CYP1A2',
          rsid: 'rs762551',
          chromosome: '15',
          description: '',
          confidence: 'high',
          inheritance: 'codominant',
          status: 'missing',
          parentAGenotype: 'AA',
          parentBGenotype: '--',
          offspringProbabilities: {},
        },
      ],
    };

    useAnalysisStore.setState({ fullResults: twoMissing });

    render(<TraitsTab />);

    expect(screen.getByText(/Missing Data \(2 traits\)/)).toBeInTheDocument();
  });

  it('shows medical disclaimer at bottom', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    expect(
      screen.getByText(/Trait predictions are based on simplified genetic models/),
    ).toBeInTheDocument();
  });

  it('does not show missing data section when all traits are successful', () => {
    const allSuccess: FullAnalysisResult = {
      ...baseMockResults,
      traits: baseMockResults.traits.filter((t) => t.status === 'success'),
    };

    useAnalysisStore.setState({ fullResults: allSuccess });

    render(<TraitsTab />);

    expect(screen.queryByText(/could not be predicted/)).not.toBeInTheDocument();
  });

  it('shows tier upgrade prompt for free tier', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    // Free tier metadata -> shows TierUpgradePrompt (upsells health features, not traits)
    expect(screen.getByText(/Upgrade to Premium to unlock disease screening/)).toBeInTheDocument();
    expect(screen.getByText('Unlock Health Insights')).toBeInTheDocument();
  });

  it('renders heading as h3 for correct hierarchy', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    const heading = screen.getByText('Trait Predictions');
    expect(heading.tagName).toBe('H3');
  });

  it('renders probability bars with visible percentage text labels', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    // Each probability bar has a visible text percentage next to it
    // Eye Color: Blue 25%, Green/Hazel 50%, Brown 25%
    const percentLabels = screen.getAllByText(/%/);
    expect(percentLabels.length).toBeGreaterThanOrEqual(5);
  });

  it('renders limitations section', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    expect(screen.getByText(/What Trait Analysis Cannot Tell You/)).toBeInTheDocument();
  });

  // ─── Interaction Tests ────────────────────────────────────────────────────

  it('search filter: typing filters trait cards by name', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    const searchInput = screen.getByRole('searchbox', { name: /search traits/i });
    fireEvent.change(searchInput, { target: { value: 'Eye Color' } });

    // Eye Color should remain visible
    expect(screen.getByText('Eye Color')).toBeInTheDocument();
    // Hair Color should be filtered out
    expect(screen.queryByText('Hair Color')).not.toBeInTheDocument();
  });

  it('search filter: filters by gene name', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    const searchInput = screen.getByRole('searchbox', { name: /search traits/i });
    fireEvent.change(searchInput, { target: { value: 'MC1R' } });

    expect(screen.getByText('Hair Color')).toBeInTheDocument();
    expect(screen.queryByText('Eye Color')).not.toBeInTheDocument();
  });

  it('search filter: filters by rsid', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    const searchInput = screen.getByRole('searchbox', { name: /search traits/i });
    fireEvent.change(searchInput, { target: { value: 'rs12913832' } });

    expect(screen.getByText('Eye Color')).toBeInTheDocument();
    expect(screen.queryByText('Hair Color')).not.toBeInTheDocument();
  });

  it('empty search state: shows "No traits match" message for nonexistent trait', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    const searchInput = screen.getByRole('searchbox', { name: /search traits/i });
    fireEvent.change(searchInput, { target: { value: 'xyznonexistenttrait' } });

    expect(screen.getByText(/No traits match/)).toBeInTheDocument();
  });

  it('confidence filter: shows only traits matching selected confidence level', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    const confidenceSelect = screen.getByRole('combobox', { name: /filter by confidence/i });
    fireEvent.change(confidenceSelect, { target: { value: 'high' } });

    // Eye Color is "high" confidence — should be visible
    expect(screen.getByText('Eye Color')).toBeInTheDocument();
    // Hair Color is "medium" confidence — should be filtered out
    expect(screen.queryByText('Hair Color')).not.toBeInTheDocument();
  });

  it('accordion: clicking an expanded category collapses it and hides trait cards', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    // "Physical Appearance" is expanded by default (first category)
    // Trait cards inside it are visible
    expect(screen.getByText('Eye Color')).toBeInTheDocument();

    // Click the category button to collapse it
    const categoryButton = screen.getByRole('button', { name: /Physical Appearance/i });
    fireEvent.click(categoryButton);

    // After collapse, Eye Color card should not be rendered
    expect(screen.queryByText('Eye Color')).not.toBeInTheDocument();
  });

  it('accordion: clicking a collapsed category expands it and shows trait cards', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    // "Physical Appearance" starts expanded — collapse it first
    const categoryButton = screen.getByRole('button', { name: /Physical Appearance/i });
    fireEvent.click(categoryButton);

    // Now it is collapsed, Eye Color not visible
    expect(screen.queryByText('Eye Color')).not.toBeInTheDocument();

    // Click again to expand
    fireEvent.click(categoryButton);

    // Eye Color should be visible again
    expect(screen.getByText('Eye Color')).toBeInTheDocument();
  });

  it('HealthCategoryBanner: shows health warning when Cancer Risk accordion is expanded', () => {
    const withCancerRisk: FullAnalysisResult = {
      ...baseMockResults,
      traits: [
        ...baseMockResults.traits,
        {
          trait: 'BRCA1 Variant',
          gene: 'BRCA1',
          rsid: 'rs28897696',
          chromosome: '17',
          description: 'Associated with hereditary breast and ovarian cancer risk.',
          confidence: 'high',
          inheritance: 'dominant',
          status: 'success',
          parentAGenotype: 'AG',
          parentBGenotype: 'GG',
          offspringProbabilities: { Carrier: 50, 'Non-carrier': 50 },
          category: 'Cancer Risk',
        },
      ],
    };

    useAnalysisStore.setState({ fullResults: withCancerRisk });

    render(<TraitsTab />);

    // Cancer Risk is not in the first 3 categories — it starts collapsed
    // No health consent dialog yet
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Click the Cancer Risk accordion — triggers health consent interstitial (first-time user)
    const cancerButton = screen.getByRole('button', { name: /Cancer Risk/i });
    fireEvent.click(cancerButton);

    // Health consent interstitial should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Health-Related Genetic Results')).toBeInTheDocument();

    // Accept the consent to proceed
    const acceptButton = screen.getByRole('button', { name: /I Understand, Show Results/i });
    fireEvent.click(acceptButton);

    // Consent dialog is dismissed and accordion is now expanded
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // HealthCategoryBanner should now be visible inside the expanded Cancer Risk panel
    // The banner heading is unique — find the banner by its heading text
    const bannerHeading = screen.getByText(/Health-Related Genetic Information/);
    const banner = bannerHeading.closest('[role="note"]') as HTMLElement;
    expect(banner).toBeInTheDocument();

    // Banner text: "not diagnostic" and "clinical genetic testing"
    expect(banner).toHaveTextContent(/not diagnostic/i);
    expect(banner).toHaveTextContent(/clinical genetic testing/i);

    // Cancer-specific text inside the banner
    expect(banner).toHaveTextContent(/does NOT rule out cancer risk/i);
  });

  it('health consent: clicking "Not Now" dismisses dialog and keeps accordion collapsed', () => {
    const withCancerRisk: FullAnalysisResult = {
      ...baseMockResults,
      traits: [
        ...baseMockResults.traits,
        {
          trait: 'BRCA1 Variant',
          gene: 'BRCA1',
          rsid: 'rs28897696',
          chromosome: '17',
          description: 'Associated with hereditary breast and ovarian cancer risk.',
          confidence: 'high',
          inheritance: 'dominant',
          status: 'success',
          parentAGenotype: 'AG',
          parentBGenotype: 'GG',
          offspringProbabilities: { Carrier: 50, 'Non-carrier': 50 },
          category: 'Cancer Risk',
        },
      ],
    };

    useAnalysisStore.setState({ fullResults: withCancerRisk });

    render(<TraitsTab />);

    // Cancer Risk starts collapsed — no dialog
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Click Cancer Risk to trigger health consent interstitial
    const cancerButton = screen.getByRole('button', { name: /Cancer Risk/i });
    fireEvent.click(cancerButton);

    // Dialog appears
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click "Not Now"
    const notNowButton = screen.getByRole('button', { name: /Not Now/i });
    fireEvent.click(notNowButton);

    // Dialog is dismissed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Cancer Risk accordion remains collapsed — health traits NOT shown
    expect(screen.queryByText('BRCA1 Variant')).not.toBeInTheDocument();
    // Health category warning banner should not be present
    expect(screen.queryByText(/Health-Related Genetic Information/)).not.toBeInTheDocument();
  });

  it('"Not on chip" badge: renders for traits with chipCoverage false', () => {
    const withNotOnChip: FullAnalysisResult = {
      ...baseMockResults,
      traits: [
        {
          trait: 'Eye Color',
          gene: 'HERC2/OCA2',
          rsid: 'rs12913832',
          chromosome: '15',
          description: 'Primary determinant of iris color.',
          confidence: 'high',
          inheritance: 'codominant',
          status: 'success',
          parentAGenotype: 'AG',
          parentBGenotype: 'AG',
          offspringProbabilities: { Blue: 25, 'Green/Hazel': 50, Brown: 25 },
          category: 'Physical Appearance',
          chipCoverage: false,
        },
      ],
    };

    useAnalysisStore.setState({ fullResults: withNotOnChip });

    render(<TraitsTab />);

    // Physical Appearance is expanded by default — chip badge should be visible
    expect(screen.getByText('Not on chip')).toBeInTheDocument();
  });

  it('coverage summary banner: shows correct trait and category counts', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    // baseMockResults has 2 successful traits (Eye Color + Hair Color) and 3 total (1 missing)
    // The coverage banner text: "Analyzing 2 of 3 traits across 1 categories"
    expect(screen.getByText(/Analyzing/)).toBeInTheDocument();

    // The full sentence is rendered as a paragraph with inner spans — query the paragraph
    const coverageParagraph = screen.getByText(/Analyzing/).closest('p');
    expect(coverageParagraph).toBeInTheDocument();
    expect(coverageParagraph).toHaveTextContent('2'); // successful count
    expect(coverageParagraph).toHaveTextContent('3'); // total traits count
  });
});
