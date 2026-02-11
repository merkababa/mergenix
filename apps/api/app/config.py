"""
Centralized configuration via pydantic-settings.

All settings are loaded from environment variables (optionally via .env file).
No secrets are hardcoded — every sensitive value MUST be supplied at runtime.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ── Database ──────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://mergenix:mergenix@localhost:5432/mergenix"

    # ── Auth / JWT ────────────────────────────────────────────────────────
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # ── Data Encryption ───────────────────────────────────────────────────
    # Separate key for encrypting analysis result data at rest (AES-256-GCM).
    # If not set, falls back to jwt_secret for backward compatibility.
    # IMPORTANT: Once set, do NOT change — rotating this key makes all
    # previously encrypted analysis results permanently unrecoverable.
    data_encryption_key: str = ""

    @property
    def encryption_secret(self) -> str:
        """Return the key used for data encryption (AES-256-GCM).

        Falls back to jwt_secret if DATA_ENCRYPTION_KEY is not set,
        ensuring backward compatibility with existing encrypted data.
        """
        return self.data_encryption_key or self.jwt_secret

    # ── Stripe ────────────────────────────────────────────────────────────
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_premium: str = ""
    stripe_price_pro: str = ""

    # ── Email (Resend) ────────────────────────────────────────────────────
    resend_api_key: str = ""
    email_from: str = "noreply@mergenix.com"

    # ── Google OAuth ──────────────────────────────────────────────────────
    google_client_id: str = ""
    google_client_secret: str = ""

    # ── Application ───────────────────────────────────────────────────────
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"
    log_level: str = "INFO"
    cookie_secure: bool = True

    # ── Sentry ────────────────────────────────────────────────────────────
    sentry_dsn: str = ""

    # ── ClinVar ───────────────────────────────────────────────────────────
    clinvar_ftp_url: str = "https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz"

    # ── Admin ─────────────────────────────────────────────────────────────
    admin_api_key: str = ""

    @property
    def is_production(self) -> bool:
        """Return True if running in production environment."""
        return self.environment == "production"

    @property
    def cors_origins(self) -> list[str]:
        """Return list of allowed CORS origins based on environment."""
        if self.is_production:
            return [self.frontend_url]
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    s = Settings()
    if not s.jwt_secret:
        logger.warning(
            "JWT_SECRET is not set. Authentication will not work. "
            "Set the JWT_SECRET environment variable."
        )
    return s
