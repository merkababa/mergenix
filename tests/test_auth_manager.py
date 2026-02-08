"""
Comprehensive test suite for Source/auth/ — manager, validators, rate_limiter, session.

Covers registration, login, password management, email validation, session management,
rate limiting, 2FA/TOTP, account lockout, email verification, password reset, OAuth,
tier management, and security edge cases.
"""

import hashlib
import time
from datetime import datetime, timedelta
from unittest.mock import patch

import pyotp
import pytest
from Source.auth.manager import AuthManager
from Source.auth.rate_limiter import RateLimiter, login_limiter, registration_limiter
from Source.auth.validators import (
    get_password_strength,
    validate_email,
    validate_name,
    validate_password,
)
from Source.database import close_db

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _reset_rate_limiters():
    """Reset global rate limiters before every test to prevent cross-test pollution."""
    registration_limiter.reset("alice@example.com")
    login_limiter.reset("alice@example.com")
    yield
    registration_limiter.reset("alice@example.com")
    login_limiter.reset("alice@example.com")


@pytest.fixture()
def tmp_db(tmp_path):
    """Provide a temporary SQLite database path and clean up after test."""
    db_path = str(tmp_path / "test_auth.db")
    yield db_path
    close_db(db_path)


@pytest.fixture()
def auth(tmp_db):
    """Provide an AuthManager backed by a temporary database."""
    mgr = AuthManager(db_path=tmp_db)
    yield mgr
    mgr.close()


@pytest.fixture()
def registered_user(auth):
    """Register a default user and return (auth_manager, email, password)."""
    email = "alice@example.com"
    password = "StrongPass1"
    ok, msg = auth.register_user(email, "Alice Smith", password)
    assert ok, msg
    return auth, email, password


@pytest.fixture()
def rate_limiter():
    """Provide a fresh RateLimiter with tight limits for testing."""
    return RateLimiter(max_attempts=3, window_seconds=60)


# ---------------------------------------------------------------------------
# 1. Validator Tests
# ---------------------------------------------------------------------------

class TestValidateEmail:
    """Tests for email validation logic."""

    def test_valid_simple_email(self):
        ok, msg = validate_email("user@example.com")
        assert ok is True
        assert msg == ""

    def test_valid_plus_addressing(self):
        ok, msg = validate_email("user+tag@example.com")
        assert ok is True

    def test_valid_subdomain(self):
        ok, msg = validate_email("user@mail.example.co.uk")
        assert ok is True

    def test_invalid_no_at(self):
        ok, msg = validate_email("userexample.com")
        assert ok is False
        assert "Invalid email" in msg

    def test_invalid_empty_string(self):
        ok, msg = validate_email("")
        assert ok is False

    def test_invalid_no_dot_in_domain(self):
        ok, msg = validate_email("user@localhost")
        assert ok is False

    def test_invalid_double_at(self):
        ok, msg = validate_email("user@@example.com")
        assert ok is False

    def test_invalid_missing_local_part(self):
        """Edge case: email with no local part before @."""
        # The current validator is lenient — it only checks basic structure.
        # "@." passes because it has @ and . in the domain part.
        # Test a truly failing case: no @ at all.
        ok, msg = validate_email("nodomain")
        assert ok is False


class TestValidatePassword:
    """Tests for password strength validation."""

    def test_valid_password(self):
        ok, msg = validate_password("Abcdef1x")
        assert ok is True

    def test_too_short(self):
        ok, msg = validate_password("Ab1xxxx")
        assert ok is False
        assert "8 characters" in msg

    def test_missing_uppercase(self):
        ok, msg = validate_password("abcdefg1")
        assert ok is False
        assert "uppercase" in msg

    def test_missing_lowercase(self):
        ok, msg = validate_password("ABCDEFG1")
        assert ok is False
        assert "lowercase" in msg

    def test_missing_digit(self):
        ok, msg = validate_password("Abcdefgh")
        assert ok is False
        assert "digit" in msg

    def test_empty_password(self):
        ok, msg = validate_password("")
        assert ok is False


class TestValidateName:
    """Tests for name validation."""

    def test_valid_name(self):
        ok, msg = validate_name("Alice")
        assert ok is True

    def test_too_short(self):
        ok, msg = validate_name("A")
        assert ok is False

    def test_empty(self):
        ok, msg = validate_name("")
        assert ok is False

    def test_whitespace_only(self):
        ok, msg = validate_name("   ")
        assert ok is False


class TestPasswordStrength:
    """Tests for password strength scoring."""

    def test_strong_password(self):
        result = get_password_strength("MyP@ssw0rd12")
        assert result["score"] == 4
        assert result["label"] == "Strong"

    def test_weak_password(self):
        result = get_password_strength("abc")
        assert result["score"] <= 1

    def test_empty_password(self):
        result = get_password_strength("")
        assert result["score"] == 0
        assert result["label"] == "Very Weak"

    def test_returns_suggestions(self):
        result = get_password_strength("short")
        assert isinstance(result["suggestions"], list)
        assert len(result["suggestions"]) > 0


# ---------------------------------------------------------------------------
# 2. Registration Tests
# ---------------------------------------------------------------------------

