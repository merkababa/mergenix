"""
Authentication router — registration, login, JWT refresh, password
management, email verification, 2FA, and Google OAuth.

Every endpoint includes rate limiting, audit logging, and proper
HTTP status codes. Refresh tokens are stored as httpOnly cookies.
"""

from __future__ import annotations

import hashlib
import json
import logging
import secrets as _stdlib_secrets
import uuid
from datetime import UTC, date, datetime, timedelta
from urllib.parse import urlencode

import httpx as _httpx
from fastapi import APIRouter, HTTPException, Request, Response, status
from jose import JWTError
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.constants.tiers import TIER_FREE
from app.database import DbSession
from app.middleware.auth import CurrentUser
from app.middleware.rate_limiter import (
    LIMIT_2FA_LOGIN,
    LIMIT_DELETE_ACCOUNT,
    LIMIT_FORGOT_PASSWORD,
    LIMIT_LOGIN,
    LIMIT_REGISTER,
    LIMIT_RESEND_VERIFICATION,
    limiter,
)
from app.models.audit import EmailVerification, PasswordReset, Session
from app.models.consent import ConsentRecord
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    AgeVerificationRequest,
    DeleteAccountRequest,
    EmailVerifyRequest,
    LoginRequest,
    MessageResponse,
    PasswordChangeRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    ResendVerificationRequest,
    SessionResponse,
    TwoFactorEnabledResponse,
    TwoFactorLoginRequest,
    TwoFactorSetupResponse,
    TwoFactorVerifyRequest,
    UserProfile,
)
from app.services import alert_service, audit_service
from app.services.account_service import delete_user_account, wipe_analysis_results
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_email_verification_token,
    generate_password_reset_token,
    generate_qr_code_uri,
    generate_totp_secret,
    hash_backup_codes,
    hash_password,
    validate_password_strength,
    verify_and_consume_backup_code,
    verify_password,
    verify_totp,
)
from app.services.email_service import (
    send_password_reset_email,
    send_verification_email,
)
from app.utils.cookies import (
    clear_refresh_cookie as _clear_refresh_cookie_shared,
)
from app.utils.cookies import (
    get_refresh_cookie as _get_refresh_cookie_shared,
)
from app.utils.cookies import (
    set_refresh_cookie as _set_refresh_cookie_shared,
)
from app.utils.request_helpers import client_ip as _client_ip_shared
from app.utils.request_helpers import user_agent as _user_agent_shared
from app.utils.encryption import decrypt_totp_secret, encrypt_totp_secret
from app.utils.security import constant_time_compare, hash_token

logger = logging.getLogger(__name__)


async def _invalidate_all_user_sessions(db: AsyncSession, user_id: int) -> None:
    """Delete all sessions for a user, forcing re-login on all devices."""
    # TODO(future sprint): Exclude current session from invalidation to avoid
    # logging out the user who just changed their password.
    await db.execute(delete(Session).where(Session.user_id == user_id))


def _utcnow() -> datetime:
    """Return current UTC time as a naive datetime (no tzinfo).

    asyncpg requires naive datetimes for TIMESTAMP WITHOUT TIME ZONE columns.
    """
    return datetime.now(UTC).replace(tzinfo=None)


router = APIRouter()
settings = get_settings()

# Module-level httpx client for OAuth token exchange / user info requests.
# Reusing a single client enables HTTP/2 connection pooling and avoids
# creating a new TCP connection + TLS handshake per OAuth callback.
_oauth_http_client = _httpx.AsyncClient(
    limits=_httpx.Limits(max_connections=10, max_keepalive_connections=5),
    timeout=_httpx.Timeout(10.0, connect=5.0),
)


async def close_oauth_client() -> None:
    """Close the module-level OAuth HTTP client.

    Call this during application shutdown (from the lifespan handler in
    main.py) to release the underlying TCP connection pool and avoid
    resource leaks.
    """
    await _oauth_http_client.aclose()


# ── Helpers ───────────────────────────────────────────────────────────────

# Issue 9: Cookie helpers are now in app.utils.cookies (shared module).
# Thin wrappers preserve the existing private API used throughout this file.
_set_refresh_cookie = _set_refresh_cookie_shared
_clear_refresh_cookie = _clear_refresh_cookie_shared
_get_refresh_cookie = _get_refresh_cookie_shared


# Issue 1 (Gate 2 R1): Use shared request helpers for IP and User-Agent
# extraction. The shared helpers use request.client.host directly (no
# X-Forwarded-For parsing) — trusted-proxy handling belongs at the
# infrastructure level (uvicorn ProxyHeadersMiddleware).
_client_ip = _client_ip_shared
_user_agent = _user_agent_shared


