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
| V3 Rewrite Phase 7: Backend API | Claude | **Merged** | rewrite/phase-7-backend | PR #36 — Cookie-based auth refactor, 5 new endpoints (sessions CRUD, account deletion, resend-verification), backup codes (SHA-256, constant-time), async event loop safety (asyncio.to_thread), webhook hardening (price validation + idempotency), subscription→tier-status naming. 60 backend tests, Alembic migration, Docker entrypoint. 5 review rounds → **8/8 A+**. 15 files, ~1,700 LOC |
| V3 Rewrite Phase 8A: Integration Polish | Claude | **Merged** | rewrite/phase-8a-integration-polish | PR #37 — Save/load analysis results (AES-256-GCM encrypted), counseling page, TOCTOU fix, consent chain, summary whitelist, OAuth backend-only CSRF, rate limiters on all endpoints. 2 review rounds → **10/10 A+**. 9+42 files, ~3,300 LOC, 643+ frontend + 89 backend tests |
| V3 Rewrite Phase 8B: Legal/Privacy | Claude | **Merged** | rewrite/phase-8b-legal-privacy | PR #38 — GINA notice, cookie consent banner (GDPR Art 7 affirmative opt-in), age verification modal (18+ mandatory gate), GDPR data export endpoint, consent tracking (immutable audit trail), CCPA rights, data retention table. 3 review rounds → **10/10 A+ (Gemini) + 10/10 A+ (Claude)**. 34 files, +4,269 LOC, 82+ new tests |
| Review Infrastructure: Dual persona system | Claude | **Done** | rewrite/main | 10 Claude agents (`.claude/agents/`) + 10 Gemini CLI personas (`review-personas/`). Gemini CLI reads local files via `GEMINI_SYSTEM_MD` — no upload needed. Tested: single, persona-switch, parallel (15s stagger). 20 files, +837 lines |
| V3 Rewrite Phase 8C: E2E Tests | Claude | **Merged** | test/phase-8c-e2e | PR #40 — Playwright E2E test suite. 23 spec files, 153 scenarios across 8 categories (auth, app, marketing, legal, accessibility, performance, security, API). 7 POMs, auth fixtures (free/premium/pro/2fa), 6 golden DNA files, test-data from demo-results.ts. Dependencies: @axe-core/playwright, otplib. 46 files, +10,965 LOC. |
| Refactor Plan + Research Alignment | Claude | **Merged** | docs/refactor-plan | PR #45 — Master refactor plan (172 tasks, 48 CRITICAL, 11 streams) + research alignment matrix (144+ decisions). Gate 1: 10/10 A+ Gemini (6 rounds). Gate 2: 7 A- + 3 B+ Claude (5 rounds, ~73 fixes). |
| Stream 0: Research Phase | Claude | **11/12 Done** | docs/stream0-research-archive | PR #46 — 11 Gemini tasks + 1 Claude task. Research archive in docs/research/stream0/. R12 partial. |

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
| 2026-02-10 | Claude | V3 Rewrite Phase 6 — Payment UI: Payment API client, Zustand store, subscription page rewrite, upgrade modal (focus trap, WCAG), success/cancel pages. 80 new tests (503 web total). 2 Gemini rounds + Claude final → **8/8 A+**. 12 files, +2,302 LOC. | PR #35 |
| 2026-02-10 | Claude | V3 Rewrite Phase 7 — Backend API: Cookie-based auth (HttpOnly refresh tokens), 5 new endpoints (sessions, account deletion, resend-verification), backup codes (SHA-256, constant-time), async event loop safety (asyncio.to_thread for bcrypt/Stripe/email), webhook hardening (price validation + idempotency), subscription→tier-status naming, Alembic migration (6 tables), Docker entrypoint. 60 backend tests. 5 review rounds (Gemini R1→R2 + Claude + independent 8-agent + re-verify) → **8/8 A+**. 15 files, ~1,700 LOC. | PR #36 |
| 2026-02-10 | Claude | Review Infrastructure: Dual persona system. 10 Claude agents (`.claude/agents/`, YAML frontmatter, opus model) + 10 Gemini CLI personas (`review-personas/`, pure markdown, `GEMINI_SYSTEM_MD`). Discovered Gemini CLI reads local files directly (no upload). Tested single, persona-switch, parallel (15s stagger). 20 files, +837 lines. | rewrite/main |
| 2026-02-11 | Claude | V3 Rewrite Phase 8C — E2E Tests: Playwright E2E test suite. 23 spec files, 153 scenarios (P0:25, P1:94, P2:34). 7 POMs, auth fixtures (free/premium/pro/2fa), 6 golden DNA files, test-data from demo-results.ts. Categories: auth(25), app(50), marketing(16), legal(13), accessibility(22), performance(14), security(7), API(6). 7 parallel executor agents. 46 files, +10,965 LOC. | PR #40 |
| 2026-02-12 | Claude | Refactor Plan + Research Alignment: Master plan for V3 implementation — 172 tasks across 11 streams (R=Research, E=Engine, F=Frontend, B=Backend, S=Security, D=DevOps, L=Legal, Q=QA, T=Type-gen, C=Content, Ops=Operations), 48 CRITICAL items, 144+ architectural decisions. Gate 1: 10/10 A+ Gemini (6 rounds). Gate 2: 5 Claude review rounds, ~73 fixes. Zero-knowledge encryption (Argon2id+AES-256-GCM), HttpOnly cookies, streaming file parsing, CLT-based PRS, GDPR/GINA compliance, 3-tier pricing (Free/Premium $14.99/Pro $34.99). | PR #45 |
| 2026-02-13 | Claude | Stream 0 Research: 11/12 Gemini research tasks completed. Chip coverage analysis, ClinVar counts, liftover methodology, CNV diseases (9 to remove), PRS transferability (ancestry-aware), detection rates by ethnicity, carrier panel validation (6 issues), gene-phenotype validity (9 concerns incl. MTHFR), ethnicity frequency gaps (153/2500+), compound het ground truth (10 cases). R6 synthetic genome factory spec. Research archive at docs/research/stream0/. | PR #46 |

