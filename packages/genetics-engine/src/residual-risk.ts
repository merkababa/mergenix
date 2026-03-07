/**
 * Residual Risk Calculator
 *
 * Calculates the post-test probability of being a carrier after a negative
 * genetic test result. This is a critical clinical metric because no genetic
 * test detects 100% of pathogenic variants.
 *
 * Residual risk depends on two factors:
 * 1. Detection rate: the fraction of carriers the test can identify
 * 2. Prior carrier frequency: the baseline probability of being a carrier
 *    in the individual's ethnic population
 *
 * Uses Bayesian posterior probability:
 *   residualRisk = (1 - detectionRate) * priorCarrierFreq
 *                  / (1 - detectionRate * priorCarrierFreq)
 *
 * This is derived from Bayes' theorem:
 *   P(carrier | negative test) = P(negative test | carrier) * P(carrier)
 *                                 / P(negative test)
 *
 * Where:
 *   P(negative test | carrier) = 1 - detectionRate
 *   P(carrier) = priorCarrierFreq
 *   P(negative test) = P(neg|carrier)*P(carrier) + P(neg|non-carrier)*P(non-carrier)
 *                     = (1-detectionRate)*priorCarrierFreq + 1*(1-priorCarrierFreq)
 *                     = 1 - detectionRate*priorCarrierFreq
 */

// ─── Types ──────────────────────────────────────────────────────────────────

/** Clinical detection rate data for a disease-ethnicity pair. */
export interface DetectionRateEntry {
  /** Condition name (e.g., "Cystic Fibrosis"). */
  condition: string;
  /** Ethnicity/population group (e.g., "European"). */
  ethnicity: string;
  /** Fraction of carriers detected by the test (0-1, e.g., 0.90 = 90%). */
  detectionRate: number;
  /** Prior carrier frequency in this population (e.g., 0.04 = 1/25). */
  priorCarrierFreq: number;
  /** Citation for the detection rate and carrier frequency data. */
  source: string;
}

/** Residual risk calculation result. */
export interface ResidualRiskResult {
  /** Condition name. */
  condition: string;
  /** Ethnicity used for lookup. */
  ethnicity: string;
  /** Prior carrier frequency before testing. */
  priorCarrierFreq: number;
  /** Test detection rate used. */
  detectionRate: number;
  /** Post-test carrier probability (residual risk). */
  residualRisk: number;
  /** Fraction of risk reduced by testing (0-1). */
  riskReduction: number;
  /** Human-readable interpretation (e.g., "~1 in 250 residual carrier risk"). */
  interpretation: string;
}

// ─── Built-in Detection Rates ───────────────────────────────────────────────

/**
 * Built-in detection rates for common carrier screening conditions.
 *
 * Sources:
 * - ACMG (American College of Medical Genetics) 2017 guidelines
 * - ACOG (American College of Obstetricians and Gynecologists) 2017 guidelines
 *
 * "Unknown/Mixed" entries use the most conservative (lowest) detection rate
 * and the highest prior carrier frequency among all populations, ensuring
 * the residual risk estimate errs on the side of caution.
 */
