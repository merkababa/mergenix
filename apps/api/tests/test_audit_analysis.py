"""
Tests for GDPR access audit logging on analysis result endpoints.

Verifies that every analysis result access (save, view, list, delete) creates
an audit log entry with the correct event type and metadata, and that NO
health data ever leaks into the audit log.

S5 — Access Audit Logging (GDPR Accountability, Decision #33).
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from app.models.audit import AuditLog
from app.models.user import User
from app.services.audit_service import (
    RESULT_DELETED,
    RESULT_LISTED,
    RESULT_SAVED,
    RESULT_VIEWED,
)
from app.services.retention_service import SECURITY_EVENTS
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tests.analysis_fixtures import _save_payload


# ── Helper: get all audit entries for a user+event_type ──────────────────


async def _get_audit_entries(
    db: AsyncSession,
    user_id: uuid.UUID,
    event_type: str,
) -> list[AuditLog]:
    """Return all AuditLog rows for a given user and event type."""
    result = await db.execute(
        select(AuditLog).where(
            AuditLog.user_id == user_id,
            AuditLog.event_type == event_type,
        )
    )
    return list(result.scalars().all())


# ═══════════════════════════════════════════════════════════════════════════
# Event type constants — verify values match what the router uses
# ═══════════════════════════════════════════════════════════════════════════


def test_result_saved_constant_value() -> None:
    """RESULT_SAVED constant should equal 'result_saved'."""
    assert RESULT_SAVED == "result_saved"


def test_result_viewed_constant_value() -> None:
    """RESULT_VIEWED constant should equal 'result_viewed'."""
    assert RESULT_VIEWED == "result_viewed"


def test_result_deleted_constant_value() -> None:
    """RESULT_DELETED constant should equal 'result_deleted'."""
    assert RESULT_DELETED == "result_deleted"


def test_result_listed_constant_value() -> None:
    """RESULT_LISTED constant should equal 'result_listed'."""
    assert RESULT_LISTED == "result_listed"


# ═══════════════════════════════════════════════════════════════════════════
# result_saved — POST /analysis/results
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_save_result_creates_result_saved_audit(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """POST /analysis/results should create a result_saved audit entry with result_id."""
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    assert save_resp.status_code == 201
    result_id = save_resp.json()["id"]

    # Verify audit entry
    entries = await _get_audit_entries(db_session, test_user.id, RESULT_SAVED)
    assert len(entries) == 1
    entry = entries[0]
    assert entry.metadata_json is not None
    assert entry.metadata_json["result_id"] == result_id


@pytest.mark.asyncio
async def test_save_result_audit_contains_no_health_data(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """result_saved audit metadata must NOT contain health/genetic data."""
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    assert save_resp.status_code == 201

    entries = await _get_audit_entries(db_session, test_user.id, RESULT_SAVED)
    assert len(entries) == 1
    metadata = entries[0].metadata_json

    # Metadata must contain result_id but NO encrypted envelope content,
    # NO genetic data, NO filenames, NO labels, NO KDF params
    assert "result_id" in metadata

    metadata_str = str(metadata)
    assert "ciphertext" not in metadata_str
    assert "deadbeef" not in metadata_str
    assert "trait_count" not in metadata_str
    assert "carrier_count" not in metadata_str
    assert "parent1.vcf" not in metadata_str
    assert "parent2.vcf" not in metadata_str
    assert "Our First Analysis" not in metadata_str
    assert "argon2id" not in metadata_str
    assert "aes-gcm" not in metadata_str


# ═══════════════════════════════════════════════════════════════════════════
# result_viewed — GET /analysis/results/{result_id}
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_get_result_creates_result_viewed_audit(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GET /analysis/results/{id} should create a result_viewed audit entry."""
    # Save a result first
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    assert save_resp.status_code == 201
    result_id = save_resp.json()["id"]

    # View the result
    get_resp = await client.get(
        f"/analysis/results/{result_id}",
        headers=auth_headers,
    )
    assert get_resp.status_code == 200

    # Verify audit entry
    entries = await _get_audit_entries(db_session, test_user.id, RESULT_VIEWED)
    assert len(entries) == 1
    entry = entries[0]
    assert entry.metadata_json is not None
    assert entry.metadata_json["result_id"] == result_id


