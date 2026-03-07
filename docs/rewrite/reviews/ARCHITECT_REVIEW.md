# Architect Review -- Phase 0 Scaffolding

## Overall Grade: A-

This is an impressive Phase 0 scaffolding that demonstrates strong architectural thinking and deep domain knowledge. The monorepo structure is sound, the backend follows production-grade patterns, the type system is comprehensive, and privacy-by-design is baked in from the start. However, there are several issues -- some critical -- that need addressing before merge.

## Dimension Grades

| Dimension             | Grade | Notes                                                                                                |
| --------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| Monorepo Structure    | A-    | Clean boundaries, correct dependency graph; missing workspace deps in web package.json               |
| Frontend Architecture | B+    | Good App Router usage, proper server/client split; pricing data inconsistency with shared-types      |
| Backend Architecture  | A     | Excellent layered design (router->schema->service->model); application factory; dependency injection |
| Type System           | A     | Comprehensive shared types with excellent JSDoc; minor issues with `as unknown as` casts             |
| Security Design       | A     | JWT with refresh rotation, bcrypt, TOTP 2FA, timing-safe comparisons, token hashing, audit logging   |
| Database Schema       | A-    | Good normalization, proper indexes, UUID PKs; missing composite index on sessions                    |
| API Design            | A     | RESTful, consistent error format, proper HTTP codes, rate limiting on sensitive endpoints            |
| Code Quality          | A     | Clean, consistent patterns, well-documented, proper abstractions, DRY                                |
| Scalability           | B+    | Connection pooling configured; rate limiter uses in-memory store (not production-ready)              |
| Privacy Architecture  | A+    | Genetic data is truly client-side only; no accidental server leaks; Web Worker architecture          |

## Critical Issues (must fix before merge)

### 1. Missing workspace dependencies in `apps/web/package.json`

**File:** `C:/Users/t2tec/Tortit/apps/web/package.json`

The `next.config.ts` references `@mergenix/shared` and `@mergenix/genetics` in `transpilePackages`, but these are not listed as dependencies in the web `package.json`. Without explicit workspace dependencies, pnpm will not link these packages and the build will fail.

```typescript
// next.config.ts line 4
transpilePackages: ["@mergenix/shared", "@mergenix/genetics"],
```

But `apps/web/package.json` has zero `@mergenix/*` dependencies. Must add:

```json
"dependencies": {
  "@mergenix/shared-types": "workspace:*",
  "@mergenix/genetics-engine": "workspace:*",
  "@mergenix/genetics-data": "workspace:*"
}
```

Additionally, the `transpilePackages` names (`@mergenix/shared`, `@mergenix/genetics`) do not match the actual package names (`@mergenix/shared-types`, `@mergenix/genetics-engine`). This is a build-breaking mismatch.

### 2. Pricing data inconsistency between frontend and shared-types

**Files:**

- `C:/Users/t2tec/Tortit/apps/web/app/page.tsx` -- Premium: $29, Pro: $79, Free diseases: 50, Free traits: 5
- `C:/Users/t2tec/Tortit/packages/shared-types/src/payments.ts` -- Premium: $12.90, Pro: $29.90, Free diseases: 25, Free traits: 10

The home page pricing section uses hardcoded values that contradict the canonical `PRICING_TIERS` in shared-types (which itself was sourced from `tier_config.py`). This creates a trust problem -- the marketing page shows different prices than the payment system will charge.

The analysis page also references "Top 50 diseases + 5 traits" for the free tier, but shared-types and the legacy codebase define 25 diseases and 10 traits.

### 3. 2FA login flow leaks user_id in error response

**File:** `C:/Users/t2tec/Tortit/apps/api/app/routers/auth.py`, lines 272-279

When 2FA is required, the error response includes `"user_id": str(user.id)` in the HTTP 403 body. This leaks the internal UUID to unauthenticated clients. The 2FA completion flow should use a time-limited, signed intermediate token instead of exposing the raw user ID.

```python
raise HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail={
        "error": "Two-factor authentication required.",
        "code": "2FA_REQUIRED",
        "user_id": str(user.id),  # SECURITY: leaks internal UUID
    },
)
```

### 4. Backup codes are not persisted

**File:** `C:/Users/t2tec/Tortit/apps/api/app/routers/auth.py`, lines 766-769

