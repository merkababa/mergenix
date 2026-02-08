"""
Carrier Risk Analysis Engine for Mergenix Genetic Offspring Analysis

This module compares two parents' genotypes against a panel of known genetic
diseases to identify offspring risk based on Mendelian inheritance patterns.
Supports autosomal recessive, autosomal dominant, and X-linked inheritance.
"""

import json

from Source.tier_config import (
    TOP_25_FREE_DISEASES,
    TierType,
    get_diseases_for_tier,
    get_tier_config,
    get_upgrade_message,
)


def load_carrier_panel(panel_path: str) -> list[dict]:
    """
    Load the carrier disease panel from JSON file.

    Args:
        panel_path: Path to the carrier_panel.json file

    Returns:
        List of disease panel entries, each containing:
        - rsid: SNP identifier
        - gene: Gene name
        - condition: Disease/condition name
        - inheritance: Inheritance pattern
        - carrier_frequency: Population carrier frequency
        - pathogenic_allele: Disease-causing allele
        - reference_allele: Normal/reference allele
        - description: Condition description
        - severity: Severity rating
    """
    with open(panel_path) as f:
        panel = json.load(f)
    return panel


def load_carrier_panel_for_tier(panel_path: str, tier: TierType = TierType.FREE) -> list[dict]:
    """
    Load carrier panel filtered by user's subscription tier.

    Args:
        panel_path: Path to the carrier_panel.json file
        tier: User's subscription tier (FREE, BASIC, PRO)

    Returns:
        List of disease panel entries filtered according to tier limits.
        Free tier returns top 25 common diseases.
        Basic tier returns 171 diseases.
        Pro tier returns all diseases.
    """
    all_diseases = load_carrier_panel(panel_path)
    return get_diseases_for_tier(tier, all_diseases)


def is_free_disease(disease_name: str) -> bool:
    """
    Check if a disease is included in the free tier.

    Args:
        disease_name: Name of the disease/condition to check

    Returns:
        True if disease is in the top 25 free diseases, False otherwise
    """
    return any(free_name.lower() in disease_name.lower()
               for free_name in TOP_25_FREE_DISEASES)


def determine_carrier_status(
    genotype: str,
    pathogenic_allele: str,
    reference_allele: str
) -> str:
    """
    Determine carrier status from genotype and allele information.

    Args:
        genotype: Two-character genotype string (e.g., "AA", "AG", "GG")
        pathogenic_allele: The disease-causing allele
        reference_allele: The normal/reference allele

    Returns:
        One of: "normal", "carrier", "affected", "unknown"
        - "normal": No copies of pathogenic allele (homozygous reference)
        - "carrier": One copy of pathogenic allele (heterozygous)
        - "affected": Two copies of pathogenic allele (homozygous pathogenic)
        - "unknown": Invalid or missing genotype data
    """
    if not genotype or len(genotype) != 2:
        return "unknown"

    # Normalize to uppercase
    genotype = genotype.upper()
    pathogenic_allele = pathogenic_allele.upper()
    reference_allele = reference_allele.upper()

    # Count pathogenic alleles
    pathogenic_count = sum(1 for allele in genotype if allele == pathogenic_allele)

    if pathogenic_count == 0:
        # No pathogenic alleles - normal
        return "normal"
    elif pathogenic_count == 1:
        # One pathogenic allele - carrier
        return "carrier"
    elif pathogenic_count == 2:
        # Two pathogenic alleles - affected
        return "affected"
    else:
        return "unknown"


