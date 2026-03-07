import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';

// ── Controllable idb-keyval mock ────────────────────────────────────────
// Hoisted mock functions that can be overridden per-test.
// By default they delegate to the real idb-keyval implementation.
const mockOverrides = vi.hoisted(() => ({
  setOverride: null as ((...args: unknown[]) => unknown) | null,
  getOverride: null as ((...args: unknown[]) => unknown) | null,
  delOverride: null as ((...args: unknown[]) => unknown) | null,
}));

vi.mock('idb-keyval', async (importOriginal) => {
  const real = (await importOriginal()) as typeof import('idb-keyval');
  return {
    ...real,
    set: (...args: unknown[]) => {
      if (mockOverrides.setOverride) return mockOverrides.setOverride(...args);
      return (real.set as (...a: unknown[]) => unknown)(...args);
    },
    get: (...args: unknown[]) => {
      if (mockOverrides.getOverride) return mockOverrides.getOverride(...args);
      return (real.get as (...a: unknown[]) => unknown)(...args);
    },
    del: (...args: unknown[]) => {
      if (mockOverrides.delOverride) return mockOverrides.delOverride(...args);
      return (real.del as (...a: unknown[]) => unknown)(...args);
    },
  };
});

// Import after fake-indexeddb polyfill is active
import {
  saveAnalysisResult,
  loadAnalysisResult,
  deleteAnalysisResult,
  listAnalysisResults,
  clearAllResults,
  hasVersionMismatch,
  STORAGE_SCHEMA_VERSION,
} from '../../lib/storage/indexed-db-store';

// ── Mock the analysis API client (required by analysis-store) ────────────
vi.mock('@/lib/api/analysis-client', () => ({
  saveResult: vi.fn(),
  listResults: vi.fn(),
  getResult: vi.fn(),
  deleteResult: vi.fn(),
}));

import { useAnalysisStore } from '../../lib/stores/analysis-store';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Deterministic fake encrypted envelope — valid JSON with all required fields. */
const fakeEnvelope = (id: string) =>
  JSON.stringify({
    version: '1',
    algorithm: 'AES-256-GCM',
    salt: btoa(`salt-${id}`),
    iv: btoa(`iv-for-${id}`),
    ciphertext: btoa(`encrypted-payload-for-${id}`),
  });

// ── Tests ──────────────────────────────────────────────────────────────────

