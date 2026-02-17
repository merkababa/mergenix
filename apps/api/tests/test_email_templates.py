"""
Tests for Jinja2-based email templates.

Verifies that the email service renders all transactional emails
using Jinja2 templates with proper variable substitution, autoescape,
and shared branding (base template).
"""

from __future__ import annotations

import os

# Must set env vars before importing app modules
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-testing-only")
os.environ.setdefault("ENVIRONMENT", "development")

from unittest.mock import AsyncMock, patch

import pytest
from app.config import get_settings

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _capture_html() -> tuple[AsyncMock, list[str]]:
    """Create a mock for _send that captures the html argument."""
    captured: list[str] = []

    async def _fake_send(to: str, subject: str, html: str) -> bool:
        captured.append(html)
        return True

    return AsyncMock(side_effect=_fake_send), captured


# ---------------------------------------------------------------------------
# Jinja2 environment tests
# ---------------------------------------------------------------------------

class TestJinjaEnvironment:
    """The email service should expose a Jinja2 rendering environment."""

    def test_jinja_env_exists(self):
        """A module-level _jinja_env should be importable."""
        from app.services.email_service import _jinja_env
        assert _jinja_env is not None

    def test_jinja_env_has_autoescape(self):
        """Autoescape must be enabled for XSS safety.

        When using select_autoescape(), the Environment.autoescape
        attribute is a callable (not a plain bool). We verify it is
        truthy (i.e. configured) and that it returns True for HTML.
        """
        from app.services.email_service import _jinja_env
        # select_autoescape sets autoescape to a callable
        assert _jinja_env.autoescape
        # Verify the callable returns True for .html templates
        if callable(_jinja_env.autoescape):
            assert _jinja_env.autoescape("base.html") is True

    def test_base_template_exists(self):
        """The base.html template must be loadable."""
        from app.services.email_service import _jinja_env
        template = _jinja_env.get_template("base.html")
        assert template is not None

    def test_verification_template_exists(self):
        """The verification.html template must be loadable."""
        from app.services.email_service import _jinja_env
        template = _jinja_env.get_template("verification.html")
        assert template is not None

    def test_password_reset_template_exists(self):
        """The password_reset.html template must be loadable."""
        from app.services.email_service import _jinja_env
        template = _jinja_env.get_template("password_reset.html")
        assert template is not None

    def test_tier_upgrade_template_exists(self):
        """The tier_upgrade.html template must be loadable."""
        from app.services.email_service import _jinja_env
        template = _jinja_env.get_template("tier_upgrade.html")
        assert template is not None


# ---------------------------------------------------------------------------
# Template rendering tests (via the public async functions)
# ---------------------------------------------------------------------------

class TestVerificationEmail:
    """send_verification_email renders the verification template."""

    @pytest.mark.asyncio
    async def test_contains_verify_url(self):
        """The rendered HTML must include the verification URL with the token."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_verification_email
            await send_verification_email("user@example.com", "abc123token")

        html = captured[0]
        settings = get_settings()
        expected_url = f"{settings.frontend_url}/verify-email?token=abc123token"
        assert expected_url in html

    @pytest.mark.asyncio
    async def test_contains_branding(self):
        """The rendered HTML must include Mergenix branding from the base template."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_verification_email
            await send_verification_email("user@example.com", "tok")

        html = captured[0]
        assert "Mergenix" in html
        assert "Genetic Offspring Analysis Platform" in html

    @pytest.mark.asyncio
    async def test_contains_heading(self):
        """The rendered HTML must include the verification heading."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_verification_email
            await send_verification_email("user@example.com", "tok")

        html = captured[0]
        assert "Verify Your Email Address" in html

    @pytest.mark.asyncio
    async def test_contains_cta_button(self):
        """The rendered HTML must have a clickable CTA button."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_verification_email
            await send_verification_email("user@example.com", "tok")

        html = captured[0]
        assert "Verify Email Address" in html

    @pytest.mark.asyncio
    async def test_contains_expiry_notice(self):
        """The rendered HTML must mention the 24-hour expiry."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_verification_email
            await send_verification_email("user@example.com", "tok")

        html = captured[0]
        assert "24 hours" in html

    @pytest.mark.asyncio
    async def test_subject_line(self):
        """send_verification_email should use the correct subject."""
        mock_send = AsyncMock(return_value=True)
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_verification_email
            await send_verification_email("user@example.com", "tok")

        mock_send.assert_called_once()
        call_args = mock_send.call_args
        assert call_args[0][1] == "Verify your Mergenix account"


class TestPasswordResetEmail:
    """send_password_reset_email renders the password reset template."""

    @pytest.mark.asyncio
    async def test_contains_reset_url(self):
        """The rendered HTML must include the reset URL with the token."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_password_reset_email
            await send_password_reset_email("user@example.com", "reset-tok-99")

        html = captured[0]
        settings = get_settings()
        expected_url = f"{settings.frontend_url}/reset-password?token=reset-tok-99"
        assert expected_url in html

    @pytest.mark.asyncio
    async def test_contains_branding(self):
        """Must include Mergenix branding."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_password_reset_email
            await send_password_reset_email("user@example.com", "tok")

        html = captured[0]
        assert "Mergenix" in html

    @pytest.mark.asyncio
    async def test_contains_heading(self):
        """Must include the password reset heading."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_password_reset_email
            await send_password_reset_email("user@example.com", "tok")

        html = captured[0]
        assert "Reset Your Password" in html

    @pytest.mark.asyncio
    async def test_contains_cta_button(self):
        """Must have a Reset Password CTA button."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_password_reset_email
            await send_password_reset_email("user@example.com", "tok")

        html = captured[0]
        assert "Reset Password" in html

    @pytest.mark.asyncio
    async def test_contains_expiry_notice(self):
        """Must mention the 1-hour expiry."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_password_reset_email
            await send_password_reset_email("user@example.com", "tok")

        html = captured[0]
        assert "1 hour" in html

    @pytest.mark.asyncio
    async def test_subject_line(self):
        """send_password_reset_email should use the correct subject."""
        mock_send = AsyncMock(return_value=True)
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_password_reset_email
            await send_password_reset_email("user@example.com", "tok")

        mock_send.assert_called_once()
        call_args = mock_send.call_args
        assert call_args[0][1] == "Reset your Mergenix password"


