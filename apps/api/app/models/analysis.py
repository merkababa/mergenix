"""
Analysis result model — stores encrypted genetic analysis results.

Each result is AES-256-GCM encrypted at rest. Only the summary
(counts/stats, no genetic data) is stored as plaintext JSON for
efficient listing without decryption.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, ForeignKey, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AnalysisResult(Base):
    """Encrypted genetic analysis result owned by a user."""

    __tablename__ = "analysis_results"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    label: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="User-provided name for this analysis",
    )
    parent1_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    parent2_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # ── Encrypted result data ────────────────────────────────────────────
    result_data: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False,
        comment="AES-256-GCM encrypted JSON blob of full analysis result",
    )
    result_nonce: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False,
        comment="AES-GCM nonce (12 bytes)",
    )

    # ── Metadata ─────────────────────────────────────────────────────────
    tier_at_time: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="User tier when analysis was saved (free | premium | pro)",
    )
    summary_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Unencrypted summary for listing (counts/stats only, no genetic data)",
    )

    # ── Timestamps ───────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<AnalysisResult id={self.id} user_id={self.user_id} "
            f"label={self.label!r} tier={self.tier_at_time!r}>"
        )
