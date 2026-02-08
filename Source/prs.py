"""
Polygenic Risk Score (PRS) Engine for Mergenix Genetic Offspring Analysis.

This module calculates polygenic risk scores by aggregating the effects of
multiple genetic variants (SNPs) across the genome to estimate an individual's
genetic predisposition to common complex diseases.

PRS is fundamentally different from single-gene carrier analysis: instead of
looking at one variant with a large effect, PRS sums many small effects
across dozens to hundreds of SNPs.

IMPORTANT: PRS results are for educational/informational purposes only.
They are not diagnostic and should not replace professional medical advice.
"""

import json
from pathlib import Path

from scipy.stats import norm
from Source.tier_config import TierType

# Supported PRS conditions (ordered by clinical relevance)
PRS_CONDITIONS: list[str] = [
    "coronary_artery_disease",
    "type_2_diabetes",
    "breast_cancer",
    "prostate_cancer",
    "alzheimers_disease",
    "atrial_fibrillation",
    "inflammatory_bowel_disease",
    "schizophrenia",
    "asthma",
    "obesity_bmi",
]

# Risk category thresholds (percentile-based)
_RISK_THRESHOLDS: list[tuple[float, str]] = [
    (20.0, "low"),
    (40.0, "below_average"),
    (60.0, "average"),
    (80.0, "above_average"),
    (95.0, "elevated"),
    (100.0, "high"),
]

# Tier-based condition limits
_TIER_CONDITION_LIMITS: dict[TierType, int] = {
    TierType.FREE: 0,
    TierType.PREMIUM: 3,
    TierType.PRO: 10,
}

# Default PRS weights file path
_DEFAULT_WEIGHTS_PATH = Path(__file__).resolve().parent.parent / "data" / "prs_weights.json"


def load_prs_weights(weights_path: str | Path | None = None) -> dict:
    """
    Load PRS weight database from JSON file.

    Args:
        weights_path: Path to prs_weights.json. Defaults to data/prs_weights.json.

    Returns:
        Dictionary with metadata and per-condition SNP weights.
    """
    path = Path(weights_path) if weights_path else _DEFAULT_WEIGHTS_PATH
    with open(path) as f:
        return json.load(f)


def _count_effect_alleles(genotype: str, effect_allele: str) -> int:
    """
    Count the dosage of the effect allele in a genotype string.

    A genotype like "AG" with effect allele "G" has dosage 1.
    A genotype like "GG" with effect allele "G" has dosage 2.
    A genotype like "AA" with effect allele "G" has dosage 0.

    Args:
        genotype: Two-character genotype string (e.g., "AG", "GG", "AA").
        effect_allele: Single-character effect allele (e.g., "G").

    Returns:
        Dosage count: 0, 1, or 2.
    """
    if not genotype or len(genotype) < 2:
        return 0
    return sum(1 for allele in genotype.upper() if allele == effect_allele.upper())


def calculate_raw_prs(
    snp_data: dict[str, str],
    condition: str,
    prs_weights: dict,
) -> float:
    """
    Calculate the raw polygenic risk score for a single condition.

    The raw PRS is the sum of (effect_weight * dosage) for each SNP,
    where dosage is the count of effect alleles (0, 1, or 2).

    Args:
        snp_data: Dictionary mapping rsid -> genotype (e.g., {"rs10455872": "AG"}).
        condition: Condition key (e.g., "coronary_artery_disease").
        prs_weights: Full PRS weights dictionary loaded from prs_weights.json.

    Returns:
        Raw PRS as a float. Returns 0.0 if no SNPs are found.

    Raises:
        KeyError: If the condition is not found in prs_weights.
    """
    condition_data = prs_weights["conditions"][condition]
    snps = condition_data["snps"]

    score = 0.0
    for snp in snps:
        rsid = snp["rsid"]
        genotype = snp_data.get(rsid)
        if genotype is None:
            continue
        dosage = _count_effect_alleles(genotype, snp["effect_allele"])
        score += snp["effect_weight"] * dosage

    return score


