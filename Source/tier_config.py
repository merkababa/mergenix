"""
Tier configuration system for Tortit genetic analysis app.

Defines subscription tiers, limits, and access control for diseases and traits.
"""

from dataclasses import dataclass
from enum import Enum
from typing import List, Dict, Optional


class TierType(Enum):
    """Subscription tier types."""
    FREE = "free"
    PREMIUM = "premium"
    PRO = "pro"


@dataclass
class TierConfig:
    """Configuration for a subscription tier."""
    name: str
    display_name: str
    price_monthly: float
    price_yearly: float
    disease_limit: int
    trait_limit: int
    features: List[str]


# Tier configurations
TIER_CONFIGS: Dict[TierType, TierConfig] = {
    TierType.FREE: TierConfig(
        name="free",
        display_name="Free",
        price_monthly=0.0,
        price_yearly=0.0,
        disease_limit=25,
        trait_limit=10,
        features=[
            "Analyze top 25 genetic diseases",
            "Analyze top 10 genetic traits",
            "Basic carrier status report",
            "Disease prevalence data",
        ]
    ),
    TierType.PREMIUM: TierConfig(
        name="premium",
        display_name="Premium",
        price_monthly=19.99,
        price_yearly=159.99,
        disease_limit=500,
        trait_limit=79,
        features=[
            "Analyze 500+ genetic diseases",
            "Analyze all 79 genetic traits",
            "Detailed carrier reports",
            "Disease prevalence data with OMIM links",
            "Advanced filtering and search",
            "PDF export",
        ]
    ),
    TierType.PRO: TierConfig(
        name="pro",
        display_name="Pro",
        price_monthly=49.99,
        price_yearly=399.99,
        disease_limit=1211,
        trait_limit=79,
        features=[
            "Analyze all 1211+ genetic diseases",
            "Analyze all 79 genetic traits",
            "Comprehensive carrier reports",
            "Disease prevalence data with OMIM links",
            "Advanced filtering and search",
            "PDF export",
            "Priority support",
            "API access",
        ]
    )
}


# Top 25 diseases available in FREE tier
TOP_25_FREE_DISEASES: List[str] = [
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
TOP_10_FREE_TRAITS: List[str] = [
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
STRIPE_PRICES: Dict[TierType, Dict[str, str]] = {
    TierType.FREE: {
        "monthly": None,
        "yearly": None,
    },
    TierType.PREMIUM: {
        "monthly": "price_premium_monthly_placeholder",
        "yearly": "price_premium_yearly_placeholder",
    },
    TierType.PRO: {
        "monthly": "price_pro_monthly_placeholder",
        "yearly": "price_pro_yearly_placeholder",
    }
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


def get_diseases_for_tier(tier: TierType, all_diseases: List[Dict]) -> List[Dict]:
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


def get_traits_for_tier(tier: TierType, all_traits: List[Dict]) -> List[Dict]:
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
    all_diseases: List[Dict]
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
    all_traits: List[Dict]
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
            "or Pro for the complete 1211+ disease panel."
        )
    elif current_tier == TierType.PREMIUM:
        return (
            "Upgrade to Pro for access to the complete 1211+ disease panel, "
            "priority support, and API access."
        )
    else:  # PRO
        return "You have access to all features!"


def get_tier_comparison() -> Dict[str, List]:
    """
    Get a comparison table of all tiers for display purposes.

    Returns:
        Dictionary with feature comparisons across tiers
    """
    return {
        "tiers": [TierType.FREE, TierType.PREMIUM, TierType.PRO],
        "prices_monthly": [
            TIER_CONFIGS[TierType.FREE].price_monthly,
            TIER_CONFIGS[TierType.PREMIUM].price_monthly,
            TIER_CONFIGS[TierType.PRO].price_monthly,
        ],
        "prices_yearly": [
            TIER_CONFIGS[TierType.FREE].price_yearly,
            TIER_CONFIGS[TierType.PREMIUM].price_yearly,
            TIER_CONFIGS[TierType.PRO].price_yearly,
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


def get_stripe_price_id(tier: TierType, billing_period: str) -> Optional[str]:
    """
    Get Stripe price ID for a specific tier and billing period.

    Args:
        tier: The subscription tier
        billing_period: Either "monthly" or "yearly"

    Returns:
        Stripe price ID string, or None if not available
    """
    if tier not in STRIPE_PRICES:
        return None

    return STRIPE_PRICES[tier].get(billing_period)


# Example usage
if __name__ == "__main__":
    # Display tier comparison
    print("Tortit Subscription Tiers\n" + "=" * 50)

    for tier_type in TierType:
        config = get_tier_config(tier_type)
        print(f"\n{config.display_name} Tier")
        print(f"  Price: ${config.price_monthly}/mo (${config.price_yearly}/yr)")
        print(f"  Diseases: {config.disease_limit}")
        print(f"  Traits: {config.trait_limit}")
        print(f"  Features:")
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
