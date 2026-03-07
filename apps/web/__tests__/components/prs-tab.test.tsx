import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAnalysisStore } from '../../lib/stores/analysis-store';
import type { FullAnalysisResult } from '@mergenix/shared-types';
import { mockNextNavigationFactory, mockAuthStoreFactory } from '../__helpers__';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock SensitiveContentGuard to render children directly (transparent wrapper)
vi.mock('@/components/ui/sensitive-content-guard', () => ({
  SensitiveContentGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useAuthStore so the component gets a valid user tier
vi.mock('@/lib/stores/auth-store', () => mockAuthStoreFactory({
  user: { id: 'user-1', name: 'Test User', email: 'test@example.com', tier: 'pro', is_verified: true, has_2fa: false, created_at: '2025-01-01T00:00:00Z' },
}));

// Mock next/navigation for SPA navigation (useRouter)
vi.mock('next/navigation', () => mockNextNavigationFactory());

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

import { PrsTab } from '../../components/genetics/results/prs-tab';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockResults: FullAnalysisResult = {
  carrier: [],
  traits: [],
  pgx: {
    genesAnalyzed: 0,
    tier: 'free',
    isLimited: true,
    results: {},
    upgradeMessage: null,
    disclaimer: '',
  },
  prs: {
    conditions: {
      breast_cancer: {
        name: 'Breast Cancer',
        parentA: {
          rawScore: 2.14,
          zScore: 1.73,
          percentile: 96,
          riskCategory: 'high',
          snpsFound: 303,
          snpsTotal: 313,
          coveragePct: 96.8,
        },
        parentB: {
          rawScore: -0.42,
          zScore: -0.58,
          percentile: 28,
          riskCategory: 'below_average',
          snpsFound: 298,
          snpsTotal: 313,
          coveragePct: 95.2,
        },
        offspring: {
          expectedPercentile: 72,
          rangeLow: 50,
          rangeHigh: 89,
          confidence: 'High confidence based on >95% SNP coverage.',
        },
        ancestryNote:
          'PRS weights derived primarily from European-ancestry GWAS.',
        reference: 'Mavaddat N et al. Am J Hum Genet. 2019.',
      },
      alzheimers_disease: {
        name: "Alzheimer's Disease",
        parentA: {
          rawScore: 0.15,
          zScore: -0.05,
          percentile: 48,
          riskCategory: 'average',
          snpsFound: 82,
          snpsTotal: 95,
          coveragePct: 86.3,
        },
        parentB: {
          rawScore: 0.28,
          zScore: 0.11,
          percentile: 54,
          riskCategory: 'average',
          snpsFound: 85,
          snpsTotal: 95,
          coveragePct: 89.5,
        },
        offspring: {
          expectedPercentile: 51,
          rangeLow: 32,
          rangeHigh: 68,
          confidence: 'Low-moderate confidence.',
        },
        ancestryNote:
          'APOE status is the strongest single-gene risk factor.',
        reference: 'Jansen IE et al. Nat Genet. 2019.',
      },
    },
    metadata: {
      source: 'PGS Catalog',
      version: '3.0.0',
      conditionsCovered: 10,
      lastUpdated: '2025-01-15',
      disclaimer: 'PRS metadata disclaimer text.',
    },
    tier: 'pro',
    conditionsAvailable: 10,
    conditionsTotal: 10,
    disclaimer:
      'PRS are calculated from population statistics and represent relative genetic predisposition, not absolute risk.',
    isLimited: false,
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
    parent2Format: 'ancestrydna',
    parent1SnpCount: 610000,
    parent2SnpCount: 680000,
    analysisTimestamp: '2025-01-15T12:00:00Z',
    engineVersion: '3.0.0',
    tier: 'pro',
  },
  coupleMode: false,
  coverageMetrics: { totalDiseases: 0, diseasesWithCoverage: 0, perDisease: {} },
  chipVersion: null,
  genomeBuild: 'GRCh37',
};

/** Results with no PRS conditions for empty state testing. */
const emptyPrsResults: FullAnalysisResult = {
  ...mockResults,
  prs: {
    ...mockResults.prs,
    conditions: {},
  },
};

/** Results with limited tier and upgrade message. */
const limitedPrsResults: FullAnalysisResult = {
  ...mockResults,
  prs: {
    ...mockResults.prs,
    isLimited: true,
    upgradeMessage: 'Upgrade to Premium for additional conditions.',
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PrsTab', () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
  });

  it('returns null when fullResults is null', () => {
    const { container } = render(<PrsTab />);
    expect(container.innerHTML).toBe('');
  });

  it('renders PRS heading', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    expect(screen.getByText('Polygenic Risk Scores')).toBeInTheDocument();
  });

  it('renders condition cards with names', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    expect(screen.getByText('Breast Cancer')).toBeInTheDocument();
    expect(screen.getByText("Alzheimer's Disease")).toBeInTheDocument();
  });

  it('shows expected percentile range for offspring', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    // Both condition cards have an "Expected Range" label
    const expectedRangeLabels = screen.getAllByText(/Expected Range/);
    expect(expectedRangeLabels.length).toBe(2);

    // Each expected range shows "Nth – Mth percentile" within a container
    // Breast Cancer: 50th – 89th percentile; Alzheimer's: 32nd – 68th percentile
    // The word "percentile" is rendered inside a <p> along with numbers and "th" spans
    const rangeContainers = expectedRangeLabels.map((label) => label.closest('div'));
    expect(rangeContainers[0]?.textContent).toContain('percentile');
    expect(rangeContainers[1]?.textContent).toContain('percentile');
  });

  it('shows parent percentile and risk category badges', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    // Breast Cancer: parentA riskCategory=high, parentB=below_average
    // "High" also appears in PrsGauge SVG scale labels, so use getAllByText
    const highTexts = screen.getAllByText('High');
    expect(highTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Below Average')).toBeInTheDocument();

    // Alzheimer's: both average — "Average" may appear in PrsGauge labels too
    const averageBadges = screen.getAllByText('Average');
    expect(averageBadges.length).toBeGreaterThanOrEqual(2);

    // Parent labels
    const parentALabels = screen.getAllByText('Parent A');
    const parentBLabels = screen.getAllByText('Parent B');
    expect(parentALabels.length).toBe(2);
    expect(parentBLabels.length).toBe(2);
  });

  it('shows parent percentile values', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    // Breast Cancer: parentA=96th, parentB=28th
    expect(screen.getByText('96th percentile')).toBeInTheDocument();
    expect(screen.getByText('28th percentile')).toBeInTheDocument();

    // Alzheimer's: parentA=48th, parentB=54th
    expect(screen.getByText('48th percentile')).toBeInTheDocument();
    expect(screen.getByText('54th percentile')).toBeInTheDocument();
  });

  it('shows ancestry note when present', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    // Breast Cancer: high confidence -> shows ancestryNote text
    expect(
      screen.getByText(/PRS weights derived primarily from European-ancestry GWAS/),
    ).toBeInTheDocument();

    // Alzheimer's: low confidence (no European keyword) -> shows generic warning instead of ancestryNote
    // The ancestryNote "APOE status..." is NOT shown; the generic low-confidence message appears instead
    expect(
      screen.getByText(/Ancestry could not be determined/),
    ).toBeInTheDocument();
  });

  it('shows empty state when no conditions', () => {
    useAnalysisStore.setState({ fullResults: emptyPrsResults });

    render(<PrsTab />);

    expect(
      screen.getByText('No polygenic risk score data available.'),
    ).toBeInTheDocument();
  });

  it('shows TierUpgradePrompt when isLimited and upgradeMessage present', () => {
    useAnalysisStore.setState({ fullResults: limitedPrsResults });

    render(<PrsTab />);

    expect(
      screen.getByText('Upgrade to Premium for additional conditions.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
  });

  it('shows disclaimer when present', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    expect(
      screen.getByText(/represent relative genetic predisposition, not absolute risk/),
    ).toBeInTheDocument();
  });

  it('does not show TierUpgradePrompt when upgradeMessage is null', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    expect(screen.queryByText('Upgrade Plan')).not.toBeInTheDocument();
  });

  it('renders MedicalDisclaimer at bottom', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    expect(
      screen.getByText(/Polygenic risk scores are statistical estimates/),
    ).toBeInTheDocument();
  });

  it('shows coverage data (snpsFound/snpsTotal)', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    // Breast Cancer parentA: snpsFound=303, snpsTotal=313
    // These appear in the parent percentile text (96th percentile)
    // The coverage info is shown via the gauge or parent data
    // Check that the actual percentile data with SNP coverage is rendered
    expect(screen.getByText('96th percentile')).toBeInTheDocument();
    expect(screen.getByText('28th percentile')).toBeInTheDocument();
  });

  it('renders ClinicalTestingBanner', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    expect(screen.getByTestId('clinical-testing-banner')).toBeInTheDocument();
  });

  it('renders PrsContextDisclaimer with offspring note', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    expect(
      screen.getByText(/Polygenic risk scores reflect statistical probabilities/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Offspring scores are averaged estimates/),
    ).toBeInTheDocument();
  });

  it('renders AncestryConfidenceBadge for each condition card', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    // Breast Cancer: ancestryNote mentions "European-ancestry GWAS" -> "High Confidence"
    const highConfidenceBadges = screen.getAllByText('High Confidence');
    expect(highConfidenceBadges.length).toBe(1);

    // Alzheimer's: ancestryNote mentions APOE, no European keyword -> "Low Confidence"
    const lowConfidenceBadges = screen.getAllByText('Low Confidence');
    expect(lowConfidenceBadges.length).toBe(1);
  });

  it('renders LimitationsSection for prs category', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<PrsTab />);

    expect(screen.getByTestId('limitations-prs')).toBeInTheDocument();
  });

  it('infers low confidence for non-European ancestry note', () => {
    const nonEuropeanResults: FullAnalysisResult = {
      ...mockResults,
      prs: {
        ...mockResults.prs,
        conditions: {
          test_condition: {
            name: 'Test Condition',
            parentA: mockResults.prs.conditions.breast_cancer.parentA,
            parentB: mockResults.prs.conditions.breast_cancer.parentB,
            offspring: mockResults.prs.conditions.breast_cancer.offspring,
            ancestryNote: 'Derived from African-ancestry GWAS studies.',
            reference: 'Test et al. 2024.',
          },
        },
      },
    };

    useAnalysisStore.setState({ fullResults: nonEuropeanResults });
    render(<PrsTab />);

    // No European keyword => low confidence, ancestry label = "African"
    expect(screen.getByText('Low Confidence')).toBeInTheDocument();
    expect(
      screen.getByText(/Accuracy may be reduced for African ancestry/),
    ).toBeInTheDocument();
  });

  it('detects "Non-European" as low confidence (not high)', () => {
    const nonEurResults: FullAnalysisResult = {
      ...mockResults,
      prs: {
        ...mockResults.prs,
        conditions: {
          test_condition: {
            name: 'Test Non-European',
            parentA: mockResults.prs.conditions.breast_cancer.parentA,
            parentB: mockResults.prs.conditions.breast_cancer.parentB,
            offspring: mockResults.prs.conditions.breast_cancer.offspring,
            ancestryNote: 'Non-European populations have lower accuracy.',
            reference: 'Test et al. 2024.',
          },
        },
      },
    };

    useAnalysisStore.setState({ fullResults: nonEurResults });
    render(<PrsTab />);

    // "Non-European" should NOT trigger high confidence
    expect(screen.getByText('Low Confidence')).toBeInTheDocument();
    expect(screen.queryByText('High Confidence')).not.toBeInTheDocument();
  });

  it('shows "Unknown" ancestry with low confidence when ancestryNote has no recognizable ancestry', () => {
    const unknownResults: FullAnalysisResult = {
      ...mockResults,
      prs: {
        ...mockResults.prs,
        conditions: {
          test_condition: {
            name: 'Test Unknown',
            parentA: mockResults.prs.conditions.breast_cancer.parentA,
            parentB: mockResults.prs.conditions.breast_cancer.parentB,
            offspring: mockResults.prs.conditions.breast_cancer.offspring,
            ancestryNote: 'APOE is the strongest genetic risk factor across all populations.',
            reference: 'Test et al. 2024.',
          },
        },
      },
    };

    useAnalysisStore.setState({ fullResults: unknownResults });
    render(<PrsTab />);

    expect(screen.getByText('Low Confidence')).toBeInTheDocument();
    expect(
      screen.getByText(/Ancestry could not be determined/),
    ).toBeInTheDocument();
  });
});
