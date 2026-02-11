/**
 * Ethnicity-Adjusted Carrier Frequency Engine
 *
 * Provides population-specific carrier frequency adjustments based on
 * gnomAD v4.1 data. Supports Bayesian posterior calculations for carrier
 * risk given genotype and population background.
 *
 * Supported populations (from gnomAD v4.1):
 * - African/African American
 * - East Asian
 * - South Asian
 * - European (Non-Finnish)
 * - Finnish
 * - Latino/Admixed American
 * - Ashkenazi Jewish
 * - Middle Eastern
 * - Global
 *
 * Ported from Source/ethnicity.py (288 lines).
 */

import type {
  Population,
  EthnicityAdjustment,
  EthnicitySummary,
  CarrierStatus,
  EthnicityFrequenciesData,
} from './types';

import { clamp } from './utils';
import { POPULATIONS } from '@mergenix/genetics-data';

// ─── Population Frequency Lookup ────────────────────────────────────────────

/**
 * Look up the population-specific carrier frequency for a given rsID.
 *
 * Falls back to the "Global" frequency if the requested population is not
 * present for that variant.
 *
 * Ported from Source/ethnicity.py `get_population_frequency()`.
 *
 * @param rsid - SNP identifier (e.g., "rs334")
 * @param population - Target population label (one of POPULATIONS)
 * @param ethnicityData - Loaded ethnicity frequency data
 * @returns Carrier frequency as a number, or null if rsID not in data
 */
export function getPopulationFrequency(
  rsid: string,
  population: Population,
  ethnicityData: EthnicityFrequenciesData,
): number | null {
  const variant = ethnicityData.frequencies[rsid];
  if (variant === undefined) {
    return null;
  }

  // Look up the requested population frequency
  const freq = variant[population] as number | undefined;
  if (freq !== undefined) {
    return freq;
  }

  // Fall back to Global frequency
  const globalFreq = variant.Global as number | undefined;
  if (globalFreq !== undefined) {
    return globalFreq;
  }

  return null;
}

// ─── Risk Adjustment ────────────────────────────────────────────────────────

/**
 * Adjust a base carrier risk using the ratio of population to global frequency.
 *
 * The adjustment factor is (population_frequency / global_frequency).
 * The adjusted risk is clamped to [0.0, 1.0].
 *
 * Ported from Source/ethnicity.py `adjust_carrier_risk()`.
 *
 * @param baseRisk - Original carrier risk (0.0-1.0 scale)
 * @param populationFrequency - Carrier frequency in the target population
 * @param globalFrequency - Global carrier frequency
 * @returns Adjustment result with base risk, adjusted risk, and factor
 */
export function adjustCarrierRisk(
  baseRisk: number,
  populationFrequency: number,
  globalFrequency: number,
): EthnicityAdjustment {
  if (globalFrequency <= 0) {
    return {
      baseRisk,
      adjustedRisk: baseRisk,
      adjustmentFactor: 1.0,
      populationFrequency,
      globalFrequency,
    };
  }

  const adjustmentFactor = populationFrequency / globalFrequency;
  const adjustedRisk = clamp(baseRisk * adjustmentFactor, 0.0, 1.0);

  return {
    baseRisk,
    adjustedRisk,
    adjustmentFactor,
    populationFrequency,
    globalFrequency,
  };
}

// ─── Bayesian Posterior Calculation ─────────────────────────────────────────

/**
 * Compute Bayesian posterior probability of being a carrier given genotype
 * observation and population background.
 *
 * Uses Bayes' theorem:
 *   P(carrier | genotype, population) =
 *     P(genotype | carrier) * P(carrier) /
 *     [P(genotype | carrier) * P(carrier) + P(genotype | non-carrier) * P(non-carrier)]
 *
 * Special cases:
 * - "affected": Returns 1.0 immediately. Affected individuals (homozygous
 *   pathogenic) have two copies and will always pass at least one to offspring.
 *   Computing P(carrier|affected) via Bayes is scientifically meaningless.
 * - "unknown":  Returns prior unchanged (no evidence)
 *
 * Genotype likelihoods (for carrier/normal only):
 * - "carrier" genotype:  P(obs|carrier) = 0.99, P(obs|non-carrier) = prior * 0.01
 * - "normal" genotype:   P(obs|carrier) = 0.01, P(obs|non-carrier) = 0.99
 *
 * Ported from Source/ethnicity.py `calculate_bayesian_posterior()`.
 *
 * @param priorFrequency - Population carrier frequency (0-1)
 * @param genotypeStatus - Carrier status from genotyping ("carrier", "normal", "affected", "unknown")
 * @param _population - Population label (for documentation; prior encodes population)
 * @returns Posterior probability of being a carrier (0.0-1.0)
 */