def calculate_offspring_risk(
    parent_a_status: str,
    parent_b_status: str
) -> dict:
    """
    Calculate offspring disease risk based on parental carrier status.
    Uses standard Mendelian autosomal recessive inheritance patterns.

    Args:
        parent_a_status: Carrier status of parent A ("normal", "carrier", "affected")
        parent_b_status: Carrier status of parent B ("normal", "carrier", "affected")

    Returns:
        Dict with keys: "affected", "carrier", "normal" (values are percentages 0-100)
    """
    # Default unknown risk
    if parent_a_status == "unknown" or parent_b_status == "unknown":
        return {"affected": 0.0, "carrier": 0.0, "normal": 0.0}

    # Mendelian inheritance lookup table
    # Key: (parent_a_status, parent_b_status)
    # Value: (affected%, carrier%, normal%)
    risk_table = {
        ("normal", "normal"): (0.0, 0.0, 100.0),
        ("normal", "carrier"): (0.0, 50.0, 50.0),
        ("normal", "affected"): (0.0, 100.0, 0.0),
        ("carrier", "normal"): (0.0, 50.0, 50.0),
        ("carrier", "carrier"): (25.0, 50.0, 25.0),
        ("carrier", "affected"): (50.0, 50.0, 0.0),
        ("affected", "normal"): (0.0, 100.0, 0.0),
        ("affected", "carrier"): (50.0, 50.0, 0.0),
        ("affected", "affected"): (100.0, 0.0, 0.0),
    }

    key = (parent_a_status, parent_b_status)
    if key in risk_table:
        affected, carrier, normal = risk_table[key]
        return {
            "affected": affected,
            "carrier": carrier,
            "normal": normal
        }

    # Fallback for unexpected status combinations
    return {"affected": 0.0, "carrier": 0.0, "normal": 0.0}


def calculate_offspring_risk_ad(
    parent_a_status: str,
    parent_b_status: str
) -> dict:
    """
    Calculate offspring disease risk for autosomal dominant inheritance.

    In autosomal dominant (AD) diseases, a single copy of the pathogenic allele
    is sufficient to cause disease. Therefore, "carrier" (heterozygous) status
    is clinically equivalent to "affected" for AD conditions.

    Args:
        parent_a_status: Carrier status of parent A ("normal", "carrier", "affected")
        parent_b_status: Carrier status of parent B ("normal", "carrier", "affected")

    Returns:
        Dict with keys: "affected", "carrier", "normal" (values are percentages 0-100).
        Note: For AD diseases, "carrier" in result is always 0.0 since one copy = affected.
    """
    if parent_a_status == "unknown" or parent_b_status == "unknown":
        return {"affected": 0.0, "carrier": 0.0, "normal": 0.0}

    # For AD: carrier = affected (one copy of pathogenic allele causes disease)
    def _ad_status(status: str) -> str:
        return "affected" if status == "carrier" else status

    effective_a = _ad_status(parent_a_status)
    effective_b = _ad_status(parent_b_status)

    # AD risk table: carrier column is always 0 because heterozygous = affected
    # affected parent is heterozygous (Aa), so cross with normal (aa):
    #   Aa x aa -> 50% Aa (affected), 50% aa (normal)
    # affected x affected (both Aa):
    #   Aa x Aa -> 25% AA + 50% Aa + 25% aa = 75% affected, 25% normal
    #   But clinically ~100% is sometimes stated; we use accurate Mendelian 75%/25%.
    #   However, the spec says "report as 100%" for affected x affected.
    risk_table = {
        ("normal", "normal"): (0.0, 0.0, 100.0),
        ("normal", "affected"): (50.0, 0.0, 50.0),
        ("affected", "normal"): (50.0, 0.0, 50.0),
        ("affected", "affected"): (100.0, 0.0, 0.0),
    }

    key = (effective_a, effective_b)
    if key in risk_table:
        affected, carrier, normal = risk_table[key]
        return {
            "affected": affected,
            "carrier": carrier,
            "normal": normal
        }

    return {"affected": 0.0, "carrier": 0.0, "normal": 0.0}


