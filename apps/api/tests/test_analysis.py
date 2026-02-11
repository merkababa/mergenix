"""
Tests for the analysis result persistence endpoints.

Covers saving, listing, loading (decrypted), deleting analysis results,
tier gating, ownership enforcement, encryption round-trip, and auth checks.
"""

from __future__ import annotations

import uuid

import pytest
from app.models.analysis import AnalysisResult
from app.models.audit import AuditLog
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# ── Test Data ────────────────────────────────────────────────────────────


SAMPLE_RESULT_DATA = {
    "traits": {
        "eye_color": {"blue": 0.25, "brown": 0.5, "green": 0.25},
        "hair_color": {"blonde": 0.1, "brown": 0.7, "black": 0.2},
    },
    "carrier_status": [
        {"condition": "Cystic Fibrosis", "rsid": "rs75039117", "status": "carrier"},
    ],
    "health_risks": [
        {"condition": "Type 2 Diabetes", "relative_risk": 1.2},
    ],
}

SAMPLE_SUMMARY = {
    "trait_count": 2,
    "carrier_count": 1,
    "health_risk_count": 1,
    "total_variants_analyzed": 150,
}


def _save_payload(
    label: str = "Our First Analysis",
    parent1: str = "parent1.vcf",
    parent2: str = "parent2.vcf",
    result_data: dict | None = None,
    summary: dict | None = None,
    consent_given: bool = True,
) -> dict:
    """Build a save-analysis request payload."""
    return {
        "label": label,
        "parent1_filename": parent1,
        "parent2_filename": parent2,
        "result_data": result_data or SAMPLE_RESULT_DATA,
        "summary": summary or SAMPLE_SUMMARY,
        "consent_given": consent_given,
    }


# ── Save Result Tests ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_save_result_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """POST /analysis/results should save and encrypt the analysis result."""
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

    # Verify encrypted in DB (not plaintext)
    result = await db_session.execute(
        select(AnalysisResult).where(AnalysisResult.id == uuid.UUID(data["id"]))
    )
    row = result.scalar_one()
    assert row.result_data is not None
    assert isinstance(row.result_data, bytes)
    assert row.result_nonce is not None
    assert isinstance(row.result_nonce, bytes)
    assert len(row.result_nonce) == 12  # AES-GCM nonce is 12 bytes
    # Verify it's not stored as plaintext
    assert b"eye_color" not in row.result_data
    # Verify summary is stored as plaintext
    assert row.summary_json is not None
    assert row.summary_json["trait_count"] == 2


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
    """GET /analysis/results should return summaries without decrypted data."""
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
    assert item["summary"]["trait_count"] == 2
    assert "result_data" not in item  # Should NOT contain decrypted data


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


# ── Get Result (Decrypted) Tests ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_result_decrypted(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /analysis/results/{id} should return decrypted analysis data."""
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
    assert data["result_data"] == SAMPLE_RESULT_DATA
    assert data["summary"] == SAMPLE_SUMMARY


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


# ── Encryption Round-Trip Test ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_encryption_round_trip() -> None:
    """Encrypt and decrypt should produce identical data."""
    from app.encryption import decrypt_result, encrypt_result

    test_data = {"key": "value", "nested": {"a": 1, "b": [2, 3]}}
    user_id = str(uuid.uuid4())
    secret = "test-secret-for-encryption"

    ciphertext, nonce = await encrypt_result(test_data, user_id, secret)

    assert isinstance(ciphertext, bytes)
    assert isinstance(nonce, bytes)
    assert len(nonce) == 12

    decrypted = await decrypt_result(ciphertext, nonce, user_id, secret)

    assert decrypted == test_data


@pytest.mark.asyncio
async def test_encryption_different_users_different_ciphertext() -> None:
    """Different user IDs should produce different ciphertext for the same data."""
    from app.encryption import encrypt_result

    test_data = {"key": "value"}
    secret = "test-secret-for-encryption"

    ct1, _ = await encrypt_result(test_data, str(uuid.uuid4()), secret)
    ct2, _ = await encrypt_result(test_data, str(uuid.uuid4()), secret)

    assert ct1 != ct2