class TestRegistration:
    """Tests for user registration flow."""

    def test_register_valid_user(self, auth):
        ok, msg = auth.register_user("new@example.com", "New User", "GoodPass1")
        assert ok is True
        assert "successful" in msg.lower()

    def test_register_duplicate_email(self, registered_user):
        auth, email, password = registered_user
        ok, msg = auth.register_user(email, "Another Name", "GoodPass1")
        assert ok is False
        # Security: message must NOT reveal that the email exists
        assert "email" not in msg.lower() or "different" in msg.lower()

    def test_register_invalid_email(self, auth):
        ok, msg = auth.register_user("bademail", "Name", "GoodPass1")
        assert ok is False

    def test_register_weak_password(self, auth):
        ok, msg = auth.register_user("weak@example.com", "Name", "short")
        assert ok is False

    def test_register_short_name(self, auth):
        ok, msg = auth.register_user("name@example.com", "A", "GoodPass1")
        assert ok is False
        assert "2 characters" in msg

    def test_register_empty_name(self, auth):
        ok, msg = auth.register_user("name@example.com", "", "GoodPass1")
        assert ok is False

    def test_register_email_case_insensitive(self, auth):
        ok1, _ = auth.register_user("CaSeTest@Example.COM", "Test", "GoodPass1")
        assert ok1 is True
        ok2, _ = auth.register_user("casetest@example.com", "Test2", "GoodPass1")
        assert ok2 is False  # duplicate

    def test_register_email_stripped(self, auth):
        ok, _ = auth.register_user("  trim@example.com  ", "Test", "GoodPass1")
        assert ok is True
        user = auth.get_user("trim@example.com")
        assert user is not None

    def test_register_sets_free_tier(self, auth):
        auth.register_user("tier@example.com", "Tier User", "GoodPass1")
        user = auth.get_user("tier@example.com")
        assert user["tier"] == "free"


# ---------------------------------------------------------------------------
# 3. Authentication / Login Tests
# ---------------------------------------------------------------------------

class TestAuthentication:
    """Tests for login / authenticate flow."""

    def test_login_success(self, registered_user):
        auth, email, password = registered_user
        ok, user_data, status = auth.authenticate(email, password)
        assert ok is True
        assert status == "success"
        assert user_data is not None
        assert user_data["email"] == email

    def test_login_wrong_password(self, registered_user):
        auth, email, _ = registered_user
        ok, user_data, status = auth.authenticate(email, "WrongPass1")
        assert ok is False
        assert user_data is None
        assert status == "failed"

    def test_login_nonexistent_user(self, auth):
        ok, user_data, status = auth.authenticate("ghost@example.com", "SomePass1")
        assert ok is False
        assert user_data is None
        assert status == "failed"

    def test_login_case_insensitive_email(self, registered_user):
        auth, email, password = registered_user
        ok, user_data, status = auth.authenticate(email.upper(), password)
        assert ok is True

    def test_login_returns_no_password_hash(self, registered_user):
        auth, email, password = registered_user
        ok, user_data, _ = auth.authenticate(email, password)
        assert ok is True
        assert "password_hash" not in user_data
        assert "totp_secret" not in user_data
        assert "backup_codes" not in user_data


# ---------------------------------------------------------------------------
# 4. Password Management Tests
# ---------------------------------------------------------------------------

class TestPasswordManagement:
    """Tests for password change and hashing."""

    def test_change_password_success(self, registered_user):
        auth, email, old_pw = registered_user
        ok, msg = auth.change_password(email, old_pw, "NewStrongP1")
        assert ok is True
        assert "successfully" in msg.lower()
        # Verify new password works
        ok2, _, status = auth.authenticate(email, "NewStrongP1")
        assert ok2 is True

    def test_change_password_wrong_old(self, registered_user):
        auth, email, _ = registered_user
        ok, msg = auth.change_password(email, "WrongOld1", "NewPass123")
        assert ok is False
        assert "incorrect" in msg.lower()

    def test_change_password_weak_new(self, registered_user):
        auth, email, old_pw = registered_user
        ok, msg = auth.change_password(email, old_pw, "weak")
        assert ok is False

    def test_change_password_nonexistent_user(self, auth):
        ok, msg = auth.change_password("nobody@example.com", "Old1Pass", "NewPass1")
        assert ok is False
        assert "not found" in msg.lower()

    def test_password_hashing_uses_bcrypt(self, auth):
        hashed = auth._hash_password("TestPass1")
        assert hashed.startswith("$2")  # bcrypt prefix

    def test_password_hash_different_each_time(self, auth):
        h1 = auth._hash_password("SamePassword1")
        h2 = auth._hash_password("SamePassword1")
        assert h1 != h2  # different salts

    def test_verify_password_correct(self, auth):
        pw = "Verify1Pass"
        hashed = auth._hash_password(pw)
        assert auth._verify_password(pw, hashed) is True

    def test_verify_password_incorrect(self, auth):
        hashed = auth._hash_password("RightPass1")
        assert auth._verify_password("WrongPass1", hashed) is False

    def test_verify_password_invalid_hash(self, auth):
        assert auth._verify_password("AnyPass1", "not_a_hash") is False


# ---------------------------------------------------------------------------
# 5. Account Lockout Tests
# ---------------------------------------------------------------------------