def normalize_prs(
    raw_score: float,
    condition: str,
    prs_weights: dict,
    snps_found: int | None = None,
    snps_total: int | None = None,
) -> dict:
    """
    Normalize a raw PRS into z-score and percentile.

    Uses the population mean and standard deviation from the PRS weights
    metadata to convert the raw score into a standardized z-score, then
    converts to a percentile using the normal CDF.

    Args:
        raw_score: Raw PRS from calculate_raw_prs().
        condition: Condition key.
        prs_weights: Full PRS weights dictionary.
        snps_found: Number of SNPs found in user data (for coverage).
        snps_total: Total number of SNPs for this condition.

    Returns:
        Dictionary with keys:
        - z_score: Standardized score (mean=0, std=1 in population)
        - percentile: Population percentile (0-100)
        - raw_score: The input raw score
        - snps_found: Count of SNPs matched
        - snps_total: Total SNPs in the PRS model
        - coverage_pct: Percentage of SNPs found (0-100)
    """
    condition_data = prs_weights["conditions"][condition]
    pop_mean = condition_data["population_mean"]
    pop_std = condition_data["population_std"]

    if snps_total is None:
        snps_total = len(condition_data["snps"])
    if snps_found is None:
        snps_found = snps_total

    # Avoid division by zero
    if pop_std == 0:
        z_score = 0.0
    else:
        z_score = (raw_score - pop_mean) / pop_std

    percentile = float(norm.cdf(z_score) * 100)
    coverage_pct = (snps_found / snps_total * 100) if snps_total > 0 else 0.0

    return {
        "z_score": round(z_score, 4),
        "percentile": round(percentile, 2),
        "raw_score": round(raw_score, 6),
        "snps_found": snps_found,
        "snps_total": snps_total,
        "coverage_pct": round(coverage_pct, 1),
    }


def get_risk_category(percentile: float) -> str:
    """
    Map a population percentile to a risk category label.

    Categories:
        - "low": < 20th percentile
        - "below_average": 20th-40th percentile
        - "average": 40th-60th percentile
        - "above_average": 60th-80th percentile
        - "elevated": 80th-95th percentile
        - "high": > 95th percentile

    Args:
        percentile: Population percentile (0-100).

    Returns:
        Risk category string.
    """
    for threshold, category in _RISK_THRESHOLDS:
        if percentile < threshold:
            return category
    return "high"


def predict_offspring_prs_range(
    parent_a_prs: float,
    parent_b_prs: float,
    condition: str,
    prs_weights: dict | None = None,
) -> dict:
    """
    Predict the expected PRS range for offspring of two parents.

    Uses mid-parent regression: the offspring's expected PRS is the average
    of both parents' PRS values, with regression toward the population mean.
    The range reflects biological uncertainty from meiotic recombination.

    Args:
        parent_a_prs: Parent A's raw PRS.
        parent_b_prs: Parent B's raw PRS.
        condition: Condition key (for context/metadata).
        prs_weights: Optional PRS weights dict (for population stats).

    Returns:
        Dictionary with:
        - expected_percentile: Predicted offspring percentile
        - range_low: Lower bound percentile (roughly -1 SD)
        - range_high: Upper bound percentile (roughly +1 SD)
        - confidence: Confidence level description
    """
    # Mid-parent value
    mid_parent = (parent_a_prs + parent_b_prs) / 2.0

    # Regression toward the mean: offspring expected ~50% of mid-parent deviation
    # This is a simplification — heritability varies by trait
    heritability_factor = 0.5
    expected_offspring = mid_parent * heritability_factor

    # Uncertainty range: approximately +/- 0.5 SD around expected
    uncertainty = 0.5
    range_low_z = expected_offspring - uncertainty
    range_high_z = expected_offspring + uncertainty

    expected_percentile = float(norm.cdf(expected_offspring) * 100)
    range_low_pct = float(norm.cdf(range_low_z) * 100)
    range_high_pct = float(norm.cdf(range_high_z) * 100)

    return {
        "expected_percentile": round(expected_percentile, 2),
        "range_low": round(range_low_pct, 2),
        "range_high": round(range_high_pct, 2),
        "confidence": "moderate",
    }


def _calculate_single_parent_prs(
    snp_data: dict[str, str],
    condition: str,
    prs_weights: dict,
) -> dict:
    """
    Calculate complete PRS results for a single parent and condition.

    Args:
        snp_data: Parent's SNP data (rsid -> genotype).
        condition: Condition key.
        prs_weights: PRS weights dictionary.

    Returns:
        Dictionary with raw_score, z_score, percentile, risk_category,
        snps_found, snps_total, coverage_pct.
    """
    condition_data = prs_weights["conditions"][condition]
    snps = condition_data["snps"]
    snps_total = len(snps)

    # Count found SNPs and calculate raw score
    snps_found = 0
    raw_score = 0.0
    for snp in snps:
        rsid = snp["rsid"]
        genotype = snp_data.get(rsid)
        if genotype is not None:
            snps_found += 1
            dosage = _count_effect_alleles(genotype, snp["effect_allele"])
            raw_score += snp["effect_weight"] * dosage

    normalized = normalize_prs(
        raw_score, condition, prs_weights,
        snps_found=snps_found, snps_total=snps_total,
    )
    risk_category = get_risk_category(normalized["percentile"])

    return {
        "raw_score": normalized["raw_score"],
        "z_score": normalized["z_score"],
        "percentile": normalized["percentile"],
        "risk_category": risk_category,
        "snps_found": snps_found,
        "snps_total": snps_total,
        "coverage_pct": normalized["coverage_pct"],
    }


