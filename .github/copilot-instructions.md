# Copilot Instructions — Mergenix (Tortit)

> **This file overrides the review section of CLAUDE.md for GitHub Copilot agents.** Claude Code agents should continue using `.claude/commands/review-pipeline.md` and `.claude/agents/*-reviewer.md`.

## Project Overview

Mergenix is a genetic offspring analysis platform. Monorepo managed by Turborepo + pnpm.

## Tech Stack

- **Frontend:** Next.js 15 + React 19 + Tailwind CSS + Zustand (`apps/web/`)
- **Backend:** FastAPI + SQLAlchemy + Alembic (`apps/api/`)
- **Genetics Engine:** TypeScript in Web Workers (`packages/genetics-engine/`)
- **Shared Types:** `packages/shared-types/`
- **Genetics Data:** `packages/genetics-data/` (WHO growth data, variant databases)
- **Package Manager:** pnpm@10.4.1
- **Testing:** Vitest (frontend, pool: forks), Pytest with xdist (backend)
- **Languages:** TypeScript (strict) + Python (type hints required)
- **Linting:** ESLint (frontend), Ruff (backend)

## Layer 0: Static Analysis Gate (MANDATORY before any PR)

All checks must pass before code review begins:

```bash
pnpm lint          # ESLint via turbo
pnpm typecheck     # tsc --noEmit via turbo
pnpm test          # Vitest via turbo (forks pool, parallel)
```

For Python backend changes:
```bash
cd apps/api && ruff check . && py -m pytest tests/ -v -n auto
```

## Key Rules

1. **Legacy code is off-limits:** `Source/`, `pages/`, `app.py` are old Streamlit code. NEVER modify.
2. **TDD workflow:** Write failing tests FIRST, then implement, then refactor.
3. **Testing Trophy:** 80% integration tests, 20% unit tests. Query by accessibility (getByRole, getByText).
4. **Conventional commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
5. **Never push to main:** Feature branches only (feature/, fix/, refactor/).
6. **Executor checklist:** Read and follow ALL items in `docs/EXECUTOR_CHECKLIST.md` before committing.
7. **Zero `any` types** in TypeScript production code.
8. **No console.log/print** in committed code.
9. **Workspace imports** use `@mergenix/` prefix — no relative cross-package imports.

## Review Pipeline

When reviewing code, use the agents in `.github/agents/`. Select relevant reviewers per PR — Tier 1 always runs, Tiers 2-5 based on what changed.

### Orchestration
1. **plan-executor.agent.md** — Executes task plans end-to-end with TDD
2. **review-pipeline.agent.md** — Orchestrates the full 3-layer review

### Tier 1 — Core Reviewers (always run)
3. **architect-reviewer.agent.md** — Architecture, modularity, Turborepo boundaries
4. **code-reviewer.agent.md** — Code quality, DRY/SOLID, style consistency
5. **security-reviewer.agent.md** — OWASP, health data privacy, auth
6. **ux-reviewer.agent.md** — Accessibility, responsive design, genetics data visualization
7. **testing-reviewer.agent.md** — Test coverage, quality, genetics accuracy testing
8. **performance-reviewer.agent.md** — Web Workers, computation optimization, bundle size

### Tier 2 — Infrastructure Reviewers (auth, data, API, state, i18n, error handling)
9. **auth-session-reviewer.agent.md** — FastAPI auth, JWT handling, session management, role-based access
10. **data-integrity-reviewer.agent.md** — SQLAlchemy/Drizzle schema, Alembic migration safety, Zod/Pydantic sync
11. **error-handling-reviewer.agent.md** — Exception handlers, error boundaries, Web Worker errors, user-facing messages
12. **i18n-rtl-reviewer.agent.md** — Hebrew support, RTL layouts, genetic term translations, locale handling
13. **api-contract-reviewer.agent.md** — Pydantic schemas, request/response validation, breaking changes, report format stability
14. **state-management-reviewer.agent.md** — Zustand stores, React Query, Web Worker message passing, cache invalidation

### Tier 3 — Operations Reviewers (infrastructure, DevOps, observability)
15. **offline-network-reviewer.agent.md** — Offline report access, network error handling, retry logic, progressive loading
16. **observability-reviewer.agent.md** — Sentry integration, computation timing, API latency, Web Worker metrics
17. **dependency-reviewer.agent.md** — pnpm workspace health, Python deps, scientific library versions, bundle size, security
18. **ci-cd-reviewer.agent.md** — Turborepo pipeline, test parallelization, Alembic migration order, deployment safety

### Tier 4 — Robustness Reviewers (edge cases, races, regressions, abuse)
19. **edge-case-reviewer.agent.md** — Empty genetic data, boundary percentiles, rare variants, large family trees
20. **race-condition-reviewer.agent.md** — Web Worker vs UI state, concurrent submissions, migration races, stale results
21. **regression-reviewer.agent.md** — Carrier screening -> risk score cascade, parser -> downstream, growth chart -> report
22. **user-abuse-reviewer.agent.md** — Invalid genetic data injection, XSS, unauthorized access, API rate limiting

### Tier 5 — Domain-Specific Reviewers (genetics, medical, reports)
23. **genetics-accuracy-reviewer.agent.md** — Carrier screening algorithms, variant classification, PRS calculation, population frequencies
24. **who-growth-reviewer.agent.md** — WHO growth standard compliance, percentile accuracy, z-score computation, LMS method
25. **web-worker-reviewer.agent.md** — Thread pool management, message passing, timeout handling, memory management, transferables
26. **medical-compliance-reviewer.agent.md** — Medical disclaimers, no diagnostic claims, data retention, audit trail
27. **report-generation-reviewer.agent.md** — PDF/report correctness, chart accuracy, multi-language, print-friendly, accessibility

### Grading

- **A+ (95-100):** Zero issues
- **A (90-94):** No BLOCKs — pass threshold
- **B+ (85-89):** 1-2 BLOCKs
- **B (80-84):** 3-5 BLOCKs
- **C or below:** Major structural issues

Target: 95/A+ with max 5 review rounds.

## Important Directories

```
apps/
  web/          # Next.js 15 frontend
  api/          # FastAPI backend
packages/
  genetics-engine/    # TypeScript genetics computations (Web Workers)
  shared-types/       # Shared TypeScript interfaces
  genetics-data/      # WHO growth data, variant databases
docs/
  EXECUTOR_CHECKLIST.md   # Quality checklist for all executors
Source/           # LEGACY — do not touch
```
