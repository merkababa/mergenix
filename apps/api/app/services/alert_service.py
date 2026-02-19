"""
Security alerting service — detects suspicious patterns in audit logs
and sends email notifications to the admin.

Monitors for:
- Authentication spikes (brute-force login attempts)
- Rate limit breaches (repeated 429 violations)

Uses a bounded in-memory deduplication cache to prevent alert fatigue.
All checks are fire-and-forget — exceptions are swallowed to never
break the main request flow.

IMPORTANT — Monitoring requirement:
  run_security_checks() swallows ALL exceptions to prevent alerting
  failures from breaking the login flow. Operations teams MUST monitor
  application logs for "Security check failed" entries — this is the
  only signal that the alerting subsystem is broken.

KNOWN LIMITATION — Multi-worker deduplication:
  The dedup cache is process-local (in-memory). In production deployments
  with multiple Uvicorn workers or containers, each worker maintains its
  own cache. This means an attacker could trigger up to N duplicate alerts
  (one per worker) for the same event within the cooldown window.
  For production multi-worker deployments, migrate dedup state to Redis
  (using the same instance as RATE_LIMIT_STORAGE_URI) to ensure consistent
  cross-worker deduplication.
"""

from __future__ import annotations

import logging
from collections import OrderedDict
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)

# ── Alert Type Constants ─────────────────────────────────────────────────

ALERT_AUTH_SPIKE = "auth_spike"
ALERT_RATE_LIMIT_BREACH = "rate_limit_breach"

# ── Deduplication Cache ──────────────────────────────────────────────────
# Maps "alert_type:ip_address" → datetime of last alert sent.
# Bounded to prevent memory exhaustion during DDoS with random IPs.
# Uses OrderedDict for O(1) LRU eviction when maxsize is reached.
# TTL eviction happens lazily on access (expired entries removed on lookup).
#
# SCALING NOTE: This cache is process-local. See module docstring for
# multi-worker limitations and Redis migration path.

_DEDUP_CACHE_MAXSIZE = 10_000

# Thread-safe: only accessed from the asyncio event loop thread, never from worker threads
_alert_dedup_cache: OrderedDict[str, datetime] = OrderedDict()

# ── Jinja2 Template Environment ──────────────────────────────────────────

_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"

_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(default=True, default_for_string=True),
)


# ── Cache Maintenance ────────────────────────────────────────────────────


def _evict_expired_entries(now: datetime, cooldown: timedelta) -> None:
    """Remove expired entries from the dedup cache.

    Scans from oldest to newest (OrderedDict insertion order) and removes
    entries whose cooldown has expired. Stops at the first non-expired entry
    since all subsequent entries are newer.
    """
    keys_to_remove: list[str] = []
    for key, timestamp in _alert_dedup_cache.items():
        if (now - timestamp) >= cooldown:
            keys_to_remove.append(key)
        else:
            break  # Ordered by insertion time; rest are newer
    for key in keys_to_remove:
        del _alert_dedup_cache[key]


# ── IP Address Masking (GDPR Data Minimization) ─────────────────────────


def _mask_ip_address(ip: str) -> str:
    """Mask an IP address for inclusion in email alerts.

    GDPR Article 5(1)(c) requires data minimization — full IP addresses
    are PII and should not be transmitted via third-party email providers
    (e.g., Resend) unless strictly necessary.

    IPv4: 192.168.1.100 → 192.168.1.xxx
    IPv6: 2001:db8::1    → 2001:db8::xxx
    """
    if not ip or ip == "Unknown":
        return ip

    # IPv4: mask last octet
    if "." in ip:
        parts = ip.rsplit(".", 1)
        return f"{parts[0]}.xxx"

    # IPv6: mask last segment
    if ":" in ip:
        parts = ip.rsplit(":", 1)
        return f"{parts[0]}:xxx"

    return ip


# ── Statement Timeout Helper ────────────────────────────────────────────
#
# TODO(portability): SET LOCAL statement_timeout is PostgreSQL-specific.
# SQLAlchemy does not provide a portable, cross-database statement timeout
# via execution_options. If the project needs to support non-PostgreSQL
# backends in production, implement backend-specific timeout strategies:
#   - PostgreSQL: SET LOCAL statement_timeout (current approach)
#   - MySQL/MariaDB: SET SESSION max_execution_time
#   - SQLite: No statement timeout (not needed — embedded, no network)
#   - MSSQL: SET LOCK_TIMEOUT
# For now, this is acceptable because production uses PostgreSQL exclusively.
# The helper silently skips on unsupported backends (e.g., SQLite in tests).


