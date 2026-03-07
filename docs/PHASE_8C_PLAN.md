# Phase 8C: Playwright E2E Tests — Unified Plan

**Date:** 2026-02-11
**Synthesized from:** 10 reviewer perspectives (Architect, QA, Scientist, Technologist, Business, Designer, Security, Code Reviewer, Legal+Privacy, Ethics)

---

## 1. Directory Structure

All E2E tests live under `apps/web/e2e/`. The `playwright.config.ts` stays at the `apps/web/` root. This canonical structure merges proposals from all reviewers.

```
apps/web/
├── playwright.config.ts
└── e2e/
    ├── auth/
    │   ├── login.spec.ts
    │   ├── register.spec.ts
    │   ├── password-reset.spec.ts
    │   └── oauth.spec.ts
    ├── app/
    │   ├── analysis.spec.ts
    │   ├── analysis-scientific.spec.ts
    │   ├── account.spec.ts
    │   └── subscription.spec.ts
    ├── marketing/
    │   ├── navigation.spec.ts
    │   ├── smoke.spec.ts
    │   └── disease-catalog.spec.ts
    ├── legal/
    │   ├── cookie-consent.spec.ts
    │   ├── age-verification.spec.ts
    │   └── legal-pages.spec.ts
    ├── accessibility/
    │   ├── axe-scan.spec.ts
    │   ├── keyboard-nav.spec.ts
    │   └── focus-trap.spec.ts
    ├── performance/
    │   ├── core-vitals.spec.ts
    │   ├── worker-lifecycle.spec.ts
    │   └── memory-leak.spec.ts
    ├── security/
    │   └── auth-security.spec.ts
    ├── api/
    │   ├── auth.api.spec.ts
    │   └── payments.api.spec.ts
    ├── fixtures/
    │   ├── auth.fixture.ts
    │   ├── test-users.ts
    │   └── dna-files/
    │       ├── demo-parentA.txt
    │       ├── demo-parentB.txt
    │       ├── golden-carrier-parentA.txt
    │       ├── golden-carrier-parentB.txt
    │       ├── invalid-format.txt
    │       └── empty-file.txt
    ├── poms/
    │   ├── index.ts
    │   ├── LoginPage.ts
    │   ├── RegisterPage.ts
    │   ├── AnalysisPage.ts
    │   ├── AccountPage.ts
    │   ├── SubscriptionPage.ts
    │   ├── DiseaseCatalogPage.ts
    │   └── NavigationComponent.ts
    └── utils/
        ├── index.ts
        ├── auth.utils.ts
        └── test-data.ts
```

---

## 2. Shared Infrastructure

