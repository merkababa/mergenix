"""
Consent and cookie preference models — GDPR/legal compliance records.

ConsentRecord stores an immutable audit trail of every consent event
(terms acceptance, privacy policy, cookies, age verification).
CookiePreference stores the user's current cookie preferences as a
single row per user (upsert pattern).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ConsentRecord(Base):
    """Immutable record of a user granting consent."""

    __tablename__ = "consent_records"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    consent_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="terms | privacy | cookies | age_verification",
    )
    version: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="Document version, e.g. 1.0, 1.1",
    )
    ip_address: Mapped[str] = mapped_column(
        String(45),
        nullable=False,
        comment="IPv4 or IPv6 client address at time of consent",
    )
    user_agent: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Browser User-Agent at time of consent",
    )
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<ConsentRecord id={self.id} user_id={self.user_id} "
            f"type={self.consent_type!r} version={self.version!r}>"
        )


class CookiePreference(Base):
    """User's current cookie preferences (one row per user, upserted)."""

    __tablename__ = "cookie_preferences"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    analytics_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    marketing_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether the user has opted in to marketing cookies",
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<CookiePreference id={self.id} user_id={self.user_id} "
            f"analytics={self.analytics_enabled} marketing={self.marketing_enabled}>"
        )
