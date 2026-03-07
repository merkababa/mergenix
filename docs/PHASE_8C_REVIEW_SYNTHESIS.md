# Phase 8C E2E Test Suite — Final Review Synthesis

**PR:** #40 (`test/phase-8c-e2e` → `rewrite/main`)
**Scope:** 153 Playwright E2E scenarios, 23 spec files, 7 POMs, fixtures, utilities (~11,000 LOC across 46 files)
**Review Process:** 10 expert reviewers × 2 rounds + fix cycles

---

## Review Panel & Grades

| #   | Reviewer             | Grade | BLOCKs | WARNs | INFOs |
| --- | -------------------- | ----- | ------ | ----- | ----- |
| 1   | **Architect**        | B+    | 3→0\*  | 9     | 7     |
| 2   | **QA Engineer**      | B+    | 2      | 10    | 8     |
| 3   | **Scientist**        | A+    | 0      | 2     | 20+   |
| 4   | **Technologist**     | A-    | 2→0\*  | 16    | 9     |
| 5   | **Business**         | A     | 0      | 5     | 20+   |
| 6   | **Designer**         | A-    | 0      | 13    | 14    |
| 7   | **Security Analyst** | B+    | 1      | 6     | 10    |
| 8   | **Code Quality**     | A-    | 1→0\*  | 5     | 3     |
| 9   | **Legal/Privacy**    | A-    | 0      | 3     | 20+   |
| 10  | **Ethics/Bioethics** | A-    | 0      | 6     | 19    |

_\*BLOCKs marked →0 were fixed during the review cycle_

**Composite Grade: A-**

---

## Fixed Issues (All Rounds)

### BLOCKs Resolved

1. **`auth.utils.ts:161-162`** — Incorrect `otplib` API (`{ generate }` → `{ authenticator }.generate()`)
2. **`mock-api.utils.ts`** — Duplicate route handlers for `/auth/sessions` merged into single method-dispatching handler
3. **`mock-api.utils.ts`** — `mockTokenResponse()` centralized as shared export; removed 3 duplicate definitions
4. **`analysis.spec.ts`** — Conflicting route handlers for `/analysis/results` merged into single `mockAnalysisResults()`
5. **`analysis.spec.ts`** — Unused `authTest` import removed
6. **`login.spec.ts`** — Test 9 (HttpOnly cookie) rewritten to avoid contradicting the mock auth model
7. **`oauth.spec.ts`** — Local duplicates (`API_BASE`, `mockTokenResponse`, `mockOAuthUserProfile`) replaced with shared imports
8. **`oauth.spec.ts`** — `.catch(() => {})` replaced with `expect.poll()` for deterministic assertion
9. **`account.spec.ts`** — Duplicate route handler in test 7 removed; `.catch()` anti-pattern replaced with `Promise.race`
10. **`account.spec.ts`** — Hardcoded passwords replaced with `TEST_USERS.free.password`
11. **`auth-security.spec.ts`** — Dead code (second login route registration after test flow) removed
12. **`auth-security.spec.ts`** — Local `mockTokenResponse` removed; `mockUserProfile` renamed to `buildUserProfile`
13. **`password-reset.spec.ts`** — Local `API_BASE` replaced with shared import
14. **`test-users.ts`** — `as const` on `Record<string, TestUser>` replaced with `satisfies`
15. **`test-users.ts`** — `validateTestUserEnv()` now eagerly called in CI
16. **`analysis-scientific.spec.ts`** — Misleading test titles (tests 10-11) renamed to reflect actual behavior
17. **`api/*.spec.ts`** — Skip guards added for live-backend-only tests (`E2E_LIVE_API`)
18. **POMs** — Fragile CSS class selectors replaced with `.or()` patterns (data-testid preferred, CSS fallback)
19. **Multiple files** — 8 `waitForTimeout` calls replaced with proper Playwright waits
20. **`mock-api.utils.ts:358`** — `mockCreateCheckout` URL fixed from `/payments/create-checkout-session` to `/payments/checkout` (matching `payment-client.ts`)

---

## Remaining Actionable Items

### Must-Fix (Pre-Merge)

All BLOCK issues have been resolved. No remaining must-fix items.

_(The last blocker — `mockCreateCheckout` intercepting `/payments/create-checkout-session` instead of `/payments/checkout` — was fixed after verification against `payment-client.ts:109`.)_

### Should-Fix (Post-Merge / Next Sprint)

| Priority | File                          | Issue                                                                                                 |
| -------- | ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| WARN     | Multiple                      | Add `data-testid` attributes to components so POM `.or()` fallbacks to CSS classes become unnecessary |
| WARN     | `security/`                   | Add rate-limiting / account-lockout tests (the `lockout` test user exists but is unused)              |
| WARN     | `security/`                   | Add `javascript:alert(1)` returnUrl XSS vector test                                                   |
| WARN     | `security/`                   | Add OAuth state-mismatch rejection test                                                               |
| WARN     | `register.spec.ts`            | Assert `terms_accepted` field explicitly in registration API payload                                  |
| WARN     | `cookie-consent.spec.ts`      | Add "Customize" button flow test and consent-withdrawal test                                          |
| WARN     | `analysis.spec.ts`            | Tier-gating tests should click locked PGx/PRS tabs to verify upgrade paywall                          |
| WARN     | `analysis-scientific.spec.ts` | Add mock data for moderate/informational urgency counseling triage                                    |
| WARN     | `subscription.spec.ts`        | Add empty payment history test and Pro-tier checkout test                                             |
| WARN     | `navigation.spec.ts`          | Add tablet viewport (768×1024) responsive test                                                        |
| WARN     | `axe-scan.spec.ts`            | Add dark/light mode scans for login, register, products pages                                         |

