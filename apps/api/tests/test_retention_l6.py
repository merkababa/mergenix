"""
Tests for L6 — Data Retention Enforcement (new functionality).

TDD: tests are written FIRST. All tests should FAIL until implementation is complete.

Covers:
- RetentionService.purge_inactive_users (2yr+ free-tier inactivity)
- RetentionService.purge_expired_payments (7yr+ payment records)
- RetentionService.purge_expired_audit_logs (90-day shorthand)
- RetentionService.run_all_purges (aggregation)
- Cascade: deleting inactive user deletes AnalysisResult, NOT Payment
- dry_run: counts but does not delete
- Admin cron endpoint: correct secret → 202, wrong/missing → 401
- last_login_at updated on login and refresh
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.models.analysis import AnalysisResult
from app.models.audit import AuditLog
from app.models.payment import Payment  # noqa: F401 (used in type assertions)
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# ── Helpers ───────────────────────────────────────────────────────────────


def _make_user(
    *,
    email: str | None = None,
    tier: str = "free",
    last_login_at: datetime | None = None,
    created_at: datetime | None = None,
) -> User:
    """Build a User instance (not committed)."""
    now = datetime.now(UTC).replace(tzinfo=None)
    user = User(
        id=uuid.uuid4(),
        email=email or f"user-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="hashed",
        name="Test User",
        tier=tier,
        email_verified=True,
        created_at=created_at.replace(tzinfo=None) if created_at else now,
        updated_at=now,
    )
    # Set last_login_at after construction (bypasses server default)
    if last_login_at is not None:
        user.last_login_at = last_login_at.replace(tzinfo=None)
    else:
        user.last_login_at = None
    return user


def _make_payment(
    *,
    user_id: uuid.UUID,
    created_at: datetime,
) -> Payment:
    """Build a Payment instance (not committed)."""
    return Payment(
        id=uuid.uuid4(),
        user_id=user_id,
        stripe_customer_id="cus_test",
        stripe_payment_intent=f"pi_{uuid.uuid4().hex[:12]}",
        amount=1499,
        currency="usd",
        status="succeeded",
        tier_granted="premium",
        created_at=created_at.replace(tzinfo=None),
    )


def _make_analysis_result(*, user_id: uuid.UUID) -> AnalysisResult:
    """Build an AnalysisResult instance (not committed)."""
    return AnalysisResult(
        id=uuid.uuid4(),
        user_id=user_id,
        label="Test Analysis",
        parent1_filename="parent1.csv",
        parent2_filename="parent2.csv",
        result_data=b"encrypted_blob",
        tier_at_time="free",
        data_version="1.0",
    )


def _make_audit_log(*, user_id: uuid.UUID | None = None, created_at: datetime) -> AuditLog:
    """Build an AuditLog instance (not committed)."""
    return AuditLog(
        id=uuid.uuid4(),
        user_id=user_id,
        event_type="login",
        metadata_json={"test": True},
        ip_address="127.0.0.1",
        user_agent="pytest",
        created_at=created_at.replace(tzinfo=None),
    )


# ═══════════════════════════════════════════════════════════════════════════
# RetentionService — purge_inactive_users
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_purge_inactive_user_at_2yr_plus_1day(
    db_session: AsyncSession,
) -> None:
    """Free-tier user with last_login_at 2yr+1day ago should be purged."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    user = _make_user(last_login_at=now - timedelta(days=365 * 2 + 1))
    db_session.add(user)
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_inactive_users(db_session)

    assert count == 1

    result = await db_session.execute(select(User).where(User.id == user.id))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_purge_inactive_user_at_exactly_2yr_minus_1day_retained(
    db_session: AsyncSession,
) -> None:
    """Free-tier user with last_login_at exactly 2yr-1day ago should NOT be purged."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    user = _make_user(last_login_at=now - timedelta(days=365 * 2 - 1))
    db_session.add(user)
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_inactive_users(db_session)

    assert count == 0

    result = await db_session.execute(select(User).where(User.id == user.id))
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_purge_inactive_user_last_login_null_falls_back_to_created_at(
    db_session: AsyncSession,
) -> None:
    """User with no last_login_at uses created_at as the inactivity anchor."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    # Created 4 years ago, never logged in since (last_login_at=NULL)
    user = _make_user(
        created_at=now - timedelta(days=365 * 4),
        last_login_at=None,
    )
    db_session.add(user)
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_inactive_users(db_session)

    # Should be purged — created 4 years ago with no login
    assert count == 1


