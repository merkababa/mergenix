"""
Genetic Data Parser (23andMe, AncestryDNA, MyHeritage/FTDNA & VCF)

This module provides robust parsing functionality for 23andMe, AncestryDNA,
MyHeritage/FamilyTreeDNA, and VCF (Variant Call Format) genetic data files.
Handles multiple file format versions and validates data integrity.

Supports streaming (line-by-line) parsing to avoid loading entire files
into memory, and enforces file size / SNP count limits.
"""

import csv
from io import BytesIO, StringIO
from pathlib import Path
from typing import BinaryIO

# ---------------------------------------------------------------------------
# Limits
# ---------------------------------------------------------------------------
MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024  # 200 MB
MAX_SNP_COUNT = 10_000_000


# ---------------------------------------------------------------------------
# Streaming helpers
# ---------------------------------------------------------------------------

def _line_iterator(file):
    """Yield lines from *file* without loading the entire content into memory.

    Accepts:
    - ``str`` / ``Path`` — opens the file from disk.
    - ``BytesIO`` — wraps in a ``TextIOWrapper`` (seeks to 0 first).
    - Any other file-like object (text or binary).
    """
    if isinstance(file, (str, Path)):
        with open(Path(file), encoding='utf-8') as handle:
            for line in handle:
                yield line.rstrip('\n\r')
    elif isinstance(file, BytesIO):
        file.seek(0)
        for raw_line in file:
            yield raw_line.decode('utf-8').rstrip('\n\r')
    else:
        for line in file:
            line_str = line if isinstance(line, str) else line.decode('utf-8')
            yield line_str.rstrip('\n\r')


def _read_header_lines(file, max_lines=50):
    """Read the first *max_lines* lines for format detection.

    After reading, the file position is reset (if seekable) so that
    subsequent parsing can iterate from the beginning.
    """
    lines = []
    for i, line in enumerate(_line_iterator(file)):
        lines.append(line)
        if i >= max_lines - 1:
            break
    # Reset file position for the subsequent full parse
    if hasattr(file, 'seek'):
        file.seek(0)
    return lines


def _validate_file_size(file):
    """Raise ``ValueError`` if *file* exceeds ``MAX_FILE_SIZE_BYTES``."""
    if isinstance(file, (str, Path)):
        size = Path(file).stat().st_size
    elif isinstance(file, BytesIO):
        size = len(file.getvalue())
    else:
        return  # Can't reliably check size for generic file objects

    if size > MAX_FILE_SIZE_BYTES:
        raise ValueError(
            f"File too large ({size / 1024 / 1024:.1f} MB). "
            f"Maximum: {MAX_FILE_SIZE_BYTES / 1024 / 1024:.0f} MB"
        )


def parse_23andme(file: str | Path | BinaryIO) -> dict[str, str]:
    """
    Parse a 23andMe raw data file into a dictionary mapping rsid to genotype.

    Args:
        file: File path (str/Path) or file-like object (from Streamlit uploader)

    Returns:
        Dictionary mapping rsid -> genotype (e.g., {'rs4477212': 'AA', 'rs3094315': 'AG'})

    Raises:
        ValueError: If file format is invalid or cannot be parsed
        FileNotFoundError: If file path does not exist
    """
    # Handle different input types
    if isinstance(file, (str, Path)):
        file_path = Path(file)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        with open(file_path, encoding='utf-8') as f:
            content = f.read()
    elif isinstance(file, BytesIO):
        # Streamlit file_uploader returns BytesIO
        content = file.getvalue().decode('utf-8')
        file.seek(0)  # Reset for potential re-reads
    else:
        # Assume it's a file-like object with read()
        content = file.read()
        if isinstance(content, bytes):
            content = content.decode('utf-8')

    # Validate format first
    is_valid, error_msg = validate_23andme_format_from_content(content)
    if not is_valid:
        raise ValueError(f"Invalid 23andMe file format: {error_msg}")

    # Parse the data
    snps = {}
    lines = content.strip().split('\n')

    for _line_num, line in enumerate(lines, 1):
        line = line.strip()

        # Skip empty lines and comments
        if not line or line.startswith('#'):
            continue

        # Parse tab-separated values
        parts = line.split('\t')

        # Some versions have 4 columns (rsid, chr, pos, genotype)
        # Some might have additional columns - we only need the first 4
        if len(parts) < 4:
            # Skip malformed lines
            continue

        rsid = parts[0].strip()
        genotype = parts[3].strip()

        # Skip no-call entries
        if genotype == '--' or genotype == '':
            continue

        # Validate rsid format (should start with 'rs' or be 'i' for indels)
        if not (rsid.startswith('rs') or rsid.startswith('i')):
            # Some files have other ID formats, but we'll skip obviously invalid ones
            if rsid.lower() in ['rsid', 'id', 'snp']:
                # This is likely a header row that wasn't commented
                continue

        # Store the genotype
        snps[rsid] = genotype

    if len(snps) == 0:
        raise ValueError("No valid SNP data found in file. File may be empty or incorrectly formatted.")

    return snps


def validate_23andme_format(file: str | Path | BinaryIO) -> tuple[bool, str]:
    """
    Validate that a file appears to be a valid 23andMe raw data file.

    Args:
        file: File path (str/Path) or file-like object

    Returns:
        Tuple of (is_valid: bool, error_message: str)
        If valid, error_message is empty string
    """
    try:
        # Read content
        if isinstance(file, (str, Path)):
            file_path = Path(file)
            if not file_path.exists():
                return False, f"File not found: {file_path}"
            with open(file_path, encoding='utf-8') as f:
                content = f.read()
        elif isinstance(file, BytesIO):
            content = file.getvalue().decode('utf-8')
            file.seek(0)
        else:
            content = file.read()
            if isinstance(content, bytes):
                content = content.decode('utf-8')

        return validate_23andme_format_from_content(content)

    except UnicodeDecodeError:
        return False, "File is not a valid text file (encoding error)"
    except Exception as e:
        return False, f"Error reading file: {str(e)}"