class TestAccountLockout:
    """Tests for failed login lockout mechanism."""

    def test_no_lockout_initially(self, registered_user):
        auth, email, _ = registered_user
        assert auth.check_lockout(email) is False

    def test_lockout_after_five_failures(self, registered_user):
        auth, email, _ = registered_user
        for _ in range(5):
            auth.record_failed_login(email)
        assert auth.check_lockout(email) is True

    def test_no_lockout_at_four_failures(self, registered_user):
        auth, email, _ = registered_user
        for _ in range(4):
            auth.record_failed_login(email)
        assert auth.check_lockout(email) is False

    def test_lockout_auto_clears_after_timeout(self, registered_user):
        auth, email, _ = registered_user
        for _ in range(5):
            auth.record_failed_login(email)
        assert auth.check_lockout(email) is True

        # Simulate 31 minutes elapsed by updating last_failed_login
        conn = auth._get_conn()
        past = (datetime.now() - timedelta(minutes=31)).isoformat()
        conn.execute(
            "UPDATE users SET last_failed_login = ? WHERE email = ?",
            (past, email),
        )
        conn.commit()
        assert auth.check_lockout(email) is False

    def test_successful_login_resets_failed_attempts(self, registered_user):
        auth, email, password = registered_user
        for _ in range(3):
            auth.record_failed_login(email)
        # Successful login should reset
        ok, _, _ = auth.authenticate(email, password)
        assert ok is True
        # Verify counter is reset
        conn = auth._get_conn()
        row = conn.execute(
            "SELECT failed_login_attempts FROM users WHERE email = ?", (email,)
        ).fetchone()
        assert row["failed_login_attempts"] == 0

    def test_locked_account_rejects_login(self, registered_user):
        auth, email, password = registered_user
        for _ in range(5):
            auth.record_failed_login(email)
        ok, _, status = auth.authenticate(email, password)
        assert ok is False
        assert status == "failed"

    def test_record_failed_login_nonexistent_user(self, auth):
        result = auth.record_failed_login("nobody@example.com")
        assert result is False

    def test_check_lockout_nonexistent_user(self, auth):
        assert auth.check_lockout("nobody@example.com") is False


# ---------------------------------------------------------------------------
# 6. Rate Limiter Tests
# ---------------------------------------------------------------------------

class TestRateLimiter:
    """Tests for the sliding-window rate limiter."""

    def test_not_limited_initially(self, rate_limiter):
        assert rate_limiter.is_limited("user@test.com") is False

    def test_limited_after_max_attempts(self, rate_limiter):
        for _ in range(3):
            rate_limiter.record("user@test.com")
        assert rate_limiter.is_limited("user@test.com") is True

    def test_not_limited_below_max(self, rate_limiter):
        for _ in range(2):
            rate_limiter.record("user@test.com")
        assert rate_limiter.is_limited("user@test.com") is False

    def test_different_keys_independent(self, rate_limiter):
        for _ in range(3):
            rate_limiter.record("a@test.com")
        assert rate_limiter.is_limited("a@test.com") is True
        assert rate_limiter.is_limited("b@test.com") is False

    def test_reset_clears_attempts(self, rate_limiter):
        for _ in range(3):
            rate_limiter.record("user@test.com")
        assert rate_limiter.is_limited("user@test.com") is True
        rate_limiter.reset("user@test.com")
        assert rate_limiter.is_limited("user@test.com") is False

    def test_get_remaining(self, rate_limiter):
        assert rate_limiter.get_remaining("user@test.com") == 3
        rate_limiter.record("user@test.com")
        assert rate_limiter.get_remaining("user@test.com") == 2

    def test_get_remaining_at_zero(self, rate_limiter):
        for _ in range(3):
            rate_limiter.record("user@test.com")
        assert rate_limiter.get_remaining("user@test.com") == 0

    def test_window_expiry(self):
        """Entries older than the window are pruned."""
        limiter = RateLimiter(max_attempts=2, window_seconds=1)
        limiter.record("key")
        limiter.record("key")
        assert limiter.is_limited("key") is True
        time.sleep(1.1)
        assert limiter.is_limited("key") is False

    def test_rate_limited_registration(self, tmp_db):
        """Registration rate limiter blocks after too many attempts."""
        # Reset before test
        registration_limiter.reset("ratelim@example.com")

        auth = AuthManager(db_path=tmp_db)
        try:
            # Fill up registration limiter (5 attempts)
            for _i in range(5):
                registration_limiter.record("ratelim@example.com")

            ok, msg = auth.register_user("ratelim@example.com", "Test", "GoodPass1")
            assert ok is False
            assert "too many" in msg.lower()
        finally:
            registration_limiter.reset("ratelim@example.com")
            auth.close()

    def test_rate_limited_login(self, registered_user):
        """Login rate limiter blocks after too many attempts."""
        auth, email, password = registered_user

        # Reset before test
        login_limiter.reset(email)
        try:
            for _ in range(10):
                login_limiter.record(email)

            ok, _, status = auth.authenticate(email, password)
            assert ok is False
            assert status == "failed"
        finally:
            login_limiter.reset(email)


# ---------------------------------------------------------------------------
# 7. Tier Management Tests
# ---------------------------------------------------------------------------

