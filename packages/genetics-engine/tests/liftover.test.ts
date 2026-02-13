/**
 * Tests for the Client-Side Liftover module.
 *
 * Tests cover:
 * - LiftoverTable construction, size, has, and get methods
 * - liftOne: GRCh37->GRCh38, GRCh38->GRCh37, not in table, same-build no-op,
 *   unknown build, position mismatch
 * - liftBatch: mixed results, summary statistics
 * - createLiftoverTable factory function
 * - Edge cases: empty table, empty batch
 */

import { describe, it, expect } from 'vitest';
import { LiftoverTable, createLiftoverTable } from '../src/liftover';
import type { LiftoverEntry, LiftoverResult, LiftoverSummary } from '../src/liftover';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const TEST_ENTRIES: LiftoverEntry[] = [
  {
    rsid: 'rs1801133',
    chromosome: '1',
    grch37Position: 11856378,
    grch38Position: 11796321,
  },
  {
    rsid: 'rs7903146',
    chromosome: '10',
    grch37Position: 114758349,
    grch38Position: 112998590,
  },
  {
    rsid: 'rs429358',
    chromosome: '19',
    grch37Position: 45411941,
    grch38Position: 44908684,
  },
  {
    rsid: 'rs334',
    chromosome: '11',
    grch37Position: 5248232,
    grch38Position: 5227002,
  },
  {
    rsid: 'rs4680',
    chromosome: '22',
    grch37Position: 19951271,
    grch38Position: 19963748,
  },
];

// ─── LiftoverTable: Constructor & Basic Methods ─────────────────────────────

describe('LiftoverTable', () => {
  describe('constructor and size', () => {
    it('should create a table with the correct size', () => {
      const table = new LiftoverTable(TEST_ENTRIES);
      expect(table.size).toBe(5);
    });

    it('should create an empty table from empty array', () => {
      const table = new LiftoverTable([]);
      expect(table.size).toBe(0);
    });

    it('should deduplicate entries by rsid (last one wins)', () => {
      const entries: LiftoverEntry[] = [
        { rsid: 'rs123', chromosome: '1', grch37Position: 100, grch38Position: 200 },
        { rsid: 'rs123', chromosome: '1', grch37Position: 300, grch38Position: 400 },
      ];
      const table = new LiftoverTable(entries);
      expect(table.size).toBe(1);
      // Map constructor with duplicate keys: last entry wins
      const entry = table.get('rs123');
      expect(entry).toBeDefined();
      expect(entry!.grch37Position).toBe(300);
    });
  });

  describe('has', () => {
    it('should return true for an rsID in the table', () => {
      const table = new LiftoverTable(TEST_ENTRIES);
      expect(table.has('rs1801133')).toBe(true);
      expect(table.has('rs429358')).toBe(true);
    });

    it('should return false for an rsID not in the table', () => {
      const table = new LiftoverTable(TEST_ENTRIES);
      expect(table.has('rs9999999')).toBe(false);
    });

    it('should return false for empty string', () => {
      const table = new LiftoverTable(TEST_ENTRIES);
      expect(table.has('')).toBe(false);
    });

    it('should return false on empty table', () => {
      const table = new LiftoverTable([]);
      expect(table.has('rs1801133')).toBe(false);
    });
  });

  describe('get', () => {
    it('should return the entry for a known rsID', () => {
      const table = new LiftoverTable(TEST_ENTRIES);
      const entry = table.get('rs1801133');

      expect(entry).toBeDefined();
      expect(entry!.rsid).toBe('rs1801133');
      expect(entry!.chromosome).toBe('1');
      expect(entry!.grch37Position).toBe(11856378);
      expect(entry!.grch38Position).toBe(11796321);
    });

    it('should return undefined for an unknown rsID', () => {
      const table = new LiftoverTable(TEST_ENTRIES);
      expect(table.get('rs9999999')).toBeUndefined();
    });
  });
});

// ─── LiftoverTable.liftOne ──────────────────────────────────────────────────

