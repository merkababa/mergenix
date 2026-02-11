"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-02-10

All tables: users, sessions, payments, audit_log, email_verifications, password_resets.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: str | None = None
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ── users ────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column(
            "password_hash",
            sa.String(255),
            nullable=True,
            comment="None for OAuth-only users",
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "tier",
            sa.String(20),
            nullable=False,
            server_default="free",
            comment="free | premium | pro",
        ),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        # TOTP / 2FA
        sa.Column("totp_secret", sa.String(255), nullable=True),
        sa.Column("totp_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "backup_codes",
            sa.JSON(),
            nullable=True,
            comment="JSON array of SHA-256-hashed backup codes",
        ),
        # OAuth
        sa.Column("oauth_provider", sa.String(50), nullable=True),
        sa.Column("oauth_id", sa.String(255), nullable=True),
        # Brute-force protection
        sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("locked_until", sa.DateTime(), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # ── sessions ─────────────────────────────────────────────────────────
    op.create_table(
        "sessions",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("refresh_token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sessions_user_id"), "sessions", ["user_id"])

    # ── payments ─────────────────────────────────────────────────────────
    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("stripe_payment_intent", sa.String(255), nullable=True),
        sa.Column(
            "amount",
            sa.Integer(),
            nullable=False,
            comment="Amount in smallest currency unit (e.g. cents for USD)",
        ),
        sa.Column("currency", sa.String(3), nullable=False, server_default="usd"),
        sa.Column(
            "status",
            sa.String(30),
            nullable=False,
            comment="pending | succeeded | failed | refunded",
        ),
        sa.Column(
            "tier_granted",
            sa.String(20),
            nullable=False,
            comment="premium | pro",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payments_user_id"), "payments", ["user_id"])

    # ── audit_log ────────────────────────────────────────────────────────
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "event_type",
            sa.String(100),
            nullable=False,
            comment=(
                "login | logout | register | password_change | payment | "
                "tier_change | failed_login | 2fa_enable | 2fa_disable"
            ),
        ),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column(
            "ip_address",
            sa.String(45),
            nullable=True,
            comment="IPv4 or IPv6 client address",
        ),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_log_user_id"), "audit_log", ["user_id"])
    op.create_index(op.f("ix_audit_log_event_type"), "audit_log", ["event_type"])
    op.create_index(op.f("ix_audit_log_created_at"), "audit_log", ["created_at"])

    # ── password_resets ──────────────────────────────────────────────────
    op.create_table(
        "password_resets",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "token_hash",
            sa.String(255),
            nullable=False,
            comment="SHA-256 hash of the plaintext token",
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_password_resets_user_id"), "password_resets", ["user_id"])

    # ── email_verifications ──────────────────────────────────────────────
    op.create_table(
        "email_verifications",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "token_hash",
            sa.String(255),
            nullable=False,
            comment="SHA-256 hash of the plaintext token",
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_email_verifications_user_id"), "email_verifications", ["user_id"])


def downgrade() -> None:
    op.drop_table("email_verifications")
    op.drop_table("password_resets")
    op.drop_table("audit_log")
    op.drop_table("payments")
    op.drop_table("sessions")
    op.drop_table("users")
