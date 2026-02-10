# Mergenix - Progress Tracker

> This file is the single source of truth for project status.
> **Push directly to `main`** whenever you update it.
> Check this file at the start of every session.

---

## Current Sprint

| Task | Owner | Status | Branch | Notes |
|------|-------|--------|--------|-------|
| Project workflow setup (CLAUDE.md, linting, README) | Claude | Merged | feature/project-workflow-setup | PR #13 — merged |
| Platform redesign + disease expansion (1211→2715) | Claude | Merged | feature/platform-redesign | PR #14 — rebrand, pricing, CI, card fix, +1504 diseases |
| Bioluminescent Laboratory frontend redesign | Claude | Merged | feature/frontend-bioluminescent | PR #18 — new fonts (Sora/Lexend/JetBrains Mono), glassmorphism, glow effects, noise texture, deeper palette |
| Dark/light mode toggle | Claude | PR Open | feature/dark-light-mode-toggle | PR #19 — Daylight Laboratory light theme, CSS var migration, toggle in navbar |
| Remove SNPedia dependencies | Claude | Merged | fix/remove-snpedia-dependencies | PR #20 — legal compliance, replace with ClinVar |
| Add data sources, confidence & notes | Claude | PR Open | feat/add-data-sources | PR #21 — source citations, confidence levels, scientific notes for all 2,715 diseases + 79 traits |
| Fix 6 critical Tier 0 bugs | Claude | Merged | fix/tier0-critical-bugs | PR #22 — wrong inheritance model, trait crash, HIPAA claim, password change, PayPal webhook, missing dep |
| Tier 1: Security & data integrity (all 8 items) | Claude | Merged | feature/tier1-security-data-integrity | PR #23 — SQLite migration, 2FA/TOTP, tier validation, streaming parser, audit logging, email verification, rate limiting, disclaimers. 378 tests, +7012 lines |
| Tier 2+3: Performance + frontend/UX (12 items) | Claude | Merged | feature/tier2-tier3-improvements | PR #24 — cached loaders, pre-computed stats, font optimization, WCAG accessibility, responsive CSS, emotional design, onboarding/demo mode, glossary, Punnett squares, radar/treemap charts, progress stepper, light default. 20 files, +3063 lines, 440 tests |
| Tier 4: Testing & infrastructure (8 items) | Claude | PR Open | feature/tier4-testing-infrastructure | PR #25 — 515 new tests (955 total), parser/auth/payment/tier/config test suites, unified config system (pydantic-settings), Dockerfile + docker-compose, CI improvements (coverage, fail-fast lint, caching), dependency audit. 13 files, +5053 lines |
| Tier 5: Genetic science (ethnicity, PGx, PRS, ClinVar, counseling) | Claude | PR Open | feature/tier5-genetic-science | PR #26 — 5 new modules (1,482 LOC), 4 data files, counseling page, integration wiring, 303 new tests. Ethnicity adjustment (Bayesian), PGx (CPIC-guided), PRS (z-score normalized), ClinVar (approval-first), Counseling (triage + referrals). Grade: A (merge-ready). 24 files, +10,118 lines, 1,265 tests |
| V3 Rewrite Phase 3: Genetics Engine (TypeScript) | Claude | Merged | rewrite/phase-3-genetics-engine | PR #31 — Full TypeScript port of genetics engine for client-side Web Worker execution. 11 source modules (~5,500 LOC), 8 test suites (366 tests), streaming parser, centralized tier gating, medical disclaimers, counseling urgency. 7 review rounds, **6/6 A+ grades**. 27 files, +95,145 lines |
| V3 Rewrite Phase 4: Analysis UI | Claude | Merged | rewrite/phase-4-analysis-ui | PR #32 — Wire genetics engine Web Worker into Next.js frontend. Worker shim, Zustand store rewrite, useGeneticsWorker hook, 6 result tab components, demo data (23 verified rsIDs), 3 polish components (TierUpgradePrompt, MedicalDisclaimer, PopulationSelector). 5 review rounds → **6/6 A+** (Architect, QA, Scientist, Technologist, Business, Designer). 148 web tests + 366 engine tests = 514 total. 30+ files, ~5,300 new LOC |
| V3 Rewrite Phase 5: Auth UI | Claude | **Merged** | rewrite/phase-5-auth-ui | PR #34 — Auth test suite (423 tests) + placeholder completion (sessions, danger zone). 2 review rounds → **7/7 A+** (Architect, QA, Scientist, Technologist, Business, Designer, Security Analyst). 26 files, ~5,600 new LOC |
| V3 Rewrite Phase 6: Payment UI | Claude | **Merged** | rewrite/phase-6-payment-ui | PR #35 — Payment API client, Zustand store, subscription page rewrite (hardcoded→data-driven), upgrade modal (focus trap, WCAG), success/cancel pages. 2 Gemini rounds + Claude final → **8/8 A+**. 12 files, +2,302 LOC, 80 new tests (503 web total, 869 V3 total) |