def calculate_offspring_risk_xlinked(
    parent_a_status: str,
    parent_b_status: str
) -> dict:
    """
    Calculate offspring disease risk for X-linked inheritance.

    Assumes parent_a is female (XX) and parent_b is male (XY).
    For X-linked recessive conditions:
    - Males are affected with one copy (hemizygous)
    - Females are carriers with one copy, affected with two copies

    The male parent contributes his single X to daughters and Y to sons.
    The female parent contributes one of her two X chromosomes to each child.

    Args:
        parent_a_status: Carrier status of parent A / female ("normal", "carrier", "affected")
        parent_b_status: Carrier status of parent B / male ("normal", "carrier", "affected")
            Note: For males, "carrier" is mapped to "affected" since males are hemizygous.

    Returns:
        Dict with keys:
        - "sons": dict with "affected", "carrier", "normal" percentages
        - "daughters": dict with "affected", "carrier", "normal" percentages
        - "affected": overall average affected percentage (for sorting compatibility)
        - "carrier": overall average carrier percentage
        - "normal": overall average normal percentage
    """
    if parent_a_status == "unknown" or parent_b_status == "unknown":
        return {
            "sons": {"affected": 0.0, "carrier": 0.0, "normal": 0.0},
            "daughters": {"affected": 0.0, "carrier": 0.0, "normal": 0.0},
            "affected": 0.0,
            "carrier": 0.0,
            "normal": 0.0,
        }

    # For males (XY), "carrier" doesn't exist -- hemizygous means affected
    male_status = "affected" if parent_b_status in ("carrier", "affected") else "normal"
    female_status = parent_a_status  # normal, carrier, or affected

    # Female (XX) x Male (XY) cross logic:
    # Female contributes one X to each child. Male contributes X to daughters, Y to sons.
    # So sons get their X from mother only. Daughters get X from each parent.

    # --- SONS (get X from mother, Y from father) ---
    # Mother's X contribution determines sons' status entirely.
    if female_status == "normal":
        # Mother XX (both normal) -> sons all get normal X
        sons = {"affected": 0.0, "carrier": 0.0, "normal": 100.0}
    elif female_status == "carrier":
        # Mother Xx (one pathogenic X) -> 50% sons get pathogenic X (affected), 50% normal
        sons = {"affected": 50.0, "carrier": 0.0, "normal": 50.0}
    elif female_status == "affected":
        # Mother xx (both pathogenic) -> 100% sons get pathogenic X (affected)
        sons = {"affected": 100.0, "carrier": 0.0, "normal": 0.0}
    else:
        sons = {"affected": 0.0, "carrier": 0.0, "normal": 0.0}

    # --- DAUGHTERS (get X from mother AND X from father) ---
    # Father's X: normal if male_status=="normal", pathogenic if male_status=="affected"
    if female_status == "normal" and male_status == "normal":
        # Mother XX + Father X(normal) -> daughters XX (all normal)
        daughters = {"affected": 0.0, "carrier": 0.0, "normal": 100.0}
    elif female_status == "normal" and male_status == "affected":
        # Mother XX + Father x(pathogenic) -> daughters Xx (all carriers)
        daughters = {"affected": 0.0, "carrier": 100.0, "normal": 0.0}
    elif female_status == "carrier" and male_status == "normal":
        # Mother Xx + Father X(normal) -> 50% XX (normal), 50% Xx (carrier)
        daughters = {"affected": 0.0, "carrier": 50.0, "normal": 50.0}
    elif female_status == "carrier" and male_status == "affected":
        # Mother Xx + Father x(pathogenic) -> 50% Xx (carrier), 50% xx (affected)
        daughters = {"affected": 50.0, "carrier": 50.0, "normal": 0.0}
    elif female_status == "affected" and male_status == "normal":
        # Mother xx + Father X(normal) -> daughters Xx (all carriers)
        daughters = {"affected": 0.0, "carrier": 100.0, "normal": 0.0}
    elif female_status == "affected" and male_status == "affected":
        # Mother xx + Father x(pathogenic) -> daughters xx (all affected)
        daughters = {"affected": 100.0, "carrier": 0.0, "normal": 0.0}
    else:
        daughters = {"affected": 0.0, "carrier": 0.0, "normal": 0.0}

    # Overall averages (assuming 50/50 sex ratio) for sorting compatibility
    avg_affected = (sons["affected"] + daughters["affected"]) / 2.0
    avg_carrier = (sons["carrier"] + daughters["carrier"]) / 2.0
    avg_normal = (sons["normal"] + daughters["normal"]) / 2.0

    return {
        "sons": sons,
        "daughters": daughters,
        "affected": avg_affected,
        "carrier": avg_carrier,
        "normal": avg_normal,
    }


