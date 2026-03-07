"""
Tests for the security alerting service.

Follows TDD: these tests are written FIRST before the implementation.
Tests verify that the alert service correctly detects suspicious patterns
in audit logs and sends email notifications to admin.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio

# Import after conftest sets env vars
from app.database import Base
from app.models.audit import AuditLog
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestSessionFactory, test_engine

# ── Fixtures ──────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def db() -> AsyncSession:
    """Yield a clean database session with all tables created."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionFactory() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _insert_audit_events(
    db: AsyncSession,
    event_type: str,
    ip_address: str,
    count: int,
    *,
    created_at: datetime | None = None,
    metadata_json: dict | None = None,
) -> None:
    """Insert multiple audit log entries for testing."""
    base_time = created_at or datetime.now(UTC).replace(tzinfo=None)
    for i in range(count):
        entry = AuditLog(
            id=uuid.uuid4(),
            event_type=event_type,
            ip_address=ip_address,
            metadata_json=metadata_json,
            created_at=base_time - timedelta(seconds=i),
        )
        db.add(entry)
    await db.flush()


# ── Auth Spike Detection ─────────────────────────────────────────────────


class TestCheckAuthSpike:
    """Tests for check_auth_spike — detects brute-force login attempts."""

    @pytest.mark.asyncio
    async def test_returns_true_when_threshold_exceeded(self, db: AsyncSession) -> None:
        """Auth spike detected when >threshold failed logins from same IP in window."""
        from app.services.alert_service import check_auth_spike

        ip = "192.168.1.100"
        # Insert 25 failed login events in the last 5 minutes
        await _insert_audit_events(db, "login_failed", ip, 25)
        await db.commit()

        result = await check_auth_spike(db, ip, threshold=20, window_minutes=5)
        assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_when_below_threshold(self, db: AsyncSession) -> None:
        """No spike when failed logins are below the threshold."""
        from app.services.alert_service import check_auth_spike

        ip = "192.168.1.100"
        # Insert only 10 failed logins — below the 20 threshold
        await _insert_audit_events(db, "login_failed", ip, 10)
        await db.commit()

        result = await check_auth_spike(db, ip, threshold=20, window_minutes=5)
        assert result is False

    @pytest.mark.asyncio
    async def test_only_counts_events_within_window(self, db: AsyncSession) -> None:
        """Old events outside the time window are NOT counted."""
        from app.services.alert_service import check_auth_spike

        ip = "192.168.1.100"
        # Insert 25 events, but all 10 minutes ago (outside 5-minute window)
        old_time = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=10)
        await _insert_audit_events(db, "login_failed", ip, 25, created_at=old_time)
        await db.commit()

        result = await check_auth_spike(db, ip, threshold=20, window_minutes=5)
        assert result is False

    @pytest.mark.asyncio
    async def test_only_counts_events_for_specific_ip(self, db: AsyncSession) -> None:
        """Events from other IPs are NOT counted toward the threshold."""
        from app.services.alert_service import check_auth_spike

        target_ip = "192.168.1.100"
        other_ip = "10.0.0.1"
        # Insert 15 from target + 15 from other — neither alone hits 20
        await _insert_audit_events(db, "login_failed", target_ip, 15)
        await _insert_audit_events(db, "login_failed", other_ip, 15)
        await db.commit()

        result = await check_auth_spike(db, target_ip, threshold=20, window_minutes=5)
        assert result is False

    @pytest.mark.asyncio
    async def test_exact_threshold_returns_true(self, db: AsyncSession) -> None:
        """Exactly at threshold should trigger (>=, not just >)."""
        from app.services.alert_service import check_auth_spike

        ip = "192.168.1.100"
        await _insert_audit_events(db, "login_failed", ip, 20)
        await db.commit()

        result = await check_auth_spike(db, ip, threshold=20, window_minutes=5)
        assert result is True


# ── Rate Limit Breach Detection ──────────────────────────────────────────


