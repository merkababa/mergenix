# QA Review -- Phase 0 Scaffolding

**Reviewer:** QA Agent (Claude Opus 4.6)
**Date:** 2026-02-08
**Files Reviewed:** 34 primary files + 28 supporting files (62 total)

---

## Overall Grade: B+

Solid scaffolding with clean architecture, proper type definitions, and good security practices. However, there are several bugs (one critical), price inconsistencies, a missing Dockerfile, and some import/type mismatches that must be fixed before Phase 1 implementation begins.

---

## Bugs Found

| # | Severity | File(s) | Issue | Fix |
|---|----------|---------|-------|-----|
| 1 | **CRITICAL** | `apps/web/app/page.tsx` (PRICING const) vs `packages/shared-types/src/payments.ts` vs `Source/tier_config.py` | **Pricing mismatch across 3 sources.** The homepage shows Free=$0, Premium=$29, Pro=$79. The shared-types payments.ts shows Premium=$12.90, Pro=$29.90. The legacy tier_config.py shows Premium=$12.90, Pro=$29.90. The homepage prices are completely wrong -- they do not match either the shared-types or the legacy source of truth. This will cause customer confusion and potential legal issues. | Update `apps/web/app/page.tsx` PRICING to match `payments.ts`: Premium=$12.90, Pro=$29.90. Or if the prices have intentionally changed, update `payments.ts` and `tier_config.py` to match. |
| 2 | **HIGH** | `docker-compose.rewrite.yml` line 6 | **Missing Dockerfile.** The `web` service references `./apps/web/Dockerfile` but this file does not exist. Running `docker compose up` will fail with a build error. | Create `apps/web/Dockerfile` with a multi-stage Next.js build (node:20-alpine builder + runner). |
| 3 | **HIGH** | `packages/shared-types/src/genetics.ts` line 12 vs `apps/web/lib/stores/analysis-store.ts` line 4 | **FileFormat type mismatch.** `shared-types` defines `FileFormat` as `'23andme' | 'ancestrydna' | 'myheritage' | 'vcf' | 'unknown'` (all lowercase). The analysis store defines `GeneticFileFormat` as `"23andMe" | "AncestryDNA" | "MyHeritage" | "VCF" | "unknown"` (mixed case). The `file-dropzone.tsx` imports from the store and uses the mixed-case version. These two types are incompatible -- the store cannot produce values that satisfy the shared-types type, and vice versa. | Align the casing. Either update `shared-types` to use the mixed-case format ("23andMe", "AncestryDNA", etc.) or update the store/dropzone to use lowercase. The mixed-case version is more user-facing-friendly. |
| 4 | **HIGH** | `apps/web/app/page.tsx` line 118 vs `apps/web/components/ui/button.tsx` | **Invalid Button variant prop.** The homepage passes `variant="violet"` for the Premium tier CTA button. This variant exists in `button.tsx`, so it is valid. However, `variant="primary"` is passed for the Pro tier button (line 471), which maps to the green gradient -- but Pro should likely be styled differently from the main CTA. More importantly, the `variant` prop on line 471 receives `plan.variant` typed as the literal union from the PRICING const. The const uses `variant: "outline" | "violet" | "primary"` via `as const`, but the `buttonVariants` CVA only defines: `primary`, `secondary`, `ghost`, `destructive`, `outline`, `violet`. All three are valid. No actual bug here on re-examination. | N/A -- false alarm on variants. All used variants exist. |
| 5 | **HIGH** | `apps/web/app/page.tsx` line 19 | **Badge component imported but never used.** `Badge` is imported from `@/components/ui/badge` but never rendered anywhere in the homepage component. Dead import. | Remove the unused `Badge` import. |
| 6 | **HIGH** | `apps/api/app/routers/auth.py` line 87 | **`create_access_token` called with `user.id` but type is `uuid.UUID`.** In `_token_response`, `create_access_token(user.id, user.tier)` is called. `auth_service.create_access_token` expects `uuid.UUID` for `user_id`, and `user.id` is `Mapped[uuid.UUID]`. SQLAlchemy `Mapped[uuid.UUID]` resolves to `uuid.UUID` at runtime, so this is actually correct. | N/A -- correct behavior. |
| 7 | **MEDIUM** | `apps/api/app/routers/auth.py` line 276-278 | **2FA login leaks user_id.** When TOTP is required, the error response includes `"user_id": str(user.id)` in the detail. This exposes the internal user UUID to the client before full authentication is complete. An attacker who knows an email + password can extract the user's UUID. | Remove `user_id` from the error detail. Instead, issue a short-lived "2FA challenge" JWT token containing the user_id claim, which the client submits with the TOTP code. |
| 8 | **MEDIUM** | `apps/api/app/database.py` line 30-32 | **SQLite-incompatible pool settings.** The engine is configured with `pool_size=5`, `max_overflow=10`, `pool_pre_ping=True`, `pool_recycle=3600`. These are PostgreSQL-specific pool options. Tests use `sqlite+aiosqlite:///:memory:` which does not support connection pooling the same way. The test engine in `conftest.py` creates its own engine (correctly, without these params), so tests will work, but if anyone tries to use the main database module with SQLite (e.g., for local dev without Postgres), it will produce warnings or errors. | Add a conditional: only apply pool settings if the URL starts with `postgresql`. |
| 9 | **MEDIUM** | `apps/api/Dockerfile` line 41 | **Dockerfile HEALTHCHECK uses httpx at runtime.** The healthcheck command runs `python -c "import httpx; ..."`. While httpx is in requirements.txt, this is fragile -- the Python one-liner has no error handling for import failures. Also, the same pattern in `docker-compose.rewrite.yml` line 34 uses the same approach. A simpler `curl` or `wget` would be more robust since `python:3.12-slim` may not have httpx installed if the venv setup fails. | Use `CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]` which uses stdlib only, or install `curl` in the Dockerfile. |
| 10 | **MEDIUM** | `apps/api/app/routers/auth.py` line 210 | **Dummy bcrypt hash for timing-safe comparison is malformed.** The dummy hash `"$2b$12$dummyhashvalue00000000000000000000000000000000000000"` is not a valid bcrypt hash (bcrypt hashes are exactly 60 chars with a specific base64 alphabet). `passlib.verify` will raise an exception or return False immediately, which partially defeats the constant-time comparison purpose. | Generate a valid dummy hash at module load time: `_DUMMY_HASH = hash_password("dummy_timing_check")` and use that instead. |
| 11 | **MEDIUM** | `apps/web/app/globals.css` lines 366-370 | **Universal transition on all elements.** The CSS applies `transition-property: background-color, border-color, color; transition-duration: 0.3s;` to ALL elements (`*`). This can cause performance issues (forces the browser to track transitions on every element), interfere with framer-motion animations, and cause unintended visual artifacts on scroll/interaction. | Scope the transition to specific selectors (e.g., `.glass`, `.glass-card`, buttons, links) rather than `*`. |
| 12 | **MEDIUM** | `packages/genetics-engine/src/worker.ts` line 32 | **Worker imports `GenotypeMap`, `Tier`, `Population` from `./types` but never uses them.** The import line imports types that are referenced in the TODO comments but not in actual code. TypeScript with `isolatedModules: true` (tsconfig.json line 13) will erase `import type` at build time, but the imports here use a regular `import type` which is fine. However, `GenotypeMap`, `Tier`, and `Population` are imported but no code references them -- dead imports for now. | This is acceptable for scaffolding since the TODOs indicate future use. Add a `// eslint-disable-next-line @typescript-eslint/no-unused-vars` or move to implementation phase. |
| 13 | **MEDIUM** | `apps/api/requirements.txt` vs `apps/api/pyproject.toml` | **pytest-cov missing from requirements.** The CI workflow (`rewrite-ci.yml` line 226) runs `pytest ... --cov=app --cov-report=...` which requires `pytest-cov`. It is installed inline in CI (`pip install pytest pytest-asyncio pytest-cov ...`), but `pytest-cov` is not listed in `pyproject.toml` `[project.optional-dependencies].dev`. Developers running tests locally with `pip install -e ".[dev]"` will get a missing dependency error when using `--cov`. | Add `"pytest-cov>=5.0.0"` to the `[project.optional-dependencies].dev` list in `pyproject.toml`. |
| 14 | **LOW** | `apps/web/components/genetics/file-dropzone.tsx` line 5 | **Unused import: `Dna`.** The `Dna` icon is imported from lucide-react but never used in the component. | Remove `Dna` from the import. |
| 15 | **LOW** | `apps/web/components/genetics/file-dropzone.tsx` line 5 | **Unused import: `Upload`.** The `Upload` icon is imported from lucide-react but never used in the component. | Remove `Upload` from the import. |
| 16 | **LOW** | `turbo.json` | **`lint` depends on `^build` but frontend lint does not need packages to be built.** ESLint can run on TypeScript source files directly. Making lint depend on `^build` means lint jobs wait for package builds, slowing CI. | Change `lint` to `"dependsOn": []` or remove the key entirely. Only `typecheck` truly needs `^build` for `.d.ts` resolution. |
| 17 | **LOW** | `apps/web/app/page.tsx` line 9 | **Unused import: `Sparkles`.** Actually `Sparkles` IS used on line 463 for feature list checkmarks. False alarm. | N/A. |

