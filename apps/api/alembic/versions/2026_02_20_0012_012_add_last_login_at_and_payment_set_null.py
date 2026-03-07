"""add last_login_at to users and change payments.user_id FK to SET NULL

Revision ID: 012
Revises: 011
Create Date: 2026-02-20

Changes:
  1. Add last_login_at TIMESTAMP column (nullable, default NULL) to users table.
     Indexed for efficient purge queries (retention service uses this column).
  2. Populate existing users' last_login_at with CURRENT_TIMESTAMP as a safe
     fallback — treating all pre-migration users as active now to avoid
     accidental purge (we have no historical login data for these accounts).
  3. Change payments.user_id FK from ON DELETE CASCADE → ON DELETE SET NULL.
     Also makes the column nullable.
     Rationale: payment records must be retained for financial compliance (7yr)
     even after the user account is deleted. With SET NULL, the FK becomes NULL
     on user deletion instead of the entire payment record being deleted.

GDPR / Retention context:
  - last_login_at enables the 3-year free-tier inactivity purge in RetentionService.
  - SET NULL on payments enables RetentionService.purge_inactive_users to cascade-
    delete free users without destroying the financial audit trail.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "012"
down_revision: str = "011"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ── 1. Add last_login_at column to users ─────────────────────────────
    op.add_column(
        "users",
        sa.Column(
            "last_login_at",
            sa.TIMESTAMP(timezone=False),
            nullable=True,
            comment=(
                "UTC timestamp of the most recent successful login or token refresh. "
                "NULL = never logged in (new account). Used by retention service "
                "to determine inactivity for purge eligibility."
            ),
        ),
    )

    # ── 2. Index on last_login_at for efficient purge queries ─────────────
    op.create_index(
        "ix_users_last_login_at",
        "users",
        ["last_login_at"],
    )

    # ── 3. Populate existing rows with CURRENT_TIMESTAMP as fallback ──────
    # Treat all existing users as active NOW — we have no historical login data,
    # so this is the safest default to prevent accidental purge.
    op.execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE last_login_at IS NULL")

    # ── 4. Change payments.user_id FK: CASCADE → SET NULL ─────────────────
    # Step 4a: Drop the existing FK constraint
    op.drop_constraint(
        "payments_user_id_fkey",
        "payments",
        type_="foreignkey",
    )

    # Step 4b: Make the column nullable
    op.alter_column(
        "payments",
        "user_id",
        nullable=True,
        existing_type=sa.UUID(),
    )

    # Step 4c: Re-create the FK with ON DELETE SET NULL
    op.create_foreign_key(
        "payments_user_id_fkey",
        "payments",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # Reverse payments.user_id FK back to CASCADE + NOT NULL
    op.drop_constraint("payments_user_id_fkey", "payments", type_="foreignkey")
    op.alter_column(
        "payments",
        "user_id",
        nullable=False,
        existing_type=sa.UUID(),
    )
    op.create_foreign_key(
        "payments_user_id_fkey",
        "payments",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Remove last_login_at index and column
    op.drop_index("ix_users_last_login_at", table_name="users")
    op.drop_column("users", "last_login_at")
