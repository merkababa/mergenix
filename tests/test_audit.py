"""Tests for audit logging (T1.5)."""

import sqlite3

import pytest
from Source.auth.audit import get_audit_log, log_audit_event
from Source.database import close_db, get_db

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def audit_db(tmp_path):
    """Create a temporary database with audit_log table for testing."""
    db_path = str(tmp_path / "audit_test.db")
    # Initialize the database (creates all tables including audit_log)
    get_db(db_path)
    yield db_path
    close_db(db_path)


@pytest.fixture()
def auth(tmp_path):
    """Create an AuthManager backed by a temporary database."""
    from Source.auth.manager import AuthManager

    db_path = str(tmp_path / "auth_audit_test.db")
    mgr = AuthManager(db_path=db_path)
    yield mgr
    mgr.close()


# ---------------------------------------------------------------------------
# log_audit_event tests
# ---------------------------------------------------------------------------


class TestLogAuditEvent:
    """Tests for the log_audit_event function."""

    def test_basic_event_write(self, audit_db):
        """log_audit_event should insert a row into the audit_log table."""
        log_audit_event("test_event", db_path=audit_db)
        entries = get_audit_log(db_path=audit_db)
        assert len(entries) == 1
        assert entries[0]["event_type"] == "test_event"

    def test_event_with_user_email(self, audit_db):
        """log_audit_event should store the user_email."""
        log_audit_event("login_success", user_email="user@test.com", db_path=audit_db)
        entries = get_audit_log(user_email="user@test.com", db_path=audit_db)
        assert len(entries) == 1
        assert entries[0]["user_email"] == "user@test.com"

    def test_event_with_details(self, audit_db):
        """Details dict should be stored and retrieved as dict."""
        log_audit_event(
            "register_success",
            user_email="user@test.com",
            details={"name": "Test User"},
            db_path=audit_db,
        )
        entries = get_audit_log(db_path=audit_db)
        assert entries[0]["details"] == {"name": "Test User"}

    def test_event_with_ip_address(self, audit_db):
        """ip_address should be stored in the audit log."""
        log_audit_event(
            "login_success",
            user_email="user@test.com",
            ip_address="192.168.1.1",
            db_path=audit_db,
        )
        entries = get_audit_log(db_path=audit_db)
        assert entries[0]["ip_address"] == "192.168.1.1"

    def test_event_success_true(self, audit_db):
        """success=True should be stored as True."""
        log_audit_event("login_success", success=True, db_path=audit_db)
        entries = get_audit_log(db_path=audit_db)
        assert entries[0]["success"] is True

    def test_event_success_false(self, audit_db):
        """success=False should be stored as False."""
        log_audit_event("login_failed", success=False, db_path=audit_db)
        entries = get_audit_log(db_path=audit_db)
        assert entries[0]["success"] is False

    def test_event_has_timestamp(self, audit_db):
        """Audit entries should have a non-null timestamp."""
        log_audit_event("test_event", db_path=audit_db)
        entries = get_audit_log(db_path=audit_db)
        assert entries[0]["timestamp"] is not None

    def test_event_has_auto_increment_id(self, audit_db):
        """Audit entries should have auto-incrementing IDs."""
        log_audit_event("event_1", db_path=audit_db)
        log_audit_event("event_2", db_path=audit_db)
        entries = get_audit_log(db_path=audit_db)
        # Most recent first, so entries[0] should have the higher ID
        assert entries[0]["id"] > entries[1]["id"]


# ---------------------------------------------------------------------------
# Immutability tests
# ---------------------------------------------------------------------------


class TestAuditImmutability:
    """Tests for audit log immutability (triggers)."""

    def test_cannot_delete_audit_entry(self, audit_db):
        """DELETE should be blocked by the prevent_audit_delete trigger."""
        log_audit_event("test_event", db_path=audit_db)
        conn = get_db(audit_db)
        with pytest.raises(sqlite3.IntegrityError, match="cannot be deleted"):
            conn.execute("DELETE FROM audit_log WHERE id = 1")

    def test_cannot_update_audit_entry(self, audit_db):
        """UPDATE should be blocked by the prevent_audit_update trigger."""
        log_audit_event("test_event", db_path=audit_db)
        conn = get_db(audit_db)
        with pytest.raises(sqlite3.IntegrityError, match="cannot be modified"):
            conn.execute("UPDATE audit_log SET event_type = 'hacked' WHERE id = 1")


