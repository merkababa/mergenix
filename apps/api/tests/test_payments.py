"""
Tests for the payment endpoints.

Covers Stripe checkout creation, webhook processing, payment history,
subscription status, and webhook idempotency edge cases.
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


# ── Webhook Idempotency Edge Cases ───────────────────────────────────────


@pytest.mark.asyncio
async def test_webhook_idempotent_replay_retries_unsent_receipt(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
) -> None:
    """When a duplicate webhook arrives and receipt_sent is False, the email should be retried.

    Simulates the scenario where the first webhook committed the payment but
    crashed before sending the receipt email. The idempotent replay should
    detect the unsent receipt and retry the email.
    """
    # Pre-create a payment record with receipt_sent=False (simulating crash after commit)
    payment = Payment(
        id=uuid.uuid4(),
        user_id=test_user.id,
        stripe_customer_id="cus_replay",
        stripe_payment_intent="pi_replay_test",
        amount=1290,
        currency="usd",
        status="succeeded",
        tier_granted="premium",
        receipt_sent=False,
        created_at=datetime.now(UTC),
    )
    db_session.add(payment)
    await db_session.commit()

    # Set up the webhook event that matches the existing payment_intent
    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1290,
                "currency": "usd",
                "customer": "cus_replay",
                "payment_intent": "pi_replay_test",
            },
        },
    }

    with patch(
        "app.services.payment_service.send_tier_upgrade_email",
        new_callable=AsyncMock,
        return_value=True,
    ) as mock_email:
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

    assert response.status_code == 200

    # The email should have been retried
    mock_email.assert_called_once_with(test_user.email, "premium")

    # receipt_sent should now be True
    await db_session.refresh(payment)
    assert payment.receipt_sent is True


@pytest.mark.asyncio
async def test_webhook_idempotent_replay_skips_already_sent_receipt(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
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

    with patch(
        "app.services.payment_service.send_tier_upgrade_email",
        new_callable=AsyncMock,
        return_value=True,
    ) as mock_email:
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

    assert response.status_code == 200

    # The email should NOT have been sent (already sent on first attempt)
    mock_email.assert_not_called()


@pytest.mark.asyncio
async def test_webhook_successful_payment_sets_receipt_sent(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
) -> None:
    """A successful first-time webhook should set receipt_sent=True after sending the email."""
    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1290,
                "currency": "usd",
                "customer": "cus_new_payment",
                "payment_intent": "pi_new_payment",
            },
        },
    }

    with patch(
        "app.services.payment_service.send_tier_upgrade_email",
        new_callable=AsyncMock,
        return_value=True,
    ) as mock_email:
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

    assert response.status_code == 200

    # The email should have been sent
    mock_email.assert_called_once_with(test_user.email, "premium")

    # Verify the payment record has receipt_sent=True
    result = await db_session.execute(
        select(Payment).where(Payment.stripe_payment_intent == "pi_new_payment")
    )
    payment = result.scalar_one()
    assert payment.receipt_sent is True
    assert payment.status == "succeeded"


@pytest.mark.asyncio
async def test_webhook_receipt_send_failure_leaves_flag_false(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
) -> None:
    """If the email send fails, receipt_sent should remain False so it can be retried."""
    mock_stripe["construct_event"].return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(test_user.id),
                "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                "amount_total": 1290,
                "currency": "usd",
                "customer": "cus_email_fail",
                "payment_intent": "pi_email_fail",
            },
        },
    }

    with patch(
        "app.services.payment_service.send_tier_upgrade_email",
        new_callable=AsyncMock,
        return_value=False,  # Email send failed
    ):
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

    assert response.status_code == 200

    # Payment should still be recorded
    result = await db_session.execute(
        select(Payment).where(Payment.stripe_payment_intent == "pi_email_fail")
    )
    payment = result.scalar_one()
    assert payment.status == "succeeded"
    # receipt_sent should be False since the email failed
    assert payment.receipt_sent is False


@pytest.mark.asyncio
async def test_webhook_none_payment_intent_rejects(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
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
    result = await db_session.execute(
        select(Payment).where(Payment.user_id == test_user.id)
    )
    payments = list(result.scalars().all())
    assert len(payments) == 0

    # Should have logged a warning about the missing payment_intent
    assert any("payment_intent" in record.message.lower() or "idempotency" in record.message.lower() for record in caplog.records)


@pytest.mark.asyncio
async def test_webhook_none_payment_intent_uses_event_id_fallback(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
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

    with patch(
        "app.services.payment_service.send_tier_upgrade_email",
        new_callable=AsyncMock,
        return_value=True,
    ):
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

    assert response.status_code == 200

    # Payment should be created with the event ID as the stripe_payment_intent
    result = await db_session.execute(
        select(Payment).where(Payment.user_id == test_user.id)
    )
    payment = result.scalar_one()
    assert payment.stripe_payment_intent == "evt_fallback_123"
    assert payment.tier_granted == "premium"


@pytest.mark.asyncio
async def test_webhook_none_payment_intent_event_id_dedup(
    client: AsyncClient,
    test_user: User,
    db_session,
    mock_stripe: dict,
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

    with patch(
        "app.services.payment_service.send_tier_upgrade_email",
        new_callable=AsyncMock,
        return_value=True,
    ) as mock_email:
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

    assert response.status_code == 200

    # Should not create a duplicate payment
    result = await db_session.execute(
        select(Payment).where(Payment.user_id == test_user.id)
    )
    payments = list(result.scalars().all())
    assert len(payments) == 1

    # Should not re-send receipt (already sent)
    mock_email.assert_not_called()


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
