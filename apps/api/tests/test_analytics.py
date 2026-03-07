"""
Tests for the anonymous conversion analytics endpoints (B6).

TDD: These tests are written FIRST before implementation.
All tests verify behavior from the user's perspective.
"""

from __future__ import annotations

import datetime
from datetime import UTC

import pytest
from app.config import get_settings
from app.models.analytics import DailyEventCount
from httpx import AsyncClient
from sqlalchemy import inspect, select
from sqlalchemy.ext.asyncio import AsyncSession

# The test conftest sets ANALYTICS_API_KEY="test-analytics-key-for-testing"
ANALYTICS_KEY_HEADER = {"X-Analytics-Key": "test-analytics-key-for-testing"}

# ── POST /analytics/track ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_track_event_increments_counter(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """POST /analytics/track creates a new row with count=1 for a new event."""
    response = await client.post(
        "/analytics/track",
        json={"event_type": "page_view"},
    )
    assert response.status_code == 204

    # Verify the database row was created with count=1
    result = await db_session.execute(
        select(DailyEventCount).where(
            DailyEventCount.event_type == "page_view",
            DailyEventCount.event_date == datetime.datetime.now(UTC).date(),
        )
    )
    row = result.scalar_one()
    assert row.count == 1


@pytest.mark.asyncio
async def test_track_event_increments_existing_counter(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """POST /analytics/track twice increments the same row to count=2."""
    await client.post("/analytics/track", json={"event_type": "file_upload"})
    await client.post("/analytics/track", json={"event_type": "file_upload"})

    result = await db_session.execute(
        select(DailyEventCount).where(
            DailyEventCount.event_type == "file_upload",
            DailyEventCount.event_date == datetime.datetime.now(UTC).date(),
        )
    )
    row = result.scalar_one()
    assert row.count == 2


@pytest.mark.asyncio
async def test_track_event_invalid_type_rejected(
    client: AsyncClient,
) -> None:
    """POST /analytics/track with an unknown event_type returns 422."""
    response = await client.post(
        "/analytics/track",
        json={"event_type": "unknown_event"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_track_event_no_auth_required(
    client: AsyncClient,
) -> None:
    """POST /analytics/track succeeds without an Authorization header."""
    # The client fixture includes X-Requested-With but NOT Authorization
    response = await client.post(
        "/analytics/track",
        json={"event_type": "analysis_started"},
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_track_event_no_pii_stored(
    db_session: AsyncSession,
) -> None:
    """DailyEventCount model has NO user_id, ip_address, or session_id columns."""
    mapper = inspect(DailyEventCount)
    column_names = {col.key for col in mapper.columns}

    # These PII columns must NOT exist
    assert "user_id" not in column_names
    assert "ip_address" not in column_names
    assert "session_id" not in column_names
    assert "user_agent" not in column_names


# ── GET /analytics/summary ───────────────────────────────────────────────
# BLOCKER-1: Summary is now admin-only via X-Analytics-Key header.
# No longer uses require_tier("pro") — any pro customer could see
# global business intelligence. Now requires a secret API key.


@pytest.mark.asyncio
async def test_summary_requires_analytics_key(
    client: AsyncClient,
) -> None:
    """GET /analytics/summary without X-Analytics-Key returns 403."""
    response = await client.get(
        "/analytics/summary",
        params={"start_date": "2026-01-01", "end_date": "2026-01-31"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_summary_wrong_key_rejected(
    client: AsyncClient,
) -> None:
    """GET /analytics/summary with wrong X-Analytics-Key returns 403."""
    response = await client.get(
        "/analytics/summary",
        params={"start_date": "2026-01-01", "end_date": "2026-01-31"},
        headers={"X-Analytics-Key": "wrong-key-value"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_summary_disabled_when_key_unset(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /analytics/summary returns 503 when analytics_api_key is empty."""
    settings = get_settings()
    monkeypatch.setattr(settings, "analytics_api_key", "")
    response = await client.get(
        "/analytics/summary",
        params={"start_date": "2026-01-01", "end_date": "2026-01-31"},
        headers={"X-Analytics-Key": "anything"},
    )
    assert response.status_code == 503


@pytest.mark.asyncio
async def test_summary_returns_counts(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """GET /analytics/summary returns aggregated event counts with valid key."""
    # Seed some events
    today = datetime.datetime.now(UTC).date()
    db_session.add(DailyEventCount(event_type="page_view", event_date=today, count=10))
    db_session.add(DailyEventCount(event_type="file_upload", event_date=today, count=3))
    await db_session.commit()

    response = await client.get(
        "/analytics/summary",
        params={"start_date": str(today), "end_date": str(today)},
        headers=ANALYTICS_KEY_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["period_start"] == str(today)
    assert data["period_end"] == str(today)
    assert len(data["events"]) == 2

    # Verify event data
    events_by_type = {e["event_type"]: e for e in data["events"]}
    assert events_by_type["page_view"]["count"] == 10
    assert events_by_type["file_upload"]["count"] == 3


@pytest.mark.asyncio
async def test_summary_date_range_filter(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """GET /analytics/summary only returns events within the requested range."""
    jan_15 = datetime.date(2026, 1, 15)
    feb_10 = datetime.date(2026, 2, 10)
    mar_01 = datetime.date(2026, 3, 1)

    db_session.add(DailyEventCount(event_type="page_view", event_date=jan_15, count=5))
    db_session.add(DailyEventCount(event_type="page_view", event_date=feb_10, count=8))
    db_session.add(DailyEventCount(event_type="page_view", event_date=mar_01, count=12))
    await db_session.commit()

    # Request only February range
    response = await client.get(
        "/analytics/summary",
        params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
        headers=ANALYTICS_KEY_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["events"]) == 1
    assert data["events"][0]["count"] == 8
    assert data["events"][0]["event_date"] == "2026-02-10"


@pytest.mark.asyncio
async def test_summary_max_range_90_days(
    client: AsyncClient,
) -> None:
    """GET /analytics/summary rejects date ranges exceeding 90 days."""
    response = await client.get(
        "/analytics/summary",
        params={"start_date": "2026-01-01", "end_date": "2026-06-01"},
        headers=ANALYTICS_KEY_HEADER,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_summary_start_date_after_end_date_rejected(
    client: AsyncClient,
) -> None:
    """GET /analytics/summary rejects start_date > end_date with 422."""
    response = await client.get(
        "/analytics/summary",
        params={"start_date": "2026-03-15", "end_date": "2026-03-01"},
        headers=ANALYTICS_KEY_HEADER,
    )
    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["code"] == "INVALID_DATE_RANGE"


# ── Fix 3: Upsert uses ON CONFLICT, not try/except IntegrityError ──────


@pytest.mark.asyncio
async def test_track_event_upsert_uses_on_conflict(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """The analytics track_event endpoint should use ON CONFLICT for upsert.

    We verify this by checking that the analytics router does NOT use
    IntegrityError in the track_event handler. ON CONFLICT is a cleaner,
    single-statement approach that avoids rollback overhead.
    """
    import inspect

    from app.routers.analytics import track_event

    source = inspect.getsource(track_event)
    assert "IntegrityError" not in source, "track_event should use ON CONFLICT upsert, not try/except IntegrityError"


@pytest.mark.asyncio
async def test_track_all_valid_event_types(
    client: AsyncClient,
) -> None:
    """All seven known event types are accepted by POST /analytics/track."""
    valid_types = [
        "page_view",
        "signup_completed",
        "file_upload",
        "analysis_started",
        "preview_opened",
        "checkout_initiated",
        "checkout_completed",
    ]
    for event_type in valid_types:
        response = await client.post(
            "/analytics/track",
            json={"event_type": event_type},
        )
        assert response.status_code == 204, f"Event type '{event_type}' was rejected"