---

## Milestones

### Phase 1: Data Foundation & Analysis Engine
- [x] Genetic file parser (23andMe, AncestryDNA, MyHeritage/FTDNA, VCF)
- [x] Carrier risk analysis engine (Mendelian inheritance)
- [x] Trait prediction engine (Punnett square)
- [x] Sample data files for all formats
- [x] ClinVar integration

### Phase 2: Web Interface
- [x] Streamlit app with file upload
- [x] Results dashboard (risk factors, traits, individual reports)
- [x] Disease Catalog page
- [x] Dark bioluminescent UI theme
- [x] Dark/light mode toggle (Daylight Laboratory theme) — PR #19

### Phase 3: Authentication & Payments
- [x] Authentication system (login page, OAuth research)
- [x] Payment processing (Stripe, PayPal handlers)
- [x] Subscription/tier configuration
- [ ] Complete OAuth integration with Google
- [ ] Payment flow end-to-end testing

### Phase 4: Dev Infrastructure
- [x] Project workflow rules (CLAUDE.md) — PR #13
- [x] Linting setup (ruff) — PR #13
- [x] Pre-commit hooks — PR #13
- [x] Comprehensive test coverage (955 tests) — PR #25
- [x] CI/CD pipeline (GitHub Actions) — PR #14

### Phase 5: Polish & Launch (Upcoming)
- [ ] Error handling improvements
- [x] Performance optimization (cached loaders, pre-computed stats, font optimization) — PR #24
- [x] User onboarding flow (demo mode, welcome flow, DNA download guide) — PR #24
- [ ] Production deployment

---

## Completed Work Log

