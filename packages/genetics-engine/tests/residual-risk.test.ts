/**
 * Tests for the Residual Risk Calculator.
 *
 * Covers:
 * - Bayesian formula correctness
 * - Ethnicity lookup with fallback to Unknown/Mixed
 * - "1 in X" formatting
 * - Edge cases (0% detection, 100% detection, 0 carrier freq)
 * - Built-in detection rate data validation
 */

import { describe, it, expect } from 'vitest';
import {
  calculateResidualRisk,
  getResidualRisk,
  formatResidualRisk,
  COMMON_DETECTION_RATES,
} from '../src/residual-risk';
import type { DetectionRateEntry } from '../src/residual-risk';

// ─── Test Fixtures ────────────────────────────────────────────────────────

const TEST_DETECTION_RATES: DetectionRateEntry[] = [
  {
    condition: 'Test Disease',
    ethnicity: 'European',
    detectionRate: 0.90,
    priorCarrierFreq: 0.04,
    source: 'Test Source',
  },
  {
    condition: 'Test Disease',
    ethnicity: 'African American',
    detectionRate: 0.65,
    priorCarrierFreq: 0.015,
    source: 'Test Source',
  },
  {
    condition: 'Test Disease',
    ethnicity: 'Unknown/Mixed',
    detectionRate: 0.65,
    priorCarrierFreq: 0.04,
    source: 'Test Source (conservative)',
  },
  {
    condition: 'Rare Disease',
    ethnicity: 'European',
    detectionRate: 0.50,
    priorCarrierFreq: 0.001,
    source: 'Test Source',
  },
  // No Unknown/Mixed for Rare Disease — tests null return for unknown ethnicity
];

// ─── Bayesian Formula Correctness ───────────────────────────────────────────

