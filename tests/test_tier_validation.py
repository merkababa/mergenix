"""Tests for server-side tier validation (T1.3).

Covers get_verified_tier(), require_tier() with database verification,
and session-state synchronization.
"""

from unittest.mock import MagicMock, patch

import pytest
from Source.auth.helpers import get_verified_tier, require_tier
from Source.auth.manager import AuthManager
from Source.database import close_db

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def tmp_db(tmp_path):
    """Create a temporary database path and clean up afterwards."""
    db_path = str(tmp_path / "tier_test.db")
    yield db_path
    close_db(db_path)


@pytest.fixture()
def auth(tmp_db):
    """Create an AuthManager backed by a temporary database."""
    mgr = AuthManager(db_path=tmp_db)
    yield mgr
    mgr.close()


@pytest.fixture()
def free_user(auth):
    """Register a free-tier user and return their email."""
    email = "free@test.com"
    auth.register_user(email, "Free User", "Password1")
    return email


@pytest.fixture()
def premium_user(auth):
    """Register a premium-tier user and return their email."""
    email = "premium@test.com"
    auth.register_user(email, "Premium User", "Password1")
    auth.update_user_tier(email, "premium", "sub_prem", "stripe")
    return email


@pytest.fixture()
def pro_user(auth):
    """Register a pro-tier user and return their email."""
    email = "pro@test.com"
    auth.register_user(email, "Pro User", "Password1")
    auth.update_user_tier(email, "pro", "sub_pro", "stripe")
    return email


# ---------------------------------------------------------------------------
# get_verified_tier tests
# ---------------------------------------------------------------------------


class TestGetVerifiedTier:
    """Tests for the get_verified_tier() function."""

    @patch("Source.auth.helpers.AuthManager")
    @patch("Source.auth.helpers.st")
    def test_returns_free_for_none_email(self, mock_st, mock_auth_cls):
        """get_verified_tier with None email and no session email returns 'free'."""
        mock_st.session_state = {}
        result = get_verified_tier(None)
        assert result == "free"

    @patch("Source.auth.helpers.AuthManager")
    @patch("Source.auth.helpers.st")
    def test_returns_free_for_empty_email(self, mock_st, mock_auth_cls):
        """get_verified_tier with empty string email returns 'free'."""
        mock_st.session_state = {}
        result = get_verified_tier("")
        assert result == "free"

    @patch("Source.auth.helpers.AuthManager")
    @patch("Source.auth.helpers.st")
    def test_returns_free_for_unknown_email(self, mock_st, mock_auth_cls):
        """get_verified_tier with an email not in database returns 'free'."""
        mock_auth_instance = MagicMock()
        mock_auth_instance.get_user.return_value = None
        mock_auth_cls.return_value = mock_auth_instance
        mock_st.session_state = {}

        result = get_verified_tier("nobody@test.com")
        assert result == "free"

    @patch("Source.auth.helpers.AuthManager")
    @patch("Source.auth.helpers.st")
    def test_returns_correct_tier_from_database(self, mock_st, mock_auth_cls):
        """get_verified_tier returns the tier stored in the database."""
        mock_auth_instance = MagicMock()
        mock_auth_instance.get_user.return_value = {
            "email": "user@test.com",
            "tier": "premium",
        }
        mock_auth_cls.return_value = mock_auth_instance
        mock_st.session_state = {"user": {"tier": "free"}, "user_tier": "free"}

        result = get_verified_tier("user@test.com")
        assert result == "premium"

    @patch("Source.auth.helpers.AuthManager")
    @patch("Source.auth.helpers.st")
    def test_syncs_session_state_user_dict(self, mock_st, mock_auth_cls):
        """get_verified_tier should update session_state['user']['tier']."""
        mock_auth_instance = MagicMock()
        mock_auth_instance.get_user.return_value = {
            "email": "user@test.com",
            "tier": "pro",
        }
        mock_auth_cls.return_value = mock_auth_instance
        session = {"user": {"tier": "free"}, "user_tier": "free"}
        mock_st.session_state = session

        get_verified_tier("user@test.com")
        assert session["user"]["tier"] == "pro"

    @patch("Source.auth.helpers.AuthManager")
    @patch("Source.auth.helpers.st")
    def test_syncs_session_state_user_tier_key(self, mock_st, mock_auth_cls):
        """get_verified_tier should update session_state['user_tier']."""
        mock_auth_instance = MagicMock()
        mock_auth_instance.get_user.return_value = {
            "email": "user@test.com",
            "tier": "premium",
        }
        mock_auth_cls.return_value = mock_auth_instance
        session = {"user": {"tier": "free"}, "user_tier": "free"}
        mock_st.session_state = session

        get_verified_tier("user@test.com")
        assert session["user_tier"] == "premium"

    @patch("Source.auth.helpers.AuthManager")
    @patch("Source.auth.helpers.st")
    def test_reads_email_from_session_when_none(self, mock_st, mock_auth_cls):
        """get_verified_tier(None) should fall back to session_state['user_email']."""
        mock_auth_instance = MagicMock()
        mock_auth_instance.get_user.return_value = {
            "email": "session@test.com",
            "tier": "pro",
        }
        mock_auth_cls.return_value = mock_auth_instance
        mock_st.session_state = {
            "user_email": "session@test.com",
            "user": {"tier": "free"},
            "user_tier": "free",
        }

        result = get_verified_tier()
        assert result == "pro"
        mock_auth_instance.get_user.assert_called_once_with("session@test.com")

    @patch("Source.auth.helpers.AuthManager")
    @patch("Source.auth.helpers.st")
    def test_handles_missing_user_dict_in_session(self, mock_st, mock_auth_cls):
        """get_verified_tier should not crash if session_state has no 'user' key."""
        mock_auth_instance = MagicMock()
        mock_auth_instance.get_user.return_value = {
            "email": "user@test.com",
            "tier": "premium",
        }
        mock_auth_cls.return_value = mock_auth_instance
        # No 'user' key in session_state
        session = {"user_tier": "free"}
        mock_st.session_state = session

        result = get_verified_tier("user@test.com")
        assert result == "premium"
        assert session["user_tier"] == "premium"

    @patch("Source.auth.helpers.AuthManager")
    @patch("Source.auth.helpers.st")
    def test_returns_free_when_user_has_no_tier_field(self, mock_st, mock_auth_cls):
        """If database user record has no 'tier' key, default to 'free'."""
        mock_auth_instance = MagicMock()
        mock_auth_instance.get_user.return_value = {
            "email": "user@test.com",
            # no 'tier' key
        }
        mock_auth_cls.return_value = mock_auth_instance
        mock_st.session_state = {}

        result = get_verified_tier("user@test.com")
        assert result == "free"


