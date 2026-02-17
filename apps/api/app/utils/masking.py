"""
Public email/PII masking utilities.

Extracted from ``app.services.email_service`` so that multiple modules
can import a public ``mask_email()`` without depending on a private ``_``-prefixed
function in a service module.
"""

from __future__ import annotations


def mask_email(email: str) -> str:
    """Mask an email address for safe logging.

    Returns a string like ``t***@example.com``.  If the input has no ``@``,
    returns ``***``.  If the local part is empty (e.g. ``@domain.com``),
    returns ``***@domain.com``.
    """
    if "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    if not local:
        return f"***@{domain}"
    return f"{local[0]}***@{domain}"
