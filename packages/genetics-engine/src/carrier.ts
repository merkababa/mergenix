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
import { TOP_25_FREE_DISEASES } from '@mergenix/genetics-data';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Total number of diseases in the full carrier panel. */
const TOTAL_DISEASES = 2715;

/** Zero-risk offspring risk (used for unknown or fallback cases). */
const ZERO_RISK: OffspringRisk = { affected: 0, carrier: 0, normal: 0 };

/** Risk level sort priority: lower number = higher priority (shown first). */
const RISK_PRIORITY: Record<RiskLevel, number> = {
  high_risk: 0,
  carrier_detected: 1,
  low_risk: 2,
  unknown: 3,
};

// ─── Carrier Status Determination ───────────────────────────────────────────

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
  // Guard: genotype must be exactly 2 characters
  if (!genotype || genotype.length !== 2) {
    return 'unknown';
  }

  // Normalize all to uppercase for case-insensitive comparison
  const gt = genotype.toUpperCase();
  const pathAllele = pathogenicAllele.toUpperCase();

  // Count pathogenic alleles in the genotype
  let pathogenicCount = 0;
  for (let i = 0; i < gt.length; i++) {
    if (gt[i] === pathAllele) {
      pathogenicCount++;
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

  // For males (XY), "carrier" doesn't exist -- hemizygous means affected
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
      parentAStatus === 'carrier' || parentAStatus === 'affected' ||
      parentBStatus === 'carrier' || parentBStatus === 'affected'
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

// ─── Panel Filtering ────────────────────────────────────────────────────────

/**
 * Check if a disease name matches any of the free tier disease names.
 *
 * Uses case-insensitive substring matching, mirroring the Python
 * `is_free_disease()` behavior from carrier_analysis.py.
 *
 * @param diseaseName - The condition name from the panel entry
 * @returns True if the disease is in the free tier
 */
function isFreeTierDisease(diseaseName: string): boolean {
  const lower = diseaseName.toLowerCase();
  return TOP_25_FREE_DISEASES.some(
    (freeName) => lower.includes(freeName.toLowerCase()),
  );
}

/**
 * Filter the carrier panel based on subscription tier.
 *
 * - free: Only diseases matching TOP_25_FREE_DISEASES (up to 25)
 * - premium: First 500 diseases from the panel
 * - pro: All diseases (up to 2715)
 *
 * Mirrors the Python `get_diseases_for_tier()` from tier_config.py.
 *
 * @param panel - Full carrier panel
 * @param tier - Subscription tier
 * @returns Filtered panel entries
 */
function filterPanelByTier(
  panel: CarrierPanelEntry[],
  tier: Tier,
): CarrierPanelEntry[] {
  const gating: TierGating | undefined = TIER_GATING[tier];
  if (!gating) {
    return panel;
  }

  const limit = gating.diseaseLimit ?? panel.length;

  if (tier === 'free') {
    // Free tier: filter to only the top 25 free diseases, then apply limit
    return panel
      .filter((entry) => isFreeTierDisease(entry.condition.trim()))
      .slice(0, limit);
  }

  // Premium and pro: return diseases up to the tier limit
  return panel.slice(0, limit);
}

// ─── Main Analysis Function ─────────────────────────────────────────────────

/**
 * Analyze carrier risk for all diseases in the panel.
 *
 * For each disease in the panel:
 * 1. Look up both parents' genotypes at the disease rsID
 * 2. Determine carrier status for each parent
 * 3. Calculate offspring risk based on inheritance pattern
 * 4. Classify overall risk level
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
 * @param tier - Subscription tier for filtering (optional; undefined = all diseases)
 * @returns Array of carrier results, sorted by risk level
 */
export function analyzeCarrierRisk(
  parentASnps: GenotypeMap,
  parentBSnps: GenotypeMap,
  panel: CarrierPanelEntry[],
  tier?: Tier,
): CarrierResult[] {
  // Filter panel by tier if specified
  const filteredPanel: CarrierPanelEntry[] =
    tier != null ? filterPanelByTier(panel, tier) : panel;

  const results: CarrierResult[] = [];

  for (const disease of filteredPanel) {
    const rsid = disease.rsid;
    const pathogenicAllele = disease.pathogenic_allele;
    const referenceAllele = disease.reference_allele;

    // Get genotypes for both parents (default to empty string if missing)
    const parentAGenotype: string = parentASnps[rsid] ?? '';
    const parentBGenotype: string = parentBSnps[rsid] ?? '';

    // Determine carrier status for each parent
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
    const riskLevel = determineRiskLevel(
      parentAStatus,
      parentBStatus,
      offspringRisk,
      inheritance,
    );

    // Build result entry
    const result: CarrierResult = {
      condition: disease.condition,
      gene: disease.gene,
      severity: disease.severity,
      description: disease.description,
      parentAStatus,
      parentBStatus,
      offspringRisk,
      riskLevel,
      rsid,
      inheritance,
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
 * @param tier - Current subscription tier
 * @returns Upgrade message string, or null for pro tier
 */
function getUpgradeMessage(tier: Tier): string | null {
  switch (tier) {
    case 'free':
      return (
        'Upgrade to Premium for access to 500+ diseases and all 79 traits, ' +
        'or Pro for the complete 2700+ disease panel.'
      );
    case 'premium':
      return (
        'Upgrade to Pro for access to the complete 2700+ disease panel, ' +
        'priority support, API access, and all future disease updates.'
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
 * @param tier - User's subscription tier
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
  const diseasesAvailable = gating?.diseaseLimit ?? TOTAL_DISEASES;

  return {
    diseasesAnalyzed: results.length,
    diseasesAvailable,
    totalDiseases: TOTAL_DISEASES,
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