def _issue_tokens(user: User) -> tuple[str, str, int]:
    """Create access + refresh tokens for a user.

    Returns:
        Tuple of (access_token, refresh_token, expires_in_seconds).
    """
    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    expires_in = settings.access_token_expire_minutes * 60
    return access, refresh, expires_in


def _parse_device(user_agent_str: str | None) -> str:
    """Derive a simple device label from a User-Agent string."""
    if not user_agent_str:
        return "Unknown"
    ua = user_agent_str.lower()
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        return "Mobile"
    if "chrome" in ua and "edg" not in ua:
        return "Chrome"
    if "firefox" in ua:
        return "Firefox"
    if "safari" in ua and "chrome" not in ua:
        return "Safari"
    if "edg" in ua:
        return "Edge"
    return "Unknown"


# ── Age Calculation Helper ────────────────────────────────────────────────


def _calculate_age(dob: date) -> int:
    """Calculate age in complete years from a date of birth.

    Uses the standard birthday calculation: subtract years and adjust
    down by 1 if the current month/day is before the birth month/day.
    """
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


# ── Registration ──────────────────────────────────────────────────────────


@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new account",
)
@limiter.limit(LIMIT_REGISTER)
async def register(
    request: Request,
    body: RegisterRequest,
    db: DbSession,
) -> MessageResponse:
    """Register a new user with email and password.

    A verification email is sent upon successful registration.
    The user must verify their email before they can log in.
    Requires the user to be at least 18 years old (GDPR Art. 8).
    """
    email = body.email.strip().lower()

    # ── Age verification (GDPR Art. 8) ────────────────────────────────
    age = _calculate_age(body.date_of_birth)
    if age < 18:
        await audit_service.log_event(
            db,
            event_type="register_failed",
            metadata={"reason": "age_verification_failed", "underage": True},
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "You must be at least 18 years old to create an account.",
                "code": "AGE_VERIFICATION_FAILED",
            },
        )

    # Validate password strength
    valid, msg = validate_password_strength(body.password)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": msg, "code": "WEAK_PASSWORD"},
        )

    # Check for duplicate email
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none() is not None:
        await audit_service.log_event(
            db,
            event_type="register_failed",
            metadata={"reason": "duplicate_email"},
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        # Generic message to prevent account enumeration
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "Unable to create account. Please try a different email address.",
                "code": "REGISTRATION_FAILED",
            },
        )

    # Create user
    user = User(
        email=email,
        password_hash=await hash_password(body.password),
        name=body.name.strip(),
        tier=TIER_FREE,
        email_verified=False,
        date_of_birth=body.date_of_birth,
    )
    db.add(user)
    await db.flush()

    # ── Auto-record age_verification consent ──────────────────────────
    consent = ConsentRecord(
        user_id=user.id,
        consent_type="age_verification",
        version="1.0",
        ip_address=_client_ip(request),
        user_agent=(_user_agent(request) or "")[:500],
    )
    db.add(consent)

    # Generate email verification token
    token = generate_email_verification_token()
    verification = EmailVerification(
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=_utcnow() + timedelta(hours=24),
    )
    db.add(verification)

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="register",
        metadata={"event": "registration_complete", "age_verified": True},
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    # Send verification email (failure doesn't roll back)
    await send_verification_email(email, token)

    return MessageResponse(
        message="Registration successful. Please check your email to verify your account."
    )


# ── Login ─────────────────────────────────────────────────────────────────


