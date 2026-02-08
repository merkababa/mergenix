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
| **V3 REWRITE: Phase 0 — Monorepo scaffolding** | Claude | Merged | rewrite/phase-0-scaffolding | PR #27 → `rewrite/main`. Next.js 14 + FastAPI + TS genetics engine. Privacy-first (DNA never leaves browser). 138 files, +21,965 lines. |
| **V3 REWRITE: Phase 0 — Polish** | Claude | PR Open | rewrite/phase-0-polish | PR #28 → `rewrite/main`. 4-round iterative review cycle with 4 Opus reviewers (Architect, QA, Scientist, Technologist). 72+ issues found and fixed. ALL 4 reviewers achieved **A+ grade**. 43 files, +450 lines. Data consistency, genetics accuracy, auth/security, infrastructure, frontend/UX fixes. |
| **V3 REWRITE: Phase 1 — Marketing Pages** | Claude | Merged | rewrite/phase-1-marketing-pages | PR #29 → `rewrite/main`. 6 polished marketing pages (Home, Products, About, Disease Catalog, Glossary, Legal) + Subscription fix. Server/client component split, Framer Motion animations (MotionConfig reducedMotion), WCAG 2.1 AA (focus trap, skip-to-main, aria-hidden), DRY extraction (6 shared utils, 7 shared components). 5-round ralph loop: ALL 4 reviewers achieved **A+ grade**. 38 files, +5,265/-2,125 lines. |
| **V3 REWRITE: Phase 2 — Auth Pages** | Claude | PR Open | rewrite/phase-2-auth-pages | PR #30 → `rewrite/main`. Full auth system: Login + 2FA + OAuth, Register, Forgot/Reset Password, Verify Email, OAuth Callback, Account Dashboard (profile, security, 2FA setup, sessions, danger zone). 7 shared components (DnaDots, OAuthButton, TrustSignals, PasswordInput, PasswordStrengthDisplay, UserMenu, AuthProvider). httpOnly refresh tokens, indicator cookie, 15-min idle + 8-hr absolute timeout, WCAG 2.1 AA. 3-round ralph loop with **6 reviewers** (Architect A+, QA A+, Scientist A+, Technologist A, Business A+, Designer A). 37 files, +5,345 lines. |

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

### V3 Rewrite (Next.js + FastAPI + TypeScript — privacy-first)
- [x] Phase 0: Monorepo scaffolding (Turborepo, Next.js 14, FastAPI, TS genetics engine) — PR #27
- [x] Phase 1: Marketing pages polish (home, products, about, legal, diseases, glossary) — PR #29
- [ ] Phase 2: Genetics engine implementation (parser, carrier, PRS, PGx, traits — all client-side)
- [ ] Phase 3: Analysis UI (file upload, results dashboard, counseling)
- [ ] Phase 4: Auth + Payments (JWT, TOTP 2FA, Stripe, Google OAuth)
- [ ] Phase 5: Remaining pages (account, subscription, admin)
- [ ] Phase 6: Testing + deployment (Vitest, Playwright, Vercel + Railway)

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
| 2026-02-08 | Claude | V3 Rewrite Phase 0: Full monorepo scaffolding. Next.js 14 App Router + FastAPI + TypeScript genetics engine. Privacy-first architecture (DNA never leaves browser via Web Workers). 138 files, +21,965 lines. 4 planning docs (13,187 lines: system architecture, design system, tech infrastructure, genetics porting guide). 4-reviewer panel (Architect A-, QA B+, Scientist B+, Technologist B+) → 13 issues found and fixed. Branching: rewrite/main → rewrite/phase-0-scaffolding. | PR #27 |
| 2026-02-08 | Claude | V3 Rewrite Phase 0 Polish: 4-round iterative review with 4 Opus reviewers (Architect, QA, Scientist, Technologist). 72+ issues found and fixed across all rounds. ALL 4 reviewers achieved A+ grade. 43 files, +450 lines. Fixes: data consistency (tier pricing, feature limits), genetics accuracy (star alleles, repeat expansions, drug mappings), auth/security (2FA login, OAuth state), infrastructure (frozen-lockfile, pnpm pinning, Docker), frontend/UX (demo labels, forgot-password, layout). | PR #28 |
| 2026-02-08 | Claude | V3 Rewrite Phase 1: Marketing pages polish — 6 pages (Home, Products, About, Disease Catalog, Glossary, Legal) + Subscription fix. Server/client component split (metadata exports), Framer Motion animations (MotionConfig reducedMotion), WCAG 2.1 AA (focus trap, skip-to-main, aria-hidden, scroll lock), DRY extraction (animation-variants, pricing-data, faq-data, glossary-data, use-count-up hook, disease-data). 5-round ralph loop → A+ from all 4 reviewers. 38 files, +5,265/-2,125 lines. | PR #29 |
| 2026-02-08 | Claude | V3 Rewrite Phase 2: Auth pages — Full authentication system. Login + 2FA TOTP + Google OAuth, Register (12-char password, strength meter), Forgot/Reset Password (one-time token protection), Verify Email (auto-verify + resend with 60s cooldown), OAuth Callback, Account Dashboard (profile, security, 2FA setup wizard with client-side QR, sessions Coming Soon, danger zone Coming Soon). Infrastructure: Base HTTP client (token injection, 401 retry, refresh dedup, AbortSignal timeout), Auth API client (17 endpoints, snake→camelCase), Zustand store (in-memory access token, httpOnly cookie refresh), AuthProvider (hydration, auto-refresh, 15-min idle + 8-hr absolute timeout), Edge middleware (indicator cookie, open redirect validation). 7 shared components (DnaDots, OAuthButton, TrustSignals, PasswordInput, PasswordStrengthDisplay, UserMenu, AuthProvider). All CSS vars (zero hardcoded hex), WCAG 2.1 AA, MotionConfig reducedMotion. 3-round ralph loop → 6 reviewers (Architect A+, QA A+, Scientist A+, Technologist A, Business A+, Designer A). 37 files, +5,345 lines. | PR #30 |

---

## Active Blockers
_None currently_

---

## Notes
- kukiz works from two computers (work room + living room) — always pull first!
- Maayan sometimes shares machines with kukiz — check PROGRESS.md to avoid conflicts
- Claude pushes PROGRESS.md directly to main; all other changes go through PRs
