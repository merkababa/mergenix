/**
 * Offspring Risk Calculator (Punnett-Square Arithmetic)
 *
 * This module contains the raw Mendelian offspring risk calculations for all
 * three inheritance patterns supported by the Mergenix carrier engine:
 * - Autosomal recessive (AR)
 * - Autosomal dominant (AD)
 * - X-linked (XL)
 *
 * These functions were extracted from combiner.ts (Item 7 refactor) to give
 * this pure arithmetic layer its own home. combiner.ts retains backward-
 * compatible re-exports so no existing imports break.
 *
 * The actual Mendelian lookup tables and per-inheritance calculation logic
 * live in carrier.ts and are delegated here rather than duplicated.
 *
 * @module offspring-risk
 */

import type {
  CarrierStatus,
  OffspringRisk,
  XLinkedOffspringRisk,
} from '@mergenix/shared-types';

import {
  calculateOffspringRiskAR,
  calculateOffspringRiskAD,
  calculateOffspringRiskXLinked,
} from './carrier';

// ─── Autosomal Recessive ─────────────────────────────────────────────────────

/**
 * Calculate offspring risk for autosomal recessive (AR) inheritance.
 *
 * Uses a standard Mendelian Punnett-square lookup table. Both parents must
 * carry the pathogenic allele for offspring to have any chance of being
 * affected.
 *
 * Delegates to carrier.ts {@link calculateOffspringRiskAR}, which is the
 * canonical source of truth for AR Punnett-square arithmetic.
 *
 * @param parent1 - Carrier status of parent 1
 * @param parent2 - Carrier status of parent 2
 * @returns Offspring risk percentages (0-100 scale, sums to 100 for valid inputs)
 */
export function calculateARRisk(
  parent1: CarrierStatus,
  parent2: CarrierStatus,
): OffspringRisk {
  return calculateOffspringRiskAR(parent1, parent2);
}

// ─── Autosomal Dominant ──────────────────────────────────────────────────────

/**
 * Calculate offspring risk for autosomal dominant (AD) inheritance.
 *
 * In AD diseases a single pathogenic allele copy causes disease, so "carrier"
 * status is clinically equivalent to "affected". The carrier column in the
 * returned risk object is always 0.
 *
 * Delegates to carrier.ts {@link calculateOffspringRiskAD}, which is the
 * canonical source of truth for AD Punnett-square arithmetic.
 *
 * @param parent1 - Carrier status of parent 1
 * @param parent2 - Carrier status of parent 2
 * @returns Offspring risk percentages (carrier is always 0 for AD)
 */
export function calculateADRisk(
  parent1: CarrierStatus,
  parent2: CarrierStatus,
): OffspringRisk {
  return calculateOffspringRiskAD(parent1, parent2);
}

// ─── X-Linked ────────────────────────────────────────────────────────────────

/**
 * Calculate offspring risk for X-linked inheritance.
 *
 * Returns sex-stratified risks (sons vs daughters) because the X chromosome
 * is transmitted differently by sex:
 * - Sons inherit their X from the mother only (father gives Y)
 * - Daughters inherit one X from each parent
 *
 * By default parent1 is assumed to be the biological female (mother). Pass
 * `parent1IsFemale=false` to indicate parent1 is the father; the arguments
 * will be swapped before delegating to the underlying calculator.
 *
 * Delegates to carrier.ts {@link calculateOffspringRiskXLinked}, which
 * assumes parentA=female(XX), parentB=male(XY).
 *
 * @param parent1 - Carrier status of parent 1
 * @param parent2 - Carrier status of parent 2
 * @param parent1IsFemale - Which parent is the biological female. Defaults to true.
 * @returns Sex-stratified offspring risk with sons, daughters, and overall averages
 */
export function calculateXLinkedRisk(
  parent1: CarrierStatus,
  parent2: CarrierStatus,
  parent1IsFemale: boolean = true,
): XLinkedOffspringRisk {
  // carrier.ts assumes parentA=female(XX), parentB=male(XY).
  // Swap arguments when parent1 is not the female parent.
  if (parent1IsFemale) {
    return calculateOffspringRiskXLinked(parent1, parent2);
  } else {
    return calculateOffspringRiskXLinked(parent2, parent1);
  }
}
