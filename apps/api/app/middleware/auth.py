"""
Authentication middleware — FastAPI dependencies for extracting and
validating JWT tokens from incoming requests.

Usage in routers:
    @router.get("/protected")
    async def protected(user: CurrentUser):
        ...

    @router.get("/admin-only")
    async def admin_only(user: AdminUser):
        ...
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.services.auth_service import decode_token
from app.utils.security import constant_time_compare

_bearer_scheme = HTTPBearer(auto_error=False)

settings = get_settings()

# Tier hierarchy for authorization comparisons
TIER_RANK = {"free": 0, "premium": 1, "pro": 2}


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
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
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
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
    """Dependency factory that enforces a minimum subscription tier.

    Usage:
        @router.get("/pro-feature", dependencies=[Depends(require_tier("pro"))])
        async def pro_feature(): ...

    Args:
        minimum_tier: The lowest tier allowed ('free', 'premium', or 'pro').

    Returns:
        A FastAPI dependency function.
    """
    required_rank = TIER_RANK.get(minimum_tier, 0)

    async def _check(user: User = Depends(get_current_user)) -> User:
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
    user: User = Depends(get_current_user),
) -> User:
    """Dependency that restricts access to admin users.

    Admin access is determined by a shared admin API key sent in
    the X-Admin-Key header (in addition to normal JWT auth).

    Raises:
        HTTPException 403: If the admin key is missing or invalid.
    """
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