class TestTierUpgradeEmail:
    """send_tier_upgrade_email renders the tier upgrade template."""

    @pytest.mark.asyncio
    async def test_contains_tier_name(self):
        """The rendered HTML must include the capitalized tier name."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_tier_upgrade_email
            await send_tier_upgrade_email("user@example.com", "premium")

        html = captured[0]
        assert "Premium" in html

    @pytest.mark.asyncio
    async def test_contains_welcome_heading(self):
        """Must include the welcome heading with the tier name."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_tier_upgrade_email
            await send_tier_upgrade_email("user@example.com", "pro")

        html = captured[0]
        assert "Welcome to Mergenix Pro" in html

    @pytest.mark.asyncio
    async def test_contains_analysis_link(self):
        """Must include a link to the analysis page."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_tier_upgrade_email
            await send_tier_upgrade_email("user@example.com", "premium")

        html = captured[0]
        settings = get_settings()
        assert f"{settings.frontend_url}/analysis" in html

    @pytest.mark.asyncio
    async def test_contains_cta_button(self):
        """Must have a Start Analyzing CTA."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_tier_upgrade_email
            await send_tier_upgrade_email("user@example.com", "premium")

        html = captured[0]
        assert "Start Analyzing" in html

    @pytest.mark.asyncio
    async def test_contains_branding(self):
        """Must include Mergenix branding from the base template."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_tier_upgrade_email
            await send_tier_upgrade_email("user@example.com", "premium")

        html = captured[0]
        assert "Mergenix" in html
        assert "Genetic Offspring Analysis Platform" in html

    @pytest.mark.asyncio
    async def test_subject_line_premium(self):
        """Subject line should include capitalized tier."""
        mock_send = AsyncMock(return_value=True)
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_tier_upgrade_email
            await send_tier_upgrade_email("user@example.com", "premium")

        mock_send.assert_called_once()
        call_args = mock_send.call_args
        assert call_args[0][1] == "Welcome to Mergenix Premium!"

    @pytest.mark.asyncio
    async def test_subject_line_pro(self):
        """Subject line should include capitalized tier for pro."""
        mock_send = AsyncMock(return_value=True)
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_tier_upgrade_email
            await send_tier_upgrade_email("user@example.com", "pro")

        mock_send.assert_called_once()
        call_args = mock_send.call_args
        assert call_args[0][1] == "Welcome to Mergenix Pro!"


class TestDeletionConfirmationEmail:
    """send_deletion_confirmation_email renders the deletion confirmation template."""

    @pytest.mark.asyncio
    async def test_contains_deletion_url(self):
        """The rendered HTML must include the deletion URL with the token."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_deletion_confirmation_email
            await send_deletion_confirmation_email("user@example.com", "del-token-xyz")

        html = captured[0]
        settings = get_settings()
        expected_url = f"{settings.frontend_url}/confirm-deletion?token=del-token-xyz"
        assert expected_url in html

    @pytest.mark.asyncio
    async def test_contains_branding(self):
        """The rendered HTML must include Mergenix branding from the base template."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_deletion_confirmation_email
            await send_deletion_confirmation_email("user@example.com", "tok")

        html = captured[0]
        assert "Mergenix" in html
        assert "Genetic Offspring Analysis Platform" in html

    @pytest.mark.asyncio
    async def test_contains_heading(self):
        """The rendered HTML must include the deletion confirmation heading."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_deletion_confirmation_email
            await send_deletion_confirmation_email("user@example.com", "tok")

        html = captured[0]
        assert "Confirm Account Deletion" in html

    @pytest.mark.asyncio
    async def test_contains_cta_button(self):
        """The rendered HTML must have a Confirm Account Deletion CTA button."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_deletion_confirmation_email
            await send_deletion_confirmation_email("user@example.com", "tok")

        html = captured[0]
        # The CTA button text appears in the <a> tag
        assert "Confirm Account Deletion" in html

    @pytest.mark.asyncio
    async def test_contains_expiry_notice(self):
        """The rendered HTML must mention the 24-hour expiry."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_deletion_confirmation_email
            await send_deletion_confirmation_email("user@example.com", "tok")

        html = captured[0]
        assert "24 hours" in html

    @pytest.mark.asyncio
    async def test_subject_line(self):
        """send_deletion_confirmation_email should use the correct subject."""
        mock_send = AsyncMock(return_value=True)
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_deletion_confirmation_email
            await send_deletion_confirmation_email("user@example.com", "tok")

        mock_send.assert_called_once()
        call_args = mock_send.call_args
        assert call_args[0][1] == "Confirm your Mergenix account deletion"


