"""
Tests for audit log retention policy with TTL/purge mechanism.

GDPR Art 5(1)(e) requires storage limitation — audit logs must be purged
after their retention period expires.

TDD: These tests are written FIRST, before the implementation.
All tests should FAIL until the retention service is created.

Retention Policy:
- Security events (login, failed_login, password_change, 2fa_enable, 2fa_disable): 2 years
- General events (register, payment, tier_change, logout): 1 year
- Orphaned records (user_id=NULL, i.e. after user deletion): 90 days
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.models.audit import AuditLog
from app.models.user import User
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

# ── Helpers ──────────────────────────────────────────────────────────────


def _make_audit_log(
    *,
    user_id: uuid.UUID | None = None,
    event_type: str = "login",
    created_at: datetime | None = None,
) -> AuditLog:
    """Create an AuditLog instance (not yet committed).

    Manually sets created_at so we can test expiry logic.
    """
    entry = AuditLog(
        id=uuid.uuid4(),
        user_id=user_id,
        event_type=event_type,
        metadata_json={"test": True},
        ip_address="127.0.0.1",
        user_agent="pytest",
    )
    # Override created_at after construction (normally server-default)
    if created_at is not None:
        entry.created_at = created_at
    return entry


# ═══════════════════════════════════════════════════════════════════════════
# Retention Policy Constants
# ═══════════════════════════════════════════════════════════════════════════


class TestRetentionPolicyConstants:
    """Verify that retention policy constants are correctly defined."""

    def test_security_event_types_are_defined(self) -> None:
        """Security events should be explicitly listed."""
        from app.services.retention_service import SECURITY_EVENTS

        assert "login" in SECURITY_EVENTS
        assert "failed_login" in SECURITY_EVENTS
        assert "password_change" in SECURITY_EVENTS
        assert "2fa_enable" in SECURITY_EVENTS
        assert "2fa_disable" in SECURITY_EVENTS

    def test_security_retention_is_two_years(self) -> None:
        """Security events have a 2-year retention period."""
        from app.services.retention_service import SECURITY_RETENTION_DAYS

        assert SECURITY_RETENTION_DAYS == 730  # 2 * 365

    def test_general_retention_is_one_year(self) -> None:
        """General events have a 1-year retention period."""
        from app.services.retention_service import GENERAL_RETENTION_DAYS

        assert GENERAL_RETENTION_DAYS == 365

    def test_orphaned_retention_is_90_days(self) -> None:
        """Orphaned records (user_id=NULL) have a 90-day retention period."""
        from app.services.retention_service import ORPHANED_RETENTION_DAYS

        assert ORPHANED_RETENTION_DAYS == 90


# ═══════════════════════════════════════════════════════════════════════════
# purge_expired_audit_logs — Security Events (2 years)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_purge_deletes_expired_security_events(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """Security events older than 2 years should be purged."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)
    # Expired: 2 years + 1 day ago
    expired_login = _make_audit_log(
        user_id=test_user.id,
        event_type="login",
        created_at=now - timedelta(days=731),
    )
    # Not expired: 1 year ago (within 2-year window)
    recent_login = _make_audit_log(
        user_id=test_user.id,
        event_type="login",
        created_at=now - timedelta(days=365),
    )
    db_session.add_all([expired_login, recent_login])
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 1

    # Verify the expired one is gone
    result = await db_session.execute(
        select(AuditLog).where(AuditLog.id == expired_login.id)
    )
    assert result.scalar_one_or_none() is None

    # Verify the recent one still exists
    result = await db_session.execute(
        select(AuditLog).where(AuditLog.id == recent_login.id)
    )
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_purge_respects_security_event_types(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """All five security event types should use the 2-year retention."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)
    security_types = ["login", "failed_login", "password_change", "2fa_enable", "2fa_disable"]

    # Create one expired entry per security type (2 years + 1 day)
    entries = []
    for event_type in security_types:
        entry = _make_audit_log(
            user_id=test_user.id,
            event_type=event_type,
            created_at=now - timedelta(days=731),
        )
        entries.append(entry)
    db_session.add_all(entries)
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 5

    # All should be gone
    result = await db_session.execute(select(func.count()).select_from(AuditLog))
    assert result.scalar() == 0


@pytest.mark.asyncio
async def test_purge_keeps_security_events_within_retention(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """Security events within 2-year window should NOT be purged."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)
    # Exactly at 2-year boundary should NOT be purged (729 days < 730)
    boundary_login = _make_audit_log(
        user_id=test_user.id,
        event_type="failed_login",
        created_at=now - timedelta(days=729),
    )
    db_session.add(boundary_login)
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 0

    result = await db_session.execute(
        select(AuditLog).where(AuditLog.id == boundary_login.id)
    )
    assert result.scalar_one_or_none() is not None


# ═══════════════════════════════════════════════════════════════════════════
# purge_expired_audit_logs — General Events (1 year)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_purge_deletes_expired_general_events(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """General events older than 1 year should be purged."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)
    # Expired: 1 year + 1 day ago
    expired_register = _make_audit_log(
        user_id=test_user.id,
        event_type="register",
        created_at=now - timedelta(days=366),
    )
    # Not expired: 6 months ago (within 1-year window)
    recent_register = _make_audit_log(
        user_id=test_user.id,
        event_type="register",
        created_at=now - timedelta(days=180),
    )
    db_session.add_all([expired_register, recent_register])
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 1

    # Verify the expired one is gone
    result = await db_session.execute(
        select(AuditLog).where(AuditLog.id == expired_register.id)
    )
    assert result.scalar_one_or_none() is None

    # Verify the recent one still exists
    result = await db_session.execute(
        select(AuditLog).where(AuditLog.id == recent_register.id)
    )
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_purge_general_events_include_payment_and_tier_change(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """Payment and tier_change events should use 1-year retention (general)."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)
    expired_payment = _make_audit_log(
        user_id=test_user.id,
        event_type="payment",
        created_at=now - timedelta(days=400),
    )
    expired_tier = _make_audit_log(
        user_id=test_user.id,
        event_type="tier_change",
        created_at=now - timedelta(days=400),
    )
    db_session.add_all([expired_payment, expired_tier])
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 2


@pytest.mark.asyncio
async def test_purge_keeps_general_events_within_retention(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """General events within 1-year window should NOT be purged."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)
    recent_payment = _make_audit_log(
        user_id=test_user.id,
        event_type="payment",
        created_at=now - timedelta(days=300),
    )
    db_session.add(recent_payment)
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 0


# ═══════════════════════════════════════════════════════════════════════════
# purge_expired_audit_logs — Orphaned Records (90 days)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_purge_deletes_expired_orphaned_records(
    db_session: AsyncSession,
) -> None:
    """Orphaned records (user_id=NULL) older than 90 days should be purged."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)
    # Expired: 91 days ago, no user_id (user was deleted)
    expired_orphan = _make_audit_log(
        user_id=None,
        event_type="account_deleted",
        created_at=now - timedelta(days=91),
    )
    # Not expired: 30 days ago, no user_id
    recent_orphan = _make_audit_log(
        user_id=None,
        event_type="account_deleted",
        created_at=now - timedelta(days=30),
    )
    db_session.add_all([expired_orphan, recent_orphan])
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 1

    # Verify the expired one is gone
    result = await db_session.execute(
        select(AuditLog).where(AuditLog.id == expired_orphan.id)
    )
    assert result.scalar_one_or_none() is None

    # Verify the recent one still exists
    result = await db_session.execute(
        select(AuditLog).where(AuditLog.id == recent_orphan.id)
    )
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_purge_orphaned_applies_to_any_event_type(
    db_session: AsyncSession,
) -> None:
    """Orphaned record policy applies regardless of event_type (user_id=NULL is the trigger)."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)
    # A security event type but with user_id=NULL should use orphaned policy (90 days)
    orphan_login = _make_audit_log(
        user_id=None,
        event_type="login",
        created_at=now - timedelta(days=91),
    )
    db_session.add(orphan_login)
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 1


@pytest.mark.asyncio
async def test_purge_keeps_orphaned_within_retention(
    db_session: AsyncSession,
) -> None:
    """Orphaned records within 90-day window should NOT be purged."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)
    recent_orphan = _make_audit_log(
        user_id=None,
        event_type="login",
        created_at=now - timedelta(days=89),
    )
    db_session.add(recent_orphan)
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 0


# ═══════════════════════════════════════════════════════════════════════════
# purge_expired_audit_logs — Mixed Scenarios
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_purge_mixed_events_deletes_correct_subset(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """A mix of expired and non-expired records should purge only the expired ones."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)

    # Expired security event (>2 years)
    expired_security = _make_audit_log(
        user_id=test_user.id,
        event_type="login",
        created_at=now - timedelta(days=800),
    )
    # Expired general event (>1 year)
    expired_general = _make_audit_log(
        user_id=test_user.id,
        event_type="payment",
        created_at=now - timedelta(days=400),
    )
    # Expired orphan (>90 days)
    expired_orphan = _make_audit_log(
        user_id=None,
        event_type="account_deleted",
        created_at=now - timedelta(days=100),
    )
    # Non-expired security (within 2 years)
    live_security = _make_audit_log(
        user_id=test_user.id,
        event_type="password_change",
        created_at=now - timedelta(days=700),
    )
    # Non-expired general (within 1 year)
    live_general = _make_audit_log(
        user_id=test_user.id,
        event_type="tier_change",
        created_at=now - timedelta(days=200),
    )
    # Non-expired orphan (within 90 days)
    live_orphan = _make_audit_log(
        user_id=None,
        event_type="account_deleted",
        created_at=now - timedelta(days=60),
    )

    db_session.add_all([
        expired_security,
        expired_general,
        expired_orphan,
        live_security,
        live_general,
        live_orphan,
    ])
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    # Should delete the 3 expired records
    assert deleted_count == 3

    # Verify total remaining is 3
    result = await db_session.execute(select(func.count()).select_from(AuditLog))
    assert result.scalar() == 3


@pytest.mark.asyncio
async def test_purge_empty_table_returns_zero(
    db_session: AsyncSession,
) -> None:
    """Purging an empty audit_log table should return 0 and not error."""
    from app.services.retention_service import purge_expired_audit_logs

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 0


@pytest.mark.asyncio
async def test_purge_no_expired_records_returns_zero(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """When all records are within retention, purge should return 0."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)
    recent = _make_audit_log(
        user_id=test_user.id,
        event_type="login",
        created_at=now - timedelta(days=10),
    )
    db_session.add(recent)
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 0


@pytest.mark.asyncio
async def test_purge_returns_accurate_count(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """purge_expired_audit_logs should return the exact count of deleted rows."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)
    # Create 5 expired general events
    for _ in range(5):
        entry = _make_audit_log(
            user_id=test_user.id,
            event_type="register",
            created_at=now - timedelta(days=400),
        )
        db_session.add(entry)
    # Create 3 non-expired
    for _ in range(3):
        entry = _make_audit_log(
            user_id=test_user.id,
            event_type="register",
            created_at=now - timedelta(days=100),
        )
        db_session.add(entry)
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 5


# ═══════════════════════════════════════════════════════════════════════════
# purge_expired_audit_logs — Unknown Event Types
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_purge_unknown_event_type_uses_general_retention(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """Unknown event types should fall back to the general (1-year) retention policy."""
    from app.services.retention_service import purge_expired_audit_logs

    now = datetime.now(UTC)
    # Unknown event type, expired at 1-year boundary
    unknown_expired = _make_audit_log(
        user_id=test_user.id,
        event_type="some_new_event_type",
        created_at=now - timedelta(days=400),
    )
    # Unknown event type, within 1 year
    unknown_recent = _make_audit_log(
        user_id=test_user.id,
        event_type="some_new_event_type",
        created_at=now - timedelta(days=200),
    )
    db_session.add_all([unknown_expired, unknown_recent])
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    assert deleted_count == 1


# ═══════════════════════════════════════════════════════════════════════════
# _batched_delete — Multi-Batch Iteration
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_batched_delete_processes_multiple_batches(
    db_session: AsyncSession,
    test_user: User,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reducing batch size to 2 and creating 5+ expired records should force multi-batch iteration."""
    import app.services.retention_service as retention_mod
    from app.services.retention_service import purge_expired_audit_logs

    # Monkeypatch the batch size to 2 so we force multiple iterations
    monkeypatch.setattr(retention_mod, "_PURGE_BATCH_SIZE", 2)

    now = datetime.now(UTC)
    # Create 7 expired general events (>1 year old)
    for _ in range(7):
        entry = _make_audit_log(
            user_id=test_user.id,
            event_type="register",
            created_at=now - timedelta(days=400),
        )
        db_session.add(entry)
    await db_session.commit()

    deleted_count = await purge_expired_audit_logs(db_session)

    # All 7 should be purged across 4 batches (2+2+2+1)
    assert deleted_count == 7

    # Verify all records are gone
    result = await db_session.execute(select(func.count()).select_from(AuditLog))
    assert result.scalar() == 0


# ═══════════════════════════════════════════════════════════════════════════
# get_retention_summary — Diagnostic Function
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_get_retention_summary_returns_counts(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """get_retention_summary should return a dict with counts per category."""
    from app.services.retention_service import get_retention_summary

    now = datetime.now(UTC)
    # 2 expired security events
    for _ in range(2):
        db_session.add(_make_audit_log(
            user_id=test_user.id,
            event_type="login",
            created_at=now - timedelta(days=731),
        ))
    # 3 expired general events
    for _ in range(3):
        db_session.add(_make_audit_log(
            user_id=test_user.id,
            event_type="register",
            created_at=now - timedelta(days=400),
        ))
    # 1 expired orphan
    db_session.add(_make_audit_log(
        user_id=None,
        event_type="account_deleted",
        created_at=now - timedelta(days=91),
    ))
    # 4 non-expired
    for _ in range(4):
        db_session.add(_make_audit_log(
            user_id=test_user.id,
            event_type="login",
            created_at=now - timedelta(days=10),
        ))
    await db_session.commit()

    summary = await get_retention_summary(db_session)

    assert summary["expired_security"] == 2
    assert summary["expired_general"] == 3
    assert summary["expired_orphaned"] == 1
    assert summary["total_expired"] == 6
    assert summary["total_records"] == 10
