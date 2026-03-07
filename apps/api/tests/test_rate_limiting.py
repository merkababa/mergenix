"""
Integration tests for rate limiting.

Verifies that slowapi rate limiting is enforced correctly. Uses a
standalone mini-app with its own rate-limited endpoint to avoid
interference from conftest.py's limiter monkey-patching (which disables
rate limiting globally for all other test modules).

The tests exercise the *same* Limiter instance used by the real app,
confirming that storage_uri, reset(), and limit enforcement all work.
"""

from __future__ import annotations

import os

# ── Pre-import environment setup (mirrors conftest.py) ───────────────────
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-testing-only")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_fake")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test_fake")
os.environ.setdefault("STRIPE_PRICE_PREMIUM", "price_test_premium")
os.environ.setdefault("STRIPE_PRICE_PRO", "price_test_pro")
os.environ.setdefault("COOKIE_SECURE", "false")

from collections.abc import AsyncGenerator  # noqa: E402

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.middleware.rate_limit_headers import rate_limit_exceeded_handler  # noqa: E402
from app.middleware.rate_limiter import LIMIT_LOGIN, limiter  # noqa: E402
from fastapi import FastAPI, Request  # noqa: E402
from fastapi.responses import PlainTextResponse  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from slowapi.errors import RateLimitExceeded  # noqa: E402


def _create_rate_limit_test_app() -> FastAPI:
    """Build a minimal FastAPI app with rate limiting enabled.

    Uses the project's global ``limiter`` instance (same storage backend
    and configuration as the real app) but defines its own trivial
    endpoint so the test is not affected by conftest.py's decorator
    monkey-patching on the real router endpoints.
    """
    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # Use the real limiter's original .limit() method — conftest.py may
    # have replaced it with an identity lambda, but it stashes the real
    # one as _original_limit.
    _real_limit = getattr(limiter, "_original_limit", limiter.limit)

    @app.post("/test-login")
    @_real_limit(LIMIT_LOGIN)
    async def fake_login(request: Request) -> PlainTextResponse:
        """Minimal endpoint that mirrors the login rate limit."""
        return PlainTextResponse("ok")

    return app


@pytest_asyncio.fixture
async def rate_limited_client() -> AsyncGenerator[AsyncClient, None]:
    """Yield an HTTP client with rate limiting ENABLED on a mini test app.

    Ensures the limiter is enabled and its in-memory counters are reset
    before each test, then restores the disabled state afterwards so
    other test modules are not affected.

    Also clears slowapi's internal route registration dicts to prevent
    duplicate limit entries from accumulating across fixture invocations
    (each call to ``_create_rate_limit_test_app`` re-decorates a new
    ``fake_login`` function, appending to ``_route_limits``).
    """
    # Save original state
    original_headers_enabled = limiter._headers_enabled
    original_route_limits = dict(limiter._route_limits)
    original_marked = dict(limiter._Limiter__marked_for_limiting)

    # Enable the limiter for this test and clear accumulated registrations
    limiter.enabled = True
    limiter._headers_enabled = True
    limiter.reset()
    limiter._route_limits.clear()
    limiter._Limiter__marked_for_limiting.clear()

    app = _create_rate_limit_test_app()

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        yield client

    # Restore original state so other tests are unaffected
    limiter.enabled = False
    limiter._headers_enabled = original_headers_enabled
    limiter._route_limits.clear()
    limiter._route_limits.update(original_route_limits)
    limiter._Limiter__marked_for_limiting.clear()
    limiter._Limiter__marked_for_limiting.update(original_marked)


