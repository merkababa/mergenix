/**
 * Golden Standard Datasets (Q1a) — Re-export barrel.
 *
 * This file previously contained all golden datasets in a single 993-line
 * file. It has been split into per-format files for maintainability:
 *
 *   golden-23andme.ts    — 23andMe format (~100 variants, 3 pathogenic)
 *   golden-ancestrydna.ts — AncestryDNA format (~100 variants, 2 pathogenic)
 *   golden-myheritage.ts  — MyHeritage CSV format (~100 variants, 1 pathogenic + 1 VG-prefixed)
 *   golden-vcf.ts         — VCFv4.1 format (~100 variants, phased + multi-allelic edge cases)
 *   golden-edge-cases.ts  — 23andMe edge-case format (trailing whitespace, bad case, no-calls)
 *
 * All existing imports from './golden-files' continue to work without change.
 */

export type { GoldenDataset } from './golden-types';
export { GOLDEN_23ANDME } from './golden-23andme';
export { GOLDEN_ANCESTRYDNA } from './golden-ancestrydna';
export { GOLDEN_MYHERITAGE } from './golden-myheritage';
export { GOLDEN_VCF } from './golden-vcf';
export { GOLDEN_EDGE_CASES } from './golden-edge-cases';
