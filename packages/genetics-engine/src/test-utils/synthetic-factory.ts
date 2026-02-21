/**
 * Synthetic Genome Factory (Q1)
 *
 * Generates deterministic, synthetic genetic data files for testing purposes.
 * All output is zero-PII synthetic data — no real human genotypes.
 *
 * Supports all four parser-recognized formats:
 * - 23andMe (tab-separated, 4 columns, comment header)
 * - AncestryDNA (tab-separated, 5 columns, separate allele columns)
 * - MyHeritage/FTDNA (CSV, 4 columns, no comment lines)
 * - VCF (##fileformat=VCFv4.1 meta + #CHROM header + data rows)
 *
 * Design decisions:
 * - Seedable LCG PRNG for fully reproducible output
 * - Injected mutations override any randomly generated entry at that rsID
 * - variantCount targets parseable (called) variants; no-calls do not count
 * - Chromosome distribution is realistic (weighted by known SNP density)
 */

import type { FileFormat } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * All parser-recognized format identifiers.
 *
 * Derived from the production FileFormat type by excluding 'unknown',
 * which is reserved for unrecognized input and is not a valid generation target.
 */
export type SupportedFormat = Exclude<FileFormat, 'unknown'>;

/** A mutation to inject into the generated file. */
export interface MutationInjection {
  /** The rsID to inject (e.g., 'rs334'). */
  rsid: string;
  /**
   * The genotype string to inject.
   * - 23andMe / MyHeritage: combined (e.g., 'AT', 'GG')
   * - AncestryDNA: combined (allele1+allele2), will be split on output (e.g., 'AT' → allele1='A', allele2='T')
   * - VCF: two-character SNP genotype (e.g., 'AT') stored as 0/1 or similar; for simplicity
   *   both alleles must be single nucleotides for injected variants in synthetic VCF
   */
  genotype: string;
}

/** Options for `generateSyntheticGenome`. */
export interface SyntheticGenomeOptions {
  /** Output file format. */
  format: SupportedFormat;
  /** Seed for the PRNG. Same seed + same options → identical output. */
  seed: number;
  /** Target number of parseable (called) variants. Default: 500000. */
  variantCount?: number;
  /** Specific mutations to inject (override random generation). */
  mutations?: MutationInjection[];
  /**
   * When true, inject a handful of edge-case lines:
   * one no-call, one line with an extra tab, one empty line.
   * These do not count toward variantCount.
   */
  edgeCases?: boolean;
}

// ─── LCG PRNG ───────────────────────────────────────────────────────────────

/**
 * Linear Congruential Generator (LCG) PRNG.
 *
 * Parameters from Numerical Recipes (Knuth):
 *   X_{n+1} = (a * X_n + c) mod m
 *   a = 1664525, c = 1013904223, m = 2^32
 *
 * Returns a function that yields a float in [0, 1) on each call.
 */
function createPrng(seed: number): () => number {
  // Ensure the seed is a 32-bit unsigned integer
  let state = seed >>> 0;
  return (): number => {
    state = ((Math.imul(1664525, state) + 1013904223) >>> 0);
    return state / 4294967296;
  };
}

// ─── Alphabet & Chromosome Distribution ─────────────────────────────────────

const NUCLEOTIDES: readonly string[] = ['A', 'C', 'G', 'T'];

/**
 * Chromosome distribution weighted by approximate SNP density.
 *
 * Larger chromosomes carry more variants; chr1 has ~8% of genome-wide SNPs.
 * The last three entries represent chrX, chrY, and chrMT.
 * MT is rare in DTC arrays (~100 variants).
 */
const CHROMOSOME_WEIGHTS: Array<{ chr: string; weight: number }> = [
  { chr: '1',  weight: 8.0 },
  { chr: '2',  weight: 7.5 },
  { chr: '3',  weight: 6.2 },
  { chr: '4',  weight: 5.8 },
  { chr: '5',  weight: 5.5 },
  { chr: '6',  weight: 5.3 },
  { chr: '7',  weight: 5.0 },
  { chr: '8',  weight: 4.8 },
  { chr: '9',  weight: 4.3 },
  { chr: '10', weight: 4.5 },
  { chr: '11', weight: 4.5 },
  { chr: '12', weight: 4.4 },
  { chr: '13', weight: 3.3 },
  { chr: '14', weight: 3.0 },
  { chr: '15', weight: 2.8 },
  { chr: '16', weight: 2.9 },
  { chr: '17', weight: 2.7 },
  { chr: '18', weight: 2.5 },
  { chr: '19', weight: 2.2 },
  { chr: '20', weight: 2.3 },
  { chr: '21', weight: 1.5 },
  { chr: '22', weight: 1.4 },
  { chr: 'X',  weight: 3.5 },
  { chr: 'Y',  weight: 0.5 },
  { chr: 'MT', weight: 0.1 },
];

const TOTAL_WEIGHT = CHROMOSOME_WEIGHTS.reduce((s, e) => s + e.weight, 0);

function pickChromosome(rnd: () => number): string {
  let r = rnd() * TOTAL_WEIGHT;
  for (const { chr, weight } of CHROMOSOME_WEIGHTS) {
    r -= weight;
    if (r <= 0) return chr;
  }
  return '1'; // fallback
}

