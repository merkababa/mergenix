"""
Tests for the health check endpoints.

Verifies that /health (liveness probe) and /health/db (database connectivity)
return the expected responses and structure, including the 503 degraded path.
"""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient


class TestHealthEndpoint:
    """Tests for the basic /health liveness probe."""

    @pytest.mark.asyncio
    async def test_health_returns_200(self, client: AsyncClient) -> None:
        """GET /health should return HTTP 200."""
        response = await client.get("/health")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_returns_status_ok(self, client: AsyncClient) -> None:
        """GET /health should return {"status": "ok", ...}."""
        response = await client.get("/health")
        data = response.json()
        assert data["status"] == "ok"

    @pytest.mark.asyncio
    async def test_health_includes_version(self, client: AsyncClient) -> None:
        """GET /health should include a version string."""
        response = await client.get("/health")
        data = response.json()
        assert "version" in data, f"Health response should include 'version'. Got: {data}"
        assert isinstance(data["version"], str)
        assert len(data["version"]) > 0, "Version should be a non-empty string"

    @pytest.mark.asyncio
    async def test_health_response_structure(self, client: AsyncClient) -> None:
        """GET /health should return all expected fields."""
        response = await client.get("/health")
        data = response.json()

        required_fields = ["status", "database", "version"]
        for field in required_fields:
            assert field in data, f"Health response missing required field '{field}'. Got: {data}"


class TestHealthDbEndpoint:
    """Tests for the /health/db database connectivity check."""

    @pytest.mark.asyncio
    async def test_health_db_returns_200_when_db_accessible(
        self,
        client: AsyncClient,
    ) -> None:
        """GET /health/db should return 200 when the database is reachable."""
        response = await client.get("/health/db")
        # With our in-memory SQLite test DB, this should succeed
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_db_reports_connected(
        self,
        client: AsyncClient,
    ) -> None:
        """GET /health/db should report database as 'connected'."""
        response = await client.get("/health/db")
        data = response.json()
        assert data["database"] == "connected"

    @pytest.mark.asyncio
    async def test_health_db_includes_version(
        self,
        client: AsyncClient,
    ) -> None:
        """GET /health/db should include the same version as /health."""
        response = await client.get("/health/db")
        data = response.json()
        assert "version" in data
        assert isinstance(data["version"], str)
        assert len(data["version"]) > 0

    @pytest.mark.asyncio
    async def test_health_db_response_structure(
        self,
        client: AsyncClient,
    ) -> None:
        """GET /health/db should return all expected fields."""
        response = await client.get("/health/db")
        data = response.json()

        required_fields = ["status", "database", "version"]
        for field in required_fields:
            assert field in data, f"Health/db response missing required field '{field}'. Got: {data}"

    @pytest.mark.asyncio
    async def test_health_db_returns_503_when_db_unreachable(
        self,
        client: AsyncClient,
    ) -> None:
        """GET /health/db should return 503 with degraded status when DB is down."""
        # Mock the DB session's execute method to raise an exception,
        # simulating a database connectivity failure.
        mock_session = AsyncMock()
        mock_session.execute.side_effect = Exception("Connection refused")

        async def _broken_db():
            yield mock_session

        from app.database import get_db

        # Re-override get_db to yield the broken session
        client._transport.app.dependency_overrides[get_db] = _broken_db  # type: ignore[union-attr]

        response = await client.get("/health/db")
        assert response.status_code == 503

        data = response.json()
        assert data["status"] == "degraded"
        assert data["database"] == "disconnected"
        assert "version" in data
