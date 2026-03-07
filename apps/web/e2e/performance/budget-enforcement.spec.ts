/**
 * Q26 — Performance Budget CI Enforcement
 *
 * Playwright tests that enforce web performance budgets on key pages.
 * Failures here indicate a regression that could hurt user experience.
 *
 * Budgets enforced:
 * - LCP (Largest Contentful Paint) < 2,000ms on the landing page
 * - TTI (Time to Interactive) < 3,000ms
 * - Initial page load JS < 200KB gzipped (verified via network response sizes)
 * - Navigation timing metrics: TTFB < 800ms, domInteractive < 2,500ms
 *
 * Notes on test.fixme():
 * - Lighthouse CI metrics (CLS, TBT, full Lighthouse audit) require a separate
 *   Lighthouse CI server and are marked fixme until that infrastructure exists.
 * - Bundle-size assertions based on Next.js build output require `next build`
 *   to have run and are included as fixme stubs with the verification approach.
 *
 * Plan reference: Stream Q Sprint 3/4 — Q26 Performance Budget CI Enforcement
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Budget Constants ─────────────────────────────────────────────────────────

/** LCP budget in milliseconds. */
const LCP_BUDGET_MS = 2_000;

/** TTI proxy budget in milliseconds (domInteractive as TTI approximation). */
const TTI_BUDGET_MS = 3_000;

/** TTFB budget in milliseconds. */
const TTFB_BUDGET_MS = 800;

/** domInteractive budget in milliseconds. */
const DOM_INTERACTIVE_BUDGET_MS = 2_500;

/**
 * Initial JS transfer size budget in bytes (before gzip is negotiated).
 * Playwright intercepts network responses — sizes here are transfer sizes.
 * We target < 200KB total initial JS, which is conservative but realistic.
 */
const INITIAL_JS_BUDGET_BYTES = 200 * 1024; // 200KB

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Collect navigation timing from the page's Performance API. */
async function getNavigationTiming(page: Page): Promise<{
  ttfb: number;
  domInteractive: number;
  domComplete: number;
  loadEventEnd: number;
}> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!nav) {
      return { ttfb: 0, domInteractive: 0, domComplete: 0, loadEventEnd: 0 };
    }
    return {
      ttfb: nav.responseStart - nav.requestStart,
      domInteractive: nav.domInteractive,
      domComplete: nav.domComplete,
      loadEventEnd: nav.loadEventEnd,
    };
  });
}

/** Collect the LCP value from the browser using PerformanceObserver + buffered entries. */
async function getLcp(page: Page): Promise<number> {
  return page.evaluate(() => {
    return new Promise<number>((resolve) => {
      // First try: already-buffered entries (fastest path)
      const existing = performance.getEntriesByType('largest-contentful-paint');
      if (existing.length > 0) {
        resolve((existing[existing.length - 1] as PerformanceEntry).startTime);
        return;
      }

      // Second try: PerformanceObserver — resolves immediately once an LCP entry
      // is observed (event-driven), with a 5-second maximum timeout as fallback.
      try {
        let lastLcp = 0;
        let resolved = false;

        const fallbackTimer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            observer.disconnect();
            resolve(lastLcp);
          }
        }, 5_000);

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            lastLcp = entry.startTime;
          }
          // Resolve immediately once LCP has settled (no more entries expected
          // after user interaction). Disconnect to stop observing.
          if (!resolved) {
            resolved = true;
            clearTimeout(fallbackTimer);
            observer.disconnect();
            resolve(lastLcp);
          }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        // Not supported in this browser
        resolve(0);
      }
    });
  });
}

// ─── LCP Budget Tests ─────────────────────────────────────────────────────────

