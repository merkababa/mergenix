"""Tests for email verification and password reset (T1.6)."""

import hashlib
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from Source.database import close_db, get_db

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def tmp_db(tmp_path):
    """Create a temporary database path and clean up afterwards."""
    db_path = str(tmp_path / "test_email.db")
    yield db_path
    close_db(db_path)


@pytest.fixture()
def auth(tmp_db):
    """Create an AuthManager backed by a temporary database."""
    from Source.auth.manager import AuthManager
    from Source.auth.rate_limiter import login_limiter, registration_limiter

    # Reset global rate limiters so tests don't interfere with each other
    registration_limiter.reset("testuser@example.com")
    registration_limiter.reset("oauth@example.com")
    registration_limiter.reset("nobody@example.com")
    registration_limiter.reset("user@example.com")
    login_limiter.reset("testuser@example.com")

    mgr = AuthManager(db_path=tmp_db)
    yield mgr
    mgr.close()


@pytest.fixture()
def registered_user(auth):
    """Register a standard test user and return (auth_manager, email, password)."""
    email = "testuser@example.com"
    password = "StrongPass1"
    auth.register_user(email, "Test User", password)
    return auth, email, password


@pytest.fixture()
def oauth_user(auth):
    """Create an OAuth user and return (auth_manager, email)."""
    email = "oauth@example.com"
    auth.create_oauth_user(email, "OAuth User", "google", "g_12345")
    return auth, email


# ---------------------------------------------------------------------------
# Token generation tests
# ---------------------------------------------------------------------------


class TestGenerateVerificationToken:
    """Tests for generate_verification_token."""

    def test_returns_token_string(self, registered_user):
        """Token generation should return a non-empty string."""
        auth, email, _ = registered_user
        token = auth.generate_verification_token(email)
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_tokens_are_unique(self, registered_user):
        """Each call should produce a different token."""
        auth, email, _ = registered_user
        token1 = auth.generate_verification_token(email)
        token2 = auth.generate_verification_token(email)
        assert token1 != token2

    def test_stores_hash_not_plaintext(self, registered_user):
        """Only the SHA-256 hash should be stored in the database."""
        auth, email, _ = registered_user
        token = auth.generate_verification_token(email)
        expected_hash = hashlib.sha256(token.encode()).hexdigest()

        conn = get_db(auth.db_path)
        row = conn.execute(
            "SELECT token_hash FROM auth_tokens WHERE user_email = ? AND token_type = 'email_verification'",
            (email,),
        ).fetchone()
        assert row is not None
        assert row["token_hash"] == expected_hash

    def test_nonexistent_user_returns_none(self, auth):
        """generate_verification_token for non-existent user should return None."""
        result = auth.generate_verification_token("nobody@example.com")
        assert result is None

    def test_invalidates_previous_tokens(self, registered_user):
        """Generating a new token should mark old ones as used."""
        auth, email, _ = registered_user
        auth.generate_verification_token(email)
        auth.generate_verification_token(email)

        conn = get_db(auth.db_path)
        rows = conn.execute(
            "SELECT used_at FROM auth_tokens WHERE user_email = ? AND token_type = 'email_verification' ORDER BY id",
            (email,),
        ).fetchall()
        assert len(rows) == 2
        # First token should be marked as used
        assert rows[0]["used_at"] is not None
        # Second token should still be unused
        assert rows[1]["used_at"] is None


# ---------------------------------------------------------------------------
# Email verification tests
# ---------------------------------------------------------------------------


