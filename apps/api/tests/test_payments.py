"""
Tests for the payment endpoints.

Covers Stripe checkout creation, webhook processing, payment history,
subscription status, webhook idempotency edge cases, pricing verification,
and Premium-to-Pro upgrade path.
All Stripe API calls are mocked.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.models.payment import Payment
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy import select

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
                "amount_total": 1499,
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

    mock_stripe["construct_event"].side_effect = SignatureVerificationError("Invalid signature", sig_header="bad")

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
                "amount_total": 1499,
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


# ── Error Message Sanitization ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_checkout_error_does_not_leak_internal_details(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    mock_stripe: dict,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """When checkout creation fails, the error response must NOT expose internal exception details.

    The response should contain a generic message, while the actual exception
    is logged server-side for debugging.
    """
    internal_error_msg = "stripe.error.InvalidRequestError: No such price: 'price_LEAKED_SECRET'"
    mock_stripe["create"].side_effect = ValueError(internal_error_msg)

    with caplog.at_level(logging.ERROR, logger="app.routers.payments"):
        response = await client.post(
            "/payments/checkout",
            headers=auth_headers,
            json={"tier": "premium"},
        )

    assert response.status_code == 400
    data = response.json()
    detail = data["detail"]
    assert detail["code"] == "CHECKOUT_FAILED"

    # The internal error string must NOT appear in the response
    assert "stripe" not in detail["error"].lower()
    assert "price_LEAKED_SECRET" not in detail["error"]
    assert "InvalidRequestError" not in detail["error"]

    # But the actual error MUST be logged server-side
    assert any(internal_error_msg in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_webhook_error_does_not_leak_internal_details(
    client: AsyncClient,
    mock_stripe: dict,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """When webhook processing fails, the error response must NOT expose internal exception details.

    The response should contain a generic message, while the actual exception
    is logged server-side for debugging.
    """
    internal_error_msg = "Invalid Stripe webhook signature: Traceback (most recent call last)..."
    mock_stripe["construct_event"].side_effect = ValueError(internal_error_msg)

    with caplog.at_level(logging.ERROR, logger="app.routers.payments"):
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=badsig"},
        )

    assert response.status_code == 400
    data = response.json()
    detail = data["detail"]
    assert detail["code"] == "WEBHOOK_FAILED"

    # The internal error string must NOT appear in the response
    assert "Traceback" not in detail["error"]
    assert "signature" not in detail["error"].lower()
    assert "stripe" not in detail["error"].lower()

    # But the actual error MUST be logged server-side
    assert any(internal_error_msg in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_checkout_error_returns_generic_message(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    mock_stripe: dict,
) -> None:
    """Checkout failure should return a safe, user-facing generic message."""
    mock_stripe["create"].side_effect = ValueError("Internal DB connection pool exhausted")

    response = await client.post(
        "/payments/checkout",
        headers=auth_headers,
        json={"tier": "premium"},
    )

    assert response.status_code == 400
    data = response.json()
    detail = data["detail"]
    assert detail["code"] == "CHECKOUT_FAILED"
    # Must be a generic message — not the raw exception text
    assert detail["error"] == "Payment processing failed. Please try again."


@pytest.mark.asyncio
async def test_webhook_error_returns_generic_message(
    client: AsyncClient,
    mock_stripe: dict,
) -> None:
    """Webhook failure should return a safe, user-facing generic message."""
    mock_stripe["construct_event"].side_effect = ValueError("Some internal Stripe SDK error")

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=badsig"},
    )

    assert response.status_code == 400
    data = response.json()
    detail = data["detail"]
    assert detail["code"] == "WEBHOOK_FAILED"
    # Must be a generic message — not the raw exception text
    assert detail["error"] == "Webhook processing failed."


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
    assert data[0]["amount"] == 1499
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


# ── Webhook Idempotency Edge Cases ───────────────────────────────────────


@pytest.mark.asyncio
async def test_webhook_idempotent_replay_skips_already_sent_receipt(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
) -> None:
    """When a duplicate webhook arrives and receipt_sent is True, the email should NOT be re-sent.

    This is the normal idempotency case: the first webhook succeeded completely
    (payment + email). The replay should be a true no-op.
    """
    # Pre-create a payment record with receipt_sent=True (fully completed)
    payment = Payment(
        id=uuid.uuid4(),
        user_id=test_user.id,
        stripe_customer_id="cus_already_sent",
        stripe_payment_intent="pi_already_sent",
        amount=1290,
        currency="usd",
        status="succeeded",
        tier_granted="premium",
        receipt_sent=True,
        created_at=datetime.now(UTC),
    )
    db_session.add(payment)
    await db_session.commit()

    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1290,
                "currency": "usd",
                "customer": "cus_already_sent",
                "payment_intent": "pi_already_sent",
            },
        },
    }

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=fakesig"},
    )

    assert response.status_code == 200

    # The email should NOT have been sent (already sent on first attempt)
    mock_receipt_email.assert_not_awaited()


@pytest.mark.asyncio
async def test_webhook_none_payment_intent_rejects(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """When payment_intent is None and no event ID fallback, the webhook should be rejected.

    Prevents duplicate payments from being created when there's no idempotency
    key to check against.
    """
    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "id": None,  # No event ID either
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1290,
                "currency": "usd",
                "customer": "cus_no_intent",
                "payment_intent": None,
            },
        },
    }

    with caplog.at_level(logging.WARNING, logger="app.services.payment_service"):
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

    assert response.status_code == 200

    # No payment should be created (rejected due to missing idempotency key)
    result = await db_session.execute(select(Payment).where(Payment.user_id == test_user.id))
    payments = list(result.scalars().all())
    assert len(payments) == 0

    # Should have logged a warning about the missing payment_intent
    assert any(
        "payment_intent" in record.message.lower() or "idempotency" in record.message.lower()
        for record in caplog.records
    )


@pytest.mark.asyncio
async def test_webhook_none_payment_intent_uses_event_id_fallback(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
) -> None:
    """When payment_intent is None but event ID exists, use event ID as idempotency key."""
    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "id": "evt_fallback_123",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1290,
                "currency": "usd",
                "customer": "cus_evt_fallback",
                "payment_intent": None,
            },
        },
    }

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=fakesig"},
    )

    assert response.status_code == 200

    # Payment should be created with the event ID as the stripe_payment_intent
    result = await db_session.execute(select(Payment).where(Payment.user_id == test_user.id))
    payment = result.scalar_one()
    assert payment.stripe_payment_intent == "evt_fallback_123"
    assert payment.tier_granted == "premium"


@pytest.mark.asyncio
async def test_webhook_none_payment_intent_event_id_dedup(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
) -> None:
    """When payment_intent is None, duplicate event IDs should be caught by idempotency."""
    # Pre-create a payment using the event ID as payment_intent
    payment = Payment(
        id=uuid.uuid4(),
        user_id=test_user.id,
        stripe_customer_id="cus_evt_dedup",
        stripe_payment_intent="evt_dedup_456",
        amount=1290,
        currency="usd",
        status="succeeded",
        tier_granted="premium",
        receipt_sent=True,
        created_at=datetime.now(UTC),
    )
    db_session.add(payment)
    await db_session.commit()

    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "id": "evt_dedup_456",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1290,
                "currency": "usd",
                "customer": "cus_evt_dedup",
                "payment_intent": None,
            },
        },
    }

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=fakesig"},
    )

    assert response.status_code == 200

    # Should not create a duplicate payment
    result = await db_session.execute(select(Payment).where(Payment.user_id == test_user.id))
    payments = list(result.scalars().all())
    assert len(payments) == 1

    # Should not re-send receipt (already sent)
    mock_receipt_email.assert_not_awaited()


@pytest.mark.asyncio
async def test_payment_model_has_receipt_sent_column(
    db_session,
    test_user: User,
) -> None:
    """Verify the Payment model has a receipt_sent boolean column defaulting to False."""
    payment = Payment(
        id=uuid.uuid4(),
        user_id=test_user.id,
        stripe_customer_id="cus_model_test",
        stripe_payment_intent="pi_model_test",
        amount=1290,
        currency="usd",
        status="succeeded",
        tier_granted="premium",
        created_at=datetime.now(UTC),
    )
    db_session.add(payment)
    await db_session.commit()
    await db_session.refresh(payment)

    # Default should be False
    assert payment.receipt_sent is False


# ── Pricing Verification (Decision #50) ────────────────────────────────


@pytest.mark.asyncio
async def test_checkout_premium_correct_amount(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    mock_stripe: dict,
    mock_receipt_email,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Webhook with 1499 cents for Premium should NOT trigger a price mismatch warning."""
    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1499,
                "currency": "usd",
                "customer": "cus_prem",
                "payment_intent": "pi_prem_correct",
            },
        },
    }

    with caplog.at_level(logging.WARNING, logger="app.services.payment_service"):
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )
    assert response.status_code == 200
    # No price mismatch warning should be logged when amount is correct (1499)
    mismatch_warnings = [r for r in caplog.records if "Price mismatch" in r.message]
    assert len(mismatch_warnings) == 0