### 2.1. playwright.config.ts Settings

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: [
    {
      command: 'pnpm start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      cwd: '.',
    },
  ],
});
```

**Key decisions:**

- **Retries in CI only** (1 retry) to catch flakes without hiding real bugs [QA, Architect]
- **Chromium-primary** for dev; all 5 projects run in CI nightly (Chromium + Firefox + WebKit + mobile) [QA, Designer]
- **Timeout:** 60s per test (analysis may take time with worker) [Technologist]
- **Trace/screenshot/video:** only on failure to save CI time [Architect, Code Reviewer]

### 2.2. Page Object Models (POMs)

| POM File                 | Covers                                                                        | Requested By                                       |
| :----------------------- | :---------------------------------------------------------------------------- | :------------------------------------------------- |
| `LoginPage.ts`           | Login form, 2FA input, error messages, Google OAuth button                    | [Architect, QA, Code Reviewer]                     |
| `RegisterPage.ts`        | Registration form, age verification, terms checkbox                           | [QA, Legal, Business]                              |
| `AnalysisPage.ts`        | File upload, demo button, progress stepper, result tabs, tier-gate prompts    | [Architect, QA, Scientist, Business, Technologist] |
| `AccountPage.ts`         | Profile form, password change, 2FA toggle, sessions, danger zone, data export | [Architect, QA, Legal]                             |
| `SubscriptionPage.ts`    | Current plan display, upgrade CTAs, payment history                           | [Business, QA]                                     |
| `DiseaseCatalogPage.ts`  | Search, filters, disease detail page                                          | [QA, Scientist]                                    |
| `NavigationComponent.ts` | Navbar, footer, theme toggle, mobile menu                                     | [Designer, QA]                                     |

**POM conventions** [Code Reviewer]:

- File suffix: `.ts` (not `.pom.ts` — simpler in the `poms/` directory)
- Selectors: prefer `getByRole`, `getByLabel`, `getByText`; use `data-testid` only as fallback
- POMs contain actions; assertions stay in spec files
- Barrel export via `poms/index.ts`

### 2.3. Shared Fixtures

**`auth.fixture.ts`** — The cornerstone fixture [Architect, QA, Code Reviewer]:

- Extends Playwright's base `test` with pre-authenticated `page` objects
- Creates auth states by hitting `POST /auth/login` programmatically and saving `storageState`
- Provides: `freeUserPage`, `premiumUserPage`, `proUserPage`, `user2faPage`
- Avoids repeating the UI login flow in every test

**`test-users.ts`** — Predefined test accounts [QA, Security, Legal]:

```typescript
export const TEST_USERS = {
  free: { email: 'free@test.mergenix.com', password: '...', tier: 'free' },
  premium: { email: 'premium@test.mergenix.com', password: '...', tier: 'premium' },
  pro: { email: 'pro@test.mergenix.com', password: '...', tier: 'pro' },
  with2fa: { email: '2fa@test.mergenix.com', password: '...', totpSecret: '...' },
  unverified: { email: 'unverified@test.mergenix.com', password: '...' },
  lockout: { email: 'lockout@test.mergenix.com', password: '...' },
};
```

### 2.4. Helper Utilities

**`auth.utils.ts`** [Code Reviewer, Architect]:

- `loginViaUI(page, user)` — for tests that specifically test the login UI
- `loginProgrammatically(page, user)` — for tests that just need auth state
- `registerNewUser(request, userData)` — API-based user creation for test setup

**`test-data.ts`** [Scientist, QA]:

- Expected demo analysis spot-check values (rsIDs, expected outcomes)
- Golden file expected results
- Tier limits configuration (diseases, traits, features per tier)

### 2.5. Test Data Strategy

- **Database seeding:** A global setup script seeds test users and baseline data before the suite runs [QA, Security]
- **DNA files:** Static golden files in `e2e/fixtures/dna-files/` with known genotypes for deterministic results [Scientist]
- **Isolation:** Tests that create data (registration, saved analyses) clean up via API in `afterEach` [QA]
- **External services:** All external APIs (Stripe, Google OAuth, analytics) are mocked via `page.route()` [QA, Business, Architect]

---

## 3. Test Files & Scenarios (MASTER LIST)

### 3.1. `auth/login.spec.ts` — Login Flows

| #   | Scenario                                                           | Priority | Reviewers                                |
| :-- | :----------------------------------------------------------------- | :------- | :--------------------------------------- |
| 1   | User logs in with valid credentials and is redirected to /analysis | P0       | [Architect, QA, Business, Code Reviewer] |
| 2   | User sees error message with invalid credentials                   | P0       | [Architect, QA, Code Reviewer]           |
| 3   | User with 2FA enabled is prompted for TOTP code                    | P0       | [QA, Security, Business]                 |
| 4   | User successfully logs in with valid 2FA code                      | P0       | [QA, Security, Business]                 |
| 5   | User is redirected to `returnUrl` after login                      | P1       | [QA, Business]                           |
| 6   | User can log out and session is destroyed                          | P1       | [Business, Security]                     |
| 7   | Unverified user cannot log in (or sees verification prompt)        | P1       | [Security, Legal]                        |
| 8   | Login button is disabled during submission (no double-submit)      | P1       | [Technologist, Code Reviewer]            |
| 9   | Session token is HttpOnly and not accessible via JS                | P1       | [Security]                               |

### 3.2. `auth/register.spec.ts` — Registration Flows

| #   | Scenario                                                            | Priority | Reviewers                 |
| :-- | :------------------------------------------------------------------ | :------- | :------------------------ |
| 1   | New user registers via email and sees "verify email" screen         | P0       | [Architect, QA, Business] |
| 2   | Registration blocked without accepting Terms & Privacy Policy       | P0       | [Legal, Business]         |
| 3   | Age verification gate appears and blocks users under 18             | P0       | [Legal, Ethics]           |
| 4   | Users 18+ pass age gate and can proceed to register                 | P1       | [Legal]                   |
| 5   | Cannot register with an already-existing email                      | P1       | [Architect, QA]           |
| 6   | Password strength requirements enforced on client                   | P1       | [Architect, QA, Security] |
| 7   | Validation errors shown for invalid email format                    | P1       | [QA, Code Reviewer]       |
| 8   | ToS and Privacy consent recorded via API on successful registration | P1       | [Legal]                   |
| 9   | Age verification recorded as consent event post-registration        | P2       | [Legal]                   |

### 3.3. `auth/password-reset.spec.ts` — Password Reset

| #   | Scenario                                          | Priority | Reviewers                 |
| :-- | :------------------------------------------------ | :------- | :------------------------ |
| 1   | User can request a password reset link            | P1       | [Architect, QA, Business] |
| 2   | User can set a new password using a valid token   | P1       | [Architect, QA, Business] |
| 3   | Invalid/expired token shows error                 | P2       | [QA, Security]            |
| 4   | Reset link cannot be reused after password change | P2       | [Security]                |

### 3.4. `auth/oauth.spec.ts` — Google OAuth

| #   | Scenario                                              | Priority | Reviewers                 |
| :-- | :---------------------------------------------------- | :------- | :------------------------ |
| 1   | User can initiate Google OAuth flow (mocked redirect) | P1       | [Architect, QA, Business] |
| 2   | Successful OAuth callback creates account and logs in | P1       | [QA, Business]            |
| 3   | OAuth error callback handled gracefully               | P2       | [Architect, QA]           |

### 3.5. `app/analysis.spec.ts` — Core Analysis Workflow

| #   | Scenario                                                                                    | Priority | Reviewers                            |
| :-- | :------------------------------------------------------------------------------------------ | :------- | :----------------------------------- |
| 1   | Guest user can load and view demo analysis results                                          | P0       | [Architect, QA, Business, Scientist] |
| 2   | Demo banner is visible indicating synthetic data                                            | P0       | [Scientist, Ethics]                  |
| 3   | User can upload two valid DNA files                                                         | P0       | [Architect, QA, Business, Scientist] |
| 4   | Analysis starts and progress stepper updates correctly                                      | P0       | [QA, Technologist]                   |
| 5   | Analysis completes and results dashboard displays                                           | P0       | [Architect, QA, Business]            |
| 6   | User can navigate between all result tabs (Overview, Carrier, Traits, PGx, PRS, Counseling) | P0       | [QA, Scientist, Business]            |
| 7   | Free user sees upgrade prompts on locked tabs (PGx, PRS)                                    | P0       | [Business, Scientist]                |
| 8   | Free user limited to top 25 diseases and 10 traits                                          | P0       | [Business, Scientist]                |
| 9   | Premium user sees expanded results (500+ diseases, 79 traits) but Pro features locked       | P1       | [Business]                           |
| 10  | Pro user has full access, no upgrade CTAs                                                   | P1       | [Business]                           |
| 11  | User can select ancestral population for ethnicity-adjusted calculations                    | P1       | [Scientist]                          |
| 12  | Analysis can be cancelled mid-process                                                       | P1       | [Architect, Technologist]            |
| 13  | User can save and load an analysis result                                                   | P1       | [QA, Business]                       |
| 14  | Invalid/corrupted file upload shows user-friendly error                                     | P1       | [QA, Technologist]                   |
| 15  | Medical disclaimer visible on analysis results page                                         | P1       | [Scientist, Ethics, Legal]           |
| 16  | Upload of empty file handled gracefully                                                     | P2       | [QA]                                 |
| 17  | UI remains responsive during file upload and analysis                                       | P2       | [Technologist]                       |

### 3.6. `app/analysis-scientific.spec.ts` — Scientific Accuracy Spot-Checks

| #   | Scenario                                                                        | Priority | Reviewers           |
| :-- | :------------------------------------------------------------------------------ | :------- | :------------------ |
| 1   | Demo: Cystic Fibrosis carrier risk shows correct percentages (rs75030207)       | P1       | [Scientist]         |
| 2   | Demo: Eye color trait prediction correct for known genotypes (rs12913832)       | P1       | [Scientist]         |
| 3   | Demo: CYP2C19 PGx shows "Poor Metabolizer" with correct recommendation          | P1       | [Scientist]         |
| 4   | Demo: Coronary artery disease PRS shows >90th percentile "High Risk"            | P1       | [Scientist]         |
| 5   | Golden file: Both-carrier parents show 25% Tay-Sachs risk (rs76173977)          | P1       | [Scientist]         |
| 6   | Golden file: Recessive trait prediction correct for earwax (rs17822931)         | P2       | [Scientist]         |
| 7   | Golden file: CYP2C9 *3/*3 shows "Poor Metabolizer" with Warfarin dose reduction | P2       | [Scientist]         |
| 8   | Golden file: T2D PRS shows >95th percentile "High Risk"                         | P2       | [Scientist]         |
| 9   | Counseling triage: Both-carrier parents trigger "High" urgency                  | P1       | [Scientist, Ethics] |
| 10  | Counseling triage: Single carrier triggers "Moderate" urgency                   | P2       | [Scientist]         |
| 11  | Counseling triage: No pathogenic variants shows "Informational"                 | P2       | [Scientist]         |
| 12  | Citation links (OMIM, ClinVar) present and correct on disease pages             | P2       | [Scientist, Legal]  |

### 3.7. `app/account.spec.ts` — Account Management

| #   | Scenario                                                           | Priority | Reviewers                                |
| :-- | :----------------------------------------------------------------- | :------- | :--------------------------------------- |
| 1   | User can view their account page                                   | P0       | [Architect]                              |
| 2   | User can update their display name                                 | P1       | [Architect, QA, Business, Code Reviewer] |
| 3   | User can change their password                                     | P1       | [Architect, QA, Business, Security]      |
| 4   | User can enable 2FA and view backup codes                          | P1       | [Architect, QA, Business, Security]      |
| 5   | User can disable 2FA                                               | P1       | [QA, Business]                           |
| 6   | User can view active sessions                                      | P1       | [QA, Business]                           |
| 7   | User can revoke another session                                    | P1       | [Architect, QA, Business, Security]      |
| 8   | User can export their data as JSON                                 | P1       | [Legal]                                  |
| 9   | Account deletion requires correct password + confirmation checkbox | P1       | [Legal, Security]                        |
| 10  | User can permanently delete their account                          | P1       | [Architect, QA, Business, Legal]         |
| 11  | After deletion, user is logged out and cannot log back in          | P1       | [Legal, Security]                        |
| 12  | Empty states displayed correctly (no sessions, no payments)        | P2       | [QA, Designer]                           |

### 3.8. `app/subscription.spec.ts` — Payments & Subscriptions

| #   | Scenario                                                          | Priority | Reviewers                 |
| :-- | :---------------------------------------------------------------- | :------- | :------------------------ |
| 1   | User can view current subscription/tier status                    | P0       | [Business, QA]            |
| 2   | Products page displays all tiers with correct prices and features | P0       | [Business]                |
| 3   | Free user redirected to Stripe checkout for upgrade (mocked)      | P0       | [Business, QA, Architect] |
| 4   | Premium-to-Pro upgrade flow with prorated display                 | P1       | [Business]                |
| 5   | Successful payment redirects to /payment/success page             | P1       | [Business, QA, Architect] |
| 6   | Cancelled payment redirects to /payment/cancel page               | P1       | [Business, QA]            |
| 7   | After upgrade, subscription page shows new active tier            | P1       | [Business]                |
| 8   | Payment history displays accurately                               | P1       | [Business, QA]            |
| 9   | Pro user sees active plan with no upgrade options                 | P1       | [Business]                |

### 3.9. `marketing/smoke.spec.ts` — Marketing Page Smoke Tests

| #   | Scenario                                               | Priority | Reviewers             |
| :-- | :----------------------------------------------------- | :------- | :-------------------- |
| 1   | Homepage loads and contains hero headline text         | P1       | [Architect, Business] |
| 2   | About page loads with main content                     | P1       | [Business]            |
| 3   | Products/Pricing page loads with tier comparison table | P1       | [Business]            |
| 4   | Glossary page loads                                    | P2       | [Business]            |
| 5   | No broken links on primary marketing pages             | P2       | [Business, QA]        |

### 3.10. `marketing/navigation.spec.ts` — Site Navigation

| #   | Scenario                                                                      | Priority | Reviewers                 |
| :-- | :---------------------------------------------------------------------------- | :------- | :------------------------ |
| 1   | All primary navbar links navigate correctly                                   | P1       | [Architect, QA, Designer] |
| 2   | All footer links navigate correctly                                           | P1       | [QA, Designer]            |
| 3   | Mobile hamburger menu opens/closes and links work                             | P1       | [Designer, QA]            |
| 4   | Dark/light theme toggle works and persists                                    | P2       | [QA, Designer]            |
| 5   | Anonymous user sees Login/Register; authenticated user sees Dashboard/Account | P1       | [Business]                |

### 3.11. `marketing/disease-catalog.spec.ts` — Disease Catalog

| #   | Scenario                                                    | Priority | Reviewers                  |
| :-- | :---------------------------------------------------------- | :------- | :------------------------- |
| 1   | Disease catalog page loads with list of diseases            | P1       | [QA, Scientist, Business]  |
| 2   | User can search diseases by name                            | P1       | [QA, Scientist]            |
| 3   | User can filter diseases by category and severity           | P1       | [QA, Scientist]            |
| 4   | User can navigate to a disease detail page                  | P1       | [QA, Scientist]            |
| 5   | Disease detail page shows inheritance, severity, SNPs table | P1       | [Scientist]                |
| 6   | Medical disclaimer visible on disease detail page           | P2       | [Scientist, Ethics, Legal] |

### 3.12. `legal/cookie-consent.spec.ts` — Cookie Consent

| #   | Scenario                                                  | Priority | Reviewers         |
| :-- | :-------------------------------------------------------- | :------- | :---------------- |
| 1   | Cookie banner appears on first visit with clean session   | P0       | [Legal]           |
| 2   | No analytics cookies set before consent                   | P0       | [Legal, Security] |
| 3   | "Accept Essential Only" hides banner and blocks analytics | P1       | [Legal]           |
| 4   | "Accept All" hides banner and enables analytics           | P1       | [Legal]           |
| 5   | Consent choice persists across page reloads               | P1       | [Legal]           |

### 3.13. `legal/age-verification.spec.ts` — Age Gate

| #   | Scenario                                                     | Priority | Reviewers       |
| :-- | :----------------------------------------------------------- | :------- | :-------------- |
| 1   | Age verification modal appears on /register for new sessions | P0       | [Legal, Ethics] |
| 2   | Users under 18 are blocked from registering                  | P0       | [Legal, Ethics] |
| 3   | Users 18+ can proceed to registration form                   | P1       | [Legal]         |
| 4   | Age verification persists in localStorage                    | P2       | [Legal]         |

### 3.14. `legal/legal-pages.spec.ts` — Legal Content

| #   | Scenario                                                 | Priority | Reviewers       |
| :-- | :------------------------------------------------------- | :------- | :-------------- |
| 1   | GINA notice section is present and visible on /legal     | P1       | [Legal, Ethics] |
| 2   | Data retention policy table is visible with correct info | P1       | [Legal]         |
| 3   | Privacy policy accessible and renders correctly          | P1       | [Legal]         |
| 4   | Terms of Service accessible and renders correctly        | P1       | [Legal]         |

### 3.15. `accessibility/axe-scan.spec.ts` — Automated Accessibility

| #   | Scenario                                                            | Priority | Reviewers  |
| :-- | :------------------------------------------------------------------ | :------- | :--------- |
| 1   | Homepage: Zero critical/serious axe violations (dark mode)          | P1       | [Designer] |
| 2   | Homepage: Zero critical/serious axe violations (light mode)         | P1       | [Designer] |
| 3   | Login page: Zero critical/serious axe violations                    | P1       | [Designer] |
| 4   | Register page: Zero critical/serious axe violations                 | P1       | [Designer] |
| 5   | Analysis page (results state): Zero critical/serious axe violations | P1       | [Designer] |
| 6   | Account page: Zero critical/serious axe violations                  | P1       | [Designer] |
| 7   | Products page: Zero critical/serious axe violations                 | P1       | [Designer] |
| 8   | Disease catalog page: Zero critical/serious axe violations          | P2       | [Designer] |
| 9   | All form controls have programmatic labels                          | P1       | [Designer] |
| 10  | All images have appropriate alt text                                | P2       | [Designer] |
| 11  | Heading hierarchy: One h1, no skipped levels per page               | P2       | [Designer] |

### 3.16. `accessibility/keyboard-nav.spec.ts` — Keyboard Navigation

| #   | Scenario                                              | Priority | Reviewers  |
| :-- | :---------------------------------------------------- | :------- | :--------- |
| 1   | Tab order is logical on login and register pages      | P1       | [Designer] |
| 2   | Tab order is logical on analysis results page         | P1       | [Designer] |
| 3   | All interactive elements have visible focus indicator | P1       | [Designer] |
| 4   | Result tabs navigable with arrow keys                 | P2       | [Designer] |
| 5   | FAQ accordions toggle with Enter/Space                | P2       | [Designer] |
| 6   | No keyboard traps on any page                         | P1       | [Designer] |

### 3.17. `accessibility/focus-trap.spec.ts` — Modal Focus Management

| #   | Scenario                                                           | Priority | Reviewers         |
| :-- | :----------------------------------------------------------------- | :------- | :---------------- |
| 1   | Change Password modal: focus trapped, Escape closes, focus returns | P1       | [Designer]        |
| 2   | 2FA Setup modal: focus trapped, Escape closes, focus returns       | P1       | [Designer]        |
| 3   | Age Verification modal: focus trapped within modal                 | P1       | [Designer, Legal] |
| 4   | Cookie Consent banner: focus management correct                    | P2       | [Designer, Legal] |
| 5   | Save Analysis dialog: focus trapped, Escape closes                 | P2       | [Designer]        |

### 3.18. `performance/core-vitals.spec.ts` — Performance Baselines

| #   | Scenario                                                              | Priority | Reviewers      |
| :-- | :-------------------------------------------------------------------- | :------- | :------------- |
| 1   | Homepage FCP and LCP within performance budget                        | P2       | [Technologist] |
| 2   | Analysis page remains responsive during file upload                   | P1       | [Technologist] |
| 3   | Slow API responses show loading skeletons, app does not freeze        | P1       | [Technologist] |
| 4   | Client-side navigation (Next.js Link) does not cause full page reload | P2       | [Technologist] |
| 5   | No hydration mismatch errors in console on key pages                  | P2       | [Technologist] |

### 3.19. `performance/worker-lifecycle.spec.ts` — Web Worker Tests

| #   | Scenario                                                                | Priority | Reviewers                 |
| :-- | :---------------------------------------------------------------------- | :------- | :------------------------ |
| 1   | Worker initializes on analysis page load                                | P1       | [Technologist]            |
| 2   | Worker terminates on navigation away from analysis                      | P1       | [Technologist]            |
| 3   | Worker parse: valid files produce parse_complete with correct SNP count | P1       | [Technologist, Scientist] |
| 4   | Worker parse: invalid file produces PARSE_ERROR                         | P1       | [Technologist]            |
| 5   | Worker analysis: completes and posts analysis_complete                  | P1       | [Technologist]            |
| 6   | Worker cancellation: cancel message returns CANCELLED, UI resets        | P2       | [Technologist]            |
| 7   | Worker busy state: second request while busy returns WORKER_BUSY        | P2       | [Technologist]            |
| 8   | Rapid clicks on "Run Analysis" only trigger one analysis                | P1       | [Technologist]            |

### 3.20. `performance/memory-leak.spec.ts` — Memory Leak Detection

| #   | Scenario                                                              | Priority | Reviewers      |
| :-- | :-------------------------------------------------------------------- | :------- | :------------- |
| 1   | 10-cycle login->analyze->reset loop: heap size does not grow linearly | P2       | [Technologist] |

### 3.21. `security/auth-security.spec.ts` — Security Checks

| #   | Scenario                                                             | Priority | Reviewers                |
| :-- | :------------------------------------------------------------------- | :------- | :----------------------- |
| 1   | Unauthenticated user accessing /account is redirected to /login      | P0       | [Security, Business]     |
| 2   | Unauthenticated user accessing /subscription is redirected to /login | P0       | [Security, Business]     |
| 3   | XSS: Script tags in form inputs are escaped/not executed             | P1       | [Security]               |
| 4   | CSRF: API requests include proper tokens/headers                     | P1       | [Security]               |
| 5   | Auth tokens are HttpOnly cookies, not in localStorage                | P1       | [Security]               |
| 6   | 401 response triggers token refresh, retries original request        | P1       | [Technologist, Security] |
| 7   | Expired 2FA window shows error                                       | P2       | [Security]               |

### 3.22. `api/auth.api.spec.ts` — API Auth Contract Tests

| #   | Scenario                                                | Priority | Reviewers             |
| :-- | :------------------------------------------------------ | :------- | :-------------------- |
| 1   | POST /auth/login returns token for valid credentials    | P1       | [Architect]           |
| 2   | GET /auth/me requires valid token and returns user data | P1       | [Architect]           |
| 3   | POST /auth/register returns 201 for valid new user      | P1       | [Architect]           |
| 4   | POST /auth/login returns 401 for invalid credentials    | P1       | [Architect, Security] |

### 3.23. `api/payments.api.spec.ts` — API Payment Contract Tests

| #   | Scenario                                                    | Priority | Reviewers   |
| :-- | :---------------------------------------------------------- | :------- | :---------- |
| 1   | POST /payments/create-checkout-session requires auth        | P2       | [Architect] |
| 2   | POST /payments/create-checkout-session rejects invalid tier | P2       | [Architect] |

---

## 4. Priority Execution Order

### P0 — Must-Have for Launch (25 scenarios)

These are the absolute minimum required before any production deployment. They cover the critical user path from registration through analysis to payment.

| File                             | Count  | Scenarios                                                                                                                                         |
| :------------------------------- | :----- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth/login.spec.ts`             | 4      | Valid login, invalid login error, 2FA prompt, 2FA success                                                                                         |
| `auth/register.spec.ts`          | 3      | Successful registration, terms required, age gate blocks minors                                                                                   |
| `app/analysis.spec.ts`           | 8      | Demo view, demo banner, file upload, progress display, results dashboard, tab navigation, free tier limits (upgrade prompts + disease/trait caps) |
| `app/account.spec.ts`            | 1      | Can view account page                                                                                                                             |
| `app/subscription.spec.ts`       | 3      | View tier status, pricing page accuracy, checkout redirect                                                                                        |
| `legal/cookie-consent.spec.ts`   | 2      | Banner appears, no pre-consent analytics                                                                                                          |
| `legal/age-verification.spec.ts` | 2      | Age gate appears, minors blocked                                                                                                                  |
| `security/auth-security.spec.ts` | 2      | Protected routes redirect unauthenticated users                                                                                                   |
| **Total**                        | **25** |                                                                                                                                                   |

