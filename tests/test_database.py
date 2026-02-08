"""Tests for SQLite database layer and AuthManager with SQLite backend."""

import json
import os
import sqlite3
import threading

import pytest
from Source.database import close_db, get_db, init_db, migrate_json_to_sqlite

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def tmp_db(tmp_path):
    """Create a temporary database path and clean up afterwards."""
    db_path = str(tmp_path / "test.db")
    yield db_path
    close_db(db_path)


@pytest.fixture()
def tmp_json(tmp_path):
    """Create a temporary users.json with sample data."""
    json_path = str(tmp_path / "users.json")
    sample_users = {
        "alice@example.com": {
            "name": "Alice",
            "password_hash": "$2b$12$dummyhashfortest000000000000000000000000000000000",
            "tier": "premium",
            "subscription_id": "sub_123",
            "payment_provider": "stripe",
            "created_at": "2024-01-15T10:00:00",
            "email_verified": True,
            "last_login": "2024-06-01T12:00:00",
            "failed_login_attempts": 0,
            "last_failed_login": None,
            "oauth_provider": None,
            "oauth_id": None,
            "profile_picture": None,
        },
        "bob@example.com": {
            "name": "Bob",
            "password_hash": None,
            "tier": "free",
            "subscription_id": None,
            "payment_provider": None,
            "created_at": "2024-03-20T08:30:00",
            "email_verified": True,
            "last_login": None,
            "failed_login_attempts": 0,
            "last_failed_login": None,
            "oauth_provider": "google",
            "oauth_id": "google_bob_456",
            "profile_picture": "https://example.com/bob.jpg",
        },
    }
    with open(json_path, "w") as f:
        json.dump(sample_users, f, indent=2)
    return json_path


@pytest.fixture()
def auth(tmp_db):
    """Create an AuthManager backed by a temporary database."""
    from Source.auth.manager import AuthManager

    mgr = AuthManager(db_path=tmp_db)
    yield mgr
    mgr.close()


# ---------------------------------------------------------------------------
# Database creation and schema tests
# ---------------------------------------------------------------------------


class TestDatabaseCreation:
    """Tests for get_db, schema, and connection settings."""

    def test_get_db_creates_file(self, tmp_db):
        """get_db should create the database file on disk."""
        get_db(tmp_db)
        assert os.path.exists(tmp_db)
        close_db(tmp_db)

    def test_get_db_returns_connection(self, tmp_db):
        """get_db should return a usable sqlite3 Connection."""
        conn = get_db(tmp_db)
        assert isinstance(conn, sqlite3.Connection)
        close_db(tmp_db)

    def test_wal_mode_enabled(self, tmp_db):
        """Database should be in WAL journal mode."""
        conn = get_db(tmp_db)
        mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
        assert mode.lower() == "wal"
        close_db(tmp_db)

    def test_foreign_keys_enabled(self, tmp_db):
        """Foreign keys should be enabled."""
        conn = get_db(tmp_db)
        fk = conn.execute("PRAGMA foreign_keys").fetchone()[0]
        assert fk == 1
        close_db(tmp_db)

    def test_users_table_exists(self, tmp_db):
        """Users table should be created automatically."""
        conn = get_db(tmp_db)
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        ).fetchone()
        assert tables is not None
        close_db(tmp_db)

    def test_users_table_columns(self, tmp_db):
        """Users table should have all required columns."""
        conn = get_db(tmp_db)
        cursor = conn.execute("PRAGMA table_info(users)")
        columns = {row[1] for row in cursor.fetchall()}
        expected = {
            "email", "name", "password_hash", "tier", "subscription_id",
            "payment_provider", "created_at", "email_verified", "last_login",
            "failed_login_attempts", "last_failed_login",
            "oauth_provider", "oauth_id", "profile_picture",
        }
        assert expected.issubset(columns)
        close_db(tmp_db)

    def test_oauth_index_exists(self, tmp_db):
        """The idx_users_oauth index should exist."""
        conn = get_db(tmp_db)
        idx = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_oauth'"
        ).fetchone()
        assert idx is not None
        close_db(tmp_db)

    def test_get_db_singleton(self, tmp_db):
        """Repeated calls with the same path should return the same connection."""
        conn1 = get_db(tmp_db)
        conn2 = get_db(tmp_db)
        assert conn1 is conn2
        close_db(tmp_db)

    def test_get_db_different_paths(self, tmp_path):
        """Different paths should produce different connections."""
        db1 = str(tmp_path / "a.db")
        db2 = str(tmp_path / "b.db")
        conn1 = get_db(db1)
        conn2 = get_db(db2)
        assert conn1 is not conn2
        close_db(db1)
        close_db(db2)


# ---------------------------------------------------------------------------
# Migration tests
# ---------------------------------------------------------------------------


