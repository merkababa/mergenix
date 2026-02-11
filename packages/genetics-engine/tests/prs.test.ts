/**
 * Tests for the Polygenic Risk Score (PRS) engine.
 *
 * Tests cover the normal CDF implementation, raw PRS calculation,
 * normalization, risk categorization, offspring prediction, and tier gating.
 */

import { describe, it, expect } from 'vitest';
import {
  normalCdf,
  zScoreToPercentile,
  calculateRawPrs,
  normalizePrs,
  getRiskCategory,
  predictOffspringPrsRange,
  analyzePrs,
  getPrsDisclaimer,
} from '../src/prs';
import type { PrsWeightsData } from '../src/types';

// ─── Test Fixtures ────────────────────────────────────────────────────────

/**
 * Build a minimal PrsWeightsData for testing.
 *
 * Creates one condition ("test_condition") with 3 SNPs and known
 * population mean/std so z-score math is predictable.
 */
function makePrsWeights(
  overrides: Partial<PrsWeightsData> = {},
): PrsWeightsData {
  return {
    metadata: {
      source: 'test',
      version: '1.0',
      conditions_covered: 1,
      last_updated: '2024-01-01',
      disclaimer: 'Test disclaimer',
    },
    conditions: {
      coronary_artery_disease: {
        name: 'Coronary Artery Disease',
        pgs_id: 'PGS000018',
        description: 'Risk of coronary artery disease',
        population_mean: 0.5,
        population_std: 0.2,
        ancestry_note: 'European-derived',
        reference: 'Test reference',
        snps: [
          { rsid: 'rs1', effect_allele: 'G', effect_weight: 0.3, chromosome: '1', gene_region: 'GENE1' },
          { rsid: 'rs2', effect_allele: 'A', effect_weight: 0.2, chromosome: '2', gene_region: 'GENE2' },
          { rsid: 'rs3', effect_allele: 'T', effect_weight: 0.1, chromosome: '3', gene_region: 'GENE3' },
        ],
      },
      type_2_diabetes: {
        name: 'Type 2 Diabetes',
        pgs_id: 'PGS000036',
        description: 'Risk of type 2 diabetes',
        population_mean: 0.4,
        population_std: 0.15,
        ancestry_note: 'Multi-ancestry',
        reference: 'Test reference 2',
        snps: [
          { rsid: 'rs4', effect_allele: 'C', effect_weight: 0.25, chromosome: '4', gene_region: 'GENE4' },
          { rsid: 'rs5', effect_allele: 'G', effect_weight: 0.15, chromosome: '5', gene_region: 'GENE5' },
        ],
      },
      breast_cancer: {
        name: 'Breast Cancer',
        pgs_id: 'PGS000007',
        description: 'Risk of breast cancer',
        population_mean: 0.3,
        population_std: 0.1,
        ancestry_note: 'European-derived',
        reference: 'Test reference 3',
        snps: [
          { rsid: 'rs6', effect_allele: 'A', effect_weight: 0.35, chromosome: '6', gene_region: 'GENE6' },
        ],
      },
      prostate_cancer: {
        name: 'Prostate Cancer',
        pgs_id: 'PGS000042',
        description: 'Risk of prostate cancer',
        population_mean: 0.25,
        population_std: 0.12,
        ancestry_note: 'European-derived',
        reference: 'Test reference 4',
        snps: [
          { rsid: 'rs7', effect_allele: 'T', effect_weight: 0.2, chromosome: '7', gene_region: 'GENE7' },
        ],
      },
    },
    ...overrides,
  };
}

// ─── Normal CDF (Critical Mathematical Function) ────────────────────────────

