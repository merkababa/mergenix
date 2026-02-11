/**
 * Tests for the shared utility functions.
 *
 * Tests cover genotype normalization, rsID validation, allele complementation,
 * homozygous/heterozygous detection, and numeric clamping.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeGenotypeAlleles,
  isValidRsid,
  complementAllele,
  isHomozygous,
  isHeterozygous,
  clamp,
} from '../src/utils';

// ─── normalizeGenotypeAlleles ──────────────────────────────────────────────

describe('normalizeGenotypeAlleles', () => {
  it('should reorder alleles alphabetically when out of order', () => {
    expect(normalizeGenotypeAlleles('T', 'A')).toEqual(['A', 'T']);
    expect(normalizeGenotypeAlleles('G', 'A')).toEqual(['A', 'G']);
    expect(normalizeGenotypeAlleles('T', 'C')).toEqual(['C', 'T']);
    expect(normalizeGenotypeAlleles('G', 'C')).toEqual(['C', 'G']);
  });

  it('should keep alleles in order when already sorted', () => {
    expect(normalizeGenotypeAlleles('A', 'C')).toEqual(['A', 'C']);
    expect(normalizeGenotypeAlleles('A', 'G')).toEqual(['A', 'G']);
    expect(normalizeGenotypeAlleles('A', 'T')).toEqual(['A', 'T']);
    expect(normalizeGenotypeAlleles('C', 'G')).toEqual(['C', 'G']);
    expect(normalizeGenotypeAlleles('C', 'T')).toEqual(['C', 'T']);
    expect(normalizeGenotypeAlleles('G', 'T')).toEqual(['G', 'T']);
  });

  it('should handle identical alleles (homozygous)', () => {
    expect(normalizeGenotypeAlleles('A', 'A')).toEqual(['A', 'A']);
    expect(normalizeGenotypeAlleles('C', 'C')).toEqual(['C', 'C']);
    expect(normalizeGenotypeAlleles('G', 'G')).toEqual(['G', 'G']);
    expect(normalizeGenotypeAlleles('T', 'T')).toEqual(['T', 'T']);
  });

  it('should handle single-character alleles', () => {
    // Single chars are valid DNA alleles; the function just sorts them
    expect(normalizeGenotypeAlleles('Z', 'A')).toEqual(['A', 'Z']);
    expect(normalizeGenotypeAlleles('A', 'Z')).toEqual(['A', 'Z']);
  });

  it('should handle empty strings', () => {
    // Empty strings should still work (empty string sorts before any char)
    expect(normalizeGenotypeAlleles('', '')).toEqual(['', '']);
    expect(normalizeGenotypeAlleles('A', '')).toEqual(['', 'A']);
    expect(normalizeGenotypeAlleles('', 'A')).toEqual(['', 'A']);
  });

  it('should return a tuple of exactly two elements', () => {
    const result = normalizeGenotypeAlleles('G', 'A');
    expect(result).toHaveLength(2);
    expect(typeof result[0]).toBe('string');
    expect(typeof result[1]).toBe('string');
  });
});

// ─── isValidRsid ───────────────────────────────────────────────────────────

describe('isValidRsid', () => {
  it('should return true for valid "rs" prefixed rsIDs', () => {
    expect(isValidRsid('rs12345')).toBe(true);
    expect(isValidRsid('rs12913832')).toBe(true);
    expect(isValidRsid('rs1')).toBe(true);
    expect(isValidRsid('rs999999999')).toBe(true);
  });

  it('should return true for valid "i" prefixed rsIDs (indels)', () => {
    expect(isValidRsid('i12345')).toBe(true);
    expect(isValidRsid('i4000759')).toBe(true);
    expect(isValidRsid('i1')).toBe(true);
  });

  it('should return false for invalid prefixes', () => {
    expect(isValidRsid('chr1')).toBe(false);
    expect(isValidRsid('VG1234')).toBe(false);
    expect(isValidRsid('snp123')).toBe(false);
    expect(isValidRsid('abc')).toBe(false);
    expect(isValidRsid('x12345')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidRsid('')).toBe(false);
  });

  it('should return false for "rs" alone (no digits)', () => {
    expect(isValidRsid('rs')).toBe(false);
  });

  it('should return false for "i" alone (no digits)', () => {
    expect(isValidRsid('i')).toBe(false);
  });

  it('should return false for "rs" with non-numeric suffix', () => {
    expect(isValidRsid('rsABC')).toBe(false);
    expect(isValidRsid('rs123abc')).toBe(false);
    expect(isValidRsid('rs12.34')).toBe(false);
    expect(isValidRsid('rs ')).toBe(false);
  });

  it('should return false for "i" with non-numeric suffix', () => {
    expect(isValidRsid('iABC')).toBe(false);
    expect(isValidRsid('i123abc')).toBe(false);
  });

  it('should return false for strings that only partially match', () => {
    // Starts with "rs" but has mixed content
    expect(isValidRsid('rs12-34')).toBe(false);
    // Starts with "i" but has mixed content
    expect(isValidRsid('i12-34')).toBe(false);
  });
});

// ─── complementAllele ──────────────────────────────────────────────────────

describe('complementAllele', () => {
  it('should return T for A', () => {
    expect(complementAllele('A')).toBe('T');
  });

  it('should return A for T', () => {
    expect(complementAllele('T')).toBe('A');
  });

  it('should return G for C', () => {
    expect(complementAllele('C')).toBe('G');
  });

  it('should return C for G', () => {
    expect(complementAllele('G')).toBe('C');
  });

  it('should handle lowercase input and return lowercase output', () => {
    expect(complementAllele('a')).toBe('t');
    expect(complementAllele('t')).toBe('a');
    expect(complementAllele('c')).toBe('g');
    expect(complementAllele('g')).toBe('c');
  });

  it('should throw Error for invalid nucleotide', () => {
    expect(() => complementAllele('X')).toThrow('Invalid nucleotide');
    expect(() => complementAllele('Z')).toThrow('Invalid nucleotide');
    expect(() => complementAllele('1')).toThrow('Invalid nucleotide');
    expect(() => complementAllele('')).toThrow('Invalid nucleotide');
  });

  it('should be its own inverse (double complement returns original)', () => {
    expect(complementAllele(complementAllele('A'))).toBe('A');
    expect(complementAllele(complementAllele('T'))).toBe('T');
    expect(complementAllele(complementAllele('C'))).toBe('C');
    expect(complementAllele(complementAllele('G'))).toBe('G');
  });
});

// ─── isHomozygous ──────────────────────────────────────────────────────────

describe('isHomozygous', () => {
  it('should return true for identical alleles', () => {
    expect(isHomozygous('AA')).toBe(true);
    expect(isHomozygous('CC')).toBe(true);
    expect(isHomozygous('GG')).toBe(true);
    expect(isHomozygous('TT')).toBe(true);
  });

  it('should return false for different alleles', () => {
    expect(isHomozygous('AT')).toBe(false);
    expect(isHomozygous('AG')).toBe(false);
    expect(isHomozygous('CG')).toBe(false);
    expect(isHomozygous('CT')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isHomozygous('')).toBe(false);
  });

  it('should return false for single character', () => {
    expect(isHomozygous('A')).toBe(false);
  });

  it('should return false for three-character string', () => {
    expect(isHomozygous('AAA')).toBe(false);
    expect(isHomozygous('ABC')).toBe(false);
  });
});

// ─── isHeterozygous ────────────────────────────────────────────────────────

describe('isHeterozygous', () => {
  it('should return true for different alleles', () => {
    expect(isHeterozygous('AT')).toBe(true);
    expect(isHeterozygous('AG')).toBe(true);
    expect(isHeterozygous('CG')).toBe(true);
    expect(isHeterozygous('CT')).toBe(true);
    expect(isHeterozygous('GT')).toBe(true);
    expect(isHeterozygous('AC')).toBe(true);
  });

  it('should return false for identical alleles', () => {
    expect(isHeterozygous('AA')).toBe(false);
    expect(isHeterozygous('CC')).toBe(false);
    expect(isHeterozygous('GG')).toBe(false);
    expect(isHeterozygous('TT')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isHeterozygous('')).toBe(false);
  });

  it('should return false for single character', () => {
    expect(isHeterozygous('A')).toBe(false);
  });

  it('should return false for three-character string', () => {
    expect(isHeterozygous('ABC')).toBe(false);
    expect(isHeterozygous('AAA')).toBe(false);
  });
});

// ─── clamp ─────────────────────────────────────────────────────────────────

describe('clamp', () => {
  it('should return the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('should return min when value is below min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-100, 0, 100)).toBe(0);
    expect(clamp(-0.1, 0, 1)).toBe(0);
  });

  it('should return max when value is above max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(200, 0, 100)).toBe(100);
    expect(clamp(1.5, 0, 1)).toBe(1);
  });

  it('should return min when value equals min (boundary)', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(-10, -10, 10)).toBe(-10);
  });

  it('should return max when value equals max (boundary)', () => {
    expect(clamp(10, 0, 10)).toBe(10);
    expect(clamp(100, 0, 100)).toBe(100);
  });

  it('should handle negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
    expect(clamp(0, -10, -1)).toBe(-1);
  });

  it('should handle zero-width range (min === max)', () => {
    expect(clamp(5, 5, 5)).toBe(5);
    expect(clamp(0, 5, 5)).toBe(5);
    expect(clamp(10, 5, 5)).toBe(5);
  });
});
