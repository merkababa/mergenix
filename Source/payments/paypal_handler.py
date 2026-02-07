"""
PayPal Payment Integration Handler for Mergenix

This module provides PayPal subscription management functionality including
subscription creation, retrieval, cancellation, and webhook handling.
"""

import logging
from typing import Dict, Optional
import paypalrestsdk
from paypalrestsdk import ResourceNotFound, UnauthorizedAccess
from paypalrestsdk.exceptions import MissingConfig


# Configure logging
logger = logging.getLogger(__name__)


class PayPalHandler:
    """
    Handler for PayPal subscription operations.

    Manages subscription lifecycle including creation, retrieval,
    cancellation, and webhook event processing.
    """

    # PayPal plan IDs for different subscription tiers
    # TODO: Replace with actual PayPal plan IDs from your PayPal dashboard
    PLAN_IDS = {
        "premium_monthly": "P-PREMIUM-MONTHLY-PLAN-ID",
        "premium_yearly": "P-PREMIUM-YEARLY-PLAN-ID",
        "pro_monthly": "P-PRO-MONTHLY-PLAN-ID",
        "pro_yearly": "P-PRO-YEARLY-PLAN-ID"
    }

    # Supported subscription tiers and billing periods
    VALID_TIERS = ["premium", "pro"]
    VALID_PERIODS = ["monthly", "yearly"]

    def __init__(self, client_id: str, client_secret: str, sandbox: bool = True):
        """
        Initialize PayPal handler with API credentials.

        Args:
            client_id: PayPal REST API client ID
            client_secret: PayPal REST API client secret
            sandbox: Whether to use sandbox environment (default: True)

        Raises:
            ValueError: If credentials are empty
        """
        if not client_id or not client_secret:
            raise ValueError("PayPal client_id and client_secret are required")

        self.client_id = client_id
        self.client_secret = client_secret
        self.sandbox = sandbox

        # Configure PayPal SDK
        mode = "sandbox" if sandbox else "live"
        paypalrestsdk.configure({
            "mode": mode,
            "client_id": client_id,
            "client_secret": client_secret
        })

        logger.info(f"PayPal handler initialized in {mode} mode")

    def create_subscription(
        self,
        tier: str,
        billing_period: str,
        return_url: str,
        cancel_url: str,
        custom_id: Optional[str] = None
    ) -> Dict:
        """
        Create a new PayPal subscription.

        Args:
            tier: Subscription tier ("premium" or "pro")
            billing_period: Billing period ("monthly" or "yearly")
            return_url: URL to redirect after successful approval
            cancel_url: URL to redirect if user cancels
            custom_id: Optional custom ID to associate with subscription

        Returns:
            Dictionary containing:
                - subscription_id: PayPal subscription ID
                - approval_url: URL for user to approve subscription
                - status: Subscription status

        Raises:
            ValueError: If tier or billing_period is invalid
            PayPalError: If PayPal API call fails
        """
        # Validate inputs
        tier_lower = tier.lower()
        period_lower = billing_period.lower()

        if tier_lower not in self.VALID_TIERS:
            raise ValueError(
                f"Invalid tier '{tier}'. Must be one of: {', '.join(self.VALID_TIERS)}"
            )

        if period_lower not in self.VALID_PERIODS:
            raise ValueError(
                f"Invalid billing_period '{billing_period}'. "
                f"Must be one of: {', '.join(self.VALID_PERIODS)}"
            )

        if not return_url or not cancel_url:
            raise ValueError("return_url and cancel_url are required")

        # Get plan ID
        plan_key = f"{tier_lower}_{period_lower}"
        plan_id = self.PLAN_IDS.get(plan_key)

        if not plan_id:
            raise ValueError(f"No plan ID configured for {plan_key}")

        try:
            # Create subscription payload
            subscription_attrs = {
                "plan_id": plan_id,
                "application_context": {
                    "brand_name": "Mergenix Genetics",
                    "locale": "en-US",
                    "shipping_preference": "NO_SHIPPING",
                    "user_action": "SUBSCRIBE_NOW",
                    "return_url": return_url,
                    "cancel_url": cancel_url
                }
            }

            # Add custom ID if provided
            if custom_id:
                subscription_attrs["custom_id"] = custom_id

            # Create subscription
            subscription = paypalrestsdk.Subscription(subscription_attrs)

            if subscription.create():
                logger.info(
                    f"Subscription created: {subscription.id} "
                    f"for plan {plan_key}"
                )

                # Extract approval URL from links
                approval_url = None
                for link in subscription.links:
                    if link.rel == "approve":
                        approval_url = link.href
                        break

                return {
                    "subscription_id": subscription.id,
                    "approval_url": approval_url,
                    "status": subscription.status,
                    "plan_id": plan_id
                }
            else:
                error_msg = f"Failed to create subscription: {subscription.error}"
                logger.error(error_msg)
                raise PayPalError(error_msg)

        except (UnauthorizedAccess, Exception) as e:
            error_msg = f"PayPal API error during subscription creation: {str(e)}"
            logger.error(error_msg)
            raise PayPalError(error_msg) from e
        except Exception as e:
            error_msg = f"Unexpected error creating subscription: {str(e)}"
            logger.error(error_msg)
            raise PayPalError(error_msg) from e

    def get_subscription_details(self, subscription_id: str) -> Dict:
        """
        Get details of an existing subscription.

        Args:
            subscription_id: PayPal subscription ID

        Returns:
            Dictionary containing subscription details:
                - id: Subscription ID
                - status: Current status (APPROVAL_PENDING, ACTIVE, SUSPENDED, CANCELLED, EXPIRED)
                - plan_id: Associated plan ID
                - start_time: Subscription start time
                - billing_info: Billing information
                - subscriber: Subscriber details

        Raises:
            ValueError: If subscription_id is empty
            PayPalError: If subscription not found or API call fails
        """
        if not subscription_id:
            raise ValueError("subscription_id is required")

        try:
            subscription = paypalrestsdk.Subscription.find(subscription_id)

            logger.info(f"Retrieved subscription details for {subscription_id}")

            return {
                "id": subscription.id,
                "status": subscription.status,
                "plan_id": subscription.plan_id,
                "start_time": getattr(subscription, "start_time", None),
                "billing_info": getattr(subscription, "billing_info", {}),
                "subscriber": getattr(subscription, "subscriber", {}),
                "custom_id": getattr(subscription, "custom_id", None)
            }

        except ResourceNotFound:
            error_msg = f"Subscription not found: {subscription_id}"
            logger.error(error_msg)
            raise PayPalError(error_msg)
        except (UnauthorizedAccess, Exception) as e:
            error_msg = f"PayPal API error retrieving subscription: {str(e)}"
            logger.error(error_msg)
            raise PayPalError(error_msg) from e
        except Exception as e:
            error_msg = f"Unexpected error retrieving subscription: {str(e)}"
            logger.error(error_msg)
            raise PayPalError(error_msg) from e

    def cancel_subscription(self, subscription_id: str, reason: str = "User requested cancellation") -> bool:
        """
        Cancel an active subscription.

        Args:
            subscription_id: PayPal subscription ID
            reason: Reason for cancellation

        Returns:
            True if cancellation successful, False otherwise

        Raises:
            ValueError: If subscription_id is empty
            PayPalError: If API call fails
        """
        if not subscription_id:
            raise ValueError("subscription_id is required")

        try:
            subscription = paypalrestsdk.Subscription.find(subscription_id)

            if subscription.cancel({"reason": reason}):
                logger.info(f"Subscription cancelled: {subscription_id}")
                return True
            else:
                error_msg = f"Failed to cancel subscription: {subscription.error}"
                logger.error(error_msg)
                return False

        except ResourceNotFound:
            error_msg = f"Subscription not found: {subscription_id}"
            logger.error(error_msg)
            raise PayPalError(error_msg)
        except (UnauthorizedAccess, Exception) as e:
            error_msg = f"PayPal API error cancelling subscription: {str(e)}"
            logger.error(error_msg)
            raise PayPalError(error_msg) from e
        except Exception as e:
            error_msg = f"Unexpected error cancelling subscription: {str(e)}"
            logger.error(error_msg)
            raise PayPalError(error_msg) from e

    def handle_webhook(self, payload: Dict) -> Dict:
        """
        Handle PayPal webhook events.

        Processes subscription lifecycle events from PayPal webhooks.

        Args:
            payload: Webhook payload from PayPal

        Returns:
            Dictionary containing:
                - event_type: Type of event
                - subscription_id: Associated subscription ID
                - status: New subscription status
                - processed: Whether event was processed
                - action: Recommended action to take

        Raises:
            ValueError: If payload is invalid or missing required fields
        """
        if not payload:
            raise ValueError("Webhook payload is required")

        event_type = payload.get("event_type")

        if not event_type:
            raise ValueError("Missing event_type in webhook payload")

        logger.info(f"Processing webhook event: {event_type}")

        # Extract subscription ID from resource
        resource = payload.get("resource", {})
        subscription_id = resource.get("id")

        if not subscription_id:
            logger.warning("No subscription ID found in webhook payload")

        # Process different event types
        result = {
            "event_type": event_type,
            "subscription_id": subscription_id,
            "processed": False,
            "action": None
        }

        if event_type == "BILLING.SUBSCRIPTION.ACTIVATED":
            # Subscription has been activated
            result["status"] = "ACTIVE"
            result["processed"] = True
            result["action"] = "enable_premium_features"
            logger.info(f"Subscription activated: {subscription_id}")

        elif event_type == "BILLING.SUBSCRIPTION.CANCELLED":
            # Subscription has been cancelled
            result["status"] = "CANCELLED"
            result["processed"] = True
            result["action"] = "disable_premium_features"
            logger.info(f"Subscription cancelled: {subscription_id}")

        elif event_type == "BILLING.SUBSCRIPTION.UPDATED":
            # Subscription has been updated (e.g., plan change)
            result["status"] = resource.get("status", "UNKNOWN")
            result["processed"] = True
            result["action"] = "update_subscription_details"
            logger.info(f"Subscription updated: {subscription_id}")

        elif event_type == "BILLING.SUBSCRIPTION.SUSPENDED":
            # Subscription has been suspended (e.g., payment failure)
            result["status"] = "SUSPENDED"
            result["processed"] = True
            result["action"] = "suspend_premium_features"
            logger.warning(f"Subscription suspended: {subscription_id}")

        elif event_type == "BILLING.SUBSCRIPTION.EXPIRED":
            # Subscription has expired
            result["status"] = "EXPIRED"
            result["processed"] = True
            result["action"] = "disable_premium_features"
            logger.info(f"Subscription expired: {subscription_id}")

        else:
            # Unknown or unhandled event type
            logger.warning(f"Unhandled webhook event type: {event_type}")
            result["status"] = "UNKNOWN"

        return result


