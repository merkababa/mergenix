"""
Payment schemas — request and response models for payment endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# NOTE: The Literal["premium", "pro"] below must stay as literal strings
# because Python's typing.Literal does not accept variables. The canonical
# tier values are defined in app.constants.tiers (TIER_PREMIUM, TIER_PRO).

# ── Requests ──────────────────────────────────────────────────────────────


class CreateCheckoutRequest(BaseModel):
    """Request to create a Stripe checkout session."""

    tier: Literal["premium", "pro"] = Field(
        ...,
        description="Tier to purchase (one-time)",
    )


# ── Responses ─────────────────────────────────────────────────────────────


class CheckoutResponse(BaseModel):
    """Response containing the Stripe checkout URL."""

    checkout_url: str
    session_id: str


class PaymentHistoryItem(BaseModel):
    """Single payment entry for the history list."""

    id: uuid.UUID
    amount: int = Field(..., description="Amount in smallest currency unit (cents)")
    currency: str
    status: str
    tier_granted: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TierStatus(BaseModel):
    """Current tier status for the authenticated user (one-time purchase model)."""

    tier: str
    is_active: bool
    payments_count: int
