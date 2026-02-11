"""
Tests for the payment endpoints.

Covers Stripe checkout creation, webhook processing, payment history,
and subscription status. All Stripe API calls are mocked.
"""

from __future__ import annotations

import logging
import uuid
from unittest.mock import MagicMock

import pytest
from app.models.payment import Payment
from app.models.user import User
from httpx import AsyncClient

# ── Checkout ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_checkout_premium_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    mock_stripe: dict,
) -> None:
    """POST /payments/checkout for premium tier should return 201 with checkout URL."""
    mock_stripe["create"].return_value = MagicMock(
        url="https://checkout.stripe.com/c/pay_test",
        id="cs_test_session_123",
    )

    response = await client.post(
        "/payments/checkout",
        headers=auth_headers,
        json={"tier": "premium"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "checkout_url" in data
    assert "session_id" in data
    assert data["checkout_url"] == "https://checkout.stripe.com/c/pay_test"
    assert data["session_id"] == "cs_test_session_123"


@pytest.mark.asyncio
async def test_checkout_pro_success(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    mock_stripe: dict,
) -> None:
    """POST /payments/checkout for pro tier should return 201."""
    mock_stripe["create"].return_value = MagicMock(
        url="https://checkout.stripe.com/c/pay_pro",
        id="cs_test_pro_456",
    )

    response = await client.post(
        "/payments/checkout",
        headers=auth_headers,
        json={"tier": "pro"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["checkout_url"] == "https://checkout.stripe.com/c/pay_pro"


@pytest.mark.asyncio
async def test_checkout_already_on_tier(
    client: AsyncClient,
    premium_user: User,
    premium_auth_headers: dict[str, str],
) -> None:
    """POST /payments/checkout when already on the requested tier should return 400."""
    response = await client.post(
        "/payments/checkout",
        headers=premium_auth_headers,
        json={"tier": "premium"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "ALREADY_ON_TIER"


@pytest.mark.asyncio
async def test_checkout_downgrade_not_allowed(
    client: AsyncClient,
    pro_user: User,
    pro_auth_headers: dict[str, str],
) -> None:
    """POST /payments/checkout for a lower tier than current should return 400."""
    response = await client.post(
        "/payments/checkout",
        headers=pro_auth_headers,
        json={"tier": "premium"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "DOWNGRADE_NOT_ALLOWED"


@pytest.mark.asyncio
async def test_checkout_unauthenticated(
    client: AsyncClient,
) -> None:
    """POST /payments/checkout without auth should return 401."""
    response = await client.post(
        "/payments/checkout",
        json={"tier": "premium"},
    )
    assert response.status_code in (401, 403)


# ── Webhook ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_webhook_checkout_completed(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
) -> None:
    """Webhook with checkout.session.completed should upgrade user tier."""
    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 2999,
                "currency": "usd",
                "customer": "cus_test_webhook",
                "payment_intent": "pi_test_webhook",
            },
        },
    }

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=fakesig"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "message" in data

    # Verify user tier was upgraded
    await db_session.refresh(test_user)
    assert test_user.tier == "premium"


@pytest.mark.asyncio
async def test_webhook_invalid_signature(
    client: AsyncClient,
    mock_stripe: dict,
) -> None:
    """Webhook with invalid signature should return 400."""
    from stripe import SignatureVerificationError

    mock_stripe["construct_event"].side_effect = SignatureVerificationError(
        "Invalid signature", sig_header="bad"
    )

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=badsig"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "WEBHOOK_FAILED"


@pytest.mark.asyncio
async def test_webhook_unknown_event(
    client: AsyncClient,
    mock_stripe: dict,
) -> None:
    """Webhook with an unhandled event type should return 200 (acknowledged)."""
    mock_stripe["construct_event"].return_value = {
        "type": "payment_intent.created",
        "data": {"object": {}},
    }

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "payment_intent.created"}',
        headers={"Stripe-Signature": "t=123,v1=validsig"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_webhook_missing_signature(
    client: AsyncClient,
) -> None:
    """Webhook without Stripe-Signature header should return 400."""
    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "MISSING_SIGNATURE"


@pytest.mark.asyncio
async def test_webhook_missing_user(
    client: AsyncClient,
    mock_stripe: dict,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Webhook for a non-existent user should handle gracefully (no crash) and log a warning."""
    non_existent_id = str(uuid.uuid4())
    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": non_existent_id,
                "metadata": {"tier": "premium", "user_id": non_existent_id},
                "amount_total": 2999,
                "currency": "usd",
                "customer": "cus_ghost",
                "payment_intent": "pi_ghost",
            },
        },
    }

    with caplog.at_level(logging.WARNING, logger="app.services.payment_service"):
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=validsig"},
        )
    # Should not crash — returns 200 even if user not found
    assert response.status_code == 200
    # Verify the warning was logged
    assert any("not found" in record.message for record in caplog.records)


# ── Payment History ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_payment_history_empty(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /payments/history for a user with no payments should return empty array."""
    response = await client.get("/payments/history", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.asyncio
async def test_payment_history_with_payments(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    payment_record: Payment,
) -> None:
    """GET /payments/history with a payment should return the payment."""
    response = await client.get("/payments/history", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["amount"] == 2999
    assert data[0]["currency"] == "usd"
    assert data[0]["status"] == "succeeded"
    assert data[0]["tier_granted"] == "premium"


@pytest.mark.asyncio
async def test_payment_history_unauthenticated(
    client: AsyncClient,
) -> None:
    """GET /payments/history without auth should return 401."""
    response = await client.get("/payments/history")
    assert response.status_code in (401, 403)


# ── Tier Status ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_tier_status_free_user(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    """GET /payments/tier-status for a free user should return correct status."""
    response = await client.get("/payments/tier-status", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["tier"] == "free"
    assert data["is_active"] is False
    assert data["payments_count"] == 0


@pytest.mark.asyncio
async def test_tier_status_premium_user(
    client: AsyncClient,
    premium_user: User,
    premium_auth_headers: dict[str, str],
) -> None:
    """GET /payments/tier-status for a premium user should show active."""
    response = await client.get("/payments/tier-status", headers=premium_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["tier"] == "premium"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_tier_status_unauthenticated(
    client: AsyncClient,
) -> None:
    """GET /payments/tier-status without auth should return 401."""
    response = await client.get("/payments/tier-status")
    assert response.status_code in (401, 403)
