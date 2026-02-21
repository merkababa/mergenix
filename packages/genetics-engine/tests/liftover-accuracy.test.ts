/**
 * Liftover Accuracy Tests (Q8)
 *
 * Verifies that the liftover module correctly converts known genomic
 * coordinates between GRCh37 (hg19) and GRCh38 (hg38) for well-characterized
 * reference SNPs, and handles boundary/edge conditions correctly.
 *
 * The coordinate values used here are sourced from dbSNP and published
 * genome coordinate databases for each rsID. These are the canonical
 * positions for these widely-used reference SNPs.
 *
 * Note: The liftover module uses a static JSON lookup table rather than a
 * chain-file liftover algorithm. Tests verify that the lookup logic returns
 * the correct positions from the table and handles failures correctly.
 *
 * Q8 — Liftover Accuracy: known conversions, bidirectionality, edge cases
 */

import { describe, it, expect } from 'vitest';
import { LiftoverTable, createLiftoverTable } from '../src/liftover';
import type { LiftoverEntry } from '../src/liftover';
import { liftoverCoordinates } from '@mergenix/genetics-data';

// ─── Reference SNP Fixtures ──────────────────────────────────────────────────
//
// These entries are sourced from dbSNP and represent well-characterized,
// widely-used genetic variants with published coordinates in both builds.
// Coordinate sources:
//   rs334  (HBB p.Glu6Val, Sickle Cell): dbSNP / Ensembl
//   rs429358 (APOE ε4 allele): dbSNP / ClinVar
//   rs7903146 (TCF7L2, T2D risk): dbSNP / HapMap
//   rs1801133 (MTHFR C677T): dbSNP
//   rs4680 (COMT Val158Met): dbSNP
//   rs1000000 (control SNP with verified build positions): dbSNP

const REFERENCE_ENTRIES: LiftoverEntry[] = [
  {
    // rs334: HBB p.Glu6Val — the Sickle Cell Disease variant
    // GRCh37: chr11:5248232  GRCh38: chr11:5227002
    // Source: dbSNP rs334, ClinVar VCV000015278
    rsid: 'rs334',
    chromosome: '11',
    grch37Position: 5248232,
    grch38Position: 5227002,
  },
  {
    // rs429358: APOE ε4 allele — major Alzheimer's risk variant
    // GRCh37: chr19:45411941  GRCh38: chr19:44908684
    // Source: dbSNP rs429358, Ensembl VEP
    rsid: 'rs429358',
    chromosome: '19',
    grch37Position: 45411941,
    grch38Position: 44908684,
  },
  {
    // rs7903146: TCF7L2 — strongest common T2D risk locus
    // GRCh37: chr10:114758349  GRCh38: chr10:112998590
    // Source: dbSNP rs7903146, GWAS Catalog GCST000028
    rsid: 'rs7903146',
    chromosome: '10',
    grch37Position: 114758349,
    grch38Position: 112998590,
  },
  {
    // rs1801133: MTHFR C677T — folate metabolism variant
    // GRCh37: chr1:11856378  GRCh38: chr1:11796321
    // Source: dbSNP rs1801133, ClinVar
    rsid: 'rs1801133',
    chromosome: '1',
    grch37Position: 11856378,
    grch38Position: 11796321,
  },
  {
    // rs4680: COMT Val158Met — dopamine catabolism variant
    // GRCh37: chr22:19951271  GRCh38: chr22:19963748
    // Source: dbSNP rs4680
    rsid: 'rs4680',
    chromosome: '22',
    grch37Position: 19951271,
    grch38Position: 19963748,
  },
];

// ─── Q8: Liftover — Known Coordinate Conversions ─────────────────────────────