def analyze_prs(
    parent_a_snps: dict[str, str],
    parent_b_snps: dict[str, str],
    prs_weights: dict,
    tier: str = "free",
) -> dict:
    """
    Main entry point: calculate PRS for both parents across all conditions.

    Performs tier-based gating:
    - Free: No PRS access (returns empty results with upgrade message)
    - Premium: First 3 conditions
    - Pro: All 10 conditions

    Args:
        parent_a_snps: Parent A's SNP data (rsid -> genotype).
        parent_b_snps: Parent B's SNP data (rsid -> genotype).
        prs_weights: Full PRS weights dictionary.
        tier: Subscription tier ("free", "premium", or "pro").

    Returns:
        Dictionary with:
        - conditions: Dict of condition results (each with parent_a, parent_b, offspring)
        - metadata: Source info and disclaimer
        - tier: Current tier
        - conditions_available: Number of conditions accessible
        - conditions_total: Total conditions in database
    """
    # Map string tier to TierType
    tier_map = {
        "free": TierType.FREE,
        "premium": TierType.PREMIUM,
        "pro": TierType.PRO,
    }
    tier_type = tier_map.get(tier.lower(), TierType.FREE)
    condition_limit = _TIER_CONDITION_LIMITS[tier_type]

    # Filter conditions based on tier
    available_conditions = PRS_CONDITIONS[:condition_limit]

    results: dict[str, dict] = {}
    for condition in available_conditions:
        if condition not in prs_weights["conditions"]:
            continue

        parent_a_result = _calculate_single_parent_prs(
            parent_a_snps, condition, prs_weights,
        )
        parent_b_result = _calculate_single_parent_prs(
            parent_b_snps, condition, prs_weights,
        )

        offspring = predict_offspring_prs_range(
            parent_a_result["z_score"],
            parent_b_result["z_score"],
            condition,
            prs_weights,
        )

        condition_name = prs_weights["conditions"][condition]["name"]
        results[condition] = {
            "name": condition_name,
            "parent_a": parent_a_result,
            "parent_b": parent_b_result,
            "offspring": offspring,
            "ancestry_note": prs_weights["conditions"][condition].get("ancestry_note", ""),
            "reference": prs_weights["conditions"][condition].get("reference", ""),
        }

    return {
        "conditions": results,
        "metadata": prs_weights.get("metadata", {}),
        "tier": tier,
        "conditions_available": len(available_conditions),
        "conditions_total": len(PRS_CONDITIONS),
        "disclaimer": get_prs_disclaimer(),
    }


def get_prs_disclaimer() -> str:
    """
    Return a prominent disclaimer about PRS limitations.

    The disclaimer covers ancestry bias, DTC data limitations,
    and the non-diagnostic nature of PRS results.

    Returns:
        Multi-line disclaimer string.
    """
    return (
        "IMPORTANT DISCLAIMER: Polygenic Risk Scores (PRS) are for educational "
        "and informational purposes only. They are NOT diagnostic and should NOT "
        "be used to make medical decisions.\n\n"
        "Key limitations:\n"
        "- Ancestry bias: Most PRS models are derived from European-ancestry GWAS "
        "studies. Predictive accuracy is significantly reduced for individuals of "
        "non-European ancestry.\n"
        "- DTC data quality: Direct-to-consumer genetic testing captures only a "
        "subset of relevant variants. Clinical-grade genotyping may differ.\n"
        "- Environmental factors: PRS captures only the genetic component of disease "
        "risk. Lifestyle, environment, and other factors play major roles.\n"
        "- Not a diagnosis: A high PRS does not mean you will develop the condition, "
        "and a low PRS does not guarantee you will not.\n\n"
        "Always consult a qualified healthcare professional or genetic counselor "
        "for medical advice."
    )
