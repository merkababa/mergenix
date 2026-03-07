/**
 * Tests for the Strand Orientation Harmonization module.
 *
 * Tests cover strand detection (forward / reverse / ambiguous), palindromic
 * pair filtering, allele flipping, the full harmonize pipeline, and edge
 * cases such as empty inputs, insufficient SNPs, and chromosome distribution.
 */

import { describe, it, expect } from 'vitest';
import {
  isPalindromicPair,
  analyzeStrand,
  flipStrand,
  harmonizeStrand,
  STRAND_REFERENCE_SNPS,
} from '../src/strand';
import type { ReferenceAllele, StrandAnalysisResult } from '../src/strand';

// ─── Test Helpers ────────────────────────────────────────────────────────────

/**
 * Build a genotype map where every reference SNP has a homozygous genotype
 * matching the reference allele (forward strand).
 */
function buildForwardGenotypes(refs: ReferenceAllele[]): Record<string, string> {
  const genotypes: Record<string, string> = {};
  for (const ref of refs) {
    const allele = ref.referenceAllele.toUpperCase();
    genotypes[ref.rsid] = allele + allele;
  }
  return genotypes;
}

/**
 * Build a genotype map where every reference SNP has a homozygous genotype
 * matching the complement of the reference allele (reverse strand).
 */
function buildReverseGenotypes(refs: ReferenceAllele[]): Record<string, string> {
  const complements: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C' };
  const genotypes: Record<string, string> = {};
  for (const ref of refs) {
    const allele = ref.referenceAllele.toUpperCase();
    const comp = complements[allele];
    if (comp) {
      genotypes[ref.rsid] = comp + comp;
    }
  }
  return genotypes;
}

/**
 * Create a set of reference alleles spread across chromosomes, all non-palindromic.
 * Uses only A and C as reference alleles (complement G and T) to guarantee
 * non-palindromic pairs.
 */
function makeNonPalindromicRefs(count: number): ReferenceAllele[] {
  const refs: ReferenceAllele[] = [];
  const alleles = ['A', 'C'];
  for (let i = 0; i < count; i++) {
    const chr = String((i % 22) + 1);
    refs.push({
      rsid: `rs_test_${i}`,
      chromosome: chr,
      referenceAllele: alleles[i % 2]!,
    });
  }
  return refs;
}

/**
 * Create a set of reference alleles that are ALL palindromic
 * (reference allele A with genotype TT or vice versa — but the key
 * is that the sample allele and ref allele form a palindromic pair).
 * We use ref=A so that when we set genotype=TT, the pair A/T is palindromic.
 */
function makePalindromicRefs(count: number): ReferenceAllele[] {
  const refs: ReferenceAllele[] = [];
  for (let i = 0; i < count; i++) {
    const chr = String((i % 22) + 1);
    // ref=A, and we'll set genotype=TT → A/T is palindromic
    // ref=C, and we'll set genotype=GG → C/G is palindromic
    refs.push({
      rsid: `rs_pal_${i}`,
      chromosome: chr,
      referenceAllele: i % 2 === 0 ? 'A' : 'C',
    });
  }
  return refs;
}

// ─── isPalindromicPair ──────────────────────────────────────────────────────

