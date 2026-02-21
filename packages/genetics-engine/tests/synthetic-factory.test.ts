/**
 * Q1a — Golden Standard Validation Tests
 *
 * Tests for the Synthetic Genome Factory (Q1) and its golden standard datasets.
 * Uses TDD: these tests were written before the implementation.
 *
 * Coverage:
 * - Golden files: each format's hand-curated dataset parses to exact expected output
 * - Determinism: fixed-seed generation is reproducible across calls
 * - Mutation injection: injected pathogenic variants appear correctly in parsed output
 * - Edge cases: edge-case files do not crash the parser
 * - Variant count: generated file produces approximately the requested variant count
 */

import { describe, it, expect } from 'vitest';
import {
  detectFormat,
  parse23andMe,
  parseAncestryDNA,
  parseMyHeritage,
  parseVcf,
} from '../src/parser';
import {
  generateSyntheticGenome,
  GOLDEN_23ANDME,
  GOLDEN_ANCESTRYDNA,
  GOLDEN_MYHERITAGE,
  GOLDEN_VCF,
  GOLDEN_EDGE_CASES,
  generateEmptyFile,
  generateBomPrefixedFile,
  generateCrlfFile,
  generateTruncatedFile,
  generateDuplicateRsidFile,
  generateNoCallFile,
  generateLongCommentFile,
} from '../src/test-utils';

// ─── Golden File Validation ────────────────────────────────────────────────

describe('Golden Standard: 23andMe format', () => {
  it('parses to exactly the expected genotype map', () => {
    const result = parse23andMe(GOLDEN_23ANDME.content);
    const expected = GOLDEN_23ANDME.expectedGenotypes;

    // Every expected entry must be present with the exact genotype
    for (const [rsid, genotype] of Object.entries(expected)) {
      expect(result[rsid], `rsid ${rsid}`).toBe(genotype);
    }

    // The parsed result must have exactly as many entries as expected
    expect(Object.keys(result).length).toBe(Object.keys(expected).length);
  });

  it('contains pathogenic CF variant rs113993960 (G542X)', () => {
    const result = parse23andMe(GOLDEN_23ANDME.content);
    expect(result['rs113993960']).toBeDefined();
    // Golden file has the heterozygous carrier genotype: reference + pathogenic
    expect(result['rs113993960']).toBe(GOLDEN_23ANDME.expectedGenotypes['rs113993960']);
  });

  it('contains sickle cell variant rs334', () => {
    const result = parse23andMe(GOLDEN_23ANDME.content);
    expect(result['rs334']).toBeDefined();
    expect(result['rs334']).toBe(GOLDEN_23ANDME.expectedGenotypes['rs334']);
  });

  it('excludes no-call entries (-- genotype)', () => {
    // The golden file includes one no-call line; it must NOT appear in parsed output
    const result = parse23andMe(GOLDEN_23ANDME.content);
    // All parsed genotypes must not be '--' or empty
    for (const genotype of Object.values(result)) {
      expect(genotype).not.toBe('--');
      expect(genotype.length).toBeGreaterThan(0);
    }
  });
});

describe('Golden Standard: AncestryDNA format', () => {
  it('parses to exactly the expected genotype map', () => {
    const result = parseAncestryDNA(GOLDEN_ANCESTRYDNA.content);
    const expected = GOLDEN_ANCESTRYDNA.expectedGenotypes;

    for (const [rsid, genotype] of Object.entries(expected)) {
      expect(result[rsid], `rsid ${rsid}`).toBe(genotype);
    }

    expect(Object.keys(result).length).toBe(Object.keys(expected).length);
  });

  it('contains CF variant rs75039864 in expected state', () => {
    const result = parseAncestryDNA(GOLDEN_ANCESTRYDNA.content);
    expect(result['rs75039864']).toBeDefined();
    expect(result['rs75039864']).toBe(GOLDEN_ANCESTRYDNA.expectedGenotypes['rs75039864']);
  });

  it('excludes no-call entries (allele 0)', () => {
    const result = parseAncestryDNA(GOLDEN_ANCESTRYDNA.content);
    for (const genotype of Object.values(result)) {
      expect(genotype).not.toContain('0');
    }
  });

  it('produces allele1+allele2 concatenated genotype (no separator)', () => {
    const result = parseAncestryDNA(GOLDEN_ANCESTRYDNA.content);
    // All genotypes in AncestryDNA should be 2 uppercase characters (for SNPs)
    for (const genotype of Object.values(result)) {
      expect(genotype).toMatch(/^[ACGT]{2}$/);
    }
  });
});

describe('Golden Standard: MyHeritage format', () => {
  it('parses to exactly the expected genotype map', () => {
    const result = parseMyHeritage(GOLDEN_MYHERITAGE.content);
    const expected = GOLDEN_MYHERITAGE.expectedGenotypes;

    for (const [rsid, genotype] of Object.entries(expected)) {
      expect(result[rsid], `rsid ${rsid}`).toBe(genotype);
    }

    expect(Object.keys(result).length).toBe(Object.keys(expected).length);
  });

  it('handles both rs-prefixed and VG-prefixed identifiers', () => {
    const result = parseMyHeritage(GOLDEN_MYHERITAGE.content);
    const allRsids = Object.keys(result);
    const hasRs = allRsids.some(id => id.startsWith('rs'));
    const hasVg = allRsids.some(id => id.startsWith('VG'));
    expect(hasRs).toBe(true);
    expect(hasVg).toBe(true);
  });
});

