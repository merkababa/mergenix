/**
 * Tests for sensitive memory clearing in the Web Worker.
 *
 * Security requirement: After genetics analysis completes, all raw DNA
 * variables must be explicitly zeroed/nulled in the worker — genetic data
 * must not linger in memory after analysis.
 *
 * Since the worker runs in a Web Worker context (not available in Node.js/Vitest),
 * we test the clearSensitiveMemory() function directly by importing it and
 * verifying the worker state through exported test helpers.
 *
 * The worker module exposes __test__ helpers (only in test builds) that allow
 * us to inspect and manipulate module-level state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearSensitiveMemory,
  __test__ as __testMaybeUndefined__,
} from '../src/worker';

// In test environments (NODE_ENV !== 'production'), __test__ is always defined.
// The non-null assertion here is safe and avoids optional chaining on every call.
const __test__ = __testMaybeUndefined__!;

describe('clearSensitiveMemory', () => {
  /**
   * Before each test, populate the worker state with realistic DNA data
   * to simulate a post-parse / post-analyze scenario.
   */
  beforeEach(() => {
    // Populate parsedGenotypes with realistic genotype objects
    const genotype1: Record<string, string> = {
      rs4477212: 'AA',
      rs3094315: 'AG',
      rs3131972: 'GG',
      rs12562034: 'AA',
      rs2905036: 'CC',
    };
    const genotype2: Record<string, string> = {
      rs4477212: 'AG',
      rs3094315: 'AA',
      rs3131972: 'AG',
      rs12562034: 'GG',
      rs2905036: 'CT',
    };

    __test__.setParsedGenotypes([genotype1, genotype2]);
    __test__.setParsedFormats(['23andme', 'ancestrydna']);
    __test__.setGeneticsData({
      carrierPanel: [{ gene: 'CFTR', rsid: 'rs123' }] as never[],
      traitSnps: [{ rsid: 'rs456', trait: 'eye_color' }] as never[],
      pgxPanel: { genes: [] } as never,
      prsWeights: { conditions: [] } as never,
      ethnicity: {} as never,
      counselingProviders: [] as never[],
    });
    __test__.setGovernor(true); // creates a mock governor
  });

  it('should clear all keys from each genotype map in parsedGenotypes', () => {
    // Capture references to the genotype objects BEFORE clearing
    const state = __test__.getState();
    const genotypeRefs = [...state.parsedGenotypes];

    // Verify genotypes have data before clearing
    expect(Object.keys(genotypeRefs[0]!).length).toBeGreaterThan(0);
    expect(Object.keys(genotypeRefs[1]!).length).toBeGreaterThan(0);

    clearSensitiveMemory();

    // The original objects should have had their keys deleted
    // (not just the array reference replaced)
    expect(Object.keys(genotypeRefs[0]!).length).toBe(0);
    expect(Object.keys(genotypeRefs[1]!).length).toBe(0);
  });

  it('should set parsedGenotypes to an empty array', () => {
    clearSensitiveMemory();
    const state = __test__.getState();
    expect(state.parsedGenotypes).toEqual([]);
    expect(state.parsedGenotypes.length).toBe(0);
  });

  it('should set geneticsData to null', () => {
    // Verify it starts non-null
    expect(__test__.getState().geneticsData).not.toBeNull();

    clearSensitiveMemory();

    expect(__test__.getState().geneticsData).toBeNull();
  });

  it('should set parsedFormats to an empty array', () => {
    clearSensitiveMemory();
    const state = __test__.getState();
    expect(state.parsedFormats).toEqual([]);
  });

  it('should reset and null the governor', () => {
    // Verify governor starts non-null
    expect(__test__.getState().governor).not.toBeNull();

    clearSensitiveMemory();

    expect(__test__.getState().governor).toBeNull();
  });

  it('should be safe to call multiple times', () => {
    clearSensitiveMemory();
    clearSensitiveMemory();
    clearSensitiveMemory();

    const state = __test__.getState();
    expect(state.parsedGenotypes).toEqual([]);
    expect(state.geneticsData).toBeNull();
    expect(state.parsedFormats).toEqual([]);
    expect(state.governor).toBeNull();
  });

  it('should handle empty parsedGenotypes gracefully', () => {
    __test__.setParsedGenotypes([]);
    expect(() => clearSensitiveMemory()).not.toThrow();
    expect(__test__.getState().parsedGenotypes).toEqual([]);
  });

  it('should handle null geneticsData gracefully', () => {
    __test__.setGeneticsData(null);
    expect(() => clearSensitiveMemory()).not.toThrow();
    expect(__test__.getState().geneticsData).toBeNull();
  });

  it('should handle null governor gracefully', () => {
    __test__.setGovernor(false); // sets governor to null
    expect(() => clearSensitiveMemory()).not.toThrow();
    expect(__test__.getState().governor).toBeNull();
  });

  it('should delete all genotype keys from the map object', () => {
    // Capture a reference to a genotype object
    const genotype = __test__.getState().parsedGenotypes[0]!;
    const originalKeys = Object.keys(genotype);
    expect(originalKeys.length).toBeGreaterThan(0);

    clearSensitiveMemory();

    // After clearing, the object should be empty
    expect(Object.keys(genotype).length).toBe(0);
    // Verify no original key remains
    for (const key of originalKeys) {
      expect(genotype[key]).toBeUndefined();
    }
  });
});

