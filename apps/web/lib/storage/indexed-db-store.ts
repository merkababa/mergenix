/**
 * IndexedDB storage layer for encrypted analysis results.
 *
 * Uses `idb-keyval` with a custom store named "mergenix-results".
 * NEVER stores plaintext health data — only encrypted opaque blobs.
 *
 * Schema versioning: each entry records the `dataVersion` at save time.
 * On load, if the stored version doesn't match `STORAGE_SCHEMA_VERSION`,
 * the entry is treated as stale (returns null) so the UI can prompt re-upload.
 */

import { get, set, del, clear, createStore, entries } from 'idb-keyval';

// ── Schema Version ─────────────────────────────────────────────────────────

/** Current storage schema version. Bump this when the encrypted envelope format changes. */
export const STORAGE_SCHEMA_VERSION = '1';

// ── Custom Store ───────────────────────────────────────────────────────────

/**
 * Custom idb-keyval store.
 * Database: "mergenix-results-db", Object Store: "mergenix-results"
 */
const resultsStore = createStore('mergenix-results-db', 'mergenix-results');

// ── Types ──────────────────────────────────────────────────────────────────

/** Full stored entry (internal representation in IndexedDB). */
interface StoredEntry {
  resultId: string;
  encryptedEnvelope: string;
  dataVersion: string;
  savedAt: string; // ISO 8601
}

/** Result returned from loadAnalysisResult when entry exists and version matches. */
export interface StoredResult {
  resultId: string;
  encryptedEnvelope: string;
  dataVersion: string;
  savedAt: string;
  versionMismatch: false;
}

/** Metadata-only representation returned by listAnalysisResults. */
export interface StoredResultMeta {
  resultId: string;
  dataVersion: string;
  savedAt: string;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Validate that the given string looks like a valid encrypted envelope.
 * An encrypted envelope must be a JSON object containing the fields:
 * version, algorithm, salt, iv, ciphertext.
 * This guard prevents plaintext health data from being stored in IndexedDB.
 */
function validateEncryptedEnvelope(value: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(
      'IndexedDB guard: encryptedEnvelope is not valid JSON — refusing to store plaintext health data.',
    );
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(
      'IndexedDB guard: encryptedEnvelope must be a JSON object — refusing to store plaintext health data.',
    );
  }

  const requiredFields = ['version', 'algorithm', 'salt', 'iv', 'ciphertext'] as const;
  const obj = parsed as Record<string, unknown>;
  const missingFields = requiredFields.filter((field) => !(field in obj));

  if (missingFields.length > 0) {
    throw new Error(
      `IndexedDB guard: encryptedEnvelope is missing required fields [${missingFields.join(', ')}] — refusing to store plaintext health data.`,
    );
  }
}

/**
 * Save an encrypted analysis result to IndexedDB.
 *
 * @param resultId     Unique identifier for the result
 * @param encryptedEnvelope  Opaque encrypted string — NEVER plaintext health data
 * @param dataVersion  Schema version at time of encryption
 *
 * @throws Error if encryptedEnvelope does not look like a valid encrypted envelope.
 */
export async function saveAnalysisResult(
  resultId: string,
  encryptedEnvelope: string,
  dataVersion: string,
): Promise<void> {
  // Runtime guard: reject any value that doesn't have the expected encrypted structure
  validateEncryptedEnvelope(encryptedEnvelope);

  const entry: StoredEntry = {
    resultId,
    encryptedEnvelope,
    dataVersion,
    savedAt: new Date().toISOString(),
  };
  await set(resultId, entry, resultsStore);
}

/**
 * Load an encrypted analysis result from IndexedDB.
 *
 * Returns `null` in two cases:
 * 1. The resultId does not exist.
 * 2. The stored `dataVersion` does not match `STORAGE_SCHEMA_VERSION` (version mismatch).
 *
 * When there is a version mismatch, the UI layer should prompt the user to re-upload.
 */
export async function loadAnalysisResult(resultId: string): Promise<StoredResult | null> {
  const entry = await get<StoredEntry>(resultId, resultsStore);

  if (!entry) {
    return null;
  }

  // Version mismatch — data is stale
  if (entry.dataVersion !== STORAGE_SCHEMA_VERSION) {
    return null;
  }

  return {
    resultId: entry.resultId,
    encryptedEnvelope: entry.encryptedEnvelope,
    dataVersion: entry.dataVersion,
    savedAt: entry.savedAt,
    versionMismatch: false,
  };
}

/**
 * Check if a stored result has a version mismatch without loading the full envelope.
 * Returns `true` if the entry exists but its version differs from current schema.
 * Returns `false` if the entry doesn't exist or versions match.
 */
export async function hasVersionMismatch(resultId: string): Promise<boolean> {
  const entry = await get<StoredEntry>(resultId, resultsStore);
  if (!entry) return false;
  return entry.dataVersion !== STORAGE_SCHEMA_VERSION;
}

/**
 * Delete a stored analysis result from IndexedDB.
 * No-op if the resultId does not exist.
 */
export async function deleteAnalysisResult(resultId: string): Promise<void> {
  await del(resultId, resultsStore);
}

/**
 * List metadata for all stored analysis results.
 * Does NOT return the encrypted envelope — only metadata (resultId, dataVersion, savedAt).
 */
export async function listAnalysisResults(): Promise<StoredResultMeta[]> {
  const allEntries = await entries<string, StoredEntry>(resultsStore);
  return allEntries.map(([, entry]) => ({
    resultId: entry.resultId,
    dataVersion: entry.dataVersion,
    savedAt: entry.savedAt,
  }));
}

/**
 * Remove all stored analysis results from IndexedDB.
 */
export async function clearAllResults(): Promise<void> {
  await clear(resultsStore);
}
