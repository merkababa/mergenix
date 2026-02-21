/**
 * Couple/Offspring Combiner Module
 *
 * Combines two parents' genotype data to predict offspring genetic outcomes
 * using Mendelian inheritance. This is a higher-level abstraction over the
 * raw Punnett-square arithmetic in offspring-risk.ts — it takes pre-analyzed
 * carrier statuses and produces offspring probability predictions for each
 * condition.
 *
 * Supports three inheritance patterns:
 * - Autosomal recessive (AR): Both parents must carry the variant
 * - Autosomal dominant (AD): Single copy causes disease
 * - X-linked (XL): Variant on X chromosome with sex-specific expression
 *
 * The combiner dispatches to the appropriate calculator based on inheritance
 * pattern and aggregates results with sorting by risk severity.
 */

import type {
  CarrierStatus,
  InheritancePattern,
  OffspringRisk,
  XLinkedOffspringRisk,
} from '@mergenix/shared-types';

// ─── Punnett-Square Arithmetic (delegated to offspring-risk.ts) ──────────────
//
// offspring-risk.ts is the single source of truth for raw Mendelian risk
// arithmetic (Item 7 refactor). The functions are re-exported here under the
// same names so that all existing imports from combiner.ts continue to work
// without modification.
export {
  calculateARRisk,
  calculateADRisk,
  calculateXLinkedRisk,
} from './offspring-risk';

import {
  calculateARRisk,
  calculateADRisk,
  calculateXLinkedRisk,
} from './offspring-risk';

// ─── Constants ──────────────────────────────────────────────────────────────

/** NSGC genetic counselor finder URL. */
const NSGC_COUNSELING_URL = 'https://findageneticcounselor.nsgc.org/';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** Input for a single parent's carrier result for one condition. */
export interface ParentConditionInput {
  condition: string;
  gene: string;
  inheritance: InheritancePattern;
  status: CarrierStatus;
}

/** Offspring prediction for a single condition. */
export interface OffspringPrediction {
  /** Disease or condition name. */
  condition: string;
  /** Gene symbol (e.g., "CFTR"). */
  gene: string;
  /** Mendelian inheritance pattern. */
  inheritance: InheritancePattern;
  /** Carrier status of parent 1. */
  parent1Status: CarrierStatus;
  /** Carrier status of parent 2. */
  parent2Status: CarrierStatus;
  /** Offspring risk percentages. For X-linked, includes sons/daughters sub-objects. */
  offspringRisk: OffspringRisk | XLinkedOffspringRisk;
  /** Whether this is an X-linked condition with sex-specific risks. */
  isSexLinked: boolean;
  /** NSGC counseling link (included for AD conditions). */
  counselingUrl?: string;
}

// ─── Single Condition Combiner ───────────────────────────────────────────────

/**
 * Combine two parents' carrier data for a single condition.
 *
 * Dispatches to the appropriate risk calculator based on inheritance pattern
 * and assembles an OffspringPrediction with all relevant metadata.
 *
 * For AD conditions, includes an NSGC genetic counseling URL to support
 * emotional support resources for families facing dominant conditions.
 *
 * For X-linked conditions, assumes parent1 = female (mother) by default.
 * This matches the upload UI convention where parent 1 is the biological
 * female. The `parent1IsFemale` parameter can override this if needed.
 *
 * @param condition - Disease or condition name
 * @param gene - Gene symbol (e.g., "CFTR")
 * @param inheritance - Mendelian inheritance pattern
 * @param parent1Status - Carrier status of parent 1
 * @param parent2Status - Carrier status of parent 2
 * @param parent1IsFemale - For X-linked: whether parent1 is female. Defaults to true.
 * @returns OffspringPrediction with risk data and metadata
 */
