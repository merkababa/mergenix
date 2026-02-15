"""
Shared cookie utilities — centralized cookie management.

Contains helpers for setting and clearing HTTP-only cookies,
shared across auth.py and gdpr.py routers.
"""

from __future__ import annotations

from fastapi import Request, Response

from app.config import get_settings

settings = get_settings()

# ── Cookie Configuration ─────────────────────────────────────────────────

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_MAX_AGE = 7 * 24 * 3600  # 7 days in seconds
REFRESH_COOKIE_PATH = "/auth"


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Set the refresh token as an httpOnly cookie on the response."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    """Delete the refresh token cookie from the response."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
    )


def get_refresh_cookie(request: Request) -> str | None:
    """Read the refresh token from the request cookies."""
    return request.cookies.get(REFRESH_COOKIE_NAME)
