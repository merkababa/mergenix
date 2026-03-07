/**
 * Polygenic Risk Score (PRS) Engine
 *
 * Calculates polygenic risk scores by aggregating the effects of multiple
 * genetic variants (SNPs) across the genome to estimate an individual's
 * genetic predisposition to common complex diseases.
 *
 * PRS is fundamentally different from single-gene carrier analysis: instead
 * of looking at one variant with a large effect, PRS sums many small effects
 * across dozens to hundreds of SNPs.
 *
 * IMPORTANT: PRS results are for educational/informational purposes only.
 *
 * Key computation: requires a pure TypeScript implementation of the normal CDF
 * (replacing scipy.stats.norm.cdf from the Python version).
 *
 * Ported from Source/prs.py (417 lines).
 *
 * V2 enhancements:
 * - Per-allele average normalization (handles missing data gracefully)
 * - Coverage threshold (insufficientCoverage flag when <75% SNPs found)
 * - CLT-based offspring PRS prediction with 25th-75th percentile range
 * - Ancestry detection note for European-derived PRS weights
 */

import type {
  RiskCategory,
  PrsParentResult,
  PrsOffspringPrediction,
  PrsConditionResult,
  PrsAnalysisResult,
  PrsMetadata,
  Tier,
  GenotypeMap,
  PrsWeightsData,
  PrsConditionDefinition,
} from './types';

import { TIER_GATING } from './types';
import { PRS_CONDITIONS } from '@mergenix/genetics-data';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Risk category thresholds (percentile-based).
 * Sourced from Source/prs.py _RISK_THRESHOLDS.
 */
const RISK_THRESHOLDS: Array<[number, RiskCategory]> = [
  [20.0, 'low'],
  [40.0, 'below_average'],
  [60.0, 'average'],
  [80.0, 'above_average'],
  [95.0, 'elevated'],
  [100.0, 'high'],
];

/**
 * Minimum coverage percentage required for a reliable PRS score.
 * If fewer than this fraction of a condition's SNPs are found in the
 * genotype data, the result is flagged as insufficient coverage.
 */
const MIN_COVERAGE_THRESHOLD = 0.75;

/**
 * Default population note for European-derived PRS weights.
 * Applied when PRS weights are derived from European-ancestry GWAS studies.
 */
const EUROPEAN_DERIVED_POPULATION_NOTE =
  'These PRS weights are primarily derived from European-ancestry GWAS studies. ' +
  'Predictive accuracy may be significantly reduced for individuals of non-European ' +
  'ancestry. PRS results should be interpreted with caution for non-European populations.';

// ─── Extended Types ─────────────────────────────────────────────────────────

/**
 * Extended PRS condition result with coverage threshold, population note,
 * and ancestry-based hide/caution enforcement fields.
 * Extends the base PrsConditionResult from shared-types with additional fields.
 */
export interface EnhancedPrsConditionResult extends PrsConditionResult {
  /**
   * Whether coverage is insufficient for a reliable score.
   * True when <75% of the condition's SNPs are found in genotype data.
   */
  insufficientCoverage: boolean;

  /**
   * Population-specific note about PRS weight derivation ancestry.
   * Explains reduced accuracy for non-European ancestry when weights
   * are European-derived.
   */
  populationNote: string;

  /**
   * Whether this condition should be hidden for the inferred ancestry group.
   * Set to true when ui_recommendation === "hide" in ancestry_transferability.
   * Only present when inferredAncestry was provided to analyzePrs().
   */
  hidden?: boolean;

  /**
   * Human-readable explanation of why this condition is hidden.
   * Populated from the ancestry_transferability note when hidden === true.
   */
  hiddenReason?: string;

  /**
   * Amber caution note for this condition for the inferred ancestry group.
   * Populated from the ancestry_transferability note when ui_recommendation === "caution".
   */
  cautionNote?: string;
}

/**
 * Extended offspring prediction using Central Limit Theorem.
 * Adds 25th and 75th percentile range and statistical disclaimer.
 */
export interface CltOffspringPrediction extends PrsOffspringPrediction {
  /** Mean offspring PRS (average of both parents' PRS). */
  meanPrs: number;

  /** 25th percentile of predicted offspring PRS distribution. */
  percentile25: number;

  /** 75th percentile of predicted offspring PRS distribution. */
  percentile75: number;

  /** Statistical disclaimer about the prediction methodology. */
  predictionDisclaimer: string;
}

