"""
Email service — sends transactional emails via Resend.

Gracefully degrades (logs a warning) if the Resend API key is not configured,
so that local development works without an email provider.
"""

from __future__ import annotations

import asyncio
import logging

import resend

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()


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


async def send_verification_email(email: str, token: str) -> bool:
    """Send an email verification link.

    Args:
        email: Recipient email address.
        token: Plaintext verification token (included in the URL).

    Returns:
        True if the email was dispatched successfully.
    """
    verify_url = f"{settings.frontend_url}/verify-email?token={token}"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2a4a 100%);
                    padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #00e5ff; margin: 0;">Mergenix</h1>
            <p style="color: #94a3b8; margin: 5px 0 0 0;">Genetic Offspring Analysis Platform</p>
        </div>
        <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0;
                    border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e293b;">Verify Your Email Address</h2>
            <p style="color: #475569;">
                Thank you for creating a Mergenix account. Please verify your email
                address by clicking the button below.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verify_url}"
                   style="background: #00e5ff; color: #0a1628; padding: 12px 30px;
                          text-decoration: none; border-radius: 6px; font-weight: bold;
                          display: inline-block;">
                    Verify Email Address
                </a>
            </div>
            <p style="color: #64748b; font-size: 0.9em;">
                This link expires in 24 hours. If you did not create an account,
                you can safely ignore this email.
            </p>
        </div>
    </div>
    """

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

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2a4a 100%);
                    padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #00e5ff; margin: 0;">Mergenix</h1>
            <p style="color: #94a3b8; margin: 5px 0 0 0;">Genetic Offspring Analysis Platform</p>
        </div>
        <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0;
                    border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e293b;">Reset Your Password</h2>
            <p style="color: #475569;">
                We received a request to reset your Mergenix password.
                Click the button below to choose a new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}"
                   style="background: #00e5ff; color: #0a1628; padding: 12px 30px;
                          text-decoration: none; border-radius: 6px; font-weight: bold;
                          display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p style="color: #64748b; font-size: 0.9em;">
                This link expires in 1 hour. If you did not request a password reset,
                you can safely ignore this email.
            </p>
        </div>
    </div>
    """

    return await _send(email, "Reset your Mergenix password", html)


async def send_tier_upgrade_email(email: str, tier: str) -> bool:
    """Send a congratulations email after a successful tier upgrade.

    Args:
        email: Recipient email address.
        tier: The tier the user upgraded to (premium or pro).

    Returns:
        True if the email was dispatched successfully.
    """
    tier_display = tier.capitalize()

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2a4a 100%);
                    padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #00e5ff; margin: 0;">Mergenix</h1>
            <p style="color: #94a3b8; margin: 5px 0 0 0;">Genetic Offspring Analysis Platform</p>
        </div>
        <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0;
                    border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e293b;">Welcome to Mergenix {tier_display}!</h2>
            <p style="color: #475569;">
                Your account has been upgraded to <strong>{tier_display}</strong>.
                You now have access to all {tier_display}-tier features including
                advanced genetic analysis capabilities.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{settings.frontend_url}/analysis"
                   style="background: #00e5ff; color: #0a1628; padding: 12px 30px;
                          text-decoration: none; border-radius: 6px; font-weight: bold;
                          display: inline-block;">
                    Start Analyzing
                </a>
            </div>
        </div>
    </div>
    """

    return await _send(email, f"Welcome to Mergenix {tier_display}!", html)