@pytest.mark.asyncio
async def test_purge_inactive_user_never_purges_paying_subscriber(
    db_session: AsyncSession,
) -> None:
    """Premium/pro users MUST NOT be purged regardless of inactivity."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    premium_user = _make_user(
        tier="premium",
        last_login_at=now - timedelta(days=365 * 5),  # 5 years inactive
    )
    pro_user = _make_user(
        tier="pro",
        last_login_at=now - timedelta(days=365 * 5),  # 5 years inactive
    )
    db_session.add_all([premium_user, pro_user])
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_inactive_users(db_session)

    assert count == 0

    # Both users should still exist
    for user in [premium_user, pro_user]:
        result = await db_session.execute(select(User).where(User.id == user.id))
        assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_purge_inactive_user_cascade_deletes_analysis_results(
    db_session: AsyncSession,
) -> None:
    """Purging an inactive user should cascade-delete their AnalysisResult rows."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    user = _make_user(last_login_at=now - timedelta(days=365 * 4))
    db_session.add(user)
    await db_session.flush()

    # Add analysis results for this user
    ar1 = _make_analysis_result(user_id=user.id)
    ar2 = _make_analysis_result(user_id=user.id)
    db_session.add_all([ar1, ar2])
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_inactive_users(db_session)

    assert count == 1

    # AnalysisResult rows should be gone (CASCADE)
    result = await db_session.execute(select(AnalysisResult).where(AnalysisResult.user_id == user.id))
    assert result.scalars().all() == []


@pytest.mark.asyncio
async def test_purge_inactive_user_does_not_delete_payment_rows(
    db_session: AsyncSession,
) -> None:
    """Purging an inactive user should NOT delete their Payment records (SET NULL)."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    user = _make_user(last_login_at=now - timedelta(days=365 * 4))
    db_session.add(user)
    await db_session.flush()

    payment = _make_payment(user_id=user.id, created_at=now - timedelta(days=10))
    db_session.add(payment)
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_inactive_users(db_session)

    assert count == 1

    # Payment should survive with user_id NULLed out (SET NULL FK)
    result = await db_session.execute(select(Payment).where(Payment.id == payment.id))
    surviving_payment = result.scalar_one_or_none()
    assert surviving_payment is not None
    assert surviving_payment.user_id is None


@pytest.mark.asyncio
async def test_purge_inactive_users_dry_run_returns_count_without_deleting(
    db_session: AsyncSession,
) -> None:
    """dry_run=True should return the count but NOT delete any users."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    user = _make_user(last_login_at=now - timedelta(days=365 * 4))
    db_session.add(user)
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_inactive_users(db_session, dry_run=True)

    assert count == 1

    # User should still be in the database
    result = await db_session.execute(select(User).where(User.id == user.id))
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_purge_inactive_users_empty_returns_zero(
    db_session: AsyncSession,
) -> None:
    """No inactive users → returns 0."""
    from app.services.retention_service import RetentionService

    svc = RetentionService()
    count = await svc.purge_inactive_users(db_session)
    assert count == 0