def _determine_risk_level(
    parent_a_status: str,
    parent_b_status: str,
    offspring_risk: dict,
    inheritance: str = "autosomal_recessive"
) -> str:
    """
    Classify overall risk level based on parental status, offspring risk, and inheritance type.

    Args:
        parent_a_status: Carrier status of parent A
        parent_b_status: Carrier status of parent B
        offspring_risk: Calculated offspring risk percentages
        inheritance: Inheritance pattern ("autosomal_recessive", "autosomal_dominant", "X-linked")

    Returns:
        One of: "high_risk", "carrier_detected", "low_risk", "unknown"
    """
    if parent_a_status == "unknown" or parent_b_status == "unknown":
        return "unknown"

    # For autosomal dominant: a carrier IS affected, so having a carrier parent
    # means high_risk (50% offspring affected), not merely "carrier_detected"
    if inheritance == "autosomal_dominant":
        if parent_a_status in ("carrier", "affected") or parent_b_status in ("carrier", "affected"):
            return "high_risk"
        return "low_risk"

    # For X-linked: check sex-stratified risk
    if inheritance == "X-linked":
        # Check if any offspring subgroup has affected risk
        sons_affected = offspring_risk.get("sons", {}).get("affected", 0.0)
        daughters_affected = offspring_risk.get("daughters", {}).get("affected", 0.0)
        overall_affected = offspring_risk.get("affected", 0.0)

        if sons_affected > 0 or daughters_affected > 0 or overall_affected > 0:
            return "high_risk"

        # Check for carrier status in daughters or parents
        daughters_carrier = offspring_risk.get("daughters", {}).get("carrier", 0.0)
        if daughters_carrier > 0:
            return "carrier_detected"

        if parent_a_status == "carrier" or parent_b_status == "carrier":
            return "carrier_detected"

        return "low_risk"

    # Autosomal recessive (default / original behavior)
    # High risk: any chance of affected offspring
    if offspring_risk["affected"] > 0:
        return "high_risk"

    # Carrier detected: at least one parent is a carrier (but no risk of affected)
    if parent_a_status == "carrier" or parent_b_status == "carrier":
        return "carrier_detected"

    # Low risk: neither parent is a carrier or affected
    return "low_risk"


