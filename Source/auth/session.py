"""
Session management for user authentication.
"""

import secrets
from datetime import datetime, timedelta

import streamlit as st

# Session timeout in minutes
SESSION_TIMEOUT = 60


def create_session(user: dict) -> str:
    """
    Create a new session for authenticated user.

    Args:
        user: User data dict

    Returns:
        Session token (str)
    """
    # Generate session token
    token = secrets.token_urlsafe(32)

    # Store session data in streamlit session_state
    st.session_state["authenticated"] = True
    st.session_state["user"] = user
    st.session_state["user_email"] = user["email"]
    st.session_state["user_name"] = user["name"]
    st.session_state["user_tier"] = user["tier"]
    st.session_state["session_token"] = token
    st.session_state["last_activity"] = datetime.now()

    return token


def validate_session(token: str) -> dict | None:
    """
    Validate session token and check timeout.

    Args:
        token: Session token to validate

    Returns:
        User data dict if valid, None otherwise
    """
    if not st.session_state.get("authenticated", False):
        return None

    stored_token = st.session_state.get("session_token")
    if stored_token != token:
        return None

    # Check session timeout
    last_activity = st.session_state.get("last_activity")
    if last_activity:
        elapsed = datetime.now() - last_activity
        if elapsed > timedelta(minutes=SESSION_TIMEOUT):
            invalidate_session(token)
            return None

    # Update last activity
    st.session_state["last_activity"] = datetime.now()

    return st.session_state.get("user")


def refresh_session(token: str) -> bool:
    """
    Refresh session activity timestamp.

    Args:
        token: Session token

    Returns:
        True if refreshed, False if invalid
    """
    if validate_session(token):
        st.session_state["last_activity"] = datetime.now()
        return True
    return False


def invalidate_session(token: str) -> None:
    """
    Invalidate a session (logout).

    Args:
        token: Session token to invalidate
    """
    keys_to_clear = [
        "authenticated",
        "user",
        "user_email",
        "user_name",
        "user_tier",
        "session_token",
        "last_activity"
    ]

    for key in keys_to_clear:
        if key in st.session_state:
            del st.session_state[key]


def cleanup_expired_sessions() -> None:
    """
    Clean up expired sessions.
    Should be called periodically or on app initialization.
    """
    if not st.session_state.get("authenticated", False):
        return

    last_activity = st.session_state.get("last_activity")
    if last_activity:
        elapsed = datetime.now() - last_activity
        if elapsed > timedelta(minutes=SESSION_TIMEOUT):
            token = st.session_state.get("session_token", "")
            invalidate_session(token)


def get_session_info() -> dict | None:
    """
    Get current session information.

    Returns:
        Dict with session info or None if not authenticated
    """
    if not st.session_state.get("authenticated", False):
        return None

    last_activity = st.session_state.get("last_activity")
    time_remaining = None

    if last_activity:
        elapsed = datetime.now() - last_activity
        remaining = timedelta(minutes=SESSION_TIMEOUT) - elapsed
        time_remaining = max(0, int(remaining.total_seconds() / 60))

    return {
        "user": st.session_state.get("user"),
        "token": st.session_state.get("session_token"),
        "last_activity": last_activity,
        "time_remaining_minutes": time_remaining
    }
