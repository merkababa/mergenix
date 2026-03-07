import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeneticsWorker } from '../../hooks/use-genetics-worker';
import { useAnalysisStore } from '../../lib/stores/analysis-store';
import type { FullAnalysisResult } from '@mergenix/shared-types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a mock File with a given name and reported size.
 * The actual buffer is tiny to avoid memory overhead — only the `size`
 * property is patched to simulate large/small files.
 */
function createMockFile(name: string, size: number): File {
  const content = new ArrayBuffer(Math.min(size, 100));
  const blob = new Blob([content], { type: 'text/plain' });
  Object.defineProperty(blob, 'size', { value: size });
  Object.defineProperty(blob, 'name', { value: name });
  // Mock text() to return a small valid-looking genetic string
  (blob as File).text = vi.fn().mockResolvedValue('# rsid\tgenotype\nrs1\tAG');
  return blob as File;
}

/** Reference to the latest Worker instance created by `new Worker()`. */
let lastWorkerInstance: {
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
} | null = null;

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('useGeneticsWorker', () => {
  beforeEach(() => {
    // Reset store
    useAnalysisStore.getState().reset();

    // Override the global MockWorker so we can spy on postMessage / terminate
    lastWorkerInstance = null;

    globalThis.Worker = vi.fn().mockImplementation(() => {
      const instance = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        onmessage: null,
        onerror: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
      lastWorkerInstance = instance;
      return instance;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns { startAnalysis, cancel }', () => {
    const { result } = renderHook(() => useGeneticsWorker());
    expect(result.current).toHaveProperty('startAnalysis');
    expect(result.current).toHaveProperty('cancel');
    expect(typeof result.current.startAnalysis).toBe('function');
    expect(typeof result.current.cancel).toBe('function');
  });

  it('rejects files larger than 200 MB via setError', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    const bigFile = createMockFile('huge.txt', 201 * 1024 * 1024);
    const normalFile = createMockFile('normal.txt', 1024);

    await act(async () => {
      await result.current.startAnalysis(bigFile, normalFile);
    });

    expect(useAnalysisStore.getState().errorMessage).toBe('File too large (max 200MB)');
  });

  it('rejects parentBFile larger than 200 MB', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    const normalFile = createMockFile('normal.txt', 1024);
    const bigFile = createMockFile('huge.txt', 201 * 1024 * 1024);

    await act(async () => {
      await result.current.startAnalysis(normalFile, bigFile);
    });

    expect(useAnalysisStore.getState().errorMessage).toBe('File too large (max 200MB)');
  });

  it('reads files and posts a parse message to the worker', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    const fileA = createMockFile('parent_a.txt', 1024);
    const fileB = createMockFile('parent_b.txt', 2048);

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    // Worker should have been created
    expect(lastWorkerInstance).not.toBeNull();

    // Step should be parsing
    expect(useAnalysisStore.getState().currentStep).toBe('parsing');

    // postMessage should have been called with a parse request
    expect(lastWorkerInstance!.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'parse',
        files: expect.arrayContaining([
          expect.objectContaining({ name: 'parent_a.txt' }),
          expect.objectContaining({ name: 'parent_b.txt' }),
        ]),
      }),
    );
  });

  it('cancel posts a cancel message to the worker', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    // First start an analysis to create the worker
    const fileA = createMockFile('a.txt', 100);
    const fileB = createMockFile('b.txt', 100);

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    act(() => {
      result.current.cancel();
    });

    expect(lastWorkerInstance!.postMessage).toHaveBeenCalledWith({ type: 'cancel' });
  });

  it('terminates the worker on unmount', async () => {
    const { result, unmount } = renderHook(() => useGeneticsWorker());

    // Create the worker by starting analysis
    const fileA = createMockFile('a.txt', 100);
    const fileB = createMockFile('b.txt', 100);

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    expect(lastWorkerInstance).not.toBeNull();

    unmount();

    expect(lastWorkerInstance!.terminate).toHaveBeenCalled();
  });

  it('sets error on store when worker.onerror fires', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    // Create the worker
    const fileA = createMockFile('a.txt', 100);
    const fileB = createMockFile('b.txt', 100);

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    // Simulate a worker error
    const errorEvent = new ErrorEvent('error', { message: 'Worker crashed' });
    act(() => {
      lastWorkerInstance!.onerror?.(errorEvent);
    });

    // setStep("idle") no longer clears errorMessage, so both are preserved
    expect(useAnalysisStore.getState().errorMessage).toBe('Worker crashed');
    expect(useAnalysisStore.getState().currentStep).toBe('idle');
  });

  it('handles parse_progress messages from worker', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    const fileA = createMockFile('a.txt', 100);
    const fileB = createMockFile('b.txt', 100);

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    // Simulate parse_progress message from worker
    act(() => {
      const event = new MessageEvent('message', {
        data: { type: 'parse_progress', fileIndex: 0, progress: 50 },
      });
      lastWorkerInstance!.onmessage?.(event);
    });

    expect(useAnalysisStore.getState().parseProgress).toEqual({
      fileIndex: 0,
      progress: 50,
    });
  });

  it('handles error message with CANCELLED code by resetting store', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    const fileA = createMockFile('a.txt', 100);
    const fileB = createMockFile('b.txt', 100);

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    // Set some state that should be cleared
    useAnalysisStore.getState().setStep('carrier_analysis');

    act(() => {
      const event = new MessageEvent('message', {
        data: { type: 'error', message: 'Cancelled', code: 'CANCELLED' },
      });
      lastWorkerInstance!.onmessage?.(event);
    });

    // Reset should return to idle
    expect(useAnalysisStore.getState().currentStep).toBe('idle');
    expect(useAnalysisStore.getState().errorMessage).toBeNull();
  });

  it('handles non-cancel error messages by setting error and idle', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    const fileA = createMockFile('a.txt', 100);
    const fileB = createMockFile('b.txt', 100);

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    act(() => {
      const event = new MessageEvent('message', {
        data: { type: 'error', message: 'Parse failed', code: 'PARSE_ERROR' },
      });
      lastWorkerInstance!.onmessage?.(event);
    });

    // setStep("idle") no longer clears errorMessage, so both are preserved
    expect(useAnalysisStore.getState().errorMessage).toBe('Parse failed');
    expect(useAnalysisStore.getState().currentStep).toBe('idle');
  });

  it('clears stale errors at the start of startAnalysis', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    // Set a stale error
    useAnalysisStore.getState().setError('old stale error');
    expect(useAnalysisStore.getState().errorMessage).toBe('old stale error');

    const fileA = createMockFile('a.txt', 100);
    const fileB = createMockFile('b.txt', 100);

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    // Error should have been cleared at start of startAnalysis
    expect(useAnalysisStore.getState().errorMessage).toBeNull();
  });

  it('handles File.text() failure with try/catch', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    const fileA = createMockFile('a.txt', 100);
    const fileB = createMockFile('b.txt', 100);

    // Make File.text() reject
    (fileA as unknown as { text: ReturnType<typeof vi.fn> }).text = vi
      .fn()
      .mockRejectedValue(new Error('Disk read error'));

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    expect(useAnalysisStore.getState().errorMessage).toBe('Disk read error');
    expect(useAnalysisStore.getState().currentStep).toBe('idle');
  });

  it('handles parse_complete by storing results and posting analyze message', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    const fileA = createMockFile('a.txt', 100);
    const fileB = createMockFile('b.txt', 100);

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    // Clear the parse postMessage call count
    const parseCallCount = lastWorkerInstance!.postMessage.mock.calls.length;

    const mockParseResults = [
      { format: '23andme', totalSnps: 600000, validSnps: 580000, skippedLines: 20, metadata: {} },
      { format: 'vcf', totalSnps: 700000, validSnps: 690000, skippedLines: 10, metadata: {} },
    ];

    act(() => {
      const event = new MessageEvent('message', {
        data: { type: 'parse_complete', results: mockParseResults },
      });
      lastWorkerInstance!.onmessage?.(event);
    });

    // parseResults should be stored in the store
    expect(useAnalysisStore.getState().parseResults).toEqual(mockParseResults);

    // A second postMessage with type 'analyze' should have been sent
    const newCalls = lastWorkerInstance!.postMessage.mock.calls.slice(parseCallCount);
    expect(newCalls.length).toBe(1);
    expect(newCalls[0][0]).toEqual(expect.objectContaining({ type: 'analyze' }));

    // currentStep should be carrier_analysis (first analysis stage)
    expect(useAnalysisStore.getState().currentStep).toBe('carrier_analysis');
  });

  it('handles analysis_progress by updating step, skipping "complete" stage', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    const fileA = createMockFile('a.txt', 100);
    const fileB = createMockFile('b.txt', 100);

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    // Simulate trait_prediction progress
    act(() => {
      const event = new MessageEvent('message', {
        data: {
          type: 'analysis_progress',
          stage: 'trait_prediction',
          progress: 60,
          displayName: 'Trait Prediction',
        },
      });
      lastWorkerInstance!.onmessage?.(event);
    });

    expect(useAnalysisStore.getState().currentStep).toBe('trait_prediction');
    expect(useAnalysisStore.getState().analysisProgress).toEqual({
      stage: 'trait_prediction',
      progress: 60,
    });

    // Simulate "complete" stage — should NOT update currentStep
    act(() => {
      const event = new MessageEvent('message', {
        data: {
          type: 'analysis_progress',
          stage: 'complete',
          progress: 100,
          displayName: 'Complete',
        },
      });
      lastWorkerInstance!.onmessage?.(event);
    });

    // Step should remain trait_prediction (NOT 'complete' — that's handled by analysis_complete)
    expect(useAnalysisStore.getState().currentStep).toBe('trait_prediction');
    // But analysisProgress should still be updated
    expect(useAnalysisStore.getState().analysisProgress).toEqual({
      stage: 'complete',
      progress: 100,
    });
  });

  it('handles analysis_complete by storing full results and setting step to complete', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    const fileA = createMockFile('a.txt', 100);
    const fileB = createMockFile('b.txt', 100);

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    const mockFullResults: FullAnalysisResult = {
      carrier: [
        {
          condition: 'Test Condition',
          gene: 'TEST',
          severity: 'high',
          description: '',
          parentAStatus: 'carrier',
          parentBStatus: 'carrier',
          offspringRisk: { affected: 25, carrier: 50, normal: 25 },
          riskLevel: 'high_risk',
          rsid: 'rs1',
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
        metadata: {
          source: '',
          version: '',
          conditionsCovered: 0,
          lastUpdated: '',
          disclaimer: '',
        },
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

    act(() => {
      const event = new MessageEvent('message', {
        data: { type: 'analysis_complete', results: mockFullResults },
      });
      lastWorkerInstance!.onmessage?.(event);
    });

    // fullResults should be stored
    expect(useAnalysisStore.getState().fullResults).toBe(mockFullResults);
    // currentStep should be 'complete'
    expect(useAnalysisStore.getState().currentStep).toBe('complete');
    // highRiskCount should be computed
    expect(useAnalysisStore.getState().highRiskCount).toBe(1);
  });

  it('handles error message with CANCEL_ACK code by resetting store', async () => {
    const { result } = renderHook(() => useGeneticsWorker());

    const fileA = createMockFile('a.txt', 100);
    const fileB = createMockFile('b.txt', 100);

    await act(async () => {
      await result.current.startAnalysis(fileA, fileB);
    });

    // Set some state that should be cleared
    useAnalysisStore.getState().setStep('carrier_analysis');

    act(() => {
      const event = new MessageEvent('message', {
        data: { type: 'error', message: 'Ack', code: 'CANCEL_ACK' },
      });
      lastWorkerInstance!.onmessage?.(event);
    });

    // Reset should return to idle
    expect(useAnalysisStore.getState().currentStep).toBe('idle');
    expect(useAnalysisStore.getState().errorMessage).toBeNull();
  });
});
