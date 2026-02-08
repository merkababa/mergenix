"""Tests for Source/tier_config.py — tier definitions, access control, and limits.

Covers:
- TierType enum values
- TierConfig dataclass properties
- TIER_CONFIGS correctness (Free, Premium, Pro)
- TOP_25_FREE_DISEASES and TOP_10_FREE_TRAITS lists
- get_tier_config()
- get_diseases_for_tier() / get_traits_for_tier()
- can_access_disease() / can_access_trait()
- get_upgrade_message()
- get_tier_comparison()
- get_stripe_price_id()
- Edge cases (invalid tiers, empty data, whitespace)
"""

import pytest
from Source.tier_config import (
    STRIPE_PRICES,
    TIER_CONFIGS,
    TOP_10_FREE_TRAITS,
    TOP_25_FREE_DISEASES,
    TierConfig,
    TierType,
    can_access_disease,
    can_access_trait,
    get_diseases_for_tier,
    get_stripe_price_id,
    get_tier_comparison,
    get_tier_config,
    get_traits_for_tier,
    get_upgrade_message,
)

# ---------------------------------------------------------------------------
# Sample data fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def sample_diseases():
    """Create a list of sample disease dicts matching carrier_panel.json structure."""
    diseases = []
    # Include all 25 free diseases
    for name in TOP_25_FREE_DISEASES:
        diseases.append({"condition": name, "gene": "TEST", "rsid": "rs000"})
    # Add extra diseases beyond the free tier
    for i in range(2700):
        diseases.append({"condition": f"Extra Disease {i}", "gene": "GENE{i}", "rsid": f"rs{i}"})
    return diseases


@pytest.fixture()
def sample_traits():
    """Create a list of sample trait dicts matching trait_snps.json structure."""
    traits = []
    # Include all 10 free traits
    for name in TOP_10_FREE_TRAITS:
        traits.append({"name": name, "rsid": "rs000", "gene": "TEST"})
    # Add extra traits beyond the free tier
    for i in range(70):
        traits.append({"name": f"Extra Trait {i}", "rsid": f"rs{i}", "gene": f"GENE{i}"})
    return traits


# ---------------------------------------------------------------------------
# TierType enum tests
# ---------------------------------------------------------------------------


class TestTierType:
    """Tests for the TierType enum."""

    def test_free_tier_exists(self):
        """FREE tier type has value 'free'."""
        assert TierType.FREE.value == "free"

    def test_premium_tier_exists(self):
        """PREMIUM tier type has value 'premium'."""
        assert TierType.PREMIUM.value == "premium"

    def test_pro_tier_exists(self):
        """PRO tier type has value 'pro'."""
        assert TierType.PRO.value == "pro"

    def test_exactly_three_tiers(self):
        """There should be exactly three tier types."""
        assert len(TierType) == 3

    def test_tier_ordering_by_value(self):
        """Tier values are distinct strings."""
        values = [t.value for t in TierType]
        assert len(values) == len(set(values))


# ---------------------------------------------------------------------------
# TierConfig dataclass tests
# ---------------------------------------------------------------------------


class TestTierConfig:
    """Tests for the TierConfig dataclass."""

    def test_tier_config_creation(self):
        """TierConfig can be instantiated with all required fields."""
        config = TierConfig(
            name="test",
            display_name="Test",
            price=9.99,
            disease_limit=100,
            trait_limit=50,
            features=["Feature A"],
        )
        assert config.name == "test"
        assert config.display_name == "Test"
        assert config.price == 9.99
        assert config.disease_limit == 100
        assert config.trait_limit == 50
        assert config.features == ["Feature A"]


# ---------------------------------------------------------------------------
# TIER_CONFIGS dictionary tests
# ---------------------------------------------------------------------------


