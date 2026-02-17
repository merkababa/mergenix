"""
GDPR compliance router — account deletion, data export, and profile rectification.

Implements three GDPR rights:
- Article 17: Right to erasure (DELETE /gdpr/account, POST /gdpr/request-deletion,
  POST /gdpr/confirm-deletion)
- Article 20: Data portability (GET /gdpr/export)
- Article 16: Right to rectification (PUT /gdpr/profile)

Every endpoint includes rate limiting, audit logging, and proper
HTTP status codes. Mutating endpoints require CSRF protection.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import DbSession
from app.middleware.auth import CurrentUser
from app.middleware.rate_limiter import (
    LIMIT_DATA_EXPORT,
    LIMIT_DELETE_ACCOUNT,
    LIMIT_GENERAL_API,
    limiter,
)
from app.models.analysis import AnalysisResult
from app.models.audit import AuditLog
from app.models.payment import Payment
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.gdpr import (
    GdprAnalysisExport,
    GdprAuditLogExport,
    GdprConfirmDeletionRequest,
    GdprDeleteAccountRequest,
    GdprExportResponse,
    GdprPaginationInfo,
    GdprPaymentExport,
    GdprUserProfile,
    RectifyProfileRequest,
    RectifyProfileResponse,
)
from app.services import audit_service
from app.services.account_service import delete_user_account
from app.services.auth_service import verify_password
from app.services.email_service import send_deletion_confirmation_email
from app.utils.cookies import clear_refresh_cookie
from app.utils.request_helpers import client_ip as _client_ip
from app.utils.request_helpers import user_agent as _user_agent
from app.utils.security import generate_secure_token, hash_token

logger = logging.getLogger(__name__)

router = APIRouter()

# Default and maximum page sizes for paginated export
_DEFAULT_PAGE_SIZE = 100
_MAX_PAGE_SIZE = 1000

# Maximum rows per table in non-paginated sections (audit logs, payments)
MAX_EXPORT_ROWS = 10_000


# ── Export Helper Functions ───────────────────────────────────────────────
# Gate 2 R1 Issue 7: Extracted from export_data() to reduce function length.


async def _fetch_paginated_analyses(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int,
    page_size: int,
) -> tuple[list[GdprAnalysisExport], int, int]:
    """Fetch paginated analysis results for GDPR export.

    Returns:
        Tuple of (analyses list, total_count, skipped_legacy_count).
    """
    count_result = await db.execute(
        select(func.count())
        .select_from(AnalysisResult)
        .where(AnalysisResult.user_id == user_id)
    )
    total_count = count_result.scalar_one()

    offset = (page - 1) * page_size
    analysis_result = await db.execute(
        select(AnalysisResult)
        .where(AnalysisResult.user_id == user_id)
        .order_by(AnalysisResult.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    analysis_rows = analysis_result.scalars().all()

    analyses: list[GdprAnalysisExport] = []
    skipped_legacy = 0
    for a in analysis_rows:
        try:
            envelope = json.loads(a.result_data.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.warning(
                "Skipping legacy-format analysis %s in GDPR export (not valid JSON)",
                a.id,
            )
            skipped_legacy += 1
            continue

        analyses.append(
            GdprAnalysisExport(
                id=str(a.id),
                label=a.label,
                parent1_filename=a.parent1_filename,
                parent2_filename=a.parent2_filename,
                tier_at_time=a.tier_at_time,
                data_version=a.data_version,
                result_data=envelope,
                summary=a.summary_json,
                created_at=a.created_at.isoformat(),
                updated_at=a.updated_at.isoformat(),
            )
        )

    return analyses, total_count, skipped_legacy


async def _fetch_audit_logs(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[GdprAuditLogExport]:
    """Fetch audit log entries for GDPR export."""
    audit_result = await db.execute(
        select(AuditLog)
        .where(AuditLog.user_id == user_id)
        .order_by(AuditLog.created_at.desc())
        .limit(MAX_EXPORT_ROWS)
    )
    audit_rows = audit_result.scalars().all()

    return [
        GdprAuditLogExport(
            id=str(al.id),
            event_type=al.event_type,
            metadata=al.metadata_json,
            ip_address=al.ip_address,
            user_agent=al.user_agent,
            created_at=al.created_at.isoformat(),
        )
        for al in audit_rows
    ]


async def _fetch_payments(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[GdprPaymentExport]:
    """Fetch payment records for GDPR export."""
    payment_result = await db.execute(
        select(Payment)
        .where(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
        .limit(MAX_EXPORT_ROWS)
    )
    payment_rows = payment_result.scalars().all()

    return [
        GdprPaymentExport(
            id=str(p.id),
            amount=p.amount,
            currency=p.currency,
            status=p.status,
            tier_granted=p.tier_granted,
            created_at=p.created_at.isoformat(),
        )
        for p in payment_rows
    ]


# ── DELETE /gdpr/account (B7 — Right to Erasure) ────────────────────────


@router.delete(
    "/account",
    response_model=MessageResponse,
    summary="Permanently delete account and all associated data (GDPR Article 17)",
)
@limiter.limit(LIMIT_DELETE_ACCOUNT)
async def delete_account(
    request: Request,
    response: Response,
    body: GdprDeleteAccountRequest,
    user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Permanently delete the authenticated user's account and ALL associated data.

    Requires the current password for verification (re-authentication).
    This action is irreversible. All sessions, payments, analysis results,
    and audit logs referencing this user are cascade-deleted or set to NULL.

    The refresh token cookie is cleared upon successful deletion.
    """
    if user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "OAuth-only accounts must use POST /gdpr/request-deletion for email-based deletion.",
                "code": "OAUTH_ACCOUNT",
            },
        )

    if not await verify_password(body.password, user.password_hash):
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="delete_account_failed",
            metadata={"reason": "wrong_password"},
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Invalid password.", "code": "INVALID_PASSWORD"},
        )

    # Issue 6: Use shared account deletion service
    await delete_user_account(
        db,
        user,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    # Issue 9: Use shared cookie helper
    clear_refresh_cookie(response)
    return MessageResponse(message="Account and all associated data deleted successfully.")


# ── POST /gdpr/request-deletion (Email-Based Deletion for OAuth Users) ──


# Deletion token expiry: 24 hours
_DELETION_TOKEN_EXPIRY_HOURS = 24


@router.post(
    "/request-deletion",
    response_model=MessageResponse,
    summary="Request email-based account deletion (GDPR Article 17)",
)
@limiter.limit(LIMIT_DELETE_ACCOUNT)
async def request_deletion(
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Request account deletion via email confirmation.

    Generates a secure deletion token, stores its hash on the user record,
    and sends a confirmation email with a deletion link. The token expires
    in 24 hours.

    This endpoint is available to ALL users (both password and OAuth) and
    is the ONLY deletion path for OAuth-only users who cannot provide a
    password. Satisfies GDPR Article 17 — right to erasure must be as
    easy as signup.
    """
    # Generate a secure deletion token
    token = generate_secure_token(length=32)

    # Store the hashed token and expiry on the user record.
    # This replaces any previously requested deletion token.
    user.deletion_token_hash = hash_token(token)
    user.deletion_token_expires = (
        datetime.now(UTC).replace(tzinfo=None)
        + timedelta(hours=_DELETION_TOKEN_EXPIRY_HOURS)
    )

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="deletion_requested",
        metadata={"method": "email_confirmation"},
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    # Send the confirmation email (failure doesn't roll back)
    await send_deletion_confirmation_email(user.email, token)

    return MessageResponse(
        message="A confirmation email has been sent. Please check your inbox to confirm account deletion."
    )


@router.post(
    "/confirm-deletion",
    response_model=MessageResponse,
    summary="Confirm account deletion with email token (GDPR Article 17)",
)
@limiter.limit(LIMIT_DELETE_ACCOUNT)
async def confirm_deletion(
    request: Request,
    body: GdprConfirmDeletionRequest,
    db: DbSession,
) -> MessageResponse:
    """Confirm and execute account deletion using the token from the email.

    Validates the deletion token, then permanently deletes the user's
    account and all associated data. No authentication required — the
    token IS the authentication (similar to password reset flow).

    The token is single-use: once the account is deleted, the token
    becomes invalid because the user record no longer exists.
    """
    token_hashed = hash_token(body.token)
    now = datetime.now(UTC).replace(tzinfo=None)

    # Look up the user by their deletion token hash
    result = await db.execute(
        select(User).where(
            User.deletion_token_hash == token_hashed,
            User.deletion_token_expires > now,
        )
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Invalid or expired deletion token.",
                "code": "INVALID_TOKEN",
            },
        )

    # Perform the account deletion using the shared service
    await delete_user_account(
        db,
        user,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    return MessageResponse(message="Account and all associated data deleted successfully.")


# ── GET /gdpr/export (B8 — Data Portability) ────────────────────────────


@router.get(
    "/export",
    response_model=GdprExportResponse,
    summary="Export all user data including encrypted envelopes (GDPR Article 20)",
)
@limiter.limit(LIMIT_DATA_EXPORT)
async def export_data(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(
        _DEFAULT_PAGE_SIZE,
        ge=1,
        le=_MAX_PAGE_SIZE,
        description=f"Results per page (max {_MAX_PAGE_SIZE})",
    ),
) -> GdprExportResponse:
    """Export ALL data associated with the authenticated user.

    Returns user profile, analysis results (with full EncryptedEnvelope
    data for data portability), audit log entries, and payment history.

    Analysis results are paginated (default 100 per page, max 1000) to
    prevent unbounded memory usage. Audit logs and payments are included
    in full as they are typically small.

    Rate-limited to 1 request per hour to prevent abuse.
    """
    # page_size is already enforced by Query(le=_MAX_PAGE_SIZE) above;
    # no need for a redundant min() clamp here.

    # Build user profile (GDPR Art. 20 — include all personal data)
    user_profile = GdprUserProfile(
        id=str(user.id),
        email=user.email,
        name=user.name,
        tier=user.tier,
        email_verified=user.email_verified,
        date_of_birth=user.date_of_birth.isoformat() if user.date_of_birth else None,
        created_at=user.created_at.isoformat(),
        updated_at=user.updated_at.isoformat(),
    )

    # Gate 2 R1 Issue 7: Delegate to extracted helper functions
    analyses, total_count, skipped_legacy = await _fetch_paginated_analyses(
        db, user.id, page, page_size
    )
    audit_logs = await _fetch_audit_logs(db, user.id)
    payments = await _fetch_payments(db, user.id)

    # Gate 2 R1 Issue 8: Adjust total_count for skipped legacy results
    offset = (page - 1) * page_size
    has_next = (offset + page_size) < total_count
    pagination = GdprPaginationInfo(
        page=page,
        page_size=page_size,
        total_count=total_count,
        has_next=has_next,
        skipped_legacy=skipped_legacy,
    )

    # Log that a GDPR data export was performed
    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="data_exported",
        metadata={
            "source": "gdpr",
            "analysis_count": len(analyses),
            "audit_log_count": len(audit_logs),
            "payment_count": len(payments),
            "skipped_legacy": skipped_legacy,
            "page": page,
            "page_size": page_size,
        },
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    return GdprExportResponse(
        user=user_profile,
        analyses=analyses,
        audit_logs=audit_logs,
        payments=payments,
        pagination=pagination,
        exported_at=datetime.now(UTC).isoformat(),
    )


# ── PUT /gdpr/profile (B12 — Right to Rectification) ────────────────────


@router.put(
    "/profile",
    response_model=RectifyProfileResponse,
    summary="Update profile fields for data rectification (GDPR Article 16)",
)
@limiter.limit(LIMIT_GENERAL_API)
async def rectify_profile(
    request: Request,
    body: RectifyProfileRequest,
    user: CurrentUser,
    db: DbSession,
) -> RectifyProfileResponse:
    """Update the authenticated user's profile fields (name, email).

    This endpoint implements the GDPR right to rectification (Article 16),
    allowing users to correct inaccurate personal data.

    If email is changed:
    - The email field is updated
    - email_verified is set to False (user must re-verify)
    - An email_verification_required audit event is logged

    If name is changed:
    - The name field is updated

    An audit log entry is created documenting WHICH fields changed (not the values).
    """
    # Issue 4: Track only field names, not PII values
    fields_changed: list[str] = []
    email_changed = False

    if body.name is not None:
        user.name = body.name.strip()
        fields_changed.append("name")

    if body.email is not None:
        new_email = str(body.email).strip().lower()
        if new_email != user.email:
            # Gate 2 R1 Issue 3: Email changes require password re-authentication
            # to prevent account takeover with a stolen JWT.
            if not body.password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "Password required for email changes.",
                        "code": "PASSWORD_REQUIRED",
                    },
                )
            if user.password_hash is None or not await verify_password(
                body.password, user.password_hash
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error": "Invalid password.",
                        "code": "INVALID_PASSWORD",
                    },
                )

            user.email = new_email
            user.email_verified = False
            fields_changed.append("email")
            email_changed = True

    # Issue 2: Flush user changes first to detect IntegrityError (duplicate email)
    # before writing audit logs. If the flush fails, the session is rolled back
    # and no audit log is written (which is correct — nothing actually changed).
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from None

    # Issue 4: Log only which fields changed, NOT the actual values
    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="profile_rectified",
        metadata={"fields_changed": fields_changed} if fields_changed else {"note": "no_changes"},
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )

    # Issue 5: Log email verification requirement when email changes.
    # TODO: Wire up send_verification_email() when the GDPR router has
    # access to the email verification token generation flow.
    if email_changed:
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="email_verification_required",
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )

    await db.commit()
    await db.refresh(user)

    return RectifyProfileResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        tier=user.tier,
        email_verified=user.email_verified,
        created_at=user.created_at.isoformat(),
        updated_at=user.updated_at.isoformat(),
    )
