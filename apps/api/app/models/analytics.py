"""
Anonymous conversion analytics model.

DailyEventCount stores aggregate event counts per day with ZERO PII.
No user_id, no IP address, no session_id, no user_agent.

Decision #138: "No per-user journey tracking. No IP/session/user ID
in analytics events."
"""

from __future__ import annotations

import datetime

from sqlalchemy import Date, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DailyEventCount(Base):
    """Anonymous daily aggregate event counter.

    One row per (event_type, event_date) pair. The ``count`` column is
    incremented via upsert on each tracking request.

    This table deliberately stores ZERO personally identifiable
    information — no user_id, no IP address, no session, no user_agent.

    Retention: Data is anonymous (zero PII). Purge policy: retained for
    24 months, then purged via POST /analytics/purge admin endpoint.
    """

    __tablename__ = "daily_event_counts"

    __table_args__ = (
        UniqueConstraint("event_type", "event_date", name="uq_event_type_date"),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
        comment="Anonymous event type (e.g., page_view, file_upload)",
    )
    event_date: Mapped[datetime.date] = mapped_column(
        Date,
        index=True,
        nullable=False,
        default=func.current_date,
        comment="The calendar date this aggregate belongs to",
    )
    count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of occurrences for this event_type on this date",
    )

    def __repr__(self) -> str:
        return (
            f"<DailyEventCount id={self.id} type={self.event_type!r} "
            f"date={self.event_date} count={self.count}>"
        )