### P1 — Important (94 scenarios)

Complete coverage of all user flows, tier gating, scientific spot-checks, accessibility, and security hardening.

| File                                   | Count  |
| :------------------------------------- | :----- |
| `auth/login.spec.ts`                   | 5      |
| `auth/register.spec.ts`                | 5      |
| `auth/password-reset.spec.ts`          | 2      |
| `auth/oauth.spec.ts`                   | 2      |
| `app/analysis.spec.ts`                 | 7      |
| `app/analysis-scientific.spec.ts`      | 6      |
| `app/account.spec.ts`                  | 10     |
| `app/subscription.spec.ts`             | 6      |
| `marketing/smoke.spec.ts`              | 3      |
| `marketing/navigation.spec.ts`         | 4      |
| `marketing/disease-catalog.spec.ts`    | 5      |
| `legal/cookie-consent.spec.ts`         | 3      |
| `legal/age-verification.spec.ts`       | 1      |
| `legal/legal-pages.spec.ts`            | 4      |
| `accessibility/axe-scan.spec.ts`       | 8      |
| `accessibility/keyboard-nav.spec.ts`   | 4      |
| `accessibility/focus-trap.spec.ts`     | 3      |
| `performance/core-vitals.spec.ts`      | 2      |
| `performance/worker-lifecycle.spec.ts` | 6      |
| `security/auth-security.spec.ts`       | 4      |
| `api/auth.api.spec.ts`                 | 4      |
| **Total**                              | **94** |

