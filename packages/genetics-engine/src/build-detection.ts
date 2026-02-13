/**
 * Genome Build Detection
 *
 * Detects whether a genetic data file uses GRCh37 (hg19) or GRCh38 (hg38)
 * coordinates. Most DTC (direct-to-consumer) providers output GRCh37, but
 * newer files (especially WGS VCFs) may use GRCh38.
 *
 * Detection strategy (in priority order):
 * 1. Check file headers/comments for build info
 *    - VCF: `##reference=` line, `##contig=` lines with known chromosome lengths
 *    - 23andMe: `# build 37` or `# build 38` comments
 * 2. Use sentinel SNP positions -- well-known SNPs whose chromosome positions
 *    differ between builds. If >90% match one build, classify as that build.
 * 3. Default to GRCh37 with low confidence (most DTC data is hg19).
 */

import type { GenomeBuild } from '@mergenix/shared-types';

// ─── Types ──────────────────────────────────────────────────────────────────

/** A sentinel SNP used for build detection. */
export interface SentinelSnp {
  rsid: string;
  chromosome: string;
  grch37Position: number;
  grch38Position: number;
}

/** Build detection result. */
export interface BuildDetectionResult {
  /** Detected genome build. */
  build: GenomeBuild;
  /** Confidence score (0-1). */
  confidence: number;
  /** Method used for detection. */
  method: 'header' | 'sentinel' | 'default';
  /** Sentinel match counts (present when method is 'sentinel'). */
  sentinelMatches?: {
    grch37: number;
    grch38: number;
    total: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Known chromosome 1 lengths for build detection from VCF ##contig lines. */
const CHR1_LENGTH_GRCH37 = 249250621;
const CHR1_LENGTH_GRCH38 = 248956422;

/** Minimum confidence threshold for sentinel-based detection. */
const SENTINEL_CONFIDENCE_THRESHOLD = 0.9;

/**
 * Well-known sentinel SNPs for build detection.
 *
 * These SNPs have different positions in GRCh37 vs GRCh38. They are
 * distributed across 17 chromosomes for robustness. All positions have
 * been verified against NCBI dbSNP (accessed 2026-02).
 */
export const SENTINEL_SNPS: readonly SentinelSnp[] = [
  // Chromosome 1 -- MTHFR C677T
  { rsid: 'rs1801133', chromosome: '1', grch37Position: 11856378, grch38Position: 11796321 },
  // Chromosome 1 -- Factor V Leiden
  { rsid: 'rs6025', chromosome: '1', grch37Position: 169519049, grch38Position: 169549811 },
  // Chromosome 2 -- LCT (lactase persistence)
  { rsid: 'rs4988235', chromosome: '2', grch37Position: 136608646, grch38Position: 135851076 },
  // Chromosome 3 -- PPARG Pro12Ala
  { rsid: 'rs1801282', chromosome: '3', grch37Position: 12393125, grch38Position: 12351626 },
  // Chromosome 4 -- ADH1B (alcohol metabolism)
  { rsid: 'rs1229984', chromosome: '4', grch37Position: 100239319, grch38Position: 99318162 },
  // Chromosome 5 -- SLC45A2 (skin pigmentation)
  { rsid: 'rs16891982', chromosome: '5', grch37Position: 33951693, grch38Position: 33951588 },
  // Chromosome 6 -- OPRM1 (opioid receptor)
  { rsid: 'rs1799971', chromosome: '6', grch37Position: 154360797, grch38Position: 154039662 },
  // Chromosome 7 -- IL6 (interleukin-6)
  { rsid: 'rs1800795', chromosome: '7', grch37Position: 22766645, grch38Position: 22727026 },
  // Chromosome 8 -- ADRB3 (beta-3 adrenergic receptor)
  { rsid: 'rs4994', chromosome: '8', grch37Position: 37823798, grch38Position: 37966280 },
  // Chromosome 10 -- TCF7L2 (type 2 diabetes)
  { rsid: 'rs7903146', chromosome: '10', grch37Position: 114758349, grch38Position: 112998590 },
  // Chromosome 11 -- HBB sickle cell variant
  { rsid: 'rs334', chromosome: '11', grch37Position: 5248232, grch38Position: 5227002 },
  // Chromosome 11 -- TYR (tyrosinase, pigmentation)
  { rsid: 'rs1042602', chromosome: '11', grch37Position: 88911696, grch38Position: 89178528 },
  // Chromosome 12 -- SH2B3 (celiac/autoimmune)
  { rsid: 'rs3184504', chromosome: '12', grch37Position: 111884608, grch38Position: 111446804 },
  // Chromosome 14 -- near SYNE2
  { rsid: 'rs11623866', chromosome: '14', grch37Position: 65453063, grch38Position: 64986345 },
  // Chromosome 15 -- HERC2/OCA2 (eye color)
  { rsid: 'rs12913832', chromosome: '15', grch37Position: 28365618, grch38Position: 28120472 },
  // Chromosome 16 -- FTO (obesity)
  { rsid: 'rs9939609', chromosome: '16', grch37Position: 53820527, grch38Position: 53786615 },
  // Chromosome 16 -- MC1R (red hair)
  { rsid: 'rs1805007', chromosome: '16', grch37Position: 89986117, grch38Position: 89919709 },
  // Chromosome 17 -- COL1A1
  { rsid: 'rs1800012', chromosome: '17', grch37Position: 48277749, grch38Position: 50200388 },
  // Chromosome 19 -- APOE epsilon-4
  { rsid: 'rs429358', chromosome: '19', grch37Position: 45411941, grch38Position: 44908684 },
  // Chromosome 19 -- APOE epsilon-2
  { rsid: 'rs7412', chromosome: '19', grch37Position: 45412079, grch38Position: 44908822 },
  // Chromosome 22 -- COMT Val158Met
  { rsid: 'rs4680', chromosome: '22', grch37Position: 19951271, grch38Position: 19963748 },
] as const;

// ─── Header-Based Detection ─────────────────────────────────────────────────

/**
 * Detect genome build from file headers.
 *
 * Checks for build information in:
 * - VCF `##reference=` lines (e.g., `##reference=GRCh37`)
 * - VCF `##contig=` lines with known chromosome 1 lengths
 * - 23andMe `# build 37` or `# build 38` comments
 *
 * @param headerLines - Array of header/comment lines from the file
 * @returns Detection result, or null if no header clues found
 */
export function detectBuildFromHeaders(headerLines: string[]): BuildDetectionResult | null {
  for (const line of headerLines) {
    const lower = line.toLowerCase();

    // ── VCF: ##reference= line ──────────────────────────────────────────
    if (lower.startsWith('##reference=') || lower.startsWith('##reference =')) {
      if (lower.includes('grch38') || lower.includes('hg38')) {
        return { build: 'GRCh38', confidence: 1.0, method: 'header' };
      }
      if (lower.includes('grch37') || lower.includes('hg19') || lower.includes('b37')) {
        return { build: 'GRCh37', confidence: 1.0, method: 'header' };
      }
    }

    // ── VCF: ##contig= line with known chr1 length ──────────────────────
    if (lower.startsWith('##contig=')) {
      // Parse length from the contig line, e.g., ##contig=<ID=1,length=249250621>
      const lengthMatch = line.match(/length=(\d+)/i);
      const idMatch = line.match(/ID=(?:chr)?1(?:,|>)/i);
      if (lengthMatch && idMatch) {
        const length = parseInt(lengthMatch[1] ?? '0', 10);
        if (length === CHR1_LENGTH_GRCH37) {
          return { build: 'GRCh37', confidence: 0.95, method: 'header' };
        }
        if (length === CHR1_LENGTH_GRCH38) {
          return { build: 'GRCh38', confidence: 0.95, method: 'header' };
        }
      }
    }

    // ── 23andMe: # build NN comment ─────────────────────────────────────
    // Common patterns: "# build 37", "# This data... build 37 positions"
    const buildMatch = lower.match(/\bbuild\s+(\d+)\b/);
    if (buildMatch) {
      const buildNum = buildMatch[1];
      if (buildNum === '38') {
        return { build: 'GRCh38', confidence: 1.0, method: 'header' };
      }
      if (buildNum === '37' || buildNum === '36') {
        // Build 36 (hg18) is very rare; treat as GRCh37 with slightly lower confidence
        const confidence = buildNum === '37' ? 1.0 : 0.8;
        return { build: 'GRCh37', confidence, method: 'header' };
      }
    }

    // ── VCF: ##assembly= line ───────────────────────────────────────────
    if (lower.startsWith('##assembly=') || lower.startsWith('##assembly =')) {
      if (lower.includes('grch38') || lower.includes('hg38')) {
        return { build: 'GRCh38', confidence: 1.0, method: 'header' };
      }
      if (lower.includes('grch37') || lower.includes('hg19') || lower.includes('b37')) {
        return { build: 'GRCh37', confidence: 1.0, method: 'header' };
      }
    }
  }

  return null;
}

// ─── Sentinel-Based Detection ───────────────────────────────────────────────

/**
 * Detect genome build using sentinel SNPs.
 *
 * Compares positions of well-known SNPs in the file against their known
 * GRCh37 and GRCh38 positions. If >90% of matched sentinels agree on
 * one build, classifies as that build.
 *
 * @param snpPositions - Map of rsid to { chromosome, position } from the parsed file
 * @returns Detection result with sentinel match statistics
 */
export function detectBuildFromSentinels(
  snpPositions: Map<string, { chromosome: string; position: number }>,
): BuildDetectionResult {
  let grch37Matches = 0;
  let grch38Matches = 0;
  let totalChecked = 0;

  for (const sentinel of SENTINEL_SNPS) {
    const snpData = snpPositions.get(sentinel.rsid);
    if (!snpData) {
      continue;
    }

    // Normalize chromosome representation (strip leading "chr" prefix)
    const normalizedChr = snpData.chromosome.replace(/^chr/i, '');
    if (normalizedChr !== sentinel.chromosome) {
      continue;
    }

    totalChecked++;

    if (snpData.position === sentinel.grch37Position) {
      grch37Matches++;
    }
    if (snpData.position === sentinel.grch38Position) {
      grch38Matches++;
    }
  }

  // No sentinel SNPs found in the file
  if (totalChecked === 0) {
    return {
      build: 'unknown',
      confidence: 0,
      method: 'sentinel',
      sentinelMatches: { grch37: 0, grch38: 0, total: 0 },
    };
  }

  const grch37Ratio = grch37Matches / totalChecked;
  const grch38Ratio = grch38Matches / totalChecked;

  // Clear match for GRCh38
  if (grch38Ratio >= SENTINEL_CONFIDENCE_THRESHOLD && grch38Ratio > grch37Ratio) {
    return {
      build: 'GRCh38',
      confidence: grch38Ratio,
      method: 'sentinel',
      sentinelMatches: { grch37: grch37Matches, grch38: grch38Matches, total: totalChecked },
    };
  }

  // Clear match for GRCh37
  if (grch37Ratio >= SENTINEL_CONFIDENCE_THRESHOLD && grch37Ratio > grch38Ratio) {
    return {
      build: 'GRCh37',
      confidence: grch37Ratio,
      method: 'sentinel',
      sentinelMatches: { grch37: grch37Matches, grch38: grch38Matches, total: totalChecked },
    };
  }

  // Ambiguous -- neither build reaches the confidence threshold
  return {
    build: 'unknown',
    confidence: Math.max(grch37Ratio, grch38Ratio),
    method: 'sentinel',
    sentinelMatches: { grch37: grch37Matches, grch38: grch38Matches, total: totalChecked },
  };
}

// ─── Main Detection Function ────────────────────────────────────────────────

/**
 * Detect the genome build of a genetic data file.
 *
 * Tries detection methods in priority order:
 * 1. Header-based detection (highest confidence)
 * 2. Sentinel SNP position matching
 * 3. Default to GRCh37 with low confidence (most DTC data is hg19)
 *
 * @param headerLines - Array of header/comment lines from the file
 * @param snpPositions - Map of rsid to { chromosome, position } from the parsed file
 * @returns Detection result with build, confidence, and method used
 */
export function detectGenomeBuild(
  headerLines: string[],
  snpPositions: Map<string, { chromosome: string; position: number }>,
): BuildDetectionResult {
  // 1. Try header-based detection first (most reliable)
  const headerResult = detectBuildFromHeaders(headerLines);
  if (headerResult !== null) {
    return headerResult;
  }

  // 2. Try sentinel SNP matching
  const sentinelResult = detectBuildFromSentinels(snpPositions);
  if (sentinelResult.build !== 'unknown') {
    return sentinelResult;
  }

  // If sentinels were checked but inconclusive, still return the sentinel result
  // so the caller can see the match counts
  if (sentinelResult.sentinelMatches && sentinelResult.sentinelMatches.total > 0) {
    return sentinelResult;
  }

  // 3. Default to GRCh37 with low confidence
  // Most DTC genetic data files (23andMe, AncestryDNA, MyHeritage) use GRCh37.
  return {
    build: 'GRCh37',
    confidence: 0.5,
    method: 'default',
  };
}
