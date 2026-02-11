# Mergenix — Project Rules

## Project Overview
Mergenix is a genetic offspring analysis platform (repo name: Tortit). V3 rewrite is the active codebase.
- **Frontend:** Next.js 15 + React 19 + Tailwind CSS + Zustand (`apps/web/`)
- **Backend:** FastAPI + SQLAlchemy + Alembic (`apps/api/`)
- **Genetics Engine:** TypeScript, runs in Web Workers (`packages/genetics-engine/`)
- **Shared packages:** `packages/shared-types/`, `packages/genetics-data/`
- **Monorepo:** pnpm 10 + Turborepo (all commands run from repo root via `turbo`)
- **Legacy:** `Source/`, `pages/`, `app.py` are old Streamlit code — do not modify, planned for removal

## Conductor-Only Protocol
You are a CONDUCTOR. Your context window is sacred. Long sessions = compaction = lost memory.

### NEVER do directly:
- Write/edit code files (.ts, .tsx, .py, .css, .json) — delegate to executor agents
- Read large source files (>50 lines) — delegate to explore agents
- Run tests/builds — delegate to agents
- Paste code blocks in responses — describe what changed + file path

### ALWAYS do:
- Orchestrate agents — spawn, assign, track, summarize
- Summarize agent output in 2-3 lines — never paste full results
- Batch work into agents — one agent with 5 steps beats 5 tool calls
- Use memory files for decisions/patterns — don't rely on context
- Background long tasks (Gemini reviews, test runs, builds)

### You MAY directly edit:
- `PROGRESS.md`, `docs/PROJECT_STATUS.md`, `CLAUDE.md`
- Memory files (`~/.claude/projects/*/memory/*.md`)
- Git commands (commit, push, branch, PR creation via `gh`)

### Orchestration Layers:
1. **Conductor (you)** — orchestrator, spawns executors with file ownership
2. **Executor agents** — code writers, each owns specific files/directories
3. **Gemini reviewers** — 10 personas in `review-personas/`, called via bash CLI
4. **Claude reviewers** — 10 agents in `.claude/agents/*-reviewer.md`

### Execution Rules:
- Each executor gets strict file ownership — partition by directory/module
- 6+ issues to fix → executor team (TeamCreate, one per area); 1-5 → single executor
- Use fire-and-forget Task agents for independent work
- No separate Dev Team Leader agent — Conductor spawns executors directly

### Planning (before starting any phase):
- Spawn separate planning agents per reviewer perspective
- Conductor autonomously selects reviewers using phase-type defaults in `/review-pipeline` — better safe than sorry (include when in doubt)
- Ask as many clarifying questions as needed — never guess during planning

## Session Start Protocol (every session, every PC)
1. `git pull origin main`
2. `gh pr list --state open` — review/merge open PRs before branching
3. Read `PROGRESS.md` and `docs/PROJECT_STATUS.md` for current state
4. Present status summary — never ask "where did we leave off?"
5. Claim task in PROGRESS.md before starting work

## Session End Protocol
1. Update `PROGRESS.md` with what was done, status, next steps
2. Update `docs/PROJECT_STATUS.md` if bugs fixed, features added, or issues changed
3. Push both to `main`

## Git Workflow
- **Never push code to `main`** — only PROGRESS.md and CLAUDE.md
- Feature branches: `feature/`, `fix/`, `refactor/`, `docs/`, `test/`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Squash merge; delete branch after merge
- Rebase frequently: `git pull origin main --rebase`
- PR descriptions: follow the format established in PRs #31-#38

## Quality Gates (before every commit)
```bash
pnpm lint          # ESLint via turbo
pnpm typecheck     # tsc --noEmit via turbo
pnpm test          # Vitest via turbo
pnpm build         # Next.js build via turbo
# Python backend (from repo root):
pnpm db:migrate    # alembic upgrade head
cd apps/api && ruff check . && pytest tests/ -v
```

### Pre-existing TypeScript Issues (suppress, not blocking)
- `apps/web/lib/api/client.ts:157` — type comparison issue (`"HEAD"` vs method union)
- `apps/web/lib/data/demo-results.ts:268` — type literal mismatch (inheritance model union)

## Code Review (MANDATORY before every PR)
Run `/review-pipeline` for the full three-layer review process (Static → Gemini → Claude).

**10 Reviewers:** Architect, QA, Scientist, Technologist, Business, Designer, Security Analyst, Code Reviewer, Legal+Privacy, Ethics/Bioethics — all must reach A+.

**Resources:**
- Gemini personas: `review-personas/*.md`
- Claude agents: `.claude/agents/*-reviewer.md`
- Calibration log: `docs/gemini-calibration.md`

## Gemini Delegation
Call via bash CLI — MCP tools are broken on Windows. No rate limit waits needed (API tokens).
```bash
gemini -p "prompt" --model gemini-3-pro-preview 2>&1
```
- Always use `run_in_background: true` and append `2>&1`
- For reviews: include FULL source files (not just diffs) — Gemini has 1M context
- Before delegating: read `docs/GEMINI_DELEGATION_GUIDE.md` for the task tier matrix and 8 rules

## PROGRESS.md
- Pushable directly to `main`
- Update when: starting a task, finishing a task, hitting a blocker
- Always update at END of every session

## Contributors
| Name | Role |
|------|------|
| kukiz | Developer (works from multiple PCs) |
| Claude | AI Assistant (creates PRs, pushes PROGRESS.md directly) |
