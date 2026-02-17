"""
Audit log retention service — TTL-based purge mechanism.

Implements GDPR Art 5(1)(e) storage limitation by purging audit log records
that have exceeded their retention period.

Retention Policy:
    - Security events (login, failed_login, password_change, 2fa_enable,
      2fa_disable): **2 years** (730 days).
      Rationale: Security forensics, fraud investigation, regulatory audits.

    - General events (register, payment, tier_change, logout, and any
      unknown/new event types): **1 year** (365 days).
      Rationale: Business analytics and compliance. Unknown event types
      default to this tier to avoid premature deletion.

    - Orphaned records (user_id IS NULL — typically left after account
      deletion via ON DELETE SET NULL): **90 days**.
      Rationale: Post-deletion audit trail for GDPR compliance proof,
      but no indefinite retention of abandoned records.

Usage:
    # From a management script or cron job:
    from app.services.retention_service import purge_expired_audit_logs
    deleted = await purge_expired_audit_logs(db_session)

    # For a dry-run preview:
    from app.services.retention_service import get_retention_summary
    summary = await get_retention_summary(db_session)
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

logger = logging.getLogger(__name__)

# ── Retention Policy Constants ───────────────────────────────────────────

# Explicitly classified security events — retained for 2 years (730 days)
# for security forensics, fraud investigation, and regulatory audits.
SECURITY_EVENTS: frozenset[str] = frozenset({
    "login",
    "failed_login",
    "password_change",
    "2fa_enable",
    "2fa_disable",
})

# The following known event types are NOT in SECURITY_EVENTS and therefore
# fall into the general retention tier (1 year / 365 days).  This is a
# deliberate classification decision — they are important for business
# analytics and compliance but do not require the longer security window:
#
#   Authentication lifecycle:
#     login_2fa_required, login_2fa_complete, 2fa_login_failed,
#     2fa_setup_started, 2fa_enable_failed, 2fa_disable_failed,
#     logout, register, register_failed
#
#   Account management:
#     email_verified, resend_verification, password_reset_requested,
#     password_reset_completed, password_change_failed,
#     profile_rectified, email_verification_required
#
#   Age verification:
#     age_verified, age_verification_failed
#
#   Sessions:
#     session_revoked, all_sessions_revoked
#
#   Deletion:
#     delete_account_failed, deletion_requested, account_deleted
#
#   Data & payments:
#     data_exported, payment_received, tier_upgraded
#
#   OAuth:
#     oauth_login
#
# Any NEW event types not listed above will also default to the general
# tier (1 year), which is the safe conservative choice — events are never
# deleted sooner than intended.

SECURITY_RETENTION_DAYS: int = 730    # 2 years
GENERAL_RETENTION_DAYS: int = 365     # 1 year
ORPHANED_RETENTION_DAYS: int = 90     # 90 days


# ── Public API ───────────────────────────────────────────────────────────


_PURGE_BATCH_SIZE: int = 1000


async def _batched_delete(
    db: AsyncSession,
    where_clause: list,
) -> int:
    """Delete records matching *where_clause* in batches of _PURGE_BATCH_SIZE.

    Selects IDs first (with LIMIT), then deletes by ID list. This avoids
    holding a long-running lock on the entire table during large purges.

    Returns:
        Total number of rows deleted across all batches.
    """
    total = 0
    while True:
        id_result = await db.execute(
            select(AuditLog.id).where(and_(*where_clause)).limit(_PURGE_BATCH_SIZE)
        )
        id_list = [row[0] for row in id_result.fetchall()]
        if not id_list:
            break
        await db.execute(delete(AuditLog).where(AuditLog.id.in_(id_list)))
        await db.flush()
        total += len(id_list)
    return total


async def purge_expired_audit_logs(db: AsyncSession) -> int:
    """Delete audit log records that have exceeded their retention period.

    Applies three distinct retention policies based on record category:
    1. Orphaned records (user_id IS NULL) — 90-day TTL.
    2. Security events (with a user) — 2-year TTL.
    3. General/unknown events (with a user) — 1-year TTL.

    Deletes are performed in batches of 1000 rows to avoid long-running
    table locks on large tables.

    Args:
        db: Active async database session. The caller is responsible
            for committing the transaction after this function returns.

    Returns:
        Total number of audit log records deleted.
    """
    now = datetime.now(UTC)
    total_deleted = 0

    # ── 1. Orphaned records (user_id IS NULL, any event type) ────────
    orphan_cutoff = now - timedelta(days=ORPHANED_RETENTION_DAYS)
    orphan_deleted = await _batched_delete(db, [
        AuditLog.user_id.is_(None),
        AuditLog.created_at < orphan_cutoff,
    ])
    total_deleted += orphan_deleted

    # ── 2. Security events (user_id IS NOT NULL, in SECURITY_EVENTS) ─
    security_cutoff = now - timedelta(days=SECURITY_RETENTION_DAYS)
    security_deleted = await _batched_delete(db, [
        AuditLog.user_id.is_not(None),
        AuditLog.event_type.in_(SECURITY_EVENTS),
        AuditLog.created_at < security_cutoff,
    ])
    total_deleted += security_deleted

    # ── 3. General events (user_id IS NOT NULL, NOT in SECURITY_EVENTS)
    general_cutoff = now - timedelta(days=GENERAL_RETENTION_DAYS)
    general_deleted = await _batched_delete(db, [
        AuditLog.user_id.is_not(None),
        AuditLog.event_type.not_in(SECURITY_EVENTS),
        AuditLog.created_at < general_cutoff,
    ])
    total_deleted += general_deleted

    await db.commit()

    logger.info(
        "audit_log_purge_complete: deleted=%d (orphaned=%d, security=%d, general=%d)",
        total_deleted,
        orphan_deleted,
        security_deleted,
        general_deleted,
    )

    return total_deleted


async def get_retention_summary(db: AsyncSession) -> dict[str, int]:
    """Return a diagnostic summary of expired audit log records.

    Useful for dry-run previews before executing a purge. Does NOT
    delete anything.

    Returns:
        Dict with keys: expired_security, expired_general,
        expired_orphaned, total_expired, total_records.
    """
    now = datetime.now(UTC)

    # Count expired orphaned records
    orphan_cutoff = now - timedelta(days=ORPHANED_RETENTION_DAYS)
    orphan_count_result = await db.execute(
        select(func.count())
        .select_from(AuditLog)
        .where(
            and_(
                AuditLog.user_id.is_(None),
                AuditLog.created_at < orphan_cutoff,
            )
        )
    )
    expired_orphaned = orphan_count_result.scalar() or 0

    # Count expired security events
    security_cutoff = now - timedelta(days=SECURITY_RETENTION_DAYS)
    security_count_result = await db.execute(
        select(func.count())
        .select_from(AuditLog)
        .where(
            and_(
                AuditLog.user_id.is_not(None),
                AuditLog.event_type.in_(SECURITY_EVENTS),
                AuditLog.created_at < security_cutoff,
            )
        )
    )
    expired_security = security_count_result.scalar() or 0

    # Count expired general events
    general_cutoff = now - timedelta(days=GENERAL_RETENTION_DAYS)
    general_count_result = await db.execute(
        select(func.count())
        .select_from(AuditLog)
        .where(
            and_(
                AuditLog.user_id.is_not(None),
                AuditLog.event_type.not_in(SECURITY_EVENTS),
                AuditLog.created_at < general_cutoff,
            )
        )
    )
    expired_general = general_count_result.scalar() or 0

    # Total records
    total_result = await db.execute(
        select(func.count()).select_from(AuditLog)
    )
    total_records = total_result.scalar() or 0

    total_expired = expired_security + expired_general + expired_orphaned

    return {
        "expired_security": expired_security,
        "expired_general": expired_general,
        "expired_orphaned": expired_orphaned,
        "total_expired": total_expired,
        "total_records": total_records,
    }
