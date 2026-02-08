"""
Tier configuration system for Mergenix genetic analysis app.

Defines pricing tiers, limits, and access control for diseases and traits.
All paid tiers are one-time purchases (no recurring subscriptions).
"""

from dataclasses import dataclass
from enum import Enum


class TierType(Enum):
    """Pricing tier types."""
    FREE = "free"
    PREMIUM = "premium"
    PRO = "pro"


@dataclass
class TierConfig:
    """Configuration for a pricing tier (one-time purchase)."""
    name: str
    display_name: str
    price: float
    disease_limit: int
    trait_limit: int
    features: list[str]
    ethnicity_access: bool = False
    pgx_gene_limit: int = 0
    prs_condition_limit: int = 0
    counseling_level: str = "basic"


# Tier configurations
TIER_CONFIGS: dict[TierType, TierConfig] = {
    TierType.FREE: TierConfig(
        name="free",
        display_name="Free",
        price=0.0,
        disease_limit=25,
        trait_limit=10,
        features=[
            "Analyze top 25 genetic diseases",
            "Analyze top 10 genetic traits",
            "Basic carrier status report",
            "Disease prevalence data",
            "Basic counseling recommendations",
        ],
        ethnicity_access=False,
        pgx_gene_limit=0,
        prs_condition_limit=0,
        counseling_level="basic",
    ),
    TierType.PREMIUM: TierConfig(
        name="premium",
        display_name="Premium",
        price=12.90,
        disease_limit=500,
        trait_limit=79,
        features=[
            "Analyze 500+ genetic diseases",
            "Analyze all 79 genetic traits",
            "Detailed carrier reports",
            "Disease prevalence data with OMIM links",
            "Advanced filtering and search",
            "PDF export",
            "Ethnicity-adjusted carrier frequencies",
            "Pharmacogenomics analysis (5 genes)",
            "Polygenic risk scores (3 conditions)",
            "Full counseling summary",
        ],
        ethnicity_access=True,
        pgx_gene_limit=5,
        prs_condition_limit=3,
        counseling_level="full",
    ),
    TierType.PRO: TierConfig(
        name="pro",
        display_name="Pro",
        price=29.90,
        disease_limit=2715,
        trait_limit=79,
        features=[
            "Analyze all 2700+ genetic diseases",
            "Analyze all 79 genetic traits",
            "Comprehensive carrier reports",
            "Disease prevalence data with OMIM links",
            "Advanced filtering and search",
            "PDF export",
            "All future disease updates included",
            "Priority support",
            "API access",
            "Ethnicity-adjusted carrier frequencies",
            "Pharmacogenomics analysis (all 12 genes)",
            "Polygenic risk scores (all 10 conditions)",
            "Full counseling summary with referral letter",
        ],
        ethnicity_access=True,
        pgx_gene_limit=12,
        prs_condition_limit=10,
        counseling_level="full_plus_letter",
    )
}


# Top 25 diseases available in FREE tier
TOP_25_FREE_DISEASES: list[str] = [
    "Cystic Fibrosis",
    "Sickle Cell Disease",
    "Tay-Sachs Disease",
    "Spinal Muscular Atrophy",
    "Phenylketonuria",
    "Beta Thalassemia",
    "Fragile X Syndrome",
    "Duchenne Muscular Dystrophy",
    "Canavan Disease",
    "Gaucher Disease",
    "Familial Dysautonomia",
    "Fanconi Anemia",
    "Bloom Syndrome",
    "MCAD Deficiency",
    "Galactosemia",
    "Maple Syrup Urine Disease",
    "Glycogen Storage Disease Type 1a",
    "Congenital Adrenal Hyperplasia",
    "G6PD Deficiency",
    "Alpha-1 Antitrypsin Deficiency",
    "Hereditary Hemochromatosis",
    "Niemann-Pick Disease",
    "Biotinidase Deficiency",
    "Hemophilia A",
    "Huntington's Disease",
]


# Top 10 traits available in FREE tier
TOP_10_FREE_TRAITS: list[str] = [
    "Eye Color",
    "Hair Color",
    "Lactose Intolerance",
    "Bitter Taste Perception",
    "Earwax Type",
    "Freckling",
    "Cleft Chin",
    "Widow's Peak",
    "Caffeine Metabolism",
    "Asparagus Smell Detection",
]


# Stripe price IDs (placeholders - replace with actual Stripe price IDs)
STRIPE_PRICES: dict[TierType, str | None] = {
    TierType.FREE: None,
    TierType.PREMIUM: "price_premium_onetime_placeholder",
    TierType.PRO: "price_pro_onetime_placeholder",
}


def get_tier_config(tier: TierType) -> TierConfig:
    """
    Get configuration for a specific tier.

    Args:
        tier: The tier type to get configuration for

    Returns:
        TierConfig object with tier details
    """
    return TIER_CONFIGS[tier]


def get_diseases_for_tier(tier: TierType, all_diseases: list[dict]) -> list[dict]:
    """
    Get list of diseases available for a specific tier.

    Args:
        tier: The tier type
        all_diseases: List of all disease dictionaries from carrier_panel.json

    Returns:
        List of disease dictionaries accessible in this tier
    """
    config = get_tier_config(tier)

    if tier == TierType.FREE:
        # Return only top 25 free diseases
        return [
            disease for disease in all_diseases
            if disease.get("condition", "").strip() in TOP_25_FREE_DISEASES
        ][:config.disease_limit]
    else:
        # Return diseases up to the tier limit
        return all_diseases[:config.disease_limit]


