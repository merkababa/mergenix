# Technologist Review -- Phase 0 Scaffolding

## Overall Grade: B+

A solid scaffolding with well-considered choices for Turborepo, Next.js 15, FastAPI, and async PostgreSQL. The CI/CD pipelines are comprehensive and the Docker setup follows security best practices. However, several issues ranging from critical (package name mismatches that will break builds) to moderate (Tailwind v3/v4 config conflict, missing lockfile, missing configs) need attention before Phase 1 can proceed cleanly.

---

## Config Validation Results

| Config File                                 | Valid?  | Issues                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `turbo.json`                                | YES     | `lint` and `typecheck` tasks have `dependsOn: ["^build"]` but produce no `outputs` -- not cached. Minor: consider adding `outputs` or documenting as intentional.                                                                                                                                           |
| `pnpm-workspace.yaml`                       | YES     | Clean, no issues.                                                                                                                                                                                                                                                                                           |
| `package.json` (root)                       | PARTIAL | `packageManager: "pnpm@10.4.1"` but `engines.pnpm: ">=9.0.0"` -- inconsistent. pnpm 10 changed `node-linker` defaults. Also: `clean` script uses `rm -rf` which fails on Windows (contributor `kukiz` uses Windows).                                                                                        |
| `eslint.config.js`                          | PARTIAL | Uses `@next/eslint-plugin-next` directly in flat config -- this plugin's `.configs.recommended.rules` may not be a flat object in all versions. The web app also lists `eslint-config-next` in devDependencies (legacy config format), creating a conflict with the root flat config. See CRITICAL-3 below. |
| `.prettierrc`                               | YES     | Clean config. `endOfLine: "lf"` is good for consistency but will reformat files on Windows; fine if `.gitattributes` enforces LF.                                                                                                                                                                           |
| `.env.rewrite.example`                      | YES     | Comprehensive. All required vars listed with placeholder values.                                                                                                                                                                                                                                            |
| `apps/web/package.json`                     | PARTIAL | Missing workspace dependencies on `@mergenix/shared-types` and `@mergenix/genetics-engine`. See CRITICAL-1.                                                                                                                                                                                                 |
| `apps/web/next.config.ts`                   | FAIL    | `transpilePackages` references `@mergenix/shared` and `@mergenix/genetics` but these package names do not exist. The actual packages are `@mergenix/shared-types` and `@mergenix/genetics-engine`. See CRITICAL-1.                                                                                          |
| `apps/web/tsconfig.json`                    | YES     | Strict mode enabled, bundler resolution, Next.js plugin -- all correct.                                                                                                                                                                                                                                     |
| `apps/web/tailwind.config.ts`               | PARTIAL | Uses `tailwindcss` v3-style `Config` type and JS config format (`content`, `theme.extend`, `plugins`), but `devDependencies` has `tailwindcss: "^4.0.0"`. Tailwind v4 uses CSS-based config, not `tailwind.config.ts`. See CRITICAL-2.                                                                      |
| `apps/web/postcss.config.js`                | PARTIAL | Uses `@tailwindcss/postcss` (v4 plugin) which is correct for Tailwind v4, but conflicts with the v3-style JS config file.                                                                                                                                                                                   |
| `apps/web/.gitignore`                       | YES     | Covers all needed patterns.                                                                                                                                                                                                                                                                                 |
| `apps/api/pyproject.toml`                   | YES     | Excellent ruff config with security linting (bandit). `build-backend` uses legacy `setuptools.backends._legacy:_Backend` -- uncommon but functional. Consider switching to standard `setuptools.build_meta`.                                                                                                |
| `apps/api/requirements.txt`                 | YES     | Pinned versions, all compatible with pyproject.toml ranges.                                                                                                                                                                                                                                                 |
| `apps/api/Dockerfile`                       | YES     | Multi-stage, non-root user, health check -- production-ready. Minor: health check uses `httpx` Python import which adds ~2s overhead per check. Consider `curl` or `wget`.                                                                                                                                  |
| `apps/api/alembic.ini`                      | YES     | Well configured with ruff post-write hook.                                                                                                                                                                                                                                                                  |
| `apps/api/alembic/env.py`                   | YES     | Async migration support correctly implemented. Uses `asyncio.run()` for online mode.                                                                                                                                                                                                                        |
| `apps/api/.gitignore`                       | YES     | Covers all Python artifacts.                                                                                                                                                                                                                                                                                |
| `packages/genetics-engine/package.json`     | YES     | Workspace deps on sister packages, vitest configured.                                                                                                                                                                                                                                                       |
| `packages/genetics-engine/vitest.config.ts` | YES     | v8 coverage provider, node environment -- correct.                                                                                                                                                                                                                                                          |
| `packages/genetics-data/package.json`       | PARTIAL | `copy-data` script uses `bash` which breaks on Windows.                                                                                                                                                                                                                                                     |
| `packages/shared-types/package.json`        | PARTIAL | Missing `devDependencies` for TypeScript. No `typecheck` script.                                                                                                                                                                                                                                            |
| `packages/genetics-engine/tsconfig.json`    | YES     | Strict, composite, all good.                                                                                                                                                                                                                                                                                |
| `packages/genetics-data/tsconfig.json`      | YES     | Matches the project pattern.                                                                                                                                                                                                                                                                                |
| `packages/shared-types/tsconfig.json`       | YES     | Strict, composite.                                                                                                                                                                                                                                                                                          |

