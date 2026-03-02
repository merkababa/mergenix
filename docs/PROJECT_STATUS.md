# Mergenix — Project Status

**Last Updated:** 2026-03-02
**Version:** 3.0.0-alpha (V3 Rewrite — Feature-complete, 11/11 streams complete, launch readiness + tech debt resolved, alpha launch pending)
**Branch:** main

---

## Platform Overview

Mergenix is a genetic offspring analysis platform that compares two parents' DNA to predict offspring disease risk, traits, pharmacogenomics, polygenic risk scores, and genetic counseling recommendations. The V3 rewrite moves from Streamlit to a modern Next.js + FastAPI monorepo with client-side Web Worker genetics analysis.

### Key Capabilities
- **Disease Screening:** 2,715 genetic diseases across three inheritance models (AR, AD, X-linked)
- **Trait Prediction:** 476 trait SNPs across 15 categories predicted using Punnett square logic
- **Pharmacogenomics (PGx):** CPIC-guided analysis across 12 genes with star allele nomenclature
- **Polygenic Risk Scores (PRS):** 10 complex disease conditions with GWAS effect weights
- **Genetic Counseling:** Triage logic with urgency levels, specialty inference, referral letters
- **Ethnicity Adjustment:** Bayesian posterior calculation with gnomAD v4.1 data (9 populations)
- **File Format Support:** 23andMe, AncestryDNA, MyHeritage, VCF
- **Pricing Model:** One-time payment (no subscriptions), three tiers (Free/Premium/Pro)
- **Privacy:** All analysis runs client-side in Web Workers — no genetic data sent to servers

### Technology Stack (V3 Rewrite)
- **Frontend:** Next.js 15 + React 19 + Tailwind CSS + Zustand
- **Backend:** FastAPI (Python 3.10+)
- **Genetics Engine:** TypeScript (runs in Web Workers, ~5,500 LOC)
- **Monorepo:** pnpm workspaces + Turborepo
- **Shared Types:** `@mergenix/shared-types` package
- **Testing:** Vitest (1,614 web + 1,439 engine) + pytest (672 backend) = 3,725+ total
- **Linting:** ESLint + ruff
- **CI/CD:** GitHub Actions

---

## V3 Rewrite Progress

### Completed Phases

| Phase | Description | PR | Status | Tests |
|-------|-------------|-----|--------|-------|
| Phase 1 | Monorepo scaffolding (Next.js, FastAPI, shared types, CI) | PR #28 | Merged | — |
| Phase 2 | Frontend pages (home, products, about, legal, glossary, disease catalog, auth) | PR #30 | Merged | — |
| Phase 3 | Genetics engine (TypeScript, Web Worker, 11 modules) | PR #31 | **Merged** | 366 |
| Phase 4 | Analysis UI (wire engine into Next.js, 6 result tabs, demo mode) | PR #32 | **Merged** | 148 |
| Phase 5 | Auth UI (test suite + placeholder completion, 7/7 A+) | PR #34 | **Merged** | 423 |
| Phase 6 | Payment UI (Stripe checkout, upgrade modal, 8/8 A+) | PR #35 | **Merged** | 503 |
| Phase 7 | Backend API (cookie auth, 5 endpoints, async safety, 8/8 A+) | PR #36 | **Merged** | 60 |

### Phase 7: Backend API (MERGED — PR #36)

Cookie-based auth refactor, 5 new endpoints (sessions CRUD, account deletion, resend-verification), backup codes (SHA-256, constant-time), async event loop safety (asyncio.to_thread for bcrypt/Stripe/email), webhook hardening (price validation + idempotency), subscription→tier-status naming, Alembic migration (6 tables), Docker entrypoint. 60 backend tests.

**Key deliverables:**
- Cookie-based auth: HttpOnly/Secure/SameSite=Lax refresh token cookie (path `/auth`)
- 5 new endpoints: account deletion (cascade), sessions list/revoke/revoke-all, resend-verification
- Backup codes: SHA-256 hashing, constant-time comparison via hmac.compare_digest, single-use
- Async safety: bcrypt, Stripe SDK, Resend SDK all wrapped in asyncio.to_thread()
- Webhook hardening: expected price validation, idempotency via stripe_payment_intent
- Infrastructure: Alembic migration (6 tables), Docker entrypoint (DB wait + auto-migration)

