/// <reference lib="webworker" />
/**
 * Web Worker Entry Point for the Genetics Engine
 *
 * This module is the entry point for the Web Worker that runs the genetics
 * analysis engine in a background thread. It receives messages from the
 * main thread, routes them to the appropriate engine functions, and sends
 * results and progress updates back.
 *
 * Message flow:
 * 1. Main thread sends WorkerRequest (parse, analyze, or cancel)
 * 2. Worker processes the request, sending progress updates
 * 3. Worker sends WorkerResponse with results or error
 *
 * The worker supports cancellation: if a "cancel" message arrives during
 * processing, the current operation is aborted and an acknowledgement is sent.
 *
 * Usage (from the main thread):
 * ```typescript
 * const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
 * worker.postMessage({ type: 'parse', files: [{ name: 'parent1.txt', content: '...' }] });
 * worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
 *   switch (event.data.type) {
 *     case 'parse_progress': // Update UI progress bar
 *     case 'parse_complete': // Show results
 *     case 'analysis_complete': // Display full analysis
 *     case 'error': // Show error message
 *   }
 * };
 * ```
 */

import type {
  WorkerRequest,
  WorkerResponse,
  GenotypeMap,
  FileFormat,
  ParseResultSummary,
  FullAnalysisResult,
  Tier,
  Population,
} from './types';

import { parseGeneticFile, buildParseResultSummary } from './parser';
import { analyzeCarrierRisk } from './carrier';
import { predictAllTraits } from './traits';
import { analyzePgx } from './pgx';
import { analyzePrs } from './prs';
import { generateReferralSummary } from './counseling';
import {
  carrierPanel,
  traitSnps,
  pgxPanel,
  prsWeights,
} from '@mergenix/genetics-data';

// ─── Worker State ───────────────────────────────────────────────────────────

/** Flag to indicate if a cancellation has been requested. */
let cancelRequested = false;

/** Flag to indicate the worker is currently processing a request. */
let busy = false;

/** Parsed genotype maps stored after parsing, indexed by file order. */
let parsedGenotypes: GenotypeMap[] = [];

/** Detected file formats stored after parsing, indexed by file order. */
let parsedFormats: FileFormat[] = [];

/** Engine version string for metadata. */
const ENGINE_VERSION = '3.0.0';

/**
 * Check if a record has at least one own property.
 * O(1) early-exit alternative to `Object.keys(obj).length > 0`.
 */
function isNonEmpty(obj: Record<string, unknown>): boolean {
  for (const _ in obj) return true;
  return false;
}

/**
 * Count object keys in O(n) without materializing the key array.
 *
 * `Object.keys(obj).length` allocates an array of all keys just to read
 * its `.length`.  This helper iterates with `for...in` instead, which
 * avoids that allocation.
 */
function countKeys(obj: Record<string, unknown>): number {
  let count = 0;
  for (const _ in obj) count++;
  return count;
}

// ─── Message Handler ────────────────────────────────────────────────────────

/**
 * Handle incoming messages from the main thread.
 *
 * Routes messages by type to the appropriate handler function.
 *
 * @param event - MessageEvent containing a WorkerRequest
 */
function handleMessage(event: MessageEvent<WorkerRequest>): void {
  const request = event.data;

  switch (request.type) {
    case 'parse':
      void handleParse(request.files).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        postResponse({ type: 'error', message, code: 'PARSE_ERROR' });
      });
      break;

    case 'analyze':
      void handleAnalyze(
        request.parent1Genotypes,
        request.parent2Genotypes,
        request.tier,
        request.population,
      ).catch((err: unknown) => {
        if (err instanceof Error && err.message === 'Cancelled') {
          postResponse({
            type: 'error',
            message: 'Analysis cancelled by user',
            code: 'CANCELLED',
          });
        } else {
          const message = err instanceof Error ? err.message : String(err);
          postResponse({ type: 'error', message, code: 'ANALYSIS_ERROR' });
        }
      });
      break;

    case 'cancel':
      cancelRequested = true;
      // Only acknowledge if the worker is actively processing a request.
      // Avoids false ack when no operation is in progress.
      if (busy) {
        postResponse({
          type: 'error',
          message: 'Cancellation acknowledged',
          code: 'CANCEL_ACK',
        });
      }
      break;

    default:
      postResponse({
        type: 'error',
        message: `Unknown request type: ${(request as { type: string }).type}`,
        code: 'UNKNOWN_REQUEST',
      });
  }
}

// ─── Parse Handler ──────────────────────────────────────────────────────────

