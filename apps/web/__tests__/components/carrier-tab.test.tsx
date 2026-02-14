import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

import { CarrierTab } from '../../components/genetics/results/carrier-tab';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockResults: FullAnalysisResult = {
  carrier: [
    {
      condition: 'Cystic Fibrosis',
      gene: 'CFTR',
      severity: 'high',
      description: 'A genetic disorder affecting the lungs.',
      parentAStatus: 'carrier',
      parentBStatus: 'carrier',
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: 'high_risk',
      rsid: 'rs1',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Sickle Cell Disease',
      gene: 'HBB',
      severity: 'moderate',
      description: 'A blood disorder.',
      parentAStatus: 'carrier',
      parentBStatus: 'normal',
      offspringRisk: { affected: 0, carrier: 50, normal: 50 },
      riskLevel: 'carrier_detected',
      rsid: 'rs2',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Tay-Sachs Disease',
      gene: 'HEXA',
      severity: 'high',
      description: 'A neurodegenerative disorder.',
      parentAStatus: 'carrier',
      parentBStatus: 'carrier',
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: 'high_risk',
      rsid: 'rs3',
      inheritance: 'autosomal_recessive',
    },
  ],
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
    parent1SnpCount: 100,
    parent2SnpCount: 200,
    analysisTimestamp: '',
    engineVersion: '3.0.0',
    tier: 'free',
  },
  coupleMode: false,
  coverageMetrics: { totalDiseases: 0, diseasesWithCoverage: 0, perDisease: {} },
  chipVersion: null,
  genomeBuild: 'GRCh37',
};

/** A version with no carrier results for empty-state testing. */
const emptyResults: FullAnalysisResult = {
  ...mockResults,
  carrier: [],
};