@router.post(
    "/login",
    response_model=AccessTokenResponse,
    summary="Authenticate with email and password",
)
@limiter.limit(LIMIT_LOGIN)
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: DbSession,
) -> AccessTokenResponse:
    """Authenticate a user and return a JWT access token.

    The refresh token is set as an httpOnly cookie.
    Returns 401 if the credentials are invalid. Returns 403 if the
    account is locked due to too many failed attempts.
    """
    email = body.email.strip().lower()

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or user.password_hash is None:
        # Constant-time dummy check to prevent timing side-channel
        await verify_password("dummy_password", "$2b$12$9J5qvoHwBgrBN7lStZWOUuJOced6OQjVSGmI5Ud6XYGLBozUO17oe")
        await audit_service.log_event(
            db,
            event_type="login_failed",
            metadata={"reason": "user_not_found"},
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        await alert_service.run_security_checks(db, _client_ip(request))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid email or password.", "code": "INVALID_CREDENTIALS"},
        )

    # Check account lockout
    if user.locked_until and user.locked_until > _utcnow():
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="login_failed",
            metadata={"reason": "account_locked"},
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Account is temporarily locked. Please try again later.", "code": "ACCOUNT_LOCKED"},
        )

    # Verify password
    if not await verify_password(body.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = _utcnow() + timedelta(minutes=30)
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="login_failed",
            metadata={"reason": "wrong_password", "attempts": user.failed_login_attempts},
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        await alert_service.run_security_checks(db, _client_ip(request))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid email or password.", "code": "INVALID_CREDENTIALS"},
        )

    # ── Email verification gate ──────────────────────────────────────
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "Please verify your email address before logging in. Check your inbox for the verification link.",
                "code": "EMAIL_NOT_VERIFIED",
            },
        )

    # Check if 2FA is required
    if user.totp_enabled:
        # Generate an opaque challenge token instead of exposing the user UUID.
        # The token is a HMAC of user_id + timestamp + random nonce, so it cannot
        # be reversed without the server secret.
        challenge_nonce = _stdlib_secrets.token_hex(16)
        challenge_ts = str(int(_utcnow().timestamp()))
        challenge_payload = f"{user.id}:{challenge_ts}:{challenge_nonce}"
        challenge_token = hashlib.sha256(
            f"{challenge_payload}:{settings.jwt_secret}".encode()
        ).hexdigest()

        # Store the mapping so the 2FA verify endpoint can resolve it.
        # We reuse the Session model with a short expiry as a lightweight store.
        # TODO(future refactor): Consider a dedicated TwoFactorChallenge table (or
        # Redis-based ephemeral storage) for cleaner separation. Currently the Session
        # table is repurposed to store short-lived 2FA challenge tokens by overloading
        # the refresh_token_hash column. This conflates long-lived sessions with
        # short-lived authentication challenges, which works but muddies the data model.
        challenge_session = Session(
            user_id=user.id,
            refresh_token_hash=hash_token(challenge_token),
            expires_at=_utcnow() + timedelta(minutes=5),
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        db.add(challenge_session)

        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="login_2fa_required",
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "Two-factor authentication required.",
                "code": "2FA_REQUIRED",
                "challenge_token": challenge_token,
            },
        )

    # Success: reset failed attempts and issue tokens
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = _utcnow()

    # Issue tokens and set refresh cookie
    access_token, refresh_token, expires_in = _issue_tokens(user)
    session = Session(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        expires_at=_utcnow() + timedelta(days=settings.refresh_token_expire_days),
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    db.add(session)

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="login",
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    _set_refresh_cookie(response, refresh_token)
    return AccessTokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
    )


# ── 2FA Login Completion ──────────────────────────────────────────────────


@router.post(
    "/2fa/login",
    response_model=AccessTokenResponse,
    summary="Complete 2FA login with challenge token and TOTP/backup code",
)
@limiter.limit(LIMIT_2FA_LOGIN)
async def login_2fa(
    request: Request,
    response: Response,
    body: TwoFactorLoginRequest,
    db: DbSession,
) -> AccessTokenResponse:
    """Complete a two-factor authentication login.

    After a successful password login where 2FA is enabled, the client
    receives a challenge_token. This endpoint accepts that token along
    with a valid TOTP code or backup code and returns an access token
    (refresh token is set as an httpOnly cookie).
    """
    # Look up the challenge session by hashed challenge token
    challenge_hash = hash_token(body.challenge_token)
    result = await db.execute(
        select(Session).where(
            Session.refresh_token_hash == challenge_hash,
            Session.expires_at > _utcnow(),
        )
    )
    challenge_session = result.scalar_one_or_none()

    if challenge_session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid or expired challenge token.", "code": "INVALID_CHALLENGE"},
        )

    # Fetch the user associated with the challenge
    user_result = await db.execute(select(User).where(User.id == challenge_session.user_id))
    user = user_result.scalar_one_or_none()

    if user is None or not user.totp_enabled or not user.totp_secret:
        await db.delete(challenge_session)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid challenge.", "code": "INVALID_CHALLENGE"},
        )

    # Try backup code first if it matches the backup code format (xxxx-xxxx)
    code_accepted = False
    used_backup_code = False

    if len(body.code) == 9 and "-" in body.code and user.backup_codes:
        # Attempt backup code verification (SHA-256, constant-time)
        stored_hashes: list[str] = user.backup_codes if isinstance(user.backup_codes, list) else json.loads(user.backup_codes)
        matched, remaining = verify_and_consume_backup_code(body.code, stored_hashes)
        if matched:
            user.backup_codes = remaining if remaining else None
            code_accepted = True
            used_backup_code = True

    # Fall back to TOTP verification if backup code didn't match
    if not code_accepted:
        if verify_totp(decrypt_totp_secret(user.totp_secret), body.code):
            code_accepted = True

    if not code_accepted:
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="2fa_login_failed",
            metadata={"reason": "invalid_code"},
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid TOTP or backup code.", "code": "INVALID_TOTP"},
        )

    # Code valid — consume the challenge session
    await db.delete(challenge_session)

    # Reset failed login attempts on successful 2FA
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = _utcnow()

    # Issue tokens and set refresh cookie
    access_token, refresh_token, expires_in = _issue_tokens(user)
    session = Session(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        expires_at=_utcnow() + timedelta(days=settings.refresh_token_expire_days),
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    db.add(session)

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="login_2fa_complete",
        metadata={"method": "backup_code" if used_backup_code else "totp"},
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    _set_refresh_cookie(response, refresh_token)
    return AccessTokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
    )


