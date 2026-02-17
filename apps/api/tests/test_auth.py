"""
Tests for the authentication endpoints.

These tests verify the core auth flows: registration, login, token refresh,
password management, email verification, 2FA setup, cookie-based auth,
session management, account deletion, and resend verification.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pyotp
import pytest
from app.models.audit import Session
from app.models.user import User
from app.services.auth_service import create_access_token, decode_token
from app.utils.security import hash_token
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Valid adult DOB for registration tests (25 years old)
_ADULT_DOB = (date.today().replace(year=date.today().year - 25)).isoformat()

# ── Registration ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, mock_email) -> None:
    """POST /auth/register should create a new user and return 201."""
    response = await client.post(
        "/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "SecurePass1",
            "name": "New User",
            "date_of_birth": _ADULT_DOB,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "message" in data
    assert "successful" in data["message"].lower()


@pytest.mark.asyncio
async def test_register_duplicate_email(
    client: AsyncClient,
    test_user: User,
    mock_email,
) -> None:
    """POST /auth/register with an existing email should return 409."""
    response = await client.post(
        "/auth/register",
        json={
            "email": test_user.email,
            "password": "SecurePass1",
            "name": "Duplicate User",
            "date_of_birth": _ADULT_DOB,
        },
    )
    assert response.status_code == 409
    data = response.json()
    assert data["detail"]["code"] == "REGISTRATION_FAILED"


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient) -> None:
    """POST /auth/register with a weak password should return 422."""
    response = await client.post(
        "/auth/register",
        json={
            "email": "weak@example.com",
            "password": "short",
            "name": "Weak Password User",
        },
    )
    assert response.status_code == 422


# ── Login ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_success(
    client: AsyncClient,
    test_user: User,
) -> None:
    """POST /auth/login with valid credentials should return access token."""
    response = await client.post(
        "/auth/login",
        json={
            "email": test_user.email,
            "password": "TestPass123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0


@pytest.mark.asyncio
async def test_login_wrong_password(
    client: AsyncClient,
    test_user: User,
) -> None:
    """POST /auth/login with wrong password should return 401."""
    response = await client.post(
        "/auth/login",
        json={
            "email": test_user.email,
            "password": "WrongPassword1",
        },
    )
    assert response.status_code == 401
    data = response.json()
    assert data["detail"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient) -> None:
    """POST /auth/login for a non-existent user should return 401."""
    response = await client.post(
        "/auth/login",
        json={
            "email": "nobody@example.com",
            "password": "SomePass123",
        },
    )
    assert response.status_code == 401


# ── Cookie-Based Auth ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_sets_refresh_cookie(
    client: AsyncClient,
    test_user: User,
) -> None:
    """POST /auth/login response should set a refresh_token httpOnly cookie."""
    response = await client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "TestPass123"},
    )
    assert response.status_code == 200

    # Check Set-Cookie header for refresh_token
    cookies = response.headers.get_list("set-cookie")
    refresh_cookies = [c for c in cookies if "refresh_token" in c]
    assert len(refresh_cookies) >= 1

    cookie_str = refresh_cookies[0]
    assert "httponly" in cookie_str.lower()
    assert "path=/auth" in cookie_str.lower()


@pytest.mark.asyncio
async def test_refresh_from_cookie(
    client: AsyncClient,
    user_with_session: tuple[User, str],
    auth_headers: dict[str, str],
) -> None:
    """POST /auth/refresh with a valid refresh_token cookie should return new tokens."""
    user, raw_refresh = user_with_session

    # Set the cookie on the client and call refresh
    client.cookies.set("refresh_token", raw_refresh)

    response = await client.post("/auth/refresh")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0

    # New refresh cookie should be set
    cookies = response.headers.get_list("set-cookie")
    refresh_cookies = [c for c in cookies if "refresh_token" in c]
    assert len(refresh_cookies) >= 1


@pytest.mark.asyncio
async def test_refresh_without_cookie(
    client: AsyncClient,
) -> None:
    """POST /auth/refresh with no cookie should return 401."""
    response = await client.post("/auth/refresh")
    assert response.status_code == 401
    data = response.json()
    assert data["detail"]["code"] == "REFRESH_TOKEN_MISSING"


@pytest.mark.asyncio
async def test_logout_clears_cookie(
    client: AsyncClient,
    user_with_session: tuple[User, str],
    auth_headers: dict[str, str],
) -> None:
    """POST /auth/logout should clear the refresh_token cookie."""
    user, raw_refresh = user_with_session

    client.cookies.set("refresh_token", raw_refresh)

    response = await client.post("/auth/logout", headers=auth_headers)
    assert response.status_code == 200

    # The cookie should be cleared (set to empty or max-age=0)
    cookies = response.headers.get_list("set-cookie")
    refresh_cookies = [c for c in cookies if "refresh_token" in c]
    assert len(refresh_cookies) >= 1
    # Deletion typically sets max-age=0 or expires in the past
    cookie_str = refresh_cookies[0].lower()
    assert 'max-age=0' in cookie_str or '="";' in cookie_str or "expires=" in cookie_str


# ── Token Refresh (legacy body-based test updated) ───────────────────────


@pytest.mark.asyncio
async def test_refresh_token(
    client: AsyncClient,
    test_user: User,
) -> None:
    """POST /auth/refresh with a valid refresh cookie returns new access token."""
    # Login to get refresh cookie set
    login_resp = await client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "TestPass123"},
    )
    assert login_resp.status_code == 200

    # Extract refresh token from cookies set by login
    # httpx AsyncClient should carry cookies from response
    refresh_resp = await client.post("/auth/refresh")
    assert refresh_resp.status_code == 200
    new_tokens = refresh_resp.json()
    assert "access_token" in new_tokens
    assert new_tokens["token_type"] == "bearer"


# ── Profile ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_profile(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /auth/me should return the authenticated user's profile."""
    response = await client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["name"] == test_user.name
    assert data["tier"] == test_user.tier