**Review grades (5 rounds → 8/8 A+):**

| Reviewer | Gemini R1 | Gemini R2 | Claude Combined | Independent | Re-verify | Key Fixes |
|----------|-----------|-----------|-----------------|-------------|-----------|-----------|
| Architect | A- | A+ | A+ | A | **A+** | JSON column, URL parsing, dead schemas, lazy="raise" |
| QA | A | A+ | A+ | A+ | **A+** | caplog assertion, 57 to 60 tests |
| Scientist | A+ | A+ | A+ | A+ | **A+** | N/A — no genetics impact |
| Technologist | B+ | A+ | A+ | A- | **A+** | SHA-256, COOKIE_SECURE, asyncio.to_thread() |
| Business | A | A+ | A+ | A- | **A+** | Price validation, idempotency, subscription→tier-status |
| Designer | A | A+ | A+ | A+ | **A+** | N/A — API-only |
| Security | A- | A+ | A+ | A+ | **A+** | Constant-time comparison, admin key timing fix |
| Code Reviewer | B+ | A+ | A+ | A | **A+** | Refactor to auth_service, shared TIER_RANK, dedupe imports |

**Test coverage (V3 at Phase 7):**
- Genetics engine: 366 tests (8 suites)
- Web app: 503 tests (37 suites)
- Backend API: 60 tests (3 suites)
- **Phase 7 total: 929 tests passing**

### Phase 6: Payment UI (MERGED — PR #35)

Payment API client, Zustand store, subscription page rewrite, upgrade modal, success/cancel pages. Full Stripe checkout flow with WCAG-compliant accessibility.

**Key deliverables:**
- Payment API client with 3 endpoints (checkout, history, subscription) and snake_case→camelCase transformers
- Payment Zustand store with separate checkout loading state for better UX
- Subscription page rewritten from hardcoded to data-driven with "pay the difference" pricing
- Upgrade modal with focus trap (Tab/Shift+Tab cycling), Escape/backdrop close, body scroll lock
- Success page with 20-second WCAG 2.2.1 auto-redirect + Suspense boundary
- Cancel page with retry/dashboard navigation

**Review grades (2 Gemini rounds + Claude final → 8/8 A+):**

| Reviewer | Gemini R1 | Gemini R2 | Claude Final | Key Fixes |
|----------|-----------|-----------|--------------|-----------|
| Architect | A | — | **A+** | None needed |
| QA | A | — | **A+** | None needed |
| Scientist | N/A | — | **A+** | No genetics code |
| Technologist | A- | A | **A+** | Focus trap in upgrade modal |
| Business | A+ | — | **A+** | None needed |
| Designer | B | A | **A+** | Focus trap + WCAG 2.2.1 redirect timer (20s) |
| Security Analyst | A | — | **A+** | None needed |
| Code Reviewer | A | — | **A+** | None needed |

**Test coverage (V3):**
- Genetics engine: 366 tests (8 suites)
- Web app: 503 tests (37 suites)
- **Total: 869 tests passing**

### Phase 5: Auth UI (MERGED — PR #34)

Comprehensive auth test suite (19 new test files) + placeholder completion (sessions-section, danger-zone). Security hardening, accessibility improvements, and type safety fixes.

**Key deliverables:**
- 19 new test files covering auth-store, auth-client, HTTP client, 6 auth pages, 6 account components, middleware, auth-provider, password utils, account utils
- Sessions section: full rewrite with session table, revoke buttons, AbortController cleanup, ARIA live regions
- Danger zone: full rewrite with expandable deletion UI, password+checkbox confirmation, useCallback, ARIA
- Security: encodeURIComponent for session IDs, URLSearchParams for OAuth callback, OAuth state preservation (CSRF)
- Type safety: Tier from @mergenix/shared-types (not string)
- Accessibility: aria-busy, aria-live, aria-describedby, aria-hidden, sr-only loading status

**Review grades (2 rounds → 7/7 A+):**

