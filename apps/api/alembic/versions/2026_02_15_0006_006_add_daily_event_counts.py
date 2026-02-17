"""add daily_event_counts table for anonymous analytics

Revision ID: 006
Revises: 005
Create Date: 2026-02-15

Creates the ``daily_event_counts`` table for anonymous conversion
analytics (B6). This table stores aggregate event counts per day
with ZERO personally identifiable information — no user_id, no IP
address, no session_id, no user_agent.

Decision #138: "No per-user journey tracking."
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: str = "005"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "daily_event_counts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "event_type",
            sa.String(50),
            nullable=False,
            comment="Anonymous event type (e.g., page_view, file_upload)",
        ),
        sa.Column(
            "event_date",
            sa.Date(),
            nullable=False,
            comment="The calendar date this aggregate belongs to",
        ),
        sa.Column(
            "count",
            sa.Integer(),
            nullable=False,
            server_default="0",
            comment="Number of occurrences for this event_type on this date",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_type", "event_date", name="uq_event_type_date"),
    )
    op.create_index("ix_daily_event_counts_event_type", "daily_event_counts", ["event_type"])
    op.create_index("ix_daily_event_counts_event_date", "daily_event_counts", ["event_date"])


def downgrade() -> None:
    op.drop_index("ix_daily_event_counts_event_date", table_name="daily_event_counts")
    op.drop_index("ix_daily_event_counts_event_type", table_name="daily_event_counts")
    op.drop_table("daily_event_counts")