describe('LiftoverTable.liftOne', () => {
  const table = new LiftoverTable(TEST_ENTRIES);

  describe('GRCh37 to GRCh38', () => {
    it('should lift rs1801133 from GRCh37 to GRCh38', () => {
      const result = table.liftOne('rs1801133', 11856378, 'GRCh37', 'GRCh38');

      expect(result.success).toBe(true);
      expect(result.rsid).toBe('rs1801133');
      expect(result.originalPosition).toBe(11856378);
      expect(result.liftedPosition).toBe(11796321);
      expect(result.originalBuild).toBe('GRCh37');
      expect(result.targetBuild).toBe('GRCh38');
      expect(result.failureReason).toBeUndefined();
    });

    it('should lift rs7903146 from GRCh37 to GRCh38', () => {
      const result = table.liftOne('rs7903146', 114758349, 'GRCh37', 'GRCh38');

      expect(result.success).toBe(true);
      expect(result.liftedPosition).toBe(112998590);
    });

    it('should lift rs429358 from GRCh37 to GRCh38', () => {
      const result = table.liftOne('rs429358', 45411941, 'GRCh37', 'GRCh38');

      expect(result.success).toBe(true);
      expect(result.liftedPosition).toBe(44908684);
    });
  });

  describe('GRCh38 to GRCh37', () => {
    it('should lift rs1801133 from GRCh38 to GRCh37', () => {
      const result = table.liftOne('rs1801133', 11796321, 'GRCh38', 'GRCh37');

      expect(result.success).toBe(true);
      expect(result.rsid).toBe('rs1801133');
      expect(result.originalPosition).toBe(11796321);
      expect(result.liftedPosition).toBe(11856378);
      expect(result.originalBuild).toBe('GRCh38');
      expect(result.targetBuild).toBe('GRCh37');
    });

    it('should lift rs4680 from GRCh38 to GRCh37', () => {
      const result = table.liftOne('rs4680', 19963748, 'GRCh38', 'GRCh37');

      expect(result.success).toBe(true);
      expect(result.liftedPosition).toBe(19951271);
    });
  });

  describe('SNP not in table', () => {
    it('should return failure with not_in_table reason for unknown rsID', () => {
      const result = table.liftOne('rs9999999', 12345, 'GRCh37', 'GRCh38');

      expect(result.success).toBe(false);
      expect(result.liftedPosition).toBe(0);
      expect(result.failureReason).toBe('not_in_table');
      expect(result.rsid).toBe('rs9999999');
      expect(result.originalPosition).toBe(12345);
    });
  });

  describe('same-build (no-op)', () => {
    it('should return success with same position when source equals target (GRCh37)', () => {
      const result = table.liftOne('rs1801133', 11856378, 'GRCh37', 'GRCh37');

      expect(result.success).toBe(true);
      expect(result.liftedPosition).toBe(11856378);
      expect(result.originalPosition).toBe(11856378);
    });

    it('should return success with same position when source equals target (GRCh38)', () => {
      const result = table.liftOne('rs1801133', 11796321, 'GRCh38', 'GRCh38');

      expect(result.success).toBe(true);
      expect(result.liftedPosition).toBe(11796321);
    });

    it('should succeed for same-build even if rsID is not in table', () => {
      // Same-build is a no-op, so table lookup is skipped
      const result = table.liftOne('rs_unknown', 999, 'GRCh37', 'GRCh37');

      expect(result.success).toBe(true);
      expect(result.liftedPosition).toBe(999);
    });
  });

  describe('unknown build', () => {
    it('should fail with ambiguous_mapping when source build is unknown', () => {
      const result = table.liftOne('rs1801133', 11856378, 'unknown', 'GRCh38');

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('ambiguous_mapping');
      expect(result.liftedPosition).toBe(0);
    });

    it('should fail with ambiguous_mapping when target build is unknown', () => {
      const result = table.liftOne('rs1801133', 11856378, 'GRCh37', 'unknown');

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('ambiguous_mapping');
      expect(result.liftedPosition).toBe(0);
    });

    it('should succeed when both builds are unknown (same-build no-op)', () => {
      // same-build check happens before unknown check
      const result = table.liftOne('rs1801133', 11856378, 'unknown', 'unknown');

      expect(result.success).toBe(true);
      expect(result.liftedPosition).toBe(11856378);
    });
  });

  describe('position mismatch', () => {
    it('should fail with ambiguous_mapping when position does not match expected source', () => {
      // rs1801133 GRCh37 position is 11856378, give wrong position
      const result = table.liftOne('rs1801133', 99999, 'GRCh37', 'GRCh38');

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('ambiguous_mapping');
      expect(result.liftedPosition).toBe(0);
    });
  });
});

