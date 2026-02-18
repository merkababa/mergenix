"""
Audit service — non-blocking, async audit event logging.

Every security-relevant action (login, logout, register, payment, etc.)
is recorded in the audit_log table for compliance and forensics.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

logger = logging.getLogger(__name__)

# ── Analysis result audit event type constants ────────────────────────────
# Used by the analysis router for GDPR accountability logging (Decision #33).
# Each result-access action produces an audit entry with result_id metadata
# but NEVER health/genetic data.

RESULT_SAVED = "result_saved"
RESULT_VIEWED = "result_viewed"
RESULT_DELETED = "result_deleted"
RESULT_LISTED = "result_listed"


async def log_event(
    db: AsyncSession,
    *,
    user_id: uuid.UUID | None = None,
    event_type: str,
    metadata: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    """Record an audit event in the database.

    This function is designed to never raise — if the INSERT fails for
    any reason the error is logged but not propagated, so that audit
    logging failures never break the main request flow.

    Args:
        db: Active async database session.
        user_id: UUID of the user involved (None for anonymous events).
        event_type: Event category (e.g. 'login', 'register', 'payment').
        metadata: Optional dict of extra context (stored as JSON).
        ip_address: Client IP address.
        user_agent: Client User-Agent header.
    """
    try:
        async with db.begin_nested():
            entry = AuditLog(
                user_id=user_id,
                event_type=event_type,
                metadata_json=metadata,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            db.add(entry)
            await db.flush()
    except Exception:
        logger.exception(
            "Failed to write audit log event: %s (user_id=%s)",
            event_type,
            user_id,
        )