class TestRateLimiting:
    """Integration tests verifying rate limit enforcement."""

    @pytest.mark.asyncio
    async def test_returns_429_after_exceeding_rate_limit(
        self,
        rate_limited_client: AsyncClient,
    ) -> None:
        """Sending more requests than the limit allows returns HTTP 429.

        LIMIT_LOGIN is "5/minute". We send 5 allowed requests, then
        verify the 6th is rejected with 429 Too Many Requests.
        """
        assert LIMIT_LOGIN == "5/minute", f"Expected LIMIT_LOGIN='5/minute', got '{LIMIT_LOGIN}'"

        # First 5 requests should all succeed (200 OK)
        for i in range(5):
            resp = await rate_limited_client.post("/test-login")
            assert resp.status_code == 200, f"Request {i + 1}/5 failed unexpectedly: {resp.status_code}"

        # The 6th request exceeds the limit → 429
        resp = await rate_limited_client.post("/test-login")
        assert resp.status_code == 429, f"Expected HTTP 429 on request 6, got {resp.status_code}"

    @pytest.mark.asyncio
    async def test_rate_limit_response_body_contains_error(
        self,
        rate_limited_client: AsyncClient,
    ) -> None:
        """A 429 response body should describe the rate limit violation."""
        # Exhaust the limit
        for _ in range(5):
            await rate_limited_client.post("/test-login")

        resp = await rate_limited_client.post("/test-login")
        assert resp.status_code == 429

        # slowapi returns a JSON body with an "error" key describing the limit
        body = resp.json()
        assert "error" in body, f"429 response body should contain 'error', got: {body}"

    @pytest.mark.asyncio
    async def test_rate_limit_resets_after_limiter_reset(
        self,
        rate_limited_client: AsyncClient,
    ) -> None:
        """Calling limiter.reset() clears the in-memory counters."""
        # Exhaust the limit
        for _ in range(5):
            await rate_limited_client.post("/test-login")

        resp = await rate_limited_client.post("/test-login")
        assert resp.status_code == 429

        # Reset counters
        limiter.reset()

        # Should be allowed again
        resp = await rate_limited_client.post("/test-login")
        assert resp.status_code == 200, f"Expected 200 after reset, got {resp.status_code}"


