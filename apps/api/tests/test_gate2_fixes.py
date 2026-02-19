"""
Tests for Gate 2 review fixes (PR #56).

TDD: These tests are written FIRST before implementation.
Each test verifies a specific finding from the Gate 2 review.

F1:  Partner email PII leaked in logs — must be masked
F3:  httpx _oauth_http_client never closed on shutdown
F7:  Analytics dialect sniffing via db.bind.dialect.name
F8:  Cross-service import of private _mask_email
F9:  Missing rate limit on analytics summary GET endpoint
F10: Analytics purge function and admin endpoint
F12: _mask_email IndexError on empty local part
F13: Age gate test coverage gap
"""

from __future__ import annotations

import datetime
import inspect
from datetime import UTC
from unittest.mock import AsyncMock, patch

import pytest
from app.models.analytics import DailyEventCount
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Analytics key from conftest
ANALYTICS_KEY_HEADER = {"X-Analytics-Key": "test-analytics-key-for-testing"}


# ── F8: Public mask_email utility ────────────────────────────────────────


class TestMaskEmailUtility:
    """F8: mask_email should be a public function in app.utils.masking."""

    def test_mask_email_exists_in_utils(self) -> None:
        """mask_email should be importable from app.utils.masking."""
        from app.utils.masking import mask_email

        assert callable(mask_email)

    def test_mask_email_standard(self) -> None:
        """mask_email masks local part, keeps domain."""
        from app.utils.masking import mask_email

        assert mask_email("partner@example.com") == "p***@example.com"

    def test_mask_email_single_char_local(self) -> None:
        """mask_email works with single-character local part."""
        from app.utils.masking import mask_email

        assert mask_email("a@example.com") == "a***@example.com"

    def test_mask_email_no_at_sign(self) -> None:
        """mask_email returns '***' for input without @."""
        from app.utils.masking import mask_email

        assert mask_email("no-at-sign") == "***"

    def test_mask_email_empty_string(self) -> None:
        """mask_email returns '***' for empty string."""
        from app.utils.masking import mask_email

        assert mask_email("") == "***"

    def test_email_service_uses_utils_mask_email(self) -> None:
        """email_service._mask_email should delegate to utils.masking.mask_email."""
        from app.services.email_service import _mask_email
        from app.utils.masking import mask_email

        # Both should produce the same output
        test_emails = [
            "test@example.com",
            "a@b.c",
            "no-at",
            "",
        ]
        for email in test_emails:
            assert _mask_email(email) == mask_email(email), (
                f"_mask_email and mask_email disagree on {email!r}"
            )


# ── F1: Partner email PII masked in logs ─────────────────────────────────


class TestPartnerEmailMasking:
    """F1: _safe_send_partner_notification must NOT log plaintext emails."""

    def test_safe_send_does_not_log_plaintext_email(self) -> None:
        """The exception handler in _safe_send_partner_notification should mask the email."""
        source = inspect.getsource(
            __import__("app.routers.analysis", fromlist=["_safe_send_partner_notification"])._safe_send_partner_notification
        )
        # The source should NOT contain a bare format string with partner_email/to_email
        # It should use mask_email (from utils) to mask the address
        assert "mask_email" in source, (
            "_safe_send_partner_notification should use mask_email to mask emails in logs"
        )

    def test_analysis_router_imports_mask_email(self) -> None:
        """analysis.py should import mask_email from app.utils.masking."""
        import app.routers.analysis as analysis_mod

        assert hasattr(analysis_mod, "mask_email"), (
            "analysis.py should import mask_email from app.utils.masking"
        )


# ── F3: OAuth HTTP client cleanup on shutdown ────────────────────────────


