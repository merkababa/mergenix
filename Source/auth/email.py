"""
Email sending utilities for Mergenix authentication flows.

Uses Python stdlib (smtplib) only. Gracefully degrades if SMTP is not configured.
"""

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Send an email via SMTP with TLS.

    Reads SMTP configuration from environment variables. If SMTP is not
    configured (missing host or user), logs a warning and returns False
    without crashing.

    Args:
        to_email: Recipient email address.
        subject: Email subject line.
        html_body: HTML content of the email body.

    Returns:
        True if the email was sent successfully, False otherwise.
    """
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("FROM_EMAIL", "noreply@mergenix.com")
    from_name = os.getenv("FROM_NAME", "Mergenix")

    if not smtp_host or not smtp_user:
        logger.warning(
            "SMTP not configured (SMTP_HOST=%r, SMTP_USER=%r). Email to %s skipped.",
            smtp_host,
            smtp_user,
            to_email,
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email

    # Attach HTML body
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.sendmail(from_email, [to_email], msg.as_string())
        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except smtplib.SMTPException:
        logger.exception("Failed to send email to %s", to_email)
        return False
    except OSError:
        logger.exception("Network error sending email to %s", to_email)
        return False


def send_verification_email(to_email: str, token: str, base_url: str = "") -> bool:
    """
    Send an email verification link to the user.

    Args:
        to_email: Recipient email address.
        token: Plaintext verification token (will be included in the URL).
        base_url: Base URL of the application (e.g. "https://mergenix.com").
                  If empty, uses a relative path.

    Returns:
        True if the email was sent successfully, False otherwise.
    """
    if not base_url:
        base_url = os.getenv("APP_BASE_URL", "http://localhost:8501")

    verify_url = f"{base_url}/auth?action=verify&token={token}"

    subject = "Verify your Mergenix account"
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #94a3b8; font-size: 0.8em;">
                If the button doesn't work, copy and paste this URL into your browser:<br>
                <a href="{verify_url}" style="color: #00e5ff;">{verify_url}</a>
            </p>
        </div>
    </body>
    </html>
    """

    return send_email(to_email, subject, html_body)


def send_password_reset_email(to_email: str, token: str, base_url: str = "") -> bool:
    """
    Send a password reset link to the user.

    Args:
        to_email: Recipient email address.
        token: Plaintext reset token (will be included in the URL).
        base_url: Base URL of the application (e.g. "https://mergenix.com").
                  If empty, uses a relative path.

    Returns:
        True if the email was sent successfully, False otherwise.
    """
    if not base_url:
        base_url = os.getenv("APP_BASE_URL", "http://localhost:8501")

    reset_url = f"{base_url}/auth?action=reset&token={token}"

    subject = "Reset your Mergenix password"
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #94a3b8; font-size: 0.8em;">
                If the button doesn't work, copy and paste this URL into your browser:<br>
                <a href="{reset_url}" style="color: #00e5ff;">{reset_url}</a>
            </p>
        </div>
    </body>
    </html>
    """

    return send_email(to_email, subject, html_body)