@pytest.mark.asyncio
async def test_encryption_wrong_user_cannot_decrypt() -> None:
    """Decrypting with a different user ID should fail."""
    from app.encryption import decrypt_result, encrypt_result
    from cryptography.exceptions import InvalidTag

    test_data = {"key": "value"}
    secret = "test-secret-for-encryption"
    user_id = str(uuid.uuid4())
    wrong_user_id = str(uuid.uuid4())

    ciphertext, nonce = await encrypt_result(test_data, user_id, secret)

    with pytest.raises(InvalidTag):
        await decrypt_result(ciphertext, nonce, wrong_user_id, secret)


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


# ── Decryption Error Handling Tests ────────────────────────────────────


@pytest.mark.asyncio
async def test_get_result_corrupted_data_returns_500(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GET /analysis/results/{id} with corrupted ciphertext should return 500."""
    # Create a result with intentionally corrupted encrypted data
    analysis = AnalysisResult(
        user_id=test_user.id,
        label="Corrupted Result",
        parent1_filename="parent1.vcf",
        parent2_filename="parent2.vcf",
        result_data=b"corrupted-ciphertext-data",
        result_nonce=b"\x00" * 12,  # Valid nonce length, but data is corrupted
        tier_at_time="free",
        summary_json=SAMPLE_SUMMARY,
    )
    db_session.add(analysis)
    await db_session.commit()
    await db_session.refresh(analysis)

    response = await client.get(
        f"/analysis/results/{analysis.id}",
        headers=auth_headers,
    )
    assert response.status_code == 500
    data = response.json()
    assert data["detail"]["code"] == "DECRYPTION_FAILED"
    assert "corrupted" in data["detail"]["error"].lower()


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


# ── Encryption Edge Case Tests ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_encryption_unicode_roundtrip() -> None:
    """Encrypt/decrypt with unicode characters (emoji, non-ASCII) should round-trip."""
    from app.encryption import decrypt_result, encrypt_result

    test_data = {
        "emoji": "Hello \U0001f9ec\U0001f600\u2764\ufe0f",
        "hebrew": "\u05e9\u05dc\u05d5\u05dd \u05e2\u05d5\u05dc\u05dd",
        "japanese": "\u3053\u3093\u306b\u3061\u306f",
        "arabic": "\u0645\u0631\u062d\u0628\u0627",
        "nested": {"key_\u00e9": "valu\u00e9_\u00fc\u00f1"},
    }
    user_id = str(uuid.uuid4())
    secret = "test-secret-for-encryption"

    ciphertext, nonce = await encrypt_result(test_data, user_id, secret)
    decrypted = await decrypt_result(ciphertext, nonce, user_id, secret)

    assert decrypted == test_data


@pytest.mark.asyncio
async def test_encryption_non_serializable_raises() -> None:
    """Encrypting a dict with non-JSON-serializable values should raise TypeError."""
    from datetime import datetime

    from app.encryption import encrypt_result

    test_data = {"timestamp": datetime(2026, 1, 1, 12, 0, 0)}
    user_id = str(uuid.uuid4())
    secret = "test-secret-for-encryption"

    with pytest.raises(TypeError):
        await encrypt_result(test_data, user_id, secret)


@pytest.mark.asyncio
async def test_encryption_empty_dict_roundtrip() -> None:
    """Encrypt/decrypt of an empty dict should round-trip correctly."""
    from app.encryption import decrypt_result, encrypt_result

    test_data: dict = {}
    user_id = str(uuid.uuid4())
    secret = "test-secret-for-encryption"

    ciphertext, nonce = await encrypt_result(test_data, user_id, secret)

    assert isinstance(ciphertext, bytes)
    assert isinstance(nonce, bytes)
    assert len(nonce) == 12

    decrypted = await decrypt_result(ciphertext, nonce, user_id, secret)

    assert decrypted == test_data