---

## CI/CD Assessment

| Workflow                   | Jobs                                                                                                                          | Issues                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rewrite-ci.yml`           | 7 jobs (frontend-lint, frontend-typecheck, frontend-test, frontend-build, backend-lint, backend-typecheck, backend-test, e2e) | **CRITICAL-4**: `pnpm install --frozen-lockfile` will fail because no `pnpm-lock.yaml` exists yet. Must run `pnpm install` locally first and commit the lockfile. **MEDIUM**: Backend mypy runs with `--ignore-missing-imports` which weakens type safety. **MEDIUM**: Vitest coverage path `apps/web/coverage/` assumes coverage writes there, but no vitest config exists in `apps/web/` to configure this path.               |
| `rewrite-deploy.yml`       | 5 jobs (preflight, deploy-frontend, deploy-backend, run-migrations, health-check)                                             | **HIGH**: `pnpm add -g vercel@latest` uses global install in pnpm which may not work as expected (pnpm globals go to a different location). Use `npx vercel` or `pnpm dlx vercel`. **MEDIUM**: Railway CLI installed via `npm` (not `pnpm`) -- inconsistent package manager usage. **LOW**: `cancel-in-progress: false` is correct for deploy but `health-check` has complex `if` condition that could skip on partial failures. |
| `rewrite-clinvar-sync.yml` | 2 jobs (check-freshness, create-update-pr)                                                                                    | **LOW**: Inline Python in YAML is functional but fragile for maintenance. **LOW**: `pip install httpx pandas` installs pandas but the script never uses it. Remove unused dependency.                                                                                                                                                                                                                                            |

### CI Caching Analysis

| Cache Target    | Configured? | Notes                                                                                                       |
| --------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| pnpm store      | YES         | Via `actions/setup-node` `cache: 'pnpm'` -- correct, but requires `pnpm-lock.yaml` to exist.                |
| pip packages    | YES         | Via `actions/setup-python` `cache: 'pip'` with `cache-dependency-path`.                                     |
| Next.js build   | YES         | `actions/cache@v4` with proper key strategy including content hash.                                         |
| Turborepo cache | NO          | Turborepo remote cache not configured. Local `.turbo` cache not persisted between CI runs. Consider adding. |

---

## Dependency Compatibility

### Frontend (Node.js)

| Package               | Version                                 | Compatible? | Notes                                                                                                                                                          |
| --------------------- | --------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| next                  | ^15.1.0                                 | YES         | Latest stable.                                                                                                                                                 |
| react / react-dom     | ^19.0.0                                 | YES         | Required for Next.js 15.                                                                                                                                       |
| typescript            | ^5.7.0                                  | YES         | Compatible with all tooling.                                                                                                                                   |
| tailwindcss           | ^4.0.0                                  | CONFLICT    | v4 uses CSS-based config, but project has v3-style `tailwind.config.ts`. See CRITICAL-2.                                                                       |
| @tailwindcss/postcss  | ^4.0.0                                  | PARTIAL     | Correct PostCSS plugin for v4, but the JS config won't be read by v4.                                                                                          |
| autoprefixer          | ^10.4.20                                | UNNECESSARY | Tailwind v4 includes autoprefixer built-in. This is a no-op dependency.                                                                                        |
| vitest                | ^2.1.8 (web) / ^3.0.0 (genetics-engine) | MISMATCH    | Web uses vitest 2.x, genetics-engine uses vitest 3.x. Different major versions in the same monorepo may cause issues with shared test utilities.               |
| eslint                | ^9.18.0 (root) / ^9.17.0 (web)          | PARTIAL     | Different minor ranges, but compatible. Hoisting should resolve to one version. However, `eslint-config-next` (legacy format) conflicts with root flat config. |
| framer-motion         | ^11.15.0                                | YES         | Compatible with React 19.                                                                                                                                      |
| recharts              | ^2.15.0                                 | YES         | Compatible.                                                                                                                                                    |
| zustand               | ^5.0.3                                  | YES         | Compatible with React 19.                                                                                                                                      |
| @tanstack/react-query | ^5.62.0                                 | YES         | Compatible.                                                                                                                                                    |

### Backend (Python)

| Package             | Version   | Compatible? | Notes                                                                                                                                                |
| ------------------- | --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| fastapi             | >=0.115.0 | YES         | Latest stable line.                                                                                                                                  |
| sqlalchemy[asyncio] | >=2.0.36  | YES         | Async support mature.                                                                                                                                |
| asyncpg             | >=0.30.0  | YES         | Compatible with SQLAlchemy async.                                                                                                                    |
| alembic             | >=1.14.0  | YES         | Supports async via env.py config.                                                                                                                    |
| python-jose         | >=3.3.0   | WARN        | `python-jose` is unmaintained (last release 2022). Consider `PyJWT` or `joserfc` as alternatives. Not blocking but a security concern for long-term. |
| passlib             | >=1.7.4   | WARN        | `passlib` is unmaintained (last release 2022). Works but consider `bcrypt` directly or `argon2-cffi`.                                                |
| pydantic            | >=2.10.0  | YES         | v2, compatible with FastAPI 0.115+.                                                                                                                  |
| pydantic-settings   | >=2.6.0   | YES         | Correct for Pydantic v2.                                                                                                                             |
| structlog           | >=24.4.0  | YES         | Latest.                                                                                                                                              |
| sentry-sdk          | >=2.19.0  | YES         | FastAPI integration included.                                                                                                                        |

---

## Docker Assessment

### API Dockerfile (`apps/api/Dockerfile`)

| Aspect            | Status  | Notes                                                                                                                                                                      |
| ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-stage build | GOOD    | Builder + runtime stages, virtualenv copied.                                                                                                                               |
| Non-root user     | GOOD    | `mergenix` user (UID 1001) created and used.                                                                                                                               |
| Health check      | GOOD    | Uses Python httpx to hit `/health`. Consider lighter-weight check (curl/wget) to reduce overhead.                                                                          |
| Base image        | GOOD    | `python:3.12-slim` -- minimal attack surface.                                                                                                                              |
| `.dockerignore`   | MISSING | No `.dockerignore` in `apps/api/`. The `COPY . .` will include `.git`, `__pycache__`, `.venv`, tests, etc. This bloats the image and is a security risk (may copy `.env`). |
| Build cache       | GOOD    | Requirements copied and installed before source code -- layer caching works correctly.                                                                                     |
| CMD               | GOOD    | Uses `--factory` flag for app factory pattern.                                                                                                                             |

### Web Dockerfile (`apps/web/Dockerfile`)

| Aspect | Status | Notes                                                                                                                                                              |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exists | NO     | `docker-compose.rewrite.yml` references `./apps/web/Dockerfile` but this file does not exist. **Docker Compose `web` service will fail to build.** See CRITICAL-5. |

### Docker Compose (`docker-compose.rewrite.yml`)

| Aspect               | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version              | WARN   | `version: '3.8'` is deprecated in modern Docker Compose. Remove the line entirely (Compose V2 ignores it).                                                                                                                                                                                                                                                                                                                                                                                    |
| Service connectivity | GOOD   | API connects to `db:5432` via Docker network, frontend hits `localhost:8000` (but see note below).                                                                                                                                                                                                                                                                                                                                                                                            |
| Port conflicts       | GOOD   | 3000 (web), 8000 (api), 5432 (db) -- no conflicts.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Volume persistence   | GOOD   | Named volume `pgdata` for PostgreSQL data.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Health checks        | GOOD   | Both API and DB have health checks; web depends on API health.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Web -> API URL       | ISSUE  | Web service sets `NEXT_PUBLIC_API_URL=http://localhost:8000`. In Docker networking, the web container cannot reach `localhost:8000` (that's the API running in a different container). For SSR/server-side API calls, this should be `http://api:8000`. The `NEXT_PUBLIC_*` prefix makes it a client-side env var though, so browser requests to `localhost:8000` will work (port is mapped to host). This is an SSR footgun -- any server-side `fetch()` to the API will fail inside Docker. |
| Missing env vars     | WARN   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SENTRY_DSN` not set in compose.                                                                                                                                                                                                                                                                                                                                                                                                         |

---

## Security Assessment

| Area                  | Status  | Notes                                                                                                                                                                                      |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Secrets in code       | GOOD    | No hardcoded secrets. All sensitive values via env vars.                                                                                                                                   |
| `.gitignore` coverage | PARTIAL | Root `.gitignore` covers `.env` and `.env.local` but NOT `.env.rewrite` or `.env.development.local`. The web `.gitignore` covers `.env*.local` and `.env`. API `.gitignore` covers `.env`. |
| Docker non-root       | GOOD    | API Dockerfile uses non-root user.                                                                                                                                                         |
| Dependency security   | WARN    | `python-jose` and `passlib` are unmaintained. Bandit linting is enabled via ruff which is good.                                                                                            |
| CORS config           | GOOD    | Production mode restricts to `frontend_url` only; dev mode allows localhost origins.                                                                                                       |
| JWT config            | GOOD    | Warning logged if `JWT_SECRET` is empty.                                                                                                                                                   |
| Alembic hardcoded URL | MINOR   | `alembic.ini` has a placeholder `sqlalchemy.url` but `env.py` overrides it from settings. Acceptable but the placeholder contains a username/password pattern.                             |
| CI secrets            | GOOD    | Uses `${{ secrets.* }}` for all sensitive values in deployment workflow.                                                                                                                   |

---

## Critical Issues (Must Fix Before Phase 1)

### CRITICAL-1: Package Name Mismatch in `next.config.ts`

**File:** `C:/Users/t2tec/Tortit/apps/web/next.config.ts` line 4

`transpilePackages` references `@mergenix/shared` and `@mergenix/genetics`, but the actual package names are:

- `@mergenix/shared-types` (not `@mergenix/shared`)
- `@mergenix/genetics-engine` (not `@mergenix/genetics`)

Additionally, `apps/web/package.json` has **no dependency on either package**. The packages are not listed in `dependencies` or `devDependencies`. This means:

1. The transpile config is dead code (references non-existent packages)
2. When code actually imports from these packages, it will fail at build time

**Fix:** Update `next.config.ts` to use correct names and add workspace dependencies to `apps/web/package.json`:

```json
"dependencies": {
  "@mergenix/shared-types": "workspace:*",
  "@mergenix/genetics-engine": "workspace:*",
  ...
}
```

### CRITICAL-2: Tailwind v3 Config With v4 Dependencies

**Files:** `apps/web/tailwind.config.ts`, `apps/web/postcss.config.js`, `apps/web/package.json`

The project installs Tailwind CSS v4 (`"tailwindcss": "^4.0.0"`) and the v4 PostCSS plugin (`"@tailwindcss/postcss": "^4.0.0"`), but the `tailwind.config.ts` file uses the Tailwind v3 API:

- `import type { Config } from "tailwindcss"` -- v4 does not export this type the same way
- `content`, `darkMode`, `theme.extend`, `plugins` -- v4 uses CSS-based configuration (`@theme` directive in a CSS file)
- `autoprefixer` is listed as a dependency but v4 includes it built-in

This will cause build failures. The entire Tailwind configuration needs to either:

- **Option A:** Downgrade to Tailwind v3 (`"tailwindcss": "^3.4.0"`) and use the standard `tailwindcss` PostCSS plugin (not `@tailwindcss/postcss`)
- **Option B:** Migrate the config to Tailwind v4 CSS-based format (move all theme values into a CSS `@theme` block in `globals.css`)

**Recommendation:** Option A is simpler for Phase 0. Option B is the future path but requires restructuring all the theme config.

### CRITICAL-3: ESLint Config Conflict

**Files:** `eslint.config.js` (root), `apps/web/package.json`

The root uses ESLint flat config (`eslint.config.js`) with `@next/eslint-plugin-next`, but `apps/web/package.json` lists `eslint-config-next` as a devDependency. `eslint-config-next` is the legacy `.eslintrc`-format config and is incompatible with flat config. Additionally, the web app's `lint` script runs `next lint` which looks for `eslint-config-next` and may create its own `.eslintrc` file, conflicting with the root flat config.

**Fix:** Either:

- Remove `eslint-config-next` from `apps/web/package.json` and use `next lint --no-eslintrc` (or remove `next lint` and use `eslint` directly)
- Or keep `eslint-config-next` but convert it to flat config format via `compat` utilities from `@eslint/eslintrc`

### CRITICAL-4: Missing `pnpm-lock.yaml`

Every CI job runs `pnpm install --frozen-lockfile` which **requires** `pnpm-lock.yaml` to exist in the repo. This file is missing. Every CI job will fail immediately.

**Fix:** Run `pnpm install` locally and commit `pnpm-lock.yaml` to the repository.

### CRITICAL-5: Missing Web Dockerfile

**File:** `docker-compose.rewrite.yml` line 6-7

The `web` service in Docker Compose references `./apps/web/Dockerfile` but this file does not exist. Running `docker compose -f docker-compose.rewrite.yml up` will fail with a build error.

**Fix:** Create a Next.js production Dockerfile at `apps/web/Dockerfile` (multi-stage with `pnpm` and standalone output).

---

## High-Priority Issues

### HIGH-1: Missing `.dockerignore` for API

**File:** `apps/api/` (missing file)

The `COPY . .` in the Dockerfile will copy everything including `.env`, `__pycache__`, `.venv`, `.git`, test files, etc. This:

- Bloats the Docker image
- May leak secrets if `.env` exists locally
- Increases build time by invalidating cache

**Fix:** Add `apps/api/.dockerignore`:

```
.env
.venv/
venv/
__pycache__/
*.pyc
.pytest_cache/
.mypy_cache/
.ruff_cache/
tests/
htmlcov/
.coverage
*.egg-info/
```

### HIGH-2: Docker Compose Web -> API SSR Issue

**File:** `docker-compose.rewrite.yml` line 11

`NEXT_PUBLIC_API_URL=http://localhost:8000` works for client-side browser requests but NOT for Next.js server-side rendering (SSR) or Server Components. Inside the Docker container, `localhost:8000` refers to the web container itself, not the API container.

