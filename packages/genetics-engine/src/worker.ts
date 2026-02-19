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
 * 1. Main thread sends WorkerRequest (parse, analyze, cancel, or clear_memory)
 * 2. Worker processes the request, sending progress updates
 * 3. Worker sends WorkerResponse with results or error
 *
 * The worker supports cancellation: if a "cancel" message arrives during
 * processing, the current operation is aborted and an acknowledgement is sent.
 *
 * Security: After analysis completes, all raw DNA data is explicitly cleared
 * from worker memory via clearSensitiveMemory(). The main thread can also
 * trigger this explicitly by sending a "clear_memory" message.
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
 *     case 'memory_cleared': // Sensitive data wiped
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

import type {
  WorkerConfig,
  CoverageMetrics,
  GenomeBuild,
} from '@mergenix/shared-types';

import {
  parseGeneticFile,
  buildParseResultSummary,
  iterateStreamLines,
  detectFormatFromStream,
  chainIterators,
  parseStreaming,
} from './parser';
import { decompress } from './decompression';
import { ProgressReporter } from './progress';
import { analyzeCarrierRisk } from './carrier';
import { predictAllTraits } from './traits';
import { analyzePgx } from './pgx';
import { analyzePrs } from './prs';
import { generateReferralSummary } from './counseling';
import { loadAllData } from './data-loader';
import type { GeneticsData } from './data-loader';
import { MemoryGovernor, detectDevice } from './device';
import { calculateCoverageMetrics } from './coverage';
import { detectChipVersion, ENGINE_VERSION } from './chip-detection';

// ─── Worker State ───────────────────────────────────────────────────────────

/** Flag to indicate if a cancellation has been requested. */
let cancelRequested = false;

/** Flag to indicate the worker is currently processing a request. */
let busy = false;

/** Parsed genotype maps stored after parsing, indexed by file order. */
let parsedGenotypes: GenotypeMap[] = [];

/** Detected file formats stored after parsing, indexed by file order. */
let parsedFormats: FileFormat[] = [];

/** Lazily loaded genetics reference data (carrier panel, traits, PGx, PRS, etc.). */
let geneticsData: GeneticsData | null = null;

/** Memory governor instance, created during init. */
let governor: MemoryGovernor | null = null;

/** Worker configuration, set by the `init` message. */
let workerConfig: WorkerConfig = {
  maxMemory: 500 * 1024 * 1024,
  sequential: false,
  maxCompressionRatio: 100,
  decompressionTimeout: 30000,
};

/**
 * Progress reporter instance that throttles postMessage calls.
 * Created once and reused across operations.
 */
const progressReporter = new ProgressReporter((event) => {
  postResponse({
    type: 'analysis_progress',
    stage: event.stage,
    progress: event.progress,
    displayName: event.displayName,
  });
});

/**
 * Check if a record has at least one own property.
 */
function isNonEmpty(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length > 0;
}

/**
 * Count the number of own enumerable keys on an object.
 */
function countKeys(obj: Record<string, unknown>): number {
  return Object.keys(obj).length;
}

// ─── Sensitive Memory Clearing ──────────────────────────────────────────────

/**
 * Wipe all genotype keys from a GenotypeMap (Record<string, string>).
 *
 * Unlike simply reassigning the variable, this explicitly deletes every key
 * from the object, ensuring that any remaining references to the same object
 * will see an empty record. This is a defense-in-depth measure — even if a
 * closure or cached reference holds the old object, the DNA data is gone.
 *
 * @param map - The genotype map to wipe
 */
function wipeGenotypeMap(map: GenotypeMap): void {
  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i++) {
    delete map[keys[i]!];
  }
}

/**
 * Clear all sensitive genetic data from worker memory.
 *
 * SECURITY: This function must be called after analysis completes, on
 * cancellation, or when explicitly requested by the main thread. Genetic
 * data must not linger in worker memory after it is no longer needed.
 *
 * The function performs the following:
 * 1. Wipes all keys from each GenotypeMap in parsedGenotypes (defense-in-depth)
 * 2. Resets parsedGenotypes to an empty array
 * 3. Resets parsedFormats to an empty array
 * 4. Nulls the geneticsData reference (carrier panel, trait SNPs, PGx, PRS)
 * 5. Resets and nulls the memory governor
 *
 * Safe to call multiple times — idempotent by design.
 */
export function clearSensitiveMemory(): void {
  // Wipe each genotype map's keys before releasing the array reference.
  // This ensures that even if another reference to one of these objects
  // exists (e.g., in a closure), the raw DNA data has been scrubbed.
  for (let i = 0; i < parsedGenotypes.length; i++) {
    wipeGenotypeMap(parsedGenotypes[i]!);
  }
  parsedGenotypes = [];

  // Clear parsed file format metadata
  parsedFormats = [];

  // Null out the loaded genetics reference data (carrier panel, traits,
  // PGx panel, PRS weights, ethnicity data, counseling providers).
  // This allows the GC to reclaim potentially large reference datasets.
  geneticsData = null;

  // Reset and null the memory governor
  if (governor) {
    governor.reset();
    governor = null;
  }
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

    case 'parse_stream':
      void handleParseStream(request.file, request.format).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        postResponse({ type: 'error', message, code: 'PARSE_STREAM_ERROR' });
      });
      break;

    case 'decompress':
      void handleDecompress(request.file, request.maxSize).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        postResponse({ type: 'error', message, code: 'DECOMPRESS_ERROR' });
      });
      break;

    case 'init':
      handleInit(request.config);
      break;

    case 'cancel':
      cancelRequested = true;
      // Clear sensitive memory immediately on cancel — DNA data should not
      // linger even if the worker is between operations.
      clearSensitiveMemory();
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

    case 'clear_memory':
      clearSensitiveMemory();
      postResponse({ type: 'memory_cleared' });
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
    if (governor) governor.reset();

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

      // Check memory governor before storing parsed genotypes
      const snpCount = countKeys(genotypeMap);
      const estimatedSize = snpCount * 100; // ~100 bytes per genotype entry
      if (governor && !governor.canAllocate(estimatedSize)) {
        postResponse({
          type: 'memory_warning',
          currentUsage: governor.getStats().currentUsage,
          maxAllowed: governor.getStats().maxMemory,
          message: `Parsed genotype data for ${file.name} (${snpCount} SNPs, ~${Math.round(estimatedSize / 1024 / 1024)}MB) may exceed device memory limits.`,
        });
      }
      if (governor) {
        governor.recordAllocation(estimatedSize);
      }

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
 * SECURITY: After posting results, clearSensitiveMemory() is called to
 * wipe all raw DNA data from worker memory.
 *
 * @param parent1Genotypes - Parent 1 genotype map from request
 * @param parent2Genotypes - Parent 2 genotype map from request
 * @param tier - Pricing tier
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

    // Lazily load genetics reference data on first analysis
    if (!geneticsData) {
      geneticsData = await loadAllData();
    }

    // ── Stage 1: Carrier Risk Analysis (0-30%) ──
    progressReporter.forceReport('carrier_analysis', 0, 'Starting carrier analysis');

    const carrierResults = analyzeCarrierRisk(parent1, parent2, geneticsData.carrierPanel, tier);

    progressReporter.forceReport('carrier_analysis', 30, 'Carrier analysis complete');

    // Yield to the event loop so cancel messages and progress events can be processed
    await yieldToEventLoop();
    checkCancellation();

    // ── Stage 2: Trait Prediction (30-45%) ──
    progressReporter.forceReport('trait_prediction', 30, 'Starting trait prediction');

    const traitResults = predictAllTraits(parent1, parent2, geneticsData.traitSnps, tier);

    progressReporter.forceReport('trait_prediction', 45, 'Trait prediction complete');

    await yieldToEventLoop();
    checkCancellation();

    // ── Stage 3: Pharmacogenomics (45-60%) ──
    progressReporter.forceReport('pharmacogenomics', 45, 'Starting pharmacogenomics');

    const pgxResults = analyzePgx(parent1, parent2, geneticsData.pgxPanel, tier);

    progressReporter.forceReport('pharmacogenomics', 60, 'Pharmacogenomics complete');

    await yieldToEventLoop();
    checkCancellation();

    // ── Stage 4: Polygenic Risk Scores (60-75%) ──
    progressReporter.forceReport('polygenic_risk', 60, 'Starting polygenic risk scores');

    const prsResults = analyzePrs(parent1, parent2, geneticsData.prsWeights, tier);

    progressReporter.forceReport('polygenic_risk', 75, 'Polygenic risk scores complete');

    await yieldToEventLoop();
    checkCancellation();

    // ── Stage 5: Counseling Triage (75-95%) ──
    progressReporter.forceReport('counseling_triage', 75, 'Starting counseling triage');

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

    progressReporter.forceReport('counseling_triage', 95, 'Counseling triage complete');

    await yieldToEventLoop();
    checkCancellation();

    // ── Assemble Full Result ──
    const parent1Format: FileFormat = parsedFormats[0] ?? 'unknown';
    const parent2Format: FileFormat = parsedFormats[1] ?? 'unknown';

    // Calculate real coverage metrics using the carrier panel and parent 1 genotypes
    const coverageMetrics: CoverageMetrics = calculateCoverageMetrics(
      geneticsData.carrierPanel,
      parent1,
    );

    // Default genome build — build-detection.ts is implemented but requires
    // header lines and SNP positions not available at analysis time; default to GRCh37
    const genomeBuild: GenomeBuild = 'GRCh37';

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
      coupleMode: isNonEmpty(parent2),
      coverageMetrics,
      chipVersion: detectChipVersion(parent1Format, countKeys(parent1), parent1),
      genomeBuild,
    };

    progressReporter.forceReport('complete', 100, 'Analysis complete');

    postResponse({ type: 'analysis_complete', results: fullResult });
  } finally {
    // SECURITY: Clear all sensitive genetic data from worker memory after
    // analysis completes — whether successfully or due to an error.
    // clearSensitiveMemory() is idempotent, so this is safe even if
    // cancellation already triggered it.
    clearSensitiveMemory();
    busy = false;
  }
}