export function combineForCondition(
  condition: string,
  gene: string,
  inheritance: InheritancePattern,
  parent1Status: CarrierStatus,
  parent2Status: CarrierStatus,
  parent1IsFemale: boolean = true,
): OffspringPrediction {
  let offspringRisk: OffspringRisk | XLinkedOffspringRisk;
  let isSexLinked = false;

  if (inheritance === 'autosomal_recessive') {
    offspringRisk = calculateARRisk(parent1Status, parent2Status);
  } else if (inheritance === 'autosomal_dominant') {
    offspringRisk = calculateADRisk(parent1Status, parent2Status);
  } else {
    // X-linked
    offspringRisk = calculateXLinkedRisk(parent1Status, parent2Status, parent1IsFemale);
    isSexLinked = true;
  }

  const prediction: OffspringPrediction = {
    condition,
    gene,
    inheritance,
    parent1Status,
    parent2Status,
    offspringRisk,
    isSexLinked,
  };

  // For AD conditions, include NSGC counseling URL to support emotional needs.
  // Autosomal dominant findings often require immediate counseling guidance
  // because a single pathogenic allele is sufficient to cause disease.
  if (inheritance === 'autosomal_dominant') {
    prediction.counselingUrl = NSGC_COUNSELING_URL;
  }

  return prediction;
}

// ─── Batch Combiner ──────────────────────────────────────────────────────────

/**
 * Type guard to check if an offspring risk object is X-linked (has sons/daughters).
 */
function isXLinkedRisk(risk: OffspringRisk | XLinkedOffspringRisk): risk is XLinkedOffspringRisk {
  return 'sons' in risk && 'daughters' in risk;
}

/**
 * Compute a numeric risk score for sorting predictions by severity.
 *
 * Higher score = higher risk (shown first). Score accounts for:
 * - Affected percentage (primary)
 * - Carrier percentage (secondary, weighted lower)
 * - For X-linked: uses the maximum of sons/daughters affected risk
 *
 * @param prediction - An offspring prediction
 * @returns Numeric score (higher = more severe)
 */
function computeRiskScore(prediction: OffspringPrediction): number {
  const risk = prediction.offspringRisk;

  let maxAffected = risk.affected;

  // For X-linked, use the worst-case affected percentage across sexes
  if (isXLinkedRisk(risk)) {
    maxAffected = Math.max(risk.sons.affected, risk.daughters.affected, risk.affected);
  }

  // Primary sort: affected percentage (weight 100)
  // Secondary sort: carrier percentage (weight 1)
  return maxAffected * 100 + risk.carrier;
}

/**
 * Batch combine: process all conditions from two parents' carrier results.
 *
 * Takes pre-analyzed carrier results for both parents and combines them.
 * Conditions are matched between parents by condition name. Only conditions
 * present in BOTH parents' results are included in the output (since
 * offspring risk requires both parents' status).
 *
 * Results are sorted by risk level (highest risk first) using a composite
 * score based on affected and carrier percentages.
 *
 * @param parent1Results - Array of parent 1's carrier results per condition
 * @param parent2Results - Array of parent 2's carrier results per condition
 * @param parent1IsFemale - For X-linked conditions: whether parent1 is female. Defaults to true.
 * @returns Array of offspring predictions, sorted by risk severity (highest first)
 */
export function combineAllConditions(
  parent1Results: ParentConditionInput[],
  parent2Results: ParentConditionInput[],
  parent1IsFemale: boolean = true,
): OffspringPrediction[] {
  // Build a lookup map for parent2 results by condition name
  const parent2Map = new Map<string, ParentConditionInput>();
  for (const entry of parent2Results) {
    parent2Map.set(entry.condition, entry);
  }

  const predictions: OffspringPrediction[] = [];

  // Match conditions between parents and combine
  for (const p1 of parent1Results) {
    const p2 = parent2Map.get(p1.condition);
    if (!p2) {
      // Condition not present in parent2's results — skip
      continue;
    }

    // Use parent1's inheritance pattern (should match parent2's)
    const prediction = combineForCondition(
      p1.condition,
      p1.gene,
      p1.inheritance,
      p1.status,
      p2.status,
      parent1IsFemale,
    );

    predictions.push(prediction);
  }

  // Sort by risk level: highest risk first
  predictions.sort((a, b) => {
    const scoreA = computeRiskScore(a);
    const scoreB = computeRiskScore(b);

    // Descending: higher score first
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    // Tie-breaker: alphabetical by condition name
    return a.condition.localeCompare(b.condition);
  });

  return predictions;
}
