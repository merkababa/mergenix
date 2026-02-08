"""Tests for Source/payments/ — Stripe and PayPal payment handlers.

Covers:
- StripeHandler initialization and validation
- Stripe checkout session creation (success and error paths)
- Stripe webhook signature verification and event processing
- Stripe subscription management (status, cancellation)
- PayPalHandler initialization and validation
- PayPal subscription creation
- PayPal webhook signature verification and event processing
- PayPal subscription management (details, cancellation)
- Error handling for both providers

All external API calls are mocked — no real Stripe/PayPal requests are made.
"""

from unittest.mock import MagicMock, patch

import paypalrestsdk
import pytest
from Source.payments.paypal_handler import PayPalError, PayPalHandler
from Source.payments.stripe_handler import StripeHandler, StripeHandlerError

# ---------------------------------------------------------------------------
# Stripe Handler Tests
# ---------------------------------------------------------------------------


class TestStripeHandlerInit:
    """Tests for StripeHandler initialization."""

    @patch("Source.payments.stripe_handler.stripe.Account.retrieve")
    def test_init_with_valid_key(self, mock_retrieve):
        """StripeHandler initializes successfully with a valid API key."""
        mock_retrieve.return_value = MagicMock()
        handler = StripeHandler("sk_test_valid_key")
        assert handler is not None

    def test_init_with_empty_key_raises(self):
        """StripeHandler raises error with empty API key."""
        with pytest.raises(StripeHandlerError, match="Valid Stripe API key is required"):
            StripeHandler("")

    def test_init_with_none_key_raises(self):
        """StripeHandler raises error with None API key."""
        with pytest.raises(StripeHandlerError, match="Valid Stripe API key is required"):
            StripeHandler(None)

    def test_init_with_non_string_key_raises(self):
        """StripeHandler raises error with non-string API key."""
        with pytest.raises(StripeHandlerError, match="Valid Stripe API key is required"):
            StripeHandler(12345)

    @patch("Source.payments.stripe_handler.stripe.Account.retrieve")
    def test_init_auth_failure(self, mock_retrieve):
        """StripeHandler raises error when Stripe authentication fails."""
        from stripe import AuthenticationError
        mock_retrieve.side_effect = AuthenticationError("Invalid API Key")
        with pytest.raises(StripeHandlerError, match="Invalid Stripe API key"):
            StripeHandler("sk_test_invalid")


