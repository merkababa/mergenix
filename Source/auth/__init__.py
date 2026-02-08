"""
Authentication package for Mergenix.
Provides user registration, login, session management, and tier-based access control.
"""

# Import from audit
from .audit import get_audit_log, log_audit_event

# Import email utilities
from .email import send_email, send_password_reset_email, send_verification_email

# Import from helpers (Streamlit UI functions)
from .helpers import (
    get_current_user,
    get_verified_tier,
    render_login_form,
    render_register_form,
    render_user_menu,
    require_auth,
    require_tier,
)

# Import from manager
from .manager import AuthManager

# Import OAuth handler
from .oauth import GoogleOAuthHandler

# Import from rate_limiter
from .rate_limiter import RateLimiter, login_limiter, registration_limiter

# Import from session
from .session import (
    cleanup_expired_sessions,
    create_session,
    get_session_info,
    invalidate_session,
    refresh_session,
    validate_session,
)

# Import TOTP utilities
from .totp import (
    generate_backup_codes,
    generate_provisioning_uri,
    generate_qr_code,
    generate_totp_secret,
    verify_backup_code,
    verify_totp_code,
)

# Import from validators
from .validators import get_password_strength, validate_email, validate_name, validate_password

# Export all public APIs for backward compatibility
__all__ = [
    # Manager
    "AuthManager",
    # Audit
    "log_audit_event",
    "get_audit_log",
    # Rate limiter
    "RateLimiter",
    "login_limiter",
    "registration_limiter",
    # OAuth
    "GoogleOAuthHandler",
    # Helpers
    "render_login_form",
    "render_register_form",
    "get_current_user",
    "get_verified_tier",
    "render_user_menu",
    "require_auth",
    "require_tier",
    # Validators
    "validate_email",
    "validate_password",
    "validate_name",
    "get_password_strength",
    # Session
    "create_session",
    "validate_session",
    "refresh_session",
    "invalidate_session",
    "cleanup_expired_sessions",
    "get_session_info",
    # Email
    "send_email",
    "send_verification_email",
    "send_password_reset_email",
    # TOTP
    "generate_totp_secret",
    "generate_provisioning_uri",
    "generate_qr_code",
    "verify_totp_code",
    "generate_backup_codes",
    "verify_backup_code",
]
