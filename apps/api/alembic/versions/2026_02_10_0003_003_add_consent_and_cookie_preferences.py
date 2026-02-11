"""add consent_records and cookie_preferences tables

Revision ID: 003
Revises: 002
Create Date: 2026-02-10

Adds the consent_records table for GDPR consent audit trail and the
cookie_preferences table for per-user cookie settings.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: str = "002"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ── consent_records ──────────────────────────────────────────────────
    op.create_table(
        "consent_records",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "consent_type",
            sa.String(50),
            nullable=False,
            comment="terms | privacy | cookies | age_verification",
        ),
        sa.Column(
            "version",
            sa.String(20),
            nullable=False,
            comment="Document version, e.g. 1.0, 1.1",
        ),
        sa.Column(
            "ip_address",
            sa.String(45),
            nullable=False,
            comment="IPv4 or IPv6 client address at time of consent",
        ),
        sa.Column(
            "user_agent",
            sa.String(500),
            nullable=False,
            comment="Browser User-Agent at time of consent",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_consent_records_user_id"), "consent_records", ["user_id"]
    )
    op.create_index(
        op.f("ix_consent_records_consent_type"), "consent_records", ["consent_type"]
    )

    # ── cookie_preferences ───────────────────────────────────────────────
    op.create_table(
        "cookie_preferences",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("analytics_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_cookie_preferences_user_id"),
    )


def downgrade() -> None:
    op.drop_table("cookie_preferences")
    op.drop_table("consent_records")
