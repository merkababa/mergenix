#!/usr/bin/env node
/**
 * check-carrier-panel.js
 *
 * CI integrity check for packages/genetics-data/carrier-panel.json.
 *
 * Validates that no entry in the carrier panel contains CNV (copy-number variant)
 * or structural variant (SV) types in any field. These are bioinformatics data
 * classes that DTC genotyping arrays cannot detect. If present, it would indicate
 * a data pipeline error that could produce misleading carrier results.
 *
 * Forbidden patterns (case-insensitive search across all string fields):
 *   - <DEL>   — VCF structural deletion token
 *   - <DUP>   — VCF structural duplication token
 *   - <INV>   — VCF inversion token
 *   - <CNV>   — generic copy-number variant token
 *   - SVTYPE  — VCF INFO field key for structural variant type
 *
 * pathogenic_allele field has stricter enforcement:
 *   Any value longer than 50 characters is flagged as a likely structural variant
 *   (legitimate SNP/indel alleles are always short).
 *
 * Exit codes:
 *   0 — All checks passed
 *   1 — One or more violations found
 *
 * Usage:
 *   node scripts/check-carrier-panel.js
 *   # or via npm script:
 *   npm run check:carrier-panel
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CARRIER_PANEL_PATH = join(__dirname, '..', 'packages', 'genetics-data', 'carrier-panel.json');

/** VCF/bioinformatics structural variant tokens that must not appear in DTC panel data. */
const FORBIDDEN_PATTERNS = ['<DEL>', '<DUP>', '<INV>', '<CNV>', 'SVTYPE'];

/** Maximum allowed length for a pathogenic_allele value. Anything longer is a structural variant. */
const MAX_ALLELE_LENGTH = 50;

/**
 * Check a single string value for forbidden patterns.
 * Returns the matching pattern or null.
 */
function findForbiddenPattern(value) {
  const upper = value.toUpperCase();
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (upper.includes(pattern)) {
      return pattern;
    }
  }
  return null;
}

/**
 * Check all string fields in a carrier panel entry for violations.
 */
function checkEntry(entry, index) {
  const violations = [];

  // Check every string field for forbidden structural variant tokens
  for (const [field, value] of Object.entries(entry)) {
    if (typeof value !== 'string') continue;

    const match = findForbiddenPattern(value);
    if (match) {
      violations.push({
        entryIndex: index,
        rsid: entry.rsid ?? '(no rsid)',
        field,
        value: value.length > 80 ? value.slice(0, 80) + '...' : value,
        reason: `Contains forbidden structural variant pattern: "${match}"`,
      });
    }
  }

  // Stricter check: pathogenic_allele must be short (SNP/indel)
  const pa = entry.pathogenic_allele;
  if (typeof pa === 'string' && pa.length > MAX_ALLELE_LENGTH) {
    violations.push({
      entryIndex: index,
      rsid: entry.rsid ?? '(no rsid)',
      field: 'pathogenic_allele',
      value: pa.length > 80 ? pa.slice(0, 80) + '...' : pa,
      reason: `pathogenic_allele length ${pa.length} exceeds maximum ${MAX_ALLELE_LENGTH} (likely structural variant)`,
    });
  }

  return violations;
}

function main() {
  console.warn('check-carrier-panel: Loading carrier panel...');

  let rawData;
  try {
    rawData = readFileSync(CARRIER_PANEL_PATH, 'utf-8');
  } catch (err) {
    console.error(`check-carrier-panel: ERROR — cannot read carrier panel at ${CARRIER_PANEL_PATH}`);
    console.error(`  ${err.message}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(rawData);
  } catch (err) {
    console.error('check-carrier-panel: ERROR — carrier-panel.json is not valid JSON');
    console.error(`  ${err.message}`);
    process.exit(1);
  }

  const entries = data.entries;
  if (!Array.isArray(entries)) {
    console.error('check-carrier-panel: ERROR — carrier-panel.json has no "entries" array');
    process.exit(1);
  }

  console.warn(`check-carrier-panel: Scanning ${entries.length} entries for CNV/SV violations...`);

  const allViolations = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const entryViolations = checkEntry(entry, i);
    allViolations.push(...entryViolations);
  }

  if (allViolations.length === 0) {
    console.warn(
      `check-carrier-panel: PASS — ${entries.length} entries scanned, 0 CNV/SV violations found.`
    );
    process.exit(0);
  }

  console.error(`check-carrier-panel: FAIL — ${allViolations.length} violation(s) found:\n`);
  for (const v of allViolations) {
    console.error(`  Entry #${v.entryIndex} (rsid: ${v.rsid})`);
    console.error(`    Field:  ${v.field}`);
    console.error(`    Value:  ${v.value}`);
    console.error(`    Reason: ${v.reason}`);
    console.error('');
  }
  process.exit(1);
}

main();