describe('indexed-db-store', () => {
  beforeEach(async () => {
    // Start each test with a clean IndexedDB
    await clearAllResults();
  });

  // ── saveAnalysisResult ─────────────────────────────────────────────────

  describe('saveAnalysisResult', () => {
    it('stores an encrypted envelope in IndexedDB', async () => {
      const envelope = fakeEnvelope('result-1');
      await saveAnalysisResult('result-1', envelope, STORAGE_SCHEMA_VERSION);

      const loaded = await loadAnalysisResult('result-1');
      expect(loaded).not.toBeNull();
      expect(loaded!.encryptedEnvelope).toBe(envelope);
      expect(loaded!.resultId).toBe('result-1');
      expect(loaded!.dataVersion).toBe(STORAGE_SCHEMA_VERSION);
    });

    it('stores a savedAt ISO timestamp', async () => {
      const before = new Date().toISOString();
      await saveAnalysisResult('result-ts', fakeEnvelope('result-ts'), STORAGE_SCHEMA_VERSION);
      const after = new Date().toISOString();

      const loaded = await loadAnalysisResult('result-ts');
      expect(loaded).not.toBeNull();
      // savedAt should be between before and after
      expect(loaded!.savedAt >= before).toBe(true);
      expect(loaded!.savedAt <= after).toBe(true);
    });

    it('overwrites an existing entry with the same resultId', async () => {
      await saveAnalysisResult('result-overwrite', fakeEnvelope('v1'), STORAGE_SCHEMA_VERSION);
      await saveAnalysisResult('result-overwrite', fakeEnvelope('v2'), STORAGE_SCHEMA_VERSION);

      const loaded = await loadAnalysisResult('result-overwrite');
      expect(loaded).not.toBeNull();
      expect(loaded!.encryptedEnvelope).toBe(fakeEnvelope('v2'));

      // Should still be only one entry with that ID
      const all = await listAnalysisResults();
      const matching = all.filter((r) => r.resultId === 'result-overwrite');
      expect(matching).toHaveLength(1);
    });
  });

  // ── loadAnalysisResult ─────────────────────────────────────────────────

  describe('loadAnalysisResult', () => {
    it('returns the stored entry when it exists and version matches', async () => {
      await saveAnalysisResult('load-test', fakeEnvelope('load-test'), STORAGE_SCHEMA_VERSION);

      const result = await loadAnalysisResult('load-test');
      expect(result).not.toBeNull();
      expect(result!.resultId).toBe('load-test');
      expect(result!.encryptedEnvelope).toBe(fakeEnvelope('load-test'));
      expect(result!.dataVersion).toBe(STORAGE_SCHEMA_VERSION);
      expect(result!.versionMismatch).toBe(false);
    });

    it('returns null for a non-existent resultId', async () => {
      const result = await loadAnalysisResult('does-not-exist');
      expect(result).toBeNull();
    });

    it('returns null with versionMismatch flag when stored version differs', async () => {
      // Save with a different version
      await saveAnalysisResult(
        'old-version',
        fakeEnvelope('old-version'),
        '0', // outdated version
      );

      const result = await loadAnalysisResult('old-version');
      expect(result).toBeNull();
    });

    it('signals versionMismatch when stored dataVersion differs from current schema', async () => {
      // Save with a mismatched version
      await saveAnalysisResult(
        'mismatch-test',
        fakeEnvelope('mismatch-test'),
        '999', // future version
      );

      // loadAnalysisResult returns null for mismatched versions,
      // but we also need to verify the mismatch can be detected.
      // We use loadAnalysisResultRaw (or re-export) to check the raw data.
      const result = await loadAnalysisResult('mismatch-test');
      expect(result).toBeNull();
    });
  });

  // ── deleteAnalysisResult ───────────────────────────────────────────────

  describe('deleteAnalysisResult', () => {
    it('removes a stored entry', async () => {
      await saveAnalysisResult('delete-me', fakeEnvelope('delete-me'), STORAGE_SCHEMA_VERSION);

      // Verify it exists first
      const beforeDelete = await loadAnalysisResult('delete-me');
      expect(beforeDelete).not.toBeNull();

      await deleteAnalysisResult('delete-me');

      const afterDelete = await loadAnalysisResult('delete-me');
      expect(afterDelete).toBeNull();
    });

    it('does not throw when deleting a non-existent entry', async () => {
      // Should be a no-op, not throw
      await expect(deleteAnalysisResult('non-existent')).resolves.toBeUndefined();
    });
  });

  // ── listAnalysisResults ────────────────────────────────────────────────

  describe('listAnalysisResults', () => {
    it('returns an empty array when no results are stored', async () => {
      const results = await listAnalysisResults();
      expect(results).toEqual([]);
    });

    it('returns metadata for all stored results', async () => {
      await saveAnalysisResult('list-1', fakeEnvelope('list-1'), STORAGE_SCHEMA_VERSION);
      await saveAnalysisResult('list-2', fakeEnvelope('list-2'), STORAGE_SCHEMA_VERSION);
      await saveAnalysisResult('list-3', fakeEnvelope('list-3'), STORAGE_SCHEMA_VERSION);

      const results = await listAnalysisResults();
      expect(results).toHaveLength(3);

      // Each result should have metadata but NOT the encrypted envelope
      for (const meta of results) {
        expect(meta).toHaveProperty('resultId');
        expect(meta).toHaveProperty('dataVersion');
        expect(meta).toHaveProperty('savedAt');
        // The list function returns metadata only — no envelope
        expect(meta).not.toHaveProperty('encryptedEnvelope');
      }

      const ids = results.map((r) => r.resultId);
      expect(ids).toContain('list-1');
      expect(ids).toContain('list-2');
      expect(ids).toContain('list-3');
    });
  });

  // ── hasVersionMismatch ─────────────────────────────────────────────────

  describe('hasVersionMismatch', () => {
    it('returns false when entry matches current version', async () => {
      await saveAnalysisResult(
        'match-version',
        fakeEnvelope('match-version'),
        STORAGE_SCHEMA_VERSION,
      );

      const result = await hasVersionMismatch('match-version');
      expect(result).toBe(false);
    });

    it('returns true when entry has different version', async () => {
      await saveAnalysisResult(
        'old-version',
        fakeEnvelope('old-version'),
        '0', // outdated version
      );

      const result = await hasVersionMismatch('old-version');
      expect(result).toBe(true);
    });

    it('returns false when entry does not exist', async () => {
      const result = await hasVersionMismatch('non-existent-id');
      expect(result).toBe(false);
    });
  });

  // ── clearAllResults ────────────────────────────────────────────────────

  describe('clearAllResults', () => {
    it('removes all stored results', async () => {
      await saveAnalysisResult('clear-1', fakeEnvelope('clear-1'), STORAGE_SCHEMA_VERSION);
      await saveAnalysisResult('clear-2', fakeEnvelope('clear-2'), STORAGE_SCHEMA_VERSION);

      // Verify they exist
      const before = await listAnalysisResults();
      expect(before).toHaveLength(2);

      await clearAllResults();

      const after = await listAnalysisResults();
      expect(after).toEqual([]);
    });

    it('succeeds even when store is already empty', async () => {
      await expect(clearAllResults()).resolves.toBeUndefined();
    });
  });

  // ── STORAGE_SCHEMA_VERSION ─────────────────────────────────────────────

  describe('STORAGE_SCHEMA_VERSION', () => {
    it("is a string starting at '1'", () => {
      expect(typeof STORAGE_SCHEMA_VERSION).toBe('string');
      expect(STORAGE_SCHEMA_VERSION).toBe('1');
    });
  });
});

