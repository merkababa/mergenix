import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
      screen.getByText(
        /Trait predictions are based on simplified genetic models/,
      ),
    ).toBeInTheDocument();
  });

  it('does not show missing data section when all traits are successful', () => {
    const allSuccess: FullAnalysisResult = {
      ...baseMockResults,
      traits: baseMockResults.traits.filter((t) => t.status === 'success'),
    };

    useAnalysisStore.setState({ fullResults: allSuccess });

    render(<TraitsTab />);

    expect(
      screen.queryByText(/could not be predicted/),
    ).not.toBeInTheDocument();
  });

  it('shows tier upgrade prompt for free tier', () => {
    useAnalysisStore.setState({ fullResults: baseMockResults });

    render(<TraitsTab />);

    // Free tier metadata -> shows TierUpgradePrompt (upsells health features, not traits)
    expect(
      screen.getByText(/Upgrade to Premium to unlock disease screening/),
    ).toBeInTheDocument();
    expect(screen.getByText('Unlock Health Insights')).toBeInTheDocument();
  });
});
