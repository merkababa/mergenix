import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { useCountUp } from '../../hooks/use-count-up';
import { CARRIER_PANEL_COUNT } from '@mergenix/genetics-data';
import { installImmediateIntersectionObserver } from '../__helpers__';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Pending rAF callbacks, flushed manually via flushRAF(). */
let rafCallbacks: Array<(time: number) => void> = [];
let rafId = 0;

/** Flush one batch of pending rAF callbacks with the given DOMHighResTimeStamp. */
function flushRAF(time: number) {
  const pending = [...rafCallbacks];
  rafCallbacks = [];
  pending.forEach((cb) => cb(time));
}

/**
 * Test component that renders the hook's count into a <span> and
 * attaches the ref so IntersectionObserver can fire.
 */
function Counter({ target, duration }: { target: number; duration: number }) {
  const { count, ref } = useCountUp(target, duration);
  return <span ref={ref} data-testid="count">{count}</span>;
}

/** Read the current count from the rendered DOM. */
function readCount(container: HTMLElement): number {
  const el = container.querySelector('[data-testid="count"]');
  return Number(el?.textContent ?? '0');
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('useCountUp', () => {
  let originalRAF: typeof requestAnimationFrame;
  let originalCAF: typeof cancelAnimationFrame;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;

    originalRAF = globalThis.requestAnimationFrame;
    originalCAF = globalThis.cancelAnimationFrame;

    // Mock rAF: collect callbacks, flush manually
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      const id = ++rafId;
      rafCallbacks.push(cb as (time: number) => void);
      return id;
    }) as unknown as typeof requestAnimationFrame;

    globalThis.cancelAnimationFrame = vi.fn();

    // Mock IntersectionObserver: fires immediately with isIntersecting=true
    installImmediateIntersectionObserver();
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
    vi.unstubAllGlobals();
  });

  it('starts at 0', async () => {
    const { container } = render(<Counter target={CARRIER_PANEL_COUNT} duration={2000} />);
    expect(readCount(container)).toBe(0);
  });

  it('reaches target after full duration', async () => {
    const { container } = render(<Counter target={CARRIER_PANEL_COUNT} duration={2000} />);

    // Let IO callback fire (queued as microtask)
    await act(async () => {
      await Promise.resolve();
    });

    // First rAF: sets startTime = 0
    act(() => { flushRAF(0); });

    // Final rAF: progress = 1.0
    act(() => { flushRAF(2000); });

    expect(readCount(container)).toBe(CARRIER_PANEL_COUNT);
  });

  it('never produces a negative count (regression: clock drift fix)', async () => {
    const { container } = render(<Counter target={CARRIER_PANEL_COUNT} duration={2200} />);

    await act(async () => { await Promise.resolve(); });

    // First frame: startTime captured from rAF timestamp
    act(() => { flushRAF(0); });
    expect(readCount(container)).toBeGreaterThanOrEqual(0);

    // Several early frames
    for (let t = 16; t <= 160; t += 16) {
      act(() => { flushRAF(t); });
      expect(readCount(container)).toBeGreaterThanOrEqual(0);
    }
  });

  it('never produces a negative count for small targets (regression)', async () => {
    const { container } = render(<Counter target={79} duration={1800} />);

    await act(async () => { await Promise.resolve(); });

    act(() => { flushRAF(0); });
    expect(readCount(container)).toBeGreaterThanOrEqual(0);

    act(() => { flushRAF(16); });
    expect(readCount(container)).toBeGreaterThanOrEqual(0);
  });

  it('count increases monotonically during animation', async () => {
    const { container } = render(<Counter target={CARRIER_PANEL_COUNT} duration={2000} />);

    await act(async () => { await Promise.resolve(); });

    let prev = 0;
    act(() => { flushRAF(0); }); // startTime = 0

    for (let t = 100; t <= 2000; t += 100) {
      act(() => { flushRAF(t); });
      const current = readCount(container);
      expect(current).toBeGreaterThanOrEqual(prev);
      prev = current;
    }

    expect(readCount(container)).toBe(CARRIER_PANEL_COUNT);
  });

  it('uses rAF timestamp as startTime, not performance.now()', async () => {
    // The fix: startTime is captured from the first rAF callback's timestamp,
    // not from performance.now(). This avoids cross-clock negative elapsed.
    const { container } = render(<Counter target={CARRIER_PANEL_COUNT} duration={2200} />);

    await act(async () => { await Promise.resolve(); });

    // First rAF fires with arbitrary timestamp 5000
    act(() => { flushRAF(5000); });
    // elapsed = 5000 - 5000 = 0 → count = 0
    expect(readCount(container)).toBe(0);

    // Second frame at 5100 (100ms later)
    act(() => { flushRAF(5100); });
    // elapsed = 100, progress = 100/2200 ≈ 0.045 → count > 0
    expect(readCount(container)).toBeGreaterThan(0);
    expect(readCount(container)).toBeLessThan(CARRIER_PANEL_COUNT);
  });
});
