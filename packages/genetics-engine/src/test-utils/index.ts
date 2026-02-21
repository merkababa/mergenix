/**
 * @mergenix/genetics-engine test utilities
 *
 * Barrel export for all synthetic genome factory utilities.
 *
 * IMPORTANT: These utilities are for testing ONLY. They must NOT be imported
 * from production code. They are intentionally in `src/test-utils/` (not
 * `src/`) to make the boundary explicit, but they are excluded from the main
 * barrel export in `src/index.ts`.
 */

// ─── Synthetic Factory ───────────────────────────────────────────────────────
export { generateSyntheticGenome } from './synthetic-factory';
export type {
  SupportedFormat,
  MutationInjection,
  SyntheticGenomeOptions,
} from './synthetic-factory';

// ─── Edge Case Generators ────────────────────────────────────────────────────
export {
  generateEmptyFile,
  generateBomPrefixedFile,
  generateCrlfFile,
  generateTruncatedFile,
  generateDuplicateRsidFile,
  generateNoCallFile,
  generateLongCommentFile,
  generateNonstandardChromosomeFile,
  generateEdgeCaseGenome,
} from './edge-cases';

// ─── Golden Standard Datasets ────────────────────────────────────────────────
export {
  GOLDEN_23ANDME,
  GOLDEN_ANCESTRYDNA,
  GOLDEN_MYHERITAGE,
  GOLDEN_VCF,
  GOLDEN_EDGE_CASES,
} from './golden-files';
export type { GoldenDataset } from './golden-files';
