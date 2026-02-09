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

---

## Active Work — Phase 5: Auth UI (Branch: rewrite/phase-5-auth-ui)

**Started:** 2026-02-09 | **Owner:** Claude | **Status:** IN PROGRESS — tests mostly passing, 4 W4a test files hang

### What's Done
1. **Wave 1 — Placeholder completion (4 files modified):**
   - `auth-client.ts`: Added `getSessions()`, `revokeSession()`, `revokeAllSessions()`, `deleteAccount()` endpoints
   - `auth-store.ts`: Added matching store actions, fixed `deleteAccount` to accept password
   - `sessions-section.tsx`: Full rewrite from "Coming Soon" → session table with revoke buttons
   - `danger-zone.tsx`: Full rewrite from disabled placeholder → expandable deletion UI with password+checkbox

2. **Wave 2 — Store + API + utility tests (5 files, 127 tests PASSING):**
   - `__tests__/stores/auth-store.test.ts` (42 tests)
   - `__tests__/api/auth-client.test.ts` (24 tests)
   - `__tests__/api/client.test.ts` (17 tests)
   - `__tests__/lib/password-utils.test.ts` (14 tests)
   - `__tests__/lib/account-utils.test.ts` (11 tests)
   - **Verification: `cd apps/web && npx vitest run __tests__/stores __tests__/api __tests__/lib` → all pass**

3. **Wave 3 — Auth page component tests (6 files, 66 tests PASSING):**
   - `__tests__/components/auth/login-content.test.tsx` (15 tests)
   - `__tests__/components/auth/register-content.test.tsx` (15 tests)
   - `__tests__/components/auth/forgot-password-content.test.tsx` (8 tests)
   - `__tests__/components/auth/reset-password-content.test.tsx` (10 tests)
   - `__tests__/components/auth/verify-email-content.test.tsx` (10 tests)
   - `__tests__/components/auth/callback-content.test.tsx` (8 tests)
   - **Verification: `cd apps/web && npx vitest run __tests__/components/auth` → all pass**

4. **Wave 4b — Infra tests (4 files, 37 tests PASSING):**
   - `__tests__/components/account/sessions-section.test.tsx` (9 tests)
   - `__tests__/components/account/danger-zone.test.tsx` (9 tests)
   - `__tests__/providers/auth-provider.test.tsx` (8 tests)
   - `__tests__/middleware.test.ts` (10 tests)
   - **Verification: `cd apps/web && npx vitest run __tests__/middleware.test.ts __tests__/providers` → pass**
   - **Verification: `cd apps/web && npx vitest run __tests__/components/account/sessions-section.test.tsx __tests__/components/account/danger-zone.test.tsx` → pass**

### What's STUCK — Wave 4a (4 files, ~45 tests HANG)
- `__tests__/components/account/profile-section.test.tsx` (10 tests)
- `__tests__/components/account/security-section.test.tsx` (10 tests)
- `__tests__/components/account/change-password-modal.test.tsx` (12 tests)
- `__tests__/components/account/two-factor-setup-modal.test.tsx` (13 tests)

**Root cause:** These 4 test files hang during vitest initialization — they never execute. The tests use a Proxy-based lucide-react mock but do NOT mock UI components (`@/components/ui/glass-card`, `@/components/ui/button`, `@/components/ui/badge`, `@/components/ui/input`). The working W4b tests (sessions, danger-zone) DO mock those UI components explicitly. The fix is to add explicit UI component mocks to all 4 W4a test files, matching the pattern used by sessions-section.test.tsx and danger-zone.test.tsx.

**Fix pattern — add these mocks BEFORE the import of the component under test:**
```tsx
vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, ...props }: any) => <div data-testid="glass-card" {...props}>{children}</div>,
}));
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, isLoading, disabled, ...props }: any) => (
    <button disabled={disabled || isLoading} {...props}>{isLoading && <span data-testid="loader">Loading...</span>}{children}</button>
  ),
}));
vi.mock('@/components/ui/input', () => ({
  Input: ({ label, error, icon, ...props }: any) => (
    <div><label htmlFor={label?.toLowerCase().replace(/\\s+/g, '-')}>{label}</label><input id={label?.toLowerCase().replace(/\\s+/g, '-')} {...props} />{error && <p role="alert">{error}</p>}</div>
  ),
}));
vi.mock('@/components/auth/password-input', () => ({
  PasswordInput: ({ label, value, onChange, error, ...rest }: any) => (
    <div><label htmlFor="pw-input">{label}</label><input id="pw-input" type="password" value={value} onChange={onChange} aria-label={label || 'password'} />{error && <span role="alert">{error}</span>}</div>
  ),
}));
```

### What's Left After Fixing W4a
1. Fix the 4 W4a test files (add UI component mocks)
2. Run full combined test suite — `cd apps/web && npx vitest run`
3. TypeScript check — `pnpm --filter web typecheck`
4. Commit all changes on `rewrite/phase-5-auth-ui`
5. Create PR targeting `rewrite/main`
6. Run 6/6 A+ review cycle (Architect, QA, Scientist, Technologist, Business, Designer)
7. Fix review issues, re-review until 6/6 A+
8. Merge PR
9. Update PROGRESS.md and PROJECT_STATUS.md

### File List (all changes on rewrite/phase-5-auth-ui branch)
**Modified (4):**
- `apps/web/lib/api/auth-client.ts` — +4 endpoints, +types
- `apps/web/lib/stores/auth-store.ts` — +3 actions, fixed deleteAccount
- `apps/web/app/(app)/account/_components/sessions-section.tsx` — full rewrite
- `apps/web/app/(app)/account/_components/danger-zone.tsx` — full rewrite

**New test files (19):**
- `apps/web/__tests__/stores/auth-store.test.ts`
- `apps/web/__tests__/api/auth-client.test.ts`
- `apps/web/__tests__/api/client.test.ts`
- `apps/web/__tests__/lib/password-utils.test.ts`
- `apps/web/__tests__/lib/account-utils.test.ts`
- `apps/web/__tests__/components/auth/login-content.test.tsx`
- `apps/web/__tests__/components/auth/register-content.test.tsx`
- `apps/web/__tests__/components/auth/forgot-password-content.test.tsx`
- `apps/web/__tests__/components/auth/reset-password-content.test.tsx`
- `apps/web/__tests__/components/auth/verify-email-content.test.tsx`
- `apps/web/__tests__/components/auth/callback-content.test.tsx`
- `apps/web/__tests__/components/account/profile-section.test.tsx`
- `apps/web/__tests__/components/account/security-section.test.tsx`
- `apps/web/__tests__/components/account/change-password-modal.test.tsx`
- `apps/web/__tests__/components/account/two-factor-setup-modal.test.tsx`
- `apps/web/__tests__/components/account/sessions-section.test.tsx`
- `apps/web/__tests__/components/account/danger-zone.test.tsx`
- `apps/web/__tests__/providers/auth-provider.test.tsx`
- `apps/web/__tests__/middleware.test.ts`

---

## Active Blockers
_W4a test hang — see fix pattern above_

---

## Notes
- kukiz works from two computers (work room + living room) — always pull first!
- Maayan sometimes shares machines with kukiz — check PROGRESS.md to avoid conflicts
- Claude pushes PROGRESS.md directly to main; all other changes go through PRs
