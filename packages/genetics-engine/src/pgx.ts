/**
 * Pharmacogenomics (PGx) Analysis Engine
 *
 * Implements pharmacogenomic analysis to predict how genetic variants affect
 * drug metabolism and response. Maps SNP genotypes to star allele nomenclature,
 * determines metabolizer status using CPIC activity score systems, and provides
 * evidence-based drug recommendations.
 *
 * Supports 12 pharmacogenes with clinical guidelines from CPIC and DPWG.
 *
 * Includes prominent array-limitation disclaimers for all PGx genes,
 * with additional gene-specific warnings for highly polymorphic genes
 * like CYP2D6 where consumer arrays have known blind spots.
 *
 * Ported from Source/pharmacogenomics.py (525 lines).
 */

import type {
  MetabolizerStatus,
  MetabolizerResult,
  DrugRecommendation,
  PgxGeneResult,
  PgxAnalysisResult,
  Tier,
  GenotypeMap,
  PgxPanel,
  PgxStarAllele,
} from './types';

import { TIER_GATING } from './types';
import { PREMIUM_PGX_GENES, PGX_GENES } from '@mergenix/genetics-data';

// ─── Array Limitation Disclaimers ────────────────────────────────────────────

/**
 * General array limitation disclaimer applicable to ALL pharmacogenes.
 *
 * This text should be displayed prominently on any PGx report to inform
 * users that consumer DNA arrays cannot detect the full range of
 * pharmacogenomic variation.
 */
export const ARRAY_LIMITATION_DISCLAIMER =
  'Array-based genotyping cannot detect structural variants, copy number ' +
  'variations (CNVs), or all known star alleles for any pharmacogene. ' +
  'Results should be confirmed with clinical-grade testing before making ' +
  'medication changes.';

/**
 * Gene-specific warnings for pharmacogenes with known array blind spots.
 *
 * Maps gene symbols to warning text that should be displayed alongside
 * that gene's results. Genes not in this map have no additional
 * gene-specific warning beyond the general disclaimer.
 */
const GENE_SPECIFIC_WARNINGS: Record<string, string> = {
  CYP2D6:
    'CYP2D6 is highly polymorphic with known hybrid alleles and gene ' +
    'duplications/deletions that CANNOT be detected by consumer DNA arrays. ' +
    'CYP2D6 results from this analysis are particularly limited.',
  CYP2C19:
    'CYP2C19*17 (ultrarapid allele) detection depends on rs12248560, which ' +
    'may not be present on all consumer arrays. Results may underreport ' +
    'ultrarapid metabolizer status.',
  DPYD:
    'DPYD has rare but clinically critical variants (e.g., *2A, *13) that ' +
    'cause severe fluoropyrimidine toxicity. Consumer arrays may not cover ' +
    'all clinically relevant DPYD variants.',
};

/**
 * Get a gene-specific array limitation warning, if one exists.
 *
 * Returns a warning string for genes with known consumer array blind spots
 * that go beyond the general disclaimer. These warnings highlight specific
 * structural or polymorphic characteristics that make the gene particularly
 * poorly suited for consumer array-based genotyping.
 *
 * @param gene - Gene symbol (e.g., "CYP2D6", "CYP2C19")
 * @returns Gene-specific warning text, or null if no additional warning
 *   is warranted beyond the general array limitation disclaimer
 *
 * @example
 * getGeneSpecificWarning('CYP2D6')
 * // Returns: "CYP2D6 is highly polymorphic with known hybrid alleles..."
 *
 * @example
 * getGeneSpecificWarning('TPMT')
 * // Returns: null (no additional gene-specific warning)
 */
export function getGeneSpecificWarning(gene: string): string | null {
  return GENE_SPECIFIC_WARNINGS[gene] ?? null;
}

// ─── Star Allele Determination ──────────────────────────────────────────────

/**
 * Determine the star allele diplotype for a given gene based on SNP data.
 *
 * Maps rsID genotypes to star allele calls by checking which defining variants
 * match the individual's genotype data. Handles homozygous and heterozygous
 * variant detection.
 *
 * Ported from Source/pharmacogenomics.py `determine_star_allele()`.
 *
 * @param gene - Gene name (e.g., "CYP2D6")
 * @param snpData - Genotype map (rsid -> genotype)
 * @param pgxPanel - Loaded PGx panel data
 * @returns Star allele diplotype string (e.g., "*1/*4", "*1/*1")
 *
 * @example
 * // If rs3892097 shows "GA" and the *4 allele defines rs3892097=AA:
 * // The person is heterozygous -> carries one *4 allele + one reference *1
 * determineStarAllele("CYP2D6", {"rs3892097": "GA"}, panel)
 * // Returns: "*1/*4"
 */
