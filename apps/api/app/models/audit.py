"""
Audit, session, and token models.

AuditLog — immutable append-only event trail.
Session  — refresh-token sessions for JWT auth.
PasswordReset / EmailVerification — one-time-use tokens.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AuditLog(Base):
    """Immutable audit trail for security-relevant events.

    GDPR COMPLIANCE NOTES:
    - ip_address is PII under GDPR. It is stored in plaintext for security
      monitoring (alert_service.py COUNT queries filter by ip_address).
    - GDPR Article 5(1)(e) (Storage Limitation) requires a retention policy.

    TODO(retention): Implement scheduled cleanup job — see SECRET_ROTATION_RUNBOOK.md
      for retention guidance.
      Target: 90-day retention for non-security events, 365 days for security events
      (GDPR Art 5(1)(e) — Storage Limitation).
      Implementation plan:
      1. Run a daily cron/scheduled task that:
         a. Deletes non-security audit entries older than 90 days.
         b. Deletes security audit entries (login_failed, rate_limit_exceeded,
            account_locked, 2fa_*) older than 365 days.
         c. Alternatively, anonymizes old entries by hashing/nulling ip_address
            and user_agent fields while preserving event_type for analytics.
      2. Example: DELETE FROM audit_log WHERE event_type NOT IN ('login_failed', ...)
         AND created_at < NOW() - INTERVAL '90 days'
      3. For long-term retention needs, consider hashing IP addresses
         (SHA-256 with a rotating salt) so they can still be correlated
         within a window but cannot be reversed to identify individuals.
    """

    __tablename__ = "audit_log"

    # Composite index for alert_service.py COUNT queries that filter by
    # (event_type, ip_address, created_at). Without this, the queries
    # degrade under sustained attack load as the table grows.
    __table_args__ = (
        Index(
            "ix_audit_log_event_ip_created",
            "event_type",
            "ip_address",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
        comment=(
            "login | logout | register | password_change | payment | "
            "tier_change | failed_login | 2fa_enable | 2fa_disable"
        ),
    )
    metadata_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
        comment="IPv4 or IPv6 client address",
    )
    user_agent: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        index=True,
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} event={self.event_type!r} user_id={self.user_id}>"


class Session(Base):
    """Tracks active refresh-token sessions."""

    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    refresh_token_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )
    user_agent: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        nullable=False,
    )

    # ── Relationship ──────────────────────────────────────────────────────
    user: Mapped[User] = relationship(  # type: ignore[name-defined]  # noqa: F821
        back_populates="sessions",
    )

    def __repr__(self) -> str:
        return f"<Session id={self.id} user_id={self.user_id} expires={self.expires_at}>"


class PasswordReset(Base):
    """One-time password reset tokens (hashed)."""

    __tablename__ = "password_resets"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="SHA-256 hash of the plaintext token",
    )
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<PasswordReset id={self.id} user_id={self.user_id} used={self.used_at is not None}>"


class EmailVerification(Base):
    """One-time email verification tokens (hashed)."""

    __tablename__ = "email_verifications"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="SHA-256 hash of the plaintext token",
    )
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<EmailVerification id={self.id} user_id={self.user_id} "
            f"verified={self.verified_at is not None}>"
        )
