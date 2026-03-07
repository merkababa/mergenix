"""
Encryption schemas — Pydantic models for zero-knowledge encrypted data storage.

Phase 1 (current — Sprint 1): Schema definition only.
    This module defines the EncryptedEnvelope and KdfParams schemas that
    represent the ZKE (Zero-Knowledge Encryption) data format.  These schemas
    are NOT yet consumed by the analysis router — they exist to lock down the
    contract that future sprints will implement.

Phase 2 (future sprint): Wire ZKE end-to-end.
    The analysis router (``app/routers/analysis.py``) will be updated to
    accept an ``EncryptedEnvelope`` from the client instead of plaintext
    ``result_data``.  The server will store the opaque envelope as-is,
    never decrypting it.

Current encryption model:
    The server currently performs **Server-Side Encryption (SSE)** — the
    client sends plaintext ``result_data``, and the server encrypts it at
    rest before persisting to the database.  Migration to true client-side
    ZKE is planned.

Reference:
    See ``docs/plans/PHASE_STREAM_B_BACKEND_REFACTOR.md`` for the full
    migration roadmap.

Technical details (unchanged):
    The client will encrypt genetic data with AES-256-GCM using a key
    derived from the user's password via Argon2id.  The server stores
    these opaque blobs without ever seeing plaintext.
"""

from __future__ import annotations

import re

from pydantic import BaseModel, Field, field_validator

# ── Constants ────────────────────────────────────────────────────────────

_IV_MIN_HEX_CHARS = 24  # 12 bytes
_IV_MAX_HEX_CHARS = 32  # 16 bytes
_SALT_MIN_HEX_CHARS = 32  # 16 bytes
_SALT_MAX_HEX_CHARS = 64  # 32 bytes
_CIPHERTEXT_MAX_HEX_CHARS = 40_000_000  # 40 MB hex = ~20 MB binary
_HEX_PATTERN = re.compile(r"^[0-9a-fA-F]+$")
# Version format: v<digits>:<word_chars_and_hyphens>:<word_chars_and_hyphens>
# e.g., "v1:argon2id:aes-gcm"
_VERSION_PATTERN = re.compile(r"^v\d+:[\w-]+:[\w-]+$")

# KDF constraints
_KDF_MIN_MEMORY_COST = 65536  # 64 MiB minimum for Argon2id
_KDF_MIN_TIME_COST = 3
_KDF_MIN_PARALLELISM = 1
_KDF_REQUIRED_KEY_LENGTH = 32  # AES-256


# ── Helpers ──────────────────────────────────────────────────────────────


def _validate_hex_field(
    value: str,
    field_name: str,
    min_hex_chars: int | None = None,
    max_hex_chars: int | None = None,
    *,
    allow_empty: bool = False,
) -> str:
    """Validate that a string is valid hex with optional length constraints.

    Raises ValueError with a clear message if validation fails.
    """
    if not allow_empty and len(value) == 0:
        raise ValueError(f"{field_name} must not be empty")

    if len(value) % 2 != 0:
        raise ValueError(
            f"{field_name} must have an even number of hex characters "
            f"(got {len(value)}). Each byte is represented by two hex digits."
        )

    if not _HEX_PATTERN.match(value):
        raise ValueError(f"{field_name} must contain only valid hexadecimal characters (0-9, a-f, A-F)")

    if min_hex_chars is not None and len(value) < min_hex_chars:
        raise ValueError(
            f"{field_name} is too short: got {len(value)} hex chars, "
            f"minimum is {min_hex_chars} ({min_hex_chars // 2} bytes)"
        )

    if max_hex_chars is not None and len(value) > max_hex_chars:
        raise ValueError(
            f"{field_name} is too long: got {len(value)} hex chars, "
            f"maximum is {max_hex_chars} ({max_hex_chars // 2} bytes)"
        )

    return value


# ── Schemas ──────────────────────────────────────────────────────────────