class TestStripeCheckoutSession:
    """Tests for StripeHandler.create_checkout_session()."""

    @pytest.fixture()
    def handler(self):
        """Create a StripeHandler with mocked initialization."""
        with patch("Source.payments.stripe_handler.stripe.Account.retrieve"):
            return StripeHandler("sk_test_valid_key")

    @patch("Source.payments.stripe_handler.stripe.checkout.Session.create")
    def test_create_session_success(self, mock_create, handler):
        """Successful checkout session creation returns session details."""
        mock_session = MagicMock()
        mock_session.id = "cs_test_123"
        mock_session.url = "https://checkout.stripe.com/session_123"
        mock_session.subscription = "sub_test_123"
        mock_create.return_value = mock_session

        result = handler.create_checkout_session(
            customer_email="test@example.com",
            tier="premium",
            billing_period="monthly",
            success_url="https://mergenix.com/success",
            cancel_url="https://mergenix.com/cancel",
        )

        assert result["session_id"] == "cs_test_123"
        assert result["url"] == "https://checkout.stripe.com/session_123"
        assert result["subscription_id"] == "sub_test_123"

    def test_invalid_tier_raises(self, handler):
        """Invalid tier raises StripeHandlerError."""
        with pytest.raises(StripeHandlerError, match="Invalid tier"):
            handler.create_checkout_session(
                customer_email="test@example.com",
                tier="invalid",
                billing_period="monthly",
                success_url="https://mergenix.com/success",
                cancel_url="https://mergenix.com/cancel",
            )

    def test_invalid_billing_period_raises(self, handler):
        """Invalid billing period raises StripeHandlerError."""
        with pytest.raises(StripeHandlerError, match="Invalid billing period"):
            handler.create_checkout_session(
                customer_email="test@example.com",
                tier="premium",
                billing_period="weekly",
                success_url="https://mergenix.com/success",
                cancel_url="https://mergenix.com/cancel",
            )

    def test_invalid_email_raises(self, handler):
        """Invalid email raises StripeHandlerError."""
        with pytest.raises(StripeHandlerError, match="Valid customer email"):
            handler.create_checkout_session(
                customer_email="not-an-email",
                tier="premium",
                billing_period="monthly",
                success_url="https://mergenix.com/success",
                cancel_url="https://mergenix.com/cancel",
            )

    def test_empty_email_raises(self, handler):
        """Empty email raises StripeHandlerError."""
        with pytest.raises(StripeHandlerError, match="Valid customer email"):
            handler.create_checkout_session(
                customer_email="",
                tier="premium",
                billing_period="monthly",
                success_url="https://mergenix.com/success",
                cancel_url="https://mergenix.com/cancel",
            )

    @patch("Source.payments.stripe_handler.stripe.checkout.Session.create")
    def test_create_session_with_customer_id(self, mock_create, handler):
        """Session creation passes customer_id when provided."""
        mock_session = MagicMock()
        mock_session.id = "cs_test_456"
        mock_session.url = "https://checkout.stripe.com/session_456"
        mock_session.subscription = None
        mock_create.return_value = mock_session

        handler.create_checkout_session(
            customer_email="test@example.com",
            tier="pro",
            billing_period="yearly",
            success_url="https://mergenix.com/success",
            cancel_url="https://mergenix.com/cancel",
            customer_id="cus_existing_123",
        )

        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["customer"] == "cus_existing_123"
        assert "customer_email" not in call_kwargs

    @patch("Source.payments.stripe_handler.stripe.checkout.Session.create")
    def test_api_connection_error(self, mock_create, handler):
        """API connection error raises StripeHandlerError."""
        from stripe import APIConnectionError
        mock_create.side_effect = APIConnectionError("Connection failed")
        with pytest.raises(StripeHandlerError, match="unavailable"):
            handler.create_checkout_session(
                customer_email="test@example.com",
                tier="premium",
                billing_period="monthly",
                success_url="https://mergenix.com/success",
                cancel_url="https://mergenix.com/cancel",
            )