---

## Inconsistencies Found

| # | Files | Issue |
|---|-------|-------|
| 1 | `apps/web/app/page.tsx` vs `packages/shared-types/src/payments.ts` vs `Source/tier_config.py` | **MAJOR: Three different price points for the same tiers.** Homepage: $0/$29/$79. shared-types: $0/$12.90/$29.90. tier_config.py: $0/$12.90/$29.90. The homepage prices are 2x-3x higher than the source of truth. |
| 2 | `packages/shared-types/src/genetics.ts` vs `apps/web/lib/stores/analysis-store.ts` | **FileFormat casing mismatch.** shared-types uses lowercase (`'23andme'`), the store uses mixed case (`"23andMe"`). These are two different string literal types that won't be assignable to each other. |
| 3 | `packages/shared-types/src/genetics.ts` vs `apps/web/lib/stores/analysis-store.ts` | **CarrierResult type divergence.** shared-types defines `CarrierResult` with `parentAStatus: CarrierStatus`, `riskLevel: RiskLevel`, `offspringRisk: OffspringRisk`. The store defines a local `CarrierResult` with `parentAStatus: string`, `severity: "high" | "moderate" | "low"` (note: "moderate" vs "medium"), `offspringRisk: number`, `inheritanceModel: string`. The store should import from shared-types, not redefine. |
| 4 | `packages/shared-types/src/genetics.ts` vs `apps/web/lib/stores/analysis-store.ts` | **Severity value mismatch.** shared-types uses `"high" | "medium" | "low"` for severity. The store uses `"high" | "moderate" | "low"`. The word "moderate" vs "medium" will cause filtering bugs -- `highRiskCount` in the store filters on `r.severity === "high"` which works, but downstream code comparing against shared-types severity values will fail on "moderate" vs "medium". |
| 5 | `packages/shared-types/src/genetics.ts` vs `apps/web/lib/stores/analysis-store.ts` | **AnalysisStep names differ from AnalysisStage.** The store defines steps with hyphens (`"carrier-analysis"`, `"trait-prediction"`), while `genetics-engine/src/types.ts` defines stages with underscores (`'carrier_analysis'`, `'trait_prediction'`). The worker sends progress with underscore-style names. The store will need a mapping layer. |
| 6 | `packages/shared-types/src/payments.ts` vs `apps/web/app/page.tsx` | **Feature descriptions differ.** The homepage Free tier says "Top 50 disease screening" but shared-types/tier_config.py says "Analyze top 25 genetic diseases". The free disease limit is 25, not 50. |
| 7 | `packages/shared-types/src/payments.ts` vs `apps/web/app/page.tsx` | **Homepage Free tier claims "Single file format support" but the actual tier_config.py has no format restriction.** All file formats are supported at all tiers -- format support is not a tier-gated feature. |
| 8 | `apps/web/app/page.tsx` vs `packages/shared-types/src/payments.ts` | **Homepage Premium says "All 2,715 disease screening" but shared-types says Premium only gets 500 diseases.** The homepage Premium features list claims the full disease panel but the actual limit is 500. Only Pro gets 2,715. |
| 9 | `apps/api/app/config.py` vs `apps/api/app/database.py` | **Module-level `get_settings()` call in database.py.** `database.py` calls `settings = get_settings()` at module import time (line 24). This means the settings are frozen at import time and the `@lru_cache` is invoked before tests can override environment variables. The test `conftest.py` works around this by creating its own engine, but any code that imports `database.engine` will use the default `database_url`. |
| 10 | `docker-compose.rewrite.yml` | **Version key is deprecated.** `version: '3.8'` is deprecated in modern Docker Compose (v2). Docker Compose v2 ignores it and prints a warning. | Remove the `version` key. |

