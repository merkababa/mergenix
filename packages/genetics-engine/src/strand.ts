/**
 * Strand Orientation Harmonization Module
 *
 * Different DTC genetic testing providers may report genotypes on opposite
 * DNA strands (forward vs reverse). This module detects and corrects strand
 * orientation by sampling homozygous non-palindromic SNPs and comparing
 * them to known reference alleles.
 *
 * Algorithm:
 * 1. Sample ~1,000 common homozygous SNPs distributed across all autosomes (chr1-22)
 * 2. For each sampled SNP, check if the genotype matches the reference allele
 *    or its complement
 * 3. The reference SNP list should only contain non-palindromic sites
 *    (A/C, A/G, C/T, G/T polymorphisms). Palindromic A/T and C/G sites
 *    are excluded at curation time, not at runtime analysis.
 * 4. If >90% of sampled SNPs match the complement rather than reference,
 *    the file is on the reverse strand — flip all alleles
 */

import { complementAllele } from './utils';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Result of strand orientation analysis. */
export interface StrandAnalysisResult {
  /** Whether the file appears to be on the reverse strand. */
  isReverseStrand: boolean;
  /** Confidence of the determination (0-1). */
  confidence: number;
  /** Number of non-palindromic SNPs sampled. */
  snpsSampled: number;
  /** Number that matched forward strand (reference alleles). */
  forwardMatches: number;
  /** Number that matched reverse strand (complement alleles). */
  reverseMatches: number;
  /** Whether the determination was ambiguous (neither >90% threshold met). */
  isAmbiguous: boolean;
}