Backup codes are generated and returned to the user but never stored (hashed) in the database. This means users cannot actually use backup codes to recover their accounts if they lose their authenticator device. The codes must be hashed and stored in a `backup_codes` table or column.

## Warnings (should fix)

### 5. Rate limiter uses in-memory storage

**File:** `C:/Users/t2tec/Tortit/apps/api/app/middleware/rate_limiter.py`, line 18

```python
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/minute"],
    storage_uri="memory://",
)
```

In-memory rate limiting is lost on every restart and does not work across multiple API instances. For production, this should use Redis (`redis://`) or at minimum be configurable via environment variable. This is acceptable for Phase 0 scaffolding but must be addressed before any production deployment.

### 6. `as unknown as` type casts in genetics-data

**File:** `C:/Users/t2tec/Tortit/packages/genetics-data/index.ts`

Seven JSON imports use `as unknown as T` double-cast pattern:

```typescript
export const carrierPanel: CarrierPanelEntry[] = carrierPanelRaw as unknown as CarrierPanelEntry[];
```

This completely bypasses TypeScript's type checking at the data boundary -- the one place where runtime validation matters most. Consider using a Zod schema to validate at least a sample of entries at module load time, or use a build-time validation script.

### 7. OAuth state parameter is not verified on callback

**File:** `C:/Users/t2tec/Tortit/apps/api/app/routers/auth.py`, lines 873-999

The Google OAuth redirect generates a `state` parameter and returns it to the frontend, but the callback endpoint (`/oauth/google/callback`) receives a `state` query parameter and never validates it against the original value. The `state` parameter exists specifically to prevent CSRF attacks on the OAuth flow. It must be stored server-side (e.g., in the session or a short-lived DB record) and verified on callback.

### 8. Generic ValueError handler could mask bugs

**File:** `C:/Users/t2tec/Tortit/apps/api/app/main.py`, lines 133-139

Catching all `ValueError` exceptions and returning 422 is overly broad. Many internal Python operations raise `ValueError` (e.g., `int()`, `uuid.UUID()`, string operations). This could mask genuine bugs as validation errors. Consider defining a custom `ValidationError` class and catching only that.

### 9. User model `selectin` relationship loading

**File:** `C:/Users/t2tec/Tortit/apps/api/app/models/user.py`, lines 69-76

Both `payments` and `sessions` relationships use `lazy="selectin"`, meaning every user query eagerly loads all payments and sessions. For users with many sessions or payments, this causes unnecessary N+1 queries. Use `lazy="noload"` or `lazy="raise"` as default, and `selectinload()` explicitly in queries that need the relationships.

### 10. Docker Compose uses development secrets

**File:** `C:/Users/t2tec/Tortit/docker-compose.rewrite.yml`

Hard-coded `JWT_SECRET: dev-jwt-secret-change-in-production` and `NEXTAUTH_SECRET: dev-secret-change-in-production`. While acceptable for local dev, the compose file should either use `.env` file references or document prominently that these must be changed. The health check also uses `httpx` which may not be installed in the container.

### 11. Missing `@mergenix/shared-types` dependency in `@mergenix/genetics-data`

**File:** `C:/Users/t2tec/Tortit/packages/genetics-data/package.json`

The `types.ts` file in genetics-data does not import from shared-types, but the `index.ts` re-exports types that are consumed by genetics-engine which does depend on shared-types. The dependency graph is: `shared-types <- genetics-data <- genetics-engine`. Currently genetics-data has no dependencies on shared-types, which is correct since it only defines its own data types. However, the `Population` type from shared-types is duplicated as string literals in genetics-data's `EthnicityVariantFrequencies`. If these drift apart, runtime errors will occur silently due to the `as unknown as` casts.

## Recommendations (nice to have)

### 12. Add `tsconfig.json` files to all packages

The shared-types and genetics-data packages lack their own `tsconfig.json` files. While the web app's tsconfig handles transpilation, having per-package tsconfigs enables `pnpm run typecheck` to work independently in each package and ensures correct type resolution in IDEs.

### 13. Consider adding a `@mergenix/config` package

Both the frontend and backend define tier limits independently. A shared configuration package (or at minimum ensuring the frontend always imports from `@mergenix/shared-types/payments`) would create a single source of truth for business rules like pricing and tier limits.

### 14. Add Alembic migration for initial schema