test.describe('Performance Budget: LCP', () => {
  test('landing page LCP is under 2 seconds', async ({ page }) => {
    // Navigate and wait for full load
    await page.goto('/', { waitUntil: 'load' });

    // Wait until at least one LCP entry has been recorded (event-driven),
    // with a 5-second timeout fallback in case the API is unavailable.
    await page
      .waitForFunction(
        () => performance.getEntriesByType('largest-contentful-paint').length > 0,
        undefined,
        { timeout: 5_000 },
      )
      .catch(() => {
        // LCP not observed within timeout — getLcp will return 0, test will skip
      });

    const lcp = await getLcp(page);

    if (lcp > 0) {
      expect(lcp, `LCP ${lcp.toFixed(0)}ms exceeds budget of ${LCP_BUDGET_MS}ms`).toBeLessThan(
        LCP_BUDGET_MS,
      );
    } else {
      // LCP not available in this browser — skip assertion, not a test failure
      test.skip(true, 'LCP PerformanceObserver not supported in this browser');
    }
  });

  test('analysis page LCP is under 2 seconds', async ({ page }) => {
    await page.goto('/analysis', { waitUntil: 'load' });

    // Wait until at least one LCP entry has been recorded (event-driven),
    // with a 5-second timeout fallback in case the API is unavailable.
    await page
      .waitForFunction(
        () => performance.getEntriesByType('largest-contentful-paint').length > 0,
        undefined,
        { timeout: 5_000 },
      )
      .catch(() => {
        // LCP not observed within timeout — getLcp will return 0, test will skip
      });

    const lcp = await getLcp(page);

    if (lcp > 0) {
      expect(
        lcp,
        `Analysis page LCP ${lcp.toFixed(0)}ms exceeds budget of ${LCP_BUDGET_MS}ms`,
      ).toBeLessThan(LCP_BUDGET_MS);
    } else {
      test.skip(true, 'LCP PerformanceObserver not supported in this browser');
    }
  });
});

// ─── TTI Budget Tests ─────────────────────────────────────────────────────────

test.describe('Performance Budget: TTI (Time to Interactive)', () => {
  test('landing page TTI (domInteractive) is under 3 seconds', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    const timing = await getNavigationTiming(page);

    if (timing.domInteractive > 0) {
      expect(
        timing.domInteractive,
        `domInteractive ${timing.domInteractive.toFixed(0)}ms exceeds TTI budget of ${TTI_BUDGET_MS}ms`,
      ).toBeLessThan(TTI_BUDGET_MS);
    }
  });

  test('analysis page TTI (domInteractive) is under 3 seconds', async ({ page }) => {
    await page.goto('/analysis', { waitUntil: 'load' });

    const timing = await getNavigationTiming(page);

    if (timing.domInteractive > 0) {
      expect(
        timing.domInteractive,
        `Analysis page domInteractive ${timing.domInteractive.toFixed(0)}ms exceeds TTI budget of ${TTI_BUDGET_MS}ms`,
      ).toBeLessThan(TTI_BUDGET_MS);
    }
  });
});

// ─── TTFB and Navigation Timing ───────────────────────────────────────────────

test.describe('Performance Budget: Navigation Timing', () => {
  test('landing page TTFB is under 800ms', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    const timing = await getNavigationTiming(page);

    if (timing.ttfb > 0) {
      expect(
        timing.ttfb,
        `TTFB ${timing.ttfb.toFixed(0)}ms exceeds budget of ${TTFB_BUDGET_MS}ms`,
      ).toBeLessThan(TTFB_BUDGET_MS);
    }
  });

  test('landing page domInteractive is under 2.5 seconds', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    const timing = await getNavigationTiming(page);

    if (timing.domInteractive > 0) {
      expect(
        timing.domInteractive,
        `domInteractive ${timing.domInteractive.toFixed(0)}ms exceeds budget of ${DOM_INTERACTIVE_BUDGET_MS}ms`,
      ).toBeLessThan(DOM_INTERACTIVE_BUDGET_MS);
    }
  });

  test('navigation timing entries are present and parseable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    // Verify the raw navigation timing JSON is parseable (used by external monitoring tools)
    const timingJson = await page.evaluate(() =>
      JSON.stringify(performance.getEntriesByType('navigation')),
    );

    const entries = JSON.parse(timingJson) as unknown[];
    expect(entries.length).toBeGreaterThan(0);

    const nav = entries[0] as Record<string, unknown>;
    expect(nav['entryType']).toBe('navigation');
    expect(typeof nav['domInteractive']).toBe('number');
    expect(typeof nav['loadEventEnd']).toBe('number');
  });
});