/** Reference allele data for strand detection. */
export interface ReferenceAllele {
  rsid: string;
  chromosome: string;
  /** The allele on the forward (plus) strand. */
  referenceAllele: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Default number of SNPs to sample for strand analysis. */
const DEFAULT_SAMPLE_SIZE = 1000;

/** Default fraction threshold for strand call. */
const DEFAULT_THRESHOLD = 0.9;

/** Minimum number of informative SNPs required for a non-ambiguous call. */
const MIN_INFORMATIVE_SNPS = 10;

/**
 * Built-in reference alleles for strand detection (subset).
 *
 * In production, the full list (~10,000+) would be loaded from data files.
 * These are well-characterized SNPs with established forward-strand reference
 * alleles, distributed across all 22 autosomes.
 *
 * Selection criteria:
 * - Common SNPs with high genotyping rates across DTC platforms
 * - Reference alleles that form non-palindromic pairs with the most common
 *   alternate allele (i.e., ref is A or C when alt is G or C/T respectively)
 * - Spread across all 22 autosomes for representative sampling
 */
export const STRAND_REFERENCE_SNPS: ReferenceAllele[] = [
  // Chromosome 1
  { rsid: 'rs1801133', chromosome: '1', referenceAllele: 'C' }, // MTHFR C677T
  { rsid: 'rs1801131', chromosome: '1', referenceAllele: 'A' }, // MTHFR A1298C
  { rsid: 'rs6025', chromosome: '1', referenceAllele: 'C' }, // Factor V Leiden

  // Chromosome 2
  { rsid: 'rs1799963', chromosome: '11', referenceAllele: 'G' }, // Prothrombin G20210A
  { rsid: 'rs4988235', chromosome: '2', referenceAllele: 'G' }, // MCM6/LCT lactase

  // Chromosome 3
  { rsid: 'rs13078960', chromosome: '3', referenceAllele: 'T' }, // CADM2 gene, chr3 tag SNP
  { rsid: 'rs2187668', chromosome: '3', referenceAllele: 'C' }, // chr3 tag

  // Chromosome 4
  { rsid: 'rs13117307', chromosome: '4', referenceAllele: 'G' }, // chr4 tag SNP
  { rsid: 'rs6822844', chromosome: '4', referenceAllele: 'G' }, // IL2/IL21 region

  // Chromosome 5
  { rsid: 'rs2706399', chromosome: '5', referenceAllele: 'A' }, // chr5 tag SNP
  { rsid: 'rs6897932', chromosome: '5', referenceAllele: 'C' }, // IL7R

  // Chromosome 6
  { rsid: 'rs1800629', chromosome: '6', referenceAllele: 'G' }, // TNF promoter 6p21.33
  { rsid: 'rs3129882', chromosome: '6', referenceAllele: 'A' }, // HLA region
  { rsid: 'rs9275596', chromosome: '6', referenceAllele: 'C' }, // HLA-DQB1

  // Chromosome 7
  { rsid: 'rs6943474', chromosome: '7', referenceAllele: 'G' }, // chr7 tag SNP
  { rsid: 'rs4728142', chromosome: '7', referenceAllele: 'A' }, // IRF5 region

  // Chromosome 8
  { rsid: 'rs2736100', chromosome: '5', referenceAllele: 'A' }, // TERT region proxy
  { rsid: 'rs7014346', chromosome: '8', referenceAllele: 'A' }, // 8q24 region

  // Chromosome 9
  { rsid: 'rs10811661', chromosome: '9', referenceAllele: 'C' }, // CDKN2A/B region
  { rsid: 'rs10511789', chromosome: '9', referenceAllele: 'A' }, // chr9 tag SNP

  // Chromosome 10
  { rsid: 'rs7903146', chromosome: '10', referenceAllele: 'C' }, // TCF7L2
  { rsid: 'rs11187129', chromosome: '10', referenceAllele: 'G' }, // PTEN region

  // Chromosome 11
  { rsid: 'rs1800497', chromosome: '11', referenceAllele: 'G' }, // ANKK1/DRD2 Taq1A
  { rsid: 'rs7480010', chromosome: '11', referenceAllele: 'A' }, // chr11 tag

  // Chromosome 12
  { rsid: 'rs3184504', chromosome: '12', referenceAllele: 'C' }, // SH2B3
  { rsid: 'rs11171739', chromosome: '12', referenceAllele: 'C' }, // chr12 tag

  // Chromosome 13
  { rsid: 'rs9585056', chromosome: '13', referenceAllele: 'A' }, // chr13 tag SNP
  { rsid: 'rs7329174', chromosome: '13', referenceAllele: 'G' }, // chr13 tag

  // Chromosome 14
  { rsid: 'rs2104286', chromosome: '14', referenceAllele: 'A' }, // IL2RA region proxy
  { rsid: 'rs1950897', chromosome: '14', referenceAllele: 'G' }, // chr14 tag

  // Chromosome 15
  { rsid: 'rs12913832', chromosome: '15', referenceAllele: 'G' }, // HERC2/OCA2 eye color
  { rsid: 'rs1426654', chromosome: '15', referenceAllele: 'A' }, // SLC24A5 skin pigment

  // Chromosome 16
  { rsid: 'rs12325489', chromosome: '16', referenceAllele: 'C' }, // FTO region proxy
  { rsid: 'rs12325655', chromosome: '16', referenceAllele: 'C' }, // FTO region, C/T non-palindromic

  // Chromosome 17
  { rsid: 'rs1042522', chromosome: '17', referenceAllele: 'G' }, // TP53 Arg72Pro
  { rsid: 'rs4680', chromosome: '22', referenceAllele: 'G' }, // COMT Val158Met

  // Chromosome 18
  { rsid: 'rs7241918', chromosome: '18', referenceAllele: 'G' }, // chr18 tag SNP
  { rsid: 'rs1893217', chromosome: '18', referenceAllele: 'C' }, // PTPN2

  // Chromosome 19
  { rsid: 'rs429358', chromosome: '19', referenceAllele: 'C' }, // APOE e4 defining
  { rsid: 'rs7412', chromosome: '19', referenceAllele: 'C' }, // APOE e2 defining

  // Chromosome 20
  { rsid: 'rs6077690', chromosome: '20', referenceAllele: 'A' }, // chr20 tag SNP
  { rsid: 'rs2236012', chromosome: '20', referenceAllele: 'G' }, // chr20 tag

  // Chromosome 21
  { rsid: 'rs2837960', chromosome: '21', referenceAllele: 'A' }, // chr21 tag SNP
  { rsid: 'rs2830585', chromosome: '21', referenceAllele: 'G' }, // chr21 tag

  // Chromosome 22
  { rsid: 'rs5993883', chromosome: '2', referenceAllele: 'G' }, // UGT1A region
  { rsid: 'rs738409', chromosome: '22', referenceAllele: 'C' }, // PNPLA3
];

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Check if two alleles form a palindromic pair (complement of each other).
 *
 * Palindromic pairs: A<->T, C<->G
 * These cannot distinguish strand orientation because the genotype looks
 * identical on both strands.
 *
 * @param allele1 - First allele (single nucleotide: A, C, G, or T)
 * @param allele2 - Second allele (single nucleotide: A, C, G, or T)
 * @returns True if the alleles are complements of each other
 *
 * @example
 * isPalindromicPair("A", "T") // true  — complement pair
 * isPalindromicPair("C", "G") // true  — complement pair
 * isPalindromicPair("A", "C") // false — non-palindromic
 * isPalindromicPair("G", "T") // false — non-palindromic
 */
export function isPalindromicPair(allele1: string, allele2: string): boolean {
  const a = allele1.toUpperCase();
  const b = allele2.toUpperCase();
  return (
    (a === 'A' && b === 'T') ||
    (a === 'T' && b === 'A') ||
    (a === 'C' && b === 'G') ||
    (a === 'G' && b === 'C')
  );
}

/**
 * Deterministic pseudo-random sampling of items distributed across chromosomes.
 *
 * This uses a simple approach: group by chromosome, then take proportional
 * samples from each chromosome to ensure even distribution. Items within
 * each chromosome group are taken in order (deterministic).
 *
 * @param items - Array of items to sample from
 * @param getChromosome - Function to extract chromosome from an item
 * @param targetCount - Target number of items to return
 * @returns Sampled subset of items, distributed across chromosomes
 */
function sampleAcrossChromosomes<T>(
  items: T[],
  getChromosome: (item: T) => string,
  targetCount: number,
): T[] {
  if (items.length <= targetCount) {
    return items;
  }

  // Group by chromosome
  const byChromosome = new Map<string, T[]>();
  for (const item of items) {
    const chr = getChromosome(item);
    const group = byChromosome.get(chr);
    if (group) {
      group.push(item);
    } else {
      byChromosome.set(chr, [item]);
    }
  }

  const chromosomes = Array.from(byChromosome.keys()).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  const result: T[] = [];
  const numChromosomes = chromosomes.length;

  // Base allocation per chromosome + remainder distribution
  const basePerChromosome = Math.floor(targetCount / numChromosomes);
  let remainder = targetCount - basePerChromosome * numChromosomes;

  for (const chr of chromosomes) {
    const group = byChromosome.get(chr)!;
    let take = basePerChromosome;
    if (remainder > 0) {
      take += 1;
      remainder -= 1;
    }
    // Take up to `take` items, but no more than available
    const count = Math.min(take, group.length);
    for (let i = 0; i < count; i++) {
      result.push(group[i]!);
    }
  }

  // If some chromosomes had fewer items than their allocation, fill from
  // chromosomes that have surplus
  if (result.length < targetCount) {
    const taken = new Set(result);
    for (const chr of chromosomes) {
      if (result.length >= targetCount) break;
      const group = byChromosome.get(chr)!;
      for (const item of group) {
        if (result.length >= targetCount) break;
        if (!taken.has(item)) {
          result.push(item);
          taken.add(item);
        }
      }
    }
  }

  return result;
}

/**
 * Analyze strand orientation by sampling homozygous non-palindromic SNPs.
 *
 * For each sampled SNP, compares the homozygous allele to the known reference:
 * - If the allele matches the reference => forward strand match
 * - If the allele matches the complement of the reference => reverse strand match
 * - If neither matches => variant site (not informative, skipped)
 *
 * @param genotypes - Map of rsid to genotype string (e.g., "AA", "CC")
 * @param referenceAlleles - Array of reference allele definitions
 * @param sampleSize - Target number of SNPs to sample (default: 1000)
 * @param threshold - Fraction threshold for strand call (default: 0.9)
 * @returns Analysis result with strand determination
 *
 * @example
 * const result = analyzeStrand(
 *   { rs1801133: 'CC', rs429358: 'CC' },
 *   STRAND_REFERENCE_SNPS,
 * );
 * // result.isReverseStrand === false (alleles match reference)
 */
export function analyzeStrand(
  genotypes: Record<string, string>,
  referenceAlleles: ReferenceAllele[],
  sampleSize?: number,
  threshold?: number,
): StrandAnalysisResult {
  const targetSample = sampleSize ?? DEFAULT_SAMPLE_SIZE;
  const strandThreshold = threshold ?? DEFAULT_THRESHOLD;

  // Step 1: Find eligible SNPs — present in genotypes, homozygous, informative
  const eligible: Array<{ ref: ReferenceAllele; allele: string }> = [];

  for (const ref of referenceAlleles) {
    const genotype = genotypes[ref.rsid];
    if (genotype === undefined || genotype.length !== 2) {
      continue;
    }

    // Must be homozygous
    const allele1 = genotype[0]!;
    const allele2 = genotype[1]!;
    if (allele1.toUpperCase() !== allele2.toUpperCase()) {
      continue;
    }

    const sampleAllele = allele1.toUpperCase();
    const refAllele = ref.referenceAllele.toUpperCase();

    // Compute complement of reference
    let refComplement: string;
    try {
      refComplement = complementAllele(refAllele);
    } catch {
      // Invalid nucleotide in reference — skip
      continue;
    }

    // The sample allele must be either the reference or its complement
    // to be informative. If it's something else entirely, it's a variant
    // site and not useful for strand detection.
    if (sampleAllele !== refAllele && sampleAllele !== refComplement) {
      continue;
    }

    eligible.push({ ref, allele: sampleAllele });
  }

  // Step 2: Sample across chromosomes for even distribution
  const sampled = sampleAcrossChromosomes(eligible, (item) => item.ref.chromosome, targetSample);

  // Step 3: Count forward vs reverse matches
  let forwardMatches = 0;
  let reverseMatches = 0;

  for (const item of sampled) {
    const refAllele = item.ref.referenceAllele.toUpperCase();
    const refComplement = complementAllele(refAllele);

    if (item.allele === refAllele) {
      forwardMatches++;
    } else if (item.allele === refComplement) {
      reverseMatches++;
    }
    // else: neither match — should not happen after pre-filtering, but skip
  }

  const totalInformative = forwardMatches + reverseMatches;

  // Step 4: Determine strand orientation
  if (totalInformative < MIN_INFORMATIVE_SNPS) {
    // Insufficient data for reliable determination
    return {
      isReverseStrand: false,
      confidence: 0,
      snpsSampled: sampled.length,
      forwardMatches,
      reverseMatches,
      isAmbiguous: true,
    };
  }

  const forwardFraction = forwardMatches / totalInformative;
  const reverseFraction = reverseMatches / totalInformative;

  if (reverseFraction >= strandThreshold) {
    return {
      isReverseStrand: true,
      confidence: reverseFraction,
      snpsSampled: sampled.length,
      forwardMatches,
      reverseMatches,
      isAmbiguous: false,
    };
  }

  if (forwardFraction >= strandThreshold) {
    return {
      isReverseStrand: false,
      confidence: forwardFraction,
      snpsSampled: sampled.length,
      forwardMatches,
      reverseMatches,
      isAmbiguous: false,
    };
  }

  // Neither threshold met — ambiguous
  return {
    isReverseStrand: false,
    confidence: Math.max(forwardFraction, reverseFraction),
    snpsSampled: sampled.length,
    forwardMatches,
    reverseMatches,
    isAmbiguous: true,
  };
}

/**
 * Flip all genotype alleles to the opposite strand.
 *
 * Used when strand analysis detects reverse strand orientation.
 * Each nucleotide in every genotype string is replaced with its complement:
 * A<->T, C<->G.
 *
 * Returns a new object — the input is never mutated.
 *
 * @param genotypes - Original genotype map (rsid to genotype string)
 * @returns New genotype map with all alleles complemented
 *
 * @example
 * flipStrand({ rs123: "AG", rs456: "CC" })
 * // => { rs123: "TC", rs456: "GG" }
 */
export function flipStrand(genotypes: Record<string, string>): Record<string, string> {
  const flipped: Record<string, string> = {};

  for (const [rsid, genotype] of Object.entries(genotypes)) {
    let complemented = '';
    for (let i = 0; i < genotype.length; i++) {
      const char = genotype[i]!;
      try {
        complemented += complementAllele(char);
      } catch {
        // Non-nucleotide character (e.g., '-', 'D', 'I' for indels) — keep as-is
        complemented += char;
      }
    }
    flipped[rsid] = complemented;
  }

  return flipped;
}

/**
 * Harmonize strand orientation — detect and fix if needed.
 *
 * This is the main entry point used by the analysis pipeline.
 * It analyzes the strand orientation of the input genotypes, and if the
 * file is determined to be on the reverse strand, flips all alleles to
 * the forward strand.
 *
 * If the determination is ambiguous (neither forward nor reverse exceeds
 * the threshold), the original genotypes are returned unchanged with a
 * warning in the analysis result.
 *
 * @param genotypes - Map of rsid to genotype string
 * @param referenceAlleles - Array of reference allele definitions
 * @returns Object with harmonized genotypes and analysis result
 *
 * @example
 * const { genotypes: harmonized, analysis } = harmonizeStrand(rawGenotypes, STRAND_REFERENCE_SNPS);
 * if (analysis.isReverseStrand) {
 *   console.log('File was on reverse strand — alleles flipped');
 * }
 */
export function harmonizeStrand(
  genotypes: Record<string, string>,
  referenceAlleles: ReferenceAllele[],
): { genotypes: Record<string, string>; analysis: StrandAnalysisResult } {
  const analysis = analyzeStrand(genotypes, referenceAlleles);

  if (analysis.isAmbiguous) {
    // Don't flip — return original with warning
    return { genotypes, analysis };
  }

  if (analysis.isReverseStrand) {
    return { genotypes: flipStrand(genotypes), analysis };
  }

  return { genotypes, analysis };
}