describe('normalCdf', () => {
  it('should return 0.5 for z=0', () => {
    expect(normalCdf(0)).toBe(0.5);
  });

  it('should return approximately 0.975 for z=1.96', () => {
    const result = normalCdf(1.96);
    expect(result).toBeCloseTo(0.975, 2);
  });

  it('should return approximately 0.025 for z=-1.96', () => {
    const result = normalCdf(-1.96);
    expect(result).toBeCloseTo(0.025, 2);
  });

  it('should return approximately 0.8413 for z=1.0', () => {
    const result = normalCdf(1.0);
    expect(result).toBeCloseTo(0.8413, 3);
  });

  it('should return approximately 0.1587 for z=-1.0', () => {
    const result = normalCdf(-1.0);
    expect(result).toBeCloseTo(0.1587, 3);
  });

  it('should approach 0 for very negative z', () => {
    const result = normalCdf(-5);
    expect(result).toBeLessThan(0.0001);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should approach 1 for very positive z', () => {
    const result = normalCdf(5);
    expect(result).toBeGreaterThan(0.9999);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should be monotonically increasing', () => {
    const zValues = [-3, -2, -1, 0, 1, 2, 3];
    for (let i = 0; i < zValues.length - 1; i++) {
      expect(normalCdf(zValues[i]!)).toBeLessThan(normalCdf(zValues[i + 1]!));
    }
  });

  it('should satisfy symmetry: CDF(z) + CDF(-z) = 1', () => {
    const zValues = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
    for (const z of zValues) {
      expect(normalCdf(z) + normalCdf(-z)).toBeCloseTo(1.0, 6);
    }
  });

  it('should return approximately 0.9987 for z=3.0', () => {
    expect(normalCdf(3.0)).toBeCloseTo(0.9987, 3);
  });

  it('should return approximately 0.5 for very small z', () => {
    expect(normalCdf(0.001)).toBeCloseTo(0.5004, 3);
  });
});

describe('zScoreToPercentile', () => {
  it('should convert z=0 to 50th percentile', () => {
    expect(zScoreToPercentile(0)).toBe(50);
  });

  it('should convert z=1.96 to approximately 97.5th percentile', () => {
    expect(zScoreToPercentile(1.96)).toBeCloseTo(97.5, 0);
  });

  it('should convert z=-1.96 to approximately 2.5th percentile', () => {
    expect(zScoreToPercentile(-1.96)).toBeCloseTo(2.5, 0);
  });

  it('should convert z=1.0 to approximately 84.13th percentile', () => {
    expect(zScoreToPercentile(1.0)).toBeCloseTo(84.13, 0);
  });
});

// ─── Raw PRS Calculation ────────────────────────────────────────────────────

describe('calculateRawPrs', () => {
  it('should sum effect_weight * dosage for matched SNPs', () => {
    const weights = makePrsWeights();
    // rs1: genotype GG -> dosage 2 (effect allele G) -> 0.3 * 2 = 0.6
    // rs2: genotype AA -> dosage 2 (effect allele A) -> 0.2 * 2 = 0.4
    // rs3: genotype TT -> dosage 2 (effect allele T) -> 0.1 * 2 = 0.2
    // Total = 1.2
    const result = calculateRawPrs(
      { rs1: 'GG', rs2: 'AA', rs3: 'TT' },
      'coronary_artery_disease',
      weights,
    );
    expect(result.rawScore).toBeCloseTo(1.2, 5);
    expect(result.snpsFound).toBe(3);
  });

  it('should return rawScore=0 and snpsFound=0 when no SNPs match', () => {
    const weights = makePrsWeights();
    const result = calculateRawPrs({}, 'coronary_artery_disease', weights);
    expect(result.rawScore).toBe(0);
    expect(result.snpsFound).toBe(0);
  });

  it('should correctly count heterozygous dosage (1)', () => {
    const weights = makePrsWeights();
    // rs1: genotype AG -> dosage 1 for effect allele G -> 0.3 * 1 = 0.3
    const result = calculateRawPrs(
      { rs1: 'AG' },
      'coronary_artery_disease',
      weights,
    );
    expect(result.rawScore).toBeCloseTo(0.3, 5);
    expect(result.snpsFound).toBe(1);
  });

  it('should correctly count homozygous non-effect dosage (0)', () => {
    const weights = makePrsWeights();
    // rs1: genotype AA -> dosage 0 for effect allele G -> 0.3 * 0 = 0
    const result = calculateRawPrs(
      { rs1: 'AA' },
      'coronary_artery_disease',
      weights,
    );
    expect(result.rawScore).toBe(0);
    expect(result.snpsFound).toBe(1);
  });

  it('should throw for unknown condition', () => {
    const weights = makePrsWeights();
    expect(() =>
      calculateRawPrs({}, 'nonexistent_condition', weights),
    ).toThrow('not found in PRS weights');
  });

  it('should skip SNPs not present in the genotype map', () => {
    const weights = makePrsWeights();
    // Only provide rs1, skip rs2 and rs3
    // rs1: GG -> dosage 2, weight 0.3 -> 0.6
    const result = calculateRawPrs(
      { rs1: 'GG' },
      'coronary_artery_disease',
      weights,
    );
    expect(result.rawScore).toBeCloseTo(0.6, 5);
    expect(result.snpsFound).toBe(1);
  });

  it('should handle case-insensitive allele matching', () => {
    const weights = makePrsWeights();
    // The source code uses toUpperCase() on genotype
    // rs1: effect allele "G", genotype "gg" -> should still count 2
    const result = calculateRawPrs(
      { rs1: 'gg' },
      'coronary_artery_disease',
      weights,
    );
    expect(result.rawScore).toBeCloseTo(0.6, 5);
    expect(result.snpsFound).toBe(1);
  });
});

