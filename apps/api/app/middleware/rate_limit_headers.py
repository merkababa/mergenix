"""
Custom rate limit exceeded handler with standard response headers.

Replaces slowapi's default ``_rate_limit_exceeded_handler`` to ensure
that 429 responses include all standard rate limit headers:
- X-RateLimit-Limit
- X-RateLimit-Remaining
- X-RateLimit-Reset
- Retry-After (integer seconds until the rate limit window resets)

The X-RateLimit-{Limit,Remaining,Reset} headers are also injected on
*successful* responses by slowapi's decorator wrapper when
``headers_enabled=True`` on the Limiter instance.
"""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.responses import Response


async def rate_limit_exceeded_handler(
    request: Request,
    exc: RateLimitExceeded,
) -> Response:
    """Build a 429 JSON response with standard rate limit headers.

    This handler is registered via ``app.add_exception_handler(
    RateLimitExceeded, rate_limit_exceeded_handler)`` and replaces
    slowapi's default handler. It delegates header injection to the
    limiter's built-in ``_inject_headers`` method, which reads
    ``request.state.view_rate_limit`` (set during limit evaluation).

    Returns:
        JSONResponse with status 429 and rate limit headers.
    """
    response = JSONResponse(
        {"error": f"Rate limit exceeded: {exc.detail}"},
        status_code=429,
    )

    # Let slowapi inject X-RateLimit-{Limit,Remaining,Reset} and Retry-After
    # using its built-in header injection (requires headers_enabled=True).
    limiter = request.app.state.limiter
    view_rate_limit = getattr(request.state, "view_rate_limit", None)
    if view_rate_limit is not None:
        # slowapi v0.1.9 internal API — pinned in requirements.txt
        response = limiter._inject_headers(response, view_rate_limit)

    return response