// ─── LiftoverTable.liftBatch ────────────────────────────────────────────────

describe('LiftoverTable.liftBatch', () => {
  const table = new LiftoverTable(TEST_ENTRIES);

  describe('mixed results', () => {
    it('should lift a batch with some successes and some failures', () => {
      const snps = [
        { rsid: 'rs1801133', position: 11856378 },  // in table, correct position
        { rsid: 'rs429358', position: 45411941 },    // in table, correct position
        { rsid: 'rs9999999', position: 12345 },      // not in table
        { rsid: 'rs7903146', position: 114758349 },  // in table, correct position
        { rsid: 'rs_missing', position: 67890 },     // not in table
      ];

      const { results, summary } = table.liftBatch(snps, 'GRCh37', 'GRCh38');

      // Individual results
      expect(results).toHaveLength(5);
      expect(results[0]!.success).toBe(true);
      expect(results[0]!.liftedPosition).toBe(11796321);
      expect(results[1]!.success).toBe(true);
      expect(results[1]!.liftedPosition).toBe(44908684);
      expect(results[2]!.success).toBe(false);
      expect(results[2]!.failureReason).toBe('not_in_table');
      expect(results[3]!.success).toBe(true);
      expect(results[3]!.liftedPosition).toBe(112998590);
      expect(results[4]!.success).toBe(false);
      expect(results[4]!.failureReason).toBe('not_in_table');

      // Summary
      expect(summary.totalSnps).toBe(5);
      expect(summary.successfulLifts).toBe(3);
      expect(summary.failedLifts).toBe(2);
      expect(summary.unmappedRsids).toEqual(['rs9999999', 'rs_missing']);
      expect(summary.sourceBuild).toBe('GRCh37');
      expect(summary.targetBuild).toBe('GRCh38');
    });
  });

  describe('all successes', () => {
    it('should have zero failures when all SNPs are in the table', () => {
      const snps = TEST_ENTRIES.map(e => ({
        rsid: e.rsid,
        position: e.grch37Position,
      }));

      const { results, summary } = table.liftBatch(snps, 'GRCh37', 'GRCh38');

      expect(results.every(r => r.success)).toBe(true);
      expect(summary.successfulLifts).toBe(TEST_ENTRIES.length);
      expect(summary.failedLifts).toBe(0);
      expect(summary.unmappedRsids).toHaveLength(0);
    });
  });

  describe('all failures', () => {
    it('should have zero successes when no SNPs are in the table', () => {
      const snps = [
        { rsid: 'rs_fake_1', position: 100 },
        { rsid: 'rs_fake_2', position: 200 },
        { rsid: 'rs_fake_3', position: 300 },
      ];

      const { results, summary } = table.liftBatch(snps, 'GRCh37', 'GRCh38');

      expect(results.every(r => !r.success)).toBe(true);
      expect(summary.successfulLifts).toBe(0);
      expect(summary.failedLifts).toBe(3);
      expect(summary.unmappedRsids).toEqual(['rs_fake_1', 'rs_fake_2', 'rs_fake_3']);
    });
  });

  describe('empty batch', () => {
    it('should return empty results and zero counts for empty input', () => {
      const { results, summary } = table.liftBatch([], 'GRCh37', 'GRCh38');

      expect(results).toHaveLength(0);
      expect(summary.totalSnps).toBe(0);
      expect(summary.successfulLifts).toBe(0);
      expect(summary.failedLifts).toBe(0);
      expect(summary.unmappedRsids).toHaveLength(0);
      expect(summary.sourceBuild).toBe('GRCh37');
      expect(summary.targetBuild).toBe('GRCh38');
    });
  });

  describe('GRCh38 to GRCh37 batch', () => {
    it('should lift a batch in the reverse direction', () => {
      const snps = TEST_ENTRIES.map(e => ({
        rsid: e.rsid,
        position: e.grch38Position,
      }));

      const { results, summary } = table.liftBatch(snps, 'GRCh38', 'GRCh37');

      expect(results.every(r => r.success)).toBe(true);
      expect(summary.sourceBuild).toBe('GRCh38');
      expect(summary.targetBuild).toBe('GRCh37');

      // Verify actual lifted positions
      for (let i = 0; i < TEST_ENTRIES.length; i++) {
        expect(results[i]!.liftedPosition).toBe(TEST_ENTRIES[i]!.grch37Position);
      }
    });
  });

  describe('summary statistics', () => {
    it('should satisfy totalSnps = successfulLifts + failedLifts', () => {
      const snps = [
        { rsid: 'rs1801133', position: 11856378 },
        { rsid: 'rs_fake', position: 100 },
        { rsid: 'rs429358', position: 45411941 },
      ];

      const { summary } = table.liftBatch(snps, 'GRCh37', 'GRCh38');

      expect(summary.totalSnps).toBe(summary.successfulLifts + summary.failedLifts);
    });

    it('should list exactly the failed rsIDs in unmappedRsids', () => {
      const snps = [
        { rsid: 'rs1801133', position: 11856378 },
        { rsid: 'rs_miss_a', position: 100 },
        { rsid: 'rs_miss_b', position: 200 },
      ];

      const { summary } = table.liftBatch(snps, 'GRCh37', 'GRCh38');

      expect(summary.unmappedRsids).toHaveLength(2);
      expect(summary.unmappedRsids).toContain('rs_miss_a');
      expect(summary.unmappedRsids).toContain('rs_miss_b');
    });
  });
});

