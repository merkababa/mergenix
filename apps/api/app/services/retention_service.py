"""
Data Retention Service — GDPR Art 5(1)(e) storage limitation enforcement.

Implements TTL-based purge mechanisms for:
  - Audit log records (security, general, and orphaned categories)
  - Inactive free-tier user accounts (3-year inactivity threshold)
  - Payment records older than 7 years (financial record retention limit)

All purge operations support dry_run=True to preview counts without deleting.
All deletions are batched (1000 rows/batch) with asyncio.sleep between batches
to avoid long-running table locks under production load.

Retention Policies:
    Audit Logs:
        - Orphaned records (user_id IS NULL): 90 days
        - Security events (login, failed_login, password_changed, 2fa_enabled,
          2fa_disabled, result_*): 2 years
        - General/unknown events: 1 year

    Inactive Users (free tier only):
        - Free-tier users inactive for 3+ years are purged.
        - "Inactive" = last_login_at (or created_at if NULL) older than 3 years.
        - Paying subscribers (tier != 'free') are NEVER auto-purged.
        - Cascade: deletes their AnalysisResult rows.
        - FK on payments is SET NULL — payment records survive for compliance.

    Payments:
        - Payment records older than 7 years are purged (financial compliance).
        - user_id may be NULL (orphaned after user deletion) — those are also purged.

Usage:
    from app.services.retention_service import RetentionService

    svc = RetentionService()
    summary = await svc.run_all_purges(db_session)

    # Dry run preview:
    preview = await svc.run_all_purges(db_session, dry_run=True)

    # Legacy function-based API (backwards compatible):
    from app.services.retention_service import purge_expired_audit_logs
    count = await purge_expired_audit_logs(db_session)
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.tiers import TIER_FREE
from app.models.analysis import AnalysisResult
from app.models.audit import AuditLog
from app.models.payment import Payment
from app.models.user import User

logger = logging.getLogger(__name__)

# ── Retention Policy Constants ───────────────────────────────────────────

# Explicitly classified security events — retained for 2 years (730 days)
# for security forensics, fraud investigation, and regulatory audits.
#
# IMPORTANT: These names MUST match the event_type values emitted by
# app/routers/auth.py. Mismatches cause security events to fall through
# to the general-retention bucket (1 year) — a silent under-retention bug.
#
# Verified against auth.py (2026-02-20):
#   "password_changed"  ← auth.py line ~1051
#   "2fa_enabled"       ← auth.py line ~1386
#   "2fa_disabled"      ← auth.py line ~1439
SECURITY_EVENTS: frozenset[str] = frozenset({
    "login",
    "failed_login",
    "password_changed",
    "2fa_enabled",
    "2fa_disabled",
    "result_saved",
    "result_viewed",
    "result_deleted",
    "result_listed",
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
#     password_reset_completed, password_change_failed, password_changed_failed,
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

# Inactive user purge threshold (free tier only)
USER_INACTIVITY_DAYS: int = 365 * 3   # 3 years

# Payment retention threshold (financial compliance)
PAYMENT_RETENTION_DAYS: int = 365 * 7  # 7 years

_PURGE_BATCH_SIZE: int = 1000
_BATCH_SLEEP_SECONDS: float = 0.1


# ── Low-level batch helpers ───────────────────────────────────────────────


async def _batched_delete_by_ids(
    db: AsyncSession,
    model: type,
    ids: list,
    label: str,
) -> int:
    """Delete *model* rows whose primary key is in *ids*, then flush.

    This is the shared inner step for all batch-purge loops:
      1. DELETE WHERE id IN (ids)
      2. db.flush()
      3. asyncio.sleep between full batches (caller decides whether to sleep)

    The sleep is skipped here — callers that loop should call
    ``asyncio.sleep(_BATCH_SLEEP_SECONDS)`` when ``len(ids) == _PURGE_BATCH_SIZE``.

    Args:
        db:    Active async database session.
        model: SQLAlchemy ORM model class whose rows will be deleted.
        ids:   List of primary key values to delete.
        label: Human-readable name used in debug logging.

    Returns:
        Number of rows deleted (i.e. ``len(ids)``).
    """
    if not ids:
        return 0
    await db.execute(delete(model).where(model.id.in_(ids)))
    await db.flush()
    logger.debug("_batched_delete_by_ids: model=%s label=%s count=%d", model.__name__, label, len(ids))
    return len(ids)


async def _batched_delete(
    db: AsyncSession,
    where_clause: list,
) -> int:
    """Delete AuditLog records matching *where_clause* in batches.

    Selects IDs first (with LIMIT), then deletes by ID list via
    ``_batched_delete_by_ids``. This avoids holding a long-running lock on
    the entire table during large purges.

    Returns:
        Total number of rows deleted across all batches.
    """
    total = 0
    while True:
        id_result = await db.execute(
            select(AuditLog.id)
            .where(and_(*where_clause))
            .order_by(AuditLog.created_at.asc())
            .limit(_PURGE_BATCH_SIZE)
        )
        id_list = [row[0] for row in id_result.fetchall()]
        if not id_list:
            break
        total += await _batched_delete_by_ids(db, AuditLog, id_list, "audit_log")
        if len(id_list) == _PURGE_BATCH_SIZE:
            await asyncio.sleep(_BATCH_SLEEP_SECONDS)
    return total


async def _count_expired_audit_logs(db: AsyncSession) -> int:
    """Count (without deleting) audit log records that exceed their retention period."""
    now = datetime.now(UTC)
    total = 0

    orphan_cutoff = now - timedelta(days=ORPHANED_RETENTION_DAYS)
    r = await db.execute(
        select(func.count()).select_from(AuditLog).where(
            and_(AuditLog.user_id.is_(None), AuditLog.created_at < orphan_cutoff)
        )
    )
    total += r.scalar() or 0

    security_cutoff = now - timedelta(days=SECURITY_RETENTION_DAYS)
    r = await db.execute(
        select(func.count()).select_from(AuditLog).where(
            and_(
                AuditLog.user_id.is_not(None),
                AuditLog.event_type.in_(SECURITY_EVENTS),
                AuditLog.created_at < security_cutoff,
            )
        )
    )
    total += r.scalar() or 0

    general_cutoff = now - timedelta(days=GENERAL_RETENTION_DAYS)
    r = await db.execute(
        select(func.count()).select_from(AuditLog).where(
            and_(
                AuditLog.user_id.is_not(None),
                AuditLog.event_type.not_in(SECURITY_EVENTS),
                AuditLog.created_at < general_cutoff,
            )
        )
    )
    total += r.scalar() or 0

    return total


# ── RetentionService class ─────────────────────────────────────────────────


class RetentionService:
    """Orchestrates all data retention purge operations.

    All methods support dry_run=True to preview counts without deleting.
    All actual deletions are batched to avoid table-locking under load.
    """

    async def purge_expired_audit_logs(
        self,
        db: AsyncSession,
        dry_run: bool = False,
    ) -> int:
        """Delete (or count) audit log records beyond their retention period.

        Applies three distinct retention policies:
          1. Orphaned records (user_id IS NULL) — 90-day TTL.
          2. Security events (with a user) — 2-year TTL.
          3. General/unknown events (with a user) — 1-year TTL.

        Args:
            db: Active async database session.
            dry_run: If True, return count without deleting.

        Returns:
            Number of records deleted (or would-be-deleted in dry_run mode).
        """
        if dry_run:
            count = await _count_expired_audit_logs(db)
            logger.info("audit_log_purge dry_run: would_delete=%d", count)
            return count

        return await purge_expired_audit_logs(db)

    async def purge_inactive_users(
        self,
        db: AsyncSession,
        dry_run: bool = False,
    ) -> int:
        """Delete (or count) free-tier users inactive for 3+ years.

        A user is considered inactive when:
          max(last_login_at, created_at) < now - 3 years

        If last_login_at IS NULL, created_at is used as the activity anchor
        (safe fallback for legacy accounts that predate this column).

        SAFETY: Only free-tier (tier == 'free') users are eligible.
        Paying subscribers (premium, pro) are NEVER automatically purged.

        Cascade effects:
          - AnalysisResult rows owned by the user are cascade-deleted (FK CASCADE).
          - Payment rows survive with user_id SET NULL (FK SET NULL).

        Args:
            db: Active async database session.
            dry_run: If True, return count without deleting.

        Returns:
            Number of users deleted (or would-be-deleted in dry_run mode).
        """
        now = datetime.now(UTC)
        cutoff = (now - timedelta(days=USER_INACTIVITY_DAYS)).replace(tzinfo=None)

        # A user is inactive if their effective last activity (last_login_at if set,
        # else created_at) is before the cutoff date.
        # We use COALESCE(last_login_at, created_at) semantics:
        inactive_condition = and_(
            User.tier == TIER_FREE,
            or_(
                # last_login_at is set and older than cutoff
                and_(
                    User.last_login_at.is_not(None),
                    User.last_login_at < cutoff,
                ),
                # last_login_at is NULL → fall back to created_at
                and_(
                    User.last_login_at.is_(None),
                    User.created_at < cutoff,
                ),
            ),
        )

        if dry_run:
            r = await db.execute(
                select(func.count()).select_from(User).where(inactive_condition)
            )
            count = r.scalar() or 0
            logger.info("inactive_user_purge dry_run: would_delete=%d", count)
            return count

        total = 0
        while True:
            id_result = await db.execute(
                select(User.id)
                .where(inactive_condition)
                # nulls_first() ensures deterministic ordering across both
                # SQLite (where NULL ordering is undefined) and PostgreSQL
                # (where NULLs sort last by default in ASC order).
                .order_by(User.last_login_at.asc().nulls_first())
                .limit(_PURGE_BATCH_SIZE)
            )
            id_list = [row[0] for row in id_result.fetchall()]
            if not id_list:
                break

            # NULL out Payment.user_id before deleting users.
            # This ensures the SET NULL semantics hold on both PostgreSQL (FK cascade)
            # and SQLite (which may not always fire FK cascades in batch DELETEs).
            # Payment records must survive for financial compliance (7-year retention).
            await db.execute(
                update(Payment)
                .where(Payment.user_id.in_(id_list))
                .values(user_id=None)
            )

            # Delete AnalysisResult rows first (belt-and-suspenders for SQLite,
            # where FK CASCADE may not fire on core DELETE statements).
            await db.execute(
                delete(AnalysisResult).where(AnalysisResult.user_id.in_(id_list))
            )

            # Delete the users via shared helper (delete + flush)
            total += await _batched_delete_by_ids(db, User, id_list, "inactive_user")
            if len(id_list) == _PURGE_BATCH_SIZE:
                await asyncio.sleep(_BATCH_SLEEP_SECONDS)

        if total > 0:
            await db.commit()
            logger.info("inactive_user_purge complete: deleted=%d", total)

        return total

    async def purge_expired_payments(
        self,
        db: AsyncSession,
        dry_run: bool = False,
    ) -> int:
        """Delete (or count) payment records older than 7 years.

        Applies to all payment records regardless of user_id (NULL or non-NULL).
        The 7-year threshold satisfies standard financial record retention laws
        (e.g., IRS 6-year rule, EU VAT 7-year requirement).

        Args:
            db: Active async database session.
            dry_run: If True, return count without deleting.

        Returns:
            Number of payment records deleted (or would-be-deleted in dry_run mode).
        """
        now = datetime.now(UTC)
        cutoff = (now - timedelta(days=PAYMENT_RETENTION_DAYS)).replace(tzinfo=None)

        expired_condition = Payment.created_at < cutoff

        if dry_run:
            r = await db.execute(
                select(func.count()).select_from(Payment).where(expired_condition)
            )
            count = r.scalar() or 0
            logger.info("payment_purge dry_run: would_delete=%d", count)
            return count

        total = 0
        while True:
            id_result = await db.execute(
                select(Payment.id)
                .where(expired_condition)
                .order_by(Payment.created_at.asc())
                .limit(_PURGE_BATCH_SIZE)
            )
            id_list = [row[0] for row in id_result.fetchall()]
            if not id_list:
                break
            total += await _batched_delete_by_ids(db, Payment, id_list, "expired_payment")
            if len(id_list) == _PURGE_BATCH_SIZE:
                await asyncio.sleep(_BATCH_SLEEP_SECONDS)

        if total > 0:
            await db.commit()
            logger.info("payment_purge complete: deleted=%d", total)

        return total

    async def run_all_purges(
        self,
        db: AsyncSession,
        dry_run: bool = False,
    ) -> dict[str, int | bool]:
        """Run all retention purge functions and return a summary dict.

        Executes in this order:
          1. purge_expired_audit_logs
          2. purge_inactive_users
          3. purge_expired_payments

        Args:
            db: Active async database session.
            dry_run: If True, pass dry_run to each sub-function.

        Returns:
            Dict with keys:
              - audit_logs_purged: int
              - inactive_users_purged: int
              - payments_purged: int
              - dry_run: bool
        """
        audit_count = await self.purge_expired_audit_logs(db, dry_run=dry_run)
        user_count = await self.purge_inactive_users(db, dry_run=dry_run)
        payment_count = await self.purge_expired_payments(db, dry_run=dry_run)

        summary: dict[str, int | bool] = {
            "audit_logs_purged": audit_count,
            "inactive_users_purged": user_count,
            "payments_purged": payment_count,
            "dry_run": dry_run,
        }

        logger.info(
            "retention_run_all_purges complete: %s",
            summary,
        )

        return summary


# ── Legacy function-based API (backwards compatible) ──────────────────────


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
