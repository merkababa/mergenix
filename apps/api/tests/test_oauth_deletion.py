"""
Tests for OAuth user account deletion via email confirmation flow.

GDPR Article 17 requires the right to erasure to be as easy as signup.
OAuth-only users (password_hash=None) cannot provide a password, so they
use an email-based deletion confirmation flow:

1. POST /gdpr/request-deletion  — sends a deletion confirmation email
2. POST /gdpr/confirm-deletion  — validates the token and deletes the account

TDD: These tests are written FIRST, before the implementation.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from app.models.audit import AuditLog
from app.models.user import User
from app.services.auth_service import create_access_token
from app.utils.security import hash_token
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


# ── Fixtures ──────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def oauth_user(db_session: AsyncSession) -> User:
    """Create an OAuth-only user (no password_hash) in the database."""
    user = User(
        id=uuid.uuid4(),
        email="oauth-delete@example.com",
        password_hash=None,
        name="OAuth Delete User",
        tier="free",
        email_verified=True,
        oauth_provider="google",
        oauth_id="google_delete_12345",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def oauth_auth_headers(oauth_user: User) -> dict[str, str]:
    """Return Authorization headers for the OAuth test user."""
    token = create_access_token(oauth_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def mock_deletion_email():
    """Mock the deletion confirmation email function."""
    with patch(
        "app.routers.gdpr.send_deletion_confirmation_email",
        new_callable=AsyncMock,
    ) as mock_send:
        mock_send.return_value = True
        yield mock_send


# ═══════════════════════════════════════════════════════════════════════════
# POST /gdpr/request-deletion — Request Email-Based Deletion
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_request_deletion_oauth_user_success(
    client: AsyncClient,
    oauth_user: User,
    oauth_auth_headers: dict[str, str],
    mock_deletion_email: AsyncMock,
) -> None:
    """OAuth user can request deletion via email confirmation."""
    response = await client.post(
        "/gdpr/request-deletion",
        headers=oauth_auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "email" in data["message"].lower() or "confirmation" in data["message"].lower()

    # Email should have been sent
    mock_deletion_email.assert_called_once()
    call_args = mock_deletion_email.call_args
    assert call_args[0][0] == oauth_user.email  # first positional arg is email


@pytest.mark.asyncio
async def test_request_deletion_password_user_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    mock_deletion_email: AsyncMock,
) -> None:
    """Password users can also request deletion via email (alternative to password-based)."""
    response = await client.post(
        "/gdpr/request-deletion",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_request_deletion_unauthenticated(
    client: AsyncClient,
) -> None:
    """Unauthenticated requests should return 401."""
    response = await client.post("/gdpr/request-deletion")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_request_deletion_creates_audit_log(
    client: AsyncClient,
    oauth_user: User,
    oauth_auth_headers: dict[str, str],
    db_session: AsyncSession,
    mock_deletion_email: AsyncMock,
) -> None:
    """Requesting deletion should create a deletion_requested audit event."""
    response = await client.post(
        "/gdpr/request-deletion",
        headers=oauth_auth_headers,
    )
    assert response.status_code == 200

    audit_result = await db_session.execute(
        select(AuditLog).where(
            AuditLog.user_id == oauth_user.id,
            AuditLog.event_type == "deletion_requested",
        )
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None


@pytest.mark.asyncio
async def test_request_deletion_stores_hashed_token(
    client: AsyncClient,
    oauth_user: User,
    oauth_auth_headers: dict[str, str],
    db_session: AsyncSession,
    mock_deletion_email: AsyncMock,
) -> None:
    """Requesting deletion should store a hashed token on the user record."""
    response = await client.post(
        "/gdpr/request-deletion",
        headers=oauth_auth_headers,
    )
    assert response.status_code == 200

    await db_session.refresh(oauth_user)
    assert oauth_user.deletion_token_hash is not None
    assert oauth_user.deletion_token_expires is not None
    # Token should expire within 24 hours from now
    now = datetime.now(UTC).replace(tzinfo=None)
    assert oauth_user.deletion_token_expires > now
    assert oauth_user.deletion_token_expires < now + timedelta(hours=25)


@pytest.mark.asyncio
async def test_request_deletion_csrf_required(
    client_no_csrf: AsyncClient,
    oauth_user: User,
    oauth_auth_headers: dict[str, str],
) -> None:
    """POST /gdpr/request-deletion without CSRF header should return 403."""
    response = await client_no_csrf.post(
        "/gdpr/request-deletion",
        headers=oauth_auth_headers,
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "CSRF_HEADER_MISSING"


# ═══════════════════════════════════════════════════════════════════════════
# POST /gdpr/confirm-deletion — Confirm Deletion with Token
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_confirm_deletion_valid_token(
    client: AsyncClient,
    oauth_user: User,
    oauth_auth_headers: dict[str, str],
    db_session: AsyncSession,
    mock_deletion_email: AsyncMock,
) -> None:
    """Confirming deletion with a valid token should delete the account."""
    # Step 1: Request deletion to get a token
    response = await client.post(
        "/gdpr/request-deletion",
        headers=oauth_auth_headers,
    )
    assert response.status_code == 200

    # Extract the token from the mock email call
    call_args = mock_deletion_email.call_args
    token = call_args[0][1]  # second positional arg is the token

    # Step 2: Confirm deletion with the token
    response = await client.post(
        "/gdpr/confirm-deletion",
        json={"token": token},
    )
    assert response.status_code == 200
    data = response.json()
    assert "deleted" in data["message"].lower()

    # Verify user is gone from the database
    result = await db_session.execute(
        select(User).where(User.id == oauth_user.id)
    )
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_confirm_deletion_invalid_token(
    client: AsyncClient,
) -> None:
    """Confirming deletion with an invalid token should return 400."""
    response = await client.post(
        "/gdpr/confirm-deletion",
        json={"token": "invalid-token-value-that-does-not-exist"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "INVALID_TOKEN"


@pytest.mark.asyncio
async def test_confirm_deletion_expired_token(
    client: AsyncClient,
    oauth_user: User,
    db_session: AsyncSession,
) -> None:
    """Confirming deletion with an expired token should return 400 and NOT delete the user."""
    # Manually set an expired deletion token on the user
    token = "test-deletion-token-expired"
    oauth_user.deletion_token_hash = hash_token(token)
    oauth_user.deletion_token_expires = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=1)
    await db_session.commit()

    response = await client.post(
        "/gdpr/confirm-deletion",
        json={"token": token},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "INVALID_TOKEN"

    # Verify the user still exists in the database (expired token must NOT delete)
    result = await db_session.execute(
        select(User).where(User.id == oauth_user.id)
    )
    user_still_exists = result.scalar_one_or_none()
    assert user_still_exists is not None, "User should NOT be deleted when token is expired"


@pytest.mark.asyncio
async def test_confirm_deletion_creates_audit_log(
    client: AsyncClient,
    oauth_user: User,
    oauth_auth_headers: dict[str, str],
    db_session: AsyncSession,
    mock_deletion_email: AsyncMock,
) -> None:
    """Confirming deletion should create an account_deleted audit event."""
    # Request deletion
    response = await client.post(
        "/gdpr/request-deletion",
        headers=oauth_auth_headers,
    )
    assert response.status_code == 200

    # Extract token
    token = mock_deletion_email.call_args[0][1]

    # Confirm deletion
    response = await client.post(
        "/gdpr/confirm-deletion",
        json={"token": token},
    )
    assert response.status_code == 200

    # Verify audit log (user_id will be SET NULL after deletion)
    audit_result = await db_session.execute(
        select(AuditLog).where(AuditLog.event_type == "account_deleted")
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None


@pytest.mark.asyncio
async def test_confirm_deletion_token_cannot_be_reused(
    client: AsyncClient,
    oauth_user: User,
    oauth_auth_headers: dict[str, str],
    db_session: AsyncSession,
    mock_deletion_email: AsyncMock,
) -> None:
    """A deletion token should be single-use (user is deleted after first use)."""
    # Request deletion
    response = await client.post(
        "/gdpr/request-deletion",
        headers=oauth_auth_headers,
    )
    assert response.status_code == 200

    token = mock_deletion_email.call_args[0][1]

    # First confirmation succeeds
    response = await client.post(
        "/gdpr/confirm-deletion",
        json={"token": token},
    )
    assert response.status_code == 200

    # Second confirmation fails (user already deleted)
    response = await client.post(
        "/gdpr/confirm-deletion",
        json={"token": token},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_confirm_deletion_no_auth_required(
    client: AsyncClient,
    oauth_user: User,
    oauth_auth_headers: dict[str, str],
    db_session: AsyncSession,
    mock_deletion_email: AsyncMock,
) -> None:
    """Confirm-deletion endpoint does NOT require auth (the token IS the auth)."""
    # Request deletion (requires auth)
    response = await client.post(
        "/gdpr/request-deletion",
        headers=oauth_auth_headers,
    )
    assert response.status_code == 200

    token = mock_deletion_email.call_args[0][1]

    # Confirm WITHOUT auth headers — should still work
    response = await client.post(
        "/gdpr/confirm-deletion",
        json={"token": token},
        # No auth_headers
    )
    assert response.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# Updated behavior: DELETE /gdpr/account for OAuth users
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_delete_account_oauth_user_directs_to_email_flow(
    client: AsyncClient,
    oauth_user: User,
    oauth_auth_headers: dict[str, str],
) -> None:
    """DELETE /gdpr/account for OAuth users should return 400 with guidance to use email flow."""
    response = await client.request(
        "DELETE",
        "/gdpr/account",
        headers=oauth_auth_headers,
        json={"password": "anything"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "OAUTH_ACCOUNT"
    # Should mention the email-based deletion flow
    assert "request-deletion" in data["detail"]["error"].lower() or "email" in data["detail"]["error"].lower()


# ═══════════════════════════════════════════════════════════════════════════
# Edge cases
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_request_deletion_replaces_existing_token(
    client: AsyncClient,
    oauth_user: User,
    oauth_auth_headers: dict[str, str],
    db_session: AsyncSession,
    mock_deletion_email: AsyncMock,
) -> None:
    """Requesting deletion twice should replace the old token with a new one."""
    # First request
    response = await client.post(
        "/gdpr/request-deletion",
        headers=oauth_auth_headers,
    )
    assert response.status_code == 200
    first_token = mock_deletion_email.call_args[0][1]

    # Second request
    response = await client.post(
        "/gdpr/request-deletion",
        headers=oauth_auth_headers,
    )
    assert response.status_code == 200
    second_token = mock_deletion_email.call_args[0][1]

    # Tokens should be different
    assert first_token != second_token

    # Old token should NOT work
    response = await client.post(
        "/gdpr/confirm-deletion",
        json={"token": first_token},
    )
    assert response.status_code == 400

    # New token SHOULD work
    response = await client.post(
        "/gdpr/confirm-deletion",
        json={"token": second_token},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_confirm_deletion_missing_token_field(
    client: AsyncClient,
) -> None:
    """POST /gdpr/confirm-deletion without token field should return 422."""
    response = await client.post(
        "/gdpr/confirm-deletion",
        json={},
    )
    assert response.status_code == 422