@pytest.mark.asyncio
async def test_checkout_pro_correct_amount(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    mock_stripe: dict,
    mock_receipt_email,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Checkout for Pro tier should use 3499 cents ($34.99) as the expected amount."""
    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "pro", "user_id": str(test_user.id)},
                "amount_total": 3499,
                "currency": "usd",
                "customer": "cus_pro",
                "payment_intent": "pi_pro_correct",
            },
        },
    }

    with caplog.at_level(logging.WARNING, logger="app.services.payment_service"):
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )
    assert response.status_code == 200
    # No price mismatch warning should be logged when the amount is correct
    mismatch_warnings = [r for r in caplog.records if "Price mismatch" in r.message]
    assert len(mismatch_warnings) == 0


# ── Premium-to-Pro Upgrade Path ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_upgrade_premium_to_pro_charges_difference(
    client: AsyncClient,
    premium_user: User,
    premium_auth_headers: dict[str, str],
    mock_stripe: dict,
) -> None:
    """Premium user upgrading to Pro should be charged only 2000 cents ($20 difference)."""
    mock_stripe["create"].return_value = MagicMock(
        url="https://checkout.stripe.com/c/pay_upgrade",
        id="cs_test_upgrade",
    )

    response = await client.post(
        "/payments/checkout",
        headers=premium_auth_headers,
        json={"tier": "pro"},
    )
    assert response.status_code == 201

    # Verify the Stripe session was created with the difference amount (2000 cents)
    call_kwargs = mock_stripe["create"].call_args
    # The call should include amount_data or line_items with the upgrade difference
    # For upgrade path, we use amount mode instead of price ID mode
    assert call_kwargs is not None
    _, kwargs = call_kwargs
    line_items = kwargs.get("line_items", [])
    assert len(line_items) == 1
    item = line_items[0]
    # Upgrade should use price_data with 2000 cents instead of a price ID
    assert "price_data" in item
    assert item["price_data"]["unit_amount"] == 2000


@pytest.mark.asyncio
async def test_upgrade_pro_to_premium_rejected(
    client: AsyncClient,
    pro_user: User,
    pro_auth_headers: dict[str, str],
) -> None:
    """Pro user should not be able to downgrade to Premium (returns 400)."""
    response = await client.post(
        "/payments/checkout",
        headers=pro_auth_headers,
        json={"tier": "premium"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "DOWNGRADE_NOT_ALLOWED"


@pytest.mark.asyncio
async def test_free_to_pro_full_price(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    mock_stripe: dict,
) -> None:
    """Free user upgrading to Pro should be charged full price (3499 cents via price ID)."""
    mock_stripe["create"].return_value = MagicMock(
        url="https://checkout.stripe.com/c/pay_pro_full",
        id="cs_test_pro_full",
    )

    response = await client.post(
        "/payments/checkout",
        headers=auth_headers,
        json={"tier": "pro"},
    )
    assert response.status_code == 201

    # Verify the Stripe session was created with the price ID (full price)
    call_kwargs = mock_stripe["create"].call_args
    assert call_kwargs is not None
    _, kwargs = call_kwargs
    line_items = kwargs.get("line_items", [])
    assert len(line_items) == 1
    item = line_items[0]
    # Full price should use the price ID, not price_data
    assert "price" in item
    assert item["price"] == "price_test_pro"


# ── Purchase Receipt Email (B9) ────────────────────────────────────────


@pytest.mark.asyncio
async def test_webhook_checkout_sends_receipt_email(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
) -> None:
    """After successful checkout webhook, send_purchase_receipt_email is dispatched (fire-and-forget)."""
    import asyncio

    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1499,
                "currency": "usd",
                "customer": "cus_receipt_test",
                "payment_intent": "pi_receipt_test",
            },
        },
    }

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=fakesig"},
    )
    assert response.status_code == 200

    # Yield control to the event loop so the fire-and-forget task executes.
    # The mocked email function resolves immediately, so a single zero-delay
    # yield is sufficient and avoids the flakiness of a fixed sleep duration.
    await asyncio.sleep(0)

    # Verify the receipt email function was called exactly once
    mock_receipt_email.assert_awaited_once()
    call_kwargs = mock_receipt_email.call_args
    args, kwargs = call_kwargs
    # Verify the correct arguments were passed
    # The function is called with keyword args: to_email, user_name, tier, amount_cents, payment_date, results_url
    assert kwargs["to_email"] == "test@example.com"
    assert kwargs["user_name"] == "Test User"
    assert kwargs["tier"] == "premium"
    assert kwargs["amount_cents"] == 1499


@pytest.mark.asyncio
async def test_webhook_checkout_receipt_email_contains_amount(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
) -> None:
    """Receipt email for Pro tier should be called with 3499 cents ($34.99)."""
    import asyncio

    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "pro", "user_id": str(test_user.id)},
                "amount_total": 3499,
                "currency": "usd",
                "customer": "cus_receipt_pro",
                "payment_intent": "pi_receipt_pro",
            },
        },
    }

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=fakesig"},
    )
    assert response.status_code == 200

    # Yield control to the event loop so the fire-and-forget task executes.
    await asyncio.sleep(0)

    mock_receipt_email.assert_awaited_once()
    call_kwargs = mock_receipt_email.call_args
    _, kwargs = call_kwargs
    assert kwargs["tier"] == "pro"
    assert kwargs["amount_cents"] == 3499


@pytest.mark.asyncio
async def test_webhook_checkout_receipt_email_failure_does_not_fail_webhook(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
) -> None:
    """If receipt email raises an exception, the webhook still returns 200 and payment is recorded."""
    mock_receipt_email.side_effect = Exception("SMTP connection failed")

    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1499,
                "currency": "usd",
                "customer": "cus_receipt_fail",
                "payment_intent": "pi_receipt_fail",
            },
        },
    }

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=fakesig"},
    )
    # Webhook must still succeed even if email fails
    assert response.status_code == 200

    # Verify the payment was still recorded (tier upgraded)
    await db_session.refresh(test_user)
    assert test_user.tier == "premium"


# ── HTML Injection Escaping in Receipt Email (WARN-6) ──────────────────


@pytest.mark.asyncio
async def test_receipt_email_html_escaping() -> None:
    """send_purchase_receipt_email should escape HTML characters in user_name and tier."""
    from app.services.email_service import send_purchase_receipt_email

    with patch("app.services.email_service._send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True
        await send_purchase_receipt_email(
            to_email="user@example.com",
            user_name='<script>alert("xss")</script>',
            tier='<img src=x onerror="alert(1)">',
            amount_cents=1499,
            payment_date=datetime.now(UTC),
            results_url="https://mergenix.com/analysis",
        )
        mock_send.assert_awaited_once()
        html_body = mock_send.call_args[0][2]  # positional arg: html
        # Raw HTML tags must NOT appear in the email body
        assert "<script>" not in html_body
        assert 'alert("xss")' not in html_body
        assert "<img src=x" not in html_body
        # Escaped versions should be present
        assert "&lt;script&gt;" in html_body
        assert "&lt;img" in html_body


# ── HTML Injection Escaping in Partner Notification (WARN-7) ──────────


@pytest.mark.asyncio
async def test_partner_notification_email_html_escaping() -> None:
    """send_partner_notification_email should escape HTML characters in analyzer_name."""
    from app.services.email_service import send_partner_notification_email

    with patch("app.services.email_service._send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True
        await send_partner_notification_email(
            to_email="partner@example.com",
            analyzer_name='<script>alert("xss")</script>',
            analysis_date=datetime.now(UTC),
        )
        mock_send.assert_awaited_once()
        html_body = mock_send.call_args[0][2]  # positional arg: html
        # Raw HTML tags must NOT appear in the email body
        assert "<script>" not in html_body
        assert 'alert("xss")' not in html_body
        # Escaped versions should be present
        assert "&lt;script&gt;" in html_body


# ── Webhook Pricing Validation for Upgrades (WARN-3) ──────────────────


@pytest.mark.asyncio
async def test_webhook_upgrade_amount_no_false_positive_warning(
    client: AsyncClient,
    premium_user: User,
    premium_auth_headers: dict[str, str],
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Webhook for Premium->Pro upgrade with 2000 cents should NOT trigger price mismatch warning."""
    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(premium_user.id),
                "metadata": {"tier": "pro", "user_id": str(premium_user.id)},
                "amount_total": 2000,
                "currency": "usd",
                "customer": "cus_upgrade",
                "payment_intent": "pi_upgrade_2000",
            },
        },
    }

    with caplog.at_level(logging.WARNING, logger="app.services.payment_service"):
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )
    assert response.status_code == 200

    # No price mismatch warning should be logged for a valid upgrade amount
    mismatch_warnings = [r for r in caplog.records if "Price mismatch" in r.message]
    assert len(mismatch_warnings) == 0, (
        f"False positive price mismatch warning for upgrade: {[r.message for r in mismatch_warnings]}"
    )