# ---------------------------------------------------------------------------
# Tier change detection tests
# ---------------------------------------------------------------------------


class TestTierChangeDetection:
    """Tests verifying that tier changes in the DB are detected."""

    @patch("Source.auth.helpers.AuthManager")
    @patch("Source.auth.helpers.st")
    def test_tier_upgrade_detected(self, mock_st, mock_auth_cls):
        """If tier was free in session but premium in DB, return premium."""
        mock_auth_instance = MagicMock()
        mock_auth_instance.get_user.return_value = {
            "email": "user@test.com",
            "tier": "premium",
        }
        mock_auth_cls.return_value = mock_auth_instance
        session = {"user": {"tier": "free"}, "user_tier": "free"}
        mock_st.session_state = session

        result = get_verified_tier("user@test.com")
        assert result == "premium"
        # Session should be synced
        assert session["user"]["tier"] == "premium"
        assert session["user_tier"] == "premium"

    @patch("Source.auth.helpers.AuthManager")
    @patch("Source.auth.helpers.st")
    def test_tier_downgrade_detected(self, mock_st, mock_auth_cls):
        """If tier was pro in session but free in DB (e.g. refund), return free."""
        mock_auth_instance = MagicMock()
        mock_auth_instance.get_user.return_value = {
            "email": "user@test.com",
            "tier": "free",
        }
        mock_auth_cls.return_value = mock_auth_instance
        session = {"user": {"tier": "pro"}, "user_tier": "pro"}
        mock_st.session_state = session

        result = get_verified_tier("user@test.com")
        assert result == "free"
        assert session["user"]["tier"] == "free"
        assert session["user_tier"] == "free"


# ---------------------------------------------------------------------------
# require_tier tests
# ---------------------------------------------------------------------------