# ---------------------------------------------------------------------------
# get_audit_log filtering tests
# ---------------------------------------------------------------------------


class TestGetAuditLog:
    """Tests for get_audit_log query filtering."""

    def test_filter_by_user_email(self, audit_db):
        """get_audit_log should filter by user_email."""
        log_audit_event("login_success", user_email="alice@test.com", db_path=audit_db)
        log_audit_event("login_success", user_email="bob@test.com", db_path=audit_db)
        entries = get_audit_log(user_email="alice@test.com", db_path=audit_db)
        assert len(entries) == 1
        assert entries[0]["user_email"] == "alice@test.com"

    def test_filter_by_event_type(self, audit_db):
        """get_audit_log should filter by event_type."""
        log_audit_event("login_success", user_email="user@test.com", db_path=audit_db)
        log_audit_event("login_failed", user_email="user@test.com", db_path=audit_db)
        log_audit_event("register_success", user_email="user@test.com", db_path=audit_db)
        entries = get_audit_log(event_type="login_failed", db_path=audit_db)
        assert len(entries) == 1
        assert entries[0]["event_type"] == "login_failed"

    def test_filter_by_both(self, audit_db):
        """get_audit_log should filter by both user_email and event_type."""
        log_audit_event("login_success", user_email="alice@test.com", db_path=audit_db)
        log_audit_event("login_failed", user_email="alice@test.com", db_path=audit_db)
        log_audit_event("login_failed", user_email="bob@test.com", db_path=audit_db)
        entries = get_audit_log(
            user_email="alice@test.com", event_type="login_failed", db_path=audit_db
        )
        assert len(entries) == 1

    def test_limit_parameter(self, audit_db):
        """get_audit_log should respect the limit parameter."""
        for i in range(10):
            log_audit_event(f"event_{i}", db_path=audit_db)
        entries = get_audit_log(limit=3, db_path=audit_db)
        assert len(entries) == 3

    def test_ordering_newest_first(self, audit_db):
        """get_audit_log should return entries newest first."""
        log_audit_event("first_event", db_path=audit_db)
        log_audit_event("second_event", db_path=audit_db)
        entries = get_audit_log(db_path=audit_db)
        assert entries[0]["event_type"] == "second_event"
        assert entries[1]["event_type"] == "first_event"

    def test_no_results(self, audit_db):
        """get_audit_log should return empty list when no matches."""
        log_audit_event("some_event", user_email="alice@test.com", db_path=audit_db)
        entries = get_audit_log(user_email="nobody@test.com", db_path=audit_db)
        assert entries == []

    def test_details_none_when_not_provided(self, audit_db):
        """Details should be None when not provided."""
        log_audit_event("test_event", db_path=audit_db)
        entries = get_audit_log(db_path=audit_db)
        assert entries[0]["details"] is None


# ---------------------------------------------------------------------------
# Integration: manager.py audit events
# ---------------------------------------------------------------------------