### P2 — Nice-to-Have (34 scenarios)

Edge cases, advanced performance, visual regression, and lower-risk scenarios.

| File                                   | Count  |
| :------------------------------------- | :----- |
| `auth/register.spec.ts`                | 1      |
| `auth/password-reset.spec.ts`          | 2      |
| `auth/oauth.spec.ts`                   | 1      |
| `app/analysis.spec.ts`                 | 2      |
| `app/analysis-scientific.spec.ts`      | 6      |
| `app/account.spec.ts`                  | 1      |
| `marketing/smoke.spec.ts`              | 2      |
| `marketing/navigation.spec.ts`         | 1      |
| `marketing/disease-catalog.spec.ts`    | 1      |
| `legal/age-verification.spec.ts`       | 1      |
| `accessibility/axe-scan.spec.ts`       | 3      |
| `accessibility/keyboard-nav.spec.ts`   | 2      |
| `accessibility/focus-trap.spec.ts`     | 2      |
| `performance/core-vitals.spec.ts`      | 3      |
| `performance/worker-lifecycle.spec.ts` | 2      |
| `performance/memory-leak.spec.ts`      | 1      |
| `security/auth-security.spec.ts`       | 1      |
| `api/payments.api.spec.ts`             | 2      |
| **Total**                              | **34** |

