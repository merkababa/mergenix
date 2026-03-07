"""
Anonymous conversion analytics router.

Provides three endpoints:
- POST /analytics/track — anonymous, fire-and-forget event counter
- GET /analytics/summary — admin-only aggregated analytics dashboard
  (secured via X-Analytics-Key header, not user-tier auth)
- POST /analytics/purge — admin-only data retention cleanup

Decision #138: Zero PII. No user_id, no IP, no session, no user_agent
stored in the analytics data.
"""

from __future__ import annotations

import datetime
import logging
from datetime import UTC
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import DbSession, engine
from app.middleware.rate_limiter import LIMIT_ANALYTICS_SUMMARY, LIMIT_TRACK_EVENT, limiter
from app.models.analytics import DailyEventCount
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    EventCountResponse,
    TrackEventRequest,
)
from app.utils.security import constant_time_compare

logger = logging.getLogger(__name__)

router = APIRouter()

# Maximum date range for the summary endpoint (days)
MAX_SUMMARY_RANGE_DAYS = 90

# Default retention period for analytics purge (days)
DEFAULT_RETENTION_DAYS = 365

# Detect the database dialect ONCE at module level from the engine, rather
# than sniffing db.bind.dialect.name on every request (F7).  The engine is
# already patched to the test engine by conftest before routers are imported.
_DB_DIALECT: str = engine.dialect.name


def _verify_analytics_key(request: Request) -> None:
    """Verify the X-Analytics-Key header against the configured secret.

    Raises:
        HTTPException 503: If analytics_api_key is not configured (endpoint disabled).
        HTTPException 403: If the key is missing or does not match.
    """
    settings = get_settings()
    if not settings.analytics_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "Analytics endpoint is not configured.",
                "code": "ANALYTICS_DISABLED",
            },
        )

    provided_key = request.headers.get("X-Analytics-Key", "")
    if not provided_key or not constant_time_compare(provided_key, settings.analytics_api_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "Invalid or missing analytics API key.",
                "code": "ANALYTICS_KEY_INVALID",
            },
        )


# ── POST /analytics/track ────────────────────────────────────────────────


@router.post(
    "/track",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Track an anonymous conversion event",
    response_class=Response,
)
@limiter.limit(LIMIT_TRACK_EVENT)
async def track_event(
    request: Request,
    body: TrackEventRequest,
    db: DbSession,
) -> Response:
    """Increment the daily counter for an anonymous event type.

    This endpoint requires NO authentication. It uses upsert semantics:
    if a row for (event_type, today) already exists, its count is
    atomically incremented by 1; otherwise a new row with count=1 is created.

    Race condition safety: Uses INSERT ... ON CONFLICT DO UPDATE to
    atomically upsert in a single statement. The UPDATE uses a
    database-side atomic increment (DailyEventCount.count + 1) instead
    of a Python-side read-modify-write to prevent lost updates.

    No PII is stored — no user_id, no IP address, no session, no user_agent.
    Rate-limited to 30 requests per minute per IP to prevent abuse.
    """
    today = datetime.datetime.now(UTC).date()

    # Use the dialect detected once at module level (_DB_DIALECT) to select
    # the correct dialect-specific INSERT ... ON CONFLICT variant.
    # Production uses PostgreSQL (asyncpg); tests use SQLite (aiosqlite).
    insert_fn = sqlite_insert if _DB_DIALECT == "sqlite" else pg_insert

    stmt = insert_fn(DailyEventCount).values(
        event_type=body.event_type,
        event_date=today,
        count=1,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["event_type", "event_date"],
        set_={"count": DailyEventCount.count + 1},
    )
    await db.execute(stmt)

    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── GET /analytics/summary ───────────────────────────────────────────────


@router.get(
    "/summary",
    response_model=AnalyticsSummaryResponse,
    summary="Get aggregated analytics for a date range (admin only)",
)
@limiter.limit(LIMIT_ANALYTICS_SUMMARY)
async def get_summary(
    request: Request,
    db: DbSession,
    start_date: datetime.date = Query(  # noqa: B008
        ...,
        description="Start of the date range (inclusive)",
    ),
    end_date: datetime.date = Query(  # noqa: B008
        ...,
        description="End of the date range (inclusive)",
    ),
) -> AnalyticsSummaryResponse:
    """Return aggregated event counts for a date range.

    Secured via X-Analytics-Key header (admin-only). This endpoint
    exposes global business intelligence and must NOT be accessible
    to regular customers regardless of subscription tier.

    The date range is limited to 90 days to prevent excessive queries.
    """
    # Verify admin access via API key
    _verify_analytics_key(request)

    # Validate date range
    delta = (end_date - start_date).days
    if delta < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "end_date must be >= start_date.",
                "code": "INVALID_DATE_RANGE",
            },
        )
    if delta > MAX_SUMMARY_RANGE_DAYS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": f"Date range cannot exceed {MAX_SUMMARY_RANGE_DAYS} days.",
                "code": "DATE_RANGE_TOO_LARGE",
            },
        )

    result = await db.execute(
        select(DailyEventCount)
        .where(
            DailyEventCount.event_date >= start_date,
            DailyEventCount.event_date <= end_date,
        )
        .order_by(DailyEventCount.event_date, DailyEventCount.event_type)
    )
    rows = result.scalars().all()

    events = [
        EventCountResponse(
            event_type=row.event_type,
            event_date=row.event_date,
            count=row.count,
        )
        for row in rows
    ]

    return AnalyticsSummaryResponse(
        events=events,
        period_start=start_date,
        period_end=end_date,
    )


# ── Analytics Data Purge ────────────────────────────────────────────────


async def purge_old_analytics(
    db: AsyncSession,
    retention_days: int = DEFAULT_RETENTION_DAYS,
) -> int:
    """Delete analytics records older than ``retention_days``.

    Args:
        db: Async database session.
        retention_days: Records older than this many days are deleted.
            Defaults to 365.

    Returns:
        Number of records deleted.
    """
    cutoff = datetime.datetime.now(UTC).date() - datetime.timedelta(days=retention_days)
    result = await db.execute(delete(DailyEventCount).where(DailyEventCount.event_date < cutoff))
    await db.commit()
    count: int = result.rowcount  # type: ignore[attr-defined]
    return count


@router.post(
    "/purge",
    summary="Purge old analytics records (admin only)",
)
@limiter.limit(LIMIT_ANALYTICS_SUMMARY)
async def purge_analytics_endpoint(
    request: Request,
    db: DbSession,
) -> dict[str, Any]:
    """Delete analytics records older than the retention period.

    Secured via X-Analytics-Key header (admin-only).  Returns the number
    of records deleted and the retention period used.

    The default retention period is 365 days.  Anonymous analytics data
    (zero PII) is retained for up to 24 months, then purged.
    """
    _verify_analytics_key(request)

    deleted = await purge_old_analytics(db, retention_days=DEFAULT_RETENTION_DAYS)
    return {
        "deleted_count": deleted,
        "retention_days": DEFAULT_RETENTION_DAYS,
    }
