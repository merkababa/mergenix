"""
Tests for the legal and privacy endpoints.

Covers consent recording and listing, cookie preference management,
GDPR data export, audit trail creation, user isolation, and auth checks.
"""

from __future__ import annotations

import pytest
from app.models.analysis import AnalysisResult
from app.models.audit import AuditLog
from app.models.consent import CookiePreference
from app.models.payment import Payment
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# ── Test Data ────────────────────────────────────────────────────────────


def _consent_payload(
    consent_type: str = "terms",
    version: str = "1.0",
) -> dict:
    """Build a record-consent request payload."""
    return {
        "consent_type": consent_type,
        "version": version,
    }


def _cookie_payload(analytics: bool = True, marketing: bool = False) -> dict:
    """Build an update-cookie-preferences request payload."""
    return {"analytics": analytics, "marketing": marketing}


# ── POST /legal/consent Tests ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_record_consent_terms_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /legal/consent with consent_type=terms should return 201."""
    response = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(consent_type="terms", version="1.0"),
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["consent_type"] == "terms"
    assert data["version"] == "1.0"
    assert "accepted_at" in data


@pytest.mark.asyncio
async def test_record_consent_privacy_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /legal/consent with consent_type=privacy should return 201."""
    response = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(consent_type="privacy", version="2.0"),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["consent_type"] == "privacy"
    assert data["version"] == "2.0"


@pytest.mark.asyncio
async def test_record_consent_cookies_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /legal/consent with consent_type=cookies should return 201."""
    response = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(consent_type="cookies", version="1.0"),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["consent_type"] == "cookies"


