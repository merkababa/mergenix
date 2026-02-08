"""Tests for the unified configuration system (Source/config.py)."""

from __future__ import annotations

import logging
import os
from unittest.mock import patch

import pytest
from pydantic import ValidationError
from Source.config import AppSettings, _warn_if_default_secret_key, get_settings

# ---------------------------------------------------------------------------
# Fixture: clear get_settings() LRU cache between tests
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _clear_settings_cache():
    """Clear the get_settings() LRU cache before each test to prevent stale state."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


# ---------------------------------------------------------------------------
# Helper: build settings from explicit env vars (bypasses .env file)
# ---------------------------------------------------------------------------

def _make_settings(**overrides: str) -> AppSettings:
    """Create an AppSettings instance with specific env vars, ignoring .env file."""
    env = {f"MERGENIX_{k.upper()}": v for k, v in overrides.items()}
    with patch.dict(os.environ, env, clear=False):
        return AppSettings(_env_file=None)


# ---------------------------------------------------------------------------
# Default values
# ---------------------------------------------------------------------------

class TestDefaults:
    """Verify that all default values are correct when no env vars are set."""

    def setup_method(self):
        self.settings = AppSettings(_env_file=None)

    def test_app_name_default(self):
        assert self.settings.app_name == "Mergenix"

    def test_app_version_default(self):
        assert self.settings.app_version == "2.0.0"

    def test_debug_default_false(self):
        assert self.settings.debug is False

    def test_log_level_default(self):
        assert self.settings.log_level == "INFO"

    def test_secret_key_has_default(self):
        assert self.settings.secret_key == "CHANGE-ME-IN-PRODUCTION"

    def test_token_expiry_hours_default(self):
        assert self.settings.token_expiry_hours == 24

    def test_max_login_attempts_default(self):
        assert self.settings.max_login_attempts == 5

    def test_lockout_duration_minutes_default(self):
        assert self.settings.lockout_duration_minutes == 30

    def test_session_timeout_minutes_default(self):
        assert self.settings.session_timeout_minutes == 30

    def test_google_client_id_default_empty(self):
        assert self.settings.google_client_id == ""

    def test_google_redirect_uri_default(self):
        assert self.settings.google_redirect_uri == "http://localhost:8501/Login?oauth_callback=google"

    def test_stripe_secret_key_default_empty(self):
        assert self.settings.stripe_secret_key == ""

    def test_stripe_publishable_key_default_empty(self):
        assert self.settings.stripe_publishable_key == ""

    def test_stripe_webhook_secret_default_empty(self):
        assert self.settings.stripe_webhook_secret == ""

    def test_paypal_client_id_default_empty(self):
        assert self.settings.paypal_client_id == ""

    def test_paypal_client_secret_default_empty(self):
        assert self.settings.paypal_client_secret == ""

    def test_paypal_mode_default_sandbox(self):
        assert self.settings.paypal_mode == "sandbox"

    def test_database_url_default(self):
        assert self.settings.database_url == "sqlite:///data/mergenix.db"

    def test_max_upload_size_mb_default(self):
        assert self.settings.max_upload_size_mb == 200

    def test_smtp_host_default_empty(self):
        assert self.settings.smtp_host == ""

    def test_smtp_port_default(self):
        assert self.settings.smtp_port == 587

    def test_smtp_username_default_empty(self):
        assert self.settings.smtp_username == ""

    def test_from_email_default(self):
        assert self.settings.from_email == "noreply@mergenix.com"

    def test_from_name_default(self):
        assert self.settings.from_name == "Mergenix"

    def test_app_base_url_default(self):
        assert self.settings.app_base_url == "http://localhost:8501"


# ---------------------------------------------------------------------------
# Environment variable overrides
# ---------------------------------------------------------------------------

class TestEnvOverrides:
    """Verify that MERGENIX_* env vars override default values."""

    def test_override_app_name(self):
        s = _make_settings(app_name="CustomApp")
        assert s.app_name == "CustomApp"

    def test_override_debug(self):
        s = _make_settings(debug="true")
        assert s.debug is True

    def test_override_secret_key(self):
        s = _make_settings(secret_key="my-production-secret")
        assert s.secret_key == "my-production-secret"

    def test_override_token_expiry_hours(self):
        s = _make_settings(token_expiry_hours="48")
        assert s.token_expiry_hours == 48

    def test_override_max_login_attempts(self):
        s = _make_settings(max_login_attempts="10")
        assert s.max_login_attempts == 10

    def test_override_lockout_duration_minutes(self):
        s = _make_settings(lockout_duration_minutes="60")
        assert s.lockout_duration_minutes == 60

    def test_override_stripe_secret_key(self):
        s = _make_settings(stripe_secret_key="sk_test_xxx")
        assert s.stripe_secret_key == "sk_test_xxx"

    def test_override_paypal_mode_live(self):
        s = _make_settings(paypal_mode="live")
        assert s.paypal_mode == "live"

    def test_override_database_url(self):
        s = _make_settings(database_url="sqlite:///custom/path.db")
        assert s.database_url == "sqlite:///custom/path.db"

    def test_override_max_upload_size_mb(self):
        s = _make_settings(max_upload_size_mb="500")
        assert s.max_upload_size_mb == 500

    def test_override_smtp_port(self):
        s = _make_settings(smtp_port="465")
        assert s.smtp_port == 465

    def test_override_log_level(self):
        s = _make_settings(log_level="DEBUG")
        assert s.log_level == "DEBUG"

    def test_override_google_client_id(self):
        s = _make_settings(google_client_id="g-12345")
        assert s.google_client_id == "g-12345"

    def test_override_from_email(self):
        s = _make_settings(from_email="support@example.com")
        assert s.from_email == "support@example.com"

    def test_override_app_base_url(self):
        s = _make_settings(app_base_url="https://mergenix.com")
        assert s.app_base_url == "https://mergenix.com"


# ---------------------------------------------------------------------------
# Type coercion
# ---------------------------------------------------------------------------

class TestTypeCoercion:
    """Verify that string env var values are coerced to the correct Python types."""

    def test_bool_coercion_true_lowercase(self):
        s = _make_settings(debug="true")
        assert s.debug is True

    def test_bool_coercion_true_uppercase(self):
        s = _make_settings(debug="True")
        assert s.debug is True

    def test_bool_coercion_one(self):
        s = _make_settings(debug="1")
        assert s.debug is True

    def test_bool_coercion_false(self):
        s = _make_settings(debug="false")
        assert s.debug is False

    def test_bool_coercion_zero(self):
        s = _make_settings(debug="0")
        assert s.debug is False

    def test_int_coercion_token_expiry(self):
        s = _make_settings(token_expiry_hours="72")
        assert s.token_expiry_hours == 72
        assert isinstance(s.token_expiry_hours, int)

    def test_int_coercion_smtp_port(self):
        s = _make_settings(smtp_port="2525")
        assert s.smtp_port == 2525
        assert isinstance(s.smtp_port, int)

    def test_int_coercion_max_upload(self):
        s = _make_settings(max_upload_size_mb="1000")
        assert s.max_upload_size_mb == 1000
        assert isinstance(s.max_upload_size_mb, int)


# ---------------------------------------------------------------------------
# Invalid values are rejected
# ---------------------------------------------------------------------------

class TestValidation:
    """Verify that invalid values raise validation errors."""

    def test_invalid_int_for_token_expiry(self):
        with pytest.raises(ValidationError):
            _make_settings(token_expiry_hours="not_a_number")

    def test_invalid_int_for_smtp_port(self):
        with pytest.raises(ValidationError):
            _make_settings(smtp_port="abc")

    def test_invalid_int_for_max_login_attempts(self):
        with pytest.raises(ValidationError):
            _make_settings(max_login_attempts="xyz")

    def test_invalid_int_for_max_upload_size(self):
        with pytest.raises(ValidationError):
            _make_settings(max_upload_size_mb="big")

    def test_invalid_int_for_lockout_duration(self):
        with pytest.raises(ValidationError):
            _make_settings(lockout_duration_minutes="forever")

    def test_invalid_int_for_session_timeout(self):
        with pytest.raises(ValidationError):
            _make_settings(session_timeout_minutes="long")


# ---------------------------------------------------------------------------
# Singleton behaviour via get_settings()
# ---------------------------------------------------------------------------

class TestSingleton:
    """Verify that get_settings() returns a cached instance."""

    def test_get_settings_returns_app_settings(self):
        from Source.config import get_settings
        s = get_settings()
        assert isinstance(s, AppSettings)

    def test_module_level_settings_is_app_settings(self):
        from Source.config import settings
        assert isinstance(settings, AppSettings)

    def test_get_settings_same_object(self):
        from Source.config import get_settings
        s1 = get_settings()
        s2 = get_settings()
        assert s1 is s2

    def test_module_settings_equal_to_get_settings(self):
        """Module-level settings has same values as get_settings() (identity may
        differ after cache_clear, but field values must match)."""
        from Source.config import get_settings, settings
        assert settings == get_settings()


# ---------------------------------------------------------------------------
# Extra env vars are ignored (extra="ignore")
# ---------------------------------------------------------------------------

class TestExtraFields:
    """Verify that unknown MERGENIX_* env vars do not cause errors."""

    def test_unknown_env_var_ignored(self):
        env = {"MERGENIX_UNKNOWN_SETTING": "some_value"}
        with patch.dict(os.environ, env, clear=False):
            s = AppSettings(_env_file=None)
        assert s.app_name == "Mergenix"

    def test_non_prefixed_env_var_ignored(self):
        env = {"RANDOM_VAR": "whatever"}
        with patch.dict(os.environ, env, clear=False):
            s = AppSettings(_env_file=None)
        assert s.app_name == "Mergenix"


# ---------------------------------------------------------------------------
# Multiple overrides at once
# ---------------------------------------------------------------------------

class TestMultipleOverrides:
    """Verify that multiple env vars can be set simultaneously."""

    def test_multiple_overrides(self):
        s = _make_settings(
            debug="true",
            secret_key="prod-secret",
            stripe_secret_key="sk_live_xxx",
            paypal_mode="live",
            smtp_port="465",
        )
        assert s.debug is True
        assert s.secret_key == "prod-secret"
        assert s.stripe_secret_key == "sk_live_xxx"
        assert s.paypal_mode == "live"
        assert s.smtp_port == 465


# ---------------------------------------------------------------------------
# Production secret key warning
# ---------------------------------------------------------------------------

class TestProductionSecretKeyWarning:
    """Verify that a warning is logged when the default secret key is used in production."""

    def test_warns_when_debug_false_and_default_key(self, caplog):
        """Default key + debug=False should emit a warning."""
        s = _make_settings(debug="false")
        assert s.secret_key == "CHANGE-ME-IN-PRODUCTION"
        with caplog.at_level(logging.WARNING, logger="Source.config"):
            _warn_if_default_secret_key(s)
        assert "Using default secret key in production" in caplog.text
        assert "MERGENIX_SECRET_KEY" in caplog.text

    def test_no_warning_when_debug_true(self, caplog):
        """Debug mode should suppress the warning even with default key."""
        s = _make_settings(debug="true")
        with caplog.at_level(logging.WARNING, logger="Source.config"):
            _warn_if_default_secret_key(s)
        assert "Using default secret key" not in caplog.text

    def test_no_warning_when_custom_key(self, caplog):
        """Custom secret key should not trigger the warning."""
        s = _make_settings(secret_key="my-real-production-secret")
        with caplog.at_level(logging.WARNING, logger="Source.config"):
            _warn_if_default_secret_key(s)
        assert "Using default secret key" not in caplog.text

    def test_no_warning_when_debug_true_and_default_key(self, caplog):
        """Debug=True + default key = no warning (development is fine)."""
        s = _make_settings(debug="true")
        assert s.secret_key == "CHANGE-ME-IN-PRODUCTION"
        with caplog.at_level(logging.WARNING, logger="Source.config"):
            _warn_if_default_secret_key(s)
        assert "Using default secret key" not in caplog.text

    def test_no_warning_when_debug_false_and_custom_key(self, caplog):
        """Debug=False + custom key = no warning (production is properly configured)."""
        s = _make_settings(debug="false", secret_key="secure-prod-key-12345")
        with caplog.at_level(logging.WARNING, logger="Source.config"):
            _warn_if_default_secret_key(s)
        assert "Using default secret key" not in caplog.text


# ---------------------------------------------------------------------------
# Cache-clear fixture verification
# ---------------------------------------------------------------------------

class TestCacheClearFixture:
    """Verify that the autouse fixture clears the LRU cache between tests."""

    def test_cache_is_empty_at_start(self):
        """After fixture clears cache, cache_info should show zero hits."""
        info = get_settings.cache_info()
        # The fixture clears cache before each test, so misses should be 0
        # (no calls yet in this test)
        assert info.currsize == 0

    def test_cache_populated_after_call(self):
        """After calling get_settings(), cache should have one entry."""
        get_settings()
        info = get_settings.cache_info()
        assert info.currsize == 1