/**
 * Extended PRS analysis result with enhanced condition results.
 * Fully backward-compatible with PrsAnalysisResult.
 */
export interface EnhancedPrsAnalysisResult extends Omit<PrsAnalysisResult, 'conditions'> {
  /** Per-condition results with coverage and population note. */
  conditions: Record<string, EnhancedPrsConditionResult>;
}

// ─── Mathematical Utilities ─────────────────────────────────────────────────

/**
 * Compute the cumulative distribution function (CDF) of the standard normal
 * distribution at a given z-score.
 *
 * CRITICAL: This is a pure TypeScript implementation replacing scipy.stats.norm.cdf.
 * Uses the Abramowitz and Stegun approximation (formula 26.2.17) which provides
 * accuracy to ~7.5e-8.
 *
 * Reference: Abramowitz & Stegun, Handbook of Mathematical Functions, 1964.
 *
 * @param z - Z-score (standard deviations from mean)
 * @returns Probability P(Z <= z), range [0, 1]
 *
 * @example
 * normalCdf(0)     // 0.5 (50th percentile)
 * normalCdf(1.96)  // ~0.975 (97.5th percentile)
 * normalCdf(-1.96) // ~0.025 (2.5th percentile)
 */
export function normalCdf(z: number): number {
  // Abramowitz & Stegun 26.2.17 approximation for the standard normal CDF.
  // Accuracy: ~7.5e-8. Replaces scipy.stats.norm.cdf(z) from Source/prs.py.

  // Exact value for z=0 (avoids floating-point drift in the approximation)
  if (z === 0) {
    return 0.5;
  }

  // Handle negative z via symmetry: CDF(z) = 1 - CDF(-z)
  if (z < 0) {
    return 1 - normalCdf(-z);
  }

  // Coefficients from Abramowitz & Stegun formula 26.2.17
  const p = 0.2316419;
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1.0 / (1.0 + p * z);

  // Standard normal PDF at z: phi(z) = (1/sqrt(2*pi)) * exp(-z^2/2)
  // 0.3989422804014327 = 1 / sqrt(2 * pi)
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2.0);

  // Horner's method for the polynomial evaluation
  const poly = d * t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));

  return 1.0 - poly;
}

/**
 * Compute the inverse CDF (quantile function) of the standard normal distribution.
 *
 * Uses the rational approximation by Peter Acklam (accurate to ~1.15e-9).
 * Reference: https://web.archive.org/web/20151030215612/http://home.online.no/~pjacklam/notes/invnorm/
 *
 * @param p - Probability (0 < p < 1)
 * @returns Z-score such that P(Z <= z) = p
 */
export function normalInvCdf(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error(`normalInvCdf: p must be in (0, 1), got ${p}`);
  }

  // Coefficients for rational approximation
  const a1 = -3.969683028665376e1;
  const a2 = 2.209460984245205e2;
  const a3 = -2.759285104469687e2;
  const a4 = 1.38357751867269e2;
  const a5 = -3.066479806614716e1;
  const a6 = 2.506628277459239;

  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972e1;
  const b5 = -1.328068155288572e1;

  const c1 = -7.784894002430293e-3;
  const c2 = -3.223964580411365e-1;
  const c3 = -2.400758277161838;
  const c4 = -2.549732539343734;
  const c5 = 4.374664141464968;
  const c6 = 2.938163982698783;

  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142996;
  const d4 = 3.754408661907416;

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;

  if (p < pLow) {
    // Rational approximation for lower region
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  } else if (p <= pHigh) {
    // Rational approximation for central region
    q = p - 0.5;
    const r = q * q;
    return (
      ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    );
  } else {
    // Rational approximation for upper region
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  }
}

/**
 * Convert a z-score to a population percentile.
 *
 * @param zScore - Standardized z-score
 * @returns Percentile (0-100)
 */
export function zScoreToPercentile(zScore: number): number {
  return normalCdf(zScore) * 100;
}

// ─── Effect Allele Counting ─────────────────────────────────────────────────

/**
 * Count the dosage of the effect allele in a genotype string.
 *
 * Ported from Source/prs.py `_count_effect_alleles()`.
 *
 * @param genotype - Two-character genotype string (e.g., "AG")
 * @param effectAllele - Single-character effect allele (e.g., "G")
 * @returns Dosage count: 0, 1, or 2
 *
 * @example
 * countEffectAlleles("AG", "G") // 1
 * countEffectAlleles("GG", "G") // 2
 * countEffectAlleles("AA", "G") // 0
 */