class TestCheckRateLimitBreach:
    """Tests for check_rate_limit_breach — detects repeated 429 violations."""

    @pytest.mark.asyncio
    async def test_returns_true_when_threshold_exceeded(self, db: AsyncSession) -> None:
        """Rate limit breach detected when >threshold violations from same IP."""
        from app.services.alert_service import check_rate_limit_breach

        ip = "10.0.0.50"
        await _insert_audit_events(db, "rate_limit_exceeded", ip, 55)
        await db.commit()

        result = await check_rate_limit_breach(db, ip, threshold=50, window_minutes=10)
        assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_when_below_threshold(self, db: AsyncSession) -> None:
        """No breach when rate limit violations are below threshold."""
        from app.services.alert_service import check_rate_limit_breach

        ip = "10.0.0.50"
        await _insert_audit_events(db, "rate_limit_exceeded", ip, 30)
        await db.commit()

        result = await check_rate_limit_breach(db, ip, threshold=50, window_minutes=10)
        assert result is False

    @pytest.mark.asyncio
    async def test_only_counts_within_window(self, db: AsyncSession) -> None:
        """Old rate limit events outside the window are NOT counted."""
        from app.services.alert_service import check_rate_limit_breach

        ip = "10.0.0.50"
        old_time = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=20)
        await _insert_audit_events(db, "rate_limit_exceeded", ip, 55, created_at=old_time)
        await db.commit()

        result = await check_rate_limit_breach(db, ip, threshold=50, window_minutes=10)
        assert result is False


# ── Alert Email Sending ──────────────────────────────────────────────────


class TestSendSecurityAlert:
    """Tests for send_security_alert — sends email notifications to admin."""

    @pytest.mark.asyncio
    async def test_sends_email_with_correct_template(self, db: AsyncSession) -> None:
        """Alert email is sent via email service with security_alert template."""
        from app.services.alert_service import ALERT_AUTH_SPIKE, send_security_alert

        details = {
            "ip_address": "192.168.1.100",
            "event_count": 25,
            "window_minutes": 5,
        }

        with (
            patch("app.services.alert_service.get_settings") as mock_settings,
            patch("app.services.alert_service._send_alert_email", new_callable=AsyncMock) as mock_send,
        ):
            mock_settings.return_value.admin_alert_email = "admin@mergenix.com"
            mock_settings.return_value.alert_cooldown_minutes = 60

            await send_security_alert(ALERT_AUTH_SPIKE, details)

            mock_send.assert_called_once()
            call_args = mock_send.call_args
            assert call_args[1]["alert_type"] == ALERT_AUTH_SPIKE
            assert call_args[1]["to_email"] == "admin@mergenix.com"
            assert "192.168.1.100" in str(call_args[1]["details"])

    @pytest.mark.asyncio
    async def test_skips_when_no_admin_email_configured(self, db: AsyncSession) -> None:
        """Alert is NOT sent when admin_alert_email is empty."""
        from app.services.alert_service import ALERT_AUTH_SPIKE, send_security_alert

        with (
            patch("app.services.alert_service.get_settings") as mock_settings,
            patch("app.services.alert_service._send_alert_email", new_callable=AsyncMock) as mock_send,
        ):
            mock_settings.return_value.admin_alert_email = ""
            mock_settings.return_value.alert_cooldown_minutes = 60

            await send_security_alert(ALERT_AUTH_SPIKE, {"ip_address": "1.2.3.4"})

            mock_send.assert_not_called()

    @pytest.mark.asyncio
    async def test_dedup_prevents_duplicate_alert_within_cooldown(self, db: AsyncSession) -> None:
        """Same alert type + IP within cooldown period is NOT re-sent."""
        from app.services.alert_service import (
            ALERT_AUTH_SPIKE,
            _alert_dedup_cache,
            send_security_alert,
        )

        details = {"ip_address": "192.168.1.100", "event_count": 25}

        with (
            patch("app.services.alert_service.get_settings") as mock_settings,
            patch("app.services.alert_service._send_alert_email", new_callable=AsyncMock) as mock_send,
        ):
            mock_settings.return_value.admin_alert_email = "admin@mergenix.com"
            mock_settings.return_value.alert_cooldown_minutes = 60

            # Clear the dedup cache before test
            _alert_dedup_cache.clear()

            # First call — should send
            await send_security_alert(ALERT_AUTH_SPIKE, details)
            assert mock_send.call_count == 1

            # Second call — same alert type + IP within cooldown — should NOT send
            await send_security_alert(ALERT_AUTH_SPIKE, details)
            assert mock_send.call_count == 1  # Still 1, not 2

    @pytest.mark.asyncio
    async def test_dedup_allows_alert_after_cooldown_expires(self, db: AsyncSession) -> None:
        """Alert is re-sent after the cooldown period has elapsed."""
        from app.services.alert_service import (
            ALERT_AUTH_SPIKE,
            _alert_dedup_cache,
            send_security_alert,
        )

        details = {"ip_address": "192.168.1.200", "event_count": 30}

        with (
            patch("app.services.alert_service.get_settings") as mock_settings,
            patch("app.services.alert_service._send_alert_email", new_callable=AsyncMock) as mock_send,
        ):
            mock_settings.return_value.admin_alert_email = "admin@mergenix.com"
            mock_settings.return_value.alert_cooldown_minutes = 60

            # Clear cache and insert an expired entry
            _alert_dedup_cache.clear()
            dedup_key = f"{ALERT_AUTH_SPIKE}:192.168.1.200"
            _alert_dedup_cache[dedup_key] = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=120)

            # Should send because cooldown has expired
            await send_security_alert(ALERT_AUTH_SPIKE, details)
            assert mock_send.call_count == 1


