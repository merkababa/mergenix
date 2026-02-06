"""
Authentication system for Tortit using streamlit-authenticator.
Handles user registration, login, tier management, and password operations.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Tuple, Dict, Optional
import bcrypt
import streamlit as st


class AuthManager:
    """Manages user authentication and authorization for Tortit."""

    TIERS = ["free", "premium", "pro"]
    TIER_HIERARCHY = {"free": 0, "premium": 1, "pro": 2}

    def __init__(self, users_file: str = "data/users.json"):
        """
        Initialize the authentication manager.

        Args:
            users_file: Path to the JSON file storing user data
        """
        self.users_file = users_file
        self._ensure_users_file_exists()

    def _ensure_users_file_exists(self):
        """Create the users file if it doesn't exist."""
        users_path = Path(self.users_file)
        users_path.parent.mkdir(parents=True, exist_ok=True)

        if not users_path.exists():
            with open(self.users_file, 'w') as f:
                json.dump({}, f)

    def _load_users(self) -> Dict:
        """Load users from the JSON file."""
        try:
            with open(self.users_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save_users(self, users: Dict) -> None:
        """Save users to the JSON file."""
        with open(self.users_file, 'w') as f:
            json.dump(users, f, indent=2)

    def _hash_password(self, password: str) -> str:
        """Hash a password using bcrypt."""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify a password against its hash."""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        except Exception:
            return False

    def _validate_email(self, email: str) -> Tuple[bool, str]:
        """Validate email format."""
        if not email or '@' not in email or '.' not in email.split('@')[1]:
            return False, "Invalid email format"
        return True, ""

    def _validate_password(self, password: str) -> Tuple[bool, str]:
        """Validate password strength."""
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        if not any(c.isupper() for c in password):
            return False, "Password must contain at least one uppercase letter"
        if not any(c.islower() for c in password):
            return False, "Password must contain at least one lowercase letter"
        if not any(c.isdigit() for c in password):
            return False, "Password must contain at least one digit"
        return True, ""

    def register_user(self, email: str, name: str, password: str) -> Tuple[bool, str]:
        """
        Register a new user.

        Args:
            email: User's email address
            name: User's full name
            password: User's password (will be hashed)

        Returns:
            Tuple of (success: bool, message: str)
        """
        # Validate inputs
        email = email.strip().lower()
        name = name.strip()

        valid_email, msg = self._validate_email(email)
        if not valid_email:
            return False, msg

        if not name or len(name) < 2:
            return False, "Name must be at least 2 characters long"

        valid_password, msg = self._validate_password(password)
        if not valid_password:
            return False, msg

        # Check if user already exists
        users = self._load_users()
        if email in users:
            return False, "Email already registered"

        # Create new user
        users[email] = {
            "name": name,
            "password_hash": self._hash_password(password),
            "tier": "free",
            "subscription_id": None,
            "payment_provider": None,
            "created_at": datetime.now().isoformat(),
            "email_verified": False
        }

        self._save_users(users)
        return True, "Registration successful"

    def authenticate(self, email: str, password: str) -> Tuple[bool, Optional[Dict]]:
        """
        Authenticate a user.

        Args:
            email: User's email address
            password: User's password

        Returns:
            Tuple of (success: bool, user_data: dict or None)
        """
        email = email.strip().lower()
        users = self._load_users()

        if email not in users:
            return False, None

        user = users[email]
        if self._verify_password(password, user["password_hash"]):
            # Return user data without password hash
            user_data = {k: v for k, v in user.items() if k != "password_hash"}
            user_data["email"] = email
            return True, user_data

        return False, None

    def get_user(self, email: str) -> Optional[Dict]:
        """
        Get user data by email.

        Args:
            email: User's email address

        Returns:
            User data dict or None if not found
        """
        email = email.strip().lower()
        users = self._load_users()

        if email in users:
            user_data = {k: v for k, v in users[email].items() if k != "password_hash"}
            user_data["email"] = email
            return user_data

        return None

    def update_user_tier(self, email: str, tier: str, subscription_id: str, provider: str) -> bool:
        """
        Update user's subscription tier.

        Args:
            email: User's email address
            tier: New tier (free, premium, pro)
            subscription_id: Subscription ID from payment provider
            provider: Payment provider (stripe or paypal)

        Returns:
            True if successful, False otherwise
        """
        if tier not in self.TIERS:
            return False

        if provider not in ["stripe", "paypal", None]:
            return False

        email = email.strip().lower()
        users = self._load_users()

        if email not in users:
            return False

        users[email]["tier"] = tier
        users[email]["subscription_id"] = subscription_id
        users[email]["payment_provider"] = provider

        self._save_users(users)
        return True

    def change_password(self, email: str, old_password: str, new_password: str) -> Tuple[bool, str]:
        """
        Change user's password.

        Args:
            email: User's email address
            old_password: Current password
            new_password: New password

        Returns:
            Tuple of (success: bool, message: str)
        """
        email = email.strip().lower()
        users = self._load_users()

        if email not in users:
            return False, "User not found"

        # Verify old password
        if not self._verify_password(old_password, users[email]["password_hash"]):
            return False, "Current password is incorrect"

        # Validate new password
        valid_password, msg = self._validate_password(new_password)
        if not valid_password:
            return False, msg

        # Update password
        users[email]["password_hash"] = self._hash_password(new_password)
        self._save_users(users)

        return True, "Password changed successfully"

    def logout(self):
        """Clear authentication session state."""
        keys_to_clear = ["authenticated", "user", "user_email", "user_name", "user_tier"]
        for key in keys_to_clear:
            if key in st.session_state:
                del st.session_state[key]


# Streamlit helper functions

def render_login_form() -> Optional[Dict]:
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
            success, user_data = auth_manager.authenticate(email, password)
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


def render_register_form() -> Optional[Dict]:
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
                    _, user_data = auth_manager.authenticate(email, password)
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


def get_current_user() -> Optional[Dict]:
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


def require_tier(min_tier: str) -> bool:
    """
    Check if user has required tier level.

    Args:
        min_tier: Minimum required tier (free, premium, pro)

    Returns:
        True if user has required tier or higher, False otherwise
    """
    require_auth()  # First ensure user is logged in

    user = get_current_user()
    if not user:
        return False

    current_tier = user.get("tier", "free")

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