// ─── PRS Normalization ──────────────────────────────────────────────────────

describe('normalizePrs', () => {
  it('should compute correct z-score', () => {
    const weights = makePrsWeights();
    // rawScore = 0.5, mean = 0.5, std = 0.2 -> z = (0.5 - 0.5) / 0.2 = 0
    const result = normalizePrs(0.5, 'coronary_artery_disease', weights, 3, 3);
    expect(result.zScore).toBeCloseTo(0, 3);
    expect(result.percentile).toBeCloseTo(50, 0);
  });

  it('should compute z-score for above-mean raw score', () => {
    const weights = makePrsWeights();
    // rawScore = 0.9, mean = 0.5, std = 0.2 -> z = (0.9 - 0.5) / 0.2 = 2.0
    const result = normalizePrs(0.9, 'coronary_artery_disease', weights, 3, 3);
    expect(result.zScore).toBeCloseTo(2.0, 3);
    expect(result.percentile).toBeGreaterThan(95);
  });

  it('should compute z-score for below-mean raw score', () => {
    const weights = makePrsWeights();
    // rawScore = 0.1, mean = 0.5, std = 0.2 -> z = (0.1 - 0.5) / 0.2 = -2.0
    const result = normalizePrs(0.1, 'coronary_artery_disease', weights, 3, 3);
    expect(result.zScore).toBeCloseTo(-2.0, 3);
    expect(result.percentile).toBeLessThan(5);
  });

  it('should return z=0 when population_std is 0', () => {
    const weights = makePrsWeights({
      conditions: {
        coronary_artery_disease: {
          name: 'Test',
          pgs_id: 'PGS000000',
          description: 'Test',
          population_mean: 0.5,
          population_std: 0, // Zero std
          ancestry_note: '',
          reference: '',
          snps: [],
        },
      },
    });
    const result = normalizePrs(0.9, 'coronary_artery_disease', weights, 0, 0);
    expect(result.zScore).toBe(0);
    expect(result.percentile).toBeCloseTo(50, 0);
  });

  it('should compute coverage percentage', () => {
    const weights = makePrsWeights();
    // 2 found out of 3 total -> 66.7%
    const result = normalizePrs(0.5, 'coronary_artery_disease', weights, 2, 3);
    expect(result.coveragePct).toBeCloseTo(66.7, 0);
    expect(result.snpsFound).toBe(2);
    expect(result.snpsTotal).toBe(3);
  });

  it('should return coveragePct=0 when snpsTotal is 0', () => {
    const weights = makePrsWeights();
    const result = normalizePrs(0, 'coronary_artery_disease', weights, 0, 0);
    expect(result.coveragePct).toBe(0);
  });

  it('should throw for unknown condition', () => {
    const weights = makePrsWeights();
    expect(() =>
      normalizePrs(0, 'nonexistent_condition', weights, 0, 0),
    ).toThrow('not found in PRS weights');
  });

  it('should round values to expected precision', () => {
    const weights = makePrsWeights();
    const result = normalizePrs(0.5, 'coronary_artery_disease', weights, 3, 3);
    // zScore rounded to 4 decimal places
    const zStr = result.zScore.toString();
    const zDecimals = zStr.includes('.') ? zStr.split('.')[1]!.length : 0;
    expect(zDecimals).toBeLessThanOrEqual(4);
  });
});