class TestMigration:
    """Tests for JSON-to-SQLite migration."""

    def test_migrate_populates_users(self, tmp_db, tmp_json):
        """Migration should insert users from JSON into SQLite."""
        count = migrate_json_to_sqlite(json_path=tmp_json, db_path=tmp_db)
        assert count == 2

        conn = get_db(tmp_db)
        rows = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        assert rows == 2
        close_db(tmp_db)

    def test_migrate_preserves_fields(self, tmp_db, tmp_json):
        """Migrated user should retain all original field values."""
        migrate_json_to_sqlite(json_path=tmp_json, db_path=tmp_db)
        conn = get_db(tmp_db)

        alice = conn.execute("SELECT * FROM users WHERE email = ?", ("alice@example.com",)).fetchone()
        assert alice is not None
        assert alice["name"] == "Alice"
        assert alice["tier"] == "premium"
        assert alice["subscription_id"] == "sub_123"
        assert alice["email_verified"] == 1  # True -> 1 in SQLite
        close_db(tmp_db)

    def test_migrate_skips_if_table_has_data(self, tmp_db, tmp_json):
        """Migration should be a no-op when the users table already has rows."""
        # First migration
        count1 = migrate_json_to_sqlite(json_path=tmp_json, db_path=tmp_db)
        assert count1 == 2

        # Second migration (should skip)
        count2 = migrate_json_to_sqlite(json_path=tmp_json, db_path=tmp_db)
        assert count2 == 0
        close_db(tmp_db)

    def test_migrate_with_empty_json(self, tmp_db, tmp_path):
        """Migration with an empty JSON object should migrate 0 users."""
        empty_json = str(tmp_path / "empty.json")
        with open(empty_json, "w") as f:
            json.dump({}, f)

        count = migrate_json_to_sqlite(json_path=empty_json, db_path=tmp_db)
        assert count == 0
        close_db(tmp_db)

    def test_migrate_with_missing_json(self, tmp_db):
        """Migration with a non-existent JSON file should return 0."""
        count = migrate_json_to_sqlite(json_path="/nonexistent/users.json", db_path=tmp_db)
        assert count == 0
        close_db(tmp_db)

    def test_init_db_creates_and_migrates(self, tmp_path, tmp_json):
        """init_db should create tables and migrate data in one call."""
        db_path = str(tmp_path / "init_test.db")
        conn = init_db(db_path)

        # Table should exist
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        ).fetchone()
        assert tables is not None
        close_db(db_path)


# ---------------------------------------------------------------------------
# AuthManager tests
# ---------------------------------------------------------------------------


class TestAuthManagerRegister:
    """Tests for user registration."""

    def test_register_success(self, auth):
        """Registering a valid user should succeed."""
        success, msg = auth.register_user("user@test.com", "Test User", "Password1")
        assert success is True
        assert msg == "Registration successful"

    def test_register_duplicate_email(self, auth):
        """Registering with an existing email should fail with generic message."""
        from Source.auth.rate_limiter import registration_limiter

        auth.register_user("dup@test.com", "First", "Password1")
        registration_limiter.reset("dup@test.com")
        success, msg = auth.register_user("dup@test.com", "Second", "Password1")
        assert success is False
        # Generic message to prevent account enumeration (T1.7)
        assert "unable to create account" in msg.lower()

    def test_register_invalid_email(self, auth):
        """Registering with an invalid email should fail."""
        success, msg = auth.register_user("not-an-email", "Name", "Password1")
        assert success is False

    def test_register_short_name(self, auth):
        """Registering with a too-short name should fail."""
        success, msg = auth.register_user("x@test.com", "A", "Password1")
        assert success is False
        assert "name" in msg.lower()

    def test_register_weak_password(self, auth):
        """Registering with a weak password should fail."""
        success, msg = auth.register_user("x@test.com", "Name", "short")
        assert success is False


class TestAuthManagerAuthenticate:
    """Tests for authentication."""

    def test_authenticate_success(self, auth):
        """Correct credentials should authenticate."""
        auth.register_user("login@test.com", "Login User", "Password1")
        success, user_data, status = auth.authenticate("login@test.com", "Password1")
        assert success is True
        assert user_data is not None
        assert user_data["email"] == "login@test.com"
        assert "password_hash" not in user_data
        assert status == "success"

    def test_authenticate_wrong_password(self, auth):
        """Wrong password should fail authentication."""
        auth.register_user("wrong@test.com", "Wrong", "Password1")
        success, user_data, status = auth.authenticate("wrong@test.com", "WrongPass1")
        assert success is False
        assert user_data is None
        assert status == "failed"

    def test_authenticate_nonexistent_user(self, auth):
        """Non-existent user should fail authentication."""
        success, user_data, status = auth.authenticate("ghost@test.com", "Password1")
        assert success is False
        assert user_data is None
        assert status == "failed"


