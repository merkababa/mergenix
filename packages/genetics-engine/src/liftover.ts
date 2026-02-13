/**
 * Client-Side Liftover
 *
 * Converts genomic coordinates between GRCh37 (hg19) and GRCh38 (hg38)
 * using a static JSON lookup table. This approach was chosen based on
 * Stream 0 research (R3) which found that for our ~2,800 target rsIDs,
 * a ~50KB JSON lookup is sufficient and far simpler than a full chain-file
 * liftover implementation.
 *
 * The lookup table maps rsID -> { chromosome, grch37Position, grch38Position },
 * enabling bidirectional conversion. SNPs not in the table cannot be lifted
 * over and are reported as failures.
 */

import type { GenomeBuild } from '@mergenix/shared-types';

// ─── Types ──────────────────────────────────────────────────────────────────

/** A single liftover mapping entry. */
export interface LiftoverEntry {
  /** The rsID of the SNP. */
  rsid: string;
  /** Chromosome (without "chr" prefix). */
  chromosome: string;
  /** Position on GRCh37 (hg19). */
  grch37Position: number;
  /** Position on GRCh38 (hg38). */
  grch38Position: number;
}

/** Result of lifting over a single SNP. */
export interface LiftoverResult {
  /** The rsID that was lifted. */
  rsid: string;
  /** The position in the source build. */
  originalPosition: number;
  /** The position in the target build (0 if failed). */
  liftedPosition: number;
  /** The source build. */
  originalBuild: GenomeBuild;
  /** The target build. */
  targetBuild: GenomeBuild;
  /** Whether the liftover succeeded. */
  success: boolean;
  /** Reason for failure (if success is false). */
  failureReason?: 'not_in_table' | 'ambiguous_mapping';
}

/** Summary statistics of a batch liftover operation. */
export interface LiftoverSummary {
  /** Total number of SNPs in the batch. */
  totalSnps: number;
  /** Number of SNPs successfully lifted over. */
  successfulLifts: number;
  /** Number of SNPs that failed to lift over. */
  failedLifts: number;
  /** List of rsIDs that could not be lifted over. */
  unmappedRsids: string[];
  /** The source build. */
  sourceBuild: GenomeBuild;
  /** The target build. */
  targetBuild: GenomeBuild;
}

// ─── LiftoverTable Class ────────────────────────────────────────────────────

/**
 * Liftover lookup table for coordinate conversion between genome builds.
 *
 * Wraps a Map of rsID -> LiftoverEntry for O(1) lookup. Supports
 * bidirectional conversion (GRCh37 -> GRCh38 and GRCh38 -> GRCh37).
 *
 * Usage:
 * ```ts
 * const table = createLiftoverTable(jsonData);
 * const result = table.liftOne('rs7903146', 114758349, 'GRCh37', 'GRCh38');
 * // result.liftedPosition === 112998590
 * ```
 */
export class LiftoverTable {
  private readonly entries: Map<string, LiftoverEntry>;

  constructor(entries: LiftoverEntry[]) {
    this.entries = new Map(entries.map(e => [e.rsid, e]));
  }

  /** Get the number of entries in the table. */
  get size(): number {
    return this.entries.size;
  }

  /** Check if an rsID has a liftover mapping. */
  has(rsid: string): boolean {
    return this.entries.has(rsid);
  }

  /**
   * Get the liftover entry for an rsID, or undefined if not found.
   *
   * @param rsid - The rsID to look up
   * @returns The liftover entry, or undefined
   */
  get(rsid: string): LiftoverEntry | undefined {
    return this.entries.get(rsid);
  }