function countEffectAlleles(genotype: string, effectAllele: string): number {
  if (!genotype || genotype.length < 2) {
    return 0;
  }
  const upper = genotype.toUpperCase();
  const target = effectAllele.toUpperCase();
  let count = 0;
  for (const allele of upper) {
    if (allele === target) {
      count++;
    }
  }
  return count;
}

// ─── Raw PRS Calculation ────────────────────────────────────────────────────

/**
 * Calculate the raw polygenic risk score for a single condition.
 *
 * Uses per-allele average normalization: the raw score is the sum of
 * (effect_weight * dosage) divided by the number of matched variants.
 * This handles missing data gracefully -- missing SNPs don't dilute the score.
 *
 * When no SNPs are found, rawScore is 0 and snpsFound is 0.
 *
 * Ported from Source/prs.py `calculate_raw_prs()`, enhanced with per-allele averaging.
 *
 * @param snpData - Genotype map (rsid -> genotype)
 * @param condition - Condition key (e.g., "coronary_artery_disease")
 * @param prsWeights - Full PRS weights data
 * @returns Object with rawScore (per-allele average) and snpsFound count
 */
export function calculateRawPrs(
  snpData: GenotypeMap,
  condition: string,
  prsWeights: PrsWeightsData,
): { rawScore: number; snpsFound: number } {
  const conditionData: PrsConditionDefinition | undefined = prsWeights.conditions[condition];

  if (conditionData === undefined) {
    throw new Error(`Condition "${condition}" not found in PRS weights`);
  }

  const snps = conditionData.snps;

  let weightedSum = 0.0;
  let snpsFound = 0;

  for (const snp of snps) {
    const genotype: string | undefined = snpData[snp.rsid];
    if (genotype === undefined) {
      continue;
    }
    snpsFound++;
    const dosage = countEffectAlleles(genotype, snp.effect_allele);
    weightedSum += snp.effect_weight * dosage;
  }

  // Per-allele average normalization: divide by matched variant count.
  // When no SNPs are found, return 0 (avoids division by zero).
  const rawScore = snpsFound > 0 ? weightedSum / snpsFound : 0.0;

  return { rawScore, snpsFound };
}

// ─── PRS Normalization ──────────────────────────────────────────────────────

/**
 * Normalize a raw PRS into z-score and percentile.
 *
 * Uses the population mean and standard deviation from the PRS weights to
 * convert the raw score into a standardized z-score, then converts to a
 * percentile using the normal CDF.
 *
 * Ported from Source/prs.py `normalize_prs()`.
 *
 * @param rawScore - Raw PRS from calculateRawPrs()
 * @param condition - Condition key
 * @param prsWeights - Full PRS weights data
 * @param snpsFound - Number of SNPs found in user data
 * @param snpsTotal - Total number of SNPs in the model
 * @returns Normalized PRS with z-score, percentile, and coverage
 */
export function normalizePrs(
  rawScore: number,
  condition: string,
  prsWeights: PrsWeightsData,
  snpsFound: number,
  snpsTotal: number,
): {
  zScore: number;
  percentile: number;
  rawScore: number;
  snpsFound: number;
  snpsTotal: number;
  coveragePct: number;
} {
  const conditionData: PrsConditionDefinition | undefined = prsWeights.conditions[condition];

  if (conditionData === undefined) {
    throw new Error(`Condition "${condition}" not found in PRS weights`);
  }

  const popMean = conditionData.population_mean;
  const popStd = conditionData.population_std;

  // Avoid division by zero
  let zScore: number;
  if (popStd === 0) {
    zScore = 0.0;
  } else {
    zScore = (rawScore - popMean) / popStd;
  }

  const percentile = normalCdf(zScore) * 100;
  const coveragePct = snpsTotal > 0 ? (snpsFound / snpsTotal) * 100 : 0.0;

  return {
    zScore: Math.round(zScore * 10000) / 10000,
    percentile: Math.round(percentile * 100) / 100,
    rawScore: Math.round(rawScore * 1000000) / 1000000,
    snpsFound,
    snpsTotal,
    coveragePct: Math.round(coveragePct * 10) / 10,
  };
}

// ─── Risk Category ──────────────────────────────────────────────────────────