export const COMMON_DETECTION_RATES: DetectionRateEntry[] = [
  // ─── Cystic Fibrosis ────────────────────────────────────────────────
  {
    condition: 'Cystic Fibrosis',
    ethnicity: 'European',
    detectionRate: 0.9,
    priorCarrierFreq: 0.04,
    source: 'ACMG 2017',
  },
  {
    condition: 'Cystic Fibrosis',
    ethnicity: 'African American',
    detectionRate: 0.65,
    priorCarrierFreq: 0.0154,
    source: 'ACMG 2017',
  },
  {
    condition: 'Cystic Fibrosis',
    ethnicity: 'Hispanic',
    detectionRate: 0.72,
    priorCarrierFreq: 0.0196,
    source: 'ACMG 2017',
  },
  {
    condition: 'Cystic Fibrosis',
    ethnicity: 'Ashkenazi Jewish',
    detectionRate: 0.94,
    priorCarrierFreq: 0.04,
    source: 'ACMG 2017',
  },
  {
    condition: 'Cystic Fibrosis',
    ethnicity: 'East Asian',
    detectionRate: 0.49,
    priorCarrierFreq: 0.0032,
    source: 'ACMG 2017',
  },
  {
    condition: 'Cystic Fibrosis',
    ethnicity: 'Unknown/Mixed',
    detectionRate: 0.49,
    priorCarrierFreq: 0.04,
    source: 'ACMG 2017 (conservative)',
  },

  // ─── Sickle Cell Disease ────────────────────────────────────────────
  {
    condition: 'Sickle Cell Disease',
    ethnicity: 'African American',
    detectionRate: 0.95,
    priorCarrierFreq: 0.083,
    source: 'ACOG 2017',
  },
  {
    condition: 'Sickle Cell Disease',
    ethnicity: 'Hispanic',
    detectionRate: 0.9,
    priorCarrierFreq: 0.014,
    source: 'ACOG 2017',
  },
  {
    condition: 'Sickle Cell Disease',
    ethnicity: 'Unknown/Mixed',
    detectionRate: 0.9,
    priorCarrierFreq: 0.083,
    source: 'ACOG 2017 (conservative)',
  },

  // ─── Tay-Sachs Disease ─────────────────────────────────────────────
  {
    condition: 'Tay-Sachs Disease',
    ethnicity: 'Ashkenazi Jewish',
    detectionRate: 0.94,
    priorCarrierFreq: 0.033,
    source: 'ACMG 2017',
  },
  {
    condition: 'Tay-Sachs Disease',
    ethnicity: 'French Canadian',
    detectionRate: 0.9,
    priorCarrierFreq: 0.033,
    source: 'ACMG 2017',
  },
  {
    condition: 'Tay-Sachs Disease',
    ethnicity: 'Unknown/Mixed',
    detectionRate: 0.8,
    priorCarrierFreq: 0.003,
    source: 'ACMG 2017 (conservative)',
  },

  // ─── Spinal Muscular Atrophy (SMA) ─────────────────────────────────
  {
    condition: 'Spinal Muscular Atrophy',
    ethnicity: 'European',
    detectionRate: 0.95,
    priorCarrierFreq: 0.02,
    source: 'ACMG 2017',
  },
  {
    condition: 'Spinal Muscular Atrophy',
    ethnicity: 'African American',
    detectionRate: 0.71,
    priorCarrierFreq: 0.014,
    source: 'ACMG 2017',
  },
  {
    condition: 'Spinal Muscular Atrophy',
    ethnicity: 'Ashkenazi Jewish',
    detectionRate: 0.9,
    priorCarrierFreq: 0.02,
    source: 'ACMG 2017',
  },
  {
    condition: 'Spinal Muscular Atrophy',
    ethnicity: 'Unknown/Mixed',
    detectionRate: 0.71,
    priorCarrierFreq: 0.02,
    source: 'ACMG 2017 (conservative)',
  },

  // ─── Fragile X Syndrome ────────────────────────────────────────────
  {
    condition: 'Fragile X Syndrome',
    ethnicity: 'European',
    detectionRate: 0.99,
    priorCarrierFreq: 0.004,
    source: 'ACOG 2017',
  },
  {
    condition: 'Fragile X Syndrome',
    ethnicity: 'Unknown/Mixed',
    detectionRate: 0.99,
    priorCarrierFreq: 0.004,
    source: 'ACOG 2017 (conservative)',
  },

  // ─── Canavan Disease ───────────────────────────────────────────────
  {
    condition: 'Canavan Disease',
    ethnicity: 'Ashkenazi Jewish',
    detectionRate: 0.97,
    priorCarrierFreq: 0.025,
    source: 'ACMG 2017',
  },
  {
    condition: 'Canavan Disease',
    ethnicity: 'Unknown/Mixed',
    detectionRate: 0.9,
    priorCarrierFreq: 0.005,
    source: 'ACMG 2017 (conservative)',
  },
];

// ─── Core Calculation ───────────────────────────────────────────────────────

/**
 * Calculate residual carrier risk after a negative test result.
 *
 * Uses Bayesian post-test probability:
 *   residualRisk = (1 - detectionRate) * priorCarrierFreq
 *                  / (1 - detectionRate * priorCarrierFreq)
 *
 * @param detectionRate - Fraction of carriers the test detects (0-1)
 * @param priorCarrierFreq - Prior carrier frequency in the population (0-1)
 * @returns Post-test carrier probability (0-1)
 * @throws Error if inputs are out of valid range
 *
 * @example
 * // CF in European: detection 90%, prior 1/25 (0.04)
 * calculateResidualRisk(0.90, 0.04) // ~0.00414 (~1 in 241)
 *
 * @example
 * // Perfect test: 100% detection
 * calculateResidualRisk(1.0, 0.04) // 0 (no residual risk)
 *
 * @example
 * // No detection capability
 * calculateResidualRisk(0.0, 0.04) // 0.04 (unchanged from prior)
 */
