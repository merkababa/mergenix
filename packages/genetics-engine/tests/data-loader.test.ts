/**
 * Tests for lazy data loading.
 *
 * Tests cover:
 * - fetchWithRetry: cache hit path, cache miss + network success, retry logic
 *   with exponential backoff, error handling (DataLoadError)
 * - loadAllData: parallel loading of all data files
 * - getCachedVersions: cache inspection for version reporting
 * - DataLoadError: error properties and message format
 * - Edge cases: Cache API unavailable, non-JSON responses, HTTP errors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchWithRetry,
  loadAllData,
  getCachedVersions,
  DataLoadError,
  DEFAULT_MANIFEST,
} from '../src/data-loader';
import type { DataManifest } from '../src/data-loader';

// ─── Mock Setup ───────────────────────────────────────────────────────────────

// We need to mock both `fetch` (global) and `caches` (Cache API).

/** Helper to create a mock Response object. */
function createMockResponse(data: unknown, ok = true, status = 200): Response {
  const body = JSON.stringify(data);
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: vi.fn().mockResolvedValue(data),
    clone: vi.fn().mockReturnValue({
      ok,
      status,
      statusText: ok ? 'OK' : 'Internal Server Error',
      json: vi.fn().mockResolvedValue(data),
    }),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    text: vi.fn().mockResolvedValue(body),
    bytes: vi.fn(),
  } as unknown as Response;
}

/** Mock Cache implementation. */
class MockCache {
  private store = new Map<string, Response>();

  async match(url: string): Promise<Response | undefined> {
    return this.store.get(url);
  }

  async put(url: string, response: Response): Promise<void> {
    this.store.set(url, response);
  }

  async delete(url: string): Promise<boolean> {
    return this.store.delete(url);
  }

  /** Get all stored URLs (for testing). */
  keys(): string[] {
    return Array.from(this.store.keys());
  }
}

/** Mock CacheStorage implementation. */
class MockCacheStorage {
  private cacheInstances = new Map<string, MockCache>();

  async open(name: string): Promise<MockCache> {
    if (!this.cacheInstances.has(name)) {
      this.cacheInstances.set(name, new MockCache());
    }
    return this.cacheInstances.get(name)!;
  }

  async has(name: string): Promise<boolean> {
    return this.cacheInstances.has(name);
  }

  /** Get the cache instance for testing. */
  getCache(name: string): MockCache | undefined {
    return this.cacheInstances.get(name);
  }
}

// ─── Test Globals ─────────────────────────────────────────────────────────────

let mockCacheStorage: MockCacheStorage;
let originalCaches: CacheStorage | undefined;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Mock fetch
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);

  // Mock Cache API
  mockCacheStorage = new MockCacheStorage();
  originalCaches = globalThis.caches;
  vi.stubGlobal('caches', mockCacheStorage);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalCaches !== undefined) {
    (globalThis as Record<string, unknown>)['caches'] = originalCaches;
  }
});

// ─── DataLoadError ────────────────────────────────────────────────────────────

describe('DataLoadError', () => {
  it('should set name to "DataLoadError"', () => {
    const error = new DataLoadError('/data/v1/test.json', 3, new Error('timeout'));

    expect(error.name).toBe('DataLoadError');
  });

  it('should format message with URL and attempt count', () => {
    const error = new DataLoadError('/data/v1/carrier-panel.json', 3, new Error('timeout'));

    expect(error.message).toBe('Failed to load /data/v1/carrier-panel.json after 3 attempts');
  });

  it('should store url, attempts, and lastError', () => {
    const originalError = new Error('network failure');
    const error = new DataLoadError('/data/v1/test.json', 5, originalError);

    expect(error.url).toBe('/data/v1/test.json');
    expect(error.attempts).toBe(5);
    expect(error.lastError).toBe(originalError);
  });

  it('should be an instance of Error', () => {
    const error = new DataLoadError('/test', 1, null);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DataLoadError);
  });
});

// ─── DEFAULT_MANIFEST ─────────────────────────────────────────────────────────