describe('isPalindromicPair', () => {
  it('should return true for A/T pair', () => {
    expect(isPalindromicPair('A', 'T')).toBe(true);
  });

  it('should return true for T/A pair', () => {
    expect(isPalindromicPair('T', 'A')).toBe(true);
  });

  it('should return true for C/G pair', () => {
    expect(isPalindromicPair('C', 'G')).toBe(true);
  });

  it('should return true for G/C pair', () => {
    expect(isPalindromicPair('G', 'C')).toBe(true);
  });

  it('should return false for A/C pair (non-palindromic)', () => {
    expect(isPalindromicPair('A', 'C')).toBe(false);
  });

  it('should return false for A/G pair (non-palindromic)', () => {
    expect(isPalindromicPair('A', 'G')).toBe(false);
  });

  it('should return false for C/T pair (non-palindromic)', () => {
    expect(isPalindromicPair('C', 'T')).toBe(false);
  });

  it('should return false for G/T pair (non-palindromic)', () => {
    expect(isPalindromicPair('G', 'T')).toBe(false);
  });

  it('should return false for T/C pair (non-palindromic)', () => {
    expect(isPalindromicPair('T', 'C')).toBe(false);
  });

  it('should return false for G/A pair (non-palindromic)', () => {
    expect(isPalindromicPair('G', 'A')).toBe(false);
  });

  it('should return false for T/G pair (non-palindromic)', () => {
    expect(isPalindromicPair('T', 'G')).toBe(false);
  });

  it('should return false for C/A pair (non-palindromic)', () => {
    expect(isPalindromicPair('C', 'A')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(isPalindromicPair('a', 't')).toBe(true);
    expect(isPalindromicPair('A', 't')).toBe(true);
    expect(isPalindromicPair('c', 'G')).toBe(true);
    expect(isPalindromicPair('a', 'c')).toBe(false);
  });

  it('should return false for identical alleles', () => {
    expect(isPalindromicPair('A', 'A')).toBe(false);
    expect(isPalindromicPair('C', 'C')).toBe(false);
    expect(isPalindromicPair('G', 'G')).toBe(false);
    expect(isPalindromicPair('T', 'T')).toBe(false);
  });
});

// ─── analyzeStrand: Forward Strand Detection ────────────────────────────────

describe('analyzeStrand — forward strand detection', () => {
  it('should detect forward strand when genotypes match reference alleles', () => {
    const refs = makeNonPalindromicRefs(50);
    const genotypes = buildForwardGenotypes(refs);

    const result = analyzeStrand(genotypes, refs);

    expect(result.isReverseStrand).toBe(false);
    expect(result.isAmbiguous).toBe(false);
    expect(result.forwardMatches).toBeGreaterThan(0);
    expect(result.reverseMatches).toBe(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('should set confidence to 1.0 when all SNPs match forward', () => {
    const refs = makeNonPalindromicRefs(30);
    const genotypes = buildForwardGenotypes(refs);

    const result = analyzeStrand(genotypes, refs);

    expect(result.confidence).toBe(1);
    expect(result.forwardMatches).toBe(result.snpsSampled);
  });

  it('should report correct snpsSampled count', () => {
    const refs = makeNonPalindromicRefs(20);
    const genotypes = buildForwardGenotypes(refs);

    const result = analyzeStrand(genotypes, refs);

    expect(result.snpsSampled).toBe(20);
  });
});

// ─── analyzeStrand: Reverse Strand Detection ────────────────────────────────

describe('analyzeStrand — reverse strand detection', () => {
  it('should detect reverse strand when genotypes match complement of reference', () => {
    const refs = makeNonPalindromicRefs(50);
    const genotypes = buildReverseGenotypes(refs);

    const result = analyzeStrand(genotypes, refs);

    expect(result.isReverseStrand).toBe(true);
    expect(result.isAmbiguous).toBe(false);
    expect(result.reverseMatches).toBeGreaterThan(0);
    expect(result.forwardMatches).toBe(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('should set confidence to 1.0 when all SNPs match reverse', () => {
    const refs = makeNonPalindromicRefs(30);
    const genotypes = buildReverseGenotypes(refs);

    const result = analyzeStrand(genotypes, refs);

    expect(result.confidence).toBe(1);
    expect(result.reverseMatches).toBe(result.snpsSampled);
  });
});

// ─── analyzeStrand: Palindromic SNP Filtering ───────────────────────────────

describe('analyzeStrand — palindromic SNP filtering', () => {
  it('should count complement-matching SNPs as reverse strand, not filter them', () => {
    // Palindromic filtering is done at reference list curation time, not at
    // runtime. At runtime, if sample allele equals complement of reference,
    // it counts as a reverse strand match.
    const palRefs = makePalindromicRefs(30);
    const genotypes: Record<string, string> = {};
    for (const ref of palRefs) {
      // ref=A → genotype=TT (complement match → reverse)
      // ref=C → genotype=GG (complement match → reverse)
      if (ref.referenceAllele === 'A') {
        genotypes[ref.rsid] = 'TT';
      } else {
        genotypes[ref.rsid] = 'GG';
      }
    }

    const result = analyzeStrand(genotypes, palRefs);

    // All SNPs are complement matches → counted as reverse strand
    expect(result.snpsSampled).toBe(30);
    expect(result.isReverseStrand).toBe(true);
    expect(result.isAmbiguous).toBe(false);
    expect(result.forwardMatches).toBe(0);
    expect(result.reverseMatches).toBe(30);
  });

  it('should count all informative SNPs regardless of palindromic pairing', () => {
    // Create a mix: 20 forward-matching refs + 20 reverse-matching refs
    const nonPalRefs = makeNonPalindromicRefs(20);
    const palRefs = makePalindromicRefs(20);
    const allRefs = [...nonPalRefs, ...palRefs];

    // Forward genotypes for first group, reverse (complement) for second
    const genotypes: Record<string, string> = {};
    for (const ref of nonPalRefs) {
      const a = ref.referenceAllele.toUpperCase();
      genotypes[ref.rsid] = a + a;
    }
    for (const ref of palRefs) {
      if (ref.referenceAllele === 'A') {
        genotypes[ref.rsid] = 'TT';
      } else {
        genotypes[ref.rsid] = 'GG';
      }
    }

    const result = analyzeStrand(genotypes, allRefs);

    // All 40 SNPs should be counted (20 forward + 20 reverse)
    expect(result.snpsSampled).toBe(40);
    expect(result.forwardMatches).toBe(20);
    expect(result.reverseMatches).toBe(20);
    // 50/50 split → ambiguous
    expect(result.isAmbiguous).toBe(true);
  });
});

// ─── analyzeStrand: Ambiguous Detection ─────────────────────────────────────

describe('analyzeStrand — ambiguous detection', () => {
  it('should be ambiguous when forward and reverse are evenly mixed', () => {
    // Create 30 refs: 15 forward + 15 reverse
    const refs = makeNonPalindromicRefs(30);

    const genotypes: Record<string, string> = {};
    refs.forEach((ref, i) => {
      const allele = ref.referenceAllele.toUpperCase();
      if (i < 15) {
        // Forward match
        genotypes[ref.rsid] = allele + allele;
      } else {
        // Reverse match (complement)
        const comp: Record<string, string> = { A: 'T', C: 'G', G: 'C', T: 'A' };
        const c = comp[allele]!;
        genotypes[ref.rsid] = c + c;
      }
    });

    const result = analyzeStrand(genotypes, refs);

    expect(result.isAmbiguous).toBe(true);
    expect(result.isReverseStrand).toBe(false); // default when ambiguous
    expect(result.forwardMatches).toBe(15);
    expect(result.reverseMatches).toBe(15);
  });

  it('should be ambiguous when ratio is below threshold (e.g., 80% forward)', () => {
    // 20 refs: 16 forward, 4 reverse => 80% forward < 90% threshold
    const refs = makeNonPalindromicRefs(20);
    const genotypes: Record<string, string> = {};
    const complements: Record<string, string> = { A: 'T', C: 'G', G: 'C', T: 'A' };

    refs.forEach((ref, i) => {
      const allele = ref.referenceAllele.toUpperCase();
      if (i < 16) {
        genotypes[ref.rsid] = allele + allele;
      } else {
        const c = complements[allele]!;
        genotypes[ref.rsid] = c + c;
      }
    });

    const result = analyzeStrand(genotypes, refs);

    expect(result.isAmbiguous).toBe(true);
    expect(result.forwardMatches).toBe(16);
    expect(result.reverseMatches).toBe(4);
  });

  it('should NOT be ambiguous when ratio meets threshold exactly (e.g., 90% forward)', () => {
    // 20 refs: 18 forward, 2 reverse => 90% forward = 90% threshold
    const refs = makeNonPalindromicRefs(20);
    const genotypes: Record<string, string> = {};
    const complements: Record<string, string> = { A: 'T', C: 'G', G: 'C', T: 'A' };

    refs.forEach((ref, i) => {
      const allele = ref.referenceAllele.toUpperCase();
      if (i < 18) {
        genotypes[ref.rsid] = allele + allele;
      } else {
        const c = complements[allele]!;
        genotypes[ref.rsid] = c + c;
      }
    });

    const result = analyzeStrand(genotypes, refs);

    expect(result.isAmbiguous).toBe(false);
    expect(result.isReverseStrand).toBe(false);
    expect(result.confidence).toBeCloseTo(0.9, 5);
  });

  it('should be ambiguous when insufficient informative SNPs (<10)', () => {
    const refs = makeNonPalindromicRefs(5);
    const genotypes = buildForwardGenotypes(refs);

    const result = analyzeStrand(genotypes, refs);

    expect(result.isAmbiguous).toBe(true);
    expect(result.snpsSampled).toBe(5);
  });
});

// ─── analyzeStrand: Custom Threshold ────────────────────────────────────────

describe('analyzeStrand — custom threshold', () => {
  it('should use custom threshold when provided', () => {
    // 20 refs: 16 forward, 4 reverse => 80% forward
    // Default threshold (0.9) would be ambiguous, but 0.7 should pass
    const refs = makeNonPalindromicRefs(20);
    const genotypes: Record<string, string> = {};
    const complements: Record<string, string> = { A: 'T', C: 'G', G: 'C', T: 'A' };

    refs.forEach((ref, i) => {
      const allele = ref.referenceAllele.toUpperCase();
      if (i < 16) {
        genotypes[ref.rsid] = allele + allele;
      } else {
        const c = complements[allele]!;
        genotypes[ref.rsid] = c + c;
      }
    });

    // With 0.7 threshold, 80% forward should be non-ambiguous
    const result = analyzeStrand(genotypes, refs, undefined, 0.7);

    expect(result.isAmbiguous).toBe(false);
    expect(result.isReverseStrand).toBe(false);
  });

  it('should use custom sample size when provided', () => {
    const refs = makeNonPalindromicRefs(100);
    const genotypes = buildForwardGenotypes(refs);

    // Request only 20 samples
    const result = analyzeStrand(genotypes, refs, 20);

    expect(result.snpsSampled).toBeLessThanOrEqual(20);
    expect(result.isReverseStrand).toBe(false);
  });
});

// ─── analyzeStrand: Edge Cases ──────────────────────────────────────────────

describe('analyzeStrand — edge cases', () => {
  it('should handle empty genotype map', () => {
    const refs = makeNonPalindromicRefs(50);
    const result = analyzeStrand({}, refs);

    expect(result.snpsSampled).toBe(0);
    expect(result.isAmbiguous).toBe(true);
    expect(result.forwardMatches).toBe(0);
    expect(result.reverseMatches).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it('should handle empty reference alleles array', () => {
    const genotypes = { rs123: 'AA', rs456: 'CC' };
    const result = analyzeStrand(genotypes, []);

    expect(result.snpsSampled).toBe(0);
    expect(result.isAmbiguous).toBe(true);
  });

  it('should handle both empty inputs', () => {
    const result = analyzeStrand({}, []);

    expect(result.snpsSampled).toBe(0);
    expect(result.isAmbiguous).toBe(true);
    expect(result.confidence).toBe(0);
  });

  it('should skip heterozygous genotypes', () => {
    const refs: ReferenceAllele[] = [
      { rsid: 'rs1', chromosome: '1', referenceAllele: 'A' },
      { rsid: 'rs2', chromosome: '2', referenceAllele: 'C' },
      { rsid: 'rs3', chromosome: '3', referenceAllele: 'A' },
    ];
    // rs1 heterozygous (skip), rs2 heterozygous (skip), rs3 homozygous forward
    const genotypes: Record<string, string> = {
      rs1: 'AG',
      rs2: 'CT',
      rs3: 'AA',
    };

    const result = analyzeStrand(genotypes, refs);

    // Only rs3 should be sampled (heterozygous ones skipped)
    expect(result.snpsSampled).toBe(1);
    expect(result.forwardMatches).toBe(1);
  });

  it('should skip genotypes with wrong length', () => {
    const refs: ReferenceAllele[] = [
      { rsid: 'rs1', chromosome: '1', referenceAllele: 'A' },
      { rsid: 'rs2', chromosome: '2', referenceAllele: 'C' },
    ];
    const genotypes: Record<string, string> = {
      rs1: 'A', // length 1 — skip
      rs2: 'CCC', // length 3 — skip
    };

    const result = analyzeStrand(genotypes, refs);

    expect(result.snpsSampled).toBe(0);
    expect(result.isAmbiguous).toBe(true);
  });

  it('should skip variant sites (allele is neither ref nor complement)', () => {
    const refs: ReferenceAllele[] = [
      { rsid: 'rs1', chromosome: '1', referenceAllele: 'A' }, // complement = T
    ];
    // Genotype is CC — neither A (forward) nor T (reverse) — this is a variant
    const genotypes: Record<string, string> = {
      rs1: 'CC',
    };

    const result = analyzeStrand(genotypes, refs);

    // CC vs ref A: A/C is non-palindromic, but CC doesn't match A (forward) or T (reverse)
    // Wait — actually complementAllele('A') = 'T'. CC !== A and CC[0]=C !== T. So it's skipped.
    // Actually let me re-examine: the allele is C, ref is A, complement is T.
    // C !== A and C !== T, so this is filtered out in the eligible check.
    expect(result.snpsSampled).toBe(0);
    expect(result.isAmbiguous).toBe(true);
  });

  it('should skip SNPs not present in genotype map', () => {
    const refs: ReferenceAllele[] = [
      { rsid: 'rs_missing_1', chromosome: '1', referenceAllele: 'A' },
      { rsid: 'rs_missing_2', chromosome: '2', referenceAllele: 'C' },
    ];

    const result = analyzeStrand({ rs_other: 'AA' }, refs);

    expect(result.snpsSampled).toBe(0);
    expect(result.isAmbiguous).toBe(true);
  });
});

// ─── analyzeStrand: Chromosome Distribution ─────────────────────────────────

describe('analyzeStrand — chromosome distribution', () => {
  it('should sample from multiple chromosomes when available', () => {
    // Create 100 refs across 22 chromosomes, request 22 samples
    const refs = makeNonPalindromicRefs(100);
    const genotypes = buildForwardGenotypes(refs);

    const result = analyzeStrand(genotypes, refs, 22);

    // Should have sampled at most 22, from multiple chromosomes
    expect(result.snpsSampled).toBeLessThanOrEqual(22);
    expect(result.snpsSampled).toBeGreaterThan(0);
    expect(result.isReverseStrand).toBe(false);
  });

  it('should handle all SNPs on a single chromosome', () => {
    const refs: ReferenceAllele[] = [];
    for (let i = 0; i < 30; i++) {
      refs.push({
        rsid: `rs_chr1_${i}`,
        chromosome: '1',
        referenceAllele: i % 2 === 0 ? 'A' : 'C',
      });
    }
    const genotypes = buildForwardGenotypes(refs);

    const result = analyzeStrand(genotypes, refs, 15);

    expect(result.snpsSampled).toBe(15);
    expect(result.isReverseStrand).toBe(false);
  });
});

// ─── flipStrand ─────────────────────────────────────────────────────────────

describe('flipStrand', () => {
  it('should complement each allele in a homozygous genotype', () => {
    const flipped = flipStrand({ rs1: 'AA' });
    expect(flipped['rs1']).toBe('TT');
  });

  it('should complement each allele in a heterozygous genotype', () => {
    const flipped = flipStrand({ rs1: 'AG' });
    expect(flipped['rs1']).toBe('TC');
  });

  it('should complement all four nucleotides correctly', () => {
    const flipped = flipStrand({
      rs1: 'AA',
      rs2: 'TT',
      rs3: 'CC',
      rs4: 'GG',
    });
    expect(flipped['rs1']).toBe('TT');
    expect(flipped['rs2']).toBe('AA');
    expect(flipped['rs3']).toBe('GG');
    expect(flipped['rs4']).toBe('CC');
  });

  it('should complement mixed heterozygous genotypes', () => {
    const flipped = flipStrand({
      rs1: 'AC',
      rs2: 'GT',
      rs3: 'CG',
      rs4: 'TA',
    });
    expect(flipped['rs1']).toBe('TG');
    expect(flipped['rs2']).toBe('CA');
    expect(flipped['rs3']).toBe('GC');
    expect(flipped['rs4']).toBe('AT');
  });

  it('should handle lowercase alleles', () => {
    const flipped = flipStrand({ rs1: 'ag' });
    expect(flipped['rs1']).toBe('tc');
  });

  it('should preserve non-nucleotide characters (e.g., indels)', () => {
    const flipped = flipStrand({ rs1: '-A', rs2: 'DI' });
    // '-' is not a nucleotide — should be kept as-is; 'A' => 'T'
    expect(flipped['rs1']).toBe('-T');
    // 'D' and 'I' are not nucleotides — kept as-is
    expect(flipped['rs2']).toBe('DI');
  });

  it('should return a new object (not mutate input)', () => {
    const original = { rs1: 'AA', rs2: 'CC' };
    const flipped = flipStrand(original);

    expect(flipped).not.toBe(original);
    expect(original['rs1']).toBe('AA');
    expect(original['rs2']).toBe('CC');
    expect(flipped['rs1']).toBe('TT');
    expect(flipped['rs2']).toBe('GG');
  });

  it('should handle empty genotype map', () => {
    const flipped = flipStrand({});
    expect(Object.keys(flipped)).toHaveLength(0);
  });

  it('should be its own inverse (double flip returns original)', () => {
    const original = { rs1: 'AG', rs2: 'CT', rs3: 'GG', rs4: 'TT' };
    const doubleFlipped = flipStrand(flipStrand(original));

    expect(doubleFlipped).toEqual(original);
  });

  it('should handle empty genotype strings', () => {
    const flipped = flipStrand({ rs1: '' });
    expect(flipped['rs1']).toBe('');
  });
});

// ─── harmonizeStrand ────────────────────────────────────────────────────────

describe('harmonizeStrand', () => {
  it('should return original genotypes when file is on forward strand', () => {
    const refs = makeNonPalindromicRefs(30);
    const genotypes = buildForwardGenotypes(refs);

    const { genotypes: harmonized, analysis } = harmonizeStrand(genotypes, refs);

    expect(analysis.isReverseStrand).toBe(false);
    expect(analysis.isAmbiguous).toBe(false);
    expect(harmonized).toBe(genotypes); // same reference — no flip needed
  });

  it('should flip genotypes when file is on reverse strand', () => {
    const refs = makeNonPalindromicRefs(30);
    const reverseGenotypes = buildReverseGenotypes(refs);

    const { genotypes: harmonized, analysis } = harmonizeStrand(reverseGenotypes, refs);

    expect(analysis.isReverseStrand).toBe(true);
    expect(analysis.isAmbiguous).toBe(false);
    // Harmonized genotypes should now match forward strand
    expect(harmonized).not.toBe(reverseGenotypes); // different object
    for (const ref of refs) {
      const expected = ref.referenceAllele.toUpperCase();
      expect(harmonized[ref.rsid]).toBe(expected + expected);
    }
  });

  it('should return original genotypes when ambiguous (do not flip)', () => {
    // Mix of forward and reverse — 50/50
    const refs = makeNonPalindromicRefs(30);
    const genotypes: Record<string, string> = {};
    const complements: Record<string, string> = { A: 'T', C: 'G', G: 'C', T: 'A' };

    refs.forEach((ref, i) => {
      const allele = ref.referenceAllele.toUpperCase();
      if (i < 15) {
        genotypes[ref.rsid] = allele + allele;
      } else {
        const c = complements[allele]!;
        genotypes[ref.rsid] = c + c;
      }
    });

    const { genotypes: harmonized, analysis } = harmonizeStrand(genotypes, refs);

    expect(analysis.isAmbiguous).toBe(true);
    expect(harmonized).toBe(genotypes); // same reference — not flipped
  });

  it('should include analysis metadata in the result', () => {
    const refs = makeNonPalindromicRefs(30);
    const genotypes = buildForwardGenotypes(refs);

    const { analysis } = harmonizeStrand(genotypes, refs);

    expect(analysis).toHaveProperty('isReverseStrand');
    expect(analysis).toHaveProperty('confidence');
    expect(analysis).toHaveProperty('snpsSampled');
    expect(analysis).toHaveProperty('forwardMatches');
    expect(analysis).toHaveProperty('reverseMatches');
    expect(analysis).toHaveProperty('isAmbiguous');
  });

  it('should handle empty genotype map gracefully', () => {
    const refs = makeNonPalindromicRefs(30);
    const { genotypes: harmonized, analysis } = harmonizeStrand({}, refs);

    expect(analysis.isAmbiguous).toBe(true);
    expect(Object.keys(harmonized)).toHaveLength(0);
  });

  it('should also flip non-reference SNPs in the genotype map', () => {
    const refs = makeNonPalindromicRefs(30);
    // Build reverse genotypes for ref SNPs
    const genotypes = buildReverseGenotypes(refs);
    // Add extra SNPs not in the reference list
    genotypes['rs_extra_1'] = 'AA';
    genotypes['rs_extra_2'] = 'CG';
    genotypes['rs_extra_3'] = 'TT';

    const { genotypes: harmonized, analysis } = harmonizeStrand(genotypes, refs);

    expect(analysis.isReverseStrand).toBe(true);
    // Extra SNPs should also be flipped
    expect(harmonized['rs_extra_1']).toBe('TT');
    expect(harmonized['rs_extra_2']).toBe('GC');
    expect(harmonized['rs_extra_3']).toBe('AA');
  });
});

// ─── STRAND_REFERENCE_SNPS Constant ─────────────────────────────────────────

describe('STRAND_REFERENCE_SNPS', () => {
  it('should contain at least 40 reference SNPs', () => {
    expect(STRAND_REFERENCE_SNPS.length).toBeGreaterThanOrEqual(40);
  });

  it('should cover all 22 autosomes', () => {
    const chromosomes = new Set(STRAND_REFERENCE_SNPS.map((r) => r.chromosome));
    for (let i = 1; i <= 22; i++) {
      expect(chromosomes.has(String(i))).toBe(true);
    }
  });

  it('should have valid reference alleles (A, C, G, or T)', () => {
    const validAlleles = new Set(['A', 'C', 'G', 'T']);
    for (const ref of STRAND_REFERENCE_SNPS) {
      expect(validAlleles.has(ref.referenceAllele.toUpperCase())).toBe(true);
    }
  });

  it('should have valid rsid format for all entries', () => {
    for (const ref of STRAND_REFERENCE_SNPS) {
      // All rsids should start with "rs" (some have suffixes like "_10" for dedup)
      expect(ref.rsid.startsWith('rs')).toBe(true);
    }
  });

  it('should have unique rsids', () => {
    const rsids = STRAND_REFERENCE_SNPS.map((r) => r.rsid);
    const uniqueRsids = new Set(rsids);
    expect(uniqueRsids.size).toBe(rsids.length);
  });
});

// ─── Integration: Using STRAND_REFERENCE_SNPS ───────────────────────────────

describe('integration with STRAND_REFERENCE_SNPS', () => {
  it('should detect forward strand with built-in reference data', () => {
    const genotypes = buildForwardGenotypes(STRAND_REFERENCE_SNPS);
    const result = analyzeStrand(genotypes, STRAND_REFERENCE_SNPS);

    // Many of the built-in refs will be non-palindromic and thus usable
    expect(result.snpsSampled).toBeGreaterThan(0);
    expect(result.forwardMatches).toBeGreaterThan(0);
    // Should detect as forward strand (though some palindromic ones filtered)
    expect(result.isReverseStrand).toBe(false);
  });

  it('should detect reverse strand with built-in reference data', () => {
    const genotypes = buildReverseGenotypes(STRAND_REFERENCE_SNPS);
    const result = analyzeStrand(genotypes, STRAND_REFERENCE_SNPS);

    expect(result.snpsSampled).toBeGreaterThan(0);
    expect(result.reverseMatches).toBeGreaterThan(0);
    expect(result.isReverseStrand).toBe(true);
  });

  it('should run harmonizeStrand end-to-end with built-in data (forward)', () => {
    const genotypes = buildForwardGenotypes(STRAND_REFERENCE_SNPS);
    const { genotypes: harmonized, analysis } = harmonizeStrand(genotypes, STRAND_REFERENCE_SNPS);

    expect(analysis.isReverseStrand).toBe(false);
    expect(harmonized).toBe(genotypes);
  });

  it('should run harmonizeStrand end-to-end with built-in data (reverse)', () => {
    const genotypes = buildReverseGenotypes(STRAND_REFERENCE_SNPS);
    const { genotypes: harmonized, analysis } = harmonizeStrand(genotypes, STRAND_REFERENCE_SNPS);

    expect(analysis.isReverseStrand).toBe(true);
    // After harmonization, the reference SNPs should now match forward
    for (const ref of STRAND_REFERENCE_SNPS) {
      const expected = ref.referenceAllele.toUpperCase() + ref.referenceAllele.toUpperCase();
      // Only check if the SNP was in the genotypes (some may have been filtered)
      if (genotypes[ref.rsid] !== undefined) {
        expect(harmonized[ref.rsid]).toBe(expected);
      }
    }
  });
});