async def _set_statement_timeout(db: AsyncSession, timeout_ms: int = 2000) -> None:
    """Set a per-transaction statement timeout to prevent long-running queries.

    Uses PostgreSQL's ``SET LOCAL statement_timeout`` which scopes the
    timeout to the current transaction only (auto-reset on commit/rollback).

    Args:
        db: Active async database session.
        timeout_ms: Timeout in milliseconds (default: 2000ms = 2 seconds).
            Must be an integer between 100 and 30000 (bounds-checked as
            defense-in-depth since the value is interpolated into SQL).

    Raises:
        ValueError: If timeout_ms is not an int or is outside [100, 30000].

    Note:
        PostgreSQL-specific. Silently skipped on other backends (e.g.,
        SQLite in tests) — the try/except ensures non-PostgreSQL backends
        do not break. See TODO(portability) above for multi-backend plans.
    """
    if not isinstance(timeout_ms, int) or not (100 <= timeout_ms <= 30_000):
        raise ValueError(f"timeout_ms must be int between 100 and 30000, got {timeout_ms}")

    from sqlalchemy import text

    try:
        await db.execute(text(f"SET LOCAL statement_timeout = '{timeout_ms}'"))
    except Exception:  # noqa: S110 — intentional: PostgreSQL-only, not an error on other backends
        pass


# ── Pattern Detection ────────────────────────────────────────────────────


async def _count_events_in_window(
    db: AsyncSession,
    event_type: str,
    ip: str,
    window_minutes: int,
    threshold: int,
) -> bool:
    """Count audit events and return True if count >= threshold.

    Shared query logic for all pattern-detection checks. Sets a 2-second
    statement timeout to prevent blocking under sustained attack load.

    PERFORMANCE: This COUNT(*) query uses the indexes on event_type and
    created_at. Under sustained attack load, consider migrating to
    Redis INCR-based counters (see run_security_checks docstring).

    Args:
        db: Active async database session.
        event_type: The audit event type to count (e.g. 'login_failed').
        ip: Client IP address to filter by.
        window_minutes: How far back to look (in minutes).
        threshold: The count at which to trigger (>= comparison).

    Returns:
        True if the event count meets or exceeds the threshold.
    """
    cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=window_minutes)

    # Prevent query from blocking under attack load (2s timeout).
    # See _set_statement_timeout docstring for portability notes.
    await _set_statement_timeout(db, timeout_ms=2000)

    result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.event_type == event_type,
            AuditLog.ip_address == ip,
            AuditLog.created_at >= cutoff,
        )
    )
    count = result.scalar_one()
    return count >= threshold


async def check_auth_spike(
    db: AsyncSession,
    ip: str,
    *,
    threshold: int = 20,
    window_minutes: int = 5,
) -> bool:
    """Check if there's a spike of failed login attempts from an IP.

    Returns True if the count of 'login_failed' events from the given IP
    within the time window is >= threshold.
    """
    return await _count_events_in_window(db, "login_failed", ip, window_minutes, threshold)


async def check_rate_limit_breach(
    db: AsyncSession,
    ip: str,
    *,
    threshold: int = 50,
    window_minutes: int = 10,
) -> bool:
    """Check if an IP has exceeded the rate limit breach threshold.

    Returns True if the count of 'rate_limit_exceeded' events from the
    given IP within the time window is >= threshold.
    """
    return await _count_events_in_window(db, "rate_limit_exceeded", ip, window_minutes, threshold)


# ── Alert Email Formatting ───────────────────────────────────────────────


def format_security_alert(alert_type: str, details: dict[str, Any]) -> str:
    """Render the security alert email HTML from the template.

    IP addresses are masked before inclusion in the email body to comply
    with GDPR Article 5(1)(c) (data minimization). Full IPs should only
    be viewed in the admin dashboard / audit logs, not sent via email.

    Args:
        alert_type: The type of alert (e.g. 'auth_spike', 'rate_limit_breach').
        details: Dict with contextual data (ip_address, event_count, etc.).

    Returns:
        Rendered HTML string.
    """
    # Build human-readable alert type name
    alert_type_display = alert_type.replace("_", " ").title()

    # Mask IP address for GDPR data minimization — full IP is PII and
    # should not be transmitted via third-party email providers.
    raw_ip = details.get("ip_address", "Unknown")
    masked_ip = _mask_ip_address(raw_ip)

    template = _jinja_env.get_template("security_alert.html")
    return template.render(
        alert_type=alert_type,
        alert_type_display=alert_type_display,
        ip_address=masked_ip,
        event_count=details.get("event_count", "N/A"),
        window_minutes=details.get("window_minutes", "N/A"),
        timestamp=datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC"),
        details=details,
    )


# ── Alert Email Sending ─────────────────────────────────────────────────