---

## Missing Pieces

- **Missing `apps/web/Dockerfile`**: Referenced by `docker-compose.rewrite.yml` but does not exist. The web service cannot be built without it.
- **Missing `apps/web/next.config.js` or `next.config.ts`**: No Next.js configuration file was found. Without it, features like image optimization, redirects, environment variable exposure (`NEXT_PUBLIC_*`), and Turbopack configuration cannot be customized.
- **Missing `apps/web/.env.example`**: No example environment file for the frontend. Developers will not know what `NEXT_PUBLIC_*` variables are needed.
- **Missing `apps/api/.env.example`**: No example environment file for the API. The config.py has many settings but no `.env.example` documenting them.
- **Missing `eslint.config.js`**: Referenced in `rewrite-ci.yml` paths filter (line 13: `'eslint.config.js'`) but no ESLint flat config file was found at the root. `pnpm run lint` will use `next lint` which has its own config via `eslint-config-next`, but the root-level ESLint config is missing.
- **Missing `.prettierrc`**: Referenced in `rewrite-ci.yml` paths filter (line 14: `'.prettierrc'`) but no Prettier config file was found. `pnpm run format:check` may use defaults, but the team should have explicit formatting rules.
- **Missing `postcss.config.js` or `postcss.config.mjs`**: Tailwind CSS v4 with `@tailwindcss/postcss` requires a PostCSS config file. Without it, `@import "tailwindcss"` in globals.css will not be processed.
- **Missing `packages/genetics-data/tsconfig.json` content verification**: While the file exists, the genetics-data package imports JSON files (`import ... from './carrier-panel.json'`), which requires `resolveJsonModule: true` and `esModuleInterop: true` in its tsconfig.
- **Missing `packages/shared-types/tsconfig.json`**: The shared-types package has no tsconfig.json. It relies on being consumed by other packages' TypeScript configs.
- **Missing Alembic `env.py` async configuration**: The alembic.ini uses `postgresql+asyncpg://` URL but the standard Alembic env.py template is synchronous. The env.py needs to use `run_async` from alembic for async engine support.
- **No `@mergenix/shared-types` or `@mergenix/genetics-data` dependency in `apps/web/package.json`**: The web app's package.json does not list workspace dependencies on the shared packages. While the web app currently imports types from local paths (`@/lib/stores`), once it needs to import from shared-types or genetics-data, it will fail without these workspace dependencies.
- **Missing backup codes storage**: The 2FA setup in `auth.py` generates backup codes (line 768-769) but never stores them in the database. The generated codes are returned to the user once and then lost. There is no model for backup codes, so account recovery with backup codes will not work.

