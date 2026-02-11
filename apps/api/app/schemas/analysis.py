"""
Analysis result schemas — request and response models for analysis endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

# ── Requests ──────────────────────────────────────────────────────────────


_SUMMARY_ALLOWED_KEYS: frozenset[str] = frozenset({
    "trait_count",
    "carrier_count",
    "condition_count",
    "pgx_count",
    "risk_count",
    "prs_count",
    "high_risk_count",
    "health_risk_count",
    "total_variants_analyzed",
})

_SUMMARY_MAX_ENTRIES = 20


class SaveAnalysisRequest(BaseModel):
    """Save a new analysis result."""

    label: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="User-provided name for this analysis",
    )
    parent1_filename: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Original filename of parent 1's genetic data",
    )
    parent2_filename: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Original filename of parent 2's genetic data",
    )
    result_data: dict[str, Any] = Field(
        ...,
        description="Full analysis result object to be encrypted at rest",
    )
    summary: dict[str, Any] = Field(
        ...,
        description="Summary stats (counts, etc.) stored unencrypted for listing",
    )
    consent_given: bool = Field(
        ...,
        description=(
            "User must explicitly consent to storing their genetic analysis data. "
            "Must be True to proceed."
        ),
    )

    @field_validator("consent_given")
    @classmethod
    def consent_must_be_true(cls, v: bool) -> bool:
        """Reject requests where consent is not explicitly given."""
        if not v:
            raise ValueError(
                "Consent is required to save genetic analysis data. "
                "Set consent_given to true."
            )
        return v

    @field_validator("summary")
    @classmethod
    def validate_summary(cls, v: dict[str, Any]) -> dict[str, Any]:
        """Restrict summary keys to a safe whitelist and simple value types.

        The summary is stored unencrypted (plaintext) for listing purposes.
        Arbitrary keys or nested objects could be used to inject sensitive
        genetic data that bypasses the at-rest encryption of result_data.
        """
        if len(v) > _SUMMARY_MAX_ENTRIES:
            raise ValueError(
                f"Summary dict exceeds maximum of {_SUMMARY_MAX_ENTRIES} entries"
            )
        for key in v:
            if key not in _SUMMARY_ALLOWED_KEYS:
                raise ValueError(
                    f"Summary key '{key}' is not allowed. "
                    f"Allowed: {sorted(_SUMMARY_ALLOWED_KEYS)}"
                )
            if not isinstance(v[key], (int, float, str, type(None))):
                raise ValueError(
                    f"Summary value for '{key}' must be a simple type "
                    f"(int, float, str, or None), got {type(v[key]).__name__}"
                )
        return v


# ── Responses ─────────────────────────────────────────────────────────────


class SaveAnalysisResponse(BaseModel):
    """Returned after successfully saving an analysis result."""

    id: uuid.UUID
    label: str
    created_at: datetime


class AnalysisListItem(BaseModel):
    """A single analysis result in a listing (no decrypted data)."""

    id: uuid.UUID
    label: str
    parent1_filename: str
    parent2_filename: str
    tier_at_time: str
    summary: dict[str, Any] | None
    created_at: datetime


class AnalysisDetailResponse(BaseModel):
    """Full analysis result with decrypted data."""

    id: uuid.UUID
    label: str
    parent1_filename: str
    parent2_filename: str
    tier_at_time: str
    result_data: dict[str, Any]
    summary: dict[str, Any] | None
    created_at: datetime
