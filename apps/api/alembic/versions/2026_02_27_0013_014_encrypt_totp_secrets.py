"""Encrypt existing TOTP secrets at rest.

Revision ID: 014
Revises: 013
Create Date: 2026-02-27

Security hardening — L7: TOTP secrets were previously stored as plaintext
base32 strings in the users.totp_secret column. A database compromise would
expose all secrets, allowing an attacker to generate valid 2FA codes for any
user with 2FA enabled.

This migration encrypts all existing plaintext TOTP secrets using Fernet
(AES-128-CBC + HMAC-SHA256). Going forward, the application layer
(app.utils.encryption) handles encrypt-on-write and decrypt-on-read.

No schema change is required — Fernet output fits comfortably within
the existing String(255) column (Fernet tokens are ~100 chars base64url).

IMPORTANT: The TOTP_ENCRYPTION_KEY environment variable must be set before
running this migration in any environment that has live TOTP secrets.
"""

from __future__ import annotations

import os

import sqlalchemy as sa
from alembic import op
from cryptography.fernet import Fernet

# revision identifiers, used by Alembic.
revision: str = "014"
down_revision: str = "013"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def _get_fernet() -> Fernet | None:
    """Return a Fernet instance if TOTP_ENCRYPTION_KEY is set, else None.

    Returns None (rather than raising) so that fresh deployments with no
    existing TOTP secrets can run the migration without the key. Any
    deployment with live TOTP data MUST have the key set.
    """
    key = os.environ.get("TOTP_ENCRYPTION_KEY")
    if not key:
        return None
    return Fernet(key.encode() if isinstance(key, str) else key)


def upgrade() -> None:
    fernet = _get_fernet()
    if fernet is None:
        # No key configured — no existing encrypted data to migrate.
        # New deployments start clean; all future writes will be encrypted
        # by the application layer.
        return

    conn = op.get_bind()

    users = conn.execute(sa.text("SELECT id, totp_secret FROM users WHERE totp_secret IS NOT NULL")).fetchall()

    for user_id, secret in users:
        # Skip rows that are already encrypted (Fernet tokens start with 'gAAAAA').
        if secret and not secret.startswith("gAAAAA"):
            encrypted = fernet.encrypt(secret.encode()).decode()
            conn.execute(
                sa.text("UPDATE users SET totp_secret = :secret WHERE id = :id"),
                {"secret": encrypted, "id": user_id},
            )


def downgrade() -> None:
    fernet = _get_fernet()
    if fernet is None:
        return

    conn = op.get_bind()

    users = conn.execute(sa.text("SELECT id, totp_secret FROM users WHERE totp_secret IS NOT NULL")).fetchall()

    for user_id, secret in users:
        # Only decrypt rows that look like Fernet tokens.
        if secret and secret.startswith("gAAAAA"):
            decrypted = fernet.decrypt(secret.encode()).decode()
            conn.execute(
                sa.text("UPDATE users SET totp_secret = :secret WHERE id = :id"),
                {"secret": decrypted, "id": user_id},
            )
