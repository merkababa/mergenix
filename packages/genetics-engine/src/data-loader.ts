/**
 * Lazy data loading — fetch genetic reference data at runtime instead of bundling.
 *
 * This module enables the genetics engine to load large reference data files
 * (carrier panel, trait SNPs, PGx panel, PRS weights, etc.) on demand via
 * network requests rather than bundling them into the initial JavaScript payload.
 *
 * Features:
 * - Versioned URLs for cache busting (e.g., `/data/v1/carrier-panel.json`)
 * - Cache API integration for offline/repeat access
 * - Exponential backoff retry on network failures
 * - Parallel loading of all data files via Promise.all
 * - Typed error handling with DataLoadError
 *
 * This module is designed to run inside a Web Worker context.
 */

import type {
  CarrierPanelEntry,
  CarrierPanelData,
  TraitSnpEntry,
  PgxPanel,
  PrsWeightsData,
  EthnicityFrequenciesData,
  CounselingProviderEntry,
} from '@mergenix/genetics-data';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Version manifest for data files. */
export interface DataManifest {
  /** URL for the carrier panel data. */
  carrierPanel: string;
  /** URL for the trait SNPs data. */
  traitSnps: string;
  /** URL for the pharmacogenomics panel data. */
  pgxPanel: string;
  /** URL for the polygenic risk score weights data. */
  prsWeights: string;
  /** URL for the ethnicity-adjusted frequencies data. */
  ethnicity: string;
  /** URL for the genetic counseling providers data. */
  counselingProviders: string;
}

/** Loaded reference data bundle. */
export interface GeneticsData {
  /** Carrier disease panel entries. */
  carrierPanel: CarrierPanelEntry[];
  /** Trait SNP database entries. */
  traitSnps: TraitSnpEntry[];
  /** Pharmacogenomics panel (genes + drugs). */
  pgxPanel: PgxPanel;
  /** Polygenic risk score weights (conditions + SNPs). */
  prsWeights: PrsWeightsData;
  /** Ethnicity-adjusted carrier frequencies. */
  ethnicity: EthnicityFrequenciesData;
  /** Genetic counseling provider directory. */
  counselingProviders: CounselingProviderEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default data manifest with versioned URLs for cache busting. */
export const DEFAULT_MANIFEST: DataManifest = {
  carrierPanel: '/data/v1/carrier-panel.json',
  traitSnps: '/data/v1/trait-snps.json',
  pgxPanel: '/data/v1/pgx-panel.json',
  prsWeights: '/data/v1/prs-weights.json',
  ethnicity: '/data/v1/ethnicity-frequencies.json',
  counselingProviders: '/data/v1/counseling-providers.json',
};

/** Default maximum retry attempts. */
const DEFAULT_MAX_RETRIES = 3;

/** Base delay for exponential backoff (milliseconds). */
const BASE_RETRY_DELAY_MS = 1000;

/** Cache name used by the Cache API for genetics data. */
const CACHE_NAME = 'mergenix-genetics-data-v1';

// ─── Errors ───────────────────────────────────────────────────────────────────

/** Error thrown when data loading fails after all retries. */
export class DataLoadError extends Error {
  /** The URL that failed to load. */
  public readonly url: string;
  /** The number of fetch attempts made. */
  public readonly attempts: number;
  /** The last error encountered during fetching. */
  public readonly lastError: unknown;