| Date | Who | What | PR/Commit |
|------|-----|------|-----------|
| 2025-01-xx | Team | Phase 1 & 2: Data foundation + analysis engine | #3 |
| 2025-01-xx | Team | Phase 3 & 4: Streamlit web interface + deployment | #4 |
| 2025-01-xx | Team | Expand diseases, traits, redesign | #5 |
| 2025-01-xx | Team | Disease Catalog page, sample data fixes | #11 |
| 2025-02-xx | Maayan | Auth system, payments, expanded carrier panel, tests | 5206193 |
| 2026-02-06 | Claude | Project workflow setup: CLAUDE.md, PROGRESS.md, linting, README | PR #13 |
| 2026-02-06 | Claude | Platform redesign: centralize CSS, router, 9 pages, pricing update | PR #14 |
| 2026-02-06 | Claude | Rebrand Tortit → Mergenix across 48 files | PR #14 |
| 2026-02-06 | Claude | Switch to one-time pricing model (no subscriptions) | PR #14 |
| 2026-02-06 | Claude | Add CI workflow (pytest + ruff, Python 3.10/3.12 matrix) | PR #14 |
| 2026-02-06 | Claude | Fix pricing card rendering (blank line in HTML block) | PR #14 |
| 2026-02-06 | Claude | Expand carrier panel from 1,211 to 2,715 diseases (+1,504 new entries) | PR #14 |
| 2026-02-07 | Claude | Bioluminescent Laboratory frontend redesign | PR #18 |
| 2026-02-07 | Claude | Dark/light mode toggle: Daylight Laboratory theme, ~150 inline colors → CSS vars, toggle in navbar | PR #19 |
| 2026-02-07 | Claude | Remove all SNPedia dependencies for legal compliance (CC BY-NC-SA risk) | PR #20 |
| 2026-02-07 | Claude | Add source citations (OMIM, dbSNP, ClinVar, PubMed GWAS) to 2,715 diseases + 79 traits | PR #21 |
| 2026-02-08 | Claude | Add confidence levels + scientific notes to all 2,715 diseases + 79 traits | PR #21 |
| 2026-02-08 | Claude | Fix 6 critical Tier 0 bugs: inheritance model (AD+X-linked), trait crash, HIPAA claim, change_password, PayPal webhook verification, missing paypalrestsdk dep | PR #22 |
| 2026-02-08 | Claude | Tier 1 security & data integrity: SQLite migration, 2FA/TOTP, server-side tier validation, streaming parser (200MB limit), audit logging (immutable), email verification + password reset, rate limiting + account enumeration prevention, scientific disclaimers. 34 files, +7012 lines, 304 tests | PR #23 |
| 2026-02-08 | Claude | Tier 2+3 performance + frontend/UX: cached data loaders, pre-computed catalog stats, font optimization, WCAG 2.1 AA accessibility, responsive CSS, compassionate language, onboarding/demo mode, genetic glossary, Punnett squares, radar chart, treemap, progress stepper, light default. 20 files, +3063 lines, 56 new tests (440 total) | PR #24 |
| 2026-02-08 | Claude | Tier 4 testing & infrastructure: parser tests (157), auth tests (147), tier/payment tests (114), trait tests (+36), config system tests (61), unified pydantic-settings config, Dockerfile + docker-compose, CI coverage/lint/caching improvements, dependency audit + pinning. 13 files, +5053 lines, 515 new tests (955 total) | PR #25 |
| 2026-02-08 | Claude | Tier 5 genetic science: ethnicity-adjusted frequencies (gnomAD, 9 populations), pharmacogenomics (CPIC-guided, 12 genes), polygenic risk scores (10 diseases, z-score normalized), ClinVar freshness pipeline (approval-first, monthly sync), genetic counseling system (triage + referral letters). 5 modules (1,482 LOC), 4 data files, 1 new page, 3 components, CLI tool, GitHub Actions workflow. 303 new tests (1,265 total). Architecture: A (merge-ready). | PR #26 |
| 2026-02-09 | Claude | V3 Rewrite Phase 3 — Genetics Engine: Full TypeScript port of genetics analysis for client-side Web Workers. Parser (23andMe/AncestryDNA/MyHeritage/VCF), carrier analysis (AR/AD/X-linked), trait prediction (Punnett square), pharmacogenomics (CPIC star alleles), PRS (normal CDF), ethnicity (Bayesian), counseling (triage+referral). Streaming iterateLines() parser, countKeys() helper, centralized TIER_GATING. 11 source files (~5,500 LOC), 8 test suites (366 tests). 7 review rounds → 6/6 A+ grades. | PR #31 |
| 2026-02-09 | Claude | V3 Rewrite Phase 4 — Analysis UI: Wire genetics engine into Next.js. Worker shim + store rewrite + useGeneticsWorker hook + 6 result tabs (overview, carrier, traits, pgx, prs, counseling) + demo data (23 verified rsIDs, CPIC-compliant PGx, real GWAS PRS refs) + 3 polish components (TierUpgradePrompt, MedicalDisclaimer, PopulationSelector). Full ARIA tab navigation. Tier-gating in all 6 tabs. Lazy-loaded demo. useCallback handlers, React.memo, next/dynamic lazy tabs. 5 review rounds → **6/6 A+**. 148 web tests + 366 engine = 514 total. | PR #32 |
| 2026-02-09 | Claude | V3 Rewrite Phase 5 — Auth UI: Comprehensive auth test suite (19 new test files, 423 tests across 31 files). Placeholder completion for sessions-section and danger-zone components. Security hardening (encodeURIComponent, URLSearchParams, OAuth state preservation). ARIA accessibility (aria-busy, aria-live, aria-describedby). Performance (AbortController, useMemo, useCallback, hoisted constants). Type safety (Tier from shared-types). 2 review rounds → **7/7 A+** (added Security Analyst reviewer). 26 files, ~5,600 new LOC. | PR #34 |

---

## Phase 6 Complete — Summary (PR #35, Merged)

