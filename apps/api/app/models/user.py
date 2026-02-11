"""
User model — core identity record for every Mergenix account.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """Represents a registered Mergenix user."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="None for OAuth-only users",
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tier: Mapped[str] = mapped_column(
        String(20),
        default="free",
        nullable=False,
        comment="free | premium | pro",
    )
    email_verified: Mapped[bool] = mapped_column(default=False, nullable=False)

    # ── TOTP / 2FA ────────────────────────────────────────────────────────
    totp_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    totp_enabled: Mapped[bool] = mapped_column(default=False, nullable=False)
    backup_codes: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
        default=None,
        comment="JSON array of SHA-256-hashed backup codes",
    )

    # ── OAuth ─────────────────────────────────────────────────────────────
    oauth_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    oauth_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Brute-force protection ────────────────────────────────────────────
    failed_login_attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────
    payments: Mapped[list[Payment]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        back_populates="user",
        lazy="raise",
    )
    sessions: Mapped[list[Session]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        back_populates="user",
        lazy="raise",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} tier={self.tier!r}>"
