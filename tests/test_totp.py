"""Tests for TOTP 2FA functionality (T1.2)."""

import base64

import pyotp
import pytest
from Source.auth.manager import AuthManager
from Source.auth.rate_limiter import login_limiter, registration_limiter
from Source.auth.totp import (
    generate_backup_codes,
    generate_provisioning_uri,
    generate_qr_code,
    generate_totp_secret,
    verify_backup_code,
    verify_totp_code,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def auth(tmp_path):
    """Create an AuthManager backed by a temporary database."""
    db_path = str(tmp_path / "totp_test.db")

    # Reset global rate limiters so tests don't interfere
    for addr in [
        "alice@test.com",
        "bob@test.com",
        "charlie@test.com",
        "disable@test.com",
        "regen@test.com",
        "twofa@test.com",
        "login2fa@test.com",
        "backup@test.com",
        "nosetup@test.com",
    ]:
        login_limiter.reset(addr)
        registration_limiter.reset(addr)

    mgr = AuthManager(db_path=db_path)
    yield mgr
    mgr.close()


# ---------------------------------------------------------------------------
# TOTP utility function tests
# ---------------------------------------------------------------------------


class TestGenerateSecret:
    """Tests for generate_totp_secret."""

    def test_returns_string(self):
        """Secret should be a non-empty string."""
        secret = generate_totp_secret()
        assert isinstance(secret, str)
        assert len(secret) > 0

    def test_valid_base32(self):
        """Secret should be valid base32."""
        secret = generate_totp_secret()
        # base32 decode should succeed without error
        decoded = base64.b32decode(secret)
        assert len(decoded) > 0

    def test_unique_secrets(self):
        """Consecutive calls should return distinct secrets."""
        s1 = generate_totp_secret()
        s2 = generate_totp_secret()
        assert s1 != s2


class TestProvisioningUri:
    """Tests for generate_provisioning_uri."""

    def test_uri_format(self):
        """URI should start with otpauth://totp/."""
        secret = generate_totp_secret()
        uri = generate_provisioning_uri("user@example.com", secret)
        assert uri.startswith("otpauth://totp/")

    def test_uri_contains_email(self):
        """URI should contain the user's email."""
        secret = generate_totp_secret()
        uri = generate_provisioning_uri("alice@example.com", secret)
        assert "alice%40example.com" in uri or "alice@example.com" in uri

    def test_uri_contains_issuer(self):
        """URI should contain the issuer name."""
        secret = generate_totp_secret()
        uri = generate_provisioning_uri("u@x.com", secret, issuer="MyApp")
        assert "MyApp" in uri

    def test_default_issuer_is_mergenix(self):
        """Default issuer should be Mergenix."""
        secret = generate_totp_secret()
        uri = generate_provisioning_uri("u@x.com", secret)
        assert "Mergenix" in uri


class TestGenerateQrCode:
    """Tests for generate_qr_code."""

    def test_returns_bytes(self):
        """QR code should be returned as bytes."""
        secret = generate_totp_secret()
        qr = generate_qr_code("user@example.com", secret)
        assert isinstance(qr, bytes)
        assert len(qr) > 0

    def test_png_header(self):
        """QR code bytes should start with a PNG header."""
        secret = generate_totp_secret()
        qr = generate_qr_code("user@example.com", secret)
        # PNG files start with \x89PNG\r\n\x1a\n
        assert qr[:4] == b"\x89PNG"


class TestVerifyTotpCode:
    """Tests for verify_totp_code."""

    def test_valid_code(self):
        """A freshly generated code should verify."""
        secret = generate_totp_secret()
        totp = pyotp.TOTP(secret)
        code = totp.now()
        assert verify_totp_code(secret, code) is True

    def test_invalid_code(self):
        """A random string should not verify."""
        secret = generate_totp_secret()
        assert verify_totp_code(secret, "000000") is False

    def test_wrong_secret(self):
        """A code generated with a different secret should not verify."""
        secret1 = generate_totp_secret()
        secret2 = generate_totp_secret()
        totp = pyotp.TOTP(secret1)
        code = totp.now()
        assert verify_totp_code(secret2, code) is False


class TestBackupCodes:
    """Tests for generate_backup_codes and verify_backup_code."""

    def test_generate_default_count(self):
        """Default should generate 10 backup codes."""
        plain, hashed = generate_backup_codes()
        assert len(plain) == 10
        assert len(hashed) == 10

    def test_generate_custom_count(self):
        """Custom count should be honored."""
        plain, hashed = generate_backup_codes(count=5)
        assert len(plain) == 5
        assert len(hashed) == 5

    def test_backup_code_format(self):
        """Each backup code should match xxxx-xxxx hex format."""
        plain, _ = generate_backup_codes(count=3)
        for code in plain:
            parts = code.split("-")
            assert len(parts) == 2
            assert len(parts[0]) == 4
            assert len(parts[1]) == 4

    def test_hashed_codes_are_bcrypt(self):
        """Hashed codes should be bcrypt hashes."""
        _, hashed = generate_backup_codes(count=2)
        for h in hashed:
            assert h.startswith("$2b$")

    def test_verify_correct_code(self):
        """verify_backup_code should match and return the correct index."""
        plain, hashed = generate_backup_codes(count=5)
        matched, idx = verify_backup_code(plain[2], hashed)
        assert matched is True
        assert idx == 2

    def test_verify_wrong_code(self):
        """verify_backup_code should return (False, -1) for non-matching code."""
        _, hashed = generate_backup_codes(count=3)
        matched, idx = verify_backup_code("zzzz-zzzz", hashed)
        assert matched is False
        assert idx == -1

    def test_verify_empty_list(self):
        """verify_backup_code should handle empty hashed list."""
        matched, idx = verify_backup_code("aaaa-bbbb", [])
        assert matched is False
        assert idx == -1


# ---------------------------------------------------------------------------
# AuthManager 2FA integration tests
# ---------------------------------------------------------------------------


class TestAuthManagerSetup2fa:
    """Tests for AuthManager.setup_2fa."""

    def test_setup_returns_secret_and_qr(self, auth):
        """setup_2fa should return dict with secret and qr_code."""
        auth.register_user("alice@test.com", "Alice", "Password1")
        result = auth.setup_2fa("alice@test.com")
        assert result is not None
        assert "secret" in result
        assert "qr_code" in result
        assert isinstance(result["secret"], str)
        assert isinstance(result["qr_code"], bytes)

    def test_setup_nonexistent_user(self, auth):
        """setup_2fa for non-existent user should return None."""
        result = auth.setup_2fa("nobody@test.com")
        assert result is None

    def test_setup_stores_secret_in_db(self, auth):
        """setup_2fa should store the secret in the users table."""
        auth.register_user("bob@test.com", "Bob", "Password1")
        result = auth.setup_2fa("bob@test.com")
        assert result is not None

        conn = auth._get_conn()
        row = conn.execute(
            "SELECT totp_secret, totp_enabled FROM users WHERE email = ?",
            ("bob@test.com",),
        ).fetchone()
        assert row["totp_secret"] == result["secret"]
        assert row["totp_enabled"] == 0  # Not yet enabled


class TestAuthManagerVerifyAndEnable:
    """Tests for AuthManager.verify_and_enable_2fa."""

    def test_enable_with_valid_code(self, auth):
        """verify_and_enable_2fa with a valid code should enable 2FA."""
        auth.register_user("alice@test.com", "Alice", "Password1")
        setup = auth.setup_2fa("alice@test.com")
        assert setup is not None

        # Generate a valid code from the secret
        totp = pyotp.TOTP(setup["secret"])
        code = totp.now()

        success, codes = auth.verify_and_enable_2fa("alice@test.com", code)
        assert success is True
        assert codes is not None
        assert len(codes) == 10

        # Verify 2FA is now enabled
        assert auth.is_2fa_enabled("alice@test.com") is True

    def test_enable_with_invalid_code(self, auth):
        """verify_and_enable_2fa with an invalid code should fail."""
        auth.register_user("bob@test.com", "Bob", "Password1")
        auth.setup_2fa("bob@test.com")

        success, codes = auth.verify_and_enable_2fa("bob@test.com", "000000")
        assert success is False
        assert codes is None
        assert auth.is_2fa_enabled("bob@test.com") is False

    def test_enable_without_setup(self, auth):
        """verify_and_enable_2fa without prior setup should fail."""
        auth.register_user("nosetup@test.com", "NoSetup", "Password1")
        success, codes = auth.verify_and_enable_2fa("nosetup@test.com", "123456")
        assert success is False
        assert codes is None


class TestAuthManagerVerify2fa:
    """Tests for AuthManager.verify_2fa during login."""

    def _enable_2fa(self, auth, email="twofa@test.com"):
        """Helper to register a user and fully enable 2FA."""
        auth.register_user(email, "TwoFA User", "Password1")
        setup = auth.setup_2fa(email)
        totp = pyotp.TOTP(setup["secret"])
        code = totp.now()
        auth.verify_and_enable_2fa(email, code)
        return setup["secret"]

    def test_verify_valid_totp(self, auth):
        """verify_2fa with a valid TOTP code should succeed."""
        secret = self._enable_2fa(auth)
        totp = pyotp.TOTP(secret)
        assert auth.verify_2fa("twofa@test.com", totp.now()) is True

    def test_verify_invalid_totp(self, auth):
        """verify_2fa with an invalid code should fail."""
        self._enable_2fa(auth)
        assert auth.verify_2fa("twofa@test.com", "000000") is False

    def test_verify_2fa_not_enabled(self, auth):
        """verify_2fa should fail when 2FA is not enabled."""
        auth.register_user("charlie@test.com", "Charlie", "Password1")
        assert auth.verify_2fa("charlie@test.com", "123456") is False


class TestAuthManagerBackupCode:
    """Tests for AuthManager.verify_2fa_backup_code."""

    def _enable_2fa(self, auth, email="backup@test.com"):
        """Helper to register a user and enable 2FA, returning backup codes."""
        auth.register_user(email, "Backup User", "Password1")
        setup = auth.setup_2fa(email)
        totp = pyotp.TOTP(setup["secret"])
        code = totp.now()
        _, backup_codes = auth.verify_and_enable_2fa(email, code)
        return backup_codes

    def test_valid_backup_code(self, auth):
        """A valid backup code should authenticate."""
        codes = self._enable_2fa(auth)
        assert auth.verify_2fa_backup_code("backup@test.com", codes[0]) is True

    def test_backup_code_consumed(self, auth):
        """A used backup code should not work again."""
        codes = self._enable_2fa(auth)
        assert auth.verify_2fa_backup_code("backup@test.com", codes[0]) is True
        assert auth.verify_2fa_backup_code("backup@test.com", codes[0]) is False

    def test_backup_code_remaining_decrements(self, auth):
        """Using a backup code should decrement the remaining count."""
        codes = self._enable_2fa(auth)

        conn = auth._get_conn()
        row_before = conn.execute(
            "SELECT backup_codes_remaining FROM users WHERE email = ?",
            ("backup@test.com",),
        ).fetchone()
        assert row_before["backup_codes_remaining"] == 10

        auth.verify_2fa_backup_code("backup@test.com", codes[0])

        row_after = conn.execute(
            "SELECT backup_codes_remaining FROM users WHERE email = ?",
            ("backup@test.com",),
        ).fetchone()
        assert row_after["backup_codes_remaining"] == 9

    def test_invalid_backup_code(self, auth):
        """An invalid backup code should fail."""
        self._enable_2fa(auth)
        assert auth.verify_2fa_backup_code("backup@test.com", "zzzz-zzzz") is False


class TestAuthManagerDisable2fa:
    """Tests for AuthManager.disable_2fa."""

    def _enable_2fa(self, auth, email="disable@test.com"):
        """Helper to register and enable 2FA."""
        auth.register_user(email, "Disable User", "Password1")
        setup = auth.setup_2fa(email)
        totp = pyotp.TOTP(setup["secret"])
        code = totp.now()
        auth.verify_and_enable_2fa(email, code)
        return setup["secret"]

    def test_disable_with_valid_code(self, auth):
        """disable_2fa with valid code should disable 2FA."""
        secret = self._enable_2fa(auth)
        totp = pyotp.TOTP(secret)

        assert auth.is_2fa_enabled("disable@test.com") is True
        result = auth.disable_2fa("disable@test.com", totp.now())
        assert result is True
        assert auth.is_2fa_enabled("disable@test.com") is False

    def test_disable_with_invalid_code(self, auth):
        """disable_2fa with invalid code should fail."""
        self._enable_2fa(auth)
        assert auth.disable_2fa("disable@test.com", "000000") is False
        assert auth.is_2fa_enabled("disable@test.com") is True

    def test_disable_clears_db_fields(self, auth):
        """disable_2fa should clear all 2FA-related database fields."""
        secret = self._enable_2fa(auth)
        totp = pyotp.TOTP(secret)
        auth.disable_2fa("disable@test.com", totp.now())

        conn = auth._get_conn()
        row = conn.execute(
            "SELECT totp_secret, totp_enabled, backup_codes, backup_codes_remaining, totp_enabled_at FROM users WHERE email = ?",
            ("disable@test.com",),
        ).fetchone()
        assert row["totp_secret"] is None
        assert row["totp_enabled"] == 0
        assert row["backup_codes"] is None
        assert row["backup_codes_remaining"] == 0
        assert row["totp_enabled_at"] is None


class TestAuthManagerRegenerateBackupCodes:
    """Tests for AuthManager.regenerate_backup_codes."""

    def _enable_2fa(self, auth, email="regen@test.com"):
        """Helper to register and enable 2FA."""
        auth.register_user(email, "Regen User", "Password1")
        setup = auth.setup_2fa(email)
        totp = pyotp.TOTP(setup["secret"])
        code = totp.now()
        _, backup_codes = auth.verify_and_enable_2fa(email, code)
        return setup["secret"], backup_codes

    def test_regen_with_valid_code(self, auth):
        """regenerate_backup_codes should return new codes."""
        secret, old_codes = self._enable_2fa(auth)
        totp = pyotp.TOTP(secret)

        ok, new_codes = auth.regenerate_backup_codes("regen@test.com", totp.now())
        assert ok is True
        assert new_codes is not None
        assert len(new_codes) == 10
        # New codes should be different from old codes
        assert set(new_codes) != set(old_codes)

    def test_regen_with_invalid_code(self, auth):
        """regenerate_backup_codes with invalid code should fail."""
        self._enable_2fa(auth)
        ok, codes = auth.regenerate_backup_codes("regen@test.com", "000000")
        assert ok is False
        assert codes is None


class TestAuthenticateWith2fa:
    """Tests for authenticate() returning '2fa_required' status."""

    def _enable_2fa(self, auth, email="login2fa@test.com"):
        """Helper to register and enable 2FA."""
        auth.register_user(email, "Login 2FA User", "Password1")
        login_limiter.reset(email)
        setup = auth.setup_2fa(email)
        totp = pyotp.TOTP(setup["secret"])
        code = totp.now()
        auth.verify_and_enable_2fa(email, code)
        login_limiter.reset(email)
        return setup["secret"]

    def test_authenticate_returns_2fa_required(self, auth):
        """authenticate() should return '2fa_required' when 2FA is enabled."""
        self._enable_2fa(auth)
        success, data, status = auth.authenticate("login2fa@test.com", "Password1")
        assert success is False
        assert status == "2fa_required"
        assert data is not None
        assert data["email"] == "login2fa@test.com"

    def test_authenticate_without_2fa_returns_success(self, auth):
        """authenticate() without 2FA should return 'success' normally."""
        auth.register_user("alice@test.com", "Alice", "Password1")
        login_limiter.reset("alice@test.com")
        success, data, status = auth.authenticate("alice@test.com", "Password1")
        assert success is True
        assert status == "success"
        assert data is not None

    def test_wrong_password_with_2fa_returns_failed(self, auth):
        """Wrong password should still return 'failed' even with 2FA enabled."""
        self._enable_2fa(auth)
        success, data, status = auth.authenticate("login2fa@test.com", "WrongPass1")
        assert success is False
        assert status == "failed"
        assert data is None


class TestIs2faEnabled:
    """Tests for AuthManager.is_2fa_enabled."""

    def test_not_enabled_by_default(self, auth):
        """Newly registered user should not have 2FA enabled."""
        auth.register_user("alice@test.com", "Alice", "Password1")
        assert auth.is_2fa_enabled("alice@test.com") is False

    def test_nonexistent_user(self, auth):
        """Non-existent user should return False."""
        assert auth.is_2fa_enabled("nobody@test.com") is False

    def test_enabled_after_setup(self, auth):
        """2FA should be enabled after setup + verification."""
        auth.register_user("charlie@test.com", "Charlie", "Password1")
        setup = auth.setup_2fa("charlie@test.com")
        totp = pyotp.TOTP(setup["secret"])
        auth.verify_and_enable_2fa("charlie@test.com", totp.now())
        assert auth.is_2fa_enabled("charlie@test.com") is True


class TestRowToDictExcludesSensitiveFields:
    """Tests that _row_to_dict strips sensitive 2FA fields."""

    def test_get_user_excludes_totp_secret(self, auth):
        """get_user should not expose totp_secret."""
        auth.register_user("alice@test.com", "Alice", "Password1")
        setup = auth.setup_2fa("alice@test.com")
        assert setup is not None

        user = auth.get_user("alice@test.com")
        assert "totp_secret" not in user
        assert "backup_codes" not in user
        assert "password_hash" not in user
