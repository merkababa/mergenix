/**
 * Tests for the trait prediction engine.
 *
 * Tests cover Punnett square calculation, genotype normalization,
 * phenotype mapping, and the full trait prediction pipeline.
 */

import { describe, it, expect } from 'vitest';
import {
  getParentAlleles,
  punnettSquare,
  normalizeGenotype,
  mapGenotypeToPhenotype,
  predictTrait,
  predictAllTraits,
} from '../src/traits';
import type { TraitSnpEntry, PhenotypeMapValue } from '../src/types';
// TOP_10_FREE_TRAITS import removed — free tier now has traitLimit: Infinity (all 236+ traits)
// and the curated list is no longer used for tier filtering.

// ─── Test Fixtures ────────────────────────────────────────────────────────

function makeTraitEntry(overrides: Partial<TraitSnpEntry> = {}): TraitSnpEntry {
  return {
    rsid: 'rs12913832',
    trait: 'Eye Color',
    category: 'Physical Appearance',
    gene: 'HERC2/OCA2',
    chromosome: '15',
    inheritance: 'codominant',
    alleles: { ref: 'G', alt: 'A' },
    phenotype_map: {
      GG: {
        phenotype: 'Brown Eyes',
        description: 'Very high likelihood of brown eyes',
        probability: 'high',
      },
      AG: {
        phenotype: 'Green/Hazel Eyes',
        description: 'Mixed pigmentation',
        probability: 'medium',
      },
      AA: { phenotype: 'Blue Eyes', description: 'Light eye color', probability: 'high' },
    },
    description: 'Primary determinant of eye color',
    confidence: 'high',
    sources: [],
    notes: '',
    ...overrides,
  };
}

// ─── Allele Helpers ─────────────────────────────────────────────────────────

describe('getParentAlleles', () => {
  it('should split a genotype into two alleles', () => {
    expect(getParentAlleles('AG')).toEqual(['A', 'G']);
    expect(getParentAlleles('AA')).toEqual(['A', 'A']);
    expect(getParentAlleles('GG')).toEqual(['G', 'G']);
    expect(getParentAlleles('CT')).toEqual(['C', 'T']);
  });

  it('should throw for invalid genotype length', () => {
    expect(() => getParentAlleles('A')).toThrow('Invalid genotype format');
    expect(() => getParentAlleles('AGG')).toThrow('Invalid genotype format');
    expect(() => getParentAlleles('')).toThrow('Invalid genotype format');
  });
});

describe('normalizeGenotype', () => {
  it('should sort alleles alphabetically', () => {
    expect(normalizeGenotype('GA')).toBe('AG');
    expect(normalizeGenotype('TC')).toBe('CT');
    expect(normalizeGenotype('BA')).toBe('AB');
  });

  it('should not change already-sorted genotypes', () => {
    expect(normalizeGenotype('AG')).toBe('AG');
    expect(normalizeGenotype('AA')).toBe('AA');
    expect(normalizeGenotype('CT')).toBe('CT');
    expect(normalizeGenotype('GG')).toBe('GG');
  });
});

// ─── Punnett Square ─────────────────────────────────────────────────────────