class TestVerifyEmail:
    """Tests for verify_email."""

    def test_valid_token_verifies(self, registered_user):
        """A valid, unexpired token should verify the email."""
        auth, email, _ = registered_user
        token = auth.generate_verification_token(email)
        success, msg = auth.verify_email(token)
        assert success is True
        assert "verified" in msg.lower()

        # User should now be verified
        user = auth.get_user(email)
        assert user["email_verified"] is True

    def test_invalid_token_fails(self, auth):
        """A completely bogus token should fail."""
        success, msg = auth.verify_email("bogus_token_12345")
        assert success is False
        assert "invalid" in msg.lower()

    def test_expired_token_fails(self, registered_user):
        """An expired token should fail verification."""
        auth, email, _ = registered_user
        token = auth.generate_verification_token(email)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        # Manually set the expiry to the past
        conn = get_db(auth.db_path)
        past = (datetime.now() - timedelta(hours=25)).isoformat()
        conn.execute(
            "UPDATE auth_tokens SET expires_at = ? WHERE token_hash = ?",
            (past, token_hash),
        )
        conn.commit()

        success, msg = auth.verify_email(token)
        assert success is False
        assert "expired" in msg.lower()

    def test_already_used_token_fails(self, registered_user):
        """A token that has already been used should fail."""
        auth, email, _ = registered_user
        token = auth.generate_verification_token(email)

        # First use succeeds
        success1, _ = auth.verify_email(token)
        assert success1 is True

        # Second use fails
        success2, msg = auth.verify_email(token)
        assert success2 is False
        assert "already been used" in msg.lower()


# ---------------------------------------------------------------------------
# Password reset request tests
# ---------------------------------------------------------------------------


class TestRequestPasswordReset:
    """Tests for request_password_reset."""

    def test_existing_user_returns_success(self, registered_user):
        """Password reset for an existing user should return success."""
        auth, email, _ = registered_user
        success, msg, token = auth.request_password_reset(email)
        assert success is True
        assert "if an account exists" in msg.lower()
        assert token is not None

    def test_nonexistent_user_returns_success(self, auth):
        """Password reset for non-existent user should ALSO return success (anti-enumeration)."""
        success, msg, token = auth.request_password_reset("nobody@example.com")
        assert success is True
        assert "if an account exists" in msg.lower()
        assert token is None

    def test_creates_reset_token(self, registered_user):
        """Password reset should create a token in the database."""
        auth, email, _ = registered_user
        _ok, _msg, _token = auth.request_password_reset(email)

        conn = get_db(auth.db_path)
        row = conn.execute(
            "SELECT * FROM auth_tokens WHERE user_email = ? AND token_type = 'password_reset'",
            (email,),
        ).fetchone()
        assert row is not None
        assert row["used_at"] is None

    def test_reset_token_expires_in_one_hour(self, registered_user):
        """Password reset token should expire in approximately 1 hour."""
        auth, email, _ = registered_user
        _ok, _msg, _token = auth.request_password_reset(email)

        conn = get_db(auth.db_path)
        row = conn.execute(
            "SELECT created_at, expires_at FROM auth_tokens WHERE user_email = ? AND token_type = 'password_reset'",
            (email,),
        ).fetchone()

        created = datetime.fromisoformat(row["created_at"])
        expires = datetime.fromisoformat(row["expires_at"])
        delta = expires - created

        # Should be close to 1 hour (allow 5 seconds of tolerance)
        assert abs(delta.total_seconds() - 3600) < 5

    def test_token_returned_directly(self, registered_user):
        """request_password_reset should return the plaintext token directly."""
        auth, email, _ = registered_user
        _ok, _msg, token = auth.request_password_reset(email)
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0


# ---------------------------------------------------------------------------
# Password reset completion tests
# ---------------------------------------------------------------------------


