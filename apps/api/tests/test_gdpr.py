"""
Tests for the GDPR router — account deletion (B7), data export (B8),
and profile rectification (B12).

TDD: These tests are written FIRST, before the implementation.
All tests should FAIL until the GDPR router is created.
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

import pytest
from unittest.mock import AsyncMock, patch

from app.models.analysis import AnalysisResult
from app.models.audit import AuditLog, Session
from app.models.payment import Payment
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# ── Helpers ──────────────────────────────────────────────────────────────


def _make_analysis_result(user_id: uuid.UUID, label: str = "Test Analysis") -> AnalysisResult:
    """Create an AnalysisResult instance for testing (not yet committed)."""
    envelope = {
        "iv": "aabbccdd11223344aabbccdd",
        "ciphertext": "deadbeef" * 4,
        "salt": "aa" * 16,
        "kdf_params": {
            "algorithm": "argon2id",
            "memory_cost": 65536,
            "time_cost": 3,
            "parallelism": 1,
            "salt_length": 16,
            "key_length": 32,
        },
        "version": "v1:argon2id:aes-gcm",
    }
    return AnalysisResult(
        id=uuid.uuid4(),
        user_id=user_id,
        label=label,
        parent1_filename="parent1.vcf",
        parent2_filename="parent2.vcf",
        result_data=json.dumps(envelope, separators=(",", ":")).encode("utf-8"),
        tier_at_time="free",
        summary_json={"trait_count": 5, "carrier_count": 2},
        data_version="1.0.0",
    )


# ═══════════════════════════════════════════════════════════════════════════
# B7: DELETE /gdpr/account — Nuclear Account Deletion
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_delete_account_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """DELETE /gdpr/account with correct password should return 200 and delete the user."""
    response = await client.request(
        "DELETE",
        "/gdpr/account",
        headers=auth_headers,
        json={"password": "TestPass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "message" in data

    # Verify user is gone
    result = await db_session.execute(select(User).where(User.id == test_user.id))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_account_wrong_password(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """DELETE /gdpr/account with wrong password should return 403."""
    response = await client.request(
        "DELETE",
        "/gdpr/account",
        headers=auth_headers,
        json={"password": "WrongPassword999"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_account_unauthenticated(
    client: AsyncClient,
) -> None:
    """DELETE /gdpr/account without auth should return 401."""
    response = await client.request(
        "DELETE",
        "/gdpr/account",
        json={"password": "TestPass123"},
    )
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_delete_account_cascade_deletes_related_data(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """After account deletion, all related analysis results, sessions, and payments should be gone."""
    # Create related data
    analysis = _make_analysis_result(test_user.id)
    db_session.add(analysis)

    payment = Payment(
        id=uuid.uuid4(),
        user_id=test_user.id,
        stripe_customer_id="cus_test_gdpr",
        stripe_payment_intent="pi_test_gdpr",
        amount=1499,
        currency="usd",
        status="succeeded",
        tier_granted="premium",
        created_at=datetime.now(UTC),
    )
    db_session.add(payment)

    session_record = Session(
        user_id=test_user.id,
        refresh_token_hash="fakehash_gdpr_test",
        expires_at=datetime(2099, 1, 1),
        ip_address="127.0.0.1",
        user_agent="pytest",
    )
    db_session.add(session_record)

    await db_session.commit()

    # Delete the account
    response = await client.request(
        "DELETE",
        "/gdpr/account",
        headers=auth_headers,
        json={"password": "TestPass123"},
    )
    assert response.status_code == 200

    # Verify all related data is gone
    analyses = await db_session.execute(
        select(AnalysisResult).where(AnalysisResult.user_id == test_user.id)
    )
    assert analyses.scalars().all() == []

    sessions = await db_session.execute(
        select(Session).where(Session.user_id == test_user.id)
    )
    assert sessions.scalars().all() == []

    payments = await db_session.execute(
        select(Payment).where(Payment.user_id == test_user.id)
    )
    assert payments.scalars().all() == []


@pytest.mark.asyncio
async def test_delete_account_clears_refresh_cookie(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """DELETE /gdpr/account should clear the refresh token cookie."""
    response = await client.request(
        "DELETE",
        "/gdpr/account",
        headers=auth_headers,
        json={"password": "TestPass123"},
    )
    assert response.status_code == 200

    # Check that the refresh_token cookie is being cleared (set-cookie with max-age=0 or expires in past)
    set_cookie_headers = response.headers.get_list("set-cookie")
    # We need at least one set-cookie that references refresh_token
    cookie_found = any("refresh_token" in c for c in set_cookie_headers)
    assert cookie_found, "Expected a set-cookie header to clear the refresh_token"


@pytest.mark.asyncio
async def test_delete_account_csrf_required(
    client_no_csrf: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """DELETE /gdpr/account without X-Requested-With header should return 403 (CSRF)."""
    response = await client_no_csrf.request(
        "DELETE",
        "/gdpr/account",
        headers=auth_headers,
        json={"password": "TestPass123"},
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "CSRF_HEADER_MISSING"


@pytest.mark.asyncio
async def test_delete_account_audit_log(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """DELETE /gdpr/account should create an account_deleted audit log entry.

    Note: Since the user is deleted, the audit log's user_id FK is SET NULL.
    We verify the audit log entry exists with the correct event type.
    """
    response = await client.request(
        "DELETE",
        "/gdpr/account",
        headers=auth_headers,
        json={"password": "TestPass123"},
    )
    assert response.status_code == 200

    # AuditLog has ondelete="SET NULL" for user_id, so the audit entry
    # should persist even after user deletion, but user_id will be NULL.
    audit_result = await db_session.execute(
        select(AuditLog).where(AuditLog.event_type == "account_deleted")
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None


# ═══════════════════════════════════════════════════════════════════════════
# B8: GET /gdpr/export — Data Portability Export
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_export_data_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /gdpr/export should return JSON with user profile, analyses, audit_logs, payments."""
    response = await client.get("/gdpr/export", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Verify required top-level fields
    assert data["user"]["email"] == test_user.email
    assert data["user"]["name"] == test_user.name
    assert data["user"]["tier"] == test_user.tier
    assert "created_at" in data["user"]
    assert isinstance(data["analyses"], list)
    assert isinstance(data["audit_logs"], list)
    assert isinstance(data["payments"], list)
    assert "exported_at" in data


@pytest.mark.asyncio
async def test_export_data_unauthenticated(
    client: AsyncClient,
) -> None:
    """GET /gdpr/export without auth should return 401."""
    response = await client.get("/gdpr/export")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_export_data_includes_analysis_envelopes(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """Data export should include analysis results with their EncryptedEnvelope data."""
    analysis = _make_analysis_result(test_user.id, label="Export Test Analysis")
    db_session.add(analysis)
    await db_session.commit()

    response = await client.get("/gdpr/export", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert len(data["analyses"]) == 1
    exported_analysis = data["analyses"][0]
    assert exported_analysis["label"] == "Export Test Analysis"
    # The GDPR export INCLUDES the encrypted envelope (unlike the legal export)
    assert "result_data" in exported_analysis
    envelope = exported_analysis["result_data"]
    assert "iv" in envelope
    assert "ciphertext" in envelope
    assert "salt" in envelope
    assert "version" in envelope


@pytest.mark.asyncio
async def test_export_data_includes_audit_logs(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """Data export should include audit log entries for the user."""
    # Create a test audit log entry
    from app.services import audit_service

    await audit_service.log_event(
        db_session,
        user_id=test_user.id,
        event_type="test_event",
        metadata={"test": True},
        ip_address="127.0.0.1",
        user_agent="pytest",
    )
    await db_session.commit()

    response = await client.get("/gdpr/export", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Should include at least our test event plus the data_exported event
    assert len(data["audit_logs"]) >= 1
    event_types = {log["event_type"] for log in data["audit_logs"]}
    assert "test_event" in event_types


@pytest.mark.asyncio
async def test_export_data_creates_audit_log(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GET /gdpr/export should create a data_exported audit log entry."""
    response = await client.get("/gdpr/export", headers=auth_headers)
    assert response.status_code == 200

    audit_result = await db_session.execute(
        select(AuditLog).where(
            AuditLog.user_id == test_user.id,
            AuditLog.event_type == "data_exported",
        )
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None


@pytest.mark.asyncio
async def test_export_data_includes_payments(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    payment_record: Payment,
) -> None:
    """Data export should include payment history."""
    response = await client.get("/gdpr/export", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert len(data["payments"]) == 1
    assert data["payments"][0]["amount"] == 1499
    assert data["payments"][0]["currency"] == "usd"
    assert data["payments"][0]["status"] == "succeeded"


# ═══════════════════════════════════════════════════════════════════════════
# B12: PUT /gdpr/profile — Data Rectification
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_rectify_profile_update_name(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """PUT /gdpr/profile with name field should update the user's name."""
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"name": "Updated Name"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_rectify_profile_update_email(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """PUT /gdpr/profile with email field should update email and set email_verified=False.

    Email changes require password re-authentication (Gate 2 R1 Issue 3).
    """
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"email": "newemail@example.com", "password": "TestPass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newemail@example.com"
    assert data["email_verified"] is False

    # Verify in database
    await db_session.refresh(test_user)
    assert test_user.email == "newemail@example.com"
    assert test_user.email_verified is False


@pytest.mark.asyncio
async def test_rectify_profile_empty_update(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """PUT /gdpr/profile with no fields should return 200 (no-op)."""
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == test_user.name
    assert data["email"] == test_user.email


@pytest.mark.asyncio
async def test_rectify_profile_unauthenticated(
    client: AsyncClient,
) -> None:
    """PUT /gdpr/profile without auth should return 401."""
    response = await client.put(
        "/gdpr/profile",
        json={"name": "Should Not Work"},
    )
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_rectify_profile_audit_log(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """PUT /gdpr/profile should create a profile_rectified audit log entry."""
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"name": "Audit Test Name"},
    )
    assert response.status_code == 200

    audit_result = await db_session.execute(
        select(AuditLog).where(
            AuditLog.user_id == test_user.id,
            AuditLog.event_type == "profile_rectified",
        )
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.metadata_json is not None
    # Issue 4: audit log now stores only field names, not PII values
    assert "fields_changed" in audit_entry.metadata_json
    assert "name" in audit_entry.metadata_json["fields_changed"]


@pytest.mark.asyncio
async def test_rectify_profile_csrf_required(
    client_no_csrf: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """PUT /gdpr/profile without X-Requested-With header should return 403 (CSRF)."""
    response = await client_no_csrf.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"name": "Should Not Work"},
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "CSRF_HEADER_MISSING"


@pytest.mark.asyncio
async def test_rectify_profile_update_both_name_and_email(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """PUT /gdpr/profile should support updating both name and email simultaneously.

    Email changes require password re-authentication (Gate 2 R1 Issue 3).
    """
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"name": "Both Updated", "email": "both@example.com", "password": "TestPass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Both Updated"
    assert data["email"] == "both@example.com"
    assert data["email_verified"] is False


# ═══════════════════════════════════════════════════════════════════════════
# Issue 1: Export endpoint pagination
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_export_data_pagination_defaults(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GET /gdpr/export should support pagination with default page=1, page_size=100."""
    # Create 3 analysis results
    for i in range(3):
        analysis = _make_analysis_result(test_user.id, label=f"Analysis {i}")
        db_session.add(analysis)
    await db_session.commit()

    response = await client.get("/gdpr/export", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Should have pagination metadata
    assert "pagination" in data
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["page_size"] == 100
    assert data["pagination"]["total_count"] == 3
    assert data["pagination"]["has_next"] is False


@pytest.mark.asyncio
async def test_export_data_pagination_custom_page_size(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GET /gdpr/export?page_size=2 should return only 2 analyses with has_next=True."""
    for i in range(5):
        analysis = _make_analysis_result(test_user.id, label=f"Analysis {i}")
        db_session.add(analysis)
    await db_session.commit()

    response = await client.get(
        "/gdpr/export?page=1&page_size=2", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()

    assert len(data["analyses"]) == 2
    assert data["pagination"]["total_count"] == 5
    assert data["pagination"]["has_next"] is True
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["page_size"] == 2


@pytest.mark.asyncio
async def test_export_data_pagination_page_2(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GET /gdpr/export?page=2&page_size=2 should return the second page."""
    for i in range(5):
        analysis = _make_analysis_result(test_user.id, label=f"Analysis {i}")
        db_session.add(analysis)
    await db_session.commit()

    response = await client.get(
        "/gdpr/export?page=2&page_size=2", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()

    assert len(data["analyses"]) == 2
    assert data["pagination"]["page"] == 2
    assert data["pagination"]["has_next"] is True  # still page 3 remaining


@pytest.mark.asyncio
async def test_export_data_pagination_max_page_size_rejected(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /gdpr/export?page_size=9999 should be rejected (max 1000)."""
    response = await client.get(
        "/gdpr/export?page_size=9999", headers=auth_headers
    )
    assert response.status_code == 422  # FastAPI Query validation rejects > 1000


@pytest.mark.asyncio
async def test_export_data_pagination_max_page_size_accepted(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /gdpr/export?page_size=1000 should be accepted (exactly at max)."""
    response = await client.get(
        "/gdpr/export?page_size=1000", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["pagination"]["page_size"] == 1000


# ═══════════════════════════════════════════════════════════════════════════
# Issue 2: Duplicate email on rectify -> 409
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_rectify_profile_duplicate_email(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """PUT /gdpr/profile changing email to an existing user's email should return 409."""
    from app.services.auth_service import hash_password

    # Create a second user
    second_user = User(
        id=uuid.uuid4(),
        email="second@example.com",
        password_hash=await hash_password("SecondPass123"),
        name="Second User",
        tier="free",
        email_verified=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(second_user)
    await db_session.commit()

    # Try to change test_user's email to second user's email (password required)
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"email": "second@example.com", "password": "TestPass123"},
    )
    assert response.status_code == 409
    data = response.json()
    assert "already registered" in data["detail"].lower() or "email" in data["detail"].lower()


# ═══════════════════════════════════════════════════════════════════════════
# Issue 3: Legacy result format -> 410
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_get_result_legacy_format_returns_422(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GET /analysis/results/{id} with legacy raw-bytes result_data should return 422."""
    # Create an analysis result with non-JSON binary data (legacy format)
    legacy_analysis = AnalysisResult(
        id=uuid.uuid4(),
        user_id=test_user.id,
        label="Legacy Analysis",
        parent1_filename="parent1.vcf",
        parent2_filename="parent2.vcf",
        result_data=b"\x80\x81\x82\x83\x84\x85",  # raw bytes, not JSON
        tier_at_time="free",
        summary_json={"trait_count": 1},
        data_version=None,
    )
    db_session.add(legacy_analysis)
    await db_session.commit()

    response = await client.get(
        f"/analysis/results/{legacy_analysis.id}",
        headers=auth_headers,
    )
    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["code"] == "LEGACY_FORMAT"


@pytest.mark.asyncio
async def test_export_data_legacy_format_skipped(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GDPR export should skip legacy-format results without crashing."""
    # Create a valid analysis and a legacy one
    valid_analysis = _make_analysis_result(test_user.id, label="Valid Analysis")
    db_session.add(valid_analysis)

    legacy_analysis = AnalysisResult(
        id=uuid.uuid4(),
        user_id=test_user.id,
        label="Legacy Analysis",
        parent1_filename="parent1.vcf",
        parent2_filename="parent2.vcf",
        result_data=b"\x80\x81\x82\x83",  # raw bytes, not JSON
        tier_at_time="free",
        summary_json=None,
        data_version=None,
    )
    db_session.add(legacy_analysis)
    await db_session.commit()

    response = await client.get("/gdpr/export", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Should have at least the valid analysis; legacy should be skipped or have error marker
    # The response should not crash
    assert isinstance(data["analyses"], list)


# ═══════════════════════════════════════════════════════════════════════════
# Issue 4: PII in audit logs — only log field names, not values
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_rectify_profile_audit_no_pii(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """Profile rectification audit log should log field names, NOT actual PII values."""
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"name": "New Secret Name", "email": "secret@example.com", "password": "TestPass123"},
    )
    assert response.status_code == 200

    audit_result = await db_session.execute(
        select(AuditLog).where(
            AuditLog.user_id == test_user.id,
            AuditLog.event_type == "profile_rectified",
        )
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None

    metadata = audit_entry.metadata_json
    # Should have "fields_changed" list, not raw old->new values
    assert "fields_changed" in metadata
    assert "name" in metadata["fields_changed"]
    # PII values must NOT appear in the audit log
    metadata_str = str(metadata)
    assert "New Secret Name" not in metadata_str
    assert "secret@example.com" not in metadata_str
    assert "Test User" not in metadata_str
    assert "test@example.com" not in metadata_str
    assert "->" not in metadata_str


# ═══════════════════════════════════════════════════════════════════════════
# Issue 5: Email verification event on email change
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_rectify_email_change_triggers_verification_event(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """Changing email should create an email_verification_required audit event."""
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"email": "new_verified@example.com", "password": "TestPass123"},
    )
    assert response.status_code == 200

    audit_result = await db_session.execute(
        select(AuditLog).where(
            AuditLog.user_id == test_user.id,
            AuditLog.event_type == "email_verification_required",
        )
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None


# ═══════════════════════════════════════════════════════════════════════════
# Issue 6: Shared account deletion service
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_delete_account_via_auth_endpoint(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """POST /auth/delete-account should also cascade-delete related data via shared service."""
    # Create related data
    analysis = _make_analysis_result(test_user.id)
    db_session.add(analysis)

    payment = Payment(
        id=uuid.uuid4(),
        user_id=test_user.id,
        stripe_customer_id="cus_auth_delete",
        stripe_payment_intent="pi_auth_delete",
        amount=1499,
        currency="usd",
        status="succeeded",
        tier_granted="premium",
        created_at=datetime.now(UTC),
    )
    db_session.add(payment)
    await db_session.commit()

    response = await client.post(
        "/auth/delete-account",
        headers=auth_headers,
        json={"password": "TestPass123"},
    )
    assert response.status_code == 200

    # Verify related data is gone
    analyses = await db_session.execute(
        select(AnalysisResult).where(AnalysisResult.user_id == test_user.id)
    )
    assert analyses.scalars().all() == []

    payments = await db_session.execute(
        select(Payment).where(Payment.user_id == test_user.id)
    )
    assert payments.scalars().all() == []


# ═══════════════════════════════════════════════════════════════════════════
# Issue 9: Cookie helper imports from shared location
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_shared_cookie_module_exists() -> None:
    """The shared cookie helper module should be importable."""
    from app.utils.cookies import clear_refresh_cookie

    assert callable(clear_refresh_cookie)


# ═══════════════════════════════════════════════════════════════════════════
# Gate 2 R1 — Issue 3: Email change requires password re-auth
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_rectify_profile_email_change_requires_password(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """PUT /gdpr/profile changing email WITHOUT password should return 400."""
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"email": "newemail_nopass@example.com"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "PASSWORD_REQUIRED"


@pytest.mark.asyncio
async def test_rectify_profile_email_change_with_correct_password(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """PUT /gdpr/profile changing email WITH correct password should return 200."""
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"email": "verified_change@example.com", "password": "TestPass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "verified_change@example.com"
    assert data["email_verified"] is False


@pytest.mark.asyncio
async def test_rectify_profile_email_change_with_wrong_password(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """PUT /gdpr/profile changing email WITH wrong password should return 403."""
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"email": "wrong_pass@example.com", "password": "WrongPassword999"},
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "INVALID_PASSWORD"


# ═══════════════════════════════════════════════════════════════════════════
# Gate 2 R1 — Issue 4: Missing QA tests
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_delete_account_oauth_user_returns_400(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """DELETE /gdpr/account for an OAuth user (no password_hash) should return 400."""
    from app.services.auth_service import create_access_token

    oauth_user = User(
        id=uuid.uuid4(),
        email="oauth@example.com",
        password_hash=None,
        name="OAuth User",
        tier="free",
        email_verified=True,
        oauth_provider="google",
        oauth_id="google_12345",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(oauth_user)
    await db_session.commit()
    await db_session.refresh(oauth_user)

    token = create_access_token(oauth_user.id)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Requested-With": "XMLHttpRequest",
    }

    response = await client.request(
        "DELETE",
        "/gdpr/account",
        headers=headers,
        json={"password": "anything"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "OAUTH_ACCOUNT"


@pytest.mark.asyncio
async def test_delete_account_wrong_password_audit_log(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """DELETE /gdpr/account with wrong password should create delete_account_failed audit log."""
    response = await client.request(
        "DELETE",
        "/gdpr/account",
        headers=auth_headers,
        json={"password": "WrongPassword999"},
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "INVALID_PASSWORD"

    # Verify audit log was created
    audit_result = await db_session.execute(
        select(AuditLog).where(
            AuditLog.user_id == test_user.id,
            AuditLog.event_type == "delete_account_failed",
        )
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.metadata_json is not None
    assert audit_entry.metadata_json["reason"] == "wrong_password"


@pytest.mark.asyncio
async def test_gdpr_export_user_isolation(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GDPR export should only return data for the authenticated user, not others."""
    # Create analysis result for test_user
    analysis_a = _make_analysis_result(test_user.id, label="User A Analysis")
    db_session.add(analysis_a)

    # Create a second user with their own analysis
    second_user = User(
        id=uuid.uuid4(),
        email="userb@example.com",
        password_hash=None,
        name="User B",
        tier="free",
        email_verified=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(second_user)
    await db_session.flush()

    analysis_b = _make_analysis_result(second_user.id, label="User B Analysis")
    db_session.add(analysis_b)
    await db_session.commit()

    # Export as test_user (User A)
    response = await client.get("/gdpr/export", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Should only see User A's analysis
    labels = [a["label"] for a in data["analyses"]]
    assert "User A Analysis" in labels
    assert "User B Analysis" not in labels

    # User profile should be User A
    assert data["user"]["email"] == test_user.email


@pytest.mark.asyncio
async def test_rectify_profile_name_too_short(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """PUT /gdpr/profile with name of 1 char should return 422 (min_length=2)."""
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"name": "A"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_rectify_profile_same_email_is_noop(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """PUT /gdpr/profile with same current email should be a no-op (email_verified stays True)."""
    response = await client.put(
        "/gdpr/profile",
        headers=auth_headers,
        json={"email": test_user.email},
    )
    assert response.status_code == 200
    data = response.json()
    # Same email = no change, email_verified should stay True
    assert data["email"] == test_user.email
    assert data["email_verified"] is True


# ═══════════════════════════════════════════════════════════════════════════
# Gate 2 R1 — Issue 8: Export skipped_legacy_count
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_export_pagination_adjusts_for_skipped_legacy(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GDPR export total_count should account for skipped legacy results."""
    # Create 2 valid analyses + 1 legacy
    for i in range(2):
        db_session.add(_make_analysis_result(test_user.id, label=f"Valid {i}"))

    legacy = AnalysisResult(
        id=uuid.uuid4(),
        user_id=test_user.id,
        label="Legacy",
        parent1_filename="p1.vcf",
        parent2_filename="p2.vcf",
        result_data=b"\x80\x81\x82",
        tier_at_time="free",
        summary_json=None,
        data_version=None,
    )
    db_session.add(legacy)
    await db_session.commit()

    response = await client.get("/gdpr/export", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Should have 2 valid analyses
    assert len(data["analyses"]) == 2
    # Pagination should reflect skipped count
    assert data["pagination"]["skipped_legacy"] == 1


# ═══════════════════════════════════════════════════════════════════════════
# Gate 2 R1 — Issue 9: Export includes user_agent in audit logs
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_export_audit_logs_include_user_agent(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """GDPR export audit logs should include user_agent field."""
    from app.services import audit_service

    await audit_service.log_event(
        db_session,
        user_id=test_user.id,
        event_type="test_ua_event",
        ip_address="127.0.0.1",
        user_agent="TestBrowser/1.0",
    )
    await db_session.commit()

    response = await client.get("/gdpr/export", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Find our test event
    test_events = [al for al in data["audit_logs"] if al["event_type"] == "test_ua_event"]
    assert len(test_events) >= 1
    assert "user_agent" in test_events[0]
    assert test_events[0]["user_agent"] == "TestBrowser/1.0"


# ═══════════════════════════════════════════════════════════════════════════
# Item 11: Email change → verification email sent + EmailVerification record
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_rectify_email_change_sends_verification_email(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """PUT /gdpr/profile changing email should call send_verification_email with the new address."""
    with patch(
        "app.routers.gdpr.send_verification_email",
        new_callable=AsyncMock,
        return_value=True,
    ) as mock_send:
        response = await client.put(
            "/gdpr/profile",
            headers=auth_headers,
            json={"email": "item11_new@example.com", "password": "TestPass123"},
        )
    assert response.status_code == 200
    mock_send.assert_called_once()
    call_args = mock_send.call_args
    # First positional arg is the email address
    assert call_args[0][0] == "item11_new@example.com"


@pytest.mark.asyncio
async def test_rectify_email_change_creates_email_verification_record(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """PUT /gdpr/profile changing email should persist an EmailVerification record."""
    from app.models.audit import EmailVerification

    with patch(
        "app.routers.gdpr.send_verification_email",
        new_callable=AsyncMock,
        return_value=True,
    ):
        response = await client.put(
            "/gdpr/profile",
            headers=auth_headers,
            json={"email": "item11_verify@example.com", "password": "TestPass123"},
        )
    assert response.status_code == 200

    # Verify an EmailVerification record was created for the user
    result = await db_session.execute(
        select(EmailVerification).where(EmailVerification.user_id == test_user.id)
    )
    verification = result.scalar_one_or_none()
    assert verification is not None
    assert verification.verified_at is None  # not yet verified
    assert verification.expires_at is not None


@pytest.mark.asyncio
async def test_rectify_same_email_does_not_send_verification_email(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """PUT /gdpr/profile with the same email should NOT call send_verification_email."""
    with patch(
        "app.routers.gdpr.send_verification_email",
        new_callable=AsyncMock,
        return_value=True,
    ) as mock_send:
        response = await client.put(
            "/gdpr/profile",
            headers=auth_headers,
            json={"email": test_user.email},
        )
    assert response.status_code == 200
    mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_rectify_same_email_email_verified_stays_true(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """PUT /gdpr/profile with same email should leave email_verified unchanged (True)."""
    with patch(
        "app.routers.gdpr.send_verification_email",
        new_callable=AsyncMock,
        return_value=True,
    ):
        response = await client.put(
            "/gdpr/profile",
            headers=auth_headers,
            json={"email": test_user.email},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["email_verified"] is True
