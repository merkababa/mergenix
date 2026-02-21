/**
 * Shared types for golden standard datasets (Q1a).
 *
 * This file is imported by all per-format golden dataset files.
 * It exists as a separate module to avoid circular imports and to give
 * each format file a single, stable location to import the type from.
 */

/**
 * A golden standard dataset.
 *
 * `content` is the raw file string to pass to the parser.
 * `expectedGenotypes` is the exact Record<rsid, genotype> the parser must return.
 */
export interface GoldenDataset {
  /** Human-readable name for this golden dataset. */
  name: string;
  /** Raw file content string (ready to pass to the parser). */
  content: string;
  /** The exact genotype map the parser must produce from `content`. */
  expectedGenotypes: Record<string, string>;
}
