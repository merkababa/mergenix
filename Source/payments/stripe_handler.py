"""
Stripe Payment Handler for Tortit

Handles Stripe integration for subscription management including:
- Checkout session creation
- Customer portal access
- Subscription status tracking
- Webhook event processing
"""

import logging
from typing import Dict, Optional, Any
import stripe
from stripe.error import (
    StripeError,
    CardError,
    InvalidRequestError,
    AuthenticationError,
    APIConnectionError,
    RateLimitError
)

# Configure logging
logger = logging.getLogger(__name__)

# Price ID configuration - Replace with actual Stripe Price IDs from your dashboard
PRICE_IDS = {
    "premium_monthly": "price_premium_monthly_placeholder",
    "premium_yearly": "price_premium_yearly_placeholder",
    "pro_monthly": "price_pro_monthly_placeholder",
    "pro_yearly": "price_pro_yearly_placeholder"
}

# Tier metadata for subscription creation
TIER_METADATA = {
    "premium": {
        "tier_name": "Premium",
        "features": "23andMe, AncestryDNA, MyHeritage DNA",
        "analysis_limit": "unlimited"
    },
    "pro": {
        "tier_name": "Pro",
        "features": "All formats + 371 genetic diseases + advanced carrier screening",
        "analysis_limit": "unlimited",
        "priority_support": "true"
    }
}


class StripeHandlerError(Exception):
    """Custom exception for StripeHandler errors"""
    pass


