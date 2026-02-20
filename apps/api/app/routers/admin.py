"""
Admin cron router — scheduled data retention enforcement.

Provides a single endpoint for triggering data retention purges from an
external cron scheduler (e.g., Vercel Cron, GitHub Actions, cron.io).

Security:
    The endpoint is secured by the X-Cron-Secret header which must match
    the CRON_SECRET environment variable. If CRON_SECRET is not configured,
    the endpoint returns 503 (disabled) to prevent silent no-ops.

Usage:
    POST /api/v1/admin/cron/retention
    X-Cron-Secret: <your-secret>

    # Dry run (preview counts without deleting):
    POST /api/v1/admin/cron/retention?dry_run=true
    X-Cron-Secret: <your-secret>

Response (202 Accepted):
    {
        "audit_logs_purged": 42,
        "inactive_users_purged": 3,
        "payments_purged": 7,
        "dry_run": false
    }
"""

from __future__ import annotations

import logging
import secrets

from fastapi import APIRouter, Header, HTTPException, Query, Request, status
from pydantic import BaseModel

from app.config import get_settings
from app.database import DbSession
from app.middleware.rate_limiter import LIMIT_CRON_RETENTION, limiter
from app.services.retention_service import RetentionService

logger = logging.getLogger(__name__)

router = APIRouter()


class RetentionPurgeSummary(BaseModel):
    audit_logs_purged: int
    inactive_users_purged: int
    payments_purged: int
    dry_run: bool


@router.post(
    "/admin/cron/retention",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=RetentionPurgeSummary,
    summary="Trigger data retention purge (cron-secured)",
    tags=["Admin"],
)
@limiter.limit(LIMIT_CRON_RETENTION)
async def run_retention_purge(
    request: Request,
    db: DbSession,
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
    dry_run: bool = Query(default=False, description="Preview counts without deleting"),
) -> RetentionPurgeSummary:
    """Trigger the data retention enforcement purge.

    Deletes data that has exceeded its retention period per GDPR Art 5(1)(e):
      - Audit log records (orphaned: 90d, security: 2yr, general: 1yr)
      - Inactive free-tier users (3+ years of inactivity)
      - Payment records older than 7 years

    This endpoint is intended to be called by a scheduled cron job on a
    daily or weekly basis.

    Security:
        Requires X-Cron-Secret header matching the CRON_SECRET env var.
        Returns 503 if CRON_SECRET is not configured.
        Returns 401 if the secret is missing or incorrect.

    Returns:
        202 Accepted with a JSON summary of purge counts.
    """
    settings = get_settings()

    # Guard: CRON_SECRET must be configured
    if not settings.cron_secret:
        logger.warning(
            "cron_retention_endpoint_disabled: CRON_SECRET is not configured"
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "Retention cron endpoint is not configured.",
                "code": "CRON_NOT_CONFIGURED",
            },
        )

    # Authenticate via constant-time comparison to prevent timing attacks
    if x_cron_secret is None or not secrets.compare_digest(x_cron_secret, settings.cron_secret):
        logger.warning(
            "cron_retention_unauthorized: invalid or missing X-Cron-Secret"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Unauthorized.",
                "code": "INVALID_CRON_SECRET",
            },
        )

    logger.info(
        "cron_retention_triggered: dry_run=%s", dry_run
    )

    svc = RetentionService()
    raw = await svc.run_all_purges(db, dry_run=dry_run)

    logger.info("cron_retention_complete: summary=%s", raw)

    return RetentionPurgeSummary(**raw)
