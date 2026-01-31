"""
23andMe Raw Data Parser

This module provides robust parsing functionality for 23andMe genetic data files.
Handles multiple file format versions (v3, v4, v5) and validates data integrity.
"""

from typing import Dict, Tuple, Union, BinaryIO
from io import StringIO, BytesIO
from pathlib import Path


def parse_23andme(file: Union[str, Path, BinaryIO]) -> Dict[str, str]:
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
        with open(file_path, 'r', encoding='utf-8') as f:
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

    for line_num, line in enumerate(lines, 1):
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


def validate_23andme_format(file: Union[str, Path, BinaryIO]) -> Tuple[bool, str]:
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
            with open(file_path, 'r', encoding='utf-8') as f:
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


def validate_23andme_format_from_content(content: str) -> Tuple[bool, str]:
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


def get_genotype_stats(snps: Dict[str, str]) -> Dict:
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


def parse_23andme_with_metadata(file: Union[str, Path, BinaryIO]) -> Tuple[Dict[str, str], Dict]:
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
        with open(file_path, 'r', encoding='utf-8') as f:
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


def get_detailed_stats(snps: Dict[str, str], metadata: Dict) -> Dict:
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
