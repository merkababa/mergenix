"""
Payment service — Stripe checkout creation, webhook handling,
and payment history retrieval.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import UTC, datetime

import stripe
from fastapi import BackgroundTasks
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.constants.tiers import TIER_PREMIUM, TIER_PRICES, TIER_PRO
from app.constants.tiers import TIER_RANK as _TIER_RANK
from app.models.payment import Payment
from app.models.user import User
from app.services.email_service import send_purchase_receipt_email
from app.utils.masking import mask_email

logger = logging.getLogger(__name__)

settings = get_settings()

# ---------------------------------------------------------------------------
# Lazy Stripe API key initialisation (F4: set once, not per-call)
# ---------------------------------------------------------------------------

_stripe_api_key_set = False


def _ensure_stripe_api_key() -> None:
    """Set stripe.api_key lazily from settings (idempotent)."""
    global _stripe_api_key_set  # noqa: PLW0603
    if _stripe_api_key_set:
        return
    stripe.api_key = settings.stripe_secret_key
    _stripe_api_key_set = True


# ---------------------------------------------------------------------------
# Price map (F9: function instead of frozen module-level dict)
# ---------------------------------------------------------------------------


def _get_price_map() -> dict[str, str]:
    """Return a Stripe price ID map, reading from settings dynamically.

    This allows tests to mock settings without needing to patch a
    module-level dict that was frozen at import time.
    """
    return {
        TIER_PREMIUM: settings.stripe_price_premium,
        TIER_PRO: settings.stripe_price_pro,
    }


# Flat tier → cents map derived from the centralized TIER_PRICES constant.
# Used for upgrade difference calculations in create_checkout_session.
_TIER_PRICES: dict[str, int] = {t: data["amount"] for t, data in TIER_PRICES.items()}


async def create_checkout_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    tier: str,
) -> tuple[str, str]:
    """Create a Stripe Checkout session for a tier upgrade.

    If the user is upgrading from Premium to Pro, charges only the
    difference ($20.00 = 2000 cents) instead of the full Pro price.

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
    price_map = _get_price_map()
    price_id = price_map.get(tier)
    if not price_id:
        raise ValueError(f"Invalid tier or unconfigured price: {tier}")

    # Look up the user's email and current tier for the checkout session
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise ValueError("User not found.")

    _ensure_stripe_api_key()

    # Determine if this is an upgrade (Premium → Pro) and calculate the amount
    is_upgrade = (
        user.tier == "premium"
        and tier == "pro"
        and _TIER_RANK.get(user.tier, 0) < _TIER_RANK.get(tier, 0)
    )

    if is_upgrade:
        # Charge the difference: Pro price - Premium price
        current_price = _TIER_PRICES.get(user.tier, 0)
        target_price = _TIER_PRICES.get(tier, 0)
        upgrade_amount = target_price - current_price

        line_items = [
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": upgrade_amount,
                    "product_data": {
                        "name": f"Upgrade: {user.tier.capitalize()} → {tier.capitalize()}",
                        "description": f"Upgrade from {user.tier.capitalize()} to {tier.capitalize()} tier",
                    },
                },
                "quantity": 1,
            }
        ]
    else:
        # Full price via Stripe Price ID
        line_items = [{"price": price_id, "quantity": 1}]

    session = await asyncio.to_thread(
        stripe.checkout.Session.create,
        payment_method_types=["card"],
        line_items=line_items,
        mode="payment",
        success_url=f"{settings.frontend_url}{settings.payment_success_path}?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.frontend_url}{settings.payment_cancel_path}",
        client_reference_id=str(user_id),
        customer_email=user.email,
        metadata={"tier": tier, "user_id": str(user_id)},
    )

    logger.info(
        "Created Stripe checkout session %s for user %s (tier=%s, upgrade=%s)",
        session.id,
        user_id,
        tier,
        is_upgrade,
    )

    return session.url, session.id