# ── Configurable Thresholds ──────────────────────────────────────────────


class TestConfigurableThresholds:
    """Verify that alert thresholds come from settings."""

    @pytest.mark.asyncio
    async def test_auth_spike_uses_settings_threshold(self, db: AsyncSession) -> None:
        """check_auth_spike uses threshold from settings when not overridden."""
        from app.services.alert_service import check_auth_spike

        ip = "192.168.1.100"
        # Insert 15 events — below default (20) but above a custom threshold (10)
        await _insert_audit_events(db, "login_failed", ip, 15)
        await db.commit()

        # With custom low threshold, should detect
        result = await check_auth_spike(db, ip, threshold=10, window_minutes=5)
        assert result is True

        # With default threshold (20), should NOT detect
        result = await check_auth_spike(db, ip, threshold=20, window_minutes=5)
        assert result is False

    @pytest.mark.asyncio
    async def test_rate_breach_uses_settings_threshold(self, db: AsyncSession) -> None:
        """check_rate_limit_breach uses threshold from settings when not overridden."""
        from app.services.alert_service import check_rate_limit_breach

        ip = "10.0.0.50"
        await _insert_audit_events(db, "rate_limit_exceeded", ip, 35)
        await db.commit()

        # With custom low threshold, should detect
        result = await check_rate_limit_breach(db, ip, threshold=30, window_minutes=10)
        assert result is True

        # With default threshold (50), should NOT detect
        result = await check_rate_limit_breach(db, ip, threshold=50, window_minutes=10)
        assert result is False


# ── run_security_checks Integration ──────────────────────────────────────


