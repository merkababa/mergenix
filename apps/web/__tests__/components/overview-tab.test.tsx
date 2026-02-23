import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewTab } from '../../components/genetics/results/overview-tab';
import { useAnalysisStore } from '../../lib/stores/analysis-store';
import type { FullAnalysisResult } from '@mergenix/shared-types';
import { CARRIER_PANEL_COUNT_DISPLAY } from '@mergenix/genetics-data';

// Mock next/navigation for SPA navigation (useRouter)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockResults: FullAnalysisResult = {
  carrier: [
    {
      condition: 'Cystic Fibrosis',
      gene: 'CFTR',
      severity: 'high',
      description: '',
      parentAStatus: 'carrier',
      parentBStatus: 'carrier',
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: 'high_risk',
      rsid: 'rs1',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Sickle Cell',
      gene: 'HBB',
      severity: 'high',
      description: '',
      parentAStatus: 'carrier',
      parentBStatus: 'normal',
      offspringRisk: { affected: 0, carrier: 50, normal: 50 },
      riskLevel: 'carrier_detected',
      rsid: 'rs2',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Low Risk',
      gene: 'G3',
      severity: 'low',
      description: '',
      parentAStatus: 'normal',
      parentBStatus: 'normal',
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: 'low_risk',
      rsid: 'rs3',
      inheritance: 'autosomal_recessive',
    },
  ],
  traits: [
    {
      trait: 'Eye Color',
      gene: 'OCA2',
      rsid: 'rs12',
      chromosome: '15',
      description: '',
      confidence: 'high',
      inheritance: 'codominant',
      status: 'success',
      parentAGenotype: 'AG',
      parentBGenotype: 'GG',
      offspringProbabilities: { Brown: 75, Blue: 25 },
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
    metadata: {
      source: '',
      version: '',
      conditionsCovered: 0,
      lastUpdated: '',
      disclaimer: '',
    },
    tier: 'free',
    conditionsAvailable: 3,
    conditionsTotal: 10,
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('OverviewTab', () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
  });

  it('renders null when no fullResults', () => {
    const { container } = render(<OverviewTab />);
    expect(container.innerHTML).toBe('');
  });

  it('renders stat cards with correct values', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<OverviewTab />);

    // All four stat labels should be present
    expect(screen.getByText('Diseases Screened')).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(screen.getByText('Carrier Matches')).toBeInTheDocument();
    expect(screen.getByText('Traits Predicted')).toBeInTheDocument();

    // Verify specific stat values using the label's parent card structure:
    // Diseases Screened = carrier.length = 3
    // High Risk = 1 (only rs1 has riskLevel 'high_risk')
    // Carrier Matches = 1 (only Cystic Fibrosis has both parents as carriers)
    // Traits Predicted = 1
    // Use getAllByText since "1" appears in multiple cards
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(2); // High Risk and Carrier Matches
  });

  it('shows demo badge when isDemo is true', () => {
    useAnalysisStore.setState({ fullResults: mockResults, isDemo: true });

    render(<OverviewTab />);

    expect(screen.getByText(/Demo Results/i)).toBeInTheDocument();
  });

  it('does not show demo badge when isDemo is false', () => {
    useAnalysisStore.setState({ fullResults: mockResults, isDemo: false });

    render(<OverviewTab />);

    expect(screen.queryByText(/Demo Results/i)).not.toBeInTheDocument();
  });

  it('shows metadata section with engine version', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<OverviewTab />);

    expect(screen.getByText('3.0.0')).toBeInTheDocument();
    expect(screen.getByText(/Engine:/)).toBeInTheDocument();
  });

  it('shows tier in metadata', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<OverviewTab />);

    expect(screen.getByText(/Tier:/)).toBeInTheDocument();
    expect(screen.getByText('free')).toBeInTheDocument();
  });

  it('shows parent formats in metadata', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<OverviewTab />);

    expect(screen.getByText(/Parent A:/)).toBeInTheDocument();
    expect(screen.getByText(/Parent B:/)).toBeInTheDocument();
    // 23andme uppercase
    expect(screen.getByText(/23ANDME/)).toBeInTheDocument();
    // VCF uppercase
    expect(screen.getByText(/VCF/)).toBeInTheDocument();
  });

  it('shows PRS conditions available in metadata', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<OverviewTab />);

    // The text "3/10" is rendered as "{conditionsAvailable}/{conditionsTotal}"
    // which may be split across text nodes. Use a container query instead.
    const prsLabel = screen.getByText(/PRS Conditions:/);
    expect(prsLabel.closest('div')?.textContent).toContain('3/10');
  });

  it('shows medical disclaimer with educational purposes text', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<OverviewTab />);

    expect(screen.getByText('Important Medical Disclaimer')).toBeInTheDocument();
    expect(screen.getByText(/educational purposes only/)).toBeInTheDocument();
  });

  it('shows upgrade prompt for free tier', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<OverviewTab />);

    // Free tier metadata -> shows TierUpgradePrompt with upgrade message
    expect(
      screen.getByText(/Upgrade to Premium to unlock disease screening/),
    ).toBeInTheDocument();
  });

  it('shows upgrade prompt for premium tier', () => {
    const premiumResults = {
      ...mockResults,
      metadata: { ...mockResults.metadata, tier: 'premium' as const },
    };

    useAnalysisStore.setState({ fullResults: premiumResults });

    render(<OverviewTab />);

    expect(
      screen.getByText(/Upgrade to Pro to unlock all disease screening/),
    ).toBeInTheDocument();
  });

  it('does NOT show upgrade prompt for pro tier', () => {
    const proResults = {
      ...mockResults,
      metadata: { ...mockResults.metadata, tier: 'pro' as const },
    };

    useAnalysisStore.setState({ fullResults: proResults });

    render(<OverviewTab />);

    expect(
      screen.queryByText(/Upgrade to Pro/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Upgrade Plan'),
    ).not.toBeInTheDocument();
  });

  it('renders sr-only h3 heading for accessibility hierarchy', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<OverviewTab />);

    const heading = screen.getByText('Results Overview');
    expect(heading.tagName).toBe('H3');
    expect(heading.className).toContain('sr-only');
  });

  it('renders limitations section', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<OverviewTab />);

    expect(
      screen.getByText(/What Overview Analysis Cannot Tell You/),
    ).toBeInTheDocument();
  });
});
