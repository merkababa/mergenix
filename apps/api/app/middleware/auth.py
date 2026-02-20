"""
Authentication middleware — FastAPI dependencies for extracting and
validating JWT tokens from incoming requests, plus CSRF protection.

Usage in routers:
    @router.get("/protected")
    async def protected(user: CurrentUser):
        ...

    @router.get("/admin-only")
    async def admin_only(user: AdminUser):
        ...
"""

from __future__ import annotations

import json as _json
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.types import ASGIApp, Receive, Scope, Send

from app.config import get_settings
from app.constants.tiers import TIER_RANK
from app.database import get_db
from app.models.user import User
from app.services.auth_service import decode_token
from app.utils.security import constant_time_compare

_bearer_scheme = HTTPBearer(auto_error=False)

settings = get_settings()

# TODO(future sprint): Exclude current session from invalidation to avoid
# logging out the user who just changed their password. Applies to
# reset_password and change_password in routers/auth.py where all sessions
# for the user are deleted.

# HTTP methods that change server state and require CSRF protection
_STATE_CHANGING_METHODS = frozenset({b"POST", b"PUT", b"DELETE", b"PATCH"})

# Path prefixes exempt from CSRF protection.
# Machine-to-machine endpoints authenticated by a shared secret do not use
# browser sessions or cookies, so the CSRF header requirement is irrelevant.
# External cron schedulers (Vercel Cron, GitHub Actions, cron.io) cannot
# inject browser-only headers such as X-Requested-With.
_CSRF_EXEMPT_PATH_PREFIXES: tuple[str, ...] = (
    "/api/v1/admin/cron/",
)

# Pre-encoded CSRF rejection response body
_CSRF_REJECTION_BODY = _json.dumps({
    "detail": {
        "error": (
            "Missing or invalid X-Requested-With header. "
            "State-changing requests must include "
            "X-Requested-With: XMLHttpRequest."
        ),
        "code": "CSRF_HEADER_MISSING",
    }
}).encode("utf-8")


class CSRFMiddleware:
    """Pure ASGI middleware that enforces CSRF protection via X-Requested-With.

    State-changing requests (POST, PUT, DELETE, PATCH) must include
    the ``X-Requested-With: XMLHttpRequest`` header. This works in
    tandem with SameSite=Lax cookies to prevent cross-site request
    forgery attacks.

    Safe methods (GET, HEAD, OPTIONS) are exempt because they should
    never cause side effects.

    Implemented as a pure ASGI middleware (not BaseHTTPMiddleware) to
    avoid the known issue where BaseHTTPMiddleware breaks
    asyncio.to_thread() in downstream handlers.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "").encode("utf-8") if isinstance(scope.get("method"), str) else scope.get("method", b"")

        if method in _STATE_CHANGING_METHODS:
            # Allow machine-to-machine endpoints to bypass CSRF validation.
            # These paths use shared-secret authentication instead of cookies,
            # so the browser-based CSRF threat model does not apply.
            path = scope.get("path", "")
            if any(path.startswith(prefix) for prefix in _CSRF_EXEMPT_PATH_PREFIXES):
                await self.app(scope, receive, send)
                return

            # Check for X-Requested-With header in the ASGI scope.
            # Compare case-insensitively — header values may arrive in
            # any casing depending on the client / proxy chain.
            headers = dict(scope.get("headers", []))
            xhr_value = headers.get(b"x-requested-with", b"").decode().lower()
            if xhr_value != "xmlhttprequest":
                # Reject with 403 — send the response directly
                await send({
                    "type": "http.response.start",
                    "status": 403,
                    "headers": [
                        [b"content-type", b"application/json"],
                        [b"content-length", str(len(_CSRF_REJECTION_BODY)).encode()],
                    ],
                })
                await send({
                    "type": "http.response.body",
                    "body": _CSRF_REJECTION_BODY,
                })
                return

        await self.app(scope, receive, send)


# TODO(future sprint): Cache user lookup or use JWT claims for read-only
# operations to reduce DB queries per request.
async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> User:
    """Extract and validate the JWT from the Authorization header.

    Returns the full User ORM instance for downstream handlers.

    Raises:
        HTTPException 401: If the token is missing, invalid, or expired.
        HTTPException 401: If the user no longer exists in the database.
        HTTPException 403: If the user's account is locked.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Authentication required.", "code": "AUTH_REQUIRED"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(credentials.credentials)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid or expired token.", "code": "TOKEN_INVALID"},
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid token type.", "code": "TOKEN_TYPE_INVALID"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Malformed token.", "code": "TOKEN_MALFORMED"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Malformed token.", "code": "TOKEN_MALFORMED"},
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "User not found.", "code": "USER_NOT_FOUND"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check account lockout
    if user.locked_until and user.locked_until > datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Account is temporarily locked.", "code": "ACCOUNT_LOCKED"},
        )

    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> User | None:
    """Like get_current_user but returns None instead of raising 401.

    Useful for endpoints that behave differently for authenticated
    vs. anonymous users.
    """
    if credentials is None:
        return None

    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        return None

    if payload.get("type") != "access":
        return None

    user_id_str = payload.get("sub")
    if not user_id_str:
        return None

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


def require_tier(minimum_tier: str):
    """Dependency factory that enforces a minimum pricing tier.

    Usage:
        @router.get("/pro-feature", dependencies=[Depends(require_tier("pro"))])
        async def pro_feature(): ...

    Args:
        minimum_tier: The lowest tier allowed ('free', 'premium', or 'pro').

    Returns:
        A FastAPI dependency function.
    """
    required_rank = TIER_RANK.get(minimum_tier, 0)

    async def _check(user: User = Depends(get_current_user)) -> User:  # noqa: B008
        user_rank = TIER_RANK.get(user.tier, 0)
        if user_rank < required_rank:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": f"This feature requires {minimum_tier} tier or higher.",
                    "code": "TIER_INSUFFICIENT",
                },
            )
        return user

    return _check


async def require_admin(
    request: Request,
    user: User = Depends(get_current_user),  # noqa: B008
) -> User:
    """Dependency that restricts access to admin users.

    Admin access is determined by a shared admin API key sent in
    the X-Admin-Key header (in addition to normal JWT auth).

    Raises:
        HTTPException 403: If the admin key is missing or invalid.
    """
    # TODO(future sprint): Replace static admin API key with RBAC (is_admin column)
    admin_key = request.headers.get("X-Admin-Key", "")
    if not settings.admin_api_key or not constant_time_compare(admin_key, settings.admin_api_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Admin access required.", "code": "ADMIN_REQUIRED"},
        )
    return user


# ── Type Aliases for Clean Route Signatures ───────────────────────────────

CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
AdminUser = Annotated[User, Depends(require_admin)]
