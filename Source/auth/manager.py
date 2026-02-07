"""
Core authentication manager for user operations.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Tuple, Dict, Optional
import bcrypt
import streamlit as st

from .validators import validate_email, validate_password


class AuthManager:
    """Manages user authentication and authorization for Mergenix."""

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

        valid_email, msg = validate_email(email)
        if not valid_email:
            return False, msg

        if not name or len(name) < 2:
            return False, "Name must be at least 2 characters long"

        valid_password, msg = validate_password(password)
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
            "email_verified": False,
            "last_login": None,
            "failed_login_attempts": 0,
            "last_failed_login": None
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

        # Check if account is locked out
        if self.check_lockout(email):
            return False, None

        if self._verify_password(password, user["password_hash"]):
            # Reset failed attempts on successful login
            users[email]["failed_login_attempts"] = 0
            users[email]["last_failed_login"] = None
            self._save_users(users)

            # Update last login
            self.update_last_login(email)

            # Return user data without password hash
            user_data = {k: v for k, v in user.items() if k != "password_hash"}
            user_data["email"] = email
            return True, user_data
        else:
            # Record failed login attempt
            self.record_failed_login(email)

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

    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """
        Get user data by user ID (email in this implementation).

        Args:
            user_id: User identifier (email)

        Returns:
            User data dict or None if not found
        """
        return self.get_user(user_id)

    def update_last_login(self, email: str) -> bool:
        """
        Update user's last login timestamp.

        Args:
            email: User's email address

        Returns:
            True if successful, False otherwise
        """
        email = email.strip().lower()
        users = self._load_users()

        if email not in users:
            return False

        users[email]["last_login"] = datetime.now().isoformat()
        self._save_users(users)
        return True

    def record_failed_login(self, email: str) -> bool:
        """
        Record a failed login attempt.

        Args:
            email: User's email address

        Returns:
            True if recorded, False if user not found
        """
        email = email.strip().lower()
        users = self._load_users()

        if email not in users:
            return False

        users[email]["failed_login_attempts"] = users[email].get("failed_login_attempts", 0) + 1
        users[email]["last_failed_login"] = datetime.now().isoformat()
        self._save_users(users)
        return True

    def check_lockout(self, email: str) -> bool:
        """
        Check if account is locked out due to failed login attempts.

        Args:
            email: User's email address

        Returns:
            True if locked out, False otherwise
        """
        email = email.strip().lower()
        users = self._load_users()

        if email not in users:
            return False

        user = users[email]
        failed_attempts = user.get("failed_login_attempts", 0)

        # Lock out after 5 failed attempts
        if failed_attempts >= 5:
            last_failed = user.get("last_failed_login")
            if last_failed:
                # Auto-unlock after 30 minutes
                last_failed_dt = datetime.fromisoformat(last_failed)
                elapsed = (datetime.now() - last_failed_dt).total_seconds()
                if elapsed > 1800:  # 30 minutes
                    # Reset lockout
                    users[email]["failed_login_attempts"] = 0
                    users[email]["last_failed_login"] = None
                    self._save_users(users)
                    return False
                return True

        return False

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
        valid_password, msg = validate_password(new_password)
        if not valid_password:
            return False, msg

        # Update password
        users[email]["password_hash"] = self._hash_password(new_password)
        self._save_users(users)

        return True, "Password changed successfully"

    def create_oauth_user(
        self,
        email: str,
        name: str,
        provider: str,
        oauth_id: str,
        profile_picture: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Create a new user with OAuth authentication.

        Args:
            email: User's email address
            name: User's full name
            provider: OAuth provider (google, apple)
            oauth_id: Provider's user ID
            profile_picture: Profile picture URL (optional)

        Returns:
            Tuple of (success: bool, message: str)
        """
        email = email.strip().lower()
        name = name.strip()

        # Validate inputs
        valid_email, msg = validate_email(email)
        if not valid_email:
            return False, msg

        if not name or len(name) < 2:
            return False, "Name must be at least 2 characters long"

        if provider not in ["google", "apple"]:
            return False, "Invalid OAuth provider"

        if not oauth_id:
            return False, "OAuth ID is required"

        # Check if user already exists
        users = self._load_users()
        if email in users:
            return False, "Email already registered"

        # Create new user without password (OAuth only)
        users[email] = {
            "name": name,
            "password_hash": None,  # No password for OAuth users
            "tier": "free",
            "subscription_id": None,
            "payment_provider": None,
            "created_at": datetime.now().isoformat(),
            "email_verified": True,  # OAuth emails are pre-verified
            "last_login": None,
            "failed_login_attempts": 0,
            "last_failed_login": None,
            "oauth_provider": provider,
            "oauth_id": oauth_id,
            "profile_picture": profile_picture
        }

        self._save_users(users)
        return True, "Registration successful"

    def link_oauth_account(
        self,
        email: str,
        provider: str,
        oauth_id: str,
        profile_picture: Optional[str] = None
    ) -> bool:
        """
        Link OAuth account to existing user.

        Args:
            email: User's email address
            provider: OAuth provider (google, apple)
            oauth_id: Provider's user ID
            profile_picture: Profile picture URL (optional)

        Returns:
            True if successful, False otherwise
        """
        email = email.strip().lower()
        users = self._load_users()

        if email not in users:
            return False

        if provider not in ["google", "apple"]:
            return False

        # Update user with OAuth info
        users[email]["oauth_provider"] = provider
        users[email]["oauth_id"] = oauth_id
        users[email]["email_verified"] = True  # OAuth emails are verified

        if profile_picture:
            users[email]["profile_picture"] = profile_picture

        self._save_users(users)
        return True

    def get_user_by_oauth(self, provider: str, oauth_id: str) -> Optional[Dict]:
        """
        Get user data by OAuth provider and ID.

        Args:
            provider: OAuth provider (google, apple)
            oauth_id: Provider's user ID

        Returns:
            User data dict or None if not found
        """
        users = self._load_users()

        for email, user_data in users.items():
            if (user_data.get("oauth_provider") == provider and
                user_data.get("oauth_id") == oauth_id):
                # Return user data without password hash
                user_dict = {k: v for k, v in user_data.items() if k != "password_hash"}
                user_dict["email"] = email
                return user_dict

        return None

    def logout(self):
        """Clear authentication session state."""
        keys_to_clear = ["authenticated", "user", "user_email", "user_name", "user_tier", "oauth_state"]
        for key in keys_to_clear:
            if key in st.session_state:
                del st.session_state[key]
