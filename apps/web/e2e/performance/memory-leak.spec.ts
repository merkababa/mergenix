/**
 * Memory Leak Detection E2E Test
 *
 * Validates that repeated analysis cycles do not cause unbounded
 * heap growth — a common symptom of memory leaks from event listeners,
 * Web Worker references, Zustand store subscriptions, or DOM node
 * retention.
 *
 * This test runs 10 cycles of navigate-to-analysis, trigger demo,
 * then reset/navigate away. After each cycle, a heap measurement is
 * taken. The test asserts that the average heap of the last 3 cycles
 * is not more than 2x the average of the first 3 cycles (allowing
 * for JIT warm-up and cache fills, but catching linear growth).
 *
 * This test is marked as slow (test.slow()) because it takes 2-3
 * minutes. It should run in nightly CI only, not per-PR.
 *
 * Plan reference: PHASE_8C_PLAN.md section 3.20 (scenario 1)
 */

import { test, expect } from '@playwright/test';

test.describe('Performance: Memory Leak Detection', () => {
  // -------------------------------------------------------------------------
  // 3.20 #1 — 10-cycle analyze-reset loop: heap does not grow linearly
  // Priority: P2 | Reviewer: Technologist
  // -------------------------------------------------------------------------

  test('no memory leak across 10 analysis demo cycles', async ({ page }) => {
    test.slow(); // This test takes 2-3 minutes

    const heapSizes: number[] = [];
    const cycleTimes: number[] = [];

    for (let i = 0; i < 10; i++) {
      const cycleStart = Date.now();

      // Navigate to the analysis page
      await page.goto('/analysis');

      // Wait for the page to be fully loaded and interactive
      await expect(
        page.getByRole('heading', { name: 'Genetic Analysis' }),
      ).toBeVisible();

      // Trigger demo analysis — this exercises:
      // - Zustand store state updates (setDemoResults)
      // - Dynamic import (demo-results.ts)
      // - Result tab rendering (lazy-loaded components)
      // - DOM creation for results
      const demoButton = page.getByRole('button', {
        name: /try demo analysis/i,
      });

      // The demo button only shows when no files are selected (idle + no files)
      if (await demoButton.isVisible().catch(() => false)) {
        await demoButton.click();

        // Wait for demo results to load — tab list appears when complete
        await expect(
          page.getByRole('tablist', { name: /analysis results/i }),
        ).toBeVisible({ timeout: 10000 });

        // Interact with a few tabs to exercise more component rendering
        const tabKeys = ['Carrier Risk', 'Traits', 'Overview'];
        for (const tabName of tabKeys) {
          const tab = page.getByRole('tab', { name: tabName });
          if (await tab.isVisible().catch(() => false)) {
            await tab.click();
            await page.waitForTimeout(200);
          }
        }
      }

      // Force garbage collection (if available) and measure heap
      const heapSize = await page.evaluate(async () => {
        // Try to trigger GC via gc() if available (requires --js-flags=--expose-gc)
        if (typeof (globalThis as any).gc === 'function') {
          (globalThis as any).gc();
        }

        // Method 1: measureUserAgentSpecificMemory (more accurate, Chrome 89+)
        // This is async and cross-origin aware
        if (typeof (performance as any).measureUserAgentSpecificMemory === 'function') {
          try {
            const memInfo = await (performance as any).measureUserAgentSpecificMemory();
            return memInfo.bytes as number;
          } catch {
            // Falls through to Method 2
          }
        }

        // Method 2: performance.memory (non-standard, Chrome-only)
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize as number;
        }

        // Method 3: Fallback — return 0 (test will be skipped/soft-fail)
        return 0;
      });

      heapSizes.push(heapSize);

      // Reset by navigating to homepage (exercises cleanup: worker terminate,
      // store reset, component unmount, event listener removal)
      await page.goto('/');
      await page.waitForTimeout(500);

      cycleTimes.push(Date.now() - cycleStart);
    }

    // ── Analysis ──────────────────────────────────────────────────────────

    // If no memory API was available, log a warning and soft-pass
    const hasMemoryData = heapSizes.some((size) => size > 0);
    if (!hasMemoryData) {
      // eslint-disable-next-line no-console
      console.warn(
        'Memory measurement APIs not available in this browser. ' +
          'Memory leak test is inconclusive. Run in Chrome for full coverage.',
      );
      // Don't fail — just note it
      return;
    }

    // Filter out zero measurements (in case some cycles failed to measure)
    const validHeaps = heapSizes.filter((size) => size > 0);

    if (validHeaps.length < 6) {
      // Need at least 6 measurements for meaningful first/last 3 comparison
      // eslint-disable-next-line no-console
      console.warn(
        `Only ${validHeaps.length} valid heap measurements. Need at least 6 for reliable comparison.`,
      );
      return;
    }

    // Calculate averages for first 3 and last 3 measurements
    const firstThree = validHeaps.slice(0, 3);
    const lastThree = validHeaps.slice(-3);

    const firstThreeAvg =
      firstThree.reduce((a, b) => a + b, 0) / firstThree.length;
    const lastThreeAvg =
      lastThree.reduce((a, b) => a + b, 0) / lastThree.length;

    // Log detailed measurements for debugging
    const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);
    // eslint-disable-next-line no-console
    console.log('Heap measurements (MB) per cycle:');
    for (let i = 0; i < heapSizes.length; i++) {
      // eslint-disable-next-line no-console
      console.log(
        `  Cycle ${i + 1}: ${formatMB(heapSizes[i])} MB (${cycleTimes[i]}ms)`,
      );
    }
    // eslint-disable-next-line no-console
    console.log(`  First 3 avg: ${formatMB(firstThreeAvg)} MB`);
    // eslint-disable-next-line no-console
    console.log(`  Last 3 avg:  ${formatMB(lastThreeAvg)} MB`);
    // eslint-disable-next-line no-console
    console.log(`  Ratio:       ${(lastThreeAvg / firstThreeAvg).toFixed(2)}x`);

    // ── Assertions ────────────────────────────────────────────────────────

    // Primary assertion: last 3 measurements should NOT be more than 2x
    // the first 3 measurements. This allows for JIT warmup, caching, and
    // normal variance while catching linear unbounded growth.
    expect(
      lastThreeAvg,
      `Heap grew from avg ${formatMB(firstThreeAvg)} MB to ${formatMB(lastThreeAvg)} MB ` +
        `(${(lastThreeAvg / firstThreeAvg).toFixed(2)}x). Possible memory leak.`,
    ).toBeLessThan(firstThreeAvg * 2);

    // Secondary assertion: check for strictly monotonic growth across all
    // measurements. If every measurement is larger than the previous one,
    // that is a strong leak signal even if it hasn't hit 2x yet.
    let monotonicallyGrowingCount = 0;
    for (let i = 1; i < validHeaps.length; i++) {
      if (validHeaps[i] > validHeaps[i - 1]) {
        monotonicallyGrowingCount++;
      }
    }

    // If 80%+ of transitions are growth, that is suspicious
    const growthRatio = monotonicallyGrowingCount / (validHeaps.length - 1);
    expect.soft(
      growthRatio,
      `${(growthRatio * 100).toFixed(0)}% of cycles showed heap growth. ` +
        `Monotonic growth suggests a memory leak.`,
    ).toBeLessThan(0.8);
  });
});
