"""
Encryption utilities for analysis result data.

Uses AES-256-GCM for authenticated encryption. The key is derived
from the application's JWT secret combined with the user ID as salt
via HKDF(SHA-256), ensuring each user gets a unique encryption key.

All operations are CPU-bound and MUST be called via asyncio.to_thread()
from async endpoints.
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.hashes import SHA256
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


def _derive_key(user_id: str, secret: str) -> bytes:
    """Derive a 256-bit AES key from the app secret + user ID.

    Args:
        user_id: String representation of the user's UUID (used as salt).
        secret: The application's JWT secret.

    Returns:
        32-byte AES-256 key.
    """
    hkdf = HKDF(
        algorithm=SHA256(),
        length=32,
        salt=user_id.encode("utf-8"),
        info=b"mergenix-analysis-encryption-v1",
    )
    return hkdf.derive(secret.encode("utf-8"))


def _encrypt_sync(data: dict[str, Any], user_id: str, secret: str) -> tuple[bytes, bytes]:
    """Encrypt a dict as JSON using AES-256-GCM (synchronous).

    Returns:
        Tuple of (ciphertext, nonce).
    """
    key = _derive_key(user_id, secret)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce for AES-GCM
    plaintext = json.dumps(data, separators=(",", ":")).encode("utf-8")
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return ciphertext, nonce


def _decrypt_sync(ciphertext: bytes, nonce: bytes, user_id: str, secret: str) -> dict[str, Any]:
    """Decrypt AES-256-GCM ciphertext back to a dict (synchronous)."""
    key = _derive_key(user_id, secret)
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return json.loads(plaintext.decode("utf-8"))


async def encrypt_result(data: dict[str, Any], user_id: str, secret: str) -> tuple[bytes, bytes]:
    """Encrypt analysis result data (async wrapper).

    Runs the CPU-bound crypto in a thread to avoid blocking the event loop.

    Args:
        data: The full analysis result dict to encrypt.
        user_id: String UUID of the owning user.
        secret: The application's JWT secret.

    Returns:
        Tuple of (ciphertext, nonce).
    """
    return await asyncio.to_thread(_encrypt_sync, data, user_id, secret)


async def decrypt_result(
    ciphertext: bytes, nonce: bytes, user_id: str, secret: str
) -> dict[str, Any]:
    """Decrypt analysis result data (async wrapper).

    Runs the CPU-bound crypto in a thread to avoid blocking the event loop.

    Args:
        ciphertext: The encrypted data.
        nonce: The AES-GCM nonce.
        user_id: String UUID of the owning user.
        secret: The application's JWT secret.

    Returns:
        The decrypted analysis result dict.
    """
    return await asyncio.to_thread(_decrypt_sync, ciphertext, nonce, user_id, secret)
