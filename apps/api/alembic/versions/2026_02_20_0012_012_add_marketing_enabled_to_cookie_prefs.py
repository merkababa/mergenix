"""add marketing_enabled to cookie_preferences

Revision ID: 013
Revises: 012
Create Date: 2026-02-20

L5 — Cookie Consent Audit: Adds marketing_enabled column to the
cookie_preferences table.

Analytics-only consent was insufficient for CPRA/GDPR compliance —
users need granular control over analytics vs marketing cookies.
The new column tracks whether the user has opted in to marketing cookies.

Default is False (marketing OFF) — consistent with privacy-first
principle and GDPR opt-in requirement.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cookie_preferences",
        sa.Column(
            "marketing_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
            comment="Whether the user has opted in to marketing cookies",
        ),
    )


def downgrade() -> None:
    op.drop_column("cookie_preferences", "marketing_enabled")
