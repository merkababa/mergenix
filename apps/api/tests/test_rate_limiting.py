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
from app.middleware.rate_limiter import LIMIT_LOGIN, limiter  # noqa: E402
from fastapi import FastAPI, Request  # noqa: E402
from fastapi.responses import PlainTextResponse  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from slowapi import _rate_limit_exceeded_handler  # noqa: E402
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
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
    """
    # Enable the limiter for this test
    limiter.enabled = True
    limiter.reset()

    app = _create_rate_limit_test_app()

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        yield client

    # Restore disabled state so other tests are unaffected
    limiter.enabled = False


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
        assert LIMIT_LOGIN == "5/minute", (
            f"Expected LIMIT_LOGIN='5/minute', got '{LIMIT_LOGIN}'"
        )

        # First 5 requests should all succeed (200 OK)
        for i in range(5):
            resp = await rate_limited_client.post("/test-login")
            assert resp.status_code == 200, (
                f"Request {i + 1}/5 failed unexpectedly: {resp.status_code}"
            )

        # The 6th request exceeds the limit → 429
        resp = await rate_limited_client.post("/test-login")
        assert resp.status_code == 429, (
            f"Expected HTTP 429 on request 6, got {resp.status_code}"
        )

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
        assert "error" in body, (
            f"429 response body should contain 'error', got: {body}"
        )

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
        assert resp.status_code == 200, (
            f"Expected 200 after reset, got {resp.status_code}"
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

        assert hasattr(settings, "rate_limit_storage_uri"), (
            "Settings must have a 'rate_limit_storage_uri' field"
        )
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
