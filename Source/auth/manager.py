"""
Core authentication manager for user operations.
"""

import hashlib
import json
import logging
import secrets
from datetime import datetime, timedelta

import bcrypt
import streamlit as st
from Source.database import close_db, get_db, init_db

from .audit import log_audit_event
from .rate_limiter import login_limiter, registration_limiter
from .totp import (
    generate_backup_codes,
    generate_qr_code,
    generate_totp_secret,
    verify_backup_code,
    verify_totp_code,
)
from .validators import validate_email, validate_password

_logger = logging.getLogger(__name__)


class AuthManager:
    """Manages user authentication and authorization for Mergenix."""

    TIERS = ["free", "premium", "pro"]
    TIER_HIERARCHY = {"free": 0, "premium": 1, "pro": 2}

    # Pre-computed bcrypt hash for constant-time comparison on non-existent users
    _DUMMY_HASH = bcrypt.hashpw(b"dummy_password_for_timing", bcrypt.gensalt()).decode(
        "utf-8"
    )

    def __init__(self, db_path: str = "data/mergenix.db"):
        """
        Initialize the authentication manager.

        Args:
            db_path: Path to the SQLite database file.
        """
        self.db_path = db_path
        self._conn = None
        self._init_db()

    def _init_db(self):
        """Initialize the database connection and run migrations."""
        self._conn = init_db(self.db_path)

    def _get_conn(self):
        """
        Get the active database connection.

        Returns:
            sqlite3.Connection instance.
        """
        if self._conn is None:
            self._conn = get_db(self.db_path)
        return self._conn

    def close(self):
        """Close the database connection (useful for testing cleanup)."""
        close_db(self.db_path)
        self._conn = None

    def _hash_password(self, password: str) -> str:
        """Hash a password using bcrypt."""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify a password against its hash."""
        try:
            return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
        except Exception:  # noqa: BLE001
            return False

    def _row_to_dict(self, row) -> dict | None:
        """
        Convert a sqlite3.Row to a plain dict, excluding sensitive fields
        (password_hash, totp_secret, backup_codes).

        Args:
            row: sqlite3.Row from a SELECT query.

        Returns:
            Dict with user data (no sensitive fields), or None if row is None.
        """
        if row is None:
            return None
        d = dict(row)
        d.pop("password_hash", None)
        d.pop("totp_secret", None)
        d.pop("backup_codes", None)
        # Convert email_verified from int to bool for backward compatibility
        if "email_verified" in d:
            d["email_verified"] = bool(d["email_verified"])
        # Convert totp_enabled from int to bool
        if "totp_enabled" in d:
            d["totp_enabled"] = bool(d["totp_enabled"])
        return d

    def register_user(self, email: str, name: str, password: str) -> tuple[bool, str]:
        """
        Register a new user.

        Args:
            email: User's email address
            name: User's full name
            password: User's password (will be hashed)

        Returns:
            Tuple of (success: bool, message: str)
        """
        email = email.strip().lower()
        name = name.strip()

        # Rate limit check
        if registration_limiter.is_limited(email):
            return False, "Too many registration attempts. Please try again later."

        registration_limiter.record(email)

        valid_email, msg = validate_email(email)
        if not valid_email:
            log_audit_event(
                "register_failed",
                user_email=email,
                details={"reason": msg},
                success=False,
                db_path=self.db_path,
            )
            return False, msg

        if not name or len(name) < 2:
            log_audit_event(
                "register_failed",
                user_email=email,
                details={"reason": "Name must be at least 2 characters long"},
                success=False,
                db_path=self.db_path,
            )
            return False, "Name must be at least 2 characters long"

        valid_password, msg = validate_password(password)
        if not valid_password:
            log_audit_event(
                "register_failed",
                user_email=email,
                details={"reason": msg},
                success=False,
                db_path=self.db_path,
            )
            return False, msg

        conn = self._get_conn()

        # Check if user already exists
        existing = conn.execute("SELECT email FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            log_audit_event(
                "register_failed",
                user_email=email,
                details={"reason": "duplicate_email"},
                success=False,
                db_path=self.db_path,
            )
            # Generic message to prevent account enumeration
            return False, "Unable to create account. Please try a different email address."

        # Create new user
        now = datetime.now().isoformat()
        conn.execute(
            """
            INSERT INTO users (
                email, name, password_hash, tier, subscription_id,
                payment_provider, created_at, email_verified, last_login,
                failed_login_attempts, last_failed_login
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                email,
                name,
                self._hash_password(password),
                "free",
                None,
                None,
                now,
                0,
                None,
                0,
                None,
            ),
        )
        conn.commit()
        log_audit_event(
            "register_success",
            user_email=email,
            details={"name": name},
            success=True,
            db_path=self.db_path,
        )
        return True, "Registration successful"

    def authenticate(self, email: str, password: str) -> tuple[bool, dict | None, str]:
        """
        Authenticate a user.

        Args:
            email: User's email address
            password: User's password

        Returns:
            Tuple of (success: bool, user_data: dict or None, status: str).
            status is one of: "success", "failed", "2fa_required".
        """
        email = email.strip().lower()

        # Rate limit check
        if login_limiter.is_limited(email):
            log_audit_event(
                "login_failed",
                user_email=email,
                details={"reason": "rate_limited"},
                success=False,
                db_path=self.db_path,
            )
            return False, None, "failed"

        conn = self._get_conn()

        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            # CRITICAL: dummy bcrypt to prevent timing side-channel
            bcrypt.checkpw(password.encode("utf-8"), self._DUMMY_HASH.encode("utf-8"))
            login_limiter.record(email)
            log_audit_event(
                "login_failed",
                user_email=email,
                details={"reason": "user_not_found"},
                success=False,
                db_path=self.db_path,
            )
            return False, None, "failed"

        # Check if account is locked out
        if self.check_lockout(email):
            log_audit_event(
                "login_failed",
                user_email=email,
                details={"reason": "account_locked"},
                success=False,
                db_path=self.db_path,
            )
            return False, None, "failed"

        password_hash = row["password_hash"]
        if password_hash and self._verify_password(password, password_hash):
            # Reset failed attempts on successful login
            conn.execute(
                "UPDATE users SET failed_login_attempts = 0, last_failed_login = NULL WHERE email = ?",
                (email,),
            )
            conn.commit()

            # Check if 2FA is enabled
            if row["totp_enabled"]:
                log_audit_event(
                    "login_2fa_required",
                    user_email=email,
                    details={},
                    success=True,
                    db_path=self.db_path,
                )
                return False, {"email": email}, "2fa_required"

            # Update last login
            self.update_last_login(email)

            # Reset rate limiter on success
            login_limiter.reset(email)

            # Return user data without password hash
            user_data = self._row_to_dict(row)
            log_audit_event(
                "login_success",
                user_email=email,
                details={},
                success=True,
                db_path=self.db_path,
            )
            return True, user_data, "success"
        else:
            # Record failed login attempt
            self.record_failed_login(email)
            login_limiter.record(email)
            log_audit_event(
                "login_failed",
                user_email=email,
                details={"reason": "wrong_password"},
                success=False,
                db_path=self.db_path,
            )

        return False, None, "failed"

    def get_user(self, email: str) -> dict | None:
        """
        Get user data by email.

        Args:
            email: User's email address

        Returns:
            User data dict or None if not found
        """
        email = email.strip().lower()
        conn = self._get_conn()

        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return self._row_to_dict(row)

    def get_user_by_id(self, user_id: str) -> dict | None:
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
        conn = self._get_conn()

        row = conn.execute("SELECT email FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            return False

        conn.execute(
            "UPDATE users SET last_login = ? WHERE email = ?",
            (datetime.now().isoformat(), email),
        )
        conn.commit()
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
        conn = self._get_conn()

        row = conn.execute("SELECT email FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            return False

        conn.execute(
            "UPDATE users SET failed_login_attempts = failed_login_attempts + 1, last_failed_login = ? WHERE email = ?",
            (datetime.now().isoformat(), email),
        )
        conn.commit()
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
        conn = self._get_conn()

        row = conn.execute(
            "SELECT failed_login_attempts, last_failed_login FROM users WHERE email = ?",
            (email,),
        ).fetchone()

        if row is None:
            return False

        failed_attempts = row["failed_login_attempts"]

        # Lock out after 5 failed attempts
        if failed_attempts >= 5:
            last_failed = row["last_failed_login"]
            if last_failed:
                # Auto-unlock after 30 minutes
                last_failed_dt = datetime.fromisoformat(last_failed)
                elapsed = (datetime.now() - last_failed_dt).total_seconds()
                if elapsed > 1800:  # 30 minutes
                    # Reset lockout
                    conn.execute(
                        "UPDATE users SET failed_login_attempts = 0, last_failed_login = NULL WHERE email = ?",
                        (email,),
                    )
                    conn.commit()
                    log_audit_event(
                        "lockout_cleared",
                        user_email=email,
                        details={},
                        success=True,
                        db_path=self.db_path,
                    )
                    return False
                log_audit_event(
                    "account_lockout",
                    user_email=email,
                    details={"attempts": failed_attempts},
                    success=False,
                    db_path=self.db_path,
                )
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
        conn = self._get_conn()

        row = conn.execute("SELECT tier FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            return False

        old_tier = row["tier"]
        conn.execute(
            "UPDATE users SET tier = ?, subscription_id = ?, payment_provider = ? WHERE email = ?",
            (tier, subscription_id, provider, email),
        )
        conn.commit()
        log_audit_event(
            "tier_changed",
            user_email=email,
            details={"old_tier": old_tier, "new_tier": tier, "provider": provider},
            success=True,
            db_path=self.db_path,
        )
        return True

    def change_password(self, email: str, old_password: str, new_password: str) -> tuple[bool, str]:
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
        conn = self._get_conn()

        row = conn.execute("SELECT password_hash FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            log_audit_event(
                "password_change_failed",
                user_email=email,
                details={"reason": "User not found"},
                success=False,
                db_path=self.db_path,
            )
            return False, "User not found"

        # Verify old password
        if not self._verify_password(old_password, row["password_hash"]):
            log_audit_event(
                "password_change_failed",
                user_email=email,
                details={"reason": "Current password is incorrect"},
                success=False,
                db_path=self.db_path,
            )
            return False, "Current password is incorrect"

        # Validate new password
        valid_password, msg = validate_password(new_password)
        if not valid_password:
            log_audit_event(
                "password_change_failed",
                user_email=email,
                details={"reason": msg},
                success=False,
                db_path=self.db_path,
            )
            return False, msg

        # Update password
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE email = ?",
            (self._hash_password(new_password), email),
        )
        conn.commit()

        log_audit_event(
            "password_changed",
            user_email=email,
            details={},
            success=True,
            db_path=self.db_path,
        )
        return True, "Password changed successfully"

    def create_oauth_user(
        self,
        email: str,
        name: str,
        provider: str,
        oauth_id: str,
        profile_picture: str | None = None,
    ) -> tuple[bool, str]:
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

        conn = self._get_conn()

        # Check if user already exists
        existing = conn.execute("SELECT email FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return False, "Unable to create account. Please try a different email address."

        # Create new user without password (OAuth only)
        now = datetime.now().isoformat()
        conn.execute(
            """
            INSERT INTO users (
                email, name, password_hash, tier, subscription_id,
                payment_provider, created_at, email_verified, last_login,
                failed_login_attempts, last_failed_login,
                oauth_provider, oauth_id, profile_picture
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                email,
                name,
                None,  # No password for OAuth users
                "free",
                None,
                None,
                now,
                1,  # OAuth emails are pre-verified
                None,
                0,
                None,
                provider,
                oauth_id,
                profile_picture,
            ),
        )
        conn.commit()
        log_audit_event(
            "oauth_register",
            user_email=email,
            details={"provider": provider},
            success=True,
            db_path=self.db_path,
        )
        return True, "Registration successful"

    def link_oauth_account(
        self,
        email: str,
        provider: str,
        oauth_id: str,
        profile_picture: str | None = None,
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
        conn = self._get_conn()

        row = conn.execute("SELECT email FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            return False

        if provider not in ["google", "apple"]:
            return False

        if profile_picture:
            conn.execute(
                "UPDATE users SET oauth_provider = ?, oauth_id = ?, email_verified = 1, profile_picture = ? WHERE email = ?",
                (provider, oauth_id, profile_picture, email),
            )
        else:
            conn.execute(
                "UPDATE users SET oauth_provider = ?, oauth_id = ?, email_verified = 1 WHERE email = ?",
                (provider, oauth_id, email),
            )
        conn.commit()
        log_audit_event(
            "oauth_linked",
            user_email=email,
            details={"provider": provider},
            success=True,
            db_path=self.db_path,
        )
        return True

    def get_user_by_oauth(self, provider: str, oauth_id: str) -> dict | None:
        """
        Get user data by OAuth provider and ID.

        Args:
            provider: OAuth provider (google, apple)
            oauth_id: Provider's user ID

        Returns:
            User data dict or None if not found
        """
        conn = self._get_conn()

        row = conn.execute(
            "SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?",
            (provider, oauth_id),
        ).fetchone()

        return self._row_to_dict(row)

    def logout(self, user_email: str | None = None):
        """
        Clear authentication session state and log the event.

        Args:
            user_email: Email of the user logging out (for audit trail).
                        If None, attempts to read from session state.
        """
        email = user_email or st.session_state.get("user_email")
        if email:
            log_audit_event(
                "logout",
                user_email=email,
                details={},
                success=True,
                db_path=self.db_path,
            )
        keys_to_clear = ["authenticated", "user", "user_email", "user_name", "user_tier", "oauth_state"]
        for key in keys_to_clear:
            if key in st.session_state:
                del st.session_state[key]

    # -----------------------------------------------------------------------
    # Two-Factor Authentication (T1.2)
    # -----------------------------------------------------------------------

    def setup_2fa(self, email: str) -> dict | None:
        """
        Start 2FA setup: generate a TOTP secret and QR code.

        The secret is stored in the database but ``totp_enabled`` remains
        False until the user verifies a code via ``verify_and_enable_2fa``.

        Args:
            email: User's email address.

        Returns:
            Dict with ``secret`` (str) and ``qr_code`` (PNG bytes),
            or None if user not found.
        """
        email = email.strip().lower()
        conn = self._get_conn()

        row = conn.execute("SELECT email FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            return None

        secret = generate_totp_secret()

        # Store the secret (2FA not yet enabled)
        conn.execute(
            "UPDATE users SET totp_secret = ? WHERE email = ?",
            (secret, email),
        )
        conn.commit()

        qr_bytes = generate_qr_code(email, secret)

        log_audit_event(
            "2fa_setup_started",
            user_email=email,
            details={},
            success=True,
            db_path=self.db_path,
        )

        return {"secret": secret, "qr_code": qr_bytes}

    def verify_and_enable_2fa(
        self, email: str, code: str
    ) -> tuple[bool, list[str] | None]:
        """
        Verify a TOTP code and enable 2FA for the user.

        This should be called after ``setup_2fa`` with a code the user
        obtained from their authenticator app.  On success, generates
        backup codes and returns them in plaintext (one-time display).

        Args:
            email: User's email address.
            code: 6-digit TOTP code from authenticator app.

        Returns:
            Tuple of (success, plaintext_backup_codes or None).
        """
        email = email.strip().lower()
        conn = self._get_conn()

        row = conn.execute(
            "SELECT totp_secret FROM users WHERE email = ?", (email,)
        ).fetchone()
        if row is None or not row["totp_secret"]:
            return False, None

        if not verify_totp_code(row["totp_secret"], code):
            log_audit_event(
                "2fa_enable_failed",
                user_email=email,
                details={"reason": "invalid_code"},
                success=False,
                db_path=self.db_path,
            )
            return False, None

        # Generate backup codes
        plaintext_codes, hashed_codes = generate_backup_codes(10)

        now = datetime.now().isoformat()
        conn.execute(
            """UPDATE users
               SET totp_enabled = 1,
                   backup_codes = ?,
                   backup_codes_remaining = ?,
                   totp_enabled_at = ?
               WHERE email = ?""",
            (json.dumps(hashed_codes), len(hashed_codes), now, email),
        )
        conn.commit()

        log_audit_event(
            "2fa_enabled",
            user_email=email,
            details={},
            success=True,
            db_path=self.db_path,
        )

        return True, plaintext_codes

    def verify_2fa(self, email: str, code: str) -> bool:
        """
        Verify a TOTP code during login.

        Args:
            email: User's email address.
            code: 6-digit TOTP code.

        Returns:
            True if the code is valid.
        """
        email = email.strip().lower()
        conn = self._get_conn()

        row = conn.execute(
            "SELECT totp_secret, totp_enabled FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        if row is None or not row["totp_enabled"] or not row["totp_secret"]:
            return False

        result = verify_totp_code(row["totp_secret"], code)

        if result:
            # Complete the login flow: update last_login and reset rate limiter
            self.update_last_login(email)
            login_limiter.reset(email)
            log_audit_event(
                "2fa_verified",
                user_email=email,
                details={},
                success=True,
                db_path=self.db_path,
            )
        else:
            log_audit_event(
                "2fa_verify_failed",
                user_email=email,
                details={"reason": "invalid_totp"},
                success=False,
                db_path=self.db_path,
            )

        return result

    def verify_2fa_backup_code(self, email: str, code: str) -> bool:
        """
        Verify and consume a backup code during login.

        On successful verification the used code is removed from the
        stored list and ``backup_codes_remaining`` is decremented.

        Args:
            email: User's email address.
            code: Plaintext backup code.

        Returns:
            True if the backup code was valid (and is now consumed).
        """
        email = email.strip().lower()
        conn = self._get_conn()

        row = conn.execute(
            "SELECT backup_codes, totp_enabled FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        if row is None or not row["totp_enabled"] or not row["backup_codes"]:
            return False

        try:
            hashed_codes: list[str] = json.loads(row["backup_codes"])
        except (json.JSONDecodeError, TypeError):
            return False

        matched, idx = verify_backup_code(code, hashed_codes)
        if not matched:
            log_audit_event(
                "2fa_backup_failed",
                user_email=email,
                details={},
                success=False,
                db_path=self.db_path,
            )
            return False

        # Remove the used code
        hashed_codes.pop(idx)
        conn.execute(
            "UPDATE users SET backup_codes = ?, backup_codes_remaining = ? WHERE email = ?",
            (json.dumps(hashed_codes), len(hashed_codes), email),
        )
        conn.commit()

        # Complete login flow
        self.update_last_login(email)
        login_limiter.reset(email)

        log_audit_event(
            "2fa_backup_used",
            user_email=email,
            details={"remaining": len(hashed_codes)},
            success=True,
            db_path=self.db_path,
        )
        return True

    def disable_2fa(self, email: str, code: str) -> bool:
        """
        Disable 2FA for a user. Requires a valid TOTP code.

        Args:
            email: User's email address.
            code: 6-digit TOTP code to confirm identity.

        Returns:
            True if 2FA was successfully disabled.
        """
        email = email.strip().lower()
        conn = self._get_conn()

        row = conn.execute(
            "SELECT totp_secret, totp_enabled FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        if row is None or not row["totp_enabled"] or not row["totp_secret"]:
            return False

        if not verify_totp_code(row["totp_secret"], code):
            log_audit_event(
                "2fa_disable_failed",
                user_email=email,
                details={"reason": "invalid_code"},
                success=False,
                db_path=self.db_path,
            )
            return False

        conn.execute(
            """UPDATE users
               SET totp_enabled = 0,
                   totp_secret = NULL,
                   backup_codes = NULL,
                   backup_codes_remaining = 0,
                   totp_enabled_at = NULL
               WHERE email = ?""",
            (email,),
        )
        conn.commit()

        log_audit_event(
            "2fa_disabled",
            user_email=email,
            details={},
            success=True,
            db_path=self.db_path,
        )
        return True

    def regenerate_backup_codes(
        self, email: str, code: str
    ) -> tuple[bool, list[str] | None]:
        """
        Regenerate backup codes. Requires a valid TOTP code.

        Args:
            email: User's email address.
            code: 6-digit TOTP code to confirm identity.

        Returns:
            Tuple of (success, new_plaintext_backup_codes or None).
        """
        email = email.strip().lower()
        conn = self._get_conn()

        row = conn.execute(
            "SELECT totp_secret, totp_enabled FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        if row is None or not row["totp_enabled"] or not row["totp_secret"]:
            return False, None

        if not verify_totp_code(row["totp_secret"], code):
            log_audit_event(
                "2fa_regen_backup_failed",
                user_email=email,
                details={"reason": "invalid_code"},
                success=False,
                db_path=self.db_path,
            )
            return False, None

        plaintext_codes, hashed_codes = generate_backup_codes(10)
        conn.execute(
            "UPDATE users SET backup_codes = ?, backup_codes_remaining = ? WHERE email = ?",
            (json.dumps(hashed_codes), len(hashed_codes), email),
        )
        conn.commit()

        log_audit_event(
            "2fa_backup_regenerated",
            user_email=email,
            details={},
            success=True,
            db_path=self.db_path,
        )
        return True, plaintext_codes

    def is_2fa_enabled(self, email: str) -> bool:
        """
        Check if a user has 2FA enabled.

        Args:
            email: User's email address.

        Returns:
            True if 2FA is enabled.
        """
        email = email.strip().lower()
        conn = self._get_conn()

        row = conn.execute(
            "SELECT totp_enabled FROM users WHERE email = ?", (email,)
        ).fetchone()
        if row is None:
            return False
        return bool(row["totp_enabled"])

    # -----------------------------------------------------------------------
    # Email verification & password reset (T1.6)
    # -----------------------------------------------------------------------

    def generate_verification_token(self, email: str) -> str | None:
        """
        Generate an email-verification token for a user.

        The plaintext token is returned (to be emailed to the user).
        Only the SHA-256 hash of the token is stored in the database.

        Any existing **unused** verification tokens for this email are
        invalidated (marked as used) before the new one is created.

        Args:
            email: The user's email address.

        Returns:
            The plaintext token string, or None if the user does not exist.
        """
        email = email.strip().lower()
        conn = self._get_conn()

        # Verify user exists
        row = conn.execute("SELECT email FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            return None

        # Generate a cryptographically secure token
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        now = datetime.now()
        expires_at = (now + timedelta(hours=24)).isoformat()

        # Invalidate any existing unused verification tokens for this email
        conn.execute(
            "UPDATE auth_tokens SET used_at = ? WHERE user_email = ? AND token_type = 'email_verification' AND used_at IS NULL",
            (now.isoformat(), email),
        )

        # Insert the new token
        conn.execute(
            "INSERT INTO auth_tokens (user_email, token_type, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
            (email, "email_verification", token_hash, now.isoformat(), expires_at),
        )
        conn.commit()

        _logger.info("Verification token generated for %s", email)
        return token

    def verify_email(self, token: str) -> tuple[bool, str]:
        """
        Verify a user's email address using a verification token.

        Checks that the token exists, has not been used, and has not
        expired.  On success, sets ``email_verified = 1`` on the user
        record and marks the token as used.

        Args:
            token: The plaintext token (received via email link).

        Returns:
            Tuple of (success, message).
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        conn = self._get_conn()

        row = conn.execute(
            "SELECT id, user_email, expires_at, used_at FROM auth_tokens WHERE token_hash = ? AND token_type = 'email_verification'",
            (token_hash,),
        ).fetchone()

        if row is None:
            return False, "Invalid verification token."

        if row["used_at"] is not None:
            return False, "This verification link has already been used."

        expires_at = datetime.fromisoformat(row["expires_at"])
        if datetime.now() > expires_at:
            return False, "This verification link has expired. Please request a new one."

        email = row["user_email"]
        now = datetime.now().isoformat()

        # Mark email as verified
        conn.execute("UPDATE users SET email_verified = 1 WHERE email = ?", (email,))

        # Mark token as used
        conn.execute("UPDATE auth_tokens SET used_at = ? WHERE id = ?", (now, row["id"]))
        conn.commit()

        log_audit_event(
            "email_verified",
            user_email=email,
            details={},
            success=True,
            db_path=self.db_path,
        )

        _logger.info("Email verified for %s", email)
        return True, "Email verified successfully."

    def request_password_reset(self, email: str) -> tuple[bool, str, str | None]:
        """
        Request a password reset for a user.

        SECURITY: This method **always** returns a success message
        regardless of whether the email exists (anti-enumeration).

        If the user exists, a reset token is generated and stored.  The
        caller is responsible for sending the email with the token.

        Args:
            email: The user's email address.

        Returns:
            Tuple of (success, message, token).  ``success`` is always True.
            ``token`` is the plaintext reset token (or None if user doesn't exist).
        """
        generic_msg = "If an account exists with that email, a reset link has been sent."
        email = email.strip().lower()
        conn = self._get_conn()

        # Check if user exists (silently)
        row = conn.execute("SELECT email FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            # Do NOT reveal that the email doesn't exist
            return True, generic_msg, None

        # Generate token
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        now = datetime.now()
        expires_at = (now + timedelta(hours=1)).isoformat()

        # Invalidate any existing unused reset tokens for this email
        conn.execute(
            "UPDATE auth_tokens SET used_at = ? WHERE user_email = ? AND token_type = 'password_reset' AND used_at IS NULL",
            (now.isoformat(), email),
        )

        # Insert the new token
        conn.execute(
            "INSERT INTO auth_tokens (user_email, token_type, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
            (email, "password_reset", token_hash, now.isoformat(), expires_at),
        )
        conn.commit()

        log_audit_event(
            "password_reset_requested",
            user_email=email,
            details={},
            success=True,
            db_path=self.db_path,
        )

        # Store the plaintext token on the returned tuple so the caller can
        # send the email.  We attach it as a third element; callers that only
        # destructure two values are unaffected.
        _logger.info("Password reset token generated for %s", email)

        return True, generic_msg, token

    def complete_password_reset(self, token: str, new_password: str) -> tuple[bool, str]:
        """
        Complete a password reset using a token.

        Validates the token (exists, not used, not expired) and the new
        password.  On success, updates the user's password hash and marks
        the token as used.

        Args:
            token: The plaintext reset token (received via email link).
            new_password: The user's new password.

        Returns:
            Tuple of (success, message).
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        conn = self._get_conn()

        row = conn.execute(
            "SELECT id, user_email, expires_at, used_at FROM auth_tokens WHERE token_hash = ? AND token_type = 'password_reset'",
            (token_hash,),
        ).fetchone()

        if row is None:
            return False, "Invalid or expired reset link."

        if row["used_at"] is not None:
            return False, "This reset link has already been used."

        expires_at = datetime.fromisoformat(row["expires_at"])
        if datetime.now() > expires_at:
            return False, "This reset link has expired. Please request a new one."

        # Validate the new password
        valid_password, msg = validate_password(new_password)
        if not valid_password:
            return False, msg

        email = row["user_email"]
        now = datetime.now().isoformat()

        # Update the password
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE email = ?",
            (self._hash_password(new_password), email),
        )

        # Mark token as used
        conn.execute("UPDATE auth_tokens SET used_at = ? WHERE id = ?", (now, row["id"]))
        conn.commit()

        log_audit_event(
            "password_reset_completed",
            user_email=email,
            details={},
            success=True,
            db_path=self.db_path,
        )

        _logger.info("Password reset completed for %s", email)
        return True, "Password reset successfully. You can now log in with your new password."

    def resend_verification(self, email: str) -> tuple[bool, str, str | None]:
        """
        Resend the email verification link.

        Generates a new verification token (invalidating old ones) and
        returns it so the caller can send the email.

        Args:
            email: The user's email address.

        Returns:
            Tuple of (success, message, token).  ``token`` is the plaintext
            verification token, or None on failure.
        """
        email = email.strip().lower()
        conn = self._get_conn()

        # Check if user exists
        row = conn.execute(
            "SELECT email, email_verified, oauth_provider FROM users WHERE email = ?",
            (email,),
        ).fetchone()

        if row is None:
            return False, "No account found with that email address.", None

        if row["email_verified"]:
            return False, "This email address is already verified.", None

        if row["oauth_provider"]:
            return False, "OAuth accounts do not require email verification.", None

        # Generate a new verification token
        token = self.generate_verification_token(email)
        if token is None:
            return False, "Unable to generate verification token.", None

        log_audit_event(
            "verification_resent",
            user_email=email,
            details={},
            success=True,
            db_path=self.db_path,
        )

        _logger.info("Verification email resend requested for %s", email)
        return True, "A new verification email has been sent.", token
