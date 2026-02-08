"""
TOTP (Time-based One-Time Password) utilities for Mergenix 2FA.

Provides secret generation, QR code creation, TOTP verification,
and backup code generation/verification using bcrypt hashing.
"""

import io
import secrets

import bcrypt
import pyotp
import qrcode


def generate_totp_secret() -> str:
    """Generate a random base32 TOTP secret."""
    return pyotp.random_base32()


def generate_provisioning_uri(
    email: str, secret: str, issuer: str = "Mergenix"
) -> str:
    """
    Generate otpauth:// URI for authenticator apps.

    Args:
        email: User's email (used as account name).
        secret: Base32-encoded TOTP secret.
        issuer: Service name shown in authenticator apps.

    Returns:
        otpauth:// URI string.
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def generate_qr_code(email: str, secret: str) -> bytes:
    """
    Generate QR code PNG as bytes for the TOTP provisioning URI.

    Args:
        email: User's email address.
        secret: Base32-encoded TOTP secret.

    Returns:
        PNG image bytes suitable for ``st.image()``.
    """
    uri = generate_provisioning_uri(email, secret)
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def verify_totp_code(secret: str, code: str) -> bool:
    """
    Verify a TOTP code against the secret.

    Accepts codes from +-1 window (90 second tolerance).

    Args:
        secret: Base32-encoded TOTP secret.
        code: 6-digit code from authenticator app.

    Returns:
        True if the code is valid.
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def generate_backup_codes(count: int = 10) -> tuple[list[str], list[str]]:
    """
    Generate backup codes for 2FA recovery.

    Args:
        count: Number of backup codes to generate.

    Returns:
        Tuple of (plaintext_codes, bcrypt_hashed_codes).
    """
    plaintext = [
        f"{secrets.token_hex(2)}-{secrets.token_hex(2)}" for _ in range(count)
    ]
    hashed = [
        bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()
        for code in plaintext
    ]
    return plaintext, hashed


def verify_backup_code(code: str, hashed_codes: list[str]) -> tuple[bool, int]:
    """
    Verify a backup code against a list of hashed codes.

    Args:
        code: Plaintext backup code to verify.
        hashed_codes: List of bcrypt-hashed backup codes.

    Returns:
        Tuple of (matched: bool, index: int). Returns (False, -1)
        if no match is found.
    """
    for i, hashed in enumerate(hashed_codes):
        if bcrypt.checkpw(code.encode(), hashed.encode()):
            return True, i
    return False, -1