class TestRequireTier:
    """Tests for the updated require_tier() function."""

    @patch("Source.auth.helpers.get_verified_tier")
    @patch("Source.auth.helpers.get_current_user")
    @patch("Source.auth.helpers.require_auth")
    @patch("Source.auth.helpers.st")
    def test_require_tier_uses_verified_tier(
        self, mock_st, mock_require_auth, mock_get_user, mock_get_verified
    ):
        """require_tier should call get_verified_tier instead of reading session."""
        mock_get_user.return_value = {"email": "user@test.com", "tier": "free"}
        mock_get_verified.return_value = "premium"
        mock_st.session_state = {}

        result = require_tier("premium")
        assert result is True
        mock_get_verified.assert_called_once_with("user@test.com")

    @patch("Source.auth.helpers.get_verified_tier")
    @patch("Source.auth.helpers.get_current_user")
    @patch("Source.auth.helpers.require_auth")
    @patch("Source.auth.helpers.st")
    def test_require_tier_denies_insufficient(
        self, mock_st, mock_require_auth, mock_get_user, mock_get_verified
    ):
        """require_tier should deny access when verified tier is below required."""
        mock_get_user.return_value = {"email": "user@test.com", "tier": "free"}
        mock_get_verified.return_value = "free"
        mock_st.session_state = {}

        result = require_tier("premium")
        assert result is False

    @patch("Source.auth.helpers.get_verified_tier")
    @patch("Source.auth.helpers.get_current_user")
    @patch("Source.auth.helpers.require_auth")
    @patch("Source.auth.helpers.st")
    def test_require_tier_allows_higher_tier(
        self, mock_st, mock_require_auth, mock_get_user, mock_get_verified
    ):
        """require_tier should allow access when verified tier exceeds required."""
        mock_get_user.return_value = {"email": "user@test.com", "tier": "pro"}
        mock_get_verified.return_value = "pro"
        mock_st.session_state = {}

        result = require_tier("premium")
        assert result is True

    @patch("Source.auth.helpers.get_verified_tier")
    @patch("Source.auth.helpers.get_current_user")
    @patch("Source.auth.helpers.require_auth")
    @patch("Source.auth.helpers.st")
    def test_require_tier_returns_false_when_no_user(
        self, mock_st, mock_require_auth, mock_get_user, mock_get_verified
    ):
        """require_tier should return False if no current user."""
        mock_get_user.return_value = None
        mock_st.session_state = {}

        result = require_tier("free")
        assert result is False
        mock_get_verified.assert_not_called()


# ---------------------------------------------------------------------------
# Integration test with real SQLite
# ---------------------------------------------------------------------------


class TestTierValidationIntegration:
    """Integration tests using real AuthManager and SQLite database."""

    @patch("Source.auth.helpers.st")
    def test_verified_tier_with_real_db(self, mock_st, tmp_db):
        """get_verified_tier should read the real tier from SQLite."""
        session = {"user": {"tier": "free"}, "user_tier": "free"}
        mock_st.session_state = session

        # Create a user directly in the database
        auth = AuthManager(db_path=tmp_db)
        auth.register_user("real@test.com", "Real User", "Password1")
        auth.update_user_tier("real@test.com", "pro", "sub_real", "stripe")

        # Patch AuthManager constructor to use our tmp_db
        with patch("Source.auth.helpers.AuthManager", return_value=auth):
            result = get_verified_tier("real@test.com")

        assert result == "pro"
        assert session["user"]["tier"] == "pro"
        assert session["user_tier"] == "pro"
        auth.close()

    @patch("Source.auth.helpers.st")
    def test_tier_change_reflected_in_real_db(self, mock_st, tmp_db):
        """Changing tier in DB should be picked up by get_verified_tier."""
        session = {"user": {"tier": "free"}, "user_tier": "free"}
        mock_st.session_state = session

        auth = AuthManager(db_path=tmp_db)
        auth.register_user("change@test.com", "Change User", "Password1")

        with patch("Source.auth.helpers.AuthManager", return_value=auth):
            # Initially free
            result1 = get_verified_tier("change@test.com")
            assert result1 == "free"

            # Upgrade to premium
            auth.update_user_tier("change@test.com", "premium", "sub_x", "stripe")
            result2 = get_verified_tier("change@test.com")
            assert result2 == "premium"

            # Upgrade to pro
            auth.update_user_tier("change@test.com", "pro", "sub_y", "stripe")
            result3 = get_verified_tier("change@test.com")
            assert result3 == "pro"

        auth.close()