---

## 5. CI Integration

The existing `rewrite-ci.yml` already has a well-configured `e2e` job. Here is the plan, noting what exists and what needs to be added.

### Existing CI (already in place)

- PostgreSQL 16 service container for E2E (`mergenix_e2e` database)
- Python + Node.js setup with caching
- Playwright browser installation (`chromium` only currently)
- Frontend build + start, API server start
- Health check wait loop for both servers
- Playwright test execution via `pnpm run test:e2e`
- Artifact upload for Playwright HTML report and test results

### Changes Needed

1. **Add `pnpm run test:e2e` script to `apps/web/package.json`:**

   ```json
   "test:e2e": "playwright test",
   "test:e2e:ui": "playwright test --ui"
   ```

2. **DB seeding step (add before test execution):**

   ```yaml
   - name: Seed E2E database
     working-directory: apps/api
     run: python -m app.scripts.seed_e2e_data
     env:
       DATABASE_URL: postgresql+asyncpg://mergenix:mergenix@localhost:5432/mergenix_e2e
   ```

3. **Install axe-playwright for accessibility tests:**

   ```yaml
   - name: Install Playwright browsers
     run: pnpm exec playwright install --with-deps chromium
   ```

   (The `axe-playwright` package should be a devDependency in `apps/web/package.json`)

