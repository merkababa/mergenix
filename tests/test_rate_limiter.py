"""Tests for rate limiting and account enumeration prevention (T1.7)."""

import threading
import time

import pytest
from Source.auth.rate_limiter import RateLimiter, login_limiter, registration_limiter

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def limiter():
    """Create a RateLimiter with small limits for testing."""
    return RateLimiter(max_attempts=3, window_seconds=5)


@pytest.fixture()
def auth(tmp_path):
    """Create an AuthManager backed by a temporary database."""
    from Source.auth.manager import AuthManager

    db_path = str(tmp_path / "rate_test.db")
    mgr = AuthManager(db_path=db_path)
    yield mgr
    mgr.close()


# ---------------------------------------------------------------------------
# RateLimiter basic functionality
# ---------------------------------------------------------------------------


class TestRateLimiterBasic:
    """Tests for core RateLimiter methods."""

    def test_not_limited_initially(self, limiter):
        """A fresh key should not be rate-limited."""
        assert limiter.is_limited("test@example.com") is False

    def test_limited_after_max_attempts(self, limiter):
        """Key should be limited after reaching max_attempts."""
        for _ in range(3):
            limiter.record("test@example.com")
        assert limiter.is_limited("test@example.com") is True

    def test_not_limited_under_threshold(self, limiter):
        """Key should not be limited before reaching max_attempts."""
        for _ in range(2):
            limiter.record("test@example.com")
        assert limiter.is_limited("test@example.com") is False

    def test_reset_clears_attempts(self, limiter):
        """reset() should clear all attempts for a key."""
        for _ in range(3):
            limiter.record("test@example.com")
        assert limiter.is_limited("test@example.com") is True
        limiter.reset("test@example.com")
        assert limiter.is_limited("test@example.com") is False

    def test_get_remaining_full(self, limiter):
        """get_remaining should return max_attempts when no attempts recorded."""
        assert limiter.get_remaining("test@example.com") == 3

    def test_get_remaining_partial(self, limiter):
        """get_remaining should decrease as attempts are recorded."""
        limiter.record("test@example.com")
        assert limiter.get_remaining("test@example.com") == 2

    def test_get_remaining_zero(self, limiter):
        """get_remaining should return 0 when at or past the limit."""
        for _ in range(5):
            limiter.record("test@example.com")
        assert limiter.get_remaining("test@example.com") == 0

    def test_different_keys_independent(self, limiter):
        """Different keys should have independent counters."""
        for _ in range(3):
            limiter.record("alice@example.com")
        assert limiter.is_limited("alice@example.com") is True
        assert limiter.is_limited("bob@example.com") is False


# ---------------------------------------------------------------------------
# Window expiry
# ---------------------------------------------------------------------------


class TestRateLimiterExpiry:
    """Tests for sliding window expiry."""

    def test_attempts_expire_after_window(self):
        """Attempts should expire after the window duration."""
        limiter = RateLimiter(max_attempts=2, window_seconds=1)
        limiter.record("test@example.com")
        limiter.record("test@example.com")
        assert limiter.is_limited("test@example.com") is True

        # Wait for window to expire
        time.sleep(1.1)
        assert limiter.is_limited("test@example.com") is False

    def test_get_remaining_recovers_after_expiry(self):
        """get_remaining should recover after attempts expire."""
        limiter = RateLimiter(max_attempts=2, window_seconds=1)
        limiter.record("test@example.com")
        limiter.record("test@example.com")
        assert limiter.get_remaining("test@example.com") == 0

        time.sleep(1.1)
        assert limiter.get_remaining("test@example.com") == 2


# ---------------------------------------------------------------------------
# Thread safety
# ---------------------------------------------------------------------------


