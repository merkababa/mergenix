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
from pathlib import Path

import resend
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

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
    if not settings.resend_api_key:
        logger.warning(
            "Resend API key not configured. Email to %s skipped (subject: %s).",
            to,
            subject,
        )
        return False

    resend.api_key = settings.resend_api_key

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
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
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
    verify_url = f"{settings.frontend_url}/verify-email?token={token}"

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
    reset_url = f"{settings.frontend_url}/reset-password?token={token}"

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
    deletion_url = f"{settings.frontend_url}/confirm-deletion?token={token}"

    template = _jinja_env.get_template("deletion_confirmation.html")
    html = template.render(deletion_url=deletion_url)

    return await _send(email, "Confirm your Mergenix account deletion", html)


async def send_tier_upgrade_email(email: str, tier: str) -> bool:
    """Send a congratulations email after a successful tier upgrade.

    Args:
        email: Recipient email address.
        tier: The tier the user upgraded to (premium or pro).

    Returns:
        True if the email was dispatched successfully.
    """
    tier_display = tier.capitalize()
    analysis_url = f"{settings.frontend_url}/analysis"

    template = _jinja_env.get_template("tier_upgrade.html")
    html = template.render(tier_display=tier_display, analysis_url=analysis_url)

    return await _send(email, f"Welcome to Mergenix {tier_display}!", html)