/**
 * Map a population percentile to a risk category label.
 *
 * Categories (from Source/prs.py _RISK_THRESHOLDS):
 * - "low": < 20th percentile
 * - "below_average": 20th-40th
 * - "average": 40th-60th
 * - "above_average": 60th-80th
 * - "elevated": 80th-95th
 * - "high": > 95th percentile
 *
 * @param percentile - Population percentile (0-100)
 * @returns Risk category string
 */
export function getRiskCategory(percentile: number): RiskCategory {
  for (const [threshold, category] of RISK_THRESHOLDS) {
    if (percentile < threshold) {
      return category;
    }
  }
  // Fallback: if percentile >= 100 (shouldn't happen, but matches Python behavior)
  return 'high';
}

// ─── Coverage Threshold ─────────────────────────────────────────────────────

/**
 * Determine if a condition has sufficient SNP coverage for a reliable PRS.
 *
 * @param snpsFound - Number of SNPs found in user genotype data
 * @param snpsTotal - Total number of SNPs in the PRS model for this condition
 * @returns True if coverage is below the minimum threshold (75%)
 */
export function isInsufficientCoverage(snpsFound: number, snpsTotal: number): boolean {
  if (snpsTotal === 0) {
    return true;
  }
  return snpsFound / snpsTotal < MIN_COVERAGE_THRESHOLD;
}

// ─── Population Note ────────────────────────────────────────────────────────

/**
 * Generate a population-specific note based on the ancestry of PRS weights.
 *
 * Most PRS weights are derived from European-ancestry GWAS studies. This
 * function checks the ancestry_note field and returns an appropriate warning
 * for European-derived weights.
 *
 * @param ancestryNote - The ancestry_note from the PRS weights definition
 * @returns Population note string, or empty string if not European-derived
 */
export function getPopulationNote(ancestryNote: string): string {
  if (!ancestryNote) {
    return '';
  }

  const lowerNote = ancestryNote.toLowerCase();
  if (lowerNote.includes('european') || lowerNote.includes('euro')) {
    return EUROPEAN_DERIVED_POPULATION_NOTE;
  }

  return '';
}

// ─── Offspring PRS Prediction ───────────────────────────────────────────────

/**
 * Predict the expected PRS range for offspring of two parents.
 *
 * Uses mid-parent regression: the offspring's expected PRS is the average
 * of both parents' z-scores, scaled by the narrow-sense heritability (h²) to
 * account for regression toward the population mean.
 *
 * Heritability varies significantly by trait — use trait-specific values when
 * available rather than the generic default:
 * - Height:              h² ≈ 0.8  (high heritability, less regression to mean)
 * - BMI:                 h² ≈ 0.4  (moderate)
 * - Coronary artery disease: h² ≈ 0.5–0.6
 * - Psychiatric traits (schizophrenia, bipolar): h² ≈ 0.3–0.6
 * - Type 2 diabetes:     h² ≈ 0.25–0.35
 * The default of 0.5 is a reasonable population-wide approximation when no
 * trait-specific value is known.
 *
 * The range reflects biological uncertainty from meiotic recombination
 * (approximately +/- 0.5 SD around the expected value).
 *
 * Ported from Source/prs.py `predict_offspring_prs_range()`.
 *
 * @param parentAZScore - Parent A's z-score
 * @param parentBZScore - Parent B's z-score
 * @param heritability - Narrow-sense heritability h² for the trait (0–1).
 *   Defaults to 0.5, a reasonable general approximation. Use trait-specific
 *   values when available (e.g., 0.8 for height, 0.4 for BMI).
 * @returns Predicted offspring percentile range
 */
export function predictOffspringPrsRange(
  parentAZScore: number,
  parentBZScore: number,
  heritability: number = 0.5,
): PrsOffspringPrediction {
  // Mid-parent z-score
  const midParent = (parentAZScore + parentBZScore) / 2.0;

  // Regression toward the mean: offspring expected z = midParent * h²
  // Higher heritability → less regression (offspring stays closer to parents)
  const heritabilityFactor = heritability;
  const expectedOffspring = midParent * heritabilityFactor;

  // Uncertainty range: approximately +/- 0.5 SD around expected
  const uncertainty = 0.5;
  const rangeLowZ = expectedOffspring - uncertainty;
  const rangeHighZ = expectedOffspring + uncertainty;

  const expectedPercentile = normalCdf(expectedOffspring) * 100;
  const rangeLowPct = normalCdf(rangeLowZ) * 100;
  const rangeHighPct = normalCdf(rangeHighZ) * 100;

  return {
    expectedPercentile: Math.round(expectedPercentile * 100) / 100,
    rangeLow: Math.round(rangeLowPct * 100) / 100,
    rangeHigh: Math.round(rangeHighPct * 100) / 100,
    confidence: 'moderate',
  };
}