4. **Nightly full-browser run (add as separate workflow):**
   A nightly cron job runs all 5 browser projects (Chromium, Firefox, WebKit, mobile Chrome, mobile Safari). The PR-triggered run uses Chromium only to keep feedback fast.

   ```yaml
   # .github/workflows/rewrite-e2e-nightly.yml
   on:
     schedule:
       - cron: '0 3 * * *' # 3 AM UTC daily
   ```

5. **Sharding for parallel execution (future optimization):**
   When the suite grows beyond ~100 tests, split into shards:
   ```yaml
   strategy:
     matrix:
       shard: [1, 2, 3]
   # ...
   - name: Run Playwright tests
     run: pnpm run test:e2e --shard=${{ matrix.shard }}/3
   ```

---

## 6. Cross-Cutting Concerns

### 6.1. Web Worker Handling Strategy

**Decision: Black-Box Validation (primary) + Route Mocking (targeted)** [Architect, Technologist, Scientist]

- **Primary approach:** Tests interact with the UI exactly as a user would. Upload files, click "Start Analysis," and assert on final rendered results. Use Playwright's auto-retrying `expect` to poll for completion indicators (`expect(page.getByText('Analysis Complete')).toBeVisible()`).
- **Targeted mocking:** For tests that only need to verify the results UI (e.g., scientific spot-checks, tier gating), use `page.route()` to intercept the worker script and serve a mock that immediately posts pre-defined results. This speeds up these tests significantly.
- **Worker lifecycle tests:** Use `page.evaluate` to spy on `postMessage` and listen for worker messages. These live in `performance/worker-lifecycle.spec.ts`.