# ═══════════════════════════════════════════════════════════════════════════
# RetentionService — purge_expired_payments
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_purge_payment_at_7yr_plus_1day(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """Payment record older than 7 years should be purged."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    old_payment = _make_payment(
        user_id=test_user.id,
        created_at=now - timedelta(days=365 * 7 + 1),
    )
    db_session.add(old_payment)
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_expired_payments(db_session)

    assert count == 1

    result = await db_session.execute(select(Payment).where(Payment.id == old_payment.id))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_purge_payment_at_6yr_364days_retained(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """Payment record 6yr+364days old should NOT be purged."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    recent_payment = _make_payment(
        user_id=test_user.id,
        created_at=now - timedelta(days=365 * 7 - 1),
    )
    db_session.add(recent_payment)
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_expired_payments(db_session)

    assert count == 0

    result = await db_session.execute(select(Payment).where(Payment.id == recent_payment.id))
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_purge_payment_dry_run_returns_count_without_deleting(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """dry_run=True should count but not delete payment records."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    old_payment = _make_payment(
        user_id=test_user.id,
        created_at=now - timedelta(days=365 * 8),
    )
    db_session.add(old_payment)
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_expired_payments(db_session, dry_run=True)

    assert count == 1

    # Payment should still exist
    result = await db_session.execute(select(Payment).where(Payment.id == old_payment.id))
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_purge_payments_empty_returns_zero(
    db_session: AsyncSession,
) -> None:
    """No expired payments → returns 0."""
    from app.services.retention_service import RetentionService

    svc = RetentionService()
    count = await svc.purge_expired_payments(db_session)
    assert count == 0


@pytest.mark.asyncio
async def test_purge_payments_with_null_user_id(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """Payments with user_id=NULL (from SET NULL after user deletion) should also be purged."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    # Create payment referencing a user, then simulate SET NULL by nulling user_id
    # We create a payment with no user_id (orphaned) that is older than 7 years
    # In real flow this happens after user deletion. We test directly via NULL user_id.
    old_orphan_payment = Payment(
        id=uuid.uuid4(),
        user_id=None,
        stripe_payment_intent=f"pi_{uuid.uuid4().hex[:12]}",
        amount=1499,
        currency="usd",
        status="succeeded",
        tier_granted="premium",
        created_at=(now - timedelta(days=365 * 7 + 10)).replace(tzinfo=None),
    )
    db_session.add(old_orphan_payment)
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_expired_payments(db_session)
    assert count == 1


# ═══════════════════════════════════════════════════════════════════════════
# RetentionService — purge_expired_audit_logs (via RetentionService class)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_retention_service_purge_audit_logs(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """RetentionService.purge_expired_audit_logs should delegate to existing logic."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    old_log = _make_audit_log(
        user_id=test_user.id,
        created_at=now - timedelta(days=91),
    )
    # Orphaned (user_id=None), 91 days old
    old_log.user_id = None
    db_session.add(old_log)
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_expired_audit_logs(db_session)

    assert count == 1


@pytest.mark.asyncio
async def test_retention_service_purge_audit_logs_dry_run(
    db_session: AsyncSession,
) -> None:
    """purge_expired_audit_logs with dry_run=True counts but does not delete."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    old_log = _make_audit_log(
        user_id=None,
        created_at=now - timedelta(days=91),
    )
    db_session.add(old_log)
    await db_session.commit()

    svc = RetentionService()
    count = await svc.purge_expired_audit_logs(db_session, dry_run=True)

    assert count == 1

    # Log should still be there
    result = await db_session.execute(select(AuditLog).where(AuditLog.id == old_log.id))
    assert result.scalar_one_or_none() is not None


# ═══════════════════════════════════════════════════════════════════════════
# RetentionService — run_all_purges
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_run_all_purges_returns_summary_dict(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """run_all_purges should return a dict with counts for each category."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)

    # Expired audit log (orphaned, 91 days)
    old_log = _make_audit_log(user_id=None, created_at=now - timedelta(days=91))
    db_session.add(old_log)

    # Expired payment (7yr+1day)
    old_payment = _make_payment(
        user_id=test_user.id,
        created_at=now - timedelta(days=365 * 7 + 1),
    )
    db_session.add(old_payment)

    # Inactive free user (2yr+1day)
    inactive_user = _make_user(last_login_at=now - timedelta(days=365 * 2 + 1))
    db_session.add(inactive_user)

    await db_session.commit()

    svc = RetentionService()
    summary = await svc.run_all_purges(db_session)

    assert isinstance(summary, dict)
    assert "audit_logs_purged" in summary
    assert "inactive_users_purged" in summary
    assert "payments_purged" in summary
    assert summary["audit_logs_purged"] == 1
    assert summary["inactive_users_purged"] == 1
    assert summary["payments_purged"] == 1


