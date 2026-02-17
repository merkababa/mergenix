"""consent records: CASCADE → SET NULL on user deletion

Revision ID: 010
Revises: 009
Create Date: 2026-02-17

GDPR Art 7(1) requires the controller to demonstrate that consent was
given.  CASCADE-deleting consent records on user deletion destroys this
evidence.  This migration changes the foreign key to SET NULL so that
consent records are preserved (with user_id = NULL) after the user is
deleted, matching the AuditLog pattern.

Also makes consent_records.user_id nullable to support SET NULL.
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "010"
down_revision: str = "009"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Drop the existing foreign key constraint, make column nullable,
    # and recreate with SET NULL behavior.
    with op.batch_alter_table("consent_records") as batch_op:
        batch_op.drop_constraint(
            "consent_records_user_id_fkey", type_="foreignkey"
        )
        batch_op.alter_column("user_id", nullable=True)
        batch_op.create_foreign_key(
            "consent_records_user_id_fkey",
            "users",
            ["user_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("consent_records") as batch_op:
        batch_op.drop_constraint(
            "consent_records_user_id_fkey", type_="foreignkey"
        )
        batch_op.alter_column("user_id", nullable=False)
        batch_op.create_foreign_key(
            "consent_records_user_id_fkey",
            "users",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )
