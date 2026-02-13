/**
 * Progress Event Manager
 *
 * Throttles progress updates to prevent flooding the main thread with
 * high-frequency postMessage calls during long-running operations.
 *
 * The reporter guarantees:
 * - At most one update per `throttleMs` milliseconds
 * - Stage boundaries (0% and 100%) are ALWAYS emitted immediately
 * - Forced reports bypass throttling (for stage transitions)
 */

import type { AnalysisStage } from './types';

/**
 * Human-readable display names for each analysis stage.
 *
 * Screen readers and UI components should use these labels instead of the raw
 * machine-token stage identifiers. The mapping covers every member of
 * `AnalysisStage`; the fallback in `getStageDisplayName()` handles any future
 * stages that are added before this map is updated.
 */
export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  initializing: 'Initializing',
  decompressing: 'Decompressing file',
  parsing: 'Reading genetic data',
  build_detection: 'Detecting genome build',
  strand_harmonization: 'Harmonizing DNA strands',
  liftover: 'Converting coordinates',
  carrier_analysis: 'Analyzing carrier status',
  trait_prediction: 'Predicting traits',
  pharmacogenomics: 'Analyzing drug responses',
  polygenic_risk: 'Calculating risk scores',
  ethnicity_adjustment: 'Adjusting for population',
  counseling_triage: 'Generating counseling summary',
  complete: 'Analysis complete',
};

/**
 * Return the human-readable display name for a stage, falling back to the
 * raw stage identifier if no mapping exists.
 */
export function getStageDisplayName(stage: AnalysisStage): string {
  return STAGE_DISPLAY_NAMES[stage] ?? stage;
}

/**
 * A progress event emitted by the worker to report stage and completion percentage.
 */
export interface ProgressEvent {
  /** Current analysis stage. */
  stage: AnalysisStage;
  /** Completion percentage (0-100). */
  progress: number;
  /** Human-readable label for the current stage (e.g. "Analyzing carrier status"). */
  displayName: string;
  /** Optional human-readable message describing what is happening. */
  message?: string;
}

/**
 * Throttled progress reporter that controls how frequently progress events
 * are emitted to the main thread.
 *
 * @example
 * ```typescript
 * const reporter = new ProgressReporter((event) => {
 *   self.postMessage({ type: 'analysis_progress', ...event });
 * });
 * reporter.report('parsing', 0, 'Starting parse...');
 * // ...during loop...
 * reporter.report('parsing', 42);
 * // ...at end...
 * reporter.report('parsing', 100, 'Parse complete');
 * ```
 */
export class ProgressReporter {
  private lastEmitTime: number = 0;
  private readonly throttleMs: number;
  private readonly emit: (event: ProgressEvent) => void;

  /**
   * Create a new ProgressReporter.
   *
   * @param emit - Callback invoked with each progress event (e.g., postMessage wrapper)
   * @param throttleMs - Minimum milliseconds between emitted events (default: 100)
   */
  constructor(emit: (event: ProgressEvent) => void, throttleMs: number = 100) {
    this.emit = emit;
    this.throttleMs = throttleMs;
  }

  /**
   * Report progress. Throttled to at most once per `throttleMs`.
   *
   * Boundary values (0 and 100) always bypass the throttle to ensure
   * the main thread sees stage start/end transitions immediately.
   *
   * @param stage - Current analysis stage
   * @param progress - Completion percentage (0-100)
   * @param message - Optional descriptive message
   */
  report(stage: AnalysisStage, progress: number, message?: string): void {
    const now = Date.now();
    if (
      now - this.lastEmitTime >= this.throttleMs ||
      progress === 0 ||
      progress === 100
    ) {
      this.emit({ stage, progress, displayName: getStageDisplayName(stage), message });
      this.lastEmitTime = now;
    }
  }

  /**
   * Force emit a progress event regardless of throttle timing.
   *
   * Use this for stage transitions where the main thread must
   * receive the update immediately (e.g., switching from parsing to analysis).
   *
   * @param stage - Current analysis stage
   * @param progress - Completion percentage (0-100)
   * @param message - Optional descriptive message
   */
  forceReport(stage: AnalysisStage, progress: number, message?: string): void {
    this.emit({ stage, progress, displayName: getStageDisplayName(stage), message });
    this.lastEmitTime = Date.now();
  }
}