class TestStripeWebhook:
    """Tests for StripeHandler.handle_webhook()."""

    @pytest.fixture()
    def handler(self):
        """Create a StripeHandler with mocked initialization."""
        with patch("Source.payments.stripe_handler.stripe.Account.retrieve"):
            return StripeHandler("sk_test_valid_key")

    @patch("Source.payments.stripe_handler.stripe.Webhook.construct_event")
    def test_checkout_completed_webhook(self, mock_construct, handler):
        """Checkout completed webhook returns correct event data."""
        mock_construct.return_value = {
            "type": "checkout.session.completed",
            "id": "evt_test_123",
            "data": {
                "object": {
                    "customer": "cus_123",
                    "customer_email": "test@example.com",
                    "subscription": "sub_123",
                    "amount_total": 1290,
                    "currency": "usd",
                    "metadata": {"tier": "premium"},
                }
            },
        }

        result = handler.handle_webhook(b"payload", "sig_header", "whsec_test")
        assert result["event_type"] == "checkout.session.completed"
        assert result["event_id"] == "evt_test_123"
        assert result["data"]["customer_id"] == "cus_123"
        assert result["data"]["subscription_id"] == "sub_123"

    @patch("Source.payments.stripe_handler.stripe.Webhook.construct_event")
    def test_subscription_updated_webhook(self, mock_construct, handler):
        """Subscription updated webhook extracts status and metadata."""
        mock_construct.return_value = {
            "type": "customer.subscription.updated",
            "id": "evt_test_456",
            "data": {
                "object": {
                    "id": "sub_123",
                    "customer": "cus_123",
                    "status": "active",
                    "current_period_end": 1700000000,
                    "cancel_at_period_end": False,
                    "metadata": {"tier": "premium"},
                }
            },
        }

        result = handler.handle_webhook(b"payload", "sig_header", "whsec_test")
        assert result["event_type"] == "customer.subscription.updated"
        assert result["data"]["status"] == "active"
        assert result["data"]["cancel_at_period_end"] is False

    @patch("Source.payments.stripe_handler.stripe.Webhook.construct_event")
    def test_subscription_deleted_webhook(self, mock_construct, handler):
        """Subscription deleted webhook extracts cancellation data."""
        mock_construct.return_value = {
            "type": "customer.subscription.deleted",
            "id": "evt_test_789",
            "data": {
                "object": {
                    "id": "sub_456",
                    "customer": "cus_456",
                    "status": "canceled",
                    "canceled_at": 1700000000,
                    "metadata": {"tier": "pro"},
                }
            },
        }

        result = handler.handle_webhook(b"payload", "sig_header", "whsec_test")
        assert result["event_type"] == "customer.subscription.deleted"
        assert result["data"]["status"] == "canceled"
        assert result["data"]["canceled_at"] == 1700000000

    @patch("Source.payments.stripe_handler.stripe.Webhook.construct_event")
    def test_unhandled_event_type(self, mock_construct, handler):
        """Unhandled webhook event types return data without crashing."""
        mock_construct.return_value = {
            "type": "payment_intent.created",
            "id": "evt_unhandled",
            "data": {"object": {"id": "pi_123"}},
        }

        result = handler.handle_webhook(b"payload", "sig_header", "whsec_test")
        assert result["event_type"] == "payment_intent.created"

    @patch("Source.payments.stripe_handler.stripe.Webhook.construct_event")
    def test_invalid_signature_raises(self, mock_construct, handler):
        """Invalid webhook signature raises StripeHandlerError."""
        from stripe._error import SignatureVerificationError
        mock_construct.side_effect = SignatureVerificationError(
            "Invalid signature", "sig_header"
        )
        with pytest.raises(StripeHandlerError, match="Invalid webhook signature"):
            handler.handle_webhook(b"payload", "bad_sig", "whsec_test")

    def test_missing_webhook_secret_raises(self, handler):
        """Empty webhook secret raises StripeHandlerError."""
        with pytest.raises(StripeHandlerError, match="Webhook secret is required"):
            handler.handle_webhook(b"payload", "sig_header", "")

    @patch("Source.payments.stripe_handler.stripe.Webhook.construct_event")
    def test_invalid_payload_raises(self, mock_construct, handler):
        """Invalid payload raises StripeHandlerError."""
        mock_construct.side_effect = ValueError("Invalid JSON payload")
        with pytest.raises(StripeHandlerError, match="Invalid webhook payload"):
            handler.handle_webhook(b"bad_payload", "sig_header", "whsec_test")


class TestStripeSubscriptionManagement:
    """Tests for StripeHandler subscription status and cancellation."""

    @pytest.fixture()
    def handler(self):
        """Create a StripeHandler with mocked initialization."""
        with patch("Source.payments.stripe_handler.stripe.Account.retrieve"):
            return StripeHandler("sk_test_valid_key")

    @patch("Source.payments.stripe_handler.stripe.Subscription.retrieve")
    def test_get_subscription_status(self, mock_retrieve, handler):
        """Retrieves subscription status with all expected fields."""
        mock_sub = MagicMock()
        mock_sub.id = "sub_123"
        mock_sub.status = "active"
        mock_sub.current_period_start = 1690000000
        mock_sub.current_period_end = 1700000000
        mock_sub.cancel_at_period_end = False
        mock_sub.metadata = {"tier": "premium", "billing_period": "monthly"}
        mock_sub.customer = "cus_123"
        mock_sub.created = 1680000000
        mock_sub.canceled_at = None
        mock_retrieve.return_value = mock_sub

        result = handler.get_subscription_status("sub_123")
        assert result["id"] == "sub_123"
        assert result["status"] == "active"
        assert result["tier"] == "premium"
        assert result["billing_period"] == "monthly"
        assert result["customer_id"] == "cus_123"

    def test_get_status_empty_id_raises(self, handler):
        """Empty subscription ID raises StripeHandlerError."""
        with pytest.raises(StripeHandlerError, match="Subscription ID is required"):
            handler.get_subscription_status("")

    @patch("Source.payments.stripe_handler.stripe.Subscription.modify")
    def test_cancel_at_period_end(self, mock_modify, handler):
        """Cancelling at period end returns True when status is active."""
        mock_sub = MagicMock()
        mock_sub.status = "active"
        mock_modify.return_value = mock_sub

        result = handler.cancel_subscription("sub_123", immediate=False)
        assert result is True
        mock_modify.assert_called_once_with("sub_123", cancel_at_period_end=True)

    @patch("Source.payments.stripe_handler.stripe.Subscription.delete")
    def test_cancel_immediately(self, mock_delete, handler):
        """Immediate cancellation calls Subscription.delete."""
        mock_sub = MagicMock()
        mock_sub.status = "canceled"
        mock_delete.return_value = mock_sub

        result = handler.cancel_subscription("sub_123", immediate=True)
        assert result is True
        mock_delete.assert_called_once_with("sub_123")

    def test_cancel_empty_id_raises(self, handler):
        """Empty subscription ID in cancel raises StripeHandlerError."""
        with pytest.raises(StripeHandlerError, match="Subscription ID is required"):
            handler.cancel_subscription("")

    def test_customer_portal_empty_id_raises(self, handler):
        """Empty customer ID raises StripeHandlerError."""
        with pytest.raises(StripeHandlerError, match="Customer ID is required"):
            handler.create_customer_portal_session("", "https://mergenix.com/account")

    @patch("Source.payments.stripe_handler.stripe.billing_portal.Session.create")
    def test_customer_portal_success(self, mock_create, handler):
        """Customer portal session returns URL."""
        mock_session = MagicMock()
        mock_session.url = "https://billing.stripe.com/session_portal"
        mock_create.return_value = mock_session

        result = handler.create_customer_portal_session("cus_123", "https://mergenix.com/account")
        assert result == "https://billing.stripe.com/session_portal"