class TestOAuthClientCleanup:
    """F3: _oauth_http_client must be closed during application shutdown."""

    def test_auth_exports_close_function(self) -> None:
        """auth.py should export an async cleanup function for the OAuth client."""
        import app.routers.auth as auth_mod

        assert hasattr(auth_mod, "close_oauth_client"), (
            "auth.py should export close_oauth_client() for shutdown cleanup"
        )
        assert callable(auth_mod.close_oauth_client)

    def test_main_lifespan_calls_close_oauth_client(self) -> None:
        """main.py lifespan should call close_oauth_client on shutdown."""
        source = inspect.getsource(
            __import__("app.main", fromlist=["lifespan"]).lifespan
        )
        assert "close_oauth_client" in source, (
            "main.py lifespan must call close_oauth_client on shutdown"
        )


# ── F7: Analytics uses dialect-agnostic upsert ───────────────────────────


class TestAnalyticsDialectAgnostic:
    """F7: Analytics should not sniff dialect via db.bind.dialect.name at query time."""

    def test_track_event_no_runtime_dialect_sniffing(self) -> None:
        """track_event should NOT use db.bind.dialect.name at runtime."""
        from app.routers.analytics import track_event

        source = inspect.getsource(track_event)
        assert "db.bind.dialect.name" not in source, (
            "track_event should not sniff dialect at runtime via db.bind.dialect.name"
        )

    @pytest.mark.asyncio
    async def test_track_event_still_works_after_refactor(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        """POST /analytics/track still upserts correctly after removing dialect sniffing."""
        # First call creates
        response = await client.post(
            "/analytics/track",
            json={"event_type": "page_view"},
        )
        assert response.status_code == 204

        # Second call increments
        response = await client.post(
            "/analytics/track",
            json={"event_type": "page_view"},
        )
        assert response.status_code == 204

        result = await db_session.execute(
            select(DailyEventCount).where(
                DailyEventCount.event_type == "page_view",
                DailyEventCount.event_date == datetime.datetime.now(UTC).date(),
            )
        )
        row = result.scalar_one()
        assert row.count == 2


# ── F10: Rate limit on analytics summary GET ─────────────────────────────


class TestAnalyticsSummaryRateLimit:
    """F10: GET /analytics/summary should have a rate limiter decorator."""

    def test_summary_has_rate_limit_decorator(self) -> None:
        """The get_summary source should reference a rate limit constant."""
        import app.routers.analytics as analytics_mod

        mod_source = inspect.getsource(analytics_mod)

        # The GET summary endpoint should have @limiter.limit() applied
        # We search the module source for the decorator pattern near get_summary
        assert "limiter.limit" in mod_source and "get_summary" in mod_source, (
            "GET /analytics/summary should have a @limiter.limit() decorator"
        )

    def test_rate_limit_constant_exists(self) -> None:
        """A LIMIT_ANALYTICS_SUMMARY constant should exist in rate_limiter module."""
        from app.middleware.rate_limiter import LIMIT_ANALYTICS_SUMMARY

        assert isinstance(LIMIT_ANALYTICS_SUMMARY, str)
        assert "/minute" in LIMIT_ANALYTICS_SUMMARY or "/hour" in LIMIT_ANALYTICS_SUMMARY


# ── F11: Analytics purge function ────────────────────────────────────────


class TestAnalyticsPurge:
    """F11: A purge_old_analytics function should be implemented."""

    def test_purge_function_exists(self) -> None:
        """purge_old_analytics should be importable from analytics router."""
        from app.routers.analytics import purge_old_analytics

        assert callable(purge_old_analytics)

    @pytest.mark.asyncio
    async def test_purge_deletes_old_records(
        self,
        db_session: AsyncSession,
    ) -> None:
        """purge_old_analytics deletes records older than retention_days."""
        from app.routers.analytics import purge_old_analytics

        today = datetime.datetime.now(UTC).date()
        old_date = today - datetime.timedelta(days=400)
        recent_date = today - datetime.timedelta(days=30)

        db_session.add(
            DailyEventCount(event_type="page_view", event_date=old_date, count=100)
        )
        db_session.add(
            DailyEventCount(event_type="page_view", event_date=recent_date, count=50)
        )
        await db_session.commit()

        deleted_count = await purge_old_analytics(db_session, retention_days=365)

        # The old record should be deleted
        assert deleted_count == 1

        # The recent record should remain
        result = await db_session.execute(select(DailyEventCount))
        remaining = result.scalars().all()
        assert len(remaining) == 1
        assert remaining[0].event_date == recent_date

    @pytest.mark.asyncio
    async def test_purge_no_records_to_delete(
        self,
        db_session: AsyncSession,
    ) -> None:
        """purge_old_analytics returns 0 when no records exceed retention."""
        from app.routers.analytics import purge_old_analytics

        today = datetime.datetime.now(UTC).date()
        db_session.add(
            DailyEventCount(event_type="page_view", event_date=today, count=5)
        )
        await db_session.commit()

        deleted_count = await purge_old_analytics(db_session, retention_days=365)
        assert deleted_count == 0

    def test_model_todo_removed(self) -> None:
        """The TODO comment about purge cron in the analytics model should be removed."""
        source = inspect.getsource(
            __import__("app.models.analytics", fromlist=["DailyEventCount"])
        )
        assert "TODO: implement purge cron" not in source, (
            "The TODO about purge cron should be removed now that purge is implemented"
        )

    @pytest.mark.asyncio
    async def test_purge_admin_endpoint(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        """POST /analytics/purge should delete old records and return count."""
        today = datetime.datetime.now(UTC).date()
        old_date = today - datetime.timedelta(days=400)

        db_session.add(
            DailyEventCount(event_type="page_view", event_date=old_date, count=100)
        )
        db_session.add(
            DailyEventCount(event_type="page_view", event_date=today, count=5)
        )
        await db_session.commit()

        response = await client.post(
            "/analytics/purge",
            headers=ANALYTICS_KEY_HEADER,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["deleted_count"] == 1
        assert data["retention_days"] == 365

    @pytest.mark.asyncio
    async def test_purge_endpoint_requires_analytics_key(
        self,
        client: AsyncClient,
    ) -> None:
        """POST /analytics/purge without analytics key should return 403."""
        response = await client.post("/analytics/purge")
        assert response.status_code == 403


# ── F12: mask_email IndexError on empty local part ────────────────────


class TestMaskEmailEmptyLocal:
    """F12: mask_email should handle '@domain.com' without IndexError."""

    def test_mask_email_empty_local_part(self) -> None:
        """mask_email('@domain.com') should return '***@domain.com', not raise IndexError."""
        from app.utils.masking import mask_email

        result = mask_email("@domain.com")
        assert result == "***@domain.com"

    def test_mask_email_empty_local_does_not_raise(self) -> None:
        """mask_email('@domain.com') must not raise any exception."""
        from app.utils.masking import mask_email

        # Should not raise
        try:
            mask_email("@domain.com")
        except IndexError:
            pytest.fail("mask_email('@domain.com') raised IndexError — empty local part not guarded")


# ── F13: Age gate test coverage gap ───────────────────────────────────


class TestAgeGateCoverage:
    """F13: User without date_of_birth should get 403 on POST /analysis/results."""

    @pytest.mark.asyncio
    async def test_save_result_without_dob_returns_403(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        """POST /analysis/results by a user with date_of_birth=None returns 403."""
        import uuid

        from app.models.user import User
        from app.services.auth_service import create_access_token, hash_password

        # Create a user WITHOUT date_of_birth (simulates OAuth-only signup)
        user = User(
            id=uuid.uuid4(),
            email="no-dob@example.com",
            password_hash=await hash_password("NoDobPass123"),
            name="No DOB User",
            tier="free",
            email_verified=True,
            date_of_birth=None,
        )
        db_session.add(user)
        await db_session.commit()

        # Create auth token for this user
        token = create_access_token(user.id)
        headers = {"Authorization": f"Bearer {token}"}

        # Attempt to save a result — should be blocked
        payload = {
            "label": "Test Analysis",
            "parent1_filename": "parent1.vcf",
            "parent2_filename": "parent2.vcf",
            "result_data": {
                "iv": "aabbccddeeff00112233aabb",
                "ciphertext": "deadbeefcafe1234567890abcdef0123456789abcdef",
                "salt": "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
                "kdf_params": {
                    "algorithm": "argon2id",
                    "memory_cost": 65536,
                    "time_cost": 3,
                    "parallelism": 1,
                    "salt_length": 32,
                    "key_length": 32,
                },
                "version": "v1:argon2id:aes-gcm",
            },
            "summary": {"trait_count": 1, "has_results": True},
            "consent_given": True,
            "password_reset_warning_acknowledged": True,
        }

        response = await client.post(
            "/analysis/results",
            headers=headers,
            json=payload,
        )
        assert response.status_code == 403
        data = response.json()
        assert data["detail"]["code"] == "AGE_VERIFICATION_REQUIRED"


# ── F2: Deletion token URL-encoded in email link ─────────────────────


class TestDeletionTokenUrlEncoded:
    """F2: send_deletion_confirmation_email must URL-encode the token."""

    @pytest.mark.asyncio
    async def test_deletion_email_url_encodes_token(self) -> None:
        """send_deletion_confirmation_email should URL-encode the token in the deletion URL."""
        from app.services.email_service import send_deletion_confirmation_email

        with patch("app.services.email_service._send", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            # Token with special chars that need encoding
            await send_deletion_confirmation_email("user@example.com", "abc+def/ghi=jkl&mn")
            mock_send.assert_awaited_once()
            html_body = mock_send.call_args[0][2]  # positional arg: html
            # The + should be encoded as %2B, / as %2F, = as %3D, & as %26
            assert "abc%2Bdef" in html_body
            assert "%2Fghi" in html_body
            assert "%3Djkl" in html_body
            assert "%26mn" in html_body

    @pytest.mark.asyncio
    async def test_deletion_email_url_encoding_consistent_with_others(self) -> None:
        """Deletion email should use the same quote(token, safe='') pattern as verification and reset."""
        source = inspect.getsource(
            __import__("app.services.email_service", fromlist=["send_deletion_confirmation_email"]).send_deletion_confirmation_email
        )
        assert "quote(token" in source, (
            "send_deletion_confirmation_email should use quote(token, safe='') like other email functions"
        )


# ── F4: Redundant stripe.api_key set per-call ────────────────────────


class TestStripeApiKeyNotPerCall:
    """F4: stripe.api_key should be set once, not per function call."""

    def test_stripe_api_key_not_in_create_checkout(self) -> None:
        """create_checkout_session should NOT set stripe.api_key per-call."""
        source = inspect.getsource(
            __import__("app.services.payment_service", fromlist=["create_checkout_session"]).create_checkout_session
        )
        assert "stripe.api_key" not in source, (
            "create_checkout_session should not set stripe.api_key — it should be set at module level"
        )

    def test_stripe_api_key_not_in_handle_webhook(self) -> None:
        """handle_webhook_event should NOT set stripe.api_key per-call."""
        source = inspect.getsource(
            __import__("app.services.payment_service", fromlist=["handle_webhook_event"]).handle_webhook_event
        )
        assert "stripe.api_key" not in source, (
            "handle_webhook_event should not set stripe.api_key — it should be set at module level"
        )

    def test_stripe_api_key_set_at_module_level(self) -> None:
        """payment_service module should set stripe.api_key at the module level."""
        import app.services.payment_service as ps_mod

        mod_source = inspect.getsource(ps_mod)
        # Check that stripe.api_key is set at the top level (outside function bodies)
        # It should appear in the module source but NOT inside function definitions
        assert "stripe.api_key" in mod_source, (
            "payment_service must set stripe.api_key somewhere (module level)"
        )


# ── F5: Redundant resend.api_key set per-call ────────────────────────


class TestResendApiKeyNotPerCall:
    """F5: resend.api_key should not be set in every email function call."""

    def test_resend_api_key_not_in_send_function(self) -> None:
        """_send should NOT set resend.api_key per-call — should use lazy init."""
        source = inspect.getsource(
            __import__("app.services.email_service", fromlist=["_send"])._send
        )
        assert "resend.api_key" not in source, (
            "_send should not set resend.api_key per-call — use lazy init or module-level setter"
        )

    def test_resend_api_key_initialized_somewhere(self) -> None:
        """email_service module should have a mechanism to set resend.api_key."""
        import app.services.email_service as es_mod

        mod_source = inspect.getsource(es_mod)
        assert "resend.api_key" in mod_source, (
            "email_service must set resend.api_key somewhere"
        )


# ── F6: Payment count uses SQL COUNT, not over-fetch ─────────────────


class TestPaymentCountQuery:
    """F6: get_tier_status should use SQL COUNT, not fetch all rows."""

    def test_get_succeeded_payment_count_exists(self) -> None:
        """payment_service should export get_succeeded_payment_count."""
        from app.services.payment_service import get_succeeded_payment_count

        assert callable(get_succeeded_payment_count)

    def test_get_succeeded_payment_count_uses_sql_count(self) -> None:
        """get_succeeded_payment_count should use func.count, not len()."""
        source = inspect.getsource(
            __import__("app.services.payment_service", fromlist=["get_succeeded_payment_count"]).get_succeeded_payment_count
        )
        assert "func.count" in source, (
            "get_succeeded_payment_count should use SQL COUNT (func.count), not fetch all rows"
        )
        assert "len(" not in source, (
            "get_succeeded_payment_count should not use len() — use SQL COUNT"
        )

    @pytest.mark.asyncio
    async def test_tier_status_endpoint_returns_correct_count(
        self,
        client: AsyncClient,
        test_user,
        auth_headers: dict[str, str],
        db_session: AsyncSession,
    ) -> None:
        """GET /payments/tier-status should reflect correct payments count from SQL COUNT."""
        from app.models.payment import Payment

        # Create 3 payments: 2 succeeded, 1 failed
        for i, status in enumerate(["succeeded", "succeeded", "failed"]):
            db_session.add(Payment(
                user_id=test_user.id,
                stripe_customer_id=f"cus_count_{i}",
                stripe_payment_intent=f"pi_count_{i}",
                amount=1499,
                currency="usd",
                status=status,
                tier_granted="premium",
            ))
        await db_session.commit()

        response = await client.get("/payments/tier-status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Only 2 succeeded payments should be counted
        assert data["payments_count"] == 2


# ── F9: _PRICE_MAP frozen at import time ─────────────────────────────


class TestPriceMapNotFrozenAtImport:
    """F9: _PRICE_MAP should not be a module-level dict frozen at import time."""

    def test_get_price_map_function_exists(self) -> None:
        """payment_service should have a _get_price_map function."""
        from app.services.payment_service import _get_price_map

        assert callable(_get_price_map)

    def test_no_module_level_price_map_dict(self) -> None:
        """_PRICE_MAP should NOT be a module-level dict assignment."""
        import app.services.payment_service as ps_mod

        mod_source = inspect.getsource(ps_mod)
        # The old pattern: _PRICE_MAP: dict[str, str] = { ... }
        # Should be replaced with a function
        # We check that _PRICE_MAP is not assigned as a module-level dict literal
        lines = mod_source.split("\n")
        for line in lines:
            stripped = line.strip()
            # Skip function definitions, comments, docstrings
            if stripped.startswith("def ") or stripped.startswith("#") or stripped.startswith('"""'):
                continue
            assert "_PRICE_MAP:" not in stripped or "dict" not in stripped, (
                f"_PRICE_MAP should not be a module-level dict: {stripped}"
            )

    def test_get_price_map_returns_expected_keys(self) -> None:
        """_get_price_map should return a dict with 'premium' and 'pro' keys."""
        from app.services.payment_service import _get_price_map

        price_map = _get_price_map()
        assert "premium" in price_map
        assert "pro" in price_map

    def test_get_price_map_reads_from_settings(self) -> None:
        """_get_price_map should read from settings (not a frozen dict)."""
        source = inspect.getsource(
            __import__("app.services.payment_service", fromlist=["_get_price_map"])._get_price_map
        )
        assert "settings" in source or "get_settings" in source, (
            "_get_price_map should read from settings dynamically"
        )