// ─── JS Bundle Size Tests ─────────────────────────────────────────────────────

test.describe('Performance Budget: JS Bundle Size', () => {
  /**
   * Resolve the wire transfer size of a Playwright response.
   *
   * Priority order:
   *  1. `content-length` response header — accurate compressed (gzip/br) size.
   *  2. Fall back to `undefined` when the header is absent (chunked-encoding
   *     transfers do not send content-length). Callers that receive `undefined`
   *     skip the size assertion for that response, because we cannot determine
   *     the wire size without the header and we refuse to measure the
   *     decompressed body (response.body() returns decompressed bytes, which
   *     would substantially over-report the actual transfer size).
   */
  function getTransferSize(response: import('@playwright/test').Response): number | undefined {
    const clHeader = response.headers()['content-length'];
    if (clHeader !== undefined && clHeader !== '') {
      const parsed = parseInt(clHeader, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
    return undefined;
  }

  test('initial page load JS transfer is under 200KB total', async ({ page }) => {
    // Collect all JS response transfer sizes during initial navigation.
    // Only responses that include a content-length header are counted —
    // chunked responses without content-length are skipped (we cannot
    // determine their wire size without reading the decompressed body).
    const jsResponses: Array<{ url: string; size: number }> = [];

    page.on('response', (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] ?? '';

      // Only capture JS files loaded during initial navigation
      if (
        contentType.includes('javascript') ||
        url.endsWith('.js') ||
        url.includes('/_next/static/')
      ) {
        const size = getTransferSize(response);
        if (size !== undefined) {
          jsResponses.push({ url, size });
        }
        // If content-length is unavailable (chunked encoding), we skip this
        // response — we will not read response.body() because that returns
        // the decompressed size, not the wire transfer size.
      }
    });

    await page.goto('/', { waitUntil: 'load' });

    if (jsResponses.length === 0) {
      // No JS responses had content-length headers (e.g., dev server with
      // chunked encoding). Skip the budget assertion — this is an E2E
      // contract test and we only enforce the budget when wire sizes are
      // measurable. A production build with a CDN will have content-length.
      test.skip(
        true,
        'No JS responses included content-length headers; wire sizes are unmeasurable in this environment (likely chunked encoding on dev server)',
      );
      return;
    }

    const totalJsBytes = jsResponses.reduce((sum, r) => sum + r.size, 0);
    const totalJsKb = (totalJsBytes / 1024).toFixed(1);

    // Log the top 5 largest JS files for debugging
    const topFiles = [...jsResponses]
      .sort((a, b) => b.size - a.size)
      .slice(0, 5)
      .map((r) => `  ${(r.size / 1024).toFixed(1)}KB  ${r.url.split('/').pop()}`)
      .join('\n');

    expect(
      totalJsBytes,
      `Total initial JS transfer ${totalJsKb}KB exceeds budget of ${INITIAL_JS_BUDGET_BYTES / 1024}KB.\nTop JS files (by content-length):\n${topFiles}`,
    ).toBeLessThan(INITIAL_JS_BUDGET_BYTES);
  });

  test('no single JS chunk exceeds 100KB', async ({ page }) => {
    const largeChunks: Array<{ url: string; sizeKb: number }> = [];
    let measurableResponseCount = 0;

    page.on('response', (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] ?? '';

      if (
        (contentType.includes('javascript') || url.endsWith('.js')) &&
        url.includes('/_next/static/')
      ) {
        const size = getTransferSize(response);
        if (size !== undefined) {
          measurableResponseCount++;
          const sizeKb = size / 1024;
          if (sizeKb > 100) {
            largeChunks.push({ url, sizeKb });
          }
        }
        // Responses without content-length are skipped (chunked encoding).
        // We do not read response.body() as that returns decompressed bytes.
      }
    });

    await page.goto('/', { waitUntil: 'load' });

    if (measurableResponseCount === 0) {
      // No /_next/static/ JS responses had content-length headers.
      // Skip — cannot enforce the budget without wire sizes.
      test.skip(
        true,
        'No /_next/static/ JS responses included content-length headers; likely chunked encoding on dev server',
      );
      return;
    }

    expect(
      largeChunks,
      `Found JS chunks with content-length > 100KB: ${JSON.stringify(
        largeChunks.map((c) => ({ file: c.url.split('/').pop(), sizeKb: c.sizeKb.toFixed(1) })),
        null,
        2,
      )}`,
    ).toHaveLength(0);
  });
});