/**
 * Predict offspring PRS distribution using the Central Limit Theorem.
 *
 * For each PRS SNP, each parent transmits one allele with 50% probability.
 * By CLT, with many SNPs, the offspring PRS is approximately normally distributed:
 *
 * - Mean offspring PRS = (parent1_PRS + parent2_PRS) / 2
 * - Variance is derived from the individual variant contributions:
 *   Each parent transmits one allele (Bernoulli p=0.5), so per-SNP variance
 *   contribution = w^2 * 0.25 for each parent's heterozygous sites.
 *   For simplicity with unknown phase, we use the heritability-based approach:
 *   SD_offspring ~ popStd * sqrt((1 - h²) / 2) around the expected mid-parent value.
 *
 * Heritability varies significantly by trait — use trait-specific values when
 * available rather than the generic default:
 * - Height:              h² ≈ 0.8  (high heritability, less regression to mean)
 * - BMI:                 h² ≈ 0.4  (moderate)
 * - Coronary artery disease: h² ≈ 0.5–0.6
 * - Psychiatric traits (schizophrenia, bipolar): h² ≈ 0.3–0.6
 * - Type 2 diabetes:     h² ≈ 0.25–0.35
 * The default of 0.5 is a reasonable population-wide approximation when no
 * trait-specific value is known.
 *
 * The result includes the 25th-75th percentile range (interquartile range).
 *
 * @param parentAPrs - Parent A's raw PRS (per-allele average)
 * @param parentBPrs - Parent B's raw PRS (per-allele average)
 * @param parentAZScore - Parent A's z-score
 * @param parentBZScore - Parent B's z-score
 * @param popStd - Population standard deviation for this condition
 * @param heritability - Narrow-sense heritability h² for the trait (0–1).
 *   Defaults to 0.5, a reasonable general approximation. Use trait-specific
 *   values when available (e.g., 0.8 for height, 0.4 for BMI).
 * @returns CLT-based offspring prediction with IQR
 */
export function predictOffspringPrsClt(
  parentAPrs: number,
  parentBPrs: number,
  parentAZScore: number,
  parentBZScore: number,
  popStd: number,
  heritability: number = 0.5,
): CltOffspringPrediction {
  // Mean offspring PRS = average of both parents
  const meanPrs = (parentAPrs + parentBPrs) / 2.0;

  // Mid-parent z-score with heritability regression:
  // expectedZ = midParentZ * h²
  // Higher heritability → less regression (offspring stays closer to parents)
  const midParentZ = (parentAZScore + parentBZScore) / 2.0;
  const heritabilityFactor = heritability;
  const expectedZ = midParentZ * heritabilityFactor;

  // Standard deviation of offspring distribution around the expected value.
  // Under CLT with many SNPs and heritability h²:
  // SD_offspring ~ sqrt(1 - h²) * sqrt(0.5)
  // Higher heritability → smaller offspring variance (less environmental noise)
  const offspringStd = popStd > 0 ? Math.sqrt(1 - heritabilityFactor) * Math.sqrt(0.5) * 1.0 : 0.5;

  // 25th and 75th percentile z-offsets (~+/- 0.6745 SD from expected)
  const z25 = normalInvCdf(0.25); // ~ -0.6745
  const z75 = normalInvCdf(0.75); // ~ +0.6745

  const z25Offspring = expectedZ + z25 * offspringStd;
  const z75Offspring = expectedZ + z75 * offspringStd;

  const expectedPercentile = normalCdf(expectedZ) * 100;
  const percentile25 = normalCdf(z25Offspring) * 100;
  const percentile75 = normalCdf(z75Offspring) * 100;

  // Also compute the wider range (using +/- 0.5 SD as before for backward compat)
  const uncertainty = 0.5;
  const rangeLowZ = expectedZ - uncertainty;
  const rangeHighZ = expectedZ + uncertainty;
  const rangeLow = normalCdf(rangeLowZ) * 100;
  const rangeHigh = normalCdf(rangeHighZ) * 100;

  return {
    expectedPercentile: Math.round(expectedPercentile * 100) / 100,
    rangeLow: Math.round(rangeLow * 100) / 100,
    rangeHigh: Math.round(rangeHigh * 100) / 100,
    confidence: 'moderate',
    meanPrs: Math.round(meanPrs * 1000000) / 1000000,
    percentile25: Math.round(percentile25 * 100) / 100,
    percentile75: Math.round(percentile75 * 100) / 100,
    predictionDisclaimer:
      'PRS predictions use statistical modeling and assume random allele transmission. ' +
      'Actual offspring PRS may vary due to non-random segregation, linkage disequilibrium, ' +
      'and environmental factors.',
  };
}

