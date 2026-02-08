"""
Pharmacogenomics (PGx) Analysis Engine for Mergenix Genetic Offspring Analysis

This module implements pharmacogenomic analysis to predict how genetic variants
affect drug metabolism and response. It maps SNP genotypes to star allele
nomenclature, determines metabolizer status using CPIC activity score systems,
and provides evidence-based drug recommendations.

Supports 12 pharmacogenes with clinical guidelines from CPIC and DPWG.
"""

import json
from itertools import product

# Supported pharmacogenes
PGX_GENES = [
    "CYP2D6",
    "CYP2C19",
    "CYP2C9",
    "CYP3A5",
    "CYP1A2",
    "DPYD",
    "TPMT",
    "NUDT15",
    "SLCO1B1",
    "VKORC1",
    "HLA-B",
    "UGT1A1",
]

# Tier gating: how many genes each tier can access
_TIER_GENE_LIMITS = {
    "free": 0,
    "premium": 5,
    "pro": len(PGX_GENES),
}

# Premium tier gets the first 5 most clinically impactful genes
_PREMIUM_GENES = ["CYP2D6", "CYP2C19", "CYP2C9", "DPYD", "TPMT"]


def load_pgx_panel(panel_path: str) -> dict:
    """
    Load the pharmacogenomics panel from a JSON file.

    Args:
        panel_path: Path to the pgx_panel.json file

    Returns:
        Dictionary containing PGx panel data with gene definitions,
        star alleles, metabolizer status thresholds, and drug recommendations
    """
    with open(panel_path) as f:
        return json.load(f)


def determine_star_allele(gene: str, snp_data: dict, pgx_panel: dict) -> str:
    """
    Determine the star allele diplotype for a given gene based on SNP data.

    Maps rsID genotypes to star allele calls by checking which defining
    variants match the individual's genotype data. When a heterozygous
    genotype is found, one allele may carry a variant while the other
    carries the reference, producing a diplotype like *1/*4.

    Args:
        gene: Gene name (e.g., "CYP2D6")
        snp_data: Dictionary mapping rsid -> genotype (e.g., {"rs3892097": "GA"})
        pgx_panel: Loaded PGx panel data

    Returns:
        Star allele diplotype string (e.g., "*1/*4", "*1/*1")
        Returns "*1/*1" (reference) if gene not found or no variants detected
    """
    genes = pgx_panel.get("genes", {})
    if gene not in genes:
        return "*1/*1"

    gene_data = genes[gene]
    star_alleles = gene_data.get("star_alleles", {})

    # Collect all matched variant alleles (non-reference)
    matched_alleles = []

    for allele_name, allele_info in star_alleles.items():
        defining_variants = allele_info.get("defining_variants", [])
        if not defining_variants:
            # This is the reference allele (e.g., *1), skip it
            continue

        # Check if all defining variants for this allele match
        all_match = True
        any_het = False

        for variant in defining_variants:
            rsid = variant["rsid"]
            expected_genotype = variant["genotype"]
            actual_genotype = snp_data.get(rsid, "")

            if not actual_genotype:
                all_match = False
                break

            # Normalize genotypes for comparison
            actual_sorted = "".join(sorted(actual_genotype.upper()))
            expected_sorted = "".join(sorted(expected_genotype.upper()))

            if actual_sorted == expected_sorted:
                # Exact match (homozygous variant)
                continue
            elif _is_heterozygous_match(actual_genotype, expected_genotype):
                # Heterozygous - carries one copy of the variant
                any_het = True
            else:
                all_match = False
                break

        if all_match:
            if any_het:
                # Heterozygous: one copy of variant allele + one reference
                matched_alleles.append(allele_name)
            else:
                # Homozygous: two copies of variant allele
                matched_alleles.append(allele_name)
                matched_alleles.append(allele_name)

    # Build diplotype
    if not matched_alleles:
        # No variants detected - homozygous reference
        ref_allele = _get_reference_allele(star_alleles)
        return f"{ref_allele}/{ref_allele}"

    ref_allele = _get_reference_allele(star_alleles)

    if len(matched_alleles) == 1:
        # One variant allele + one reference
        return f"{ref_allele}/{matched_alleles[0]}"
    elif len(matched_alleles) >= 2:
        # Two variant alleles (could be same or different)
        return f"{matched_alleles[0]}/{matched_alleles[1]}"

    return f"{ref_allele}/{ref_allele}"