export function determineStarAllele(
  gene: string,
  snpData: GenotypeMap,
  pgxPanel: PgxPanel,
): string {
  const geneData = pgxPanel.genes[gene];
  if (!geneData) {
    return '*1/*1';
  }

  const starAlleles = geneData.star_alleles;

  // Collect all matched variant alleles (non-reference)
  const matchedAlleles: string[] = [];

  for (const [alleleName, alleleInfo] of Object.entries(starAlleles)) {
    const definingVariants = alleleInfo.defining_variants;
    if (definingVariants.length === 0) {
      // Reference allele (e.g., *1), skip it
      continue;
    }

    // Check if all defining variants for this allele match
    let allMatch = true;
    let anyHet = false;

    for (const variant of definingVariants) {
      const rsid = variant.rsid;
      const expectedGenotype = variant.genotype;
      const actualGenotype = snpData[rsid];

      if (!actualGenotype) {
        allMatch = false;
        break;
      }

      // Normalize genotypes for comparison (sort characters)
      const actualSorted = actualGenotype.toUpperCase().split('').sort().join('');
      const expectedSorted = expectedGenotype.toUpperCase().split('').sort().join('');

      if (actualSorted === expectedSorted) {
        // Exact match (homozygous variant)
        continue;
      } else if (isHeterozygousMatch(actualGenotype, expectedGenotype)) {
        // Heterozygous — carries one copy of the variant
        anyHet = true;
      } else {
        allMatch = false;
        break;
      }
    }

    if (allMatch) {
      if (anyHet) {
        // Heterozygous: one copy of variant allele + one reference
        matchedAlleles.push(alleleName);
      } else {
        // Homozygous: two copies of variant allele
        matchedAlleles.push(alleleName);
        matchedAlleles.push(alleleName);
      }
    }
  }

  // Build diplotype — diploid organisms carry exactly 2 allele copies.
  // If >2 alleles matched (overlapping defining variants across star alleles),
  // we take the first two found. All star alleles in the panel are examined
  // before building the diplotype to avoid order-dependent results.
  const refAllele = getReferenceAllele(starAlleles);

  if (matchedAlleles.length === 0) {
    // No variants detected — homozygous reference
    return `${refAllele}/${refAllele}`;
  }

  if (matchedAlleles.length === 1) {
    // One variant allele + one reference
    return `${refAllele}/${matchedAlleles[0]!}`;
  }

  // Two or more variant alleles — use the first two (diploid cap)
  return `${matchedAlleles[0]!}/${matchedAlleles[1]!}`;
}

/**
 * Check if actual genotype is heterozygous for the expected homozygous variant.
 *
 * For example, if expected is "AA" (hom variant) and actual is "AG",
 * the person is heterozygous (carries one variant allele).
 */
function isHeterozygousMatch(actual: string, expectedHom: string): boolean {
  if (actual.length !== 2 || expectedHom.length < 2) {
    return false;
  }

  const actualUpper = actual.toUpperCase();
  const expectedUpper = expectedHom.toUpperCase();

  // The expected homozygous allele (e.g., "A" from "AA")
  const variantAllele = expectedUpper[0];

  // Check if exactly one copy of the variant allele is present
  let count = 0;
  for (const a of actualUpper) {
    if (a === variantAllele) {
      count++;
    }
  }
  return count === 1;
}

/**
 * Get the reference (wildtype) allele name from star alleles dict.
 *
 * The reference allele is identified by having no defining variants.
 * Falls back to "*1" if not found.
 */
function getReferenceAllele(
  starAlleles: Record<string, PgxStarAllele>,
): string {
  for (const [name, info] of Object.entries(starAlleles)) {
    if (info.defining_variants.length === 0) {
      return name;
    }
  }
  return '*1';
}