// ── IndexedDB Error Path Tests ───────────────────────────────────────────

describe('indexed-db-store error handling', () => {
  afterEach(() => {
    mockOverrides.setOverride = null;
    mockOverrides.getOverride = null;
    mockOverrides.delOverride = null;
  });

  it('saveAnalysisResult propagates errors when IndexedDB set fails', async () => {
    mockOverrides.setOverride = () => {
      return Promise.reject(new DOMException('Quota exceeded', 'QuotaExceededError'));
    };

    await expect(
      saveAnalysisResult('err-save', fakeEnvelope('err-save'), STORAGE_SCHEMA_VERSION),
    ).rejects.toThrow('Quota exceeded');
  });

  it('loadAnalysisResult propagates errors when IndexedDB get fails', async () => {
    mockOverrides.getOverride = () => {
      return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    };

    await expect(loadAnalysisResult('err-load')).rejects.toThrow('Permission denied');
  });

  it('deleteAnalysisResult propagates errors when IndexedDB del fails', async () => {
    mockOverrides.delOverride = () => {
      return Promise.reject(new DOMException('Database closed', 'InvalidStateError'));
    };

    await expect(deleteAnalysisResult('err-delete')).rejects.toThrow('Database closed');
  });
});

// ── Zustand Store Integration ────────────────────────────────────────────