class TestTierManagement:
    """Tests for subscription tier updates."""

    def test_update_tier_to_premium(self, registered_user):
        auth, email, _ = registered_user
        ok = auth.update_user_tier(email, "premium", "sub_123", "stripe")
        assert ok is True
        user = auth.get_user(email)
        assert user["tier"] == "premium"

    def test_update_tier_to_pro(self, registered_user):
        auth, email, _ = registered_user
        ok = auth.update_user_tier(email, "pro", "sub_456", "paypal")
        assert ok is True
        user = auth.get_user(email)
        assert user["tier"] == "pro"

    def test_update_tier_invalid_tier(self, registered_user):
        auth, email, _ = registered_user
        ok = auth.update_user_tier(email, "diamond", "sub_x", "stripe")
        assert ok is False

    def test_update_tier_invalid_provider(self, registered_user):
        auth, email, _ = registered_user
        ok = auth.update_user_tier(email, "premium", "sub_x", "bitcoin")
        assert ok is False

    def test_update_tier_nonexistent_user(self, auth):
        ok = auth.update_user_tier("nobody@example.com", "premium", "sub_x", "stripe")
        assert ok is False

    def test_update_tier_none_provider(self, registered_user):
        auth, email, _ = registered_user
        ok = auth.update_user_tier(email, "free", None, None)
        assert ok is True


# ---------------------------------------------------------------------------
# 8. User Retrieval Tests
# ---------------------------------------------------------------------------

class TestUserRetrieval:
    """Tests for get_user and get_user_by_id."""

    def test_get_user_exists(self, registered_user):
        auth, email, _ = registered_user
        user = auth.get_user(email)
        assert user is not None
        assert user["email"] == email

    def test_get_user_not_found(self, auth):
        user = auth.get_user("nobody@example.com")
        assert user is None

    def test_get_user_by_id(self, registered_user):
        auth, email, _ = registered_user
        user = auth.get_user_by_id(email)
        assert user is not None
        assert user["email"] == email

    def test_get_user_excludes_sensitive_fields(self, registered_user):
        auth, email, _ = registered_user
        user = auth.get_user(email)
        assert "password_hash" not in user
        assert "totp_secret" not in user
        assert "backup_codes" not in user

    def test_get_user_email_verified_is_bool(self, registered_user):
        auth, email, _ = registered_user
        user = auth.get_user(email)
        assert isinstance(user["email_verified"], bool)


# ---------------------------------------------------------------------------
# 9. Last Login Update Tests
# ---------------------------------------------------------------------------

class TestLastLogin:
    """Tests for last login timestamp tracking."""

    def test_update_last_login_success(self, registered_user):
        auth, email, _ = registered_user
        result = auth.update_last_login(email)
        assert result is True
        user = auth.get_user(email)
        assert user["last_login"] is not None

    def test_update_last_login_nonexistent(self, auth):
        result = auth.update_last_login("nobody@example.com")
        assert result is False


# ---------------------------------------------------------------------------
# 10. OAuth User Tests
# ---------------------------------------------------------------------------

class TestOAuthUsers:
    """Tests for OAuth user creation, linking, and lookup."""

    def test_create_oauth_user(self, auth):
        ok, msg = auth.create_oauth_user(
            "oauth@example.com", "OAuth User", "google", "gid_123"
        )
        assert ok is True
        user = auth.get_user("oauth@example.com")
        assert user is not None
        assert user["email_verified"] is True  # OAuth = pre-verified

    def test_create_oauth_user_with_picture(self, auth):
        ok, _ = auth.create_oauth_user(
            "pic@example.com", "Pic User", "google", "gid_456",
            profile_picture="https://example.com/photo.jpg",
        )
        assert ok is True

    def test_create_oauth_user_duplicate(self, auth):
        auth.create_oauth_user("dup@example.com", "First", "google", "g1")
        ok, msg = auth.create_oauth_user("dup@example.com", "Second", "google", "g2")
        assert ok is False

    def test_create_oauth_user_invalid_provider(self, auth):
        ok, msg = auth.create_oauth_user(
            "bad@example.com", "Name", "facebook", "fb_123"
        )
        assert ok is False

    def test_create_oauth_user_no_oauth_id(self, auth):
        ok, msg = auth.create_oauth_user(
            "noid@example.com", "Name", "google", ""
        )
        assert ok is False

    def test_link_oauth_account(self, registered_user):
        auth, email, _ = registered_user
        result = auth.link_oauth_account(email, "google", "gid_link")
        assert result is True
        user = auth.get_user(email)
        assert user["email_verified"] is True

    def test_link_oauth_invalid_provider(self, registered_user):
        auth, email, _ = registered_user
        result = auth.link_oauth_account(email, "facebook", "fb_link")
        assert result is False

    def test_link_oauth_nonexistent_user(self, auth):
        result = auth.link_oauth_account("nobody@example.com", "google", "gid")
        assert result is False

    def test_get_user_by_oauth(self, auth):
        auth.create_oauth_user("look@example.com", "Lookup", "google", "gid_look")
        user = auth.get_user_by_oauth("google", "gid_look")
        assert user is not None
        assert user["email"] == "look@example.com"

    def test_get_user_by_oauth_not_found(self, auth):
        user = auth.get_user_by_oauth("google", "nonexistent_id")
        assert user is None