@pytest.mark.asyncio
async def test_get_result_audit_contains_no_health_data(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """result_viewed audit metadata must contain ONLY result_id — no health data."""
    # Save a result
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    assert save_resp.status_code == 201
    result_id = save_resp.json()["id"]

    # View the result
    await client.get(f"/analysis/results/{result_id}", headers=auth_headers)

    # Verify metadata keys are strictly limited
    entries = await _get_audit_entries(db_session, test_user.id, RESULT_VIEWED)
    assert len(entries) == 1
    metadata = entries[0].metadata_json
    assert set(metadata.keys()) == {"result_id"}

    # Verify no genetic/health data strings leak into metadata values
    metadata_str = str(metadata)
    assert "ciphertext" not in metadata_str
    assert "deadbeef" not in metadata_str
    assert "trait_count" not in metadata_str
    assert "carrier_count" not in metadata_str
    assert "parent1.vcf" not in metadata_str
    assert "parent2.vcf" not in metadata_str
    assert "Our First Analysis" not in metadata_str


@pytest.mark.asyncio
async def test_get_result_404_does_not_create_viewed_audit(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GET /analysis/results/{id} for nonexistent ID should NOT create an audit entry."""
    fake_id = str(uuid.uuid4())
    resp = await client.get(f"/analysis/results/{fake_id}", headers=auth_headers)
    assert resp.status_code == 404

    entries = await _get_audit_entries(db_session, test_user.id, RESULT_VIEWED)
    assert len(entries) == 0


# ═══════════════════════════════════════════════════════════════════════════
# result_listed — GET /analysis/results
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_list_results_creates_result_listed_audit(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GET /analysis/results should create a result_listed audit entry."""
    # Save a result first so the list is non-empty
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    assert save_resp.status_code == 201

    # List results
    list_resp = await client.get("/analysis/results", headers=auth_headers)
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert len(data) == 1

    # Verify audit entry
    entries = await _get_audit_entries(db_session, test_user.id, RESULT_LISTED)
    assert len(entries) == 1
    entry = entries[0]
    assert entry.metadata_json is not None
    assert entry.metadata_json["count"] == 1


@pytest.mark.asyncio
async def test_list_results_empty_creates_audit_with_zero_count(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GET /analysis/results on empty list should create audit with count=0."""
    list_resp = await client.get("/analysis/results", headers=auth_headers)
    assert list_resp.status_code == 200
    assert list_resp.json() == []

    entries = await _get_audit_entries(db_session, test_user.id, RESULT_LISTED)
    assert len(entries) == 1
    assert entries[0].metadata_json["count"] == 0


@pytest.mark.asyncio
async def test_list_results_audit_contains_no_health_data(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """result_listed audit metadata must contain ONLY count — no health data."""
    # Save a result
    await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )

    # List results
    await client.get("/analysis/results", headers=auth_headers)

    entries = await _get_audit_entries(db_session, test_user.id, RESULT_LISTED)
    assert len(entries) == 1
    metadata = entries[0].metadata_json
    # Strictly only "count" in metadata
    assert set(metadata.keys()) == {"count"}

    # No leakage
    metadata_str = str(metadata)
    assert "ciphertext" not in metadata_str
    assert "trait_count" not in metadata_str
    assert "carrier_count" not in metadata_str
    assert "parent1.vcf" not in metadata_str
    assert "Our First Analysis" not in metadata_str


# ═══════════════════════════════════════════════════════════════════════════
# result_deleted — DELETE /analysis/results/{result_id}
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_delete_result_creates_result_deleted_audit(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """DELETE /analysis/results/{id} should create a result_deleted audit entry with result_id."""
    # Save a result first
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    assert save_resp.status_code == 201
    result_id = save_resp.json()["id"]

    # Delete the result
    del_resp = await client.delete(
        f"/analysis/results/{result_id}",
        headers=auth_headers,
    )
    assert del_resp.status_code == 200

    # Verify audit entry
    entries = await _get_audit_entries(db_session, test_user.id, RESULT_DELETED)
    assert len(entries) == 1
    entry = entries[0]
    assert entry.metadata_json is not None
    assert entry.metadata_json["result_id"] == result_id


@pytest.mark.asyncio
async def test_delete_result_audit_contains_no_health_data(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """result_deleted audit metadata must contain ONLY result_id — no health data."""
    # Save a result
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    assert save_resp.status_code == 201
    result_id = save_resp.json()["id"]

    # Delete it
    await client.delete(f"/analysis/results/{result_id}", headers=auth_headers)

    entries = await _get_audit_entries(db_session, test_user.id, RESULT_DELETED)
    assert len(entries) == 1
    metadata = entries[0].metadata_json
    assert set(metadata.keys()) == {"result_id"}

    # No leakage
    metadata_str = str(metadata)
    assert "ciphertext" not in metadata_str
    assert "deadbeef" not in metadata_str
    assert "trait_count" not in metadata_str
    assert "carrier_count" not in metadata_str
    assert "parent1.vcf" not in metadata_str
    assert "parent2.vcf" not in metadata_str
    assert "Our First Analysis" not in metadata_str


@pytest.mark.asyncio
async def test_delete_result_404_does_not_create_deleted_audit(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """DELETE /analysis/results/{id} for nonexistent ID should NOT create an audit entry."""
    fake_id = str(uuid.uuid4())
    resp = await client.delete(f"/analysis/results/{fake_id}", headers=auth_headers)
    assert resp.status_code == 404

    entries = await _get_audit_entries(db_session, test_user.id, RESULT_DELETED)
    assert len(entries) == 0


# ═══════════════════════════════════════════════════════════════════════════
# IP address and User-Agent capture in audit entries
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_save_result_audit_includes_ip_and_user_agent(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """result_saved audit entry should capture IP and User-Agent from request."""
    headers = {
        **auth_headers,
        "User-Agent": "TestBrowser/1.0",
    }
    save_resp = await client.post(
        "/analysis/results",
        headers=headers,
        json=_save_payload(),
    )
    assert save_resp.status_code == 201

    entries = await _get_audit_entries(db_session, test_user.id, RESULT_SAVED)
    assert len(entries) == 1
    entry = entries[0]
    # IP address should be a non-empty string (test client typically gives "127.0.0.1" or "testclient")
    assert isinstance(entry.ip_address, str)
    assert len(entry.ip_address) > 0
    # User agent should match the exact header we sent
    assert entry.user_agent == "TestBrowser/1.0"


@pytest.mark.asyncio
async def test_get_result_audit_includes_ip_and_user_agent(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """result_viewed audit entry should capture IP and User-Agent from request."""
    # Save first
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    result_id = save_resp.json()["id"]

    # View with custom UA
    headers = {
        **auth_headers,
        "User-Agent": "AuditTestAgent/2.0",
    }
    await client.get(f"/analysis/results/{result_id}", headers=headers)

    entries = await _get_audit_entries(db_session, test_user.id, RESULT_VIEWED)
    assert len(entries) == 1
    entry = entries[0]
    assert isinstance(entry.ip_address, str)
    assert len(entry.ip_address) > 0
    assert entry.user_agent == "AuditTestAgent/2.0"


@pytest.mark.asyncio
async def test_list_results_audit_includes_ip_and_user_agent(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """result_listed audit entry should capture IP and User-Agent from request."""
    headers = {
        **auth_headers,
        "User-Agent": "ListAuditAgent/3.0",
    }
    await client.get("/analysis/results", headers=headers)

    entries = await _get_audit_entries(db_session, test_user.id, RESULT_LISTED)
    assert len(entries) == 1
    entry = entries[0]
    assert isinstance(entry.ip_address, str)
    assert len(entry.ip_address) > 0
    assert entry.user_agent == "ListAuditAgent/3.0"


@pytest.mark.asyncio
async def test_delete_result_audit_includes_ip_and_user_agent(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """result_deleted audit entry should capture IP and User-Agent from request."""
    # Save first
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    result_id = save_resp.json()["id"]

    # Delete with custom UA
    headers = {
        **auth_headers,
        "User-Agent": "DeleteAuditAgent/4.0",
    }
    del_resp = await client.delete(
        f"/analysis/results/{result_id}",
        headers=headers,
    )
    assert del_resp.status_code == 200

    entries = await _get_audit_entries(db_session, test_user.id, RESULT_DELETED)
    assert len(entries) == 1
    entry = entries[0]
    assert isinstance(entry.ip_address, str)
    assert len(entry.ip_address) > 0
    assert entry.user_agent == "DeleteAuditAgent/4.0"


# ═══════════════════════════════════════════════════════════════════════════
# Fire-and-forget — audit failure must not cause endpoint failure
# The audit_service.log_event() function itself catches exceptions and logs
# them. These tests verify that when log_event raises (e.g. due to mock),
# the endpoint still succeeds.
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_audit_failure_does_not_fail_save_result(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """If audit logging fails during POST /analysis/results, the endpoint should still succeed."""
    with patch(
        "app.routers.analysis.audit_service.log_event",
        new_callable=AsyncMock,
        side_effect=Exception("DB connection lost"),
    ):
        save_resp = await client.post(
            "/analysis/results",
            headers=auth_headers,
            json=_save_payload(),
        )
        # The endpoint should still return 201 despite audit failure
        assert save_resp.status_code == 201
        assert "id" in save_resp.json()


@pytest.mark.asyncio
async def test_audit_failure_does_not_fail_get_result(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """If audit logging fails during GET /analysis/results/{id}, the endpoint should still succeed."""
    # Save a result first (this will succeed because we only mock for the get)
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    assert save_resp.status_code == 201
    result_id = save_resp.json()["id"]

    # Mock audit_service.log_event to raise during the get call
    with patch(
        "app.routers.analysis.audit_service.log_event",
        new_callable=AsyncMock,
        side_effect=Exception("DB connection lost"),
    ):
        get_resp = await client.get(
            f"/analysis/results/{result_id}",
            headers=auth_headers,
        )
        # The endpoint should still return 200 despite audit failure
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == result_id


@pytest.mark.asyncio
async def test_audit_failure_does_not_fail_list_results(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """If audit logging fails during GET /analysis/results, the endpoint should still succeed."""
    with patch(
        "app.routers.analysis.audit_service.log_event",
        new_callable=AsyncMock,
        side_effect=Exception("DB connection lost"),
    ):
        list_resp = await client.get("/analysis/results", headers=auth_headers)
        # The endpoint should still return 200 despite audit failure
        assert list_resp.status_code == 200


@pytest.mark.asyncio
async def test_audit_failure_does_not_fail_delete_result(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """If audit logging fails during DELETE /analysis/results/{id}, the endpoint should still succeed."""
    # Save a result first
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    assert save_resp.status_code == 201
    result_id = save_resp.json()["id"]

    # Mock audit_service.log_event to raise during the delete call
    with patch(
        "app.routers.analysis.audit_service.log_event",
        new_callable=AsyncMock,
        side_effect=Exception("DB connection lost"),
    ):
        del_resp = await client.delete(
            f"/analysis/results/{result_id}",
            headers=auth_headers,
        )
        # The endpoint should still return 200 despite audit failure
        assert del_resp.status_code == 200
        assert "deleted" in del_resp.json()["message"].lower()


# ═══════════════════════════════════════════════════════════════════════════
# Retention tier classification — analysis events in SECURITY_EVENTS
# ═══════════════════════════════════════════════════════════════════════════


def test_result_viewed_is_security_event() -> None:
    """result_viewed should be classified as a security event for 2-year retention."""
    assert RESULT_VIEWED in SECURITY_EVENTS


def test_result_listed_is_security_event() -> None:
    """result_listed should be classified as a security event for 2-year retention."""
    assert RESULT_LISTED in SECURITY_EVENTS


def test_result_saved_is_security_event() -> None:
    """result_saved should be classified as a security event for 2-year retention."""
    assert RESULT_SAVED in SECURITY_EVENTS


def test_result_deleted_is_security_event() -> None:
    """result_deleted should be classified as a security event for 2-year retention."""
    assert RESULT_DELETED in SECURITY_EVENTS
