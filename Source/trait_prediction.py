"""
Trait Prediction Engine for Mergenix Genetic Offspring Analysis

This module implements Mendelian genetics (Punnett square) to predict offspring
trait probabilities from two parents' genotypes using 23andMe SNP data.
"""

import streamlit as st


@st.cache_data
def load_trait_database(db_path: str) -> list[dict]:
    """
    Load the trait SNP database from JSON file, cached across reruns.

    Args:
        db_path: Path to trait_snps.json

    Returns:
        List of trait entries, each containing rsid, trait, gene, chromosome,
        inheritance, alleles, phenotype_map, description, and confidence
    """
    import json

    with open(db_path) as f:
        return json.load(f)


def get_parent_alleles(genotype: str) -> tuple[str, str]:
    """
    Split a genotype string into two alleles.

    Args:
        genotype: Two-character genotype string (e.g., "AG", "AA", "GG")

    Returns:
        Tuple of two alleles (e.g., ("A", "G"))
    """
    if len(genotype) != 2:
        raise ValueError(f"Invalid genotype format: {genotype}")
    return (genotype[0], genotype[1])


def punnett_square(
    parent_a_alleles: tuple[str, str],
    parent_b_alleles: tuple[str, str]
) -> dict[str, float]:
    """
    Calculate all possible offspring genotypes and their probabilities
    using Punnett square logic.

    Args:
        parent_a_alleles: Tuple of two alleles from parent A
        parent_b_alleles: Tuple of two alleles from parent B

    Returns:
        Dictionary mapping normalized genotypes to probabilities
        Example: {"AA": 0.25, "AG": 0.5, "GG": 0.25}
    """
    outcomes = {}

    # Each parent contributes one allele randomly
    # Generate all 4 possible combinations
    for allele_a in parent_a_alleles:
        for allele_b in parent_b_alleles:
            # Normalize genotype: always put alleles in alphabetical order
            # This ensures "AG" and "GA" are treated as equivalent
            genotype = ''.join(sorted([allele_a, allele_b]))
            outcomes[genotype] = outcomes.get(genotype, 0) + 0.25

    return outcomes


def predict_offspring_genotypes(
    parent_a_genotype: str,
    parent_b_genotype: str
) -> dict[str, float]:
    """
    Predict offspring genotype probabilities from parent genotypes.

    Args:
        parent_a_genotype: Parent A's genotype (e.g., "AG")
        parent_b_genotype: Parent B's genotype (e.g., "GG")

    Returns:
        Dictionary of genotype probabilities
    """
    parent_a_alleles = get_parent_alleles(parent_a_genotype)
    parent_b_alleles = get_parent_alleles(parent_b_genotype)

    return punnett_square(parent_a_alleles, parent_b_alleles)


def normalize_genotype(genotype: str) -> str:
    """
    Normalize genotype to alphabetical order for consistent lookup.

    Args:
        genotype: Two-character genotype string

    Returns:
        Normalized genotype (e.g., "GA" becomes "AG")
    """
    return ''.join(sorted(genotype))


def _extract_phenotype_string(value: str | dict) -> str:
    """
    Extract the phenotype string from a phenotype_map value.

    Handles both formats:
    - String format (legacy): value is the phenotype string directly
    - Dict format (rich): value is {"phenotype": "...", "description": "...", ...}

    Args:
        value: The phenotype_map value (either a string or a dict)

    Returns:
        The phenotype string
    """
    if isinstance(value, dict):
        return value["phenotype"]
    return value


def map_genotype_to_phenotype(genotype: str, phenotype_map: dict) -> str | None:
    """
    Look up phenotype for a given genotype using the phenotype map.

    Handles both string and dict phenotype_map values:
    - String format (legacy): {"GG": "Brown Eyes"}
    - Dict format (rich): {"GG": {"phenotype": "Brown Eyes", "description": "...", ...}}

    Args:
        genotype: Offspring genotype (e.g., "AG")
        phenotype_map: Dictionary mapping genotypes to phenotype descriptions

    Returns:
        Phenotype string or None if genotype not in map
    """
    # Try normalized version first
    normalized = normalize_genotype(genotype)

    # Check both original and normalized versions
    if genotype in phenotype_map:
        return _extract_phenotype_string(phenotype_map[genotype])
    elif normalized in phenotype_map:
        return _extract_phenotype_string(phenotype_map[normalized])

    return None


