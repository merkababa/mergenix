import { describe, it, expect } from 'vitest';
import { traitSnps, TRAIT_CATEGORIES } from '@mergenix/genetics-data';
import type { TraitSnpEntry } from '@mergenix/genetics-data';

describe('Trait Data Validation', () => {
  // ---- Schema completeness ----
  describe('schema completeness', () => {
    it('should have at least 200 traits', () => {
      expect(traitSnps.length).toBeGreaterThanOrEqual(200);
    });

    it('every trait has all required fields', () => {
      const requiredFields: (keyof TraitSnpEntry)[] = [
        'rsid',
        'trait',
        'gene',
        'chromosome',
        'inheritance',
        'alleles',
        'phenotype_map',
        'description',
        'confidence',
        'sources',
        'notes',
      ];
      for (const trait of traitSnps) {
        for (const field of requiredFields) {
          expect(trait[field], `${trait.rsid} missing ${field}`).toBeDefined();
        }
      }
    });

    it('every trait has a valid category', () => {
      const validCategories = TRAIT_CATEGORIES as readonly string[];
      for (const trait of traitSnps) {
        expect(validCategories, `${trait.rsid} has invalid category: ${trait.category}`).toContain(
          trait.category,
        );
      }
    });
  });

  // ---- rsID validity ----
  describe('rsID validity', () => {
    it('all rsIDs match expected format', () => {
      for (const trait of traitSnps) {
        expect(trait.rsid).toMatch(/^rs\d+$/);
      }
    });

    it('no duplicate rsIDs', () => {
      const rsids = traitSnps.map((t) => t.rsid);
      const unique = new Set(rsids);
      expect(rsids.length).toBe(unique.size);
    });
  });

  // ---- Alleles ----
  describe('alleles', () => {
    it('every trait has ref and alt alleles', () => {
      for (const trait of traitSnps) {
        expect(trait.alleles.ref, `${trait.rsid} missing ref allele`).toBeTruthy();
        expect(trait.alleles.alt, `${trait.rsid} missing alt allele`).toBeTruthy();
      }
    });

    it('alleles are valid nucleotide characters', () => {
      const validBases = /^[ACGT]+$/i;
      for (const trait of traitSnps) {
        expect(trait.alleles.ref, `${trait.rsid} ref`).toMatch(validBases);
        expect(trait.alleles.alt, `${trait.rsid} alt`).toMatch(validBases);
      }
    });

    it('ref and alt alleles are different', () => {
      for (const trait of traitSnps) {
        expect(trait.alleles.ref, `${trait.rsid}`).not.toBe(trait.alleles.alt);
      }
    });
  });

  // ---- Phenotype map ----
  describe('phenotype_map', () => {
    it('every trait has exactly 3 phenotype entries', () => {
      for (const trait of traitSnps) {
        const entries = Object.keys(trait.phenotype_map);
        expect(entries.length, `${trait.rsid} has ${entries.length} phenotypes`).toBe(3);
      }
    });

    it('phenotype map keys are valid genotypes using trait alleles', () => {
      for (const trait of traitSnps) {
        const { ref, alt } = trait.alleles;
        // Normalize expected genotypes by sorting allele pairs (handles both AG and GA)
        const expectedGenotypes = new Set([
          [ref, ref].sort().join(''),
          [ref, alt].sort().join(''),
          [alt, alt].sort().join(''),
        ]);
        // Normalize actual keys the same way
        const actualGenotypes = new Set(
          Object.keys(trait.phenotype_map).map((k) => k.split('').sort().join('')),
        );
        expect(actualGenotypes, `${trait.rsid} genotypes mismatch`).toEqual(expectedGenotypes);
      }
    });

    it('every phenotype entry has required fields', () => {
      for (const trait of traitSnps) {
        for (const [genotype, entry] of Object.entries(trait.phenotype_map)) {
          expect(entry.phenotype, `${trait.rsid}/${genotype} missing phenotype`).toBeTruthy();
          expect(entry.description, `${trait.rsid}/${genotype} missing description`).toBeTruthy();
          expect(
            ['high', 'medium', 'low'],
            `${trait.rsid}/${genotype} invalid probability`,
          ).toContain(entry.probability);
        }
      }
    });
  });

  // ---- Inheritance ----
  describe('inheritance', () => {
    it('every trait has valid inheritance pattern', () => {
      const validPatterns = ['codominant', 'additive', 'dominant', 'recessive'];
      for (const trait of traitSnps) {
        expect(validPatterns, `${trait.rsid}: ${trait.inheritance}`).toContain(trait.inheritance);
      }
    });
  });

  // ---- Confidence ----
  describe('confidence', () => {
    it('every trait has valid confidence level', () => {
      const validLevels = ['high', 'medium', 'low'];
      for (const trait of traitSnps) {
        expect(validLevels, `${trait.rsid}: ${trait.confidence}`).toContain(trait.confidence);
      }
    });
  });

  // ---- Sources ----
  describe('sources', () => {
    it('every trait has at least one source', () => {
      for (const trait of traitSnps) {
        expect(trait.sources.length, `${trait.rsid} has no sources`).toBeGreaterThanOrEqual(1);
      }
    });

    it('every source has a name and url', () => {
      for (const trait of traitSnps) {
        for (const source of trait.sources) {
          expect(source.name, `${trait.rsid} source missing name`).toBeTruthy();
          expect(source.url, `${trait.rsid} source missing url`).toBeTruthy();
        }
      }
    });
  });

  // ---- Chromosome ----
  describe('chromosome', () => {
    it('every trait has valid chromosome', () => {
      const validChromosomes = Array.from({ length: 22 }, (_, i) => String(i + 1)).concat([
        'X',
        'Y',
        'MT',
      ]);
      for (const trait of traitSnps) {
        expect(validChromosomes, `${trait.rsid}: chr ${trait.chromosome}`).toContain(
          trait.chromosome,
        );
      }
    });
  });

  // ---- Category coverage ----
  describe('category coverage', () => {
    it('traits span at least 10 different categories', () => {
      const categories = new Set(traitSnps.map((t) => t.category));
      expect(categories.size).toBeGreaterThanOrEqual(10);
    });
  });
});