describe('calculateResidualRisk', () => {
  it('should compute correct residual risk for CF in Europeans', () => {
    // CF: detection rate 90%, prior carrier freq 1/25 = 0.04
    // Formula: (1 - 0.90) * 0.04 / (1 - 0.90 * 0.04)
    //        = 0.10 * 0.04 / (1 - 0.036)
    //        = 0.004 / 0.964
    //        = ~0.004149
    const result = calculateResidualRisk(0.90, 0.04);
    expect(result).toBeCloseTo(0.004149, 4);
  });

  it('should compute correct residual risk for CF in African Americans', () => {
    // CF: detection rate 65%, prior carrier freq ~1/65 = 0.0154
    // Formula: (1 - 0.65) * 0.0154 / (1 - 0.65 * 0.0154)
    //        = 0.35 * 0.0154 / (1 - 0.01001)
    //        = 0.00539 / 0.98999
    //        = ~0.005445
    const result = calculateResidualRisk(0.65, 0.0154);
    expect(result).toBeCloseTo(0.005445, 4);
  });

  it('should compute correct residual risk for CF in Ashkenazi Jewish', () => {
    // CF: detection rate 94%, prior carrier freq 1/25 = 0.04
    // Formula: (1 - 0.94) * 0.04 / (1 - 0.94 * 0.04)
    //        = 0.06 * 0.04 / (1 - 0.0376)
    //        = 0.0024 / 0.9624
    //        = ~0.002493
    const result = calculateResidualRisk(0.94, 0.04);
    expect(result).toBeCloseTo(0.002493, 4);
  });

  it('should return 0 for 100% detection rate', () => {
    const result = calculateResidualRisk(1.0, 0.04);
    expect(result).toBe(0);
  });

  it('should return the prior frequency for 0% detection rate', () => {
    // If the test detects nothing, residual risk = prior carrier frequency
    // Formula: (1 - 0) * 0.04 / (1 - 0 * 0.04) = 0.04 / 1 = 0.04
    const result = calculateResidualRisk(0.0, 0.04);
    expect(result).toBeCloseTo(0.04, 6);
  });

  it('should return 0 when prior carrier frequency is 0', () => {
    const result = calculateResidualRisk(0.90, 0.0);
    expect(result).toBe(0);
  });

  it('should handle both 0% detection and 0% carrier freq', () => {
    const result = calculateResidualRisk(0.0, 0.0);
    expect(result).toBe(0);
  });

  it('should always return less than or equal to prior frequency', () => {
    // Testing negative can only reduce (or maintain) risk, never increase it
    const priors = [0.001, 0.01, 0.04, 0.1, 0.25];
    const rates = [0.0, 0.25, 0.50, 0.75, 0.90, 0.95, 1.0];
    for (const prior of priors) {
      for (const rate of rates) {
        const residual = calculateResidualRisk(rate, prior);
        expect(residual).toBeLessThanOrEqual(prior + 1e-10); // small epsilon for float
      }
    }
  });

  it('should always return a non-negative value', () => {
    const rates = [0.0, 0.1, 0.5, 0.9, 1.0];
    const priors = [0.0, 0.001, 0.01, 0.04, 0.1];
    for (const rate of rates) {
      for (const prior of priors) {
        expect(calculateResidualRisk(rate, prior)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('should throw for detection rate < 0', () => {
    expect(() => calculateResidualRisk(-0.1, 0.04)).toThrow(
      'detectionRate must be between 0 and 1',
    );
  });

  it('should throw for detection rate > 1', () => {
    expect(() => calculateResidualRisk(1.1, 0.04)).toThrow(
      'detectionRate must be between 0 and 1',
    );
  });

  it('should throw for prior carrier freq < 0', () => {
    expect(() => calculateResidualRisk(0.90, -0.01)).toThrow(
      'priorCarrierFreq must be between 0 and 1',
    );
  });

  it('should throw for prior carrier freq > 1', () => {
    expect(() => calculateResidualRisk(0.90, 1.1)).toThrow(
      'priorCarrierFreq must be between 0 and 1',
    );
  });

  it('should decrease monotonically with increasing detection rate', () => {
    const prior = 0.04;
    let prevRisk = Infinity;
    for (let rate = 0; rate <= 1.0; rate += 0.1) {
      const risk = calculateResidualRisk(rate, prior);
      expect(risk).toBeLessThanOrEqual(prevRisk);
      prevRisk = risk;
    }
  });

  it('should match manual Bayesian calculation for Sickle Cell', () => {
    // SCD in African American: detection 95%, prior 0.083
    // numerator = (1 - 0.95) * 0.083 = 0.05 * 0.083 = 0.00415
    // denominator = 1 - 0.95 * 0.083 = 1 - 0.07885 = 0.92115
    // result = 0.00415 / 0.92115 = ~0.004505
    const result = calculateResidualRisk(0.95, 0.083);
    expect(result).toBeCloseTo(0.004505, 4);
  });
});

// ─── Ethnicity Lookup ───────────────────────────────────────────────────────

describe('getResidualRisk', () => {
  it('should find exact ethnicity match', () => {
    const result = getResidualRisk('Test Disease', 'European', TEST_DETECTION_RATES);
    expect(result).not.toBeNull();
    expect(result!.ethnicity).toBe('European');
    expect(result!.detectionRate).toBe(0.90);
    expect(result!.priorCarrierFreq).toBe(0.04);
  });

  it('should fall back to Unknown/Mixed when exact ethnicity not found', () => {
    const result = getResidualRisk('Test Disease', 'South Asian', TEST_DETECTION_RATES);
    expect(result).not.toBeNull();
    expect(result!.ethnicity).toBe('Unknown/Mixed');
    expect(result!.detectionRate).toBe(0.65); // Conservative
    expect(result!.priorCarrierFreq).toBe(0.04); // Conservative
  });

  it('should return null when condition not found at all', () => {
    const result = getResidualRisk('Nonexistent Disease', 'European', TEST_DETECTION_RATES);
    expect(result).toBeNull();
  });

  it('should return null when no Unknown/Mixed fallback exists', () => {
    // Rare Disease only has European entry, no Unknown/Mixed
    const result = getResidualRisk('Rare Disease', 'East Asian', TEST_DETECTION_RATES);
    expect(result).toBeNull();
  });

  it('should be case-insensitive for condition name', () => {
    const result = getResidualRisk('test disease', 'European', TEST_DETECTION_RATES);
    expect(result).not.toBeNull();
    expect(result!.condition).toBe('Test Disease');
  });

  it('should be case-insensitive for ethnicity', () => {
    const result = getResidualRisk('Test Disease', 'european', TEST_DETECTION_RATES);
    expect(result).not.toBeNull();
    expect(result!.ethnicity).toBe('European');
  });

  it('should compute risk reduction correctly', () => {
    const result = getResidualRisk('Test Disease', 'European', TEST_DETECTION_RATES);
    expect(result).not.toBeNull();
    // riskReduction = 1 - residualRisk / priorCarrierFreq
    // residualRisk ~= 0.004149, prior = 0.04
    // riskReduction ~= 1 - 0.004149/0.04 ~= 1 - 0.103725 ~= 0.8963
    expect(result!.riskReduction).toBeGreaterThan(0.85);
    expect(result!.riskReduction).toBeLessThan(1.0);
  });

  it('should include human-readable interpretation', () => {
    const result = getResidualRisk('Test Disease', 'European', TEST_DETECTION_RATES);
    expect(result).not.toBeNull();
    expect(result!.interpretation).toContain('1 in');
    expect(result!.interpretation).toContain('residual carrier risk');
  });

  it('should work with COMMON_DETECTION_RATES for Cystic Fibrosis', () => {
    const result = getResidualRisk('Cystic Fibrosis', 'European', COMMON_DETECTION_RATES);
    expect(result).not.toBeNull();
    expect(result!.condition).toBe('Cystic Fibrosis');
    expect(result!.ethnicity).toBe('European');
    expect(result!.residualRisk).toBeGreaterThan(0);
    expect(result!.residualRisk).toBeLessThan(result!.priorCarrierFreq);
  });

  it('should work with COMMON_DETECTION_RATES for Tay-Sachs', () => {
    const result = getResidualRisk('Tay-Sachs Disease', 'Ashkenazi Jewish', COMMON_DETECTION_RATES);
    expect(result).not.toBeNull();
    expect(result!.condition).toBe('Tay-Sachs Disease');
    expect(result!.residualRisk).toBeGreaterThan(0);
  });

  it('should use conservative estimate for Unknown/Mixed ethnicity', () => {
    const european = getResidualRisk('Cystic Fibrosis', 'European', COMMON_DETECTION_RATES);
    const unknown = getResidualRisk('Cystic Fibrosis', 'Unknown/Mixed', COMMON_DETECTION_RATES);
    expect(european).not.toBeNull();
    expect(unknown).not.toBeNull();
    // Unknown/Mixed should have higher residual risk (more conservative)
    expect(unknown!.residualRisk).toBeGreaterThan(european!.residualRisk);
  });
});

// ─── "1 in X" Formatting ────────────────────────────────────────────────────

describe('formatResidualRisk', () => {
  it('should format 0.004 as approximately "1 in 250"', () => {
    const result = formatResidualRisk(0.004);
    expect(result).toBe('1 in 250');
  });

  it('should format 0.001 as "1 in 1,000"', () => {
    const result = formatResidualRisk(0.001);
    expect(result).toBe('1 in 1,000');
  });

  it('should format 0.0001 as "1 in 10,000"', () => {
    const result = formatResidualRisk(0.0001);
    expect(result).toBe('1 in 10,000');
  });

  it('should format 0.5 as "1 in 2"', () => {
    const result = formatResidualRisk(0.5);
    expect(result).toBe('1 in 2');
  });

  it('should format 0.1 as "1 in 10"', () => {
    const result = formatResidualRisk(0.1);
    expect(result).toBe('1 in 10');
  });

  it('should handle 0 risk', () => {
    const result = formatResidualRisk(0);
    expect(result).toBe('0 (no residual risk)');
  });

  it('should handle risk = 1 (100%)', () => {
    const result = formatResidualRisk(1);
    expect(result).toBe('1 in 1');
  });

  it('should round to nearest integer denominator', () => {
    // 0.003 -> 1/0.003 = 333.33 -> rounds to 333
    const result = formatResidualRisk(0.003);
    expect(result).toBe('1 in 333');
  });

  it('should use comma separators for large denominators', () => {
    const result = formatResidualRisk(0.00001);
    expect(result).toBe('1 in 100,000');
  });
});

// ─── Built-in Detection Rate Data ───────────────────────────────────────────

describe('COMMON_DETECTION_RATES', () => {
  it('should contain entries for Cystic Fibrosis', () => {
    const cfEntries = COMMON_DETECTION_RATES.filter(
      (e) => e.condition === 'Cystic Fibrosis',
    );
    expect(cfEntries.length).toBeGreaterThanOrEqual(4);
  });

  it('should contain entries for Sickle Cell Disease', () => {
    const scdEntries = COMMON_DETECTION_RATES.filter(
      (e) => e.condition === 'Sickle Cell Disease',
    );
    expect(scdEntries.length).toBeGreaterThanOrEqual(2);
  });

  it('should contain entries for Tay-Sachs Disease', () => {
    const tsEntries = COMMON_DETECTION_RATES.filter(
      (e) => e.condition === 'Tay-Sachs Disease',
    );
    expect(tsEntries.length).toBeGreaterThanOrEqual(2);
  });

  it('should have an Unknown/Mixed fallback for each major condition', () => {
    const majorConditions = ['Cystic Fibrosis', 'Sickle Cell Disease', 'Tay-Sachs Disease'];
    for (const condition of majorConditions) {
      const fallback = COMMON_DETECTION_RATES.find(
        (e) => e.condition === condition && e.ethnicity === 'Unknown/Mixed',
      );
      expect(fallback).toBeDefined();
    }
  });

  it('should have valid detection rates (0-1) for all entries', () => {
    for (const entry of COMMON_DETECTION_RATES) {
      expect(entry.detectionRate).toBeGreaterThanOrEqual(0);
      expect(entry.detectionRate).toBeLessThanOrEqual(1);
    }
  });

  it('should have valid carrier frequencies (0-1) for all entries', () => {
    for (const entry of COMMON_DETECTION_RATES) {
      expect(entry.priorCarrierFreq).toBeGreaterThanOrEqual(0);
      expect(entry.priorCarrierFreq).toBeLessThanOrEqual(1);
    }
  });

  it('should have non-empty sources for all entries', () => {
    for (const entry of COMMON_DETECTION_RATES) {
      expect(entry.source.length).toBeGreaterThan(0);
    }
  });

  it('Unknown/Mixed should use most conservative detection rate for CF', () => {
    const cfEntries = COMMON_DETECTION_RATES.filter(
      (e) => e.condition === 'Cystic Fibrosis',
    );
    const unknownEntry = cfEntries.find((e) => e.ethnicity === 'Unknown/Mixed');
    const otherEntries = cfEntries.filter((e) => e.ethnicity !== 'Unknown/Mixed');

    expect(unknownEntry).toBeDefined();
    // Unknown/Mixed detection rate should be <= all other detection rates (conservative)
    for (const other of otherEntries) {
      expect(unknownEntry!.detectionRate).toBeLessThanOrEqual(other.detectionRate);
    }
  });
});