@pytest.mark.asyncio
async def test_run_all_purges_dry_run(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """run_all_purges with dry_run=True should report counts but not delete anything."""
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)

    old_log = _make_audit_log(user_id=None, created_at=now - timedelta(days=91))
    db_session.add(old_log)

    inactive_user = _make_user(last_login_at=now - timedelta(days=365 * 4))
    db_session.add(inactive_user)

    await db_session.commit()

    svc = RetentionService()
    summary = await svc.run_all_purges(db_session, dry_run=True)

    # Should report counts
    assert summary["audit_logs_purged"] >= 1
    assert summary["inactive_users_purged"] == 1

    # Nothing actually deleted
    result = await db_session.execute(select(AuditLog).where(AuditLog.id == old_log.id))
    assert result.scalar_one_or_none() is not None

    result = await db_session.execute(select(User).where(User.id == inactive_user.id))
    assert result.scalar_one_or_none() is not None


# ═══════════════════════════════════════════════════════════════════════════
# Admin Cron Endpoint — POST /api/v1/admin/cron/retention
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_cron_endpoint_correct_secret_returns_202(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Valid X-Cron-Secret header → 202 Accepted with summary."""
    from app.config import get_settings

    monkeypatch.setenv("CRON_SECRET", "test-cron-secret-value")
    get_settings.cache_clear()

    response = await client.post(
        "/api/v1/admin/cron/retention",
        headers={"X-Cron-Secret": "test-cron-secret-value"},
    )
    assert response.status_code == 202
    body = response.json()
    assert "audit_logs_purged" in body
    assert "inactive_users_purged" in body
    assert "payments_purged" in body


@pytest.mark.asyncio
async def test_cron_endpoint_wrong_secret_returns_401(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Wrong X-Cron-Secret header → 401 Unauthorized."""
    from app.config import get_settings

    monkeypatch.setenv("CRON_SECRET", "test-cron-secret-value")
    get_settings.cache_clear()

    response = await client.post(
        "/api/v1/admin/cron/retention",
        headers={"X-Cron-Secret": "wrong-secret"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_cron_endpoint_missing_secret_returns_401(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Missing X-Cron-Secret header → 401 Unauthorized."""
    from app.config import get_settings

    monkeypatch.setenv("CRON_SECRET", "test-cron-secret-value")
    get_settings.cache_clear()

    response = await client.post(
        "/api/v1/admin/cron/retention",
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_cron_endpoint_dry_run_param(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """?dry_run=true query param should be accepted and work correctly."""
    from app.config import get_settings

    monkeypatch.setenv("CRON_SECRET", "test-cron-secret-value")
    get_settings.cache_clear()

    response = await client.post(
        "/api/v1/admin/cron/retention?dry_run=true",
        headers={"X-Cron-Secret": "test-cron-secret-value"},
    )
    assert response.status_code == 202
    body = response.json()
    assert "dry_run" in body
    assert body["dry_run"] is True


@pytest.mark.asyncio
async def test_cron_endpoint_unconfigured_secret_returns_503(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """CRON_SECRET env var not set → 503 Service Unavailable (endpoint disabled)."""
    from app.config import get_settings

    monkeypatch.delenv("CRON_SECRET", raising=False)
    get_settings.cache_clear()

    response = await client.post(
        "/api/v1/admin/cron/retention",
        headers={"X-Cron-Secret": "anything"},
    )
    # When CRON_SECRET is not configured, the endpoint is disabled
    assert response.status_code in (503, 401)


@pytest.mark.asyncio
async def test_cron_endpoint_accessible_without_csrf_header(
    app,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Cron endpoint must be reachable from external schedulers without X-Requested-With.

    External cron schedulers (Vercel Cron, GitHub Actions, cron.io) POST to
    this endpoint with only the X-Cron-Secret header — they cannot inject
    browser-only headers such as X-Requested-With: XMLHttpRequest.

    This test uses a raw httpx client WITHOUT the default CSRF header to verify
    the CSRF middleware exemption is working correctly for the cron path prefix.
    """
    from app.config import get_settings
    from httpx import ASGITransport, AsyncClient

    monkeypatch.setenv("CRON_SECRET", "cron-secret-no-csrf")
    get_settings.cache_clear()

    transport = ASGITransport(app=app)
    # Deliberately omit X-Requested-With to simulate an external cron scheduler
    async with AsyncClient(transport=transport, base_url="http://testserver") as raw_client:
        response = await raw_client.post(
            "/api/v1/admin/cron/retention?dry_run=true",
            headers={"X-Cron-Secret": "cron-secret-no-csrf"},
        )

    # Must NOT get 403 (CSRF rejection) — should get 202 (authenticated cron call)
    assert response.status_code != 403, (
        "CSRF middleware is incorrectly blocking the cron endpoint. External schedulers cannot send X-Requested-With."
    )
    assert response.status_code == 202


# ═══════════════════════════════════════════════════════════════════════════
# last_login_at — Updated on Login and Refresh
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_last_login_at_set_on_successful_password_login(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    mock_email,
) -> None:
    """Successful password login should set last_login_at on the user."""
    response = await client.post(
        "/auth/login",
        json={"email": "test@example.com", "password": "TestPass123"},
    )
    assert response.status_code == 200

    # Fetch fresh user from DB
    await db_session.refresh(test_user)
    assert test_user.last_login_at is not None
    # Should be very recent (within last 10 seconds)
    now_naive = datetime.now(UTC).replace(tzinfo=None)
    delta = abs((now_naive - test_user.last_login_at).total_seconds())
    assert delta < 10, f"last_login_at not updated recently: delta={delta}s"


@pytest.mark.asyncio
async def test_last_login_at_set_on_token_refresh(
    client: AsyncClient,
    db_session: AsyncSession,
    user_with_session,
) -> None:
    """Token refresh should update last_login_at on the user."""
    user, raw_refresh = user_with_session

    response = await client.post(
        "/auth/refresh",
        cookies={"refresh_token": raw_refresh},
    )
    assert response.status_code == 200

    await db_session.refresh(user)
    assert user.last_login_at is not None

    now_naive = datetime.now(UTC).replace(tzinfo=None)
    delta = abs((now_naive - user.last_login_at).total_seconds())
    assert delta < 10, f"last_login_at not updated on refresh: delta={delta}s"


# ═══════════════════════════════════════════════════════════════════════════
# User.last_login_at — model field exists
# ═══════════════════════════════════════════════════════════════════════════


def test_user_model_has_last_login_at_field() -> None:
    """User model must have last_login_at attribute (Mapped[datetime | None])."""
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        password_hash="hash",
        name="Test",
        tier="free",
        email_verified=True,
        created_at=datetime.now(UTC).replace(tzinfo=None),
        updated_at=datetime.now(UTC).replace(tzinfo=None),
    )
    # Attribute must exist and be None by default
    assert hasattr(user, "last_login_at")
    assert user.last_login_at is None


def test_payment_model_user_id_is_nullable() -> None:
    """Payment.user_id must be nullable (for SET NULL on user deletion)."""
    from app.models.payment import Payment

    col = Payment.__table__.c["user_id"]
    assert col.nullable is True, "Payment.user_id must be nullable for SET NULL FK"


def test_payment_model_fk_has_set_null_on_delete() -> None:
    """Payment.user_id FK must have ON DELETE SET NULL."""
    from app.models.payment import Payment

    col = Payment.__table__.c["user_id"]
    fks = list(col.foreign_keys)
    assert len(fks) == 1, "Expected exactly one FK on user_id"
    fk = fks[0]
    assert fk.ondelete == "SET NULL", f"Expected ON DELETE SET NULL, got {fk.ondelete!r}"


# ═══════════════════════════════════════════════════════════════════════════
# SECURITY_EVENTS — event name alignment tests
# ═══════════════════════════════════════════════════════════════════════════


def test_security_events_contains_password_changed() -> None:
    """SECURITY_EVENTS must contain 'password_changed' (the name auth.py logs).

    Regression test: the frozenset previously used 'password_change' (no 'd'),
    which caused password-change audit logs to be classified as general events
    and purged at 1 year instead of the required 2-year security retention.
    """
    from app.services.retention_service import SECURITY_EVENTS

    assert "password_changed" in SECURITY_EVENTS, (
        "'password_changed' missing from SECURITY_EVENTS. "
        "auth.py emits event_type='password_changed' — the frozenset must match "
        "exactly or password change events will be purged after 1yr, not 2yr."
    )
    # Old incorrect name must NOT be present (would mask the bug)
    assert "password_change" not in SECURITY_EVENTS, (
        "'password_change' (without 'd') should not be in SECURITY_EVENTS — "
        "auth.py logs 'password_changed'. Having the wrong name is a silent mis-classification."
    )


def test_security_events_contains_2fa_enabled_and_disabled() -> None:
    """SECURITY_EVENTS must contain '2fa_enabled' and '2fa_disabled' (names auth.py logs).

    Regression test: the frozenset previously used '2fa_enable' / '2fa_disable'
    (without 'd'), which caused 2FA audit logs to fall into the 1-year general
    retention bucket instead of the required 2-year security retention window.
    """
    from app.services.retention_service import SECURITY_EVENTS

    assert "2fa_enabled" in SECURITY_EVENTS, (
        "'2fa_enabled' missing from SECURITY_EVENTS. auth.py emits event_type='2fa_enabled'."
    )
    assert "2fa_disabled" in SECURITY_EVENTS, (
        "'2fa_disabled' missing from SECURITY_EVENTS. auth.py emits event_type='2fa_disabled'."
    )
    # Old incorrect names must NOT be present
    assert "2fa_enable" not in SECURITY_EVENTS, "'2fa_enable' (without 'd') should not be in SECURITY_EVENTS."
    assert "2fa_disable" not in SECURITY_EVENTS, "'2fa_disable' (without 'd') should not be in SECURITY_EVENTS."


@pytest.mark.asyncio
async def test_password_changed_audit_log_gets_2yr_retention(
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """A 'password_changed' audit log inside the 2yr window must NOT be purged.

    This is the integration-level regression test for the SECURITY_EVENTS
    naming mismatch. If 'password_changed' is mis-classified as a general event,
    a 400-day-old log would be purged (general TTL = 365 days). If correctly
    classified as a security event (TTL = 730 days), it must survive.
    """
    from app.services.retention_service import RetentionService

    now = datetime.now(UTC)
    # 400 days old — past general TTL (365d) but within security TTL (730d)
    log = AuditLog(
        id=uuid.uuid4(),
        user_id=test_user.id,
        event_type="password_changed",
        metadata_json={"reason": "user_initiated"},
        ip_address="127.0.0.1",
        user_agent="pytest",
        created_at=(now - timedelta(days=400)).replace(tzinfo=None),
    )
    db_session.add(log)
    await db_session.commit()

    svc = RetentionService()
    deleted = await svc.purge_expired_audit_logs(db_session)

    # The log is 400 days old — within 2yr security window — must NOT be deleted
    assert deleted == 0, (
        f"'password_changed' audit log was incorrectly purged as a general event "
        f"(deleted={deleted}). Check SECURITY_EVENTS frozenset — event name must "
        f"match exactly what auth.py logs."
    )

    # Confirm the record still exists
    result = await db_session.execute(select(AuditLog).where(AuditLog.id == log.id))
    assert result.scalar_one_or_none() is not None, (
        "'password_changed' audit log was deleted when it should be retained for 2 years."
    )
