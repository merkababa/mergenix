"""
Payment model — tracks every Stripe payment/checkout event.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Payment(Base):
    """Represents a single payment transaction for a tier upgrade."""

    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    stripe_payment_intent: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    amount: Mapped[int] = mapped_column(
        nullable=False,
        comment="Amount in smallest currency unit (e.g. cents for USD)",
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        default="usd",
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="pending | succeeded | failed | refunded",
    )
    tier_granted: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="premium | pro",
    )
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        nullable=False,
    )

    # ── Relationship ──────────────────────────────────────────────────────
    user: Mapped[User] = relationship(  # type: ignore[name-defined]  # noqa: F821
        back_populates="payments",
    )

    def __repr__(self) -> str:
        return (
            f"<Payment id={self.id} user_id={self.user_id} "
            f"amount={self.amount} status={self.status!r}>"
        )