  constructor(url: string, attempts: number, lastError: unknown) {
    super(`Failed to load ${url} after ${attempts} attempts`);
    this.name = 'DataLoadError';
    this.url = url;
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────

/**
 * Check if the Cache API is available in the current context.
 * The Cache API is available in Web Workers (via `caches` global)
 * but may not be present in all environments (e.g., Node.js tests).
 */
function isCacheAvailable(): boolean {
  return typeof caches !== 'undefined';
}

/**
 * Attempt to retrieve a cached response for the given URL.
 * @param url - The URL to look up in the cache.
 * @returns The cached Response, or undefined if not found.
 */
async function getCachedResponse(url: string): Promise<Response | undefined> {
  if (!isCacheAvailable()) return undefined;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    return response ?? undefined;
  } catch {
    // Cache access failure is non-fatal; fall through to network
    return undefined;
  }
}

/**
 * Store a response in the cache for future use.
 * @param url - The URL key for the cached response.
 * @param response - The Response object to cache.
 */
async function cacheResponse(url: string, response: Response): Promise<void> {
  if (!isCacheAvailable()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, response);
  } catch {
    // Cache write failure is non-fatal; data was already fetched successfully
  }
}

/**
 * Delete the entire genetics data cache.
 *
 * Useful for forcing a fresh download of all reference data (e.g., after a
 * data version bump or to free storage). Safe to call when the Cache API is
 * unavailable — returns false in that case.
 *
 * @returns true if the cache was successfully deleted, false otherwise.
 */
export async function clearReferenceCache(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  return caches.delete(CACHE_NAME);
}

// ─── Fetch with Retry ─────────────────────────────────────────────────────────

/**
 * Fetch a single data file with exponential backoff retry.
 *
 * Strategy:
 * 1. Check the Cache API for a cached response (if available).
 * 2. On cache miss, fetch from the network.
 * 3. On network failure, retry with exponential backoff (1s, 2s, 4s, ...).
 * 4. On success, cache the response for future use.
 * 5. On final failure, throw a DataLoadError with the URL, attempt count, and last error.
 *
 * @typeParam T - The expected parsed JSON type.
 * @param url - Versioned URL to fetch (e.g., '/data/v1/carrier-panel.json').
 * @param maxRetries - Maximum retry attempts (default: 3).
 * @returns Parsed JSON data of type T.
 * @throws DataLoadError if all attempts fail.
 */
export async function fetchWithRetry<T>(
  url: string,
  maxRetries: number = DEFAULT_MAX_RETRIES,
): Promise<T> {
  // 0. Reject absolute / external URLs — data must come from the same origin
  if (url.startsWith('http') || url.startsWith('//')) {
    throw new DataLoadError(url, 0, new Error('External URLs not permitted'));
  }

  // 1. Try cache first
  const cachedResponse = await getCachedResponse(url);
  if (cachedResponse) {
    return cachedResponse.json() as Promise<T>;
  }

  // 2. Fetch from network with retries
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`);
      }

      // Clone the response before reading the body — one clone goes to cache,
      // the other is parsed as JSON for the caller.
      const responseForCache = response.clone();
      const data = (await response.json()) as T;

      // 3. Cache the successful response (fire-and-forget, non-blocking)
      void cacheResponse(url, responseForCache);

      return data;
    } catch (error: unknown) {
      lastError = error;

      // Don't delay after the last attempt
      if (attempt < maxRetries) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw new DataLoadError(url, maxRetries, lastError);
}

// ─── Load All Data ────────────────────────────────────────────────────────────

/**
 * Load all genetic reference data in parallel.
 *
 * Uses Promise.all for maximum parallelism. Each individual file uses
 * fetchWithRetry for resilience. Caches results via the Cache API with
 * versioned URLs so subsequent loads are near-instant.
 *
 * @param manifest - Data file manifest (defaults to DEFAULT_MANIFEST).
 * @returns Complete GeneticsData bundle with all reference data.
 * @throws DataLoadError if any individual data file fails to load.
 */
export async function loadAllData(manifest?: DataManifest): Promise<GeneticsData> {
  const m = manifest ?? DEFAULT_MANIFEST;

  const [
    carrierPanel,
    traitSnps,
    pgxPanel,
    prsWeights,
    ethnicity,
    counselingProviders,
  ] = await Promise.all([
    fetchWithRetry<CarrierPanelEntry[] | CarrierPanelData>(m.carrierPanel).then(
      (raw) => {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object' && 'entries' in raw && Array.isArray(raw.entries)) {
          return raw.entries;
        }
        throw new DataLoadError(m.carrierPanel, 1, new Error('Invalid carrier panel format: expected array or {entries: [...]}'));
      },
    ),
    fetchWithRetry<TraitSnpEntry[]>(m.traitSnps),
    fetchWithRetry<PgxPanel>(m.pgxPanel),
    fetchWithRetry<PrsWeightsData>(m.prsWeights),
    fetchWithRetry<EthnicityFrequenciesData>(m.ethnicity),
    fetchWithRetry<CounselingProviderEntry[]>(m.counselingProviders),
  ]);

  return {
    carrierPanel,
    traitSnps,
    pgxPanel,
    prsWeights,
    ethnicity,
    counselingProviders,
  };
}

// ─── Cached Versions ──────────────────────────────────────────────────────────

/**
 * Get the data versions currently cached.
 *
 * Checks the Cache API for each data file URL in the default manifest.
 * Returns a map of data name to cached URL (the version is embedded in the URL path).
 * Used by the init_complete response to report loaded data versions.
 *
 * @returns Record mapping data name to cached URL, or empty object if Cache API unavailable.
 */
export async function getCachedVersions(): Promise<Record<string, string>> {
  if (!isCacheAvailable()) return {};

  const versions: Record<string, string> = {};

  try {
    const cache = await caches.open(CACHE_NAME);
    const entries = Object.entries(DEFAULT_MANIFEST) as [keyof DataManifest, string][];

    for (const [name, url] of entries) {
      const response = await cache.match(url);
      if (response) {
        versions[name] = url;
      }
    }
  } catch {
    // Cache access failure — return whatever we have so far
  }

  return versions;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Sleep for a given number of milliseconds.
 * @param ms - Duration in milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
