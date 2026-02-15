"""
Account service — shared account deletion logic.

Centralizes the cascade deletion of user data (analysis results, sessions,
payments, user record) used by both the auth and GDPR routers.
Includes audit logging of the deletion event.
"""

from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import AnalysisResult
from app.models.audit import Session
from app.models.payment import Payment
from app.models.user import User
from app.services import audit_service


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
    await db.execute(delete(Payment).where(Payment.user_id == user_id))
    # ConsentRecord, CookiePreference, EmailVerification, and PasswordReset
    # are deleted via ON DELETE CASCADE in the database foreign keys.
    await db.delete(user)