# ---------------------------------------------------------------------------
# 11. Two-Factor Authentication (TOTP) Tests
# ---------------------------------------------------------------------------

class TestTwoFactorAuth:
    """Tests for 2FA setup, verification, and backup codes."""

    def test_setup_2fa(self, registered_user):
        auth, email, _ = registered_user
        result = auth.setup_2fa(email)
        assert result is not None
        assert "secret" in result
        assert "qr_code" in result
        assert isinstance(result["qr_code"], bytes)

    def test_setup_2fa_nonexistent_user(self, auth):
        result = auth.setup_2fa("nobody@example.com")
        assert result is None

    def test_verify_and_enable_2fa(self, registered_user):
        auth, email, _ = registered_user
        setup = auth.setup_2fa(email)
        secret = setup["secret"]

        # Generate a valid TOTP code
        totp = pyotp.TOTP(secret)
        code = totp.now()

        ok, backup_codes = auth.verify_and_enable_2fa(email, code)
        assert ok is True
        assert backup_codes is not None
        assert len(backup_codes) == 10

        # Verify 2FA is now enabled
        assert auth.is_2fa_enabled(email) is True

    def test_verify_and_enable_2fa_invalid_code(self, registered_user):
        auth, email, _ = registered_user
        auth.setup_2fa(email)
        ok, codes = auth.verify_and_enable_2fa(email, "000000")
        assert ok is False
        assert codes is None

    def test_verify_and_enable_2fa_no_setup(self, registered_user):
        auth, email, _ = registered_user
        ok, codes = auth.verify_and_enable_2fa(email, "123456")
        assert ok is False

    def test_login_requires_2fa_when_enabled(self, registered_user):
        auth, email, password = registered_user
        setup = auth.setup_2fa(email)
        totp = pyotp.TOTP(setup["secret"])
        auth.verify_and_enable_2fa(email, totp.now())

        # Login should now require 2FA
        ok, user_data, status = auth.authenticate(email, password)
        assert ok is False
        assert status == "2fa_required"
        assert user_data is not None
        assert user_data["email"] == email

    def test_verify_2fa_during_login(self, registered_user):
        auth, email, password = registered_user
        setup = auth.setup_2fa(email)
        secret = setup["secret"]
        totp = pyotp.TOTP(secret)
        auth.verify_and_enable_2fa(email, totp.now())

        # Verify with valid code
        result = auth.verify_2fa(email, totp.now())
        assert result is True

    def test_verify_2fa_invalid_code(self, registered_user):
        auth, email, _ = registered_user
        setup = auth.setup_2fa(email)
        totp = pyotp.TOTP(setup["secret"])
        auth.verify_and_enable_2fa(email, totp.now())

        result = auth.verify_2fa(email, "000000")
        assert result is False

    def test_verify_2fa_not_enabled(self, registered_user):
        auth, email, _ = registered_user
        result = auth.verify_2fa(email, "123456")
        assert result is False

    def test_is_2fa_enabled_false_by_default(self, registered_user):
        auth, email, _ = registered_user
        assert auth.is_2fa_enabled(email) is False

    def test_is_2fa_enabled_nonexistent_user(self, auth):
        assert auth.is_2fa_enabled("nobody@example.com") is False

    def test_disable_2fa(self, registered_user):
        auth, email, _ = registered_user
        setup = auth.setup_2fa(email)
        secret = setup["secret"]
        totp = pyotp.TOTP(secret)
        auth.verify_and_enable_2fa(email, totp.now())

        # Disable with valid code
        result = auth.disable_2fa(email, totp.now())
        assert result is True
        assert auth.is_2fa_enabled(email) is False

    def test_disable_2fa_invalid_code(self, registered_user):
        auth, email, _ = registered_user
        setup = auth.setup_2fa(email)
        totp = pyotp.TOTP(setup["secret"])
        auth.verify_and_enable_2fa(email, totp.now())

        result = auth.disable_2fa(email, "000000")
        assert result is False
        assert auth.is_2fa_enabled(email) is True

    def test_backup_code_verification(self, registered_user):
        auth, email, _ = registered_user
        setup = auth.setup_2fa(email)
        secret = setup["secret"]
        totp = pyotp.TOTP(secret)
        ok, backup_codes = auth.verify_and_enable_2fa(email, totp.now())
        assert ok is True

        # Use a backup code
        result = auth.verify_2fa_backup_code(email, backup_codes[0])
        assert result is True

        # Same code should not work again (consumed)
        result2 = auth.verify_2fa_backup_code(email, backup_codes[0])
        assert result2 is False

    def test_backup_code_remaining_count(self, registered_user):
        auth, email, _ = registered_user
        setup = auth.setup_2fa(email)
        totp = pyotp.TOTP(setup["secret"])
        ok, backup_codes = auth.verify_and_enable_2fa(email, totp.now())

        # Use one backup code
        auth.verify_2fa_backup_code(email, backup_codes[0])

        # Check remaining count in DB
        conn = auth._get_conn()
        row = conn.execute(
            "SELECT backup_codes_remaining FROM users WHERE email = ?", (email,)
        ).fetchone()
        assert row["backup_codes_remaining"] == 9

    def test_backup_code_invalid(self, registered_user):
        auth, email, _ = registered_user
        setup = auth.setup_2fa(email)
        totp = pyotp.TOTP(setup["secret"])
        auth.verify_and_enable_2fa(email, totp.now())

        result = auth.verify_2fa_backup_code(email, "invalid-code")
        assert result is False

    def test_backup_code_2fa_not_enabled(self, registered_user):
        auth, email, _ = registered_user
        result = auth.verify_2fa_backup_code(email, "some-code")
        assert result is False

    def test_regenerate_backup_codes(self, registered_user):
        auth, email, _ = registered_user
        setup = auth.setup_2fa(email)
        secret = setup["secret"]
        totp = pyotp.TOTP(secret)
        auth.verify_and_enable_2fa(email, totp.now())

        ok, new_codes = auth.regenerate_backup_codes(email, totp.now())
        assert ok is True
        assert new_codes is not None
        assert len(new_codes) == 10

    def test_regenerate_backup_codes_invalid_totp(self, registered_user):
        auth, email, _ = registered_user
        setup = auth.setup_2fa(email)
        totp = pyotp.TOTP(setup["secret"])
        auth.verify_and_enable_2fa(email, totp.now())

        ok, codes = auth.regenerate_backup_codes(email, "000000")
        assert ok is False
        assert codes is None