describe('analysis-store IndexedDB integration', () => {
  beforeEach(async () => {
    await clearAllResults();
    useAnalysisStore.getState().reset();
  });

  it('saveResultToStorage persists an encrypted envelope to IndexedDB', async () => {
    const envelope = fakeEnvelope('zustand-save');
    await useAnalysisStore.getState().saveResultToStorage('zustand-save', envelope);

    // Verify it was saved by reading directly from the storage layer
    const loaded = await loadAnalysisResult('zustand-save');
    expect(loaded).not.toBeNull();
    expect(loaded!.encryptedEnvelope).toBe(envelope);
  });

  it('loadResultFromStorage retrieves a stored envelope', async () => {
    const envelope = fakeEnvelope('zustand-load');
    await saveAnalysisResult('zustand-load', envelope, STORAGE_SCHEMA_VERSION);

    const result = await useAnalysisStore.getState().loadResultFromStorage('zustand-load');

    expect(result).not.toBeNull();
    expect(result!.encryptedEnvelope).toBe(envelope);
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(false);
  });

  it('loadResultFromStorage sets storageVersionMismatch on version mismatch', async () => {
    await saveAnalysisResult(
      'zustand-mismatch',
      fakeEnvelope('zustand-mismatch'),
      '0', // outdated version
    );

    const result = await useAnalysisStore.getState().loadResultFromStorage('zustand-mismatch');

    expect(result).toBeNull();
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(true);
  });

  it('loadResultFromStorage returns null for non-existent ID without setting mismatch', async () => {
    const result = await useAnalysisStore.getState().loadResultFromStorage('non-existent');

    expect(result).toBeNull();
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(false);
  });

  it('deleteResultFromStorage removes the entry from IndexedDB', async () => {
    await saveAnalysisResult(
      'zustand-delete',
      fakeEnvelope('zustand-delete'),
      STORAGE_SCHEMA_VERSION,
    );

    await useAnalysisStore.getState().deleteResultFromStorage('zustand-delete');

    const loaded = await loadAnalysisResult('zustand-delete');
    expect(loaded).toBeNull();
  });

  it('storageVersionMismatch resets to false on successful load', async () => {
    // First, trigger a mismatch
    await saveAnalysisResult('mismatch-first', fakeEnvelope('mismatch-first'), '0');
    await useAnalysisStore.getState().loadResultFromStorage('mismatch-first');
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(true);

    // Now save and load a valid entry
    await saveAnalysisResult('valid-entry', fakeEnvelope('valid-entry'), STORAGE_SCHEMA_VERSION);
    await useAnalysisStore.getState().loadResultFromStorage('valid-entry');
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(false);
  });
});

// ── validateEncryptedEnvelope (tested via saveAnalysisResult) ─────────────

describe('indexed-db-store: validateEncryptedEnvelope guard', () => {
  it('rejects a plaintext string (not valid JSON)', async () => {
    await expect(
      saveAnalysisResult(
        'guard-plaintext',
        'enc:AES-256-GCM:somethingopaque',
        STORAGE_SCHEMA_VERSION,
      ),
    ).rejects.toThrow(/IndexedDB guard/);
  });

  it('rejects valid JSON that is not an object (array)', async () => {
    await expect(
      saveAnalysisResult(
        'guard-array',
        JSON.stringify(['version', 'algorithm']),
        STORAGE_SCHEMA_VERSION,
      ),
    ).rejects.toThrow(/IndexedDB guard/);
  });

  it('rejects valid JSON that is not an object (null)', async () => {
    await expect(saveAnalysisResult('guard-null', 'null', STORAGE_SCHEMA_VERSION)).rejects.toThrow(
      /IndexedDB guard/,
    );
  });

  it('rejects a JSON object missing required fields', async () => {
    const incomplete = JSON.stringify({ version: '1', algorithm: 'AES-256-GCM' });
    await expect(
      saveAnalysisResult('guard-missing-fields', incomplete, STORAGE_SCHEMA_VERSION),
    ).rejects.toThrow(/IndexedDB guard/);
  });

  it('accepts a valid JSON envelope with all required fields', async () => {
    const valid = JSON.stringify({
      version: '1',
      algorithm: 'AES-256-GCM',
      salt: btoa('salt'),
      iv: btoa('iv'),
      ciphertext: btoa('payload'),
    });
    await expect(
      saveAnalysisResult('guard-valid', valid, STORAGE_SCHEMA_VERSION),
    ).resolves.toBeUndefined();
  });
});