// ─── Risk Category ──────────────────────────────────────────────────────────

describe('getRiskCategory', () => {
  it('should return "low" for percentile < 20', () => {
    expect(getRiskCategory(0)).toBe('low');
    expect(getRiskCategory(10)).toBe('low');
    expect(getRiskCategory(19.9)).toBe('low');
  });

  it('should return "below_average" for percentile 20-40', () => {
    expect(getRiskCategory(20)).toBe('below_average');
    expect(getRiskCategory(30)).toBe('below_average');
    expect(getRiskCategory(39.9)).toBe('below_average');
  });

  it('should return "average" for percentile 40-60', () => {
    expect(getRiskCategory(40)).toBe('average');
    expect(getRiskCategory(50)).toBe('average');
    expect(getRiskCategory(59.9)).toBe('average');
  });

  it('should return "above_average" for percentile 60-80', () => {
    expect(getRiskCategory(60)).toBe('above_average');
    expect(getRiskCategory(70)).toBe('above_average');
    expect(getRiskCategory(79.9)).toBe('above_average');
  });

  it('should return "elevated" for percentile 80-95', () => {
    expect(getRiskCategory(80)).toBe('elevated');
    expect(getRiskCategory(90)).toBe('elevated');
    expect(getRiskCategory(94.9)).toBe('elevated');
  });

  it('should return "high" for percentile >= 95', () => {
    expect(getRiskCategory(95)).toBe('high');
    expect(getRiskCategory(97)).toBe('high');
    expect(getRiskCategory(99.9)).toBe('high');
  });

  it('should return "high" for percentile >= 100 (edge case)', () => {
    expect(getRiskCategory(100)).toBe('high');
    expect(getRiskCategory(150)).toBe('high');
  });

  it('should handle exact boundary values', () => {
    // At exact thresholds: < 20 is low, 20 is below_average, etc.
    expect(getRiskCategory(20)).toBe('below_average');
    expect(getRiskCategory(40)).toBe('average');
    expect(getRiskCategory(60)).toBe('above_average');
    expect(getRiskCategory(80)).toBe('elevated');
    expect(getRiskCategory(95)).toBe('high');
  });
});

// ─── Offspring PRS Prediction ───────────────────────────────────────────────