class TestManagerAuditIntegration:
    """Tests that AuthManager methods produce correct audit events."""

    def test_register_success_audit(self, auth):
        """Successful registration should log register_success."""
        auth.register_user("reg@test.com", "Reg User", "Password1")
        entries = get_audit_log(event_type="register_success", db_path=auth.db_path)
        assert len(entries) == 1
        assert entries[0]["user_email"] == "reg@test.com"
        assert entries[0]["details"]["name"] == "Reg User"
        assert entries[0]["success"] is True

    def test_register_duplicate_audit(self, auth):
        """Duplicate registration should log register_failed."""
        auth.register_user("dup@test.com", "First", "Password1")
        auth.register_user("dup@test.com", "Second", "Password1")
        entries = get_audit_log(event_type="register_failed", db_path=auth.db_path)
        assert len(entries) >= 1
        # Find the duplicate_email entry
        dup_entries = [e for e in entries if e["details"].get("reason") == "duplicate_email"]
        assert len(dup_entries) == 1

    def test_login_success_audit(self, auth):
        """Successful login should log login_success."""
        auth.register_user("login@test.com", "Login", "Password1")
        from Source.auth.rate_limiter import login_limiter

        login_limiter.reset("login@test.com")
        auth.authenticate("login@test.com", "Password1")
        entries = get_audit_log(event_type="login_success", db_path=auth.db_path)
        assert len(entries) == 1
        assert entries[0]["user_email"] == "login@test.com"

    def test_login_failed_wrong_password_audit(self, auth):
        """Wrong password login should log login_failed with reason."""
        auth.register_user("wrong@test.com", "Wrong", "Password1")
        from Source.auth.rate_limiter import login_limiter

        login_limiter.reset("wrong@test.com")
        auth.authenticate("wrong@test.com", "WrongPass1")
        entries = get_audit_log(
            event_type="login_failed", user_email="wrong@test.com", db_path=auth.db_path
        )
        assert len(entries) >= 1
        reasons = [e["details"]["reason"] for e in entries]
        assert "wrong_password" in reasons

    def test_login_failed_nonexistent_user_audit(self, auth):
        """Login for nonexistent user should log login_failed with user_not_found."""
        from Source.auth.rate_limiter import login_limiter

        login_limiter.reset("ghost@test.com")
        auth.authenticate("ghost@test.com", "Password1")
        entries = get_audit_log(event_type="login_failed", db_path=auth.db_path)
        assert len(entries) >= 1
        reasons = [e["details"]["reason"] for e in entries]
        assert "user_not_found" in reasons

    def test_tier_changed_audit(self, auth):
        """Tier change should log tier_changed with old and new tier."""
        auth.register_user("tier@test.com", "Tier", "Password1")
        auth.update_user_tier("tier@test.com", "premium", "sub_1", "stripe")
        entries = get_audit_log(event_type="tier_changed", db_path=auth.db_path)
        assert len(entries) == 1
        assert entries[0]["details"]["old_tier"] == "free"
        assert entries[0]["details"]["new_tier"] == "premium"
        assert entries[0]["details"]["provider"] == "stripe"

    def test_password_changed_audit(self, auth):
        """Successful password change should log password_changed."""
        auth.register_user("pw@test.com", "PW", "Password1")
        auth.change_password("pw@test.com", "Password1", "NewPass1x")
        entries = get_audit_log(event_type="password_changed", db_path=auth.db_path)
        assert len(entries) == 1
        assert entries[0]["user_email"] == "pw@test.com"
        assert entries[0]["success"] is True

    def test_password_change_failed_audit(self, auth):
        """Failed password change should log password_change_failed."""
        auth.register_user("pwf@test.com", "PWF", "Password1")
        auth.change_password("pwf@test.com", "WrongOld1", "NewPass1x")
        entries = get_audit_log(event_type="password_change_failed", db_path=auth.db_path)
        assert len(entries) == 1
        assert entries[0]["success"] is False

    def test_oauth_register_audit(self, auth):
        """OAuth user creation should log oauth_register."""
        auth.create_oauth_user("oauth@test.com", "OAuth User", "google", "g_123")
        entries = get_audit_log(event_type="oauth_register", db_path=auth.db_path)
        assert len(entries) == 1
        assert entries[0]["details"]["provider"] == "google"

    def test_oauth_linked_audit(self, auth):
        """Linking OAuth account should log oauth_linked."""
        auth.register_user("link@test.com", "Link", "Password1")
        auth.link_oauth_account("link@test.com", "google", "g_link")
        entries = get_audit_log(event_type="oauth_linked", db_path=auth.db_path)
        assert len(entries) == 1
        assert entries[0]["details"]["provider"] == "google"