class TestRateLimitHeaders:
    """Tests verifying standard rate limit response headers."""

    @pytest.mark.asyncio
    async def test_response_includes_x_ratelimit_limit_header(
        self,
        rate_limited_client: AsyncClient,
    ) -> None:
        """Every rate-limited response should include X-RateLimit-Limit."""
        resp = await rate_limited_client.post("/test-login")
        assert resp.status_code == 200

        assert "x-ratelimit-limit" in resp.headers, (
            f"Response should include X-RateLimit-Limit header. Headers: {dict(resp.headers)}"
        )
        # LIMIT_LOGIN is "5/minute", so the limit should be 5
        assert resp.headers["x-ratelimit-limit"] == "5", (
            f"Expected X-RateLimit-Limit=5, got {resp.headers['x-ratelimit-limit']}"
        )

    @pytest.mark.asyncio
    async def test_response_includes_x_ratelimit_remaining_header(
        self,
        rate_limited_client: AsyncClient,
    ) -> None:
        """Every rate-limited response should include X-RateLimit-Remaining."""
        resp = await rate_limited_client.post("/test-login")
        assert resp.status_code == 200

        assert "x-ratelimit-remaining" in resp.headers, (
            f"Response should include X-RateLimit-Remaining header. Headers: {dict(resp.headers)}"
        )
        # After 1 request out of 5, remaining should be 4
        remaining = int(resp.headers["x-ratelimit-remaining"])
        assert remaining == 4, f"Expected X-RateLimit-Remaining=4, got {remaining}"

    @pytest.mark.asyncio
    async def test_response_includes_x_ratelimit_reset_header(
        self,
        rate_limited_client: AsyncClient,
    ) -> None:
        """Every rate-limited response should include X-RateLimit-Reset."""
        resp = await rate_limited_client.post("/test-login")
        assert resp.status_code == 200

        assert "x-ratelimit-reset" in resp.headers, (
            f"Response should include X-RateLimit-Reset header. Headers: {dict(resp.headers)}"
        )
        # Reset is a UTC epoch timestamp (may be float or int)
        reset_value = float(resp.headers["x-ratelimit-reset"])
        assert reset_value > 0, f"Expected X-RateLimit-Reset > 0, got {reset_value}"

    @pytest.mark.asyncio
    async def test_remaining_decreases_with_multiple_requests(
        self,
        rate_limited_client: AsyncClient,
    ) -> None:
        """X-RateLimit-Remaining should decrease after each request."""
        # Send 3 requests and track remaining counts
        remaining_values = []
        for _ in range(3):
            resp = await rate_limited_client.post("/test-login")
            assert resp.status_code == 200
            remaining_values.append(int(resp.headers["x-ratelimit-remaining"]))

        # Remaining should be 4, 3, 2 (decreasing by 1 each time)
        assert remaining_values == [4, 3, 2], f"Expected remaining to decrease [4, 3, 2], got {remaining_values}"

    @pytest.mark.asyncio
    async def test_429_response_includes_retry_after_header(
        self,
        rate_limited_client: AsyncClient,
    ) -> None:
        """A 429 response should include a Retry-After header."""
        # Exhaust the limit
        for _ in range(5):
            await rate_limited_client.post("/test-login")

        resp = await rate_limited_client.post("/test-login")
        assert resp.status_code == 429

        assert "retry-after" in resp.headers, (
            f"429 response should include Retry-After header. Headers: {dict(resp.headers)}"
        )
        # Retry-After should be a positive integer (seconds until reset)
        retry_after = int(resp.headers["retry-after"])
        assert retry_after > 0, f"Expected Retry-After > 0, got {retry_after}"

    @pytest.mark.asyncio
    async def test_429_response_includes_all_rate_limit_headers(
        self,
        rate_limited_client: AsyncClient,
    ) -> None:
        """A 429 response should include all standard rate limit headers."""
        # Exhaust the limit
        for _ in range(5):
            await rate_limited_client.post("/test-login")

        resp = await rate_limited_client.post("/test-login")
        assert resp.status_code == 429

        required_headers = [
            "x-ratelimit-limit",
            "x-ratelimit-remaining",
            "x-ratelimit-reset",
            "retry-after",
        ]
        for header in required_headers:
            assert header in resp.headers, (
                f"429 response missing required header '{header}'. Headers: {dict(resp.headers)}"
            )

        # Remaining should be 0 when rate limited
        assert resp.headers["x-ratelimit-remaining"] == "0", (
            f"Expected X-RateLimit-Remaining=0 on 429, got {resp.headers['x-ratelimit-remaining']}"
        )


class TestRateLimitConfiguration:
    """Tests for the configurable rate_limit_storage_uri setting."""

    @pytest.mark.asyncio
    async def test_settings_has_rate_limit_storage_uri(self) -> None:
        """Settings class exposes rate_limit_storage_uri with a sensible default.

        Operators can override this via the RATE_LIMIT_STORAGE_URI env var
        to switch from in-memory to Redis or another limits backend.
        """
        get_settings.cache_clear()
        settings = get_settings()

        assert hasattr(settings, "rate_limit_storage_uri"), "Settings must have a 'rate_limit_storage_uri' field"
        assert settings.rate_limit_storage_uri == "memory://", (
            f"Expected default 'memory://', got '{settings.rate_limit_storage_uri}'"
        )

    @pytest.mark.asyncio
    async def test_storage_uri_is_overridable_via_env(self) -> None:
        """RATE_LIMIT_STORAGE_URI env var overrides the default."""
        get_settings.cache_clear()
        original = os.environ.get("RATE_LIMIT_STORAGE_URI")
        try:
            os.environ["RATE_LIMIT_STORAGE_URI"] = "redis://localhost:6379"
            get_settings.cache_clear()
            settings = get_settings()
            assert settings.rate_limit_storage_uri == "redis://localhost:6379"
        finally:
            # Restore original state
            if original is None:
                os.environ.pop("RATE_LIMIT_STORAGE_URI", None)
            else:
                os.environ["RATE_LIMIT_STORAGE_URI"] = original
            get_settings.cache_clear()