describe('Liftover — Known Coordinate Conversions', () => {
  const table = new LiftoverTable(REFERENCE_ENTRIES);

  /**
   * rs334 (Sickle Cell Disease): GRCh37 → GRCh38 conversion.
   * chr11:5248232 (hg19) → chr11:5227002 (hg38)
   * This is a ~21kb shift due to the gap between builds on chromosome 11.
   */
  it('rs334 (Sickle Cell HBB): converts from GRCh37:5248232 to GRCh38:5227002', () => {
    const result = table.liftOne('rs334', 5248232, 'GRCh37', 'GRCh38');

    expect(result.success).toBe(true);
    expect(result.rsid).toBe('rs334');
    expect(result.originalPosition).toBe(5248232);
    expect(result.liftedPosition).toBe(5227002);
    expect(result.originalBuild).toBe('GRCh37');
    expect(result.targetBuild).toBe('GRCh38');
    expect(result.failureReason).toBeUndefined();
  });

  /**
   * rs429358 (APOE ε4): GRCh37 → GRCh38 conversion.
   * chr19:45411941 (hg19) → chr19:44908684 (hg38)
   * A large ~503kb shift due to centromere repositioning in chr19.
   */
  it('rs429358 (APOE ε4, Alzheimer risk): converts from GRCh37:45411941 to GRCh38:44908684', () => {
    const result = table.liftOne('rs429358', 45411941, 'GRCh37', 'GRCh38');

    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(44908684);
    expect(result.originalBuild).toBe('GRCh37');
    expect(result.targetBuild).toBe('GRCh38');
  });

  /**
   * rs7903146 (TCF7L2, T2D): GRCh37 → GRCh38 conversion.
   * chr10:114758349 (hg19) → chr10:112998590 (hg38)
   */
  it('rs7903146 (TCF7L2 T2D locus): converts from GRCh37:114758349 to GRCh38:112998590', () => {
    const result = table.liftOne('rs7903146', 114758349, 'GRCh37', 'GRCh38');

    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(112998590);
  });

  /**
   * rs1801133 (MTHFR C677T): GRCh37 → GRCh38 conversion.
   * chr1:11856378 (hg19) → chr1:11796321 (hg38)
   */
  it('rs1801133 (MTHFR C677T): converts from GRCh37:11856378 to GRCh38:11796321', () => {
    const result = table.liftOne('rs1801133', 11856378, 'GRCh37', 'GRCh38');

    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(11796321);
  });

  /**
   * rs4680 (COMT Val158Met): GRCh37 → GRCh38 conversion.
   * chr22:19951271 (hg19) → chr22:19963748 (hg38)
   * Note: This SNP INCREASES in position between builds (forward shift on chr22).
   */
  it('rs4680 (COMT Val158Met): converts from GRCh37:19951271 to GRCh38:19963748', () => {
    const result = table.liftOne('rs4680', 19951271, 'GRCh37', 'GRCh38');

    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(19963748);
  });

  /**
   * Bidirectionality: GRCh38 → GRCh37 for rs334.
   * Verifies the liftover is truly reversible — lifting back from hg38
   * must return the original hg19 coordinate.
   */
  it('rs334: GRCh38 → GRCh37 reverse conversion returns original position', () => {
    // Start at GRCh38 position
    const result = table.liftOne('rs334', 5227002, 'GRCh38', 'GRCh37');

    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(5248232);
    expect(result.originalBuild).toBe('GRCh38');
    expect(result.targetBuild).toBe('GRCh37');
  });

  /**
   * Bidirectionality: GRCh38 → GRCh37 for rs429358.
   */
  it('rs429358: GRCh38 → GRCh37 reverse conversion is correct', () => {
    const result = table.liftOne('rs429358', 44908684, 'GRCh38', 'GRCh37');

    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(45411941);
  });

  /**
   * Bidirectionality: GRCh38 → GRCh37 for rs1801133.
   */
  it('rs1801133: GRCh38 → GRCh37 reverse conversion is correct', () => {
    const result = table.liftOne('rs1801133', 11796321, 'GRCh38', 'GRCh37');

    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(11856378);
  });

  /**
   * Chromosome preservation: the chromosome field in the lookup entry
   * matches the expected chromosome for each reference SNP.
   */
  it('chromosome is preserved correctly for each reference SNP', () => {
    const expectedChromosomes: Record<string, string> = {
      'rs334': '11',
      'rs429358': '19',
      'rs7903146': '10',
      'rs1801133': '1',
      'rs4680': '22',
    };

    for (const [rsid, expectedChrom] of Object.entries(expectedChromosomes)) {
      const entry = table.get(rsid);
      expect(entry).toBeDefined();
      expect(entry!.chromosome).toBe(expectedChrom);
    }
  });

  /**
   * Lifted positions are within the expected genomic range.
   * Human chromosomes have positions in roughly [1, 3e8]. Verify that
   * none of the lifted positions are biologically implausible.
   */
  it('all lifted GRCh38 positions are in plausible genomic range (1 to 3e8)', () => {
    for (const entry of REFERENCE_ENTRIES) {
      expect(entry.grch38Position).toBeGreaterThan(0);
      expect(entry.grch38Position).toBeLessThan(300_000_000);
    }
  });

  /**
   * Batch conversion: all reference SNPs lift successfully from GRCh37 to GRCh38.
   * This is a regression test ensuring no reference entry is broken.
   */
  it('all reference SNPs lift successfully from GRCh37 to GRCh38 in a batch', () => {
    const snps = REFERENCE_ENTRIES.map(e => ({
      rsid: e.rsid,
      position: e.grch37Position,
    }));

    const { results, summary } = table.liftBatch(snps, 'GRCh37', 'GRCh38');

    expect(summary.successfulLifts).toBe(REFERENCE_ENTRIES.length);
    expect(summary.failedLifts).toBe(0);
    expect(summary.unmappedRsids).toHaveLength(0);

    // Verify each lifted position matches the expected GRCh38 position
    for (let i = 0; i < REFERENCE_ENTRIES.length; i++) {
      expect(results[i]!.success).toBe(true);
      expect(results[i]!.liftedPosition).toBe(REFERENCE_ENTRIES[i]!.grch38Position);
    }
  });

  /**
   * Batch reverse conversion: all reference SNPs lift successfully from
   * GRCh38 back to GRCh37.
   */
  it('all reference SNPs lift successfully from GRCh38 to GRCh37 in a batch', () => {
    const snps = REFERENCE_ENTRIES.map(e => ({
      rsid: e.rsid,
      position: e.grch38Position,
    }));

    const { results, summary } = table.liftBatch(snps, 'GRCh38', 'GRCh37');

    expect(summary.successfulLifts).toBe(REFERENCE_ENTRIES.length);
    expect(summary.failedLifts).toBe(0);

    for (let i = 0; i < REFERENCE_ENTRIES.length; i++) {
      expect(results[i]!.success).toBe(true);
      expect(results[i]!.liftedPosition).toBe(REFERENCE_ENTRIES[i]!.grch37Position);
    }
  });

  /**
   * Round-trip fidelity: lift GRCh37 → GRCh38 → GRCh37 and verify we
   * arrive back at the original position. This is the gold standard test
   * for liftover correctness.
   */
  it('round-trip GRCh37→GRCh38→GRCh37 returns original position for all reference SNPs', () => {
    for (const entry of REFERENCE_ENTRIES) {
      // Forward: GRCh37 → GRCh38
      const forward = table.liftOne(entry.rsid, entry.grch37Position, 'GRCh37', 'GRCh38');
      expect(forward.success).toBe(true);

      // Reverse: GRCh38 → GRCh37 using the lifted position
      const reverse = table.liftOne(entry.rsid, forward.liftedPosition, 'GRCh38', 'GRCh37');
      expect(reverse.success).toBe(true);

      // Round-trip: should recover original GRCh37 position exactly
      expect(reverse.liftedPosition).toBe(entry.grch37Position);
    }
  });
});

