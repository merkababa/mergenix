"""
SQLAlchemy ORM models for Mergenix.

All models are imported here so that Alembic's ``env.py`` can discover
them via ``from app.models import *`` (or by importing Base.metadata).
"""

from app.models.analysis import AnalysisResult  # noqa: F401
from app.models.analytics import DailyEventCount  # noqa: F401
from app.models.audit import AuditLog, EmailVerification, PasswordReset, Session  # noqa: F401
from app.models.consent import ConsentRecord, CookiePreference  # noqa: F401
from app.models.payment import Payment  # noqa: F401
from app.models.user import User  # noqa: F401

__all__ = [
    "AnalysisResult",
    "AuditLog",
    "ConsentRecord",
    "CookiePreference",
    "DailyEventCount",
    "EmailVerification",
    "PasswordReset",
    "Payment",
    "Session",
    "User",
]