def validate_23andme_format_from_content(content: str) -> tuple[bool, str]:
    """
    Validate 23andMe format from file content string.

    Args:
        content: File content as string

    Returns:
        Tuple of (is_valid: bool, error_message: str)
    """
    lines = content.strip().split('\n')

    if len(lines) < 2:
        return False, "File is too short to be a valid 23andMe file"

    # Check for 23andMe header signature
    has_23andme_header = False
    has_rsid_header = False
    data_line_count = 0
    valid_data_lines = 0

    for line in lines[:50]:  # Check first 50 lines
        line_lower = line.lower()

        # Look for 23andMe signature in comments
        if '23andme' in line_lower:
            has_23andme_header = True

        # Look for column header
        if line.startswith('#'):
            if 'rsid' in line_lower and ('chromosome' in line_lower or 'position' in line_lower):
                has_rsid_header = True
        else:
            # This is a data line
            data_line_count += 1
            parts = line.strip().split('\t')

            # Valid data line should have 4+ tab-separated columns
            if len(parts) >= 4:
                rsid = parts[0].strip()
                chromosome = parts[1].strip()
                genotype = parts[3].strip()

                # Check if it looks like valid data
                if (rsid.startswith('rs') or rsid.startswith('i')) and \
                   (chromosome.isdigit() or chromosome in ['X', 'Y', 'MT', 'M']) and \
                   len(genotype) <= 4:  # Genotypes are typically 1-2 characters, max 4 for safety
                    valid_data_lines += 1

            # After checking 10 data lines, make a decision
            if data_line_count >= 10:
                break

    # Validation criteria
    if not has_23andme_header and not has_rsid_header:
        return False, "File does not appear to be a 23andMe file (missing header signature)"

    if data_line_count == 0:
        return False, "File contains no data lines (only headers/comments)"

    if valid_data_lines == 0:
        return False, "File contains no valid SNP data (incorrect format)"

    # At least 50% of checked data lines should be valid
    if valid_data_lines / data_line_count < 0.5:
        return False, f"File format appears incorrect (only {valid_data_lines}/{data_line_count} lines are valid)"

    return True, ""


def get_genotype_stats(snps: dict[str, str]) -> dict:
    """
    Calculate statistics about parsed genotype data.

    Args:
        snps: Dictionary mapping rsid -> genotype

    Returns:
        Dictionary containing statistics:
        - total_snps: Total number of SNPs
        - chromosomes: List of chromosomes present
        - chromosome_counts: SNP count per chromosome
        - genotype_distribution: Count of each genotype pattern
        - homozygous_count: Number of homozygous SNPs (AA, TT, etc.)
        - heterozygous_count: Number of heterozygous SNPs (AG, CT, etc.)
    """
    if not snps:
        return {
            'total_snps': 0,
            'chromosomes': [],
            'chromosome_counts': {},
            'genotype_distribution': {},
            'homozygous_count': 0,
            'heterozygous_count': 0
        }

    # Count genotypes
    genotype_dist = {}
    homozygous = 0
    heterozygous = 0

    for genotype in snps.values():
        # Count genotype patterns
        genotype_dist[genotype] = genotype_dist.get(genotype, 0) + 1

        # Classify as homozygous or heterozygous
        if len(genotype) == 2:
            if genotype[0] == genotype[1]:
                homozygous += 1
            else:
                heterozygous += 1
        elif len(genotype) == 1:
            # Single allele (e.g., X/Y chromosome in males)
            homozygous += 1

    # Note: We can't determine chromosomes from rsid alone
    # This would require re-parsing the file or storing chromosome data
    # For now, we'll return placeholder info

    return {
        'total_snps': len(snps),
        'chromosomes': 'N/A - chromosome data not stored in rsid-only dictionary',
        'chromosome_counts': 'N/A - requires full data structure',
        'genotype_distribution': genotype_dist,
        'homozygous_count': homozygous,
        'heterozygous_count': heterozygous
    }


def parse_23andme_with_metadata(file: str | Path | BinaryIO) -> tuple[dict[str, str], dict]:
    """
    Parse 23andMe file and return both SNP data and metadata.

    This extended parser stores chromosome information for better statistics.

    Args:
        file: File path (str/Path) or file-like object

    Returns:
        Tuple of (snps_dict, metadata_dict) where metadata includes:
        - chromosome_data: Dict mapping rsid -> chromosome
        - position_data: Dict mapping rsid -> position
        - file_version: Detected file version if available
    """
    # Handle different input types
    if isinstance(file, (str, Path)):
        file_path = Path(file)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        with open(file_path, encoding='utf-8') as f:
            content = f.read()
    elif isinstance(file, BytesIO):
        content = file.getvalue().decode('utf-8')
        file.seek(0)
    else:
        content = file.read()
        if isinstance(content, bytes):
            content = content.decode('utf-8')

    # Validate format
    is_valid, error_msg = validate_23andme_format_from_content(content)
    if not is_valid:
        raise ValueError(f"Invalid 23andMe file format: {error_msg}")

    # Parse with metadata
    snps = {}
    chromosome_data = {}
    position_data = {}
    file_version = "unknown"

    lines = content.strip().split('\n')

    # Try to detect version from header
    for line in lines[:20]:
        if 'version' in line.lower() and line.startswith('#'):
            file_version = line.strip()
            break

    for line in lines:
        line = line.strip()

        if not line or line.startswith('#'):
            continue

        parts = line.split('\t')
        if len(parts) < 4:
            continue

        rsid = parts[0].strip()
        chromosome = parts[1].strip()
        position = parts[2].strip()
        genotype = parts[3].strip()

        if genotype == '--' or genotype == '':
            continue

        if not (rsid.startswith('rs') or rsid.startswith('i')):
            if rsid.lower() in ['rsid', 'id', 'snp']:
                continue

        snps[rsid] = genotype
        chromosome_data[rsid] = chromosome
        position_data[rsid] = position

    metadata = {
        'chromosome_data': chromosome_data,
        'position_data': position_data,
        'file_version': file_version
    }

    return snps, metadata