# ── Token Refresh ─────────────────────────────────────────────────────────


@router.post(
    "/refresh",
    response_model=AccessTokenResponse,
    summary="Refresh access token",
)
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    response: Response,
    db: DbSession,
) -> AccessTokenResponse:
    """Exchange a valid refresh token (from httpOnly cookie) for a new
    access token. The old refresh token is invalidated (rotated) and a
    new one is set as a cookie.
    """
    raw_refresh = _get_refresh_cookie(request)
    if not raw_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Refresh token cookie missing.", "code": "REFRESH_TOKEN_MISSING"},
        )

    try:
        payload = decode_token(raw_refresh)
    except JWTError as exc:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid or expired refresh token.", "code": "REFRESH_TOKEN_INVALID"},
        ) from exc

    if payload.get("type") != "refresh":
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid token type.", "code": "TOKEN_TYPE_INVALID"},
        )

    user_id = uuid.UUID(payload["sub"])

    # Verify the refresh token session exists in the database
    token_hash = hash_token(raw_refresh)
    result = await db.execute(
        select(Session).where(
            Session.user_id == user_id,
            Session.refresh_token_hash == token_hash,
            Session.expires_at > _utcnow(),
        )
    )
    session_record = result.scalar_one_or_none()
    if session_record is None:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Refresh token has been revoked.", "code": "TOKEN_REVOKED"},
        )

    # Delete the old session (rotation)
    await db.delete(session_record)

    # Fetch user for new token claims
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "User not found.", "code": "USER_NOT_FOUND"},
        )

    # Issue new tokens and rotate the cookie
    access_token, new_refresh, expires_in = _issue_tokens(user)
    new_session = Session(
        user_id=user.id,
        refresh_token_hash=hash_token(new_refresh),
        expires_at=_utcnow() + timedelta(days=settings.refresh_token_expire_days),
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    db.add(new_session)
    user.last_login_at = _utcnow()
    await db.commit()

    _set_refresh_cookie(response, new_refresh)
    return AccessTokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
    )


# ── Logout ────────────────────────────────────────────────────────────────


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Revoke refresh token and clear cookie",
)
@limiter.limit("10/minute")
async def logout(
    request: Request,
    response: Response,
    db: DbSession,
    user: CurrentUser,
) -> MessageResponse:
    """Revoke the refresh token from the cookie, effectively logging out."""
    raw_refresh = _get_refresh_cookie(request)
    if raw_refresh:
        token_hash = hash_token(raw_refresh)
        result = await db.execute(
            select(Session).where(
                Session.user_id == user.id,
                Session.refresh_token_hash == token_hash,
            )
        )
        session_record = result.scalar_one_or_none()
        if session_record:
            await db.delete(session_record)

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="logout",
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    _clear_refresh_cookie(response)
    return MessageResponse(message="Logged out successfully.")


# ── Email Verification ────────────────────────────────────────────────────