def _is_heterozygous_match(actual: str, expected_hom: str) -> bool:
    """
    Check if actual genotype is heterozygous for the expected homozygous variant.

    For example, if expected is "AA" (hom variant) and actual is "AG",
    the person is heterozygous (carries one variant allele).

    Args:
        actual: Actual genotype from SNP data (e.g., "AG")
        expected_hom: Expected homozygous genotype (e.g., "AA")

    Returns:
        True if heterozygous for this variant
    """
    if len(actual) != 2 or len(expected_hom) < 2:
        return False

    actual_upper = actual.upper()
    expected_upper = expected_hom.upper()

    # The expected homozygous allele (e.g., "A" from "AA")
    variant_allele = expected_upper[0]

    # Check if exactly one copy of the variant allele is present
    count = sum(1 for a in actual_upper if a == variant_allele)
    return count == 1


def _get_reference_allele(star_alleles: dict) -> str:
    """
    Get the reference (wildtype) allele name from star alleles dict.

    The reference allele is identified by having no defining variants.
    Falls back to "*1" if not found.

    Args:
        star_alleles: Dictionary of star alleles from PGx panel

    Returns:
        Reference allele name string (e.g., "*1", "*1A", "GG")
    """
    for name, info in star_alleles.items():
        if not info.get("defining_variants", []):
            return name
    return "*1"


def determine_metabolizer_status(gene: str, diplotype: str, pgx_panel: dict) -> dict:
    """
    Determine metabolizer status from a gene diplotype using CPIC activity scores.

    Calculates the total activity score by summing scores for each allele in
    the diplotype, then maps to a metabolizer phenotype based on gene-specific
    thresholds.

    Args:
        gene: Gene name (e.g., "CYP2D6")
        diplotype: Star allele diplotype (e.g., "*1/*4")
        pgx_panel: Loaded PGx panel data

    Returns:
        Dictionary with:
        - status: Metabolizer phenotype string (e.g., "poor_metabolizer")
        - activity_score: Total activity score (float)
        - description: Human-readable description of the metabolizer status
    """
    genes = pgx_panel.get("genes", {})
    if gene not in genes:
        return {
            "status": "unknown",
            "activity_score": 0.0,
            "description": "Gene not found in pharmacogenomics panel",
        }

    gene_data = genes[gene]
    star_alleles = gene_data.get("star_alleles", {})
    metabolizer_defs = gene_data.get("metabolizer_status", {})

    # Parse diplotype into individual alleles
    alleles = _parse_diplotype(diplotype)

    # Calculate total activity score
    total_score = 0.0
    for allele in alleles:
        if allele in star_alleles:
            total_score += star_alleles[allele].get("activity_score", 1.0)
        else:
            # Unknown allele, assume reference function
            total_score += 1.0

    # Find matching metabolizer status
    matched_status = None
    matched_desc = ""

    for status_name, status_info in metabolizer_defs.items():
        score_range = status_info.get("activity_score_range", [0, 0])
        low, high = score_range[0], score_range[1]

        if low <= total_score <= high:
            matched_status = status_name
            matched_desc = status_info.get("description", "")
            break

    if matched_status is None:
        # No exact range match; find closest
        matched_status = "normal_metabolizer"
        matched_desc = "Activity score does not match defined ranges"
        # Check if any status contains "normal" as a fallback
        for status_name, status_info in metabolizer_defs.items():
            if "normal" in status_name.lower():
                matched_status = status_name
                matched_desc = status_info.get("description", "")
                break

    return {
        "status": matched_status,
        "activity_score": total_score,
        "description": matched_desc,
    }


def _parse_diplotype(diplotype: str) -> list[str]:
    """
    Parse a diplotype string into individual allele names.

    Handles various formats: "*1/*4", "*1A/*1F", "GG/AG", etc.

    Args:
        diplotype: Diplotype string with "/" separator

    Returns:
        List of two allele name strings
    """
    parts = diplotype.split("/")
    if len(parts) == 2:
        return [parts[0].strip(), parts[1].strip()]
    # Fallback: treat entire string as one allele, pair with reference
    return [diplotype.strip(), "*1"]


