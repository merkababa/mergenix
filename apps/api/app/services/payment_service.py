"""
Payment service — Stripe checkout creation, webhook handling,
and payment history retrieval.
"""

from __future__ import annotations

import asyncio
import logging
import uuid

import stripe
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.constants.tiers import TIER_PREMIUM, TIER_PRICES, TIER_PRO
from app.models.payment import Payment
from app.models.user import User
from app.services.email_service import send_tier_upgrade_email

logger = logging.getLogger(__name__)

settings = get_settings()

# Price ID mapping for the two paid tiers
_PRICE_MAP: dict[str, str] = {
    TIER_PREMIUM: settings.stripe_price_premium,
    TIER_PRO: settings.stripe_price_pro,
}


async def create_checkout_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    tier: str,
) -> tuple[str, str]:
    """Create a Stripe Checkout session for a tier upgrade.

    Args:
        db: Active async database session.
        user_id: The authenticated user's UUID.
        tier: Target tier ('premium' or 'pro').

    Returns:
        Tuple of (checkout_url, session_id).

    Raises:
        ValueError: If the tier is invalid or the price ID is not configured.
        stripe.StripeError: On Stripe API failure.
    """
    price_id = _PRICE_MAP.get(tier)
    if not price_id:
        raise ValueError(f"Invalid tier or unconfigured price: {tier}")

    # Look up the user's email for the checkout session
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise ValueError("User not found.")

    stripe.api_key = settings.stripe_secret_key

    session = await asyncio.to_thread(
        stripe.checkout.Session.create,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="payment",
        success_url=f"{settings.frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.frontend_url}/payment/cancel",
        client_reference_id=str(user_id),
        customer_email=user.email,
        metadata={"tier": tier, "user_id": str(user_id)},
    )

    logger.info(
        "Created Stripe checkout session %s for user %s (tier=%s)",
        session.id,
        user_id,
        tier,
    )

    return session.url, session.id


async def handle_webhook_event(
    db: AsyncSession,
    payload: bytes,
    signature: str,
) -> None:
    """Verify and process a Stripe webhook event.

    Handles ``checkout.session.completed`` to record the payment and
    upgrade the user's tier.

    Args:
        db: Active async database session.
        payload: Raw request body bytes.
        signature: Stripe-Signature header value.

    Raises:
        ValueError: If signature verification fails or payload is invalid.
    """
    stripe.api_key = settings.stripe_secret_key

    try:
        event = await asyncio.to_thread(
            stripe.Webhook.construct_event,
            payload,
            signature,
            settings.stripe_webhook_secret,
        )
    except stripe.SignatureVerificationError as exc:
        raise ValueError(f"Invalid Stripe webhook signature: {exc}") from exc

    if event["type"] == "checkout.session.completed":
        session_obj = event["data"]["object"]
        user_id_str = session_obj.get("client_reference_id") or session_obj.get("metadata", {}).get("user_id")
        tier = session_obj.get("metadata", {}).get("tier", TIER_PREMIUM)
        amount = session_obj.get("amount_total", 0)
        currency = session_obj.get("currency", "usd")
        customer_id = session_obj.get("customer")

        if not user_id_str:
            logger.error("Webhook checkout.session.completed missing user_id")
            return

        # Defense-in-depth: validate that the charged amount matches expected
        # pricing for the granted tier. Log a warning on mismatch but still
        # process the payment (taxes or currency conversions may cause drift).
        # Derived from TIER_PRICES (single source of truth in constants/tiers.py).
        _expected_amounts = {t: data["monthly"] for t, data in TIER_PRICES.items()}
        expected = _expected_amounts.get(tier)
        if expected is not None and amount != expected:
            logger.warning(
                "Price mismatch for tier %s: expected %d cents, got %d cents (user %s)",
                tier,
                expected,
                amount,
                user_id_str,
            )

        user_id = uuid.UUID(user_id_str)

        # Verify the user exists before recording the payment
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            logger.warning("User %s not found during webhook processing", user_id)
            return

        # Determine the idempotency key: prefer payment_intent, fall back to event ID
        payment_intent_id = session_obj.get("payment_intent")
        event_id = event.get("id")
        idempotency_key = payment_intent_id or event_id

        if not idempotency_key:
            logger.warning(
                "Webhook for user %s has no payment_intent and no event ID — "
                "rejecting to prevent duplicate payments (no idempotency key)",
                user_id,
            )
            return

        if not payment_intent_id and event_id:
            logger.warning(
                "Webhook for user %s has no payment_intent — "
                "using Stripe event ID %s as idempotency fallback",
                user_id,
                event_id,
            )

        # Idempotency: check if a payment with this key already exists
        existing_result = await db.execute(
            select(Payment).where(Payment.stripe_payment_intent == idempotency_key)
        )
        existing_payment = existing_result.scalar_one_or_none()

        if existing_payment is not None:
            # Duplicate webhook — but check if we need to retry the receipt email
            if not existing_payment.receipt_sent:
                logger.info(
                    "Duplicate webhook for %s — retrying unsent receipt email for user %s",
                    idempotency_key,
                    user_id,
                )
                email_sent = await send_tier_upgrade_email(user.email, tier)
                if email_sent:
                    existing_payment.receipt_sent = True
                    await db.commit()
            else:
                logger.info("Duplicate webhook for %s — skipping (receipt already sent)", idempotency_key)
            return

        # Record the payment (wrapped in IntegrityError handling for race conditions
        # between concurrent webhook deliveries hitting the unique constraint)
        payment = Payment(
            user_id=user_id,
            stripe_customer_id=customer_id,
            stripe_payment_intent=idempotency_key,
            amount=amount,
            currency=currency,
            status="succeeded",
            tier_granted=tier,
        )
        db.add(payment)

        # Upgrade the user's tier
        user.tier = tier
        logger.info("Upgraded user %s to tier %s", user_id, tier)

        try:
            await db.commit()
        except IntegrityError:
            # Race condition: another concurrent webhook already inserted this payment.
            # Roll back and treat it as a duplicate (the other request handled it).
            await db.rollback()
            logger.info(
                "Concurrent duplicate for %s — another webhook already recorded this payment",
                idempotency_key,
            )
            return

        # Send receipt email AFTER the payment is committed
        email_sent = await send_tier_upgrade_email(user.email, tier)
        if email_sent:
            payment.receipt_sent = True
            await db.commit()

    else:
        logger.info("Ignoring unhandled Stripe event type: %s", event["type"])


async def get_payment_history(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[Payment]:
    """Retrieve all payments for a user, newest first.

    Args:
        db: Active async database session.
        user_id: The user's UUID.

    Returns:
        List of Payment model instances ordered by created_at descending.
    """
    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
    )
    return list(result.scalars().all())