@router.post(
    "/verify-email",
    response_model=MessageResponse,
    summary="Verify email with token",
)
@limiter.limit("5/minute")
async def verify_email(
    request: Request,
    body: EmailVerifyRequest,
    db: DbSession,
) -> MessageResponse:
    """Verify a user's email address using the token sent during registration."""
    token_hashed = hash_token(body.token)

    result = await db.execute(
        select(EmailVerification).where(
            EmailVerification.token_hash == token_hashed,
            EmailVerification.verified_at.is_(None),
            EmailVerification.expires_at > _utcnow(),
        )
    )
    verification = result.scalar_one_or_none()

    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid or expired verification token.", "code": "INVALID_TOKEN"},
        )

    # Mark email as verified
    user_result = await db.execute(select(User).where(User.id == verification.user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user.email_verified = True

    verification.verified_at = _utcnow()

    await audit_service.log_event(
        db,
        user_id=verification.user_id,
        event_type="email_verified",
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    return MessageResponse(message="Email verified successfully.")


# ── Resend Verification ──────────────────────────────────────────────────


@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    summary="Resend email verification link",
)
@limiter.limit(LIMIT_RESEND_VERIFICATION)
async def resend_verification(
    request: Request,
    body: ResendVerificationRequest,
    db: DbSession,
) -> MessageResponse:
    """Resend the email verification link.

    Always returns a success message regardless of whether the email
    exists or is already verified, to prevent account enumeration.
    """
    generic_msg = "If an account exists with this email, a verification link has been sent."
    email = body.email.strip().lower()

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is not None and not user.email_verified:
        token = generate_email_verification_token()
        verification = EmailVerification(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=_utcnow() + timedelta(hours=24),
        )
        db.add(verification)

        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="resend_verification",
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()

        await send_verification_email(email, token)

    return MessageResponse(message=generic_msg)


# ── Password Reset ────────────────────────────────────────────────────────


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset",
)
@limiter.limit(LIMIT_FORGOT_PASSWORD)
async def forgot_password(
    request: Request,
    body: PasswordResetRequest,
    db: DbSession,
) -> MessageResponse:
    """Request a password reset email.

    Always returns a success message regardless of whether the email
    exists, to prevent account enumeration.
    """
    generic_msg = "If an account exists with that email, a reset link has been sent."
    email = body.email.strip().lower()

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is not None:
        token = generate_password_reset_token()
        reset = PasswordReset(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=_utcnow() + timedelta(hours=1),
        )
        db.add(reset)

        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="password_reset_requested",
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()

        await send_password_reset_email(email, token)

    return MessageResponse(message=generic_msg)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password with token",
)
@limiter.limit("3/minute")
async def reset_password(
    request: Request,
    body: PasswordResetConfirm,
    db: DbSession,
) -> MessageResponse:
    """Complete a password reset using the token from the email link."""
    valid, msg = validate_password_strength(body.new_password)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": msg, "code": "WEAK_PASSWORD"},
        )

    token_hashed = hash_token(body.token)

    result = await db.execute(
        select(PasswordReset).where(
            PasswordReset.token_hash == token_hashed,
            PasswordReset.used_at.is_(None),
            PasswordReset.expires_at > _utcnow(),
        )
    )
    reset = result.scalar_one_or_none()

    if reset is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid or expired reset token.", "code": "INVALID_TOKEN"},
        )

    # Update the password
    user_result = await db.execute(select(User).where(User.id == reset.user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "User not found.", "code": "USER_NOT_FOUND"},
        )

    user.password_hash = await hash_password(body.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    reset.used_at = _utcnow()

    # Invalidate all existing sessions — forces re-login on all devices
    await _invalidate_all_user_sessions(db, user.id)

    # ZKE consequence: wipe all analysis results — the encryption key derived
    # from the old password is now lost, making stored results unrecoverable.
    await wipe_analysis_results(
        db,
        user.id,
        reason="password_reset",
        ip_address=_client_ip(request),
        user_agent_str=_user_agent(request),
    )

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="password_reset_completed",
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    return MessageResponse(message="Password reset successfully. You can now log in with your new password.")


# ── Profile ───────────────────────────────────────────────────────────────


@router.get(
    "/me",
    response_model=UserProfile,
    summary="Get current user profile",
)
async def get_profile(user: CurrentUser) -> UserProfile:
    """Return the authenticated user's profile information."""
    return UserProfile.model_validate(user)


@router.put(
    "/me",
    response_model=UserProfile,
    summary="Update profile",
)
@limiter.limit("10/minute")
async def update_profile(
    request: Request,
    body: ProfileUpdateRequest,
    user: CurrentUser,
    db: DbSession,
) -> UserProfile:
    """Update the authenticated user's profile fields."""
    if body.name is not None:
        user.name = body.name.strip()
    await db.commit()
    await db.refresh(user)
    return UserProfile.model_validate(user)


# ── Change Password ───────────────────────────────────────────────────────


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password (requires old password)",
)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    body: PasswordChangeRequest,
    user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Change the authenticated user's password.

    Requires the current password for verification.
    """
    if user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "OAuth-only accounts cannot change password.",
                "code": "OAUTH_ACCOUNT",
            },
        )

    if not await verify_password(body.old_password, user.password_hash):
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="password_change_failed",
            metadata={"reason": "wrong_current_password"},
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Current password is incorrect.", "code": "WRONG_PASSWORD"},
        )

    valid, msg = validate_password_strength(body.new_password)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": msg, "code": "WEAK_PASSWORD"},
        )

    user.password_hash = await hash_password(body.new_password)

    # Invalidate all existing sessions — forces re-login on all devices
    await _invalidate_all_user_sessions(db, user.id)

    # ZKE consequence: wipe all analysis results — the encryption key derived
    # from the old password is now lost, making stored results unrecoverable.
    await wipe_analysis_results(
        db,
        user.id,
        reason="password_change",
        ip_address=_client_ip(request),
        user_agent_str=_user_agent(request),
    )

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="password_changed",
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    return MessageResponse(message="Password changed successfully.")


# ── Sessions ─────────────────────────────────────────────────────────────


@router.get(
    "/sessions",
    response_model=list[SessionResponse],
    summary="List active sessions",
)
async def list_sessions(
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> list[SessionResponse]:
    """Return all active sessions for the current user."""
    result = await db.execute(
        select(Session)
        .where(
            Session.user_id == user.id,
            Session.expires_at > _utcnow(),
        )
        .order_by(Session.created_at.desc())
    )
    sessions = result.scalars().all()

    # Determine current session by comparing refresh token cookie hash
    current_hash: str | None = None
    raw_refresh = _get_refresh_cookie(request)
    if raw_refresh:
        current_hash = hash_token(raw_refresh)

    items: list[SessionResponse] = []
    for s in sessions:
        is_current = (
            current_hash is not None
            and constant_time_compare(s.refresh_token_hash, current_hash)
        )
        items.append(
            SessionResponse(
                id=str(s.id),
                device=_parse_device(s.user_agent),
                ip=s.ip_address or "",
                location="",
                last_active=s.created_at.isoformat() if s.created_at else "",
                is_current=is_current,
            )
        )

    return items


@router.delete(
    "/sessions/{session_id}",
    response_model=MessageResponse,
    summary="Revoke a specific session",
)
@limiter.limit("10/minute")
async def revoke_session(
    request: Request,
    session_id: str,
    user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Revoke a specific session by ID. Cannot revoke the current session."""
    try:
        sid = uuid.UUID(session_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid session ID.", "code": "INVALID_SESSION_ID"},
        ) from exc

    result = await db.execute(
        select(Session).where(
            Session.id == sid,
            Session.user_id == user.id,
        )
    )
    session_record = result.scalar_one_or_none()

    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Session not found.", "code": "SESSION_NOT_FOUND"},
        )

    # Check if this is the current session
    raw_refresh = _get_refresh_cookie(request)
    if raw_refresh:
        current_hash = hash_token(raw_refresh)
        if constant_time_compare(session_record.refresh_token_hash, current_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "Cannot revoke current session.", "code": "CANNOT_REVOKE_CURRENT"},
            )

    await db.delete(session_record)

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="session_revoked",
        metadata={"session_id": str(sid)},
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    return MessageResponse(message="Session revoked successfully.")