def get_detailed_stats(snps: dict[str, str], metadata: dict) -> dict:
    """
    Calculate detailed statistics using metadata from parse_23andme_with_metadata.

    Args:
        snps: Dictionary mapping rsid -> genotype
        metadata: Metadata dictionary with chromosome_data

    Returns:
        Comprehensive statistics dictionary
    """
    if not snps:
        return {
            'total_snps': 0,
            'chromosomes': [],
            'chromosome_counts': {},
            'genotype_distribution': {},
            'homozygous_count': 0,
            'heterozygous_count': 0
        }

    chromosome_data = metadata.get('chromosome_data', {})

    # Count by chromosome
    chromosome_counts = {}
    for rsid in snps:
        chr_val = chromosome_data.get(rsid, 'unknown')
        chromosome_counts[chr_val] = chromosome_counts.get(chr_val, 0) + 1

    # Get sorted chromosome list
    chromosomes = sorted(chromosome_counts.keys(),
                        key=lambda x: (not x.isdigit(), int(x) if x.isdigit() else 0, x))

    # Count genotypes
    genotype_dist = {}
    homozygous = 0
    heterozygous = 0

    for genotype in snps.values():
        genotype_dist[genotype] = genotype_dist.get(genotype, 0) + 1

        if len(genotype) == 2:
            if genotype[0] == genotype[1]:
                homozygous += 1
            else:
                heterozygous += 1
        elif len(genotype) == 1:
            homozygous += 1

    return {
        'total_snps': len(snps),
        'chromosomes': chromosomes,
        'chromosome_counts': chromosome_counts,
        'genotype_distribution': genotype_dist,
        'homozygous_count': homozygous,
        'heterozygous_count': heterozygous,
        'file_version': metadata.get('file_version', 'unknown')
    }


# ===================================================================
# AncestryDNA support
# ===================================================================

# Valid chromosome values for AncestryDNA files (numeric strings)
_ANCESTRY_VALID_CHROMOSOMES = {str(i) for i in range(1, 27)}
# Valid nucleotide characters for alleles
_VALID_ALLELES = {'A', 'C', 'G', 'T'}


def _read_file_content(file: str | Path | BinaryIO) -> str:
    """Read file content from a path or file-like object, returning a string.

    .. deprecated::
        Use ``_line_iterator`` for streaming access instead. This function
        loads the entire file into memory and is kept only for backward
        compatibility with existing validators that operate on content strings.

    Raises:
        FileNotFoundError: If a path is given and does not exist.
        UnicodeDecodeError: If the content is not valid UTF-8.
    """
    if isinstance(file, (str, Path)):
        file_path = Path(file)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        with open(file_path, encoding='utf-8') as f:
            return f.read()
    elif isinstance(file, BytesIO):
        content = file.getvalue().decode('utf-8')
        file.seek(0)  # Reset for potential re-reads
        return content
    else:
        content = file.read()
        if isinstance(content, bytes):
            content = content.decode('utf-8')
        return content


def detect_format(file: str | Path | BinaryIO) -> str:
    """Auto-detect whether a file is 23andMe, AncestryDNA, or MyHeritage/FTDNA format.

    Args:
        file: File path (str/Path) or file-like object.

    Returns:
        ``"23andme"``, ``"ancestry"``, ``"myheritage"``, ``"vcf"``,
        or ``"unknown"``.
    """
    try:
        content = _read_file_content(file)
    except (UnicodeDecodeError, FileNotFoundError):
        return "unknown"
    except Exception:
        return "unknown"

    return _detect_format_from_content(content)


