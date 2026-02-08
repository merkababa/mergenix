"""
Audit logging module for Mergenix authentication events.

Provides immutable, append-only audit trail stored in SQLite.
"""

import json
import logging

from Source.database import get_db

logger = logging.getLogger(__name__)


def log_audit_event(
    event_type: str,
    user_email: str | None = None,
    details: dict | None = None,
    success: bool = True,
    ip_address: str | None = None,
    db_path: str = "data/mergenix.db",
) -> None:
    """
    Log an audit event to the database.

    Args:
        event_type: Type of event (e.g. login_success, register_failed).
        user_email: Email address of the user involved (if any).
        details: Optional dict of extra information (serialized as JSON).
        success: Whether the event was a successful operation.
        ip_address: Client IP address (if available).
        db_path: Path to the SQLite database file.
    """
    conn = get_db(db_path)
    details_json = json.dumps(details) if details else None
    try:
        conn.execute(
            """
            INSERT INTO audit_log (event_type, user_email, ip_address, details, success)
            VALUES (?, ?, ?, ?, ?)
            """,
            (event_type, user_email, ip_address, details_json, 1 if success else 0),
        )
        conn.commit()
    except Exception:
        logger.exception("Failed to write audit log event: %s", event_type)


def get_audit_log(
    user_email: str | None = None,
    event_type: str | None = None,
    limit: int = 100,
    db_path: str = "data/mergenix.db",
) -> list[dict]:
    """
    Query audit log entries with optional filtering.

    Args:
        user_email: Filter by user email (exact match).
        event_type: Filter by event type (exact match).
        limit: Maximum number of entries to return.
        db_path: Path to the SQLite database file.

    Returns:
        List of audit log entry dicts, most recent first.
    """
    conn = get_db(db_path)
    query = "SELECT * FROM audit_log WHERE 1=1"
    params: list = []

    if user_email is not None:
        query += " AND user_email = ?"
        params.append(user_email)

    if event_type is not None:
        query += " AND event_type = ?"
        params.append(event_type)

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    results = []
    for row in rows:
        entry = dict(row)
        # Parse details JSON back to dict
        if entry.get("details"):
            try:
                entry["details"] = json.loads(entry["details"])
            except (json.JSONDecodeError, TypeError):
                pass
        # Convert success from int to bool
        entry["success"] = bool(entry["success"])
        results.append(entry)
    return results