class TestTierConfigs:
    """Tests for the TIER_CONFIGS constant."""

    def test_all_tiers_have_configs(self):
        """Every TierType has a corresponding TierConfig."""
        for tier in TierType:
            assert tier in TIER_CONFIGS

    def test_free_tier_price_is_zero(self):
        """Free tier costs nothing."""
        assert TIER_CONFIGS[TierType.FREE].price == 0.0

    def test_premium_tier_price(self):
        """Premium tier one-time price is 12.90."""
        assert TIER_CONFIGS[TierType.PREMIUM].price == 12.90

    def test_pro_tier_price(self):
        """Pro tier one-time price is 29.90."""
        assert TIER_CONFIGS[TierType.PRO].price == 29.90

    def test_disease_limit_ordering(self):
        """Disease limits increase from Free < Premium < Pro."""
        free_limit = TIER_CONFIGS[TierType.FREE].disease_limit
        premium_limit = TIER_CONFIGS[TierType.PREMIUM].disease_limit
        pro_limit = TIER_CONFIGS[TierType.PRO].disease_limit
        assert free_limit < premium_limit < pro_limit

    def test_free_disease_limit(self):
        """Free tier has a disease limit of 25."""
        assert TIER_CONFIGS[TierType.FREE].disease_limit == 25

    def test_premium_disease_limit(self):
        """Premium tier has a disease limit of 500."""
        assert TIER_CONFIGS[TierType.PREMIUM].disease_limit == 500

    def test_pro_disease_limit(self):
        """Pro tier has a disease limit of 2715."""
        assert TIER_CONFIGS[TierType.PRO].disease_limit == 2715

    def test_free_trait_limit(self):
        """Free tier has a trait limit of 10."""
        assert TIER_CONFIGS[TierType.FREE].trait_limit == 10

    def test_premium_and_pro_trait_limits_equal(self):
        """Premium and Pro both allow all 79 traits."""
        assert TIER_CONFIGS[TierType.PREMIUM].trait_limit == 79
        assert TIER_CONFIGS[TierType.PRO].trait_limit == 79

    def test_pro_has_more_features_than_premium(self):
        """Pro tier has more features than Premium."""
        premium_features = len(TIER_CONFIGS[TierType.PREMIUM].features)
        pro_features = len(TIER_CONFIGS[TierType.PRO].features)
        assert pro_features > premium_features

    def test_premium_has_more_features_than_free(self):
        """Premium tier has more features than Free."""
        free_features = len(TIER_CONFIGS[TierType.FREE].features)
        premium_features = len(TIER_CONFIGS[TierType.PREMIUM].features)
        assert premium_features > free_features

    def test_tier_names_match_enum(self):
        """Each TierConfig name matches its TierType value."""
        for tier_type, config in TIER_CONFIGS.items():
            assert config.name == tier_type.value


# ---------------------------------------------------------------------------
# Free-tier lists tests
# ---------------------------------------------------------------------------


class TestFreeTierLists:
    """Tests for TOP_25_FREE_DISEASES and TOP_10_FREE_TRAITS."""

    def test_free_diseases_count(self):
        """Exactly 25 diseases in the free tier list."""
        assert len(TOP_25_FREE_DISEASES) == 25

    def test_free_traits_count(self):
        """Exactly 10 traits in the free tier list."""
        assert len(TOP_10_FREE_TRAITS) == 10

    def test_free_diseases_no_duplicates(self):
        """No duplicate disease names in the free list."""
        assert len(TOP_25_FREE_DISEASES) == len(set(TOP_25_FREE_DISEASES))

    def test_free_traits_no_duplicates(self):
        """No duplicate trait names in the free list."""
        assert len(TOP_10_FREE_TRAITS) == len(set(TOP_10_FREE_TRAITS))

    def test_cystic_fibrosis_in_free_diseases(self):
        """Cystic Fibrosis (most common) is in the free disease list."""
        assert "Cystic Fibrosis" in TOP_25_FREE_DISEASES

    def test_eye_color_in_free_traits(self):
        """Eye Color is in the free trait list."""
        assert "Eye Color" in TOP_10_FREE_TRAITS


# ---------------------------------------------------------------------------
# get_tier_config() tests
# ---------------------------------------------------------------------------


class TestGetTierConfig:
    """Tests for get_tier_config()."""

    def test_returns_correct_config_for_free(self):
        """Returns the Free tier config."""
        config = get_tier_config(TierType.FREE)
        assert config.name == "free"
        assert config.display_name == "Free"

    def test_returns_correct_config_for_premium(self):
        """Returns the Premium tier config."""
        config = get_tier_config(TierType.PREMIUM)
        assert config.name == "premium"

    def test_returns_correct_config_for_pro(self):
        """Returns the Pro tier config."""
        config = get_tier_config(TierType.PRO)
        assert config.name == "pro"

    def test_raises_key_error_for_invalid_tier(self):
        """Raises KeyError when given a tier not in TIER_CONFIGS."""
        with pytest.raises(KeyError):
            get_tier_config("invalid")


