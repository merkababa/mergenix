/**
 * Trait Prediction Engine
 *
 * Implements Mendelian genetics (Punnett square) to predict offspring trait
 * probabilities from two parents' genotypes using SNP data.
 *
 * Supports 79 traits with rich phenotype mappings that include descriptions
 * and probability qualifiers.
 *
 * Ported from Source/trait_prediction.py (366 lines).
 */

import type {
  TraitResult,
  GenotypeMap,
  TraitSnpEntry,
  PhenotypeMapValue,
  Tier,
} from './types';
import { TIER_GATING } from './types';
import { TOP_10_FREE_TRAITS } from '@mergenix/genetics-data';

// ─── Allele Helpers ─────────────────────────────────────────────────────────

/**
 * Split a genotype string into two alleles.
 *
 * Ported from Source/trait_prediction.py `get_parent_alleles()`.
 *
 * @param genotype - Two-character genotype string (e.g., "AG", "AA", "GG")
 * @returns Tuple of two allele strings
 * @throws Error if genotype is not exactly 2 characters
 */
export function getParentAlleles(genotype: string): [string, string] {
  if (genotype.length !== 2) {
    throw new Error(`Invalid genotype format: ${genotype}`);
  }
  return [genotype[0]!, genotype[1]!];
}

/**
 * Normalize a genotype to alphabetical order for consistent lookup.
 *
 * Example: "GA" -> "AG", "TC" -> "CT"
 *
 * Ported from Source/trait_prediction.py `normalize_genotype()`.
 *
 * @param genotype - Two-character genotype string
 * @returns Normalized genotype with alleles in alphabetical order
 */
export function normalizeGenotype(genotype: string): string {
  return genotype.split('').sort().join('');
}

// ─── Punnett Square ─────────────────────────────────────────────────────────

/**
 * Calculate all possible offspring genotypes and their probabilities
 * using Punnett square logic.
 *
 * Each parent contributes one allele randomly. The 4 possible combinations
 * (2 from parent A x 2 from parent B) each have 25% probability.
 * Equivalent genotypes (e.g., "AG" and "GA") are normalized and merged.
 *
 * Ported from Source/trait_prediction.py `punnett_square()`.
 *
 * @param parentAAlleles - Tuple of two alleles from parent A
 * @param parentBAlleles - Tuple of two alleles from parent B
 * @returns Record mapping normalized genotypes to probabilities (0-1 scale)
 *
 * @example
 * punnettSquare(["A", "G"], ["A", "G"])
 * // Returns: { "AA": 0.25, "AG": 0.5, "GG": 0.25 }
 */
export function punnettSquare(
  parentAAlleles: [string, string],
  parentBAlleles: [string, string],
): Record<string, number> {
  const outcomes: Record<string, number> = {};

  // Each parent contributes one allele randomly
  // Generate all 4 possible combinations (2 x 2)
  for (const alleleA of parentAAlleles) {
    for (const alleleB of parentBAlleles) {
      // Normalize genotype: always put alleles in alphabetical order
      // This ensures "AG" and "GA" are treated as equivalent
      const genotype = [alleleA, alleleB].sort().join('');
      outcomes[genotype] = (outcomes[genotype] ?? 0) + 0.25;
    }
  }

  return outcomes;
}

/**
 * Predict offspring genotype probabilities from parent genotypes.
 *
 * Convenience wrapper around getParentAlleles() + punnettSquare().
 *
 * Ported from Source/trait_prediction.py `predict_offspring_genotypes()`.
 *
 * @param parentAGenotype - Parent A's genotype (e.g., "AG")
 * @param parentBGenotype - Parent B's genotype (e.g., "GG")
 * @returns Record mapping genotypes to probabilities
 */
export function predictOffspringGenotypes(
  parentAGenotype: string,
  parentBGenotype: string,
): Record<string, number> {
  const parentAAlleles = getParentAlleles(parentAGenotype);
  const parentBAlleles = getParentAlleles(parentBGenotype);
  return punnettSquare(parentAAlleles, parentBAlleles);
}

// ─── Phenotype Mapping ──────────────────────────────────────────────────────

/**
 * Look up the phenotype for a given genotype using the phenotype map.
 *
 * Handles both the string and rich dict format of phenotype_map values:
 * - Legacy string: { "GG": "Brown Eyes" }
 * - Rich dict: { "GG": { "phenotype": "Brown Eyes", "description": "...", ... } }
 *
 * Tries both the original and normalized genotype for lookup.
 *
 * Ported from Source/trait_prediction.py `map_genotype_to_phenotype()`.
 *
 * @param genotype - Offspring genotype (e.g., "AG")
 * @param phenotypeMap - Mapping of genotypes to phenotype values
 * @returns Phenotype string, or null if not found in map
 */
export function mapGenotypeToPhenotype(
  genotype: string,
  phenotypeMap: Record<string, string | PhenotypeMapValue>,
): string | null {
  const normalized = normalizeGenotype(genotype);

  // Try original genotype first, then normalized form
  const value = phenotypeMap[genotype] ?? phenotypeMap[normalized];

  if (value === undefined) {
    return null;
  }

  // Handle both string format (legacy) and rich dict format
  if (typeof value === 'string') {
    return value;
  }

  return value.phenotype;
}

// ─── Trait Prediction ───────────────────────────────────────────────────────

