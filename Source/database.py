"""
Database connection management, schema creation, and JSON-to-SQLite migration.
"""

import json
import logging
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)

# Module-level connection cache keyed by absolute db_path
_connections: dict[str, sqlite3.Connection] = {}

# SQL schema for the users table
_USERS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password_hash TEXT,
    tier TEXT NOT NULL DEFAULT 'free',
    subscription_id TEXT,
    payment_provider TEXT,
    created_at TEXT NOT NULL,
    email_verified INTEGER NOT NULL DEFAULT 0,
    last_login TEXT,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    last_failed_login TEXT,
    oauth_provider TEXT,
    oauth_id TEXT,
    profile_picture TEXT,
    totp_secret TEXT,
    totp_enabled INTEGER NOT NULL DEFAULT 0,
    backup_codes TEXT,
    backup_codes_remaining INTEGER NOT NULL DEFAULT 0,
    totp_enabled_at TEXT
)
"""

_USERS_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id)
"""

# SQL schema for the audit_log table
_AUDIT_LOG_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    event_type TEXT NOT NULL,
    user_email TEXT,
    ip_address TEXT,
    details TEXT,
    success INTEGER NOT NULL DEFAULT 1
)
"""

_AUDIT_LOG_INDEXES_SQL = [
    "CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)",
    "CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_email)",
    "CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_log(event_type)",
]

_AUDIT_LOG_TRIGGERS_SQL = [
    """
    CREATE TRIGGER IF NOT EXISTS prevent_audit_delete BEFORE DELETE ON audit_log BEGIN
        SELECT RAISE(ABORT, 'Audit log entries cannot be deleted');
    END
    """,
    """
    CREATE TRIGGER IF NOT EXISTS prevent_audit_update BEFORE UPDATE ON audit_log BEGIN
        SELECT RAISE(ABORT, 'Audit log entries cannot be modified');
    END
    """,
]

# SQL schema for the auth_tokens table (email verification + password reset)
_AUTH_TOKENS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS auth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    token_type TEXT NOT NULL CHECK(token_type IN ('email_verification', 'password_reset')),
    token_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    used_at TEXT,
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
)
"""

_AUTH_TOKENS_INDEX_HASH_SQL = """
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON auth_tokens(token_hash)
"""

_AUTH_TOKENS_INDEX_EMAIL_SQL = """
CREATE INDEX IF NOT EXISTS idx_tokens_email ON auth_tokens(user_email)
"""


def get_db(db_path: str = "data/mergenix.db") -> sqlite3.Connection:
    """
    Get or create a SQLite connection with proper configuration.

    Uses module-level caching so the same db_path always returns the same
    connection object (singleton per path).

    Args:
        db_path: Path to the SQLite database file.

    Returns:
        Configured sqlite3.Connection instance.
    """
    abs_path = str(Path(db_path).resolve())

    if abs_path in _connections:
        # Verify the cached connection is still usable
        try:
            _connections[abs_path].execute("SELECT 1")
            return _connections[abs_path]
        except (sqlite3.ProgrammingError, sqlite3.OperationalError):
            # Connection is closed or broken, remove from cache
            _connections.pop(abs_path, None)

    # Ensure parent directory exists
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row

    # Configure pragmas
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")

    # Create schema
    conn.execute(_USERS_TABLE_SQL)
    conn.execute(_USERS_INDEX_SQL)
    conn.execute(_AUDIT_LOG_TABLE_SQL)
    for idx_sql in _AUDIT_LOG_INDEXES_SQL:
        conn.execute(idx_sql)
    for trigger_sql in _AUDIT_LOG_TRIGGERS_SQL:
        conn.execute(trigger_sql)
    conn.execute(_AUTH_TOKENS_TABLE_SQL)
    conn.execute(_AUTH_TOKENS_INDEX_HASH_SQL)
    conn.execute(_AUTH_TOKENS_INDEX_EMAIL_SQL)
    conn.commit()

    _connections[abs_path] = conn
    return conn


def migrate_json_to_sqlite(
    json_path: str = "data/users.json",
    db_path: str = "data/mergenix.db",
) -> int:
    """
    Migrate existing users from JSON file into SQLite.

    Only runs if the users table is empty AND the JSON file has data.

    Args:
        json_path: Path to the legacy users.json file.
        db_path: Path to the SQLite database file.

    Returns:
        Number of users migrated (0 if skipped).
    """
    conn = get_db(db_path)

    # Check if users table already has data
    row = conn.execute("SELECT COUNT(*) AS cnt FROM users").fetchone()
    if row["cnt"] > 0:
        logger.info("Users table already has data; skipping JSON migration.")
        return 0

    # Check if JSON file exists and has data
    json_file = Path(json_path)
    if not json_file.exists():
        logger.info("No users.json found at %s; nothing to migrate.", json_path)
        return 0

    try:
        with open(json_file) as f:
            users = json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Could not read %s: %s", json_path, exc)
        return 0

    if not users:
        logger.info("users.json is empty; nothing to migrate.")
        return 0

    migrated = 0
    for email, data in users.items():
        try:
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
                    data.get("name", ""),
                    data.get("password_hash"),
                    data.get("tier", "free"),
                    data.get("subscription_id"),
                    data.get("payment_provider"),
                    data.get("created_at", ""),
                    1 if data.get("email_verified") else 0,
                    data.get("last_login"),
                    data.get("failed_login_attempts", 0),
                    data.get("last_failed_login"),
                    data.get("oauth_provider"),
                    data.get("oauth_id"),
                    data.get("profile_picture"),
                ),
            )
            migrated += 1
        except sqlite3.IntegrityError:
            logger.warning("Skipping duplicate email during migration: %s", email)

    conn.commit()
    logger.info("Migrated %d user(s) from %s to SQLite.", migrated, json_path)
    return migrated


def init_db(db_path: str = "data/mergenix.db") -> sqlite3.Connection:
    """
    Initialize the database: create tables and run migration if needed.

    Args:
        db_path: Path to the SQLite database file.

    Returns:
        Configured sqlite3.Connection instance.
    """
    conn = get_db(db_path)
    migrate_json_to_sqlite(db_path=db_path)
    return conn


def close_db(db_path: str | None = None) -> None:
    """
    Close a cached database connection (useful for testing cleanup).

    Args:
        db_path: Path to close. If None, closes ALL cached connections.
    """
    if db_path is None:
        for _path, conn in list(_connections.items()):
            try:
                conn.close()
            except Exception:  # noqa: BLE001, S110
                pass
        _connections.clear()
    else:
        abs_path = str(Path(db_path).resolve())
        conn = _connections.pop(abs_path, None)
        if conn is not None:
            try:
                conn.close()
            except Exception:  # noqa: BLE001, S110
                pass
