"""
Tests for the ClinVar synchronization router.

Covers all three admin-only endpoints:
  POST /clinvar/check  — freshness check
  POST /clinvar/sync   — trigger sync (stub)
  GET  /clinvar/status — last sync metadata

All endpoints require JWT authentication + X-Admin-Key header.
Tests verify:
  - Correct status codes with valid admin credentials
  - 401 when no JWT is provided
  - 403 when JWT is valid but X-Admin-Key is missing or wrong
  - 404 on /status when no sync has been performed
  - Response payload structure for success paths
  - Behaviour with and without the sync metadata file present
"""

from __future__ import annotations

import json
import os
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient

# The conftest already sets env vars and patches the DB engine before any
# app modules are imported — we only need to ensure ADMIN_API_KEY is set
# so that the require_admin dependency can be satisfied in tests.
_TEST_ADMIN_KEY = "test-admin-key-for-clinvar-tests"
os.environ.setdefault("ADMIN_API_KEY", _TEST_ADMIN_KEY)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _admin_headers(token: str, admin_key: str = _TEST_ADMIN_KEY) -> dict[str, str]:
    """Build request headers with both JWT and admin key."""
    return {
        "Authorization": f"Bearer {token}",
        "X-Admin-Key": admin_key,
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def admin_token(test_user) -> str:
    """Return a valid access token for test_user (used as the admin JWT)."""
    from app.services.auth_service import create_access_token

    return create_access_token(test_user.id)


@pytest_asyncio.fixture
async def patched_admin_key():
    """Patch app.middleware.auth.settings so admin_api_key matches the test key.

    The settings object is created at module-import time, so we cannot rely on
    environment variables set after import.  We patch the already-loaded
    settings instance directly.
    """
    import app.middleware.auth as _auth_module

    original = _auth_module.settings.admin_api_key
    _auth_module.settings.admin_api_key = _TEST_ADMIN_KEY
    yield _TEST_ADMIN_KEY
    _auth_module.settings.admin_api_key = original


# ---------------------------------------------------------------------------
# POST /clinvar/check
# ---------------------------------------------------------------------------

class TestClinvarCheck:
    """Tests for POST /clinvar/check."""

    @pytest.mark.asyncio
    async def test_check_returns_200_with_valid_admin_auth(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/check returns 200 for a valid admin user."""
        response = await client.post(
            "/clinvar/check",
            headers=_admin_headers(admin_token),
        )
        assert response.status_code == 200, response.text

    @pytest.mark.asyncio
    async def test_check_returns_freshness_fields(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/check response includes all expected freshness fields."""
        response = await client.post(
            "/clinvar/check",
            headers=_admin_headers(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        expected_keys = {"last_sync", "days_since_sync", "is_stale", "stale_threshold_days", "clinvar_ftp_url"}
        for key in expected_keys:
            assert key in data, f"Missing key '{key}' in response: {data}"

    @pytest.mark.asyncio
    async def test_check_is_stale_when_no_sync_file(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/check reports stale=True and days_since_sync=-1 when no metadata file exists."""
        # anyio.Path.exists() is mocked to return False — no sync file present
        with patch("anyio.Path.exists", new_callable=AsyncMock, return_value=False):
            response = await client.post(
                "/clinvar/check",
                headers=_admin_headers(admin_token),
            )
        assert response.status_code == 200
        data = response.json()
        assert data["is_stale"] is True
        assert data["days_since_sync"] == -1
        assert data["last_sync"] is None

    @pytest.mark.asyncio
    async def test_check_not_stale_when_recent_sync(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/check reports is_stale=False when sync is within 30 days."""
        from datetime import UTC, datetime, timedelta

        recent_sync = (datetime.now(UTC) - timedelta(days=5)).isoformat()
        sync_meta = json.dumps({"last_sync": recent_sync})

        with (
            patch("anyio.Path.exists", new_callable=AsyncMock, return_value=True),
            patch("anyio.Path.read_text", new_callable=AsyncMock, return_value=sync_meta),
        ):
            response = await client.post(
                "/clinvar/check",
                headers=_admin_headers(admin_token),
            )
        assert response.status_code == 200
        data = response.json()
        assert data["is_stale"] is False
        assert data["last_sync"] == recent_sync

    @pytest.mark.asyncio
    async def test_check_is_stale_when_sync_older_than_30_days(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/check reports is_stale=True when sync is older than 30 days."""
        from datetime import UTC, datetime, timedelta

        old_sync = (datetime.now(UTC) - timedelta(days=45)).isoformat()
        sync_meta = json.dumps({"last_sync": old_sync})

        with (
            patch("anyio.Path.exists", new_callable=AsyncMock, return_value=True),
            patch("anyio.Path.read_text", new_callable=AsyncMock, return_value=sync_meta),
        ):
            response = await client.post(
                "/clinvar/check",
                headers=_admin_headers(admin_token),
            )
        assert response.status_code == 200
        data = response.json()
        assert data["is_stale"] is True
        assert data["days_since_sync"] >= 30

    @pytest.mark.asyncio
    async def test_check_returns_stale_threshold_of_30(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/check always returns stale_threshold_days=30."""
        response = await client.post(
            "/clinvar/check",
            headers=_admin_headers(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["stale_threshold_days"] == 30

    @pytest.mark.asyncio
    async def test_check_requires_jwt(
        self,
        client: AsyncClient,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/check returns 401 when no JWT is provided."""
        response = await client.post(
            "/clinvar/check",
            headers={"X-Admin-Key": _TEST_ADMIN_KEY},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_check_requires_admin_key(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/check returns 403 when X-Admin-Key is absent."""
        response = await client.post(
            "/clinvar/check",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_check_rejects_wrong_admin_key(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/check returns 403 when X-Admin-Key is incorrect."""
        response = await client.post(
            "/clinvar/check",
            headers=_admin_headers(admin_token, admin_key="wrong-key"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# POST /clinvar/sync
# ---------------------------------------------------------------------------

class TestClinvarSync:
    """Tests for POST /clinvar/sync."""

    @pytest.mark.asyncio
    async def test_sync_returns_200_with_valid_admin_auth(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/sync returns 200 for a valid admin user."""
        response = await client.post(
            "/clinvar/sync",
            headers=_admin_headers(admin_token),
        )
        assert response.status_code == 200, response.text

    @pytest.mark.asyncio
    async def test_sync_returns_message_response(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/sync response contains a 'message' field."""
        response = await client.post(
            "/clinvar/sync",
            headers=_admin_headers(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data, f"Expected 'message' key in response: {data}"
        assert isinstance(data["message"], str)
        assert len(data["message"]) > 0

    @pytest.mark.asyncio
    async def test_sync_message_mentions_queue(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/sync message acknowledges the queued/stub status."""
        response = await client.post(
            "/clinvar/sync",
            headers=_admin_headers(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        # The stub implementation mentions queueing or Phase 1
        message_lower = data["message"].lower()
        assert "sync" in message_lower or "queue" in message_lower, (
            f"Expected sync acknowledgment in message: {data['message']}"
        )

    @pytest.mark.asyncio
    async def test_sync_requires_jwt(
        self,
        client: AsyncClient,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/sync returns 401 when no JWT is provided."""
        response = await client.post(
            "/clinvar/sync",
            headers={"X-Admin-Key": _TEST_ADMIN_KEY},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sync_requires_admin_key(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/sync returns 403 when X-Admin-Key is absent."""
        response = await client.post(
            "/clinvar/sync",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_sync_rejects_wrong_admin_key(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """POST /clinvar/sync returns 403 when X-Admin-Key is incorrect."""
        response = await client.post(
            "/clinvar/sync",
            headers=_admin_headers(admin_token, admin_key="wrong-key"),
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# GET /clinvar/status
# ---------------------------------------------------------------------------

class TestClinvarStatus:
    """Tests for GET /clinvar/status."""

    @pytest.mark.asyncio
    async def test_status_returns_404_when_no_sync_file(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """GET /clinvar/status returns 404 when no sync has been performed."""
        with patch("anyio.Path.exists", new_callable=AsyncMock, return_value=False):
            response = await client.get(
                "/clinvar/status",
                headers=_admin_headers(admin_token),
            )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_status_404_error_body_has_correct_code(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """GET /clinvar/status 404 response body includes NO_SYNC_DATA error code."""
        with patch("anyio.Path.exists", new_callable=AsyncMock, return_value=False):
            response = await client.get(
                "/clinvar/status",
                headers=_admin_headers(admin_token),
            )
        assert response.status_code == 404
        detail = response.json()["detail"]
        assert detail["code"] == "NO_SYNC_DATA"

    @pytest.mark.asyncio
    async def test_status_returns_200_when_sync_file_exists(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """GET /clinvar/status returns 200 when a sync metadata file is present."""
        sync_meta = json.dumps({
            "last_sync": "2026-02-01T00:00:00+00:00",
            "source_url": "https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz",
            "file_size_bytes": 123456789,
        })

        with (
            patch("anyio.Path.exists", new_callable=AsyncMock, return_value=True),
            patch("anyio.Path.read_text", new_callable=AsyncMock, return_value=sync_meta),
        ):
            response = await client.get(
                "/clinvar/status",
                headers=_admin_headers(admin_token),
            )
        assert response.status_code == 200, response.text

    @pytest.mark.asyncio
    async def test_status_returns_expected_fields(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """GET /clinvar/status response includes last_sync, source_url, and file_size_bytes."""
        sync_meta = json.dumps({
            "last_sync": "2026-02-01T00:00:00+00:00",
            "source_url": "https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz",
            "file_size_bytes": 123456789,
        })

        with (
            patch("anyio.Path.exists", new_callable=AsyncMock, return_value=True),
            patch("anyio.Path.read_text", new_callable=AsyncMock, return_value=sync_meta),
        ):
            response = await client.get(
                "/clinvar/status",
                headers=_admin_headers(admin_token),
            )
        assert response.status_code == 200
        data = response.json()
        assert "last_sync" in data
        assert "source_url" in data
        assert "file_size_bytes" in data

    @pytest.mark.asyncio
    async def test_status_returns_correct_values_from_file(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """GET /clinvar/status response values match the sync metadata file contents."""
        expected_last_sync = "2026-02-01T00:00:00+00:00"
        expected_source_url = "https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz"
        expected_size = 123456789

        sync_meta = json.dumps({
            "last_sync": expected_last_sync,
            "source_url": expected_source_url,
            "file_size_bytes": expected_size,
        })

        with (
            patch("anyio.Path.exists", new_callable=AsyncMock, return_value=True),
            patch("anyio.Path.read_text", new_callable=AsyncMock, return_value=sync_meta),
        ):
            response = await client.get(
                "/clinvar/status",
                headers=_admin_headers(admin_token),
            )
        assert response.status_code == 200
        data = response.json()
        assert data["last_sync"] == expected_last_sync
        assert data["source_url"] == expected_source_url
        assert data["file_size_bytes"] == expected_size

    @pytest.mark.asyncio
    async def test_status_returns_500_on_corrupt_metadata(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """GET /clinvar/status returns 500 when the metadata file contains invalid JSON."""
        with (
            patch("anyio.Path.exists", new_callable=AsyncMock, return_value=True),
            patch("anyio.Path.read_text", new_callable=AsyncMock, return_value="NOT JSON {{{"),
        ):
            response = await client.get(
                "/clinvar/status",
                headers=_admin_headers(admin_token),
            )
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_status_500_error_code(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """GET /clinvar/status 500 body includes SYNC_META_ERROR code."""
        with (
            patch("anyio.Path.exists", new_callable=AsyncMock, return_value=True),
            patch("anyio.Path.read_text", new_callable=AsyncMock, return_value="NOT JSON {{{"),
        ):
            response = await client.get(
                "/clinvar/status",
                headers=_admin_headers(admin_token),
            )
        assert response.status_code == 500
        detail = response.json()["detail"]
        assert detail["code"] == "SYNC_META_ERROR"

    @pytest.mark.asyncio
    async def test_status_requires_jwt(
        self,
        client: AsyncClient,
        patched_admin_key: str,
    ) -> None:
        """GET /clinvar/status returns 401 when no JWT is provided."""
        response = await client.get(
            "/clinvar/status",
            headers={"X-Admin-Key": _TEST_ADMIN_KEY},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_status_requires_admin_key(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """GET /clinvar/status returns 403 when X-Admin-Key is absent."""
        response = await client.get(
            "/clinvar/status",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_status_rejects_wrong_admin_key(
        self,
        client: AsyncClient,
        admin_token: str,
        patched_admin_key: str,
    ) -> None:
        """GET /clinvar/status returns 403 when X-Admin-Key is incorrect."""
        response = await client.get(
            "/clinvar/status",
            headers=_admin_headers(admin_token, admin_key="wrong-key"),
        )
        assert response.status_code == 403