  /**
   * Lift a single SNP from one build to another.
   *
   * Performs the following checks:
   * 1. Verifies the rsID exists in the lookup table
   * 2. Verifies the current position matches the expected position for the source build
   * 3. Returns the position in the target build
   *
   * If the source and target builds are the same, returns the original position
   * as a successful no-op.
   *
   * @param rsid - The rsID to lift
   * @param currentPosition - The current position in the source build
   * @param sourceBuild - The genome build of the current position
   * @param targetBuild - The genome build to convert to
   * @returns Liftover result with the new position or failure reason
   */
  liftOne(
    rsid: string,
    currentPosition: number,
    sourceBuild: GenomeBuild,
    targetBuild: GenomeBuild,
  ): LiftoverResult {
    // Same-build lift is a no-op
    if (sourceBuild === targetBuild) {
      return {
        rsid,
        originalPosition: currentPosition,
        liftedPosition: currentPosition,
        originalBuild: sourceBuild,
        targetBuild,
        success: true,
      };
    }

    // Unknown build cannot be lifted
    if (sourceBuild === 'unknown' || targetBuild === 'unknown') {
      return {
        rsid,
        originalPosition: currentPosition,
        liftedPosition: 0,
        originalBuild: sourceBuild,
        targetBuild,
        success: false,
        failureReason: 'ambiguous_mapping',
      };
    }

    // Look up the entry
    const entry = this.entries.get(rsid);
    if (!entry) {
      return {
        rsid,
        originalPosition: currentPosition,
        liftedPosition: 0,
        originalBuild: sourceBuild,
        targetBuild,
        success: false,
        failureReason: 'not_in_table',
      };
    }

    // Determine source and target positions from the entry
    const expectedSourcePosition = sourceBuild === 'GRCh37'
      ? entry.grch37Position
      : entry.grch38Position;
    const targetPosition = targetBuild === 'GRCh37'
      ? entry.grch37Position
      : entry.grch38Position;

    // Verify the current position matches what we expect for the source build
    if (currentPosition !== expectedSourcePosition) {
      return {
        rsid,
        originalPosition: currentPosition,
        liftedPosition: 0,
        originalBuild: sourceBuild,
        targetBuild,
        success: false,
        failureReason: 'ambiguous_mapping',
      };
    }

    // Successful liftover
    return {
      rsid,
      originalPosition: currentPosition,
      liftedPosition: targetPosition,
      originalBuild: sourceBuild,
      targetBuild,
      success: true,
    };
  }

  /**
   * Lift a batch of SNPs from one build to another.
   *
   * Iterates over all provided SNPs, lifts each one individually, and
   * collects the results along with aggregate summary statistics.
   *
   * @param snps - Array of { rsid, position } to lift
   * @param sourceBuild - The genome build of the input positions
   * @param targetBuild - The genome build to convert to
   * @returns Object with individual results and aggregate summary
   */
  liftBatch(
    snps: Array<{ rsid: string; position: number }>,
    sourceBuild: GenomeBuild,
    targetBuild: GenomeBuild,
  ): { results: LiftoverResult[]; summary: LiftoverSummary } {
    const results: LiftoverResult[] = [];
    const unmappedRsids: string[] = [];
    let successfulLifts = 0;
    let failedLifts = 0;

    for (const snp of snps) {
      const result = this.liftOne(snp.rsid, snp.position, sourceBuild, targetBuild);
      results.push(result);

      if (result.success) {
        successfulLifts++;
      } else {
        failedLifts++;
        unmappedRsids.push(snp.rsid);
      }
    }

    const summary: LiftoverSummary = {
      totalSnps: snps.length,
      successfulLifts,
      failedLifts,
      unmappedRsids,
      sourceBuild,
      targetBuild,
    };

    return { results, summary };
  }
}

// ─── Factory Function ───────────────────────────────────────────────────────

/**
 * Create a LiftoverTable from raw JSON data.
 *
 * The JSON format matches what would be fetched from `/data/v1/liftover.json`.
 * Each entry contains { rsid, chromosome, grch37Position, grch38Position }.
 *
 * @param data - Array of liftover entries (from JSON)
 * @returns A LiftoverTable instance ready for lookups
 */
export function createLiftoverTable(data: LiftoverEntry[]): LiftoverTable {
  return new LiftoverTable(data);
}
