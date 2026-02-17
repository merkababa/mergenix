"""
Tests for config.py startup validation.

Covers the validation that logs warnings when critical settings
(stripe_price_premium, stripe_price_pro) are empty in non-development
environments.
"""

from __future__ import annotations

import logging
import os
from unittest.mock import patch

import pytest
from app.config import get_settings

# ── Fix 1: Empty Stripe Price ID defaults warning ───────────────────────


def test_get_settings_warns_on_empty_stripe_prices_in_production(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """get_settings should log a warning when stripe price IDs are empty in production."""
    env_overrides = {
        "JWT_SECRET": "test-secret",
        "STRIPE_PRICE_PREMIUM": "",
        "STRIPE_PRICE_PRO": "",
        "ENVIRONMENT": "production",
    }

    with patch.dict(os.environ, env_overrides, clear=False):
        get_settings.cache_clear()
        with caplog.at_level(logging.WARNING, logger="app.config"):
            get_settings()

        # Should have logged a warning about empty Stripe price IDs
        stripe_warnings = [
            r for r in caplog.records
            if "stripe" in r.message.lower() and "price" in r.message.lower()
        ]
        assert len(stripe_warnings) >= 1, (
            f"Expected at least 1 Stripe price warning, got {len(stripe_warnings)}. "
            f"All warnings: {[r.message for r in caplog.records]}"
        )

    # Restore settings for other tests
    get_settings.cache_clear()


def test_get_settings_no_stripe_warning_in_development(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """get_settings should NOT warn about empty Stripe prices in development."""
    env_overrides = {
        "JWT_SECRET": "test-secret",
        "STRIPE_PRICE_PREMIUM": "",
        "STRIPE_PRICE_PRO": "",
        "ENVIRONMENT": "development",
    }

    with patch.dict(os.environ, env_overrides, clear=False):
        get_settings.cache_clear()
        with caplog.at_level(logging.WARNING, logger="app.config"):
            get_settings()

        # Should NOT have logged a Stripe price warning in development
        stripe_warnings = [
            r for r in caplog.records
            if "stripe" in r.message.lower() and "price" in r.message.lower()
        ]
        assert len(stripe_warnings) == 0, (
            f"Should not warn about Stripe prices in development. "
            f"Warnings: {[r.message for r in stripe_warnings]}"
        )

    # Restore settings for other tests
    get_settings.cache_clear()


def test_get_settings_no_stripe_warning_when_prices_configured(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """get_settings should NOT warn when Stripe price IDs are properly configured."""
    env_overrides = {
        "JWT_SECRET": "test-secret",
        "STRIPE_PRICE_PREMIUM": "price_abc123",
        "STRIPE_PRICE_PRO": "price_def456",
        "ENVIRONMENT": "production",
    }

    with patch.dict(os.environ, env_overrides, clear=False):
        get_settings.cache_clear()
        with caplog.at_level(logging.WARNING, logger="app.config"):
            get_settings()

        # Should NOT have logged a Stripe price warning when prices are configured
        stripe_warnings = [
            r for r in caplog.records
            if "stripe" in r.message.lower() and "price" in r.message.lower()
        ]
        assert len(stripe_warnings) == 0, (
            f"Should not warn when Stripe prices are configured. "
            f"Warnings: {[r.message for r in stripe_warnings]}"
        )

    # Restore settings for other tests
    get_settings.cache_clear()
