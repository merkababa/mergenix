/**
 * localStorage audit utility for detecting sensitive health/genetic data.
 *
 * This is a DIAGNOSTIC utility — not meant to run on every page load.
 * Call it manually or during development/testing to verify that no
 * sensitive data has leaked into localStorage.
 *
 * Sensitive data (rsIDs, genotypes, carrier status, etc.) must only
 * be stored in IndexedDB as encrypted blobs, never in localStorage.
 */

// ── Sensitive Patterns ─────────────────────────────────────────────────────

/**
 * Patterns that indicate health/genetic data in key names.
 * Matched case-insensitively.
 */
const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /^rs\d+$/i,         // rsID as the entire key (e.g., "rs12345")
  /genotype/i,        // genotype data
  /carrier/i,         // carrier status
  /genetic/i,         // genetic data
  /health_data/i,     // health data
  /allele/i,          // allele information
  /phenotype/i,       // phenotype data
  /dna_result/i,      // DNA results
  /snp_data/i,        // SNP data
  /variant_data/i,    // variant data
];

/**
 * Patterns that indicate health/genetic data in stored values.
 * Matched case-insensitively against the value string.
 *
 * Known false positives: "carrier" matches non-genetic uses (e.g., phone carrier),
 * "A/G" pattern may match non-genetic abbreviations. Acceptable for a diagnostic tool —
 * false positives are preferred over false negatives when detecting sensitive data leakage.
 */
const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /rs\d{3,}/i,                    // rsID reference (rs followed by 3+ digits)
  /\b[ACGT]\/[ACGT]\b/,          // genotype allele pattern like A/G, C/T
  /\bcarrier\b/i,                 // carrier status mention
  /\bgenotype\b/i,               // genotype mention in values
  /\bpathogenic\b/i,             // clinical significance
  /\bhomozygous\b/i,             // zygosity
  /\bheterozygous\b/i,           // zygosity
];

// ── Types ──────────────────────────────────────────────────────────────────

export interface StorageAuditResult {
  /** true if no sensitive data was found in localStorage */
  clean: boolean;
  /** Keys that contain or reference sensitive health/genetic data */
  flaggedKeys: string[];
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Scan all localStorage keys and flag any that contain sensitive
 * health/genetic data (by key name or value content).
 *
 * @returns Audit result with `clean` flag and list of `flaggedKeys`
 */
export function auditLocalStorageForSensitiveData(): StorageAuditResult {
  const flaggedKeys: string[] = [];

  if (typeof window === "undefined" || !window.localStorage) {
    return { clean: true, flaggedKeys: [] };
  }

  const keyCount = localStorage.length;

  for (let i = 0; i < keyCount; i++) {
    const key = localStorage.key(i);
    if (key === null) continue;

    let isSensitive = false;

    // Check key name against sensitive patterns
    for (const pattern of SENSITIVE_KEY_PATTERNS) {
      if (pattern.test(key)) {
        isSensitive = true;
        break;
      }
    }

    // If key name is clean, check the value
    if (!isSensitive) {
      const value = localStorage.getItem(key);
      if (value) {
        for (const pattern of SENSITIVE_VALUE_PATTERNS) {
          if (pattern.test(value)) {
            isSensitive = true;
            break;
          }
        }
      }
    }

    if (isSensitive) {
      flaggedKeys.push(key);
    }
  }

  return {
    clean: flaggedKeys.length === 0,
    flaggedKeys,
  };
}
