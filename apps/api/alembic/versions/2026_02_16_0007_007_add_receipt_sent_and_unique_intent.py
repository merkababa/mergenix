"""add receipt_sent column and unique constraint on stripe_payment_intent

Revision ID: 007
Revises: 006
Create Date: 2026-02-16

Adds a ``receipt_sent`` boolean column (default False) to the ``payments``
table, and a partial unique index on ``stripe_payment_intent`` (where not
NULL) to prevent race conditions between concurrent webhook deliveries.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007"
down_revision: str = "006a"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Add receipt_sent boolean column with default False
    op.add_column(
        "payments",
        sa.Column(
            "receipt_sent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
            comment="Whether the tier-upgrade receipt email was sent successfully",
        ),
    )

    # Add partial unique index on stripe_payment_intent (WHERE NOT NULL)
    # This prevents race conditions between concurrent webhook deliveries
    op.create_index(
        "uq_payments_stripe_payment_intent",
        "payments",
        ["stripe_payment_intent"],
        unique=True,
        postgresql_where=sa.text("stripe_payment_intent IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_payments_stripe_payment_intent", table_name="payments")
    op.drop_column("payments", "receipt_sent")