// ─── Parse Stream Handler ────────────────────────────────────────────────────

/**
 * Handle streaming file parse requests.
 *
 * Accepts a File or FileSystemFileHandle, reads it as a stream, detects
 * the format, and parses line-by-line without loading the entire file
 * into memory at once.
 *
 * Emits `stream_progress` messages during parsing to report bytes read
 * and lines processed.
 *
 * @param fileRef - Object with name and handle (File or FileSystemFileHandle)
 * @param hintFormat - Optional format hint to skip detection
 */
async function handleParseStream(
  fileRef: { name: string; handle: FileSystemFileHandle | File },
  hintFormat?: FileFormat,
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
    cancelRequested = false;

    // Resolve handle to File
    const file: File =
      fileRef.handle instanceof File
        ? fileRef.handle
        : await (fileRef.handle as FileSystemFileHandle).getFile();

    const totalBytes = file.size;
    const stream = file.stream();

    // Create a line iterator from the stream
    const lines = iterateStreamLines(stream);

    let format: FileFormat;
    let parsingIterator: AsyncGenerator<string>;

    if (hintFormat && hintFormat !== 'unknown') {
      // Use the provided format hint — no need to buffer lines for detection
      format = hintFormat;
      parsingIterator = lines;
    } else {
      // Detect format from the first lines, then chain buffered + remaining
      const detection = await detectFormatFromStream(lines);
      format = detection.format;
      parsingIterator = chainIterators(detection.bufferedLines, lines);
    }

    // Wrap the iterator to emit progress events
    let linesProcessed = 0;
    let bytesReadEstimate = 0;

    const progressWrapped = async function* (): AsyncGenerator<string> {
      for await (const line of parsingIterator) {
        // Check cancellation so large files can be aborted mid-parse
        checkCancellation();

        linesProcessed++;
        bytesReadEstimate += line.length + 1; // +1 for newline

        // Emit stream_progress periodically (every 10000 lines)
        if (linesProcessed % 10000 === 0) {
          postResponse({
            type: 'stream_progress',
            bytesRead: Math.min(bytesReadEstimate, totalBytes),
            totalBytes,
            linesProcessed,
          });
        }

        yield line;
      }
    };

    const genotypes = await parseStreaming(progressWrapped(), format);

    // Final progress
    postResponse({
      type: 'stream_progress',
      bytesRead: totalBytes,
      totalBytes,
      linesProcessed,
    });

    // Store results
    const genotypeCount = countKeys(genotypes);

    // Estimate memory usage for the parsed genotypes (~100 bytes per entry as a rough estimate)
    const estimatedSize = genotypeCount * 100;
    if (governor && !governor.canAllocate(estimatedSize)) {
      postResponse({
        type: 'memory_warning',
        currentUsage: governor.getStats().currentUsage,
        maxAllowed: governor.getStats().maxMemory,
        message: `Parsed genotype data (${genotypeCount} SNPs, ~${Math.round(estimatedSize / 1024 / 1024)}MB) may exceed device memory limits.`,
      });
    }
    if (governor) {
      governor.recordAllocation(estimatedSize);
    }

    const summary = buildParseResultSummary(
      genotypes,
      format,
      { fileName: fileRef.name },
      linesProcessed,
    );

    parsedGenotypes = [genotypes];
    parsedFormats = [format];

    postResponse({ type: 'parse_complete', results: [summary] });
  } finally {
    busy = false;
  }
}