---

> **Historical phase details (grades, review rounds, what was done) have been moved to [`docs/PHASE_HISTORY.md`](docs/PHASE_HISTORY.md)** to keep this file focused on current status.

---

## Next Steps

1. ~~Phase 6: Payment UI~~ → **PR #35 merged** (8/8 A+)
2. ~~Phase 7: Backend API~~ → **PR #36 merged** (8/8 A+)
3. ~~Phase 8A: Integration Polish~~ → **PR #37 merged** (10/10 A+)
4. ~~Phase 8B: Legal/Privacy~~ → **PR #38 merged** (10/10 A+ Gemini + 10/10 A+ Claude)
5. ~~Phase 8C: E2E Tests~~ → **PR #40 merged** (153 scenarios)
6. ~~Refactor Plan Review~~ → **PR #45 merged** (Gate 1: 10/10 A+ Gemini, Gate 2: 10/10 A- Claude — accepted)
   - 5 Claude review rounds, ~73 fixes applied, 144+ architectural decisions documented
   - Final: 7/10 A- (zero BLOCKs), 3/10 B+ — user accepted, merged
7. **Begin V3 Implementation** — Execute refactor plan streams
   - **Stream 0 (Research): 11/12 COMPLETE** — see `docs/V3_IMPLEMENTATION_LOG.md`
     - R1-R5, R7-R11: Done (Gemini). R6: Done (Claude). R12: Partial (audit script methodology issue)
     - Research archive: PR #46 (`docs/research/stream0/`)
     - Key findings: 9 diseases to remove, 8 gene symbols to update, PRS ancestry-awareness critical, ethnicity data gap (153/2500+)
   - **Next: Stream D (Data Cleanup)** — fix carrier panel based on research findings ← **NEXT**

---

## Active Blockers

*R12 (rsID audit) needs re-run with corrected ClinVar lookup methodology. Non-blocking for Stream D.*

---

## Notes
- kukiz works from multiple computers — always pull first!
- Claude pushes PROGRESS.md directly to main; all other changes go through PRs
- V3 review process: 10 reviewers (Architect, QA, Scientist, Technologist, Business, Designer, Security Analyst, Code Reviewer, Legal+Privacy, Ethics/Bioethics) — all must give A+ (three-layer: Static → Gemini CLI with `GEMINI_SYSTEM_MD` personas → Claude Opus agents)