export function calculateBayesianPosterior(
  priorFrequency: number,
  genotypeStatus: CarrierStatus,
  _population: Population,
): number {
  // Clamp prior: return 0 if negative, cap at 1
  if (priorFrequency == null || priorFrequency < 0) {
    return 0.0;
  }
  let prior = priorFrequency;
  if (prior > 1) {
    prior = 1.0;
  }

  // Unknown status: no evidence, posterior equals prior
  if (genotypeStatus === 'unknown') {
    return prior;
  }

  // Affected individuals (homozygous pathogenic) are definitionally beyond
  // carrier status — they have two copies. Return 1.0 as they will always
  // pass at least one pathogenic allele to offspring.
  if (genotypeStatus === 'affected') {
    return 1.0;
  }

  // Set likelihoods P(genotype | carrier) and P(genotype | non-carrier)
  let pGenotypeGivenCarrier: number;
  let pGenotypeGivenNoncarrier: number;

  if (genotypeStatus === 'carrier') {
    pGenotypeGivenCarrier = 0.99;
    pGenotypeGivenNoncarrier = 0.005;
  } else {
    // "normal": genotype observation suggests non-carrier
    pGenotypeGivenCarrier = 0.01;
    pGenotypeGivenNoncarrier = 0.99;
  }

  const priorCarrier = prior;
  const priorNoncarrier = 1.0 - prior;

  const numerator = pGenotypeGivenCarrier * priorCarrier;
  const denominator = numerator + pGenotypeGivenNoncarrier * priorNoncarrier;

  if (denominator <= 0) {
    return 0.0;
  }

  const posterior = numerator / denominator;
  return clamp(posterior, 0.0, 1.0);
}

// ─── Ethnicity Summary ──────────────────────────────────────────────────────

/**
 * Build a frequency comparison across all populations for a given variant.
 *
 * Ported from Source/ethnicity.py `get_ethnicity_summary()`.
 *
 * @param rsid - SNP identifier
 * @param ethnicityData - Loaded ethnicity frequency data
 * @param populations - List of population labels (defaults to all POPULATIONS)
 * @returns Summary with per-population frequencies
 */
export function getEthnicitySummary(
  rsid: string,
  ethnicityData: EthnicityFrequenciesData,
  populations?: Population[],
): EthnicitySummary {
  const pops: Population[] = populations ?? (POPULATIONS as Population[]);

  const variant = ethnicityData.frequencies[rsid];

  if (variant === undefined) {
    // Build frequencies map with null for every population
    const nullFrequencies = {} as Record<Population, number | null>;
    for (const pop of pops) {
      (nullFrequencies as Record<string, number | null>)[pop] = null;
    }
    return {
      rsid,
      gene: null,
      condition: null,
      frequencies: nullFrequencies,
      global: null,
      found: false,
    };
  }

  // Build per-population frequency map
  const frequencies = {} as Record<Population, number | null>;
  const variantRecord = variant as unknown as Record<string, unknown>;
  for (const pop of pops) {
    const freq = variantRecord[pop];
    (frequencies as Record<string, number | null>)[pop] = typeof freq === 'number' ? freq : null;
  }

  return {
    rsid,
    gene: variant.gene ?? null,
    condition: variant.condition ?? null,
    frequencies,
    global: variant.Global ?? null,
    found: true,
  };
}

/**
 * Format a human-readable comparison of population vs global frequency.
 *
 * Examples:
 * - "2.3x higher than global average"
 * - "0.4x lower than global average"
 * - "Equal to global average"
 *
 * Ported from Source/ethnicity.py `format_frequency_comparison()`.
 *
 * @param populationFreq - Carrier frequency in target population
 * @param globalFreq - Global carrier frequency
 * @returns Formatted comparison string
 */
export function formatFrequencyComparison(
  populationFreq: number | null,
  globalFreq: number | null,
): string {
  // Handle null/zero global frequency
  if (globalFreq == null || globalFreq <= 0) {
    if (populationFreq != null && populationFreq > 0) {
      return 'No global data for comparison';
    }
    return 'No data available';
  }

  // Handle null/negative population frequency
  if (populationFreq == null || populationFreq < 0) {
    return 'No population data available';
  }

  const ratio = populationFreq / globalFreq;

  // Check if approximately equal (within 5% relative tolerance)
  if (Math.abs(ratio - 1.0) / 1.0 <= 0.05) {
    return 'Equal to global average';
  } else if (ratio > 1.0) {
    return `${ratio.toFixed(1)}x higher than global average`;
  } else {
    return `${ratio.toFixed(1)}x lower than global average`;
  }
}
