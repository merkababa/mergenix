import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAnalysisStore } from '../../lib/stores/analysis-store';
import { useAuthStore } from '../../lib/stores/auth-store';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock next/dynamic to render a simple stub for each lazy tab component
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    // Call the loader to resolve the module shape, but render a stub
    const name = loader.toString();
    if (name.includes('overview-tab')) return function OverviewTab() { return <div data-testid="overview-tab">OverviewTab</div>; };
    if (name.includes('carrier-tab')) return function CarrierTab() { return <div data-testid="carrier-tab">CarrierTab</div>; };
    if (name.includes('traits-tab')) return function TraitsTab() { return <div data-testid="traits-tab">TraitsTab</div>; };
    if (name.includes('pgx-tab')) return function PgxTab() { return <div data-testid="pgx-tab">PgxTab</div>; };
    if (name.includes('prs-tab')) return function PrsTab() { return <div data-testid="prs-tab">PrsTab</div>; };
    if (name.includes('counseling-tab')) return function CounselingTab() { return <div data-testid="counseling-tab">CounselingTab</div>; };
    return function Fallback() { return <div>Unknown</div>; };
  },
}));

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock useGeneticsWorker hook
const mockStartAnalysis = vi.fn();
const mockCancel = vi.fn();
vi.mock('../../hooks/use-genetics-worker', () => ({
  useGeneticsWorker: () => ({
    startAnalysis: mockStartAnalysis,
    cancel: mockCancel,
  }),
}));

// Mock usePdfExport hook
const mockGeneratePdf = vi.fn();
vi.mock('../../lib/pdf/use-pdf-export', () => ({
  usePdfExport: () => ({
    generatePdf: mockGeneratePdf,
    isGenerating: false,
    progress: 0,
    error: null,
    blobUrl: null,
    reset: vi.fn(),
  }),
}));

// Mock CoupleUploadCard — renders two testable dropzone stubs
vi.mock('../../components/genetics/couple-upload-card', () => ({
  CoupleUploadCard: ({ parentAFile, parentBFile }: { parentAFile: File | null; parentBFile: File | null }) => (
    <div data-testid="couple-upload-card">
      {!parentAFile && <div data-testid="dropzone-Parent A (Mother)">Parent A (Mother)</div>}
      {!parentBFile && <div data-testid="dropzone-Parent B (Father)">Parent B (Father)</div>}
    </div>
  ),
}));

vi.mock('../../components/genetics/analysis-progress', () => ({
  AnalysisProgress: ({ currentStep }: { currentStep: string }) => (
    <div data-testid="analysis-progress">{currentStep}</div>
  ),
}));

vi.mock('../../components/genetics/population-selector', () => ({
  PopulationSelector: () => <div data-testid="population-selector">PopulationSelector</div>,
}));

// Mock legal components that the page now imports
vi.mock('../../components/legal/consent-modal', () => ({
  ConsentModal: () => null,
}));

vi.mock('../../components/legal/chip-disclosure-modal', () => ({
  ChipDisclosureModal: () => null,
}));

// Mock save-related components
vi.mock('../../components/analysis/saved-results-list', () => ({
  SavedResultsList: () => null,
}));

const mockOnDownloadPDF = vi.fn();
vi.mock('../../components/save/save-options-modal', () => ({
  SaveOptionsModal: ({ onDownloadPDF }: { onDownloadPDF: () => void }) => {
    mockOnDownloadPDF.mockImplementation(onDownloadPDF);
    return null;
  },
}));

// Mock PdfExportButton to avoid pdfmake import in tests
vi.mock('../../components/genetics/results/pdf-export-button', () => ({
  PdfExportButton: () => <div data-testid="pdf-export-button">PDF Export</div>,
}));

// Mock StaleResultsBanner
vi.mock('../../components/genetics/results/stale-results-banner', () => ({
  StaleResultsBanner: () => null,
}));

// Mock GinaNotice
vi.mock('../../components/legal/gina-notice', () => ({
  GinaNotice: () => null,
}));

// Mock HighContrastToggle
vi.mock('../../components/a11y/high-contrast-toggle', () => ({
  HighContrastToggle: () => null,
}));