---

## Test Coverage Assessment

### What Is Tested (Good)
- Registration (success, duplicate email, weak password): 3 tests
- Login (success, wrong password, nonexistent user): 3 tests
- Token refresh with rotation: 1 test
- Profile retrieval (authenticated and unauthenticated): 2 tests
- Password change (success and wrong current password): 2 tests
- 2FA setup and invalid code verification: 2 tests
- Password reset flow (anti-enumeration and invalid token): 2 tests
- **Total: 15 tests** covering core auth flows

### What Is NOT Tested (Gaps)
- **Payment endpoints**: Zero tests for `/payments/checkout`, `/payments/webhook`, `/payments/history`, `/payments/subscription`
- **ClinVar endpoints**: Zero tests for the ClinVar sync router
- **Health check endpoint**: Zero tests for `/health`
- **Tier authorization**: No tests for `require_tier()` dependency -- critical for gating paid features
- **Google OAuth flow**: No tests for the OAuth redirect or callback endpoints
- **Account lockout**: No test for the 5-attempt lockout mechanism
- **Email verification flow**: Only tests the invalid token case, not the happy path
- **2FA login flow**: No test for the 2FA challenge during login
- **Rate limiting**: No tests verifying rate limit enforcement
- **Token expiration**: No tests for expired tokens being rejected
- **Frontend (Vitest)**: Zero frontend test files found -- no component tests at all