function pickNucleotide(rnd: () => number): string {
  return NUCLEOTIDES[Math.floor(rnd() * 4)] ?? 'A';
}

/** Generate a realistic rsID number. Range: rs1000000 – rs999999999. */
function pickRsid(rnd: () => number, index: number): string {
  // Combine index with random to avoid collisions while keeping it fast
  const num = 1000000 + index * 997 + Math.floor(rnd() * 997);
  return `rs${num}`;
}

/** Generate a realistic chromosome position for a given chromosome. */
function pickPosition(chr: string, rnd: () => number): number {
  const chrSizes: Record<string, number> = {
    '1': 248956422, '2': 242193529, '3': 198295559, '4': 190214555,
    '5': 181538259, '6': 170805979, '7': 159345973, '8': 145138636,
    '9': 138394717, '10': 133797422, '11': 135086622, '12': 133275309,
    '13': 114364328, '14': 107043718, '15': 101991189, '16': 90338345,
    '17': 83257441,  '18': 80373285,  '19': 58617616,  '20': 64444167,
    '21': 46709983,  '22': 50818468,  'X': 156040895,  'Y': 57227415,
    'MT': 16569,
  };
  const size = chrSizes[chr] ?? 100000000;
  return 1 + Math.floor(rnd() * size);
}

// ─── Variant Row Builders ─────────────────────────────────────────────────

interface VariantSpec {
  rsid: string;
  chr: string;
  pos: number;
  genotype: string; // always combined (e.g. 'AG'); factory formats it per-format
}

/**
 * Build a variant spec for a mutation injection.
 * Chromosome and position are deterministic from the rsid string.
 */
function mutationToSpec(mut: MutationInjection, rnd: () => number): VariantSpec {
  // Assign a stable chromosome: derive from rsid hash
  const chrIndex = mut.rsid.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 22;
  const chrEntry = CHROMOSOME_WEIGHTS[chrIndex] ?? CHROMOSOME_WEIGHTS[0];
  const chr = chrEntry!.chr;
  const pos = pickPosition(chr, rnd);
  return { rsid: mut.rsid, chr, pos, genotype: mut.genotype };
}

// ─── Format Renderers ────────────────────────────────────────────────────────

/** Render a list of variant specs as a 23andMe file string. */
function render23andMe(variants: VariantSpec[], edgeCases: boolean): string {
  const lines: string[] = [
    '# This data file generated by 23andMe at: Thu Jan 01 2026',
    '# Below is a description of the file format.',
    '# rsid\tchromosome\tposition\tgenotype',
  ];

  if (edgeCases) {
    // One very long comment line
    lines.push(`# ${'X'.repeat(500)}`);
    // One blank line (valid — parser skips it)
    lines.push('');
  }

  for (const v of variants) {
    lines.push(`${v.rsid}\t${v.chr}\t${v.pos}\t${v.genotype}`);
  }

  if (edgeCases) {
    // One no-call line
    lines.push(`rs9999999\t1\t999999\t--`);
    // One malformed line (only 3 columns)
    lines.push(`rs8888888\t1\t888888`);
  }

  return lines.join('\n');
}

/** Render a list of variant specs as an AncestryDNA file string. */
function renderAncestryDNA(variants: VariantSpec[], edgeCases: boolean): string {
  const lines: string[] = [
    '#AncestryDNA raw data download',
    '#This file was generated by AncestryDNA at: 2026-01-01',
    'rsid\tchromosome\tposition\tallele1\tallele2',
  ];

  if (edgeCases) {
    lines.push(`# ${'Y'.repeat(300)}`);
    lines.push('');
  }

  for (const v of variants) {
    const a1 = v.genotype[0] ?? 'A';
    const a2 = v.genotype[1] ?? 'A';
    lines.push(`${v.rsid}\t${v.chr}\t${v.pos}\t${a1}\t${a2}`);
  }

  if (edgeCases) {
    // No-call line (allele value '0')
    lines.push(`rs9999991\t1\t999999\t0\t0`);
    // Short line (4 cols instead of 5)
    lines.push(`rs8888881\t1\t888888\tA`);
  }

  return lines.join('\n');
}

/** Render a list of variant specs as a MyHeritage/FTDNA CSV file string. */
function renderMyHeritage(variants: VariantSpec[], edgeCases: boolean): string {
  const lines: string[] = ['RSID,CHROMOSOME,POSITION,RESULT'];

  for (const v of variants) {
    lines.push(`${v.rsid},${v.chr},${v.pos},${v.genotype}`);
  }

  if (edgeCases) {
    // No-call line
    lines.push(`rs9999992,1,999999,--`);
    // Short line (only 3 cols)
    lines.push(`rs8888882,1,888888`);
  }

  return lines.join('\n');
}

