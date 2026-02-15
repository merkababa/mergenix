"""
Tests for auth middleware hardening — B11.

Tests cover:
  1. CSRF protection via X-Requested-With header on state-changing methods
  2. Locked-user rejection from get_current_user (403)
  3. Session invalidation on password change
  4. Session invalidation on password reset
  5. GET/HEAD/OPTIONS bypass for CSRF check
"""

from __future__ import annotations

import secrets as _secrets
from datetime import UTC, datetime, timedelta

import pytest
from app.models.audit import PasswordReset, Session
from app.models.user import User
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
)
from app.utils.security import hash_token
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# ── CSRF Protection: Rejection Tests ─────────────────────────────────────
# These tests use client_no_csrf (no default X-Requested-With header)
# to verify that the CSRF middleware rejects state-changing requests
# that lack the header.


@pytest.mark.asyncio
async def test_csrf_header_required_on_post(
    client_no_csrf: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST requests without X-Requested-With header should return 403."""
    response = await client_no_csrf.post(
        "/auth/change-password",
        json={
            "old_password": "TestPass123",
            "new_password": "NewSecure1Pass",
        },
        headers=auth_headers,  # No X-Requested-With
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "CSRF_HEADER_MISSING"


@pytest.mark.asyncio
async def test_csrf_header_required_on_put(
    client_no_csrf: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """PUT requests without X-Requested-With header should return 403."""
    response = await client_no_csrf.put(
        "/auth/me",
        json={"name": "Updated Name"},
        headers=auth_headers,  # No X-Requested-With
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "CSRF_HEADER_MISSING"


@pytest.mark.asyncio
async def test_csrf_header_required_on_delete(
    client_no_csrf: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """DELETE requests without X-Requested-With header should return 403."""
    response = await client_no_csrf.delete(
        "/auth/sessions",
        headers=auth_headers,  # No X-Requested-With
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "CSRF_HEADER_MISSING"


@pytest.mark.asyncio
async def test_csrf_header_required_on_patch(
    client_no_csrf: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """PATCH requests without X-Requested-With header should return 403."""
    response = await client_no_csrf.patch(
        "/auth/me",
        json={"name": "Updated"},
        headers=auth_headers,  # No X-Requested-With
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "CSRF_HEADER_MISSING"


# ── CSRF Protection: Pass-Through Tests ──────────────────────────────────
# These tests use the standard client (which includes X-Requested-With)
# to verify that requests WITH the header are not blocked by CSRF.


@pytest.mark.asyncio
async def test_csrf_header_passes_when_present_on_post(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST requests WITH X-Requested-With: XMLHttpRequest should pass CSRF check."""
    headers = {**auth_headers, "X-Requested-With": "XMLHttpRequest"}
    response = await client.post(
        "/auth/change-password",
        json={
            "old_password": "TestPass123",
            "new_password": "NewSecure1Pass",
        },
        headers=headers,
    )
    # The CSRF middleware must NOT block the request.  The endpoint handler
    # should be reached, returning one of these expected statuses.
    assert response.status_code in (200, 400, 401, 422), (
        f"Unexpected status {response.status_code}: {response.json()}"
    )


@pytest.mark.asyncio
async def test_csrf_header_passes_when_present_on_delete(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """DELETE requests WITH X-Requested-With: XMLHttpRequest should pass CSRF check."""
    headers = {**auth_headers, "X-Requested-With": "XMLHttpRequest"}
    response = await client.delete(
        "/auth/sessions",
        headers=headers,
    )
    # The CSRF middleware must NOT block the request.  The endpoint handler
    # should be reached, returning one of these expected statuses.
    assert response.status_code in (200, 400, 401, 422), (
        f"Unexpected status {response.status_code}: {response.json()}"
    )


# ── CSRF Protection: Safe Methods Bypass ─────────────────────────────────
# These tests use client_no_csrf to verify that GET/HEAD/OPTIONS
# are NOT blocked even without the X-Requested-With header.


@pytest.mark.asyncio
async def test_csrf_header_not_required_on_get(
    client_no_csrf: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET requests should NOT require X-Requested-With header."""
    response = await client_no_csrf.get(
        "/auth/me",
        headers=auth_headers,  # No X-Requested-With
    )
    # Should succeed (200) — GET is read-only, no CSRF check needed
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_csrf_header_not_required_on_head(
    client_no_csrf: AsyncClient,
) -> None:
    """HEAD requests should NOT require X-Requested-With header."""
    response = await client_no_csrf.head(
        "/health",
    )
    # HEAD on health should succeed, definitely NOT 403 CSRF
    assert response.status_code != 403


@pytest.mark.asyncio
async def test_csrf_header_not_required_on_options(
    client_no_csrf: AsyncClient,
) -> None:
    """OPTIONS requests (CORS preflight) should NOT require X-Requested-With."""
    response = await client_no_csrf.options(
        "/auth/login",
    )
    # OPTIONS is used for CORS preflight and should never be CSRF-blocked.
    # Assert explicitly: not a 403 CSRF rejection.
    assert response.status_code != 403 or (
        response.json().get("detail", {}).get("code") != "CSRF_HEADER_MISSING"
    )


# ── Locked User Tests ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_locked_user_gets_403(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """A user whose account is locked should receive 403 from any authenticated endpoint."""
    # Lock the user for 30 minutes in the future
    test_user.locked_until = datetime.now(UTC) + timedelta(minutes=30)
    await db_session.commit()

    token = create_access_token(test_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get(
        "/auth/me",
        headers=headers,
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "ACCOUNT_LOCKED"


@pytest.mark.asyncio
async def test_expired_lock_allows_access(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
) -> None:
    """A user whose lockout has expired should be allowed access."""
    # Lock expired 5 minutes ago
    test_user.locked_until = datetime.now(UTC) - timedelta(minutes=5)
    await db_session.commit()

    token = create_access_token(test_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get(
        "/auth/me",
        headers=headers,
    )
    assert response.status_code == 200


# ── Session Invalidation on Password Change ──────────────────────────────


@pytest.mark.asyncio
async def test_password_change_invalidates_all_sessions(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Changing password should delete ALL sessions for the user.

    Creates a fresh user inline (not via the test_user fixture) to avoid
    potential ORM session conflicts between fixture-created User objects
    and Session records created in the same db_session.
    """
    from app.services.auth_service import hash_password

    # Create user directly with a known password hash
    user = User(
        email="sessiontest@example.com",
        password_hash=await hash_password("TestPass123"),
        name="Session Test User",
        tier="free",
        email_verified=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Create multiple sessions for the user
    for i in range(3):
        raw_token = create_refresh_token(user.id)
        session = Session(
            user_id=user.id,
            refresh_token_hash=hash_token(raw_token),
            expires_at=datetime.now(UTC) + timedelta(days=7),
            ip_address=f"127.0.0.{i}",
            user_agent=f"test-client-{i}",
        )
        db_session.add(session)
    await db_session.commit()

    # Verify sessions exist
    result = await db_session.execute(
        select(Session).where(Session.user_id == user.id)
    )
    sessions_before = result.scalars().all()
    assert len(sessions_before) == 3

    # Change password (client already includes X-Requested-With by default)
    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.post(
        "/auth/change-password",
        json={
            "old_password": "TestPass123",
            "new_password": "BrandNewPass1",
        },
        headers=headers,
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"

    # Verify all sessions are deleted
    result = await db_session.execute(
        select(Session).where(Session.user_id == user.id)
    )
    sessions_after = result.scalars().all()
    assert len(sessions_after) == 0


# ── Session Invalidation on Password Reset ───────────────────────────────


@pytest.mark.asyncio
async def test_password_reset_invalidates_all_sessions(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    mock_email,
) -> None:
    """Completing a password reset should delete ALL sessions for the user."""
    # Create sessions for the user
    for i in range(2):
        raw_token = create_refresh_token(test_user.id)
        session = Session(
            user_id=test_user.id,
            refresh_token_hash=hash_token(raw_token),
            expires_at=datetime.now(UTC) + timedelta(days=7),
            ip_address=f"127.0.0.{i}",
            user_agent=f"test-client-{i}",
        )
        db_session.add(session)
    await db_session.commit()

    # Verify sessions exist
    result = await db_session.execute(
        select(Session).where(Session.user_id == test_user.id)
    )
    sessions_before = result.scalars().all()
    assert len(sessions_before) == 2

    # Create a valid password reset token
    raw_reset_token = _secrets.token_urlsafe(32)
    reset_record = PasswordReset(
        user_id=test_user.id,
        token_hash=hash_token(raw_reset_token),
        expires_at=datetime.now(UTC) + timedelta(hours=1),
    )
    db_session.add(reset_record)
    await db_session.commit()

    # Complete the password reset (client includes X-Requested-With by default)
    response = await client.post(
        "/auth/reset-password",
        json={
            "token": raw_reset_token,
            "new_password": "ResetNewPass1",
        },
    )
    assert response.status_code == 200

    # Verify all sessions are deleted
    result = await db_session.execute(
        select(Session).where(Session.user_id == test_user.id)
    )
    sessions_after = result.scalars().all()
    assert len(sessions_after) == 0
