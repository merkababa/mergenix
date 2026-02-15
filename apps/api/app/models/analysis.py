"""
Analysis result model — stores client-encrypted (ZKE) genetic analysis results.

The server stores the EncryptedEnvelope as an opaque JSON blob in the
``result_data`` column.  It never decrypts the data — only the client
holds the decryption key.  Summary counts are stored as plaintext JSON
for efficient listing without decryption.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, ForeignKey, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AnalysisResult(Base):
    """Client-encrypted (ZKE) genetic analysis result owned by a user."""

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

    # ── Encrypted result data (opaque ZKE envelope) ───────────────────────
    result_data: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False,
        comment="JSON-serialized EncryptedEnvelope blob (opaque, never decrypted by server)",
    )

    # ── Metadata ─────────────────────────────────────────────────────────
    tier_at_time: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="User tier when analysis was saved (free | premium | pro)",
    )
    data_version: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="Version of the analysis engine/data used to generate this result",
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