class TestCompletePasswordReset:
    """Tests for complete_password_reset."""

    def test_valid_reset(self, registered_user):
        """A valid reset token should change the password."""
        auth, email, old_password = registered_user
        _ok, _msg, token = auth.request_password_reset(email)

        new_password = "NewStrongPass1"
        success, msg = auth.complete_password_reset(token, new_password)
        assert success is True
        assert "reset successfully" in msg.lower()

        # Old password should no longer work
        ok_old, _, _s1 = auth.authenticate(email, old_password)
        assert ok_old is False

        # New password should work
        ok_new, _, _s2 = auth.authenticate(email, new_password)
        assert ok_new is True

    def test_invalid_token_fails(self, auth):
        """A bogus reset token should fail."""
        success, msg = auth.complete_password_reset("bogus_token", "NewStrongPass1")
        assert success is False
        assert "invalid" in msg.lower()

    def test_expired_reset_token_fails(self, registered_user):
        """An expired reset token should fail."""
        auth, email, _ = registered_user
        _ok, _msg, token = auth.request_password_reset(email)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        # Set expiry in the past
        conn = get_db(auth.db_path)
        past = (datetime.now() - timedelta(hours=2)).isoformat()
        conn.execute(
            "UPDATE auth_tokens SET expires_at = ? WHERE token_hash = ?",
            (past, token_hash),
        )
        conn.commit()

        success, msg = auth.complete_password_reset(token, "NewStrongPass1")
        assert success is False
        assert "expired" in msg.lower()

    def test_weak_password_fails(self, registered_user):
        """Reset with a weak password should fail validation."""
        auth, email, _ = registered_user
        _ok, _msg, token = auth.request_password_reset(email)

        success, msg = auth.complete_password_reset(token, "short")
        assert success is False
        assert "password" in msg.lower()

    def test_used_reset_token_fails(self, registered_user):
        """A reset token that was already used should fail."""
        auth, email, _ = registered_user
        _ok, _msg, token = auth.request_password_reset(email)

        # First use
        success1, _ = auth.complete_password_reset(token, "NewStrongPass1")
        assert success1 is True

        # Second use
        success2, msg = auth.complete_password_reset(token, "AnotherPass1")
        assert success2 is False
        assert "already been used" in msg.lower()


# ---------------------------------------------------------------------------
# Resend verification tests
# ---------------------------------------------------------------------------


class TestResendVerification:
    """Tests for resend_verification."""

    def test_resend_success(self, registered_user):
        """Resending for an unverified user should succeed."""
        auth, email, _ = registered_user
        success, msg, token = auth.resend_verification(email)
        assert success is True
        assert "sent" in msg.lower()
        assert token is not None

    def test_resend_already_verified(self, registered_user):
        """Resending for an already-verified user should fail."""
        auth, email, _ = registered_user
        # Verify first
        token = auth.generate_verification_token(email)
        auth.verify_email(token)

        success, msg, token = auth.resend_verification(email)
        assert success is False
        assert "already verified" in msg.lower()
        assert token is None

    def test_resend_nonexistent_user(self, auth):
        """Resending for a non-existent user should fail."""
        success, msg, token = auth.resend_verification("nobody@example.com")
        assert success is False
        assert "no account" in msg.lower()
        assert token is None

    def test_resend_oauth_user(self, oauth_user):
        """Resending for an OAuth user should fail (already verified)."""
        auth, email = oauth_user
        success, msg, token = auth.resend_verification(email)
        assert success is False
        # OAuth users are pre-verified
        assert "already verified" in msg.lower() or "oauth" in msg.lower()
        assert token is None

    def test_token_returned_directly(self, registered_user):
        """resend_verification should return the plaintext token directly."""
        auth, email, _ = registered_user
        _ok, _msg, token = auth.resend_verification(email)
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0


# ---------------------------------------------------------------------------
# OAuth users skip verification tests
# ---------------------------------------------------------------------------


class TestOAuthSkipsVerification:
    """Tests that OAuth users are pre-verified."""

    def test_oauth_user_pre_verified(self, oauth_user):
        """OAuth users should be created with email_verified=True."""
        auth, email = oauth_user
        user = auth.get_user(email)
        assert user["email_verified"] is True


# ---------------------------------------------------------------------------
# Email sending tests (mocked)
# ---------------------------------------------------------------------------