class StripeHandler:
    """
    Handles all Stripe payment operations for Tortit subscriptions.

    This class provides methods for creating checkout sessions, managing
    customer portals, tracking subscriptions, and handling webhook events.
    """

    def __init__(self, api_key: str):
        """
        Initialize the StripeHandler with API credentials.

        Args:
            api_key: Stripe secret API key

        Raises:
            StripeHandlerError: If API key is invalid or authentication fails
        """
        if not api_key or not isinstance(api_key, str):
            raise StripeHandlerError("Valid Stripe API key is required")

        try:
            stripe.api_key = api_key
            # Verify API key by making a test request
            stripe.Account.retrieve()
            logger.info("Stripe API initialized successfully")
        except AuthenticationError as e:
            logger.error(f"Stripe authentication failed: {str(e)}")
            raise StripeHandlerError(f"Invalid Stripe API key: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to initialize Stripe: {str(e)}")
            raise StripeHandlerError(f"Stripe initialization failed: {str(e)}")

    def create_checkout_session(
        self,
        customer_email: str,
        tier: str,
        billing_period: str,
        success_url: str,
        cancel_url: str,
        customer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session for subscription purchase.

        Args:
            customer_email: Customer's email address
            tier: Subscription tier ("premium" or "pro")
            billing_period: Billing frequency ("monthly" or "yearly")
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if checkout is cancelled
            customer_id: Optional existing Stripe customer ID

        Returns:
            Dictionary containing:
                - session_id: Checkout session ID
                - url: Checkout session URL
                - subscription_id: Subscription ID (if available)

        Raises:
            StripeHandlerError: If session creation fails
        """
        # Validate inputs
        if tier not in ["premium", "pro"]:
            raise StripeHandlerError(f"Invalid tier: {tier}. Must be 'premium' or 'pro'")

        if billing_period not in ["monthly", "yearly"]:
            raise StripeHandlerError(
                f"Invalid billing period: {billing_period}. Must be 'monthly' or 'yearly'"
            )

        if not customer_email or "@" not in customer_email:
            raise StripeHandlerError("Valid customer email is required")

        # Get price ID
        price_key = f"{tier}_{billing_period}"
        price_id = PRICE_IDS.get(price_key)

        if not price_id:
            raise StripeHandlerError(f"Price ID not configured for {price_key}")

        try:
            # Prepare session parameters
            session_params = {
                "payment_method_types": ["card"],
                "line_items": [{
                    "price": price_id,
                    "quantity": 1,
                }],
                "mode": "subscription",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "client_reference_id": customer_email,
                "metadata": {
                    "tier": tier,
                    "billing_period": billing_period,
                    **TIER_METADATA[tier]
                },
                "subscription_data": {
                    "metadata": {
                        "tier": tier,
                        "billing_period": billing_period,
                    }
                },
                "allow_promotion_codes": True,
            }

            # Add customer info
            if customer_id:
                session_params["customer"] = customer_id
            else:
                session_params["customer_email"] = customer_email

            # Create checkout session
            session = stripe.checkout.Session.create(**session_params)

            logger.info(
                f"Created checkout session {session.id} for {customer_email} "
                f"({tier} {billing_period})"
            )

            return {
                "session_id": session.id,
                "url": session.url,
                "subscription_id": session.subscription if hasattr(session, 'subscription') else None
            }

        except InvalidRequestError as e:
            logger.error(f"Invalid request for checkout session: {str(e)}")
            raise StripeHandlerError(f"Invalid checkout session parameters: {str(e)}")
        except RateLimitError as e:
            logger.error(f"Rate limit exceeded: {str(e)}")
            raise StripeHandlerError("Too many requests. Please try again later.")
        except APIConnectionError as e:
            logger.error(f"Stripe API connection failed: {str(e)}")
            raise StripeHandlerError("Payment service unavailable. Please try again later.")
        except StripeError as e:
            logger.error(f"Stripe error creating checkout session: {str(e)}")
            raise StripeHandlerError(f"Failed to create checkout session: {str(e)}")

    def create_customer_portal_session(
        self,
        customer_id: str,
        return_url: str
    ) -> str:
        """
        Create a customer portal session for subscription management.

        The customer portal allows users to:
        - Update payment methods
        - Change subscription plans
        - Cancel subscriptions
        - View billing history

        Args:
            customer_id: Stripe customer ID
            return_url: URL to redirect after portal session ends

        Returns:
            Portal session URL

        Raises:
            StripeHandlerError: If portal session creation fails
        """
        if not customer_id:
            raise StripeHandlerError("Customer ID is required")

        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )

            logger.info(f"Created portal session for customer {customer_id}")
            return session.url

        except InvalidRequestError as e:
            logger.error(f"Invalid customer ID {customer_id}: {str(e)}")
            raise StripeHandlerError(f"Invalid customer: {str(e)}")
        except APIConnectionError as e:
            logger.error(f"Stripe API connection failed: {str(e)}")
            raise StripeHandlerError("Payment service unavailable. Please try again later.")
        except StripeError as e:
            logger.error(f"Stripe error creating portal session: {str(e)}")
            raise StripeHandlerError(f"Failed to create portal session: {str(e)}")

    def get_subscription_status(self, subscription_id: str) -> Dict[str, Any]:
        """
        Retrieve current status and details of a subscription.

        Args:
            subscription_id: Stripe subscription ID

        Returns:
            Dictionary containing:
                - id: Subscription ID
                - status: Current status (active, canceled, past_due, etc.)
                - current_period_start: Current billing period start timestamp
                - current_period_end: Current billing period end timestamp
                - cancel_at_period_end: Whether subscription will cancel at period end
                - tier: Subscription tier from metadata
                - billing_period: Billing period from metadata
                - customer_id: Associated customer ID

        Raises:
            StripeHandlerError: If subscription retrieval fails
        """
        if not subscription_id:
            raise StripeHandlerError("Subscription ID is required")

        try:
            subscription = stripe.Subscription.retrieve(subscription_id)

            return {
                "id": subscription.id,
                "status": subscription.status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "tier": subscription.metadata.get("tier"),
                "billing_period": subscription.metadata.get("billing_period"),
                "customer_id": subscription.customer,
                "created": subscription.created,
                "canceled_at": subscription.canceled_at if hasattr(subscription, 'canceled_at') else None,
            }

        except InvalidRequestError as e:
            logger.error(f"Invalid subscription ID {subscription_id}: {str(e)}")
            raise StripeHandlerError(f"Subscription not found: {str(e)}")
        except APIConnectionError as e:
            logger.error(f"Stripe API connection failed: {str(e)}")
            raise StripeHandlerError("Payment service unavailable. Please try again later.")
        except StripeError as e:
            logger.error(f"Stripe error retrieving subscription: {str(e)}")
            raise StripeHandlerError(f"Failed to retrieve subscription: {str(e)}")

    def cancel_subscription(
        self,
        subscription_id: str,
        immediate: bool = False
    ) -> bool:
        """
        Cancel a subscription.

        Args:
            subscription_id: Stripe subscription ID
            immediate: If True, cancel immediately. If False, cancel at period end.

        Returns:
            True if cancellation was successful

        Raises:
            StripeHandlerError: If cancellation fails
        """
        if not subscription_id:
            raise StripeHandlerError("Subscription ID is required")

        try:
            if immediate:
                # Cancel immediately
                subscription = stripe.Subscription.delete(subscription_id)
                logger.info(f"Immediately canceled subscription {subscription_id}")
            else:
                # Cancel at period end
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
                logger.info(f"Subscription {subscription_id} will cancel at period end")

            return subscription.status in ["canceled", "active"]

        except InvalidRequestError as e:
            logger.error(f"Invalid subscription ID {subscription_id}: {str(e)}")
            raise StripeHandlerError(f"Subscription not found: {str(e)}")
        except APIConnectionError as e:
            logger.error(f"Stripe API connection failed: {str(e)}")
            raise StripeHandlerError("Payment service unavailable. Please try again later.")
        except StripeError as e:
            logger.error(f"Stripe error canceling subscription: {str(e)}")
            raise StripeHandlerError(f"Failed to cancel subscription: {str(e)}")

    def handle_webhook(
        self,
        payload: bytes,
        sig_header: str,
        webhook_secret: str
    ) -> Dict[str, Any]:
        """
        Handle and validate Stripe webhook events.

        Processes the following events:
        - checkout.session.completed: New subscription created
        - customer.subscription.updated: Subscription modified
        - customer.subscription.deleted: Subscription canceled

        Args:
            payload: Raw webhook payload bytes
            sig_header: Stripe signature header
            webhook_secret: Webhook signing secret from Stripe dashboard

        Returns:
            Dictionary containing:
                - event_type: Type of webhook event
                - event_id: Unique event ID
                - data: Event-specific data

        Raises:
            StripeHandlerError: If webhook validation or processing fails
        """
        if not webhook_secret:
            raise StripeHandlerError("Webhook secret is required")

        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )

            event_type = event['type']
            event_id = event['id']

            logger.info(f"Processing webhook event {event_id} of type {event_type}")

            # Extract event data
            result = {
                "event_type": event_type,
                "event_id": event_id,
                "data": {}
            }

            # Handle specific event types
            if event_type == "checkout.session.completed":
                session = event['data']['object']
                result["data"] = {
                    "customer_id": session.get('customer'),
                    "customer_email": session.get('customer_email') or session.get('customer_details', {}).get('email'),
                    "subscription_id": session.get('subscription'),
                    "amount_total": session.get('amount_total'),
                    "currency": session.get('currency'),
                    "metadata": session.get('metadata', {}),
                }
                logger.info(
                    f"Checkout completed for customer {result['data']['customer_id']}, "
                    f"subscription {result['data']['subscription_id']}"
                )

            elif event_type == "customer.subscription.updated":
                subscription = event['data']['object']
                result["data"] = {
                    "subscription_id": subscription['id'],
                    "customer_id": subscription['customer'],
                    "status": subscription['status'],
                    "current_period_end": subscription['current_period_end'],
                    "cancel_at_period_end": subscription.get('cancel_at_period_end', False),
                    "metadata": subscription.get('metadata', {}),
                }
                logger.info(
                    f"Subscription {subscription['id']} updated to status {subscription['status']}"
                )

            elif event_type == "customer.subscription.deleted":
                subscription = event['data']['object']
                result["data"] = {
                    "subscription_id": subscription['id'],
                    "customer_id": subscription['customer'],
                    "status": subscription['status'],
                    "canceled_at": subscription.get('canceled_at'),
                    "metadata": subscription.get('metadata', {}),
                }
                logger.info(f"Subscription {subscription['id']} deleted")

            else:
                logger.info(f"Unhandled webhook event type: {event_type}")
                result["data"] = event['data']['object']

            return result

        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            raise StripeHandlerError(f"Invalid webhook signature: {str(e)}")
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {str(e)}")
            raise StripeHandlerError(f"Invalid webhook payload: {str(e)}")
        except StripeError as e:
            logger.error(f"Stripe error processing webhook: {str(e)}")
            raise StripeHandlerError(f"Failed to process webhook: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error processing webhook: {str(e)}")
            raise StripeHandlerError(f"Unexpected webhook error: {str(e)}")