# ── Webhook Incorrect Amount (Price Mismatch Warning) ─────────────────


@pytest.mark.asyncio
async def test_webhook_incorrect_amount_triggers_mismatch_warning(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Webhook with 9999 cents for Premium should trigger a price mismatch warning."""
    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 9999,
                "currency": "usd",
                "customer": "cus_mismatch",
                "payment_intent": "pi_mismatch_test",
            },
        },
    }

    with caplog.at_level(logging.WARNING, logger="app.services.payment_service"):
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )
    assert response.status_code == 200

    # A price mismatch warning SHOULD be logged for 9999 cents (expected 1499)
    mismatch_warnings = [r for r in caplog.records if "Price mismatch" in r.message]
    assert len(mismatch_warnings) == 1, f"Expected exactly 1 price mismatch warning, got {len(mismatch_warnings)}"
    assert "9999" in mismatch_warnings[0].message
    assert "1499" in mismatch_warnings[0].message


# ── Webhook Email Non-Blocking (WARN-5) ───────────────────────────────


@pytest.mark.asyncio
async def test_webhook_receipt_email_is_non_blocking(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
) -> None:
    """Receipt email in webhook should be dispatched via BackgroundTasks (non-blocking)."""
    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1499,
                "currency": "usd",
                "customer": "cus_nonblock",
                "payment_intent": "pi_nonblock_test",
            },
        },
    }

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=fakesig"},
    )
    assert response.status_code == 200
    # BackgroundTasks dispatches the email after response — verify it was called
    mock_receipt_email.assert_awaited_once()


@pytest.mark.asyncio
async def test_receipt_email_not_sent_on_duplicate_payment(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
) -> None:
    """If the webhook is replayed (idempotent duplicate), receipt email should NOT be re-sent."""
    # First, create an existing payment with the same payment_intent to simulate duplicate
    # Set receipt_sent=True to indicate the receipt was already sent successfully
    existing_payment = Payment(
        user_id=test_user.id,
        stripe_customer_id="cus_dup",
        stripe_payment_intent="pi_duplicate_receipt",
        amount=1499,
        currency="usd",
        status="succeeded",
        tier_granted="premium",
        receipt_sent=True,
    )
    db_session.add(existing_payment)
    await db_session.commit()

    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "id": "evt_dup_receipt",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1499,
                "currency": "usd",
                "customer": "cus_dup",
                "payment_intent": "pi_duplicate_receipt",
            },
        },
    }

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=fakesig"},
    )
    assert response.status_code == 200

    # Receipt email should NOT have been sent for duplicate payment (receipt already sent)
    mock_receipt_email.assert_not_awaited()


# ── Issue 1: Consolidated tier/price constants ─────────────────────────


def test_payment_service_imports_tier_rank_from_constants() -> None:
    """payment_service should import TIER_RANK from constants.tiers, not define its own."""
    from app.constants.tiers import TIER_RANK as constants_tier_rank
    from app.services import payment_service

    # _TIER_RANK in payment_service should be the exact same object as TIER_RANK
    # from constants.tiers (imported, not duplicated)
    assert payment_service._TIER_RANK is constants_tier_rank


def test_payment_service_no_duplicate_expected_full_amounts() -> None:
    """_EXPECTED_FULL_AMOUNTS local dict should be removed; _TIER_PRICES should be used instead."""
    import inspect

    from app.services import payment_service

    source = inspect.getsource(payment_service.handle_webhook_event)
    # The local _EXPECTED_FULL_AMOUNTS dict should no longer exist
    assert "_EXPECTED_FULL_AMOUNTS" not in source


# ── Issue 2: BackgroundTasks for webhook email ────────────────────────


@pytest.mark.asyncio
async def test_webhook_uses_background_tasks_not_create_task(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
) -> None:
    """Webhook should use BackgroundTasks.add_task instead of asyncio.create_task."""
    import inspect

    from app.services import payment_service

    source = inspect.getsource(payment_service.handle_webhook_event)
    # asyncio.create_task should no longer be used
    assert "asyncio.create_task" not in source
    assert "create_task" not in source


@pytest.mark.asyncio
async def test_webhook_handle_event_accepts_background_tasks(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
) -> None:
    """handle_webhook_event should accept a background_tasks parameter."""
    import inspect

    from app.services import payment_service

    sig = inspect.signature(payment_service.handle_webhook_event)
    assert "background_tasks" in sig.parameters


# ── Issue 3: wipe_analysis_results in service layer ───────────────────


def test_wipe_analysis_results_in_account_service() -> None:
    """wipe_analysis_results should be importable from account_service."""
    from app.services.account_service import wipe_analysis_results

    assert callable(wipe_analysis_results)


def test_wipe_analysis_results_not_in_auth_router() -> None:
    """_wipe_analysis_results should no longer be defined in routers/auth.py."""
    import inspect

    from app.routers import auth

    source = inspect.getsource(auth)
    assert "async def _wipe_analysis_results" not in source


# ── Issue 4: Hoisted user query in webhook ────────────────────────────


def test_webhook_handler_single_user_query() -> None:
    """In handle_webhook_event, user should be queried only once (not duplicated)."""
    import inspect

    from app.services import payment_service

    source = inspect.getsource(payment_service.handle_webhook_event)
    # Count occurrences of "select(User).where(User.id ==" in the source
    user_query_count = source.count("select(User).where(User.id ==")
    assert user_query_count == 1, f"Expected exactly 1 user query, found {user_query_count}"


# ── Issue 5: Masked email in logs ─────────────────────────────────────


def test_mask_email_helper_exists() -> None:
    """_mask_email helper should exist in email_service."""
    from app.services.email_service import _mask_email

    assert callable(_mask_email)


def test_mask_email_basic() -> None:
    """_mask_email should mask the local part of an email, keeping first char."""
    from app.services.email_service import _mask_email

    assert _mask_email("test@example.com") == "t***@example.com"


def test_mask_email_single_char() -> None:
    """_mask_email with a single-char local part should still mask."""
    from app.services.email_service import _mask_email

    assert _mask_email("a@example.com") == "a***@example.com"


def test_mask_email_no_at_sign() -> None:
    """_mask_email with an invalid email (no @) should return '***'."""
    from app.services.email_service import _mask_email

    assert _mask_email("noemail") == "***"


def test_email_service_logs_masked_email() -> None:
    """_send function should use _mask_email in log statements."""
    import inspect

    from app.services import email_service

    source = inspect.getsource(email_service._send)
    assert "_mask_email" in source


def test_payment_service_logs_masked_email() -> None:
    """Receipt email error handler should use mask_email in log statements."""
    import inspect

    from app.services import payment_service

    source = inspect.getsource(payment_service._send_receipt_email)
    assert "mask_email" in source


# ── Issue 6: Dead send_tier_upgrade_email removed ─────────────────────


def test_send_tier_upgrade_email_removed() -> None:
    """send_tier_upgrade_email should no longer exist in email_service."""
    from app.services import email_service

    assert not hasattr(email_service, "send_tier_upgrade_email")


# ── Issue 7: payment_intent reference in receipt email ────────────────


@pytest.mark.asyncio
async def test_receipt_email_includes_reference() -> None:
    """send_purchase_receipt_email should accept and render a 'reference' parameter."""
    from app.services.email_service import send_purchase_receipt_email

    with patch("app.services.email_service._send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True
        await send_purchase_receipt_email(
            to_email="user@example.com",
            user_name="Test User",
            tier="premium",
            amount_cents=1499,
            payment_date=datetime.now(UTC),
            results_url="https://mergenix.com/analysis",
            reference="pi_abc123",
        )
        mock_send.assert_awaited_once()
        html_body = mock_send.call_args[0][2]
        # The reference should appear in the email HTML
        assert "pi_abc123" in html_body
        assert "Reference" in html_body


@pytest.mark.asyncio
async def test_webhook_passes_payment_intent_to_receipt_email(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
    mock_receipt_email,
) -> None:
    """Webhook should pass payment_intent as 'reference' to receipt email."""
    import asyncio

    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1499,
                "currency": "usd",
                "customer": "cus_ref_test",
                "payment_intent": "pi_ref_test_123",
            },
        },
    }

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=fakesig"},
    )
    assert response.status_code == 200

    # Give background tasks time to run
    await asyncio.sleep(0.05)

    mock_receipt_email.assert_awaited_once()
    call_kwargs = mock_receipt_email.call_args
    _, kwargs = call_kwargs
    assert kwargs["reference"] == "pi_ref_test_123"


# ── Issue 8: Generic Stripe error message ─────────────────────────────


@pytest.mark.asyncio
async def test_webhook_signature_error_generic_message(
    client: AsyncClient,
    mock_stripe: dict,
) -> None:
    """Webhook signature failure should return generic message, not Stripe's internal error."""
    from stripe import SignatureVerificationError

    mock_stripe["construct_event"].side_effect = SignatureVerificationError(
        "Detailed internal Stripe error text", sig_header="bad"
    )

    response = await client.post(
        "/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"Stripe-Signature": "t=123,v1=badsig"},
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    # Should NOT contain Stripe's internal error text
    assert "Detailed internal Stripe error text" not in detail.get("error", "")
    # Should be a generic message (router wraps all ValueError with "Webhook processing failed.")
    assert "webhook processing failed" in detail.get("error", "").lower()


# ── Issue 9: URL-encoded tokens in email URLs ─────────────────────────


@pytest.mark.asyncio
async def test_verification_email_url_encodes_token() -> None:
    """send_verification_email should URL-encode the token in the verify URL."""
    from app.services.email_service import send_verification_email

    with patch("app.services.email_service._send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True
        # Token with special chars that need encoding
        await send_verification_email("user@example.com", "abc+def/ghi=jkl")
        mock_send.assert_awaited_once()
        html_body = mock_send.call_args[0][2]
        # The raw token should NOT appear unencoded (+ would be present as %2B)
        assert "abc%2Bdef" in html_body
        assert "abc+def" not in html_body.split("href=")[1].split('"')[0] if "href=" in html_body else True


@pytest.mark.asyncio
async def test_password_reset_email_url_encodes_token() -> None:
    """send_password_reset_email should URL-encode the token in the reset URL."""
    from app.services.email_service import send_password_reset_email

    with patch("app.services.email_service._send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True
        await send_password_reset_email("user@example.com", "abc+def/ghi=jkl")
        mock_send.assert_awaited_once()
        html_body = mock_send.call_args[0][2]
        assert "abc%2Bdef" in html_body


# ── Issue 10: Escaped results_url in receipt email ────────────────────


@pytest.mark.asyncio
async def test_receipt_email_escapes_results_url() -> None:
    """send_purchase_receipt_email should HTML-escape results_url before injecting into href."""
    from app.services.email_service import send_purchase_receipt_email

    with patch("app.services.email_service._send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True
        malicious_url = 'https://example.com/analysis"><script>alert(1)</script>'
        await send_purchase_receipt_email(
            to_email="user@example.com",
            user_name="Test User",
            tier="premium",
            amount_cents=1499,
            payment_date=datetime.now(UTC),
            results_url=malicious_url,
            reference="pi_test",
        )
        mock_send.assert_awaited_once()
        html_body = mock_send.call_args[0][2]
        # Raw script tag should NOT be in the email
        assert "<script>" not in html_body
        # Escaped version should be present
        assert "&lt;script&gt;" in html_body or "&quot;" in html_body


# ── Fix 2: Configurable frontend paths in checkout URLs ────────────────


def test_checkout_success_url_uses_config_setting() -> None:
    """Checkout success URL should use a config-based path, not a hardcoded /payment/success."""
    import inspect

    from app.services import payment_service

    source = inspect.getsource(payment_service.create_checkout_session)
    # The hardcoded "/payment/success" string literal should be replaced with a
    # config setting reference (e.g., settings.payment_success_path)
    assert "/payment/success" not in source, (
        "checkout success URL should not hardcode '/payment/success' — "
        "it should use a config setting like settings.payment_success_path"
    )


def test_checkout_cancel_url_uses_config_setting() -> None:
    """Checkout cancel URL should use a config-based path, not a hardcoded /payment/cancel."""
    import inspect

    from app.services import payment_service

    source = inspect.getsource(payment_service.create_checkout_session)
    # The hardcoded "/payment/cancel" string literal should be replaced with a
    # config setting reference
    assert "/payment/cancel" not in source, (
        "checkout cancel URL should not hardcode '/payment/cancel' — "
        "it should use a config setting like settings.payment_cancel_path"
    )


def test_config_has_payment_url_paths() -> None:
    """Config should have payment_success_path and payment_cancel_path settings."""
    from app.config import Settings

    settings = Settings(
        jwt_secret="test",
        stripe_price_premium="p1",
        stripe_price_pro="p2",
    )
    assert hasattr(settings, "payment_success_path"), "Settings should have a payment_success_path attribute"
    assert hasattr(settings, "payment_cancel_path"), "Settings should have a payment_cancel_path attribute"
    # Defaults should match the current paths for backward compatibility
    assert settings.payment_success_path == "/payment/success"
    assert settings.payment_cancel_path == "/payment/cancel"


@pytest.mark.asyncio
async def test_checkout_uses_configured_success_path(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str],
    mock_stripe: dict,
) -> None:
    """Stripe checkout session should be created with success_url from config."""
    mock_stripe["create"].return_value = MagicMock(
        url="https://checkout.stripe.com/c/pay_test",
        id="cs_test_path_config",
    )

    response = await client.post(
        "/payments/checkout",
        headers=auth_headers,
        json={"tier": "premium"},
    )
    assert response.status_code == 201

    # Verify Stripe was called with the settings-based success URL
    call_kwargs = mock_stripe["create"].call_args
    _, kwargs = call_kwargs
    success_url = kwargs.get("success_url", "")
    # Should contain the default path (from config)
    assert "/payment/success" in success_url
    assert "session_id=" in success_url or "CHECKOUT_SESSION_ID" in success_url
