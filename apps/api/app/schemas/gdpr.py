"""
GDPR schemas — request and response models for GDPR compliance endpoints.

Covers account deletion (B7), data portability export (B8), and
profile rectification (B12).
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, EmailStr, Field

# ── Requests ──────────────────────────────────────────────────────────────


class GdprDeleteAccountRequest(BaseModel):
    """Request to permanently delete the user's account (GDPR right to erasure)."""

    password: str = Field(..., min_length=1)


class GdprConfirmDeletionRequest(BaseModel):
    """Confirm account deletion using the token received via email."""

    token: str = Field(..., min_length=1)


class RectifyProfileRequest(BaseModel):
    """Update user profile fields for GDPR data rectification (Article 16).

    If ``email`` is being changed, ``password`` must also be provided for
    re-authentication (prevents account takeover with a stolen JWT).
    Name-only changes do not require a password.
    """

    name: str | None = Field(None, min_length=2, max_length=255)
    email: EmailStr | None = None
    password: str | None = Field(None, min_length=1)


# ── Response Sub-Schemas ─────────────────────────────────────────────────


class GdprUserProfile(BaseModel):
    """User profile as it appears in the GDPR data export."""

    id: str
    email: str
    name: str
    tier: str
    email_verified: bool
    date_of_birth: str | None = None
    created_at: str
    updated_at: str


class GdprAnalysisExport(BaseModel):
    """Analysis result with encrypted envelope for GDPR data export.

    Unlike the legal export (which excludes encrypted data), the GDPR
    export includes the full EncryptedEnvelope so the user can download
    ALL of their data (Article 20 — data portability).
    """

    id: str
    label: str
    parent1_filename: str
    parent2_filename: str
    tier_at_time: str
    data_version: str | None = None
    result_data: dict[str, Any]
    summary: dict[str, Any] | None = None
    created_at: str
    updated_at: str


class GdprAuditLogExport(BaseModel):
    """Audit log entry as it appears in the GDPR data export.

    Both ip_address and user_agent are personal data per GDPR Article 20
    and must be included in the data portability export.
    """

    id: str
    event_type: str
    metadata: dict[str, Any] | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: str


class GdprPaymentExport(BaseModel):
    """Payment record as it appears in the GDPR data export."""

    id: str
    amount: int
    currency: str
    status: str
    tier_granted: str
    created_at: str


# ── Responses ─────────────────────────────────────────────────────────────


class GdprPaginationInfo(BaseModel):
    """Pagination metadata for paginated GDPR export responses."""

    page: int
    page_size: int
    total_count: int
    has_next: bool
    skipped_legacy: int = 0


class GdprExportResponse(BaseModel):
    """GDPR data export — full dump of user data including encrypted envelopes.

    This is the GDPR Article 20 compliant response that includes ALL
    user data: profile, analysis results (with encrypted envelopes),
    audit logs, and payment history.

    Analysis results are paginated to prevent unbounded memory usage.
    """

    user: GdprUserProfile
    analyses: list[GdprAnalysisExport]
    audit_logs: list[GdprAuditLogExport]
    payments: list[GdprPaymentExport]
    pagination: GdprPaginationInfo
    exported_at: str


class RectifyProfileResponse(BaseModel):
    """Response after updating profile fields via GDPR rectification."""

    id: str
    email: str
    name: str
    tier: str
    email_verified: bool
    created_at: str
    updated_at: str
