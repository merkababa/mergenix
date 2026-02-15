"""add data_version column to analysis_results

Revision ID: 004
Revises: 003
Create Date: 2026-02-15

Adds a nullable String(50) column `data_version` to the
`analysis_results` table. This records the version of the analysis
engine or reference data used to generate each result, enabling
future result reprocessing when the engine is updated.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: str = "003"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "analysis_results",
        sa.Column(
            "data_version",
            sa.String(50),
            nullable=True,
            comment="Version of the analysis engine/data used to generate this result",
        ),
    )


def downgrade() -> None:
    op.drop_column("analysis_results", "data_version")
