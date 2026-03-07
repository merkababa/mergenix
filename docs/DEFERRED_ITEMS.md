# Deferred Items — Review Debt Tracker

Items identified during code review that were intentionally deferred. Grouped by priority.

## Pre-Production (must fix before launch)

- [x] **In-memory rate limiter needs Redis** — `apps/api/app/middleware/rate_limiter.py` now uses configurable `RATE_LIMIT_STORAGE_URI` setting (default: `memory://`, set to `redis://...` for production). 5 integration tests including 429 verification. _(Fixed: 2026-02-17)_
- [x] **OAuth account deletion** — Email-based deletion confirmation flow for OAuth-only users. `POST /gdpr/request-deletion` sends token, `POST /gdpr/confirm-deletion` validates and deletes. 24hr expiry, SHA-256 hashed tokens. 15 tests. _(Fixed: 2026-02-17)_

## Code Quality Debt (non-blocking, improves maintainability)

- [x] **Hardcoded email templates as f-strings** — Extracted 4 templates to Jinja2 (`apps/api/app/templates/email/`). Base template with shared branding, autoescape for XSS protection. 29 tests. _(Fixed: 2026-02-17)_
- [x] **Hardcoded tier strings** — Centralized into `app/constants/tiers.py`: `Tier` IntEnum, string constants, `TIER_RANK`, `TIER_RESULT_LIMITS`, `TIER_PRICES`. 8 source files updated. 31 tests. _(Fixed: 2026-02-17)_
- [x] **Brittle upgrade/downgrade logic** — Tier ordering now data-driven via `TIER_RANK` dict from `app.constants.tiers`. No more hardcoded string comparisons. _(Fixed: 2026-02-17, part of tier enum refactor)_
- [x] **Rate limiting not integration-tested** — 5 integration tests: 429 trigger after exceeding limit, error body format, limiter reset, settings field, env var override. _(Fixed: 2026-02-17)_
- [x] **Legacy data format runtime check** — Status code changed 410→422. Uses `data_version` column to distinguish legacy (NULL) vs corrupt data. 7 new tests. _(Fixed: 2026-02-17)_
- [x] **Webhook idempotency edge case** — Added `receipt_sent` flag on Payment model, retry email on idempotent replay if unsent. UNIQUE constraint on `stripe_payment_intent`. `IntegrityError` catch for race conditions. Event ID fallback when payment*intent is None. 8 tests. *(Fixed: 2026-02-17)\_

## Process / Operational (not code changes)

- [x] **DPIA documentation** — Comprehensive 7-section DPIA template at `docs/DPIA.md`. Grounded in actual codebase (ZKE architecture, rate limits, cookie config, consent model, audit logging). _(Fixed: 2026-02-17)_
- [x] **Age verification** — `date_of_birth` required field at registration. 18+ enforced with HTTP 403. Auto-creates `age_verification` consent record. Nullable column for backward compatibility. 9 tests. _(Fixed: 2026-02-17)_
- [x] **Audit log retention policy** — 3-tier retention: security events 2yr, general events 1yr, orphaned (user deleted) 90d. `purge_expired_audit_logs()` + `get_retention_summary()` in `retention_service.py`. 19 tests. _(Fixed: 2026-02-17)_
- [ ] **Verify `support@mergenix.com`** — Referenced in the purchase receipt email template but the alias may not exist yet. Set up in domain provider and confirm it is monitored. (Flagged by: Business — Sprint 3)
- [x] **`high_risk_count` in plaintext summary** — Removed `high_risk_count` and `health_risk_count` from `_SUMMARY_ALLOWED_KEYS`. Replaced with non-sensitive `has_results: bool`. Alembic migration scrubs existing records. Frontend updated. _(Fixed: 2026-02-17)_