// ─── createLiftoverTable ────────────────────────────────────────────────────

describe('createLiftoverTable', () => {
  it('should create a LiftoverTable instance from raw data', () => {
    const table = createLiftoverTable(TEST_ENTRIES);

    expect(table).toBeInstanceOf(LiftoverTable);
    expect(table.size).toBe(TEST_ENTRIES.length);
  });

  it('should create a functional table that can perform lookups', () => {
    const table = createLiftoverTable(TEST_ENTRIES);

    expect(table.has('rs1801133')).toBe(true);
    expect(table.has('rs_nonexistent')).toBe(false);

    const result = table.liftOne('rs1801133', 11856378, 'GRCh37', 'GRCh38');
    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(11796321);
  });

  it('should create an empty table from empty array', () => {
    const table = createLiftoverTable([]);

    expect(table).toBeInstanceOf(LiftoverTable);
    expect(table.size).toBe(0);
  });
});

// ─── Edge Cases on Empty Table ──────────────────────────────────────────────

describe('empty LiftoverTable edge cases', () => {
  const emptyTable = new LiftoverTable([]);

  it('should fail to lift any SNP', () => {
    const result = emptyTable.liftOne('rs1801133', 11856378, 'GRCh37', 'GRCh38');

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('not_in_table');
  });

  it('should still allow same-build no-op', () => {
    const result = emptyTable.liftOne('rs1801133', 11856378, 'GRCh37', 'GRCh37');

    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(11856378);
  });

  it('should return empty batch results', () => {
    const { results, summary } = emptyTable.liftBatch(
      [{ rsid: 'rs123', position: 100 }],
      'GRCh37',
      'GRCh38',
    );

    expect(results).toHaveLength(1);
    expect(results[0]!.success).toBe(false);
    expect(summary.totalSnps).toBe(1);
    expect(summary.failedLifts).toBe(1);
    expect(summary.successfulLifts).toBe(0);
  });
});