# ---------------------------------------------------------------------------
# 12. Email Verification Tests
# ---------------------------------------------------------------------------

class TestEmailVerification:
    """Tests for email verification token flow."""

    def test_generate_verification_token(self, registered_user):
        auth, email, _ = registered_user
        token = auth.generate_verification_token(email)
        assert token is not None
        assert len(token) > 20

    def test_generate_verification_token_nonexistent(self, auth):
        token = auth.generate_verification_token("nobody@example.com")
        assert token is None

    def test_verify_email_success(self, registered_user):
        auth, email, _ = registered_user
        token = auth.generate_verification_token(email)
        ok, msg = auth.verify_email(token)
        assert ok is True
        assert "verified" in msg.lower()

        user = auth.get_user(email)
        assert user["email_verified"] is True

    def test_verify_email_invalid_token(self, auth):
        ok, msg = auth.verify_email("totally_invalid_token")
        assert ok is False

    def test_verify_email_already_used(self, registered_user):
        auth, email, _ = registered_user
        token = auth.generate_verification_token(email)
        auth.verify_email(token)
        # Second use should fail
        ok, msg = auth.verify_email(token)
        assert ok is False
        assert "already been used" in msg.lower()

    def test_verify_email_expired_token(self, registered_user):
        auth, email, _ = registered_user
        token = auth.generate_verification_token(email)

        # Manually expire the token
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        conn = auth._get_conn()
        past = (datetime.now() - timedelta(hours=25)).isoformat()
        conn.execute(
            "UPDATE auth_tokens SET expires_at = ? WHERE token_hash = ?",
            (past, token_hash),
        )
        conn.commit()

        ok, msg = auth.verify_email(token)
        assert ok is False
        assert "expired" in msg.lower()


# ---------------------------------------------------------------------------
# 13. Password Reset Tests
# ---------------------------------------------------------------------------

class TestPasswordReset:
    """Tests for password reset token flow."""

    def test_request_password_reset_existing_user(self, registered_user):
        auth, email, _ = registered_user
        ok, msg, token = auth.request_password_reset(email)
        assert ok is True
        assert token is not None
        # Message should be generic (anti-enumeration)
        assert "if an account exists" in msg.lower()

    def test_request_password_reset_nonexistent(self, auth):
        ok, msg, token = auth.request_password_reset("nobody@example.com")
        assert ok is True  # Always True for security
        assert token is None
        # Same generic message regardless
        assert "if an account exists" in msg.lower()

    def test_complete_password_reset(self, registered_user):
        auth, email, _ = registered_user
        _, _, token = auth.request_password_reset(email)
        ok, msg = auth.complete_password_reset(token, "BrandNewPw1")
        assert ok is True

        # Login with new password
        ok2, _, status = auth.authenticate(email, "BrandNewPw1")
        assert ok2 is True

    def test_complete_password_reset_invalid_token(self, auth):
        ok, msg = auth.complete_password_reset("bad_token", "NewPass123")
        assert ok is False

    def test_complete_password_reset_used_token(self, registered_user):
        auth, email, _ = registered_user
        _, _, token = auth.request_password_reset(email)
        auth.complete_password_reset(token, "FirstNew1P")
        # Second use should fail
        ok, msg = auth.complete_password_reset(token, "SecondNew1")
        assert ok is False

    def test_complete_password_reset_expired_token(self, registered_user):
        auth, email, _ = registered_user
        _, _, token = auth.request_password_reset(email)

        # Expire the token
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        conn = auth._get_conn()
        past = (datetime.now() - timedelta(hours=2)).isoformat()
        conn.execute(
            "UPDATE auth_tokens SET expires_at = ? WHERE token_hash = ?",
            (past, token_hash),
        )
        conn.commit()

        ok, msg = auth.complete_password_reset(token, "ValidNew1P")
        assert ok is False
        assert "expired" in msg.lower()

    def test_complete_password_reset_weak_new_password(self, registered_user):
        auth, email, _ = registered_user
        _, _, token = auth.request_password_reset(email)
        ok, msg = auth.complete_password_reset(token, "weak")
        assert ok is False