**Fix:** Add a separate non-public env var for server-side API calls:

```yaml
environment:
  - NEXT_PUBLIC_API_URL=http://localhost:8000 # Browser requests (mapped port)
  - API_URL=http://api:8000 # Server-side requests (Docker network)
```

### HIGH-3: `shared-types` Package Missing TypeScript Dev Dependency

**File:** `packages/shared-types/package.json`

This package has no `devDependencies` and no scripts. It needs:

- `typescript` as a devDependency (for `tsc --noEmit`)
- A `typecheck` script (for Turborepo pipeline consistency)

### HIGH-4: Vitest Version Mismatch

**Files:** `apps/web/package.json` (vitest ^2.1.8), `packages/genetics-engine/package.json` (vitest ^3.0.0)

Different major versions of vitest in the same monorepo can cause issues with shared test utilities, config inheritance, and pnpm hoisting. Align on one major version (recommend v3.x for all).

---

## Medium-Priority Issues

### MEDIUM-1: Missing Vitest Config for Web App

The web app has `"test": "vitest"` in scripts but no `vitest.config.ts` file. Vitest will run with defaults, which may not include React Testing Library setup, jsdom environment, or proper path aliases matching the tsconfig `@/*` paths.

### MEDIUM-2: Missing Playwright Config

The web app has `"test:e2e": "playwright test"` in scripts but no `playwright.config.ts` file. Playwright needs configuration for base URL, browser selection, and test directory.

