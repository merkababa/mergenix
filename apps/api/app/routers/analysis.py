"""
Analysis router — save, list, load, and delete encrypted analysis results.

Results are encrypted at rest using AES-256-GCM with a per-user key
derived from the application secret. Tier gating limits how many
results each user can save: Free=1, Premium=10, Pro=unlimited.
"""

from __future__ import annotations

import sys
import uuid

import structlog
from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import defer

from app.config import get_settings
from app.database import DbSession
from app.encryption import decrypt_result, encrypt_result
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

router = APIRouter()
settings = get_settings()

# ── Tier Limits ──────────────────────────────────────────────────────────

# Sentinel value representing an unlimited tier limit (pro tier).
# Uses sys.maxsize so tier-limit comparisons remain integer-based.
UNLIMITED_TIER_LIMIT: int = sys.maxsize

TIER_RESULT_LIMITS: dict[str, int] = {
    "free": 1,
    "premium": 10,
    "pro": UNLIMITED_TIER_LIMIT,
}


# ── Save Result ──────────────────────────────────────────────────────────
#
# ZKE Migration Note (Sprint 1 → Phase 2):
#   Currently this endpoint accepts plaintext result_data and encrypts it
#   server-side (SSE) using AES-256-GCM via app.encryption.encrypt_result().
#   In Phase 2, the client will perform encryption locally and submit an
#   EncryptedEnvelope (defined in app/schemas/encryption.py) so that the
#   server never sees plaintext genetic data — achieving true Zero-Knowledge
#   Encryption (ZKE).  The encryption schema is already defined but is not
#   yet wired into this endpoint.  This is intentional: Sprint 1 lays the
#   cryptographic foundation; Phase 2 connects the client-side envelope.


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
) -> SaveAnalysisResponse:
    """Save an encrypted analysis result.

    Tier gating: Free users can save 1 result, Premium up to 10,
    Pro unlimited. The full result_data is encrypted at rest;
    only the summary is stored as plaintext for listing.

    Note: Request body size limiting is handled at the reverse proxy
    (nginx) level in production. Pydantic field-level validation
    constrains individual field sizes.
    """
    # Encrypt the result data BEFORE acquiring the database lock.
    # Encryption is CPU-bound (runs in asyncio.to_thread) and depends
    # only on the request body and config — not DB state. Moving it
    # here avoids holding the DB connection open during crypto ops.
    user_id_str = str(user.id)
    ciphertext, nonce = await encrypt_result(
        body.result_data, user_id_str, settings.encryption_secret
    )

    # Lock the User row to serialize save operations for this user.
    # SELECT ... FOR UPDATE on the user row guarantees mutual exclusion
    # even when the AnalysisResult count is 0 (where FOR UPDATE on the
    # count query would lock nothing).
    await db.execute(
        select(User).where(User.id == user.id).with_for_update()
    )

    # Check tier limit — the user-row lock above prevents TOCTOU race
    # conditions where concurrent requests could bypass the limit.
    limit = TIER_RESULT_LIMITS.get(user.tier, 1)
    count_result = await db.execute(
        select(func.count())
        .select_from(AnalysisResult)
        .where(AnalysisResult.user_id == user.id)
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
        result_data=ciphertext,
        result_nonce=nonce,
        tier_at_time=user.tier,
        summary_json=body.summary,
        data_version=body.data_version,
    )
    db.add(analysis)

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="analysis_saved",
        metadata={
            "analysis_id": str(analysis_id),
            "consent_given": body.consent_given,
        },
    )
    await db.commit()
    await db.refresh(analysis)

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

    Only returns summaries and metadata — does NOT decrypt result_data.
    Ordered by most recently created first.
    """
    result = await db.execute(
        select(AnalysisResult)
        .options(
            defer(AnalysisResult.result_data),
            defer(AnalysisResult.result_nonce),
        )
        .where(AnalysisResult.user_id == user.id)
        .order_by(AnalysisResult.created_at.desc(), AnalysisResult.id.desc())
    )
    rows = result.scalars().all()

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
    summary="Load a specific analysis result (full decrypted data)",
)
@limiter.limit(LIMIT_GENERAL_API)
async def get_result(
    request: Request,
    result_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> AnalysisDetailResponse:
    """Load and decrypt a specific analysis result.

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

    # Decrypt the result data — handle corrupted/tampered ciphertext
    try:
        decrypted = await decrypt_result(
            analysis.result_data,
            analysis.result_nonce,
            str(user.id),
            settings.encryption_secret,
        )
    except Exception:
        log = structlog.get_logger()
        log.error(
            "decryption_failed",
            analysis_id=str(result_id),
            user_id=str(user.id),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Failed to decrypt analysis result. The data may be corrupted.",
                "code": "DECRYPTION_FAILED",
            },
        ) from None

    return AnalysisDetailResponse(
        id=analysis.id,
        label=analysis.label,
        parent1_filename=analysis.parent1_filename,
        parent2_filename=analysis.parent2_filename,
        tier_at_time=analysis.tier_at_time,
        data_version=analysis.data_version,
        result_data=decrypted,
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

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="analysis_deleted",
        metadata={"analysis_id": str(analysis.id)},
    )

    await db.delete(analysis)
    await db.commit()

    return MessageResponse(message="Analysis result deleted successfully.")
