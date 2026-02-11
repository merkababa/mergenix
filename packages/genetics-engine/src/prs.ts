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
  const b1 = 0.319381530;
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
 * The raw PRS is the sum of (effect_weight * dosage) for each SNP, where
 * dosage is the count of effect alleles (0, 1, or 2).
 *
 * Ported from Source/prs.py `calculate_raw_prs()`.
 *
 * @param snpData - Genotype map (rsid -> genotype)
 * @param condition - Condition key (e.g., "coronary_artery_disease")
 * @param prsWeights - Full PRS weights data
 * @returns Object with rawScore and snpsFound count
 */
export function calculateRawPrs(
  snpData: GenotypeMap,
  condition: string,
  prsWeights: PrsWeightsData,
): { rawScore: number; snpsFound: number } {
  const conditionData: PrsConditionDefinition | undefined =
    prsWeights.conditions[condition];

  if (conditionData === undefined) {
    throw new Error(`Condition "${condition}" not found in PRS weights`);
  }

  const snps = conditionData.snps;

  let rawScore = 0.0;
  let snpsFound = 0;

  for (const snp of snps) {
    const genotype: string | undefined = snpData[snp.rsid];
    if (genotype === undefined) {
      continue;
    }
    snpsFound++;
    const dosage = countEffectAlleles(genotype, snp.effect_allele);
    rawScore += snp.effect_weight * dosage;
  }

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
  const conditionData: PrsConditionDefinition | undefined =
    prsWeights.conditions[condition];

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

// ─── Offspring PRS Prediction ───────────────────────────────────────────────

/**
 * Predict the expected PRS range for offspring of two parents.
 *
 * Uses mid-parent regression: the offspring's expected PRS is the average
 * of both parents' z-scores, scaled by a heritability factor (0.5) to
 * account for regression toward the population mean.
 *
 * NOTE: Using a blanket h² = 0.5 for all conditions is an approximation.
 * Actual narrow-sense heritability varies: CAD ~0.5-0.6, BMI ~0.3-0.4,
 * Schizophrenia ~0.6-0.8, T2D ~0.25-0.35. Future: per-condition h² in prs-weights.json.
 *
 * The range reflects biological uncertainty from meiotic recombination
 * (approximately +/- 0.5 SD around the expected value).
 *
 * Ported from Source/prs.py `predict_offspring_prs_range()`.
 *
 * @param parentAZScore - Parent A's z-score
 * @param parentBZScore - Parent B's z-score
 * @returns Predicted offspring percentile range
 */
export function predictOffspringPrsRange(
  parentAZScore: number,
  parentBZScore: number,
): PrsOffspringPrediction {
  // Mid-parent z-score
  const midParent = (parentAZScore + parentBZScore) / 2.0;

  // Regression toward the mean: offspring expected ~50% of mid-parent deviation
  // heritability factor h² = 0.5 (approximation; varies by trait)
  const heritabilityFactor = 0.5;
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
 * Ported from Source/prs.py `analyze_prs()`.
 *
 * @param parentASnps - Parent A's genotype map
 * @param parentBSnps - Parent B's genotype map
 * @param prsWeights - Full PRS weights data
 * @param tier - Subscription tier (default: "free")
 * @returns Full PRS analysis result
 */
export function analyzePrs(
  parentASnps: GenotypeMap,
  parentBSnps: GenotypeMap,
  prsWeights: PrsWeightsData,
  tier: Tier = 'free',
): PrsAnalysisResult {
  // Determine condition limit from centralized tier gating config
  const conditionLimit: number = TIER_GATING[tier].prsConditionLimit;

  // Filter PRS_CONDITIONS to accessible conditions based on tier
  const availableConditions = PRS_CONDITIONS.slice(0, conditionLimit);

  const conditions: Record<string, PrsConditionResult> = {};

  for (const condition of availableConditions) {
    const conditionData: PrsConditionDefinition | undefined =
      prsWeights.conditions[condition];

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

    // Predict offspring PRS range from both parents' z-scores
    const offspring = predictOffspringPrsRange(
      parentANorm.zScore,
      parentBNorm.zScore,
    );

    conditions[condition] = {
      name: conditionData.name,
      parentA,
      parentB,
      offspring,
      ancestryNote: conditionData.ancestry_note ?? '',
      reference: conditionData.reference ?? '',
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
    return 'Upgrade to Pro to unlock all 10 polygenic risk score conditions including Alzheimer\'s, breast cancer, and more.';
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
