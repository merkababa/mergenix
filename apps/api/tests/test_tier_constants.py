"""
Tests for centralized tier constants — single source of truth.

Verifies that:
  1. The Tier IntEnum has correct members and ordering
  2. String constants match expected values
  3. Bidirectional mappings (TIER_TO_STR / STR_TO_TIER) are consistent
  4. TIER_RANK preserves existing semantics
  5. TIER_RESULT_LIMITS match expected values per tier
  6. TIER_PRICES has correct structure for paid tiers
  7. All source files import from constants (no local redefinitions)
"""

from __future__ import annotations

# ── Tier IntEnum Tests ────────────────────────────────────────────────────


class TestTierEnum:
    """Tests for the Tier IntEnum."""

    def test_tier_enum_has_three_members(self) -> None:
        from app.constants.tiers import Tier

        assert len(Tier) == 3

    def test_tier_enum_values_ordered(self) -> None:
        from app.constants.tiers import Tier

        assert Tier.FREE < Tier.PREMIUM < Tier.PRO

    def test_tier_free_is_zero(self) -> None:
        from app.constants.tiers import Tier

        assert Tier.FREE == 0

    def test_tier_premium_is_one(self) -> None:
        from app.constants.tiers import Tier

        assert Tier.PREMIUM == 1

    def test_tier_pro_is_two(self) -> None:
        from app.constants.tiers import Tier

        assert Tier.PRO == 2

    def test_tier_is_int_enum(self) -> None:
        from enum import IntEnum

        from app.constants.tiers import Tier

        assert issubclass(Tier, IntEnum)


# ── String Constants Tests ──────────────────────────────────────────────


class TestTierStringConstants:
    """Tests for the tier string constants."""

    def test_tier_free_string(self) -> None:
        from app.constants.tiers import TIER_FREE

        assert TIER_FREE == "free"

    def test_tier_premium_string(self) -> None:
        from app.constants.tiers import TIER_PREMIUM

        assert TIER_PREMIUM == "premium"

    def test_tier_pro_string(self) -> None:
        from app.constants.tiers import TIER_PRO

        assert TIER_PRO == "pro"


# ── Mapping Tests ───────────────────────────────────────────────────────


class TestTierMappings:
    """Tests for bidirectional enum <-> string mappings."""

    def test_tier_to_str_complete(self) -> None:
        from app.constants.tiers import TIER_TO_STR, Tier

        assert set(TIER_TO_STR.keys()) == set(Tier)

    def test_str_to_tier_complete(self) -> None:
        from app.constants.tiers import STR_TO_TIER, TIER_TO_STR

        assert set(STR_TO_TIER.keys()) == set(TIER_TO_STR.values())

    def test_mappings_are_inverses(self) -> None:
        from app.constants.tiers import STR_TO_TIER, TIER_TO_STR, Tier

        for tier in Tier:
            s = TIER_TO_STR[tier]
            assert STR_TO_TIER[s] == tier

    def test_tier_to_str_values(self) -> None:
        from app.constants.tiers import TIER_TO_STR, Tier

        assert TIER_TO_STR[Tier.FREE] == "free"
        assert TIER_TO_STR[Tier.PREMIUM] == "premium"
        assert TIER_TO_STR[Tier.PRO] == "pro"


# ── TIER_RANK Tests ─────────────────────────────────────────────────────


class TestTierRank:
    """Tests for TIER_RANK dict (preserves existing auth middleware semantics)."""

    def test_tier_rank_has_three_entries(self) -> None:
        from app.constants.tiers import TIER_RANK

        assert len(TIER_RANK) == 3

    def test_tier_rank_values(self) -> None:
        from app.constants.tiers import TIER_RANK

        assert TIER_RANK["free"] == 0
        assert TIER_RANK["premium"] == 1
        assert TIER_RANK["pro"] == 2

    def test_tier_rank_ordering(self) -> None:
        from app.constants.tiers import TIER_RANK

        assert TIER_RANK["free"] < TIER_RANK["premium"] < TIER_RANK["pro"]


# ── TIER_RESULT_LIMITS Tests ────────────────────────────────────────────