// ─── Main PRS Analysis ──────────────────────────────────────────────────────

/**
 * Main PRS analysis: calculate scores for both parents across all conditions.
 *
 * Tier gating:
 * - Free: 0 conditions (no PRS access)
 * - Premium: First 3 conditions
 * - Pro: All 10 conditions
 *
 * For each condition: calculates individual PRS for both parents,
 * determines risk categories, and predicts offspring PRS range.
 *
 * Enhanced features:
 * - Per-allele average normalization (missing SNPs don't dilute scores)
 * - Coverage threshold: <75% SNP coverage flags insufficientCoverage
 * - CLT-based offspring prediction with 25th-75th percentile IQR
 * - Population note for European-derived PRS weights
 * - Ancestry-based hide/caution enforcement via ancestry_transferability
 *
 * Ported from Source/prs.py `analyze_prs()`.
 *
 * @param parentASnps - Parent A's genotype map
 * @param parentBSnps - Parent B's genotype map
 * @param prsWeights - Full PRS weights data
 * @param tier - Pricing tier (default: "free")
 * @param inferredAncestry - Optional inferred ancestry code ("EUR", "AFR", "EAS", "SAS", "AMR").
 *   When provided, each condition is checked against ancestry_transferability:
 *   - ui_recommendation === "hide" → hidden: true, hiddenReason set from note
 *   - ui_recommendation === "caution" → cautionNote set from note
 *   When omitted (undefined/null), no ancestry filtering is applied (backward-compatible).
 * @returns Full PRS analysis result with enhanced fields
 */
