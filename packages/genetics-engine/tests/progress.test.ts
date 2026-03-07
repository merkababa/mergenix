/**
 * Tests for the ProgressReporter module.
 *
 * Verifies throttling behavior, boundary conditions, and forced reporting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressReporter, STAGE_DISPLAY_NAMES, getStageDisplayName } from '../src/progress';
import type { ProgressEvent } from '../src/progress';

describe('ProgressReporter', () => {
  let events: ProgressEvent[];
  let emitFn: (event: ProgressEvent) => void;

  beforeEach(() => {
    events = [];
    emitFn = (event: ProgressEvent) => {
      events.push(event);
    };
  });

  it('should emit the first report immediately', () => {
    const reporter = new ProgressReporter(emitFn, 100);
    reporter.report('parsing', 10, 'test');
    expect(events).toHaveLength(1);
    expect(events[0]!.stage).toBe('parsing');
    expect(events[0]!.progress).toBe(10);
    expect(events[0]!.message).toBe('test');
  });

  it('should always emit progress=0 regardless of throttle', () => {
    const reporter = new ProgressReporter(emitFn, 100);
    // First report
    reporter.report('parsing', 50);
    // 0% should always go through even though throttle hasn't elapsed
    reporter.report('parsing', 0, 'restart');
    expect(events).toHaveLength(2);
    expect(events[1]!.progress).toBe(0);
  });

  it('should always emit progress=100 regardless of throttle', () => {
    const reporter = new ProgressReporter(emitFn, 100);
    reporter.report('parsing', 50);
    reporter.report('parsing', 100, 'done');
    expect(events).toHaveLength(2);
    expect(events[1]!.progress).toBe(100);
    expect(events[1]!.message).toBe('done');
  });

  it('should throttle intermediate progress values', () => {
    // Use a very long throttle to ensure intermediate values are dropped
    const reporter = new ProgressReporter(emitFn, 10000);
    reporter.report('parsing', 0); // always emitted (boundary)
    reporter.report('parsing', 10); // should be throttled
    reporter.report('parsing', 20); // should be throttled
    reporter.report('parsing', 30); // should be throttled
    reporter.report('parsing', 100); // always emitted (boundary)

    expect(events).toHaveLength(2);
    expect(events[0]!.progress).toBe(0);
    expect(events[1]!.progress).toBe(100);
  });

  it('should emit after throttle interval has elapsed', () => {
    vi.useFakeTimers();
    try {
      const reporter = new ProgressReporter(emitFn, 100);
      reporter.report('parsing', 0); // emitted (boundary)

      vi.advanceTimersByTime(50);
      reporter.report('parsing', 25); // throttled (only 50ms passed)

      vi.advanceTimersByTime(60); // now 110ms total
      reporter.report('parsing', 50); // emitted (100ms+ since last emit)

      expect(events).toHaveLength(2);
      expect(events[0]!.progress).toBe(0);
      expect(events[1]!.progress).toBe(50);
    } finally {
      vi.useRealTimers();
    }
  });

  it('forceReport should always emit regardless of throttle', () => {
    const reporter = new ProgressReporter(emitFn, 10000);
    reporter.report('parsing', 0);
    reporter.forceReport('carrier_analysis', 0, 'forced');
    reporter.forceReport('carrier_analysis', 15, 'mid');
    reporter.forceReport('carrier_analysis', 30, 'done');

    expect(events).toHaveLength(4);
    expect(events[1]!.stage).toBe('carrier_analysis');
    expect(events[1]!.message).toBe('forced');
    expect(events[2]!.progress).toBe(15);
    expect(events[3]!.progress).toBe(30);
  });

  it('forceReport should reset the throttle timer', () => {
    vi.useFakeTimers();
    try {
      const reporter = new ProgressReporter(emitFn, 100);
      reporter.forceReport('parsing', 0);

      vi.advanceTimersByTime(50);
      reporter.report('parsing', 25); // throttled (50ms since force)

      vi.advanceTimersByTime(60); // 110ms since force
      reporter.report('parsing', 50); // emitted

      expect(events).toHaveLength(2);
      expect(events[0]!.progress).toBe(0);
      expect(events[1]!.progress).toBe(50);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should handle message being undefined', () => {
    const reporter = new ProgressReporter(emitFn, 100);
    reporter.report('parsing', 50);
    expect(events[0]!.message).toBeUndefined();
  });

  it('should use default throttle of 100ms when not specified', () => {
    vi.useFakeTimers();
    try {
      const reporter = new ProgressReporter(emitFn); // default 100ms
      reporter.report('parsing', 10);

      vi.advanceTimersByTime(50);
      reporter.report('parsing', 20); // throttled

      vi.advanceTimersByTime(60);
      reporter.report('parsing', 30); // emitted (110ms total)

      expect(events).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should handle rapid successive calls correctly', () => {
    const reporter = new ProgressReporter(emitFn, 10000);
    // Only boundaries should pass through
    for (let i = 0; i <= 100; i++) {
      reporter.report('parsing', i);
    }

    // First call (i=0, boundary) + last call (i=100, boundary) = 2
    expect(events).toHaveLength(2);
    expect(events[0]!.progress).toBe(0);
    expect(events[1]!.progress).toBe(100);
  });

  it('should support different stage values', () => {
    const reporter = new ProgressReporter(emitFn, 0); // no throttle
    reporter.report('initializing', 0);
    reporter.report('decompressing', 0);
    reporter.report('parsing', 0);
    reporter.report('carrier_analysis', 0);
    reporter.report('complete', 100);

    expect(events).toHaveLength(5);
    expect(events[0]!.stage).toBe('initializing');
    expect(events[1]!.stage).toBe('decompressing');
    expect(events[2]!.stage).toBe('parsing');
    expect(events[3]!.stage).toBe('carrier_analysis');
    expect(events[4]!.stage).toBe('complete');
  });

  // ─── displayName Tests ───────────────────────────────────────────────────

  it('should include displayName from STAGE_DISPLAY_NAMES for known stages', () => {
    const reporter = new ProgressReporter(emitFn, 0);
    reporter.report('carrier_analysis', 0);
    expect(events[0]!.displayName).toBe('Analyzing carrier status');
  });

  it('should include correct displayName for each known stage via report()', () => {
    const reporter = new ProgressReporter(emitFn, 0);
    reporter.report('initializing', 0);
    reporter.report('parsing', 0);
    reporter.report('complete', 100);

    expect(events[0]!.displayName).toBe('Initializing');
    expect(events[1]!.displayName).toBe('Reading genetic data');
    expect(events[2]!.displayName).toBe('Analysis complete');
  });

  it('should include displayName via forceReport()', () => {
    const reporter = new ProgressReporter(emitFn, 10000);
    reporter.forceReport('pharmacogenomics', 45);
    expect(events[0]!.displayName).toBe('Analyzing drug responses');
  });

  it('getStageDisplayName should return mapped name for known stages', () => {
    expect(getStageDisplayName('parsing')).toBe('Reading genetic data');
    expect(getStageDisplayName('strand_harmonization')).toBe('Harmonizing DNA strands');
    expect(getStageDisplayName('complete')).toBe('Analysis complete');
  });

  it('getStageDisplayName should fall back to raw stage for unknown stages', () => {
    // Cast to bypass type checking for the test — simulates a future stage not yet mapped
    expect(getStageDisplayName('some_future_stage' as never)).toBe('some_future_stage');
  });

  it('STAGE_DISPLAY_NAMES should cover all 13 AnalysisStage values', () => {
    const expectedStages = [
      'initializing',
      'decompressing',
      'parsing',
      'build_detection',
      'strand_harmonization',
      'liftover',
      'carrier_analysis',
      'trait_prediction',
      'pharmacogenomics',
      'polygenic_risk',
      'ethnicity_adjustment',
      'counseling_triage',
      'complete',
    ];
    for (const stage of expectedStages) {
      expect(STAGE_DISPLAY_NAMES).toHaveProperty(stage);
      expect(typeof STAGE_DISPLAY_NAMES[stage]).toBe('string');
      expect(STAGE_DISPLAY_NAMES[stage]!.length).toBeGreaterThan(0);
    }
  });
});