| Reviewer | R1 | R2 (Final) | Key Fixes |
|----------|----|----|-----------|
| Architect | A | **A+** | Tier type from shared-types |
| QA | A | **A+** | 423 tests verified, fixture types correct |
| Scientist | A+ | **A+** | No genetics code affected |
| Technologist | A- | **A+** | AbortController, URLSearchParams, useMemo, useCallback |
| Business | A+ | **A+** | No business logic affected |
| Designer | A- | **A+** | aria-busy, aria-live, aria-describedby, aria-hidden |
| Security | A- | **A+** | encodeURIComponent, OAuth state, URLSearchParams |

**Test coverage (V3 at Phase 5):**
- Genetics engine: 366 tests (8 suites)
- Web app: 423 tests (31 suites)
- **Phase 5 total: 789 tests passing**

### Test Suites (V3 Web — 37 files)

| Suite | Tests | What it covers |
|-------|-------|----------------|
| `auth-store.test.ts` | 52 | All 23 store actions, login/2FA/OAuth flows, cookies, errors |
| `auth-client.test.ts` | 24 | All 22 API functions, snake_case→camelCase, encoding |
| `client.test.ts` | 20 | Base HTTP client, auth headers, retry, error handling |
| `login-content.test.tsx` | 15 | Login form, validation, 2FA flow, OAuth button |
| `register-content.test.tsx` | 15 | Registration form, validation, resend verification, OAuth |
| `forgot-password-content.test.tsx` | 8 | Reset email form, success state, error handling |
| `reset-password-content.test.tsx` | 10 | Token validation, password reset, success redirect |
| `verify-email-content.test.tsx` | 10 | Token verification, auto-redirect, error states |
| `callback-content.test.tsx` | 8 | OAuth callback, code/state extraction, error handling |
| `profile-section.test.tsx` | 10 | Profile display, edit mode, save, cancel, validation |
| `security-section.test.tsx` | 10 | 2FA toggle, password change trigger, modal opening |
| `change-password-modal.test.tsx` | 12 | Password change form, validation, success/error states |
| `two-factor-setup-modal.test.tsx` | 13 | QR code, TOTP verification, backup codes, 3-step flow |
| `sessions-section.test.tsx` | 8 | Session table, revoke, revoke all, loading, error |
| `danger-zone.test.tsx` | 10 | Expandable UI, password+checkbox, delete flow, error |
| `auth-provider.test.tsx` | 8 | Token refresh, redirect, auth context, error boundary |
| `middleware.test.ts` | 10 | Route protection, cookie checks, redirect logic |
| `password-utils.test.ts` | 20 | Strength scoring, validation rules, edge cases |
| `account-utils.test.ts` | 11 | Tier variants, format helpers, date formatting |
| `analysis-store.test.ts` | 17 | Store state transitions, demo loading, reset |
| `use-genetics-worker.test.ts` | 16 | Worker lifecycle, message routing, cancel |
| `overview-tab.test.tsx` | 12 | Stat cards, metadata, disclaimer, tier upgrade |
| `carrier-tab.test.tsx` | 21 | Search, filter, sort, Punnett squares, ARIA |
| `traits-tab.test.tsx` | 12 | Grid display, probabilities, confidence |
| `pgx-tab.test.tsx` | 15 | Gene cards, metabolizer badges, drug tables |
| `prs-tab.test.tsx` | 13 | Gauges, percentiles, ancestry notes |
| `counseling-tab.test.tsx` | 19 | Urgency, findings, specialties, referral |
| `medical-disclaimer.test.tsx` | 6 | Compact/full variants, ARIA |
| `tier-upgrade-prompt.test.tsx` | 5 | Upgrade CTA, button text, link |
| `population-selector.test.tsx` | 4 | Population options, tier gating |
| `analysis-page.test.tsx` | 8 | States, tabs, error, demo, reset |
| `payment-client.test.ts` | 18 | All 3 API functions, snake_case→camelCase, error handling |
| `payment-store.test.ts` | 22 | All 5 store actions, loading states, checkout flow, reset |
| `subscription-page.test.tsx` | 15 | Plan display, upgrade options, payment history, pricing |
| `upgrade-modal.test.tsx` | 12 | Focus trap, keyboard nav, checkout trigger, error display |
| `payment-success.test.tsx` | 8 | Auto-redirect, countdown, session ID, manual navigation |
| `payment-cancel.test.tsx` | 5 | Retry link, dashboard link, messaging |

---

## Known Issues & Future Work

### V3 Rewrite — Remaining Phases