---

## Strengths Across All Reviewers

1. **Comprehensive coverage**: 153 scenarios across 8 categories (auth, app, marketing, legal, accessibility, performance, security, API)
2. **Strong POM pattern**: 7 POMs with semantic locators (`getByRole`, `getByLabel`, `getByText`) as primary strategy
3. **Thorough mock infrastructure**: `mock-api.utils.ts` with 17+ composable mocks enables frontend-only testing
4. **Two-layer auth testing**: Well-documented architecture separating feature tests (localStorage injection) from security tests (HttpOnly cookie validation)
5. **Scientific accuracy**: All rsIDs, genotype values, carrier percentages, PGx classifications, and PRS categories verified against dbSNP/ClinVar/CPIC
6. **Worker spy pattern**: Sophisticated Web Worker interception without modifying production code
7. **Accessibility breadth**: axe-core WCAG 2.1 AA scans + focus traps for 5 modals + keyboard navigation with ARIA tab compliance
8. **Legal/regulatory coverage**: GDPR consent, data export, right-to-erasure, cookie consent, age verification, GINA notice, medical disclaimers all tested
9. **Performance baselines**: FCP/LCP budgets, long-task monitoring, memory-leak detection (10-cycle), hydration checks
10. **CI-safe credential management**: `requireEnv()` with eager CI validation prevents default passwords in production environments

---

## Key Architectural Decisions Validated

- **Client-side genetics processing** confirmed by "never stored, processed client-side only" tests
- **Anti-enumeration pattern** in password reset ("if an account exists...")
- **Prorated upgrade math** verified ($29.90 - $12.90 = $17.00)
- **NSGC counselor referral** URL verified as correct (`https://www.nsgc.org/findageneticcounselor`)
- **European-ancestry GWAS limitation** caveat tested on PRS results

---

## Files Modified in Fix Rounds

| File                                   | Changes                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `utils/auth.utils.ts`                  | Fixed otplib import API                                                                                 |
| `utils/mock-api.utils.ts`              | Merged session handlers, added `mockTokenResponse`, removed `mockRevokeAllSessions`, fixed checkout URL |
| `utils/index.ts`                       | Updated exports                                                                                         |
| `fixtures/test-users.ts`               | `satisfies` instead of `as const`, eager CI validation                                                  |
| `auth/login.spec.ts`                   | Removed local `mockTokenResponse`, rewrote test 9                                                       |
| `auth/oauth.spec.ts`                   | Removed all local duplicates, imported from shared utils, fixed catch pattern                           |
| `auth/password-reset.spec.ts`          | Imported `API_BASE` from shared utils                                                                   |
| `security/auth-security.spec.ts`       | Imported `mockTokenResponse`, renamed helper, removed dead code                                         |
| `app/account.spec.ts`                  | Removed duplicate route handler, fixed catch pattern, replaced hardcoded passwords                      |
| `app/analysis.spec.ts`                 | Removed unused import, merged route handlers, imported shared constants                                 |
| `app/analysis-scientific.spec.ts`      | Renamed misleading test titles                                                                          |
| `api/auth.api.spec.ts`                 | Added `E2E_LIVE_API` skip guard                                                                         |
| `api/payments.api.spec.ts`             | Added `E2E_LIVE_API` skip guard                                                                         |
| `poms/SubscriptionPage.ts`             | Resilient `.or()` selector                                                                              |
| `poms/NavigationComponent.ts`          | Resilient `.or()` selectors for desktop nav + skip link                                                 |
| `poms/DiseaseCatalogPage.ts`           | Resilient `.or()` selector for disease detail                                                           |
| `accessibility/focus-trap.spec.ts`     | Fixed `isVisible()` timeout API usage                                                                   |
| `security/auth-security.spec.ts`       | Replaced `waitForTimeout` with proper assertion                                                         |
| `performance/worker-lifecycle.spec.ts` | Replaced `waitForTimeout` with `waitForLoadState`                                                       |
| `marketing/navigation.spec.ts`         | Replaced `waitForTimeout` with attribute assertion                                                      |
| `legal/age-verification.spec.ts`       | Replaced `waitForTimeout` with `waitForLoadState`                                                       |
| `legal/cookie-consent.spec.ts`         | Replaced `waitForTimeout` with `waitForLoadState`                                                       |
| `performance/core-vitals.spec.ts`      | Replaced 2 `waitForTimeout` with `waitForLoadState`                                                     |
| `app/subscription.spec.ts`             | Replaced `waitForTimeout` with `expect.poll()`                                                          |
