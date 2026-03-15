# AGENTS.md — Mergenix (Tortit)

Key facts for all AI agents working on this codebase.

## Architecture

- **Monorepo:** Turborepo + pnpm@10.4.1 workspaces
- **Frontend:** Next.js 15 App Router + React 19 + Tailwind CSS + Zustand (`apps/web/`)
- **Backend:** FastAPI + SQLAlchemy + Alembic + PostgreSQL (`apps/api/`)
- **Genetics Engine:** TypeScript, runs in browser Web Workers (`packages/genetics-engine/`)
- **Shared Types:** `packages/shared-types/` — cross-workspace TypeScript interfaces
- **Genetics Data:** `packages/genetics-data/` — WHO growth data, variant reference databases

## Critical Rules

1. **Legacy Streamlit code — NEVER touch.** `Source/`, `pages/`, `app.py` are old Streamlit code scheduled for removal. Modifying these files will break the legacy deployment and is strictly forbidden.

2. **Genetics engine runs in Web Workers.** All genetics computations execute in browser Web Workers to avoid blocking the main thread. Thread pool management, message serialization, and memory cleanup are performance-critical.

3. **Dual testing framework.**
   - Frontend + Engine: **Vitest** with `pool: forks` (parallel across all CPU cores). Run: `pnpm test`
   - Backend: **Pytest** with **xdist** (`-n auto` is mandatory for full suite). Run: `cd apps/api && py -m pytest tests/ -v -n auto`
   - NEVER run the backend test suite without `-n auto` — it is 8x slower.

4. **WHO growth data accuracy is critical.** The genetics engine uses WHO Child Growth Standards for percentile calculations. These calculations must match published WHO reference tables. Floating point comparisons must use appropriate epsilon/toBeCloseTo.

5. **Health data regulations apply.** Genetic analysis results are sensitive health data under GDPR Article 9 and potentially HIPAA. All data handling must follow privacy-by-design principles: encryption at rest/transit, user isolation, audit logging, consent tracking.

6. **Workspace imports use `@mergenix/` prefix.** Cross-package imports must use the workspace alias (e.g., `import { Tier } from '@mergenix/shared-types'`). No relative imports across package boundaries.

7. **Testing Trophy + TDD.** Write failing tests FIRST. 80% integration tests (render full pages with realistic fixtures), 20% unit tests (pure functions only). Query by accessibility (getByRole, getByText), never by test IDs unless no semantic alternative.

## Quality Gates

```bash
pnpm lint          # ESLint via turbo
pnpm typecheck     # tsc --noEmit via turbo
pnpm test          # Vitest via turbo
pnpm build         # Next.js production build
# Backend:
cd apps/api && ruff check . && py -m pytest tests/ -v -n auto
```

All gates must pass before code review.

## Executor Checklist

Every agent writing code must read and follow `docs/EXECUTOR_CHECKLIST.md` before committing. This checklist covers accessibility, styling, React patterns, TypeScript types, testing, backend patterns, business naming, and code hygiene.

## Git Workflow

- Never push to `main` — feature branches only (feature/, fix/, refactor/)
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Squash merge, delete branch after merge

## Model Policy
**ALL agents use `claude-opus-4-6`. No exceptions.**

## Reviewer Tiers
| Tier | Count | Reviewers |
|------|-------|-----------|
| Tier 1 — Core Quality | 6 | architect, code, security, ux, testing, performance |
| Tier 2 — Deep Specialization | 6 | auth-session, data-integrity, error-handling, i18n-rtl, api-contract, state-management |
| Tier 3 — Infrastructure | 4 | offline-network, observability, dependency, ci-cd |
| Tier 4 — Adversarial | 4 | edge-case, race-condition, regression, user-abuse |
| Tier 5 — Domain (Tortit) | 5 | genetics-accuracy, who-growth, web-worker, medical-compliance, report-generation |

## Agent Infrastructure

- **Claude Code agents:** `.claude/agents/*-reviewer.md` (11 specialist reviewers)
- **Claude Code commands:** `.claude/commands/review-pipeline.md`, `delegate-to-copilot.md`, `review-copilots-work.md`
- **GitHub Copilot agents:** `.github/agents/*.agent.md` (27 agents: plan-executor, review-pipeline, 25 reviewers across 5 tiers)
- **Copilot instructions:** `.github/copilot-instructions.md`
- **Gemini review personas:** `review-personas/*.md` (optional pre-check)