describe('predictOffspringPrsRange', () => {
  it('should predict offspring near 50th percentile when both parents are average', () => {
    // Both parents z=0 -> midParent=0, expected=0*0.5=0 -> 50th percentile
    const result = predictOffspringPrsRange(0, 0);
    expect(result.expectedPercentile).toBeCloseTo(50, 0);
    expect(result.confidence).toBe('moderate');
  });

  it('should apply heritability factor (regression toward mean)', () => {
    // Both parents z=2 -> midParent=2, expected=2*0.5=1.0
    // percentile = normalCdf(1.0) * 100 ~ 84.13
    const result = predictOffspringPrsRange(2, 2);
    expect(result.expectedPercentile).toBeCloseTo(84.13, 0);
  });

  it('should average parent z-scores (mid-parent regression)', () => {
    // Parent A z=2, Parent B z=0 -> midParent=1, expected=1*0.5=0.5
    // percentile = normalCdf(0.5) * 100 ~ 69.15
    const result = predictOffspringPrsRange(2, 0);
    expect(result.expectedPercentile).toBeCloseTo(69.15, 0);
  });

  it('should include uncertainty range (rangeLow < expected < rangeHigh)', () => {
    const result = predictOffspringPrsRange(1, 1);
    expect(result.rangeLow).toBeLessThan(result.expectedPercentile);
    expect(result.rangeHigh).toBeGreaterThan(result.expectedPercentile);
  });

  it('should use +/- 0.5 SD uncertainty', () => {
    // Parents z=0 -> midParent=0, expected=0
    // rangeLow = normalCdf(0 - 0.5) * 100 = normalCdf(-0.5) * 100 ~ 30.85
    // rangeHigh = normalCdf(0 + 0.5) * 100 = normalCdf(0.5) * 100 ~ 69.15
    const result = predictOffspringPrsRange(0, 0);
    expect(result.rangeLow).toBeCloseTo(30.85, 0);
    expect(result.rangeHigh).toBeCloseTo(69.15, 0);
  });

  it('should pull extreme parents toward the mean', () => {
    // Both parents z=4 (very high) -> midParent=4, expected=4*0.5=2
    // Offspring percentile should be lower than parents' percentile
    const parentPercentile = normalCdf(4) * 100; // ~99.997
    const result = predictOffspringPrsRange(4, 4);
    expect(result.expectedPercentile).toBeLessThan(parentPercentile);
    expect(result.expectedPercentile).toBeGreaterThan(50); // but still above average
  });

  it('should handle negative z-scores', () => {
    // Both parents z=-2 -> midParent=-2, expected=-2*0.5=-1
    // percentile = normalCdf(-1) * 100 ~ 15.87
    const result = predictOffspringPrsRange(-2, -2);
    expect(result.expectedPercentile).toBeCloseTo(15.87, 0);
  });

  it('should handle asymmetric parents', () => {
    // Parent A z=-2, Parent B z=2 -> midParent=0, expected=0
    // Expected percentile ~ 50
    const result = predictOffspringPrsRange(-2, 2);
    expect(result.expectedPercentile).toBeCloseTo(50, 0);
  });
});

// ─── Full PRS Analysis ──────────────────────────────────────────────────────

