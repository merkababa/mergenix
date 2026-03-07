import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock LimitationsSection (owned by Executor A)
vi.mock('../../components/genetics/results/limitations-section', () => ({
  LimitationsSection: ({ context }: { context?: string }) => (
    <div data-testid="limitations-section">{context ?? 'generic'}</div>
  ),
}));
import { CounselingTab } from '../../components/genetics/results/counseling-tab';
import { useAnalysisStore } from '../../lib/stores/analysis-store';
import type { FullAnalysisResult } from '@mergenix/shared-types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** Base fixture skeleton (non-counseling sections are minimal stubs). */
const baseResults: Omit<FullAnalysisResult, 'counseling'> = {
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
    conditions: {},
    metadata: { source: '', version: '', conditionsCovered: 0, lastUpdated: '', disclaimer: '' },
    tier: 'free',
    conditionsAvailable: 0,
    conditionsTotal: 0,
    disclaimer: '',
    isLimited: true,
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

/** Full counseling results: recommend=true, urgency=high, with all sections. */
const highUrgencyResults: FullAnalysisResult = {
  ...baseResults,
  counseling: {
    recommend: true,
    urgency: 'high',
    reasons: [
      'Both parents are carriers for Cystic Fibrosis.',
      'Autosomal dominant variant for Familial Hypercholesterolemia detected.',
    ],
    nsgcUrl: 'https://www.nsgc.org/findageneticcounselor',
    summaryText: 'Your combined genetic analysis identified several findings.',
    keyFindings: [
      {
        condition: 'Cystic Fibrosis',
        gene: 'CFTR',
        riskLevel: 'high_risk',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        inheritance: 'autosomal_recessive',
      },
      {
        condition: 'Familial Hypercholesterolemia',
        gene: 'LDLR',
        riskLevel: 'high_risk',
        parentAStatus: 'affected',
        parentBStatus: 'normal',
        inheritance: 'autosomal_dominant',
      },
    ],
    recommendedSpecialties: ['prenatal', 'carrier_screening', 'cancer'],
    referralLetter:
      'To Whom It May Concern,\n\nThis couple should be referred for genetic counseling.\n\nSincerely,\nMergenix Automated Referral System',
    upgradeMessage: null,
  },
};

/** Informational urgency with recommend=false and no key findings. */
const informationalResults: FullAnalysisResult = {
  ...baseResults,
  counseling: {
    recommend: false,
    urgency: 'informational',
    reasons: [],
    nsgcUrl: 'https://www.nsgc.org/findageneticcounselor',
    summaryText: null,
    keyFindings: null,
    recommendedSpecialties: null,
    referralLetter: null,
    upgradeMessage: null,
  },
};

/** Moderate urgency. */
const moderateResults: FullAnalysisResult = {
  ...baseResults,
  counseling: {
    recommend: true,
    urgency: 'moderate',
    reasons: ['One parent is a carrier for a recessive condition.'],
    nsgcUrl: 'https://www.nsgc.org/findageneticcounselor',
    summaryText: null,
    keyFindings: null,
    recommendedSpecialties: null,
    referralLetter: null,
    upgradeMessage: null,
  },
};

/** Results with upgrade message. */
const upgradeResults: FullAnalysisResult = {
  ...baseResults,
  counseling: {
    recommend: false,
    urgency: 'informational',
    reasons: [],
    nsgcUrl: 'https://www.nsgc.org/findageneticcounselor',
    summaryText: null,
    keyFindings: null,
    recommendedSpecialties: null,
    referralLetter: null,
    upgradeMessage: 'Upgrade to Pro for detailed counseling insights and referral letters.',
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CounselingTab', () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
  });

  it('returns null when fullResults is null', () => {
    const { container } = render(<CounselingTab />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "Consider Speaking with a Genetic Counselor" when recommend=true', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(screen.getByText('Consider Speaking with a Genetic Counselor')).toBeInTheDocument();
  });

  it('shows "No Urgent Counseling Needed" when recommend=false', () => {
    useAnalysisStore.setState({ fullResults: informationalResults });

    render(<CounselingTab />);

    expect(screen.getByText('No Urgent Counseling Needed')).toBeInTheDocument();
  });

  it('renders High Priority urgency badge when urgency=high', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(screen.getByText('High Priority')).toBeInTheDocument();
  });

  it('renders Moderate Priority urgency badge when urgency=moderate', () => {
    useAnalysisStore.setState({ fullResults: moderateResults });

    render(<CounselingTab />);

    expect(screen.getByText('Moderate Priority')).toBeInTheDocument();
  });

  it('renders Informational urgency badge when urgency=informational', () => {
    useAnalysisStore.setState({ fullResults: informationalResults });

    render(<CounselingTab />);

    expect(screen.getByText('Informational')).toBeInTheDocument();
  });

  it('shows reasons list with all items', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(screen.getByText('Reasons for Recommendation')).toBeInTheDocument();
    expect(screen.getByText('Both parents are carriers for Cystic Fibrosis.')).toBeInTheDocument();
    expect(
      screen.getByText('Autosomal dominant variant for Familial Hypercholesterolemia detected.'),
    ).toBeInTheDocument();
  });

  it('shows key findings cards with condition, gene, and risk badges', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(screen.getByText('Key Findings')).toBeInTheDocument();

    // Condition names
    expect(screen.getByText('Cystic Fibrosis')).toBeInTheDocument();
    expect(screen.getByText('Familial Hypercholesterolemia')).toBeInTheDocument();

    // Gene names
    expect(screen.getByText(/Gene: CFTR/)).toBeInTheDocument();
    expect(screen.getByText(/Gene: LDLR/)).toBeInTheDocument();

    // Risk level badges
    const highRiskBadges = screen.getAllByText('High Risk');
    expect(highRiskBadges.length).toBe(2);

    // Inheritance badges
    expect(screen.getByText('autosomal recessive')).toBeInTheDocument();
    expect(screen.getByText('autosomal dominant')).toBeInTheDocument();

    // Parent status badges
    const carrierBadges = screen.getAllByText('A: carrier');
    expect(carrierBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('A: affected')).toBeInTheDocument();
  });

  it('shows recommended specialties as badges', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(screen.getByText('Recommended Specialties')).toBeInTheDocument();
    expect(screen.getByText('Prenatal')).toBeInTheDocument();
    expect(screen.getByText('Carrier Screening')).toBeInTheDocument();
    expect(screen.getByText('Cancer')).toBeInTheDocument();
  });

  it('shows referral letter section with expand/collapse', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    // Referral letter button is present
    expect(screen.getByText('View Referral Letter')).toBeInTheDocument();

    // Referral letter content should NOT be visible initially
    expect(screen.queryByText(/To Whom It May Concern/)).not.toBeInTheDocument();
  });

  it('toggles referral letter visibility on click', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    const referralButton = screen.getByText('View Referral Letter').closest('button')!;

    // Click to expand
    fireEvent.click(referralButton);
    expect(screen.getByText(/To Whom It May Concern/)).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(referralButton);
    expect(screen.queryByText(/To Whom It May Concern/)).not.toBeInTheDocument();
  });

  it('sets aria-expanded correctly on referral button', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    const referralButton = screen.getByText('View Referral Letter').closest('button')!;

    // Initially collapsed
    expect(referralButton).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    fireEvent.click(referralButton);
    expect(referralButton).toHaveAttribute('aria-expanded', 'true');

    // Click to collapse
    fireEvent.click(referralButton);
    expect(referralButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows TierUpgradePrompt when upgradeMessage present', () => {
    useAnalysisStore.setState({ fullResults: upgradeResults });

    render(<CounselingTab />);

    expect(
      screen.getByText('Upgrade to Pro for detailed counseling insights and referral letters.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
  });

  it('shows NSGC link in Emotional Support Resources', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(screen.getByText('Find a Genetic Counselor (NSGC)')).toBeInTheDocument();
  });

  it('does not show reasons section when reasons array is empty', () => {
    useAnalysisStore.setState({ fullResults: informationalResults });

    render(<CounselingTab />);

    expect(screen.queryByText('Reasons for Recommendation')).not.toBeInTheDocument();
  });

  it('does not show key findings section when keyFindings is null', () => {
    useAnalysisStore.setState({ fullResults: informationalResults });

    render(<CounselingTab />);

    expect(screen.queryByText('Key Findings')).not.toBeInTheDocument();
  });

  it('does not show referral letter section when referralLetter is null', () => {
    useAnalysisStore.setState({ fullResults: informationalResults });

    render(<CounselingTab />);

    expect(screen.queryByText('View Referral Letter')).not.toBeInTheDocument();
  });

  it('NSGC link href is correct URL', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    const nsgcLink = screen.getByText('Find a Genetic Counselor (NSGC)').closest('a')!;
    expect(nsgcLink).toHaveAttribute('href', 'https://www.nsgc.org/findageneticcounselor');
  });

  it('NSGC link has target="_blank", rel="noopener noreferrer", and referrerPolicy', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    const nsgcLink = screen.getByText('Find a Genetic Counselor (NSGC)').closest('a')!;
    expect(nsgcLink).toHaveAttribute('target', '_blank');
    expect(nsgcLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(nsgcLink).toHaveAttribute('referrerPolicy', 'no-referrer');
  });

  // ─── New Tests: Emotional Support Resources ─────────────────────────────

  it('shows supportive intro paragraph', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(screen.getByText(/knowledge is a tool that empowers you/)).toBeInTheDocument();
  });

  it('shows empathetic message when urgency is high', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(
      screen.getByText(/We understand this information may be concerning/),
    ).toBeInTheDocument();
  });

  it('does not show empathetic message when urgency is not high', () => {
    useAnalysisStore.setState({ fullResults: informationalResults });

    render(<CounselingTab />);

    expect(
      screen.queryByText(/We understand this information may be concerning/),
    ).not.toBeInTheDocument();
  });

  it('shows Emotional Support Resources section', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(screen.getByText('Emotional Support Resources')).toBeInTheDocument();
  });

  it('shows Crisis Text Line information', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(screen.getByText('Crisis Text Line')).toBeInTheDocument();
    expect(screen.getByText('741741')).toBeInTheDocument();
  });

  it('shows NSGC (Find a Counselor) with phone number', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(screen.getByText('NSGC (Find a Counselor)')).toBeInTheDocument();
    expect(screen.getByText('1-800-233-6742', { exact: false })).toBeInTheDocument();
  });

  it('shows Find a Genetic Counselor link in resources', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(screen.getByText('Find a Genetic Counselor (NSGC)')).toBeInTheDocument();
  });

  it('referral toggle has aria-controls pointing to content id', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    const referralButton = screen.getByText('View Referral Letter').closest('button')!;
    expect(referralButton).toHaveAttribute('aria-controls', 'referral-letter-content');

    // Expand and verify the content has the matching id
    fireEvent.click(referralButton);
    const content = document.getElementById('referral-letter-content');
    expect(content).toBeInTheDocument();
    expect(content?.tagName).toBe('PRE');
  });

  it('shows US-specific resources disclaimer', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(
      screen.getByText(/These resources are available in the United States/),
    ).toBeInTheDocument();
  });

  it('renders LimitationsSection at bottom', () => {
    useAnalysisStore.setState({ fullResults: highUrgencyResults });

    render(<CounselingTab />);

    expect(screen.getByTestId('limitations-section')).toBeInTheDocument();
    expect(screen.getByTestId('limitations-section')).toHaveTextContent('counseling');
  });
});