# ---------------------------------------------------------------------------
# PayPal Handler Tests
# ---------------------------------------------------------------------------


class TestPayPalHandlerInit:
    """Tests for PayPalHandler initialization."""

    @patch("Source.payments.paypal_handler.paypalrestsdk.configure")
    def test_init_with_valid_credentials(self, mock_configure):
        """PayPalHandler initializes with valid credentials."""
        handler = PayPalHandler("client_id", "client_secret", sandbox=True)
        assert handler.client_id == "client_id"
        assert handler.client_secret == "client_secret"
        assert handler.sandbox is True
        mock_configure.assert_called_once()

    @patch("Source.payments.paypal_handler.paypalrestsdk.configure")
    def test_init_live_mode(self, mock_configure):
        """PayPalHandler configures live mode when sandbox=False."""
        PayPalHandler("client_id", "client_secret", sandbox=False)
        call_args = mock_configure.call_args[0][0]
        assert call_args["mode"] == "live"

    @patch("Source.payments.paypal_handler.paypalrestsdk.configure")
    def test_init_sandbox_mode(self, mock_configure):
        """PayPalHandler configures sandbox mode by default."""
        PayPalHandler("client_id", "client_secret")
        call_args = mock_configure.call_args[0][0]
        assert call_args["mode"] == "sandbox"

    def test_init_empty_client_id_raises(self):
        """Empty client_id raises ValueError."""
        with pytest.raises(ValueError, match="client_id and client_secret are required"):
            PayPalHandler("", "client_secret")

    def test_init_empty_secret_raises(self):
        """Empty client_secret raises ValueError."""
        with pytest.raises(ValueError, match="client_id and client_secret are required"):
            PayPalHandler("client_id", "")