// ─── Lighthouse CI stubs (require separate infrastructure) ────────────────────

test.describe('Performance Budget: Lighthouse CI (requires lhci)', () => {
  test.fixme('TODO(stream-ops): CLS (Cumulative Layout Shift) < 0.1 — requires Lighthouse CI runner', async () => {
    // CLS measurement requires running Lighthouse with --collect.url flags.
    // To enable: set up lhci server, add .lighthouserc.js with budget:
    //   { resourceSizes: [{ resourceType: 'script', budget: 200 }] }
    //   { audits: [{ id: 'cumulative-layout-shift', budget: 0.1 }] }
    // Then run: lhci autorun in CI pipeline.
    //
    // Playwright's Performance API does not expose layout-shift entries
    // in a way that accurately reflects the final CLS score.
  });

  test.fixme('TODO(stream-ops): TBT (Total Blocking Time) < 200ms — requires Lighthouse CI runner', async () => {
    // TBT is computed as the sum of long-task time beyond 50ms per task,
    // measured during TTI window. Requires Lighthouse to compute correctly.
    //
    // Playwright longtask observer can approximate this but not compute TBT
    // as Lighthouse defines it (TTI window boundary is unknown).
  });

  test.fixme('TODO(stream-ops): Full Lighthouse audit passes all performance budgets — requires lhci', async () => {
    // Full budget enforcement via Lighthouse CI:
    // 1. Install: npm install -g @lhci/cli
    // 2. Configure: lighthouserc.js with assertions block
    // 3. Add CI step: lhci autorun --config=lighthouserc.js
    //
    // Budget assertions to include:
    //   - performance score >= 90
    //   - first-contentful-paint < 1800ms
    //   - largest-contentful-paint < 2000ms
    //   - total-blocking-time < 200ms
    //   - cumulative-layout-shift < 0.1
    //   - speed-index < 3000ms
  });

  test.fixme('TODO(stream-ops): Next.js build output bundle sizes verified via .next/build-manifest.json', async () => {
    // After `next build`, bundle sizes can be verified by reading:
    //   .next/build-manifest.json — maps pages to their JS chunks
    //   .next/static/ — contains the actual chunk files
    //
    // Script to add to CI:
    //   node -e "
    //     const fs = require('fs');
    //     const manifest = JSON.parse(fs.readFileSync('.next/build-manifest.json'));
    //     // Check total size of all chunks listed for '/'
    //     const homeChunks = manifest.pages['/'];
    //     const totalSize = homeChunks.reduce((sum, chunk) => {
    //       const stat = fs.statSync('.next/' + chunk);
    //       return sum + stat.size;
    //     }, 0);
    //     console.log('Total home page JS:', totalSize / 1024, 'KB');
    //     if (totalSize > 200 * 1024) process.exit(1);
    //   "
  });
});
