"""
Tests for age verification enforcement at registration.

GDPR Art. 8 requires age verification (18+) when processing genetic data.
These tests verify that the registration endpoint enforces the age gate.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from app.models.consent import ConsentRecord
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def _years_ago(years: int) -> date:
    """Safely compute a date N years ago from today.

    Avoids the ``date.replace(year=...)`` ValueError that occurs when
    today is Feb 29 and the target year is not a leap year.  In that
    edge case, the date is shifted to Feb 28.
    """
    today = date.today()
    try:
        return today.replace(year=today.year - years)
    except ValueError:
        # today is Feb 29 but target year has no Feb 29 — use Feb 28
        return today.replace(month=2, day=28, year=today.year - years)


# ── Registration with date_of_birth ────────────────────────────────────


@pytest.mark.asyncio
async def test_register_adult_succeeds(client: AsyncClient, mock_email) -> None:
    """POST /auth/register with a valid adult DOB should return 201."""
    adult_dob = _years_ago(25).isoformat()
    response = await client.post(
        "/auth/register",
        json={
            "email": "adult@example.com",
            "password": "SecurePass1",
            "name": "Adult User",
            "date_of_birth": adult_dob,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "message" in data
    assert "successful" in data["message"].lower()


@pytest.mark.asyncio
async def test_register_exactly_18_succeeds(client: AsyncClient, mock_email) -> None:
    """POST /auth/register for someone who turned 18 today should return 201."""
    exactly_18_dob = _years_ago(18)
    response = await client.post(
        "/auth/register",
        json={
            "email": "just18@example.com",
            "password": "SecurePass1",
            "name": "Just Eighteen",
            "date_of_birth": exactly_18_dob.isoformat(),
        },
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_register_minor_rejected(client: AsyncClient, mock_email) -> None:
    """POST /auth/register with a minor's DOB should return 403."""
    minor_dob = _years_ago(15).isoformat()
    response = await client.post(
        "/auth/register",
        json={
            "email": "minor@example.com",
            "password": "SecurePass1",
            "name": "Minor User",
            "date_of_birth": minor_dob,
        },
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "AGE_VERIFICATION_FAILED"


@pytest.mark.asyncio
async def test_register_17_years_364_days_rejected(client: AsyncClient, mock_email) -> None:
    """POST /auth/register one day before 18th birthday should return 403."""
    # Exactly 18 years ago + 1 day = birthday is tomorrow = still 17
    almost_18_dob = _years_ago(18) + timedelta(days=1)
    response = await client.post(
        "/auth/register",
        json={
            "email": "almost18@example.com",
            "password": "SecurePass1",
            "name": "Almost Eighteen",
            "date_of_birth": almost_18_dob.isoformat(),
        },
    )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "AGE_VERIFICATION_FAILED"


@pytest.mark.asyncio
async def test_register_without_dob_rejected(client: AsyncClient, mock_email) -> None:
    """POST /auth/register without date_of_birth should return 422 (field required)."""
    response = await client.post(
        "/auth/register",
        json={
            "email": "nodob@example.com",
            "password": "SecurePass1",
            "name": "No DOB User",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_future_dob_rejected(client: AsyncClient, mock_email) -> None:
    """POST /auth/register with a future DOB should return 422."""
    future_dob = (date.today() + timedelta(days=365)).isoformat()
    response = await client.post(
        "/auth/register",
        json={
            "email": "future@example.com",
            "password": "SecurePass1",
            "name": "Future User",
            "date_of_birth": future_dob,
        },
    )
    assert response.status_code == 422


# ── Consent record auto-creation ───────────────────────────────────────


@pytest.mark.asyncio
async def test_register_creates_age_verification_consent(
    client: AsyncClient,
    db_session: AsyncSession,
    mock_email,
) -> None:
    """Successful registration should auto-create an age_verification consent record."""
    adult_dob = _years_ago(30).isoformat()
    response = await client.post(
        "/auth/register",
        json={
            "email": "consent_test@example.com",
            "password": "SecurePass1",
            "name": "Consent Test User",
            "date_of_birth": adult_dob,
        },
    )
    assert response.status_code == 201

    # Find the user
    result = await db_session.execute(
        select(User).where(User.email == "consent_test@example.com")
    )
    user = result.scalar_one()

    # Verify age_verification consent record was created
    consent_result = await db_session.execute(
        select(ConsentRecord).where(
            ConsentRecord.user_id == user.id,
            ConsentRecord.consent_type == "age_verification",
        )
    )
    consent = consent_result.scalar_one_or_none()
    assert consent is not None
    assert consent.consent_type == "age_verification"
    assert consent.version == "1.0"


# ── date_of_birth stored on User model ─────────────────────────────────


@pytest.mark.asyncio
async def test_register_stores_dob_on_user(
    client: AsyncClient,
    db_session: AsyncSession,
    mock_email,
) -> None:
    """Successful registration should persist date_of_birth on the User record."""
    adult_dob = _years_ago(28)
    response = await client.post(
        "/auth/register",
        json={
            "email": "dob_store@example.com",
            "password": "SecurePass1",
            "name": "DOB Store User",
            "date_of_birth": adult_dob.isoformat(),
        },
    )
    assert response.status_code == 201

    result = await db_session.execute(
        select(User).where(User.email == "dob_store@example.com")
    )
    user = result.scalar_one()
    assert user.date_of_birth == adult_dob


# ── Existing tests still pass (backward compatibility) ─────────────────


@pytest.mark.asyncio
async def test_existing_users_without_dob_can_login(
    client: AsyncClient,
    test_user: User,
) -> None:
    """Existing users (created before DOB requirement) should still log in."""
    # test_user fixture doesn't have DOB — should still be able to log in
    response = await client.post(
        "/auth/login",
        json={
            "email": test_user.email,
            "password": "TestPass123",
        },
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