### 6.2. Flakiness Prevention

| Strategy   | Detail                                                                                          | Source                         |
| :--------- | :---------------------------------------------------------------------------------------------- | :----------------------------- |
| Selectors  | `getByRole`, `getByLabel`, `getByText` first; `data-testid` as fallback only                    | [QA, Code Reviewer, Designer]  |
| Assertions | Playwright web-first assertions only (`expect(locator).toBeVisible()`) with built-in auto-retry | [QA, Code Reviewer]            |
| Auth state | Programmatic login via API + `storageState`; never repeat UI login except in login tests        | [Architect, QA, Code Reviewer] |
| Network    | Mock all external services (Stripe, Google, analytics) via `page.route()`                       | [QA, Business]                 |
| Retries    | `retries: 1` in CI only; 0 locally to catch real issues fast                                    | [QA]                           |
| Timeouts   | 60s test timeout; 10s expect timeout (analysis worker may need time)                            | [Technologist]                 |
| Isolation  | Tests do not depend on each other; each test sets up its own state                              | [QA, Code Reviewer]            |
| Traces     | Capture trace on first retry for debugging flaky tests                                          | [Architect]                    |

### 6.3. Cross-Browser Strategy

- **CI (per-PR):** Chromium only (fast feedback, ~2 min)
- **CI (nightly):** Chromium + Firefox + WebKit + mobile Chrome + mobile Safari
- **Local dev:** Chromium only by default; `--project=firefox` opt-in
- **Rationale:** Most rendering bugs are caught by Chromium + WebKit. Firefox is included for completeness. Mobile viewports catch responsive layout issues. [QA, Designer]

### 6.4. Performance / Memory Considerations

- **Large file tests (190MB+):** Run only in nightly, not per-PR (too slow) [Technologist]
- **Memory leak detection:** Runs 10 cycles in nightly only [Technologist]
- **Performance budgets:** Tracked but not blocking in CI initially; become blocking after baselines are established [Technologist]
- **Worker termination:** Verify workers are cleaned up on navigation to prevent memory leaks [Technologist]

### 6.5. Test Data Management

