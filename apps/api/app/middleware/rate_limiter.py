"""
Rate limiting configuration using slowapi.

Defines per-endpoint limits to protect against brute-force attacks
and abuse while allowing reasonable usage for legitimate users.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# Global limiter instance — attached to the FastAPI app in main.py
# NOTE: In-memory storage does not share state across multiple workers/processes.
# For production multi-worker deployments, switch to Redis: storage_uri="redis://host:port"
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/minute"],
    storage_uri="memory://",
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
LIMIT_WEBHOOK = "100/minute"