class TestRateLimiterThreadSafety:
    """Tests for thread-safe concurrent access."""

    def test_concurrent_records(self):
        """Multiple threads recording simultaneously should not corrupt state."""
        limiter = RateLimiter(max_attempts=100, window_seconds=60)
        errors = []

        def record_many(key, count):
            try:
                for _ in range(count):
                    limiter.record(key)
            except Exception as exc:
                errors.append(exc)

        threads = [
            threading.Thread(target=record_many, args=("shared@test.com", 20))
            for _ in range(5)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        # 5 threads * 20 records each = 100 total
        assert limiter.get_remaining("shared@test.com") == 0

    def test_concurrent_is_limited_checks(self):
        """Multiple threads checking is_limited should not raise errors."""
        limiter = RateLimiter(max_attempts=5, window_seconds=60)
        for _ in range(5):
            limiter.record("check@test.com")

        errors = []
        results = []

        def check_limited():
            try:
                result = limiter.is_limited("check@test.com")
                results.append(result)
            except Exception as exc:
                errors.append(exc)

        threads = [threading.Thread(target=check_limited) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        assert all(r is True for r in results)


# ---------------------------------------------------------------------------
# Pre-configured limiters
# ---------------------------------------------------------------------------


class TestPreConfiguredLimiters:
    """Tests for the module-level pre-configured limiters."""

    def test_login_limiter_config(self):
        """login_limiter should allow 10 attempts per 15 minutes."""
        assert login_limiter.max_attempts == 10
        assert login_limiter.window.total_seconds() == 900

    def test_registration_limiter_config(self):
        """registration_limiter should allow 5 attempts per hour."""
        assert registration_limiter.max_attempts == 5
        assert registration_limiter.window.total_seconds() == 3600


# ---------------------------------------------------------------------------
# Account enumeration prevention
# ---------------------------------------------------------------------------


class TestAccountEnumerationPrevention:
    """Tests for account enumeration prevention measures."""

    def test_constant_time_bcrypt_for_nonexistent_user(self, auth):
        """authenticate() for non-existent user should take similar time as existing user."""
        # Register a real user
        auth.register_user("real@test.com", "Real User", "Password1")

        # Reset rate limiters to avoid interference
        login_limiter.reset("real@test.com")
        login_limiter.reset("ghost@test.com")

        # Time authentication with wrong password for existing user
        start = time.perf_counter()
        auth.authenticate("real@test.com", "WrongPass1")
        real_time = time.perf_counter() - start

        login_limiter.reset("real@test.com")
        login_limiter.reset("ghost@test.com")

        # Time authentication for non-existent user
        start = time.perf_counter()
        auth.authenticate("ghost@test.com", "WrongPass1")
        ghost_time = time.perf_counter() - start

        # The timing difference should be less than 50ms
        # Both should involve a bcrypt operation
        diff = abs(real_time - ghost_time)
        assert diff < 0.15, (  # 150ms tolerance for CI environments
            f"Timing difference {diff:.3f}s is too large — "
            f"possible timing side-channel (real={real_time:.3f}s, ghost={ghost_time:.3f}s)"
        )

    def test_generic_registration_error_for_duplicate(self, auth):
        """Registration with existing email should NOT reveal 'already registered'."""
        auth.register_user("exist@test.com", "Existing", "Password1")
        # Reset registration limiter to avoid rate limiting
        registration_limiter.reset("exist@test.com")
        success, msg = auth.register_user("exist@test.com", "Another", "Password1")
        assert success is False
        # Should NOT contain the old specific message
        assert "already registered" not in msg.lower()
        # Should be the generic message
        assert "unable to create account" in msg.lower()

    def test_dummy_hash_is_class_attribute(self):
        """_DUMMY_HASH should be a class-level attribute on AuthManager."""
        from Source.auth.manager import AuthManager

        assert hasattr(AuthManager, "_DUMMY_HASH")
        assert isinstance(AuthManager._DUMMY_HASH, str)
        assert AuthManager._DUMMY_HASH.startswith("$2b$")


# ---------------------------------------------------------------------------
# Rate limiting integration with authenticate()
# ---------------------------------------------------------------------------


class TestAuthenticateRateLimiting:
    """Tests for rate limiting integration in authenticate()."""

    def test_authenticate_blocked_after_limit(self, auth):
        """authenticate() should return False when rate-limited."""
        auth.register_user("limited@test.com", "Limited", "Password1")
        login_limiter.reset("limited@test.com")

        # Exhaust rate limit (10 attempts)
        for _ in range(10):
            login_limiter.record("limited@test.com")

        # Should be rate limited now
        success, data, _status = auth.authenticate("limited@test.com", "Password1")
        assert success is False
        assert data is None

    def test_authenticate_resets_on_success(self, auth):
        """Successful authentication should reset the rate limiter."""
        auth.register_user("reset@test.com", "Reset", "Password1")
        login_limiter.reset("reset@test.com")

        # Record some failed attempts
        for _ in range(5):
            login_limiter.record("reset@test.com")

        # Successful auth should reset the limiter
        success, data, _status = auth.authenticate("reset@test.com", "Password1")
        assert success is True

        # Rate limiter should be reset
        assert login_limiter.get_remaining("reset@test.com") == 10

    def test_failed_auth_increments_rate_limiter(self, auth):
        """Failed authentication should record an attempt in the rate limiter."""
        auth.register_user("inc@test.com", "Inc", "Password1")
        login_limiter.reset("inc@test.com")

        initial = login_limiter.get_remaining("inc@test.com")
        auth.authenticate("inc@test.com", "WrongPass1")
        after = login_limiter.get_remaining("inc@test.com")
        assert after == initial - 1


# ---------------------------------------------------------------------------
# Rate limiting integration with register_user()
# ---------------------------------------------------------------------------


class TestRegisterRateLimiting:
    """Tests for rate limiting integration in register_user()."""

    def test_register_blocked_after_limit(self, auth):
        """register_user() should return rate limit message after limit."""
        registration_limiter.reset("spam@test.com")

        # Exhaust rate limit (5 attempts)
        for _ in range(5):
            registration_limiter.record("spam@test.com")

        success, msg = auth.register_user("spam@test.com", "Spammer", "Password1")
        assert success is False
        assert "too many" in msg.lower()

    def test_register_records_attempt(self, auth):
        """Each registration attempt should be recorded in the rate limiter."""
        registration_limiter.reset("count@test.com")

        initial = registration_limiter.get_remaining("count@test.com")
        auth.register_user("count@test.com", "Counter", "Password1")
        after = registration_limiter.get_remaining("count@test.com")
        assert after == initial - 1
