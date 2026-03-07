'use client';

import { useRef, useCallback, useEffect } from 'react';
import type { WorkerRequest, WorkerResponse, Population } from '@mergenix/shared-types';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { MAX_GENETIC_FILE_SIZE } from '@/lib/genetics-constants';
import { parseTier } from '@/lib/utils/parse-tier';

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Bridge between the main thread and the genetics-engine Web Worker.
 *
 * Lazily instantiates the worker on the first call to `startAnalysis`,
 * routes worker messages to the analysis Zustand store, and terminates
 * the worker on unmount.
 *
 * @returns `{ startAnalysis, cancel }`
 */
export function useGeneticsWorker() {
  const workerRef = useRef<Worker | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────

  /** Post a typed request to the worker. */
  function post(msg: WorkerRequest): void {
    workerRef.current?.postMessage(msg);
  }

  /** Lazily create the worker and wire up the message handler. */
  function ensureWorker(): Worker {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(new URL('../lib/workers/genetics.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      const store = useAnalysisStore.getState();

      switch (data.type) {
        // ── Parsing progress ───────────────────────────────────────────
        case 'parse_progress': {
          store.setParseProgress(data.fileIndex, data.progress);
          break;
        }

        // ── Parsing complete — auto-chain to analysis ──────────────────
        case 'parse_complete': {
          store.setParseResults(data.results);

          // Read tier from auth store (outside React tree, so use getState)
          const tier = parseTier(useAuthStore.getState().user?.tier);
          const population = useAnalysisStore.getState().selectedPopulation;

          // The worker uses its internally stored parsed genotypes when
          // the request genotype maps are empty.
          const analyzeMsg: WorkerRequest = {
            type: 'analyze',
            parent1Genotypes: {},
            parent2Genotypes: {},
            tier,
            population: population || undefined,
          };
          post(analyzeMsg);

          store.setStep('carrier_analysis');
          break;
        }

        // ── Analysis progress ──────────────────────────────────────────
        case 'analysis_progress': {
          store.setAnalysisProgress(data.stage, data.progress);

          // AnalysisStage values align with AnalysisStep values except
          // for "complete", which is handled by analysis_complete below.
          if (data.stage !== 'complete') {
            store.setStep(data.stage);
          }
          break;
        }

        // ── Analysis complete ──────────────────────────────────────────
        case 'analysis_complete': {
          store.setFullResults(data.results);
          store.setStep('complete');
          break;
        }

        // ── Errors ─────────────────────────────────────────────────────
        case 'error': {
          if (data.code === 'CANCELLED' || data.code === 'CANCEL_ACK') {
            store.reset();
          } else {
            store.setError(data.message);
            store.setStep('idle');
          }
          break;
        }
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      const store = useAnalysisStore.getState();
      store.setError(event.message || 'Worker encountered an unexpected error');
      store.setStep('idle');
    };

    workerRef.current = worker;
    return worker;
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Kick off a full analysis pipeline: parse both files, then analyze.
   *
   * Validates file sizes before reading. Reads file contents via
   * `File.text()` and posts a parse request to the worker. The worker
   * message handler auto-chains the analysis step on parse completion.
   */
  const startAnalysis = useCallback(
    async (parentAFile: File, parentBFile: File): Promise<void> => {
      if (typeof window === 'undefined') return;

      const store = useAnalysisStore.getState();

      // ── Clear any stale error from a previous run ────────────────────
      store.setError(null);

      // ── Validate file sizes ──────────────────────────────────────────
      if (parentAFile.size > MAX_GENETIC_FILE_SIZE) {
        store.setError('File too large (max 200MB)');
        return;
      }
      if (parentBFile.size > MAX_GENETIC_FILE_SIZE) {
        store.setError('File too large (max 200MB)');
        return;
      }

      // ── Transition to parsing step ───────────────────────────────────
      store.setStep('parsing');

      try {
        // ── Read file contents in parallel ─────────────────────────────
        const [contentA, contentB] = await Promise.all([parentAFile.text(), parentBFile.text()]);

        // ── Release File objects from store to free memory ─────────────
        store.setParentAFile(null);
        store.setParentBFile(null);

        // ── Ensure worker is alive and post parse request ──────────────
        ensureWorker();

        const parseMsg: WorkerRequest = {
          type: 'parse',
          files: [
            { name: parentAFile.name, content: contentA },
            { name: parentBFile.name, content: contentB },
          ],
        };
        post(parseMsg);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to read genetic files';
        store.setError(message || 'Failed to read genetic files');
        store.setStep('idle');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable: only refs used
    [],
  );

  /**
   * Request the worker to cancel the current operation.
   *
   * The worker will acknowledge with a CANCELLED or CANCEL_ACK error
   * code, which the message handler translates into a store reset.
   */
  const cancel = useCallback((): void => {
    post({ type: 'cancel' });
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // ── Return value ───────────────────────────────────────────────────────

  return { startAnalysis, cancel } as const;
}