// ─── Decompress Handler ─────────────────────────────────────────────────────

/**
 * Handle file decompression requests.
 *
 * Decompresses a file using the appropriate method (gzip, zip, or raw passthrough)
 * with security limits enforced (size, ratio, timeout).
 *
 * Emits `decompress_progress` messages during decompression and
 * `decompress_complete` when finished.
 *
 * @param fileRef - Object with the file name (file must be provided via Transferable)
 * @param maxSize - Optional override for maximum decompressed size
 */
async function handleDecompress(
  fileRef: { name: string },
  maxSize?: number,
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
    cancelRequested = false;

    // The `decompress` message type in shared-types only includes `{ name: string }`.
    // The File object must be attached separately when the main thread sends
    // the message. Until that wiring is in place, we respond with a clear error.
    // The decompress() function is ready to be called once a File is available.
    void decompress; // preserve import — used when wiring is complete
    void maxSize;    // preserve parameter — used when wiring is complete
    void fileRef;    // preserve parameter — used when wiring is complete

    postResponse({
      type: 'error',
      message: 'Decompression requires a File object. Use parse_stream with a File handle instead.',
      code: 'DECOMPRESS_ERROR',
    });
  } finally {
    busy = false;
  }
}

// ─── Init Handler ───────────────────────────────────────────────────────────

/**
 * Handle worker initialization requests.
 *
 * Stores the provided configuration and acknowledges with `init_complete`.
 * If no config is provided, uses sensible defaults.
 *
 * @param config - Optional worker configuration overrides
 */
function handleInit(config?: WorkerConfig): void {
  workerConfig = config ?? {
    maxMemory: 500 * 1024 * 1024,
    sequential: false,
    maxCompressionRatio: 100,
    decompressionTimeout: 30000,
  };

  // Detect device capabilities and create memory governor
  const profile = detectDevice();
  governor = new MemoryGovernor(profile.maxProcessingMemory);

  postResponse({
    type: 'init_complete',
    config: workerConfig,
    dataVersions: {}, // populated after first loadAllData() call
  });
}

// ─── Response Helper ────────────────────────────────────────────────────────

/**
 * Post a typed response back to the main thread.
 *
 * In test environments (Node.js), this uses the __test__ response capture
 * mechanism. In production (Web Worker), it calls self.postMessage().
 *
 * @param response - WorkerResponse to send
 */