### What Was Done
1. **Payment API client (`payment-client.ts`):**
   - 3 endpoints: `createCheckout`, `getPaymentHistory`, `getSubscriptionStatus`
   - snake_case→camelCase transformers matching auth-client.ts pattern

2. **Payment Zustand store (`payment-store.ts`):**
   - State: paymentHistory, subscriptionStatus, isLoading, isCheckoutLoading, error
   - Actions: createCheckout, fetchPaymentHistory, fetchSubscriptionStatus, clearError, reset

3. **Subscription page rewrite (`subscription/page.tsx`):**
   - Hardcoded "Premium $12.90" → data-driven from auth store + payment store
   - Dynamic upgrade options: Free→Premium+Pro, Premium→Pro, Pro→"best plan"
   - "Pay the difference" pricing, payment history section, ARIA

4. **Upgrade modal (`upgrade-modal.tsx`):**
   - Plan comparison display, focus trap (Tab/Shift+Tab cycling), Escape to close
   - Backdrop click, body scroll lock, error display within modal
   - ARIA: role="dialog", aria-modal, aria-labelledby, aria-describedby, aria-busy

5. **Success/cancel pages:**
   - Success: 20-second WCAG 2.2.1 auto-redirect, Suspense boundary for useSearchParams
   - Cancel: retry + dashboard links

6. **Tests (80 new, 503 web total):**
   - payment-client.test.ts (18), payment-store.test.ts (22)
   - subscription-page.test.tsx (15), upgrade-modal.test.tsx (12)
   - payment-success.test.tsx (8), payment-cancel.test.tsx (5)

7. **Review (2 Gemini rounds + Claude final → 8/8 A+):**

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

---

## Phase 5 Complete — Summary (PR #34, Merged)

### What Was Done
1. **Placeholder completion (6 source files):**
   - `auth-client.ts`: Added sessions/delete endpoints, GoogleOAuthUrlResponse type, URLSearchParams encoding, encodeURIComponent for session IDs, Tier from shared-types
   - `auth-store.ts`: Added matching store actions, GoogleOAuthUrlResponse type flow
   - `sessions-section.tsx`: Full rewrite from "Coming Soon" → session table with revoke, AbortController cleanup, useMemo, ARIA
   - `danger-zone.tsx`: Full rewrite from disabled placeholder → expandable deletion UI with password+checkbox+useCallback+ARIA
   - `login-content.tsx` + `register-content.tsx`: Updated OAuth handlers to destructure authorizationUrl

2. **Test suite (19 new files, 275 new tests → 423 total across 31 files):**
   - Store tests: auth-store (52), analysis-store (17)
   - API tests: auth-client (24), client (20)
   - Component tests: 6 auth pages, 6 account components, analysis page
   - Utility tests: password-utils (20), account-utils (11)
   - Infrastructure: middleware (10), auth-provider (8)

3. **Review (2 rounds → 7/7 A+):**

| Reviewer | R1 | R2 (Final) | Key Fixes |
|----------|----|----|-----------|
| Architect | A | **A+** | Tier type from shared-types (not string) |
| QA | A | **A+** | 423 tests verified, fixture types correct |
| Scientist | A+ | **A+** | No genetics code affected |
| Technologist | A- | **A+** | AbortController, URLSearchParams, useMemo, useCallback |
| Business | A+ | **A+** | No business logic affected |
| Designer | A- | **A+** | aria-busy, aria-live, aria-describedby, aria-hidden |
| Security | A- | **A+** | encodeURIComponent, OAuth state, URLSearchParams |

---

## Next Steps

1. ~~Phase 6: Payment UI~~ → **PR #35 merged** (8/8 A+)
2. **Phase 7: Backend API** — FastAPI endpoints, database, deployment
3. **Phase 8: Polish & Launch** — E2E tests, performance, production deployment

---

## Active Blockers
_None_

---

## Notes
- kukiz works from two computers (work room + living room) — always pull first!
- Maayan sometimes shares machines with kukiz — check PROGRESS.md to avoid conflicts
- Claude pushes PROGRESS.md directly to main; all other changes go through PRs
- V3 review process: 8 reviewers (Architect, QA, Scientist, Technologist, Business, Designer, Security Analyst, Code Reviewer) — all must give A+ (two-stage: Gemini → Claude Final)