class TestPayPalSubscriptionCreation:
    """Tests for PayPalHandler.create_subscription()."""

    @pytest.fixture()
    def handler(self):
        """Create a PayPalHandler with mocked SDK."""
        with patch("Source.payments.paypal_handler.paypalrestsdk.configure"):
            return PayPalHandler("client_id", "client_secret")

    def test_create_subscription_success(self, handler):
        """Successful subscription creation returns approval URL."""
        mock_sub = MagicMock()
        mock_sub.create.return_value = True
        mock_sub.id = "I-SUB123"
        mock_sub.status = "APPROVAL_PENDING"
        mock_link = MagicMock()
        mock_link.rel = "approve"
        mock_link.href = "https://www.paypal.com/approve"
        mock_sub.links = [mock_link]

        with patch.object(paypalrestsdk, "Subscription", create=True, return_value=mock_sub):
            result = handler.create_subscription(
                tier="premium",
                billing_period="monthly",
                return_url="https://mergenix.com/success",
                cancel_url="https://mergenix.com/cancel",
            )

        assert result["subscription_id"] == "I-SUB123"
        assert result["approval_url"] == "https://www.paypal.com/approve"
        assert result["status"] == "APPROVAL_PENDING"

    def test_invalid_tier_raises(self, handler):
        """Invalid tier raises ValueError."""
        with pytest.raises(ValueError, match="Invalid tier"):
            handler.create_subscription(
                tier="invalid",
                billing_period="monthly",
                return_url="https://mergenix.com/success",
                cancel_url="https://mergenix.com/cancel",
            )

    def test_invalid_billing_period_raises(self, handler):
        """Invalid billing period raises ValueError."""
        with pytest.raises(ValueError, match="Invalid billing_period"):
            handler.create_subscription(
                tier="premium",
                billing_period="weekly",
                return_url="https://mergenix.com/success",
                cancel_url="https://mergenix.com/cancel",
            )

    def test_empty_return_url_raises(self, handler):
        """Empty return_url raises ValueError."""
        with pytest.raises(ValueError, match="return_url and cancel_url are required"):
            handler.create_subscription(
                tier="premium",
                billing_period="monthly",
                return_url="",
                cancel_url="https://mergenix.com/cancel",
            )

    def test_create_subscription_failure(self, handler):
        """Failed subscription creation raises PayPalError."""
        mock_sub = MagicMock()
        mock_sub.create.return_value = False
        mock_sub.error = "Plan not found"

        with patch.object(paypalrestsdk, "Subscription", create=True, return_value=mock_sub):
            with pytest.raises(PayPalError, match="Failed to create subscription"):
                handler.create_subscription(
                    tier="premium",
                    billing_period="monthly",
                    return_url="https://mergenix.com/success",
                    cancel_url="https://mergenix.com/cancel",
                )