def get_traits_for_tier(tier: TierType, all_traits: list[dict]) -> list[dict]:
    """
    Get list of traits available for a specific tier.

    Args:
        tier: The tier type
        all_traits: List of all trait dictionaries

    Returns:
        List of trait dictionaries accessible in this tier
    """
    config = get_tier_config(tier)

    if tier == TierType.FREE:
        # Return only top 10 free traits
        return [
            trait for trait in all_traits
            if trait.get("name", "").strip() in TOP_10_FREE_TRAITS
        ][:config.trait_limit]
    else:
        # Return traits up to the tier limit
        return all_traits[:config.trait_limit]


def can_access_disease(
    tier: TierType,
    disease_name: str,
    all_diseases: list[dict]
) -> bool:
    """
    Check if a user can access a specific disease based on their tier.

    Args:
        tier: The user's subscription tier
        disease_name: Name of the disease to check
        all_diseases: List of all disease dictionaries

    Returns:
        True if the disease is accessible, False otherwise
    """
    accessible_diseases = get_diseases_for_tier(tier, all_diseases)
    return any(
        disease.get("condition", "").strip() == disease_name.strip()
        for disease in accessible_diseases
    )


def can_access_trait(
    tier: TierType,
    trait_name: str,
    all_traits: list[dict]
) -> bool:
    """
    Check if a user can access a specific trait based on their tier.

    Args:
        tier: The user's subscription tier
        trait_name: Name of the trait to check
        all_traits: List of all trait dictionaries

    Returns:
        True if the trait is accessible, False otherwise
    """
    accessible_traits = get_traits_for_tier(tier, all_traits)
    return any(
        trait.get("name", "").strip() == trait_name.strip()
        for trait in accessible_traits
    )


def get_upgrade_message(current_tier: TierType) -> str:
    """
    Get an upgrade message for users on a specific tier.

    Args:
        current_tier: The user's current subscription tier

    Returns:
        String message encouraging upgrade
    """
    if current_tier == TierType.FREE:
        return (
            "Upgrade to Premium for access to 500+ diseases and all 79 traits, "
            "or Pro for the complete 2700+ disease panel."
        )
    elif current_tier == TierType.PREMIUM:
        return (
            "Upgrade to Pro for access to the complete 2700+ disease panel, "
            "priority support, API access, and all future disease updates."
        )
    else:  # PRO
        return "You have lifetime access to all features, including future disease updates!"


def get_tier_comparison() -> dict[str, list]:
    """
    Get a comparison table of all tiers for display purposes.

    Returns:
        Dictionary with feature comparisons across tiers
    """
    return {
        "tiers": [TierType.FREE, TierType.PREMIUM, TierType.PRO],
        "prices": [
            TIER_CONFIGS[TierType.FREE].price,
            TIER_CONFIGS[TierType.PREMIUM].price,
            TIER_CONFIGS[TierType.PRO].price,
        ],
        "disease_limits": [
            TIER_CONFIGS[TierType.FREE].disease_limit,
            TIER_CONFIGS[TierType.PREMIUM].disease_limit,
            TIER_CONFIGS[TierType.PRO].disease_limit,
        ],
        "trait_limits": [
            TIER_CONFIGS[TierType.FREE].trait_limit,
            TIER_CONFIGS[TierType.PREMIUM].trait_limit,
            TIER_CONFIGS[TierType.PRO].trait_limit,
        ],
    }


def get_stripe_price_id(tier: TierType) -> str | None:
    """
    Get Stripe price ID for a specific tier (one-time purchase).

    Args:
        tier: The pricing tier

    Returns:
        Stripe price ID string, or None if not available
    """
    return STRIPE_PRICES.get(tier)


def can_access_ethnicity(tier: TierType) -> bool:
    """Check if a tier has access to ethnicity-adjusted frequencies.

    Args:
        tier: The user's subscription tier

    Returns:
        True if ethnicity features are available at this tier
    """
    return TIER_CONFIGS[tier].ethnicity_access


def get_pgx_limit(tier: TierType) -> int:
    """Get the pharmacogenomics gene limit for a tier.

    Args:
        tier: The user's subscription tier

    Returns:
        Number of PGx genes accessible (0 means no access)
    """
    return TIER_CONFIGS[tier].pgx_gene_limit


def get_prs_limit(tier: TierType) -> int:
    """Get the polygenic risk score condition limit for a tier.

    Args:
        tier: The user's subscription tier

    Returns:
        Number of PRS conditions accessible (0 means no access)
    """
    return TIER_CONFIGS[tier].prs_condition_limit


def get_counseling_level(tier: TierType) -> str:
    """Get the counseling feature level for a tier.

    Args:
        tier: The user's subscription tier

    Returns:
        Counseling level: "basic", "full", or "full_plus_letter"
    """
    return TIER_CONFIGS[tier].counseling_level


# Example usage
if __name__ == "__main__":
    # Display tier comparison
    print("Mergenix Pricing Tiers\n" + "=" * 50)

    for tier_type in TierType:
        config = get_tier_config(tier_type)
        print(f"\n{config.display_name} Tier")
        print(f"  Price: {'Free' if config.price == 0 else f'${config.price:.2f} (one-time)'}")
        print(f"  Diseases: {config.disease_limit}")
        print(f"  Traits: {config.trait_limit}")
        print("  Features:")
        for feature in config.features:
            print(f"    - {feature}")

    print("\n" + "=" * 50)
    print(f"\nFree tier includes {len(TOP_25_FREE_DISEASES)} diseases:")
    for disease in TOP_25_FREE_DISEASES[:5]:
        print(f"  - {disease}")
    print("  ... and more")

    print(f"\nFree tier includes {len(TOP_10_FREE_TRAITS)} traits:")
    for trait in TOP_10_FREE_TRAITS[:5]:
        print(f"  - {trait}")
    print("  ... and more")