class KdfParams(BaseModel):
    """Key derivation function parameters (stored alongside ciphertext for re-derivation)."""

    algorithm: str = Field(
        ...,
        description="KDF algorithm identifier, e.g. 'argon2id'",
    )
    memory_cost: int = Field(
        ...,
        description="Memory cost in KiB (minimum 65536 = 64 MiB for Argon2id)",
    )
    time_cost: int = Field(
        ...,
        description="Number of iterations (minimum 3)",
    )
    parallelism: int = Field(
        ...,
        description="Degree of parallelism (minimum 1)",
    )
    salt_length: int = Field(
        ...,
        description="Salt length in bytes",
    )
    key_length: int = Field(
        ...,
        description="Derived key length in bytes (must be 32 for AES-256)",
    )

    @field_validator("memory_cost")
    @classmethod
    def memory_cost_minimum(cls, v: int) -> int:
        """Enforce minimum memory cost of 64 MiB (65536 KiB) for Argon2id."""
        if v < _KDF_MIN_MEMORY_COST:
            raise ValueError(f"memory_cost must be >= {_KDF_MIN_MEMORY_COST} (64 MiB minimum for Argon2id), got {v}")
        return v

    @field_validator("time_cost")
    @classmethod
    def time_cost_minimum(cls, v: int) -> int:
        """Enforce minimum iteration count of 3."""
        if v < _KDF_MIN_TIME_COST:
            raise ValueError(f"time_cost must be >= {_KDF_MIN_TIME_COST}, got {v}")
        return v

    @field_validator("parallelism")
    @classmethod
    def parallelism_minimum(cls, v: int) -> int:
        """Enforce minimum parallelism of 1."""
        if v < _KDF_MIN_PARALLELISM:
            raise ValueError(f"parallelism must be >= {_KDF_MIN_PARALLELISM}, got {v}")
        return v

    @field_validator("key_length")
    @classmethod
    def key_length_must_be_32(cls, v: int) -> int:
        """Enforce key_length of exactly 32 bytes (AES-256)."""
        if v != _KDF_REQUIRED_KEY_LENGTH:
            raise ValueError(f"key_length must be exactly {_KDF_REQUIRED_KEY_LENGTH} (AES-256), got {v}")
        return v


class EncryptedEnvelope(BaseModel):
    """Zero-knowledge encrypted data envelope. Server stores as-is, never decrypts."""

    iv: str = Field(
        ...,
        description=(
            "Hex-encoded initialization vector "
            f"({_IV_MIN_HEX_CHARS}-{_IV_MAX_HEX_CHARS} hex chars = "
            f"{_IV_MIN_HEX_CHARS // 2}-{_IV_MAX_HEX_CHARS // 2} bytes)"
        ),
    )
    ciphertext: str = Field(
        ...,
        description="Hex-encoded AES-256-GCM ciphertext (max ~20 MB decoded)",
    )
    salt: str = Field(
        ...,
        description=(
            "Hex-encoded salt for KDF "
            f"({_SALT_MIN_HEX_CHARS}-{_SALT_MAX_HEX_CHARS} hex chars = "
            f"{_SALT_MIN_HEX_CHARS // 2}-{_SALT_MAX_HEX_CHARS // 2} bytes)"
        ),
    )
    kdf_params: KdfParams = Field(
        ...,
        description="Key derivation function parameters used for encryption",
    )
    version: str = Field(
        ...,
        description="Envelope version string, e.g. 'v1:argon2id:aes-gcm'",
    )

    @field_validator("iv")
    @classmethod
    def validate_iv(cls, v: str) -> str:
        """Validate IV is valid hex within the allowed length range."""
        return _validate_hex_field(
            v,
            field_name="iv",
            min_hex_chars=_IV_MIN_HEX_CHARS,
            max_hex_chars=_IV_MAX_HEX_CHARS,
        )

    @field_validator("ciphertext")
    @classmethod
    def validate_ciphertext(cls, v: str) -> str:
        """Validate ciphertext is valid hex within the size limit."""
        return _validate_hex_field(
            v,
            field_name="ciphertext",
            max_hex_chars=_CIPHERTEXT_MAX_HEX_CHARS,
        )

    @field_validator("salt")
    @classmethod
    def validate_salt(cls, v: str) -> str:
        """Validate salt is valid hex within the allowed length range."""
        return _validate_hex_field(
            v,
            field_name="salt",
            min_hex_chars=_SALT_MIN_HEX_CHARS,
            max_hex_chars=_SALT_MAX_HEX_CHARS,
        )

    @field_validator("version")
    @classmethod
    def validate_version(cls, v: str) -> str:
        """Validate version matches the pattern v<digits>:<kdf>:<cipher>."""
        if not _VERSION_PATTERN.match(v):
            raise ValueError(
                f"version must match pattern 'v<number>:<kdf>:<cipher>' (e.g., 'v1:argon2id:aes-gcm'), got '{v}'"
            )
        return v