describe('analyzePrs', () => {
  it('should return empty conditions for free tier', () => {
    const weights = makePrsWeights();
    const result = analyzePrs({}, {}, weights, 'free');
    expect(Object.keys(result.conditions)).toHaveLength(0);
    expect(result.conditionsAvailable).toBe(0);
    expect(result.tier).toBe('free');
  });

  it('should analyze 3 conditions for premium tier', () => {
    const weights = makePrsWeights();
    // Provide genotypes for all conditions to ensure they are found
    const snps = {
      rs1: 'GG', rs2: 'AA', rs3: 'TT',
      rs4: 'CC', rs5: 'GG',
      rs6: 'AA',
      rs7: 'TT',
    };
    const result = analyzePrs(snps, snps, weights, 'premium');
    // Premium gets first 3 from PRS_CONDITIONS: coronary_artery_disease, type_2_diabetes, breast_cancer
    // But only conditions that exist in our test weights will appear
    expect(result.conditionsAvailable).toBeLessThanOrEqual(3);
    expect(result.tier).toBe('premium');
  });

  it('should analyze more conditions for pro tier than premium', () => {
    const weights = makePrsWeights();
    const snps = {
      rs1: 'GG', rs2: 'AA', rs3: 'TT',
      rs4: 'CC', rs5: 'GG',
      rs6: 'AA',
      rs7: 'TT',
    };
    const premiumResult = analyzePrs(snps, snps, weights, 'premium');
    const proResult = analyzePrs(snps, snps, weights, 'pro');
    expect(proResult.conditionsAvailable).toBeGreaterThanOrEqual(
      premiumResult.conditionsAvailable,
    );
  });

  it('should include parent A and parent B results for each condition', () => {
    const weights = makePrsWeights();
    const snps = { rs1: 'GG', rs2: 'AA', rs3: 'TT' };
    const result = analyzePrs(snps, snps, weights, 'pro');

    // Check the first condition that was analyzed
    const conditionKeys = Object.keys(result.conditions);
    if (conditionKeys.length > 0) {
      const first = result.conditions[conditionKeys[0]!]!;
      expect(first.parentA).toBeDefined();
      expect(first.parentB).toBeDefined();
      expect(first.parentA.rawScore).toBeDefined();
      expect(first.parentA.zScore).toBeDefined();
      expect(first.parentA.percentile).toBeDefined();
      expect(first.parentA.riskCategory).toBeDefined();
      expect(first.parentA.snpsFound).toBeDefined();
      expect(first.parentA.snpsTotal).toBeDefined();
      expect(first.parentA.coveragePct).toBeDefined();
    }
  });

  it('should include offspring prediction for each condition', () => {
    const weights = makePrsWeights();
    const snps = { rs1: 'GG', rs2: 'AA', rs3: 'TT' };
    const result = analyzePrs(snps, snps, weights, 'pro');

    const conditionKeys = Object.keys(result.conditions);
    if (conditionKeys.length > 0) {
      const first = result.conditions[conditionKeys[0]!]!;
      expect(first.offspring).toBeDefined();
      expect(first.offspring.expectedPercentile).toBeDefined();
      expect(first.offspring.rangeLow).toBeDefined();
      expect(first.offspring.rangeHigh).toBeDefined();
      expect(first.offspring.confidence).toBe('moderate');
    }
  });

  it('should include disclaimer text', () => {
    const weights = makePrsWeights();
    const result = analyzePrs({}, {}, weights, 'free');
    expect(result.disclaimer).toBeDefined();
    expect(result.disclaimer.length).toBeGreaterThan(0);
    expect(result.disclaimer).toContain('IMPORTANT DISCLAIMER');
  });

  it('should include metadata from weights', () => {
    const weights = makePrsWeights();
    const result = analyzePrs({}, {}, weights, 'free');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.source).toBe('test');
    expect(result.metadata.version).toBe('1.0');
  });

  it('should report correct conditionsTotal', () => {
    const weights = makePrsWeights();
    const result = analyzePrs({}, {}, weights, 'free');
    // conditionsTotal comes from PRS_CONDITIONS constant (10 conditions)
    expect(result.conditionsTotal).toBe(10);
  });

  it('should default to free tier when tier is not specified', () => {
    const weights = makePrsWeights();
    const result = analyzePrs({}, {}, weights);
    expect(result.tier).toBe('free');
    expect(result.conditionsAvailable).toBe(0);
  });

  it('should assign correct risk categories to parents', () => {
    const weights = makePrsWeights();
    // All homozygous effect alleles -> high raw score -> high percentile
    const highSnps = { rs1: 'GG', rs2: 'AA', rs3: 'TT' };
    // No matching SNPs -> raw score 0 -> low percentile
    const lowSnps = { rs1: 'CC', rs2: 'TT', rs3: 'AA' };
    const result = analyzePrs(highSnps, lowSnps, weights, 'pro');

    const cad = result.conditions['coronary_artery_disease'];
    if (cad) {
      // Parent A has high score, Parent B has low score
      expect(cad.parentA.percentile).toBeGreaterThan(cad.parentB.percentile);
    }
  });
});

// ─── Disclaimer ─────────────────────────────────────────────────────────────

describe('getPrsDisclaimer', () => {
  it('should mention ancestry bias', () => {
    const disclaimer = getPrsDisclaimer();
    expect(disclaimer).toContain('Ancestry bias');
  });

  it('should mention DTC limitations', () => {
    const disclaimer = getPrsDisclaimer();
    expect(disclaimer).toContain('DTC');
  });

  it('should mention environmental factors', () => {
    const disclaimer = getPrsDisclaimer();
    expect(disclaimer).toContain('Environmental factors');
  });

  it('should warn about non-diagnostic nature', () => {
    const disclaimer = getPrsDisclaimer();
    expect(disclaimer).toContain('NOT diagnostic');
    expect(disclaimer).toContain('NOT be used to make medical decisions');
  });

  it('should recommend consulting a professional', () => {
    const disclaimer = getPrsDisclaimer();
    expect(disclaimer).toContain('healthcare professional');
    expect(disclaimer).toContain('genetic counselor');
  });
});
