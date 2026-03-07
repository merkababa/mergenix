# Mergenix - Progress Tracker

> This file is the single source of truth for project status.
> **Push directly to `main`** whenever you update it.
> Check this file at the start of every session.

---

## Current Status

**Stream Ops COMPLETE.** PR #88 merged. All streams done. Mergenix is alpha-launch-ready.
**Coming Soon page:** PR #89 — review-complete (8/8 A Gemini + 8/8 A Claude). Ready to merge.
**TW4 Fix + Landing Page Redesign:** PR #149 — **MERGED**. CSS cascade layer fix + crypto→medical SaaS redesign + review fixes.

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
| Stream D: Data Cleanup | Claude | **Merged** | feature/stream-d-data-cleanup | PR #47 — Remove 22 CNV-untestable diseases, add disclaimers to 46 entries, update 8 gene symbols, add 4 missing variants, centralize count via CARRIER_PANEL_COUNT. Gate 1: 5/5 Gemini (Scientist A+, QA A-, Code A-, Security A-, Ethics A). 2,697 entries. |
| Stream F Sprint 3: Results + Visualization + Accessibility | Claude | **Merged** | feature/stream-f-sprint-3-results | PR #52 — 13 tasks (F5, F7, F8, F9, F10, F17, F23, F26, F30, F31, F33, F37, F39). 11 new components, 6 modified tabs, 137 new tests (940 web, 1332 total). New dep: react-virtuoso. Gate 1: 10/10 A+ Gemini. Gate 2: 10/10 A+ Claude. |
| Stream F Sprint 4: Output, Compliance & Polish | Claude | **Merged** | feature/stream-f-sprint-4-output | PR #53 — 7 tasks (F21, F24, F38, F40, F42, F46, F47). PDF generation (pdfmake Web Worker), SEO/OG metadata, WCAG reflow (320px), stale results banner, sample report page, security architecture page, GDPR consent UI. 103 new tests (1043 web total). Gate 1: 8/8 A+ Gemini (3 rounds). Gate 2: 10/10 A+ Claude (2 rounds). |
| Stream B Sprint 1: Backend Foundation | Claude | **Merged** | feature/stream-b-sprint-1-foundation | PR #54 — 4 tasks (B11, B3, B1, B2). CSRF middleware (pure ASGI), ZKE encryption schema (Phase 1 — Argon2id+AES-256), strict Pydantic types for genetics data (FullAnalysisResult hierarchy), data versioning, session invalidation, security hardening (CORS, bulk DELETE, shared httpx). 205 backend tests. Gate 1: 2/7 A+ Gemini (5 quota-blocked). Gate 2: 7/7 A Claude (3 rounds). 16 files, +631 LOC. |
| Stream B Sprint 2: ZKE Pivot + GDPR | Claude | **Merged** | feature/stream-b-sprint-2-gdpr | PR #55 — 4 tasks (B13, B7, B8, B12). ZKE pivot (delete server encryption, opaque EncryptedEnvelope), GDPR router (DELETE /gdpr/account, GET /gdpr/export, PUT /gdpr/profile), shared account_service + cookie utils, Alembic migration (drop result_nonce). 245 backend tests (40 GDPR + 34 analysis). Gate 1: 6/6 A Gemini (3 rounds). Gate 2: 6/6 A Claude (2 rounds). 15 files, +2,184 LOC. |
| Stream B Sprint 3: Business Logic | Claude | **Merged** | feature/stream-b-sprint-3-business | PR #56 — B5 tier gating, B6 analytics, B9 email receipts, B10 partner notification. 503 tests. Gate 1: 7/7 A+ Gemini. Gate 2: 7/7 A Claude (3 rounds). 30 files, +4,127 LOC. |
| Deferred Items: Review Debt | Claude | **Merged** | fix/deferred-items | PR #57 — 12/13 deferred items resolved. Rate limiter Redis, OAuth deletion, Jinja2 templates, tier enum, webhook idempotency, age verification, audit retention, DPIA, consent preservation, privacy scrub. 5 Alembic migrations (006-010), 124 new tests (380 total). Gate 1: 6/6 A+ Gemini. Gate 2: 4/4 A/A+ Claude. 46 files, +4,961 LOC. |
| Stream S Sprint 2: Data Security | Claude | **Merged** | feature/stream-s-sprint-2-data-security | PR #59 — S3 Worker Memory Clearing (clearSensitiveMemory in finally, wipeGenotypeMap defense-in-depth, clear_memory message), S5 GDPR Audit Logging (4 event types, begin_nested savepoint, fire-and-forget try/except, db.commit for reads), S6 IndexedDB Storage (idb-keyval, schema versioning, ZKE guards, storage audit). Gate 1: 6/6 A+ Gemini (2 rounds). Gate 2: 6/6 A Claude (3 rounds). 16 files, +2,162 LOC, 2,600 total tests. |
| Stream S Sprint 3: Ops | Claude | **Merged** | feature/stream-s-sprint-3-ops | PR #61 — S4 Supply Chain (Dependabot, SHA-pinned Actions, security-audit CI), S7 Rate Limiting (headers, custom 429, 18 endpoint limits, proxy docs), S8 Secret Rotation (dual-key JWT with kid, runbook), S9 Security Alerting (auth spike + rate breach detection, bounded dedup cache, IP masking, Alembic migration). Gate 1: 6/6 A/A+ Gemini (3 rounds). Gate 2: 6/6 A Claude (2 rounds). 27 files, +2,723 LOC. |
| Stream L Sprint 2: Legal Compliance | Claude | **Merged** | feature/stream-l-sprint-2-legal-compliance | PR #85 — L5 Cookie Consent Audit (CPRA modal focus trap, ConsentGate fallback, marketing toggle, WCAG touch targets), L6 Data Retention Enforcement (RetentionService batched purge, 3-tier audit log retention, inactive user purge 3yr, payment SET NULL 7yr, cron endpoint with timing-safe auth + rate limiting + CSRF exemption), DPIA template, Breach Response Plan, ROPA, DPO Appointment. Gate 1: 10/10 A+ Gemini (2 rounds). Gate 2: 10/10 A Claude (3 rounds). 38 files, +3,718 LOC, 1,201 web + 624 backend tests. |
| Stream Q Sprints 1+2: QA Infrastructure + Accuracy | Claude | **Merged** | test/stream-q-sprint-1-2 | PR #86 — 515 new tests across 20 files (+10,730 lines). Synthetic genome factory (seedable PRNG, 4 formats), golden standard files, parser comprehensive (136 tests), encryption oracle + stub contracts (58 tests), privacy E2E (5 Playwright), smoke tests, carrier/coverage/offspring/liftover accuracy, legacy-ported (47 from Python), save/load integrity, recovery key E2E. Gate 1: 6/6 A+ Gemini. Gate 2: 6/6 A/A+ Claude (2 rounds). |
| Stream Q Sprints 3+4: E2E, A11y, Performance, Fuzzing, Integration | Claude | **Merged** | test/stream-q-sprint-3-4 | PR #87 — ~400 new tests across 16 test files + 1 production utility + 1 shared E2E helper. Sprint 3: E2E coverage (Playwright), accessibility compliance (axe-core), performance monitoring (Core Web Vitals, memory). Sprint 4: Fuzz testing (property-based), integration scenarios (carrier→offspring→counseling flow), CI reliability (flake detection, retry logic). Test counts: genetics-engine 1,392 pass; web 1,482 pass. Gate 1: 6/6 A+ Gemini. Gate 2: 6/6 A/A+ Claude. **Stream Q COMPLETE.** |
| Stream Ops: EU Region, CI Hardening, Alpha Deploy | Claude | **Merged** | ops/stream-ops-final | PR #88 — EU GDPR region (vercel.json fra1), CI/CD pipeline hardening (SHA-pinned Actions, permissions: read-all, workflow_run deploy gate, E2E artifact reuse), ClinVar streaming download, turbo caching, alpha deploy runbook, supply-chain security (pinned CLI versions, Vercel token env var). Gate 1: 4/4 A/A+ Gemini (2 rounds). Gate 2: 4/4 A/A+ Claude (3 rounds). **Stream Ops COMPLETE.** |
| Coming Soon Page with Site Lock | Claude | **Review Complete** | feature/coming-soon-page | PR #89 — Site-wide lock behind coming-soon page. HMAC-SHA-256 bypass cookie, rate limiting, CSRF, timing-safe comparison, a11y (aria-invalid, live regions). 78 tests (crypto, route, middleware, component). Gate 1: 8/8 A+ Gemini (3 rounds). Gate 2: 8/8 A Claude (3 rounds). Ready to merge. |
| TW4 Fix + Landing Page Redesign | Claude | **Merged** | fix/tw4-styling-issues | PR #149 — CSS cascade layer fix (48 rules wrapped in @layer base/components) + full design overhaul (crypto→medical SaaS, 18 files, -677 lines) + review fixes (dead CSS removal, a11y, SEO). Light mode default, neutral shadows, GlassCard simplified 202→102 lines. Gate 2: Architect A, Code A, Designer A, Marketing A-. 1,777 tests. |

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
| 2026-02-13 | Claude | Stream D Data Cleanup: Remove 22 CNV-untestable diseases (SMN1, DMD, HBA1/2, FXN, DMPK, CNBP, C9orf72, PLP1, UBE3A, JPH3). Add disclaimers to 46 entries (9 partially-testable genes). Update 8 outdated gene symbols (IKBKAP→ELP1, etc). Add 4 missing variants (HbC, GALT S135L, MEFV V726A, PAH IVS12). Centralize count via CARRIER_PANEL_COUNT (no more magic numbers). 2,697 final entries. Gate 1: 5/5 Gemini passed. | PR #47 |
| 2026-02-13 | Claude | Stream E Engine Refactor: 25 tasks (E1-E23 + T1+T8), 11 new modules, 898 tests across 20 test files. Streaming parser, build detection, strand harmonization, liftover, carrier analysis, coverage calc, chip detection, PGx, PRS, residual risk, traits, couple combiner, counseling, data loader, device/memory, decompression, progress. Gate 1: 10/10 A+ Gemini. Gate 2: 7/10 Claude completed (all issues fixed). 48 files, +12,250 LOC. | PR #48 |
| 2026-02-14 | Claude | Stream TD Types & Data Enrichment: Carrier panel restructure (flat→wrapped {metadata,entries[]}), coverage_tier for 2,697 entries, PRS ancestry_transferability (10 conditions × 5 ancestries), RiskLevel expansion (4→7: +not_tested, potential_risk, coverage_insufficient), rsID fixes (HbC rs33950507, FMF V726A rs28940580), encoding fixes (4,490 em-dashes), UI risk constants updated, defensive data-loader format detection. Gate 1: 7A+/3A Gemini. Gate 2: Architect A, Security A-, Code A-, Tech A-, Scientist A-, QA B+. 14 files, 901 tests. | PR #49 |
| 2026-02-14 | Claude | Stream F Sprint 1 — Foundation + Gates: 15/15 tasks (4 Gemini research + 11 Claude implementation). Consent modal (GDPR Art 9, IntersectionObserver scroll-to-unlock), partner consent checkbox, chip disclosure modal, age verify focus restoration, skip link to layout, modal manager (Zustand), error announcer (dual aria-live regions), aria-live analysis progress, reduced motion, error boundary (class component), touch targets (44px), integration wiring. Gate 1: 10/10 A+ Gemini. Gate 2: 2 Claude rounds (15 fixes). 35 files, +2890 LOC, 714 tests. | PR #50 |
| 2026-02-14 | Claude | Stream F Sprint 2 — Core UX + Tier Gating: 6 new components (SensitiveContentGuard, CoupleUploadCard, VirtualBabyCard, SaveOptionsModal, DeleteAccountSection, disclaimers), 7 modified result tabs. canAccessFeature() tier gating, pricing aligned $14.99/$34.99, offspring risk Pro-gated, PDF Pro-gated, a11y (focus traps, alertdialog, meter roles, 44px targets). Gate 1: 9/9 A Gemini (3 rounds). Gate 2: 9/9 A-+ Claude (3 rounds, 15 new tests). 34 files, +3753 LOC, 803 tests. | PR #51 |
| 2026-02-14 | Claude | Stream F Sprint 3 — Results + Visualization + Accessibility: 13 tasks (F5, F7, F8, F9, F10, F17, F23, F26, F30, F31, F33, F37, F39). 11 new components, 6 modified tabs, 137 new tests (940 web, 1332 total). New dep: react-virtuoso. 3 commits (implementation, Gate 1 fixes, Gate 2 fixes). Gate 1: 10/10 A+ Gemini. Gate 2: 10/10 A+ Claude. | PR #52 |
| 2026-02-15 | Claude | Stream F Sprint 4 — Output, Compliance & Polish: 7 tasks (F21, F24, F38, F40, F42, F46, F47). PDF export (pdfmake, dynamic import, low-memory fallback), SEO/OG (JSON-LD, per-page meta), WCAG 1.4.10 reflow (320px, 25 E2E tests), stale results banner (dataVersion), sample report (14 carrier + 14 trait, all rsIDs verified vs carrier-panel.json/trait-snps.json), security page (zero-knowledge), GDPR consent UI (withdrawal + data clearing, focus trap, Escape key, scroll lock). 1070 Vitest + 25 Playwright E2E tests. Gate 1: 10/10 A+ Gemini. Gate 2: 10/10 A/A+ Claude (5 rounds). 13 commits. | PR #53 |
| 2026-02-17 | Claude | Deferred Items — Review Debt: 12/13 deferred items resolved. Pre-production: rate limiter Redis support, OAuth email-based deletion. Code quality: Jinja2 email templates, tier enum centralization, webhook idempotency (receipt_sent + UNIQUE + IntegrityError), legacy data format (410→422). Compliance: DPIA template, age verification (18+), audit log retention (3-tier policy), consent preservation (SET NULL), privacy scrub (high_risk_count→has_results), DOB in GDPR export. 5 Alembic migrations (006-010), 124 new tests (380 total). Gate 1: 6/6 A+ Gemini. Gate 2: Security A+, Legal A, Code Quality A, QA A. 46 files, +4,961 LOC. | PR #57 |
| 2026-02-15 | Claude | Stream B Sprint 1 — Backend Foundation: 4 tasks (B11, B3, B1, B2). CSRF middleware, ZKE schema, strict Pydantic types, data versioning, session invalidation, security hardening. 205 tests. Gate 2: 7/7 A Claude. | PR #54 |
| 2026-02-15 | Claude | Stream B Sprint 2 — ZKE Pivot + GDPR: 4 tasks (B13, B7, B8, B12). ZKE pivot (opaque envelope), GDPR router (delete/export/rectification), shared account_service. 245 tests. Gate 1: 6/6 A Gemini. Gate 2: 6/6 A Claude. | PR #55 |
| 2026-02-17 | Claude | Stream B Sprint 3 — Business Logic: 4 tasks (B5, B6, B9, B10). Tier gating (SELECT FOR UPDATE, $14.99/$34.99), anonymous analytics (ON CONFLICT upsert), purchase receipts (Jinja2), partner notification (masked email). Gate 2 fixes: mask_email utils, URL-encoded tokens, httpx shutdown, lazy API keys, SQL COUNT, dialect caching, analytics purge, rate limiting. 503 tests. Gate 1: 7/7 A+ Gemini. Gate 2: 7/7 A Claude (3 rounds). 30 files, +4,127 LOC. | PR #56 |
| 2026-02-18 | Claude | Stream S Sprint 2 — Data Security: 3 tasks (S3, S5, S6). Worker memory clearing (clearSensitiveMemory in finally, wipeGenotypeMap defense-in-depth, clear_memory message handler). GDPR audit logging (4 event types, begin_nested savepoint, fire-and-forget, db.commit fix for read-only endpoints). IndexedDB storage (idb-keyval, schema versioning, ZKE guards, localStorage audit). 2,600 total tests (915 engine + 1155 web + 530 backend). Gate 1: 6/6 A+ Gemini (2 rounds). Gate 2: 6/6 A Claude (3 rounds). 16 files, +2,162 LOC. | PR #59 |
| 2026-02-19 | Claude | Stream C — Legacy Cleanup: Deleted 142 legacy files (~152K lines — Source/, pages/, data/, sample_data/, tests/, app.py, pyproject.toml, docker-compose, etc.). Fixed "subscription" terminology, deleted legacy CI workflows, updated README for V3. | PR #83 |
| 2026-02-19 | Claude | Stream L Sprint 1 — Legal Content: 6 tasks (L1/L8, L2, L3, L4, L9/L10). ToS 9-13, Privacy Policy 11-13, GDPR Art 9(2)(a) consent, GINA pre-upload notice, pre-payment disclosure, refund scoping. 11 files, +609 LOC, 2,070 tests. Gate 1: 5/5 A/A+ Gemini. Gate 2: 5/5 A+ Claude (2 rounds). | PR #84 |
| 2026-02-20 | Claude | Stream L Sprint 2 — Legal Compliance: L5 Cookie Consent Audit (CPRA focus trap, ConsentGate fallback, marketing toggle, WCAG touch targets, equal-prominence buttons), L6 Data Retention Enforcement (RetentionService batched purge, 3-tier audit 90d/1yr/2yr, inactive user 3yr free-tier, payment SET NULL 7yr, cron endpoint timing-safe+rate-limited+CSRF-exempt), DPIA, Breach Response Plan, ROPA, DPO Appointment. 38 files, +3,718 LOC. Gate 1: 10/10 A+ Gemini (2 rounds). Gate 2: 10/10 A Claude (3 rounds). | PR #85 |
| 2026-02-20 | Claude | Stream Q Sprints 1+2 — QA Infrastructure + Accuracy: 515 new tests, 20 files, +10,730 lines (test-only). Sprint 1: synthetic genome factory (seedable LCG PRNG, 4 DTC formats), golden standards (5 datasets), parser comprehensive (136 tests, 11 groups), encryption oracle + stubs (58 tests, AES-256-GCM + Argon2id contracts), privacy E2E (5 Playwright, canary rsID network interception), smoke tests (9), no-console ESLint, carrier panel validator. Sprint 2: carrier accuracy (35, real CF/SCD/FH/OTC), coverage accuracy (25, chip detection), offspring accuracy (63, Mendelian + PRS), liftover accuracy (36, 5 dbSNP round-trips), legacy-ported (47 from deleted Python), save/load integrity (48, 7 todo), recovery key E2E (10, 7 fixme). Gate 1: 6/6 A+ Gemini. Gate 2: 6/6 A/A+ Claude (2 rounds, 6 fixes). | PR #86 |
| 2026-02-21 | Claude | Stream Q Sprints 3+4 — E2E, Accessibility, Performance, Fuzzing, Integration: ~400 new tests across 16 test files + 1 production utility + 1 shared E2E helper. Sprint 3: E2E scenarios (Playwright coverage across all major user flows), accessibility compliance (axe-core injection, WCAG criteria), performance benchmarks (Core Web Vitals, memory profiling, worker efficiency). Sprint 4: Fuzz testing (property-based input generation, edge case discovery), integration flows (carrier detection→offspring→counseling pipeline), CI reliability (flake detection, retry strategies). Test results: genetics-engine 1,392 pass; web 1,482 pass; total 2,874 tests. Gate 1: 6/6 A+ Gemini. Gate 2: 6/6 A/A+ Claude. **Stream Q COMPLETE — all 30+ tasks done across PR #86 merged + PR #87 open.** | PR #87 |

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
   - **Stream D (Data Cleanup): COMPLETE** — PR #47 merged. 2,697 entries. Centralized count.
   - **Stream E (Engine): MERGED** — PR #48. 25 tasks (T1+T8 + E1-E23), 898 tests
     - Gate 1: 10/10 A+ Gemini (2 fix rounds)
     - Gate 2: 7/10 Claude completed (3 rate-limited), issues fixed: wired coverage+chip detection, ENGINE_VERSION dedup, raw decompression security, prototype pollution fix, cache cleanup, ethnicity tier fix, stage display names, em dash fix, locale fix
     - 24 files changed in review fix commit, 898 tests across 20 test files
   - **Stream TD (Types + Data): MERGED** — PR #49. Carrier panel restructure, coverage_tier, PRS ancestry_transferability, RiskLevel expansion, rsID fixes, 901 tests
   - **Stream F (Frontend): COMPLETE** — all 4 sprints merged (47 tasks)
     - Sprint 1: PR #50 MERGED (15 tasks, 714 tests)
     - Sprint 2: PR #51 MERGED (6 tasks, 803 tests)
     - Sprint 3: PR #52 MERGED (13 tasks, 940 web / 1332 total tests)
     - Sprint 4: PR #53 MERGED (7 tasks, 1070 Vitest + 25 Playwright E2E)
   - **Stream B (Backend): COMPLETE** — all 12 active B-tasks done across 3 sprints + deferred items
     - Sprint 1 (Foundation): PR #54 MERGED — B11, B3, B1, B2. 205 backend tests. Gate 2: 7/7 A Claude.
     - Sprint 2 (ZK Pivot + GDPR): PR #55 MERGED — B13, B7, B8, B12. 245 tests. Gate 1: 6/6 A. Gate 2: 6/6 A.
     - Sprint 3 (Business): PR #56 MERGED — B5, B6, B9, B10. 503 tests. Gate 1: 7/7 A+. Gate 2: 7/7 A.
     - Deferred Items: PR #57 MERGED — 12/13 items. 380 tests. Gate 1: 6/6 A+. Gate 2: 4/4 A/A+.
   - **Stream S (Security): COMPLETE** — all 3 sprints merged
     - Sprint 1 (Containment): PR #58 MERGED — S1 CSP headers, S2 tracker audit + data-mask, S10 RSC enforcement. 34 files, +1,400 LOC, 55 new tests (2,026 total). Gate 1: 6/6 A+ Gemini. Gate 2: 6/6 A Claude.
     - Sprint 2 (Data): PR #59 MERGED — S3 Worker Memory, S5 Audit Logging, S6 IndexedDB Storage. 16 files, +2,162 LOC, 2,600 total tests. Gate 1: 6/6 A+ Gemini. Gate 2: 6/6 A Claude.
     - Sprint 3 (Ops): PR #61 MERGED — S4 Supply Chain, S7 Rate Limiting, S8 Secret Rotation, S9 Alerting. 27 files, +2,723 LOC. Gate 1: 6/6 A/A+ Gemini. Gate 2: 6/6 A Claude.
   - **Stream C (Legacy Cleanup): COMPLETE** — PR #83 merged. Deleted 142 legacy files (~152K lines), fixed "subscription" terminology, deleted legacy CI workflows, updated README for V3.
   - **Stream L (Legal): Sprint 1 COMPLETE** — PR #84 MERGED. 6 tasks (L1/L8, L2, L3, L4, L9/L10). Privacy Policy (7yr retention, ZKE, DPO, EU Rep, transfers), ToS 9-13 (arbitration, prohibited uses, 18+), GDPR Art 9(2)(a) consent, GINA pre-upload notice, pre-payment disclosure, refund scoping. 11 files, +609 LOC, 2,070 tests. Gate 1: 5/5 A/A+ Gemini. Gate 2: 5/5 A+ Claude (2 rounds).
   - **Stream L (Legal): Sprint 2 COMPLETE** — PR #85 MERGED. L5 (cookie consent audit: CPRA modal focus trap, ConsentGate fallback, marketing toggle, WCAG touch targets), L6 (data retention enforcement: RetentionService batched purge, 3-tier audit retention 90d/1yr/2yr, inactive user 3yr, payment SET NULL 7yr, cron endpoint timing-safe + rate limited + CSRF exempt), 4 legal docs (DPIA, Breach Response, ROPA, DPO Appointment). 38 files, +3,718 LOC, 1,201 web + 624 backend tests. Gate 1: 10/10 A+ Gemini (2 rounds). Gate 2: 10/10 A Claude (3 rounds).
     - Remaining L tasks: None — Stream L complete after PR #85 merges
   - **Stream Q (QA): COMPLETE** — PR #86 merged, PR #87 open. 30+ tasks across 4 sprints. 1,000+ new tests total.
     - Sprints 1+2: PR #86 MERGED. 515 new tests, 20 files, +10,730 lines. Gate 1: 6/6 A+ Gemini. Gate 2: 6/6 A/A+ Claude (2 rounds).
     - Sprints 3+4: PR #87 OPEN. ~400 new tests (16 files + 2 helpers). E2E, a11y, performance, fuzzing, integration. Gate 1: 6/6 A+ Gemini. Gate 2: 6/6 A/A+ Claude. **All Q tasks done.**
   - **Remaining streams:** Ops (3 tasks)

---

## Active Blockers

*R12 (rsID audit) needs re-run with corrected ClinVar lookup methodology. Non-blocking.*

---

## Notes
- kukiz works from multiple computers — always pull first!
- Claude pushes PROGRESS.md directly to main; all other changes go through PRs
- V3 review process: 11 reviewers (Architect, QA, Scientist, Technologist, Business, Marketing, Designer, Security Analyst, Code Reviewer, Legal+Privacy, Ethics/Bioethics) — all must give A+ (three-layer: Static → Gemini CLI with `GEMINI_SYSTEM_MD` personas → Claude Opus agents)