describe('punnettSquare', () => {
  it('should produce correct probabilities for heterozygous x heterozygous (AG x AG)', () => {
    const result = punnettSquare(['A', 'G'], ['A', 'G']);
    expect(result['AA']).toBeCloseTo(0.25);
    expect(result['AG']).toBeCloseTo(0.5);
    expect(result['GG']).toBeCloseTo(0.25);
  });

  it('should produce correct probabilities for homozygous x heterozygous (AA x AG)', () => {
    const result = punnettSquare(['A', 'A'], ['A', 'G']);
    expect(result['AA']).toBeCloseTo(0.5);
    expect(result['AG']).toBeCloseTo(0.5);
    expect(result['GG']).toBeUndefined();
  });

  it('should produce correct probabilities for homozygous x homozygous (AA x AA)', () => {
    const result = punnettSquare(['A', 'A'], ['A', 'A']);
    expect(result['AA']).toBeCloseTo(1.0);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('should produce correct probabilities for homozygous x homozygous different (AA x GG)', () => {
    const result = punnettSquare(['A', 'A'], ['G', 'G']);
    expect(result['AG']).toBeCloseTo(1.0);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('should normalize genotypes (merge GA and AG)', () => {
    // A x G = AG normalized, G x A = AG normalized
    // So AG x AG should merge properly
    const result = punnettSquare(['A', 'G'], ['G', 'A']);
    // Possible combos: AxG=AG, AxA=AA, GxG=GG, GxA=AG
    expect(result['AG']).toBeCloseTo(0.5);
    expect(result['AA']).toBeCloseTo(0.25);
    expect(result['GG']).toBeCloseTo(0.25);
  });

  it('should have probabilities summing to 1.0', () => {
    const result = punnettSquare(['A', 'G'], ['C', 'T']);
    const sum = Object.values(result).reduce((acc, p) => acc + p, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('should produce 4 unique outcomes for all-different alleles', () => {
    const result = punnettSquare(['A', 'G'], ['C', 'T']);
    // AC, AT, CG, GT
    expect(Object.keys(result)).toHaveLength(4);
    for (const prob of Object.values(result)) {
      expect(prob).toBeCloseTo(0.25);
    }
  });
});

// ─── Phenotype Mapping ──────────────────────────────────────────────────────

describe('mapGenotypeToPhenotype', () => {
  it('should map genotype to phenotype using string format', () => {
    const phenoMap: Record<string, string> = {
      GG: 'Brown Eyes',
      AG: 'Green Eyes',
      AA: 'Blue Eyes',
    };
    expect(mapGenotypeToPhenotype('GG', phenoMap)).toBe('Brown Eyes');
    expect(mapGenotypeToPhenotype('AA', phenoMap)).toBe('Blue Eyes');
  });

  it('should map genotype to phenotype using rich dict format', () => {
    const phenoMap: Record<string, PhenotypeMapValue> = {
      GG: { phenotype: 'Brown Eyes', description: 'Very high likelihood', probability: 'high' },
      AG: { phenotype: 'Green Eyes', description: 'Mixed pigmentation', probability: 'medium' },
    };
    expect(mapGenotypeToPhenotype('GG', phenoMap)).toBe('Brown Eyes');
    expect(mapGenotypeToPhenotype('AG', phenoMap)).toBe('Green Eyes');
  });

  it('should try normalized genotype as fallback', () => {
    const phenoMap: Record<string, string> = {
      AG: 'Green Eyes',
    };
    // "GA" normalizes to "AG"
    expect(mapGenotypeToPhenotype('GA', phenoMap)).toBe('Green Eyes');
  });

  it('should return null for unmapped genotypes', () => {
    const phenoMap: Record<string, string> = {
      GG: 'Brown Eyes',
    };
    expect(mapGenotypeToPhenotype('CT', phenoMap)).toBeNull();
    expect(mapGenotypeToPhenotype('XX', phenoMap)).toBeNull();
  });

  it('should prefer original genotype over normalized when both exist', () => {
    // This tests that the original is tried first
    const phenoMap: Record<string, string> = {
      GA: 'Original',
      AG: 'Normalized',
    };
    expect(mapGenotypeToPhenotype('GA', phenoMap)).toBe('Original');
  });
});

// ─── Trait Prediction ───────────────────────────────────────────────────────

describe('predictTrait', () => {
  it('should return "missing" status when parent A lacks the SNP', () => {
    const traitEntry = makeTraitEntry();
    const result = predictTrait({}, { rs12913832: 'GG' }, traitEntry);
    expect(result.status).toBe('missing');
    expect(result.note).toContain('Parent A');
    expect(result.parentAGenotype).toBe('');
  });

  it('should return "missing" status when parent B lacks the SNP', () => {
    const traitEntry = makeTraitEntry();
    const result = predictTrait({ rs12913832: 'GG' }, {}, traitEntry);
    expect(result.status).toBe('missing');
    expect(result.note).toContain('Parent B');
  });

  it('should return "success" with offspring probabilities when both parents have SNP', () => {
    const traitEntry = makeTraitEntry();
    const result = predictTrait({ rs12913832: 'AG' }, { rs12913832: 'AG' }, traitEntry);
    expect(result.status).toBe('success');
    expect(Object.keys(result.offspringProbabilities).length).toBeGreaterThan(0);
    expect(result.parentAGenotype).toBe('AG');
    expect(result.parentBGenotype).toBe('AG');
  });

  it('should aggregate probabilities for identical phenotypes', () => {
    const traitEntry = makeTraitEntry();
    // AG x AG -> AA(25%), AG(50%), GG(25%)
    // AA -> Blue Eyes, AG -> Green/Hazel Eyes, GG -> Brown Eyes
    const result = predictTrait({ rs12913832: 'AG' }, { rs12913832: 'AG' }, traitEntry);
    expect(result.status).toBe('success');
    // Probabilities should be in percentages (multiply by 100, round to 1 decimal)
    // 0.25 -> 25.0, 0.5 -> 50.0, 0.25 -> 25.0
    expect(result.offspringProbabilities['Blue Eyes']).toBeCloseTo(25.0, 0);
    expect(result.offspringProbabilities['Green/Hazel Eyes']).toBeCloseTo(50.0, 0);
    expect(result.offspringProbabilities['Brown Eyes']).toBeCloseTo(25.0, 0);
  });

  it('should include phenotype details from rich format entries', () => {
    const traitEntry = makeTraitEntry();
    const result = predictTrait({ rs12913832: 'GG' }, { rs12913832: 'GG' }, traitEntry);
    expect(result.status).toBe('success');
    expect(result.phenotypeDetails).toBeDefined();
    expect(result.phenotypeDetails!['Brown Eyes']).toBeDefined();
    expect(result.phenotypeDetails!['Brown Eyes']!.description).toContain('brown eyes');
  });

  it('should return "error" when no genotypes can be mapped', () => {
    const traitEntry = makeTraitEntry({
      phenotype_map: {
        CC: { phenotype: 'Trait X', description: 'test', probability: 'high' },
      },
    });
    // Parents with GG genotypes but phenotype_map only has CC
    const result = predictTrait({ rs12913832: 'GG' }, { rs12913832: 'GG' }, traitEntry);
    expect(result.status).toBe('error');
    expect(result.note).toContain('Unable to predict this trait');
  });

  it('should include base fields (trait, gene, rsid, chromosome)', () => {
    const traitEntry = makeTraitEntry();
    const result = predictTrait({ rs12913832: 'GG' }, { rs12913832: 'GG' }, traitEntry);
    expect(result.trait).toBe('Eye Color');
    expect(result.gene).toBe('HERC2/OCA2');
    expect(result.rsid).toBe('rs12913832');
    expect(result.chromosome).toBe('15');
  });

  it('should note when some genotypes are unmapped', () => {
    // phenotype_map only covers AA and GG, not AG
    const traitEntry = makeTraitEntry({
      phenotype_map: {
        AA: { phenotype: 'Blue Eyes', description: 'test', probability: 'high' },
        GG: { phenotype: 'Brown Eyes', description: 'test', probability: 'high' },
      },
    });
    // AG x AG -> AA(25%), AG(50%), GG(25%) -- AG is unmapped
    const result = predictTrait({ rs12913832: 'AG' }, { rs12913832: 'AG' }, traitEntry);
    expect(result.status).toBe('success');
    expect(result.note).toContain('could not be mapped');
  });

  it('should pass category through to result', () => {
    const parentA = { rs12913832: 'AA' };
    const parentB = { rs12913832: 'AG' };
    const entry = makeTraitEntry();
    const result = predictTrait(parentA, parentB, entry);
    expect(result.category).toBe('Physical Appearance');
  });
});

describe('predictAllTraits', () => {
  it('should return one result per trait in the database', () => {
    const traits: TraitSnpEntry[] = [
      makeTraitEntry({ rsid: 'rs1', trait: 'Trait 1' }),
      makeTraitEntry({ rsid: 'rs2', trait: 'Trait 2' }),
      makeTraitEntry({ rsid: 'rs3', trait: 'Trait 3' }),
    ];
    const results = predictAllTraits(
      { rs1: 'AA', rs2: 'AG', rs3: 'GG' },
      { rs1: 'AA', rs2: 'AG', rs3: 'GG' },
      traits,
      'pro',
    );
    expect(results).toHaveLength(3);
    expect(results[0]!.trait).toBe('Trait 1');
    expect(results[1]!.trait).toBe('Trait 2');
    expect(results[2]!.trait).toBe('Trait 3');
  });

  it('should handle missing SNPs with "missing" status', () => {
    const traits: TraitSnpEntry[] = [
      makeTraitEntry({ rsid: 'rs1', trait: 'Trait 1' }),
      makeTraitEntry({ rsid: 'rs999', trait: 'Trait 2' }),
    ];
    const results = predictAllTraits({ rs1: 'AA' }, { rs1: 'AA' }, traits, 'pro');
    expect(results).toHaveLength(2);
    expect(results[0]!.status).toBe('success');
    expect(results[1]!.status).toBe('missing');
  });

  // ── Free-tier trait filtering ──────────────────────────────────────────
  // Free tier traitLimit is Infinity (all 236+ traits). Disease screening is the gating
  // boundary between tiers, not trait predictions.
  // TOP_10_FREE_TRAITS is retained as legacy/reference but is no longer used
  // for tier filtering.

  it('should return all traits for free tier (traitLimit: Infinity)', () => {
    // Free tier now has traitLimit: Infinity — all traits are available
    const traits: TraitSnpEntry[] = [
      makeTraitEntry({ rsid: 'rs1', trait: 'Eye Color' }),
      makeTraitEntry({ rsid: 'rs2', trait: 'Hair Color' }),
      makeTraitEntry({ rsid: 'rs3', trait: 'Earwax Type' }),
      makeTraitEntry({ rsid: 'rs4', trait: 'Dimples' }),
      makeTraitEntry({ rsid: 'rs5', trait: 'Detached Earlobe' }),
    ];
    const snps = { rs1: 'AG', rs2: 'AG', rs3: 'AG', rs4: 'AG', rs5: 'AG' };
    const results = predictAllTraits(snps, snps, traits, 'free');

    // All 5 traits are returned — no curated-list filtering
    expect(results).toHaveLength(5);
    const traitNames = results.map((r) => r.trait);
    expect(traitNames).toContain('Eye Color');
    expect(traitNames).toContain('Hair Color');
    expect(traitNames).toContain('Earwax Type');
    expect(traitNames).toContain('Dimples');
    expect(traitNames).toContain('Detached Earlobe');
  });

  it('should return same trait set for free and premium tiers (no trait gating difference)', () => {
    const traits: TraitSnpEntry[] = [
      makeTraitEntry({ rsid: 'rs1', trait: 'Eye Color' }),
      makeTraitEntry({ rsid: 'rs2', trait: 'Dimples' }),
      makeTraitEntry({ rsid: 'rs3', trait: 'Earwax Type' }),
    ];
    const snps = { rs1: 'AG', rs2: 'AG', rs3: 'AG' };

    const freeResults = predictAllTraits(snps, snps, traits, 'free');
    const premiumResults = predictAllTraits(snps, snps, traits, 'premium');

    // Both tiers return all 3 traits — same traitLimit (Infinity) for both
    expect(freeResults).toHaveLength(3);
    expect(premiumResults).toHaveLength(3);
    expect(freeResults.map((r) => r.trait)).toEqual(premiumResults.map((r) => r.trait));
  });

  it('should default to free tier when no tier parameter is provided', () => {
    const traits: TraitSnpEntry[] = [
      makeTraitEntry({ rsid: 'rs1', trait: 'Eye Color' }),
      makeTraitEntry({ rsid: 'rs4', trait: 'Dimples' }),
    ];
    const snps = { rs1: 'AG', rs4: 'AG' };
    // Call without tier param - should default to 'free' (all traits available)
    const results = predictAllTraits(snps, snps, traits);

    expect(results).toHaveLength(2);
    const traitNames = results.map((r) => r.trait);
    expect(traitNames).toContain('Eye Color');
    expect(traitNames).toContain('Dimples');
  });
});