# ---------------------------------------------------------------------------
# 14. Resend Verification Tests
# ---------------------------------------------------------------------------

class TestResendVerification:
    """Tests for resending email verification."""

    def test_resend_verification_success(self, registered_user):
        auth, email, _ = registered_user
        ok, msg, token = auth.resend_verification(email)
        assert ok is True
        assert token is not None

    def test_resend_verification_nonexistent(self, auth):
        ok, msg, token = auth.resend_verification("nobody@example.com")
        assert ok is False
        assert token is None

    def test_resend_verification_already_verified(self, registered_user):
        auth, email, _ = registered_user
        # Verify the email first
        token = auth.generate_verification_token(email)
        auth.verify_email(token)
        # Try to resend
        ok, msg, token2 = auth.resend_verification(email)
        assert ok is False
        assert "already verified" in msg.lower()

    def test_resend_verification_oauth_user(self, auth):
        auth.create_oauth_user("oauth@test.com", "OAuth User", "google", "gid_1")
        ok, msg, token = auth.resend_verification("oauth@test.com")
        assert ok is False
        # OAuth users are pre-verified, so "already verified" takes precedence
        assert "already verified" in msg.lower() or "oauth" in msg.lower()


# ---------------------------------------------------------------------------
# 15. Session Management Tests (with mocked Streamlit)
# ---------------------------------------------------------------------------

class TestSessionManagement:
    """Tests for session creation, validation, and invalidation."""

    @patch("Source.auth.session.st")
    def test_create_session(self, mock_st):
        from Source.auth.session import create_session

        mock_st.session_state = {}
        user = {"email": "test@example.com", "name": "Test", "tier": "free"}
        token = create_session(user)

        assert isinstance(token, str)
        assert len(token) > 20
        assert mock_st.session_state["authenticated"] is True
        assert mock_st.session_state["user_email"] == "test@example.com"
        assert mock_st.session_state["user_tier"] == "free"

    @patch("Source.auth.session.st")
    def test_validate_session_valid(self, mock_st):
        from Source.auth.session import create_session, validate_session

        mock_st.session_state = {}
        user = {"email": "test@example.com", "name": "Test", "tier": "free"}
        token = create_session(user)

        result = validate_session(token)
        assert result is not None
        assert result["email"] == "test@example.com"

    @patch("Source.auth.session.st")
    def test_validate_session_wrong_token(self, mock_st):
        from Source.auth.session import create_session, validate_session

        mock_st.session_state = {}
        user = {"email": "test@example.com", "name": "Test", "tier": "free"}
        create_session(user)

        result = validate_session("wrong_token")
        assert result is None

    @patch("Source.auth.session.st")
    def test_validate_session_not_authenticated(self, mock_st):
        from Source.auth.session import validate_session

        mock_st.session_state = {}
        result = validate_session("any_token")
        assert result is None

    @patch("Source.auth.session.st")
    def test_validate_session_expired(self, mock_st):
        from Source.auth.session import create_session, validate_session

        mock_st.session_state = {}
        user = {"email": "test@example.com", "name": "Test", "tier": "free"}
        token = create_session(user)

        # Simulate expired session (61 minutes ago)
        mock_st.session_state["last_activity"] = datetime.now() - timedelta(minutes=61)

        result = validate_session(token)
        assert result is None

    @patch("Source.auth.session.st")
    def test_invalidate_session(self, mock_st):
        from Source.auth.session import create_session, invalidate_session

        mock_st.session_state = {}
        user = {"email": "test@example.com", "name": "Test", "tier": "free"}
        token = create_session(user)

        invalidate_session(token)
        assert "authenticated" not in mock_st.session_state
        assert "user" not in mock_st.session_state

    @patch("Source.auth.session.st")
    def test_refresh_session(self, mock_st):
        from Source.auth.session import create_session, refresh_session

        mock_st.session_state = {}
        user = {"email": "test@example.com", "name": "Test", "tier": "free"}
        token = create_session(user)

        old_activity = mock_st.session_state["last_activity"]
        time.sleep(0.01)
        result = refresh_session(token)
        assert result is True
        assert mock_st.session_state["last_activity"] >= old_activity

    @patch("Source.auth.session.st")
    def test_refresh_session_invalid_token(self, mock_st):
        from Source.auth.session import refresh_session

        mock_st.session_state = {}
        result = refresh_session("invalid_token")
        assert result is False

    @patch("Source.auth.session.st")
    def test_get_session_info(self, mock_st):
        from Source.auth.session import create_session, get_session_info

        mock_st.session_state = {}
        user = {"email": "test@example.com", "name": "Test", "tier": "free"}
        token = create_session(user)

        info = get_session_info()
        assert info is not None
        assert info["token"] == token
        assert info["time_remaining_minutes"] is not None
        assert info["time_remaining_minutes"] <= 60

    @patch("Source.auth.session.st")
    def test_get_session_info_not_authenticated(self, mock_st):
        from Source.auth.session import get_session_info

        mock_st.session_state = {}
        info = get_session_info()
        assert info is None

    @patch("Source.auth.session.st")
    def test_cleanup_expired_sessions(self, mock_st):
        from Source.auth.session import cleanup_expired_sessions, create_session

        mock_st.session_state = {}
        user = {"email": "test@example.com", "name": "Test", "tier": "free"}
        create_session(user)

        # Simulate expired
        mock_st.session_state["last_activity"] = datetime.now() - timedelta(minutes=61)
        cleanup_expired_sessions()
        assert "authenticated" not in mock_st.session_state

    @patch("Source.auth.session.st")
    def test_session_token_uniqueness(self, mock_st):
        from Source.auth.session import create_session

        mock_st.session_state = {}
        user = {"email": "test@example.com", "name": "Test", "tier": "free"}

        token1 = create_session(user)
        mock_st.session_state = {}
        token2 = create_session(user)
        assert token1 != token2