- **Golden DNA files:** Checked into repo at `e2e/fixtures/dna-files/`. Small (~10KB each) with known genotypes [Scientist]
- **Large test files:** Generated programmatically in test setup, not checked into repo [Technologist]
- **Database:** Seeded once before suite; tests that mutate data clean up in `afterEach` [QA]
- **Credentials:** Test user passwords stored in env vars in CI, in `.env.e2e.local` locally (gitignored) [Security]

---

## 7. Estimated Totals

| Metric                   | Count |
| :----------------------- | :---- |
| **Total test files**     | 23    |
| **Total test scenarios** | 153   |
| **P0 scenarios**         | 25    |
| **P1 scenarios**         | 94    |
| **P2 scenarios**         | 34    |

### Breakdown by Category

| Category              | Files  | Scenarios |
| :-------------------- | :----- | :-------- |
| Authentication        | 4      | 25        |
| Core Application      | 4      | 50        |
| Marketing             | 3      | 16        |
| Legal / Compliance    | 3      | 13        |
| Accessibility         | 3      | 22        |
| Performance / Workers | 3      | 14        |
| Security              | 1      | 7         |
| API Contract          | 2      | 6         |
| **Total**             | **23** | **153**   |

---

## 8. Conflicts & Decisions

### 8.1. Directory Location: `apps/web/e2e/` vs `apps/web/tests/e2e/` vs root `e2e/`

- **Architect, QA, Business, Scientist:** `apps/web/e2e/`
- **QA (alt):** root `e2e/`
- **Code Reviewer:** `apps/web/tests/e2e/`

**Decision: `apps/web/e2e/`**
Rationale: E2E tests are frontend-centric (Playwright drives the browser). Placing them inside the web app workspace keeps them colocated. A top-level `e2e/` would work but separates tests from their closest dependency. The `tests/e2e/` nesting adds unnecessary depth. The existing CI workflow already references `apps/web/` paths.

### 8.2. POM File Naming: `.pom.ts` vs `.ts` in `poms/` directory

- **Code Reviewer:** `.pom.ts` suffix
- **Architect:** `.ts` in `poms/` directory

**Decision: `.ts` in `poms/` directory**
Rationale: The directory name already communicates the purpose. The `.pom.ts` suffix is redundant when files live in a `poms/` directory. Simpler imports.

### 8.3. Counseling Feature: Separate spec vs combined in analysis

- **QA:** Proposed `app/counseling.spec.ts`
- **Scientist:** Counseling scenarios in analysis-scientific.spec.ts

**Decision: Merge into `app/analysis-scientific.spec.ts`**
Rationale: Counseling is a tab within the analysis results, not a standalone page. Testing it within the scientific accuracy file keeps related validations together and avoids creating a thin spec file.

### 8.4. Accessibility Test Count: ~111 (Designer) vs included in other specs

- **Designer:** 111 dedicated accessibility tests
- **Code Reviewer:** ~30 total tests including basic a11y

**Decision: Dedicated accessibility directory with ~22 focused tests**
Rationale: Accessibility is important but 111 tests is excessive for initial launch. We consolidate to automated axe scans per key page/mode (most efficient ROI), keyboard navigation for critical flows, and focus trap tests for modals. The axe scans alone cover 80%+ of WCAG issues. Page-by-page heading validation and ARIA checks can be folded into axe rules. Expand post-launch based on audit findings.

### 8.5. Scientific Spot-Checks: In main analysis spec vs separate file

- **Scientist:** Detailed scientific validation in its own file
- **QA, Architect:** Fold into `analysis.spec.ts`

**Decision: Separate `analysis-scientific.spec.ts`**
Rationale: Scientific accuracy tests have fundamentally different concerns (specific rsID values, genotype outcomes) than UX workflow tests. Separating them makes it clear what broke: the workflow or the science. The Scientist reviewer provided 12 specific spot-check scenarios that deserve their own file.

### 8.6. Performance Tests: Blocking CI vs informational

- **Technologist:** Performance budgets as CI gates
- **Architect, Code Reviewer:** Focus on functional correctness first

**Decision: Informational initially, blocking after baselines established**
Rationale: Performance budgets need stable baselines before they can be gates. Start with data collection and manual review. After 2-4 weeks of data, set thresholds and make them blocking. Memory leak and large file tests run nightly only.

### 8.7. Security Output Truncation

The Security reviewer's output was truncated mid-plan. The test scenarios in `security/auth-security.spec.ts` were reconstructed from:

- Partial security output (auth/session management section headers)
- Overlapping security concerns raised by other reviewers (QA, Business, Legal)
- Standard OWASP Top 10 E2E checks appropriate for this application type

**Recommendation:** Before implementation, re-run the Security reviewer to get the complete plan and validate that no critical security scenarios were missed.

### 8.8. Ethics Output Truncation

The Ethics reviewer's output was a summary only (the detailed plan was written to a file that couldn't be read back). Ethical concerns were reconstructed from:

- The summary mentioning: ethical safeguards, result framing, population bias, emotional harm prevention, eugenics guardrails, counseling referrals, GINA awareness
- Overlapping concerns from Scientist (disclaimers, counseling triage) and Legal (GINA, data handling)

**Recommendation:** Before implementation, re-run the Ethics reviewer and incorporate any unique scenarios not already covered by Scientist + Legal.
