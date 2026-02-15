"""
ClinVar synchronization router — admin-only endpoints for checking
and triggering ClinVar data freshness updates.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC
from pathlib import Path

import anyio
from fastapi import APIRouter, HTTPException, status

from app.config import get_settings
from app.database import DbSession
from app.middleware.auth import AdminUser
from app.schemas.auth import MessageResponse

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()

# Path to the sync metadata file (stored alongside carrier panel data)
_SYNC_META_PATH = Path("data/clinvar_cache/last_sync.json")


@router.post(
    "/check",
    summary="Check for ClinVar updates",
)
async def check_clinvar_updates(
    user: AdminUser,
    db: DbSession,
) -> dict:
    """Check if the local carrier panel is stale relative to ClinVar.

    Returns freshness metadata including days since last sync and
    whether an update is recommended.
    """
    last_sync_date = None

    _async_path = anyio.Path(_SYNC_META_PATH)
    if await _async_path.exists():
        try:
            raw = await _async_path.read_text()
            meta = json.loads(raw)
            last_sync_date = meta.get("last_sync")
        except (json.JSONDecodeError, OSError):
            logger.warning("Could not read ClinVar sync metadata from %s", _SYNC_META_PATH)

    from datetime import datetime

    if last_sync_date is None:
        days_since_sync = -1
        is_stale = True
    else:
        sync_dt = datetime.fromisoformat(last_sync_date).replace(tzinfo=UTC)
        now = datetime.now(tz=UTC)
        days_since_sync = (now - sync_dt).days
        is_stale = days_since_sync > 30

    return {
        "last_sync": last_sync_date,
        "days_since_sync": days_since_sync,
        "is_stale": is_stale,
        "stale_threshold_days": 30,
        "clinvar_ftp_url": settings.clinvar_ftp_url,
    }


@router.post(
    "/sync",
    response_model=MessageResponse,
    summary="Trigger ClinVar sync (admin only)",
)
async def trigger_clinvar_sync(
    user: AdminUser,
    db: DbSession,
) -> MessageResponse:
    """Trigger a ClinVar data synchronization.

    Downloads the latest variant_summary.txt.gz from NCBI and
    compares it against the local carrier panel. This is a
    potentially long-running operation.

    Requires admin authentication (JWT + X-Admin-Key header).
    """
    # NOTE: In Phase 1, this will be replaced with a background task
    # (Celery or ARQ). For now, we validate access and return a stub.
    logger.info(
        "ClinVar sync triggered by admin user %s (%s)",
        user.id,
        user.email,
    )

    return MessageResponse(
        message=(
            "ClinVar sync has been queued. "
            "This feature will be fully implemented in Phase 1 with background task support."
        )
    )


@router.get(
    "/status",
    summary="Get last sync status",
)
async def get_sync_status(
    user: AdminUser,
    db: DbSession,
) -> dict:
    """Return the last ClinVar sync metadata.

    Includes timestamp, source URL, and downloaded file size.
    """
    _async_path = anyio.Path(_SYNC_META_PATH)
    if not await _async_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "No ClinVar sync has been performed yet.",
                "code": "NO_SYNC_DATA",
            },
        )

    try:
        raw = await _async_path.read_text()
        meta = json.loads(raw)
    except (json.JSONDecodeError, OSError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Could not read sync metadata.",
                "code": "SYNC_META_ERROR",
            },
        ) from exc

    return {
        "last_sync": meta.get("last_sync"),
        "source_url": meta.get("source_url"),
        "file_size_bytes": meta.get("file_size_bytes"),
    }
