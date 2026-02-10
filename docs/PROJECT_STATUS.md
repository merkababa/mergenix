# Mergenix — Project Status

**Last Updated:** 2026-02-09
**Version:** 3.0.0-alpha (V3 Rewrite — Phase 6 Payment UI merged)
**Branch:** rewrite/main

---

## Platform Overview

Mergenix is a genetic offspring analysis platform that compares two parents' DNA to predict offspring disease risk, traits, pharmacogenomics, polygenic risk scores, and genetic counseling recommendations. The V3 rewrite moves from Streamlit to a modern Next.js + FastAPI monorepo with client-side Web Worker genetics analysis.

### Key Capabilities
- **Disease Screening:** 2,715 genetic diseases across three inheritance models (AR, AD, X-linked)
- **Trait Prediction:** 79 trait SNPs predicted using Punnett square logic
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
- **Testing:** Vitest (869 tests: 366 engine + 503 web)
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
- [ ] **Phase 7: Backend API** — FastAPI endpoints, database, deployment
- [ ] **Phase 8: Polish & Launch** — E2E tests, performance, production deployment

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

The original Streamlit app (Source/, pages/, app.py) remains in the repo for reference. PRs #19-#26 contain improvements to the legacy app. The V3 rewrite (apps/web, apps/api, packages/) is the active development target.

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
│   └── api/                         # FastAPI backend (placeholder)
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
│ 2,715 diseas │ 79 SNPs  │ 12 genes│ 10 conds │ 9 pops   │ referral │
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
| #35 | Phase 6: Payment UI (503 tests, 8/8 A+) | **Merged** |
| #34 | Phase 5: Auth UI (423 tests, 7/7 A+) | **Merged** |
| #32 | Phase 4: Analysis UI (wire engine + 6 tabs + 148 tests, 6/6 A+) | **Merged** |
| #31 | Phase 3: Genetics Engine (TypeScript, 366 tests, 6/6 A+) | **Merged** |
| #30 | Phase 2: Frontend pages (7 pages, design system) | Merged |
| #28 | Phase 1: Monorepo scaffolding | Merged |
| #26 | Tier 5: Genetic science (ethnicity, PGx, PRS, ClinVar, counseling) | Open |
| #25 | Tier 4: Testing & infrastructure (515 new tests) | Open |
| #24 | Tier 2+3: Performance + frontend/UX (440 tests) | Merged |
| #23 | Tier 1: Security & data integrity (378 tests) | Merged |
| #22 | Tier 0: 6 critical bug fixes | Merged |

---

## Next Steps

1. ~~Phase 5: Auth UI~~ → **PR #34 merged** (7/7 A+)
2. ~~Phase 6: Payment UI~~ → **PR #35 merged** (8/8 A+)
3. ~~Phase 7: Backend API~~ → **PR #36 merged** (8/8 A+)
4. **Phase 8A: Integration Polish** → **PR #37 open** (5x A+, 4x A — 630 tests)
5. **Phase 8B: Legal/Privacy** — Cookie consent, age verification, GDPR data export
6. **Phase 8C: E2E Tests** — Playwright integration tests
7. **Phase 8D: Production Deploy** — Docker, CI/CD, route renaming

---

## Contributors

| Name | Role | Notes |
|------|------|-------|
| kukiz | Developer | Works from work room & living room computers |
| Maayan | Developer / Reviewer | Codes, reviews PRs, uses Claude Code |
| Claude | AI Assistant | Creates PRs for review, pushes PROGRESS.md directly |

---

**Version Control:** All work tracked in git, main branch protected, PRs required for code changes.
