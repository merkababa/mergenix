"""
Payment router — Stripe checkout, webhook processing, and payment history.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.constants.tiers import TIER_FREE, TIER_RANK
from app.database import DbSession
from app.middleware.auth import CurrentUser
from app.middleware.rate_limiter import LIMIT_WEBHOOK, limiter
from app.schemas.auth import MessageResponse
from app.schemas.payment import (
    CheckoutResponse,
    CreateCheckoutRequest,
    PaymentHistoryItem,
    TierStatus,
)
from app.services import audit_service, payment_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Stripe checkout session",
)
async def create_checkout(
    request: Request,
    body: CreateCheckoutRequest,
    user: CurrentUser,
    db: DbSession,
) -> CheckoutResponse:
    """Create a Stripe Checkout session for a tier upgrade.

    The returned ``checkout_url`` should be used to redirect the user
    to Stripe's hosted checkout page.
    """
    if user.tier == body.tier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": f"You are already on the {body.tier} tier.",
                "code": "ALREADY_ON_TIER",
            },
        )

    # Prevent downgrade via checkout (must go through support)
    if TIER_RANK.get(user.tier, 0) > TIER_RANK.get(body.tier, 0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Downgrades must be handled through support.",
                "code": "DOWNGRADE_NOT_ALLOWED",
            },
        )

    try:
        checkout_url, session_id = await payment_service.create_checkout_session(
            db=db,
            user_id=user.id,
            tier=body.tier,
        )
    except ValueError as exc:
        logger.error("Checkout failed for user %s (tier=%s): %s", user.id, body.tier, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Payment processing failed. Please try again.", "code": "CHECKOUT_FAILED"},
        ) from exc

    await audit_service.log_event(
        db,
        user_id=user.id,
        event_type="checkout_initiated",
        metadata={"tier": body.tier, "session_id": session_id},
    )
    await db.commit()

    return CheckoutResponse(checkout_url=checkout_url, session_id=session_id)


@router.post(
    "/webhook",
    response_model=MessageResponse,
    summary="Handle Stripe webhook",
)
@limiter.limit(LIMIT_WEBHOOK)
async def stripe_webhook(
    request: Request,
    db: DbSession,
) -> MessageResponse:
    """Process a Stripe webhook event.

    Stripe calls this endpoint with payment lifecycle events.
    The payload signature is verified against the webhook secret.
    """
    payload = await request.body()
    signature = request.headers.get("Stripe-Signature", "")

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Missing Stripe-Signature header.", "code": "MISSING_SIGNATURE"},
        )

    try:
        await payment_service.handle_webhook_event(
            db=db,
            payload=payload,
            signature=signature,
        )
    except ValueError as exc:
        logger.error("Webhook processing failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Webhook processing failed.", "code": "WEBHOOK_FAILED"},
        ) from exc

    return MessageResponse(message="Webhook processed successfully.")


@router.get(
    "/history",
    response_model=list[PaymentHistoryItem],
    summary="Get payment history",
)
async def get_payment_history(
    user: CurrentUser,
    db: DbSession,
) -> list[PaymentHistoryItem]:
    """Return the authenticated user's payment history, newest first."""
    payments = await payment_service.get_payment_history(db=db, user_id=user.id)
    return [PaymentHistoryItem.model_validate(p) for p in payments]


@router.get(
    "/tier-status",
    response_model=TierStatus,
    summary="Get current tier status",
)
async def get_tier_status(
    user: CurrentUser,
    db: DbSession,
) -> TierStatus:
    """Return the authenticated user's current tier status (one-time purchase model).

    Shows which tier the user has purchased and the count of successful payments.
    """
    payments = await payment_service.get_payment_history(db=db, user_id=user.id)
    active_payments = [p for p in payments if p.status == "succeeded"]

    return TierStatus(
        tier=user.tier,
        is_active=user.tier != TIER_FREE,
        payments_count=len(active_payments),
    )