### Coverage Verdict
The test suite covers the auth happy path adequately but has significant gaps in payment processing, tier gating, OAuth, and edge cases. No frontend tests exist. For Phase 0 scaffolding this is acceptable, but these gaps must be tracked for Phase 1.

---

## Security Assessment

### Good Practices
- Passwords hashed with bcrypt via passlib
- JWT tokens with proper `type` claim differentiation (access vs refresh)
- Refresh token rotation (old token deleted on refresh)
- SHA-256 hashing of stored verification/reset tokens
- Rate limiting on login (5/min), registration (3/min), forgot-password (3/min)
- Account lockout after 5 failed login attempts (30-minute lockout)
- Anti-enumeration on registration (generic error) and password reset (always 200)
- Timing-safe dummy password check for non-existent users (intent is correct, implementation needs fix)
- CORS restricted to frontend URL in production
- Non-root Docker user
- Sentry DSN and secrets loaded from environment variables
- Proper `WWW-Authenticate` headers on 401 responses

### Concerns
- **2FA login leaks user_id in error response** (Bug #7 above)
- **Dummy bcrypt hash is malformed** (Bug #10 above) -- partially defeats timing attack protection
- **Backup codes not persisted** -- 2FA recovery is impossible
- **TOTP secret stored in plaintext** in the `users` table. Should be encrypted at rest.
- **No CSRF protection** on state parameter for Google OAuth -- the `state` is generated and returned to the client but never stored server-side for verification on callback
- **No email verification enforcement** -- users can log in without verifying their email. The login endpoint does not check `user.email_verified`.
- **`allow_headers=["*"]`** in CORS config -- should be restricted to specific headers in production

---

## Accessibility Assessment

### Good
- `aria-label` on navbar logo link and hamburger button
- `aria-expanded` on mobile menu toggle
- `role="button"` and `tabIndex={0}` on file dropzone
- Keyboard handler (`onKeyDown` Enter/Space) on dropzone
- `aria-hidden="true"` on hidden file input
- `role="alert"` on error messages
- `focus-visible` outline styling in globals.css
- `prefers-reduced-motion` media query disabling animations
- `lang="en"` on HTML element

### Missing
- SVG gauge in `prs-gauge.tsx` has `aria-hidden="true"` but the adjacent text does not have a proper `aria-label` summarizing the gauge value for screen readers
- No skip-to-content link in the layout
- Color contrast for `--text-dim` (#7c8db5) against `--bg-deep` (#050810) may fail WCAG AA (estimated ~3.5:1, need 4.5:1)

---

## Summary Table

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| Bugs | 15 (after removing false alarms) | 1 | 3 | 6 | 3 |
| Inconsistencies | 10 | - | - | - | - |
| Missing Pieces | 12 | - | - | - | - |
| Security Concerns | 7 | - | - | - | - |
| Accessibility Gaps | 3 | - | - | - | - |

---

## Verdict: **NEEDS CHANGES**

### Must Fix Before Phase 1 (Blockers)

1. **Fix pricing mismatch** -- the homepage shows $29/$79 but the source of truth is $12.90/$29.90. This is either a deliberate change that needs to be propagated everywhere, or a homepage error. Either way, all three sources must agree.
2. **Create `apps/web/Dockerfile`** -- docker-compose references it and it does not exist.
3. **Align FileFormat type casing** between `shared-types` and the analysis store/dropzone.
4. **Fix homepage feature claims** -- Free tier says "50 diseases" (should be 25), Premium says "all 2,715 diseases" (should be 500).
5. **Fix the 2FA user_id leak** in the login error response.

### Should Fix (Important but Non-Blocking)

6. Fix the malformed dummy bcrypt hash for timing-safe comparison.
7. Add PostCSS config for Tailwind CSS v4 processing.
8. Add Next.js config file (`next.config.ts`).
9. Add `.env.example` files for both frontend and API.
10. Store 2FA backup codes in the database.
11. Enforce email verification before login.
12. Add `pytest-cov` to pyproject.toml dev dependencies.
13. Remove unused imports (`Badge`, `Dna`, `Upload`).
14. Scope the universal CSS transition to specific selectors.

### Can Defer to Phase 1

15. Frontend component tests.
16. Payment endpoint tests.
17. TOTP secret encryption at rest.
18. OAuth state parameter server-side verification.
19. Skip-to-content accessibility link.
20. WCAG AA color contrast audit.