// ─── Q8: Liftover — Edge Cases ────────────────────────────────────────────────

describe('Liftover — Edge Cases', () => {
  const table = new LiftoverTable(REFERENCE_ENTRIES);

  /**
   * SNP not in the lookup table returns failure with 'not_in_table' reason.
   * This tests the "unmapped region" scenario — if the rsID is not in the
   * static lookup, there is no coordinate mapping available.
   */
  it('SNP not in lookup table returns failure with not_in_table reason', () => {
    // rs123456789 is not a real SNP in our table
    const result = table.liftOne('rs123456789', 1000000, 'GRCh37', 'GRCh38');

    expect(result.success).toBe(false);
    expect(result.liftedPosition).toBe(0);
    expect(result.failureReason).toBe('not_in_table');
    expect(result.rsid).toBe('rs123456789');
  });

  /**
   * Position mismatch (wrong coordinate for the source build): the engine
   * verifies that the supplied position matches the expected position for
   * the named source build. If they don't match, the mapping is ambiguous.
   *
   * This prevents silent errors where a user supplies a GRCh38 position but
   * claims it is GRCh37.
   */
  it('position mismatch for known SNP returns failure with ambiguous_mapping', () => {
    // rs334's real GRCh37 position is 5248232. Providing wrong position:
    const result = table.liftOne('rs334', 9999999, 'GRCh37', 'GRCh38');

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('ambiguous_mapping');
    expect(result.liftedPosition).toBe(0);
  });

  /**
   * Providing the GRCh38 position when source build is declared as GRCh37
   * should also fail with ambiguous_mapping (position doesn't match GRCh37 record).
   */
  it('providing wrong-build position (GRCh38 position with GRCh37 source) returns ambiguous_mapping', () => {
    // rs334: GRCh37=5248232, GRCh38=5227002. If we provide the GRCh38 position
    // as if it were GRCh37, the engine correctly rejects it.
    const result = table.liftOne('rs334', 5227002, 'GRCh37', 'GRCh38');

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('ambiguous_mapping');
  });

  /**
   * Unknown source build returns failure. We cannot lift from an unknown build
   * because we don't know which coordinate system the position belongs to.
   */
  it('unknown source build returns failure with ambiguous_mapping', () => {
    const result = table.liftOne('rs334', 5248232, 'unknown', 'GRCh38');

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('ambiguous_mapping');
    expect(result.liftedPosition).toBe(0);
  });

  /**
   * Unknown target build returns failure.
   */
  it('unknown target build returns failure with ambiguous_mapping', () => {
    const result = table.liftOne('rs334', 5248232, 'GRCh37', 'unknown');

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('ambiguous_mapping');
  });

  /**
   * Same-build conversion is a no-op. Providing GRCh37 → GRCh37 returns
   * the same position unchanged (no lookup needed).
   */
  it('same-build (GRCh37→GRCh37) is a no-op returning the original position', () => {
    const result = table.liftOne('rs334', 5248232, 'GRCh37', 'GRCh37');

    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(5248232);
    expect(result.originalPosition).toBe(5248232);
  });

  /**
   * Same-build for GRCh38 is also a no-op.
   */
  it('same-build (GRCh38→GRCh38) is a no-op returning the original position', () => {
    const result = table.liftOne('rs334', 5227002, 'GRCh38', 'GRCh38');

    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(5227002);
  });

  /**
   * Same-build no-op works even if the rsID is not in the table.
   * This is intentional: no lookup is needed for a no-op.
   */
  it('same-build no-op succeeds even for rsIDs not in the table', () => {
    const result = table.liftOne('rs_not_in_table', 12345, 'GRCh37', 'GRCh37');

    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(12345);
  });

  /**
   * Both builds unknown — same-build check fires before the unknown build
   * check, so unknown→unknown is still a no-op (succeeds).
   */
  it('unknown→unknown build is treated as same-build no-op (succeeds)', () => {
    const result = table.liftOne('rs334', 5248232, 'unknown', 'unknown');

    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(5248232);
  });

  /**
   * Zero or negative position with a valid rsID: the engine stores no
   * SNP at position 0 or negative, so the lookup will either find the
   * real position does not match (ambiguous_mapping) or the rsID is not
   * in the table (not_in_table).
   *
   * We test with a valid rsID but position=0:
   * rs334's GRCh37 position is 5248232, so 0 != 5248232 → ambiguous_mapping.
   */
  it('position 0 for a known rsID returns ambiguous_mapping (position does not match record)', () => {
    const result = table.liftOne('rs334', 0, 'GRCh37', 'GRCh38');

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('ambiguous_mapping');
  });

  /**
   * Very large position for an rsID not in the table returns not_in_table.
   */
  it('very large position for unknown rsID returns not_in_table', () => {
    const result = table.liftOne('rs999999999', 999_000_000, 'GRCh37', 'GRCh38');

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('not_in_table');
  });

  /**
   * Empty rsID string: not in the table → not_in_table failure.
   */
  it('empty rsID returns not_in_table failure', () => {
    const result = table.liftOne('', 12345, 'GRCh37', 'GRCh38');

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('not_in_table');
  });

  /**
   * Batch with empty input returns empty results and zero summary counts.
   * Ensure no crash when the input array is empty.
   */
  it('empty batch input returns empty results and zero counts', () => {
    const { results, summary } = table.liftBatch([], 'GRCh37', 'GRCh38');

    expect(results).toHaveLength(0);
    expect(summary.totalSnps).toBe(0);
    expect(summary.successfulLifts).toBe(0);
    expect(summary.failedLifts).toBe(0);
    expect(summary.unmappedRsids).toHaveLength(0);
  });

  /**
   * Batch with mixed valid/invalid rsIDs: summary counts add up correctly.
   * totalSnps must always equal successfulLifts + failedLifts.
   */
  it('batch summary totals are consistent (total = success + failed)', () => {
    const snps = [
      { rsid: 'rs334', position: 5248232 },         // valid GRCh37 → success
      { rsid: 'rs_invalid_1', position: 100 },        // not in table → failure
      { rsid: 'rs429358', position: 45411941 },       // valid GRCh37 → success
      { rsid: 'rs_invalid_2', position: 200 },        // not in table → failure
    ];

    const { summary } = table.liftBatch(snps, 'GRCh37', 'GRCh38');

    expect(summary.totalSnps).toBe(4);
    expect(summary.successfulLifts).toBe(2);
    expect(summary.failedLifts).toBe(2);
    expect(summary.totalSnps).toBe(summary.successfulLifts + summary.failedLifts);
    expect(summary.unmappedRsids).toContain('rs_invalid_1');
    expect(summary.unmappedRsids).toContain('rs_invalid_2');
    expect(summary.unmappedRsids).not.toContain('rs334');
    expect(summary.unmappedRsids).not.toContain('rs429358');
  });

  /**
   * The liftedPosition is 0 for all failed lifts. Consumers should check
   * the `success` field before using the position. This invariant prevents
   * silent use of an invalid position 0.
   */
  it('failed lift always returns liftedPosition = 0', () => {
    const result1 = table.liftOne('rs_not_in_table', 12345, 'GRCh37', 'GRCh38');
    expect(result1.liftedPosition).toBe(0);

    const result2 = table.liftOne('rs334', 9999999, 'GRCh37', 'GRCh38');
    expect(result2.liftedPosition).toBe(0);

    const result3 = table.liftOne('rs334', 5248232, 'unknown', 'GRCh38');
    expect(result3.liftedPosition).toBe(0);
  });

  /**
   * liftedPosition > 0 for all successful lifts (no SNP sits at position 0
   * in a real genome).
   */
  it('successful lift always returns liftedPosition > 0', () => {
    for (const entry of REFERENCE_ENTRIES) {
      const result = table.liftOne(entry.rsid, entry.grch37Position, 'GRCh37', 'GRCh38');
      expect(result.success).toBe(true);
      expect(result.liftedPosition).toBeGreaterThan(0);
    }
  });

  /**
   * createLiftoverTable factory produces a functional table equivalent to
   * constructing directly with `new LiftoverTable()`.
   */
  it('createLiftoverTable factory produces a functional table with correct entries', () => {
    const factoryTable = createLiftoverTable(REFERENCE_ENTRIES);

    expect(factoryTable.size).toBe(REFERENCE_ENTRIES.length);

    // Verify at least one known conversion works via the factory table
    const result = factoryTable.liftOne('rs334', 5248232, 'GRCh37', 'GRCh38');
    expect(result.success).toBe(true);
    expect(result.liftedPosition).toBe(5227002);
  });

  /**
   * LiftoverTable.get() returns the exact entry for a known rsID, including
   * both coordinates and chromosome. This is the raw data access path used
   * by tests and direct consumers of the table.
   */
  it('table.get() returns correct entry data for known rsIDs', () => {
    const entry = table.get('rs334');
    expect(entry).toBeDefined();
    expect(entry!.rsid).toBe('rs334');
    expect(entry!.chromosome).toBe('11');
    expect(entry!.grch37Position).toBe(5248232);
    expect(entry!.grch38Position).toBe(5227002);
  });

  /**
   * table.get() returns undefined for an rsID not in the table.
   */
  it('table.get() returns undefined for rsIDs not in the table', () => {
    expect(table.get('rs_not_in_table')).toBeUndefined();
    expect(table.get('')).toBeUndefined();
  });

  /**
   * table.has() correctly identifies which rsIDs are present.
   */
  it('table.has() correctly identifies present and absent rsIDs', () => {
    // Present
    for (const entry of REFERENCE_ENTRIES) {
      expect(table.has(entry.rsid)).toBe(true);
    }
    // Absent
    expect(table.has('rs_not_in_table')).toBe(false);
    expect(table.has('')).toBe(false);
    expect(table.has('rs0')).toBe(false);
  });

  /**
   * Table correctly handles duplicate rsIDs in the input: last entry wins.
   * This matches Map constructor semantics and ensures predictable behavior.
   */
  it('duplicate rsID entries: last entry wins (Map semantics)', () => {
    const duplicateEntries: LiftoverEntry[] = [
      { rsid: 'rs_dup', chromosome: '1', grch37Position: 100, grch38Position: 200 },
      { rsid: 'rs_dup', chromosome: '1', grch37Position: 300, grch38Position: 400 },
    ];
    const dedupTable = new LiftoverTable(duplicateEntries);
    // Table only has 1 entry (deduplicated by rsID)
    expect(dedupTable.size).toBe(1);
    // The last entry wins: grch37Position = 300
    const entry = dedupTable.get('rs_dup');
    expect(entry!.grch37Position).toBe(300);
    expect(entry!.grch38Position).toBe(400);
  });

  /**
   * Batch unmappedRsids list contains exactly the rsIDs that failed,
   * in the order they were processed.
   */
  it('batch unmappedRsids preserves order of failed rsIDs', () => {
    const snps = [
      { rsid: 'rs_fail_alpha', position: 100 },
      { rsid: 'rs334', position: 5248232 },
      { rsid: 'rs_fail_beta', position: 200 },
      { rsid: 'rs_fail_gamma', position: 300 },
    ];

    const { summary } = table.liftBatch(snps, 'GRCh37', 'GRCh38');

    expect(summary.unmappedRsids).toHaveLength(3);
    expect(summary.unmappedRsids[0]).toBe('rs_fail_alpha');
    expect(summary.unmappedRsids[1]).toBe('rs_fail_beta');
    expect(summary.unmappedRsids[2]).toBe('rs_fail_gamma');
  });

  /**
   * The batch builds the correct source/target build metadata in the summary.
   */
  it('batch summary correctly records source and target build', () => {
    const { summary: fwd } = table.liftBatch(
      [{ rsid: 'rs334', position: 5248232 }],
      'GRCh37',
      'GRCh38',
    );
    expect(fwd.sourceBuild).toBe('GRCh37');
    expect(fwd.targetBuild).toBe('GRCh38');

    const { summary: rev } = table.liftBatch(
      [{ rsid: 'rs334', position: 5227002 }],
      'GRCh38',
      'GRCh37',
    );
    expect(rev.sourceBuild).toBe('GRCh38');
    expect(rev.targetBuild).toBe('GRCh37');
  });
});

