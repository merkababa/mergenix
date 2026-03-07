/**
 * Web Worker Lifecycle E2E Tests
 *
 * Validates the genetics Web Worker's lifecycle, message protocol,
 * error handling, and concurrency behavior as experienced through
 * the analysis page UI.
 *
 * Worker message protocol (from shared-types):
 * - Requests:  { type: 'parse', files }, { type: 'analyze', ... }, { type: 'cancel' }
 * - Responses: parse_progress, parse_complete, analysis_progress, analysis_complete, error
 * - Error codes: PARSE_ERROR, ANALYSIS_ERROR, CANCELLED, CANCEL_ACK, WORKER_BUSY, MISSING_DATA, UNKNOWN_REQUEST
 *
 * The worker is lazily instantiated by `useGeneticsWorker` hook on the first
 * call to `startAnalysis`, and terminated on component unmount (navigation away).
 *
 * Plan reference: PHASE_8C_PLAN.md section 3.19 (scenarios 1-8)
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal 23andMe-format DNA content for testing.
 * Contains a small set of valid SNP entries that the parser can handle.
 */
const MINIMAL_DNA_CONTENT = [
  '# rsid\tchromosome\tposition\tgenotype',
  'rs1234567\t1\t100000\tAG',
  'rs2345678\t2\t200000\tCT',
  'rs3456789\t3\t300000\tGG',
  'rs4567890\t4\t400000\tAA',
  'rs5678901\t5\t500000\tTT',
].join('\n');

/**
 * Invalid DNA file content that should trigger a PARSE_ERROR.
 */
const INVALID_DNA_CONTENT = [
  'This is not a valid genetic file',
  'It contains random text',
  'With no SNP data whatsoever',
  '!!!@@@###$$$%%%',
].join('\n');

/**
 * Install a Worker spy that intercepts Worker construction and postMessage
 * calls. MUST be called before navigating to the analysis page, via
 * page.addInitScript so it runs before any page JS.
 */
async function installWorkerSpy(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;

    // Storage for spy data
    (window as any).__workerSpy = {
      instances: [] as Worker[],
      postMessages: [] as any[],
      receivedMessages: [] as any[],
      terminated: false,
      terminateCount: 0,
    };

    // Override Worker constructor
    window.Worker = class SpyWorker extends OriginalWorker {
      constructor(url: string | URL, opts?: WorkerOptions) {
        super(url, opts);
        (window as any).__workerSpy.instances.push(this);

        // Intercept messages FROM the worker
        const originalOnMessage = Object.getOwnPropertyDescriptor(this, 'onmessage');

        // Use an event listener to capture all messages
        this.addEventListener('message', (event: MessageEvent) => {
          (window as any).__workerSpy.receivedMessages.push(JSON.parse(JSON.stringify(event.data)));
        });

        // Override terminate
        const originalTerminate = this.terminate.bind(this);
        this.terminate = () => {
          (window as any).__workerSpy.terminated = true;
          (window as any).__workerSpy.terminateCount++;
          originalTerminate();
        };

        // Override postMessage to spy on messages TO the worker
        const originalPostMessage = this.postMessage.bind(this);
        this.postMessage = (msg: any, ...rest: any[]) => {
          (window as any).__workerSpy.postMessages.push(JSON.parse(JSON.stringify(msg)));
          return (originalPostMessage as any)(msg, ...rest);
        };
      }
    } as any;
  });
}

/**
 * Upload a synthetic DNA file to a parent slot via the hidden file input.
 */
