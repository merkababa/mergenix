"""add composite index for alert service queries

Revision ID: 011
Revises: 010
Create Date: 2026-02-19

The alert_service.py COUNT queries filter by (event_type, ip_address,
created_at) on the audit_log table.  Without this composite index the
queries degrade under sustained attack load as the table grows.

The index is already declared in the SQLAlchemy model
(app/models/audit.py → AuditLog.__table_args__) but had no
corresponding Alembic migration, so the physical database never
received it.
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "011"
down_revision: str = "010"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_index(
        "ix_audit_log_event_ip_created",
        "audit_log",
        ["event_type", "ip_address", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_log_event_ip_created", table_name="audit_log")