def _detect_format_from_content(content: str) -> str:
    """Detect format from raw file-content string."""
    lines = content.strip().split('\n')

    comment_lines = []
    first_data_lines = []

    for line in lines[:50]:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith('#'):
            comment_lines.append(stripped)
        else:
            first_data_lines.append(stripped)
            if len(first_data_lines) >= 10:
                break

    # --- VCF detection (check first -- ## lines are very distinctive) ---
    has_vcf_fileformat = False
    has_chrom_header = False
    for cline in comment_lines:
        if cline.lower().startswith('##fileformat=vcf'):
            has_vcf_fileformat = True
        if cline.startswith('#CHROM'):
            has_chrom_header = True
    if has_vcf_fileformat:
        return "vcf"
    # Also detect if first non-empty line starts with ## and there's a #CHROM line
    if comment_lines and comment_lines[0].startswith('##') and has_chrom_header:
        return "vcf"

    # --- Check comment signatures ---
    for cline in comment_lines:
        cline_lower = cline.lower()
        if 'ancestrydna' in cline_lower:
            return "ancestry"
        if '23andme' in cline_lower:
            return "23andme"

    # --- Check header row for AncestryDNA 5-column layout ---
    if first_data_lines:
        header_candidate = first_data_lines[0]
        header_parts = header_candidate.split('\t')
        header_lower = header_candidate.lower()
        if len(header_parts) == 5 and 'allele1' in header_lower and 'allele2' in header_lower:
            return "ancestry"

    # --- Check for MyHeritage/FTDNA CSV format ---
    if first_data_lines:
        header_candidate = first_data_lines[0]
        # Strip quotes for comparison; MyHeritage uses comma-separated fields
        header_lower = header_candidate.replace('"', '').lower()
        comma_parts = [p.strip().strip('"').lower() for p in header_candidate.split(',')]
        if (len(comma_parts) >= 4
                and 'rsid' in comma_parts[0]
                and 'chromosome' in comma_parts[1]
                and 'position' in comma_parts[2]
                and 'result' in comma_parts[3]):
            return "myheritage"

        # No header but comma-separated data lines matching pattern
        mh_hits = 0
        mh_checked = 0
        for dline in first_data_lines:
            cparts = [p.strip().strip('"') for p in dline.split(',')]
            if len(cparts) == 4:
                rsid = cparts[0]
                result = cparts[3]
                if rsid.lower() in ('rsid',):
                    continue
                mh_checked += 1
                if ((rsid.startswith('rs') or rsid.startswith('i') or rsid.startswith('VG'))
                        and (len(result) == 2 or result == '--')):
                    mh_hits += 1
        if mh_checked > 0 and mh_hits / mh_checked >= 0.5:
            return "myheritage"

    # --- Heuristic: check data rows for 4-col combined genotype (23andMe) ---
    four_col_hits = 0
    data_rows_checked = 0
    for dline in first_data_lines:
        parts = dline.split('\t')
        # Skip a potential header row
        if parts[0].lower() in ('rsid', 'id', 'snp'):
            continue
        data_rows_checked += 1
        if len(parts) == 4:
            rsid = parts[0]
            genotype = parts[3].strip()
            if (rsid.startswith('rs') or rsid.startswith('i')) and 0 < len(genotype) <= 4:
                four_col_hits += 1

    if data_rows_checked > 0 and four_col_hits / data_rows_checked >= 0.5:
        return "23andme"

    return "unknown"


def _detect_format_from_lines(lines: list[str]) -> str:
    """Detect genetic file format from a list of header lines.

    This is the streaming-friendly counterpart of ``_detect_format_from_content``.
    It accepts the pre-read header lines (typically from ``_read_header_lines``)
    and delegates to the existing content-based detector.
    """
    content = '\n'.join(lines)
    return _detect_format_from_content(content)


def validate_ancestry_format_from_content(content: str) -> tuple[bool, str]:
    """Validate AncestryDNA format from file content string.

    Args:
        content: File content as string.

    Returns:
        Tuple of (is_valid, error_message).  If valid, error_message is ``""``.
    """
    lines = content.strip().split('\n')

    if len(lines) < 2:
        return False, "File is too short to be a valid AncestryDNA file"

    has_ancestry_header = False
    has_allele_header = False
    data_line_count = 0
    valid_data_lines = 0

    for line in lines[:50]:
        stripped = line.strip()
        if not stripped:
            continue

        if stripped.startswith('#'):
            if 'ancestrydna' in stripped.lower():
                has_ancestry_header = True
            continue

        # Non-comment line
        parts = stripped.split('\t')

        # Check for header row with allele1/allele2
        lower = stripped.lower()
        if 'allele1' in lower and 'allele2' in lower and len(parts) == 5:
            has_allele_header = True
            continue

        # Data line
        data_line_count += 1

        if len(parts) != 5:
            # Not a valid 5-column line
            if data_line_count >= 10:
                break
            continue

        rsid = parts[0].strip()
        chromosome = parts[1].strip()
        allele1 = parts[3].strip().upper()
        allele2 = parts[4].strip().upper()

        rsid_ok = rsid.startswith('rs') or rsid.startswith('i')
        chr_ok = chromosome in _ANCESTRY_VALID_CHROMOSOMES
        a1_ok = allele1 in _VALID_ALLELES or allele1 == '0'
        a2_ok = allele2 in _VALID_ALLELES or allele2 == '0'

        if rsid_ok and chr_ok and a1_ok and a2_ok:
            valid_data_lines += 1

        if data_line_count >= 10:
            break

    # --- Decision ---
    if not has_ancestry_header and not has_allele_header:
        return False, "File does not appear to be an AncestryDNA file (missing header signature)"

    if data_line_count == 0:
        return False, "File contains no data lines (only headers/comments)"

    if valid_data_lines == 0:
        return False, "File contains no valid SNP data (incorrect format)"

    if valid_data_lines / data_line_count < 0.5:
        return False, (
            f"File format appears incorrect "
            f"(only {valid_data_lines}/{data_line_count} lines are valid)"
        )

    return True, ""


def validate_ancestry_format(file: str | Path | BinaryIO) -> tuple[bool, str]:
    """Validate that a file appears to be a valid AncestryDNA raw data file.

    Args:
        file: File path (str/Path) or file-like object.

    Returns:
        Tuple of (is_valid, error_message).
    """
    try:
        content = _read_file_content(file)
        return validate_ancestry_format_from_content(content)
    except UnicodeDecodeError:
        return False, "File is not a valid text file (encoding error)"
    except Exception as e:
        return False, f"Error reading file: {str(e)}"


def parse_ancestry(file: str | Path | BinaryIO) -> dict[str, str]:
    """Parse an AncestryDNA raw data file into a dictionary mapping rsid to
    combined genotype.

    Allele columns are concatenated (e.g. allele1='A', allele2='G' -> 'AG').
    No-call rows (allele value ``'0'``) are skipped.

    Args:
        file: File path (str/Path) or file-like object.

    Returns:
        Dictionary mapping rsid -> genotype (e.g. ``{'rs4477212': 'TT'}``).

    Raises:
        ValueError: If file format is invalid or no SNP data found.
        FileNotFoundError: If file path does not exist.
    """
    content = _read_file_content(file)
    is_valid, error_msg = validate_ancestry_format_from_content(content)
    if not is_valid:
        raise ValueError(f"Invalid AncestryDNA file format: {error_msg}")
    return _parse_ancestry_from_content(content)


def parse_genetic_file(
    file: str | Path | BinaryIO,
) -> tuple[dict[str, str], str]:
    """Universal parser -- auto-detect format and parse.

    Uses a two-phase streaming approach:
    1. Read only the first 50 header lines to detect the format.
    2. Stream-parse the full file line-by-line (memory-efficient).

    Args:
        file: File path (str/Path) or file-like object.

    Returns:
        Tuple of (snps_dict, format_name) where *format_name* is
        ``"23andme"``, ``"ancestry"``, ``"myheritage"``, ``"vcf"``,
        or ``"unknown"``.

    Raises:
        ValueError: If format is unknown, parsing fails, or file
            exceeds size / SNP count limits.
    """
    # Validate file size before anything else
    _validate_file_size(file)

    # Phase 1: Detect format from header lines only
    header_lines = _read_header_lines(file, max_lines=50)
    detected_format = _detect_format_from_lines(header_lines)

    # Phase 2: Stream-parse the full file
    if hasattr(file, 'seek'):
        file.seek(0)

    parser_map = {
        "23andme": _parse_23andme_streaming,
        "ancestry": _parse_ancestry_streaming,
        "myheritage": _parse_myheritage_streaming,
        "vcf": _parse_vcf_streaming,
    }

    parser = parser_map.get(detected_format)
    if not parser:
        raise ValueError(
            "Unrecognized genetic data format. "
            "Please upload a 23andMe, AncestryDNA, MyHeritage/FTDNA, "
            "or VCF raw data file."
        )

    return parser(file), detected_format


def validate_genetic_file(
    file: str | Path | BinaryIO,
) -> tuple[bool, str, str]:
    """Universal validator -- auto-detect format and validate.

    Args:
        file: File path (str/Path) or file-like object.

    Returns:
        Tuple of (is_valid, error_message, format_name).
        *format_name* is ``"23andme"``, ``"ancestry"``, ``"myheritage"``,
        ``"vcf"``, or ``"unknown"``.
    """
    try:
        content = _read_file_content(file)
    except UnicodeDecodeError:
        return False, "File is not a valid text file (encoding error)", "unknown"
    except Exception as e:
        return False, f"Error reading file: {str(e)}", "unknown"

    fmt = _detect_format_from_content(content)

    if fmt == "vcf":
        is_valid, err = validate_vcf_format_from_content(content)
        return is_valid, err, "vcf"

    if fmt == "ancestry":
        is_valid, err = validate_ancestry_format_from_content(content)
        return is_valid, err, "ancestry"

    if fmt == "myheritage":
        is_valid, err = validate_myheritage_format_from_content(content)
        return is_valid, err, "myheritage"

    if fmt == "23andme":
        is_valid, err = validate_23andme_format_from_content(content)
        return is_valid, err, "23andme"

    return False, (
        "Unrecognized genetic data format. "
        "Please upload a 23andMe, AncestryDNA, MyHeritage/FTDNA, or VCF raw data file."
    ), "unknown"


# ===================================================================
# MyHeritage / FamilyTreeDNA support
# ===================================================================

# Valid chromosome values for MyHeritage/FTDNA files
_MYHERITAGE_VALID_CHROMOSOMES = (
    {str(i) for i in range(1, 23)} | {'X', 'Y', 'MT'}
)


def validate_myheritage_format_from_content(content: str) -> tuple[bool, str]:
    """Validate MyHeritage/FTDNA CSV format from file content string.

    MyHeritage and FamilyTreeDNA both use the same Gene by Gene lab format:
    comma-separated with columns RSID, CHROMOSOME, POSITION, RESULT.
    Fields may or may not be quoted.

    Args:
        content: File content as string.

    Returns:
        Tuple of (is_valid, error_message).  If valid, error_message is ``""``.
    """
    lines = content.strip().split('\n')

    if len(lines) < 2:
        return False, "File is too short to be a valid MyHeritage/FTDNA file"

    has_header = False
    data_line_count = 0
    valid_data_lines = 0

    for line in lines[:50]:
        stripped = line.strip()
        if not stripped:
            continue

        # Use csv module to correctly parse quoted/unquoted fields
        try:
            row = next(csv.reader([stripped]))
        except Exception:  # noqa: S112
            continue

        if len(row) < 4:
            continue

        # Check for header row
        if row[0].strip().lower() == 'rsid':
            header_lower = [f.strip().lower() for f in row]
            if ('chromosome' in header_lower and 'position' in header_lower
                    and 'result' in header_lower):
                has_header = True
            continue

        # Data line
        data_line_count += 1

        rsid = row[0].strip()
        chromosome = row[1].strip()
        result = row[3].strip()

        rsid_ok = (rsid.startswith('rs') or rsid.startswith('i')
                   or rsid.startswith('VG'))
        chr_ok = chromosome in _MYHERITAGE_VALID_CHROMOSOMES
        result_ok = (len(result) == 2 or result == '--')

        if rsid_ok and chr_ok and result_ok:
            valid_data_lines += 1

        if data_line_count >= 10:
            break

    # --- Decision ---
    if not has_header:
        # Also accept if data lines look right even without a recognizable header
        if data_line_count == 0 or valid_data_lines == 0:
            return False, (
                "File does not appear to be a MyHeritage/FTDNA file "
                "(missing RSID,CHROMOSOME,POSITION,RESULT header)"
            )

    if data_line_count == 0:
        return False, "File contains no data lines (only headers)"

    if valid_data_lines == 0:
        return False, "File contains no valid SNP data (incorrect format)"

    if valid_data_lines / data_line_count < 0.5:
        return False, (
            f"File format appears incorrect "
            f"(only {valid_data_lines}/{data_line_count} lines are valid)"
        )

    return True, ""