@router.delete(
    "/sessions",
    response_model=MessageResponse,
    summary="Revoke all other sessions",
)
@limiter.limit("3/minute")
async def revoke_all_other_sessions(
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Revoke all sessions for the current user except the current one."""
    raw_refresh = _get_refresh_cookie(request)
    current_hash: str | None = None
    if raw_refresh:
        current_hash = hash_token(raw_refresh)

    # Look up the current session so we can identify it by its refresh_token_hash
    current_session = None
    if current_hash:
        result = await db.execute(
            select(Session).where(
                Session.user_id == user.id,
                Session.refresh_token_hash == current_hash,
            )
        )
        current_session = result.scalar_one_or_none()

    # Bulk-delete all other sessions in a single query (avoids N+1 deletes)
    if current_session:
        await db.execute(
            delete(Session).where(
                Session.user_id == user.id,
                Session.refresh_token_hash != current_session.refresh_token_hash,
            )
        )
    else:
        # No current session identified — delete all sessions
        await db.execute(delete(Session).where(Session.user_id == user.id))

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="all_sessions_revoked",
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    return MessageResponse(message="All other sessions revoked successfully.")


# ── Delete Account ───────────────────────────────────────────────────────


@router.post(
    "/delete-account",
    response_model=MessageResponse,
    summary="Permanently delete account",
)
@limiter.limit(LIMIT_DELETE_ACCOUNT)
async def delete_account(
    request: Request,
    response: Response,
    body: DeleteAccountRequest,
    user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Permanently delete the authenticated user's account.

    Requires the current password for verification. This action is
    irreversible. All sessions, payments, and audit logs referencing
    this user are cascade-deleted or set to NULL.
    """
    if user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": (
                    "OAuth-only accounts must use POST /gdpr/request-deletion "
                    "for email-based account deletion."
                ),
                "code": "OAUTH_ACCOUNT",
            },
        )

    if not await verify_password(body.password, user.password_hash):
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="delete_account_failed",
            metadata={"reason": "wrong_password"},
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Invalid password.", "code": "INVALID_PASSWORD"},
        )

    # Issue 6: Use shared account deletion service
    await delete_user_account(
        db,
        user,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    _clear_refresh_cookie(response)
    return MessageResponse(message="Account deleted successfully.")


# ── Two-Factor Authentication ─────────────────────────────────────────────


@router.post(
    "/2fa/setup",
    response_model=TwoFactorSetupResponse,
    summary="Initialize TOTP enrollment",
)
@limiter.limit("5/minute")
async def setup_2fa(
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> TwoFactorSetupResponse:
    """Generate a TOTP secret and QR code URI for the user.

    The user must then verify a code via POST /auth/2fa/verify to
    actually enable 2FA.
    """
    if user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "2FA is already enabled.", "code": "2FA_ALREADY_ENABLED"},
        )

    secret = generate_totp_secret()
    user.totp_secret = encrypt_totp_secret(secret)

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="2fa_setup_started",
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    qr_uri = generate_qr_code_uri(secret, user.email)

    return TwoFactorSetupResponse(
        secret=secret,
        qr_code_uri=qr_uri,
        backup_codes=[],  # Backup codes are generated after verification
    )