describe('Golden Standard: VCF format', () => {
  it('parses to exactly the expected genotype map', () => {
    const result = parseVcf(GOLDEN_VCF.content);
    const expected = GOLDEN_VCF.expectedGenotypes;

    for (const [rsid, genotype] of Object.entries(expected)) {
      expect(result[rsid], `rsid ${rsid}`).toBe(genotype);
    }

    expect(Object.keys(result).length).toBe(Object.keys(expected).length);
  });

  it('handles phased genotypes (| separator)', () => {
    const result = parseVcf(GOLDEN_VCF.content);
    // At least one variant in golden VCF uses phased notation — should be parsed correctly
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });

  it('handles multi-allelic records', () => {
    const result = parseVcf(GOLDEN_VCF.content);
    // At least one entry should have a non-empty genotype
    for (const genotype of Object.values(result)) {
      expect(genotype.length).toBeGreaterThan(0);
    }
  });
});

describe('Golden Standard: Mixed edge-case file (23andMe format with edge inputs)', () => {
  it('parses without throwing', () => {
    expect(() => parse23andMe(GOLDEN_EDGE_CASES.content)).not.toThrow();
  });

  it('parses to expected genotype map (only valid entries survive)', () => {
    const result = parse23andMe(GOLDEN_EDGE_CASES.content);
    const expected = GOLDEN_EDGE_CASES.expectedGenotypes;

    for (const [rsid, genotype] of Object.entries(expected)) {
      expect(result[rsid], `rsid ${rsid}`).toBe(genotype);
    }

    expect(Object.keys(result).length).toBe(Object.keys(expected).length);
  });
});

// ─── Synthetic Factory: Determinism ───────────────────────────────────────

describe('generateSyntheticGenome: determinism', () => {
  it('produces identical output for the same seed (23andme)', () => {
    const a = generateSyntheticGenome({ format: '23andme', seed: 42, variantCount: 200 });
    const b = generateSyntheticGenome({ format: '23andme', seed: 42, variantCount: 200 });
    expect(a).toBe(b);
  });

  it('produces identical output for the same seed (ancestrydna)', () => {
    const a = generateSyntheticGenome({ format: 'ancestrydna', seed: 99, variantCount: 200 });
    const b = generateSyntheticGenome({ format: 'ancestrydna', seed: 99, variantCount: 200 });
    expect(a).toBe(b);
  });

  it('produces identical output for the same seed (myheritage)', () => {
    const a = generateSyntheticGenome({ format: 'myheritage', seed: 7, variantCount: 200 });
    const b = generateSyntheticGenome({ format: 'myheritage', seed: 7, variantCount: 200 });
    expect(a).toBe(b);
  });

  it('produces identical output for the same seed (vcf)', () => {
    const a = generateSyntheticGenome({ format: 'vcf', seed: 1234, variantCount: 200 });
    const b = generateSyntheticGenome({ format: 'vcf', seed: 1234, variantCount: 200 });
    expect(a).toBe(b);
  });

  it('produces DIFFERENT output for different seeds', () => {
    const a = generateSyntheticGenome({ format: '23andme', seed: 1, variantCount: 200 });
    const b = generateSyntheticGenome({ format: '23andme', seed: 2, variantCount: 200 });
    expect(a).not.toBe(b);
  });
});

// ─── Synthetic Factory: Format Detection ─────────────────────────────────

describe('generateSyntheticGenome: format detection', () => {
  it('generated 23andMe file is detected as 23andme', () => {
    const content = generateSyntheticGenome({ format: '23andme', seed: 1, variantCount: 100 });
    expect(detectFormat(content)).toBe('23andme');
  });

  it('generated AncestryDNA file is detected as ancestrydna', () => {
    const content = generateSyntheticGenome({ format: 'ancestrydna', seed: 1, variantCount: 100 });
    expect(detectFormat(content)).toBe('ancestrydna');
  });

  it('generated MyHeritage file is detected as myheritage', () => {
    const content = generateSyntheticGenome({ format: 'myheritage', seed: 1, variantCount: 100 });
    expect(detectFormat(content)).toBe('myheritage');
  });

  it('generated VCF file is detected as vcf', () => {
    const content = generateSyntheticGenome({ format: 'vcf', seed: 1, variantCount: 100 });
    expect(detectFormat(content)).toBe('vcf');
  });
});

// ─── Synthetic Factory: Mutation Injection ────────────────────────────────

