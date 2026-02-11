"""add analysis_results table

Revision ID: 002
Revises: 001
Create Date: 2026-02-10

Adds the analysis_results table for storing encrypted genetic analysis results.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: str = "001"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "analysis_results",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "label",
            sa.String(255),
            nullable=False,
            comment="User-provided name for this analysis",
        ),
        sa.Column("parent1_filename", sa.String(255), nullable=False),
        sa.Column("parent2_filename", sa.String(255), nullable=False),
        sa.Column(
            "result_data",
            sa.LargeBinary(),
            nullable=False,
            comment="AES-256-GCM encrypted JSON blob of full analysis result",
        ),
        sa.Column(
            "result_nonce",
            sa.LargeBinary(),
            nullable=False,
            comment="AES-GCM nonce (12 bytes)",
        ),
        sa.Column(
            "tier_at_time",
            sa.String(20),
            nullable=False,
            comment="User tier when analysis was saved (free | premium | pro)",
        ),
        sa.Column(
            "summary_json",
            sa.JSON(),
            nullable=True,
            comment="Unencrypted summary for listing (counts/stats only, no genetic data)",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_analysis_results_user_id"), "analysis_results", ["user_id"])
    op.create_index(op.f("ix_analysis_results_created_at"), "analysis_results", ["created_at"])


def downgrade() -> None:
    op.drop_table("analysis_results")
