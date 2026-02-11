"""
Authentication service — password hashing, JWT creation/verification,
TOTP utilities, and token generation.

All cryptographic operations are centralized here so that routers
never touch raw secrets or hashing directly.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import pyotp
from jose import jwt
from passlib.context import CryptContext

from app.config import get_settings
from app.utils.security import constant_time_compare, generate_secure_token, hash_token

settings = get_settings()

# Bcrypt context — used for password hashing only.
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password Hashing ──────────────────────────────────────────────────────


async def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt.

    Runs in a thread pool to avoid blocking the async event loop.

    Args:
        password: The plaintext password to hash.

    Returns:
        Bcrypt hash string.
    """
    return await asyncio.to_thread(_pwd_context.hash, password)


async def verify_password(password: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash.

    Runs in a thread pool to avoid blocking the async event loop.

    Args:
        password: The candidate plaintext password.
        hashed: The stored bcrypt hash.

    Returns:
        True if the password matches the hash.
    """
    return await asyncio.to_thread(_pwd_context.verify, password, hashed)


# ── JWT Tokens ────────────────────────────────────────────────────────────


def create_access_token(user_id: uuid.UUID, tier: str) -> str:
    """Create a short-lived JWT access token.

    Args:
        user_id: The user's UUID (becomes the ``sub`` claim).
        tier: The user's current tier (embedded for fast authz checks).

    Returns:
        Encoded JWT string.
    """
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "tier": tier,
        "type": "access",
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: uuid.UUID) -> str:
    """Create a long-lived JWT refresh token.

    Args:
        user_id: The user's UUID.

    Returns:
        Encoded JWT string.
    """
    now = datetime.now(UTC)
    expire = now + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token.

    Args:
        token: The encoded JWT string.

    Returns:
        Decoded payload dict.

    Raises:
        JWTError: If the token is invalid, expired, or tampered with.
    """
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )


# ── TOTP / 2FA ────────────────────────────────────────────────────────────


def generate_totp_secret() -> str:
    """Generate a random base32 TOTP secret.

    Returns:
        Base32-encoded secret string.
    """
    return pyotp.random_base32()


def verify_totp(secret: str, code: str) -> bool:
    """Verify a 6-digit TOTP code against the secret.

    Accepts codes within +/-1 window (90-second tolerance).

    Args:
        secret: Base32-encoded TOTP secret.
        code: 6-digit code from authenticator app.

    Returns:
        True if the code is valid.
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def generate_qr_code_uri(secret: str, email: str) -> str:
    """Generate an otpauth:// URI for QR code rendering.

    Args:
        secret: Base32-encoded TOTP secret.
        email: User's email (used as the account name).

    Returns:
        otpauth:// URI string.
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name="Mergenix")


# ── One-Time Tokens ───────────────────────────────────────────────────────


def generate_email_verification_token() -> str:
    """Generate a cryptographically secure email verification token.

    Returns:
        URL-safe token string (32 bytes of entropy).
    """
    return generate_secure_token(length=32)


def generate_password_reset_token() -> str:
    """Generate a cryptographically secure password reset token.

    Returns:
        URL-safe token string (32 bytes of entropy).
    """
    return generate_secure_token(length=32)


# ── Password Validation ──────────────────────────────────────────────────


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets minimum strength requirements.

    Requirements:
        - At least 8 characters
        - At most 72 bytes (bcrypt limit)
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit

    Args:
        password: Password string to validate.

    Returns:
        Tuple of (is_valid, error_message). error_message is empty if valid.
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password.encode("utf-8")) > 72:
        return False, "Password is too long (max 72 bytes due to bcrypt limit)."
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit."
    return True, ""


# ── Backup Codes ─────────────────────────────────────────────────────────


def hash_backup_codes(codes: list[str]) -> list[str]:
    """Hash a list of plaintext backup codes using SHA-256.

    Args:
        codes: List of plaintext backup code strings.

    Returns:
        List of hex-encoded SHA-256 hashes.
    """
    return [hash_token(code) for code in codes]


def verify_and_consume_backup_code(
    user: object,
    code: str,
    stored_hashes: list[str],
) -> tuple[bool, list[str] | None]:
    """Verify a backup code against stored hashes using constant-time comparison.

    Checks ALL codes to prevent timing attacks, then consumes the match.

    Args:
        user: The user object (used for future extensibility).
        code: The plaintext backup code to verify.
        stored_hashes: List of SHA-256 hex hashes of remaining backup codes.

    Returns:
        Tuple of (matched, updated_hashes). If matched is True, updated_hashes
        is the list with the consumed code removed. If False, updated_hashes
        is None.
    """
    candidate_hash = hash_token(code)

    # Check ALL codes to prevent timing side-channel leaks.
    # We accumulate the matched index and verify all entries.
    matched_idx: int | None = None
    for idx, stored_hash in enumerate(stored_hashes):
        if constant_time_compare(candidate_hash, stored_hash):
            matched_idx = idx

    if matched_idx is not None:
        remaining = stored_hashes[:matched_idx] + stored_hashes[matched_idx + 1 :]
        return True, remaining

    return False, None