@pytest.mark.asyncio
async def test_get_profile_unauthenticated(client: AsyncClient) -> None:
    """GET /auth/me without a token should return 401."""
    response = await client.get("/auth/me")
    assert response.status_code in (401, 403)


# ── Password Change ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_change_password(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /auth/change-password should update the password."""
    response = await client.post(
        "/auth/change-password",
        headers=auth_headers,
        json={
            "old_password": "TestPass123",
            "new_password": "NewSecure456",
        },
    )
    assert response.status_code == 200

    # Verify new password works
    login_resp = await client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "NewSecure456"},
    )
    assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_current(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    """POST /auth/change-password with wrong old password should return 401."""
    response = await client.post(
        "/auth/change-password",
        headers=auth_headers,
        json={
            "old_password": "WrongOldPassword1",
            "new_password": "NewSecure456",
        },
    )
    assert response.status_code == 401


# ── 2FA ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_2fa_setup(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    """POST /auth/2fa/setup should return a TOTP secret and QR URI."""
    response = await client.post("/auth/2fa/setup", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "secret" in data
    assert "qr_code_uri" in data
    assert data["qr_code_uri"].startswith("otpauth://totp/")


@pytest.mark.asyncio
async def test_2fa_verify_invalid_code(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    """POST /auth/2fa/verify with an invalid code should return 400."""
    # First setup 2FA
    await client.post("/auth/2fa/setup", headers=auth_headers)

    # Try to verify with a bad code
    response = await client.post(
        "/auth/2fa/verify",
        headers=auth_headers,
        json={"code": "000000"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_2fa_verify_returns_backup_codes(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /auth/2fa/verify with a valid code should return backup codes."""
    # Setup 2FA first
    setup_resp = await client.post("/auth/2fa/setup", headers=auth_headers)
    assert setup_resp.status_code == 200
    secret = setup_resp.json()["secret"]

    # Generate a valid TOTP code
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()

    response = await client.post(
        "/auth/2fa/verify",
        headers=auth_headers,
        json={"code": valid_code},
    )
    assert response.status_code == 200
    data = response.json()
    assert "backup_codes" in data
    assert isinstance(data["backup_codes"], list)
    assert len(data["backup_codes"]) == 10


@pytest.mark.asyncio
async def test_2fa_verify_stores_hashed_codes(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """After 2FA verify, backup_codes in DB should be JSON of hashed values."""
    setup_resp = await client.post("/auth/2fa/setup", headers=auth_headers)
    secret = setup_resp.json()["secret"]

    totp = pyotp.TOTP(secret)
    valid_code = totp.now()

    verify_resp = await client.post(
        "/auth/2fa/verify",
        headers=auth_headers,
        json={"code": valid_code},
    )
    assert verify_resp.status_code == 200

    # Refresh user from DB
    await db_session.refresh(test_user)
    assert test_user.backup_codes is not None

    stored = test_user.backup_codes
    assert isinstance(stored, list)
    assert len(stored) == 10
    # Each value should be a SHA-256 hex hash (64 hex characters)
    for h in stored:
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)


@pytest.mark.asyncio
async def test_2fa_login_with_totp(
    client: AsyncClient,
    totp_user: tuple[User, str],
) -> None:
    """Login with 2FA-enabled user should require challenge, then succeed with TOTP code."""
    user, secret = totp_user

    # Step 1: Login should return 403 with 2FA_REQUIRED
    login_resp = await client.post(
        "/auth/login",
        json={"email": user.email, "password": "TotpPass123"},
    )
    assert login_resp.status_code == 403
    detail = login_resp.json()["detail"]
    assert detail["code"] == "2FA_REQUIRED"
    challenge_token = detail["challenge_token"]

    # Step 2: Complete 2FA login with valid TOTP code
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()

    twofa_resp = await client.post(
        "/auth/2fa/login",
        json={"challenge_token": challenge_token, "code": valid_code},
    )
    assert twofa_resp.status_code == 200
    data = twofa_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_2fa_login_sets_cookie(
    client: AsyncClient,
    totp_user: tuple[User, str],
) -> None:
    """2FA login completion should set a refresh_token cookie."""
    user, secret = totp_user

    login_resp = await client.post(
        "/auth/login",
        json={"email": user.email, "password": "TotpPass123"},
    )
    assert login_resp.status_code == 403
    challenge_token = login_resp.json()["detail"]["challenge_token"]

    totp = pyotp.TOTP(secret)
    valid_code = totp.now()

    twofa_resp = await client.post(
        "/auth/2fa/login",
        json={"challenge_token": challenge_token, "code": valid_code},
    )
    assert twofa_resp.status_code == 200

    cookies = twofa_resp.headers.get_list("set-cookie")
    refresh_cookies = [c for c in cookies if "refresh_token" in c]
    assert len(refresh_cookies) >= 1
    assert "httponly" in refresh_cookies[0].lower()


# ── Password Reset Flow ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_forgot_password_always_200(
    client: AsyncClient,
    mock_email,
) -> None:
    """POST /auth/forgot-password should always return 200 (anti-enumeration)."""
    # Non-existent email
    response = await client.post(
        "/auth/forgot-password",
        json={"email": "nonexistent@example.com"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_reset_password_invalid_token(
    client: AsyncClient,
) -> None:
    """POST /auth/reset-password with an invalid token should return 400."""
    response = await client.post(
        "/auth/reset-password",
        json={"token": "invalid-token-value", "new_password": "NewPass123"},
    )
    assert response.status_code == 400


# ── Session Management ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_sessions(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """After login, GET /auth/sessions should return at least 1 session."""
    # Login to create a session
    await client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "TestPass123"},
    )

    response = await client.get("/auth/sessions", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_list_sessions_multiple(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """Login from two user agents should create 2 sessions."""
    await client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "TestPass123"},
        headers={"User-Agent": "Mozilla/5.0 Chrome/120"},
    )
    await client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "TestPass123"},
        headers={"User-Agent": "Mozilla/5.0 Firefox/120"},
    )

    response = await client.get("/auth/sessions", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


@pytest.mark.asyncio
async def test_session_response_format(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """Session response should include expected fields."""
    await client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "TestPass123"},
    )

    response = await client.get("/auth/sessions", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

    session = data[0]
    assert "id" in session
    assert "device" in session
    assert "ip" in session
    assert "location" in session
    assert "last_active" in session
    assert "is_current" in session


@pytest.mark.asyncio
async def test_revoke_session(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """Revoking a non-current session should succeed with 200."""
    from app.services.auth_service import create_refresh_token as _crt

    # Create a second session in the DB (simulating another device)
    other_refresh = _crt(test_user.id)
    other_session = Session(
        user_id=test_user.id,
        refresh_token_hash=hash_token(other_refresh),
        expires_at=datetime.now(UTC) + timedelta(days=7),
        ip_address="10.0.0.1",
        user_agent="Other Browser",
    )
    db_session.add(other_session)
    await db_session.commit()
    await db_session.refresh(other_session)

    session_id = str(other_session.id)

    response = await client.delete(
        f"/auth/sessions/{session_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "revoked" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_revoke_current_session_fails(
    client: AsyncClient,
    user_with_session: tuple[User, str],
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """Revoking the current session should return 400."""
    user, raw_refresh = user_with_session
    client.cookies.set("refresh_token", raw_refresh)

    # Find the session ID by its token hash
    token_hash = hash_token(raw_refresh)
    result = await db_session.execute(
        select(Session).where(Session.refresh_token_hash == token_hash)
    )
    session_record = result.scalar_one()
    session_id = str(session_record.id)

    response = await client.delete(
        f"/auth/sessions/{session_id}",
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "CANNOT_REVOKE_CURRENT"


@pytest.mark.asyncio
async def test_revoke_other_users_session_fails(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    premium_user: User,
    db_session: AsyncSession,
) -> None:
    """Revoking another user's session should return 404."""
    from app.services.auth_service import create_refresh_token as _crt

    # Create a session for the premium user
    other_refresh = _crt(premium_user.id)
    other_session = Session(
        user_id=premium_user.id,
        refresh_token_hash=hash_token(other_refresh),
        expires_at=datetime.now(UTC) + timedelta(days=7),
        ip_address="10.0.0.2",
        user_agent="Other User Agent",
    )
    db_session.add(other_session)
    await db_session.commit()
    await db_session.refresh(other_session)

    # Try to revoke it as test_user
    response = await client.delete(
        f"/auth/sessions/{other_session.id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_revoke_all_sessions(
    client: AsyncClient,
    user_with_session: tuple[User, str],
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """DELETE /auth/sessions should revoke all except the current session."""
    user, raw_refresh = user_with_session
    client.cookies.set("refresh_token", raw_refresh)

    from app.services.auth_service import create_refresh_token as _crt

    # Add 2 extra sessions
    for i in range(2):
        extra_refresh = _crt(user.id)
        extra_session = Session(
            user_id=user.id,
            refresh_token_hash=hash_token(extra_refresh),
            expires_at=datetime.now(UTC) + timedelta(days=7),
            ip_address=f"10.0.0.{i + 10}",
            user_agent=f"Device-{i}",
        )
        db_session.add(extra_session)
    await db_session.commit()

    # Verify we have 3+ sessions
    result = await db_session.execute(
        select(Session).where(Session.user_id == user.id)
    )
    all_before = result.scalars().all()
    assert len(all_before) >= 3

    response = await client.delete("/auth/sessions", headers=auth_headers)
    assert response.status_code == 200

    # After revocation, only the current session should remain
    result = await db_session.execute(
        select(Session).where(Session.user_id == user.id)
    )
    remaining = result.scalars().all()
    assert len(remaining) == 1
    # Remaining session should be the current one
    assert remaining[0].refresh_token_hash == hash_token(raw_refresh)


@pytest.mark.asyncio
async def test_sessions_unauthenticated(client: AsyncClient) -> None:
    """GET /auth/sessions without auth should return 401."""
    response = await client.get("/auth/sessions")
    assert response.status_code in (401, 403)


# ── Delete Account ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_account_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """POST /auth/delete-account with correct password should delete the user."""
    user_id = test_user.id

    response = await client.post(
        "/auth/delete-account",
        headers=auth_headers,
        json={"password": "TestPass123"},
    )
    assert response.status_code == 200
    assert "deleted" in response.json()["message"].lower()

    # Verify user no longer exists
    result = await db_session.execute(select(User).where(User.id == user_id))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_account_wrong_password(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /auth/delete-account with wrong password should return 403."""
    response = await client.post(
        "/auth/delete-account",
        headers=auth_headers,
        json={"password": "WrongPassword1"},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "INVALID_PASSWORD"


@pytest.mark.asyncio
async def test_delete_account_clears_cookie(
    client: AsyncClient,
    user_with_session: tuple[User, str],
    auth_headers: dict[str, str],
) -> None:
    """POST /auth/delete-account should clear the refresh_token cookie."""
    user, raw_refresh = user_with_session
    client.cookies.set("refresh_token", raw_refresh)

    response = await client.post(
        "/auth/delete-account",
        headers=auth_headers,
        json={"password": "TestPass123"},
    )
    assert response.status_code == 200

    cookies = response.headers.get_list("set-cookie")
    refresh_cookies = [c for c in cookies if "refresh_token" in c]
    assert len(refresh_cookies) >= 1
    cookie_str = refresh_cookies[0].lower()
    assert 'max-age=0' in cookie_str or '="";' in cookie_str or "expires=" in cookie_str


@pytest.mark.asyncio
async def test_delete_account_cascades_sessions(
    client: AsyncClient,
    user_with_session: tuple[User, str],
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """After account deletion, user's sessions should also be gone."""
    user, raw_refresh = user_with_session
    user_id = user.id

    response = await client.post(
        "/auth/delete-account",
        headers=auth_headers,
        json={"password": "TestPass123"},
    )
    assert response.status_code == 200

    # Verify sessions are gone (CASCADE delete)
    result = await db_session.execute(
        select(Session).where(Session.user_id == user_id)
    )
    sessions = result.scalars().all()
    assert len(sessions) == 0


@pytest.mark.asyncio
async def test_delete_account_unauthenticated(client: AsyncClient) -> None:
    """POST /auth/delete-account without auth should return 401."""
    response = await client.post(
        "/auth/delete-account",
        json={"password": "whatever"},
    )
    assert response.status_code in (401, 403)


# ── Resend Verification ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_resend_verification_unverified_user(
    client: AsyncClient,
    unverified_user: User,
    mock_email,
) -> None:
    """POST /auth/resend-verification for an unverified email should return 200."""
    response = await client.post(
        "/auth/resend-verification",
        json={"email": unverified_user.email},
    )
    assert response.status_code == 200
    data = response.json()
    assert "verification" in data["message"].lower() or "sent" in data["message"].lower()


@pytest.mark.asyncio
async def test_resend_verification_nonexistent_email(
    client: AsyncClient,
    mock_email,
) -> None:
    """POST /auth/resend-verification for a non-existent email should still return 200."""
    response = await client.post(
        "/auth/resend-verification",
        json={"email": "doesnotexist@example.com"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_resend_verification_already_verified(
    client: AsyncClient,
    test_user: User,
    mock_email,
) -> None:
    """POST /auth/resend-verification for a verified user should still return 200."""
    response = await client.post(
        "/auth/resend-verification",
        json={"email": test_user.email},
    )
    assert response.status_code == 200


# ── Backup Code Login ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_2fa_login_with_backup_code(
    client: AsyncClient,
    totp_user: tuple[User, str],
    db_session: AsyncSession,
) -> None:
    """Login with a backup code should succeed and consume the code."""
    user, secret = totp_user
    backup_code = "abcd-ef01"  # First plaintext backup code from fixture

    # Step 1: Login should return 403 with 2FA_REQUIRED
    login_resp = await client.post(
        "/auth/login",
        json={"email": user.email, "password": "TotpPass123"},
    )
    assert login_resp.status_code == 403
    detail = login_resp.json()["detail"]
    assert detail["code"] == "2FA_REQUIRED"
    challenge_token = detail["challenge_token"]

    # Step 2: Complete 2FA login with backup code
    twofa_resp = await client.post(
        "/auth/2fa/login",
        json={"challenge_token": challenge_token, "code": backup_code},
    )
    assert twofa_resp.status_code == 200
    data = twofa_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0

    # Verify refresh cookie is set
    cookies = twofa_resp.headers.get_list("set-cookie")
    refresh_cookies = [c for c in cookies if "refresh_token" in c]
    assert len(refresh_cookies) >= 1

    # Step 3: Verify the backup code is consumed (cannot be reused)
    # Need a fresh challenge token since the old one was consumed
    login_resp2 = await client.post(
        "/auth/login",
        json={"email": user.email, "password": "TotpPass123"},
    )
    assert login_resp2.status_code == 403
    challenge_token2 = login_resp2.json()["detail"]["challenge_token"]

    twofa_resp2 = await client.post(
        "/auth/2fa/login",
        json={"challenge_token": challenge_token2, "code": backup_code},
    )
    # Should fail — the backup code was already consumed
    assert twofa_resp2.status_code == 401
    assert twofa_resp2.json()["detail"]["code"] == "INVALID_TOTP"


# ── Account Lockout ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_account_lockout_after_failed_attempts(
    client: AsyncClient,
    test_user: User,
) -> None:
    """After 5 failed login attempts the account should be locked (403)."""
    # Attempt login with wrong password 5 times
    for _ in range(5):
        resp = await client.post(
            "/auth/login",
            json={"email": test_user.email, "password": "WrongPassword1"},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"]["code"] == "INVALID_CREDENTIALS"

    # The 6th attempt should see the account locked
    resp = await client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "WrongPassword1"},
    )
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "ACCOUNT_LOCKED"

    # Even with the correct password, should still be locked
    resp = await client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "TestPass123"},
    )
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "ACCOUNT_LOCKED"


# ── Profile Update ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_profile(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """PUT /auth/me should update the user's name and persist it."""
    response = await client.put(
        "/auth/me",
        headers=auth_headers,
        json={"name": "Updated Name"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["email"] == test_user.email

    # Verify GET /auth/me also reflects the change
    get_resp = await client.get("/auth/me", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Updated Name"


# ── JWT Tier Claim Regression ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_access_token_does_not_contain_tier_claim(
    test_user: User,
) -> None:
    """Access tokens must NOT contain a 'tier' claim (regression test)."""
    token = create_access_token(test_user.id)
    payload = decode_token(token)

    assert "tier" not in payload
    assert "sub" in payload
    assert payload["type"] == "access"


@pytest.mark.asyncio
async def test_login_returns_token_without_tier_claim(
    client: AsyncClient,
    test_user: User,
) -> None:
    """POST /auth/login access_token must NOT contain a 'tier' claim (regression test)."""
    response = await client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPass123",
        },
    )
    assert response.status_code == 200
    access_token = response.json()["access_token"]

    payload = decode_token(access_token)

    assert "tier" not in payload
    assert "sub" in payload
    assert payload["type"] == "access"


# ── Naive Datetime (asyncpg) Regression ───────────────────────────────────


@pytest.mark.asyncio
async def test_utcnow_returns_naive_utc_datetime() -> None:
    """_utcnow() must return a naive datetime (no tzinfo) close to UTC now."""
    from app.routers.auth import _utcnow

    result = _utcnow()

    # Must be naive (no timezone info) — asyncpg requires this for
    # TIMESTAMP WITHOUT TIME ZONE columns.
    assert result.tzinfo is None

    # Sanity check: the value should be close to the current UTC time.
    # datetime.utcnow() is deprecated but useful here as a naive-UTC reference.
    now_naive = datetime.utcnow()
    delta = abs((result - now_naive).total_seconds())
    assert delta < 2, f"_utcnow() drifted {delta}s from datetime.utcnow()"


@pytest.mark.asyncio
async def test_login_stores_session_with_naive_datetime(
    client: AsyncClient,
    test_user: User,
    db_session: AsyncSession,
) -> None:
    """Login should persist a Session whose expires_at is a naive datetime."""
    response = await client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "TestPass123"},
    )
    assert response.status_code == 200

    # Query the session created for this user
    result = await db_session.execute(
        select(Session).where(Session.user_id == test_user.id)
    )
    sessions = result.scalars().all()
    assert len(sessions) >= 1

    session = sessions[0]
    assert session.expires_at.tzinfo is None, (
        f"Session.expires_at should be naive but has tzinfo={session.expires_at.tzinfo}"
    )
    if session.created_at is not None:
        assert session.created_at.tzinfo is None, (
            f"Session.created_at should be naive but has tzinfo={session.created_at.tzinfo}"
        )


@pytest.mark.asyncio
async def test_register_stores_verification_with_naive_datetime(
    client: AsyncClient,
    db_session: AsyncSession,
    mock_email,
) -> None:
    """Registration should persist an EmailVerification with naive expires_at."""
    from app.models.audit import EmailVerification

    response = await client.post(
        "/auth/register",
        json={
            "email": "naive_dt_test@example.com",
            "password": "SecurePass1",
            "name": "Naive DT Test",
            "date_of_birth": _ADULT_DOB,
        },
    )
    assert response.status_code == 201

    # Find the newly created user
    result = await db_session.execute(
        select(User).where(User.email == "naive_dt_test@example.com")
    )
    user = result.scalar_one()

    # Query EmailVerification for this user
    result = await db_session.execute(
        select(EmailVerification).where(EmailVerification.user_id == user.id)
    )
    verifications = result.scalars().all()
    assert len(verifications) >= 1

    verification = verifications[0]
    assert verification.expires_at.tzinfo is None, (
        f"EmailVerification.expires_at should be naive but has tzinfo={verification.expires_at.tzinfo}"
    )


@pytest.mark.asyncio
async def test_token_refresh_stores_session_with_naive_datetime(
    client: AsyncClient,
    user_with_session: tuple[User, str],
    db_session: AsyncSession,
) -> None:
    """After token refresh, the new Session.expires_at must be a naive datetime."""
    user, raw_refresh = user_with_session

    # Set the refresh token cookie and call refresh
    client.cookies.set("refresh_token", raw_refresh)
    response = await client.post("/auth/refresh")
    assert response.status_code == 200

    # The old session was rotated; query for the new one
    result = await db_session.execute(
        select(Session).where(Session.user_id == user.id)
    )
    sessions = result.scalars().all()
    assert len(sessions) >= 1

    new_session = sessions[0]
    assert new_session.expires_at.tzinfo is None, (
        f"Refreshed Session.expires_at should be naive but has tzinfo={new_session.expires_at.tzinfo}"
    )


@pytest.mark.asyncio
async def test_2fa_challenge_stores_session_with_naive_datetime(
    client: AsyncClient,
    totp_user: tuple[User, str],
    db_session: AsyncSession,
) -> None:
    """2FA challenge session (created on login with TOTP user) must have naive expires_at."""
    user, _secret = totp_user

    # Login with 2FA user — should return 403 with 2FA_REQUIRED
    login_resp = await client.post(
        "/auth/login",
        json={"email": user.email, "password": "TotpPass123"},
    )
    assert login_resp.status_code == 403
    detail = login_resp.json()["detail"]
    assert detail["code"] == "2FA_REQUIRED"

    # Query the challenge session created for this user
    result = await db_session.execute(
        select(Session).where(Session.user_id == user.id)
    )
    sessions = result.scalars().all()
    assert len(sessions) >= 1

    challenge_session = sessions[0]
    assert challenge_session.expires_at.tzinfo is None, (
        f"Challenge Session.expires_at should be naive but has tzinfo={challenge_session.expires_at.tzinfo}"
    )


# ── Fix 4: httpx connection pooling for OAuth ──────────────────────────


def test_oauth_httpx_client_is_module_level() -> None:
    """The OAuth callback should use a module-level httpx.AsyncClient for connection pooling.

    Creating a new httpx.AsyncClient per request wastes resources and
    prevents connection reuse. A module-level or app-lifetime client
    with connection limits should be used instead.
    """
    from app.routers import auth as auth_module

    assert hasattr(auth_module, "_oauth_http_client"), (
        "auth.py should define a module-level _oauth_http_client for connection pooling"
    )

    import httpx
    assert isinstance(auth_module._oauth_http_client, httpx.AsyncClient), (
        "_oauth_http_client should be an httpx.AsyncClient instance"
    )
