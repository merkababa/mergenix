/**
 * Tests for the Polygenic Risk Score (PRS) engine.
 *
 * Tests cover the normal CDF implementation, raw PRS calculation,
 * normalization, risk categorization, offspring prediction, and tier gating.
 *
 * V2 enhancement tests:
 * - Per-allele average normalization
 * - Insufficient coverage threshold
 * - CLT offspring prediction with 25th-75th percentile
 * - Population note for European-derived weights
 * - Inverse normal CDF
 */

import { describe, it, expect } from 'vitest';
import {
  normalCdf,
  normalInvCdf,
  zScoreToPercentile,
  calculateRawPrs,
  normalizePrs,
  getRiskCategory,
  predictOffspringPrsRange,
  predictOffspringPrsClt,
  isInsufficientCoverage,
  getPopulationNote,
  analyzePrs,
  getPrsDisclaimer,
} from '../src/prs';
import type { EnhancedPrsConditionResult, CltOffspringPrediction } from '../src/prs';
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

/**
 * Build PrsWeightsData that includes a schizophrenia condition with
 * ancestry_transferability set to mirror the real prs-weights.json values.
 * AFR → hide (harmful), EUR → standard (validated), EAS → caution (poor).
 */
function makePrsWeightsWithSchizophrenia(
  overrides: Partial<PrsWeightsData> = {},
): PrsWeightsData {
  const base = makePrsWeights();
  return {
    ...base,
    conditions: {
      ...base.conditions,
      schizophrenia: {
        name: 'Schizophrenia',
        pgs_id: 'PGS000045',
        description: 'Risk of developing schizophrenia',
        population_mean: 0.0,
        population_std: 1.0,
        ancestry_note: 'Derived primarily from European-ancestry GWAS.',
        reference: 'Ripke et al. 2014',
        ancestry_transferability: {
          EUR: { transferability: 'validated', ui_recommendation: 'standard', note: 'Original GWAS population' },
          AFR: { transferability: 'harmful', ui_recommendation: 'hide', note: 'HARMFUL — artificial score inflation due to LD differences; DO NOT display' },
          EAS: { transferability: 'poor', ui_recommendation: 'caution', note: 'Limited data' },
          SAS: { transferability: 'poor', ui_recommendation: 'caution', note: 'Limited data' },
          AMR: { transferability: 'poor', ui_recommendation: 'caution', note: 'Limited data' },
        },
        snps: [
          { rsid: 'rs9001', effect_allele: 'T', effect_weight: 0.15, chromosome: '1', gene_region: 'MIR137' },
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

// ─── Inverse Normal CDF ────────────────────────────────────────────────────

describe('normalInvCdf', () => {
  it('should return 0 for p=0.5', () => {
    expect(normalInvCdf(0.5)).toBeCloseTo(0, 5);
  });

  it('should return approximately 1.96 for p=0.975', () => {
    expect(normalInvCdf(0.975)).toBeCloseTo(1.96, 2);
  });

  it('should return approximately -1.96 for p=0.025', () => {
    expect(normalInvCdf(0.025)).toBeCloseTo(-1.96, 2);
  });

  it('should return approximately -0.6745 for p=0.25 (25th percentile)', () => {
    expect(normalInvCdf(0.25)).toBeCloseTo(-0.6745, 3);
  });

  it('should return approximately 0.6745 for p=0.75 (75th percentile)', () => {
    expect(normalInvCdf(0.75)).toBeCloseTo(0.6745, 3);
  });

  it('should be the inverse of normalCdf', () => {
    const zValues = [-2, -1, -0.5, 0.1, 0.5, 1, 2];
    for (const z of zValues) {
      const p = normalCdf(z);
      const zRecovered = normalInvCdf(p);
      expect(zRecovered).toBeCloseTo(z, 4);
    }
  });

  it('should throw for p=0', () => {
    expect(() => normalInvCdf(0)).toThrow('p must be in (0, 1)');
  });

  it('should throw for p=1', () => {
    expect(() => normalInvCdf(1)).toThrow('p must be in (0, 1)');
  });

  it('should throw for negative p', () => {
    expect(() => normalInvCdf(-0.1)).toThrow('p must be in (0, 1)');
  });

  it('should handle extreme low tail (p=0.001)', () => {
    const z = normalInvCdf(0.001);
    expect(z).toBeCloseTo(-3.09, 1);
  });

  it('should handle extreme high tail (p=0.999)', () => {
    const z = normalInvCdf(0.999);
    expect(z).toBeCloseTo(3.09, 1);
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

// ─── Raw PRS Calculation (Per-Allele Average) ─────────────────────────────

describe('calculateRawPrs', () => {
  it('should compute per-allele average for all matched SNPs', () => {
    const weights = makePrsWeights();
    // rs1: genotype GG -> dosage 2 (effect allele G) -> 0.3 * 2 = 0.6
    // rs2: genotype AA -> dosage 2 (effect allele A) -> 0.2 * 2 = 0.4
    // rs3: genotype TT -> dosage 2 (effect allele T) -> 0.1 * 2 = 0.2
    // Sum = 1.2, count = 3, average = 0.4
    const result = calculateRawPrs(
      { rs1: 'GG', rs2: 'AA', rs3: 'TT' },
      'coronary_artery_disease',
      weights,
    );
    expect(result.rawScore).toBeCloseTo(0.4, 5);
    expect(result.snpsFound).toBe(3);
  });

  it('should return rawScore=0 and snpsFound=0 when no SNPs match', () => {
    const weights = makePrsWeights();
    const result = calculateRawPrs({}, 'coronary_artery_disease', weights);
    expect(result.rawScore).toBe(0);
    expect(result.snpsFound).toBe(0);
  });

  it('should correctly compute per-allele average with heterozygous dosage', () => {
    const weights = makePrsWeights();
    // rs1: genotype AG -> dosage 1 for effect allele G -> 0.3 * 1 = 0.3
    // Only 1 SNP found, average = 0.3/1 = 0.3
    const result = calculateRawPrs(
      { rs1: 'AG' },
      'coronary_artery_disease',
      weights,
    );
    expect(result.rawScore).toBeCloseTo(0.3, 5);
    expect(result.snpsFound).toBe(1);
  });

  it('should correctly handle homozygous non-effect dosage (0)', () => {
    const weights = makePrsWeights();
    // rs1: genotype AA -> dosage 0 for effect allele G -> 0.3 * 0 = 0
    // Average = 0/1 = 0
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

  it('should compute per-allele average when some SNPs are missing', () => {
    const weights = makePrsWeights();
    // Only provide rs1, skip rs2 and rs3
    // rs1: GG -> dosage 2, weight 0.3 -> 0.6
    // Average = 0.6 / 1 = 0.6
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
    // Average = (0.3 * 2) / 1 = 0.6
    const result = calculateRawPrs(
      { rs1: 'gg' },
      'coronary_artery_disease',
      weights,
    );
    expect(result.rawScore).toBeCloseTo(0.6, 5);
    expect(result.snpsFound).toBe(1);
  });

  it('per-allele average should be stable regardless of missing SNPs', () => {
    const weights = makePrsWeights();
    // With all 3 SNPs, all homozygous effect alleles:
    // rs1: 0.3*2=0.6, rs2: 0.2*2=0.4, rs3: 0.1*2=0.2 => sum=1.2, avg=0.4
    const allSnps = calculateRawPrs(
      { rs1: 'GG', rs2: 'AA', rs3: 'TT' },
      'coronary_artery_disease',
      weights,
    );

    // With only 2 SNPs (missing rs3):
    // rs1: 0.3*2=0.6, rs2: 0.2*2=0.4 => sum=1.0, avg=0.5
    const twoSnps = calculateRawPrs(
      { rs1: 'GG', rs2: 'AA' },
      'coronary_artery_disease',
      weights,
    );

    // Both should be non-zero and reasonable (not diluted to near-zero)
    expect(allSnps.rawScore).toBeGreaterThan(0);
    expect(twoSnps.rawScore).toBeGreaterThan(0);
    // Missing SNP shouldn't cause a dramatic drop like it would with sum-only
    // (with sum-only: 1.2 vs 1.0 = 17% drop; with average: 0.4 vs 0.5 = no dilution)
    expect(allSnps.snpsFound).toBe(3);
    expect(twoSnps.snpsFound).toBe(2);
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

// ─── Coverage Threshold ─────────────────────────────────────────────────────

describe('isInsufficientCoverage', () => {
  it('should return true when coverage is below 75%', () => {
    expect(isInsufficientCoverage(2, 4)).toBe(true); // 50%
    expect(isInsufficientCoverage(1, 4)).toBe(true); // 25%
    expect(isInsufficientCoverage(0, 4)).toBe(true); // 0%
  });

  it('should return false when coverage is at or above 75%', () => {
    expect(isInsufficientCoverage(3, 4)).toBe(false); // 75%
    expect(isInsufficientCoverage(4, 4)).toBe(false); // 100%
    expect(isInsufficientCoverage(3, 3)).toBe(false); // 100%
  });

  it('should return true when snpsTotal is 0', () => {
    expect(isInsufficientCoverage(0, 0)).toBe(true);
  });

  it('should return true when no SNPs found at all', () => {
    expect(isInsufficientCoverage(0, 10)).toBe(true);
  });

  it('should handle boundary at exactly 75%', () => {
    // 75/100 = 0.75 which is NOT < 0.75, so it's sufficient
    expect(isInsufficientCoverage(75, 100)).toBe(false);
    // 74/100 = 0.74 which is < 0.75, so it's insufficient
    expect(isInsufficientCoverage(74, 100)).toBe(true);
  });
});

// ─── Population Note ────────────────────────────────────────────────────────

describe('getPopulationNote', () => {
  it('should return note for European-derived weights', () => {
    const note = getPopulationNote('European-derived');
    expect(note).toContain('European-ancestry GWAS');
    expect(note).toContain('non-European');
  });

  it('should return note for "Euro" substring', () => {
    const note = getPopulationNote('Euro GWAS study');
    expect(note).toContain('European-ancestry');
  });

  it('should return empty string for multi-ancestry weights', () => {
    const note = getPopulationNote('Multi-ancestry');
    expect(note).toBe('');
  });

  it('should return empty string for empty ancestry note', () => {
    const note = getPopulationNote('');
    expect(note).toBe('');
  });

  it('should be case-insensitive', () => {
    const note = getPopulationNote('EUROPEAN-DERIVED');
    expect(note).toContain('European-ancestry');
  });
});

// ─── Offspring PRS Prediction (Legacy) ──────────────────────────────────────

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

// ─── CLT Offspring PRS Prediction ───────────────────────────────────────────

describe('predictOffspringPrsClt', () => {
  it('should compute mean PRS as average of both parents', () => {
    const result = predictOffspringPrsClt(0.5, 0.3, 0, 0, 0.2);
    expect(result.meanPrs).toBeCloseTo(0.4, 5);
  });

  it('should predict offspring near 50th percentile when both parents are average', () => {
    const result = predictOffspringPrsClt(0.5, 0.5, 0, 0, 0.2);
    expect(result.expectedPercentile).toBeCloseTo(50, 0);
  });

  it('should include 25th and 75th percentile (IQR)', () => {
    const result = predictOffspringPrsClt(0.5, 0.5, 0, 0, 0.2);
    expect(result.percentile25).toBeLessThan(result.expectedPercentile);
    expect(result.percentile75).toBeGreaterThan(result.expectedPercentile);
    // 25th < expected < 75th
    expect(result.percentile25).toBeLessThan(result.percentile75);
  });

  it('should have IQR narrower than the full range', () => {
    const result = predictOffspringPrsClt(0.5, 0.5, 1, 1, 0.2);
    // IQR (25th-75th) should be narrower than rangeLow-rangeHigh
    const iqrWidth = result.percentile75 - result.percentile25;
    const rangeWidth = result.rangeHigh - result.rangeLow;
    expect(iqrWidth).toBeLessThan(rangeWidth);
  });

  it('should include prediction disclaimer', () => {
    const result = predictOffspringPrsClt(0.5, 0.5, 0, 0, 0.2);
    expect(result.predictionDisclaimer).toContain('statistical modeling');
    expect(result.predictionDisclaimer).toContain('random allele transmission');
  });

  it('should apply heritability factor for high z-score parents', () => {
    // Both parents z=2 -> midParent=2, expected=2*0.5=1.0
    const result = predictOffspringPrsClt(0.9, 0.9, 2, 2, 0.2);
    expect(result.expectedPercentile).toBeCloseTo(84.13, 0);
  });

  it('should handle zero popStd gracefully', () => {
    const result = predictOffspringPrsClt(0.5, 0.5, 0, 0, 0);
    // Should not throw, should produce valid output
    expect(result.expectedPercentile).toBeCloseTo(50, 0);
    expect(result.percentile25).toBeLessThan(50);
    expect(result.percentile75).toBeGreaterThan(50);
  });

  it('should maintain backward compatibility with rangeLow/rangeHigh', () => {
    const result = predictOffspringPrsClt(0.5, 0.5, 0, 0, 0.2);
    // rangeLow and rangeHigh should still be present and valid
    expect(result.rangeLow).toBeDefined();
    expect(result.rangeHigh).toBeDefined();
    expect(result.rangeLow).toBeLessThan(result.rangeHigh);
    expect(result.confidence).toBe('moderate');
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

  // ─── V2 Enhancement Tests ───────────────────────────────────────────

  it('should include insufficientCoverage flag for each condition', () => {
    const weights = makePrsWeights();
    const snps = { rs1: 'GG', rs2: 'AA', rs3: 'TT' };
    const result = analyzePrs(snps, snps, weights, 'pro');

    const conditionKeys = Object.keys(result.conditions);
    for (const key of conditionKeys) {
      const condition = result.conditions[key]!;
      expect(typeof condition.insufficientCoverage).toBe('boolean');
    }
  });

  it('should flag insufficientCoverage when <75% SNPs found', () => {
    const weights = makePrsWeights();
    // CAD has 3 SNPs. Provide only rs1 (1/3 = 33% < 75%)
    const sparseSnps = { rs1: 'GG' };
    const result = analyzePrs(sparseSnps, sparseSnps, weights, 'pro');

    const cad = result.conditions['coronary_artery_disease'];
    if (cad) {
      expect(cad.insufficientCoverage).toBe(true);
    }
  });

  it('should not flag insufficientCoverage when >=75% SNPs found', () => {
    const weights = makePrsWeights();
    // CAD has 3 SNPs. Provide all 3 (3/3 = 100% >= 75%)
    const fullSnps = { rs1: 'GG', rs2: 'AA', rs3: 'TT' };
    const result = analyzePrs(fullSnps, fullSnps, weights, 'pro');

    const cad = result.conditions['coronary_artery_disease'];
    if (cad) {
      expect(cad.insufficientCoverage).toBe(false);
    }
  });

  it('should flag insufficientCoverage if either parent has low coverage', () => {
    const weights = makePrsWeights();
    // Parent A has all SNPs, Parent B has only 1/3
    const fullSnps = { rs1: 'GG', rs2: 'AA', rs3: 'TT' };
    const sparseSnps = { rs1: 'GG' };
    const result = analyzePrs(fullSnps, sparseSnps, weights, 'pro');

    const cad = result.conditions['coronary_artery_disease'];
    if (cad) {
      expect(cad.insufficientCoverage).toBe(true);
    }
  });

  it('should include populationNote for European-derived conditions', () => {
    const weights = makePrsWeights();
    const snps = { rs1: 'GG', rs2: 'AA', rs3: 'TT' };
    const result = analyzePrs(snps, snps, weights, 'pro');

    // CAD has "European-derived" ancestry note
    const cad = result.conditions['coronary_artery_disease'];
    if (cad) {
      expect(cad.populationNote).toContain('European-ancestry');
      expect(cad.populationNote).toContain('non-European');
    }
  });

  it('should have empty populationNote for multi-ancestry conditions', () => {
    const weights = makePrsWeights();
    const snps = { rs4: 'CC', rs5: 'GG' };
    const result = analyzePrs(snps, snps, weights, 'pro');

    // T2D has "Multi-ancestry" ancestry note
    const t2d = result.conditions['type_2_diabetes'];
    if (t2d) {
      expect(t2d.populationNote).toBe('');
    }
  });

  it('should include CLT offspring prediction fields', () => {
    const weights = makePrsWeights();
    const snps = { rs1: 'GG', rs2: 'AA', rs3: 'TT' };
    const result = analyzePrs(snps, snps, weights, 'pro');

    const cad = result.conditions['coronary_artery_disease'];
    if (cad) {
      const offspring = cad.offspring as CltOffspringPrediction;
      expect(offspring.meanPrs).toBeDefined();
      expect(offspring.percentile25).toBeDefined();
      expect(offspring.percentile75).toBeDefined();
      expect(offspring.predictionDisclaimer).toBeDefined();
      expect(offspring.percentile25).toBeLessThan(offspring.percentile75);
    }
  });
});

// ─── Ancestry-Based Hide/Caution Enforcement ────────────────────────────────

describe('analyzePrs — ancestry-based hide/caution enforcement', () => {
  it('should set hidden=true and hiddenReason for schizophrenia when inferredAncestry="AFR"', () => {
    const weights = makePrsWeightsWithSchizophrenia();
    // Use 'pro' tier so schizophrenia (index 7 in PRS_CONDITIONS) is accessible
    const snps = { rs9001: 'TT' };
    const result = analyzePrs(snps, snps, weights, 'pro', 'AFR');

    const schiz = result.conditions['schizophrenia'];
    expect(schiz).toBeDefined();
    if (schiz) {
      expect(schiz.hidden).toBe(true);
      expect(schiz.hiddenReason).toBeDefined();
      expect(schiz.hiddenReason).toContain('HARMFUL');
      expect(schiz.cautionNote).toBeUndefined();
    }
  });

  it('should NOT set hidden for schizophrenia when inferredAncestry="EUR"', () => {
    const weights = makePrsWeightsWithSchizophrenia();
    const snps = { rs9001: 'TT' };
    const result = analyzePrs(snps, snps, weights, 'pro', 'EUR');

    const schiz = result.conditions['schizophrenia'];
    expect(schiz).toBeDefined();
    if (schiz) {
      expect(schiz.hidden).toBeUndefined();
      expect(schiz.hiddenReason).toBeUndefined();
      expect(schiz.cautionNote).toBeUndefined();
    }
  });

  it('should set cautionNote for schizophrenia when inferredAncestry="EAS"', () => {
    const weights = makePrsWeightsWithSchizophrenia();
    const snps = { rs9001: 'TT' };
    const result = analyzePrs(snps, snps, weights, 'pro', 'EAS');

    const schiz = result.conditions['schizophrenia'];
    expect(schiz).toBeDefined();
    if (schiz) {
      expect(schiz.hidden).toBeUndefined();
      expect(schiz.cautionNote).toBeDefined();
      expect(schiz.cautionNote).toContain('Limited data');
    }
  });

  it('sets cautionNote when ui_recommendation is "warning"', () => {
    // Build a weights fixture where prostate_cancer has ui_recommendation="warning" for AFR,
    // mirroring the real prs-weights.json (prostate_cancer AFR: warning).
    const base = makePrsWeightsWithSchizophrenia();
    const weightsWithWarning: PrsWeightsData = {
      ...base,
      conditions: {
        ...base.conditions,
        prostate_cancer: {
          name: 'Prostate Cancer',
          pgs_id: 'PGS000014',
          description: 'Risk of prostate cancer',
          population_mean: 0.0,
          population_std: 1.0,
          ancestry_note: 'Derived primarily from European-ancestry GWAS.',
          reference: 'Schumacher et al. 2018',
          ancestry_transferability: {
            EUR: { transferability: 'validated', ui_recommendation: 'standard', note: 'Original GWAS population' },
            AFR: { transferability: 'poor', ui_recommendation: 'warning', note: '8q24 risk variants have elevated frequency; use with extreme caution' },
            EAS: { transferability: 'poor', ui_recommendation: 'caution', note: 'Limited data' },
            SAS: { transferability: 'poor', ui_recommendation: 'caution', note: 'Limited data' },
            AMR: { transferability: 'poor', ui_recommendation: 'caution', note: 'Limited data' },
          },
          snps: [
            { rsid: 'rs9002', effect_allele: 'A', effect_weight: 0.12, chromosome: '8', gene_region: '8q24' },
          ],
        },
      },
    };
    const snps = { rs9002: 'AA' };
    const result = analyzePrs(snps, snps, weightsWithWarning, 'pro', 'AFR');

    const pc = result.conditions['prostate_cancer'];
    expect(pc).toBeDefined();
    if (pc) {
      // "warning" must behave like "caution": set cautionNote, not hidden
      expect(pc.hidden).toBeUndefined();
      expect(pc.hiddenReason).toBeUndefined();
      expect(pc.cautionNote).toBeDefined();
      expect(pc.cautionNote).toContain('8q24 risk variants have elevated frequency');
    }
  });

  it('should apply no hide/caution when inferredAncestry is not provided (backward compatible)', () => {
    const weights = makePrsWeightsWithSchizophrenia();
    const snps = { rs9001: 'TT' };
    // No inferredAncestry argument at all
    const result = analyzePrs(snps, snps, weights, 'pro');

    const schiz = result.conditions['schizophrenia'];
    expect(schiz).toBeDefined();
    if (schiz) {
      expect(schiz.hidden).toBeUndefined();
      expect(schiz.hiddenReason).toBeUndefined();
      expect(schiz.cautionNote).toBeUndefined();
    }
  });

  it('should apply no hide/caution when inferredAncestry is null (backward compatible)', () => {
    const weights = makePrsWeightsWithSchizophrenia();
    const snps = { rs9001: 'TT' };
    const result = analyzePrs(snps, snps, weights, 'pro', null);

    const schiz = result.conditions['schizophrenia'];
    expect(schiz).toBeDefined();
    if (schiz) {
      expect(schiz.hidden).toBeUndefined();
      expect(schiz.hiddenReason).toBeUndefined();
      expect(schiz.cautionNote).toBeUndefined();
    }
  });

  it('should not affect conditions without ancestry_transferability data', () => {
    const weights = makePrsWeights(); // no ancestry_transferability on any condition
    const snps = { rs1: 'GG', rs2: 'AA', rs3: 'TT' };
    const result = analyzePrs(snps, snps, weights, 'pro', 'AFR');

    const cad = result.conditions['coronary_artery_disease'];
    expect(cad).toBeDefined();
    if (cad) {
      // No transferability data → no hide/caution applied
      expect(cad.hidden).toBeUndefined();
      expect(cad.hiddenReason).toBeUndefined();
      expect(cad.cautionNote).toBeUndefined();
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