- [x] **Phase 6: Payment UI** — PR #35 merged (8/8 A+, 80 tests)
- [x] **Phase 7: Backend API** — PR #36 merged (8/8 A+, 60 tests)
- [x] **Phase 8A: Integration Polish** — PR #37 merged (10/10 A+)
- [x] **Phase 8B: Legal/Privacy** — PR #38 merged (10/10 A+ Gemini + 10/10 A+ Claude)
- [x] **Phase 8C: E2E Tests** — PR #40 merged (153 scenarios)
- [x] **Refactor Plan** — PR #45 merged (172 tasks, 11 streams, 144+ decisions)
- [x] **V3 Implementation** — **11/11 streams complete:**
  - [x] Stream 0 (Research) — PR #46
  - [x] Stream D (Data Cleanup) — PR #47
  - [x] Stream E (Engine) — PR #48
  - [x] Stream TD (Types + Data) — PR #49
  - [x] Stream F (Frontend, 4 sprints) — PRs #50-53
  - [x] Stream B (Backend, 3 sprints + deferred) — PRs #54-57
  - [x] Stream S (Security, 3 sprints) — PRs #58, 59, 61
  - [x] Stream C (Legacy Cleanup) — PR #83
  - [x] Stream L (Legal, 2 sprints) — PRs #84, 85
  - [x] Stream Q (QA, 4 sprints) — PRs #86, 87
  - [x] Stream Ops (EU region, CI, deploy) — PR #88
- [x] **Coming Soon Page** — PR #89 merged (site-wide lock active)
- [x] **Web Polish** — PR #90 merged (a11y, type safety, tier alignment, 10/10 A/A+, 3,010 frontend tests)
- [x] **Trait Expansion** — PRs #91-93, #111 merged (79→476 traits across 4 tiers, 15 categories, chip coverage)
- [x] **PMID Audit** — PR #112 merged (fixed 5 parasitology PMID citations)
- [x] **Full-App Review Fixes** — PR #113 merged (16 findings: TOTP encryption, CSRF, motion→m tree-shaking, PRS ancestry enforcement, WCAG contrast, loading skeletons, DPIA completion, 10/10 A/A+)

### Performance Optimizations (from Phase 4 reviews)

- [x] **useCallback for handlers** — All page handlers wrapped in useCallback (R4 fix)
- [x] **React.memo sub-components** — GeneCard and PrsConditionCard memoized (R4 fix)
- [x] **next/dynamic lazy tabs** — All 6 tab components lazy-loaded (R4 fix)
- [ ] **Carrier tab virtualization** — For 2,715 disease results at Pro tier, consider windowed rendering
- [ ] **Worker pool** — Consider SharedWorker for multi-tab scenarios

### Pre-existing TypeScript Issues (Not blocking)

- `lib/api/client.ts:157` — Type comparison issue (`"HEAD"` vs method union)
- `lib/data/demo-results.ts:268` — Type literal mismatch (`"complex/polygenic"` vs inheritance model union)

### Legacy Streamlit App (v1/v2)

