"""
Account service — shared account deletion logic.

Centralizes the cascade deletion of user data (analysis results, sessions,
payments, user record) used by both the auth and GDPR routers.
Includes audit logging of the deletion event.
"""

from __future__ import annotations

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import AnalysisResult
from app.models.audit import Session
from app.models.payment import Payment
from app.models.user import User
from app.services import audit_service


async def wipe_analysis_results(
    db: AsyncSession,
    user_id: uuid.UUID,
    reason: str,
    ip_address: str | None = None,
    user_agent_str: str | None = None,
) -> int:
    """Delete all analysis results for a user (ZKE key invalidation consequence).

    When a user resets or changes their password, the encryption key derived
    from the old password is lost, making all previously encrypted results
    unrecoverable.  This function deletes them and logs an audit event.

    Args:
        db: Active async database session.
        user_id: The user's UUID.
        reason: Why the wipe occurred ('password_reset' or 'password_change').
        ip_address: Client IP address for audit logging.
        user_agent_str: Client User-Agent for audit logging.

    Returns:
        Number of analysis results deleted.
    """
    # Count first for the audit log
    count_result = await db.execute(
        select(func.count()).select_from(AnalysisResult).where(AnalysisResult.user_id == user_id)
    )
    count = count_result.scalar_one()

    if count > 0:
        await db.execute(delete(AnalysisResult).where(AnalysisResult.user_id == user_id))

    # Always log the wipe event (even if count is 0, for the audit trail)
    await audit_service.log_event(
        db,
        user_id=user_id,
        event_type="analysis_results_wiped",
        metadata={"reason": reason, "count": count},
        ip_address=ip_address,
        user_agent=user_agent_str,
    )

    return count


async def delete_user_account(
    db: AsyncSession,
    user: User,
    *,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    """Delete a user account and ALL associated data.

    Performs cascade deletion of:
    - AnalysisResult rows
    - Session rows
    - Payment rows
    - The User row itself

    An audit log entry is created BEFORE deletion so it persists
    (AuditLog.user_id has ondelete="SET NULL").

    Args:
        db: Active async database session.
        user: The User ORM instance to delete.
        ip_address: Client IP for the audit log entry.
        user_agent: Client User-Agent for the audit log entry.
    """
    user_id = user.id

    # Log the deletion event BEFORE deleting the user.
    # AuditLog.user_id has ondelete="SET NULL", so the log entry persists
    # with user_id=NULL after the user row is deleted.
    await audit_service.log_event(
        db,
        user_id=user_id,
        event_type="account_deleted",
        ip_address=ip_address,
        user_agent=user_agent,
    )

    # Explicitly delete related records before removing the user.
    # The ORM cascade cannot load them because lazy="raise" is set on
    # the User model's relationships, so direct SQL DELETE is used.
    await db.execute(delete(AnalysisResult).where(AnalysisResult.user_id == user_id))
    await db.execute(delete(Session).where(Session.user_id == user_id))
    # Payment rows here are convenience copies for local display only.
    # Stripe retains the authoritative payment records as Merchant of Record
    # per tax law requirements (e.g., VAT, sales tax). Deleting local Payment
    # rows does NOT affect Stripe's retained records or tax compliance.
    await db.execute(delete(Payment).where(Payment.user_id == user_id))
    # ConsentRecord, CookiePreference, EmailVerification, and PasswordReset
    # are deleted via ON DELETE CASCADE in the database foreign keys.
    await db.delete(user)