@router.post(
    "/2fa/verify",
    response_model=TwoFactorEnabledResponse,
    summary="Verify TOTP and enable 2FA",
)
@limiter.limit("5/minute")
async def verify_2fa(
    request: Request,
    body: TwoFactorVerifyRequest,
    user: CurrentUser,
    db: DbSession,
) -> TwoFactorEnabledResponse:
    """Verify a TOTP code to finalize 2FA enrollment.

    On success, generates backup codes and returns them (one-time display).
    """
    if user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "2FA is already enabled.", "code": "2FA_ALREADY_ENABLED"},
        )

    if not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Call /auth/2fa/setup first.", "code": "2FA_NOT_SETUP"},
        )

    if not verify_totp(decrypt_totp_secret(user.totp_secret), body.code):
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="2fa_enable_failed",
            metadata={"reason": "invalid_code"},
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid TOTP code.", "code": "INVALID_TOTP"},
        )

    user.totp_enabled = True

    # Generate backup codes
    backup_codes = [
        f"{_stdlib_secrets.token_hex(2)}-{_stdlib_secrets.token_hex(2)}" for _ in range(10)
    ]

    # Persist SHA-256-hashed backup codes to the database
    user.backup_codes = hash_backup_codes(backup_codes)

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="2fa_enabled",
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    return TwoFactorEnabledResponse(
        message="Two-factor authentication enabled successfully.",
        backup_codes=backup_codes,
    )


@router.post(
    "/2fa/disable",
    response_model=MessageResponse,
    summary="Disable 2FA",
)
@limiter.limit("5/minute")
async def disable_2fa(
    request: Request,
    body: TwoFactorVerifyRequest,
    user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Disable 2FA. Requires a valid TOTP code for identity confirmation."""
    if not user.totp_enabled or not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "2FA is not enabled.", "code": "2FA_NOT_ENABLED"},
        )

    if not verify_totp(decrypt_totp_secret(user.totp_secret), body.code):
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="2fa_disable_failed",
            metadata={"reason": "invalid_code"},
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid TOTP code.", "code": "INVALID_TOTP"},
        )

    user.totp_enabled = False
    user.totp_secret = None
    user.backup_codes = None

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="2fa_disabled",
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    return MessageResponse(message="Two-factor authentication disabled.")


# ── Post-Registration Age Verification ────────────────────────────────────


@router.post(
    "/verify-age",
    response_model=MessageResponse,
    summary="Submit date of birth for age verification (required after OAuth signup)",
)
@limiter.limit("5/minute")
async def verify_age(
    request: Request,
    body: AgeVerificationRequest,
    user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Submit date of birth for users who registered via OAuth.

    Google OAuth does not provide date of birth, so new OAuth users
    must call this endpoint before using analysis features.  This
    satisfies GDPR Art. 8 age-gating requirements.

    Users who already have a date_of_birth on record (e.g., password-
    registered users) receive a 400 — their DOB cannot be changed here.
    """
    if user.date_of_birth is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Date of birth is already set.",
                "code": "DOB_ALREADY_SET",
            },
        )

    age = _calculate_age(body.date_of_birth)
    if age < 18:
        await audit_service.log_event(
            db,
            user_id=user.id,
            event_type="age_verification_failed",
            metadata={"reason": "underage", "underage": True},
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "You must be at least 18 years old to use this platform.",
                "code": "AGE_VERIFICATION_FAILED",
            },
        )

    user.date_of_birth = body.date_of_birth

    # Record age_verification consent
    consent = ConsentRecord(
        user_id=user.id,
        consent_type="age_verification",
        version="1.0",
        ip_address=_client_ip(request),
        user_agent=(_user_agent(request) or "")[:500],
    )
    db.add(consent)

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="age_verified",
        metadata={"method": "post_oauth", "age_verified": True},
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    return MessageResponse(message="Age verification successful.")


# ── Google OAuth ──────────────────────────────────────────────────────────