class TestAutoescaping:
    """Jinja2 autoescape prevents XSS in user-supplied values."""

    @pytest.mark.asyncio
    async def test_verification_escapes_token(self):
        """A token with HTML chars should be escaped in the rendered output."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_verification_email
            await send_verification_email("user@example.com", '<script>alert("xss")</script>')

        html = captured[0]
        # The raw <script> tag must NOT appear unescaped
        assert "<script>" not in html

    @pytest.mark.asyncio
    async def test_tier_upgrade_escapes_tier(self):
        """A tier with HTML chars should be escaped."""
        mock_send, captured = _capture_html()
        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import send_tier_upgrade_email
            await send_tier_upgrade_email("user@example.com", '<img src=x onerror="alert(1)">')

        html = captured[0]
        assert 'onerror="alert(1)"' not in html


class TestBaseTemplateStructure:
    """The base template provides shared structure for all emails."""

    @pytest.mark.asyncio
    async def test_all_emails_are_valid_html_fragments(self):
        """All emails should be wrapped in an HTML container element."""
        mock_send, captured = _capture_html()

        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import (
                send_password_reset_email,
                send_tier_upgrade_email,
                send_verification_email,
            )
            await send_verification_email("a@b.com", "t1")
            await send_password_reset_email("a@b.com", "t2")
            await send_tier_upgrade_email("a@b.com", "premium")

        for html in captured:
            # Every email should contain a top-level div wrapper
            assert "<div" in html
            assert "</div>" in html

    @pytest.mark.asyncio
    async def test_all_emails_have_branded_header(self):
        """All emails should include the Mergenix branded header section."""
        mock_send, captured = _capture_html()

        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import (
                send_password_reset_email,
                send_tier_upgrade_email,
                send_verification_email,
            )
            await send_verification_email("a@b.com", "t1")
            await send_password_reset_email("a@b.com", "t2")
            await send_tier_upgrade_email("a@b.com", "premium")

        for html in captured:
            assert "Mergenix" in html
            assert "Genetic Offspring Analysis Platform" in html

    @pytest.mark.asyncio
    async def test_all_emails_have_content_block(self):
        """All emails should have a content block section after the header."""
        mock_send, captured = _capture_html()

        with patch("app.services.email_service._send", mock_send):
            from app.services.email_service import (
                send_password_reset_email,
                send_tier_upgrade_email,
                send_verification_email,
            )
            await send_verification_email("a@b.com", "t1")
            await send_password_reset_email("a@b.com", "t2")
            await send_tier_upgrade_email("a@b.com", "premium")

        for html in captured:
            # Each email has a heading (h2) and at least one paragraph
            assert "<h2" in html
            assert "<p" in html