class PayPalError(Exception):
    """Custom exception for PayPal-related errors."""
    pass


# Example usage
if __name__ == "__main__":
    # Configure logging for testing
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Example: Initialize handler (use environment variables in production)
    # handler = PayPalHandler(
    #     client_id="YOUR_CLIENT_ID",
    #     client_secret="YOUR_CLIENT_SECRET",
    #     sandbox=True
    # )

    # Example: Create subscription
    # result = handler.create_subscription(
    #     tier="premium",
    #     billing_period="monthly",
    #     return_url="https://mergenix.com/subscription/success",
    #     cancel_url="https://mergenix.com/subscription/cancel",
    #     custom_id="user_12345"
    # )
    # print(f"Approval URL: {result['approval_url']}")

    # Example: Get subscription details
    # details = handler.get_subscription_details("I-SUBSCRIPTION-ID")
    # print(f"Status: {details['status']}")

    # Example: Cancel subscription
    # success = handler.cancel_subscription("I-SUBSCRIPTION-ID")

    # Example: Handle webhook
    # webhook_payload = {
    #     "event_type": "BILLING.SUBSCRIPTION.ACTIVATED",
    #     "resource": {"id": "I-SUBSCRIPTION-ID", "status": "ACTIVE"}
    # }
    # result = handler.handle_webhook(webhook_payload)
    # print(f"Action: {result['action']}")

    print("PayPal handler module loaded successfully")