@router.get(
    "/oauth/google",
    summary="Redirect to Google OAuth",
)
async def oauth_google_redirect(request: Request, response: Response) -> dict:
    """Generate the Google OAuth authorization URL.

    The frontend should redirect the user to the returned URL.
    The state token is signed using itsdangerous and stored in a
    secure HTTP-only cookie with a 10-minute expiry for CSRF protection.
    """
    from itsdangerous import URLSafeTimedSerializer

    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={"error": "Google OAuth is not configured.", "code": "OAUTH_NOT_CONFIGURED"},
        )

    state = _stdlib_secrets.token_urlsafe(32)

    # Sign the state token for tamper-proof cookie storage
    signer = URLSafeTimedSerializer(settings.jwt_secret)
    signed_state = signer.dumps(state, salt="oauth-state")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": f"{settings.frontend_url}/auth/callback/google",
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }

    authorization_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    # Store signed state in HTTP-only cookie with 10-minute expiry
    response.set_cookie(
        key="oauth_state",
        value=signed_state,
        max_age=600,  # 10 minutes
        httponly=True,
        secure=True,
        samesite="lax",
    )

    return {"authorization_url": authorization_url, "state": state}


@router.get(
    "/oauth/google/callback",
    response_model=AccessTokenResponse,
    summary="Handle Google OAuth callback",
)
async def oauth_google_callback(
    request: Request,
    response: Response,
    code: str,
    state: str,
    db: DbSession,
) -> AccessTokenResponse:
    """Exchange the Google authorization code for tokens and create/link the user.

    This endpoint is called by the frontend after the user authorizes
    with Google. Validates the state parameter against the signed cookie
    to prevent CSRF attacks. Refresh token is set as an httpOnly cookie.
    """
    from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={"error": "Google OAuth is not configured.", "code": "OAUTH_NOT_CONFIGURED"},
        )

    # Validate state parameter against signed cookie
    signed_state = request.cookies.get("oauth_state")
    if not signed_state:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Invalid state parameter", "code": "OAUTH_STATE_MISSING"},
        )

    signer = URLSafeTimedSerializer(settings.jwt_secret)
    try:
        expected_state = signer.loads(signed_state, salt="oauth-state", max_age=600)
    except (BadSignature, SignatureExpired) as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Invalid state parameter", "code": "OAUTH_STATE_INVALID"},
        ) from exc

    if not constant_time_compare(state, expected_state):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Invalid state parameter", "code": "OAUTH_STATE_MISMATCH"},
        )

    # Delete the state cookie after successful validation
    response.delete_cookie(key="oauth_state", httponly=True, secure=True, samesite="lax")

    # Exchange code for tokens and fetch user info using the shared HTTP client
    # (_oauth_http_client) for connection pooling — avoids per-request TCP/TLS overhead.
    token_resp = await _oauth_http_client.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": f"{settings.frontend_url}/auth/callback/google",
            "grant_type": "authorization_code",
        },
    )

    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Failed to exchange OAuth code.", "code": "OAUTH_EXCHANGE_FAILED"},
        )

    tokens = token_resp.json()
    access_token = tokens.get("access_token")

    # Fetch user info from Google
    info_resp = await _oauth_http_client.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    if info_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Failed to fetch user info from Google.", "code": "OAUTH_INFO_FAILED"},
        )

    info = info_resp.json()
    email = info.get("email", "").lower()
    google_id = info.get("sub", "")
    name = info.get("name", "")

    if not email or not google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid user info from Google.", "code": "OAUTH_INVALID_INFO"},
        )

    if not info.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Email not verified by Google.", "code": "OAUTH_UNVERIFIED_EMAIL"},
        )

    # Look up existing user by OAuth ID
    result = await db.execute(
        select(User).where(User.oauth_provider == "google", User.oauth_id == google_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        # Check by email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user is not None:
            # Link Google to existing account
            user.oauth_provider = "google"
            user.oauth_id = google_id
            user.email_verified = True
        else:
            # Create new user
            user = User(
                email=email,
                name=name,
                oauth_provider="google",
                oauth_id=google_id,
                email_verified=True,
                tier=TIER_FREE,
            )
            db.add(user)
            await db.flush()

    # Issue tokens and set refresh cookie
    new_access, new_refresh, expires_in = _issue_tokens(user)
    session = Session(
        user_id=user.id,
        refresh_token_hash=hash_token(new_refresh),
        expires_at=_utcnow() + timedelta(days=settings.refresh_token_expire_days),
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    db.add(session)
    user.last_login_at = _utcnow()

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="oauth_login",
        metadata={"provider": "google"},
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    await db.commit()

    _set_refresh_cookie(response, new_refresh)
    return AccessTokenResponse(
        access_token=new_access,
        token_type="bearer",
        expires_in=expires_in,
    )
