import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAnalysisStore } from '../../lib/stores/analysis-store';
import type { FullAnalysisResult } from '@mergenix/shared-types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock SensitiveContentGuard to render children directly (transparent wrapper)
vi.mock('@/components/ui/sensitive-content-guard', () => ({
  SensitiveContentGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useAuthStore so the component gets a valid user tier
vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { user: { tier: string } | null }) => unknown) =>
    selector({ user: { tier: 'pro' } }),
}));

// Mock next/navigation for SPA navigation (useRouter)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

// Mock shared components from other executors that may not exist yet
vi.mock('@/components/genetics/results/limitations-section', () => ({
  LimitationsSection: ({ context }: { context: string }) => (
    <div data-testid={`limitations-${context}`}>Limitations</div>
  ),
}));

vi.mock('@/components/genetics/results/clinical-testing-banner', () => ({
  ClinicalTestingBanner: () => (
    <div data-testid="clinical-testing-banner">Clinical Testing Banner</div>
  ),
}));

import { PgxTab } from '../../components/genetics/results/pgx-tab';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockResults: FullAnalysisResult = {
  carrier: [],
  traits: [],
  pgx: {
    genesAnalyzed: 2,
    tier: 'pro',
    isLimited: false,
    upgradeMessage: null,
    disclaimer:
      'Pharmacogenomic results are based on DTC genotyping data and should not be used to make medication changes without consulting a healthcare provider.',
    results: {
      CYP2D6: {
        gene: 'CYP2D6',
        description: 'Metabolizes approximately 25% of commonly prescribed drugs.',
        chromosome: '22',
        parentA: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal enzyme activity.',
          },
          drugRecommendations: [
            {
              drug: 'Codeine',
              recommendation: 'Use label-recommended dosage.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Pain',
            },
          ],
        },
        parentB: {
          diplotype: '*1/*2',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal enzyme activity.',
          },
          drugRecommendations: [
            {
              drug: 'Codeine',
              recommendation: 'Use label-recommended dosage.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Pain',
            },
          ],
        },
        offspringPredictions: [
          {
            diplotype: '*1/*1',
            probability: 0.5,
            metabolizerStatus: {
              status: 'normal_metabolizer',
              activityScore: 2.0,
              description: 'Normal enzyme activity.',
            },
            drugRecommendations: [],
          },
          {
            diplotype: '*1/*2',
            probability: 0.5,
            metabolizerStatus: {
              status: 'normal_metabolizer',
              activityScore: 2.0,
              description: 'Normal enzyme activity.',
            },
            drugRecommendations: [],
          },
        ],
      },
      CYP2C19: {
        gene: 'CYP2C19',
        description: 'Metabolizes proton pump inhibitors and clopidogrel.',
        chromosome: '10',
        parentA: {
          diplotype: '*1/*2',
          metabolizerStatus: {
            status: 'intermediate_metabolizer',
            activityScore: 1.0,
            description: 'Reduced enzyme activity.',
          },
          drugRecommendations: [
            {
              drug: 'Clopidogrel',
              recommendation: 'Consider alternative antiplatelet therapy.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Cardiovascular',
            },
            {
              drug: 'Omeprazole',
              recommendation: 'Monitor for increased effect.',
              strength: 'moderate',
              source: 'CPIC',
              category: 'Gastrointestinal',
            },
          ],
        },
        parentB: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal enzyme activity.',
          },
          drugRecommendations: [],
        },
        offspringPredictions: [
          {
            diplotype: '*1/*1',
            probability: 0.5,
            metabolizerStatus: {
              status: 'normal_metabolizer',
              activityScore: 2.0,
              description: 'Normal enzyme activity.',
            },
            drugRecommendations: [],
          },
          {
            diplotype: '*1/*2',
            probability: 0.5,
            metabolizerStatus: {
              status: 'intermediate_metabolizer',
              activityScore: 1.0,
              description: 'Reduced enzyme activity.',
            },
            drugRecommendations: [],
          },
        ],
      },
    },
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
    tier: 'pro',
  },
  coupleMode: false,
  coverageMetrics: { totalDiseases: 0, diseasesWithCoverage: 0, perDisease: {} },
  chipVersion: null,
  genomeBuild: 'GRCh37',
};

