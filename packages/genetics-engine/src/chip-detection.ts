/**
 * Chip Version/Density Detection Module
 *
 * Detects the DTC genotyping chip version and provider from file format,
 * SNP count, and optional marker SNP presence. Returns chip-specific notes
 * about coverage limitations for display in analysis reports.
 *
 * This module uses the ChipVersion type from shared-types (which includes
 * snpCount on the result) and provides additional notes about known
 * coverage gaps per chip/provider combination.
 *
 * @module chip-detection
 */

import type { ChipVersion, FileFormat } from '@mergenix/shared-types';

// ─── Engine Version ──────────────────────────────────────────────────────────

/**
 * Engine version string, exported for metadata embedding.
 *
 * This constant is the single canonical source of truth for the engine
 * version. Imported by worker.ts and re-exported from index.ts.
 */
export const ENGINE_VERSION = '3.1.0';

// ─── Chip Profile Definitions ────────────────────────────────────────────────

/**
 * Known chip profile for detection.
 *
 * Encodes the expected SNP count range and optional marker SNPs
 * that uniquely identify a specific chip version from a DTC provider.
 */
interface ChipProfile {
  /** DTC provider name (e.g., "23andMe", "AncestryDNA"). */
  provider: string;
  /** Chip version identifier (e.g., "v3", "v4", "v5"). */
  version: string;
  /** Expected total SNP count range [min, max] (inclusive). */
  snpCountRange: [number, number];
  /**
   * Marker SNPs unique to this chip version.
   * These rsIDs are present on this specific chip but absent from others
   * of the same provider, enabling reliable version differentiation.
   */
  markerSnps: string[];
  /**
   * File format that this chip profile corresponds to.
   * Used to filter profiles when format is known.
   */
  format: FileFormat;
}

/**
 * Well-known DTC chip profiles with SNP count ranges and marker SNPs.
 *
 * Ranges include ~15% tolerance to account for data quality filtering,
 * no-calls, and minor version differences in file exports.
 *
 * Sources:
 * - 23andMe: https://customercare.23andme.com/hc/en-us/articles/212196868
 * - AncestryDNA: Community-documented SNP counts
 * - MyHeritage: Single known chip version (OmniExpress-based)
 */
const CHIP_PROFILES: ChipProfile[] = [
  {
    provider: '23andMe',
    version: 'v3',
    snpCountRange: [850000, 1050000],
    markerSnps: ['rs4851251', 'rs2296442', 'rs2032582'],
    format: '23andme',
  },
  {
    provider: '23andMe',
    version: 'v4',
    snpCountRange: [500000, 620000],
    markerSnps: [],
    format: '23andme',
  },
  {
    provider: '23andMe',
    version: 'v5',
    snpCountRange: [590000, 720000],
    markerSnps: ['rs548049170', 'rs13354714', 'rs2298108'],
    format: '23andme',
  },
  {
    provider: 'AncestryDNA',
    version: 'v1',
    snpCountRange: [680000, 750000],
    markerSnps: [],
    format: 'ancestrydna',
  },
  {
    provider: 'AncestryDNA',
    version: 'v2',
    snpCountRange: [600000, 690000],
    markerSnps: ['rs548049170', 'rs13354714'],
    format: 'ancestrydna',
  },
  {
    provider: 'MyHeritage',
    version: 'v1',
    snpCountRange: [600000, 800000],
    markerSnps: [],
    format: 'myheritage',
  },
];

/**
 * Coverage limitation notes for specific chip/provider combinations.
 *
 * These notes inform users about known gaps in SNP coverage that may
 * affect the reliability of certain analysis results (carrier screening,
 * PGx, PRS, etc.).
 */
