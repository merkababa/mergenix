/**
 * Carrier Risk Analysis Engine
 *
 * Compares two parents' genotypes against a panel of known genetic diseases
 * to identify offspring risk based on Mendelian inheritance patterns.
 *
 * Supports three inheritance modes:
 * - Autosomal recessive (AR): Both parents must carry the variant
 * - Autosomal dominant (AD): Single copy causes disease
 * - X-linked (XL): Variant on X chromosome with sex-specific expression
 *
 * Gene-level features (E4/E5/E6):
 * - Gene-level grouping: variants are grouped by gene symbol for aggregate analysis
 * - Compound heterozygote detection: flags when 2+ different het variants in same gene
 * - Not-tested distinction: differentiates "variant not detected" from "not tested"
 *
 * Ported from Source/carrier_analysis.py (546 lines).
 */

import type {
  CarrierStatus,
  RiskLevel,
  InheritancePattern,
  OffspringRisk,
  XLinkedOffspringRisk,
  CarrierResult,
  Tier,
  GenotypeMap,
  CarrierPanelEntry,
  TierGating,
} from './types';

import { TIER_GATING } from './types';
// NOTE: TOP_21_FREE_DISEASES was previously imported for free-tier curated disease
// filtering. Free tier now has diseaseLimit: 0 (no disease access), so the curated
// list and its helper isFreeTierDisease() have been removed. The constant is kept in
// @mergenix/genetics-data for legacy reference.
import { CARRIER_PANEL_COUNT, CARRIER_PANEL_COUNT_DISPLAY } from '@mergenix/genetics-data';

// ─── Types (internal to carrier module) ─────────────────────────────────────

/**
 * Extended carrier status that distinguishes "not tested" from "unknown".
 *
 * - 'not_tested': The variant's rsID was NOT present in the genotype file at all
 *   (not on the chip). Status is truly unknown — the variant may or may not be present.
 * - 'unknown': The rsID WAS in the file but the genotype call is invalid
 *   (e.g., '--', '00', empty, or malformed).
 * - 'normal' / 'carrier' / 'affected': Standard carrier statuses from valid genotype calls.
 */
export type ExtendedCarrierStatus = CarrierStatus | 'not_tested';

/**
 * Testing status for a variant rsID in a genotype file.
 *
 * - 'tested': rsID exists in the genotype map with a valid genotype call
 * - 'not_tested': rsID does not exist in the genotype map at all
 * - 'no_call': rsID exists but the genotype is a no-call (e.g., '--', '00', empty)
 */
export type TestingStatus = 'tested' | 'not_tested' | 'no_call';

/**
 * Result of compound heterozygote detection for a single gene.
 *
 * When a person has 2+ DIFFERENT heterozygous pathogenic variants in the SAME gene,
 * they may be compound heterozygous (one pathogenic variant on each chromosome copy).
 * Since DTC data is unphased (we cannot determine which allele is on which chromosome),
 * we label these as "Potential Risk" rather than "Affected".
 */
export interface CompoundHetResult {
  /** Whether compound heterozygosity was detected. */
  isCompoundHet: boolean;
  /** rsIDs of the heterozygous variants involved. */
  variants: string[];
  /** Human-readable label for the compound het status. */
  label: 'Potential Risk - Phasing Unknown' | 'Not Compound Het';
  /** Plain language explanation of the phasing limitation. */
  explanation: string;
}

/**
 * Per-variant carrier status detail within a gene-level analysis.
 */
export interface VariantDetail {
  /** SNP identifier. */
  rsid: string;
  /** Carrier status for this specific variant. */
  status: ExtendedCarrierStatus;
  /** Testing status for this variant. */
  testingStatus: TestingStatus;
  /** Condition name associated with this variant. */
  condition: string;
}

/**
 * Gene-level carrier analysis result for a single parent.
 */
export interface GeneCarrierResult {
  /** Gene symbol. */
  gene: string;
  /** Worst-case carrier status across all variants in this gene. */
  geneStatus: ExtendedCarrierStatus;
  /** Per-variant breakdown. */
  variantDetails: VariantDetail[];
  /** Compound heterozygote detection result (if applicable). */
  compoundHet: CompoundHetResult | null;
}

/**
 * A group of carrier panel entries sharing the same gene symbol.
 */