/**
 * Predict offspring phenotype probabilities for a single trait.
 *
 * For each possible offspring genotype from the Punnett square, maps to a
 * phenotype using the trait's phenotype_map and aggregates probabilities
 * for identical phenotypes.
 *
 * Returns status-tagged results:
 * - "success": Both parents have the SNP and predictions are available
 * - "missing": One or both parents missing the SNP
 * - "error": Genotypes could not be mapped to phenotypes
 *
 * Ported from Source/trait_prediction.py `predict_trait()`.
 *
 * @param parentASnps - Parent A's genotype map (rsid -> genotype)
 * @param parentBSnps - Parent B's genotype map (rsid -> genotype)
 * @param traitEntry - Single trait entry from the trait SNP database
 * @returns TraitResult with prediction data, or a status-only result if
 *   prediction is not possible
 */
export function predictTrait(
  parentASnps: GenotypeMap,
  parentBSnps: GenotypeMap,
  traitEntry: TraitSnpEntry,
): TraitResult {
  const { rsid } = traitEntry;

  // Shared base fields for all result statuses
  const baseFields = {
    trait: traitEntry.trait,
    gene: traitEntry.gene,
    rsid,
    chromosome: traitEntry.chromosome ?? 'Unknown',
    description: traitEntry.description ?? '',
    confidence: traitEntry.confidence ?? 'low',
    inheritance: (traitEntry.inheritance ?? 'codominant') as TraitResult['inheritance'],
  };

  // Check if both parents have this SNP
  const parentAGenotype = parentASnps[rsid];
  if (parentAGenotype === undefined) {
    return {
      ...baseFields,
      status: 'missing',
      parentAGenotype: '',
      parentBGenotype: '',
      offspringProbabilities: {},
      note: 'Parent A missing this SNP',
    };
  }

  const parentBGenotype = parentBSnps[rsid];
  if (parentBGenotype === undefined) {
    return {
      ...baseFields,
      status: 'missing',
      parentAGenotype,
      parentBGenotype: '',
      offspringProbabilities: {},
      note: 'Parent B missing this SNP',
    };
  }

  // Calculate offspring genotype probabilities
  const offspringGenotypes = predictOffspringGenotypes(parentAGenotype, parentBGenotype);

  // Map genotypes to phenotypes and aggregate probabilities
  const phenotypeProbs: Record<string, number> = {};
  const unmappedGenotypes: string[] = [];

  for (const [genotype, prob] of Object.entries(offspringGenotypes)) {
    const phenotype = mapGenotypeToPhenotype(genotype, traitEntry.phenotype_map);

    if (phenotype === null) {
      unmappedGenotypes.push(genotype);
      continue;
    }

    phenotypeProbs[phenotype] = (phenotypeProbs[phenotype] ?? 0) + prob;
  }

  // If no genotypes could be mapped, return error
  if (Object.keys(phenotypeProbs).length === 0) {
    return {
      ...baseFields,
      status: 'error',
      parentAGenotype,
      parentBGenotype,
      offspringProbabilities: {},
      note: 'Unable to predict this trait from your genotype data. This may be due to an uncommon genetic variant.',
    };
  }

  // Convert probabilities to percentages (multiply by 100, round to 1 decimal)
  const offspringProbabilities: Record<string, number> = {};
  for (const [phenotype, prob] of Object.entries(phenotypeProbs)) {
    offspringProbabilities[phenotype] = Math.round(prob * 1000) / 10;
  }

  // Build phenotypeDetails from rich dict entries in phenotype_map
  const phenotypeDetails: Record<string, { description: string; probability: string }> = {};
  for (const mapValue of Object.values(traitEntry.phenotype_map)) {
    // phenotype_map values are always PhenotypeMapValue in the typed schema,
    // but we guard for string format (legacy) for safety
    if (typeof mapValue === 'object' && mapValue !== null) {
      const phenoName = mapValue.phenotype;
      if (!(phenoName in phenotypeDetails)) {
        phenotypeDetails[phenoName] = {
          description: mapValue.description,
          probability: mapValue.probability,
        };
      }
    }
  }

  const result: TraitResult = {
    ...baseFields,
    status: 'success',
    parentAGenotype,
    parentBGenotype,
    offspringProbabilities,
  };

  // Include phenotypeDetails if rich format data is available
  if (Object.keys(phenotypeDetails).length > 0) {
    result.phenotypeDetails = phenotypeDetails;
  }

  // Add note if some genotypes were unmapped
  if (unmappedGenotypes.length > 0) {
    result.note = 'Some genetic variants could not be mapped to known phenotypes. Results may be partial.';
  }

  return result;
}

/**
 * Predict offspring phenotype probabilities for all traits in the database.
 *
 * Iterates through all trait entries and calls predictTrait() for each.
 * Free tier is limited to the TOP_10_FREE_TRAITS curated list.
 *
 * Ported from Source/trait_prediction.py `analyze_traits()`.
 *
 * @param parentASnps - Parent A's genotype map
 * @param parentBSnps - Parent B's genotype map
 * @param traitDatabase - Full trait SNP database
 * @param tier - Subscription tier (default: "free")
 * @returns Array of TraitResult objects, one per trait
 */
export function predictAllTraits(
  parentASnps: GenotypeMap,
  parentBSnps: GenotypeMap,
  traitDatabase: TraitSnpEntry[],
  tier: Tier = 'free',
): TraitResult[] {
  // Apply tier gating: free tier uses the curated top-10 list;
  // paid tiers use the centralized TIER_GATING limit.
  const limit = TIER_GATING[tier].traitLimit;
  const traitsToAnalyze = tier === 'free'
    ? traitDatabase.filter(t => TOP_10_FREE_TRAITS.includes(t.trait))
    : traitDatabase.slice(0, limit);

  const results: TraitResult[] = [];

  for (const traitEntry of traitsToAnalyze) {
    const prediction = predictTrait(parentASnps, parentBSnps, traitEntry);
    results.push(prediction);
  }

  return results;
}