/**
 * Determine metabolizer status from a gene diplotype using CPIC activity scores.
 *
 * Calculates total activity score by summing allele scores, then maps to a
 * metabolizer phenotype using gene-specific threshold ranges.
 *
 * Ported from Source/pharmacogenomics.py `determine_metabolizer_status()`.
 *
 * @param gene - Gene name (e.g., "CYP2D6")
 * @param diplotype - Star allele diplotype (e.g., "*1/*4")
 * @param pgxPanel - Loaded PGx panel data
 * @returns Metabolizer result with status, activity score, and description
 *
 * @example
 * // *1 has activity 1.0, *4 has activity 0.0
 * // Total: 1.0 -> maps to "intermediate_metabolizer" (range 0.25-1.0)
 * determineMetabolizerStatus("CYP2D6", "*1/*4", panel)
 * // Returns: { status: "intermediate_metabolizer", activityScore: 1.0, description: "..." }
 */
export function determineMetabolizerStatus(
  gene: string,
  diplotype: string,
  pgxPanel: PgxPanel,
): MetabolizerResult {
  const geneData = pgxPanel.genes[gene];
  if (!geneData) {
    return {
      status: 'unknown',
      activityScore: 0.0,
      description: 'Gene not found in pharmacogenomics panel',
    };
  }

  const starAlleles = geneData.star_alleles;
  const metabolizerDefs = geneData.metabolizer_status;

  // Parse diplotype into individual alleles
  const alleles = parseDiplotype(diplotype);

  // Calculate total activity score
  let totalScore = 0.0;
  for (const allele of alleles) {
    const alleleInfo = starAlleles[allele];
    if (alleleInfo) {
      totalScore += alleleInfo.activity_score;
    } else {
      // Unknown allele, assume reference function (1.0)
      totalScore += 1.0;
    }
  }

  // Find matching metabolizer status by activity_score_range
  let matchedStatus: MetabolizerStatus | null = null;
  let matchedDesc = '';

  for (const [statusName, statusInfo] of Object.entries(metabolizerDefs)) {
    const [low, high] = statusInfo.activity_score_range;
    if (low <= totalScore && totalScore <= high) {
      matchedStatus = statusName as MetabolizerStatus;
      matchedDesc = statusInfo.description;
      break;
    }
  }

  if (matchedStatus === null) {
    // No exact range match; try to find a "normal" status as fallback
    matchedStatus = 'normal_metabolizer';
    matchedDesc = 'Activity score does not match defined ranges';

    for (const [statusName, statusInfo] of Object.entries(metabolizerDefs)) {
      if (statusName.toLowerCase().includes('normal')) {
        matchedStatus = statusName as MetabolizerStatus;
        matchedDesc = statusInfo.description;
        break;
      }
    }
  }

  return {
    status: matchedStatus,
    activityScore: totalScore,
    description: matchedDesc,
  };
}

/**
 * Parse a diplotype string into individual allele names.
 *
 * Handles various formats: "*1/*4", "*1A/*1F", "GG/AG", etc.
 */
function parseDiplotype(diplotype: string): [string, string] {
  const parts = diplotype.split('/');
  if (parts.length === 2) {
    return [parts[0]!.trim(), parts[1]!.trim()];
  }
  // Fallback: treat entire string as one allele, pair with reference
  return [diplotype.trim(), '*1'];
}

/**
 * Get drug-specific recommendations based on gene and metabolizer status.
 *
 * Filters the gene's drug list to those with recommendations for the given
 * metabolizer phenotype.
 *
 * Ported from Source/pharmacogenomics.py `get_drug_recommendations()`.
 *
 * @param gene - Gene name (e.g., "CYP2D6")
 * @param metabolizerStatus - Metabolizer phenotype (e.g., "poor_metabolizer")
 * @param pgxPanel - Loaded PGx panel data
 * @returns Array of drug recommendations applicable to this metabolizer status
 */
export function getDrugRecommendations(
  gene: string,
  metabolizerStatus: string,
  pgxPanel: PgxPanel,
): DrugRecommendation[] {
  const geneData = pgxPanel.genes[gene];
  if (!geneData) {
    return [];
  }

  const drugs = geneData.drugs;
  const recommendations: DrugRecommendation[] = [];

  for (const drug of drugs) {
    const recText = drug.recommendation_by_status[metabolizerStatus];
    if (recText !== undefined) {
      recommendations.push({
        drug: drug.name,
        recommendation: recText,
        strength: drug.strength,
        source: drug.source,
        category: drug.category,
      });
    }
  }

  return recommendations;
}

