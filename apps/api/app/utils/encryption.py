"""
Symmetric encryption utility for sensitive data at rest.
Uses Fernet (AES-128-CBC + HMAC-SHA256) from the cryptography library.
"""

from __future__ import annotations

import os
from functools import lru_cache

from cryptography.fernet import Fernet


@lru_cache(maxsize=1)
def _get_fernet() -> Fernet:
    """Get Fernet instance using the TOTP_ENCRYPTION_KEY env var."""
    key = os.environ.get("TOTP_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError(
            "TOTP_ENCRYPTION_KEY environment variable is required. "
            "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_totp_secret(plaintext: str) -> str:
    """Encrypt a TOTP secret for storage.

    Args:
        plaintext: The raw base32 TOTP secret to encrypt.

    Returns:
        Fernet-encrypted ciphertext string (safe for DB storage).
    """
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_totp_secret(ciphertext: str) -> str:
    """Decrypt a stored TOTP secret.

    Args:
        ciphertext: The Fernet-encrypted TOTP secret from the database.

    Returns:
        The original plaintext base32 TOTP secret.
    """
    return _get_fernet().decrypt(ciphertext.encode()).decode()
