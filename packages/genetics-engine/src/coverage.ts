/**
 * Coverage Calculator
 *
 * Calculates per-disease variant coverage — how many of a disease's target
 * variants were actually found (genotyped) in the user's genetic data file.
 *
 * Consumer DNA chips only cover a fraction of known pathogenic variants.
 * For example, CFTR has ~2,100 known pathogenic variants but a typical chip
 * covers only 13 rsIDs. Users need to see "Tested 13 of 2,100 known variants"
 * so they understand that "no variants detected" does NOT mean "not a carrier."
 */

import type { CoverageMetrics, DiseaseCoverage } from '@mergenix/shared-types';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Information about a disease's target variants. */
interface DiseaseVariantInfo {
  /** Disease or condition name. */
  condition: string;
  /** Gene symbol (e.g., "CFTR"). */
  gene: string;
  /** rsIDs in our carrier panel for this disease. */
  panelRsids: string[];
  /** Total known pathogenic variants from ClinVar (for context). */
  knownPathogenicCount?: number;
}

// ─── Per-Disease Coverage ───────────────────────────────────────────────────

/**
 * Determine whether a genotype string represents a valid, called genotype.
 *
 * A genotype is considered valid if:
 * - It is a non-empty string
 * - It is not the no-call sentinel "--"
 * - It is not the no-call sentinel "00" (some DTC formats use "00" to represent
 *   an uncalled position; carrier.ts rejects it via NO_CALL_PATTERNS — coverage.ts
 *   must match that behavior so coverage percentages are not inflated by
 *   uncalled variants)
 * - It is not composed entirely of dashes or whitespace
 *
 * @param genotype - The genotype string to validate
 * @returns True if the genotype represents a valid call
 */
function isValidGenotype(genotype: string): boolean {
  if (!genotype || genotype.trim().length === 0) {
    return false;
  }
  // Reject no-call sentinels: "--", "---", etc.
  if (/^-+$/.test(genotype.trim())) {
    return false;
  }
  // Reject "00": the no-call sentinel used by some DTC platforms.
  // carrier.ts uses NO_CALL_PATTERNS = new Set(['--', '00', '']) to reject this;
  // coverage.ts must be consistent to avoid inflating coverage percentages.
  if (genotype.trim() === '00') {
    return false;
  }
  return true;
}

/**
 * Calculate coverage for a single disease.
 *
 * Checks how many of the disease's panel rsIDs are present in the genotype
 * map with a valid (non-no-call) genotype.
 *
 * A variant is "tested" if:
 * 1. The rsID exists as a key in the genotype map
 * 2. The genotype value is valid (not empty, not "--")
 *
 * @param diseaseInfo - Disease variant information (condition, gene, rsIDs)
 * @param genotypes - User's genotype map (rsid -> genotype string)
 * @returns Coverage details for this disease
 */
export function calculateDiseaseCoverage(
  diseaseInfo: DiseaseVariantInfo,
  genotypes: Record<string, string>,
): DiseaseCoverage {
  const variantsTotal = diseaseInfo.panelRsids.length;

  // If the disease has no panel rsIDs, coverage is trivially 0/0
  if (variantsTotal === 0) {
    return {
      variantsTested: 0,
      variantsTotal: 0,
      coveragePct: 0,
      isSufficient: false,
    };
  }

  // Count how many panel rsIDs have valid genotypes in the user's data
  let variantsTested = 0;
  for (const rsid of diseaseInfo.panelRsids) {
    const genotype = genotypes[rsid];
    if (genotype !== undefined && isValidGenotype(genotype)) {
      variantsTested++;
    }
  }

  // Calculate coverage percentage (0-100 scale)
  const coveragePct = (variantsTested / variantsTotal) * 100;

  // Sufficient if at least one variant was tested
  const isSufficient = variantsTested > 0;

  return {
    variantsTested,
    variantsTotal,
    coveragePct,
    isSufficient,
  };
}