def get_drug_recommendations(gene: str, metabolizer_status: str, pgx_panel: dict) -> list[dict]:
    """
    Get drug-specific recommendations based on gene and metabolizer status.

    Returns actionable clinical recommendations from CPIC/DPWG guidelines
    for all drugs affected by the gene, filtered to the patient's metabolizer
    phenotype.

    Args:
        gene: Gene name (e.g., "CYP2D6")
        metabolizer_status: Metabolizer phenotype (e.g., "poor_metabolizer")
        pgx_panel: Loaded PGx panel data

    Returns:
        List of recommendation dicts, each containing:
        - drug: Drug name
        - recommendation: Clinical recommendation text
        - strength: Evidence strength ("strong" or "moderate")
        - source: Guideline source ("CPIC" or "DPWG")
        - category: Drug category (e.g., "Pain", "Psychiatry")
    """
    genes = pgx_panel.get("genes", {})
    if gene not in genes:
        return []

    gene_data = genes[gene]
    drugs = gene_data.get("drugs", [])
    recommendations = []

    for drug in drugs:
        rec_by_status = drug.get("recommendation_by_status", {})
        if metabolizer_status in rec_by_status:
            recommendations.append({
                "drug": drug["name"],
                "recommendation": rec_by_status[metabolizer_status],
                "strength": drug.get("strength", "moderate"),
                "source": drug.get("source", "CPIC"),
                "category": drug.get("category", "General"),
            })

    return recommendations


def predict_offspring_pgx(
    parent_a_diplotype: str,
    parent_b_diplotype: str,
    gene: str,
) -> list[dict]:
    """
    Predict possible offspring diplotypes with probabilities.

    Uses Mendelian inheritance to determine all possible diplotype combinations
    from two parents' star allele diplotypes. Each parent contributes one allele
    randomly.

    Args:
        parent_a_diplotype: Parent A's diplotype (e.g., "*1/*4")
        parent_b_diplotype: Parent B's diplotype (e.g., "*1/*1")
        gene: Gene name (for context in results)

    Returns:
        List of dicts, each containing:
        - diplotype: Possible offspring diplotype (e.g., "*1/*1")
        - probability: Probability as percentage (0-100)
        - gene: Gene name
    """
    alleles_a = _parse_diplotype(parent_a_diplotype)
    alleles_b = _parse_diplotype(parent_b_diplotype)

    # Generate all possible combinations (2x2 = 4)
    outcomes: dict[str, float] = {}
    for a_allele, b_allele in product(alleles_a, alleles_b):
        # Normalize diplotype: sort alleles for consistency
        diplotype = _normalize_diplotype(a_allele, b_allele)
        outcomes[diplotype] = outcomes.get(diplotype, 0.0) + 25.0

    return [
        {
            "diplotype": dip,
            "probability": prob,
            "gene": gene,
        }
        for dip, prob in sorted(outcomes.items())
    ]


def _normalize_diplotype(allele_a: str, allele_b: str) -> str:
    """
    Normalize a diplotype by sorting alleles alphabetically.

    Args:
        allele_a: First allele
        allele_b: Second allele

    Returns:
        Normalized diplotype string (e.g., "*1/*4" not "*4/*1")
    """
    if allele_a <= allele_b:
        return f"{allele_a}/{allele_b}"
    return f"{allele_b}/{allele_a}"


