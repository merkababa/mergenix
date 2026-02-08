"""
In-memory rate limiter for Mergenix authentication endpoints.

Thread-safe implementation using sliding window counters.
No external dependencies required.
"""

import threading
from collections import defaultdict
from datetime import datetime, timedelta


class RateLimiter:
    """In-memory rate limiter with per-key throttling."""

    def __init__(self, max_attempts: int = 10, window_seconds: int = 900):
        """
        Initialize the rate limiter.

        Args:
            max_attempts: Maximum number of attempts allowed within the window.
            window_seconds: Duration of the sliding window in seconds.
        """
        self.max_attempts = max_attempts
        self.window = timedelta(seconds=window_seconds)
        self._attempts: dict[str, list[datetime]] = defaultdict(list)
        self._lock = threading.Lock()

    def is_limited(self, key: str) -> bool:
        """
        Check if a key has exceeded the rate limit.

        Args:
            key: Identifier to check (e.g. email address, IP).

        Returns:
            True if the key is rate-limited, False otherwise.
        """
        now = datetime.now()
        with self._lock:
            # Prune expired entries
            self._attempts[key] = [
                t for t in self._attempts[key] if now - t < self.window
            ]
            return len(self._attempts[key]) >= self.max_attempts

    def record(self, key: str) -> None:
        """
        Record an attempt for a key.

        Args:
            key: Identifier to record (e.g. email address, IP).
        """
        with self._lock:
            self._attempts[key].append(datetime.now())

    def reset(self, key: str) -> None:
        """
        Reset all attempts for a key (e.g. after successful login).

        Args:
            key: Identifier to reset.
        """
        with self._lock:
            self._attempts[key] = []

    def get_remaining(self, key: str) -> int:
        """
        Get the number of remaining attempts before rate limiting kicks in.

        Args:
            key: Identifier to check.

        Returns:
            Number of remaining attempts (>= 0).
        """
        now = datetime.now()
        with self._lock:
            self._attempts[key] = [
                t for t in self._attempts[key] if now - t < self.window
            ]
            return max(0, self.max_attempts - len(self._attempts[key]))


# Pre-configured rate limiters for authentication endpoints
login_limiter = RateLimiter(max_attempts=10, window_seconds=900)  # 10 per 15 min
registration_limiter = RateLimiter(max_attempts=5, window_seconds=3600)  # 5 per hour
