import { describe, it, expect } from 'vitest';
import { traitSnps, chipCoverage } from '@mergenix/genetics-data';

describe('Chip Coverage Data', () => {
  describe('structure', () => {
    it('has valid metadata with 7 chips', () => {
      expect(chipCoverage.metadata.chips).toHaveLength(7);
    });

    it('every chip has required fields', () => {
      for (const chip of chipCoverage.metadata.chips) {
        expect(chip.provider).toBeTruthy();
        expect(chip.version).toBeTruthy();
        expect(chip.totalSnps).toBeGreaterThan(0);
        expect(chip.genomeBuild).toBeTruthy();
        expect(chip.releaseYear).toBeGreaterThanOrEqual(2010);
      }
    });
  });

  describe('coverage completeness', () => {
    it('every trait rsID has a coverage entry', () => {
      for (const trait of traitSnps) {
        expect(chipCoverage.coverage[trait.rsid], `Missing coverage for ${trait.rsid}`).toBeDefined();
      }
    });

    it('coverage count matches trait count', () => {
      expect(Object.keys(chipCoverage.coverage).length).toBe(traitSnps.length);
    });

    it('no orphan coverage entries (coverage without matching trait)', () => {
      const traitRsids = new Set(traitSnps.map(t => t.rsid));
      for (const rsid of Object.keys(chipCoverage.coverage)) {
        expect(traitRsids.has(rsid), `Orphan coverage entry: ${rsid}`).toBe(true);
      }
    });
  });

  describe('coverage values', () => {
    it('every coverage entry is a non-empty array', () => {
      for (const [rsid, chips] of Object.entries(chipCoverage.coverage)) {
        expect(Array.isArray(chips), `${rsid} coverage is not array`).toBe(true);
        expect(chips.length, `${rsid} has empty coverage`).toBeGreaterThan(0);
      }
    });

    it('all chip indices are valid (0-6)', () => {
      for (const [rsid, chips] of Object.entries(chipCoverage.coverage)) {
        for (const idx of chips) {
          expect(idx, `${rsid} has invalid chip index ${idx}`).toBeGreaterThanOrEqual(0);
          expect(idx, `${rsid} has invalid chip index ${idx}`).toBeLessThanOrEqual(6);
        }
      }
    });

    it('chip indices are sorted and unique within each entry', () => {
      for (const [rsid, chips] of Object.entries(chipCoverage.coverage)) {
        const sorted = [...chips].sort((a, b) => a - b);
        expect(chips, `${rsid} indices not sorted`).toEqual(sorted);
        const unique = [...new Set(chips)];
        expect(chips.length, `${rsid} has duplicate indices`).toBe(unique.length);
      }
    });
  });
});