### MEDIUM-3: Windows Compatibility

Several scripts use Unix-only commands:

- Root `package.json`: `rm -rf node_modules` (use `rimraf` or `turbo clean`)
- `packages/genetics-data/package.json`: `bash copy-data.sh`

The contributor `kukiz` works on Windows. These scripts will fail.

### MEDIUM-4: `pyproject.toml` Build Backend

**File:** `apps/api/pyproject.toml` line 86

`build-backend = "setuptools.backends._legacy:_Backend"` is an internal/undocumented path. Use the standard `"setuptools.build_meta"`.

### MEDIUM-5: Railway Deploy Uses `npm` Instead of `pnpm`

**File:** `.github/workflows/rewrite-deploy.yml` line 131

`npm install -g @railway/cli` -- the project standardizes on pnpm but this step uses npm. Use `pnpm add -g @railway/cli` or `npx @railway/cli` for consistency.

### MEDIUM-6: Vercel Global Install

**File:** `.github/workflows/rewrite-deploy.yml` line 97

`pnpm add -g vercel@latest` -- pnpm global installs go to `~/.local/share/pnpm` which may not be in PATH in CI. Use `pnpm dlx vercel` or `npx vercel` instead.

### MEDIUM-7: Unused `pandas` in ClinVar Workflow

