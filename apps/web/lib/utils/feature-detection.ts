/**
 * Browser Feature Detection utilities.
 *
 * Each function performs a runtime capability check and returns a boolean.
 * These are used to gracefully degrade or surface a clear error message when
 * a required browser API is missing.
 *
 * Rules:
 *  - No throwing — every function returns boolean.
 *  - No side effects — pure detection only.
 *  - Defensive: access via optional chaining / typeof guards.
 *  - Testable in jsdom: functions that cannot be simulated in jsdom are
 *    documented as requiring a real browser environment.
 *
 * Usage:
 *   import { detectFeatures } from '@/lib/utils/feature-detection';
 *   const features = detectFeatures();
 *   if (!features.webWorker) showError('Your browser does not support Web Workers.');
 */

// ─── Individual Feature Detectors ────────────────────────────────────────────

/**
 * Detect Web Worker support.
 * Required for all genetics analysis (runs in a worker thread).
 */
export function detectWebWorker(): boolean {
  return typeof globalThis.Worker !== "undefined";
}

/**
 * Detect Transferable objects (ArrayBuffer).
 * Required for zero-copy transfer of genotype data to the worker.
 *
 * Detection strategy: check that ArrayBuffer is available. The postMessage
 * transfer mechanism (Transferable semantics) works on any ArrayBuffer in
 * all browsers that support Web Workers — no additional API is required.
 *
 * Note: `ArrayBuffer.prototype.transfer` is a newer standalone method
 * (Stage 4 / Chrome 114+) that is NOT needed for postMessage-based zero-copy
 * transfers. Checking for it would incorrectly exclude older browsers (e.g.,
 * Firefox < 122, Safari < 17.4) that fully support transferable ArrayBuffers
 * via `Worker.postMessage(buffer, [buffer])`.
 */
export function detectTransferableArrayBuffer(): boolean {
  return typeof ArrayBuffer !== "undefined";
}

/**
 * Detect TextDecoder support.
 * Required for decoding genetic file content from ArrayBuffers.
 */
export function detectTextDecoder(): boolean {
  return typeof TextDecoder !== "undefined";
}

/**
 * Detect TextEncoder support.
 * Required for encoding strings before encryption.
 */
export function detectTextEncoder(): boolean {
  return typeof TextEncoder !== "undefined";
}

/**
 * Detect DecompressionStream support.
 * Required for client-side decompression of .gz and .zip DNA files.
 *
 * Note: Not available in all browsers (missing in some older Safari/Firefox).
 * The app gracefully falls back to a WASM decompressor when absent.
 */
export function detectDecompressionStream(): boolean {
  return typeof globalThis.DecompressionStream !== "undefined";
}

/**
 * Detect Web Crypto subtle API.
 * Required for AES-256-GCM encryption (Stream B3) and SHA-256 hashing.
 */
export function detectCryptoSubtle(): boolean {
  return (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.subtle !== "undefined"
  );
}

/**
 * Detect IndexedDB support.
 * Required for client-side encrypted result storage.
 */
export function detectIndexedDB(): boolean {
  return (
    typeof globalThis.indexedDB !== "undefined" ||
    // Vendor-prefixed fallbacks for older browsers
    typeof (globalThis as Record<string, unknown>).webkitIndexedDB !== "undefined" ||
    typeof (globalThis as Record<string, unknown>).mozIndexedDB !== "undefined"
  );
}

// ─── Aggregate Detection ──────────────────────────────────────────────────────

/**
 * Complete feature detection result for all required browser APIs.
 */
export interface FeatureDetectionResult {
  /** Web Worker API is available. */
  webWorker: boolean;
  /** ArrayBuffer / Transferable objects are available. */
  transferableArrayBuffer: boolean;
  /** TextDecoder API is available. */
  textDecoder: boolean;
  /** TextEncoder API is available. */
  textEncoder: boolean;
  /** DecompressionStream API is available (optional — fallback exists). */
  decompressionStream: boolean;
  /** crypto.subtle API is available. */
  cryptoSubtle: boolean;
  /** IndexedDB API is available. */
  indexedDB: boolean;
  /** True when all REQUIRED features (all except decompressionStream) are present. */
  allRequiredFeaturesPresent: boolean;
}

/**
 * Run all feature detectors and return a combined result.
 *
 * `decompressionStream` is NOT required — the engine has a WASM fallback.
 * All other features are required for full functionality.
 */
export function detectFeatures(): FeatureDetectionResult {
  const webWorker = detectWebWorker();
  const transferableArrayBuffer = detectTransferableArrayBuffer();
  const textDecoder = detectTextDecoder();
  const textEncoder = detectTextEncoder();
  const decompressionStream = detectDecompressionStream();
  const cryptoSubtle = detectCryptoSubtle();
  const indexedDB = detectIndexedDB();

  const allRequiredFeaturesPresent =
    webWorker &&
    transferableArrayBuffer &&
    textDecoder &&
    textEncoder &&
    cryptoSubtle &&
    indexedDB;

  return {
    webWorker,
    transferableArrayBuffer,
    textDecoder,
    textEncoder,
    decompressionStream,
    cryptoSubtle,
    indexedDB,
    allRequiredFeaturesPresent,
  };
}

// ─── User-Facing Messages ─────────────────────────────────────────────────────

/**
 * Maps a missing feature key to a user-facing message.
 * The message explains what is missing and what the user can do.
 */
export const MISSING_FEATURE_MESSAGES: Record<
  keyof Omit<FeatureDetectionResult, "allRequiredFeaturesPresent" | "decompressionStream">,
  string
> = {
  webWorker:
    "Your browser does not support Web Workers. Please use a modern browser (Chrome 80+, Firefox 79+, Safari 14+) to run the genetics analysis.",
  transferableArrayBuffer:
    "Your browser does not support ArrayBuffer. Please use a modern browser to process DNA files.",
  textDecoder:
    "Your browser does not support TextDecoder. Please use a modern browser to read DNA file content.",
  textEncoder:
    "Your browser does not support TextEncoder. Please use a modern browser to process your data.",
  cryptoSubtle:
    "Your browser does not support the Web Crypto API. Encrypted storage requires a modern browser with HTTPS.",
  indexedDB:
    "Your browser does not support IndexedDB. Result saving requires a modern browser with storage access.",
};

/**
 * Return a list of user-facing warning messages for any missing required features.
 * Returns an empty array when all required features are present.
 */
export function getMissingFeatureMessages(
  features: FeatureDetectionResult,
): string[] {
  const messages: string[] = [];

  for (const [key, message] of Object.entries(MISSING_FEATURE_MESSAGES)) {
    const featureKey = key as keyof typeof MISSING_FEATURE_MESSAGES;
    if (!features[featureKey]) {
      messages.push(message);
    }
  }

  return messages;
}
