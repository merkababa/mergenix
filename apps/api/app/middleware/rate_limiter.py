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
#
# IMPORTANT — IP Spoofing / Proxy Configuration:
#   get_remote_address uses request.client.host, which returns the direct
#   TCP peer address. Behind a load balancer (AWS ALB, Nginx, Cloudflare),
#   this resolves to the LB's internal IP — effectively rate-limiting ALL
#   users as a single entity.
#
#   Production deployment MUST configure trusted proxy headers:
#
#   1. Uvicorn: Run with --proxy-headers --forwarded-allow-ips='<LB_IP>'
#      This makes request.client.host use the X-Forwarded-For value.
#
#      Concrete examples for common deployments:
#
#        # Single reverse proxy (Nginx on same host):
#        uvicorn app.main:create_app --factory \
#          --proxy-headers \
#          --forwarded-allow-ips='127.0.0.1'
#
#        # AWS ALB (VPC CIDR range — replace with your actual VPC CIDR):
#        uvicorn app.main:create_app --factory \
#          --proxy-headers \
#          --forwarded-allow-ips='10.0.0.0/8'
#
#        # Cloudflare + Nginx (trust both Nginx and CF IP ranges):
#        uvicorn app.main:create_app --factory \
#          --proxy-headers \
#          --forwarded-allow-ips='127.0.0.1,173.245.48.0/20,103.21.244.0/22'
#
#        # Trust all proxies (ONLY for development / trusted networks):
#        uvicorn app.main:create_app --factory \
#          --proxy-headers \
#          --forwarded-allow-ips='*'
#
#      Uvicorn uses ProxyHeadersMiddleware internally when --proxy-headers
#      is enabled. This middleware rewrites request.client.host using the
#      X-Forwarded-For header, but ONLY when the direct peer IP matches
#      the --forwarded-allow-ips whitelist. This is the same middleware
#      referenced in app/utils/request_helpers.py::client_ip().
#
#   2. Alternatively, implement a custom key_func that securely parses
#      X-Forwarded-For, trusting only the rightmost non-private IP:
#
#        def get_real_ip(request: Request) -> str:
#            forwarded = request.headers.get("X-Forwarded-For", "")
#            if forwarded:
#                # Rightmost entry is set by the trusted proxy
#                return forwarded.split(",")[-1].strip()
#            return request.client.host if request.client else "unknown"
#
#   3. NEVER trust X-Forwarded-For blindly — attackers can inject arbitrary
#      values. Only the entries added by YOUR infrastructure are trustworthy.
#      Configure --forwarded-allow-ips to whitelist your LB/proxy IPs.
#
#   Cross-references:
#     - app/utils/request_helpers.py — client_ip() uses request.client.host
#       and documents why X-Forwarded-For is NOT parsed at the app level.
#     - app/routers/auth.py — uses the shared client_ip helper.
#     - Uvicorn docs: https://www.uvicorn.org/settings/#proxy-headers
#     - Uvicorn ProxyHeadersMiddleware source:
#       https://github.com/encode/uvicorn/blob/master/uvicorn/middleware/proxy_headers.py
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/minute"],
    storage_uri=get_settings().rate_limit_storage_uri,
    headers_enabled=True,
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
