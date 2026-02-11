/**
 * Shared utility functions for the genetics engine.
 *
 * These utilities are used across multiple engine modules for common
 * operations like genotype normalization, rsID validation, and
 * allele complement mapping.
 */

// ─── Genotype Normalization ─────────────────────────────────────────────────

/**
 * Normalize a two-allele genotype by sorting alleles alphabetically.
 *
 * This ensures consistent representation regardless of strand orientation
 * or the order alleles were read from the file.
 *
 * Used by both the carrier analysis and trait prediction engines.
 *
 * @param allele1 - First allele (e.g., "G")
 * @param allele2 - Second allele (e.g., "A")
 * @returns Tuple of alleles in alphabetical order (e.g., ["A", "G"])
 *
 * @example
 * normalizeGenotypeAlleles("G", "A") // ["A", "G"]
 * normalizeGenotypeAlleles("A", "A") // ["A", "A"]
 * normalizeGenotypeAlleles("T", "C") // ["C", "T"]
 */
export function normalizeGenotypeAlleles(allele1: string, allele2: string): [string, string] {
  // Sort the two alleles alphabetically and return as tuple
  return allele1 <= allele2 ? [allele1, allele2] : [allele2, allele1];
}

// ─── rsID Validation ────────────────────────────────────────────────────────

/**
 * Check if a string is a valid rsID (Reference SNP cluster ID).
 *
 * Valid rsIDs:
 * - Start with "rs" followed by digits (e.g., "rs12913832")
 * - Start with "i" followed by digits (indels, e.g., "i4000759")
 *
 * This matches the validation used in the parser module.
 *
 * @param rsid - String to validate
 * @returns True if the string is a valid rsID
 *
 * @example
 * isValidRsid("rs12913832") // true
 * isValidRsid("i4000759")   // true
 * isValidRsid("VG1234")     // false (MyHeritage proprietary, not standard rsID)
 * isValidRsid("hello")      // false
 * isValidRsid("")           // false
 */
export function isValidRsid(rsid: string): boolean {
  // Check if rsid starts with "rs" and the rest is numeric
  if (rsid.startsWith('rs') && rsid.length > 2) {
    const numeric = rsid.slice(2);
    return /^\d+$/.test(numeric);
  }

  // OR check if rsid starts with "i" and the rest is numeric
  if (rsid.startsWith('i') && rsid.length > 1) {
    const numeric = rsid.slice(1);
    return /^\d+$/.test(numeric);
  }

  return false;
}

// ─── Allele Complement ──────────────────────────────────────────────────────

/**
 * Get the complementary nucleotide for a given allele.
 *
 * DNA base pairing rules:
 * - A <-> T (Adenine pairs with Thymine)
 * - C <-> G (Cytosine pairs with Guanine)
 *
 * This is used when comparing genotypes across different strand orientations
 * (forward vs reverse strand). Some genetic data files report alleles on the
 * reverse strand, requiring complement conversion for consistent comparison.
 *
 * @param allele - Single nucleotide character (A, T, C, or G)
 * @returns Complementary nucleotide
 * @throws Error if the allele is not a valid nucleotide
 *
 * @example
 * complementAllele("A") // "T"
 * complementAllele("T") // "A"
 * complementAllele("C") // "G"
 * complementAllele("G") // "C"
 */
export function complementAllele(allele: string): string {
  // Map: A->T, T->A, C->G, G->C
  // Case-insensitive input, preserve original case in output
  const upper = allele.toUpperCase();

  let complement: string;
  switch (upper) {
    case 'A':
      complement = 'T';
      break;
    case 'T':
      complement = 'A';
      break;
    case 'C':
      complement = 'G';
      break;
    case 'G':
      complement = 'C';
      break;
    default:
      throw new Error(`Invalid nucleotide: ${allele}`);
  }

  // Preserve original case
  return allele === allele.toLowerCase() ? complement.toLowerCase() : complement;
}

// ─── Genotype String Helpers ────────────────────────────────────────────────

/**
 * Check if a genotype is homozygous (both alleles are the same).
 *
 * @param genotype - Two-character genotype string (e.g., "AA", "AG")
 * @returns True if homozygous
 */
export function isHomozygous(genotype: string): boolean {
  if (genotype.length !== 2) {
    return false;
  }
  return genotype[0] === genotype[1];
}

/**
 * Check if a genotype is heterozygous (alleles differ).
 *
 * @param genotype - Two-character genotype string
 * @returns True if heterozygous
 */
export function isHeterozygous(genotype: string): boolean {
  if (genotype.length !== 2) {
    return false;
  }
  return genotype[0] !== genotype[1];
}

/**
 * Clamp a number to a range.
 *
 * @param value - Value to clamp
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
