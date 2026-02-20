"""
FastAPI application factory.

Creates and configures the Mergenix API application with middleware,
routers, exception handlers, structured logging, and Sentry integration.
"""

from __future__ import annotations

import logging
import re
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import sentry_sdk
import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.database import engine
from app.middleware.auth import CSRFMiddleware
from app.middleware.rate_limit_headers import rate_limit_exceeded_handler
from app.middleware.rate_limiter import limiter
from app.routers import admin, analysis, analytics, auth, clinvar, gdpr, health, legal, payments
from app.routers.auth import close_oauth_client


def _configure_structlog() -> None:
    """Configure structlog for structured JSON logging."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


# Compiled regex patterns for PII scrubbing (compiled once at module level)
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_TOKEN_RE = re.compile(r"eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+")
_PASSWORD_RE = re.compile(r'password["\s:=]+["\']?[^"\'\s,}{]+', re.IGNORECASE)


def _scrub_pii(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any]:
    """Strip PII (emails, tokens, passwords) from Sentry events.

    Used as the ``before_send`` callback so that stack traces and
    breadcrumbs never leak sensitive user data to Sentry.
    """

    def _scrub_string(s: str) -> str:
        s = _TOKEN_RE.sub("[TOKEN]", s)
        s = _EMAIL_RE.sub("[EMAIL]", s)
        s = _PASSWORD_RE.sub("password=[REDACTED]", s)
        return s

    # Scrub exception values
    if "exception" in event:
        for exc_info in event["exception"].get("values", []):
            if "value" in exc_info and isinstance(exc_info["value"], str):
                exc_info["value"] = _scrub_string(exc_info["value"])

    # Scrub breadcrumb messages
    if "breadcrumbs" in event:
        for breadcrumb in event["breadcrumbs"].get("values", []):
            if "message" in breadcrumb and isinstance(breadcrumb["message"], str):
                breadcrumb["message"] = _scrub_string(breadcrumb["message"])

    # Scrub top-level message if present
    if "message" in event and isinstance(event["message"], str):
        event["message"] = _scrub_string(event["message"])

    return event


def _init_sentry(dsn: str) -> None:
    """Initialize Sentry error tracking if a DSN is configured."""
    if dsn:
        sentry_sdk.init(
            dsn=dsn,
            traces_sample_rate=0.1,
            profiles_sample_rate=0.1,
            environment=get_settings().environment,
            before_send=_scrub_pii,
        )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler — startup and shutdown logic."""
    log = structlog.get_logger()
    log.info("mergenix_api_starting", version="0.1.0")

    # Startup: connection pool is created lazily by SQLAlchemy,
    # but we verify connectivity here.
    try:
        async with engine.begin() as conn:
            await conn.execute(
                __import__("sqlalchemy").text("SELECT 1")
            )
        log.info("database_connection_verified")
    except Exception:
        log.error("database_connection_failed")
        # Allow app to start even if DB is temporarily unavailable —
        # the health check endpoint will report the issue.

    yield

    # Shutdown: close the OAuth HTTP client and dispose of the connection pool
    await close_oauth_client()
    await engine.dispose()
    log.info("mergenix_api_shutdown")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    This is the application factory used by uvicorn:
        uvicorn app.main:create_app --factory

    Returns:
        Fully configured FastAPI application instance.
    """
    settings = get_settings()

    # Logging & monitoring
    _configure_structlog()
    _init_sentry(settings.sentry_dsn)

    app = FastAPI(
        title="Mergenix API",
        version="0.1.0",
        description=(
            "Backend API for Mergenix — a genetic offspring analysis platform. "
            "Provides authentication, payment processing, ClinVar data synchronization, "
            "and genetic analysis endpoints."
        ),
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    # ── Rate Limiting ─────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # ── CSRF Protection ──────────────────────────────────────────────────
    # Requires X-Requested-With: XMLHttpRequest on state-changing methods
    # (POST, PUT, DELETE, PATCH). Works with SameSite=Lax cookies to
    # prevent cross-site request forgery.
    app.add_middleware(CSRFMiddleware)

    # ── CORS ──────────────────────────────────────────────────────────────
    # Added AFTER CSRF so that CORS is the outermost middleware (Starlette
    # processes last-added middleware first). This ensures CORS headers are
    # present on ALL responses, including CSRF 403 rejections — preventing
    # confusing opaque errors for cross-origin clients.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
        max_age=86400,
    )

    # ── Routers ───────────────────────────────────────────────────────────
    app.include_router(health.router, tags=["Health"])
    app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
    app.include_router(payments.router, prefix="/payments", tags=["Payments"])
    app.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
    app.include_router(clinvar.router, prefix="/clinvar", tags=["ClinVar"])
    app.include_router(legal.router, prefix="/legal", tags=["Legal"])
    app.include_router(gdpr.router, prefix="/gdpr", tags=["GDPR"])
    app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
    app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])

    # ── Exception Handlers ────────────────────────────────────────────────
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        """Return 422 for validation errors not caught by Pydantic."""
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body(str(exc), "VALIDATION_ERROR"),
        )

    @app.exception_handler(PermissionError)
    async def permission_error_handler(request: Request, exc: PermissionError) -> JSONResponse:
        """Return 403 for authorization failures."""
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=_error_body(str(exc), "FORBIDDEN"),
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        """Catch-all for unhandled errors — log and return 500."""
        log = structlog.get_logger()
        log.error("unhandled_exception", exc_info=exc, path=request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body(
                "An unexpected error occurred. Please try again later.",
                "INTERNAL_ERROR",
            ),
        )

    return app


def _error_body(message: str, code: str, details: Any = None) -> dict[str, Any]:
    """Build a consistent error response body."""
    body: dict[str, Any] = {"error": message, "code": code}
    if details is not None:
        body["details"] = details
    return body
