# Phase History — Mergenix V3 Rewrite

Historical record of completed phases, review grades, and key decisions.

---

## Phase 1: Monorepo Scaffolding (PR #28 — Merged)

- Monorepo setup with turborepo
- `apps/web/` (Next.js 15), `apps/api/` (FastAPI), `packages/genetics-engine/`, `packages/shared-types/`, `packages/genetics-data/`

---

## Phase 2: Frontend Pages (PR #30 — Merged)

- Next.js 15 frontend scaffold with all placeholder pages
- Tailwind CSS + Zustand state management
- React 19 compatibility

---

## Phase 3: Genetics Engine (PR #31 — Merged, 6/6 A+)

**Date:** 2026-02-09

Full TypeScript port of genetics analysis for client-side Web Workers. Parser (23andMe/AncestryDNA/MyHeritage/VCF), carrier analysis (AR/AD/X-linked), trait prediction (Punnett square), pharmacogenomics (CPIC star alleles), PRS (normal CDF), ethnicity (Bayesian), counseling (triage+referral). Streaming iterateLines() parser, countKeys() helper, centralized TIER_GATING. 11 source files (~5,500 LOC), 8 test suites (366 tests). 7 review rounds.

| Reviewer     | Final Grade |
| ------------ | ----------- |
| Architect    | A+          |
| QA           | A+          |
| Scientist    | A+          |
| Technologist | A+          |
| Business     | A+          |
| Designer     | A+          |

---

## Phase 4: Analysis UI (PR #32 — Merged, 6/6 A+)

**Date:** 2026-02-09

Wire genetics engine into Next.js. Worker shim + store rewrite + useGeneticsWorker hook + 6 result tabs (overview, carrier, traits, pgx, prs, counseling) + demo data (23 verified rsIDs, CPIC-compliant PGx, real GWAS PRS refs) + 3 polish components (TierUpgradePrompt, MedicalDisclaimer, PopulationSelector). Full ARIA tab navigation. Tier-gating in all 6 tabs. Lazy-loaded demo. useCallback handlers, React.memo, next/dynamic lazy tabs. 148 web tests + 366 engine = 514 total. 30+ files, ~5,300 new LOC.

5 review rounds:

| Reviewer     | Final Grade |
| ------------ | ----------- |
| Architect    | A+          |
| QA           | A+          |
| Scientist    | A+          |
| Technologist | A+          |
| Business     | A+          |
| Designer     | A+          |

---

## Phase 5: Auth UI (PR #34 — Merged, 7/7 A+)

**Date:** 2026-02-09

Comprehensive auth test suite (19 new test files, 423 tests across 31 files). Placeholder completion for sessions-section and danger-zone components. Security hardening (encodeURIComponent, URLSearchParams, OAuth state preservation). ARIA accessibility (aria-busy, aria-live, aria-describedby). Performance (AbortController, useMemo, useCallback, hoisted constants). Type safety (Tier from shared-types). 26 files, ~5,600 new LOC.

2 review rounds:

| Reviewer         | R1  | R2 (Final) | Key Fixes                                              |
| ---------------- | --- | ---------- | ------------------------------------------------------ |
| Architect        | A   | **A+**     | Tier type from shared-types (not string)               |
| QA               | A   | **A+**     | 423 tests verified, fixture types correct              |
| Scientist        | A+  | **A+**     | No genetics code affected                              |
| Technologist     | A-  | **A+**     | AbortController, URLSearchParams, useMemo, useCallback |
| Business         | A+  | **A+**     | No business logic affected                             |
| Designer         | A-  | **A+**     | aria-busy, aria-live, aria-describedby, aria-hidden    |
| Security Analyst | A-  | **A+**     | encodeURIComponent, OAuth state, URLSearchParams       |

---

## Phase 6: Payment UI (PR #35 — Merged, 8/8 A+)

**Date:** 2026-02-10

Payment API client, Zustand store, subscription page rewrite (hardcoded to data-driven), upgrade modal (focus trap, WCAG), success/cancel pages. 80 new tests (503 web total). 12 files, +2,302 LOC.

### What Was Done

1. **Payment API client (`payment-client.ts`):** 3 endpoints: `createCheckout`, `getPaymentHistory`, `getSubscriptionStatus`. snake_case to camelCase transformers matching auth-client.ts pattern.
2. **Payment Zustand store (`payment-store.ts`):** State: paymentHistory, subscriptionStatus, isLoading, isCheckoutLoading, error. Actions: createCheckout, fetchPaymentHistory, fetchSubscriptionStatus, clearError, reset.
3. **Subscription page rewrite (`subscription/page.tsx`):** Hardcoded "Premium $12.90" to data-driven from auth store + payment store. Dynamic upgrade options: Free to Premium+Pro, Premium to Pro, Pro to "best plan". "Pay the difference" pricing, payment history section, ARIA.
4. **Upgrade modal (`upgrade-modal.tsx`):** Plan comparison display, focus trap (Tab/Shift+Tab cycling), Escape to close. Backdrop click, body scroll lock, error display within modal. ARIA: role="dialog", aria-modal, aria-labelledby, aria-describedby, aria-busy.
5. **Success/cancel pages:** Success: 20-second WCAG 2.2.1 auto-redirect, Suspense boundary for useSearchParams. Cancel: retry + dashboard links.
6. **Tests (80 new, 503 web total):** payment-client.test.ts (18), payment-store.test.ts (22), subscription-page.test.tsx (15), upgrade-modal.test.tsx (12), payment-success.test.tsx (8), payment-cancel.test.tsx (5).

2 Gemini rounds + Claude final:

