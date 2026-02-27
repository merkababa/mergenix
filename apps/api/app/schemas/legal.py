"""
Legal and privacy schemas — request and response models for consent,
cookie preferences, and GDPR data export endpoints.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

# ── Requests ──────────────────────────────────────────────────────────────


class RecordConsentRequest(BaseModel):
    """Record a consent event (terms, privacy, cookies, age_verification, genetic_data_processing)."""

    consent_type: str = Field(
        ...,
        pattern=r"^(terms|privacy|cookies|age_verification|genetic_data_processing)$",
        description="Type of consent being recorded",
    )
    version: str = Field(
        ...,
        min_length=1,
        max_length=20,
        description="Document version, e.g. '1.0'",
    )


class CookiePreferencesRequest(BaseModel):
    """Update cookie preferences."""

    analytics: bool = Field(
        default=False,
        description="Whether analytics cookies are enabled",
    )
    marketing: bool = Field(
        default=False,
        description="Whether marketing cookies are enabled",
    )


# ── Responses ─────────────────────────────────────────────────────────────


class ConsentResponse(BaseModel):
    """A single consent record."""

    id: str
    consent_type: str
    version: str
    accepted_at: str = Field(
        ...,
        description="ISO 8601 timestamp of when consent was given",
    )


class CookiePreferencesResponse(BaseModel):
    """Current cookie preferences for the user."""

    essential: bool = Field(
        default=True,
        description="Essential cookies are always enabled (read-only)",
    )
    analytics: bool
    marketing: bool = Field(
        default=False,
        description="Whether marketing cookies are enabled",
    )


# ── GDPR Export Sub-Schemas ──────────────────────────────────────────────


class ConsentExportSchema(BaseModel):
    """A consent record as it appears in the GDPR data export."""

    id: str
    consent_type: str
    version: str
    accepted_at: str
    ip_address: str | None = None
    user_agent: str | None = None


class PaymentExportSchema(BaseModel):
    """A payment record as it appears in the GDPR data export."""

    id: str
    amount: int
    currency: str
    status: str
    created_at: str


class SessionExportSchema(BaseModel):
    """An active session as it appears in the GDPR data export."""

    id: str
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: str
    expires_at: str


class AnalysisExportSchema(BaseModel):
    """Analysis result metadata as it appears in the GDPR data export.

    Excludes encrypted result_data for security.
    """

    id: str
    label: str
    created_at: str
    updated_at: str


class CookiePreferencesExportSchema(BaseModel):
    """Cookie preferences as they appear in the GDPR data export."""

    essential: bool = True
    analytics: bool
    marketing: bool = False
    updated_at: str


class DataExportResponse(BaseModel):
    """GDPR data export — full dump of user data in JSON format.

    Note: Raw analysis data is NOT included because it is
    AES-256-GCM encrypted at rest. Only metadata and analysis
    count are returned.
    """

    user_id: str
    email: str
    name: str
    tier: str
    created_at: str
    consents: list[ConsentExportSchema]
    payments: list[PaymentExportSchema]
    cookie_preferences: CookiePreferencesExportSchema | None = Field(
        default=None,
        description="Current cookie preferences, or null if never set",
    )
    sessions: list[SessionExportSchema]
    analyses: list[AnalysisExportSchema]
    analysis_count: int
    exported_at: str