/**
 * Handle file parsing requests.
 *
 * For each file in the request:
 * 1. Sends parse_progress with fileIndex and progress (0-100)
 * 2. Calls parseGeneticFile(file.content)
 * 3. Builds ParseResultSummary
 * 4. Stores parsed genotypes for subsequent analysis
 *
 * On completion, sends parse_complete with all summaries.
 *
 * @param files - Array of files with name and content
 */
async function handleParse(
  files: Array<{ name: string; content: string }>,
): Promise<void> {
  if (busy) {
    postResponse({
      type: 'error',
      message: 'Worker is busy processing another request. Please wait.',
      code: 'WORKER_BUSY',
    });
    return;
  }
  busy = true;
  try {
    // Reset stale cancel flag from any previous operation
    cancelRequested = false;

    const summaries: ParseResultSummary[] = [];
    const genotypes: GenotypeMap[] = [];
    const formats: FileFormat[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;

      // Send initial progress for this file
      postResponse({ type: 'parse_progress', fileIndex: i, progress: 0 });

      // Parse the file
      const [genotypeMap, detectedFormat] = parseGeneticFile(file.content);

      // Send mid-parse progress
      postResponse({ type: 'parse_progress', fileIndex: i, progress: 50 });

      // Build summary with actual line count for accurate skippedLines
      // Count newlines efficiently without creating a full string array
      let rawLineCount = 1;
      for (let j = 0; j < file.content.length; j++) {
        if (file.content[j] === '\n') rawLineCount++;
      }
      const summary = buildParseResultSummary(
        genotypeMap,
        detectedFormat,
        { fileName: file.name },
        rawLineCount,
      );

      summaries.push(summary);
      genotypes.push(genotypeMap);
      formats.push(detectedFormat);

      // Send file-complete progress
      postResponse({ type: 'parse_progress', fileIndex: i, progress: 100 });
    }

    // Store parsed data for the analyze step
    parsedGenotypes = genotypes;
    parsedFormats = formats;

    // Send completion with all summaries
    postResponse({ type: 'parse_complete', results: summaries });
  } finally {
    busy = false;
  }
}

// ─── Analyze Handler ────────────────────────────────────────────────────────

/**
 * Handle analysis requests.
 *
 * Runs all analysis stages sequentially with progress reporting
 * and cancellation checks between each stage:
 *
 * Stage 1 (0-30%):  Carrier risk analysis
 * Stage 2 (30-45%): Trait prediction
 * Stage 3 (45-60%): Pharmacogenomics
 * Stage 4 (60-75%): Polygenic risk scores
 * Stage 5 (75-95%): Counseling triage
 * Complete (100%):  Results assembled
 *
 * Uses genotypes from the request parameters. Falls back to stored
 * parsed genotypes if request parameters are empty.
 *
 * @param parent1Genotypes - Parent 1 genotype map from request
 * @param parent2Genotypes - Parent 2 genotype map from request
 * @param tier - Subscription tier
 * @param _population - Optional population for ethnicity adjustment (passed within carrier if applicable)
 */