describe('DEFAULT_MANIFEST', () => {
  it('should have all required data file URLs', () => {
    expect(DEFAULT_MANIFEST.carrierPanel).toBe('/data/v1/carrier-panel.json');
    expect(DEFAULT_MANIFEST.traitSnps).toBe('/data/v1/trait-snps.json');
    expect(DEFAULT_MANIFEST.pgxPanel).toBe('/data/v1/pgx-panel.json');
    expect(DEFAULT_MANIFEST.prsWeights).toBe('/data/v1/prs-weights.json');
    expect(DEFAULT_MANIFEST.ethnicity).toBe('/data/v1/ethnicity-frequencies.json');
    expect(DEFAULT_MANIFEST.counselingProviders).toBe('/data/v1/counseling-providers.json');
  });

  it('should have versioned URL paths', () => {
    // All URLs should contain a version segment
    for (const url of Object.values(DEFAULT_MANIFEST)) {
      expect(url).toMatch(/\/v\d+\//);
    }
  });
});

// ─── fetchWithRetry ───────────────────────────────────────────────────────────

describe('fetchWithRetry', () => {
  describe('cache hit path', () => {
    it('should return cached data without calling fetch', async () => {
      const testData = [{ rsid: 'rs12345', gene: 'BRCA1' }];

      // Pre-populate cache
      const cache = await mockCacheStorage.open('mergenix-genetics-data-v1');
      await cache.put('/data/v1/test.json', createMockResponse(testData));

      const result = await fetchWithRetry<typeof testData>('/data/v1/test.json');

      expect(result).toEqual(testData);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('cache miss + network success', () => {
    it('should fetch from network on cache miss', async () => {
      const testData = { name: 'test-data' };
      fetchSpy.mockResolvedValueOnce(createMockResponse(testData));

      const result = await fetchWithRetry<typeof testData>('/data/v1/test.json');

      expect(result).toEqual(testData);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('/data/v1/test.json');
    });

    it('should cache successful response', async () => {
      const testData = { name: 'cached-data' };
      fetchSpy.mockResolvedValueOnce(createMockResponse(testData));

      await fetchWithRetry<typeof testData>('/data/v1/test.json');

      // Verify data was cached
      const cache = await mockCacheStorage.open('mergenix-genetics-data-v1');
      const cached = await cache.match('/data/v1/test.json');
      expect(cached).toBeDefined();
    });
  });

  describe('retry logic with exponential backoff', () => {
    /**
     * For retry tests, we mock setTimeout directly to avoid fake timer
     * issues with unhandled promise rejections. The sleep() function
     * in data-loader.ts uses setTimeout, so we intercept it to resolve
     * immediately.
     */
    beforeEach(() => {
      // Make all setTimeout calls resolve immediately (no actual delay)
      vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: TimerHandler) => {
        if (typeof fn === 'function') fn();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      });
    });

    it('should retry on network failure and succeed on second attempt', async () => {
      const testData = { success: true };
      fetchSpy
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockResponse(testData));

      const result = await fetchWithRetry<typeof testData>('/data/v1/test.json', 3);

      expect(result).toEqual(testData);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should retry on HTTP error status and succeed on third attempt', async () => {
      const testData = { success: true };
      fetchSpy
        .mockResolvedValueOnce(createMockResponse(null, false, 500))
        .mockResolvedValueOnce(createMockResponse(null, false, 503))
        .mockResolvedValueOnce(createMockResponse(testData));

      const result = await fetchWithRetry<typeof testData>('/data/v1/test.json', 3);

      expect(result).toEqual(testData);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('should throw DataLoadError after all retries exhausted', async () => {
      fetchSpy.mockRejectedValue(new Error('Persistent network error'));

      await expect(fetchWithRetry('/data/v1/test.json', 3)).rejects.toThrow(DataLoadError);

      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('should throw DataLoadError with message containing URL and attempts', async () => {
      fetchSpy.mockRejectedValue(new Error('Persistent network error'));

      await expect(fetchWithRetry('/data/v1/test.json', 3)).rejects.toThrow(
        'Failed to load /data/v1/test.json after 3 attempts',
      );
    });

    it('should throw DataLoadError with correct properties', async () => {
      const networkError = new Error('DNS failure');
      fetchSpy.mockRejectedValue(networkError);

      try {
        await fetchWithRetry('/data/v1/test.json', 2);
        expect.fail('Should have thrown');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(DataLoadError);
        const dle = error as DataLoadError;
        expect(dle.url).toBe('/data/v1/test.json');
        expect(dle.attempts).toBe(2);
        expect(dle.lastError).toBeInstanceOf(Error);
        expect((dle.lastError as Error).message).toBe('DNS failure');
      }
    });

    it('should use maxRetries = 3 by default', async () => {
      fetchSpy.mockRejectedValue(new Error('fail'));

      await expect(fetchWithRetry('/data/v1/test.json')).rejects.toThrow(DataLoadError);

      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('should work with maxRetries = 1 (no retries)', async () => {
      fetchSpy.mockRejectedValue(new Error('fail'));

      await expect(fetchWithRetry('/data/v1/test.json', 1)).rejects.toThrow(DataLoadError);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should call setTimeout with exponential delays', async () => {
      const setTimeoutSpy = vi.mocked(globalThis.setTimeout);
      fetchSpy.mockRejectedValue(new Error('fail'));

      await expect(fetchWithRetry('/data/v1/test.json', 3)).rejects.toThrow(DataLoadError);

      // Should have called setTimeout twice (between attempt 1->2 and 2->3)
      // No delay after the last (3rd) attempt.
      const delays = setTimeoutSpy.mock.calls.map((call) => call[1]);
      expect(delays[0]).toBe(1000); // 1000 * 2^0 = 1000ms
      expect(delays[1]).toBe(2000); // 1000 * 2^1 = 2000ms
    });
  });

  describe('Cache API unavailable', () => {
    it('should fall through to network when caches is undefined', async () => {
      // Remove Cache API
      vi.stubGlobal('caches', undefined);

      const testData = { from: 'network' };
      fetchSpy.mockResolvedValueOnce(createMockResponse(testData));

      const result = await fetchWithRetry<typeof testData>('/data/v1/test.json');

      expect(result).toEqual(testData);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── loadAllData ──────────────────────────────────────────────────────────────

describe('loadAllData', () => {
  it('should load all data files in parallel', async () => {
    const mockData = {
      carrierPanel: [{ rsid: 'rs1', gene: 'CFTR' }],
      traitSnps: [{ rsid: 'rs2', trait: 'Eye Color' }],
      pgxPanel: { metadata: {}, genes: {} },
      prsWeights: { metadata: {}, conditions: {} },
      ethnicity: { metadata: {}, frequencies: {} },
      counselingProviders: [{ name: 'Dr. Smith' }],
    };

    fetchSpy
      .mockResolvedValueOnce(createMockResponse(mockData.carrierPanel))
      .mockResolvedValueOnce(createMockResponse(mockData.traitSnps))
      .mockResolvedValueOnce(createMockResponse(mockData.pgxPanel))
      .mockResolvedValueOnce(createMockResponse(mockData.prsWeights))
      .mockResolvedValueOnce(createMockResponse(mockData.ethnicity))
      .mockResolvedValueOnce(createMockResponse(mockData.counselingProviders));

    const result = await loadAllData();

    expect(result.carrierPanel).toEqual(mockData.carrierPanel);
    expect(result.traitSnps).toEqual(mockData.traitSnps);
    expect(result.pgxPanel).toEqual(mockData.pgxPanel);
    expect(result.prsWeights).toEqual(mockData.prsWeights);
    expect(result.ethnicity).toEqual(mockData.ethnicity);
    expect(result.counselingProviders).toEqual(mockData.counselingProviders);
    expect(fetchSpy).toHaveBeenCalledTimes(6);
  });

  it('should unwrap carrier panel data in wrapped format', async () => {
    const carrierEntries = [
      {
        rsid: 'rs1',
        gene: 'CFTR',
        condition: 'CF',
        inheritance: 'AR',
        severity: 'severe',
        pathogenic_allele: 'A',
        reference_allele: 'G',
        carrier_frequency: '1/25',
        notes: 'test',
      },
    ];
    const wrappedCarrierPanel = {
      metadata: {
        version: '2.0.0',
        lastUpdated: '2024-01-01',
        totalEntries: 1,
        source: 'test',
        description: 'test',
      },
      entries: carrierEntries,
    };

    const mockData = {
      traitSnps: [{ rsid: 'rs2', trait: 'Eye Color' }],
      pgxPanel: { metadata: {}, genes: {} },
      prsWeights: { metadata: {}, conditions: {} },
      ethnicity: { metadata: {}, frequencies: {} },
      counselingProviders: [{ name: 'Dr. Smith' }],
    };

    fetchSpy
      .mockResolvedValueOnce(createMockResponse(wrappedCarrierPanel))
      .mockResolvedValueOnce(createMockResponse(mockData.traitSnps))
      .mockResolvedValueOnce(createMockResponse(mockData.pgxPanel))
      .mockResolvedValueOnce(createMockResponse(mockData.prsWeights))
      .mockResolvedValueOnce(createMockResponse(mockData.ethnicity))
      .mockResolvedValueOnce(createMockResponse(mockData.counselingProviders));

    const result = await loadAllData();

    // The wrapped format should be unwrapped: result.carrierPanel should be the entries array, not the wrapper
    expect(result.carrierPanel).toEqual(carrierEntries);
    expect(Array.isArray(result.carrierPanel)).toBe(true);
    expect(result.carrierPanel).toHaveLength(1);
    expect(result.carrierPanel[0]).toHaveProperty('rsid', 'rs1');
    // Verify the metadata wrapper is NOT present on the result
    expect(result.carrierPanel).not.toHaveProperty('metadata');
    // Verify it's a plain array, not the wrapped object
    expect((result.carrierPanel as Record<string, unknown>)['metadata']).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(6);
  });

  it('should use default manifest when none provided', async () => {
    const emptyArray: unknown[] = [];

    fetchSpy.mockResolvedValue(createMockResponse(emptyArray));

    await loadAllData();

    expect(fetchSpy).toHaveBeenCalledWith(DEFAULT_MANIFEST.carrierPanel);
    expect(fetchSpy).toHaveBeenCalledWith(DEFAULT_MANIFEST.traitSnps);
    expect(fetchSpy).toHaveBeenCalledWith(DEFAULT_MANIFEST.pgxPanel);
    expect(fetchSpy).toHaveBeenCalledWith(DEFAULT_MANIFEST.prsWeights);
    expect(fetchSpy).toHaveBeenCalledWith(DEFAULT_MANIFEST.ethnicity);
    expect(fetchSpy).toHaveBeenCalledWith(DEFAULT_MANIFEST.counselingProviders);
  });

  it('should use custom manifest when provided', async () => {
    const customManifest: DataManifest = {
      carrierPanel: '/custom/carrier.json',
      traitSnps: '/custom/traits.json',
      pgxPanel: '/custom/pgx.json',
      prsWeights: '/custom/prs.json',
      ethnicity: '/custom/ethnicity.json',
      counselingProviders: '/custom/counseling.json',
    };

    fetchSpy.mockResolvedValue(createMockResponse([]));

    await loadAllData(customManifest);

    expect(fetchSpy).toHaveBeenCalledWith('/custom/carrier.json');
    expect(fetchSpy).toHaveBeenCalledWith('/custom/traits.json');
    expect(fetchSpy).toHaveBeenCalledWith('/custom/pgx.json');
    expect(fetchSpy).toHaveBeenCalledWith('/custom/prs.json');
    expect(fetchSpy).toHaveBeenCalledWith('/custom/ethnicity.json');
    expect(fetchSpy).toHaveBeenCalledWith('/custom/counseling.json');
  });

  it('should propagate DataLoadError if any file fails', async () => {
    // Make setTimeout resolve immediately for retry handling
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    // First two succeed, rest fail
    fetchSpy
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockRejectedValue(new Error('Server down'));

    await expect(loadAllData()).rejects.toThrow(DataLoadError);
  });
});

// ─── getCachedVersions ────────────────────────────────────────────────────────

describe('getCachedVersions', () => {
  it('should return empty object when nothing is cached', async () => {
    const versions = await getCachedVersions();

    expect(versions).toEqual({});
  });

  it('should return cached URLs for files that are in cache', async () => {
    // Populate cache with two entries
    const cache = await mockCacheStorage.open('mergenix-genetics-data-v1');
    await cache.put(DEFAULT_MANIFEST.carrierPanel, createMockResponse([]));
    await cache.put(DEFAULT_MANIFEST.pgxPanel, createMockResponse({}));

    const versions = await getCachedVersions();

    expect(versions['carrierPanel']).toBe(DEFAULT_MANIFEST.carrierPanel);
    expect(versions['pgxPanel']).toBe(DEFAULT_MANIFEST.pgxPanel);
    expect(versions['traitSnps']).toBeUndefined();
    expect(versions['prsWeights']).toBeUndefined();
  });

  it('should return all entries when all files are cached', async () => {
    const cache = await mockCacheStorage.open('mergenix-genetics-data-v1');
    for (const url of Object.values(DEFAULT_MANIFEST)) {
      await cache.put(url, createMockResponse([]));
    }

    const versions = await getCachedVersions();

    expect(Object.keys(versions)).toHaveLength(6);
    expect(versions['carrierPanel']).toBe(DEFAULT_MANIFEST.carrierPanel);
    expect(versions['traitSnps']).toBe(DEFAULT_MANIFEST.traitSnps);
    expect(versions['pgxPanel']).toBe(DEFAULT_MANIFEST.pgxPanel);
    expect(versions['prsWeights']).toBe(DEFAULT_MANIFEST.prsWeights);
    expect(versions['ethnicity']).toBe(DEFAULT_MANIFEST.ethnicity);
    expect(versions['counselingProviders']).toBe(DEFAULT_MANIFEST.counselingProviders);
  });

  it('should return empty object when Cache API is unavailable', async () => {
    vi.stubGlobal('caches', undefined);

    const versions = await getCachedVersions();

    expect(versions).toEqual({});
  });
});
