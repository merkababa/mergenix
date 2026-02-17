"""
Tests for main.py application factory.

Covers Sentry PII scrubbing to ensure stack traces and breadcrumbs
do not leak emails, tokens, or passwords.
"""

from __future__ import annotations

from unittest.mock import patch

from app.main import _scrub_pii

# ── Fix 3: Sentry PII scrubber ──────────────────────────────────────────


def test_sentry_init_includes_before_send_callback() -> None:
    """_init_sentry should pass a before_send callback when initializing Sentry."""
    from app.main import _init_sentry

    with patch("app.main.sentry_sdk.init") as mock_init:
        _init_sentry("https://fake@sentry.io/123")
        mock_init.assert_called_once()
        call_kwargs = mock_init.call_args[1] if mock_init.call_args[1] else {}
        # If called with positional + keyword, check kwargs
        if not call_kwargs:
            call_kwargs = dict(zip(
                ["dsn", "traces_sample_rate", "profiles_sample_rate", "environment", "before_send"],
                mock_init.call_args[0] if mock_init.call_args[0] else [],
                strict=False,
            ))
            call_kwargs.update(mock_init.call_args[1] or {})
        assert "before_send" in call_kwargs, (
            "sentry_sdk.init must include a before_send callback for PII scrubbing"
        )
        assert callable(call_kwargs["before_send"]), (
            "before_send must be a callable"
        )


def test_sentry_before_send_strips_email_from_exception_values() -> None:
    """The Sentry before_send callback should strip email addresses from exception values."""
    event = {
        "exception": {
            "values": [
                {"value": "User user@example.com not found in database"},
            ],
        },
    }
    hint: dict = {}
    scrubbed = _scrub_pii(event, hint)
    for exc_val in scrubbed["exception"]["values"]:
        assert "user@example.com" not in exc_val["value"], (
            "Email should be scrubbed from exception values"
        )
        assert "[EMAIL]" in exc_val["value"], (
            "Email should be replaced with [EMAIL] placeholder"
        )


def test_sentry_before_send_strips_tokens_from_exception_values() -> None:
    """The Sentry before_send callback should strip JWT-like tokens from exception values."""
    event = {
        "exception": {
            "values": [
                {"value": "Token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U is expired"},
            ],
        },
    }
    hint: dict = {}
    scrubbed = _scrub_pii(event, hint)
    for exc_val in scrubbed["exception"]["values"]:
        assert "eyJhbGciOiJIUzI1NiI" not in exc_val["value"], (
            "JWT token should be scrubbed from exception values"
        )
        assert "[TOKEN]" in exc_val["value"], (
            "Token should be replaced with [TOKEN] placeholder"
        )


def test_sentry_before_send_strips_email_from_breadcrumbs() -> None:
    """The Sentry before_send callback should strip email addresses from breadcrumb messages."""
    event = {
        "breadcrumbs": {
            "values": [
                {"message": "Sending email to admin@mergenix.com"},
                {"message": "Login attempt for test.user+tag@domain.co.uk"},
            ],
        },
    }
    hint: dict = {}
    scrubbed = _scrub_pii(event, hint)
    for bc in scrubbed["breadcrumbs"]["values"]:
        assert "admin@mergenix.com" not in bc.get("message", ""), (
            "Email should be scrubbed from breadcrumbs"
        )
        assert "test.user+tag@domain.co.uk" not in bc.get("message", ""), (
            "Email should be scrubbed from breadcrumbs"
        )


def test_sentry_before_send_strips_password_from_exception_values() -> None:
    """The Sentry before_send callback should strip password-like strings from exception values."""
    event = {
        "exception": {
            "values": [
                {"value": 'password="MySecretP@ss123" in request body'},
            ],
        },
    }
    hint: dict = {}
    scrubbed = _scrub_pii(event, hint)
    for exc_val in scrubbed["exception"]["values"]:
        assert "MySecretP@ss123" not in exc_val["value"], (
            "Password value should be scrubbed from exception values"
        )


def test_sentry_before_send_handles_events_without_exception() -> None:
    """The scrubber should not crash on events that have no exception or breadcrumbs."""
    event: dict = {"message": "Regular log entry with user@example.com"}
    hint: dict = {}
    scrubbed = _scrub_pii(event, hint)
    # Should not crash and should still scrub the message if present
    assert scrubbed is not None


def test_sentry_not_initialized_without_dsn() -> None:
    """_init_sentry should not call sentry_sdk.init when DSN is empty."""
    from app.main import _init_sentry

    with patch("app.main.sentry_sdk.init") as mock_init:
        _init_sentry("")
        mock_init.assert_not_called()
