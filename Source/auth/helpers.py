"""
Streamlit UI helper functions for authentication.
"""


import streamlit as st

from .manager import AuthManager


def render_login_form() -> dict | None:
    """
    Render login form in Streamlit.

    Returns:
        User data dict if login successful, None otherwise
    """
    auth_manager = AuthManager()

    st.sidebar.title("Login")

    with st.sidebar.form("login_form"):
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        submit = st.form_submit_button("Login")

        if submit:
            success, user_data, status = auth_manager.authenticate(email, password)
            if status == "2fa_required":
                st.session_state["2fa_pending_email"] = user_data["email"]
                st.info("Please complete two-factor authentication.")
                st.rerun()
                return None
            if success:
                st.session_state["authenticated"] = True
                st.session_state["user"] = user_data
                st.session_state["user_email"] = user_data["email"]
                st.session_state["user_name"] = user_data["name"]
                st.session_state["user_tier"] = user_data["tier"]
                st.success(f"Welcome back, {user_data['name']}!")
                st.rerun()
                return user_data
            else:
                st.error("Invalid email or password")

    return None


def render_register_form() -> dict | None:
    """
    Render registration form in Streamlit.

    Returns:
        User data dict if registration successful, None otherwise
    """
    auth_manager = AuthManager()

    st.sidebar.title("Register")

    with st.sidebar.form("register_form"):
        name = st.text_input("Full Name")
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        password_confirm = st.text_input("Confirm Password", type="password")
        submit = st.form_submit_button("Register")

        if submit:
            if password != password_confirm:
                st.error("Passwords do not match")
            else:
                success, message = auth_manager.register_user(email, name, password)
                if success:
                    st.success(message)
                    # Auto-login after registration
                    _, user_data, _status = auth_manager.authenticate(email, password)
                    st.session_state["authenticated"] = True
                    st.session_state["user"] = user_data
                    st.session_state["user_email"] = user_data["email"]
                    st.session_state["user_name"] = user_data["name"]
                    st.session_state["user_tier"] = user_data["tier"]
                    st.rerun()
                    return user_data
                else:
                    st.error(message)

    return None


def get_current_user() -> dict | None:
    """
    Get current logged-in user from session state.

    Returns:
        User data dict or None if not authenticated
    """
    if st.session_state.get("authenticated", False):
        return st.session_state.get("user")
    return None


def require_auth():
    """
    Require authentication to access a page.
    Redirects to login if not authenticated.
    """
    if not st.session_state.get("authenticated", False):
        st.warning("Please login to access this page")

        tab1, tab2 = st.tabs(["Login", "Register"])

        with tab1:
            render_login_form()

        with tab2:
            render_register_form()

        st.stop()


def get_verified_tier(email: str | None = None) -> str:
    """
    Re-read user tier from database (not session state).
    Updates session state to keep it in sync.

    Args:
        email: User email. If None, reads from session state.

    Returns:
        Verified tier string ('free', 'premium', 'pro')
    """
    if email is None:
        email = st.session_state.get("user_email")
    if not email:
        return "free"

    auth_manager = AuthManager()
    user = auth_manager.get_user(email)
    if user:
        verified_tier = user.get("tier", "free")
        # Sync session state
        if "user" in st.session_state:
            st.session_state["user"]["tier"] = verified_tier
        st.session_state["user_tier"] = verified_tier
        return verified_tier
    return "free"


def require_tier(min_tier: str) -> bool:
    """
    Check if user has required tier level.

    Uses get_verified_tier() to re-validate from the database instead
    of trusting potentially stale session state.

    Args:
        min_tier: Minimum required tier (free, premium, pro)

    Returns:
        True if user has required tier or higher, False otherwise
    """
    require_auth()  # First ensure user is logged in

    user = get_current_user()
    if not user:
        return False

    # Use verified tier from database, not stale session
    current_tier = get_verified_tier(user.get("email"))

    tier_hierarchy = AuthManager.TIER_HIERARCHY

    if tier_hierarchy.get(current_tier, 0) >= tier_hierarchy.get(min_tier, 0):
        return True

    st.error(f"This feature requires {min_tier} tier or higher. Your current tier: {current_tier}")
    st.info("Please upgrade your account to access this feature.")
    return False


def render_user_menu():
    """Render user menu in sidebar with logout option."""
    user = get_current_user()

    if user:
        st.sidebar.divider()
        st.sidebar.write(f"**{user['name']}**")
        st.sidebar.write(f"Tier: {user['tier'].upper()}")

        if st.sidebar.button("Logout"):
            auth_manager = AuthManager()
            auth_manager.logout()
            st.rerun()
