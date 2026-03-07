"""
Analysis router — save, list, load, and delete ZKE-encrypted analysis results.

Results are stored as opaque EncryptedEnvelope blobs — the server never
decrypts them.  Only plaintext metadata (label, filenames, summary stats)
is accessible server-side.  Tier gating limits how many results each user
can save: Free=1, Premium=10, Pro=unlimited.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import defer

from app.constants.tiers import TIER_RESULT_LIMITS
from app.database import DbSession
from app.middleware.auth import CurrentUser
from app.middleware.rate_limiter import LIMIT_GENERAL_API, limiter
from app.models.analysis import AnalysisResult
from app.models.user import User
from app.schemas.analysis import (
    AnalysisDetailResponse,
    AnalysisListItem,
    SaveAnalysisRequest,
    SaveAnalysisResponse,
)
from app.schemas.auth import MessageResponse
from app.services import audit_service
from app.services.email_service import send_partner_notification_email
from app.utils.masking import mask_email

logger = logging.getLogger(__name__)

router = APIRouter()


async def _safe_send_partner_notification(to_email: str, analyzer_name: str, analysis_date: datetime) -> None:
    """Send a partner notification email, swallowing any exceptions.

    This is a module-level async function (not a closure) used as a
    BackgroundTasks callback. It accepts all required parameters
    explicitly rather than closing over route handler locals.

    Exceptions are caught and logged so a failed email never crashes
    the background task runner.
    """
    try:
        await send_partner_notification_email(
            to_email=to_email,
            analyzer_name=analyzer_name,
            analysis_date=analysis_date,
        )
    except Exception:
        logger.exception("Partner notification email failed (to=%s)", mask_email(to_email))


# ── Save Result ──────────────────────────────────────────────────────────


@router.post(
    "/results",
    response_model=SaveAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a new analysis result",
)
@limiter.limit(LIMIT_GENERAL_API)
async def save_result(
    request: Request,
    body: SaveAnalysisRequest,
    user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
) -> SaveAnalysisResponse:
    """Save a client-encrypted analysis result (ZKE envelope).

    The EncryptedEnvelope in ``result_data`` is stored as an opaque JSON
    blob — the server never decrypts it.

    Tier gating: Free users can save 1 result, Premium up to 10,
    Pro unlimited.  Only the summary is stored as plaintext for listing.

    Note: Request body size limiting is handled at the reverse proxy
    (nginx) level in production. Pydantic field-level validation
    constrains individual field sizes.
    """
    # ── Age gate: block users who have not verified their date of birth ──
    # OAuth-registered users may not have date_of_birth set until they
    # call POST /auth/verify-age.  This check ensures GDPR Art. 8
    # compliance (18+ requirement) before any analysis data is stored.
    if user.date_of_birth is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": (
                    "Age verification is required before saving analysis results. "
                    "Please submit your date of birth via POST /auth/verify-age."
                ),
                "code": "AGE_VERIFICATION_REQUIRED",
            },
        )

    # Serialize the EncryptedEnvelope to JSON bytes for LargeBinary storage.
    envelope_bytes = json.dumps(body.result_data.model_dump(), separators=(",", ":")).encode("utf-8")

    # Lock the User row to serialize save operations for this user.
    # SELECT ... FOR UPDATE on the user row guarantees mutual exclusion
    # even when the AnalysisResult count is 0 (where FOR UPDATE on the
    # count query would lock nothing).
    await db.execute(select(User).where(User.id == user.id).with_for_update())

    # Check tier limit — the user-row lock above prevents TOCTOU race
    # conditions where concurrent requests could bypass the limit.
    limit = TIER_RESULT_LIMITS.get(user.tier, 1)
    count_result = await db.execute(
        select(func.count()).select_from(AnalysisResult).where(AnalysisResult.user_id == user.id)
    )
    current_count = count_result.scalar_one()

    if current_count >= limit:
        tier_name = user.tier.capitalize()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": (
                    f"{tier_name} tier allows up to {limit} saved "
                    f"{'analysis' if limit == 1 else 'analyses'}. "
                    "Upgrade your tier to save more."
                ),
                "code": "TIER_LIMIT_REACHED",
            },
        )

    # Create and persist the record — generate ID explicitly so it's
    # available for the audit log entry before flush/commit.
    analysis_id = uuid.uuid4()
    analysis = AnalysisResult(
        id=analysis_id,
        user_id=user.id,
        label=body.label.strip(),
        parent1_filename=body.parent1_filename.strip(),
        parent2_filename=body.parent2_filename.strip(),
        result_data=envelope_bytes,
        tier_at_time=user.tier,
        summary_json=body.summary,
        data_version=body.data_version,
    )
    db.add(analysis)

    try:
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="result_saved",
            metadata={"result_id": str(analysis_id)},
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except Exception:
        logger.exception("Audit log failed for result_saved (user_id=%s)", user.id)
    await db.commit()
    await db.refresh(analysis)

    # ── Partner Notification (fire-and-forget via BackgroundTasks) ────────
    # If a partner email is provided, send an informational notification.
    # This must NOT block the save response and must NOT fail the save
    # even if the email send raises an exception.
    if body.partner_email:
        background_tasks.add_task(
            _safe_send_partner_notification,
            to_email=body.partner_email,
            analyzer_name=user.name,
            analysis_date=analysis.created_at,
        )

        # Audit log: record that a partner was notified.
        # PII minimization: log only the email domain, never the full address.
        partner_domain = body.partner_email.split("@", 1)[1]
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="partner_notified",
            metadata={
                "analysis_id": str(analysis_id),
                "partner_email_domain": partner_domain,
            },
        )
        await db.commit()

    return SaveAnalysisResponse(
        id=analysis.id,
        label=analysis.label,
        created_at=analysis.created_at,
    )


# ── List Results ─────────────────────────────────────────────────────────


@router.get(
    "/results",
    response_model=list[AnalysisListItem],
    summary="List saved analysis results (summaries only)",
)
@limiter.limit(LIMIT_GENERAL_API)
async def list_results(
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> list[AnalysisListItem]:
    """Return all saved analysis results for the current user.

    Only returns summaries and metadata — does NOT include the encrypted
    envelope.  Ordered by most recently created first.
    """
    result = await db.execute(
        select(AnalysisResult)
        .options(
            defer(AnalysisResult.result_data),
        )
        .where(AnalysisResult.user_id == user.id)
        .order_by(AnalysisResult.created_at.desc(), AnalysisResult.id.desc())
    )
    rows = result.scalars().all()

    # Audit: log the list access with count (GDPR accountability).
    try:
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="result_listed",
            metadata={"count": len(rows)},
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except Exception:
        logger.exception("Audit log failed for result_listed (user_id=%s)", user.id)
    await db.commit()

    return [
        AnalysisListItem(
            id=r.id,
            label=r.label,
            parent1_filename=r.parent1_filename,
            parent2_filename=r.parent2_filename,
            tier_at_time=r.tier_at_time,
            data_version=r.data_version,
            summary=r.summary_json,
            created_at=r.created_at,
        )
        for r in rows
    ]


# ── Get Result ───────────────────────────────────────────────────────────


@router.get(
    "/results/{result_id}",
    response_model=AnalysisDetailResponse,
    summary="Load a specific analysis result (opaque encrypted envelope)",
)
@limiter.limit(LIMIT_GENERAL_API)
async def get_result(
    request: Request,
    result_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> AnalysisDetailResponse:
    """Load a specific analysis result and return the opaque envelope.

    The result must belong to the requesting user.  The server returns the
    stored EncryptedEnvelope as-is — the client decrypts it locally.
    """
    result = await db.execute(
        select(AnalysisResult).where(
            AnalysisResult.id == result_id,
            AnalysisResult.user_id == user.id,
        )
    )
    analysis = result.scalar_one_or_none()

    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Analysis result not found.",
                "code": "RESULT_NOT_FOUND",
            },
        )

    # Audit: log the view access (GDPR accountability).
    try:
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="result_viewed",
            metadata={"result_id": str(analysis.id)},
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except Exception:
        logger.exception("Audit log failed for result_viewed (user_id=%s)", user.id)
    await db.commit()

    # Deserialize the opaque envelope from JSON bytes.
    # DI-7: Use data_version to distinguish legacy pre-ZKE records from
    # corrupt data. Records without data_version predate the ZKE pivot.
    try:
        envelope = json.loads(analysis.result_data.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        if analysis.data_version is None:
            # Pre-ZKE legacy record — stored raw encrypted bytes, not a
            # JSON EncryptedEnvelope. User must re-run the analysis.
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": (
                        "Legacy result format (no data_version) — "
                        "this result predates the current encryption "
                        "scheme. Please re-analyze to generate a new result."
                    ),
                    "code": "LEGACY_FORMAT",
                },
            ) from None
        else:
            # Has data_version but data is not valid JSON — this is
            # unexpected corruption, not a legacy format issue.
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": (
                        "Result data is corrupt and cannot be decoded. "
                        f"Data version: {analysis.data_version}. "
                        "Please re-analyze to generate a new result."
                    ),
                    "code": "CORRUPT_DATA",
                },
            ) from None

    return AnalysisDetailResponse(
        id=analysis.id,
        label=analysis.label,
        parent1_filename=analysis.parent1_filename,
        parent2_filename=analysis.parent2_filename,
        tier_at_time=analysis.tier_at_time,
        data_version=analysis.data_version,
        result_data=envelope,
        summary=analysis.summary_json,
        created_at=analysis.created_at,
    )


# ── Delete Result ────────────────────────────────────────────────────────


@router.delete(
    "/results/{result_id}",
    response_model=MessageResponse,
    summary="Delete a saved analysis result",
)
@limiter.limit(LIMIT_GENERAL_API)
async def delete_result(
    request: Request,
    result_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Delete a specific analysis result.

    The result must belong to the requesting user.
    """
    result = await db.execute(
        select(AnalysisResult).where(
            AnalysisResult.id == result_id,
            AnalysisResult.user_id == user.id,
        )
    )
    analysis = result.scalar_one_or_none()

    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Analysis result not found.",
                "code": "RESULT_NOT_FOUND",
            },
        )

    try:
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="result_deleted",
            metadata={"result_id": str(analysis.id)},
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except Exception:
        logger.exception("Audit log failed for result_deleted (user_id=%s)", user.id)

    await db.delete(analysis)
    await db.commit()

    return MessageResponse(message="Analysis result deleted successfully.")