/** Results with an X-linked condition for X-linked risk display testing. */
const xLinkedResults: FullAnalysisResult = {
  ...mockResults,
  carrier: [
    ...mockResults.carrier,
    {
      condition: 'Duchenne Muscular Dystrophy',
      gene: 'DMD',
      severity: 'high',
      description: 'An X-linked recessive muscular dystrophy.',
      parentAStatus: 'carrier',
      parentBStatus: 'normal',
      offspringRisk: {
        sons: { affected: 50, carrier: 0, normal: 50 },
        daughters: { affected: 0, carrier: 50, normal: 50 },
      } as never,
      riskLevel: 'high_risk',
      rsid: 'rs_xlinked',
      inheritance: 'X-linked',
    },
  ],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CarrierTab', () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
  });

  it('renders null when no fullResults', () => {
    const { container } = render(<CarrierTab />);
    expect(container.innerHTML).toBe('');
  });

  it('renders carrier results with condition names', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    expect(screen.getByText('Cystic Fibrosis')).toBeInTheDocument();
    expect(screen.getByText('Sickle Cell Disease')).toBeInTheDocument();
    expect(screen.getByText('Tay-Sachs Disease')).toBeInTheDocument();
  });

  it('renders the header', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    expect(screen.getByText('Carrier Screening Results')).toBeInTheDocument();
  });

  it('shows severity badges', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    // 2 high severity badges (Cystic Fibrosis + Tay-Sachs)
    const highBadges = screen.getAllByText('high');
    expect(highBadges.length).toBe(2);

    // 1 moderate severity badge (Sickle Cell Disease)
    expect(screen.getByText('moderate')).toBeInTheDocument();
  });

  it('shows count display with correct numbers', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    // "Showing 3 of 3 results" -- use "results" suffix to disambiguate from upgrade prompt
    const countParagraph = screen.getByText(/results$/);
    expect(countParagraph.textContent).toContain('Showing');
    expect(countParagraph.textContent).toContain('3');
  });

  it('search filters results by condition name', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    const searchInput = screen.getByPlaceholderText(/search by condition or gene/i);
    fireEvent.change(searchInput, { target: { value: 'Cystic' } });

    // Only Cystic Fibrosis should remain
    expect(screen.getByText('Cystic Fibrosis')).toBeInTheDocument();
    expect(screen.queryByText('Sickle Cell Disease')).not.toBeInTheDocument();
    expect(screen.queryByText('Tay-Sachs Disease')).not.toBeInTheDocument();
  });

  it('search filters results by gene name', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    const searchInput = screen.getByPlaceholderText(/search by condition or gene/i);
    fireEvent.change(searchInput, { target: { value: 'HEXA' } });

    // Only Tay-Sachs (gene HEXA) should remain
    expect(screen.getByText('Tay-Sachs Disease')).toBeInTheDocument();
    expect(screen.queryByText('Cystic Fibrosis')).not.toBeInTheDocument();
  });

  it('shows Punnett square for carrier matches (both parents carriers)', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    // PunnettSquare renders with role="table"
    const tables = screen.getAllByRole('table');
    // Cystic Fibrosis and Tay-Sachs both have both parents as carriers
    expect(tables.length).toBe(2);
  });

  it('shows offspring risk percentages', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    // Cystic Fibrosis has 25% affected risk
    const riskValues = screen.getAllByText('25%');
    expect(riskValues.length).toBeGreaterThan(0);
  });

  it('shows empty state message when carrier array is empty', () => {
    useAnalysisStore.setState({ fullResults: emptyResults });

    render(<CarrierTab />);

    expect(screen.getByText(/No results match your filters/)).toBeInTheDocument();
  });

  it('shows empty state when search matches nothing', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    const searchInput = screen.getByPlaceholderText(/search by condition or gene/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent disease xyz' } });

    expect(screen.getByText(/No results match your filters/)).toBeInTheDocument();
  });

  it('updates count display after filtering', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    const searchInput = screen.getByPlaceholderText(/search by condition or gene/i);
    fireEvent.change(searchInput, { target: { value: 'Cystic' } });

    // Should show "Showing 1 of 3 results" — use "results" suffix to disambiguate from upgrade prompt
    const showingText = screen.getByText(/results$/);
    expect(showingText.textContent).toContain('1');
    expect(showingText.textContent).toContain('3');
  });

  it('renders expand/collapse details button', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    // Each card has a "Show Details" button
    const detailButtons = screen.getAllByText('Show Details');
    expect(detailButtons.length).toBe(3);
  });

  it('expands details when clicking Show Details', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    // Click the first "Show Details" button
    const showButtons = screen.getAllByText('Show Details');
    fireEvent.click(showButtons[0]);

    // After expanding, gene and rsID should be visible
    expect(screen.getByText('CFTR')).toBeInTheDocument();
    expect(screen.getByText('rs1')).toBeInTheDocument();
    // Button should now say "Hide Details"
    expect(screen.getByText('Hide Details')).toBeInTheDocument();
  });

  it('shows inheritance pattern badges', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    // All 3 results are autosomal_recessive, displayed as "autosomal recessive"
    const inheritanceBadges = screen.getAllByText('autosomal recessive');
    expect(inheritanceBadges.length).toBe(3);
  });

  it('shows risk level labels', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    // 2 high_risk badges + 1 "High Risk" filter option = 3 total matches
    const highRiskMatches = screen.getAllByText('High Risk');
    expect(highRiskMatches.length).toBe(3);
    // "Carrier Detected" appears as a badge AND in the risk filter dropdown
    const carrierDetected = screen.getAllByText('Carrier Detected');
    expect(carrierDetected.length).toBeGreaterThanOrEqual(1);
  });

  it('severity filter narrows results', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    // Find the severity filter select (aria-label = "Filter by severity")
    const severitySelect = screen.getByLabelText('Filter by severity');
    fireEvent.change(severitySelect, { target: { value: 'moderate' } });

    // Only Sickle Cell Disease (moderate) should remain
    expect(screen.getByText('Sickle Cell Disease')).toBeInTheDocument();
    expect(screen.queryByText('Cystic Fibrosis')).not.toBeInTheDocument();
    expect(screen.queryByText('Tay-Sachs Disease')).not.toBeInTheDocument();
  });

  it('X-linked condition shows sons/daughters risk labels', () => {
    useAnalysisStore.setState({ fullResults: xLinkedResults });

    render(<CarrierTab />);

    // The DMD condition should be rendered
    expect(screen.getByText('Duchenne Muscular Dystrophy')).toBeInTheDocument();

    // X-linked risk shows "50% sons" and "0% daughters" labels
    expect(screen.getByText('sons')).toBeInTheDocument();
    expect(screen.getByText('daughters')).toBeInTheDocument();
  });

  it('inheritance filter narrows results', () => {
    useAnalysisStore.setState({ fullResults: xLinkedResults });

    render(<CarrierTab />);

    const inheritanceSelect = screen.getByLabelText('Filter by inheritance pattern');
    fireEvent.change(inheritanceSelect, { target: { value: 'X-linked' } });

    // Only DMD (X-linked) should remain
    expect(screen.getByText('Duchenne Muscular Dystrophy')).toBeInTheDocument();
    expect(screen.queryByText('Cystic Fibrosis')).not.toBeInTheDocument();
    expect(screen.queryByText('Sickle Cell Disease')).not.toBeInTheDocument();
  });

  it('expand button has aria-expanded attribute', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    const showButtons = screen.getAllByText('Show Details');
    const firstButton = showButtons[0].closest('button')!;

    // Initially collapsed
    expect(firstButton).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    fireEvent.click(firstButton);
    expect(firstButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('expand button aria-label includes condition name', () => {
    useAnalysisStore.setState({ fullResults: mockResults });

    render(<CarrierTab />);

    // First condition is Cystic Fibrosis (sorted by severity, both high come first)
    const btn = screen.getByLabelText(/details for Cystic Fibrosis/);
    expect(btn).toBeInTheDocument();
  });
});