class TestEmailSending:
    """Tests for email sending functions with mocked SMTP."""

    @patch("Source.auth.email.smtplib.SMTP")
    @patch.dict("os.environ", {
        "SMTP_HOST": "smtp.test.com",
        "SMTP_PORT": "587",
        "SMTP_USER": "testuser",
        "SMTP_PASSWORD": "testpass",
        "FROM_EMAIL": "test@mergenix.com",
        "FROM_NAME": "Mergenix Test",
    })
    def test_send_email_success(self, mock_smtp):
        """send_email should return True when SMTP succeeds."""
        from Source.auth.email import send_email

        mock_server = mock_smtp.return_value.__enter__.return_value
        result = send_email("user@example.com", "Test Subject", "<h1>Test</h1>")
        assert result is True
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("testuser", "testpass")
        mock_server.sendmail.assert_called_once()

    def test_send_email_no_smtp_config(self):
        """send_email should return False when SMTP is not configured."""
        from Source.auth.email import send_email

        with patch.dict("os.environ", {"SMTP_HOST": "", "SMTP_USER": ""}, clear=False):
            result = send_email("user@example.com", "Test", "<p>body</p>")
            assert result is False

    @patch("Source.auth.email.send_email", return_value=True)
    def test_send_verification_email_calls_send(self, mock_send):
        """send_verification_email should call send_email with correct params."""
        from Source.auth.email import send_verification_email

        result = send_verification_email("user@test.com", "abc123", "https://app.test")
        assert result is True
        mock_send.assert_called_once()
        call_args = mock_send.call_args
        assert call_args[0][0] == "user@test.com"
        assert "Verify" in call_args[0][1]
        assert "abc123" in call_args[0][2]

    @patch("Source.auth.email.send_email", return_value=True)
    def test_send_password_reset_email_calls_send(self, mock_send):
        """send_password_reset_email should call send_email with correct params."""
        from Source.auth.email import send_password_reset_email

        result = send_password_reset_email("user@test.com", "xyz789", "https://app.test")
        assert result is True
        mock_send.assert_called_once()
        call_args = mock_send.call_args
        assert call_args[0][0] == "user@test.com"
        assert "Reset" in call_args[0][1]
        assert "xyz789" in call_args[0][2]


# ---------------------------------------------------------------------------
# Database schema tests
# ---------------------------------------------------------------------------


class TestAuthTokensTable:
    """Tests for the auth_tokens table schema."""

    def test_table_exists(self, tmp_db):
        """auth_tokens table should be created on database init."""
        conn = get_db(tmp_db)
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='auth_tokens'"
        ).fetchone()
        assert tables is not None
        close_db(tmp_db)

    def test_table_columns(self, tmp_db):
        """auth_tokens table should have all required columns."""
        conn = get_db(tmp_db)
        cursor = conn.execute("PRAGMA table_info(auth_tokens)")
        columns = {row[1] for row in cursor.fetchall()}
        expected = {
            "id", "user_email", "token_type", "token_hash",
            "created_at", "expires_at", "used_at",
        }
        assert expected.issubset(columns)
        close_db(tmp_db)

    def test_hash_index_exists(self, tmp_db):
        """The idx_tokens_hash index should exist."""
        conn = get_db(tmp_db)
        idx = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_tokens_hash'"
        ).fetchone()
        assert idx is not None
        close_db(tmp_db)

    def test_email_index_exists(self, tmp_db):
        """The idx_tokens_email index should exist."""
        conn = get_db(tmp_db)
        idx = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_tokens_email'"
        ).fetchone()
        assert idx is not None
        close_db(tmp_db)

    def test_token_type_constraint(self, tmp_db):
        """Inserting an invalid token_type should fail."""
        from Source.auth.manager import AuthManager

        mgr = AuthManager(db_path=tmp_db)
        mgr.register_user("user@example.com", "User", "StrongPass1")

        conn = get_db(tmp_db)
        with pytest.raises(Exception):  # noqa: B017
            conn.execute(
                "INSERT INTO auth_tokens (user_email, token_type, token_hash, expires_at) VALUES (?, ?, ?, ?)",
                ("user@example.com", "invalid_type", "somehash", datetime.now().isoformat()),
            )
        mgr.close()