def validate_myheritage_format(
    file: str | Path | BinaryIO,
) -> tuple[bool, str]:
    """Validate that a file appears to be a valid MyHeritage/FTDNA raw data file.

    Args:
        file: File path (str/Path) or file-like object.

    Returns:
        Tuple of (is_valid, error_message).
    """
    try:
        content = _read_file_content(file)
        return validate_myheritage_format_from_content(content)
    except UnicodeDecodeError:
        return False, "File is not a valid text file (encoding error)"
    except Exception as e:
        return False, f"Error reading file: {str(e)}"


def parse_myheritage(file: str | Path | BinaryIO) -> dict[str, str]:
    """Parse a MyHeritage/FTDNA raw data CSV file into a dictionary mapping
    rsid to genotype.

    Both MyHeritage and FamilyTreeDNA use the same Gene by Gene lab format
    with columns: RSID, CHROMOSOME, POSITION, RESULT.

    Args:
        file: File path (str/Path) or file-like object.

    Returns:
        Dictionary mapping rsid -> genotype (e.g. ``{'rs3094315': 'AA'}``).

    Raises:
        ValueError: If file format is invalid or no SNP data found.
        FileNotFoundError: If file path does not exist.
    """
    content = _read_file_content(file)
    is_valid, error_msg = validate_myheritage_format_from_content(content)
    if not is_valid:
        raise ValueError(f"Invalid MyHeritage/FTDNA file format: {error_msg}")
    return _parse_myheritage_from_content(content)


# ===================================================================
# Internal content-based parsers (avoid re-reading files)
# ===================================================================

