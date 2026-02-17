"""add date_of_birth to users

Revision ID: 009
Revises: 008
Create Date: 2026-02-16

Adds a nullable ``date_of_birth`` column to the ``users`` table.
Required for age verification at registration (GDPR Art. 8).
Nullable because existing users were created before this requirement.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "009"
down_revision: str = "008"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "date_of_birth",
            sa.Date(),
            nullable=True,
            comment="Nullable for users created before age verification was enforced",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "date_of_birth")