async function handleAnalyze(
  parent1Genotypes: Record<string, string>,
  parent2Genotypes: Record<string, string>,
  tier: Tier,
  _population?: Population,
): Promise<void> {
  if (busy) {
    postResponse({
      type: 'error',
      message: 'Worker is busy processing another request. Please wait.',
      code: 'WORKER_BUSY',
    });
    return;
  }
  busy = true;
  try {
    // Reset cancellation flag
    cancelRequested = false;

    // Determine genotype sources: use request params, fall back to parsed data
    const parent1: GenotypeMap =
      isNonEmpty(parent1Genotypes)
        ? parent1Genotypes
        : (parsedGenotypes[0] ?? {});
    const parent2: GenotypeMap =
      isNonEmpty(parent2Genotypes)
        ? parent2Genotypes
        : (parsedGenotypes[1] ?? {});

    // Validate we have data to work with
    if (!isNonEmpty(parent1) || !isNonEmpty(parent2)) {
      postResponse({
        type: 'error',
        message: 'Missing genotype data for one or both parents. Parse files first or provide genotypes.',
        code: 'MISSING_DATA',
      });
      return;
    }

    // ── Stage 1: Carrier Risk Analysis (0-30%) ──
    postResponse({
      type: 'analysis_progress',
      stage: 'carrier_analysis',
      progress: 0,
    });

    const carrierResults = analyzeCarrierRisk(parent1, parent2, carrierPanel, tier);

    postResponse({
      type: 'analysis_progress',
      stage: 'carrier_analysis',
      progress: 30,
    });

    checkCancellation();

    // ── Stage 2: Trait Prediction (30-45%) ──
    postResponse({
      type: 'analysis_progress',
      stage: 'trait_prediction',
      progress: 30,
    });

    const traitResults = predictAllTraits(parent1, parent2, traitSnps, tier);

    postResponse({
      type: 'analysis_progress',
      stage: 'trait_prediction',
      progress: 45,
    });

    checkCancellation();

    // ── Stage 3: Pharmacogenomics (45-60%) ──
    postResponse({
      type: 'analysis_progress',
      stage: 'pharmacogenomics',
      progress: 45,
    });

    const pgxResults = analyzePgx(parent1, parent2, pgxPanel, tier);

    postResponse({
      type: 'analysis_progress',
      stage: 'pharmacogenomics',
      progress: 60,
    });

    checkCancellation();

    // ── Stage 4: Polygenic Risk Scores (60-75%) ──
    postResponse({
      type: 'analysis_progress',
      stage: 'polygenic_risk',
      progress: 60,
    });

    const prsResults = analyzePrs(parent1, parent2, prsWeights, tier);

    postResponse({
      type: 'analysis_progress',
      stage: 'polygenic_risk',
      progress: 75,
    });

    checkCancellation();

    // ── Stage 5: Counseling Triage (75-95%) ──
    postResponse({
      type: 'analysis_progress',
      stage: 'counseling_triage',
      progress: 75,
    });

    // Extract PRS data for counseling triage
    const prsForCounseling = Object.values(prsResults.conditions).map(c => ({
      percentile: c.offspring.expectedPercentile,
      trait: c.name,
    }));

    // Extract actionable PGx findings for counseling — only non-normal metabolizers
    // are clinically actionable. Include both parents' results.
    const pgxForCounseling: Array<{ actionable: boolean; drug: string }> = [];
    for (const geneResult of Object.values(pgxResults.results)) {
      const parentAStatus = geneResult.parentA.metabolizerStatus.status;
      const parentBStatus = geneResult.parentB.metabolizerStatus.status;
      const isActionable =
        parentAStatus !== 'normal_metabolizer' ||
        parentBStatus !== 'normal_metabolizer';
      if (isActionable) {
        // Collect unique drugs from both parents' non-normal recommendations
        const drugs = new Set<string>();
        for (const rec of geneResult.parentA.drugRecommendations) {
          drugs.add(rec.drug);
        }
        for (const rec of geneResult.parentB.drugRecommendations) {
          drugs.add(rec.drug);
        }
        for (const drug of drugs) {
          pgxForCounseling.push({ actionable: true, drug });
        }
      }
    }
    const counselingResults = generateReferralSummary(
      carrierResults,
      tier,
      undefined,
      prsForCounseling,
      pgxForCounseling,
    );

    postResponse({
      type: 'analysis_progress',
      stage: 'counseling_triage',
      progress: 95,
    });

    checkCancellation();

    // ── Assemble Full Result ──
    const parent1Format: FileFormat = parsedFormats[0] ?? 'unknown';
    const parent2Format: FileFormat = parsedFormats[1] ?? 'unknown';

    const fullResult: FullAnalysisResult = {
      carrier: carrierResults,
      traits: traitResults,
      pgx: pgxResults,
      prs: prsResults,
      counseling: counselingResults,
      metadata: {
        parent1Format,
        parent2Format,
        parent1SnpCount: countKeys(parent1),
        parent2SnpCount: countKeys(parent2),
        analysisTimestamp: new Date().toISOString(),
        engineVersion: ENGINE_VERSION,
        tier,
      },
    };

    postResponse({
      type: 'analysis_progress',
      stage: 'complete',
      progress: 100,
    });

    postResponse({ type: 'analysis_complete', results: fullResult });

    // Clear parsed state to free memory after analysis
    parsedGenotypes = [];
    parsedFormats = [];
  } finally {
    busy = false;
  }
}

// ─── Response Helper ────────────────────────────────────────────────────────

/**
 * Post a typed response back to the main thread.
 *
 * @param response - WorkerResponse to send
 */
function postResponse(response: WorkerResponse): void {
  // eslint-disable-next-line no-restricted-globals
  self.postMessage(response);
}

/**
 * Check if cancellation has been requested and throw if so.
 *
 * Call this between processing stages to support cancellation.
 *
 * @throws Error with message "Cancelled" if cancellation was requested
 */
function checkCancellation(): void {
  if (cancelRequested) {
    cancelRequested = false;
    throw new Error('Cancelled');
  }
}

// ─── Worker Registration ────────────────────────────────────────────────────

// Register the message handler.
// eslint-disable-next-line no-restricted-globals
self.addEventListener('message', handleMessage);