export function analyzePrs(
  parentASnps: GenotypeMap,
  parentBSnps: GenotypeMap,
  prsWeights: PrsWeightsData,
  tier: Tier = 'free',
  inferredAncestry?: string | null,
): EnhancedPrsAnalysisResult {
  // Determine condition limit from centralized tier gating config
  const conditionLimit: number = TIER_GATING[tier].prsConditionLimit;

  // Filter PRS_CONDITIONS to accessible conditions based on tier
  const availableConditions = PRS_CONDITIONS.slice(0, conditionLimit);

  const conditions: Record<string, EnhancedPrsConditionResult> = {};

  for (const condition of availableConditions) {
    const conditionData: PrsConditionDefinition | undefined = prsWeights.conditions[condition];

    if (conditionData === undefined) {
      continue;
    }

    const snpsTotal = conditionData.snps.length;

    // Calculate Parent A PRS
    const parentARaw = calculateRawPrs(parentASnps, condition, prsWeights);
    const parentANorm = normalizePrs(
      parentARaw.rawScore,
      condition,
      prsWeights,
      parentARaw.snpsFound,
      snpsTotal,
    );
    const parentARisk = getRiskCategory(parentANorm.percentile);

    const parentA: PrsParentResult = {
      rawScore: parentANorm.rawScore,
      zScore: parentANorm.zScore,
      percentile: parentANorm.percentile,
      riskCategory: parentARisk,
      snpsFound: parentARaw.snpsFound,
      snpsTotal,
      coveragePct: parentANorm.coveragePct,
    };

    // Calculate Parent B PRS
    const parentBRaw = calculateRawPrs(parentBSnps, condition, prsWeights);
    const parentBNorm = normalizePrs(
      parentBRaw.rawScore,
      condition,
      prsWeights,
      parentBRaw.snpsFound,
      snpsTotal,
    );
    const parentBRisk = getRiskCategory(parentBNorm.percentile);

    const parentB: PrsParentResult = {
      rawScore: parentBNorm.rawScore,
      zScore: parentBNorm.zScore,
      percentile: parentBNorm.percentile,
      riskCategory: parentBRisk,
      snpsFound: parentBRaw.snpsFound,
      snpsTotal,
      coveragePct: parentBNorm.coveragePct,
    };

    // Predict offspring PRS range using CLT
    const offspring = predictOffspringPrsClt(
      parentANorm.rawScore,
      parentBNorm.rawScore,
      parentANorm.zScore,
      parentBNorm.zScore,
      conditionData.population_std,
    );

    // Determine coverage sufficiency (either parent below threshold flags it)
    const parentACoverageInsufficient = isInsufficientCoverage(parentARaw.snpsFound, snpsTotal);
    const parentBCoverageInsufficient = isInsufficientCoverage(parentBRaw.snpsFound, snpsTotal);
    const insufficientCoverage = parentACoverageInsufficient || parentBCoverageInsufficient;

    // Generate population note based on ancestry of PRS weights
    const populationNote = getPopulationNote(conditionData.ancestry_note ?? '');

    // Determine ancestry-based hide/caution flags when inferredAncestry is provided
    let hidden: boolean | undefined;
    let hiddenReason: string | undefined;
    let cautionNote: string | undefined;

    if (inferredAncestry) {
      const ancestryMeta = conditionData.ancestry_transferability?.[inferredAncestry];
      if (ancestryMeta) {
        if (ancestryMeta.ui_recommendation === 'hide') {
          hidden = true;
          hiddenReason = ancestryMeta.note;
        } else if (
          ancestryMeta.ui_recommendation === 'warning' ||
          ancestryMeta.ui_recommendation === 'caution'
        ) {
          cautionNote = ancestryMeta.note;
        }
      }
    }

    conditions[condition] = {
      name: conditionData.name,
      parentA,
      parentB,
      offspring,
      ancestryNote: conditionData.ancestry_note ?? '',
      reference: conditionData.reference ?? '',
      insufficientCoverage,
      populationNote,
      hidden,
      hiddenReason,
      cautionNote,
    };
  }

  // Map snake_case metadata from PrsWeightsData to camelCase PrsMetadata
  const rawMeta = prsWeights.metadata;
  const metadata: PrsMetadata = {
    source: rawMeta.source,
    version: rawMeta.version,
    conditionsCovered: rawMeta.conditions_covered,
    lastUpdated: rawMeta.last_updated,
    disclaimer: rawMeta.disclaimer,
  };

  return {
    conditions,
    metadata,
    tier,
    conditionsAvailable: availableConditions.length,
    conditionsTotal: PRS_CONDITIONS.length,
    disclaimer: getPrsDisclaimer(),
    isLimited: tier !== 'pro',
    upgradeMessage: getPrsUpgradeMessage(tier),
  };
}

/**
 * Get the upgrade message for PRS tier.
 */
function getPrsUpgradeMessage(tier: Tier): string | null {
  if (tier === 'free') {
    return 'Upgrade to Premium to unlock polygenic risk scores for 3 conditions including heart disease and diabetes, or Pro for all 10 conditions.';
  }
  if (tier === 'premium') {
    return "Upgrade to Pro to unlock all 10 polygenic risk score conditions including Alzheimer's, breast cancer, and more.";
  }
  return null;
}

/**
 * Return the PRS limitations disclaimer text.
 *
 * Covers ancestry bias, DTC data quality, environmental factors,
 * and the non-diagnostic nature of PRS.
 *
 * Ported from Source/prs.py `get_prs_disclaimer()`.
 *
 * @returns Multi-paragraph disclaimer string
 */
export function getPrsDisclaimer(): string {
  return (
    'IMPORTANT DISCLAIMER: Polygenic Risk Scores (PRS) are for educational ' +
    'and informational purposes only. They are NOT diagnostic and should NOT ' +
    'be used to make medical decisions.\n\n' +
    'Key limitations:\n' +
    '- Ancestry bias: Most PRS models are derived from European-ancestry GWAS ' +
    'studies. Predictive accuracy is significantly reduced for individuals of ' +
    'non-European ancestry.\n' +
    '- DTC data quality: Direct-to-consumer genetic testing captures only a ' +
    'subset of relevant variants. Clinical-grade genotyping may differ.\n' +
    '- Environmental factors: PRS captures only the genetic component of disease ' +
    'risk. Lifestyle, environment, and other factors play major roles.\n' +
    '- Not a diagnosis: A high PRS does not mean you will develop the condition, ' +
    'and a low PRS does not guarantee you will not.\n\n' +
    'Always consult a qualified healthcare professional or genetic counselor ' +
    'for medical advice.'
  );
}