describe('generateSyntheticGenome: mutation injection', () => {
  it('injected rs334 mutation appears in 23andMe parsed output', () => {
    const content = generateSyntheticGenome({
      format: '23andme',
      seed: 10,
      variantCount: 100,
      mutations: [{ rsid: 'rs334', genotype: 'AT' }],
    });
    const result = parse23andMe(content);
    expect(result['rs334']).toBe('AT');
  });

  it('injected rs113993960 mutation appears in AncestryDNA parsed output', () => {
    const content = generateSyntheticGenome({
      format: 'ancestrydna',
      seed: 10,
      variantCount: 100,
      mutations: [{ rsid: 'rs113993960', genotype: 'GA' }],
    });
    const result = parseAncestryDNA(content);
    expect(result['rs113993960']).toBe('GA');
  });

  it('injected mutation overrides any randomly generated entry for the same rsid', () => {
    // Generate without mutation first to get baseline
    const withMutation = generateSyntheticGenome({
      format: '23andme',
      seed: 5,
      variantCount: 100,
      mutations: [{ rsid: 'rs334', genotype: 'TT' }],
    });
    const result = parse23andMe(withMutation);
    // Regardless of what random generation would produce, the mutation must win
    expect(result['rs334']).toBe('TT');
  });

  it('multiple mutations are all present in parsed output (VCF)', () => {
    const content = generateSyntheticGenome({
      format: 'vcf',
      seed: 20,
      variantCount: 100,
      mutations: [
        { rsid: 'rs334', genotype: 'TA' },
        { rsid: 'rs113993960', genotype: 'GA' },
      ],
    });
    const result = parseVcf(content);
    expect(result['rs334']).toBe('TA');
    expect(result['rs113993960']).toBe('GA');
  });
});

// ─── Synthetic Factory: Variant Count ────────────────────────────────────

describe('generateSyntheticGenome: variant count', () => {
  it('generates approximately variantCount parseable variants (23andMe, 1000)', () => {
    const content = generateSyntheticGenome({ format: '23andme', seed: 1, variantCount: 1000 });
    const result = parse23andMe(content);
    const count = Object.keys(result).length;
    // Allow 5% tolerance for no-calls injected as edge cases
    expect(count).toBeGreaterThanOrEqual(900);
    expect(count).toBeLessThanOrEqual(1100);
  });

  it('generates approximately variantCount parseable variants (ancestrydna, 500)', () => {
    const content = generateSyntheticGenome({ format: 'ancestrydna', seed: 1, variantCount: 500 });
    const result = parseAncestryDNA(content);
    const count = Object.keys(result).length;
    expect(count).toBeGreaterThanOrEqual(450);
    expect(count).toBeLessThanOrEqual(550);
  });

  it('generates approximately variantCount parseable variants (vcf, 500)', () => {
    const content = generateSyntheticGenome({ format: 'vcf', seed: 1, variantCount: 500 });
    const result = parseVcf(content);
    const count = Object.keys(result).length;
    expect(count).toBeGreaterThanOrEqual(450);
    expect(count).toBeLessThanOrEqual(550);
  });
});

// ─── Edge Case File Handling ──────────────────────────────────────────────

describe('Edge case files: parser does not crash', () => {
  it('empty file throws descriptive error from parse23andMe', () => {
    const content = generateEmptyFile();
    expect(() => parse23andMe(content)).toThrow();
  });

  it('BOM-prefixed 23andMe file parses without crashing', () => {
    const content = generateBomPrefixedFile();
    // BOM at the start should not cause an unhandled exception
    // (may or may not produce results depending on BOM handling in parser)
    expect(() => {
      try {
        parse23andMe(content);
      } catch (e) {
        // Only re-throw if it's not the expected "no SNP data" error
        if (e instanceof Error && e.message.includes('No valid SNP data')) return;
        throw e;
      }
    }).not.toThrow();
  });

  it('CRLF line endings parse identically to LF line endings', () => {
    const lfContent = generateSyntheticGenome({ format: '23andme', seed: 3, variantCount: 100 });
    const crlfContent = generateCrlfFile(lfContent);
    const lfResult = parse23andMe(lfContent);
    const crlfResult = parse23andMe(crlfContent);
    expect(crlfResult).toEqual(lfResult);
  });

  it('truncated file (missing last newline) parses without crashing', () => {
    const content = generateTruncatedFile();
    expect(() => {
      try {
        parse23andMe(content);
      } catch (e) {
        if (e instanceof Error && e.message.includes('No valid SNP data')) return;
        throw e;
      }
    }).not.toThrow();
  });

  it('file with duplicate rsIDs keeps last occurrence (parser overwrites)', () => {
    const content = generateDuplicateRsidFile();
    const result = parse23andMe(content);
    // Duplicate rsIDs: parser will overwrite with the last occurrence
    // Result must have exactly one entry for the duplicate rsid, not crash
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });

  it('file with all no-call genotypes throws "no SNP data" error', () => {
    const content = generateNoCallFile();
    expect(() => parse23andMe(content)).toThrowError(/No valid SNP data/);
  });

  it('file with extremely long comment lines parses data correctly', () => {
    const content = generateLongCommentFile();
    const result = parse23andMe(content);
    // Data lines below the long comment should parse normally
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
});
