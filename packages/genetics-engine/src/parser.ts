/**
 * Genetic Data File Parser
 *
 * Parses raw genetic data files from 23andMe, AncestryDNA, MyHeritage/FTDNA,
 * and VCF (Variant Call Format) into a uniform genotype map (rsid -> genotype).
 *
 * Ported from Source/parser.py (1,558 lines) in the legacy Streamlit application.
 *
 * Key design decisions for the TypeScript port:
 * - Operates on string content (files are read by the browser/worker, not by this module)
 * - Returns plain objects (not Maps) for Web Worker structured clone compatibility
 * - Streaming parsing is handled at the worker level; this module works on full content
 * - Format detection uses the same heuristics as the Python version
 */

import type { FileFormat, GenotypeMap, ParseResultSummary } from './types';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum number of SNPs before we consider the file corrupted. */
const MAX_SNP_COUNT = 10_000_000;

/** Valid nucleotide alleles for AncestryDNA format. */
const VALID_ALLELES = new Set(['A', 'C', 'G', 'T']);

/** Valid chromosome values for AncestryDNA files. */
const ANCESTRY_VALID_CHROMOSOMES = new Set([
  ...Array.from({ length: 22 }, (_, i) => String(i + 1)),
  'X', 'Y', 'MT', '23', '24', '25',  // 23=X, 24=Y, 25=MT/PAR in AncestryDNA
]);

/** Valid chromosome values for MyHeritage/FTDNA files. */
const MYHERITAGE_VALID_CHROMOSOMES = new Set([
  ...Array.from({ length: 22 }, (_, i) => String(i + 1)),
  'X',
  'Y',
  'MT',
]);

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Yield lines from a string without materializing the full array.
 *
 * Avoids the O(n) memory overhead of `content.split('\n')` which creates
 * ~600K strings for a typical 30MB genetic data file.  Instead, lines are
 * produced one at a time using `indexOf('\n')`.
 *
 * `.trimEnd()` on each yielded line handles Windows CRLF (`\r\n`) by
 * stripping the trailing `\r`.
 */
function* iterateLines(content: string): Generator<string> {
  let start = 0;
  let end = content.indexOf('\n');
  while (end !== -1) {
    yield content.substring(start, end).trimEnd(); // handles \r\n
    start = end + 1;
    end = content.indexOf('\n', start);
  }
  // Last line (no trailing newline)
  if (start < content.length) {
    const last = content.substring(start).trimEnd();
    if (last.length > 0) {
      yield last;
    }
  }
}

/**
 * Count object keys in O(n) without materializing the key array.
 *
 * `Object.keys(obj).length` allocates an array of all keys just to read
 * its `.length`.  This helper iterates with `for...in` instead, which
 * avoids that allocation.
 */
function countKeys(obj: Record<string, unknown>): number {
  let count = 0;
  for (const _ in obj) count++;
  return count;
}

/**
 * Parse a single CSV line, handling quoted fields correctly.
 *
 * Handles:
 * - Unquoted fields separated by commas
 * - Quoted fields that may contain commas
 * - Doubled quotes inside quoted fields (RFC 4180)
 *
 * This replaces Python's csv.reader for single-line parsing.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for doubled quote (escaped quote inside quoted field)
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }

  // Push the last field
  fields.push(current);

  return fields;
}

/**
 * Check if SNP count exceeds the safety limit.
 * Throws a descriptive error if so.
 */
function checkSnpLimit(count: number): void {
  if (count > MAX_SNP_COUNT) {
    throw new Error(
      `SNP count exceeds maximum (${MAX_SNP_COUNT.toLocaleString()}). ` +
      'File may be corrupted or not a genetic data file.'
    );
  }
}

// ─── Format Detection ───────────────────────────────────────────────────────

/**
 * Detect the format of a genetic data file by examining its content.
 *
 * Detection priority (matching Source/parser.py `_detect_format_from_content`):
 * 1. VCF: Has `##fileformat=VCF` meta-information line, or `##` comments with `#CHROM` header
 * 2. AncestryDNA: Comment lines containing "ancestrydna", or 5-column tab-separated header
 *    with "allele1" and "allele2"
 * 3. 23andMe: Comment lines containing "23andme", or 4-column tab-separated data with
 *    rsid + combined genotype
 * 4. MyHeritage/FTDNA: CSV format with RSID,CHROMOSOME,POSITION,RESULT header
 * 5. "unknown" if no format matches
 *
 * @param content - Full file content as a string
 * @returns Detected file format
 */
