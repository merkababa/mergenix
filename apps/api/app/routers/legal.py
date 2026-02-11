"""
Legal and privacy router — consent recording, cookie preferences,
and GDPR data export.

Provides endpoints for recording and retrieving user consent events,
managing cookie preferences, and exporting all user data for GDPR
compliance (right of access / data portability).
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Request, status
from sqlalchemy import select

from app.database import DbSession
from app.middleware.auth import CurrentUser
from app.middleware.rate_limiter import (
    LIMIT_DATA_EXPORT,
    LIMIT_GENERAL_API,
    limiter,
)
from app.models.analysis import AnalysisResult
from app.models.audit import Session
from app.models.consent import ConsentRecord, CookiePreference
from app.models.payment import Payment
from app.schemas.legal import (
    AnalysisExportSchema,
    ConsentExportSchema,
    ConsentResponse,
    CookiePreferencesExportSchema,
    CookiePreferencesRequest,
    CookiePreferencesResponse,
    DataExportResponse,
    PaymentExportSchema,
    RecordConsentRequest,
    SessionExportSchema,
)
from app.services import audit_service
from app.utils.request_helpers import client_ip as _client_ip
from app.utils.request_helpers import user_agent as _user_agent

router = APIRouter()

# Maximum rows returned per table in the GDPR data export endpoint.
# Prevents unbounded memory usage for power users with very large histories.
MAX_EXPORT_ROWS = 10_000


# ── Record Consent ───────────────────────────────────────────────────────


@router.post(
    "/consent",
    response_model=ConsentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a consent event",
)
@limiter.limit(LIMIT_GENERAL_API)
async def record_consent(
    request: Request,
    body: RecordConsentRequest,
    user: CurrentUser,
    db: DbSession,
) -> ConsentResponse:
    """Record that the user has accepted a specific legal document.

    Creates an immutable consent record with the user's IP address
    and user agent for audit trail purposes. Each call creates a
    new record (consents are append-only, never overwritten).
    """
    record = ConsentRecord(
        user_id=user.id,
        consent_type=body.consent_type,
        version=body.version,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request)[:500],  # truncate to column max
    )
    db.add(record)

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="consent_recorded",
        metadata={
            "consent_type": body.consent_type,
            "version": body.version,
        },
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()
    await db.refresh(record)

    return ConsentResponse(
        id=str(record.id),
        consent_type=record.consent_type,
        version=record.version,
        accepted_at=record.created_at.isoformat(),
    )


# ── List Consents ────────────────────────────────────────────────────────


@router.get(
    "/consent",
    response_model=list[ConsentResponse],
    summary="List user's consent records",
)
@limiter.limit(LIMIT_GENERAL_API)
async def list_consents(
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> list[ConsentResponse]:
    """Return all consent records for the authenticated user.

    Records are ordered by most recent first.
    """
    result = await db.execute(
        select(ConsentRecord)
        .where(ConsentRecord.user_id == user.id)
        .order_by(ConsentRecord.created_at.desc())
    )
    rows = result.scalars().all()

    return [
        ConsentResponse(
            id=str(r.id),
            consent_type=r.consent_type,
            version=r.version,
            accepted_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


# ── Update Cookie Preferences ───────────────────────────────────────────


@router.post(
    "/cookies",
    response_model=CookiePreferencesResponse,
    summary="Update cookie preferences",
)
@limiter.limit(LIMIT_GENERAL_API)
async def update_cookie_preferences(
    request: Request,
    body: CookiePreferencesRequest,
    user: CurrentUser,
    db: DbSession,
) -> CookiePreferencesResponse:
    """Create or update the user's cookie preferences.

    Uses an upsert pattern — creates a new record if none exists,
    otherwise updates the existing one.
    """
    result = await db.execute(
        select(CookiePreference).where(CookiePreference.user_id == user.id)
    )
    pref = result.scalar_one_or_none()

    if pref is None:
        pref = CookiePreference(
            user_id=user.id,
            analytics_enabled=body.analytics,
        )
        db.add(pref)
    else:
        pref.analytics_enabled = body.analytics

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="cookie_preferences_updated",
        metadata={"analytics": body.analytics},
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()
    await db.refresh(pref)

    return CookiePreferencesResponse(
        essential=True,
        analytics=pref.analytics_enabled,
    )


# ── Get Cookie Preferences ──────────────────────────────────────────────


@router.get(
    "/cookies",
    response_model=CookiePreferencesResponse,
    summary="Get current cookie preferences",
)
@limiter.limit(LIMIT_GENERAL_API)
async def get_cookie_preferences(
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> CookiePreferencesResponse:
    """Return the user's current cookie preferences.

    Returns default (analytics=False) if no preferences have been set.
    """
    result = await db.execute(
        select(CookiePreference).where(CookiePreference.user_id == user.id)
    )
    pref = result.scalar_one_or_none()

    return CookiePreferencesResponse(
        essential=True,
        analytics=pref.analytics_enabled if pref else False,
    )


# ── GDPR Data Export ─────────────────────────────────────────────────────


@router.get(
    "/export-data",
    response_model=DataExportResponse,
    summary="Export all user data (GDPR right of access)",
)
@limiter.limit(LIMIT_DATA_EXPORT)
async def export_data(
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> DataExportResponse:
    """Export all data associated with the authenticated user.

    Returns user profile, consent records, payment history, active
    sessions, analysis metadata, and analysis count. Raw analysis
    data is NOT included because it is encrypted at rest.

    Rate-limited to 1 request per hour to prevent abuse.
    """
    # Fetch consent records (capped to prevent memory pressure for power users)
    consent_result = await db.execute(
        select(ConsentRecord)
        .where(ConsentRecord.user_id == user.id)
        .order_by(ConsentRecord.created_at.desc())
        .limit(MAX_EXPORT_ROWS)
    )
    consent_rows = consent_result.scalars().all()

    consents = [
        ConsentExportSchema(
            id=str(c.id),
            consent_type=c.consent_type,
            version=c.version,
            accepted_at=c.created_at.isoformat(),
            ip_address=c.ip_address,
            user_agent=c.user_agent,
        )
        for c in consent_rows
    ]

    # Fetch payments — use explicit column select to avoid lazy-load issues
    # with the relationship back to User (lazy="raise" on Payment.user).
    # Capped to prevent memory pressure for power users.
    payment_result = await db.execute(
        select(Payment)
        .where(Payment.user_id == user.id)
        .order_by(Payment.created_at.desc())
        .limit(MAX_EXPORT_ROWS)
    )
    payment_rows = payment_result.scalars().all()

    payments = [
        PaymentExportSchema(
            id=str(p.id),
            amount=p.amount,
            currency=p.currency,
            status=p.status,
            created_at=p.created_at.isoformat(),
        )
        for p in payment_rows
    ]

    # Fetch cookie preferences
    cookie_result = await db.execute(
        select(CookiePreference).where(CookiePreference.user_id == user.id)
    )
    cookie_pref = cookie_result.scalar_one_or_none()

    cookie_preferences = (
        CookiePreferencesExportSchema(
            essential=True,
            analytics=cookie_pref.analytics_enabled,
            updated_at=cookie_pref.updated_at.isoformat(),
        )
        if cookie_pref
        else None
    )

    # Fetch active sessions (exclude sensitive refresh_token_hash)
    # Capped to prevent memory pressure for power users.
    session_result = await db.execute(
        select(Session)
        .where(Session.user_id == user.id)
        .order_by(Session.created_at.desc())
        .limit(MAX_EXPORT_ROWS)
    )
    session_rows = session_result.scalars().all()

    sessions = [
        SessionExportSchema(
            id=str(s.id),
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            created_at=s.created_at.isoformat(),
            expires_at=s.expires_at.isoformat(),
        )
        for s in session_rows
    ]

    # Fetch analysis results metadata (exclude encrypted result_data)
    # Capped to prevent memory pressure for power users.
    analysis_meta_result = await db.execute(
        select(AnalysisResult)
        .where(AnalysisResult.user_id == user.id)
        .order_by(AnalysisResult.created_at.desc())
        .limit(MAX_EXPORT_ROWS)
    )
    analysis_rows = analysis_meta_result.scalars().all()

    analyses = [
        AnalysisExportSchema(
            id=str(a.id),
            label=a.label,
            created_at=a.created_at.isoformat(),
            updated_at=a.updated_at.isoformat(),
        )
        for a in analysis_rows
    ]

    # Count analyses from the rows already fetched
    analysis_count = len(analysis_rows)

    # Audit trail — log that a data export was performed (bulk PII retrieval)
    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="data_exported",
        metadata={"analysis_count": analysis_count},
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    return DataExportResponse(
        user_id=str(user.id),
        email=user.email,
        name=user.name,
        tier=user.tier,
        created_at=user.created_at.isoformat(),
        consents=consents,
        payments=payments,
        cookie_preferences=cookie_preferences,
        sessions=sessions,
        analyses=analyses,
        analysis_count=analysis_count,
        exported_at=datetime.now(UTC).isoformat(),
    )