async def handle_webhook_event(
    db: AsyncSession,
    payload: bytes,
    signature: str,
    background_tasks: BackgroundTasks | None = None,
) -> None:
    """Verify and process a Stripe webhook event.

    Handles ``checkout.session.completed`` to record the payment and
    upgrade the user's tier.

    Args:
        db: Active async database session.
        payload: Raw request body bytes.
        signature: Stripe-Signature header value.
        background_tasks: FastAPI BackgroundTasks for non-blocking email dispatch.

    Raises:
        ValueError: If signature verification fails or payload is invalid.
    """
    _ensure_stripe_api_key()

    try:
        event = await asyncio.to_thread(
            stripe.Webhook.construct_event,
            payload,
            signature,
            settings.stripe_webhook_secret,
        )
    except stripe.SignatureVerificationError as exc:
        raise ValueError("Webhook signature verification failed.") from exc

    if event["type"] == "checkout.session.completed":
        session_obj = event["data"]["object"]
        user_id_str = session_obj.get("client_reference_id") or session_obj.get("metadata", {}).get("user_id")
        tier = session_obj.get("metadata", {}).get("tier", TIER_PREMIUM)
        amount = session_obj.get("amount_total", 0)
        currency = session_obj.get("currency", "usd")
        customer_id = session_obj.get("customer")
        payment_intent_id = session_obj.get("payment_intent")

        if not user_id_str:
            logger.error("Webhook checkout.session.completed missing user_id")
            return

        user_id = uuid.UUID(user_id_str)

        # Query user once — reused for price validation and tier update
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            logger.warning("User %s not found during webhook processing", user_id)
            return

        # Defense-in-depth: validate that the charged amount matches expected
        # pricing for the granted tier. Log a warning on mismatch but still
        # process the payment (taxes or currency conversions may cause drift).
        # Derived from TIER_PRICES (single source of truth in constants/tiers.py).
        #
        # For upgrades (e.g. Premium -> Pro), the expected amount is the
        # difference between tiers, not the full target tier price.
        _expected_amounts = {t: data["amount"] for t, data in TIER_PRICES.items()}
        expected = _expected_amounts.get(tier)

        if expected is not None and amount != expected:
            # Before logging a warning, check if this could be a valid upgrade.
            # If the user's current tier has a known price, and amount equals
            # the difference, this is a valid upgrade — not a mismatch.
            is_valid_upgrade = False
            current_tier_price = _expected_amounts.get(user.tier, 0)
            if current_tier_price > 0 and amount == expected - current_tier_price:
                is_valid_upgrade = True

            if not is_valid_upgrade:
                logger.warning(
                    "Price mismatch for tier %s: expected %d cents, got %d cents (user %s)",
                    tier,
                    expected,
                    amount,
                    user_id_str,
                )

        # Determine the idempotency key: prefer payment_intent, fall back to event ID
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
                if background_tasks is not None:
                    results_url = f"{settings.frontend_url}/analysis"
                    background_tasks.add_task(
                        _send_receipt_email,
                        user_email=user.email,
                        user_name=user.name or user.email,
                        tier=tier,
                        amount=amount,
                        payment_intent=payment_intent_id,
                        results_url=results_url,
                    )
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

        # Fire-and-forget receipt email via BackgroundTasks — must never
        # block the webhook response.
        if background_tasks is not None:
            results_url = f"{settings.frontend_url}/analysis"
            background_tasks.add_task(
                _send_receipt_email,
                user_email=user.email,
                user_name=user.name or user.email,
                tier=tier,
                amount=amount,
                payment_intent=payment_intent_id,
                results_url=results_url,
            )

    else:
        logger.info("Ignoring unhandled Stripe event type: %s", event["type"])


async def _send_receipt_email(
    *,
    user_email: str,
    user_name: str,
    tier: str,
    amount: int,
    payment_intent: str | None,
    results_url: str,
) -> None:
    """Send receipt email — extracted for BackgroundTasks compatibility."""
    try:
        await send_purchase_receipt_email(
            to_email=user_email,
            user_name=user_name,
            tier=tier,
            amount_cents=amount,
            payment_date=datetime.now(UTC),
            results_url=results_url,
            reference=payment_intent or "",
        )
    except Exception:
        logger.exception(
            "Failed to send receipt email to %s for payment_intent %s",
            mask_email(user_email),
            payment_intent,
        )


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


async def get_succeeded_payment_count(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> int:
    """Return the count of succeeded payments for a user via SQL COUNT.

    Uses ``func.count`` instead of fetching all rows, which is more
    efficient for users with many payments.

    Args:
        db: Active async database session.
        user_id: The user's UUID.

    Returns:
        Integer count of succeeded payments.
    """
    result = await db.execute(
        select(func.count(Payment.id)).where(
            Payment.user_id == user_id,
            Payment.status == "succeeded",
        )
    )
    return result.scalar_one()