The Alembic environment file is configured, but there are no migration files in `apps/api/alembic/versions/`. An initial migration (`alembic revision --autogenerate -m "initial schema"`) should be committed so that `pnpm db:migrate` works out of the box.

### 15. Genetics engine stubs are well-documented

The parser and other engine stubs have excellent inline documentation describing the porting algorithm from Python. Consider adding a `// PORT STATUS: stub` marker at the top of each file so that Phase 1 implementers can quickly identify remaining work.

### 16. Consider `@tanstack/react-query` for auth state

The analysis store uses Zustand (appropriate for client-side genetic data), but auth state (user profile, tokens) would benefit from React Query's built-in caching, refetch, and error handling patterns rather than another Zustand store.

### 17. Add `engines` field to package.json files

Only the root `package.json` specifies Node/pnpm engine requirements. Adding `"engines"` to `apps/web/package.json` and `apps/api/package.json` ensures contributors use compatible versions.

## What's Excellent

### Privacy-first architecture (A+)

The most impressive aspect of this scaffolding is the uncompromising commitment to client-side genetic analysis. The architecture enforces this at every level:

- The genetics-engine package is designed for Web Workers, not API calls
- The `WorkerRequest`/`WorkerResponse` message types define the worker protocol
- No API endpoint accepts or returns genetic data
- The frontend home page, analysis page, and trust badges all reinforce the privacy model
- The API handles only auth, payments, and ClinVar sync -- never touches genetic data

### Type system depth

The shared-types package is remarkably thorough with 534 lines of genetics types that precisely mirror the Python data structures. Every field has JSDoc documentation, every type union is exhaustive, and the types create a contract that will catch integration bugs at compile time during the TypeScript port.

### Backend security posture

The auth system demonstrates production-grade security awareness:

- Timing-safe password comparison (`verify_password` dummy hash on user-not-found)
- Token hashing before storage (SHA-256 for verification/reset tokens)
- Refresh token rotation with session tracking
- Account lockout after 5 failed attempts
- Rate limiting on authentication endpoints
- Comprehensive audit logging on every security-relevant action
- Anti-enumeration patterns (generic error for duplicate email, constant response for password reset)

### Clean backend layering

The separation of concerns is excellent: routers handle HTTP concerns, schemas validate input/output, services contain business logic, models define persistence. The `DbSession` type alias and `CurrentUser` annotated dependency make route signatures clean and self-documenting.

### CI/CD pipeline

The GitHub Actions workflow is comprehensive: parallel frontend (lint, typecheck, test, build) and backend (lint, typecheck, test) jobs with proper caching, coverage reporting, and E2E tests gated on push to rewrite/main. The job dependencies are correctly modeled (build depends on lint + typecheck).

### Monorepo structure

The Turborepo + pnpm workspace setup is clean. Build task dependencies (`^build`) ensure packages are built in the correct order. The workspace structure cleanly separates apps from packages, and the package naming convention (`@mergenix/*`) is consistent.

## Verdict: NEEDS CHANGES

The scaffolding is strong and demonstrates excellent architectural judgment. However, there are 4 critical issues that must be fixed before merge:

1. **Build-breaking:** `apps/web/package.json` missing workspace dependencies and `next.config.ts` using wrong package names
2. **Data integrity:** Pricing and tier limits inconsistent between home page and shared-types (customers would see wrong prices)
3. **Security:** 2FA flow leaks internal user UUID to unauthenticated clients
4. **Security:** Backup codes generated but never persisted (feature is broken)

Fixing these 4 issues would bring this to merge-ready status. The warnings (items 5-11) should be tracked as Phase 1 follow-ups.

| Issue # | Severity | Fix Effort | Blocking? |
| ------- | -------- | ---------- | --------- |
| 1       | CRITICAL | 5 min      | Yes       |
| 2       | CRITICAL | 15 min     | Yes       |
| 3       | CRITICAL | 30 min     | Yes       |
| 4       | CRITICAL | 45 min     | Yes       |
| 5       | HIGH     | 10 min     | No        |
| 6       | MEDIUM   | 30 min     | No        |
| 7       | HIGH     | 30 min     | No        |
| 8       | MEDIUM   | 15 min     | No        |
| 9       | MEDIUM   | 5 min      | No        |
| 10      | LOW      | 5 min      | No        |
| 11      | LOW      | 10 min     | No        |