**File:** `.github/workflows/rewrite-clinvar-sync.yml` line 106

`pip install httpx pandas` -- pandas is installed but never used in the sync script. Remove to speed up the CI job.

---

## Low-Priority Issues

| Issue                                          | File                           | Notes                                                                                                                                                  |
| ---------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Docker Compose `version` deprecated            | `docker-compose.rewrite.yml:1` | `version: '3.8'` is ignored by Compose V2. Remove the line.                                                                                            |
| Turborepo remote cache not configured          | `turbo.json`                   | No `remoteCache` config. Optional but recommended for CI speedup.                                                                                      |
| `lint` and `typecheck` tasks have no `outputs` | `turbo.json`                   | These tasks produce no artifacts, so they're always re-run. Consider adding empty outputs or caching stdout.                                           |
| Alembic placeholder URL                        | `alembic.ini:25`               | Contains `postgresql+asyncpg://mergenix:mergenix@localhost:5432/mergenix`. While overridden by env.py, it's slightly misleading.                       |
| `.prettierrc` `endOfLine: "lf"`                | `.prettierrc`                  | Good for consistency but ensure `.gitattributes` with `* text=auto eol=lf` exists to avoid CRLF issues on Windows.                                     |
| Root `.gitignore` missing Node patterns        | `.gitignore`                   | No `node_modules/`, `.next/`, `.turbo/`, `dist/` patterns in root gitignore. The web `.gitignore` covers these locally but root should too for safety. |