// ─── Aggregate Coverage Metrics ─────────────────────────────────────────────

/**
 * Calculate coverage metrics across all diseases in the carrier panel.
 *
 * Groups carrier panel entries by condition name, collects all rsIDs for
 * each condition, then calculates per-disease coverage against the user's
 * genotype map.
 *
 * @param carrierPanel - The carrier panel entries (from genetics-data).
 *   Each entry has a condition, gene, and rsid field.
 * @param genotypes - User's genotype map (rsid -> genotype string)
 * @returns Aggregate coverage metrics including per-disease detail
 */
export function calculateCoverageMetrics(
  carrierPanel: Array<{ condition: string; gene: string; rsid: string }>,
  genotypes: Record<string, string>,
): CoverageMetrics {
  // Group panel entries by condition name
  const conditionMap = new Map<string, { gene: string; rsids: string[] }>();

  for (const entry of carrierPanel) {
    const existing = conditionMap.get(entry.condition);
    if (existing) {
      // Add rsid if not already present (avoid duplicates)
      if (!existing.rsids.includes(entry.rsid)) {
        existing.rsids.push(entry.rsid);
      }
    } else {
      conditionMap.set(entry.condition, {
        gene: entry.gene,
        rsids: [entry.rsid],
      });
    }
  }

  // Calculate per-disease coverage
  const perDisease: Record<string, DiseaseCoverage> = {};
  let diseasesWithCoverage = 0;

  for (const [condition, info] of conditionMap) {
    const diseaseInfo: DiseaseVariantInfo = {
      condition,
      gene: info.gene,
      panelRsids: info.rsids,
    };

    const coverage = calculateDiseaseCoverage(diseaseInfo, genotypes);
    perDisease[condition] = coverage;

    if (coverage.isSufficient) {
      diseasesWithCoverage++;
    }
  }

  return {
    totalDiseases: conditionMap.size,
    diseasesWithCoverage,
    perDisease,
  };
}

// ─── Coverage Summary ───────────────────────────────────────────────────────

/**
 * Get a human-readable coverage summary for display.
 *
 * Aggregates the per-disease coverage metrics into key statistics:
 * - Fully covered: 100% of panel variants were tested
 * - Partially covered: Some but not all variants tested
 * - Not covered: Zero variants tested
 * - Overall coverage percentage: Average across all diseases
 *
 * @param metrics - Coverage metrics from calculateCoverageMetrics()
 * @returns Object with summary text and key statistics
 */
export function getCoverageSummary(metrics: CoverageMetrics): {
  totalDiseases: number;
  fullyCovered: number;
  partiallyCovered: number;
  notCovered: number;
  overallCoveragePct: number;
  summaryText: string;
} {
  let fullyCovered = 0;
  let partiallyCovered = 0;
  let notCovered = 0;
  let totalCoveragePct = 0;

  const conditions = Object.keys(metrics.perDisease);

  for (const condition of conditions) {
    const coverage = metrics.perDisease[condition];
    if (!coverage) {
      continue;
    }

    if (coverage.coveragePct === 100) {
      fullyCovered++;
    } else if (coverage.variantsTested > 0) {
      partiallyCovered++;
    } else {
      notCovered++;
    }

    totalCoveragePct += coverage.coveragePct;
  }

  // Average coverage across all diseases (0 if no diseases)
  const diseaseCount = conditions.length;
  const overallCoveragePct = diseaseCount > 0 ? totalCoveragePct / diseaseCount : 0;

  // Round to one decimal place for display
  const roundedOverallPct = Math.round(overallCoveragePct * 10) / 10;

  const summaryText = `Your DNA file covers variants for ${metrics.diseasesWithCoverage} of ${metrics.totalDiseases} conditions`;

  return {
    totalDiseases: metrics.totalDiseases,
    fullyCovered,
    partiallyCovered,
    notCovered,
    overallCoveragePct: roundedOverallPct,
    summaryText,
  };
}
