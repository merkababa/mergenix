"""
Unified configuration system for Mergenix.

Uses pydantic-settings to consolidate all environment-dependent settings
into a single validated configuration object. Tier definitions (Free/Premium/Pro
features and limits) remain in Source/tier_config.py since they are not
environment-dependent.

Usage:
    from Source.config import settings
    print(settings.app_name)
"""

from __future__ import annotations

import logging
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class AppSettings(BaseSettings):
    """Mergenix application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_prefix="MERGENIX_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- App ---
    app_name: str = "Mergenix"
    app_version: str = "2.0.0"
    debug: bool = False
    log_level: str = "INFO"

    # --- Auth / Session ---
    secret_key: str = Field(
        default="CHANGE-ME-IN-PRODUCTION",
        description="JWT / session secret key. Must be overridden in production.",
    )
    token_expiry_hours: int = 24
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 30
    session_timeout_minutes: int = 30

    # --- Google OAuth ---
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8501/Login?oauth_callback=google"

    # --- Stripe ---
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_premium: str = ""
    stripe_price_id_pro: str = ""

    # --- PayPal ---
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_webhook_id: str = ""
    paypal_mode: str = "sandbox"

    # --- Database ---
    database_url: str = "sqlite:///data/mergenix.db"

    # --- File upload ---
    max_upload_size_mb: int = 200

    # --- SMTP / Email ---
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    from_email: str = "noreply@mergenix.com"
    from_name: str = "Mergenix"
    app_base_url: str = "http://localhost:8501"


def _warn_if_default_secret_key(s: AppSettings) -> None:
    """Log a warning if the default secret key is used in production (non-debug) mode."""
    if not s.debug and s.secret_key == "CHANGE-ME-IN-PRODUCTION":
        logger.warning(
            "Using default secret key in production. "
            "Set MERGENIX_SECRET_KEY environment variable."
        )


@lru_cache(maxsize=1)
def get_settings() -> AppSettings:
    """Return a cached singleton AppSettings instance."""
    s = AppSettings()
    _warn_if_default_secret_key(s)
    return s


# Module-level convenience alias
settings = get_settings()