# ---------------------------------------------------------------------------
# get_diseases_for_tier() tests
# ---------------------------------------------------------------------------


class TestGetDiseasesForTier:
    """Tests for get_diseases_for_tier()."""

    def test_free_tier_returns_only_free_diseases(self, sample_diseases):
        """Free tier returns only the top 25 named diseases."""
        result = get_diseases_for_tier(TierType.FREE, sample_diseases)
        assert len(result) <= 25
        for disease in result:
            assert disease["condition"] in TOP_25_FREE_DISEASES

    def test_premium_tier_returns_up_to_500(self, sample_diseases):
        """Premium tier returns up to 500 diseases."""
        result = get_diseases_for_tier(TierType.PREMIUM, sample_diseases)
        assert len(result) == 500

    def test_pro_tier_returns_up_to_2715(self, sample_diseases):
        """Pro tier returns up to 2715 diseases."""
        result = get_diseases_for_tier(TierType.PRO, sample_diseases)
        assert len(result) == 2715

    def test_free_tier_with_empty_list(self):
        """Free tier with empty disease list returns empty."""
        result = get_diseases_for_tier(TierType.FREE, [])
        assert result == []

    def test_premium_tier_with_small_list(self):
        """Premium tier with fewer diseases than limit returns all of them."""
        small_list = [{"condition": "Disease A"}, {"condition": "Disease B"}]
        result = get_diseases_for_tier(TierType.PREMIUM, small_list)
        assert len(result) == 2

    def test_free_tier_filters_by_name(self, sample_diseases):
        """Free tier filtering uses the condition name, not position."""
        # Add a non-free disease at the start
        modified = [{"condition": "Unknown Disease"}] + sample_diseases
        result = get_diseases_for_tier(TierType.FREE, modified)
        conditions = [d["condition"] for d in result]
        assert "Unknown Disease" not in conditions


# ---------------------------------------------------------------------------
# get_traits_for_tier() tests
# ---------------------------------------------------------------------------


class TestGetTraitsForTier:
    """Tests for get_traits_for_tier()."""

    def test_free_tier_returns_only_free_traits(self, sample_traits):
        """Free tier returns only the top 10 named traits."""
        result = get_traits_for_tier(TierType.FREE, sample_traits)
        assert len(result) <= 10
        for trait in result:
            assert trait["name"] in TOP_10_FREE_TRAITS

    def test_premium_tier_returns_up_to_79(self, sample_traits):
        """Premium tier returns up to 79 traits."""
        result = get_traits_for_tier(TierType.PREMIUM, sample_traits)
        assert len(result) == 79

    def test_pro_tier_returns_up_to_79(self, sample_traits):
        """Pro tier also returns up to 79 traits."""
        result = get_traits_for_tier(TierType.PRO, sample_traits)
        assert len(result) == 79

    def test_free_tier_with_empty_traits(self):
        """Free tier with empty trait list returns empty."""
        result = get_traits_for_tier(TierType.FREE, [])
        assert result == []


# ---------------------------------------------------------------------------
# can_access_disease() tests
# ---------------------------------------------------------------------------


class TestCanAccessDisease:
    """Tests for can_access_disease()."""

    def test_free_can_access_cystic_fibrosis(self, sample_diseases):
        """Free tier can access Cystic Fibrosis (a top-25 disease)."""
        assert can_access_disease(TierType.FREE, "Cystic Fibrosis", sample_diseases) is True

    def test_free_cannot_access_extra_disease(self, sample_diseases):
        """Free tier cannot access diseases outside the top 25."""
        assert can_access_disease(TierType.FREE, "Extra Disease 0", sample_diseases) is False

    def test_premium_can_access_extra_disease(self, sample_diseases):
        """Premium tier can access diseases within the 500 limit."""
        assert can_access_disease(TierType.PREMIUM, "Extra Disease 0", sample_diseases) is True

    def test_pro_can_access_any_disease(self, sample_diseases):
        """Pro tier can access any disease within the 2715 limit."""
        assert can_access_disease(TierType.PRO, "Extra Disease 2000", sample_diseases) is True

    def test_whitespace_handling(self, sample_diseases):
        """Disease name matching handles whitespace."""
        assert can_access_disease(TierType.FREE, "  Cystic Fibrosis  ", sample_diseases) is True

    def test_nonexistent_disease(self, sample_diseases):
        """Nonexistent disease returns False for any tier."""
        assert can_access_disease(TierType.PRO, "Totally Made Up Disease", sample_diseases) is False


