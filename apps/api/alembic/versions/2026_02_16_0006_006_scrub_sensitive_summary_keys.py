"""scrub health-sensitive keys from summary_json (DI-13)

Revision ID: 006
Revises: 005
Create Date: 2026-02-16

Removes ``high_risk_count`` and ``health_risk_count`` from all existing
``summary_json`` values in the ``analysis_results`` table.  These keys
store unencrypted health-sensitive metadata (specific risk counts) that
contradicts the ZKE (Zero-Knowledge Encryption) design — the server
should not know how many high-risk conditions a user has.

The keys are replaced by a non-sensitive boolean ``has_results`` flag
set to True (since the record exists, it obviously has results).
"""

from __future__ import annotations

import json

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: str = "005"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None

# Keys to remove from summary_json for ZKE privacy compliance.
_SENSITIVE_KEYS = {"high_risk_count", "health_risk_count"}


def upgrade() -> None:
    """Remove health-sensitive keys from all summary_json values.

    For each analysis_results row whose summary_json contains one of the
    sensitive keys, remove those keys and add ``has_results: true``.

    Uses raw SQL (bind_to_connection) because this is a data migration,
    not a schema migration — Alembic ops don't cover per-row JSON edits.

    Processes rows in batches of 1000 using LIMIT/OFFSET to avoid loading
    the entire table into memory at once (works for both PostgreSQL and SQLite).
    """
    conn = op.get_bind()

    _BATCH_SIZE = 1000
    offset = 0

    while True:
        # Fetch a batch of rows with non-null summary_json.
        rows = conn.execute(
            sa.text(
                "SELECT id, summary_json FROM analysis_results "
                "WHERE summary_json IS NOT NULL "
                "ORDER BY id "
                "LIMIT :limit OFFSET :offset"
            ),
            {"limit": _BATCH_SIZE, "offset": offset},
        ).fetchall()

        if not rows:
            break

        for row in rows:
            row_id = row[0]
            summary = row[1]

            # summary_json is stored as a JSON column — SQLAlchemy may
            # return it as a dict (PostgreSQL JSONB) or a string (SQLite).
            if isinstance(summary, str):
                try:
                    summary = json.loads(summary)
                except (json.JSONDecodeError, TypeError):
                    continue

            if summary is None or not isinstance(summary, dict):
                continue

            # Check if any sensitive keys are present.
            keys_to_remove = _SENSITIVE_KEYS & summary.keys()
            if not keys_to_remove:
                continue

            # Remove sensitive keys, add non-sensitive replacement.
            for key in keys_to_remove:
                del summary[key]
            summary["has_results"] = True

            # Write back the scrubbed summary.
            conn.execute(
                sa.text(
                    "UPDATE analysis_results "
                    "SET summary_json = :summary "
                    "WHERE id = :id"
                ),
                {"summary": json.dumps(summary), "id": row_id},
            )

        offset += _BATCH_SIZE


def downgrade() -> None:
    """Downgrade is a no-op — the removed keys contained sensitive data
    that cannot be reconstructed. The ``has_results`` flag is kept as it
    is non-sensitive and already in the allowed keys whitelist.
    """
    pass