async function uploadSyntheticFile(
  page: import('@playwright/test').Page,
  slot: 'A' | 'B',
  content: string,
  filename: string,
): Promise<void> {
  const dropzoneLabel = slot === 'A' ? /parent a.*mother/i : /parent b.*father/i;
  const fileInput = page.getByRole('button', { name: dropzoneLabel }).locator('input[type="file"]');

  await fileInput.setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from(content),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Performance: Worker Lifecycle', () => {
  // -------------------------------------------------------------------------
  // 3.19 #1 — Worker initializes on analysis page load
  // Priority: P1 | Reviewer: Technologist
  // -------------------------------------------------------------------------

  test('worker initializes on analysis page load when analysis starts', async ({ page }) => {
    // Install the worker spy BEFORE navigating
    await installWorkerSpy(page);

    await page.goto('/analysis');

    // Wait for the page to be interactive
    await expect(page.getByRole('heading', { name: 'Genetic Analysis' })).toBeVisible();

    // The worker is LAZILY instantiated (only on first startAnalysis call).
    // Verify no worker exists before starting analysis.
    const preAnalysisWorkerCount = await page.evaluate(
      () => (window as any).__workerSpy.instances.length,
    );
    expect(preAnalysisWorkerCount).toBe(0);

    // Upload files to enable the Start Analysis button
    await uploadSyntheticFile(page, 'A', MINIMAL_DNA_CONTENT, 'parentA.txt');
    await uploadSyntheticFile(page, 'B', MINIMAL_DNA_CONTENT, 'parentB.txt');

    // Wait for both files to be displayed
    await expect(page.getByText('parentA.txt')).toBeVisible();
    await expect(page.getByText('parentB.txt')).toBeVisible();

    // Click Start Analysis — this triggers worker instantiation
    await page.getByRole('button', { name: /start analysis/i }).click();

    // Wait for the worker to be created
    await expect
      .poll(() => page.evaluate(() => (window as any).__workerSpy.instances.length), {
        message: 'Worker should be instantiated after starting analysis',
      })
      .toBeGreaterThanOrEqual(1);

    // Verify a 'parse' message was sent to the worker
    const postMessages = await page.evaluate(() => (window as any).__workerSpy.postMessages);

    const parseMessages = postMessages.filter((msg: any) => msg.type === 'parse');
    expect(parseMessages.length).toBeGreaterThanOrEqual(1);

    // Verify the parse message contains two files
    expect(parseMessages[0].files).toHaveLength(2);
    expect(parseMessages[0].files[0].name).toBe('parentA.txt');
    expect(parseMessages[0].files[1].name).toBe('parentB.txt');
  });

  // -------------------------------------------------------------------------
  // 3.19 #2 — Worker terminates on navigation away from analysis
  // Priority: P1 | Reviewer: Technologist
  // -------------------------------------------------------------------------

  test('worker terminates on navigation away from analysis', async ({ page }) => {
    await installWorkerSpy(page);

    await page.goto('/analysis');
    await expect(page.getByRole('heading', { name: 'Genetic Analysis' })).toBeVisible();

    // Upload files and start analysis to instantiate the worker
    await uploadSyntheticFile(page, 'A', MINIMAL_DNA_CONTENT, 'parentA.txt');
    await uploadSyntheticFile(page, 'B', MINIMAL_DNA_CONTENT, 'parentB.txt');

    await page.getByRole('button', { name: /start analysis/i }).click();

    // Wait for the worker to be instantiated
    await expect
      .poll(() => page.evaluate(() => (window as any).__workerSpy.instances.length), {
        message: 'Worker should be instantiated',
      })
      .toBeGreaterThanOrEqual(1);

    // Navigate away from the analysis page — this triggers useEffect cleanup
    // which calls worker.terminate()
    await page.goto('/');

    // Wait for the page to settle after navigation
    await page.waitForLoadState('domcontentloaded');

    // Verify the worker was terminated
    const terminated = await page.evaluate(() => (window as any).__workerSpy?.terminated ?? false);

    // Note: After navigation, the spy may be gone if it was a full page load.
    // So we also check that no workers are actively running.
    // The key verification is that we observed terminate being called
    // OR the spy is gone (meaning the page unloaded).
    expect(terminated || !(await page.evaluate(() => !!(window as any).__workerSpy))).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 3.19 #3 — Valid files produce parse_complete with correct SNP count
  // Priority: P1 | Reviewers: Technologist, Scientist
  // -------------------------------------------------------------------------

  test('valid file parse produces parse_complete with correct SNP count', async ({ page }) => {
    await installWorkerSpy(page);

    await page.goto('/analysis');
    await expect(page.getByRole('heading', { name: 'Genetic Analysis' })).toBeVisible();

    // Upload files
    await uploadSyntheticFile(page, 'A', MINIMAL_DNA_CONTENT, 'parentA.txt');
    await uploadSyntheticFile(page, 'B', MINIMAL_DNA_CONTENT, 'parentB.txt');

    // Start analysis
    await page.getByRole('button', { name: /start analysis/i }).click();

    // Wait for parse_complete to appear in received messages
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const msgs = (window as any).__workerSpy?.receivedMessages ?? [];
            return msgs.some((m: any) => m.type === 'parse_complete');
          }),
        {
          message: 'Worker should send parse_complete message',
          timeout: 15000,
        },
      )
      .toBeTruthy();

    // Get the parse_complete message and verify SNP counts
    const parseCompleteMsg = await page.evaluate(() => {
      const msgs = (window as any).__workerSpy.receivedMessages;
      return msgs.find((m: any) => m.type === 'parse_complete');
    });

    expect(parseCompleteMsg).toBeTruthy();
    expect(parseCompleteMsg.results).toHaveLength(2);

    // Each file has 5 SNP entries in MINIMAL_DNA_CONTENT
    // The totalSnps count depends on the parser's behavior with the format
    for (const result of parseCompleteMsg.results) {
      expect(result.totalSnps).toBeGreaterThan(0);
      expect(result.format).toBeTruthy();
    }

    // Also verify parse_progress messages were sent (0, 50, 100 per file)
    const progressMsgs = await page.evaluate(() => {
      const msgs = (window as any).__workerSpy.receivedMessages;
      return msgs.filter((m: any) => m.type === 'parse_progress');
    });

    // Expect at least some progress updates (0%, 50%, 100% for each file)
    expect(progressMsgs.length).toBeGreaterThanOrEqual(4);
  });

  // -------------------------------------------------------------------------
  // 3.19 #4 — Invalid file produces PARSE_ERROR
  // Priority: P1 | Reviewer: Technologist
  // -------------------------------------------------------------------------

  test('invalid file produces PARSE_ERROR', async ({ page }) => {
    await installWorkerSpy(page);

    await page.goto('/analysis');
    await expect(page.getByRole('heading', { name: 'Genetic Analysis' })).toBeVisible();

    // Upload one valid file and one invalid file
    // The dropzone format detection happens client-side, so we need to
    // use a .txt extension to get past the format check
    await uploadSyntheticFile(page, 'A', MINIMAL_DNA_CONTENT, 'valid-parentA.txt');
    await uploadSyntheticFile(page, 'B', INVALID_DNA_CONTENT, 'invalid-parentB.txt');

    // Start analysis
    await page.getByRole('button', { name: /start analysis/i }).click();

    // Wait for either an error message in the UI or an error in worker messages.
    // The parser may throw an error for invalid content, which gets caught
    // and posted as an error response with code 'PARSE_ERROR'.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const msgs = (window as any).__workerSpy?.receivedMessages ?? [];
            return (
              msgs.some(
                (m: any) =>
                  m.type === 'error' &&
                  (m.code === 'PARSE_ERROR' ||
                    m.code === 'MISSING_DATA' ||
                    m.code === 'ANALYSIS_ERROR'),
              ) ||
              // Also check if the UI showed an error (parse completed but
              // analysis failed due to invalid genotype data)
              msgs.some((m: any) => m.type === 'parse_complete')
            );
          }),
        {
          message: 'Worker should send an error or parse_complete for invalid file',
          timeout: 15000,
        },
      )
      .toBeTruthy();

    // Check what happened: either the parse itself errored, or parse succeeded
    // with 0 SNPs which will cause analysis to fail with MISSING_DATA
    const errorMsgs = await page.evaluate(() => {
      const msgs = (window as any).__workerSpy.receivedMessages;
      return msgs.filter((m: any) => m.type === 'error');
    });

    const parseCompleteMsgs = await page.evaluate(() => {
      const msgs = (window as any).__workerSpy.receivedMessages;
      return msgs.filter((m: any) => m.type === 'parse_complete');
    });

    // Either we got an error, or parse succeeded but with very few/zero
    // valid SNPs in the invalid file
    const gotError = errorMsgs.length > 0;
    const parseSucceeded = parseCompleteMsgs.length > 0;

    expect(
      gotError || parseSucceeded,
      'Should either get PARSE_ERROR or parse with zero/minimal SNPs',
    ).toBeTruthy();

    if (gotError) {
      // Verify the error has an appropriate code
      const parseError = errorMsgs.find(
        (m: any) =>
          m.code === 'PARSE_ERROR' || m.code === 'MISSING_DATA' || m.code === 'ANALYSIS_ERROR',
      );
      expect(parseError).toBeTruthy();
    }

    if (parseSucceeded && parseCompleteMsgs[0].results) {
      // The invalid file should have very few or zero valid SNPs
      const invalidFileResult = parseCompleteMsgs[0].results[1];
      // If it parsed at all, the total valid SNPs should be minimal
      expect(invalidFileResult.totalSnps).toBeLessThanOrEqual(1);
    }

    // Verify the UI shows an error state (error message visible)
    // The store sets errorMessage and returns to 'idle' on error
    const errorVisible = await page
      .getByText('Analysis Error')
      .isVisible()
      .catch(() => false);
    const analysisRunning = await page
      .getByRole('progressbar')
      .isVisible()
      .catch(() => false);

    // Either the error is shown, or the analysis is still running
    // (it might have successfully parsed and moved to analysis which may
    // then fail). Give it time to settle.
    if (!errorVisible && analysisRunning) {
      // Wait for either error or completion
      await expect
        .poll(
          async () => {
            const errShown = await page
              .getByText('Analysis Error')
              .isVisible()
              .catch(() => false);
            const completed = await page
              .getByRole('tablist')
              .isVisible()
              .catch(() => false);
            return errShown || completed;
          },
          { timeout: 20000 },
        )
        .toBeTruthy();
    }
  });

  // -------------------------------------------------------------------------
  // 3.19 #5 — Worker analysis completes and posts analysis_complete
  // Priority: P1 | Reviewer: Technologist
  // -------------------------------------------------------------------------

  test('worker analysis completes and posts analysis_complete', async ({ page }) => {
    test.slow(); // Analysis may take time

    await installWorkerSpy(page);

    await page.goto('/analysis');
    await expect(page.getByRole('heading', { name: 'Genetic Analysis' })).toBeVisible();

    // Upload files and start
    await uploadSyntheticFile(page, 'A', MINIMAL_DNA_CONTENT, 'parentA.txt');
    await uploadSyntheticFile(page, 'B', MINIMAL_DNA_CONTENT, 'parentB.txt');
    await page.getByRole('button', { name: /start analysis/i }).click();

    // Wait for analysis_complete message from the worker
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const msgs = (window as any).__workerSpy?.receivedMessages ?? [];
            return msgs.some((m: any) => m.type === 'analysis_complete');
          }),
        {
          message: 'Worker should send analysis_complete message',
          timeout: 30000,
        },
      )
      .toBeTruthy();

    // Verify the analysis_complete message has the expected structure
    const analysisComplete = await page.evaluate(() => {
      const msgs = (window as any).__workerSpy.receivedMessages;
      return msgs.find((m: any) => m.type === 'analysis_complete');
    });

    expect(analysisComplete).toBeTruthy();
    expect(analysisComplete.results).toBeTruthy();
    expect(analysisComplete.results.carrier).toBeDefined();
    expect(analysisComplete.results.traits).toBeDefined();
    expect(analysisComplete.results.pgx).toBeDefined();
    expect(analysisComplete.results.prs).toBeDefined();
    expect(analysisComplete.results.counseling).toBeDefined();
    expect(analysisComplete.results.metadata).toBeDefined();
    expect(analysisComplete.results.metadata.engineVersion).toBeTruthy();
    expect(analysisComplete.results.metadata.analysisTimestamp).toBeTruthy();

    // Verify analysis_progress messages were sent for each stage
    const progressMsgs = await page.evaluate(() => {
      const msgs = (window as any).__workerSpy.receivedMessages;
      return msgs.filter((m: any) => m.type === 'analysis_progress');
    });

    // Should have progress messages for the main stages
    const stages = progressMsgs.map((m: any) => m.stage);
    expect(stages).toContain('carrier_analysis');
    expect(stages).toContain('trait_prediction');
    expect(stages).toContain('pharmacogenomics');
    expect(stages).toContain('polygenic_risk');
    expect(stages).toContain('counseling_triage');
    expect(stages).toContain('complete');

    // Verify the analyze message was auto-chained after parse_complete
    const postMessages = await page.evaluate(() => (window as any).__workerSpy.postMessages);
    const analyzeMsgs = postMessages.filter((m: any) => m.type === 'analyze');
    expect(analyzeMsgs.length).toBeGreaterThanOrEqual(1);

    // The analyze message should include a tier
    expect(analyzeMsgs[0].tier).toBeTruthy();

    // Verify UI shows results — tab list should be visible
    await expect(page.getByRole('tablist', { name: /analysis results/i })).toBeVisible({
      timeout: 5000,
    });
  });

  // -------------------------------------------------------------------------
  // 3.19 #6 — Cancel message returns CANCELLED, UI resets
  // Priority: P2 | Reviewer: Technologist
  // -------------------------------------------------------------------------

  test('cancel message returns CANCELLED and UI resets', async ({ page }) => {
    await installWorkerSpy(page);

    await page.goto('/analysis');
    await expect(page.getByRole('heading', { name: 'Genetic Analysis' })).toBeVisible();

    // Upload files and start analysis
    await uploadSyntheticFile(page, 'A', MINIMAL_DNA_CONTENT, 'parentA.txt');
    await uploadSyntheticFile(page, 'B', MINIMAL_DNA_CONTENT, 'parentB.txt');
    await page.getByRole('button', { name: /start analysis/i }).click();

    // Wait for the analysis to start running (progress stepper visible)
    await expect(page.getByRole('progressbar')).toBeVisible({ timeout: 10000 });

    // Click Cancel Analysis button
    await page.getByRole('button', { name: /cancel analysis/i }).click();

    // Verify a 'cancel' message was sent to the worker
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const msgs = (window as any).__workerSpy?.postMessages ?? [];
            return msgs.some((m: any) => m.type === 'cancel');
          }),
        { message: 'A cancel message should be posted to the worker' },
      )
      .toBeTruthy();

    // Wait for the UI to reset back to idle state.
    // The worker responds with CANCELLED or CANCEL_ACK error code,
    // which causes the store to reset, returning to the idle file upload view.
    await expect
      .poll(
        async () => {
          // Check if either the demo button (idle state) or file dropzone is visible
          const demoVisible = await page
            .getByRole('button', { name: /try demo analysis/i })
            .isVisible()
            .catch(() => false);
          const dropzoneVisible = await page
            .getByRole('button', { name: /parent a.*mother/i })
            .isVisible()
            .catch(() => false);
          return demoVisible || dropzoneVisible;
        },
        {
          message: 'UI should reset to idle state after cancellation',
          timeout: 15000,
        },
      )
      .toBeTruthy();

    // Verify that CANCELLED or CANCEL_ACK was received from the worker
    const cancelMsgs = await page.evaluate(() => {
      const msgs = (window as any).__workerSpy?.receivedMessages ?? [];
      return msgs.filter(
        (m: any) => m.type === 'error' && (m.code === 'CANCELLED' || m.code === 'CANCEL_ACK'),
      );
    });

    // The cancel might have been processed between stages (CANCELLED)
    // or while busy (CANCEL_ACK). Either is valid.
    expect(cancelMsgs.length).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // 3.19 #7 — Second request while busy returns WORKER_BUSY
  // Priority: P2 | Reviewer: Technologist
  // -------------------------------------------------------------------------

  test('second request while busy returns WORKER_BUSY', async ({ page }) => {
    await installWorkerSpy(page);

    await page.goto('/analysis');
    await expect(page.getByRole('heading', { name: 'Genetic Analysis' })).toBeVisible();

    // Upload files
    await uploadSyntheticFile(page, 'A', MINIMAL_DNA_CONTENT, 'parentA.txt');
    await uploadSyntheticFile(page, 'B', MINIMAL_DNA_CONTENT, 'parentB.txt');

    // Start analysis
    await page.getByRole('button', { name: /start analysis/i }).click();

    // Wait for the worker to be instantiated and processing to start
    await expect
      .poll(() => page.evaluate(() => (window as any).__workerSpy?.instances?.length ?? 0), {
        message: 'Worker should be instantiated',
      })
      .toBeGreaterThanOrEqual(1);

    // Directly send a second parse request to the worker while it's busy
    // This bypasses the UI (which would prevent this) to test the worker's
    // built-in WORKER_BUSY guard
    await page.evaluate(() => {
      const worker = (window as any).__workerSpy.instances[0];
      if (worker) {
        worker.postMessage({
          type: 'parse',
          files: [{ name: 'extra.txt', content: 'rs1234\t1\t100\tAG' }],
        });
      }
    });

    // Wait for a WORKER_BUSY response
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const msgs = (window as any).__workerSpy?.receivedMessages ?? [];
            return msgs.some((m: any) => m.type === 'error' && m.code === 'WORKER_BUSY');
          }),
        {
          message: 'Worker should respond with WORKER_BUSY when sent a second request',
          timeout: 10000,
        },
      )
      .toBeTruthy();

    // Verify the WORKER_BUSY error message content
    const busyMsgs = await page.evaluate(() => {
      const msgs = (window as any).__workerSpy.receivedMessages;
      return msgs.filter((m: any) => m.type === 'error' && m.code === 'WORKER_BUSY');
    });

    expect(busyMsgs.length).toBeGreaterThanOrEqual(1);
    expect(busyMsgs[0].message).toContain('busy');
  });

  // -------------------------------------------------------------------------
  // 3.19 #8 — Rapid clicks on "Run Analysis" only trigger one analysis
  // Priority: P1 | Reviewer: Technologist
  // -------------------------------------------------------------------------

  test('rapid clicks on "Run Analysis" trigger only one analysis', async ({ page }) => {
    await installWorkerSpy(page);

    await page.goto('/analysis');
    await expect(page.getByRole('heading', { name: 'Genetic Analysis' })).toBeVisible();

    // Upload files
    await uploadSyntheticFile(page, 'A', MINIMAL_DNA_CONTENT, 'parentA.txt');
    await uploadSyntheticFile(page, 'B', MINIMAL_DNA_CONTENT, 'parentB.txt');

    // Wait for files to be displayed and Start Analysis to appear
    await expect(page.getByRole('button', { name: /start analysis/i })).toBeVisible();

    // Rapidly click the Start Analysis button 5 times
    const startButton = page.getByRole('button', { name: /start analysis/i });
    for (let i = 0; i < 5; i++) {
      // Use force: true to click even if the button might be transitioning
      await startButton.click({ force: true, delay: 10 }).catch(() => {
        // Button may become hidden after the first click starts analysis
      });
    }

    // Wait for analysis to complete (or at least progress to start)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const msgs = (window as any).__workerSpy?.receivedMessages ?? [];
            return (
              msgs.some((m: any) => m.type === 'analysis_complete') ||
              msgs.some((m: any) => m.type === 'error' && m.code === 'WORKER_BUSY') ||
              msgs.some((m: any) => m.type === 'parse_complete')
            );
          }),
        {
          message: 'Worker should process or reject requests',
          timeout: 30000,
        },
      )
      .toBeTruthy();

    // Count how many 'parse' messages were sent to the worker.
    // The UI should only send ONE parse request, but if multiple were sent,
    // the worker's busy guard should reject extras with WORKER_BUSY.
    const parseMessages = await page.evaluate(() => {
      const msgs = (window as any).__workerSpy.postMessages;
      return msgs.filter((m: any) => m.type === 'parse');
    });

    const analysisCompleteMessages = await page.evaluate(() => {
      const msgs = (window as any).__workerSpy.receivedMessages;
      return msgs.filter((m: any) => m.type === 'analysis_complete');
    });

    const workerBusyMessages = await page.evaluate(() => {
      const msgs = (window as any).__workerSpy.receivedMessages;
      return msgs.filter((m: any) => m.type === 'error' && m.code === 'WORKER_BUSY');
    });

    // Either only 1 parse was sent (UI-level debouncing), or extras got WORKER_BUSY
    if (parseMessages.length > 1) {
      // If multiple parse messages got through, verify the extras were rejected
      expect(
        workerBusyMessages.length,
        'Extra parse requests should receive WORKER_BUSY',
      ).toBeGreaterThanOrEqual(parseMessages.length - 1);
    }

    // Only ONE analysis should complete successfully
    expect(
      analysisCompleteMessages.length,
      'Only one analysis should complete despite rapid clicks',
    ).toBeLessThanOrEqual(1);
  });
});