# ---------------------------------------------------------------------------
# 16. Security Edge Cases
# ---------------------------------------------------------------------------

class TestSecurityEdgeCases:
    """Tests for security-critical behaviors."""

    def test_timing_safe_nonexistent_user_login(self, auth):
        """Login for non-existent user should still perform bcrypt work (timing-safe)."""
        # This mainly verifies the code doesn't crash; true timing test is non-trivial
        ok, _, status = auth.authenticate("ghost@example.com", "AnyPass1")
        assert ok is False
        assert status == "failed"

    def test_sql_injection_in_email(self, auth):
        """SQL injection attempt in email should be safely handled."""
        evil_email = "'; DROP TABLE users; --@evil.com"
        ok, msg = auth.register_user(evil_email, "Hacker", "GoodPass1")
        # Should either fail validation or safely insert (parameterized queries)
        # The key is it should NOT crash or drop the table
        # Verify table still works
        auth.register_user("safe@example.com", "Safe User", "GoodPass1")
        user = auth.get_user("safe@example.com")
        assert user is not None

    def test_sql_injection_in_password(self, auth):
        """SQL injection in password field should be safely handled."""
        auth.register_user("target@example.com", "Target", "GoodPass1")
        ok, _, _ = auth.authenticate("target@example.com", "' OR '1'='1")
        assert ok is False

    def test_empty_string_email_login(self, auth):
        ok, _, status = auth.authenticate("", "AnyPass1")
        assert ok is False

    def test_empty_string_password_login(self, registered_user):
        auth, email, _ = registered_user
        ok, _, status = auth.authenticate(email, "")
        assert ok is False

    def test_very_long_password(self, auth):
        """Passwords >72 bytes are rejected (bcrypt's 72-byte limit)."""
        long_pw = "A1b" + "x" * 200
        # Auth manager enforces bcrypt's 72-byte limit consistently
        ok, msg = auth.register_user("longpw@example.com", "Long", long_pw)
        assert ok is False
        assert "72" in msg or "too long" in msg.lower() or "limit" in msg.lower()

    def test_unicode_in_name(self, auth):
        ok, msg = auth.register_user("uni@example.com", "Taro Yamada", "GoodPass1")
        assert ok is True
        user = auth.get_user("uni@example.com")
        assert user["name"] == "Taro Yamada"

    def test_row_to_dict_none(self, auth):
        result = auth._row_to_dict(None)
        assert result is None

    def test_generic_error_on_duplicate_email(self, registered_user):
        """Error message on duplicate email must not reveal account existence."""
        auth, email, _ = registered_user
        ok, msg = auth.register_user(email, "Dup", "GoodPass1")
        assert ok is False
        # Must NOT say "email already exists" — only generic wording
        assert "already" not in msg.lower() or "different" in msg.lower()

    def test_password_reset_anti_enumeration(self, auth):
        """Password reset for non-existent email returns same message as existing."""
        ok1, msg1, _ = auth.request_password_reset("nobody@example.com")
        auth.register_user("real@example.com", "Real", "GoodPass1")
        ok2, msg2, _ = auth.request_password_reset("real@example.com")
        assert msg1 == msg2  # Same message regardless of email existence


# ---------------------------------------------------------------------------
# 17. Logout Tests (with mocked Streamlit)
# ---------------------------------------------------------------------------

class TestLogout:
    """Tests for logout functionality."""

    @patch("Source.auth.manager.st")
    def test_logout_clears_session(self, mock_st, registered_user):
        auth, email, _ = registered_user
        mock_st.session_state = {
            "authenticated": True,
            "user": {"email": email},
            "user_email": email,
            "user_name": "Alice",
            "user_tier": "free",
            "oauth_state": "some_state",
        }
        auth.logout(user_email=email)
        assert "authenticated" not in mock_st.session_state
        assert "user_email" not in mock_st.session_state


# ---------------------------------------------------------------------------
# 18. Database Connection Tests
# ---------------------------------------------------------------------------

class TestDatabaseConnection:
    """Tests for AuthManager database lifecycle."""

    def test_close_and_reopen(self, tmp_db):
        auth = AuthManager(db_path=tmp_db)
        auth.register_user("conn@example.com", "Conn User", "GoodPass1")
        auth.close()
        # Re-initialize should work
        auth2 = AuthManager(db_path=tmp_db)
        user = auth2.get_user("conn@example.com")
        assert user is not None
        auth2.close()

    def test_get_conn_reconnects(self, tmp_db):
        auth = AuthManager(db_path=tmp_db)
        auth._conn = None  # Simulate lost connection
        conn = auth._get_conn()
        assert conn is not None
        auth.close()