// ─── Q8: Production Data Integration ─────────────────────────────────────────

/**
 * Integration test: imports the real liftover data from the production
 * @mergenix/genetics-data package and verifies structural correctness.
 *
 * This test is intentionally cross-module — it couples the liftover engine
 * to the production data package to detect schema divergence early.
 *
 * NOTE: The production liftover-coordinates.json is currently a placeholder
 * (totalVariants: 0). This test verifies the shape of the data contract and
 * is written to be forward-compatible: it includes a conditional assertion
 * for rs334 (Sickle Cell Disease, HBB p.Glu6Val) that will activate once
 * the table is populated via the planned Ensembl batch query.
 *
 * When rs334 is populated:
 *   GRCh37: chr11:5248232  GRCh38: chr11:5227002
 *   (Source: dbSNP rs334, ClinVar VCV000015278)
 */
describe('Liftover — Production Data Integration', () => {
  it('production liftoverCoordinates has valid metadata structure', () => {
    // Verify the production data export has the expected shape
    expect(liftoverCoordinates).toBeDefined();
    expect(liftoverCoordinates.metadata).toBeDefined();
    expect(typeof liftoverCoordinates.metadata.version).toBe('string');
    expect(typeof liftoverCoordinates.metadata.lastUpdated).toBe('string');
    expect(typeof liftoverCoordinates.metadata.source).toBe('string');
    expect(typeof liftoverCoordinates.metadata.totalVariants).toBe('number');
    expect(liftoverCoordinates.snps).toBeDefined();
  });

  it('production liftoverCoordinates.snps is a valid record', () => {
    // snps must be a plain object (Record<string, LiftoverEntry>)
    expect(typeof liftoverCoordinates.snps).toBe('object');
    expect(liftoverCoordinates.snps).not.toBeNull();
    expect(Array.isArray(liftoverCoordinates.snps)).toBe(false);
  });

  it('production liftoverCoordinates.metadata.totalVariants matches actual snps count', () => {
    // The metadata totalVariants field must match the actual number of SNP entries
    const actualCount = Object.keys(liftoverCoordinates.snps).length;
    expect(liftoverCoordinates.metadata.totalVariants).toBe(actualCount);
  });

  it('rs334 (Sickle Cell HBB p.Glu6Val): verifies coordinates when present in production table', () => {
    // rs334 canonical coordinates (dbSNP / ClinVar VCV000015278):
    //   GRCh37 (hg19): chr11:5248232
    //   GRCh38 (hg38): chr11:5227002
    //
    // NOTE: This test is forward-compatible — it skips if rs334 is not yet
    // populated in the placeholder table, and activates once the Ensembl batch
    // query populates the production data.
    const rs334Entry = liftoverCoordinates.snps['rs334'];
    if (rs334Entry === undefined) {
      // Placeholder state: rs334 not yet populated — test will activate after Ensembl import
      return;
    }

    // Verify GRCh37 coordinate
    expect(rs334Entry.hg19).toBeDefined();
    expect(rs334Entry.hg19!.chr).toBe('11');
    expect(rs334Entry.hg19!.pos).toBe(5248232);

    // Verify GRCh38 coordinate
    expect(rs334Entry.hg38).toBeDefined();
    expect(rs334Entry.hg38!.chr).toBe('11');
    expect(rs334Entry.hg38!.pos).toBe(5227002);
  });
});
