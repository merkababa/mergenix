"""Local SNPedia GFF file parser.

NOTE: GFF download is currently blocked by bot protection.
This module gracefully handles missing files.
The curated trait_snps.json is the primary data source.
"""

from typing import Dict, List


def load_snpedia_gff(gff_path: str) -> Dict[str, str]:
    """Parse SNPedia GFF file into rsID lookup dict.

    GFF format (tab-separated):
    seqname, source, feature, start, end, score, strand, frame, attributes

    Args:
        gff_path: Path to SNPedia GFF file

    Returns:
        Dict mapping {rsid: annotation}
        Empty dict if file doesn't exist or is invalid
    """
    rsid_lookup = {}

    try:
        with open(gff_path, 'r', encoding='utf-8') as f:
            for line in f:
                # Skip comments and empty lines
                line = line.strip()
                if not line or line.startswith('#'):
                    continue

                # Parse tab-separated columns
                parts = line.split('\t')
                if len(parts) < 9:
                    continue

                # Extract attributes column
                attributes = parts[8]

                # Parse rsID from attributes
                rsid = _extract_rsid(attributes)
                if not rsid:
                    continue

                # Extract annotation (any useful info from attributes)
                annotation = _extract_annotation(attributes)

                # Store in lookup
                rsid_lookup[rsid.lower()] = annotation

        return rsid_lookup

    except FileNotFoundError:
        # File doesn't exist - return empty dict
        return {}
    except Exception:
        # Any other error - return empty dict
        return {}


def enrich_with_snpedia(results: List[dict], gff_data: Dict[str, str]) -> List[dict]:
    """Add SNPedia annotations to analysis results.

    Args:
        results: List of variant dicts with 'rsid' field
        gff_data: Dict from load_snpedia_gff()

    Returns:
        Same list with 'snpedia_note' field added where available
    """
    if not gff_data:
        return results

    for result in results:
        rsid = result.get('rsid', '').lower()
        if rsid in gff_data:
            result['snpedia_note'] = gff_data[rsid]

    return results


def _extract_rsid(attributes: str) -> str:
    """Extract rsID from GFF attributes string.

    Args:
        attributes: GFF attributes column (semicolon-separated key=value pairs)

    Returns:
        rsID string or empty string if not found
    """
    # Look for ID=rs... or Name=rs... patterns
    for pair in attributes.split(';'):
        pair = pair.strip()
        if '=' not in pair:
            continue

        key, value = pair.split('=', 1)
        key = key.strip().lower()
        value = value.strip()

        if key in ('id', 'name') and value.startswith('rs'):
            return value

    return ''


def _extract_annotation(attributes: str) -> str:
    """Extract useful annotation from GFF attributes.

    Args:
        attributes: GFF attributes column

    Returns:
        Annotation string (may be empty)
    """
    # Look for note, description, or dbxref fields
    annotations = []

    for pair in attributes.split(';'):
        pair = pair.strip()
        if '=' not in pair:
            continue

        key, value = pair.split('=', 1)
        key = key.strip().lower()
        value = value.strip()

        if key in ('note', 'description', 'dbxref'):
            annotations.append(value)

    return ' | '.join(annotations) if annotations else ''
