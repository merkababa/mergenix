"""
FastAPI application factory.

Creates and configures the Mergenix API application with middleware,
routers, exception handlers, structured logging, and Sentry integration.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import sentry_sdk
import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.database import engine
from app.middleware.rate_limiter import limiter
from app.routers import analysis, auth, clinvar, health, legal, payments


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


def _init_sentry(dsn: str) -> None:
    """Initialize Sentry error tracking if a DSN is configured."""
    if dsn:
        sentry_sdk.init(
            dsn=dsn,
            traces_sample_rate=0.1,
            profiles_sample_rate=0.1,
            environment=get_settings().environment,
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

    # Shutdown: dispose of the connection pool
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
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── CORS ──────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        max_age=86400,
    )

    # ── Routers ───────────────────────────────────────────────────────────
    app.include_router(health.router, tags=["Health"])
    app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
    app.include_router(payments.router, prefix="/payments", tags=["Payments"])
    app.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
    app.include_router(clinvar.router, prefix="/clinvar", tags=["ClinVar"])
    app.include_router(legal.router, prefix="/legal", tags=["Legal"])

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
