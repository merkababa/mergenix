"""
Email service — sends transactional emails via Resend.

Gracefully degrades (logs a warning) if the Resend API key is not configured,
so that local development works without an email provider.

HTML email bodies are rendered from Jinja2 templates stored in
``app/templates/email/``.  Autoescape is enabled globally so that
user-supplied values (tokens, tier names, etc.) are automatically
HTML-escaped, preventing XSS in email clients.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

import resend
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# ---------------------------------------------------------------------------
# Lazy Resend API key initialisation
# ---------------------------------------------------------------------------
# Set once on first use rather than per-call.  The sentinel tracks whether
# we have already configured the key so we never reassign on every send.

_resend_api_key_set = False


def _ensure_resend_api_key() -> bool:
    """Set resend.api_key lazily from settings (idempotent).

    Returns True if the key is configured, False otherwise.
    """
    global _resend_api_key_set  # noqa: PLW0603
    if _resend_api_key_set:
        return True
    if not settings.resend_api_key:
        return False
    resend.api_key = settings.resend_api_key
    _resend_api_key_set = True
    return True


# ---------------------------------------------------------------------------
# Jinja2 template environment
# ---------------------------------------------------------------------------

_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"

_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(default=True, default_for_string=True),
)


# ---------------------------------------------------------------------------
# Low-level send helper
# ---------------------------------------------------------------------------


def _mask_email(email: str) -> str:
    """Mask an email address for safe logging.

    Delegates to the public ``mask_email`` in ``app.utils.masking`` so that
    all modules share a single implementation.  This thin wrapper preserves
    the existing private API used elsewhere in this file.
    """
    from app.utils.masking import mask_email

    return mask_email(email)


async def _send(to: str, subject: str, html: str) -> bool:
    """Low-level send via Resend SDK.

    Runs the blocking Resend API call in a thread pool to avoid
    blocking the async event loop.

    Args:
        to: Recipient email address.
        subject: Email subject line.
        html: HTML body content.

    Returns:
        True if the email was sent (or queued) successfully, False otherwise.
    """
    if not _ensure_resend_api_key():
        logger.warning(
            "Resend API key not configured. Email to %s skipped (subject: %s).",
            _mask_email(to),
            subject,
        )
        return False

    try:
        await asyncio.to_thread(
            resend.Emails.send,
            {
                "from": settings.email_from,
                "to": [to],
                "subject": subject,
                "html": html,
            },
        )
        logger.info("Email sent to %s: %s", _mask_email(to), subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", _mask_email(to))
        return False


# ---------------------------------------------------------------------------
# Public email functions
# ---------------------------------------------------------------------------


async def send_verification_email(email: str, token: str) -> bool:
    """Send an email verification link.

    Args:
        email: Recipient email address.
        token: Plaintext verification token (included in the URL).

    Returns:
        True if the email was dispatched successfully.
    """
    verify_url = f"{settings.frontend_url}/verify-email?token={quote(token, safe='')}"

    template = _jinja_env.get_template("verification.html")
    html = template.render(verify_url=verify_url)

    return await _send(email, "Verify your Mergenix account", html)


async def send_password_reset_email(email: str, token: str) -> bool:
    """Send a password reset link.

    Args:
        email: Recipient email address.
        token: Plaintext reset token (included in the URL).

    Returns:
        True if the email was dispatched successfully.
    """
    reset_url = f"{settings.frontend_url}/reset-password?token={quote(token, safe='')}"

    template = _jinja_env.get_template("password_reset.html")
    html = template.render(reset_url=reset_url)

    return await _send(email, "Reset your Mergenix password", html)


async def send_deletion_confirmation_email(email: str, token: str) -> bool:
    """Send an account deletion confirmation link.

    Used for the email-based deletion flow (GDPR Article 17), especially
    for OAuth-only users who cannot provide a password for verification.

    Args:
        email: Recipient email address.
        token: Plaintext deletion confirmation token (included in the URL).

    Returns:
        True if the email was dispatched successfully.
    """
    deletion_url = f"{settings.frontend_url}/confirm-deletion?token={quote(token, safe='')}"

    template = _jinja_env.get_template("deletion_confirmation.html")
    html = template.render(deletion_url=deletion_url)

    return await _send(email, "Confirm your Mergenix account deletion", html)


async def send_purchase_receipt_email(
    *,
    to_email: str,
    user_name: str,
    tier: str,
    amount_cents: int,
    payment_date: datetime,
    results_url: str,
    reference: str = "",
) -> bool:
    """Send a purchase receipt email after a successful payment.

    Args:
        to_email: Recipient email address.
        user_name: Display name of the user.
        tier: The tier purchased (e.g. 'premium' or 'pro').
        amount_cents: Amount charged in cents (e.g. 1499 for $14.99).
        payment_date: When the payment occurred.
        results_url: URL to view analysis results.
        reference: Transaction reference (e.g. Stripe payment_intent ID).

    Returns:
        True if the email was dispatched successfully.
    """
    tier_display = tier.capitalize()
    amount_dollars = f"${amount_cents / 100:.2f}"
    date_formatted = payment_date.strftime("%B %d, %Y at %I:%M %p UTC")

    template = _jinja_env.get_template("purchase_receipt.html")
    html = template.render(
        user_name=user_name,
        tier_display=tier_display,
        amount_dollars=amount_dollars,
        date_formatted=date_formatted,
        reference=reference,
        results_url=results_url,
    )

    return await _send(to_email, "Your Mergenix Purchase Receipt", html)


async def send_partner_notification_email(
    *,
    to_email: str,
    analyzer_name: str,
    analysis_date: datetime,
) -> bool:
    """Send a notification to the analysis partner.

    This is an informational-only email — no action required from the
    partner.  The partner does NOT need a Mergenix account.

    PRIVACY: This email intentionally contains NO genetic results or
    health information.  It only states that the partner's data was
    analyzed, by whom, and when.

    Args:
        to_email: Partner's email address.
        analyzer_name: Display name of the user who ran the analysis.
        analysis_date: When the analysis was saved.

    Returns:
        True if the email was dispatched successfully.
    """
    date_formatted = analysis_date.strftime("%B %d, %Y")

    template = _jinja_env.get_template("partner_notification.html")
    html = template.render(
        analyzer_name=analyzer_name,
        date_formatted=date_formatted,
        frontend_url=settings.frontend_url,
    )

    return await _send(
        to_email,
        "Mergenix \u2014 Your Genetic Data Was Analyzed",
        html,
    )
