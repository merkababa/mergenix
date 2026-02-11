"""
Health check endpoints.

/health   — basic liveness probe (always returns 200).
/health/db — verifies database connectivity.
"""

from __future__ import annotations

import sqlalchemy
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.database import DbSession
from app.schemas.common import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Basic liveness probe",
)
async def health() -> HealthResponse:
    """Return a simple health status indicating the API is running."""
    return HealthResponse(
        status="ok",
        database="unchecked",
        version="0.1.0",
    )


@router.get(
    "/health/db",
    response_model=HealthResponse,
    summary="Database connectivity check",
)
async def health_db(db: DbSession) -> JSONResponse:
    """Verify that the database is reachable and responding.

    Returns 200 if the database is connected, 503 if not.
    """
    try:
        await db.execute(sqlalchemy.text("SELECT 1"))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=HealthResponse(
                status="ok",
                database="connected",
                version="0.1.0",
            ).model_dump(),
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=HealthResponse(
                status="degraded",
                database="disconnected",
                version="0.1.0",
            ).model_dump(),
        )