export interface GeneVariantGroup {
  /** Gene symbol. */
  gene: string;
  /** All panel entries for this gene. */
  entries: CarrierPanelEntry[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Zero-risk offspring risk (used for unknown or fallback cases). */
const ZERO_RISK: OffspringRisk = { affected: 0, carrier: 0, normal: 0 };

/** Risk level sort priority: lower number = higher priority (shown first). */
const RISK_PRIORITY: Record<RiskLevel, number> = {
  high_risk: 0,
  potential_risk: 1,
  carrier_detected: 2,
  low_risk: 3,
  coverage_insufficient: 4,
  unknown: 5,
  not_tested: 6,
};

/** Genotype patterns that indicate a no-call (present in file but no valid genotype). */
const NO_CALL_PATTERNS: ReadonlySet<string> = new Set(['--', '00', '']);

// ─── Testing Status (E6) ────────────────────────────────────────────────────

/**
 * Determine the testing status of a variant rsID in a genotype map.
 *
 * Distinguishes between three states:
 * - 'tested': The rsID is in the file and has a valid genotype call
 * - 'not_tested': The rsID is not in the file at all (not on the chip)
 * - 'no_call': The rsID is in the file but the genotype is invalid/missing
 *
 * This is critical for DTC genotyping interpretation: "variant not detected"
 * (tested, normal result) is fundamentally different from "not tested"
 * (rsID not on chip, unknown status).
 *
 * @param rsid - The variant rsID to check
 * @param genotypes - The genotype map from the parsed file
 * @returns Testing status classification
 */
export function getTestingStatus(rsid: string, genotypes: GenotypeMap): TestingStatus {
  if (!(rsid in genotypes)) {
    return 'not_tested';
  }

  const genotype = genotypes[rsid] ?? '';
  if (NO_CALL_PATTERNS.has(genotype)) {
    return 'no_call';
  }

  return 'tested';
}

// ─── Carrier Status Determination ───────────────────────────────────────────

/**
 * Determine extended carrier status from a genotype, allele info, and genotype map.
 *
 * Extends the original `determineCarrierStatus()` to distinguish between
 * "not tested" (rsID not in file) and "unknown" (rsID in file but no-call).
 *
 * @param rsid - The variant rsID
 * @param genotypes - Full genotype map for this parent
 * @param pathogenicAllele - The disease-causing allele
 * @param referenceAllele - The normal/reference allele
 * @returns Extended carrier status including 'not_tested'
 */
export function determineExtendedCarrierStatus(
  rsid: string,
  genotypes: GenotypeMap,
  pathogenicAllele: string,
  referenceAllele: string,
): ExtendedCarrierStatus {
  const testingStatus = getTestingStatus(rsid, genotypes);

  if (testingStatus === 'not_tested') {
    return 'not_tested';
  }

  if (testingStatus === 'no_call') {
    return 'unknown';
  }

  // Variant was tested and has a valid genotype — use standard logic
  const genotype = genotypes[rsid] ?? '';
  return determineCarrierStatus(genotype, pathogenicAllele, referenceAllele);
}

/**
 * Determine carrier status from a genotype and allele information.
 *
 * Counts the number of pathogenic alleles in the genotype string
 * and classifies accordingly.
 *
 * Ported from Source/carrier_analysis.py `determine_carrier_status()`.
 *
 * @param genotype - Two-character genotype string (e.g., "AA", "AG", "GG")
 * @param pathogenicAllele - The disease-causing allele (e.g., "T")
 * @param _referenceAllele - The normal/reference allele (e.g., "C"). Currently unused
 *   but kept for API compatibility.
 * @returns Carrier status: "normal" (0 copies), "carrier" (1 copy),
 *   "affected" (2 copies), or "unknown" (invalid data)
 */
export function determineCarrierStatus(
  genotype: string,
  pathogenicAllele: string,
  _referenceAllele: string,
): CarrierStatus {
  if (!genotype) {
    return 'unknown';
  }

  // Normalize pathogenic allele to uppercase for case-insensitive comparison
  const pathAllele = pathogenicAllele.toUpperCase();

  let pathogenicCount = 0;

  // Handle "/" separated genotypes from VCF indels (e.g., "ATCG/A")
  if (genotype.includes('/')) {
    const alleles = genotype.split('/');
    if (alleles.length !== 2) {
      return 'unknown';
    }
    for (const allele of alleles) {
      if (allele.toUpperCase() === pathAllele) {
        pathogenicCount++;
      }
    }
  } else {
    // Guard: standard 2-character genotype (e.g., "AA", "AG")
    if (genotype.length !== 2) {
      return 'unknown';
    }

    // Normalize to uppercase for case-insensitive comparison
    const gt = genotype.toUpperCase();

    // Count pathogenic alleles in the genotype
    for (let i = 0; i < gt.length; i++) {
      if (gt[i] === pathAllele) {
        pathogenicCount++;
      }
    }
  }

  if (pathogenicCount === 0) {
    return 'normal';
  } else if (pathogenicCount === 1) {
    return 'carrier';
  } else if (pathogenicCount === 2) {
    return 'affected';
  }

  return 'unknown';
}

// ─── Autosomal Recessive Risk Calculation ───────────────────────────────────

/**
 * Autosomal recessive Mendelian risk lookup table.
 *
 * Key format: "parentAStatus,parentBStatus"
 * Value: [affected%, carrier%, normal%]
 *
 * All 9 valid combinations of (normal, carrier, affected) x (normal, carrier, affected).
 */
const AR_RISK_TABLE: Record<string, readonly [number, number, number]> = {
  'normal,normal': [0, 0, 100],
  'normal,carrier': [0, 50, 50],
  'normal,affected': [0, 100, 0],
  'carrier,normal': [0, 50, 50],
  'carrier,carrier': [25, 50, 25],
  'carrier,affected': [50, 50, 0],
  'affected,normal': [0, 100, 0],
  'affected,carrier': [50, 50, 0],
  'affected,affected': [100, 0, 0],
};

/**
 * Calculate offspring disease risk for autosomal recessive (AR) inheritance.
 *
 * Uses a standard Mendelian lookup table based on parental carrier status.
 *
 * Risk outcomes (from the lookup table in carrier_analysis.py):
 * - normal x normal: 0% affected, 0% carrier, 100% normal
 * - normal x carrier: 0% affected, 50% carrier, 50% normal
 * - carrier x carrier: 25% affected, 50% carrier, 25% normal
 * - carrier x affected: 50% affected, 50% carrier, 0% normal
 * - affected x affected: 100% affected, 0% carrier, 0% normal
 * - (and symmetric combinations)
 *
 * Ported from Source/carrier_analysis.py `calculate_offspring_risk()`.
 *
 * @param parentAStatus - Carrier status of parent A
 * @param parentBStatus - Carrier status of parent B
 * @returns Offspring risk percentages (0-100 scale)
 */
export function calculateOffspringRiskAR(
  parentAStatus: CarrierStatus,
  parentBStatus: CarrierStatus,
): OffspringRisk {
  // Unknown status means we cannot calculate risk
  if (parentAStatus === 'unknown' || parentBStatus === 'unknown') {
    return { ...ZERO_RISK };
  }

  const key = `${parentAStatus},${parentBStatus}`;
  const entry = AR_RISK_TABLE[key];

  if (entry) {
    const [affected, carrier, normal] = entry;
    return { affected, carrier, normal };
  }

  // Fallback for unexpected status combinations
  return { ...ZERO_RISK };
}

// ─── Autosomal Dominant Risk Calculation ────────────────────────────────────

/**
 * Autosomal dominant risk lookup table.
 *
 * In AD diseases, "carrier" (heterozygous) is clinically equivalent to "affected".
 * The carrier column is always 0 because one copy = affected.
 *
 * NOTE: DTC genotyping arrays cannot distinguish heterozygous affected (Aa)
 * from homozygous dominant (AA) in AD conditions. This table assumes all
 * "affected" individuals are heterozygous (Aa), which is the overwhelming
 * majority of cases for rare dominant conditions. True AA x AA would yield
 * 100% affected offspring, but AA homozygosity is exceedingly rare.
 *
 * Key format: "effectiveAStatus,effectiveBStatus" (after carrier -> affected mapping)
 * Value: [affected%, carrier%, normal%]
 */
const AD_RISK_TABLE: Record<string, readonly [number, number, number]> = {
  'normal,normal': [0, 0, 100],
  'normal,affected': [50, 0, 50],
  'affected,normal': [50, 0, 50],
  'affected,affected': [75, 0, 25],
};

/**
 * Calculate offspring disease risk for autosomal dominant (AD) inheritance.
 *
 * In AD diseases, a single copy of the pathogenic allele causes disease.
 * Therefore "carrier" status is clinically equivalent to "affected".
 *
 * Risk outcomes:
 * - normal x normal: 0% affected, 0% carrier, 100% normal
 * - normal x affected (het): 50% affected, 0% carrier, 50% normal
 * - affected x affected (het x het, Aa x Aa): 75% affected, 0% carrier, 25% normal
 * (carrier is always 0% because one copy = affected in AD)
 * Note: Both "affected" parents are heterozygous (Aa). Aa x Aa yields
 * 25% AA + 50% Aa + 25% aa. Since AD means one copy = affected,
 * AA (affected) + Aa (affected) = 75%, aa (normal) = 25%.
 *
 * Ported from Source/carrier_analysis.py `calculate_offspring_risk_ad()`.
 *
 * @param parentAStatus - Carrier status of parent A
 * @param parentBStatus - Carrier status of parent B
 * @returns Offspring risk percentages (carrier is always 0 for AD)
 */
export function calculateOffspringRiskAD(
  parentAStatus: CarrierStatus,
  parentBStatus: CarrierStatus,
): OffspringRisk {
  // Unknown status means we cannot calculate risk
  if (parentAStatus === 'unknown' || parentBStatus === 'unknown') {
    return { ...ZERO_RISK };
  }

  // For AD: carrier = affected (one copy of pathogenic allele causes disease)
  const effectiveA: 'normal' | 'affected' =
    parentAStatus === 'carrier' ? 'affected' : parentAStatus === 'affected' ? 'affected' : 'normal';
  const effectiveB: 'normal' | 'affected' =
    parentBStatus === 'carrier' ? 'affected' : parentBStatus === 'affected' ? 'affected' : 'normal';

  const key = `${effectiveA},${effectiveB}`;
  const entry = AD_RISK_TABLE[key];

  if (entry) {
    const [affected, carrier, normal] = entry;
    return { affected, carrier, normal };
  }

  // Fallback for unexpected status combinations
  return { ...ZERO_RISK };
}

// ─── X-Linked Risk Calculation ──────────────────────────────────────────────

/**
 * Calculate offspring disease risk for X-linked inheritance.
 *
 * Assumes parent A is female (XX) and parent B is male (XY).
 *
 * For X-linked recessive conditions:
 * - Males are affected with one copy (hemizygous)
 * - Females are carriers with one copy, affected with two copies
 * - Sons get X from mother only; daughters get X from each parent
 * - Male "carrier" status is mapped to "affected" (hemizygous)
 *
 * Returns sex-stratified risks (sons vs daughters) plus overall averages.
 *
 * Ported from Source/carrier_analysis.py `calculate_offspring_risk_xlinked()`.
 *
 * IMPORTANT: This function assumes Parent A is biological female (XX) and
 * Parent B is biological male (XY). If parents are uploaded in the wrong
 * order, all X-linked results will be inverted. The upload UI must enforce
 * parent sex assignment.
 *
 * @param parentAStatus - Carrier status of parent A (female, XX)
 * @param parentBStatus - Carrier status of parent B (male, XY)
 * @returns Sex-stratified offspring risk with sons, daughters, and averages
 */
export function calculateOffspringRiskXLinked(
  parentAStatus: CarrierStatus,
  parentBStatus: CarrierStatus,
): XLinkedOffspringRisk {
  // Unknown status: return zeroes for all
  if (parentAStatus === 'unknown' || parentBStatus === 'unknown') {
    return {
      sons: { ...ZERO_RISK },
      daughters: { ...ZERO_RISK },
      affected: 0,
      carrier: 0,
      normal: 0,
    };
  }

  // DTC chip convention for hemizygous male X-loci:
  // Males have only one X chromosome (XY), so they are hemizygous at every X-linked locus.
  // However, DTC genotyping files always report two alleles — e.g., "GG" means hemizygous G,
  // not true homozygous. The chip software duplicates the single observed allele to fill the
  // diploid genotype field. This means a male "carrier" (one pathogenic X allele) is
  // clinically equivalent to "affected" because there is no second allele to mask the variant.
  // We therefore map any pathogenic male status (carrier OR affected) to 'affected' here.
  const maleStatus: 'normal' | 'affected' =
    parentBStatus === 'carrier' || parentBStatus === 'affected' ? 'affected' : 'normal';
  const femaleStatus = parentAStatus; // normal, carrier, or affected

  // ── SONS (get X from mother, Y from father) ──
  // Mother's X contribution determines sons' status entirely.
  let sons: OffspringRisk;

  if (femaleStatus === 'normal') {
    // Mother XX (both normal) -> sons all get normal X
    sons = { affected: 0, carrier: 0, normal: 100 };
  } else if (femaleStatus === 'carrier') {
    // Mother Xx (one pathogenic X) -> 50% sons get pathogenic X (affected), 50% normal
    sons = { affected: 50, carrier: 0, normal: 50 };
  } else if (femaleStatus === 'affected') {
    // Mother xx (both pathogenic) -> 100% sons get pathogenic X (affected)
    sons = { affected: 100, carrier: 0, normal: 0 };
  } else {
    sons = { ...ZERO_RISK };
  }

  // ── DAUGHTERS (get X from mother AND X from father) ──
  // Father's X: normal if maleStatus === "normal", pathogenic if maleStatus === "affected"
  let daughters: OffspringRisk;

  if (femaleStatus === 'normal' && maleStatus === 'normal') {
    // Mother XX + Father X(normal) -> daughters XX (all normal)
    daughters = { affected: 0, carrier: 0, normal: 100 };
  } else if (femaleStatus === 'normal' && maleStatus === 'affected') {
    // Mother XX + Father x(pathogenic) -> daughters Xx (all carriers)
    daughters = { affected: 0, carrier: 100, normal: 0 };
  } else if (femaleStatus === 'carrier' && maleStatus === 'normal') {
    // Mother Xx + Father X(normal) -> 50% XX (normal), 50% Xx (carrier)
    daughters = { affected: 0, carrier: 50, normal: 50 };
  } else if (femaleStatus === 'carrier' && maleStatus === 'affected') {
    // Mother Xx + Father x(pathogenic) -> 50% Xx (carrier), 50% xx (affected)
    daughters = { affected: 50, carrier: 50, normal: 0 };
  } else if (femaleStatus === 'affected' && maleStatus === 'normal') {
    // Mother xx + Father X(normal) -> daughters Xx (all carriers)
    daughters = { affected: 0, carrier: 100, normal: 0 };
  } else if (femaleStatus === 'affected' && maleStatus === 'affected') {
    // Mother xx + Father x(pathogenic) -> daughters xx (all affected)
    daughters = { affected: 100, carrier: 0, normal: 0 };
  } else {
    daughters = { ...ZERO_RISK };
  }

  // Overall averages (assuming 50/50 sex ratio) for sorting compatibility
  const avgAffected = (sons.affected + daughters.affected) / 2;
  const avgCarrier = (sons.carrier + daughters.carrier) / 2;
  const avgNormal = (sons.normal + daughters.normal) / 2;

  return {
    sons,
    daughters,
    affected: avgAffected,
    carrier: avgCarrier,
    normal: avgNormal,
  };
}

// ─── Risk Level Classification ──────────────────────────────────────────────

/**
 * Type guard to check if an offspring risk object is X-linked (has sons/daughters).
 */
function isXLinkedRisk(risk: OffspringRisk | XLinkedOffspringRisk): risk is XLinkedOffspringRisk {
  return 'sons' in risk && 'daughters' in risk;
}

/**
 * Classify overall risk level based on parental status and offspring risk.
 *
 * Inheritance-aware classification:
 * - AR: high_risk if affected > 0, carrier_detected if parent is carrier, else low_risk
 * - AD: high_risk if either parent is carrier/affected, else low_risk
 * - X-linked: high_risk if any offspring subgroup has affected risk > 0,
 *   carrier_detected if daughters have carrier risk > 0
 *
 * Ported from Source/carrier_analysis.py `_determine_risk_level()`.
 *
 * @param parentAStatus - Carrier status of parent A
 * @param parentBStatus - Carrier status of parent B
 * @param offspringRisk - Calculated offspring risk percentages
 * @param inheritance - Inheritance pattern
 * @returns Risk level classification
 */
export function determineRiskLevel(
  parentAStatus: CarrierStatus,
  parentBStatus: CarrierStatus,
  offspringRisk: OffspringRisk | XLinkedOffspringRisk,
  inheritance: InheritancePattern,
): RiskLevel {
  // Unknown parent status -> unknown risk
  if (parentAStatus === 'unknown' || parentBStatus === 'unknown') {
    return 'unknown';
  }

  // ── Autosomal Dominant ──
  // For AD: a carrier IS affected, so having a carrier parent means high_risk
  // (50% offspring affected), not merely "carrier_detected"
  if (inheritance === 'autosomal_dominant') {
    if (
      parentAStatus === 'carrier' ||
      parentAStatus === 'affected' ||
      parentBStatus === 'carrier' ||
      parentBStatus === 'affected'
    ) {
      return 'high_risk';
    }
    return 'low_risk';
  }

  // ── X-Linked ──
  if (inheritance === 'X-linked') {
    if (isXLinkedRisk(offspringRisk)) {
      // Check if any offspring subgroup has affected risk
      const sonsAffected = offspringRisk.sons.affected;
      const daughtersAffected = offspringRisk.daughters.affected;
      const overallAffected = offspringRisk.affected;

      if (sonsAffected > 0 || daughtersAffected > 0 || overallAffected > 0) {
        return 'high_risk';
      }

      // Check for carrier status in daughters or parents
      const daughtersCarrier = offspringRisk.daughters.carrier;
      if (daughtersCarrier > 0) {
        return 'carrier_detected';
      }
    } else {
      // Fallback: use overall affected from non-XLinked risk shape
      if (offspringRisk.affected > 0) {
        return 'high_risk';
      }
    }

    // Check parent carrier status
    if (parentAStatus === 'carrier' || parentBStatus === 'carrier') {
      return 'carrier_detected';
    }

    return 'low_risk';
  }

  // ── Autosomal Recessive (default / original behavior) ──
  // High risk: any chance of affected offspring
  if (offspringRisk.affected > 0) {
    return 'high_risk';
  }

  // Carrier detected: at least one parent is a carrier (but no risk of affected)
  if (parentAStatus === 'carrier' || parentBStatus === 'carrier') {
    return 'carrier_detected';
  }

  // Low risk: neither parent is a carrier or affected
  return 'low_risk';
}

// ─── Gene-Level Grouping (E4) ───────────────────────────────────────────────

/**
 * Group carrier panel entries by gene symbol.
 *
 * Many genes have multiple pathogenic variants in the carrier panel (e.g.,
 * CFTR has F508del, G542X, etc.). This function groups all entries sharing
 * the same gene symbol so they can be analyzed together.
 *
 * @param panel - Array of carrier panel entries
 * @returns Array of gene variant groups, one per unique gene symbol
 */
export function groupVariantsByGene(panel: CarrierPanelEntry[]): GeneVariantGroup[] {
  const geneMap = new Map<string, CarrierPanelEntry[]>();

  for (const entry of panel) {
    const gene = entry.gene;
    const existing = geneMap.get(gene);
    if (existing) {
      existing.push(entry);
    } else {
      geneMap.set(gene, [entry]);
    }
  }

  const groups: GeneVariantGroup[] = [];
  for (const [gene, entries] of geneMap) {
    groups.push({ gene, entries });
  }

  return groups;
}

/**
 * Analyze carrier status at the gene level for a single parent.
 *
 * For a given gene with multiple variants:
 * 1. Determines per-variant extended carrier status (including not_tested)
 * 2. Produces a gene-level status (worst-case across all variants)
 * 3. If multiple heterozygous pathogenic variants are found, flags for compound het
 *
 * The "worst-case" status hierarchy is:
 *   affected > carrier > normal > unknown > not_tested
 *
 * @param gene - Gene symbol
 * @param entries - All carrier panel entries for this gene
 * @param genotypes - Parent's genotype map
 * @returns Gene-level carrier analysis result
 */
export function analyzeGeneCarrierStatus(
  gene: string,
  entries: CarrierPanelEntry[],
  genotypes: GenotypeMap,
): GeneCarrierResult {
  const variantDetails: VariantDetail[] = [];

  for (const entry of entries) {
    const extStatus = determineExtendedCarrierStatus(
      entry.rsid,
      genotypes,
      entry.pathogenic_allele,
      entry.reference_allele,
    );
    const testingStatus = getTestingStatus(entry.rsid, genotypes);

    variantDetails.push({
      rsid: entry.rsid,
      status: extStatus,
      testingStatus,
      condition: entry.condition,
    });
  }

  // Determine gene-level status: worst-case across all variants
  const geneStatus = worstCaseStatus(variantDetails.map((v) => v.status));

  // Check for compound heterozygosity
  const hetVariants = variantDetails.filter((v) => v.status === 'carrier');
  let compoundHet: CompoundHetResult | null = null;

  if (hetVariants.length >= 2) {
    compoundHet = detectCompoundHet(
      hetVariants.map((v) => ({ rsid: v.rsid, status: 'carrier' as CarrierStatus })),
      gene,
    );
  }

  return {
    gene,
    geneStatus,
    variantDetails,
    compoundHet,
  };
}

/**
 * Determine the worst-case (most severe) status from an array of extended statuses.
 *
 * Priority order (highest severity first):
 *   affected > carrier > normal > unknown > not_tested
 *
 * @param statuses - Array of extended carrier statuses
 * @returns The most severe status found
 */
function worstCaseStatus(statuses: ExtendedCarrierStatus[]): ExtendedCarrierStatus {
  const priority: Record<ExtendedCarrierStatus, number> = {
    affected: 0,
    carrier: 1,
    normal: 2,
    unknown: 3,
    not_tested: 4,
  };

  let worst: ExtendedCarrierStatus = 'not_tested';
  let worstPriority = priority[worst];

  for (const status of statuses) {
    const p = priority[status];
    if (p < worstPriority) {
      worst = status;
      worstPriority = p;
    }
  }

  return worst;
}

// ─── Compound Heterozygote Detection (E5) ───────────────────────────────────

/**
 * Detect potential compound heterozygosity within a gene.
 *
 * Compound heterozygosity occurs when a person has two DIFFERENT heterozygous
 * pathogenic variants in the SAME gene, potentially on different chromosomal
 * copies. If one variant is on the maternal copy and the other on the paternal
 * copy, both copies of the gene are disrupted — functionally equivalent to
 * homozygous affected for autosomal recessive conditions.
 *
 * CRITICAL LIMITATION: DTC genotyping data is UNPHASED — we cannot determine
 * which allele is on which chromosome. Therefore:
 * - Both variants could be on the SAME chromosome (cis) = carrier only
 * - Variants could be on DIFFERENT chromosomes (trans) = compound het = affected
 * - We CANNOT distinguish these cases without phasing data
 *
 * For this reason, compound hets are labeled "Potential Risk - Phasing Unknown"
 * and NEVER "Affected". Clinical confirmation via phased sequencing is required.
 *
 * @param variantStatuses - Array of variant rsIDs and their carrier statuses
 *   (should contain only 'carrier' status variants for compound het detection)
 * @param gene - Gene symbol for the compound het
 * @returns Compound het detection result
 */
export function detectCompoundHet(
  variantStatuses: Array<{ rsid: string; status: CarrierStatus }>,
  gene: string,
): CompoundHetResult {
  // Filter to only heterozygous (carrier) variants
  const hetVariants = variantStatuses.filter((v) => v.status === 'carrier');

  if (hetVariants.length < 2) {
    return {
      isCompoundHet: false,
      variants: [],
      label: 'Not Compound Het',
      explanation:
        `Only ${hetVariants.length} heterozygous variant(s) found in ${gene}. ` +
        'Compound heterozygosity requires at least 2 different heterozygous pathogenic variants in the same gene.',
    };
  }

  const involvedRsids = hetVariants.map((v) => v.rsid);

  return {
    isCompoundHet: true,
    variants: involvedRsids,
    label: 'Potential Risk - Phasing Unknown',
    explanation:
      `${hetVariants.length} different heterozygous pathogenic variants detected in ${gene} ` +
      `(${involvedRsids.join(', ')}). ` +
      'These variants may be on different chromosomal copies (trans configuration), which would ' +
      'result in compound heterozygosity — functionally equivalent to being affected for autosomal ' +
      'recessive conditions. However, DTC genotyping data is unphased, meaning we cannot determine ' +
      'whether these variants are on the same chromosome (cis, carrier only) or different chromosomes ' +
      '(trans, compound het). Clinical confirmation with phased sequencing or family studies is ' +
      'recommended to determine the true configuration.',
  };
}

// ─── Panel Filtering ────────────────────────────────────────────────────────

/**
 * Filter the carrier panel based on pricing tier.
 *
 * - free: No diseases (diseaseLimit: 0 — disease screening requires Premium or Pro)
 * - premium: First 500 diseases from the panel
 * - pro: All diseases (full carrier panel)
 *
 * Mirrors the Python `get_diseases_for_tier()` from tier_config.py.
 *
 * @param panel - Full carrier panel
 * @param tier - Pricing tier
 * @returns Filtered panel entries
 */
function filterPanelByTier(panel: CarrierPanelEntry[], tier: Tier): CarrierPanelEntry[] {
  const gating: TierGating | undefined = TIER_GATING[tier];
  if (!gating) {
    return panel;
  }

  // diseaseLimit: 0 means no disease access for this tier (free tier)
  if (gating.diseaseLimit === 0) {
    return [];
  }

  const limit = gating.diseaseLimit ?? panel.length;

  // Premium and pro: return diseases up to the tier limit
  return panel.slice(0, limit);
}

// ─── Main Analysis Function ─────────────────────────────────────────────────

/**
 * Extended carrier result with gene-level grouping information.
 *
 * Extends the base CarrierResult interface with additional fields for:
 * - Gene-level variant grouping (which other variants exist in the same gene)
 * - Extended carrier status (distinguishing 'not_tested' from 'unknown')
 * - Compound heterozygote detection results
 *
 * This type is a strict superset of CarrierResult, so it's backward-compatible:
 * any code expecting CarrierResult[] will work with ExtendedCarrierResult[].
 */
export interface ExtendedCarrierResult extends CarrierResult {
  /** Extended carrier status for parent A (includes 'not_tested'). */
  parentAExtendedStatus: ExtendedCarrierStatus;
  /** Extended carrier status for parent B (includes 'not_tested'). */
  parentBExtendedStatus: ExtendedCarrierStatus;
  /** Testing status for parent A at this rsID. */
  parentATestingStatus: TestingStatus;
  /** Testing status for parent B at this rsID. */
  parentBTestingStatus: TestingStatus;
  /** All variants in the same gene for parent A (gene-level view). */
  geneAnalysisParentA: GeneCarrierResult | null;
  /** All variants in the same gene for parent B (gene-level view). */
  geneAnalysisParentB: GeneCarrierResult | null;
}

/**
 * Analyze carrier risk for all diseases in the panel.
 *
 * For each disease in the panel:
 * 1. Look up both parents' genotypes at the disease rsID
 * 2. Determine carrier status for each parent (standard + extended)
 * 3. Calculate offspring risk based on inheritance pattern
 * 4. Classify overall risk level
 * 5. Attach gene-level analysis with compound het detection
 *
 * Results are sorted by risk (highest first):
 * - Primary: risk level (high_risk > carrier_detected > low_risk > unknown)
 * - Secondary: affected percentage (descending)
 * - Tertiary: condition name (alphabetical)
 *
 * Ported from Source/carrier_analysis.py `analyze_carrier_risk()`.
 *
 * @param parentASnps - Parent A's genotype map (rsid -> genotype)
 * @param parentBSnps - Parent B's genotype map (rsid -> genotype)
 * @param panel - Carrier disease panel entries
 * @param tier - Pricing tier for filtering (optional; undefined = all diseases)
 * @returns Array of extended carrier results (backward-compatible with CarrierResult[]),
 *   sorted by risk level
 */
export function analyzeCarrierRisk(
  parentASnps: GenotypeMap,
  parentBSnps: GenotypeMap,
  panel: CarrierPanelEntry[],
  tier?: Tier,
): ExtendedCarrierResult[] {
  // Filter panel by tier if specified
  const filteredPanel: CarrierPanelEntry[] = tier != null ? filterPanelByTier(panel, tier) : panel;

  // Pre-compute gene-level analysis for both parents (E4)
  const geneGroups = groupVariantsByGene(filteredPanel);

  const geneAnalysisCacheA = new Map<string, GeneCarrierResult>();
  const geneAnalysisCacheB = new Map<string, GeneCarrierResult>();

  for (const group of geneGroups) {
    geneAnalysisCacheA.set(
      group.gene,
      analyzeGeneCarrierStatus(group.gene, group.entries, parentASnps),
    );
    geneAnalysisCacheB.set(
      group.gene,
      analyzeGeneCarrierStatus(group.gene, group.entries, parentBSnps),
    );
  }

  const results: ExtendedCarrierResult[] = [];

  for (const disease of filteredPanel) {
    const rsid = disease.rsid;
    const pathogenicAllele = disease.pathogenic_allele;
    const referenceAllele = disease.reference_allele;

    // Get genotypes for both parents (default to empty string if missing)
    const parentAGenotype: string = parentASnps[rsid] ?? '';
    const parentBGenotype: string = parentBSnps[rsid] ?? '';

    // Determine carrier status for each parent (standard, for backward compat)
    const parentAStatus = determineCarrierStatus(
      parentAGenotype,
      pathogenicAllele,
      referenceAllele,
    );
    const parentBStatus = determineCarrierStatus(
      parentBGenotype,
      pathogenicAllele,
      referenceAllele,
    );

    // Determine extended carrier status (E6: not_tested distinction)
    const parentAExtendedStatus = determineExtendedCarrierStatus(
      rsid,
      parentASnps,
      pathogenicAllele,
      referenceAllele,
    );
    const parentBExtendedStatus = determineExtendedCarrierStatus(
      rsid,
      parentBSnps,
      pathogenicAllele,
      referenceAllele,
    );

    // Testing status (E6)
    const parentATestingStatus = getTestingStatus(rsid, parentASnps);
    const parentBTestingStatus = getTestingStatus(rsid, parentBSnps);

    // Calculate offspring risk based on inheritance type
    const inheritance: InheritancePattern = disease.inheritance;

    let offspringRisk: OffspringRisk | XLinkedOffspringRisk;

    if (inheritance === 'autosomal_dominant') {
      offspringRisk = calculateOffspringRiskAD(parentAStatus, parentBStatus);
    } else if (inheritance === 'X-linked') {
      offspringRisk = calculateOffspringRiskXLinked(parentAStatus, parentBStatus);
    } else {
      // Default: autosomal recessive
      offspringRisk = calculateOffspringRiskAR(parentAStatus, parentBStatus);
    }

    // Determine overall risk level (inheritance-aware)
    const riskLevel = determineRiskLevel(parentAStatus, parentBStatus, offspringRisk, inheritance);

    // Get gene-level analysis (E4, includes compound het from E5)
    const geneAnalysisParentA = geneAnalysisCacheA.get(disease.gene) ?? null;
    const geneAnalysisParentB = geneAnalysisCacheB.get(disease.gene) ?? null;

    // Build extended result entry
    const result: ExtendedCarrierResult = {
      // Base CarrierResult fields (backward compatible)
      condition: disease.condition,
      gene: disease.gene,
      severity: disease.severity,
      description: disease.description,
      parentAStatus,
      parentBStatus,
      parentAGenotype,
      parentBGenotype,
      offspringRisk,
      riskLevel,
      rsid,
      inheritance,
      // Extended fields (E4/E5/E6)
      parentAExtendedStatus,
      parentBExtendedStatus,
      parentATestingStatus,
      parentBTestingStatus,
      geneAnalysisParentA,
      geneAnalysisParentB,
    };

    results.push(result);
  }

  // Sort by risk level (high_risk first, then carrier_detected, then low_risk, unknown last)
  results.sort((a, b) => {
    // Primary: risk priority
    const priorityA = RISK_PRIORITY[a.riskLevel] ?? 999;
    const priorityB = RISK_PRIORITY[b.riskLevel] ?? 999;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Secondary: affected percentage descending
    const affectedA = a.offspringRisk.affected;
    const affectedB = b.offspringRisk.affected;
    if (affectedA !== affectedB) {
      return affectedB - affectedA; // descending
    }

    // Tertiary: condition name alphabetical
    return a.condition.localeCompare(b.condition);
  });

  return results;
}

// ─── Analysis Summary ───────────────────────────────────────────────────────

/**
 * Get the upgrade message for a given tier.
 *
 * Mirrors Source/tier_config.py `get_upgrade_message()`.
 *
 * @param tier - Current pricing tier
 * @returns Upgrade message string, or null for pro tier
 */
function getUpgradeMessage(tier: Tier): string | null {
  switch (tier) {
    case 'free':
      return (
        `Upgrade to Premium for access to 500+ disease screenings, ` +
        `or Pro for the complete ${CARRIER_PANEL_COUNT_DISPLAY}+ disease panel.`
      );
    case 'premium':
      return (
        `Upgrade to Pro for access to the complete ${CARRIER_PANEL_COUNT_DISPLAY}+ disease panel, ` +
        `priority support, API access, and all future disease updates.`
      );
    case 'pro':
      return null;
    default:
      return null;
  }
}

/**
 * Generate analysis summary with tier information.
 *
 * Mirrors Source/carrier_analysis.py `get_analysis_summary()`.
 *
 * @param results - Analysis results from analyzeCarrierRisk()
 * @param tier - User's pricing tier
 * @returns Summary object with disease counts and tier info
 */
export function getAnalysisSummary(
  results: CarrierResult[],
  tier: Tier,
): {
  diseasesAnalyzed: number;
  diseasesAvailable: number;
  totalDiseases: number;
  tier: Tier;
  isLimited: boolean;
  upgradeMessage: string | null;
} {
  const gating: TierGating | undefined = TIER_GATING[tier];
  const diseasesAvailable = gating?.diseaseLimit ?? CARRIER_PANEL_COUNT;

  return {
    diseasesAnalyzed: results.length,
    diseasesAvailable,
    totalDiseases: CARRIER_PANEL_COUNT,
    tier,
    isLimited: tier !== 'pro',
    upgradeMessage: getUpgradeMessage(tier),
  };
}

// ─── Carrier Disclaimer ──────────────────────────────────────────────────────

/**
 * Return the carrier analysis disclaimer text.
 *
 * Covers DTC genotyping limitations, non-diagnostic nature, carrier vs.
 * affected distinction, and the recommendation to consult a genetic counselor.
 *
 * Follows the same pattern as getPgxDisclaimer() in pgx.ts and
 * getPrsDisclaimer() in prs.ts.
 *
 * @returns Disclaimer string
 */
export function getCarrierDisclaimer(): string {
  return (
    'IMPORTANT DISCLAIMER: This carrier analysis is for informational and ' +
    'educational purposes only. It is NOT a medical diagnosis and should NOT ' +
    'be used to make reproductive or clinical decisions without professional ' +
    'guidance.\n\n' +
    'Key limitations:\n' +
    '- Based on direct-to-consumer (DTC) genotyping data, which captures only ' +
    'a subset of known pathogenic variants. Clinical-grade carrier screening ' +
    'panels test for significantly more variants per gene.\n' +
    '- Carrier status does not guarantee that offspring will be affected. ' +
    'Autosomal recessive conditions require both parents to carry the variant ' +
    'for offspring to be at risk.\n' +
    '- Genotyping accuracy varies by platform and SNP coverage. False positives ' +
    'and false negatives are possible, especially for rare variants.\n' +
    '- This analysis does not detect deletions, duplications, or structural ' +
    'variants that may contribute to carrier status.\n' +
    '- Population-specific carrier frequencies may not be reflected in DTC ' +
    'genotyping panels.\n\n' +
    'Always consult a certified genetic counselor or qualified healthcare ' +
    'professional for clinical carrier screening and reproductive planning decisions.'
  );
}