export function detectFormat(content: string): FileFormat {
  // Only examine the first ~4000 chars for format detection (avoids
  // materializing the entire file as a string array for large files)
  const head = content.length > 4000 ? content.slice(0, 4000) : content;
  const lines = head.trim().split('\n');

  const commentLines: string[] = [];
  const firstDataLines: string[] = [];

  for (const line of lines.slice(0, 50)) {
    const stripped = line.trim();
    if (!stripped) {
      continue;
    }
    if (stripped.startsWith('#')) {
      commentLines.push(stripped);
    } else {
      firstDataLines.push(stripped);
      if (firstDataLines.length >= 10) {
        break;
      }
    }
  }

  // --- VCF detection (check first -- ## lines are very distinctive) ---
  let hasVcfFileformat = false;
  let hasChromHeader = false;
  for (const cline of commentLines) {
    if (cline.toLowerCase().startsWith('##fileformat=vcf')) {
      hasVcfFileformat = true;
    }
    if (cline.startsWith('#CHROM')) {
      hasChromHeader = true;
    }
  }
  if (hasVcfFileformat) {
    return 'vcf';
  }
  // Also detect if first non-empty comment starts with ## and there's a #CHROM line
  if (commentLines.length > 0 && commentLines[0]!.startsWith('##') && hasChromHeader) {
    return 'vcf';
  }

  // --- Check comment signatures ---
  for (const cline of commentLines) {
    const clineLower = cline.toLowerCase();
    if (clineLower.includes('ancestrydna')) {
      return 'ancestrydna';
    }
    if (clineLower.includes('23andme')) {
      return '23andme';
    }
  }

  // --- Check header row for AncestryDNA 5-column layout ---
  if (firstDataLines.length > 0) {
    const headerCandidate = firstDataLines[0]!;
    const headerParts = headerCandidate.split('\t');
    const headerLower = headerCandidate.toLowerCase();
    if (headerParts.length === 5 && headerLower.includes('allele1') && headerLower.includes('allele2')) {
      return 'ancestrydna';
    }
  }

  // --- Check for MyHeritage/FTDNA CSV format ---
  if (firstDataLines.length > 0) {
    const headerCandidate = firstDataLines[0]!;
    // Strip quotes for comparison; MyHeritage uses comma-separated fields
    const commaParts = headerCandidate.split(',').map(p => p.trim().replace(/"/g, '').toLowerCase());
    if (
      commaParts.length >= 4 &&
      (commaParts[0] ?? '').includes('rsid') &&
      (commaParts[1] ?? '').includes('chromosome') &&
      (commaParts[2] ?? '').includes('position') &&
      (commaParts[3] ?? '').includes('result')
    ) {
      return 'myheritage';
    }

    // No header but comma-separated data lines matching pattern
    let mhHits = 0;
    let mhChecked = 0;
    for (const dline of firstDataLines) {
      const cparts = dline.split(',').map(p => p.trim().replace(/"/g, ''));
      if (cparts.length === 4) {
        const rsid = cparts[0] ?? '';
        const result = cparts[3] ?? '';
        if (rsid.toLowerCase() === 'rsid') {
          continue;
        }
        mhChecked++;
        if (
          (rsid.startsWith('rs') || rsid.startsWith('i') || rsid.startsWith('VG')) &&
          (result.length === 2 || result === '--')
        ) {
          mhHits++;
        }
      }
    }
    if (mhChecked > 0 && mhHits / mhChecked >= 0.5) {
      return 'myheritage';
    }
  }

  // --- Heuristic: check data rows for 4-col combined genotype (23andMe) ---
  let fourColHits = 0;
  let dataRowsChecked = 0;
  for (const dline of firstDataLines) {
    const parts = dline.split('\t');
    const firstPart = (parts[0] ?? '').toLowerCase();
    // Skip a potential header row
    if (firstPart === 'rsid' || firstPart === 'id' || firstPart === 'snp') {
      continue;
    }
    dataRowsChecked++;
    if (parts.length === 4) {
      const rsid = parts[0] ?? '';
      const genotype = (parts[3] ?? '').trim();
      if (
        (rsid.startsWith('rs') || rsid.startsWith('i')) &&
        genotype.length > 0 &&
        genotype.length <= 4
      ) {
        fourColHits++;
      }
    }
  }

  if (dataRowsChecked > 0 && fourColHits / dataRowsChecked >= 0.5) {
    return '23andme';
  }

  return 'unknown';
}

// ─── 23andMe Parser ─────────────────────────────────────────────────────────

/**
 * Parse a 23andMe raw data file into a genotype map.
 *
 * 23andMe format:
 * - Tab-separated: rsid, chromosome, position, genotype
 * - Comment lines start with '#'
 * - Genotypes are combined (e.g., "AG", "AA", "GG")
 * - No-call entries use "--"
 * - rsIDs start with "rs" or "i" (for indels)
 *
 * Ported from Source/parser.py `_parse_23andme_from_content()` and
 * `_parse_23andme_streaming()`.
 *
 * @param content - Full file content as a string
 * @returns Genotype map: rsid -> genotype (e.g., {"rs4477212": "AA"})
 * @throws Error if no valid SNP data found or file exceeds MAX_SNP_COUNT
 */
export function parse23andMe(content: string): GenotypeMap {
  const snps: GenotypeMap = {};
  let snpCount = 0;

  for (const line of iterateLines(content)) {
    const stripped = line;
    if (!stripped || stripped.startsWith('#')) {
      continue;
    }

    const parts = stripped.split('\t');
    if (parts.length < 4) {
      continue;
    }

    const rsid = (parts[0] ?? '').trim();
    const genotype = (parts[3] ?? '').trim();

    // Skip no-call entries
    if (genotype === '--' || genotype === '') {
      continue;
    }

    // Skip header rows (may not be commented in some files)
    const rsidLower = rsid.toLowerCase();
    if (rsidLower === 'rsid' || rsidLower === 'id' || rsidLower === 'snp') {
      continue;
    }

    // Skip if rsid doesn't start with "rs" or "i"
    if (!rsid.startsWith('rs') && !rsid.startsWith('i')) {
      continue;
    }

    snps[rsid] = genotype;
    snpCount++;
    checkSnpLimit(snpCount);
  }

  if (snpCount === 0) {
    throw new Error('No valid SNP data found in 23andMe file.');
  }

  return snps;
}

/**
 * Validate that content appears to be a valid 23andMe raw data file.
 *
 * Validation criteria (from Source/parser.py `validate_23andme_format_from_content`):
 * - Must have either "23andme" in comment lines or rsid+chromosome in header
 * - Must have at least some data lines
 * - At least 50% of checked data lines must have valid 4-column format
 *
 * @param content - Full file content as a string
 * @returns Tuple of [isValid, errorMessage]. If valid, errorMessage is empty.
 */
export function validate23andMe(content: string): [boolean, string] {
  const lines = content.trim().split('\n');

  if (lines.length < 2) {
    return [false, 'File is too short to be a valid 23andMe file'];
  }

  // Check for 23andMe header signature
  let has23andmeHeader = false;
  let hasRsidHeader = false;
  let dataLineCount = 0;
  let validDataLines = 0;

  for (const line of lines.slice(0, 50)) {
    const lineLower = line.toLowerCase();

    // Look for 23andMe signature in comments
    if (lineLower.includes('23andme')) {
      has23andmeHeader = true;
    }

    // Look for column header
    if (line.startsWith('#')) {
      if (lineLower.includes('rsid') && (lineLower.includes('chromosome') || lineLower.includes('position'))) {
        hasRsidHeader = true;
      }
    } else {
      // This is a data line
      dataLineCount++;
      const parts = line.trim().split('\t');

      // Valid data line should have 4+ tab-separated columns
      if (parts.length >= 4) {
        const rsid = (parts[0] ?? '').trim();
        const chromosome = (parts[1] ?? '').trim();
        const genotype = (parts[3] ?? '').trim();

        // Check if it looks like valid data
        if (
          (rsid.startsWith('rs') || rsid.startsWith('i')) &&
          (/^\d+$/.test(chromosome) || ['X', 'Y', 'MT', 'M'].includes(chromosome)) &&
          genotype.length <= 4
        ) {
          validDataLines++;
        }
      }

      // After checking 10 data lines, make a decision
      if (dataLineCount >= 10) {
        break;
      }
    }
  }

  // Validation criteria
  if (!has23andmeHeader && !hasRsidHeader) {
    return [false, 'File does not appear to be a 23andMe file (missing header signature)'];
  }

  if (dataLineCount === 0) {
    return [false, 'File contains no data lines (only headers/comments)'];
  }

  if (validDataLines === 0) {
    return [false, 'File contains no valid SNP data (incorrect format)'];
  }

  // At least 50% of checked data lines should be valid
  if (validDataLines / dataLineCount < 0.5) {
    return [false, `File format appears incorrect (only ${validDataLines}/${dataLineCount} lines are valid)`];
  }

  return [true, ''];
}

// ─── AncestryDNA Parser ─────────────────────────────────────────────────────

/**
 * Parse an AncestryDNA raw data file into a genotype map.
 *
 * AncestryDNA format:
 * - Tab-separated: rsid, chromosome, position, allele1, allele2 (5 columns)
 * - Comment lines start with '#', may contain "AncestryDNA" signature
 * - Alleles are separate columns (e.g., allele1="A", allele2="G")
 * - No-call entries use "0" for allele values
 * - rsIDs start with "rs" or "i"
 * - Genotypes are constructed by concatenating allele1 + allele2
 *
 * Ported from Source/parser.py `_parse_ancestry_from_content()` and
 * `_parse_ancestry_streaming()`.
 *
 * @param content - Full file content as a string
 * @returns Genotype map: rsid -> genotype (e.g., {"rs4477212": "TT"})
 * @throws Error if no valid SNP data found
 */
export function parseAncestryDNA(content: string): GenotypeMap {
  const snps: GenotypeMap = {};
  let snpCount = 0;

  for (const line of iterateLines(content)) {
    const stripped = line;
    if (!stripped || stripped.startsWith('#')) {
      continue;
    }

    const parts = stripped.split('\t');
    const firstPart = (parts[0] ?? '').toLowerCase();

    // Skip header rows
    if (firstPart === 'rsid' || firstPart === 'id' || firstPart === 'snp') {
      continue;
    }

    if (parts.length < 5) {
      continue;
    }

    const rsid = (parts[0] ?? '').trim();
    const allele1 = (parts[3] ?? '').trim().toUpperCase();
    const allele2 = (parts[4] ?? '').trim().toUpperCase();

    // Skip no-call entries
    if (allele1 === '0' || allele2 === '0') {
      continue;
    }

    // Skip if rsid doesn't start with "rs" or "i"
    if (!rsid.startsWith('rs') && !rsid.startsWith('i')) {
      continue;
    }

    snps[rsid] = allele1 + allele2;
    snpCount++;
    checkSnpLimit(snpCount);
  }

  if (snpCount === 0) {
    throw new Error('No valid SNP data found in AncestryDNA file.');
  }

  return snps;
}

/**
 * Validate that content appears to be a valid AncestryDNA raw data file.
 *
 * @param content - Full file content as a string
 * @returns Tuple of [isValid, errorMessage]
 */
export function validateAncestryDNA(content: string): [boolean, string] {
  const lines = content.trim().split('\n');

  if (lines.length < 2) {
    return [false, 'File is too short to be a valid AncestryDNA file'];
  }

  let hasAncestryHeader = false;
  let hasAlleleHeader = false;
  let dataLineCount = 0;
  let validDataLines = 0;

  for (const line of lines.slice(0, 50)) {
    const stripped = line.trim();
    if (!stripped) {
      continue;
    }

    if (stripped.startsWith('#')) {
      if (stripped.toLowerCase().includes('ancestrydna')) {
        hasAncestryHeader = true;
      }
      continue;
    }

    // Non-comment line
    const parts = stripped.split('\t');

    // Check for header row with allele1/allele2
    const lower = stripped.toLowerCase();
    if (lower.includes('allele1') && lower.includes('allele2') && parts.length === 5) {
      hasAlleleHeader = true;
      continue;
    }

    // Data line
    dataLineCount++;

    if (parts.length !== 5) {
      // Not a valid 5-column line
      if (dataLineCount >= 10) {
        break;
      }
      continue;
    }

    const rsid = (parts[0] ?? '').trim();
    const chromosome = (parts[1] ?? '').trim();
    const allele1 = (parts[3] ?? '').trim().toUpperCase();
    const allele2 = (parts[4] ?? '').trim().toUpperCase();

    const rsidOk = rsid.startsWith('rs') || rsid.startsWith('i');
    const chrOk = ANCESTRY_VALID_CHROMOSOMES.has(chromosome);
    const a1Ok = VALID_ALLELES.has(allele1) || allele1 === '0';
    const a2Ok = VALID_ALLELES.has(allele2) || allele2 === '0';

    if (rsidOk && chrOk && a1Ok && a2Ok) {
      validDataLines++;
    }

    if (dataLineCount >= 10) {
      break;
    }
  }

  // --- Decision ---
  if (!hasAncestryHeader && !hasAlleleHeader) {
    return [false, 'File does not appear to be an AncestryDNA file (missing header signature)'];
  }

  if (dataLineCount === 0) {
    return [false, 'File contains no data lines (only headers/comments)'];
  }

  if (validDataLines === 0) {
    return [false, 'File contains no valid SNP data (incorrect format)'];
  }

  if (validDataLines / dataLineCount < 0.5) {
    return [false, `File format appears incorrect (only ${validDataLines}/${dataLineCount} lines are valid)`];
  }

  return [true, ''];
}

// ─── MyHeritage/FTDNA Parser ────────────────────────────────────────────────

/**
 * Parse a MyHeritage/FamilyTreeDNA raw data CSV file into a genotype map.
 *
 * MyHeritage/FTDNA format:
 * - CSV (comma-separated): RSID, CHROMOSOME, POSITION, RESULT
 * - Fields may or may not be quoted
 * - No comment lines (unlike 23andMe/AncestryDNA)
 * - Has a header row with column names
 * - Genotypes are combined in the RESULT column (e.g., "AG", "AA")
 * - No-call entries use "--"
 * - rsIDs start with "rs", "i", or "VG" (proprietary)
 *
 * Ported from Source/parser.py `_parse_myheritage_from_content()` and
 * `_parse_myheritage_streaming()`.
 *
 * @param content - Full file content as a string
 * @returns Genotype map: rsid -> genotype
 * @throws Error if no valid SNP data found
 */
export function parseMyHeritage(content: string): GenotypeMap {
  const snps: GenotypeMap = {};
  let snpCount = 0;

  for (const line of iterateLines(content)) {
    const stripped = line;
    if (!stripped) {
      continue;
    }

    const row = parseCsvLine(stripped);
    if (row.length < 4) {
      continue;
    }

    const rsid = (row[0] ?? '').trim();
    const genotype = (row[3] ?? '').trim();

    // Skip header row
    if (rsid.toLowerCase() === 'rsid') {
      continue;
    }

    // Skip no-calls and empty results
    if (genotype === '--' || genotype === '') {
      continue;
    }

    // Accept rs*, i*, and VG* (proprietary) RSIDs
    if (!rsid.startsWith('rs') && !rsid.startsWith('i') && !rsid.startsWith('VG')) {
      continue;
    }

    snps[rsid] = genotype;
    snpCount++;
    checkSnpLimit(snpCount);
  }

  if (snpCount === 0) {
    throw new Error('No valid SNP data found in MyHeritage/FTDNA file.');
  }

  return snps;
}

/**
 * Validate that content appears to be a valid MyHeritage/FTDNA raw data file.
 *
 * @param content - Full file content as a string
 * @returns Tuple of [isValid, errorMessage]
 */
export function validateMyHeritage(content: string): [boolean, string] {
  const lines = content.trim().split('\n');

  if (lines.length < 2) {
    return [false, 'File is too short to be a valid MyHeritage/FTDNA file'];
  }

  let hasHeader = false;
  let dataLineCount = 0;
  let validDataLines = 0;

  for (const line of lines.slice(0, 50)) {
    const stripped = line.trim();
    if (!stripped) {
      continue;
    }

    // Use CSV parsing to correctly handle quoted/unquoted fields
    let row: string[];
    try {
      row = parseCsvLine(stripped);
    } catch {
      continue;
    }

    if (row.length < 4) {
      continue;
    }

    // Check for header row
    if ((row[0] ?? '').trim().toLowerCase() === 'rsid') {
      const headerLower = row.map(f => f.trim().toLowerCase());
      if (
        headerLower.includes('chromosome') &&
        headerLower.includes('position') &&
        headerLower.includes('result')
      ) {
        hasHeader = true;
      }
      continue;
    }

    // Data line
    dataLineCount++;

    const rsid = (row[0] ?? '').trim();
    const chromosome = (row[1] ?? '').trim();
    const result = (row[3] ?? '').trim();

    const rsidOk = rsid.startsWith('rs') || rsid.startsWith('i') || rsid.startsWith('VG');
    const chrOk = MYHERITAGE_VALID_CHROMOSOMES.has(chromosome);
    const resultOk = result.length === 2 || result === '--';

    if (rsidOk && chrOk && resultOk) {
      validDataLines++;
    }

    if (dataLineCount >= 10) {
      break;
    }
  }

  // --- Decision ---
  if (!hasHeader) {
    // Also accept if data lines look right even without a recognizable header
    if (dataLineCount === 0 || validDataLines === 0) {
      return [false, 'File does not appear to be a MyHeritage/FTDNA file (missing RSID,CHROMOSOME,POSITION,RESULT header)'];
    }
  }

  if (dataLineCount === 0) {
    return [false, 'File contains no data lines (only headers)'];
  }

  if (validDataLines === 0) {
    return [false, 'File contains no valid SNP data (incorrect format)'];
  }

  if (validDataLines / dataLineCount < 0.5) {
    return [false, `File format appears incorrect (only ${validDataLines}/${dataLineCount} lines are valid)`];
  }

  return [true, ''];
}

// ─── VCF Parser ─────────────────────────────────────────────────────────────

/**
 * Parse a VCF (Variant Call Format) file into a genotype map.
 *
 * VCF format:
 * - Meta-information lines start with "##"
 * - Header line starts with "#CHROM" (10+ tab-separated columns)
 * - Data lines are tab-separated: CHROM, POS, ID, REF, ALT, QUAL, FILTER, INFO, FORMAT, SAMPLE...
 * - Only extracts SNPs (single nucleotide variants) with rsIDs
 * - Genotype (GT) field encodes alleles as integers:
 *   0 = REF allele, 1 = first ALT, 2 = second ALT, etc.
 *   Separated by "/" (unphased) or "|" (phased)
 * - Skips indels, multi-base variants, no-calls
 * - Only uses the first sample column (index 9)
 *
 * Ported from Source/parser.py `_parse_vcf_from_content()` and
 * `_parse_vcf_streaming()`.
 *
 * @param content - Full file content as a string
 * @returns Genotype map: rsid -> genotype (e.g., {"rs6054257": "GG"})
 * @throws Error if no valid SNP data found
 */
export function parseVcf(content: string): GenotypeMap {
  const snps: GenotypeMap = {};
  let pastHeader = false;
  let snpCount = 0;

  for (const line of iterateLines(content)) {
    const stripped = line;
    if (!stripped) {
      continue;
    }

    // Skip meta-information lines
    if (stripped.startsWith('##')) {
      continue;
    }

    // Skip header line but mark that we've passed it
    if (stripped.startsWith('#CHROM')) {
      pastHeader = true;
      continue;
    }

    if (!pastHeader) {
      continue;
    }

    const parts = stripped.split('\t');
    if (parts.length < 10) {
      continue;
    }

    const variantId = parts[2] ?? '';   // ID column (rsid or '.')
    const ref = parts[3] ?? '';         // REF allele
    const alt = parts[4] ?? '';         // ALT allele(s), comma-separated
    const formatField = parts[8] ?? ''; // FORMAT column
    const sampleField = parts[9] ?? ''; // First sample column

    // Only process variants with rsIDs
    if (!variantId.startsWith('rs')) {
      continue;
    }

    // Only process SNPs: REF must be single char
    if (ref.length !== 1) {
      continue;
    }

    // Split ALT alleles and check all are single-char (SNPs only)
    const altAlleles = alt.split(',');
    if (altAlleles.some(a => a.length !== 1)) {
      continue;
    }

    // Build allele list: index 0 = REF, 1+ = ALT alleles
    const alleleList = [ref, ...altAlleles];

    // Find GT index in FORMAT field
    const formatKeys = formatField.split(':');
    const gtIndex = formatKeys.indexOf('GT');
    if (gtIndex === -1) {
      // No GT in FORMAT for this line, skip
      continue;
    }

    // Extract GT value from sample field
    const sampleValues = sampleField.split(':');
    if (gtIndex >= sampleValues.length) {
      continue;
    }

    const gtValue = sampleValues[gtIndex] ?? '';

    // Skip no-call genotypes
    if (gtValue === './.' || gtValue === '.|.' || gtValue === '.') {
      continue;
    }

    // Parse GT: split on / or |
    const separator = gtValue.includes('|') ? '|' : '/';
    const alleleIndices = gtValue.split(separator);

    if (alleleIndices.length !== 2) {
      continue;
    }

    // Map indices to nucleotides
    const idxAStr = alleleIndices[0] ?? '';
    const idxBStr = alleleIndices[1] ?? '';
    const idxA = parseInt(idxAStr, 10);
    const idxB = parseInt(idxBStr, 10);

    // Check for NaN (could be '.' in one position -- half-call)
    if (isNaN(idxA) || isNaN(idxB)) {
      continue;
    }

    if (idxA >= alleleList.length || idxB >= alleleList.length) {
      continue;
    }

    const alleleA = alleleList[idxA];
    const alleleB = alleleList[idxB];
    if (alleleA === undefined || alleleB === undefined) {
      continue;
    }

    snps[variantId] = alleleA + alleleB;
    snpCount++;
    checkSnpLimit(snpCount);
  }

  if (snpCount === 0) {
    throw new Error(
      'No valid SNP data found in VCF file. ' +
      'Ensure the file contains variants with rsIDs and GT genotype data.'
    );
  }

  return snps;
}

/**
 * Validate that content appears to be a valid VCF file.
 *
 * @param content - Full file content as a string
 * @returns Tuple of [isValid, errorMessage]
 */
export function validateVcf(content: string): [boolean, string] {
  const lines = content.trim().split('\n');

  if (lines.length < 2) {
    return [false, 'File is too short to be a valid VCF file'];
  }

  let hasFileformat = false;
  let hasChromHeader = false;
  let chromColCount = 0;
  let dataLineCount = 0;
  let validDataLines = 0;
  let gtInFormat = false;

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) {
      continue;
    }

    if (stripped.toLowerCase().startsWith('##fileformat=vcf')) {
      hasFileformat = true;
      continue;
    }

    if (stripped.startsWith('##')) {
      continue;
    }

    if (stripped.startsWith('#CHROM')) {
      hasChromHeader = true;
      chromColCount = stripped.split('\t').length;
      continue;
    }

    // Data line
    if (!hasChromHeader) {
      continue;
    }

    dataLineCount++;
    const parts = stripped.split('\t');

    if (parts.length >= 10) {
      const formatField = parts[8] ?? '';
      if (formatField.split(':').includes('GT')) {
        gtInFormat = true;
        validDataLines++;
      }
    }

    if (dataLineCount >= 10) {
      break;
    }
  }

  if (!hasFileformat) {
    return [false, 'File does not contain a ##fileformat=VCF meta-information line'];
  }

  if (!hasChromHeader) {
    return [false, 'File does not contain a #CHROM header line'];
  }

  if (chromColCount < 10) {
    return [false, `#CHROM header has only ${chromColCount} columns (expected at least 10 tab-separated columns)`];
  }

  if (dataLineCount === 0) {
    return [false, 'File contains no data lines after the #CHROM header'];
  }

  if (validDataLines === 0) {
    return [false, 'No valid data lines found (FORMAT column must contain GT)'];
  }

  if (!gtInFormat) {
    return [false, 'FORMAT column does not contain GT field'];
  }

  return [true, ''];
}

// ─── Universal Parser ───────────────────────────────────────────────────────

/**
 * Universal parser: auto-detect format and parse.
 *
 * Combines format detection and parsing into a single call.
 * Mirrors Source/parser.py `parse_genetic_file()`.
 *
 * @param content - Full file content as a string
 * @returns Tuple of [genotypes, detectedFormat]
 * @throws Error if format is unknown or parsing fails
 */
export function parseGeneticFile(content: string): [GenotypeMap, FileFormat] {
  const detectedFormat = detectFormat(content);

  const parserMap: Partial<Record<FileFormat, (c: string) => GenotypeMap>> = {
    '23andme': parse23andMe,
    'ancestrydna': parseAncestryDNA,
    'myheritage': parseMyHeritage,
    'vcf': parseVcf,
  };

  const parser = parserMap[detectedFormat];
  if (!parser) {
    throw new Error(
      'Unrecognized genetic data format. ' +
      'Please upload a 23andMe, AncestryDNA, MyHeritage/FTDNA, or VCF raw data file.'
    );
  }

  return [parser(content), detectedFormat];
}

/**
 * Universal validator: auto-detect format and validate.
 *
 * Mirrors Source/parser.py `validate_genetic_file()`.
 *
 * @param content - Full file content as a string
 * @returns Tuple of [isValid, errorMessage, detectedFormat]
 */
export function validateGeneticFile(content: string): [boolean, string, FileFormat] {
  const fmt = detectFormat(content);

  if (fmt === 'vcf') {
    const [isValid, err] = validateVcf(content);
    return [isValid, err, 'vcf'];
  }

  if (fmt === 'ancestrydna') {
    const [isValid, err] = validateAncestryDNA(content);
    return [isValid, err, 'ancestrydna'];
  }

  if (fmt === 'myheritage') {
    const [isValid, err] = validateMyHeritage(content);
    return [isValid, err, 'myheritage'];
  }

  if (fmt === '23andme') {
    const [isValid, err] = validate23andMe(content);
    return [isValid, err, '23andme'];
  }

  return [
    false,
    'Unrecognized genetic data format. ' +
    'Please upload a 23andMe, AncestryDNA, MyHeritage/FTDNA, or VCF raw data file.',
    'unknown',
  ];
}

/**
 * Calculate statistics about parsed genotype data.
 *
 * Mirrors Source/parser.py `get_genotype_stats()`.
 *
 * @param genotypes - Genotype map from parsing
 * @returns Statistics including total SNPs, homozygous/heterozygous counts
 */
export function getGenotypeStats(genotypes: GenotypeMap): {
  totalSnps: number;
  homozygousCount: number;
  heterozygousCount: number;
  genotypeDistribution: Record<string, number>;
} {
  const values = Object.values(genotypes);
  const totalSnps = values.length;

  if (totalSnps === 0) {
    return {
      totalSnps: 0,
      homozygousCount: 0,
      heterozygousCount: 0,
      genotypeDistribution: {},
    };
  }

  const genotypeDistribution: Record<string, number> = {};
  let homozygousCount = 0;
  let heterozygousCount = 0;

  for (const genotype of values) {
    // Count genotype patterns
    genotypeDistribution[genotype] = (genotypeDistribution[genotype] ?? 0) + 1;

    // Classify as homozygous or heterozygous
    if (genotype.length === 2) {
      if (genotype[0] === genotype[1]) {
        homozygousCount++;
      } else {
        heterozygousCount++;
      }
    } else if (genotype.length === 1) {
      // Single allele (e.g., X/Y chromosome in males)
      homozygousCount++;
    }
  }

  return {
    totalSnps,
    homozygousCount,
    heterozygousCount,
    genotypeDistribution,
  };
}

/**
 * Build a ParseResultSummary from parsing output.
 *
 * Creates the summary object that the Web Worker sends back to the main thread
 * after completing file parsing.
 *
 * @param genotypes - Parsed genotype map
 * @param format - Detected file format
 * @param metadata - Optional format-specific metadata
 * @returns Summary object for the main thread
 */
export function buildParseResultSummary(
  genotypes: GenotypeMap,
  format: FileFormat,
  metadata?: Record<string, string>,
  rawLineCount?: number,
): ParseResultSummary {
  const totalSnps = countKeys(genotypes);
  // Compute skipped lines from raw content line count when available.
  // Includes comments, headers, blank lines, no-calls, and malformed lines.
  const skippedLines =
    rawLineCount !== undefined && rawLineCount > totalSnps
      ? rawLineCount - totalSnps
      : 0;

  return {
    format,
    totalSnps,
    validSnps: totalSnps,
    skippedLines,
    metadata: metadata ?? {},
  };
}
