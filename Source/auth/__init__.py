"""
Authentication package for Mergenix.
Provides user registration, login, session management, and tier-based access control.
"""

# Import from manager
from .manager import AuthManager

# Import OAuth handler
from .oauth import GoogleOAuthHandler

# Import from helpers (Streamlit UI functions)
from .helpers import (
    render_login_form,
    render_register_form,
    get_current_user,
    render_user_menu,
    require_auth,
    require_tier
)

# Import from validators
from .validators import (
    validate_email,
    validate_password,
    validate_name,
    get_password_strength
)

# Import from session
from .session import (
    create_session,
    validate_session,
    refresh_session,
    invalidate_session,
    cleanup_expired_sessions,
    get_session_info
)

# Export all public APIs for backward compatibility
__all__ = [
    # Manager
    "AuthManager",
    # OAuth
    "GoogleOAuthHandler",
    # Helpers
    "render_login_form",
    "render_register_form",
    "get_current_user",
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
]
