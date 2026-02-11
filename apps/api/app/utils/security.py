"""
Security utilities — token generation, hashing, and constant-time comparison.

These helpers are used by the auth service and middleware for operations
that must be cryptographically secure.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets


def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure URL-safe token.

    Args:
        length: Number of random bytes (the resulting string will be
                longer due to base64 encoding).

    Returns:
        URL-safe token string.
    """
    return secrets.token_urlsafe(length)


def hash_token(token: str) -> str:
    """Compute the SHA-256 hash of a plaintext token for safe storage.

    We store only hashes of verification/reset tokens in the database
    so that a database leak does not expose usable tokens.

    Args:
        token: Plaintext token string.

    Returns:
        Hex-encoded SHA-256 digest.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def constant_time_compare(a: str, b: str) -> bool:
    """Compare two strings in constant time to prevent timing attacks.

    Args:
        a: First string.
        b: Second string.

    Returns:
        True if the strings are equal.
    """
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))