async def _send_alert_email(
    *,
    alert_type: str,
    to_email: str,
    details: dict[str, Any],
) -> bool:
    """Send a security alert email to the admin.

    Args:
        alert_type: The type of alert.
        to_email: Admin email address.
        details: Alert context data.

    Returns:
        True if sent successfully, False otherwise.
    """
    from app.services.email_service import _send

    alert_type_display = alert_type.replace("_", " ").title()
    subject = f"[Mergenix Security Alert] {alert_type_display}"
    html = format_security_alert(alert_type, details)

    return await _send(to_email, subject, html)


async def send_security_alert(
    alert_type: str,
    details: dict[str, Any],
) -> None:
    """Send a security alert email with deduplication.

    Checks the cooldown cache to prevent duplicate alerts for the same
    alert_type + IP within the cooldown window. If no admin email is
    configured, the alert is silently skipped.

    Args:
        alert_type: The type of alert (e.g. ALERT_AUTH_SPIKE).
        details: Alert context data (must include 'ip_address').
    """
    settings = get_settings()

    # Skip if no admin email configured
    if not settings.admin_alert_email:
        logger.debug("No admin_alert_email configured — skipping security alert.")
        return

    # Check deduplication cache
    ip = details.get("ip_address", "unknown")
    dedup_key = f"{alert_type}:{ip}"
    cooldown_minutes = settings.alert_cooldown_minutes

    now = datetime.now(UTC).replace(tzinfo=None)
    cooldown_delta = timedelta(minutes=cooldown_minutes)
    last_sent = _alert_dedup_cache.get(dedup_key)

    if last_sent is not None:
        elapsed = now - last_sent
        if elapsed < cooldown_delta:
            logger.debug(
                "Alert %s suppressed by cooldown (last sent %s ago).",
                dedup_key,
                elapsed,
            )
            return

    # Evict expired entries lazily (scan oldest-first, stop at first non-expired)
    _evict_expired_entries(now, cooldown_delta)

    # Enforce maxsize — evict oldest entries if cache is full
    while len(_alert_dedup_cache) >= _DEDUP_CACHE_MAXSIZE:
        _alert_dedup_cache.popitem(last=False)  # Remove oldest (FIFO)

    # Update dedup cache and send (move_to_end for LRU ordering)
    _alert_dedup_cache[dedup_key] = now
    _alert_dedup_cache.move_to_end(dedup_key)

    await _send_alert_email(
        alert_type=alert_type,
        to_email=settings.admin_alert_email,
        details=details,
    )


# ── Security Checks Orchestrator ────────────────────────────────────────


async def run_security_checks(db: AsyncSession, ip: str) -> None:
    """Run all security pattern checks for an IP address.

    This is the main entry point called from auth endpoints.
    It's fire-and-forget — all exceptions are swallowed so that
    alerting failures never break the login flow.

    MONITORING REQUIREMENT: Because this function swallows ALL exceptions,
    the only signal that the alerting subsystem is broken is the
    "Security check failed" log entry (logged at ERROR level via
    logger.exception). Operations teams MUST set up log-based alerts
    for this message to detect alerting subsystem failures.

    PERFORMANCE NOTE: The COUNT queries on audit_log may degrade under
    sustained attack load as the table grows. For high-throughput
    production deployments, consider:
    1. Using FastAPI BackgroundTasks to run checks after the response.
    2. Migrating to Redis-based ephemeral counters (INCR + EXPIRE) for
       real-time counting instead of COUNT(*) queries on Postgres.
    The audit_log table has indexes on (event_type) and (created_at)
    which help, but are not sufficient under extreme load.

    Args:
        db: Active async database session.
        ip: Client IP address to check.
    """
    try:
        settings = get_settings()

        # Sequential intentionally: AsyncSession is not safe for concurrent
        # coroutine use. asyncio.gather would silently serialize with asyncpg
        # anyway. For true parallelism, each check would need its own session
        # (future Redis migration).
        auth_spike = await check_auth_spike(
            db,
            ip,
            threshold=settings.alert_auth_spike_threshold,
            window_minutes=settings.alert_auth_spike_window_minutes,
        )
        rate_breach = await check_rate_limit_breach(
            db,
            ip,
            threshold=settings.alert_rate_breach_threshold,
            window_minutes=settings.alert_rate_breach_window_minutes,
        )

        if auth_spike:
            await send_security_alert(
                ALERT_AUTH_SPIKE,
                {
                    "ip_address": ip,
                    "event_count": settings.alert_auth_spike_threshold,
                    "window_minutes": settings.alert_auth_spike_window_minutes,
                },
            )

        if rate_breach:
            await send_security_alert(
                ALERT_RATE_LIMIT_BREACH,
                {
                    "ip_address": ip,
                    "event_count": settings.alert_rate_breach_threshold,
                    "window_minutes": settings.alert_rate_breach_window_minutes,
                },
            )
    except Exception:
        # Fire-and-forget — never propagate exceptions
        logger.exception("Security check failed for IP %s", _mask_ip_address(ip))