class TestTierResultLimits:
    """Tests for TIER_RESULT_LIMITS dict."""

    def test_free_limit_is_one(self) -> None:
        from app.constants.tiers import TIER_RESULT_LIMITS

        assert TIER_RESULT_LIMITS["free"] == 1

    def test_premium_limit_is_ten(self) -> None:
        from app.constants.tiers import TIER_RESULT_LIMITS

        assert TIER_RESULT_LIMITS["premium"] == 10

    def test_pro_limit_is_large(self) -> None:
        """Pro tier should have a very large (effectively unlimited) limit."""
        from app.constants.tiers import TIER_RESULT_LIMITS, UNLIMITED_TIER_LIMIT

        assert TIER_RESULT_LIMITS["pro"] == UNLIMITED_TIER_LIMIT
        assert TIER_RESULT_LIMITS["pro"] > 100_000

    def test_has_all_tiers(self) -> None:
        from app.constants.tiers import TIER_RESULT_LIMITS

        assert set(TIER_RESULT_LIMITS.keys()) == {"free", "premium", "pro"}


# ── TIER_PRICES Tests ───────────────────────────────────────────────────


class TestTierPrices:
    """Tests for TIER_PRICES dict."""

    def test_has_premium_and_pro_only(self) -> None:
        """Free tier has no price — only premium and pro should be in TIER_PRICES."""
        from app.constants.tiers import TIER_PRICES

        assert set(TIER_PRICES.keys()) == {"premium", "pro"}

    def test_premium_price(self) -> None:
        from app.constants.tiers import TIER_PRICES

        assert TIER_PRICES["premium"]["amount"] == 14_99
        assert TIER_PRICES["premium"]["label"] == "Premium"

    def test_pro_price(self) -> None:
        from app.constants.tiers import TIER_PRICES

        assert TIER_PRICES["pro"]["amount"] == 34_99
        assert TIER_PRICES["pro"]["label"] == "Pro"


# ── Import from constants package Tests ─────────────────────────────────


class TestConstantsPackageExports:
    """Tests that constants/__init__.py re-exports everything."""

    def test_import_tier_from_package(self) -> None:
        from app.constants import Tier

        assert Tier.FREE == 0

    def test_import_string_constants_from_package(self) -> None:
        from app.constants import TIER_FREE, TIER_PREMIUM, TIER_PRO

        assert TIER_FREE == "free"
        assert TIER_PREMIUM == "premium"
        assert TIER_PRO == "pro"

    def test_import_tier_rank_from_package(self) -> None:
        from app.constants import TIER_RANK

        assert TIER_RANK["free"] == 0

    def test_import_tier_result_limits_from_package(self) -> None:
        from app.constants import TIER_RESULT_LIMITS

        assert TIER_RESULT_LIMITS["free"] == 1


# ── Source File Import Verification Tests ───────────────────────────────
# These tests verify that the source files actually use the centralized
# constants instead of defining their own local copies.


class TestSourceFilesUseConstants:
    """Verify source files import from constants, not local definitions."""

    def test_auth_middleware_uses_constants_tier_rank(self) -> None:
        """auth.py's TIER_RANK should be the same object from constants."""
        from app.constants.tiers import TIER_RANK as CONSTANTS_TIER_RANK
        from app.middleware.auth import TIER_RANK as AUTH_TIER_RANK

        assert AUTH_TIER_RANK is CONSTANTS_TIER_RANK

    def test_analysis_router_uses_constants_tier_result_limits(self) -> None:
        """analysis.py's TIER_RESULT_LIMITS should be the same object from constants."""
        from app.constants.tiers import TIER_RESULT_LIMITS as CONSTANTS_LIMITS
        from app.routers.analysis import TIER_RESULT_LIMITS as ANALYSIS_LIMITS

        assert ANALYSIS_LIMITS is CONSTANTS_LIMITS

    def test_analysis_router_no_longer_defines_local_unlimited(self) -> None:
        """analysis.py should NOT define its own UNLIMITED_TIER_LIMIT anymore.

        The local definition was removed; tier limits are now consumed
        exclusively via TIER_RESULT_LIMITS from app.constants.tiers.
        """
        import app.routers.analysis as analysis_mod

        # The module should NOT have its own UNLIMITED_TIER_LIMIT attribute
        # (it was removed during the centralization refactor).
        assert not hasattr(analysis_mod, "UNLIMITED_TIER_LIMIT")

    def test_payments_router_imports_tier_rank_from_constants(self) -> None:
        """payments.py should import TIER_RANK from constants (not from auth)."""
        from app.constants.tiers import TIER_RANK as CONSTANTS_TIER_RANK
        from app.routers.payments import TIER_RANK as PAYMENTS_TIER_RANK

        assert PAYMENTS_TIER_RANK is CONSTANTS_TIER_RANK