# ---------------------------------------------------------------------------
# can_access_trait() tests
# ---------------------------------------------------------------------------


class TestCanAccessTrait:
    """Tests for can_access_trait()."""

    def test_free_can_access_eye_color(self, sample_traits):
        """Free tier can access Eye Color (a top-10 trait)."""
        assert can_access_trait(TierType.FREE, "Eye Color", sample_traits) is True

    def test_free_cannot_access_extra_trait(self, sample_traits):
        """Free tier cannot access traits outside the top 10."""
        assert can_access_trait(TierType.FREE, "Extra Trait 0", sample_traits) is False

    def test_premium_can_access_extra_trait(self, sample_traits):
        """Premium tier can access extra traits within 79 limit."""
        assert can_access_trait(TierType.PREMIUM, "Extra Trait 0", sample_traits) is True

    def test_whitespace_handling(self, sample_traits):
        """Trait name matching handles whitespace."""
        assert can_access_trait(TierType.FREE, "  Eye Color  ", sample_traits) is True


# ---------------------------------------------------------------------------
# get_upgrade_message() tests
# ---------------------------------------------------------------------------


class TestGetUpgradeMessage:
    """Tests for get_upgrade_message()."""

    def test_free_tier_upgrade_message(self):
        """Free tier message mentions Premium and Pro."""
        msg = get_upgrade_message(TierType.FREE)
        assert "Premium" in msg
        assert "Pro" in msg

    def test_premium_tier_upgrade_message(self):
        """Premium tier message mentions Pro upgrade."""
        msg = get_upgrade_message(TierType.PREMIUM)
        assert "Pro" in msg

    def test_pro_tier_message(self):
        """Pro tier message indicates full access."""
        msg = get_upgrade_message(TierType.PRO)
        assert "lifetime" in msg.lower() or "all features" in msg.lower()


# ---------------------------------------------------------------------------
# get_tier_comparison() tests
# ---------------------------------------------------------------------------


class TestGetTierComparison:
    """Tests for get_tier_comparison()."""

    def test_returns_all_three_tiers(self):
        """Comparison contains exactly 3 tiers."""
        comparison = get_tier_comparison()
        assert len(comparison["tiers"]) == 3

    def test_prices_in_ascending_order(self):
        """Prices are in ascending order (Free < Premium < Pro)."""
        comparison = get_tier_comparison()
        prices = comparison["prices"]
        assert prices[0] < prices[1] < prices[2]

    def test_disease_limits_in_ascending_order(self):
        """Disease limits are in ascending order."""
        comparison = get_tier_comparison()
        limits = comparison["disease_limits"]
        assert limits[0] < limits[1] < limits[2]

    def test_trait_limits_structure(self):
        """Trait limits list has 3 entries."""
        comparison = get_tier_comparison()
        assert len(comparison["trait_limits"]) == 3


# ---------------------------------------------------------------------------
# get_stripe_price_id() tests
# ---------------------------------------------------------------------------


class TestGetStripePriceId:
    """Tests for get_stripe_price_id()."""

    def test_free_tier_has_no_price_id(self):
        """Free tier returns None (no payment needed)."""
        assert get_stripe_price_id(TierType.FREE) is None

    def test_premium_tier_has_price_id(self):
        """Premium tier has a Stripe price ID."""
        price_id = get_stripe_price_id(TierType.PREMIUM)
        assert price_id is not None
        assert isinstance(price_id, str)

    def test_pro_tier_has_price_id(self):
        """Pro tier has a Stripe price ID."""
        price_id = get_stripe_price_id(TierType.PRO)
        assert price_id is not None
        assert isinstance(price_id, str)

    def test_stripe_prices_match_tier_configs(self):
        """STRIPE_PRICES keys match TIER_CONFIGS keys."""
        assert set(STRIPE_PRICES.keys()) == set(TIER_CONFIGS.keys())