def predict_trait(
    parent_a_snps: dict[str, str],
    parent_b_snps: dict[str, str],
    trait_entry: dict
) -> dict | None:
    """
    Predict offspring phenotype probabilities for a single trait.

    Args:
        parent_a_snps: Parent A's SNP data {rsid: genotype}
        parent_b_snps: Parent B's SNP data {rsid: genotype}
        trait_entry: Single trait entry from database with phenotype_map

    Returns:
        Prediction result dictionary or None if prediction not possible
        Result includes: trait, gene, description, confidence, parent genotypes,
        and offspring_probabilities mapping phenotypes to percentages
    """
    rsid = trait_entry['rsid']

    # Check if both parents have this SNP
    if rsid not in parent_a_snps:
        return {
            'trait': trait_entry['trait'],
            'gene': trait_entry['gene'],
            'rsid': rsid,
            'status': 'missing',
            'note': 'Parent A missing this SNP'
        }

    if rsid not in parent_b_snps:
        return {
            'trait': trait_entry['trait'],
            'gene': trait_entry['gene'],
            'rsid': rsid,
            'status': 'missing',
            'note': 'Parent B missing this SNP'
        }

    parent_a_genotype = parent_a_snps[rsid]
    parent_b_genotype = parent_b_snps[rsid]
    phenotype_map = trait_entry['phenotype_map']

    # Calculate offspring genotype probabilities
    offspring_genotypes = predict_offspring_genotypes(
        parent_a_genotype,
        parent_b_genotype
    )

    # Map genotypes to phenotypes and aggregate probabilities
    phenotype_probs = {}
    unmapped_genotypes = []

    for genotype, prob in offspring_genotypes.items():
        phenotype = map_genotype_to_phenotype(genotype, phenotype_map)

        if phenotype is None:
            unmapped_genotypes.append(genotype)
            continue

        phenotype_probs[phenotype] = phenotype_probs.get(phenotype, 0.0) + prob

    # If no genotypes could be mapped, return error
    if not phenotype_probs:
        return {
            'trait': trait_entry['trait'],
            'gene': trait_entry['gene'],
            'rsid': rsid,
            'status': 'error',
            'note': f'Genotypes {unmapped_genotypes} not found in phenotype map',
            'parent_a_genotype': parent_a_genotype,
            'parent_b_genotype': parent_b_genotype
        }

    # Convert probabilities to percentages
    offspring_probabilities = {
        phenotype: round(prob * 100, 1)
        for phenotype, prob in phenotype_probs.items()
    }

    # Build phenotype_details from rich dict entries in phenotype_map
    phenotype_details = {}
    for _genotype_key, map_value in phenotype_map.items():
        if isinstance(map_value, dict):
            pheno_name = map_value["phenotype"]
            if pheno_name not in phenotype_details:
                # Include all extra fields (description, probability, etc.)
                phenotype_details[pheno_name] = {
                    k: v for k, v in map_value.items() if k != "phenotype"
                }

    result = {
        'trait': trait_entry['trait'],
        'gene': trait_entry['gene'],
        'rsid': rsid,
        'chromosome': trait_entry.get('chromosome', 'Unknown'),
        'description': trait_entry.get('description', ''),
        'confidence': trait_entry.get('confidence', 'Unknown'),
        'inheritance': trait_entry.get('inheritance', 'Unknown'),
        'status': 'success',
        'parent_a_genotype': parent_a_genotype,
        'parent_b_genotype': parent_b_genotype,
        'offspring_probabilities': offspring_probabilities
    }

    # Include phenotype_details if rich format data is available
    if phenotype_details:
        result['phenotype_details'] = phenotype_details

    # Add note if some genotypes were unmapped
    if unmapped_genotypes:
        result['note'] = f'Some genotypes unmapped: {unmapped_genotypes}'

    return result


def analyze_traits(
    parent_a_snps: dict[str, str],
    parent_b_snps: dict[str, str],
    db_path: str
) -> list[dict]:
    """
    Analyze all traits in the database for two parents.

    Args:
        parent_a_snps: Parent A's SNP data {rsid: genotype}
        parent_b_snps: Parent B's SNP data {rsid: genotype}
        db_path: Path to trait_snps.json database

    Returns:
        List of prediction results, one per trait
    """
    trait_database = load_trait_database(db_path)
    results = []

    for trait_entry in trait_database:
        prediction = predict_trait(parent_a_snps, parent_b_snps, trait_entry)
        if prediction:
            results.append(prediction)

    return results


def format_prediction_report(predictions: list[dict]) -> str:
    """
    Format prediction results into a human-readable report.

    Args:
        predictions: List of prediction result dictionaries

    Returns:
        Formatted string report
    """
    report_lines = ["=" * 80]
    report_lines.append("OFFSPRING TRAIT PREDICTION REPORT")
    report_lines.append("=" * 80)
    report_lines.append("")

    # Separate successful predictions from errors/missing
    successful = [p for p in predictions if p.get('status') == 'success']
    missing = [p for p in predictions if p.get('status') == 'missing']
    errors = [p for p in predictions if p.get('status') == 'error']

    # Report successful predictions
    if successful:
        report_lines.append(f"PREDICTED TRAITS ({len(successful)}):")
        report_lines.append("-" * 80)

        for pred in successful:
            report_lines.append(f"\nTrait: {pred['trait']}")
            report_lines.append(f"Gene: {pred['gene']} (rsID: {pred['rsid']})")
            report_lines.append(f"Chromosome: {pred['chromosome']}")
            report_lines.append(f"Inheritance: {pred['inheritance']}")
            report_lines.append(f"Confidence: {pred['confidence']}")
            report_lines.append(f"Description: {pred['description']}")
            report_lines.append(f"\nParent A genotype: {pred['parent_a_genotype']}")
            report_lines.append(f"Parent B genotype: {pred['parent_b_genotype']}")
            report_lines.append("\nOffspring probabilities:")

            for phenotype, prob in sorted(
                pred['offspring_probabilities'].items(),
                key=lambda x: x[1],
                reverse=True
            ):
                report_lines.append(f"  {phenotype}: {prob}%")

            if 'note' in pred:
                report_lines.append(f"\nNote: {pred['note']}")

            report_lines.append("-" * 80)

    # Report missing data
    if missing:
        report_lines.append(f"\n\nMISSING DATA ({len(missing)}):")
        report_lines.append("-" * 80)
        for pred in missing:
            report_lines.append(f"{pred['trait']} ({pred['gene']}): {pred['note']}")

    # Report errors
    if errors:
        report_lines.append(f"\n\nERRORS ({len(errors)}):")
        report_lines.append("-" * 80)
        for pred in errors:
            report_lines.append(f"{pred['trait']} ({pred['gene']}): {pred['note']}")

    report_lines.append("\n" + "=" * 80)
    report_lines.append(f"Total traits analyzed: {len(predictions)}")
    report_lines.append(f"Successful predictions: {len(successful)}")
    report_lines.append(f"Missing data: {len(missing)}")
    report_lines.append(f"Errors: {len(errors)}")
    report_lines.append("=" * 80)

    return "\n".join(report_lines)