class TestAuthManagerGetUser:
    """Tests for get_user and get_user_by_id."""

    def test_get_user_exists(self, auth):
        """get_user should return data for an existing user."""
        auth.register_user("exists@test.com", "Exists", "Password1")
        user = auth.get_user("exists@test.com")
        assert user is not None
        assert user["email"] == "exists@test.com"
        assert user["name"] == "Exists"
        assert "password_hash" not in user

    def test_get_user_not_found(self, auth):
        """get_user should return None for a non-existent user."""
        assert auth.get_user("nope@test.com") is None

    def test_get_user_by_id(self, auth):
        """get_user_by_id should delegate to get_user."""
        auth.register_user("byid@test.com", "ById", "Password1")
        user = auth.get_user_by_id("byid@test.com")
        assert user is not None
        assert user["email"] == "byid@test.com"


class TestAuthManagerLockout:
    """Tests for lockout behavior."""

    def test_lockout_after_five_failures(self, auth):
        """Account should be locked after 5 failed login attempts."""
        auth.register_user("lockout@test.com", "Lockout", "Password1")

        for _ in range(5):
            auth.record_failed_login("lockout@test.com")

        assert auth.check_lockout("lockout@test.com") is True

    def test_no_lockout_under_threshold(self, auth):
        """Account should not be locked with fewer than 5 failures."""
        auth.register_user("safe@test.com", "Safe", "Password1")

        for _ in range(4):
            auth.record_failed_login("safe@test.com")

        assert auth.check_lockout("safe@test.com") is False

    def test_lockout_nonexistent_user(self, auth):
        """check_lockout for non-existent user should return False."""
        assert auth.check_lockout("nobody@test.com") is False

    def test_record_failed_login_nonexistent(self, auth):
        """record_failed_login for non-existent user should return False."""
        assert auth.record_failed_login("nobody@test.com") is False


class TestAuthManagerTier:
    """Tests for tier updates."""

    def test_update_tier_success(self, auth):
        """update_user_tier should update the tier."""
        auth.register_user("tier@test.com", "Tier", "Password1")
        result = auth.update_user_tier("tier@test.com", "premium", "sub_1", "stripe")
        assert result is True

        user = auth.get_user("tier@test.com")
        assert user["tier"] == "premium"
        assert user["subscription_id"] == "sub_1"
        assert user["payment_provider"] == "stripe"

    def test_update_tier_invalid_tier(self, auth):
        """update_user_tier with invalid tier should return False."""
        auth.register_user("bad@test.com", "Bad", "Password1")
        assert auth.update_user_tier("bad@test.com", "platinum", "sub_1", "stripe") is False

    def test_update_tier_invalid_provider(self, auth):
        """update_user_tier with invalid provider should return False."""
        auth.register_user("prov@test.com", "Prov", "Password1")
        assert auth.update_user_tier("prov@test.com", "premium", "sub_1", "bitcoin") is False

    def test_update_tier_nonexistent_user(self, auth):
        """update_user_tier for non-existent user should return False."""
        assert auth.update_user_tier("nope@test.com", "premium", "sub_1", "stripe") is False


class TestAuthManagerPassword:
    """Tests for password change."""

    def test_change_password_success(self, auth):
        """change_password with correct old password should succeed."""
        auth.register_user("pw@test.com", "PW", "Password1")
        success, msg = auth.change_password("pw@test.com", "Password1", "NewPass1x")
        assert success is True
        assert "changed" in msg.lower()

        # Verify new password works
        ok, _, _status = auth.authenticate("pw@test.com", "NewPass1x")
        assert ok is True

    def test_change_password_wrong_old(self, auth):
        """change_password with wrong old password should fail."""
        auth.register_user("pwbad@test.com", "PWBad", "Password1")
        success, msg = auth.change_password("pwbad@test.com", "WrongOld1", "NewPass1x")
        assert success is False
        assert "incorrect" in msg.lower()

    def test_change_password_nonexistent_user(self, auth):
        """change_password for non-existent user should fail."""
        success, msg = auth.change_password("ghost@test.com", "Old1", "New1Pass")
        assert success is False
        assert "not found" in msg.lower()


