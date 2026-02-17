"""
Analysis result schemas — request and response models for analysis endpoints.

ZKE (Zero-Knowledge Encryption): The client encrypts genetic data locally
and submits an opaque EncryptedEnvelope.  The server stores it as-is
without ever seeing or decrypting the plaintext.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.schemas.encryption import EncryptedEnvelope

# ── Requests ──────────────────────────────────────────────────────────────


_SUMMARY_ALLOWED_KEYS: frozenset[str] = frozenset({
    "trait_count",
    "carrier_count",
    "condition_count",
    "pgx_count",
    "risk_count",
    "prs_count",
    "has_results",
    "total_variants_analyzed",
})

# Keys that were previously allowed but removed for ZKE privacy compliance.
# high_risk_count and health_risk_count store unencrypted health-sensitive
# metadata (specific risk counts) that contradicts the ZKE design — the
# server should not know how many high-risk conditions a user has.
# Replaced with the non-sensitive boolean ``has_results``.
_SUMMARY_REMOVED_KEYS: frozenset[str] = frozenset({
    "high_risk_count",
    "health_risk_count",
})

_SUMMARY_MAX_ENTRIES = 20


class SaveAnalysisRequest(BaseModel):
    """Save a new analysis result (ZKE — client-encrypted envelope)."""

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
    result_data: EncryptedEnvelope = Field(
        ...,
        description=(
            "Client-encrypted analysis result envelope. "
            "The server stores this opaque blob as-is, never decrypting it."
        ),
    )
    summary: dict[str, Any] = Field(
        ...,
        description="Summary stats (counts, etc.) stored unencrypted for listing",
    )
    data_version: str | None = Field(
        None,
        max_length=50,
        description="Version of the analysis engine/data used to generate this result",
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
            if key in _SUMMARY_REMOVED_KEYS:
                raise ValueError(
                    f"Summary key '{key}' has been removed for ZKE privacy "
                    f"compliance. Use 'has_results' (bool) instead."
                )
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
    """A single analysis result in a listing (no envelope data).

    Privacy note on plaintext summary fields:
        The ``summary`` dict stores only non-sensitive aggregate counts
        (e.g., trait_count, carrier_count) and a boolean ``has_results``
        flag.  Health-sensitive counts like ``high_risk_count`` and
        ``health_risk_count`` have been removed to comply with ZKE
        design — the server should not store unencrypted health risk data.
    """

    id: uuid.UUID
    label: str
    parent1_filename: str
    parent2_filename: str
    tier_at_time: str
    data_version: str | None = None
    summary: dict[str, Any] | None
    created_at: datetime


class AnalysisDetailResponse(BaseModel):
    """Full analysis result with opaque encrypted envelope."""

    id: uuid.UUID
    label: str
    parent1_filename: str
    parent2_filename: str
    tier_at_time: str
    data_version: str | None = None
    result_data: dict[str, Any]
    summary: dict[str, Any] | None
    created_at: datetime
