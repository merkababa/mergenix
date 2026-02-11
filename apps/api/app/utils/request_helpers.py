"""Shared request-parsing helpers.

Provides ``client_ip`` and ``user_agent`` extraction used across
multiple routers (legal, auth, etc.) so the logic lives in one place.
"""

from __future__ import annotations

from fastapi import Request


def client_ip(request: Request) -> str:
    """Extract the client IP from the request.

    Uses ``request.client.host`` directly (the real TCP peer address).
    X-Forwarded-For is **not** parsed here because application code
    cannot reliably distinguish trusted proxies from spoofed headers.
    Trusted-proxy handling should be configured at the infrastructure
    level via uvicorn's ``ProxyHeadersMiddleware``.
    """
    return request.client.host if request.client else "unknown"


def user_agent(request: Request) -> str:
    """Extract the User-Agent header."""
    return request.headers.get("User-Agent", "")