Legacy app (Source/, pages/, app.py) deleted in Stream C (PR #83). V3 rewrite is the sole codebase.

---

## Architecture (V3 Rewrite)

### Monorepo Structure

```
Mergenix/
├── apps/
│   ├── web/                         # Next.js 15 frontend
│   │   ├── app/(app)/               # App routes (analysis, account, products, about, etc.)
│   │   ├── app/(auth)/              # Auth routes (login, register, forgot-password, etc.)
│   │   ├── components/              # React components
│   │   │   ├── ui/                  # Design system (GlassCard, Button, Badge, etc.)
│   │   │   ├── auth/               # Auth components (password-input, oauth-button, etc.)
│   │   │   └── genetics/            # Genetics-specific components
│   │   │       ├── results/         # 6 result tab components
│   │   │       ├── file-dropzone.tsx
│   │   │       ├── analysis-progress.tsx
│   │   │       ├── tier-upgrade-prompt.tsx
│   │   │       ├── medical-disclaimer.tsx
│   │   │       └── population-selector.tsx
│   │   ├── hooks/                   # Custom hooks (useGeneticsWorker)
│   │   ├── lib/
│   │   │   ├── api/                 # API clients (client.ts, auth-client.ts, payment-client.ts)
│   │   │   ├── stores/              # Zustand stores (analysis, auth, payment)
│   │   │   ├── workers/             # Web Worker shims
│   │   │   └── data/                # Static data (demo results)
│   │   └── __tests__/               # Vitest test suites (503 tests, 37 files)
│   └── api/                         # FastAPI backend (24 endpoints, 60 tests)
├── packages/
│   ├── genetics-engine/             # TypeScript genetics engine (~5,500 LOC)
│   │   ├── src/
│   │   │   ├── parser.ts            # Multi-format file parser
│   │   │   ├── carrier.ts           # Carrier risk analysis
│   │   │   ├── traits.ts            # Trait prediction
│   │   │   ├── pgx.ts               # Pharmacogenomics
│   │   │   ├── prs.ts               # Polygenic risk scores
│   │   │   ├── ethnicity.ts         # Ethnicity adjustment
│   │   │   ├── counseling.ts        # Genetic counseling
│   │   │   ├── worker.ts            # Web Worker entry point
│   │   │   └── index.ts             # Barrel exports
│   │   └── __tests__/               # 366 tests (8 suites)
│   ├── shared-types/                # TypeScript types (FullAnalysisResult, Tier, etc.)
│   └── genetics-data/               # JSON data files (carrier panel, traits, etc.)
├── CLAUDE.md                        # Project rules
├── PROGRESS.md                      # Task tracking
└── docs/PROJECT_STATUS.md           # THIS FILE
```

### Data Flow (V3)

```
User uploads 2 DNA files → FileDropzone validates format
    ↓
useGeneticsWorker hook reads File.text() (main thread)
    ↓
Web Worker receives file contents + tier + population
    ↓
Parser → {rsid → genotype} map (streaming line iterator)
    ↓
┌─────────────┬──────────┬─────────┬──────────┬──────────┬──────────┐
│ Carrier      │ Traits   │ PGx     │ PRS      │ Ethnicity│ Counsel. │
│ AR/AD/X-link │ Punnett  │ CPIC    │ Z-score  │ Bayesian │ Triage   │
│ 2,715 diseas │ 476 SNPs │ 12 genes│ 10 conds │ 9 pops   │ referral │
└─────────────┴──────────┴─────────┴──────────┴──────────┴──────────┘
    ↓
FullAnalysisResult → postMessage → Zustand store
    ↓
6 result tabs render from store selectors
```

---

## Project History (Recent PRs)

| PR | Title | Status |
|----|-------|--------|
| #113 | Full-App Review Fixes: 16 findings across 10 domains (TOTP encryption, CSRF, motion→m, PRS ancestry) | **Merged** |
| #112 | PMID 15888295 Audit: 5 parasitology citations fixed | **Merged** |
| #111 | Trait Expansion Tier 4: 476 traits (64 new, completing catalog) | **Merged** |
| #93 | Trait Expansion Tier 3: 412 traits (122 new MODERATE-confidence) | **Merged** |
| #92 | Trait Expansion Tier 2: 290 traits (54 new HIGH-confidence) | **Merged** |
| #91 | Trait Expansion Tier 1: 236 traits (157 new, 15 categories, chip coverage) | **Merged** |
| #90 | Web Polish: A11y, Type Safety, Tier Alignment, Test Coverage (10/10 A/A+, 104 files) | **Merged** |
| #89 | Coming Soon Page with Site Lock (HMAC-SHA-256 bypass, 78 tests) | **Merged** |
| #88 | Stream Ops: EU Region, CI Hardening, Alpha Deploy Runbook | **Merged** |
| #87 | Stream Q Sprints 3+4: E2E, A11y, Performance, Fuzzing, Integration | **Merged** |
| #86 | Stream Q Sprints 1+2: QA Infrastructure + Accuracy (515 tests) | **Merged** |
| #85 | Stream L Sprint 2: Legal Compliance (cookie consent, data retention, 4 legal docs) | **Merged** |
| #84 | Stream L Sprint 1: Legal Content (ToS, Privacy Policy, GDPR/GINA consent) | **Merged** |
| #83 | Stream C: Legacy Cleanup (142 files deleted, README V3) | **Merged** |
| #61 | Stream S Sprint 3: Ops (supply chain, rate limiting, secret rotation, alerting) | **Merged** |
| #59 | Stream S Sprint 2: Data Security (worker memory, audit logging, IndexedDB) | **Merged** |
| #57 | Deferred Items: Review Debt (12/13 items, 5 migrations) | **Merged** |
| #56 | Stream B Sprint 3: Business Logic (tier gating, analytics, receipts) | **Merged** |
| #55 | Stream B Sprint 2: ZKE Pivot + GDPR (opaque envelope, GDPR router) | **Merged** |
| #54 | Stream B Sprint 1: Foundation (CSRF, ZKE, Pydantic types) | **Merged** |
| #53 | Stream F Sprint 4: Output, Compliance & Polish (PDF, SEO, WCAG reflow) | **Merged** |
| #52 | Stream F Sprint 3: Results + Visualization + Accessibility | **Merged** |
| #51 | Stream F Sprint 2: Core UX + Tier Gating | **Merged** |
| #50 | Stream F Sprint 1: Foundation + Gates | **Merged** |
| #49 | Stream TD: Types & Data Enrichment | **Merged** |
| #48 | Stream E: Engine Refactor (25 tasks, 898 tests) | **Merged** |
| #47 | Stream D: Data Cleanup (2,697 entries) | **Merged** |
| #46 | Stream 0: Research (11/12 tasks) | **Merged** |
| #45 | Refactor Plan (172 tasks, 11 streams) | **Merged** |

---

## Next Steps — Alpha Launch Checklist

**All 11 streams COMPLETE. 3,725+ tests. Feature-complete. What remains is infrastructure + legal.**

### Phase A: Service Accounts (kukiz, ~2 hours)
| # | Task | Service | Output |
|---|------|---------|--------|
| A1 | Create Vercel project, link repo | vercel.com | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| A2 | Create Railway project + PostgreSQL (US for now — migrate to EU-west on paid plan) | railway.app | `RAILWAY_TOKEN`, `DATABASE_URL` |
| A3 | Create Stripe account (test mode first) | stripe.com | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs |
| A4 | Register domain on Resend | resend.com | `RESEND_API_KEY` |
| A5 | Create Sentry projects (frontend + backend) | sentry.io | `SENTRY_DSN` |
| A6 | Generate secrets: `openssl rand -base64 64` | Terminal | `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, `SITE_BYPASS_SECRET` |

### Phase B: GitHub Secrets (kukiz, ~30 min)
Add 13+ secrets to GitHub repo Settings > Secrets.

### Phase C: DNS (kukiz, ~15 min)
| Record | Type | Value |
|--------|------|-------|
| `mergenix.com` | CNAME | `cname.vercel-dns.com` |
| `api.mergenix.com` | CNAME | Railway-provided domain |

### Phase D: First Deploy (kukiz, ~2 hours)
1. Push to main → CI → auto-deploy
2. Verify: `curl https://api.mergenix.com/health`
3. Verify: `curl https://mergenix.com` → Coming Soon page
4. Test bypass: enter `SITE_BYPASS_SECRET` on Coming Soon form
5. Smoke test: register → login → upload → results → payment → delete

### Phase E: Legal Sign-offs (kukiz + legal, 1-4 weeks)
| # | Task | Reference | Blocking? |
|---|------|-----------|-----------|
| E1 | Appoint DPO | `docs/legal/dpo-appointment.md` | Yes (Art 37) |
| E2 | Register DPO with relevant DPA | Art 37(7) | Yes |
| E3 | Appoint EU Representative | `docs/legal/ropa.md` | Yes (Art 27) |
| E4 | Sign DPIA | `docs/legal/dpia.md` | Yes (Art 35) |
| E5 | Verify Stripe DPA | Stripe T&Cs | Yes |
| E6 | Verify Resend DPA | Resend T&Cs | Yes |

### Phase F: Go Live
1. Flip `SITE_COMING_SOON` from `true` to `false` in Vercel env vars
2. Redeploy frontend → site is live

---

## Contributors

| Name | Role | Notes |
|------|------|-------|
| kukiz | Developer | Works from multiple PCs |
| Claude | AI Assistant | Creates PRs for review, pushes PROGRESS.md directly |

---

**Version Control:** All work tracked in git, main branch protected, PRs required for code changes.
