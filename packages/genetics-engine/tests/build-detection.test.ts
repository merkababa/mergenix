/**
 * Tests for the Genome Build Detection module.
 *
 * Tests cover:
 * - Header-based detection (VCF ##reference=, ##contig=, ##assembly=, 23andMe build comments)
 * - Sentinel SNP-based detection (GRCh37, GRCh38, ambiguous, empty)
 * - Main detectGenomeBuild function (header priority, sentinel fallback, default)
 * - Edge cases (empty headers, no sentinel matches, mixed headers)
 */

import { describe, it, expect } from 'vitest';
import {
  detectBuildFromHeaders,
  detectBuildFromSentinels,
  detectGenomeBuild,
  SENTINEL_SNPS,
} from '../src/build-detection';
import type { BuildDetectionResult } from '../src/build-detection';

// ─── detectBuildFromHeaders ─────────────────────────────────────────────────

describe('detectBuildFromHeaders', () => {
  describe('VCF ##reference= line', () => {
    it('should detect GRCh37 from ##reference=GRCh37', () => {
      const result = detectBuildFromHeaders(['##reference=GRCh37']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh37');
      expect(result!.confidence).toBe(1.0);
      expect(result!.method).toBe('header');
    });

    it('should detect GRCh37 from ##reference=hg19', () => {
      const result = detectBuildFromHeaders(['##reference=hg19']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh37');
      expect(result!.confidence).toBe(1.0);
      expect(result!.method).toBe('header');
    });

    it('should detect GRCh37 from ##reference=b37', () => {
      const result = detectBuildFromHeaders(['##reference=b37']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh37');
      expect(result!.confidence).toBe(1.0);
    });

    it('should detect GRCh38 from ##reference=GRCh38', () => {
      const result = detectBuildFromHeaders(['##reference=GRCh38']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh38');
      expect(result!.confidence).toBe(1.0);
      expect(result!.method).toBe('header');
    });

    it('should detect GRCh38 from ##reference=hg38', () => {
      const result = detectBuildFromHeaders(['##reference=hg38']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh38');
      expect(result!.confidence).toBe(1.0);
    });

    it('should be case-insensitive for ##reference= value', () => {
      const result = detectBuildFromHeaders(['##reference=GRCH38']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh38');
    });

    it('should detect from ##reference = with space before equals', () => {
      const result = detectBuildFromHeaders(['##reference =GRCh37']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh37');
    });

    it('should detect from a reference line with a full path containing GRCh38', () => {
      const result = detectBuildFromHeaders(['##reference=file:///path/to/GRCh38/reference.fa']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh38');
    });
  });

  describe('VCF ##contig= line with chr1 length', () => {
    it('should detect GRCh37 from chr1 length 249250621', () => {
      const result = detectBuildFromHeaders(['##contig=<ID=1,length=249250621>']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh37');
      expect(result!.confidence).toBe(0.95);
      expect(result!.method).toBe('header');
    });

    it('should detect GRCh38 from chr1 length 248956422', () => {
      const result = detectBuildFromHeaders(['##contig=<ID=chr1,length=248956422>']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh38');
      expect(result!.confidence).toBe(0.95);
      expect(result!.method).toBe('header');
    });

    it('should not match contig lines for non-chr1 chromosomes', () => {
      const result = detectBuildFromHeaders(['##contig=<ID=2,length=249250621>']);

      // ID=2 does not match ID=1 or ID=chr1, so no detection
      expect(result).toBeNull();
    });

    it('should not match contig lines with unknown chr1 length', () => {
      const result = detectBuildFromHeaders(['##contig=<ID=1,length=999999999>']);

      expect(result).toBeNull();
    });
  });

  describe('23andMe build comments', () => {
    it('should detect GRCh37 from "# build 37"', () => {
      const result = detectBuildFromHeaders(['# build 37']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh37');
      expect(result!.confidence).toBe(1.0);
      expect(result!.method).toBe('header');
    });

    it('should detect GRCh38 from "# build 38"', () => {
      const result = detectBuildFromHeaders(['# build 38']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh38');
      expect(result!.confidence).toBe(1.0);
      expect(result!.method).toBe('header');
    });

    it('should detect from longer 23andMe comment containing build number', () => {
      const result = detectBuildFromHeaders(['# This data was generated using build 37 positions']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh37');
      expect(result!.confidence).toBe(1.0);
    });

    it('should detect build 36 as GRCh37 with lower confidence', () => {
      const result = detectBuildFromHeaders(['# build 36']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh37');
      expect(result!.confidence).toBe(0.8);
    });
  });

  describe('VCF ##assembly= line', () => {
    it('should detect GRCh37 from ##assembly=GRCh37', () => {
      const result = detectBuildFromHeaders(['##assembly=GRCh37']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh37');
      expect(result!.confidence).toBe(1.0);
    });

    it('should detect GRCh38 from ##assembly=hg38', () => {
      const result = detectBuildFromHeaders(['##assembly=hg38']);

      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh38');
      expect(result!.confidence).toBe(1.0);
    });
  });

  describe('no header clues', () => {
    it('should return null when no build info in headers', () => {
      const result = detectBuildFromHeaders([
        '##fileformat=VCFv4.1',
        '##source=SomeSource',
        '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO',
      ]);

      expect(result).toBeNull();
    });

    it('should return null for empty headers array', () => {
      const result = detectBuildFromHeaders([]);

      expect(result).toBeNull();
    });

    it('should return null when header lines have no recognizable patterns', () => {
      const result = detectBuildFromHeaders([
        '# rsid\tchromosome\tposition\tallele1\tallele2',
        '# some other comment',
      ]);

      expect(result).toBeNull();
    });
  });

  describe('priority (first match wins)', () => {
    it('should return the first matching header line', () => {
      const result = detectBuildFromHeaders(['##reference=GRCh38', '# build 37']);

      // ##reference= is checked first in the loop iteration,
      // so GRCh38 should win
      expect(result).not.toBeNull();
      expect(result!.build).toBe('GRCh38');
    });
  });
});

// ─── detectBuildFromSentinels ───────────────────────────────────────────────

describe('detectBuildFromSentinels', () => {
  describe('GRCh37 detection', () => {
    it('should detect GRCh37 when sentinel SNP positions match GRCh37', () => {
      // Use the actual sentinel SNPs with their GRCh37 positions
      const positions = new Map<string, { chromosome: string; position: number }>();
      for (const sentinel of SENTINEL_SNPS) {
        positions.set(sentinel.rsid, {
          chromosome: sentinel.chromosome,
          position: sentinel.grch37Position,
        });
      }

      const result = detectBuildFromSentinels(positions);

      expect(result.build).toBe('GRCh37');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.method).toBe('sentinel');
      expect(result.sentinelMatches).toBeDefined();
      expect(result.sentinelMatches!.grch37).toBe(SENTINEL_SNPS.length);
      expect(result.sentinelMatches!.grch38).toBe(0);
      expect(result.sentinelMatches!.total).toBe(SENTINEL_SNPS.length);
    });

    it('should detect GRCh37 with chr prefix in chromosome names', () => {
      const positions = new Map<string, { chromosome: string; position: number }>();
      for (const sentinel of SENTINEL_SNPS) {
        positions.set(sentinel.rsid, {
          chromosome: 'chr' + sentinel.chromosome,
          position: sentinel.grch37Position,
        });
      }

      const result = detectBuildFromSentinels(positions);

      expect(result.build).toBe('GRCh37');
      expect(result.sentinelMatches!.grch37).toBe(SENTINEL_SNPS.length);
    });
  });

  describe('GRCh38 detection', () => {
    it('should detect GRCh38 when sentinel SNP positions match GRCh38', () => {
      const positions = new Map<string, { chromosome: string; position: number }>();
      for (const sentinel of SENTINEL_SNPS) {
        positions.set(sentinel.rsid, {
          chromosome: sentinel.chromosome,
          position: sentinel.grch38Position,
        });
      }

      const result = detectBuildFromSentinels(positions);

      expect(result.build).toBe('GRCh38');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.method).toBe('sentinel');
      expect(result.sentinelMatches!.grch38).toBe(SENTINEL_SNPS.length);
      expect(result.sentinelMatches!.grch37).toBe(0);
    });
  });

  describe('ambiguous data', () => {
    it('should return unknown when positions do not match either build', () => {
      const positions = new Map<string, { chromosome: string; position: number }>();
      for (const sentinel of SENTINEL_SNPS) {
        positions.set(sentinel.rsid, {
          chromosome: sentinel.chromosome,
          position: 99999999, // bogus position
        });
      }

      const result = detectBuildFromSentinels(positions);

      expect(result.build).toBe('unknown');
      expect(result.method).toBe('sentinel');
      expect(result.sentinelMatches!.grch37).toBe(0);
      expect(result.sentinelMatches!.grch38).toBe(0);
      expect(result.sentinelMatches!.total).toBe(SENTINEL_SNPS.length);
    });

    it('should return unknown when mix of builds does not reach threshold', () => {
      const positions = new Map<string, { chromosome: string; position: number }>();
      // Half GRCh37, half GRCh38
      SENTINEL_SNPS.forEach((sentinel, i) => {
        positions.set(sentinel.rsid, {
          chromosome: sentinel.chromosome,
          position: i % 2 === 0 ? sentinel.grch37Position : sentinel.grch38Position,
        });
      });

      const result = detectBuildFromSentinels(positions);

      expect(result.build).toBe('unknown');
      expect(result.method).toBe('sentinel');
      expect(result.sentinelMatches).toBeDefined();
    });
  });

  describe('empty map', () => {
    it('should return unknown with zero confidence for empty position map', () => {
      const positions = new Map<string, { chromosome: string; position: number }>();

      const result = detectBuildFromSentinels(positions);

      expect(result.build).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.method).toBe('sentinel');
      expect(result.sentinelMatches!.grch37).toBe(0);
      expect(result.sentinelMatches!.grch38).toBe(0);
      expect(result.sentinelMatches!.total).toBe(0);
    });
  });

  describe('partial sentinel data', () => {
    it('should detect GRCh37 even with only a subset of sentinels present', () => {
      // Use only the first 5 sentinels (still > 90% threshold since all match)
      const positions = new Map<string, { chromosome: string; position: number }>();
      const subset = SENTINEL_SNPS.slice(0, 5);
      for (const sentinel of subset) {
        positions.set(sentinel.rsid, {
          chromosome: sentinel.chromosome,
          position: sentinel.grch37Position,
        });
      }

      const result = detectBuildFromSentinels(positions);

      expect(result.build).toBe('GRCh37');
      expect(result.sentinelMatches!.total).toBe(5);
    });

    it('should ignore sentinel SNPs with mismatched chromosome', () => {
      // rs1801133 is chr1, but set it to chr2 => should be skipped
      const positions = new Map<string, { chromosome: string; position: number }>();
      positions.set('rs1801133', {
        chromosome: '2',
        position: SENTINEL_SNPS[0]!.grch37Position,
      });

      const result = detectBuildFromSentinels(positions);

      // Should have 0 total checked because chromosome didn't match
      expect(result.sentinelMatches!.total).toBe(0);
      expect(result.build).toBe('unknown');
    });

    it('should handle non-sentinel rsIDs in the map (ignored)', () => {
      const positions = new Map<string, { chromosome: string; position: number }>();
      positions.set('rs9999999', { chromosome: '1', position: 12345 });
      positions.set('rs8888888', { chromosome: '2', position: 67890 });

      const result = detectBuildFromSentinels(positions);

      expect(result.sentinelMatches!.total).toBe(0);
      expect(result.build).toBe('unknown');
    });
  });
});

// ─── detectGenomeBuild ──────────────────────────────────────────────────────

describe('detectGenomeBuild', () => {
  describe('header takes priority over sentinels', () => {
    it('should use header detection when available, ignoring sentinels', () => {
      const headerLines = ['##reference=GRCh38'];

      // Provide sentinel positions that point to GRCh37
      const snpPositions = new Map<string, { chromosome: string; position: number }>();
      for (const sentinel of SENTINEL_SNPS) {
        snpPositions.set(sentinel.rsid, {
          chromosome: sentinel.chromosome,
          position: sentinel.grch37Position,
        });
      }

      const result = detectGenomeBuild(headerLines, snpPositions);

      // Header says GRCh38, sentinels say GRCh37 => header wins
      expect(result.build).toBe('GRCh38');
      expect(result.method).toBe('header');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('falls back to sentinels when no header clues', () => {
    it('should use sentinel detection when headers provide no build info', () => {
      const headerLines = ['##fileformat=VCFv4.1', '##source=SomeSource'];

      const snpPositions = new Map<string, { chromosome: string; position: number }>();
      for (const sentinel of SENTINEL_SNPS) {
        snpPositions.set(sentinel.rsid, {
          chromosome: sentinel.chromosome,
          position: sentinel.grch38Position,
        });
      }

      const result = detectGenomeBuild(headerLines, snpPositions);

      expect(result.build).toBe('GRCh38');
      expect(result.method).toBe('sentinel');
    });
  });

  describe('defaults to GRCh37 with low confidence', () => {
    it('should default to GRCh37 when no headers and no sentinel matches', () => {
      const result = detectGenomeBuild([], new Map());

      expect(result.build).toBe('GRCh37');
      expect(result.confidence).toBe(0.5);
      expect(result.method).toBe('default');
    });

    it('should default to GRCh37 when headers are empty and no sentinels in map', () => {
      const snpPositions = new Map<string, { chromosome: string; position: number }>();
      snpPositions.set('rs9999999', { chromosome: '1', position: 12345 });

      const result = detectGenomeBuild([], snpPositions);

      expect(result.build).toBe('GRCh37');
      expect(result.confidence).toBe(0.5);
      expect(result.method).toBe('default');
    });
  });

  describe('returns sentinel result when sentinels checked but inconclusive', () => {
    it('should return sentinel result with match counts when ambiguous', () => {
      const headerLines: string[] = [];
      const snpPositions = new Map<string, { chromosome: string; position: number }>();

      // Provide sentinels with bogus positions => 0 matches on both builds
      for (const sentinel of SENTINEL_SNPS) {
        snpPositions.set(sentinel.rsid, {
          chromosome: sentinel.chromosome,
          position: 99999999,
        });
      }

      const result = detectGenomeBuild(headerLines, snpPositions);

      // Sentinels were checked but inconclusive => sentinel result returned
      expect(result.method).toBe('sentinel');
      expect(result.build).toBe('unknown');
      expect(result.sentinelMatches).toBeDefined();
      expect(result.sentinelMatches!.total).toBe(SENTINEL_SNPS.length);
    });
  });

  describe('result structure', () => {
    it('should return all required BuildDetectionResult fields', () => {
      const result = detectGenomeBuild(['##reference=GRCh37'], new Map());

      expect(result).toHaveProperty('build');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('method');
      expect(typeof result.build).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.method).toBe('string');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});

// ─── SENTINEL_SNPS Constant ─────────────────────────────────────────────────

describe('SENTINEL_SNPS', () => {
  it('should contain at least 20 sentinel SNPs', () => {
    expect(SENTINEL_SNPS.length).toBeGreaterThanOrEqual(20);
  });

  it('should have valid rsid format for all entries', () => {
    for (const sentinel of SENTINEL_SNPS) {
      expect(sentinel.rsid.startsWith('rs')).toBe(true);
    }
  });

  it('should have unique rsids', () => {
    const rsids = SENTINEL_SNPS.map((s) => s.rsid);
    const unique = new Set(rsids);
    expect(unique.size).toBe(rsids.length);
  });

  it('should have different GRCh37 and GRCh38 positions for each sentinel', () => {
    for (const sentinel of SENTINEL_SNPS) {
      expect(sentinel.grch37Position).not.toBe(sentinel.grch38Position);
    }
  });

  it('should have positive positions for all builds', () => {
    for (const sentinel of SENTINEL_SNPS) {
      expect(sentinel.grch37Position).toBeGreaterThan(0);
      expect(sentinel.grch38Position).toBeGreaterThan(0);
    }
  });

  it('should cover multiple chromosomes', () => {
    const chromosomes = new Set(SENTINEL_SNPS.map((s) => s.chromosome));
    expect(chromosomes.size).toBeGreaterThanOrEqual(10);
  });
});
