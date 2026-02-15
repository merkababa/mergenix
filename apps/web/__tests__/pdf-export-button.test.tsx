import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FullAnalysisResult } from '@mergenix/shared-types';

// ─── Mock usePdfExport hook ──────────────────────────────────────────────────

const mockGeneratePdf = vi.fn();
const mockReset = vi.fn();

const defaultHookState = {
  isGenerating: false,
  progress: 0,
  error: null as string | null,
  blobUrl: null as string | null,
  generatePdf: mockGeneratePdf,
  reset: mockReset,
};

let hookState = { ...defaultHookState };

vi.mock('@/lib/pdf/use-pdf-export', () => ({
  usePdfExport: () => hookState,
}));

// ─── Mock useAuthStore ───────────────────────────────────────────────────────

let mockUserTier = 'pro';

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { user: { tier: string } | null }) => unknown) =>
    selector({ user: { tier: mockUserTier } }),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { PdfExportButton } from '../components/genetics/results/pdf-export-button';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockResult: FullAnalysisResult = {
  carrier: [
    {
      condition: 'Cystic Fibrosis',
      gene: 'CFTR',
      severity: 'high',
      description: 'A genetic disorder.',
      parentAStatus: 'carrier',
      parentBStatus: 'carrier',
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: 'high_risk',
      rsid: 'rs1',
      inheritance: 'autosomal_recessive',
    },
  ],
  traits: [
    {
      trait: 'Eye Color',
      gene: 'HERC2',
      rsid: 'rs12913832',
      chromosome: '15',
      description: 'Eye color prediction.',
      confidence: 'high',
      inheritance: 'dominant',
      status: 'success',
      parentAGenotype: 'AG',
      parentBGenotype: 'GG',
      offspringProbabilities: { 'Brown Eyes': 75, 'Blue Eyes': 25 },
    },
  ],
  pgx: {
    genesAnalyzed: 0,
    tier: 'pro',
    isLimited: false,
    results: {},
    upgradeMessage: null,
    disclaimer: '',
  },
  prs: {
    conditions: {},
    metadata: { source: '', version: '', conditionsCovered: 0, lastUpdated: '', disclaimer: '' },
    tier: 'pro',
    conditionsAvailable: 0,
    conditionsTotal: 0,
    disclaimer: '',
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
    parent2Format: 'vcf',
    parent1SnpCount: 100,
    parent2SnpCount: 200,
    analysisTimestamp: '2026-02-14T12:00:00Z',
    engineVersion: '3.0.0',
    tier: 'pro',
  },
  coupleMode: true,
  coverageMetrics: { totalDiseases: 0, diseasesWithCoverage: 0, perDisease: {} },
  chipVersion: null,
  genomeBuild: 'GRCh37',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PdfExportButton', () => {
  beforeEach(() => {
    mockUserTier = 'pro';
    hookState = { ...defaultHookState };
    mockGeneratePdf.mockReset();
    mockReset.mockReset();
  });

  it('renders Download PDF button for pro-tier users', () => {
    mockUserTier = 'pro';
    render(<PdfExportButton result={mockResult} />);

    const button = screen.getByRole('button', { name: /download pdf/i });
    expect(button).toBeInTheDocument();
  });

  it('shows upgrade prompt for free-tier users', () => {
    mockUserTier = 'free';
    render(<PdfExportButton result={mockResult} />);

    // Should NOT show the download button
    expect(screen.queryByRole('button', { name: /download pdf/i })).not.toBeInTheDocument();
    // Should show upgrade prompt text
    expect(screen.getByText(/pdf export.*pro/i)).toBeInTheDocument();
    // Should have upgrade link
    expect(screen.getByRole('link')).toHaveAttribute('href', '/subscription');
  });

  it('shows upgrade prompt for premium-tier users', () => {
    mockUserTier = 'premium';
    render(<PdfExportButton result={mockResult} />);

    // Should NOT show the download button
    expect(screen.queryByRole('button', { name: /download pdf/i })).not.toBeInTheDocument();
    // Should show upgrade prompt text
    expect(screen.getByText(/pdf export.*pro/i)).toBeInTheDocument();
  });

  it('shows progress indicator during PDF generation', () => {
    hookState = { ...defaultHookState, isGenerating: true, progress: 45 };
    render(<PdfExportButton result={mockResult} />);

    // Should show some kind of progress
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/45%/)).toBeInTheDocument();
  });

  it('disables button while generating', () => {
    hookState = { ...defaultHookState, isGenerating: true, progress: 30 };
    render(<PdfExportButton result={mockResult} />);

    const button = screen.getByRole('button', { name: /generating/i });
    expect(button).toBeDisabled();
  });

  it('shows error message when generation fails', () => {
    hookState = { ...defaultHookState, error: 'PDF generation failed' };
    render(<PdfExportButton result={mockResult} />);

    expect(screen.getByText('PDF generation failed')).toBeInTheDocument();
    // Should show a retry button
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('accessible: button has proper aria-label', () => {
    render(<PdfExportButton result={mockResult} />);

    const button = screen.getByRole('button', { name: /download pdf/i });
    expect(button).toHaveAttribute('aria-label');
  });

  it('calls generatePdf when button is clicked', async () => {
    const user = userEvent.setup();
    render(<PdfExportButton result={mockResult} />);

    const button = screen.getByRole('button', { name: /download pdf/i });
    await user.click(button);

    expect(mockGeneratePdf).toHaveBeenCalledWith(mockResult);
  });

  it('shows download link when blobUrl is available', () => {
    hookState = { ...defaultHookState, blobUrl: 'blob:http://localhost/pdf-123' };
    render(<PdfExportButton result={mockResult} />);

    const downloadLink = screen.getByRole('link', { name: /download pdf/i });
    expect(downloadLink).toHaveAttribute('href', 'blob:http://localhost/pdf-123');
    expect(downloadLink).toHaveAttribute('download');
  });

  it('button is aria-busy during generation', () => {
    hookState = { ...defaultHookState, isGenerating: true, progress: 50 };
    render(<PdfExportButton result={mockResult} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