describe('clear_memory message type', () => {
  beforeEach(() => {
    const genotype1: Record<string, string> = {
      rs4477212: 'AA',
      rs3094315: 'AG',
    };

    __test__.setParsedGenotypes([genotype1]);
    __test__.setParsedFormats(['23andme']);
    __test__.setGeneticsData({
      carrierPanel: [] as never[],
      traitSnps: [] as never[],
      pgxPanel: { genes: [] } as never,
      prsWeights: { conditions: [] } as never,
      ethnicity: {} as never,
      counselingProviders: [] as never[],
    });
  });

  it('should be handled by the message handler and clear all state', () => {
    // Verify data exists before the message
    expect(__test__.getState().parsedGenotypes.length).toBeGreaterThan(0);

    // Simulate the message handler receiving a clear_memory message.
    // Must use captureResponses to prevent self.postMessage() in Node.js.
    __test__.captureResponses(() => {
      __test__.simulateMessage({ type: 'clear_memory' });
    });

    const state = __test__.getState();
    expect(state.parsedGenotypes).toEqual([]);
    expect(state.geneticsData).toBeNull();
    expect(state.parsedFormats).toEqual([]);
  });

  it('should post a memory_cleared response', () => {
    const responses = __test__.captureResponses(() => {
      __test__.simulateMessage({ type: 'clear_memory' });
    });

    expect(responses.length).toBe(1);
    expect(responses[0]).toEqual({ type: 'memory_cleared' });
  });
});

describe('cancel message triggers memory clearing', () => {
  beforeEach(() => {
    const genotype1: Record<string, string> = {
      rs4477212: 'AA',
      rs3094315: 'AG',
    };

    __test__.setParsedGenotypes([genotype1]);
    __test__.setParsedFormats(['23andme']);
    __test__.setGeneticsData({
      carrierPanel: [] as never[],
      traitSnps: [] as never[],
      pgxPanel: { genes: [] } as never,
      prsWeights: { conditions: [] } as never,
      ethnicity: {} as never,
      counselingProviders: [] as never[],
    });
  });

  it('should clear sensitive memory when cancel is received while not busy', () => {
    // Worker is not busy — cancel should still clear memory
    __test__.setBusy(false);

    __test__.simulateMessage({ type: 'cancel' });

    const state = __test__.getState();
    expect(state.parsedGenotypes).toEqual([]);
    expect(state.geneticsData).toBeNull();
    expect(state.parsedFormats).toEqual([]);
  });

  it('should clear sensitive memory when cancel received while busy', () => {
    // Worker IS busy — cancel should clear memory AND send cancel_ack
    __test__.setBusy(true);
    __test__.setParsedGenotypes([{ rs123: 'AG', rs456: 'CT' }]);
    __test__.setGeneticsData({
      carrierPanel: [] as never[],
      traitSnps: [] as never[],
      pgxPanel: { genes: [] } as never,
      prsWeights: { conditions: [] } as never,
      ethnicity: {} as never,
      counselingProviders: [] as never[],
    });

    const responses = __test__.captureResponses(() => {
      __test__.simulateMessage({ type: 'cancel' });
    });

    // Verify memory cleared
    const state = __test__.getState();
    expect(state.parsedGenotypes).toEqual([]);
    expect(state.geneticsData).toBeNull();
    expect(state.parsedFormats).toEqual([]);

    // Verify cancel_ack response posted (sent as error with CANCEL_ACK code)
    expect(responses.some(r => r.type === 'error' && 'code' in r && r.code === 'CANCEL_ACK')).toBe(true);
  });
});
