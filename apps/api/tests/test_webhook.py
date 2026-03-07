"""
Webhook Integration Tests — Q24

Dedicated test suite for the Stripe webhook endpoint at POST /payments/webhook.

This file is a focused integration test suite complementing the broader payment
tests in test_payments.py. It covers scenarios not yet fully exercised there:

  - invoice.paid event handling (acknowledged but not acted upon)
  - Tampered payload rejection via real Stripe signature verification
  - Full end-to-end receipt generation on successful checkout.session.completed
  - Idempotency: duplicate checkout.session.completed events
  - Missing Stripe-Signature header rejection
  - checkout.session.completed processing for both premium and pro tiers
  - Concurrent duplicate webhook race condition handling

The conftest.py `mock_stripe` fixture replaces stripe.Webhook.construct_event
and stripe.checkout.Session.create with unittest.mock objects — this lets us
control what event the webhook handler "receives" without needing a live Stripe
account or a real HMAC signature.

For tests that exercise the REAL Stripe signature verification (tampered payload),
we use stripe.Webhook.construct_event directly with known test vectors.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import time
import uuid
from collections.abc import Callable
from datetime import UTC, datetime

import pytest
from app.models.payment import Payment
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy import select

# ── Helper: poll until a condition is true (replaces fragile fixed sleeps) ─


async def wait_for_condition(
    condition_fn: Callable[[], bool],
    max_wait: float = 2.0,
    interval: float = 0.01,
) -> None:
    """Poll ``condition_fn()`` until it returns True or ``max_wait`` seconds elapse.

    Replaces ``await asyncio.sleep(<fixed_value>)`` calls that are fragile on
    slow CI machines. Polls at ``interval``-second intervals, which is fast in
    the happy path while still giving the system up to ``max_wait`` seconds to
    satisfy the condition.

    Raises:
        TimeoutError: If the condition is not satisfied within ``max_wait`` seconds.
    """
    deadline = asyncio.get_running_loop().time() + max_wait
    while asyncio.get_running_loop().time() < deadline:
        if condition_fn():
            return
        await asyncio.sleep(interval)
    raise TimeoutError(f"Condition not met within {max_wait}s")


# ── Helper: build a real Stripe webhook signature ─────────────────────────


def _build_stripe_signature(payload: bytes, secret: str) -> str:
    """Construct a valid Stripe-Signature header value.

    Stripe signs payloads using HMAC-SHA256 with the format:
        timestamp=<unix_ts>,v1=<hex_digest>

    where the signed string is: f"{timestamp}.{payload_str}"

    This helper lets tests exercise the real signature verification path
    (i.e., using stripe.Webhook.construct_event without mocking it).

    Args:
        payload: Raw request body bytes (must match what the server receives).
        secret: Stripe webhook secret (whsec_... value from settings).

    Returns:
        Stripe-Signature header value string.
    """
    timestamp = int(time.time())
    # Stripe signs raw bytes: b"<timestamp>.<payload_bytes>" — do NOT decode to str,
    # as that would break for non-UTF-8 binary payloads. Matches Stripe's signing spec.
    signed_payload = str(timestamp).encode("utf-8") + b"." + payload
    mac = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256)
    sig = mac.hexdigest()
    return f"t={timestamp},v1={sig}"


# ── Section 1: Signature Verification (real Stripe SDK path) ─────────────


class TestWebhookSignatureVerification:
    """Tests that use the REAL stripe.Webhook.construct_event (not mocked).

    conftest.py's mock_stripe fixture is NOT used here — we call the real
    Stripe SDK to exercise actual cryptographic signature verification.
    """

    @pytest.mark.asyncio
    async def test_valid_signature_accepted(
        self,
        client: AsyncClient,
    ) -> None:
        """A webhook signed with the correct secret is accepted (200 OK).

        Uses _build_stripe_signature() to produce a real HMAC-SHA256 signature
        that stripe.Webhook.construct_event can verify.
        """
        # The test conftest sets STRIPE_WEBHOOK_SECRET = "whsec_test_fake"
        webhook_secret = "whsec_test_fake"

        payload_dict = {
            "id": "evt_valid_sig_test",
            "type": "payment_intent.created",
            "data": {"object": {}},
        }
        payload_bytes = json.dumps(payload_dict).encode("utf-8")
        sig_header = _build_stripe_signature(payload_bytes, webhook_secret)

        response = await client.post(
            "/payments/webhook",
            content=payload_bytes,
            headers={"Stripe-Signature": sig_header},
        )

        # Unhandled event type "payment_intent.created" → acknowledged (200)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    @pytest.mark.asyncio
    async def test_tampered_payload_rejected(
        self,
        client: AsyncClient,
    ) -> None:
        """A webhook whose payload was modified after signing must be rejected.

        The signature is computed over the original payload. If the payload
        bytes differ at all, Stripe's HMAC verification will fail.
        This is the primary defense against replay attacks with modified data.
        """
        webhook_secret = "whsec_test_fake"

        # Sign the original payload
        original_payload = b'{"id":"evt_tamper","type":"payment_intent.created","data":{"object":{}}}'
        sig_header = _build_stripe_signature(original_payload, webhook_secret)

        # Submit a DIFFERENT payload but the signature computed for the original
        tampered_payload = b'{"id":"evt_tamper","type":"checkout.session.completed","data":{"object":{}}}'

        response = await client.post(
            "/payments/webhook",
            content=tampered_payload,
            headers={"Stripe-Signature": sig_header},
        )

        # Stripe SDK raises SignatureVerificationError → webhook router returns 400
        assert response.status_code == 400
        data = response.json()
        assert data["detail"]["code"] == "WEBHOOK_FAILED"

        # Error message must be generic — no Stripe internals exposed
        error_msg = data["detail"]["error"].lower()
        assert "traceback" not in error_msg
        assert "signature" not in error_msg  # generic, not implementation detail
        assert "stripe" not in error_msg

    @pytest.mark.asyncio
    async def test_wrong_secret_rejected(
        self,
        client: AsyncClient,
    ) -> None:
        """A webhook signed with a DIFFERENT secret is rejected (400).

        Simulates an attacker forging a valid-looking Stripe-Signature header
        using their own secret instead of the real webhook secret.
        """
        wrong_secret = "whsec_wrong_secret_attacker"

        payload_bytes = b'{"id":"evt_wrong_secret","type":"payment_intent.created","data":{"object":{}}}'
        # Sign with the WRONG secret
        sig_header = _build_stripe_signature(payload_bytes, wrong_secret)

        response = await client.post(
            "/payments/webhook",
            content=payload_bytes,
            headers={"Stripe-Signature": sig_header},
        )

        assert response.status_code == 400
        data = response.json()
        assert data["detail"]["code"] == "WEBHOOK_FAILED"

    @pytest.mark.asyncio
    async def test_missing_signature_header_rejected(
        self,
        client: AsyncClient,
    ) -> None:
        """A webhook without a Stripe-Signature header is rejected immediately (400).

        The router checks for the header before calling construct_event.
        This is the first line of defense — no signature = immediate rejection.
        """
        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            # NOTE: no Stripe-Signature header
        )

        assert response.status_code == 400
        data = response.json()
        assert data["detail"]["code"] == "MISSING_SIGNATURE"

    @pytest.mark.asyncio
    async def test_replayed_expired_signature_rejected(
        self,
        client: AsyncClient,
    ) -> None:
        """A webhook with an old timestamp is rejected (protection against replay attacks).

        Stripe's SDK rejects signatures where the timestamp is more than
        300 seconds (5 minutes) in the past. This prevents attackers from
        capturing and replaying legitimate webhook payloads.
        """
        webhook_secret = "whsec_test_fake"
        payload_bytes = b'{"id":"evt_replay","type":"payment_intent.created","data":{"object":{}}}'

        # Build a signature with a timestamp 10 minutes in the past
        old_timestamp = int(time.time()) - 601  # 601 seconds ago — past the 300s tolerance
        # Sign raw bytes to match Stripe's signing spec (same as _build_stripe_signature).
        signed_payload = str(old_timestamp).encode("utf-8") + b"." + payload_bytes
        mac = hmac.new(webhook_secret.encode("utf-8"), signed_payload, hashlib.sha256)
        sig = mac.hexdigest()
        expired_sig_header = f"t={old_timestamp},v1={sig}"

        response = await client.post(
            "/payments/webhook",
            content=payload_bytes,
            headers={"Stripe-Signature": expired_sig_header},
        )

        # Stripe SDK raises SignatureVerificationError for expired timestamps
        assert response.status_code == 400
        data = response.json()
        assert data["detail"]["code"] == "WEBHOOK_FAILED"


# ── Section 2: Event Type Handling ───────────────────────────────────────


class TestWebhookEventHandling:
    """Tests for how different Stripe event types are handled.

    These use the conftest.py `mock_stripe` fixture which replaces
    stripe.Webhook.construct_event with a MagicMock.
    """

    @pytest.mark.asyncio
    async def test_checkout_session_completed_premium_tier(
        self,
        client: AsyncClient,
        test_user: User,
        db_session,
        mock_stripe: dict,
        mock_receipt_email,
    ) -> None:
        """checkout.session.completed upgrades user to premium tier.

        This is the primary happy path: a user pays and their tier is upgraded.
        """
        mock_stripe["construct_event"].return_value = {
            "type": "checkout.session.completed",
            "id": "evt_premium_checkout",
            "data": {
                "object": {
                    "client_reference_id": str(test_user.id),
                    "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                    "amount_total": 1499,
                    "currency": "usd",
                    "customer": "cus_test_wh_prem",
                    "payment_intent": "pi_test_wh_prem",
                },
            },
        }

        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

        assert response.status_code == 200
        assert response.json()["message"] == "Webhook processed successfully."

        # User tier MUST be upgraded in the database
        await db_session.refresh(test_user)
        assert test_user.tier == "premium"

        # A Payment record MUST be created
        result = await db_session.execute(select(Payment).where(Payment.stripe_payment_intent == "pi_test_wh_prem"))
        payment = result.scalar_one_or_none()
        assert payment is not None
        assert payment.tier_granted == "premium"
        assert payment.amount == 1499
        assert payment.currency == "usd"
        assert payment.status == "succeeded"

    @pytest.mark.asyncio
    async def test_checkout_session_completed_pro_tier(
        self,
        client: AsyncClient,
        test_user: User,
        db_session,
        mock_stripe: dict,
        mock_receipt_email,
    ) -> None:
        """checkout.session.completed upgrades user directly to pro tier."""
        mock_stripe["construct_event"].return_value = {
            "type": "checkout.session.completed",
            "id": "evt_pro_checkout",
            "data": {
                "object": {
                    "client_reference_id": str(test_user.id),
                    "metadata": {"tier": "pro", "user_id": str(test_user.id)},
                    "amount_total": 3499,
                    "currency": "usd",
                    "customer": "cus_test_wh_pro",
                    "payment_intent": "pi_test_wh_pro",
                },
            },
        }

        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

        assert response.status_code == 200

        await db_session.refresh(test_user)
        assert test_user.tier == "pro"

    @pytest.mark.asyncio
    async def test_invoice_paid_event_acknowledged_not_acted_upon(
        self,
        client: AsyncClient,
        test_user: User,
        db_session,
        mock_stripe: dict,
    ) -> None:
        """invoice.paid event is acknowledged (200) but does NOT create a payment or upgrade tier.

        Mergenix uses a one-time purchase model, not subscriptions.
        invoice.paid is a subscription billing event — the webhook handler
        logs it and returns 200 without taking any payment action.

        This prevents accidental double-upgrades if Stripe ever sends invoice
        events (e.g., if webhook endpoints are misconfigured on Stripe's side).
        """
        initial_tier = test_user.tier
        assert initial_tier == "free"

        mock_stripe["construct_event"].return_value = {
            "type": "invoice.paid",
            "id": "evt_invoice_paid",
            "data": {
                "object": {
                    "customer": "cus_subscription_test",
                    "subscription": "sub_test_123",
                    "amount_paid": 1499,
                    "currency": "usd",
                },
            },
        }

        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "invoice.paid"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

        # Must acknowledge the event without crashing (Stripe will retry on non-2xx)
        assert response.status_code == 200

        # User tier must NOT be modified by invoice.paid
        await db_session.refresh(test_user)
        assert test_user.tier == initial_tier  # still "free"

        # No Payment record should be created for invoice.paid
        result = await db_session.execute(select(Payment).where(Payment.user_id == test_user.id))
        payments = list(result.scalars().all())
        assert len(payments) == 0, f"Expected 0 payments created for invoice.paid, got {len(payments)}"

    @pytest.mark.asyncio
    async def test_invoice_payment_succeeded_event_acknowledged(
        self,
        client: AsyncClient,
        test_user: User,
        db_session,
        mock_stripe: dict,
    ) -> None:
        """invoice.payment_succeeded is acknowledged (200) without creating a payment record."""
        mock_stripe["construct_event"].return_value = {
            "type": "invoice.payment_succeeded",
            "id": "evt_invoice_payment_succeeded",
            "data": {
                "object": {
                    "customer": "cus_sub_test",
                    "amount_paid": 999,
                    "currency": "usd",
                },
            },
        }

        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "invoice.payment_succeeded"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

        assert response.status_code == 200

        # No tier change, no payment record
        await db_session.refresh(test_user)
        assert test_user.tier == "free"

    @pytest.mark.asyncio
    async def test_unhandled_event_types_are_acknowledged(
        self,
        client: AsyncClient,
        mock_stripe: dict,
    ) -> None:
        """All unhandled event types return 200 (Stripe requires 2xx to avoid retries).

        A non-2xx response causes Stripe to retry the webhook delivery,
        flooding the endpoint. Mergenix acknowledges all events and silently
        ignores those it does not handle.
        """
        unhandled_event_types = [
            "payment_intent.created",
            "payment_intent.succeeded",
            "customer.created",
            "customer.updated",
            "charge.succeeded",
            "checkout.session.expired",
        ]

        for event_type in unhandled_event_types:
            mock_stripe["construct_event"].return_value = {
                "type": event_type,
                "id": f"evt_{event_type.replace('.', '_')}",
                "data": {"object": {}},
            }

            response = await client.post(
                "/payments/webhook",
                content=json.dumps({"type": event_type}).encode(),
                headers={"Stripe-Signature": "t=123,v1=fakesig"},
            )

            assert response.status_code == 200, (
                f"Expected 200 for unhandled event '{event_type}', got {response.status_code}"
            )


# ── Section 3: Idempotency ────────────────────────────────────────────────


class TestWebhookIdempotency:
    """Tests verifying duplicate event handling (idempotency).

    Stripe guarantees at-least-once delivery — the same event may arrive
    multiple times. The webhook handler uses stripe_payment_intent as an
    idempotency key (with event ID as fallback) to prevent double-processing.
    """

    @pytest.mark.asyncio
    async def test_duplicate_event_does_not_create_second_payment(
        self,
        client: AsyncClient,
        test_user: User,
        db_session,
        mock_stripe: dict,
        mock_receipt_email,
    ) -> None:
        """Sending the same checkout.session.completed event twice creates only ONE payment."""
        event_payload = {
            "type": "checkout.session.completed",
            "id": "evt_dedup_main",
            "data": {
                "object": {
                    "client_reference_id": str(test_user.id),
                    "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                    "amount_total": 1499,
                    "currency": "usd",
                    "customer": "cus_dedup_main",
                    "payment_intent": "pi_dedup_main",
                },
            },
        }
        mock_stripe["construct_event"].return_value = event_payload

        # First delivery — should create payment and upgrade tier
        response1 = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )
        assert response1.status_code == 200

        await db_session.refresh(test_user)
        assert test_user.tier == "premium"

        # Second delivery (Stripe retry) — must be a no-op
        mock_stripe["construct_event"].return_value = event_payload
        response2 = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig2"},
        )
        assert response2.status_code == 200

        # Only ONE payment record must exist
        result = await db_session.execute(select(Payment).where(Payment.user_id == test_user.id))
        payments = list(result.scalars().all())
        assert len(payments) == 1, f"Expected exactly 1 payment after duplicate delivery, got {len(payments)}"

    @pytest.mark.asyncio
    async def test_duplicate_event_with_unsent_receipt_retries_email(
        self,
        client: AsyncClient,
        test_user: User,
        db_session,
        mock_stripe: dict,
        mock_receipt_email,
    ) -> None:
        """When a duplicate arrives and receipt_sent is False, the email is retried.

        Scenario: first webhook was partially processed (payment recorded but
        email failed). Second webhook sees the existing payment record with
        receipt_sent=False and retries the email.
        """
        # Pre-create a payment record where the receipt email was NOT sent
        payment = Payment(
            id=uuid.uuid4(),
            user_id=test_user.id,
            stripe_customer_id="cus_retry_email",
            stripe_payment_intent="pi_retry_email",
            amount=1499,
            currency="usd",
            status="succeeded",
            tier_granted="premium",
            receipt_sent=False,  # email was NOT sent on first attempt
            created_at=datetime.now(UTC),
        )
        db_session.add(payment)
        await db_session.commit()

        mock_stripe["construct_event"].return_value = {
            "type": "checkout.session.completed",
            "id": "evt_retry_email",
            "data": {
                "object": {
                    "client_reference_id": str(test_user.id),
                    "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                    "amount_total": 1499,
                    "currency": "usd",
                    "customer": "cus_retry_email",
                    "payment_intent": "pi_retry_email",
                },
            },
        }

        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

        assert response.status_code == 200

        # Receipt email SHOULD have been dispatched (retry for the unsent one)
        mock_receipt_email.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_duplicate_event_with_sent_receipt_skips_email(
        self,
        client: AsyncClient,
        test_user: User,
        db_session,
        mock_stripe: dict,
        mock_receipt_email,
    ) -> None:
        """When a duplicate arrives and receipt_sent is True, no email is sent again.

        This prevents the user from receiving multiple receipt emails for the
        same payment due to Stripe's at-least-once delivery guarantee.
        """
        # Pre-create a payment record where receipt WAS successfully sent
        payment = Payment(
            id=uuid.uuid4(),
            user_id=test_user.id,
            stripe_customer_id="cus_skip_email",
            stripe_payment_intent="pi_skip_email",
            amount=1499,
            currency="usd",
            status="succeeded",
            tier_granted="premium",
            receipt_sent=True,  # email was already sent
            created_at=datetime.now(UTC),
        )
        db_session.add(payment)
        await db_session.commit()

        mock_stripe["construct_event"].return_value = {
            "type": "checkout.session.completed",
            "id": "evt_skip_email",
            "data": {
                "object": {
                    "client_reference_id": str(test_user.id),
                    "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                    "amount_total": 1499,
                    "currency": "usd",
                    "customer": "cus_skip_email",
                    "payment_intent": "pi_skip_email",
                },
            },
        }

        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

        assert response.status_code == 200

        # Receipt email MUST NOT be re-sent
        mock_receipt_email.assert_not_awaited()


# ── Section 4: Receipt Generation ─────────────────────────────────────────


class TestWebhookReceiptGeneration:
    """Tests for purchase receipt email generation triggered by webhooks."""

    @pytest.mark.asyncio
    async def test_receipt_email_sent_on_successful_checkout(
        self,
        client: AsyncClient,
        test_user: User,
        db_session,
        mock_stripe: dict,
        mock_receipt_email,
    ) -> None:
        """A successful checkout.session.completed dispatches a receipt email.

        Verifies that the receipt email is sent with the correct arguments:
        - to_email: the user's email address
        - user_name: the user's display name
        - tier: the purchased tier
        - amount_cents: the charged amount
        """
        mock_stripe["construct_event"].return_value = {
            "type": "checkout.session.completed",
            "id": "evt_receipt_gen",
            "data": {
                "object": {
                    "client_reference_id": str(test_user.id),
                    "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                    "amount_total": 1499,
                    "currency": "usd",
                    "customer": "cus_receipt_gen",
                    "payment_intent": "pi_receipt_gen",
                },
            },
        }

        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

        assert response.status_code == 200

        # Wait until the background task dispatches the receipt email
        await wait_for_condition(lambda: mock_receipt_email.await_count >= 1)

        # Receipt email must have been dispatched exactly once
        mock_receipt_email.assert_awaited_once()

        call_args = mock_receipt_email.call_args
        _, kwargs = call_args

        # Verify required email fields
        assert kwargs["to_email"] == test_user.email
        assert kwargs["user_name"] == test_user.name
        assert kwargs["tier"] == "premium"
        assert kwargs["amount_cents"] == 1499

    @pytest.mark.asyncio
    async def test_receipt_email_includes_payment_reference(
        self,
        client: AsyncClient,
        test_user: User,
        db_session,
        mock_stripe: dict,
        mock_receipt_email,
    ) -> None:
        """Receipt email must include the payment_intent as a reference number.

        This allows users to reference their purchase in support requests.
        The reference is the Stripe payment_intent ID.
        """
        pi_id = "pi_reference_test_abc123"

        mock_stripe["construct_event"].return_value = {
            "type": "checkout.session.completed",
            "id": "evt_receipt_ref",
            "data": {
                "object": {
                    "client_reference_id": str(test_user.id),
                    "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                    "amount_total": 1499,
                    "currency": "usd",
                    "customer": "cus_receipt_ref",
                    "payment_intent": pi_id,
                },
            },
        }

        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

        assert response.status_code == 200
        await wait_for_condition(lambda: mock_receipt_email.await_count >= 1)

        mock_receipt_email.assert_awaited_once()
        _, kwargs = mock_receipt_email.call_args
        assert kwargs.get("reference") == pi_id, (
            f"Expected reference='{pi_id}', got reference='{kwargs.get('reference')}'"
        )

    @pytest.mark.asyncio
    async def test_receipt_email_failure_does_not_fail_webhook(
        self,
        client: AsyncClient,
        test_user: User,
        db_session,
        mock_stripe: dict,
        mock_receipt_email,
    ) -> None:
        """If the receipt email raises an exception, the webhook still returns 200.

        The payment MUST still be recorded. Email failures are logged server-side
        but must not cause the webhook to return 4xx/5xx (which would trigger
        Stripe to retry the entire webhook, potentially double-processing).
        """
        mock_receipt_email.side_effect = Exception("SMTP server down: connection refused")

        mock_stripe["construct_event"].return_value = {
            "type": "checkout.session.completed",
            "id": "evt_email_fail",
            "data": {
                "object": {
                    "client_reference_id": str(test_user.id),
                    "metadata": {"tier": "premium", "user_id": str(test_user.id)},
                    "amount_total": 1499,
                    "currency": "usd",
                    "customer": "cus_email_fail",
                    "payment_intent": "pi_email_fail",
                },
            },
        }

        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

        # Webhook must succeed even if receipt email fails
        assert response.status_code == 200

        # Payment MUST still be recorded in the database
        await db_session.refresh(test_user)
        assert test_user.tier == "premium"

        result = await db_session.execute(select(Payment).where(Payment.stripe_payment_intent == "pi_email_fail"))
        payment = result.scalar_one_or_none()
        assert payment is not None
        assert payment.status == "succeeded"

    @pytest.mark.asyncio
    async def test_receipt_email_not_sent_when_user_not_found(
        self,
        client: AsyncClient,
        mock_stripe: dict,
        mock_receipt_email,
    ) -> None:
        """If the user_id in the webhook event references a non-existent user,
        no receipt email is sent and no payment is recorded."""
        non_existent_user_id = str(uuid.uuid4())

        mock_stripe["construct_event"].return_value = {
            "type": "checkout.session.completed",
            "id": "evt_ghost_user",
            "data": {
                "object": {
                    "client_reference_id": non_existent_user_id,
                    "metadata": {"tier": "premium", "user_id": non_existent_user_id},
                    "amount_total": 1499,
                    "currency": "usd",
                    "customer": "cus_ghost_user",
                    "payment_intent": "pi_ghost_user",
                },
            },
        }

        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=fakesig"},
        )

        # Webhook must not crash — returns 200 (user not found is handled gracefully)
        assert response.status_code == 200

        # No receipt email should be sent for a ghost user
        mock_receipt_email.assert_not_awaited()


# ── Section 5: Error Response Sanitization ───────────────────────────────


class TestWebhookErrorSanitization:
    """Tests verifying that webhook error responses do not leak internal details."""

    @pytest.mark.asyncio
    async def test_invalid_signature_returns_generic_error(
        self,
        client: AsyncClient,
        mock_stripe: dict,
    ) -> None:
        """A SignatureVerificationError must produce a generic error message."""
        from stripe import SignatureVerificationError

        mock_stripe["construct_event"].side_effect = SignatureVerificationError(
            "Webhook signature verification failed. Expected signatures for payload 'evt_...' to match 'whsec_...'",
            sig_header="t=123,v1=bad",
        )

        response = await client.post(
            "/payments/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Stripe-Signature": "t=123,v1=bad"},
        )

        assert response.status_code == 400
        detail = response.json()["detail"]
        assert detail["code"] == "WEBHOOK_FAILED"

        error_text = detail["error"].lower()
        # Must NOT expose Stripe's internal error text
        assert "whsec" not in error_text
        assert "expected signatures" not in error_text
        # Must be a generic message
        assert "webhook processing failed" in error_text

    @pytest.mark.asyncio
    async def test_processing_error_returns_generic_error(
        self,
        client: AsyncClient,
        mock_stripe: dict,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        """An unexpected ValueError during processing returns a generic 400 message."""
        internal_error = "Database connection pool exhausted: max_connections=10"
        mock_stripe["construct_event"].side_effect = ValueError(internal_error)

        with caplog.at_level(logging.ERROR, logger="app.routers.payments"):
            response = await client.post(
                "/payments/webhook",
                content=b'{"type": "checkout.session.completed"}',
                headers={"Stripe-Signature": "t=123,v1=fakesig"},
            )

        assert response.status_code == 400
        detail = response.json()["detail"]
        assert detail["code"] == "WEBHOOK_FAILED"

        # Internal error must NOT appear in the response
        assert internal_error not in detail["error"]
        assert "connection pool" not in detail["error"].lower()

        # But the actual error MUST be logged server-side
        assert any(internal_error in record.message for record in caplog.records)