/** Results with no gene results for empty state testing. */
const emptyPgxResults: FullAnalysisResult = {
  ...mockResults,
  pgx: {
    ...mockResults.pgx,
    genesAnalyzed: 0,
    results: {},
  },
};

/** Results with limited tier and upgrade message. */
const limitedPgxResults: FullAnalysisResult = {
  ...mockResults,
  pgx: {
    ...mockResults.pgx,
    isLimited: true,
    upgradeMessage: 'Upgrade to Premium for full pharmacogenomic analysis.',
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PgxTab', () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
  });

  it('returns null when fullResults is null', () => {
    const { container } = render(<PgxTab />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the Pharmacogenomics heading', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    expect(screen.getByText('Pharmacogenomics')).toBeInTheDocument();
  });

  it('renders gene cards with gene name and description', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    expect(screen.getByText('CYP2D6')).toBeInTheDocument();
    expect(screen.getByText('CYP2C19')).toBeInTheDocument();
    expect(screen.getByText(/Metabolizes approximately 25% of commonly prescribed drugs/)).toBeInTheDocument();
    expect(screen.getByText(/Metabolizes proton pump inhibitors/)).toBeInTheDocument();
  });

  it('shows metabolizer status badges', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    // CYP2D6 parents are both normal; CYP2C19 has one intermediate
    const normalBadges = screen.getAllByText('Normal Metabolizer');
    expect(normalBadges.length).toBeGreaterThanOrEqual(3); // CYP2D6 A&B + CYP2C19 B

    // "Intermediate Metabolizer" appears for parent A AND in offspring predictions
    const intermediateBadges = screen.getAllByText('Intermediate Metabolizer');
    expect(intermediateBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows parent diplotypes in code elements', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    // "*1/*1" appears multiple times: CYP2D6 parent A, CYP2C19 parent B, and offspring predictions
    const star1star1 = screen.getAllByText('*1/*1');
    expect(star1star1.length).toBeGreaterThanOrEqual(1);
    // "*1/*2" appears for CYP2D6 parent B, CYP2C19 parent A, and offspring predictions
    const star1star2 = screen.getAllByText('*1/*2');
    expect(star1star2.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Parent A and Parent B labels', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    const parentALabels = screen.getAllByText('Parent A');
    const parentBLabels = screen.getAllByText('Parent B');
    // Each gene card has Parent A and Parent B
    expect(parentALabels.length).toBe(2);
    expect(parentBLabels.length).toBe(2);
  });

  it('renders drug recommendation tables when recommendations exist', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    // CYP2D6 has Codeine recs for both parents; CYP2C19 has Clopidogrel + Omeprazole for parent A
    expect(screen.getByText('Clopidogrel')).toBeInTheDocument();
    expect(screen.getByText('Omeprazole')).toBeInTheDocument();

    // Drug recommendation table headers
    const drugHeaders = screen.getAllByText('Drug');
    expect(drugHeaders.length).toBeGreaterThanOrEqual(1);
    const recHeaders = screen.getAllByText('Recommendation');
    expect(recHeaders.length).toBeGreaterThanOrEqual(1);
  });

  it('renders both Parent A and Parent B drug recommendations sections', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    // CYP2D6 has drug recs for both parents
    const parentADrugSections = screen.getAllByText('Parent A Drug Recommendations');
    const parentBDrugSections = screen.getAllByText('Parent B Drug Recommendations');
    expect(parentADrugSections.length).toBeGreaterThanOrEqual(1);
    expect(parentBDrugSections.length).toBeGreaterThanOrEqual(1);
  });

  it('shows offspring predictions with diplotype and probability', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    // Both genes have "Offspring Predictions" sections
    const offspringLabels = screen.getAllByText('Offspring Predictions');
    expect(offspringLabels.length).toBe(2);

    // Probability is shown as "50%" — (0.5 * 100).toFixed(0) = "50"
    const fiftyPercents = screen.getAllByText('50%');
    expect(fiftyPercents.length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state when no gene results', () => {
    useAnalysisStore.setState({ fullResults: emptyPgxResults });

    render(<PgxTab />);

    expect(screen.getByText('No pharmacogenomic results available.')).toBeInTheDocument();
  });

  it('shows TierUpgradePrompt when isLimited and upgradeMessage present', () => {
    useAnalysisStore.setState({ fullResults: limitedPgxResults });

    render(<PgxTab />);

    expect(
      screen.getByText('Upgrade to Premium for full pharmacogenomic analysis.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
  });

  it('shows disclaimer when present', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    expect(
      screen.getByText(/should not be used to make medication changes/),
    ).toBeInTheDocument();
  });

  it('shows warning icon for non-normal metabolizers', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    const { container } = render(<PgxTab />);

    // CYP2C19 parentA is intermediate_metabolizer -> should show AlertTriangle
    // CYP2D6 both normal -> no warning
    // The AlertTriangle SVG in the CYP2C19 gene card header
    // We can verify by checking the CYP2C19 card has the warning icon
    // lucide-react renders <svg> elements; AlertTriangle has class that includes h-4 w-4
    const cyp2c19Heading = screen.getByText('CYP2C19');
    const geneHeader = cyp2c19Heading.closest('h4');
    // The AlertTriangle SVG is a sibling of the text inside the h4
    const warningSvg = geneHeader?.querySelector('svg');
    expect(warningSvg).not.toBeNull();
  });

  it('does not show warning icon for normal metabolizers', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    // CYP2D6 both parents are normal_metabolizer -> no AlertTriangle in that card
    const cyp2d6Heading = screen.getByText('CYP2D6');
    const geneHeader = cyp2d6Heading.closest('h4');
    const warningSvg = geneHeader?.querySelector('svg');
    expect(warningSvg).toBeNull();
  });

  it('renders drug category value in table', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    // CYP2D6 Codeine -> category "Pain" (both parents have it, so 2 matches)
    const painCells = screen.getAllByText('Pain');
    expect(painCells.length).toBeGreaterThanOrEqual(1);
    // CYP2C19 Clopidogrel -> category "Cardiovascular"
    expect(screen.getByText('Cardiovascular')).toBeInTheDocument();
    // CYP2C19 Omeprazole -> category "Gastrointestinal"
    expect(screen.getByText('Gastrointestinal')).toBeInTheDocument();
  });

  it('renders ClinicalTestingBanner', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    expect(screen.getByTestId('clinical-testing-banner')).toBeInTheDocument();
  });

  it('renders CYP2D6Warning when CYP2D6 is in results', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    // CYP2D6 is in the test fixture -> warning should render
    expect(
      screen.getByText(/Array-based testing cannot detect CYP2D6 gene duplications/),
    ).toBeInTheDocument();
  });

  it('does not render CYP2D6Warning when CYP2D6 is not in results', () => {
    const noCyp2d6Results: FullAnalysisResult = {
      ...mockResults,
      pgx: {
        ...mockResults.pgx,
        results: {
          CYP2C19: mockResults.pgx.results.CYP2C19,
        },
      },
    };
    useAnalysisStore.setState({ fullResults: noCyp2d6Results });

    render(<PgxTab />);

    expect(
      screen.queryByText(/Array-based testing cannot detect CYP2D6 gene duplications/),
    ).not.toBeInTheDocument();
  });

  it('renders LimitationsSection for pgx category', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PgxTab />);

    expect(screen.getByTestId('limitations-pgx')).toBeInTheDocument();
  });
});