@pytest.mark.asyncio
async def test_record_consent_age_verification_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /legal/consent with consent_type=age_verification should return 201."""
    response = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(consent_type="age_verification", version="1.0"),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["consent_type"] == "age_verification"


@pytest.mark.asyncio
async def test_record_consent_invalid_type(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /legal/consent with invalid consent_type should return 422."""
    response = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(consent_type="invalid_type"),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_record_consent_empty_version(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /legal/consent with empty version string should return 422."""
    response = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(version=""),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_record_consent_unauthenticated(
    client: AsyncClient,
) -> None:
    """POST /legal/consent without auth should return 401."""
    response = await client.post(
        "/legal/consent",
        json=_consent_payload(),
    )
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_record_consent_creates_audit_log(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """Recording consent should create an audit log entry."""
    response = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(consent_type="terms", version="1.0"),
    )
    assert response.status_code == 201

    # Verify audit log entry exists
    audit_result = await db_session.execute(
        select(AuditLog).where(
            AuditLog.user_id == test_user.id,
            AuditLog.event_type == "consent_recorded",
        )
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.metadata_json["consent_type"] == "terms"
    assert audit_entry.metadata_json["version"] == "1.0"


# ── GET /legal/consent Tests ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_consents_empty(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /legal/consent with no consents should return empty list."""
    response = await client.get("/legal/consent", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_consents_returns_all(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /legal/consent should return all consent records for the user."""
    # Create 3 consents
    for consent_type in ("terms", "privacy", "cookies"):
        resp = await client.post(
            "/legal/consent",
            headers=auth_headers,
            json=_consent_payload(consent_type=consent_type, version="1.0"),
        )
        assert resp.status_code == 201

    response = await client.get("/legal/consent", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    consent_types = {item["consent_type"] for item in data}
    assert consent_types == {"terms", "privacy", "cookies"}


@pytest.mark.asyncio
async def test_list_consents_only_own(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    premium_user: User,
    premium_auth_headers: dict[str, str],
) -> None:
    """User A's consents should not be visible to User B."""
    # User A (test_user) creates a consent
    resp = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(consent_type="terms", version="1.0"),
    )
    assert resp.status_code == 201

    # User B (premium_user) creates a different consent
    resp = await client.post(
        "/legal/consent",
        headers=premium_auth_headers,
        json=_consent_payload(consent_type="privacy", version="2.0"),
    )
    assert resp.status_code == 201

    # User A should only see their own consent
    response = await client.get("/legal/consent", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["consent_type"] == "terms"

    # User B should only see their own consent
    response = await client.get("/legal/consent", headers=premium_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["consent_type"] == "privacy"


@pytest.mark.asyncio
async def test_list_consents_unauthenticated(
    client: AsyncClient,
) -> None:
    """GET /legal/consent without auth should return 401."""
    response = await client.get("/legal/consent")
    assert response.status_code in (401, 403)


# ── POST /legal/cookies Tests ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_cookie_preferences_enable_analytics(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /legal/cookies with analytics=true should return analytics=true and essential=true."""
    response = await client.post(
        "/legal/cookies",
        headers=auth_headers,
        json=_cookie_payload(analytics=True),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["essential"] is True
    assert data["analytics"] is True


@pytest.mark.asyncio
async def test_update_cookie_preferences_disable_analytics(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /legal/cookies with analytics=false should return analytics=false and essential=true."""
    response = await client.post(
        "/legal/cookies",
        headers=auth_headers,
        json=_cookie_payload(analytics=False),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["essential"] is True
    assert data["analytics"] is False


@pytest.mark.asyncio
async def test_update_cookie_preferences_upsert(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """POST /legal/cookies twice should upsert — only one record per user."""
    # First create
    resp1 = await client.post(
        "/legal/cookies",
        headers=auth_headers,
        json=_cookie_payload(analytics=True),
    )
    assert resp1.status_code == 200
    assert resp1.json()["analytics"] is True
    assert resp1.json()["essential"] is True

    # Update — should update, not create a second record
    resp2 = await client.post(
        "/legal/cookies",
        headers=auth_headers,
        json=_cookie_payload(analytics=False),
    )
    assert resp2.status_code == 200
    assert resp2.json()["analytics"] is False
    assert resp2.json()["essential"] is True

    # Verify only one record in the database for this user
    result = await db_session.execute(
        select(CookiePreference).where(CookiePreference.user_id == test_user.id)
    )
    rows = result.scalars().all()
    assert len(rows) == 1
    assert rows[0].analytics_enabled is False


@pytest.mark.asyncio
async def test_update_cookie_preferences_creates_audit_log(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """Updating cookie preferences should create an audit log entry."""
    response = await client.post(
        "/legal/cookies",
        headers=auth_headers,
        json=_cookie_payload(analytics=True),
    )
    assert response.status_code == 200

    # Verify audit log entry exists
    audit_result = await db_session.execute(
        select(AuditLog).where(
            AuditLog.user_id == test_user.id,
            AuditLog.event_type == "cookie_preferences_updated",
        )
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.metadata_json["analytics"] is True


@pytest.mark.asyncio
async def test_update_cookie_preferences_unauthenticated(
    client: AsyncClient,
) -> None:
    """POST /legal/cookies without auth should return 401."""
    response = await client.post(
        "/legal/cookies",
        json=_cookie_payload(),
    )
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_update_cookie_preferences_enable_marketing(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /legal/cookies with marketing=true should return marketing=true."""
    response = await client.post(
        "/legal/cookies",
        headers=auth_headers,
        json=_cookie_payload(analytics=False, marketing=True),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["essential"] is True
    assert data["analytics"] is False
    assert data["marketing"] is True


@pytest.mark.asyncio
async def test_update_cookie_preferences_enable_both(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /legal/cookies with analytics=true, marketing=true should enable both."""
    response = await client.post(
        "/legal/cookies",
        headers=auth_headers,
        json=_cookie_payload(analytics=True, marketing=True),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["essential"] is True
    assert data["analytics"] is True
    assert data["marketing"] is True


@pytest.mark.asyncio
async def test_update_cookie_preferences_default_marketing_is_false(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /legal/cookies without marketing field should default marketing to false."""
    # Send only analytics — marketing should default to False
    response = await client.post(
        "/legal/cookies",
        headers=auth_headers,
        json={"analytics": True},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["marketing"] is False


@pytest.mark.asyncio
async def test_update_cookie_preferences_audit_includes_marketing(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """Updating cookie preferences with marketing=true should log marketing in audit."""
    response = await client.post(
        "/legal/cookies",
        headers=auth_headers,
        json=_cookie_payload(analytics=True, marketing=True),
    )
    assert response.status_code == 200

    audit_result = await db_session.execute(
        select(AuditLog).where(
            AuditLog.user_id == test_user.id,
            AuditLog.event_type == "cookie_preferences_updated",
        )
    )
    audit_entry = audit_result.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.metadata_json["analytics"] is True
    assert audit_entry.metadata_json["marketing"] is True


# ── GET /legal/cookies Tests ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_cookie_preferences_default(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /legal/cookies with no preferences set should return analytics=false, marketing=false, essential=true."""
    response = await client.get("/legal/cookies", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["essential"] is True
    assert data["analytics"] is False
    assert data["marketing"] is False


@pytest.mark.asyncio
async def test_get_cookie_preferences_after_set(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /legal/cookies after setting analytics=true, marketing=true should return both true."""
    # Set analytics and marketing to true
    resp = await client.post(
        "/legal/cookies",
        headers=auth_headers,
        json=_cookie_payload(analytics=True, marketing=True),
    )
    assert resp.status_code == 200

    # Get preferences
    response = await client.get("/legal/cookies", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["essential"] is True
    assert data["analytics"] is True
    assert data["marketing"] is True


@pytest.mark.asyncio
async def test_get_cookie_preferences_unauthenticated(
    client: AsyncClient,
) -> None:
    """GET /legal/cookies without auth should return 401."""
    response = await client.get("/legal/cookies")
    assert response.status_code in (401, 403)


# ── GET /legal/export-data Tests ────────────────────────────────────────


@pytest.mark.asyncio
async def test_export_data_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /legal/export-data should return user profile, consents, payments, analysis count."""
    response = await client.get("/legal/export-data", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Verify required top-level fields
    assert data["user_id"] == str(test_user.id)
    assert data["email"] == test_user.email
    assert data["name"] == test_user.name
    assert data["tier"] == test_user.tier
    assert "created_at" in data
    assert "exported_at" in data
    assert isinstance(data["consents"], list)
    assert isinstance(data["payments"], list)
    assert isinstance(data["analysis_count"], int)
    assert data["analysis_count"] == 0
    # cookie_preferences should be present (None when no prefs set)
    assert "cookie_preferences" in data
    # sessions and analyses should be present as lists
    assert isinstance(data["sessions"], list)
    assert isinstance(data["analyses"], list)


@pytest.mark.asyncio
async def test_export_data_includes_consents(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """Data export should include consent records."""
    # Create consent records
    for consent_type in ("terms", "privacy"):
        resp = await client.post(
            "/legal/consent",
            headers=auth_headers,
            json=_consent_payload(consent_type=consent_type, version="1.0"),
        )
        assert resp.status_code == 201

    # Export data
    response = await client.get("/legal/export-data", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["consents"]) == 2
    consent_types = {c["consent_type"] for c in data["consents"]}
    assert consent_types == {"terms", "privacy"}

    # GDPR: consent records must include IP and user_agent
    for consent in data["consents"]:
        assert "ip_address" in consent
        assert "user_agent" in consent


@pytest.mark.asyncio
async def test_export_data_includes_payment_count(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    payment_record: Payment,
) -> None:
    """Data export should include payment records and show correct analysis_count."""
    response = await client.get("/legal/export-data", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Verify payment appears in the export
    assert len(data["payments"]) == 1
    assert data["payments"][0]["amount"] == 1499
    assert data["payments"][0]["currency"] == "usd"
    assert data["payments"][0]["status"] == "succeeded"

    # analysis_count is 0 because no analysis results were saved
    assert data["analysis_count"] == 0


@pytest.mark.asyncio
async def test_export_data_no_raw_genetic_data(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    """Export should NOT contain result_data (encrypted blob) — only the count."""
    # Create an analysis result directly in the DB
    analysis = AnalysisResult(
        user_id=test_user.id,
        label="Test Analysis",
        parent1_filename="parent1.vcf",
        parent2_filename="parent2.vcf",
        result_data=b'{"iv":"aabb","ciphertext":"ccdd","salt":"eeff","kdf_params":{},"version":"v1:argon2id:aes-gcm"}',
        tier_at_time="free",
        summary_json={"trait_count": 2},
    )
    db_session.add(analysis)
    await db_session.commit()

    response = await client.get("/legal/export-data", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # analysis_count should reflect the saved analysis
    assert data["analysis_count"] == 1

    # The entire response should NOT contain result_data anywhere
    response_str = str(data)
    assert "encrypted-data-blob" not in response_str
    assert "result_data" not in response_str


@pytest.mark.asyncio
async def test_export_data_unauthenticated(
    client: AsyncClient,
) -> None:
    """GET /legal/export-data without auth should return 401."""
    response = await client.get("/legal/export-data")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_export_data_wrong_user_isolation(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    premium_user: User,
    premium_auth_headers: dict[str, str],
) -> None:
    """User A's export should not include User B's data."""
    # User A creates a consent
    resp = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(consent_type="terms", version="1.0"),
    )
    assert resp.status_code == 201

    # User B creates a consent
    resp = await client.post(
        "/legal/consent",
        headers=premium_auth_headers,
        json=_consent_payload(consent_type="privacy", version="2.0"),
    )
    assert resp.status_code == 201

    # User A's export should only contain their data
    response_a = await client.get("/legal/export-data", headers=auth_headers)
    assert response_a.status_code == 200
    data_a = response_a.json()
    assert data_a["user_id"] == str(test_user.id)
    assert data_a["email"] == test_user.email
    assert len(data_a["consents"]) == 1
    assert data_a["consents"][0]["consent_type"] == "terms"

    # User B's export should only contain their data
    response_b = await client.get("/legal/export-data", headers=premium_auth_headers)
    assert response_b.status_code == 200
    data_b = response_b.json()
    assert data_b["user_id"] == str(premium_user.id)
    assert data_b["email"] == premium_user.email
    assert len(data_b["consents"]) == 1
    assert data_b["consents"][0]["consent_type"] == "privacy"


# ── Additional Edge Cases ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_record_consent_version_too_long(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """POST /legal/consent with version exceeding 20 chars should return 422."""
    response = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(version="V" * 21),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_record_consent_append_only(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """Recording the same consent type twice should create two separate records (append-only)."""
    resp1 = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(consent_type="terms", version="1.0"),
    )
    assert resp1.status_code == 201
    id1 = resp1.json()["id"]

    resp2 = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(consent_type="terms", version="1.1"),
    )
    assert resp2.status_code == 201
    id2 = resp2.json()["id"]

    # IDs should be different — two distinct records
    assert id1 != id2

    # Listing should return both
    response = await client.get("/legal/consent", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.asyncio
async def test_export_data_includes_consent_details(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """Consent records in export should include id, consent_type, version, accepted_at."""
    resp = await client.post(
        "/legal/consent",
        headers=auth_headers,
        json=_consent_payload(consent_type="terms", version="1.0"),
    )
    assert resp.status_code == 201

    response = await client.get("/legal/export-data", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["consents"]) == 1
    consent = data["consents"][0]
    assert "id" in consent
    assert consent["consent_type"] == "terms"
    assert consent["version"] == "1.0"
    assert "accepted_at" in consent
    assert "ip_address" in consent
    assert "user_agent" in consent


# ── Rate Limit Tests ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_export_data_rate_limit(
    app,
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /legal/export-data should return 429 when the rate limit is exceeded.

    The conftest globally disables the rate limiter (``limiter.enabled = False``
    and replaces ``limiter.limit`` with an identity decorator) to avoid slowapi
    annotation-resolution issues in other tests.  Because the decorator was
    replaced before router import, the endpoint function is not wrapped with
    slowapi's rate-limiting closure and cannot be re-wrapped at runtime.

    Instead, this test verifies the rate-limiting behaviour by:
    1. Confirming the rate limit constant is correctly configured ("1/hour").
    2. Confirming that the ``export_data`` endpoint source code applies
       ``@limiter.limit(LIMIT_DATA_EXPORT)`` (decorator presence check).
    3. Temporarily swapping the endpoint in FastAPI's route table with one
       that raises ``RateLimitExceeded``, and verifying the app's registered
       exception handler returns a proper 429 JSON response.
    """
    import inspect
    from unittest.mock import MagicMock

    from app.middleware.rate_limiter import LIMIT_DATA_EXPORT
    from app.routers.legal import export_data
    from slowapi.errors import RateLimitExceeded

    # ── 1. Verify the rate limit constant is configured correctly ──────
    assert LIMIT_DATA_EXPORT == "1/hour", (
        f"Expected LIMIT_DATA_EXPORT to be '1/hour', got '{LIMIT_DATA_EXPORT}'"
    )

    # ── 2. Verify the decorator is applied in the source code ──────────
    # Since the conftest replaces limiter.limit with an identity decorator
    # at import time, we cannot inspect the live function for slowapi
    # metadata. Instead, verify the source code contains the decorator.
    source = inspect.getsource(export_data)
    assert "@limiter.limit(LIMIT_DATA_EXPORT)" in source, (
        "export_data endpoint must be decorated with @limiter.limit(LIMIT_DATA_EXPORT)"
    )

    # ── 3. Verify the endpoint works normally ──────────────────────────
    response1 = await client.get("/legal/export-data", headers=auth_headers)
    assert response1.status_code == 200

    # ── 4. Simulate rate limit exceeded → app must return 429 ──────────
    # TODO: Refactor to use app.dependency_overrides instead of monkey-patching
    # FastAPI's internal route.dependant.call. The current approach is fragile
    # and coupled to FastAPI internals that may change between versions.
    #
    # FastAPI compiles each route into an ASGI handler at registration
    # time, capturing the endpoint function via ``route.dependant.call``.
    # To intercept the endpoint, we temporarily swap ``dependant.call``
    # with one that raises ``RateLimitExceeded`` (the same exception
    # slowapi raises when a limit is hit).  The app's registered
    # ``_rate_limit_exceeded_handler`` should catch it and return 429.
    target_route = None
    for route in app.routes:
        if hasattr(route, "path") and route.path == "/legal/export-data":
            target_route = route
            break
    assert target_route is not None, "Could not find /legal/export-data route"

    original_call = target_route.dependant.call

    async def _raise_rate_limit(request, user, db):  # noqa: ARG001
        mock_limit = MagicMock()
        mock_limit.limit = MagicMock()
        # slowapi's _rate_limit_exceeded_handler reads request.state.view_rate_limit
        # to inject response headers.  Set it to None so the handler skips header
        # injection (same as when no limit was tracked).
        request.state.view_rate_limit = None
        raise RateLimitExceeded(mock_limit)

    target_route.dependant.call = _raise_rate_limit
    try:
        response2 = await client.get("/legal/export-data", headers=auth_headers)
        assert response2.status_code == 429
    finally:
        target_route.dependant.call = original_call
