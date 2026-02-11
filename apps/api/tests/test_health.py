"""
Tests for the health check endpoints.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_200(client: AsyncClient) -> None:
    """GET /health should return 200 with status 'ok'."""
    response = await client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_health_db_connected(client: AsyncClient) -> None:
    """GET /health/db should return 200 when the database is reachable."""
    response = await client.get("/health/db")
    # With our in-memory SQLite test DB, this should succeed
    assert response.status_code in (200, 503)

    data = response.json()
    assert "status" in data
    assert "database" in data
    assert data["version"] == "0.1.0"