def _parse_ancestry_from_content(content: str) -> dict[str, str]:
    """Parse AncestryDNA data from a content string."""
    snps: dict[str, str] = {}
    for line in content.strip().split('\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue
        parts = stripped.split('\t')
        if parts[0].lower() in ('rsid', 'id', 'snp'):
            continue
        if len(parts) < 5:
            continue
        rsid = parts[0].strip()
        allele1 = parts[3].strip().upper()
        allele2 = parts[4].strip().upper()
        if allele1 == '0' or allele2 == '0':
            continue
        if not (rsid.startswith('rs') or rsid.startswith('i')):
            continue
        snps[rsid] = allele1 + allele2

    if len(snps) == 0:
        raise ValueError(
            "No valid SNP data found in AncestryDNA file."
        )
    return snps


def _parse_23andme_from_content(content: str) -> dict[str, str]:
    """Parse 23andMe data from a content string."""
    snps: dict[str, str] = {}
    for line in content.strip().split('\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue
        parts = stripped.split('\t')
        if len(parts) < 4:
            continue
        rsid = parts[0].strip()
        genotype = parts[3].strip()
        if genotype == '--' or genotype == '':
            continue
        if not (rsid.startswith('rs') or rsid.startswith('i')):
            if rsid.lower() in ('rsid', 'id', 'snp'):
                continue
        snps[rsid] = genotype

    if len(snps) == 0:
        raise ValueError(
            "No valid SNP data found in 23andMe file."
        )
    return snps


def _parse_myheritage_from_content(content: str) -> dict[str, str]:
    """Parse MyHeritage/FTDNA data from a content string.

    Uses Python's ``csv`` module to correctly handle both quoted and unquoted
    CSV fields.  Skips the header row and no-call entries (``'--'``).
    """
    snps: dict[str, str] = {}
    reader = csv.reader(StringIO(content))

    for row in reader:
        if len(row) < 4:
            continue

        rsid = row[0].strip()
        genotype = row[3].strip()

        # Skip header row
        if rsid.lower() == 'rsid':
            continue

        # Skip no-calls and empty results
        if genotype == '--' or genotype == '':
            continue

        # Accept rs*, i*, and VG* (proprietary) RSIDs
        if not (rsid.startswith('rs') or rsid.startswith('i')
                or rsid.startswith('VG')):
            continue

        snps[rsid] = genotype

    if len(snps) == 0:
        raise ValueError(
            "No valid SNP data found in MyHeritage/FTDNA file."
        )
    return snps


# ===================================================================
# VCF (Variant Call Format) support
# ===================================================================


def validate_vcf_format_from_content(content: str) -> tuple[bool, str]:
    """Validate VCF format from file content string.

    Checks for:
    - At least one ``##fileformat=VCF`` meta-information line.
    - A ``#CHROM`` header line with at least 10 tab-separated columns.
    - Data lines with at least 10 tab-separated columns.
    - A FORMAT column that contains ``GT``.

    Args:
        content: File content as string.

    Returns:
        Tuple of (is_valid, error_message).  If valid, error_message is ``""``.
    """
    lines = content.strip().split('\n')

    if len(lines) < 2:
        return False, "File is too short to be a valid VCF file"

    has_fileformat = False
    has_chrom_header = False
    chrom_col_count = 0
    data_line_count = 0
    valid_data_lines = 0
    gt_in_format = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if stripped.lower().startswith('##fileformat=vcf'):
            has_fileformat = True
            continue

        if stripped.startswith('##'):
            continue

        if stripped.startswith('#CHROM'):
            has_chrom_header = True
            chrom_col_count = len(stripped.split('\t'))
            continue

        # Data line
        if not has_chrom_header:
            continue

        data_line_count += 1
        parts = stripped.split('\t')

        if len(parts) >= 10:
            format_field = parts[8]
            if 'GT' in format_field.split(':'):
                gt_in_format = True
                valid_data_lines += 1

        if data_line_count >= 10:
            break

    if not has_fileformat:
        return False, "File does not contain a ##fileformat=VCF meta-information line"

    if not has_chrom_header:
        return False, "File does not contain a #CHROM header line"

    if chrom_col_count < 10:
        return False, (
            f"#CHROM header has only {chrom_col_count} columns "
            f"(expected at least 10 tab-separated columns)"
        )

    if data_line_count == 0:
        return False, "File contains no data lines after the #CHROM header"

    if valid_data_lines == 0:
        return False, "No valid data lines found (FORMAT column must contain GT)"

    if not gt_in_format:
        return False, "FORMAT column does not contain GT field"

    return True, ""


def validate_vcf_format(
    file: str | Path | BinaryIO,
) -> tuple[bool, str]:
    """Validate that a file appears to be a valid VCF file.

    Args:
        file: File path (str/Path) or file-like object.

    Returns:
        Tuple of (is_valid, error_message).
    """
    try:
        content = _read_file_content(file)
        return validate_vcf_format_from_content(content)
    except UnicodeDecodeError:
        return False, "File is not a valid text file (encoding error)"
    except Exception as e:
        return False, f"Error reading file: {str(e)}"


def _parse_vcf_from_content(content: str) -> dict[str, str]:
    """Parse VCF data from a content string.

    Extracts SNPs (single nucleotide variants) that have an rsID.
    Skips indels, no-call genotypes, and variants without rsIDs.
    Only uses the first sample column (column index 9).

    Genotype (GT) field encodes alleles as integers separated by
    ``/`` (unphased) or ``|`` (phased):
    - 0 = REF allele
    - 1 = first ALT allele, 2 = second ALT, etc.
    - ``.`` = missing / no-call

    Returns:
        Dictionary mapping rsid -> genotype (e.g. ``{'rs6054257': 'GG'}``).

    Raises:
        ValueError: If no valid SNP data is found.
    """
    snps: dict[str, str] = {}
    past_header = False

    for line in content.strip().split('\n'):
        stripped = line.strip()
        if not stripped:
            continue

        # Skip meta-information lines
        if stripped.startswith('##'):
            continue

        # Skip header line but mark that we've passed it
        if stripped.startswith('#CHROM'):
            past_header = True
            continue

        if not past_header:
            continue

        parts = stripped.split('\t')
        if len(parts) < 10:
            continue

        variant_id = parts[2]   # ID column (rsid or '.')
        ref = parts[3]          # REF allele
        alt = parts[4]          # ALT allele(s), comma-separated
        format_field = parts[8] # FORMAT column
        sample_field = parts[9] # First sample column

        # Only process variants with rsIDs
        if not variant_id.startswith('rs'):
            continue

        # Only process SNPs: REF must be single char
        if len(ref) != 1:
            continue

        # Split ALT alleles and check all are single-char (SNPs only)
        alt_alleles = alt.split(',')
        if any(len(a) != 1 for a in alt_alleles):
            continue

        # Build allele list: index 0 = REF, 1+ = ALT alleles
        allele_list = [ref] + alt_alleles

        # Find GT index in FORMAT field
        format_keys = format_field.split(':')
        try:
            gt_index = format_keys.index('GT')
        except ValueError:
            # No GT in FORMAT for this line, skip
            continue

        # Extract GT value from sample field
        sample_values = sample_field.split(':')
        if gt_index >= len(sample_values):
            continue

        gt_value = sample_values[gt_index]

        # Skip no-call genotypes
        if gt_value in ('./.', '.|.', '.'):
            continue

        # Parse GT: split on / or |
        separator = '|' if '|' in gt_value else '/'
        allele_indices = gt_value.split(separator)

        if len(allele_indices) != 2:
            continue

        # Map indices to nucleotides
        try:
            idx_a = int(allele_indices[0])
            idx_b = int(allele_indices[1])
        except ValueError:
            # Could be '.' in one position (half-call), skip
            continue

        if idx_a >= len(allele_list) or idx_b >= len(allele_list):
            continue

        genotype = allele_list[idx_a] + allele_list[idx_b]
        snps[variant_id] = genotype

    if len(snps) == 0:
        raise ValueError(
            "No valid SNP data found in VCF file. "
            "Ensure the file contains variants with rsIDs and GT genotype data."
        )
    return snps


def parse_vcf(file: str | Path | BinaryIO) -> dict[str, str]:
    """Parse a VCF (Variant Call Format) file into a dictionary mapping
    rsid to genotype.

    Only extracts SNPs (single nucleotide variants) with rsIDs.
    Skips indels, multi-base variants, no-call genotypes, and entries
    without rsIDs.

    Args:
        file: File path (str/Path) or file-like object.

    Returns:
        Dictionary mapping rsid -> genotype (e.g. ``{'rs6054257': 'GG'}``).

    Raises:
        ValueError: If file format is invalid or no SNP data found.
        FileNotFoundError: If file path does not exist.
    """
    content = _read_file_content(file)
    is_valid, error_msg = validate_vcf_format_from_content(content)
    if not is_valid:
        raise ValueError(f"Invalid VCF file format: {error_msg}")
    return _parse_vcf_from_content(content)


# ===================================================================
# Streaming parsers (line-by-line, memory-efficient)
# ===================================================================

def _parse_23andme_streaming(file) -> dict[str, str]:
    """Stream-parse a 23andMe file.

    Equivalent to ``_parse_23andme_from_content`` but reads the file
    line-by-line via ``_line_iterator`` so that the entire content
    never needs to reside in memory at once.
    """
    snps: dict[str, str] = {}
    for line in _line_iterator(file):
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue
        parts = stripped.split('\t')
        if len(parts) < 4:
            continue
        rsid = parts[0].strip()
        genotype = parts[3].strip()
        if genotype == '--' or genotype == '':
            continue
        if not (rsid.startswith('rs') or rsid.startswith('i')):
            if rsid.lower() in ('rsid', 'id', 'snp'):
                continue
        snps[rsid] = genotype
        if len(snps) > MAX_SNP_COUNT:
            raise ValueError(
                f"SNP count exceeds maximum ({MAX_SNP_COUNT:,}). "
                "File may be corrupted or not a genetic data file."
            )

    if len(snps) == 0:
        raise ValueError(
            "No valid SNP data found in 23andMe file."
        )
    return snps


def _parse_ancestry_streaming(file) -> dict[str, str]:
    """Stream-parse an AncestryDNA file.

    Equivalent to ``_parse_ancestry_from_content`` but reads the file
    line-by-line via ``_line_iterator``.
    """
    snps: dict[str, str] = {}
    for line in _line_iterator(file):
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue
        parts = stripped.split('\t')
        if parts[0].lower() in ('rsid', 'id', 'snp'):
            continue
        if len(parts) < 5:
            continue
        rsid = parts[0].strip()
        allele1 = parts[3].strip().upper()
        allele2 = parts[4].strip().upper()
        if allele1 == '0' or allele2 == '0':
            continue
        if not (rsid.startswith('rs') or rsid.startswith('i')):
            continue
        snps[rsid] = allele1 + allele2
        if len(snps) > MAX_SNP_COUNT:
            raise ValueError(
                f"SNP count exceeds maximum ({MAX_SNP_COUNT:,}). "
                "File may be corrupted or not a genetic data file."
            )

    if len(snps) == 0:
        raise ValueError(
            "No valid SNP data found in AncestryDNA file."
        )
    return snps


def _parse_myheritage_streaming(file) -> dict[str, str]:
    """Stream-parse a MyHeritage/FTDNA CSV file.

    Equivalent to ``_parse_myheritage_from_content`` but reads the file
    line-by-line via ``_line_iterator`` and uses ``csv.reader`` per line.
    """
    snps: dict[str, str] = {}
    for line in _line_iterator(file):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            row = next(csv.reader([stripped]))
        except Exception:  # noqa: BLE001, S112
            continue
        if len(row) < 4:
            continue
        rsid = row[0].strip()
        genotype = row[3].strip()
        # Skip header row
        if rsid.lower() == 'rsid':
            continue
        # Skip no-calls and empty results
        if genotype == '--' or genotype == '':
            continue
        # Accept rs*, i*, and VG* (proprietary) RSIDs
        if not (rsid.startswith('rs') or rsid.startswith('i')
                or rsid.startswith('VG')):
            continue
        snps[rsid] = genotype
        if len(snps) > MAX_SNP_COUNT:
            raise ValueError(
                f"SNP count exceeds maximum ({MAX_SNP_COUNT:,}). "
                "File may be corrupted or not a genetic data file."
            )

    if len(snps) == 0:
        raise ValueError(
            "No valid SNP data found in MyHeritage/FTDNA file."
        )
    return snps


def _parse_vcf_streaming(file) -> dict[str, str]:
    """Stream-parse a VCF file.

    Equivalent to ``_parse_vcf_from_content`` but reads the file
    line-by-line via ``_line_iterator``.
    """
    snps: dict[str, str] = {}
    past_header = False

    for line in _line_iterator(file):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith('##'):
            continue
        if stripped.startswith('#CHROM'):
            past_header = True
            continue
        if not past_header:
            continue

        parts = stripped.split('\t')
        if len(parts) < 10:
            continue

        variant_id = parts[2]   # ID column (rsid or '.')
        ref = parts[3]          # REF allele
        alt = parts[4]          # ALT allele(s), comma-separated
        format_field = parts[8]  # FORMAT column
        sample_field = parts[9]  # First sample column

        # Only process variants with rsIDs
        if not variant_id.startswith('rs'):
            continue

        # Only process SNPs: REF must be single char
        if len(ref) != 1:
            continue

        # Split ALT alleles and check all are single-char (SNPs only)
        alt_alleles = alt.split(',')
        if any(len(a) != 1 for a in alt_alleles):
            continue

        # Build allele list: index 0 = REF, 1+ = ALT alleles
        allele_list = [ref] + alt_alleles

        # Find GT index in FORMAT field
        format_keys = format_field.split(':')
        try:
            gt_index = format_keys.index('GT')
        except ValueError:
            continue

        # Extract GT value from sample field
        sample_values = sample_field.split(':')
        if gt_index >= len(sample_values):
            continue

        gt_value = sample_values[gt_index]

        # Skip no-call genotypes
        if gt_value in ('./.', '.|.', '.'):
            continue

        # Parse GT: split on / or |
        separator = '|' if '|' in gt_value else '/'
        allele_indices = gt_value.split(separator)

        if len(allele_indices) != 2:
            continue

        # Map indices to nucleotides
        try:
            idx_a = int(allele_indices[0])
            idx_b = int(allele_indices[1])
        except ValueError:
            continue

        if idx_a >= len(allele_list) or idx_b >= len(allele_list):
            continue

        genotype = allele_list[idx_a] + allele_list[idx_b]
        snps[variant_id] = genotype
        if len(snps) > MAX_SNP_COUNT:
            raise ValueError(
                f"SNP count exceeds maximum ({MAX_SNP_COUNT:,}). "
                "File may be corrupted or not a genetic data file."
            )

    if len(snps) == 0:
        raise ValueError(
            "No valid SNP data found in VCF file. "
            "Ensure the file contains variants with rsIDs and GT genotype data."
        )
    return snps