/**
 * Predict possible offspring diplotypes with Mendelian probabilities.
 *
 * Each parent contributes one allele randomly. Generates all 2x2 = 4
 * combinations and merges equivalent diplotypes.
 *
 * Ported from Source/pharmacogenomics.py `predict_offspring_pgx()`.
 *
 * @param parentADiplotype - Parent A's diplotype (e.g., "*1/*4")
 * @param parentBDiplotype - Parent B's diplotype (e.g., "*1/*1")
 * @param _gene - Gene name (for context in results)
 * @returns Array of possible offspring diplotypes with probabilities (0-100)
 */
export function predictOffspringPgx(
  parentADiplotype: string,
  parentBDiplotype: string,
  _gene: string,
): Array<{ diplotype: string; probability: number }> {
  const allelesA = parseDiplotype(parentADiplotype);
  const allelesB = parseDiplotype(parentBDiplotype);

  // Generate all possible combinations (2x2 = 4), each with 25% probability
  const outcomes = new Map<string, number>();

  for (const aAllele of allelesA) {
    for (const bAllele of allelesB) {
      // Normalize diplotype: sort alleles alphabetically
      const dip = normalizeDiplotype(aAllele, bAllele);
      outcomes.set(dip, (outcomes.get(dip) ?? 0) + 25.0);
    }
  }

  // Sort by diplotype name and return
  return Array.from(outcomes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([diplotype, probability]) => ({ diplotype, probability }));
}

/**
 * Normalize a diplotype by sorting alleles alphabetically.
 */
function normalizeDiplotype(alleleA: string, alleleB: string): string {
  if (alleleA <= alleleB) {
    return `${alleleA}/${alleleB}`;
  }
  return `${alleleB}/${alleleA}`;
}

/**
 * Main pharmacogenomics analysis entry point.
 *
 * Analyzes both parents across all tier-accessible pharmacogenes, determining
 * star alleles, metabolizer status, drug recommendations, and offspring
 * predictions for each gene.
 *
 * Tier gating:
 * - Free: 0 genes (returns empty results with upgrade message)
 * - Premium: 5 genes (CYP2D6, CYP2C19, CYP2C9, DPYD, TPMT)
 * - Pro: All 12 genes
 *
 * Ported from Source/pharmacogenomics.py `analyze_pgx()`.
 *
 * @param parentASnps - Parent A's genotype map
 * @param parentBSnps - Parent B's genotype map
 * @param pgxPanel - Loaded PGx panel data
 * @param tier - Pricing tier (default: "free")
 * @returns Full PGx analysis result with per-gene details
 */
export function analyzePgx(
  parentASnps: GenotypeMap,
  parentBSnps: GenotypeMap,
  pgxPanel: PgxPanel,
  tier: Tier = 'free',
): PgxAnalysisResult {
  const genesToAnalyze = getGenesForTier(tier);

  const results: Record<string, PgxGeneResult> = {};

  for (const gene of genesToAnalyze) {
    // Determine star alleles for each parent
    const parentADiplotype = determineStarAllele(gene, parentASnps, pgxPanel);
    const parentBDiplotype = determineStarAllele(gene, parentBSnps, pgxPanel);

    // Determine metabolizer status
    const parentAStatus = determineMetabolizerStatus(gene, parentADiplotype, pgxPanel);
    const parentBStatus = determineMetabolizerStatus(gene, parentBDiplotype, pgxPanel);

    // Get drug recommendations
    const parentARecs = getDrugRecommendations(gene, parentAStatus.status, pgxPanel);
    const parentBRecs = getDrugRecommendations(gene, parentBStatus.status, pgxPanel);

    // Predict offspring diplotypes
    const offspring = predictOffspringPgx(parentADiplotype, parentBDiplotype, gene);

    // Get offspring metabolizer predictions
    const offspringPredictions: PgxGeneResult['offspringPredictions'] = [];
    for (const outcome of offspring) {
      const offStatus = determineMetabolizerStatus(gene, outcome.diplotype, pgxPanel);
      const offRecs = getDrugRecommendations(gene, offStatus.status, pgxPanel);
      offspringPredictions.push({
        diplotype: outcome.diplotype,
        probability: outcome.probability,
        metabolizerStatus: offStatus,
        drugRecommendations: offRecs,
      });
    }

    // Get gene description and chromosome
    const geneInfo = pgxPanel.genes[gene];

    results[gene] = {
      gene,
      description: geneInfo?.description ?? '',
      chromosome: geneInfo?.chromosome ?? '',
      parentA: {
        diplotype: parentADiplotype,
        metabolizerStatus: parentAStatus,
        drugRecommendations: parentARecs,
      },
      parentB: {
        diplotype: parentBDiplotype,
        metabolizerStatus: parentBStatus,
        drugRecommendations: parentBRecs,
      },
      offspringPredictions,
    };
  }

  // Build upgrade message for limited tiers
  let upgradeMessage: string | null = null;
  if (tier === 'free') {
    upgradeMessage =
      'Upgrade to Premium for pharmacogenomics analysis of 5 key genes, ' +
      'or Pro for all 12 pharmacogenes with full drug interaction reports.';
  } else if (tier === 'premium') {
    upgradeMessage =
      'Upgrade to Pro for complete pharmacogenomics analysis of all 12 genes ' +
      'including HLA-B hypersensitivity, UGT1A1, SLCO1B1 statin guidance, and more.';
  }

  return {
    genesAnalyzed: Object.keys(results).length,
    tier: tier,
    isLimited: tier !== 'pro',
    results,
    upgradeMessage,
    disclaimer: getPgxDisclaimer(),
  };
}