class TestPayPalWebhook:
    """Tests for PayPalHandler.handle_webhook() — signature verification and event processing."""

    @pytest.fixture()
    def handler(self):
        """Create a PayPalHandler with mocked SDK."""
        with patch("Source.payments.paypal_handler.paypalrestsdk.configure"):
            return PayPalHandler("client_id", "client_secret")

    @pytest.fixture()
    def valid_headers(self):
        """Standard PayPal webhook headers."""
        return {
            "PAYPAL-TRANSMISSION-ID": "tx-id-123",
            "PAYPAL-TRANSMISSION-TIME": "2024-01-01T00:00:00Z",
            "PAYPAL-TRANSMISSION-SIG": "signature-abc",
            "PAYPAL-CERT-URL": "https://api.paypal.com/cert",
            "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        }

    @patch("Source.payments.paypal_handler.paypalrestsdk.WebhookEvent.verify")
    def test_activated_webhook(self, mock_verify, handler, valid_headers):
        """BILLING.SUBSCRIPTION.ACTIVATED webhook returns correct action."""
        mock_verify.return_value = True

        payload = {
            "event_type": "BILLING.SUBSCRIPTION.ACTIVATED",
            "resource": {"id": "I-SUB123", "status": "ACTIVE"},
        }

        result = handler.handle_webhook(payload, valid_headers, "WH-ID-123")
        assert result["event_type"] == "BILLING.SUBSCRIPTION.ACTIVATED"
        assert result["status"] == "ACTIVE"
        assert result["processed"] is True
        assert result["action"] == "enable_premium_features"

    @patch("Source.payments.paypal_handler.paypalrestsdk.WebhookEvent.verify")
    def test_cancelled_webhook(self, mock_verify, handler, valid_headers):
        """BILLING.SUBSCRIPTION.CANCELLED webhook disables features."""
        mock_verify.return_value = True

        payload = {
            "event_type": "BILLING.SUBSCRIPTION.CANCELLED",
            "resource": {"id": "I-SUB456"},
        }

        result = handler.handle_webhook(payload, valid_headers, "WH-ID-123")
        assert result["status"] == "CANCELLED"
        assert result["action"] == "disable_premium_features"
        assert result["processed"] is True

    @patch("Source.payments.paypal_handler.paypalrestsdk.WebhookEvent.verify")
    def test_suspended_webhook(self, mock_verify, handler, valid_headers):
        """BILLING.SUBSCRIPTION.SUSPENDED webhook suspends features."""
        mock_verify.return_value = True

        payload = {
            "event_type": "BILLING.SUBSCRIPTION.SUSPENDED",
            "resource": {"id": "I-SUB789"},
        }

        result = handler.handle_webhook(payload, valid_headers, "WH-ID-123")
        assert result["status"] == "SUSPENDED"
        assert result["action"] == "suspend_premium_features"

    @patch("Source.payments.paypal_handler.paypalrestsdk.WebhookEvent.verify")
    def test_expired_webhook(self, mock_verify, handler, valid_headers):
        """BILLING.SUBSCRIPTION.EXPIRED webhook disables features."""
        mock_verify.return_value = True

        payload = {
            "event_type": "BILLING.SUBSCRIPTION.EXPIRED",
            "resource": {"id": "I-SUB999"},
        }

        result = handler.handle_webhook(payload, valid_headers, "WH-ID-123")
        assert result["status"] == "EXPIRED"
        assert result["action"] == "disable_premium_features"

    @patch("Source.payments.paypal_handler.paypalrestsdk.WebhookEvent.verify")
    def test_updated_webhook(self, mock_verify, handler, valid_headers):
        """BILLING.SUBSCRIPTION.UPDATED webhook triggers detail update."""
        mock_verify.return_value = True

        payload = {
            "event_type": "BILLING.SUBSCRIPTION.UPDATED",
            "resource": {"id": "I-SUB111", "status": "ACTIVE"},
        }

        result = handler.handle_webhook(payload, valid_headers, "WH-ID-123")
        assert result["action"] == "update_subscription_details"

    @patch("Source.payments.paypal_handler.paypalrestsdk.WebhookEvent.verify")
    def test_invalid_signature_raises(self, mock_verify, handler, valid_headers):
        """Invalid webhook signature raises PayPalError."""
        mock_verify.return_value = False

        payload = {
            "event_type": "BILLING.SUBSCRIPTION.ACTIVATED",
            "resource": {"id": "I-FAKE"},
        }

        with pytest.raises(PayPalError, match="Webhook signature verification failed"):
            handler.handle_webhook(payload, valid_headers, "WH-ID-123")

    def test_missing_transmission_id_raises(self, handler):
        """Missing PAYPAL-TRANSMISSION-ID header raises ValueError."""
        headers = {
            "PAYPAL-TRANSMISSION-TIME": "2024-01-01T00:00:00Z",
        }
        payload = {"event_type": "BILLING.SUBSCRIPTION.ACTIVATED", "resource": {"id": "I-SUB"}}

        with pytest.raises(ValueError, match="Missing required PayPal webhook headers"):
            handler.handle_webhook(payload, headers, "WH-ID-123")

    def test_missing_timestamp_raises(self, handler):
        """Missing PAYPAL-TRANSMISSION-TIME header raises ValueError."""
        headers = {
            "PAYPAL-TRANSMISSION-ID": "tx-id-123",
        }
        payload = {"event_type": "BILLING.SUBSCRIPTION.ACTIVATED", "resource": {"id": "I-SUB"}}

        with pytest.raises(ValueError, match="Missing required PayPal webhook headers"):
            handler.handle_webhook(payload, headers, "WH-ID-123")

    def test_empty_payload_raises(self, handler):
        """Empty payload raises ValueError."""
        with pytest.raises(ValueError, match="Webhook payload is required"):
            handler.handle_webhook({}, {"PAYPAL-TRANSMISSION-ID": "x", "PAYPAL-TRANSMISSION-TIME": "t"}, "WH-ID")

    def test_missing_webhook_id_raises(self, handler):
        """Empty webhook_id raises ValueError."""
        with pytest.raises(ValueError, match="PayPal webhook ID is required"):
            handler.handle_webhook(
                {"event_type": "test", "resource": {"id": "I-SUB"}},
                {"PAYPAL-TRANSMISSION-ID": "x", "PAYPAL-TRANSMISSION-TIME": "t"},
                "",
            )

    @patch("Source.payments.paypal_handler.paypalrestsdk.WebhookEvent.verify")
    def test_unhandled_event_type(self, mock_verify, handler, valid_headers):
        """Unhandled event types return UNKNOWN status without crashing."""
        mock_verify.return_value = True

        payload = {
            "event_type": "SOME.UNKNOWN.EVENT",
            "resource": {"id": "I-SUB"},
        }

        result = handler.handle_webhook(payload, valid_headers, "WH-ID-123")
        assert result["status"] == "UNKNOWN"
        assert result["processed"] is False

    @patch("Source.payments.paypal_handler.paypalrestsdk.WebhookEvent.verify")
    def test_missing_event_type_raises(self, mock_verify, handler, valid_headers):
        """Payload without event_type raises ValueError."""
        mock_verify.return_value = True

        payload = {"resource": {"id": "I-SUB123"}}

        with pytest.raises(ValueError, match="Missing event_type"):
            handler.handle_webhook(payload, valid_headers, "WH-ID-123")


class TestPayPalSubscriptionManagement:
    """Tests for PayPalHandler subscription details and cancellation."""

    @pytest.fixture()
    def handler(self):
        """Create a PayPalHandler with mocked SDK."""
        with patch("Source.payments.paypal_handler.paypalrestsdk.configure"):
            return PayPalHandler("client_id", "client_secret")

    def test_get_subscription_details(self, handler):
        """Retrieves subscription details with expected fields."""
        mock_sub = MagicMock()
        mock_sub.id = "I-SUB123"
        mock_sub.status = "ACTIVE"
        mock_sub.plan_id = "P-PLAN123"
        mock_sub.start_time = "2024-01-01T00:00:00Z"
        mock_sub.billing_info = {"amount": "12.90"}
        mock_sub.subscriber = {"email": "test@example.com"}
        mock_sub.custom_id = "user_123"

        mock_subscription_cls = MagicMock()
        mock_subscription_cls.find.return_value = mock_sub
        with patch.object(paypalrestsdk, "Subscription", mock_subscription_cls, create=True):
            result = handler.get_subscription_details("I-SUB123")
        assert result["id"] == "I-SUB123"
        assert result["status"] == "ACTIVE"
        assert result["plan_id"] == "P-PLAN123"

    def test_get_details_empty_id_raises(self, handler):
        """Empty subscription_id raises ValueError."""
        with pytest.raises(ValueError, match="subscription_id is required"):
            handler.get_subscription_details("")

    def test_get_details_not_found(self, handler):
        """ResourceNotFound raises PayPalError."""
        from paypalrestsdk import ResourceNotFound
        mock_response = MagicMock()
        mock_response.status_code = 404

        mock_subscription_cls = MagicMock()
        mock_subscription_cls.find.side_effect = ResourceNotFound(mock_response)
        with patch.object(paypalrestsdk, "Subscription", mock_subscription_cls, create=True):
            with pytest.raises(PayPalError, match="Subscription not found"):
                handler.get_subscription_details("I-NONEXISTENT")

    def test_cancel_subscription_success(self, handler):
        """Successful cancellation returns True."""
        mock_sub = MagicMock()
        mock_sub.cancel.return_value = True

        mock_subscription_cls = MagicMock()
        mock_subscription_cls.find.return_value = mock_sub
        with patch.object(paypalrestsdk, "Subscription", mock_subscription_cls, create=True):
            result = handler.cancel_subscription("I-SUB123", reason="User requested")
        assert result is True
        mock_sub.cancel.assert_called_once_with({"reason": "User requested"})

    def test_cancel_subscription_failure(self, handler):
        """Failed cancellation returns False."""
        mock_sub = MagicMock()
        mock_sub.cancel.return_value = False
        mock_sub.error = "Already cancelled"

        mock_subscription_cls = MagicMock()
        mock_subscription_cls.find.return_value = mock_sub
        with patch.object(paypalrestsdk, "Subscription", mock_subscription_cls, create=True):
            result = handler.cancel_subscription("I-SUB123")
        assert result is False

    def test_cancel_empty_id_raises(self, handler):
        """Empty subscription_id in cancel raises ValueError."""
        with pytest.raises(ValueError, match="subscription_id is required"):
            handler.cancel_subscription("")
