"""
Authentication schemas — request and response models for auth endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

# ── Requests ──────────────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    """Create a new user account."""

    email: EmailStr
    password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="Password (8-72 chars, must include upper, lower, digit)",
    )
    name: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="User's display name",
    )


class LoginRequest(BaseModel):
    """Authenticate with email and password."""

    email: EmailStr
    password: str = Field(..., min_length=1)


class TwoFactorVerifyRequest(BaseModel):
    """Submit a TOTP code for 2FA verification."""

    code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-digit TOTP code from authenticator app",
    )


class PasswordResetRequest(BaseModel):
    """Request a password reset link."""

    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Complete password reset with token and new password."""

    token: str = Field(..., min_length=1)
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="New password (8-72 chars, must include upper, lower, digit)",
    )


class PasswordChangeRequest(BaseModel):
    """Change password for an already-authenticated user."""

    old_password: str = Field(..., min_length=1)
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="New password (8-72 chars, must include upper, lower, digit)",
    )


class ProfileUpdateRequest(BaseModel):
    """Update user profile fields."""

    name: str | None = Field(None, min_length=2, max_length=255)


class TwoFactorLoginRequest(BaseModel):
    """Complete 2FA login with challenge token and TOTP/backup code."""

    challenge_token: str = Field(
        ...,
        min_length=1,
        description="Opaque challenge token received from the login endpoint when 2FA is required",
    )
    code: str = Field(
        ...,
        min_length=6,
        max_length=9,
        pattern=r"^(\d{6}|[0-9a-f]{4}-[0-9a-f]{4})$",
        description="6-digit TOTP code or xxxx-xxxx backup code",
    )


class EmailVerifyRequest(BaseModel):
    """Verify email address with a token."""

    token: str = Field(..., min_length=1)


# ── Responses ─────────────────────────────────────────────────────────────


class TwoFactorSetupResponse(BaseModel):
    """Returned when a user initiates TOTP enrollment."""

    secret: str = Field(
        ...,
        description="Base32-encoded TOTP secret for manual entry",
    )
    qr_code_uri: str = Field(
        ...,
        description="otpauth:// URI for QR code generation",
    )
    backup_codes: list[str] = Field(
        ...,
        description="One-time backup codes (display once, then discard)",
    )


class TwoFactorEnabledResponse(BaseModel):
    """Returned after TOTP verification succeeds and 2FA is enabled."""

    message: str = "Two-factor authentication enabled successfully."
    backup_codes: list[str]


class UserProfile(BaseModel):
    """Public user profile returned by GET /auth/me."""

    id: uuid.UUID
    email: str
    name: str
    tier: str
    email_verified: bool
    totp_enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ResendVerificationRequest(BaseModel):
    """Request to resend the email verification link."""

    email: EmailStr


class SessionResponse(BaseModel):
    """A single active session as returned by GET /auth/sessions."""

    id: str
    device: str
    ip: str
    location: str
    last_active: str
    is_current: bool


class DeleteAccountRequest(BaseModel):
    """Request to permanently delete the user's account."""

    password: str = Field(..., min_length=1)


class AccessTokenResponse(BaseModel):
    """JWT access token returned on successful authentication.

    The refresh token is set as an httpOnly cookie and is NOT
    included in the JSON response body.
    """

    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(
        ...,
        description="Access token lifetime in seconds",
    )


class MessageResponse(BaseModel):
    """Generic success message."""

    message: str