/**
 * Get the list of genes accessible at a given tier.
 *
 * Uses the centralized TIER_GATING config for the gene count limit.
 * Premium tier uses a curated PREMIUM_PGX_GENES list (clinically prioritized:
 * CYP2D6, CYP2C19, CYP2C9, DPYD, TPMT) instead of slicing PGX_GENES,
 * because the first 5 genes in PGX_GENES differ from the premium curation.
 * Pro tier gets all genes.
 */
function getGenesForTier(tier: Tier): string[] {
  const limit = TIER_GATING[tier].pgxGeneLimit;
  if (limit === 0) {
    return [];
  }
  // Premium tier: use the curated premium gene list (capped by TIER_GATING limit)
  if (tier === 'premium') {
    return PREMIUM_PGX_GENES.slice(0, limit);
  }
  // Pro tier: use full gene list (capped by TIER_GATING limit)
  return PGX_GENES.slice(0, limit);
}

/**
 * Return the pharmacogenomics disclaimer text.
 *
 * Includes:
 * - General array limitation disclaimer (applicable to all pharmacogenes)
 * - DTC-specific limitations for structural variant detection
 * - CYP2D6-specific warnings about deletions and duplications
 * - Clinical guidance recommending professional testing
 *
 * This function returns a single comprehensive disclaimer that should be
 * displayed at the top of any PGx report. For gene-specific warnings,
 * use {@link getGeneSpecificWarning} in addition to this disclaimer.
 *
 * Ported from Source/pharmacogenomics.py `get_pgx_disclaimer()`.
 *
 * @returns Full disclaimer string including general array limitations
 *
 * @example
 * const disclaimer = getPgxDisclaimer();
 * // "IMPORTANT LIMITATIONS: ... Array-based genotyping cannot detect..."
 */
export function getPgxDisclaimer(): string {
  return (
    'IMPORTANT LIMITATIONS: This pharmacogenomics analysis is for educational ' +
    'purposes only and is NOT a clinical pharmacogenomic test. ' +
    ARRAY_LIMITATION_DISCLAIMER + ' ' +
    'Direct-to-consumer (DTC) genotyping arrays cannot detect gene deletions, ' +
    'duplications, or structural rearrangements. This is especially significant ' +
    'for CYP2D6, where gene deletions (*5, ~5-10% of Europeans) and duplications ' +
    '(*1xN, *2xN) are common and clinically important. A CYP2D6 deletion carrier ' +
    'would be incorrectly classified as a normal metabolizer by this analysis. ' +
    'Similarly, CYP2D6 gene duplications (ultra-rapid metabolizer phenotype) cannot ' +
    'be detected from SNP data alone. Always consult a healthcare provider or ' +
    'clinical pharmacogenomics laboratory for medication decisions. Do not change ' +
    'any medication without consulting your prescribing physician.'
  );
}