---

## Recommendations

### Immediate (Block Phase 1)

1. Fix package name mismatch in `next.config.ts` and add workspace deps to `apps/web/package.json`
2. Resolve Tailwind v3/v4 config conflict (recommend downgrade to v3 for now)
3. Fix ESLint config conflict (remove `eslint-config-next` or use compat)
4. Run `pnpm install` and commit `pnpm-lock.yaml`
5. Create `apps/web/Dockerfile` for Docker Compose

### Before First Deploy

6. Add `apps/api/.dockerignore`
7. Add separate `API_URL` env var for Docker SSR
8. Create `vitest.config.ts` for web app (jsdom env, React Testing Library setup)
9. Create `playwright.config.ts` for web app

### Before Phase 2

10. Add TypeScript and scripts to `shared-types` package
11. Align vitest versions across monorepo
12. Replace Unix-specific scripts for Windows compatibility
13. Consider migrating from `python-jose` to `PyJWT` or `joserfc`
14. Add root `.gitignore` entries for Node artifacts
15. Add `.gitattributes` for line ending enforcement

---

## Summary Statistics

| Metric                 | Count |
| ---------------------- | ----- |
| Files reviewed         | 32    |
| Critical issues        | 5     |
| High-priority issues   | 4     |
| Medium-priority issues | 7     |
| Low-priority issues    | 6     |
| Clean configs          | 15    |
| Configs with issues    | 13    |

---

## Verdict: NEEDS CHANGES

Five critical issues must be resolved before Phase 1 can begin. The package name mismatch (CRITICAL-1) and Tailwind version conflict (CRITICAL-2) will cause immediate build failures. The missing lockfile (CRITICAL-4) will fail every CI run. The missing web Dockerfile (CRITICAL-5) breaks Docker Compose. The ESLint conflict (CRITICAL-3) will produce confusing linting behavior.

The architecture and tooling choices are excellent. Once the critical issues are fixed, this is a strong foundation for the rewrite.