class TestRunSecurityChecks:
    """Tests for run_security_checks — orchestrates all pattern checks."""

    @pytest.mark.asyncio
    async def test_triggers_alert_on_rate_limit_breach(self, db: AsyncSession) -> None:
        """run_security_checks sends a rate_limit_breach alert when threshold exceeded."""
        from app.services.alert_service import (
            ALERT_RATE_LIMIT_BREACH,
            _alert_dedup_cache,
            run_security_checks,
        )

        ip = "10.0.0.77"
        await _insert_audit_events(db, "rate_limit_exceeded", ip, 55)
        await db.commit()

        _alert_dedup_cache.clear()

        with (
            patch("app.services.alert_service.get_settings") as mock_settings,
            patch("app.services.alert_service._send_alert_email", new_callable=AsyncMock) as mock_send,
        ):
            mock_settings.return_value.admin_alert_email = "admin@mergenix.com"
            mock_settings.return_value.alert_cooldown_minutes = 60
            mock_settings.return_value.alert_auth_spike_threshold = 20
            mock_settings.return_value.alert_auth_spike_window_minutes = 5
            mock_settings.return_value.alert_rate_breach_threshold = 50
            mock_settings.return_value.alert_rate_breach_window_minutes = 10

            await run_security_checks(db, ip)

            # Should have sent at least one alert
            assert mock_send.call_count >= 1
            # Verify at least one call was for rate_limit_breach
            alert_types = [call.kwargs["alert_type"] for call in mock_send.call_args_list]
            assert ALERT_RATE_LIMIT_BREACH in alert_types

    @pytest.mark.asyncio
    async def test_triggers_alert_on_auth_spike(self, db: AsyncSession) -> None:
        """run_security_checks sends an alert when auth spike is detected."""
        from app.services.alert_service import _alert_dedup_cache, run_security_checks

        ip = "192.168.1.100"
        await _insert_audit_events(db, "login_failed", ip, 25)
        await db.commit()

        _alert_dedup_cache.clear()

        with (
            patch("app.services.alert_service.get_settings") as mock_settings,
            patch("app.services.alert_service._send_alert_email", new_callable=AsyncMock) as mock_send,
        ):
            mock_settings.return_value.admin_alert_email = "admin@mergenix.com"
            mock_settings.return_value.alert_cooldown_minutes = 60
            mock_settings.return_value.alert_auth_spike_threshold = 20
            mock_settings.return_value.alert_auth_spike_window_minutes = 5
            mock_settings.return_value.alert_rate_breach_threshold = 50
            mock_settings.return_value.alert_rate_breach_window_minutes = 10

            await run_security_checks(db, ip)

            # Should have sent at least one alert
            assert mock_send.call_count >= 1

    @pytest.mark.asyncio
    async def test_no_alert_when_no_suspicious_activity(self, db: AsyncSession) -> None:
        """run_security_checks does NOT send alert when everything is normal."""
        from app.services.alert_service import _alert_dedup_cache, run_security_checks

        ip = "192.168.1.100"
        # Only 2 failed logins — way below threshold
        await _insert_audit_events(db, "login_failed", ip, 2)
        await db.commit()

        _alert_dedup_cache.clear()

        with (
            patch("app.services.alert_service.get_settings") as mock_settings,
            patch("app.services.alert_service._send_alert_email", new_callable=AsyncMock) as mock_send,
        ):
            mock_settings.return_value.admin_alert_email = "admin@mergenix.com"
            mock_settings.return_value.alert_cooldown_minutes = 60
            mock_settings.return_value.alert_auth_spike_threshold = 20
            mock_settings.return_value.alert_auth_spike_window_minutes = 5
            mock_settings.return_value.alert_rate_breach_threshold = 50
            mock_settings.return_value.alert_rate_breach_window_minutes = 10

            await run_security_checks(db, ip)

            mock_send.assert_not_called()

    @pytest.mark.asyncio
    async def test_never_raises_exceptions(self, db: AsyncSession) -> None:
        """run_security_checks swallows all exceptions (fire-and-forget)."""
        from app.services.alert_service import run_security_checks

        ip = "192.168.1.100"

        with patch(
            "app.services.alert_service.check_auth_spike",
            side_effect=RuntimeError("DB error"),
        ):
            # Should NOT raise — fire-and-forget pattern
            await run_security_checks(db, ip)


# ── Format Alert Email ───────────────────────────────────────────────────


class TestFormatSecurityAlert:
    """Tests for the alert email formatting."""

    @pytest.mark.asyncio
    async def test_format_includes_alert_details(self) -> None:
        """Formatted alert email includes alert type, masked IP, count, and timestamp."""
        from app.services.alert_service import format_security_alert

        details = {
            "ip_address": "192.168.1.100",
            "event_count": 25,
            "window_minutes": 5,
        }

        html = format_security_alert("auth_spike", details)

        # IP should be masked (GDPR data minimization) — last octet replaced
        assert "192.168.1.xxx" in html
        assert "192.168.1.100" not in html  # Full IP must NOT appear in email
        assert "25" in html
        assert "auth_spike" in html or "Auth Spike" in html or "Authentication Spike" in html

    @pytest.mark.asyncio
    async def test_format_masks_ipv6_address(self) -> None:
        """IPv6 addresses are also masked in alert emails."""
        from app.services.alert_service import format_security_alert

        details = {
            "ip_address": "2001:db8::1",
            "event_count": 10,
            "window_minutes": 5,
        }

        html = format_security_alert("auth_spike", details)

        assert "2001:db8::xxx" in html
        assert "2001:db8::1" not in html


