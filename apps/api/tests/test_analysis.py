"""
Tests for the analysis result persistence endpoints (ZKE — Zero-Knowledge Encryption).

The server stores opaque EncryptedEnvelope blobs from the client as-is.
It never encrypts or decrypts result data — the client is responsible for
all cryptographic operations.

Covers saving, listing, loading, deleting analysis results,
tier gating, ownership enforcement, opaque round-trip, and auth checks.
"""

from __future__ import annotations

import json
import uuid

import pytest
from app.models.analysis import AnalysisResult
from app.models.audit import AuditLog
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# ── Test Data ────────────────────────────────────────────────────────────

# A valid EncryptedEnvelope dict matching schemas/encryption.py
VALID_ENCRYPTED_ENVELOPE: dict = {
    "iv": "aabbccddeeff00112233aabb",  # 24 hex chars = 12 bytes
    "ciphertext": "deadbeefcafe1234567890abcdef0123456789abcdef",  # valid hex, even length
    "salt": "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",  # 64 hex = 32 bytes
    "kdf_params": {
        "algorithm": "argon2id",
        "memory_cost": 65536,
        "time_cost": 3,
        "parallelism": 1,
        "salt_length": 32,
        "key_length": 32,
    },
    "version": "v1:argon2id:aes-gcm",
}

SAMPLE_SUMMARY = {
    "trait_count": 1,
    "carrier_count": 1,
    "health_risk_count": 0,
    "total_variants_analyzed": 500000,
}


def _save_payload(
    label: str = "Our First Analysis",
    parent1: str = "parent1.vcf",
    parent2: str = "parent2.vcf",
    result_data: dict | None = None,
    summary: dict | None = None,
    consent_given: bool = True,
    data_version: str | None = None,
) -> dict:
    """Build a save-analysis request payload with an EncryptedEnvelope."""
    return {
        "label": label,
        "parent1_filename": parent1,
        "parent2_filename": parent2,
        "result_data": result_data or VALID_ENCRYPTED_ENVELOPE,
        "summary": summary or SAMPLE_SUMMARY,
        "consent_given": consent_given,
        "data_version": data_version,
    }


# ── Save Result Tests ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_save_result_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """POST /analysis/results should save the EncryptedEnvelope as an opaque blob."""
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["label"] == "Our First Analysis"
    assert "created_at" in data

    # Verify stored as JSON-serialized envelope in DB
    result = await db_session.execute(
        select(AnalysisResult).where(AnalysisResult.id == uuid.UUID(data["id"]))
    )
    row = result.scalar_one()
    assert row.result_data is not None
    assert isinstance(row.result_data, bytes)
    # The stored data should be deserializable back to the envelope
    stored_envelope = json.loads(row.result_data.decode("utf-8"))
    assert stored_envelope == VALID_ENCRYPTED_ENVELOPE
    # Verify summary is stored as plaintext
    assert row.summary_json is not None
    assert row.summary_json["trait_count"] == 1


@pytest.mark.asyncio
async def test_save_result_with_data_version(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """POST /analysis/results should store data_version when provided."""
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(data_version="1.2.0"),
    )
    assert response.status_code == 201
    data = response.json()

    result = await db_session.execute(
        select(AnalysisResult).where(AnalysisResult.id == uuid.UUID(data["id"]))
    )
    row = result.scalar_one()
    assert row.data_version == "1.2.0"


@pytest.mark.asyncio
async def test_save_result_tier_limit_free(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """Free user should be blocked after saving 1 analysis result."""
    # Save first result — should succeed
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(label="First"),
    )
    assert response.status_code == 201

    # Save second result — should be blocked
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(label="Second"),
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "TIER_LIMIT_REACHED"
    assert "Free" in data["detail"]["error"]