| Reviewer         | Gemini R1 | Gemini R2 | Claude Final | Key Fixes                                    |
| ---------------- | --------- | --------- | ------------ | -------------------------------------------- |
| Architect        | A         | —         | **A+**       | None needed                                  |
| QA               | A         | —         | **A+**       | None needed                                  |
| Scientist        | N/A       | —         | **A+**       | No genetics code                             |
| Technologist     | A-        | A         | **A+**       | Focus trap in upgrade modal                  |
| Business         | A+        | —         | **A+**       | None needed                                  |
| Designer         | B         | A         | **A+**       | Focus trap + WCAG 2.2.1 redirect timer (20s) |
| Security Analyst | A         | —         | **A+**       | None needed                                  |
| Code Reviewer    | A         | —         | **A+**       | None needed                                  |

---

## Phase 7: Backend API (PR #36 — Open, 8/8 A+)

**Date:** 2026-02-10

Cookie-based auth refactor, 5 new endpoints (sessions CRUD, account deletion, resend-verification), backup codes (SHA-256, constant-time), async event loop safety (asyncio.to_thread for bcrypt/Stripe/email), webhook hardening (price validation + idempotency), subscription to tier-status naming, Alembic migration (6 tables), Docker entrypoint. 60 backend tests. 15 files, ~1,700 LOC.

### What Was Done

1. **Cookie-based auth refactor:** HttpOnly/Secure/SameSite=Lax refresh token cookie (path `/auth`). Login, 2FA login, OAuth callback set cookie; refresh reads from cookie; logout clears it. `COOKIE_SECURE` config flag for dev/prod flexibility.
2. **5 new endpoints:** `POST /auth/delete-account` (password-verified cascade delete), `GET /auth/sessions` (list active sessions with device parsing + `is_current`), `DELETE /auth/sessions/{id}` (revoke specific session), `DELETE /auth/sessions` (revoke all other sessions), `POST /auth/resend-verification` (anti-enumeration + rate limiting).
3. **Backup codes:** SHA-256 hashing (fast for high-entropy codes, not bcrypt). Constant-time comparison via `hmac.compare_digest`. Single-use (consumed on valid login). 2FA endpoint accepts both 6-digit TOTP and `xxxx-xxxx` backup code formats.
4. **Async event loop safety:** bcrypt `hash_password()`/`verify_password()` wrapped in `asyncio.to_thread()`. Stripe SDK `Session.create()`/`Webhook.construct_event()` wrapped in `asyncio.to_thread()`. Resend email SDK `Emails.send()` wrapped in `asyncio.to_thread()`.
5. **Webhook hardening:** Price validation: `_EXPECTED_AMOUNTS = {"premium": 1290, "pro": 2990}`. Idempotency: skip duplicate `stripe_payment_intent`.
6. **Naming fix:** `SubscriptionStatus` to `TierStatus`, `/payments/subscription` to `/payments/tier-status`.
7. **Infrastructure:** Alembic initial migration (6 tables). Docker entrypoint (DB wait + auto-migration). `.env.example` (16+ env vars). `docker-compose.rewrite.yml` updated.
8. **Tests (60 total):** Auth (42): cookie, sessions, account deletion, 2FA, backup codes, lockout, profile, verification. Payment (16): checkout, webhook (price + idempotency), history, tier status. Health (2).

5 review rounds (Gemini R1 to R2 + Claude + independent 8-agent + re-verify):

| Reviewer      | Gemini R1 | Gemini R2 | Claude Combined | Independent | Re-verify | Key Fixes                                                  |
| ------------- | --------- | --------- | --------------- | ----------- | --------- | ---------------------------------------------------------- |
| Architect     | A-        | A+        | A+              | A           | **A+**    | JSON column, URL parsing, dead schemas, lazy="raise"       |
| QA            | A         | A+        | A+              | A+          | **A+**    | caplog assertion, 57 to 60 tests                           |
| Scientist     | A+        | A+        | A+              | A+          | **A+**    | N/A — no genetics impact                                   |
| Technologist  | B+        | A+        | A+              | A-          | **A+**    | SHA-256, COOKIE_SECURE, asyncio.to_thread()                |
| Business      | A         | A+        | A+              | A-          | **A+**    | Price validation, idempotency, subscription to tier-status |
| Designer      | A         | A+        | A+              | A+          | **A+**    | N/A — API-only                                             |
| Security      | A-        | A+        | A+              | A+          | **A+**    | Constant-time comparison, admin key timing fix             |
| Code Reviewer | B+        | A+        | A+              | A           | **A+**    | Refactor to auth_service, shared TIER_RANK, dedupe imports |

---

## Review Grade Log

Track reviewer grades per phase to identify patterns and improve.

| Phase | Type     | Architect | QA  | Scientist | Technologist | Business | Designer | Security | Code Reviewer | Legal | Ethics |
| ----- | -------- | --------- | --- | --------- | ------------ | -------- | -------- | -------- | ------------- | ----- | ------ |
| 3     | Genetics | A+        | A+  | A+        | A+           | A+       | A+       | N/A      | N/A           | N/A   | N/A    |
| 4     | Frontend | A+        | A+  | A+        | A+           | A+       | A+       | N/A      | N/A           | N/A   | N/A    |
| 5     | Frontend | A+        | A+  | A+        | A+           | A+       | A+       | A+       | N/A           | N/A   | N/A    |
| 6     | Frontend | A+        | A+  | A+        | A+           | A+       | A+       | A+       | A+            | N/A   | N/A    |
| 7     | Backend  | A+        | A+  | A+        | A+           | A+       | A+       | A+       | A+            | N/A   | N/A    |

All grades shown are FINAL grades (after all review rounds). Phases 3-4 used 6 reviewers. Phase 5 added Security Analyst (7 reviewers). Phases 6-7 added Code Reviewer (8 reviewers). Legal and Ethics reviewers were defined in the protocol but not yet active in review cycles.