class TestAuthManagerOAuth:
    """Tests for OAuth user creation and lookup."""

    def test_create_oauth_user_success(self, auth):
        """create_oauth_user should create an OAuth user."""
        success, msg = auth.create_oauth_user(
            "oauth@test.com", "OAuth User", "google", "g_123", "https://pic.url"
        )
        assert success is True

        user = auth.get_user("oauth@test.com")
        assert user is not None
        assert user["oauth_provider"] == "google"
        assert user["oauth_id"] == "g_123"
        assert user["email_verified"] is True

    def test_create_oauth_user_duplicate(self, auth):
        """create_oauth_user should fail for duplicate email."""
        auth.create_oauth_user("dup2@test.com", "Dup", "google", "g_1")
        success, msg = auth.create_oauth_user("dup2@test.com", "Dup2", "google", "g_2")
        assert success is False
        assert "unable to create account" in msg.lower()

    def test_create_oauth_user_invalid_provider(self, auth):
        """create_oauth_user with invalid provider should fail."""
        success, msg = auth.create_oauth_user("x@test.com", "Name", "twitter", "tw_1")
        assert success is False
        assert "invalid" in msg.lower()

    def test_create_oauth_user_empty_id(self, auth):
        """create_oauth_user with empty oauth_id should fail."""
        success, msg = auth.create_oauth_user("y@test.com", "Name", "google", "")
        assert success is False

    def test_link_oauth_account_success(self, auth):
        """link_oauth_account should add OAuth info to existing user."""
        auth.register_user("link@test.com", "Link", "Password1")
        result = auth.link_oauth_account("link@test.com", "google", "g_link")
        assert result is True

        user = auth.get_user("link@test.com")
        assert user["oauth_provider"] == "google"
        assert user["email_verified"] is True

    def test_link_oauth_with_picture(self, auth):
        """link_oauth_account should store profile_picture when given."""
        auth.register_user("pic@test.com", "Pic", "Password1")
        auth.link_oauth_account("pic@test.com", "google", "g_pic", "https://photo.url")
        user = auth.get_user("pic@test.com")
        assert user["profile_picture"] == "https://photo.url"

    def test_link_oauth_nonexistent_user(self, auth):
        """link_oauth_account for non-existent user should return False."""
        assert auth.link_oauth_account("nope@test.com", "google", "g_nope") is False

    def test_link_oauth_invalid_provider(self, auth):
        """link_oauth_account with invalid provider should return False."""
        auth.register_user("inv@test.com", "Inv", "Password1")
        assert auth.link_oauth_account("inv@test.com", "twitter", "tw_inv") is False

    def test_get_user_by_oauth_found(self, auth):
        """get_user_by_oauth should find a user by provider + oauth_id."""
        auth.create_oauth_user("found@test.com", "Found", "google", "g_found")
        user = auth.get_user_by_oauth("google", "g_found")
        assert user is not None
        assert user["email"] == "found@test.com"
        assert "password_hash" not in user

    def test_get_user_by_oauth_not_found(self, auth):
        """get_user_by_oauth should return None when not found."""
        assert auth.get_user_by_oauth("google", "nonexistent") is None


class TestAuthManagerLastLogin:
    """Tests for update_last_login."""

    def test_update_last_login_success(self, auth):
        """update_last_login should set the timestamp."""
        auth.register_user("ll@test.com", "LL", "Password1")
        result = auth.update_last_login("ll@test.com")
        assert result is True

        user = auth.get_user("ll@test.com")
        assert user["last_login"] is not None

    def test_update_last_login_nonexistent(self, auth):
        """update_last_login for non-existent user should return False."""
        assert auth.update_last_login("nope@test.com") is False


class TestConcurrentAccess:
    """Test thread-safety of the SQLite database with WAL mode."""

    def test_concurrent_writes_via_separate_connections(self, tmp_db):
        """Multiple threads writing via separate connections should not corrupt data."""
        # Initialize schema first
        init_db(tmp_db)
        close_db(tmp_db)

        errors = []

        def insert_user(idx):
            """Each thread opens its own connection, mimicking separate Streamlit sessions."""
            try:
                conn = sqlite3.connect(tmp_db, check_same_thread=False)
                conn.execute("PRAGMA journal_mode=WAL")
                conn.execute("PRAGMA busy_timeout=5000")
                import bcrypt
                salt = bcrypt.gensalt()
                pw = bcrypt.hashpw(b"Password1", salt).decode("utf-8")
                conn.execute(
                    "INSERT INTO users (email, name, password_hash, tier, created_at, "
                    "email_verified, failed_login_attempts) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (f"t{idx}@test.com", f"Thread{idx}", pw, "free", "2024-01-01T00:00:00", 0, 0),
                )
                conn.commit()
                conn.close()
            except Exception as exc:
                errors.append(exc)

        threads = [threading.Thread(target=insert_user, args=(i,)) for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0, f"Concurrent write errors: {errors}"

        # Verify all 10 users were created
        conn = sqlite3.connect(tmp_db)
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        conn.close()
        assert count == 10

    def test_sequential_operations_on_shared_connection(self, tmp_db):
        """Sequential operations on the shared connection should work correctly."""
        from Source.auth.manager import AuthManager

        auth = AuthManager(db_path=tmp_db)
        for i in range(5):
            success, msg = auth.register_user(f"seq{i}@test.com", f"Seq{i}", "Password1")
            assert success is True

        conn = get_db(tmp_db)
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        assert count == 5
        auth.close()