/** Render a list of variant specs as a VCF file string. */
function renderVcf(variants: VariantSpec[], edgeCases: boolean): string {
  const lines: string[] = [
    '##fileformat=VCFv4.1',
    '##FILTER=<ID=PASS,Description="All filters passed">',
    '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">',
    '##FORMAT=<ID=DP,Number=1,Type=Integer,Description="Read Depth">',
    '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE1',
  ];

  if (edgeCases) {
    // No-call line
    lines.push(`1\t500000\trs9999993\tA\tG\t100\tPASS\t.\tGT:DP\t./.:30`);
    // Line missing rsID (dot) — parser skips it
    lines.push(`1\t600000\t.\tC\tT\t100\tPASS\t.\tGT:DP\t0/1:20`);
  }

  for (const v of variants) {
    const ref = v.genotype[0] ?? 'A';
    const alt = v.genotype[1] ?? 'G';

    // Build GT: if ref==alt, homozygous ref (0/0); if ref!=alt, het (0/1)
    let gt: string;
    if (ref === alt) {
      gt = '0/0';
    } else {
      gt = '0/1';
    }

    // Some variants use phased notation for variety (every 5th)
    const isPhased = parseInt(v.rsid.replace('rs', ''), 10) % 5 === 0;
    if (isPhased) {
      gt = gt.replace('/', '|');
    }

    lines.push(`${v.chr}\t${v.pos}\t${v.rsid}\t${ref}\t${alt}\t100\tPASS\t.\tGT:DP\t${gt}:30`);
  }

  return lines.join('\n');
}

// ─── Main Factory Function ──────────────────────────────────────────────────

/**
 * Generate a synthetic genetic data file.
 *
 * @param options - Generation options
 * @returns File content as a string, ready to pass to the parser
 *
 * @example
 * const content = generateSyntheticGenome({
 *   format: '23andme',
 *   seed: 42,
 *   variantCount: 1000,
 *   mutations: [{ rsid: 'rs334', genotype: 'AT' }],
 * });
 * const result = parse23andMe(content);
 */
export function generateSyntheticGenome(options: SyntheticGenomeOptions): string {
  const {
    format,
    seed,
    variantCount = 500000,
    mutations = [],
    edgeCases = false,
  } = options;

  const rnd = createPrng(seed);

  // Build an injection map for O(1) lookup during generation
  const injectionMap = new Map<string, string>(
    mutations.map(m => [m.rsid, m.genotype]),
  );

  // Build variant specs for all injected mutations first (so they appear in the file)
  const injectedSpecs: VariantSpec[] = mutations.map(m => mutationToSpec(m, rnd));

  // Track rsIDs already covered by injections (so random gen won't accidentally duplicate them)
  const usedRsids = new Set<string>(mutations.map(m => m.rsid));

  // Generate random variants (variantCount - injected mutations)
  const randomCount = Math.max(0, variantCount - injectedSpecs.length);
  const randomSpecs: VariantSpec[] = [];

  for (let i = 0; i < randomCount; i++) {
    const rsid = pickRsid(rnd, i);
    // Skip if this rsid was already used by an injection (rare, but possible)
    let finalRsid: string;
    if (usedRsids.has(rsid)) {
      // Just pick a slightly different rsid by adding an offset
      finalRsid = `rs${1000000 + i * 997 + Math.floor(rnd() * 997) + 500000}`;
    } else {
      usedRsids.add(rsid);
      finalRsid = rsid;
    }
    const chr = pickChromosome(rnd);
    const pos = pickPosition(chr, rnd);
    const allele1 = pickNucleotide(rnd);
    // Make heterozygous variants more common (~30%) — realistic
    const allele2 = rnd() < 0.3 ? pickNucleotide(rnd) : allele1;
    randomSpecs.push({ rsid: finalRsid, chr, pos, genotype: allele1 + allele2 });
  }

  // VCF format: GT encoding means ref==alt → 0/0 (homozygous ref).
  // In the VCF renderer, ref=genotype[0] and alt=genotype[1].
  // If both are the same nucleotide, the parser correctly reads it back as ref+ref.
  // No special handling needed here — the renderer handles it.

  // Combine: injected first (so they are not at the very end), then random
  const allSpecs = [...injectedSpecs, ...randomSpecs];

  // Validate injection map is consistent (only matters for debugging).
  // Build a Set of rsIDs from allSpecs for O(1) lookup instead of O(n) per-injection find().
  // This reduces the validation from O(n*m) to O(n + m) where n = allSpecs, m = injections.
  const allSpecsByRsid = new Map<string, VariantSpec>(allSpecs.map(s => [s.rsid, s]));
  for (const [rsid, genotype] of injectionMap) {
    const spec = allSpecsByRsid.get(rsid);
    if (spec && spec.genotype !== genotype) {
      // This should never happen — injectedSpecs use the mutation genotype directly
      throw new Error(`Internal factory error: injection mismatch for ${rsid}`);
    }
  }

  switch (format) {
    case '23andme':
      return render23andMe(allSpecs, edgeCases);
    case 'ancestrydna':
      return renderAncestryDNA(allSpecs, edgeCases);
    case 'myheritage':
      return renderMyHeritage(allSpecs, edgeCases);
    case 'vcf':
      return renderVcf(allSpecs, edgeCases);
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unknown format: ${String(_exhaustive)}`);
    }
  }
}
