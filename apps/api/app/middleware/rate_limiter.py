"""
Rate limiting configuration using slowapi.

Defines per-endpoint limits to protect against brute-force attacks
and abuse while allowing reasonable usage for legitimate users.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings

# Global limiter instance — attached to the FastAPI app in main.py
#
# NOTE: The storage backend is configurable via RATE_LIMIT_STORAGE_URI
# (defaults to "memory://"). In-memory storage does not share state across
# multiple workers/processes. For production multi-worker deployments,
# set RATE_LIMIT_STORAGE_URI to a Redis URI, e.g. "redis://host:6379".
#
# KNOWN LIMITATION (testability): get_settings() is called at module import
# time because slowapi's Limiter eagerly initializes the storage backend in
# __init__ (calls limits.storage.storage_from_string immediately). There is
# no lazy/deferred storage_uri mechanism in slowapi v0.1.x. This means tests
# cannot override RATE_LIMIT_STORAGE_URI after this module is imported. To
# test with a different storage backend, either (a) set the env var BEFORE
# importing this module, or (b) monkeypatch limiter._storage directly.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/minute"],
    storage_uri=get_settings().rate_limit_storage_uri,
)

# ── Per-Endpoint Limit Strings ────────────────────────────────────────────
#
# These are applied as decorators in the router modules:
#     @limiter.limit(LIMIT_LOGIN)
#     async def login(...): ...

LIMIT_LOGIN = "5/minute"
LIMIT_2FA_LOGIN = "5/minute"
LIMIT_REGISTER = "3/minute"
LIMIT_FORGOT_PASSWORD = "3/minute"
LIMIT_RESEND_VERIFICATION = "5/minute"
LIMIT_DELETE_ACCOUNT = "3/minute"
LIMIT_GENERAL_API = "60/minute"
LIMIT_DATA_EXPORT = "1/hour"
# Webhook limit is configurable via WEBHOOK_RATE_LIMIT env var (default
# 300/min). Set high to handle Stripe burst scenarios like mass subscription
# renewals where many webhook events fire in rapid succession.
LIMIT_WEBHOOK = get_settings().webhook_rate_limit
LIMIT_TRACK_EVENT = "30/minute"
LIMIT_ANALYTICS_SUMMARY = "10/minute"
