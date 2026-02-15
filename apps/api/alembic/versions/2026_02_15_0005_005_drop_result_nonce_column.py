"""drop result_nonce column (ZKE pivot)

Revision ID: 005
Revises: 004
Create Date: 2026-02-15

Removes the ``result_nonce`` column from the ``analysis_results`` table.
With the ZKE (Zero-Knowledge Encryption) pivot, the initialization vector
is now embedded inside the client-encrypted EncryptedEnvelope stored in
``result_data``. The server no longer performs encryption/decryption, so
the separate nonce column is no longer needed.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: str = "004"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.drop_column("analysis_results", "result_nonce")


def downgrade() -> None:
    op.add_column(
        "analysis_results",
        sa.Column(
            "result_nonce",
            sa.LargeBinary(),
            nullable=False,
            server_default=sa.text("''"),
            comment="AES-GCM nonce (12 bytes)",
        ),
    )
    # Remove the server_default after backfilling (in production, backfill first)
    op.alter_column("analysis_results", "result_nonce", server_default=None)