function postResponse(response: WorkerResponse): void {
  // In test environments, capture responses instead of posting to self
  if (_testResponseCapture) {
    _testResponseCapture.push(response);
    return;
  }
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

// ─── Event Loop Yielding ─────────────────────────────────────────────────────

/**
 * Yield control to the event loop momentarily.
 *
 * Allows the worker to process incoming messages (e.g., cancel requests)
 * and emit progress events between synchronous analysis stages.
 * Uses setTimeout(0) which schedules a microtask after the current
 * macrotask completes, giving the message queue a chance to drain.
 */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

// ─── Worker Registration ────────────────────────────────────────────────────

// Register the message handler.
// Guard for test environments where `self` is not defined (Node.js / Vitest).
// eslint-disable-next-line no-restricted-globals
if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  // eslint-disable-next-line no-restricted-globals
  self.addEventListener('message', handleMessage);
}

// ─── Test Helpers ───────────────────────────────────────────────────────────

/**
 * Internal response capture array for test environments.
 * When non-null, postResponse() pushes to this instead of calling self.postMessage().
 */
let _testResponseCapture: WorkerResponse[] | null = null;

/**
 * Detect whether we are in a production environment.
 *
 * Uses a `typeof` guard to avoid ReferenceError in Web Worker contexts
 * where the Node.js `process` global is not defined. Bundlers (Vite,
 * webpack, esbuild) replace `process.env.NODE_ENV` at build time, making
 * this a dead-code-elimination target that removes the entire __test__
 * block in production builds.
 */
declare const process: { env: { NODE_ENV?: string } } | undefined;
const _isProduction: boolean =
  typeof process !== 'undefined' &&
  process?.env?.NODE_ENV === 'production';

/**
 * Test-only helpers for inspecting and manipulating worker module state.
 *
 * These helpers are only used in unit tests. They provide controlled access
 * to the module-level variables that are normally encapsulated.
 *
 * Guarded behind NODE_ENV check so this object is `undefined` in production.
 * Web Workers are separate entry points and may not be tree-shaken by bundlers,
 * so the explicit guard ensures test helpers never ship to users.
 *
 * @internal
 */
export const __test__ = !_isProduction ? {
  /** Get a snapshot of the current worker state. */
  getState: () => ({
    parsedGenotypes,
    parsedFormats,
    geneticsData,
    governor,
    busy,
    cancelRequested,
  }),

  /** Set parsedGenotypes to a given array. */
  setParsedGenotypes: (genotypes: GenotypeMap[]) => {
    parsedGenotypes = genotypes;
  },

  /** Set parsedFormats to a given array. */
  setParsedFormats: (formats: FileFormat[]) => {
    parsedFormats = formats;
  },

  /** Set geneticsData to a given value. */
  setGeneticsData: (data: GeneticsData | null) => {
    geneticsData = data;
  },

  /**
   * Set the governor. If `create` is true, creates a real MemoryGovernor
   * with a 500MB limit; if false, sets governor to null.
   */
  setGovernor: (create: boolean) => {
    if (create) {
      governor = new MemoryGovernor(500 * 1024 * 1024);
    } else {
      governor = null;
    }
  },

  /** Set the busy flag. */
  setBusy: (value: boolean) => {
    busy = value;
  },

  /**
   * Simulate receiving a message from the main thread.
   * Calls handleMessage with a synthetic MessageEvent.
   */
  simulateMessage: (request: WorkerRequest) => {
    handleMessage({ data: request } as MessageEvent<WorkerRequest>);
  },

  /**
   * Capture responses posted during a callback.
   * Returns the array of responses that were posted during the callback's execution.
   */
  captureResponses: (fn: () => void): WorkerResponse[] => {
    const captured: WorkerResponse[] = [];
    _testResponseCapture = captured;
    try {
      fn();
    } finally {
      _testResponseCapture = null;
    }
    return captured;
  },
} : undefined;
