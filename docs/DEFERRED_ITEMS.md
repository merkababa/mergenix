# Deferred Items — Review Debt Tracker

Items identified during code review that were intentionally deferred. Grouped by priority.

## Pre-Production (must fix before launch)

- [ ] **In-memory rate limiter needs Redis** — `apps/api/app/middleware/rate_limiter.py:16` uses `storage_uri="memory://"`. Each uvicorn worker has its own counter, so effective rate limits multiply by worker count. Switch to `storage_uri="redis://..."` for shared state. (Flagged by: Security, Technologist — Sprints 2+3)
- [ ] **OAuth account deletion** — Users who signed up via Google OAuth cannot self-delete (must contact support). GDPR Art. 17 requires erasure to be as easy as signup. Implement OAuth re-auth flow for identity confirmation before deletion. `apps/api/app/routers/gdpr.py:92-96`. (Flagged by: Legal — Sprint 2)

## Code Quality Debt (non-blocking, improves maintainability)

- [ ] **Hardcoded email templates as f-strings** — All email HTML lives as multi-line f-strings in `apps/api/app/services/email_service.py`. Extract to Jinja2 template files or a dedicated `email_templates.py` module. (Flagged by: Code Quality — Sprint 3)
- [ ] **Hardcoded tier strings** — `"pro"`, `"premium"`, `"free"` used as raw strings throughout routers, services, and middleware. Create a shared `Tier` enum in `app/constants.py` and use it everywhere. (Flagged by: Architect — Sprint 3)
- [ ] **Brittle upgrade/downgrade logic** — `payment_service.py:65` uses hardcoded `if user.tier == "premium" and tier == "pro"`. Adding a new tier (e.g., "Enterprise") requires manual refactoring. Make tier ordering data-driven via an ordered enum. (Flagged by: QA — Sprint 3)
- [ ] **Rate limiting not integration-tested** — No test verifies that HTTP 429 actually triggers after exceeding the rate limit threshold. Add a loop test for the analytics track endpoint. (Flagged by: QA — Sprint 3)
- [ ] **Legacy data format runtime check** — `apps/api/app/routers/analysis.py:270` has a try/except for old `result_data` format (pre-ZKE). Create an Alembic migration to normalize all existing data to EncryptedEnvelope JSON, then remove the runtime fallback. (Flagged by: Code Quality — Sprint 3)
- [ ] **Webhook idempotency edge case** — If the first webhook attempt commits the payment but crashes before sending the receipt email, the idempotent replay skips the email permanently. Consider a `receipt_sent` flag or reliable email queue. `apps/api/app/services/payment_service.py:213-220`. (Flagged by: Security — Sprint 3 Gemini)

## Process / Operational (not code changes)

- [ ] **DPIA documentation** — GDPR Art. 35 requires a formal Data Protection Impact Assessment for processing genetic data at scale. No DPIA document exists. (Flagged by: Legal — Sprints 2+3)
- [ ] **Age verification** — No age gate at registration. Processing genetic data of minors has heightened requirements under GDPR Art. 8. Add age confirmation at signup. (Flagged by: Legal — Sprints 2+3)
- [ ] **Audit log retention policy** — No auto-expiry or TTL on audit log records. GDPR Art. 5(1)(e) storage limitation principle. Define a retention period and implement periodic purging. (Flagged by: Legal — Sprint 3)
- [ ] **Verify `support@mergenix.com`** — Referenced in the purchase receipt email template but the alias may not exist yet. Set up in domain provider and confirm it is monitored. (Flagged by: Business — Sprint 3)
- [ ] **`high_risk_count` in plaintext summary** — `apps/api/app/schemas/analysis.py:191` stores `high_risk_count` and `health_risk_count` unencrypted in the analysis summary. Could indirectly reveal health status. Evaluate whether these should move behind the ZKE envelope. Tracked as `TODO(Phase 2)` in code. (Flagged by: Legal — Sprints 2+3)