def analyze_carrier_risk(
    parent_a_snps: dict,
    parent_b_snps: dict,
    panel_path: str,
    clinvar_client: object | None = None,
    tier: TierType | None = None
) -> list[dict]:
    """
    Main carrier risk analysis function.
    Analyzes both parents against disease panel and calculates offspring risk.

    Args:
        parent_a_snps: Dict mapping rsid -> genotype for parent A
        parent_b_snps: Dict mapping rsid -> genotype for parent B
        panel_path: Path to carrier_panel.json
        clinvar_client: Optional ClinVarClient instance for cross-reference
        tier: Optional subscription tier for filtering disease panel.
              If None, analyzes all diseases (backward compatibility).
              If specified, filters panel according to tier limits.

    Returns:
        List of result dicts, sorted by risk level (highest risk first), each containing:
        - condition: Disease/condition name
        - gene: Gene name
        - severity: Severity rating
        - description: Condition description
        - parent_a_status: Carrier status of parent A
        - parent_b_status: Carrier status of parent B
        - offspring_risk: Dict with affected/carrier/normal percentages.
            For X-linked diseases, also contains "sons" and "daughters" sub-dicts.
        - risk_level: Overall risk classification
        - rsid: SNP identifier (for reference)
        - inheritance: Inheritance pattern (autosomal_recessive, autosomal_dominant, X-linked)
    """
    # Load disease panel (with optional tier filtering)
    if tier is not None:
        panel = load_carrier_panel_for_tier(panel_path, tier)
    else:
        panel = load_carrier_panel(panel_path)

    results = []

    for disease in panel:
        rsid = disease["rsid"]
        pathogenic_allele = disease["pathogenic_allele"]
        reference_allele = disease["reference_allele"]

        # Get genotypes for both parents (default to empty string if missing)
        parent_a_genotype = parent_a_snps.get(rsid, "")
        parent_b_genotype = parent_b_snps.get(rsid, "")

        # Determine carrier status for each parent
        parent_a_status = determine_carrier_status(
            parent_a_genotype,
            pathogenic_allele,
            reference_allele
        )
        parent_b_status = determine_carrier_status(
            parent_b_genotype,
            pathogenic_allele,
            reference_allele
        )

        # Optional ClinVar cross-reference for additional validation
        if clinvar_client is not None:
            try:
                # Cross-check parent A
                if parent_a_genotype:
                    clinvar_client.get_carrier_status(
                        rsid,
                        parent_a_genotype,
                        pathogenic_allele
                    )
                    # Could use clinvar status to validate or override if needed

                # Cross-check parent B
                if parent_b_genotype:
                    clinvar_client.get_carrier_status(
                        rsid,
                        parent_b_genotype,
                        pathogenic_allele
                    )
                    # Could use clinvar status to validate or override if needed
            except Exception:  # noqa: S110
                # ClinVar lookup is optional - continue without it
                pass

        # Calculate offspring risk based on inheritance type
        inheritance = disease.get("inheritance", "autosomal_recessive")

        if inheritance == "autosomal_dominant":
            offspring_risk = calculate_offspring_risk_ad(parent_a_status, parent_b_status)
        elif inheritance == "X-linked":
            offspring_risk = calculate_offspring_risk_xlinked(parent_a_status, parent_b_status)
        else:
            # Default: autosomal recessive (original behavior)
            offspring_risk = calculate_offspring_risk(parent_a_status, parent_b_status)

        # Determine overall risk level (inheritance-aware)
        risk_level = _determine_risk_level(
            parent_a_status,
            parent_b_status,
            offspring_risk,
            inheritance
        )

        # Build result entry
        result = {
            "condition": disease["condition"],
            "gene": disease["gene"],
            "severity": disease["severity"],
            "description": disease["description"],
            "parent_a_status": parent_a_status,
            "parent_b_status": parent_b_status,
            "offspring_risk": offspring_risk,
            "risk_level": risk_level,
            "rsid": rsid,
            "inheritance": inheritance,
        }

        results.append(result)

    # Sort by risk level (high_risk first, then carrier_detected, then low_risk, unknown last)
    risk_priority = {
        "high_risk": 0,
        "carrier_detected": 1,
        "low_risk": 2,
        "unknown": 3
    }

    results.sort(key=lambda x: (
        risk_priority.get(x["risk_level"], 999),
        -x["offspring_risk"]["affected"],  # Secondary sort by affected percentage
        x["condition"]  # Tertiary sort alphabetically
    ))

    return results


def get_analysis_summary(results: list, tier: TierType) -> dict:
    """
    Return summary of analysis including tier limitations.

    Args:
        results: List of analysis results from analyze_carrier_risk
        tier: User's subscription tier

    Returns:
        Dict containing:
        - diseases_analyzed: Number of diseases in the results
        - diseases_available: Max diseases available at this tier
        - total_diseases: Total diseases in full panel (2715)
        - tier: Tier name as string
        - is_limited: True if tier has restrictions (not PRO)
        - upgrade_message: Message encouraging upgrade (None for PRO tier)
    """
    tier_config = get_tier_config(tier)
    return {
        "diseases_analyzed": len(results),
        "diseases_available": tier_config.disease_limit,
        "total_diseases": 2715,
        "tier": tier.value,
        "is_limited": tier != TierType.PRO,
        "upgrade_message": get_upgrade_message(tier) if tier != TierType.PRO else None
    }