@pytest.mark.asyncio
async def test_save_result_tier_limit_premium(
    client: AsyncClient,
    premium_user: User,
    premium_auth_headers: dict[str, str],
) -> None:
    """Premium user should be able to save up to 10 results."""
    # Save first result
    response = await client.post(
        "/analysis/results",
        headers=premium_auth_headers,
        json=_save_payload(label="Premium Analysis 1"),
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_save_result_pro_unlimited(
    client: AsyncClient,
    pro_user: User,
    pro_auth_headers: dict[str, str],
) -> None:
    """Pro user should be able to save analysis results without limit."""
    # Save two results to verify no limit
    for i in range(2):
        response = await client.post(
            "/analysis/results",
            headers=pro_auth_headers,
            json=_save_payload(label=f"Pro Analysis {i+1}"),
        )
        assert response.status_code == 201


@pytest.mark.asyncio
async def test_save_result_unauthenticated(
    client: AsyncClient,
) -> None:
    """POST /analysis/results without auth should return 401."""
    response = await client.post(
        "/analysis/results",
        json=_save_payload(),
    )
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_save_result_empty_label(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    """POST /analysis/results with empty label should return 422."""
    payload = _save_payload(label="")
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=payload,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_save_result_invalid_envelope_returns_422(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /analysis/results with invalid EncryptedEnvelope schema should return 422."""
    # Missing required envelope fields (iv, ciphertext, salt, kdf_params, version)
    invalid_envelope = {"invalid": "data"}
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(result_data=invalid_envelope),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_save_result_invalid_envelope_bad_iv(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /analysis/results with bad IV hex should return 422."""
    bad_envelope = {**VALID_ENCRYPTED_ENVELOPE, "iv": "not-hex!"}
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(result_data=bad_envelope),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_save_result_invalid_envelope_bad_version(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /analysis/results with bad version format should return 422."""
    bad_envelope = {**VALID_ENCRYPTED_ENVELOPE, "version": "bad-version"}
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(result_data=bad_envelope),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_save_result_invalid_envelope_low_memory_cost(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /analysis/results with too-low KDF memory_cost should return 422."""
    bad_envelope = {
        **VALID_ENCRYPTED_ENVELOPE,
        "kdf_params": {
            **VALID_ENCRYPTED_ENVELOPE["kdf_params"],
            "memory_cost": 100,  # below 65536 minimum
        },
    }
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(result_data=bad_envelope),
    )
    assert response.status_code == 422


# ── List Results Tests ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_results_empty(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /analysis/results with no saved results should return empty list."""
    response = await client.get("/analysis/results", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_results_returns_summaries(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /analysis/results should return summaries without envelope data."""
    # First save a result
    await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )

    response = await client.get("/analysis/results", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    item = data[0]
    assert item["label"] == "Our First Analysis"
    assert item["parent1_filename"] == "parent1.vcf"
    assert item["parent2_filename"] == "parent2.vcf"
    assert item["tier_at_time"] == "free"
    assert item["summary"]["trait_count"] == 1
    assert "result_data" not in item  # Should NOT contain envelope data


@pytest.mark.asyncio
async def test_list_results_multiple(
    client: AsyncClient,
    pro_user: User,
    pro_auth_headers: dict[str, str],
) -> None:
    """GET /analysis/results should return all saved results."""
    # Save two results
    await client.post(
        "/analysis/results",
        headers=pro_auth_headers,
        json=_save_payload(label="First"),
    )
    await client.post(
        "/analysis/results",
        headers=pro_auth_headers,
        json=_save_payload(label="Second"),
    )

    response = await client.get("/analysis/results", headers=pro_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    labels = {item["label"] for item in data}
    assert labels == {"First", "Second"}


@pytest.mark.asyncio
async def test_list_results_unauthenticated(
    client: AsyncClient,
) -> None:
    """GET /analysis/results without auth should return 401."""
    response = await client.get("/analysis/results")
    assert response.status_code in (401, 403)


# ── Get Result (Opaque Envelope) Tests ──────────────────────────────────


@pytest.mark.asyncio
async def test_get_result_returns_opaque_envelope(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /analysis/results/{id} should return the opaque EncryptedEnvelope as-is."""
    # Save a result
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    result_id = save_resp.json()["id"]

    # Load it back
    response = await client.get(
        f"/analysis/results/{result_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == result_id
    assert data["label"] == "Our First Analysis"
    # The result_data should be the exact EncryptedEnvelope we sent
    assert data["result_data"] == VALID_ENCRYPTED_ENVELOPE
    assert data["summary"] == SAMPLE_SUMMARY


@pytest.mark.asyncio
async def test_get_result_round_trip_opaque(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """Round-trip: save an envelope, get it back — should be identical."""
    envelope = {
        "iv": "112233445566778899aabbcc",  # 24 hex chars
        "ciphertext": "aabbccdd11223344aabbccdd11223344",  # valid hex
        "salt": "aabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344",  # 64 hex
        "kdf_params": {
            "algorithm": "argon2id",
            "memory_cost": 131072,
            "time_cost": 4,
            "parallelism": 2,
            "salt_length": 32,
            "key_length": 32,
        },
        "version": "v1:argon2id:aes-gcm",
    }

    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(result_data=envelope),
    )
    assert save_resp.status_code == 201
    result_id = save_resp.json()["id"]

    get_resp = await client.get(
        f"/analysis/results/{result_id}",
        headers=auth_headers,
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["result_data"] == envelope


@pytest.mark.asyncio
async def test_get_result_wrong_user(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    premium_user: User,
    premium_auth_headers: dict[str, str],
) -> None:
    """GET /analysis/results/{id} by a different user should return 404."""
    # Save as test_user
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    result_id = save_resp.json()["id"]

    # Try to load as premium_user
    response = await client.get(
        f"/analysis/results/{result_id}",
        headers=premium_auth_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "RESULT_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_result_not_found(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /analysis/results/{id} for nonexistent ID should return 404."""
    fake_id = str(uuid.uuid4())
    response = await client.get(
        f"/analysis/results/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_result_unauthenticated(
    client: AsyncClient,
) -> None:
    """GET /analysis/results/{id} without auth should return 401."""
    fake_id = str(uuid.uuid4())
    response = await client.get(f"/analysis/results/{fake_id}")
    assert response.status_code in (401, 403)


# ── Delete Result Tests ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_result_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """DELETE /analysis/results/{id} should delete the result."""
    # Save a result
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    result_id = save_resp.json()["id"]

    # Delete it
    response = await client.delete(
        f"/analysis/results/{result_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "deleted" in response.json()["message"].lower()

    # Verify it's gone
    response = await client.get(
        f"/analysis/results/{result_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_result_wrong_user(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    premium_user: User,
    premium_auth_headers: dict[str, str],
) -> None:
    """DELETE /analysis/results/{id} by a different user should return 404."""
    # Save as test_user
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    result_id = save_resp.json()["id"]

    # Try to delete as premium_user
    response = await client.delete(
        f"/analysis/results/{result_id}",
        headers=premium_auth_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "RESULT_NOT_FOUND"


@pytest.mark.asyncio
async def test_delete_result_not_found(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """DELETE /analysis/results/{id} for nonexistent ID should return 404."""
    fake_id = str(uuid.uuid4())
    response = await client.delete(
        f"/analysis/results/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_result_unauthenticated(
    client: AsyncClient,
) -> None:
    """DELETE /analysis/results/{id} without auth should return 401."""
    fake_id = str(uuid.uuid4())
    response = await client.delete(f"/analysis/results/{fake_id}")
    assert response.status_code in (401, 403)


# ── Delete Frees Tier Slot Test ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_frees_tier_slot(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """Deleting a result should free a tier slot for saving a new one."""
    # Save first result (fills Free tier slot)
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(label="First"),
    )
    assert save_resp.status_code == 201
    result_id = save_resp.json()["id"]

    # Verify can't save second
    resp2 = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(label="Second"),
    )
    assert resp2.status_code == 403

    # Delete the first
    del_resp = await client.delete(
        f"/analysis/results/{result_id}",
        headers=auth_headers,
    )
    assert del_resp.status_code == 200

    # Now can save again
    resp3 = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(label="Replacement"),
    )
    assert resp3.status_code == 201


# ── Consent Tests ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_save_result_requires_consent(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /analysis/results without consent_given=true should return 422."""
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(consent_given=False),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_save_result_missing_consent_field(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /analysis/results without consent_given field should return 422."""
    payload = _save_payload()
    del payload["consent_given"]
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=payload,
    )
    assert response.status_code == 422


# ── Audit Log Assertion Tests ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_save_result_creates_audit_log(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """Saving an analysis result should create an audit log entry with consent."""
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    assert response.status_code == 201
    result_id = response.json()["id"]

    # Verify audit log entry exists
    audit_result = await db_session.execute(
        select(AuditLog).where(
            AuditLog.user_id == test_user.id,
            AuditLog.event_type == "analysis_saved",
        )
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.metadata_json["analysis_id"] == result_id
    assert audit_entry.metadata_json["consent_given"] is True
    # Verify exact metadata keys — no PII should leak into audit logs
    assert set(audit_entry.metadata_json.keys()) == {"analysis_id", "consent_given"}
    # Verify no PII strings appear in metadata values
    metadata_str = str(audit_entry.metadata_json)
    assert "parent1.vcf" not in metadata_str
    assert "parent2.vcf" not in metadata_str
    assert "Our First Analysis" not in metadata_str


@pytest.mark.asyncio
async def test_delete_result_creates_audit_log(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """Deleting an analysis result should create an audit log entry without label."""
    # Save a result first
    save_resp = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(),
    )
    result_id = save_resp.json()["id"]

    # Delete it
    response = await client.delete(
        f"/analysis/results/{result_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200

    # Verify delete audit log entry exists
    audit_result = await db_session.execute(
        select(AuditLog).where(
            AuditLog.user_id == test_user.id,
            AuditLog.event_type == "analysis_deleted",
        )
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.metadata_json["analysis_id"] == result_id
    # Verify exact metadata keys — no PII should leak into audit logs
    assert set(audit_entry.metadata_json.keys()) == {"analysis_id"}
    # Verify no PII strings appear in metadata values
    metadata_str = str(audit_entry.metadata_json)
    assert "parent1.vcf" not in metadata_str
    assert "parent2.vcf" not in metadata_str
    assert "Our First Analysis" not in metadata_str


# ── Pydantic Validation Tests ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_save_result_label_too_long(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /analysis/results with label exceeding 255 chars should return 422."""
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(label="A" * 256),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_save_result_filenames_too_long(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /analysis/results with filename exceeding 255 chars should return 422."""
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=_save_payload(parent1="X" * 256),
    )
    assert response.status_code == 422


# ── Premium Tier Boundary Test ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_save_result_tier_limit_premium_boundary(
    client: AsyncClient,
    premium_user: User,
    premium_auth_headers: dict[str, str],
) -> None:
    """Premium user should save exactly 10 results, then be blocked on the 11th."""
    # Save 10 results — all should succeed
    for i in range(10):
        response = await client.post(
            "/analysis/results",
            headers=premium_auth_headers,
            json=_save_payload(label=f"Premium Analysis {i + 1}"),
        )
        assert response.status_code == 201, (
            f"Save #{i + 1} failed with status {response.status_code}: {response.json()}"
        )

    # 11th save should be blocked
    response = await client.post(
        "/analysis/results",
        headers=premium_auth_headers,
        json=_save_payload(label="Premium Analysis 11"),
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "TIER_LIMIT_REACHED"
    assert "Premium" in data["detail"]["error"]


# ── Summary Whitelist Validator Tests ────────────────────────────────────


@pytest.mark.asyncio
async def test_save_result_rejects_disallowed_summary_key(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """Summary with non-whitelisted key should be rejected."""
    payload = _save_payload(
        summary={"genotype": "AA"},  # "genotype" is not in the allowed keys
    )
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=payload,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_save_result_rejects_nested_summary(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """Summary with nested dict value should be rejected."""
    payload = _save_payload(
        summary={"trait_count": {"nested": "value"}},  # nested dict not allowed
    )
    response = await client.post(
        "/analysis/results",
        headers=auth_headers,
        json=payload,
    )
    assert response.status_code == 422
