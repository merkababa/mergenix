"""Centralized tier definitions — single source of truth."""

from enum import IntEnum


class Tier(IntEnum):
    """User pricing tiers, ordered by capability."""

    FREE = 0
    PREMIUM = 1
    PRO = 2


# String values for database/API compatibility
TIER_FREE = "free"
TIER_PREMIUM = "premium"
TIER_PRO = "pro"

# Mapping: enum -> db string
TIER_TO_STR: dict[Tier, str] = {
    Tier.FREE: TIER_FREE,
    Tier.PREMIUM: TIER_PREMIUM,
    Tier.PRO: TIER_PRO,
}

# Mapping: db string -> enum
STR_TO_TIER: dict[str, Tier] = {v: k for k, v in TIER_TO_STR.items()}

# Tier rank for comparison (preserves existing TIER_RANK semantics)
TIER_RANK: dict[str, int] = {TIER_FREE: 0, TIER_PREMIUM: 1, TIER_PRO: 2}

# Result limits per tier
UNLIMITED_TIER_LIMIT = 999_999
TIER_RESULT_LIMITS: dict[str, int] = {
    TIER_FREE: 1,
    TIER_PREMIUM: 10,
    TIER_PRO: UNLIMITED_TIER_LIMIT,
}

# Stripe price mapping (read price IDs from env in production)
TIER_PRICES: dict[str, dict] = {
    TIER_PREMIUM: {"monthly": 14_99, "label": "Premium"},
    TIER_PRO: {"monthly": 34_99, "label": "Pro"},
}