const CHIP_NOTES: Record<string, string> = {
  '23andMe:v3':
    '23andMe v3 (OmniExpress Plus, ~960K SNPs) has the broadest coverage ' +
    'of any consumer chip, but still cannot detect structural variants, ' +
    'CNVs, or gene deletions/duplications.',
  '23andMe:v4':
    '23andMe v4 (HumanOmniExpress-24, ~570K SNPs) has reduced coverage ' +
    'compared to v3. Some rare CFTR and CYP2D6 variants covered in v3 ' +
    'are absent on v4, which may affect carrier and pharmacogenomic results. ' +
    'Cannot detect structural variants, CNVs, or gene deletions/duplications.',
  '23andMe:v5':
    '23andMe v5 (Illumina GSA, ~640K SNPs) uses a different backbone than ' +
    'v3/v4. Some variants previously tested on OmniExpress are not present ' +
    'on the GSA platform. PGx and rare carrier variant coverage may differ. ' +
    'Cannot detect structural variants, CNVs, or gene deletions/duplications.',
  'AncestryDNA:v1':
    'AncestryDNA v1 (OmniExpress, ~700K SNPs) has good overall coverage ' +
    'but was designed primarily for ancestry estimation. Pharmacogenomic ' +
    'and rare disease variant coverage is more limited than clinical arrays. ' +
    'Like all consumer arrays, it cannot detect structural variants, CNVs, ' +
    'or gene deletions/duplications.',
  'AncestryDNA:v2':
    'AncestryDNA v2 (GSA-based, ~670K SNPs) shares the GSA backbone with ' +
    '23andMe v5 but with a different custom content panel. Some carrier ' +
    'screening variants from v1 may not be present on v2. Cannot detect ' +
    'structural variants, CNVs, or gene deletions/duplications.',
  'MyHeritage:v1':
    'MyHeritage v1 (OmniExpress-based, ~700K SNPs) provides broad coverage ' +
    'but pharmacogenomic and rare variant content is limited compared to ' +
    'clinical genotyping panels. Cannot detect structural variants, CNVs, ' +
    'or gene deletions/duplications.',
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Detect chip version from file format, SNP count, and optional genotype data.
 *
 * Uses a two-phase approach:
 * 1. Filter chip profiles by provider (determined from format)
 * 2. Match by SNP count range, then refine with marker SNP presence
 *
 * Returns null for VCF files (which are not from a specific DTC chip),
 * unknown formats, or when no profile matches the observed data.
 *
 * @param format - Detected file format (e.g., "23andme", "ancestrydna")
 * @param snpCount - Total number of parsed SNPs
 * @param genotypes - Optional genotype map for marker SNP verification.
 *   When provided, marker SNPs are checked for presence to increase
 *   detection confidence. When omitted, detection relies solely on
 *   SNP count ranges (lower confidence).
 * @returns Detected ChipVersion with confidence score, or null if
 *   the format is VCF, unknown, or no profile matches
 *
 * @example
 * // Detect from a 23andMe file with ~640K SNPs
 * const chip = detectChipVersion('23andme', 642000);
 * // Returns: { provider: '23andMe', version: 'v5', snpCount: 642000, confidence: 0.6 }
 *
 * @example
 * // Detect with marker SNPs for higher confidence
 * const chip = detectChipVersion('23andme', 642000, { rs548049170: 'AG', ... });
 * // Returns: { provider: '23andMe', version: 'v5', snpCount: 642000, confidence: 0.9 }
 *
 * @example
 * // VCF files return null (no DTC chip detection)
 * const chip = detectChipVersion('vcf', 4000000);
 * // Returns: null
 */
export function detectChipVersion(
  format: string,
  snpCount: number,
  genotypes?: Record<string, string>,
): ChipVersion | null {
  // VCF and unknown formats are not from DTC chips
  if (format === 'vcf' || format === 'unknown') {
    return null;
  }

  // Filter profiles to the relevant provider based on format
  const candidateProfiles = CHIP_PROFILES.filter((p) => p.format === format);

  if (candidateProfiles.length === 0) {
    return null;
  }

  // Find profiles where the SNP count falls within range
  const matchingProfiles = candidateProfiles.filter(
    (p) => snpCount >= p.snpCountRange[0] && snpCount <= p.snpCountRange[1],
  );

  if (matchingProfiles.length === 0) {
    // No profile matches the SNP count — return unknown provider match
    // with zero confidence (the format tells us the provider at least)
    const provider = candidateProfiles[0]?.provider;
    if (!provider) {
      return null;
    }
    return {
      provider,
      version: 'unknown',
      snpCount,
      confidence: 0,
    };
  }

  // If only one profile matches, use it
  if (matchingProfiles.length === 1) {
    const profile = matchingProfiles[0]!;
    const confidence = calculateConfidence(profile, genotypes);
    return {
      provider: profile.provider,
      version: profile.version,
      snpCount,
      confidence,
    };
  }

  // Multiple profiles match (overlapping ranges) — disambiguate with markers
  let bestProfile = matchingProfiles[0]!;
  let bestConfidence = calculateConfidence(bestProfile, genotypes);

  for (let i = 1; i < matchingProfiles.length; i++) {
    const profile = matchingProfiles[i]!;
    const confidence = calculateConfidence(profile, genotypes);
    if (confidence > bestConfidence) {
      bestProfile = profile;
      bestConfidence = confidence;
    }
  }

  return {
    provider: bestProfile.provider,
    version: bestProfile.version,
    snpCount,
    confidence: bestConfidence,
  };
}

/**
 * Get chip-specific notes about coverage limitations.
 *
 * Returns a human-readable string describing known coverage gaps,
 * limitations, and differences for the detected chip version.
 * These notes help users understand how their specific genotyping
 * array may affect the reliability of analysis results.
 *
 * @param chip - Detected chip version from {@link detectChipVersion}
 * @returns Provider/version-specific coverage limitation notes.
 *   Returns a generic note if no specific notes exist for the
 *   chip version combination.
 *
 * @example
 * const chip = detectChipVersion('23andme', 570000);
 * if (chip) {
 *   const notes = getChipNotes(chip);
 *   // "23andMe v4 (HumanOmniExpress-24, ~570K SNPs) has reduced coverage..."
 * }
 */
export function getChipNotes(chip: ChipVersion): string {
  const key = `${chip.provider}:${chip.version}`;
  const note = CHIP_NOTES[key];

  if (note) {
    return note;
  }

  // Generic fallback for unknown versions of known providers
  if (chip.version === 'unknown') {
    return (
      `${chip.provider} chip version could not be determined from the data. ` +
      'Coverage characteristics are unknown. All consumer genotyping arrays ' +
      'have limitations — they cannot detect structural variants, CNVs, or ' +
      'gene deletions/duplications.'
    );
  }

  // Fallback for known versions without specific notes
  return (
    `${chip.provider} ${chip.version} chip detected (${chip.snpCount.toLocaleString()} SNPs). ` +
    'As with all consumer genotyping arrays, structural variants, CNVs, and ' +
    'gene deletions/duplications cannot be detected.'
  );
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Calculate detection confidence based on marker SNP presence.
 *
 * Confidence scoring:
 * - No markers defined for this profile: 0.6 base (SNP count only)
 * - Some markers present: 0.6 + (match fraction * 0.3)
 * - All markers present: 0.95
 * - No genotypes provided: 0.6 base (cannot check markers)
 *
 * @param profile - The chip profile being evaluated
 * @param genotypes - Optional genotype map for marker checking
 * @returns Confidence score between 0.0 and 1.0
 */
function calculateConfidence(profile: ChipProfile, genotypes?: Record<string, string>): number {
  const baseConfidence = 0.6;

  // If no markers are defined, confidence is based on SNP count alone
  if (profile.markerSnps.length === 0) {
    return baseConfidence;
  }

  // If no genotypes provided, can't check markers
  if (!genotypes) {
    return baseConfidence;
  }

  // Count how many marker SNPs are present in the genotype data
  let markerMatchCount = 0;
  for (const marker of profile.markerSnps) {
    if (marker in genotypes) {
      markerMatchCount++;
    }
  }

  if (markerMatchCount === 0) {
    // No markers found — lower confidence (could be a different version)
    return 0.4;
  }

  const markerFraction = markerMatchCount / profile.markerSnps.length;

  if (markerFraction >= 1.0) {
    // All markers present — high confidence
    return 0.95;
  }

  // Partial match — scale between base and high
  return baseConfidence + markerFraction * 0.3;
}