def analyze_pgx(
    parent_a_snps: dict,
    parent_b_snps: dict,
    pgx_panel: dict,
    tier: str = "free",
) -> dict:
    """
    Main pharmacogenomics analysis entry point.

    Analyzes both parents across all supported pharmacogenes, determining
    star alleles, metabolizer status, drug recommendations, and offspring
    predictions for each gene.

    Args:
        parent_a_snps: Dict mapping rsid -> genotype for parent A
        parent_b_snps: Dict mapping rsid -> genotype for parent B
        pgx_panel: Loaded PGx panel data
        tier: Subscription tier ("free", "premium", "pro")

    Returns:
        Dictionary with:
        - genes_analyzed: Number of genes analyzed
        - tier: Active tier
        - is_limited: Whether analysis is tier-gated
        - results: Dict of gene -> analysis results
        - upgrade_message: Message for limited tiers (None for pro)
    """
    tier = tier.lower()
    genes_to_analyze = _get_genes_for_tier(tier)

    results = {}
    for gene in genes_to_analyze:
        # Determine star alleles for each parent
        parent_a_diplotype = determine_star_allele(gene, parent_a_snps, pgx_panel)
        parent_b_diplotype = determine_star_allele(gene, parent_b_snps, pgx_panel)

        # Determine metabolizer status
        parent_a_status = determine_metabolizer_status(gene, parent_a_diplotype, pgx_panel)
        parent_b_status = determine_metabolizer_status(gene, parent_b_diplotype, pgx_panel)

        # Get drug recommendations
        parent_a_recs = get_drug_recommendations(gene, parent_a_status["status"], pgx_panel)
        parent_b_recs = get_drug_recommendations(gene, parent_b_status["status"], pgx_panel)

        # Predict offspring diplotypes
        offspring = predict_offspring_pgx(parent_a_diplotype, parent_b_diplotype, gene)

        # Get offspring metabolizer predictions
        offspring_predictions = []
        for outcome in offspring:
            off_status = determine_metabolizer_status(gene, outcome["diplotype"], pgx_panel)
            off_recs = get_drug_recommendations(gene, off_status["status"], pgx_panel)
            offspring_predictions.append({
                "diplotype": outcome["diplotype"],
                "probability": outcome["probability"],
                "metabolizer_status": off_status,
                "drug_recommendations": off_recs,
            })

        # Get gene description
        gene_info = pgx_panel.get("genes", {}).get(gene, {})

        results[gene] = {
            "gene": gene,
            "description": gene_info.get("description", ""),
            "chromosome": gene_info.get("chromosome", ""),
            "parent_a": {
                "diplotype": parent_a_diplotype,
                "metabolizer_status": parent_a_status,
                "drug_recommendations": parent_a_recs,
            },
            "parent_b": {
                "diplotype": parent_b_diplotype,
                "metabolizer_status": parent_b_status,
                "drug_recommendations": parent_b_recs,
            },
            "offspring_predictions": offspring_predictions,
        }

    upgrade_msg = None
    if tier == "free":
        upgrade_msg = (
            "Upgrade to Premium for pharmacogenomics analysis of 5 key genes, "
            "or Pro for all 12 pharmacogenes with full drug interaction reports."
        )
    elif tier == "premium":
        upgrade_msg = (
            "Upgrade to Pro for complete pharmacogenomics analysis of all 12 genes "
            "including HLA-B hypersensitivity, UGT1A1, SLCO1B1 statin guidance, and more."
        )

    return {
        "genes_analyzed": len(results),
        "tier": tier,
        "is_limited": tier != "pro",
        "results": results,
        "upgrade_message": upgrade_msg,
        "disclaimer": get_pgx_disclaimer(),
    }


def get_pgx_disclaimer() -> str:
    """Return the pharmacogenomics disclaimer text.

    Covers DTC limitations, CYP2D6 structural variants, and clinical guidance.
    """
    return (
        "IMPORTANT LIMITATIONS: This pharmacogenomics analysis is for educational "
        "purposes only and is NOT a clinical pharmacogenomic test. "
        "Direct-to-consumer (DTC) genotyping arrays cannot detect gene deletions, "
        "duplications, or structural rearrangements. This is especially significant "
        "for CYP2D6, where gene deletions (*5, ~5-10% of Europeans) and duplications "
        "(*1xN, *2xN) are common and clinically important. A CYP2D6 deletion carrier "
        "would be incorrectly classified as a normal metabolizer by this analysis. "
        "Similarly, CYP2D6 gene duplications (ultra-rapid metabolizer phenotype) cannot "
        "be detected from SNP data alone. Always consult a healthcare provider or "
        "clinical pharmacogenomics laboratory for medication decisions. Do not change "
        "any medication without consulting your prescribing physician."
    )


def _get_genes_for_tier(tier: str) -> list[str]:
    """
    Get the list of genes accessible at a given tier.

    Args:
        tier: Subscription tier ("free", "premium", "pro")

    Returns:
        List of gene name strings
    """
    tier = tier.lower()
    if tier == "free":
        return []
    elif tier == "premium":
        return _PREMIUM_GENES.copy()
    else:
        return PGX_GENES.copy()