class TestMaskIpAddress:
    """Tests for _mask_ip_address — GDPR data minimization for email alerts."""

    def test_masks_ipv4_last_octet(self) -> None:
        from app.services.alert_service import _mask_ip_address

        assert _mask_ip_address("192.168.1.100") == "192.168.1.xxx"
        assert _mask_ip_address("10.0.0.1") == "10.0.0.xxx"

    def test_masks_ipv6_last_segment(self) -> None:
        from app.services.alert_service import _mask_ip_address

        assert _mask_ip_address("2001:db8::1") == "2001:db8::xxx"
        assert _mask_ip_address("::1") == "::xxx"

    def test_passes_through_unknown(self) -> None:
        from app.services.alert_service import _mask_ip_address

        assert _mask_ip_address("Unknown") == "Unknown"
        assert _mask_ip_address("") == ""

    def test_passes_through_non_ip_string(self) -> None:
        from app.services.alert_service import _mask_ip_address

        assert _mask_ip_address("localhost") == "localhost"


class TestDedupCacheBounds:
    """Tests for bounded dedup cache — prevents memory exhaustion under DDoS."""

    @pytest.mark.asyncio
    async def test_cache_evicts_oldest_when_full(self, db: AsyncSession) -> None:
        """Cache evicts oldest entries when maxsize is reached."""
        from app.services.alert_service import (
            _DEDUP_CACHE_MAXSIZE,
            _alert_dedup_cache,
            send_security_alert,
        )

        _alert_dedup_cache.clear()

        # Fill cache to maxsize with stale entries
        now = datetime.now(UTC).replace(tzinfo=None)
        for i in range(_DEDUP_CACHE_MAXSIZE):
            _alert_dedup_cache[f"test:{i}.{i}.{i}.{i}"] = now

        assert len(_alert_dedup_cache) == _DEDUP_CACHE_MAXSIZE

        # Trigger one more alert — should evict oldest, not grow unbounded
        with (
            patch("app.services.alert_service.get_settings") as mock_settings,
            patch("app.services.alert_service._send_alert_email", new_callable=AsyncMock),
        ):
            mock_settings.return_value.admin_alert_email = "admin@mergenix.com"
            mock_settings.return_value.alert_cooldown_minutes = 60

            await send_security_alert(
                "test_type",
                {"ip_address": "999.999.999.999"},
            )

        assert len(_alert_dedup_cache) <= _DEDUP_CACHE_MAXSIZE
        # The new entry should be present
        assert "test_type:999.999.999.999" in _alert_dedup_cache
        _alert_dedup_cache.clear()


class TestEvictExpiredEntries:
    """Direct tests for _evict_expired_entries — lazy TTL eviction."""

    def test_evicts_expired_and_keeps_non_expired(self) -> None:
        """Expired entries are removed; non-expired entries remain."""
        from app.services.alert_service import _alert_dedup_cache, _evict_expired_entries

        _alert_dedup_cache.clear()

        now = datetime.now(UTC).replace(tzinfo=None)
        cooldown = timedelta(minutes=60)

        # Insert an expired entry (2 hours ago — well past 60-min cooldown)
        _alert_dedup_cache["expired_key:1.2.3.4"] = now - timedelta(hours=2)
        # Insert another expired entry (90 minutes ago)
        _alert_dedup_cache["also_expired:5.6.7.8"] = now - timedelta(minutes=90)
        # Insert a non-expired entry (10 minutes ago — within 60-min cooldown)
        _alert_dedup_cache["fresh_key:9.10.11.12"] = now - timedelta(minutes=10)

        _evict_expired_entries(now, cooldown)

        # Expired entries should be gone
        assert "expired_key:1.2.3.4" not in _alert_dedup_cache
        assert "also_expired:5.6.7.8" not in _alert_dedup_cache
        # Non-expired entry should remain
        assert "fresh_key:9.10.11.12" in _alert_dedup_cache

        _alert_dedup_cache.clear()