// Mock ErrorBoundary to render children directly
vi.mock('../../components/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Import the analysis content component (now extracted from the page)
import { AnalysisContent as AnalysisPage } from '../../app/(app)/analysis/_components/analysis-content';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockFullResults = {
  carrier: [],
  traits: [],
  pgx: {
    genesAnalyzed: 0,
    tier: 'free' as const,
    isLimited: true,
    results: {},
    upgradeMessage: null,
    disclaimer: '',
  },
  prs: {
    conditions: {},
    metadata: { source: '', version: '', conditionsCovered: 0, lastUpdated: '', disclaimer: '' },
    tier: 'free' as const,
    conditionsAvailable: 0,
    conditionsTotal: 0,
    disclaimer: '',
    isLimited: true,
    upgradeMessage: null,
  },
  counseling: {
    recommend: false,
    urgency: 'informational' as const,
    reasons: [],
    nsgcUrl: '',
    summaryText: null,
    keyFindings: null,
    recommendedSpecialties: null,
    referralLetter: null,
    upgradeMessage: null,
  },
  metadata: {
    parent1Format: '23andme' as const,
    parent2Format: 'vcf' as const,
    parent1SnpCount: 600000,
    parent2SnpCount: 450000,
    analysisTimestamp: '2025-01-15T12:00:00Z',
    engineVersion: '3.0.0',
    tier: 'free' as const,
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AnalysisPage', () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
    useAuthStore.setState({ user: null });
    vi.clearAllMocks();
  });

  it('shows file upload area when idle', () => {
    render(<AnalysisPage />);

    expect(screen.getByTestId('dropzone-Parent A (Mother)')).toBeInTheDocument();
    expect(screen.getByTestId('dropzone-Parent B (Father)')).toBeInTheDocument();
  });

  it('shows progress indicator when step is not idle/complete', () => {
    useAnalysisStore.setState({ currentStep: 'parsing' });

    render(<AnalysisPage />);

    expect(screen.getByTestId('analysis-progress')).toBeInTheDocument();
    expect(screen.getByText('parsing')).toBeInTheDocument();

    // File dropzones should NOT be visible during analysis
    expect(screen.queryByTestId('dropzone-Parent A (Mother)')).not.toBeInTheDocument();
  });

  it('shows result tabs when step is complete', () => {
    useAnalysisStore.setState({
      currentStep: 'complete',
      fullResults: mockFullResults as never,
    });

    render(<AnalysisPage />);

    // Tab buttons should be present
    expect(screen.getByRole('tab', { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Carrier Risk/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Traits/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /PGx/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /PRS/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Counseling/ })).toBeInTheDocument();
  });

  it('shows error card when errorMessage is set', () => {
    useAnalysisStore.setState({ errorMessage: 'File format not recognized.' });

    render(<AnalysisPage />);

    expect(screen.getByText('Analysis Error')).toBeInTheDocument();
    expect(screen.getByText('File format not recognized.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows demo banner when isDemo is true', () => {
    useAnalysisStore.setState({
      currentStep: 'complete',
      isDemo: true,
      fullResults: mockFullResults as never,
    });

    render(<AnalysisPage />);

    expect(
      screen.getByText(/viewing demo results with synthetic data/),
    ).toBeInTheDocument();
  });

  it('tab switching works (click changes activeTab in store)', () => {
    useAnalysisStore.setState({
      currentStep: 'complete',
      activeTab: 'overview',
      fullResults: mockFullResults as never,
    });

    render(<AnalysisPage />);

    // Click Carrier Risk tab
    const carrierTab = screen.getByRole('tab', { name: /Carrier Risk/ });
    fireEvent.click(carrierTab);

    expect(useAnalysisStore.getState().activeTab).toBe('carrier');
  });

  it('"New Analysis" button resets store', () => {
    useAnalysisStore.setState({
      currentStep: 'complete',
      fullResults: mockFullResults as never,
    });

    render(<AnalysisPage />);

    const newAnalysisBtn = screen.getByText('New Analysis');
    fireEvent.click(newAnalysisBtn);

    expect(useAnalysisStore.getState().currentStep).toBe('idle');
    expect(useAnalysisStore.getState().fullResults).toBeNull();
  });

  it('error "Try Again" resets store', () => {
    useAnalysisStore.setState({ errorMessage: 'Something went wrong.' });

    render(<AnalysisPage />);

    const tryAgainBtn = screen.getByText('Try Again');
    fireEvent.click(tryAgainBtn);

    expect(useAnalysisStore.getState().errorMessage).toBeNull();
    expect(useAnalysisStore.getState().currentStep).toBe('idle');
  });

  it('does NOT render SaveResultDialog when analysis is complete', () => {
    useAnalysisStore.setState({
      currentStep: 'complete',
      fullResults: mockFullResults as never,
    });

    render(<AnalysisPage />);

    // SaveResultDialog has been removed — its "Save Analysis" button should NOT exist
    // Only the "Save Results" button (opening the SaveOptionsModal) should be present
    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    // "Save Results" opens the modal; there should be no "Save Analysis" dialog trigger
    expect(saveButtons.every((btn) => btn.textContent?.includes('Save Results') || btn.textContent?.includes('New Analysis'))).toBe(true);
    // The text "Save Analysis" from SaveResultDialog should not appear
    expect(screen.queryByText('Save Analysis')).not.toBeInTheDocument();
  });

  it('onDownloadPDF wires generatePdf when fullResults are available', () => {
    useAnalysisStore.setState({
      currentStep: 'complete',
      fullResults: mockFullResults as never,
    });

    render(<AnalysisPage />);

    // Call the captured onDownloadPDF handler (wired from page to SaveOptionsModal)
    mockOnDownloadPDF();

    expect(mockGeneratePdf).toHaveBeenCalledWith(mockFullResults);
  });
});
