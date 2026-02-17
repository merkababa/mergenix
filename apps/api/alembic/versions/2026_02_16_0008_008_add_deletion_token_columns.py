"""add deletion_token_hash and deletion_token_expires columns to users

Revision ID: 008
Revises: 007
Create Date: 2026-02-16

Adds two nullable columns to the `users` table for the email-based
account deletion confirmation flow (GDPR Article 17). OAuth-only users
who cannot provide a password use this flow to confirm account deletion
via email.

- `deletion_token_hash` — SHA-256 hash of the deletion confirmation token
- `deletion_token_expires` — Token expiry timestamp (24 hours from creation)
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "008"
down_revision: str = "007"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "deletion_token_hash",
            sa.String(255),
            nullable=True,
            comment="SHA-256 hash of the email-based deletion confirmation token",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "deletion_token_expires",
            sa.DateTime(),
            nullable=True,
            comment="Expiry time for the deletion confirmation token (24h)",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "deletion_token_expires")
    op.drop_column("users", "deletion_token_hash")