export function calculateResidualRisk(detectionRate: number, priorCarrierFreq: number): number {
  if (detectionRate < 0 || detectionRate > 1) {
    throw new Error(`detectionRate must be between 0 and 1, got ${detectionRate}`);
  }
  if (priorCarrierFreq < 0 || priorCarrierFreq > 1) {
    throw new Error(`priorCarrierFreq must be between 0 and 1, got ${priorCarrierFreq}`);
  }

  // Edge case: 100% detection rate means zero residual risk
  if (detectionRate === 1.0) {
    return 0;
  }

  // Edge case: 0% carrier frequency means zero residual risk
  if (priorCarrierFreq === 0) {
    return 0;
  }

  // Bayesian posterior: P(carrier | negative test)
  const numerator = (1 - detectionRate) * priorCarrierFreq;
  const denominator = 1 - detectionRate * priorCarrierFreq;

  // Denominator should never be zero with valid inputs (detectionRate <= 1, priorCarrierFreq <= 1)
  // but guard against floating point edge cases
  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

// ─── Ethnicity Lookup ───────────────────────────────────────────────────────

/**
 * Get residual risk for a condition given ethnicity.
 *
 * Looks up the detection rate and prior carrier frequency for the specified
 * condition and ethnicity combination. If the exact ethnicity is not found,
 * falls back to "Unknown/Mixed" which uses the most conservative estimates.
 *
 * Uses self-reported ethnicity (not genetic inference).
 *
 * @param condition - Condition name (case-insensitive)
 * @param ethnicity - Self-reported ethnicity (case-insensitive)
 * @param detectionRates - Array of detection rate entries to search
 * @returns Residual risk result, or null if condition not found at all
 *
 * @example
 * getResidualRisk('Cystic Fibrosis', 'European', COMMON_DETECTION_RATES)
 * // Returns ResidualRiskResult with ~1 in 241 residual risk
 */
export function getResidualRisk(
  condition: string,
  ethnicity: string,
  detectionRates: DetectionRateEntry[],
): ResidualRiskResult | null {
  const conditionLower = condition.toLowerCase();
  const ethnicityLower = ethnicity.toLowerCase();

  // First, try exact ethnicity match
  let entry = detectionRates.find(
    (e) =>
      e.condition.toLowerCase() === conditionLower && e.ethnicity.toLowerCase() === ethnicityLower,
  );

  // If not found, fall back to "Unknown/Mixed"
  if (entry === undefined) {
    entry = detectionRates.find(
      (e) =>
        e.condition.toLowerCase() === conditionLower &&
        e.ethnicity.toLowerCase() === 'unknown/mixed',
    );
  }

  // If still not found, condition doesn't exist in the dataset
  if (entry === undefined) {
    return null;
  }

  const residualRisk = calculateResidualRisk(entry.detectionRate, entry.priorCarrierFreq);

  // Risk reduction: how much the test reduced carrier probability
  const riskReduction = entry.priorCarrierFreq > 0 ? 1 - residualRisk / entry.priorCarrierFreq : 0;

  const interpretation = `~${formatResidualRisk(residualRisk)} residual carrier risk`;

  return {
    condition: entry.condition,
    ethnicity: entry.ethnicity,
    priorCarrierFreq: entry.priorCarrierFreq,
    detectionRate: entry.detectionRate,
    residualRisk,
    riskReduction: Math.round(riskReduction * 10000) / 10000,
    interpretation,
  };
}

// ─── Formatting ─────────────────────────────────────────────────────────────

/**
 * Format residual risk as "1 in X" for display.
 *
 * Converts a probability (e.g., 0.004) to a human-readable fraction
 * (e.g., "1 in 250"). Uses locale-aware number formatting for thousands
 * separators.
 *
 * @param risk - Residual risk probability (0-1)
 * @returns Formatted string (e.g., "1 in 250", "1 in 1,000")
 *
 * @example
 * formatResidualRisk(0.004)  // "1 in 250"
 * formatResidualRisk(0.001)  // "1 in 1,000"
 * formatResidualRisk(0.5)    // "1 in 2"
 * formatResidualRisk(0)      // "0 (no residual risk)"
 */
export function formatResidualRisk(risk: number): string {
  if (risk === 0) {
    return '0 (no residual risk)';
  }

  if (risk >= 1) {
    return '1 in 1';
  }

  const denominator = Math.round(1 / risk);
  const formatted = denominator.toLocaleString();
  return `1 in ${formatted}`;
}
