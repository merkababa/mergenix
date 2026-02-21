/**
 * Tests for the offspring-risk module.
 *
 * Verifies that calculateARRisk, calculateADRisk, and calculateXLinkedRisk
 * are exported from offspring-risk.ts as the authoritative source of truth,
 * and that re-exports from combiner.ts remain backward-compatible.
 *
 * These tests guard the Item 7 refactor: Punnett-square math is extracted
 * from combiner.ts into offspring-risk.ts. The functions must behave
 * identically whether imported from offspring-risk or combiner.
 */

import { describe, it, expect } from 'vitest';

// Import directly from offspring-risk (the new module)
import {
  calculateARRisk,
  calculateADRisk,
  calculateXLinkedRisk,
} from '../src/offspring-risk';

// Import the same names from combiner (backward-compat re-exports)
import {
  calculateARRisk as calculateARRiskCompat,
  calculateADRisk as calculateADRiskCompat,
  calculateXLinkedRisk as calculateXLinkedRiskCompat,
} from '../src/combiner';

// ─── offspring-risk direct exports ──────────────────────────────────────────

describe('offspring-risk module — calculateARRisk', () => {
  it('should export calculateARRisk that returns correct AR Punnett square', () => {
    expect(calculateARRisk('carrier', 'carrier')).toEqual({
      affected: 25,
      carrier: 50,
      normal: 25,
    });
  });

  it('normal x normal → 0/0/100', () => {
    expect(calculateARRisk('normal', 'normal')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 100,
    });
  });

  it('carrier x affected → 50/50/0', () => {
    expect(calculateARRisk('carrier', 'affected')).toEqual({
      affected: 50,
      carrier: 50,
      normal: 0,
    });
  });

  it('unknown parent → zeroes', () => {
    expect(calculateARRisk('unknown', 'carrier')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
  });

  it('all valid combinations sum to 100%', () => {
    const statuses = ['normal', 'carrier', 'affected'] as const;
    for (const s1 of statuses) {
      for (const s2 of statuses) {
        const risk = calculateARRisk(s1, s2);
        expect(risk.affected + risk.carrier + risk.normal).toBe(100);
      }
    }
  });
});

describe('offspring-risk module — calculateADRisk', () => {
  it('should export calculateADRisk that returns correct AD Punnett square', () => {
    expect(calculateADRisk('carrier', 'normal')).toEqual({
      affected: 50,
      carrier: 0,
      normal: 50,
    });
  });

  it('normal x normal → 0% affected', () => {
    expect(calculateADRisk('normal', 'normal')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 100,
    });
  });

  it('carrier is treated as affected in AD', () => {
    expect(calculateADRisk('carrier', 'normal')).toEqual(
      calculateADRisk('affected', 'normal'),
    );
  });

  it('carrier column is always 0 for AD', () => {
    expect(calculateADRisk('carrier', 'carrier').carrier).toBe(0);
    expect(calculateADRisk('affected', 'affected').carrier).toBe(0);
    expect(calculateADRisk('normal', 'carrier').carrier).toBe(0);
  });

  it('unknown parent → zeroes', () => {
    expect(calculateADRisk('unknown', 'normal')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
  });
});

describe('offspring-risk module — calculateXLinkedRisk', () => {
  it('should export calculateXLinkedRisk with sex-stratified output', () => {
    const risk = calculateXLinkedRisk('carrier', 'normal');
    expect(risk).toHaveProperty('sons');
    expect(risk).toHaveProperty('daughters');
  });

  it('carrier mother x normal father → 50% sons affected, 50% daughters carriers', () => {
    const risk = calculateXLinkedRisk('carrier', 'normal');
    expect(risk.sons).toEqual({ affected: 50, carrier: 0, normal: 50 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 50, normal: 50 });
  });

  it('overall averages assume 50/50 sex ratio', () => {
    const risk = calculateXLinkedRisk('carrier', 'normal');
    expect(risk.affected).toBe(25);
    expect(risk.carrier).toBe(25);
    expect(risk.normal).toBe(50);
  });

  it('swaps parents when parent1IsFemale is false', () => {
    // parent1=father(affected), parent2=mother(normal)
    const risk = calculateXLinkedRisk('affected', 'normal', false);
    // Mother=normal, Father=affected -> sons all normal, daughters all carriers
    expect(risk.sons.affected).toBe(0);
    expect(risk.daughters.carrier).toBe(100);
  });

  it('unknown parent → zeroes', () => {
    const risk = calculateXLinkedRisk('unknown', 'carrier');
    expect(risk.sons).toEqual({ affected: 0, carrier: 0, normal: 0 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 0, normal: 0 });
  });
});

// ─── Backward compatibility: combiner re-exports ─────────────────────────────

describe('combiner backward-compatibility re-exports', () => {
  it('calculateARRisk from combiner produces identical results to offspring-risk', () => {
    const statuses = ['normal', 'carrier', 'affected'] as const;
    for (const s1 of statuses) {
      for (const s2 of statuses) {
        expect(calculateARRiskCompat(s1, s2)).toEqual(calculateARRisk(s1, s2));
      }
    }
  });

  it('calculateADRisk from combiner produces identical results to offspring-risk', () => {
    const statuses = ['normal', 'carrier', 'affected'] as const;
    for (const s1 of statuses) {
      for (const s2 of statuses) {
        expect(calculateADRiskCompat(s1, s2)).toEqual(calculateADRisk(s1, s2));
      }
    }
  });

  it('calculateXLinkedRisk from combiner produces identical results to offspring-risk', () => {
    const risk1 = calculateXLinkedRiskCompat('carrier', 'normal');
    const risk2 = calculateXLinkedRisk('carrier', 'normal');
    expect(risk1).toEqual(risk2);
  });

  it('calculateXLinkedRisk parent1IsFemale=false is backward-compatible', () => {
    const risk1 = calculateXLinkedRiskCompat('normal', 'affected', false);
    const risk2 = calculateXLinkedRisk('normal', 'affected', false);
    expect(risk1).toEqual(risk2);
  });
});
