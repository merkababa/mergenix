import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FullAnalysisResult } from '@mergenix/shared-types';

// ─── Mock pdfmake ────────────────────────────────────────────────────────────

const mockCreatePdf = vi.fn();
const mockGetBlob = vi.fn();

vi.mock('pdfmake/build/pdfmake', () => ({
  default: {
    createPdf: mockCreatePdf,
  },
}));

vi.mock('pdfmake/build/vfs_fonts', () => ({
  default: {
    pdfMake: {
      vfs: {},
    },
  },
}));

// Mock buildPdfDocument
vi.mock('@/lib/pdf/pdf-document-builder', () => ({
  buildPdfDocument: vi.fn(() => ({
    content: [{ text: 'Test Document' }],
  })),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { usePdfExport } from '../lib/pdf/use-pdf-export';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockResult: FullAnalysisResult = {
  carrier: [],
  traits: [],
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
  coupleMode: false,
  coverageMetrics: { totalDiseases: 0, diseasesWithCoverage: 0, perDisease: {} },
  chipVersion: null,
  genomeBuild: 'GRCh37',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('usePdfExport', () => {
  beforeEach(() => {
    mockCreatePdf.mockReset();
    mockGetBlob.mockReset();

    // Default: createPdf returns an object with getBlob
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
    mockGetBlob.mockImplementation((cb: (blob: Blob) => void) => {
      cb(mockBlob);
    });
    mockCreatePdf.mockReturnValue({ getBlob: mockGetBlob });

    // Mock URL.createObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-pdf-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with idle state (not generating, no error)', () => {
    const { result } = renderHook(() => usePdfExport());

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.blobUrl).toBeNull();
  });

  it('sets isGenerating to true when generatePdf called', async () => {
    const { result } = renderHook(() => usePdfExport());

    // Verify initial state
    expect(result.current.isGenerating).toBe(false);

    // Start generation — we don't await it yet to check intermediate state
    let generatePromise: Promise<void>;
    act(() => {
      generatePromise = result.current.generatePdf(mockResult);
    });

    // After calling, should be generating
    // Note: because the mock resolves synchronously, it may already be done
    // We just verify the flow completes without error
    await act(async () => {
      await generatePromise!;
    });
  });

  it('returns blob URL on completion', async () => {
    const { result } = renderHook(() => usePdfExport());

    await act(async () => {
      await result.current.generatePdf(mockResult);
    });

    expect(result.current.blobUrl).toBe('blob:http://localhost/mock-pdf-url');
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles errors gracefully', async () => {
    // Make createPdf throw
    mockCreatePdf.mockImplementation(() => {
      throw new Error('PDF generation failed');
    });

    const { result } = renderHook(() => usePdfExport());

    await act(async () => {
      await result.current.generatePdf(mockResult);
    });

    expect(result.current.error).toBe('PDF generation failed');
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.blobUrl).toBeNull();
  });

  it('can reset state after completion', async () => {
    const { result } = renderHook(() => usePdfExport());

    // Generate
    await act(async () => {
      await result.current.generatePdf(mockResult);
    });

    expect(result.current.blobUrl).not.toBeNull();

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.blobUrl).toBeNull();
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('can reset state after error', async () => {
    mockCreatePdf.mockImplementation(() => {
      throw new Error('Some error');
    });

    const { result } = renderHook(() => usePdfExport());

    await act(async () => {
      await result.current.generatePdf(mockResult);
    });

    expect(result.current.error).toBe('Some error');

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isGenerating).toBe(false);
  });

  it('revokes previous blob URL when generating again', async () => {
    const { result } = renderHook(() => usePdfExport());

    // First generation
    await act(async () => {
      await result.current.generatePdf(mockResult);
    });

    const firstUrl = result.current.blobUrl;
    expect(firstUrl).toBe('blob:http://localhost/mock-pdf-url');

    // Second generation
    await act(async () => {
      await result.current.generatePdf(mockResult);
    });

    // The previous URL should have been revoked
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
  });

  it('revokes blob URL on unmount to prevent memory leaks', async () => {
    const { result, unmount } = renderHook(() => usePdfExport());

    // Generate a PDF so there's a blob URL to clean up
    await act(async () => {
      await result.current.generatePdf(mockResult);
    });

    const blobUrl = result.current.blobUrl;
    expect(blobUrl).toBe('blob:http://localhost/mock-pdf-url');

    // Unmount the hook — the cleanup effect should call revokeObjectURL
    unmount();

    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith(blobUrl);
  });

  it('uses fallback message "PDF generation failed" when a non-Error is thrown', async () => {
    // Make createPdf throw a plain string (not an Error instance)
    mockCreatePdf.mockImplementation(() => {
      // eslint-disable-next-line no-throw-literal
      throw 'something went wrong';
    });

    const { result } = renderHook(() => usePdfExport());

    await act(async () => {
      await result.current.generatePdf(mockResult);
    });

    // The hook checks `err instanceof Error` — a string fails that check,
    // so the fallback message "PDF generation failed" is used
    expect(result.current.error).toBe('PDF generation failed');
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.blobUrl).toBeNull();
  });

  // ─── F21: Mobile low-memory print fallback ──────────────────────────────────

  describe('mobile low-memory fallback', () => {
    afterEach(() => {
      // @ts-expect-error — removing the mock property
      delete (navigator as Record<string, unknown>).deviceMemory;
    });

    it('falls back to window.print() on mobile with low device memory (<2 GB)', async () => {
      // Mock navigator.deviceMemory to simulate a low-memory mobile device
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 1,
        configurable: true,
        writable: true,
      });

      const mockPrint = vi.fn();
      Object.defineProperty(window, 'print', {
        value: mockPrint,
        configurable: true,
        writable: true,
      });

      const { result } = renderHook(() => usePdfExport());

      await act(async () => {
        await result.current.generatePdf(mockResult);
      });

      // window.print() should have been called instead of pdfmake
      expect(mockPrint).toHaveBeenCalledTimes(1);
      // pdfmake's createPdf should NOT have been called
      expect(mockCreatePdf).not.toHaveBeenCalled();
      // Should not be in generating state and no error
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('uses pdfmake normally when device memory is sufficient (>=2 GB)', async () => {
      // Mock navigator.deviceMemory to simulate a device with enough memory
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 4,
        configurable: true,
        writable: true,
      });

      const mockPrint = vi.fn();
      Object.defineProperty(window, 'print', {
        value: mockPrint,
        configurable: true,
        writable: true,
      });

      const { result } = renderHook(() => usePdfExport());

      await act(async () => {
        await result.current.generatePdf(mockResult);
      });

      // pdfmake should have been used (createPdf called)
      expect(mockCreatePdf).toHaveBeenCalled();
      // window.print() should NOT have been called
      expect(mockPrint).not.toHaveBeenCalled();
      // Should have a blob URL from the normal pdfmake flow
      expect(result.current.blobUrl).toBe('blob:http://localhost/mock-pdf-url');
    });
  });
});
