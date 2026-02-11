"""
Common schemas shared across multiple endpoint groups.
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorResponse(BaseModel):
    """Standard error response body returned by all error handlers."""

    error: str = Field(..., description="Human-readable error message")
    code: str = Field(..., description="Machine-readable error code")
    details: Any = Field(None, description="Optional additional context")


class HealthResponse(BaseModel):
    """Response from the /health endpoint."""

    status: str = Field(..., description="overall | degraded")
    database: str = Field(..., description="connected | disconnected")
    version: str


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""

    items: list[T]  # type: ignore[valid-type]
    total: int
    page: int
    per_page: int
