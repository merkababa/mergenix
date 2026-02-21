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
- Explore or research the codebase — ALWAYS delegate to `general-purpose` Task agents, never read/grep/glob directly in conductor context
- Run tests/builds — delegate to agents
- Paste code blocks in responses — describe what changed + file path

### ALWAYS do:
- Orchestrate agents — spawn, assign, track, summarize
- Summarize agent output in 2-3 lines — never paste full results
- Batch work into agents — one agent with 5 steps beats 5 tool calls
- Use memory files for decisions/patterns — don't rely on context
- Background long tasks (Gemini reviews, test runs, builds)

### Context Window Protection (MANDATORY):
- **Reviewer agents MUST return concise output** — grade + 5-line evidence summary, NOT full 100-line reviews
- **Run all reviewers as background tasks** — use `run_in_background: true` for Task agents, then read only the grade line from the output file
- **Never accumulate 10+ agent results in conversation** — after each agent completes, extract the grade into a table row and discard the full output
- **Summarize as you go** — don't wait for all reviewers to finish before summarizing; update the grades table after each one
- **Each review round (Gate 1 or Gate 2) should consume <5% of context** — if approaching this, switch to background mode immediately
- A full review pipeline (Gate 1 + Gate 2) should NEVER cause context compaction

### You MAY directly edit:
- `PROGRESS.md`, `docs/PROJECT_STATUS.md`, `CLAUDE.md`
- Memory files (`~/.claude/projects/*/memory/*.md`)
- Git commands (commit, push, branch, PR creation via `gh`)

### Orchestration Layers:
1. **Conductor (you)** — orchestrator, spawns executors with file ownership
2. **Executor agents** — code writers, each owns specific files/directories
3. **Gemini reviewers** — 11 personas in `review-personas/`, called via bash CLI
4. **Claude reviewers** — 11 agents in `.claude/agents/*-reviewer.md`

### Execution Rules:
- Each executor gets strict file ownership — partition by directory/module
- 6+ issues to fix → executor team (TeamCreate, one per area); 1-5 → single executor
- Use fire-and-forget Task agents for independent work
- No separate Dev Team Leader agent — Conductor spawns executors directly

### Before Starting ANY Task (MANDATORY):
1. **Decide delegation** — is this task best for Gemini (simple/repetitive, A-tier) or Claude (complex/architectural, B/C/D-tier)?
2. **If Gemini-tier:** Delegate to Gemini CLI. Do NOT do it yourself.
3. **If Claude-tier:** Execute directly or via Claude agents.
4. **Show delegation plan to user** before executing — table of task → assignee → rationale.

### Planning (before starting any phase):
1. **Gemini perspective gathering (Stage 0):** Fire all 11 Gemini planning personas in parallel (`review-personas/planning-*.md` via `GEMINI_SYSTEM_MD`). No stagger needed — paid API has 150+ RPM. Each persona returns: requirements checklist, risks, suggested approach, dependencies.
2. **Claude synthesis:** Conductor aggregates all 11 Gemini perspectives into a unified plan. Claude makes final architectural decisions (Gemini proposes, Claude decides).
3. **User approval:** Present the plan to the user before execution begins.
- Planning prompt template and context requirements: see `docs/GEMINI_DELEGATION_GUIDE.md` → "Planning with Gemini"
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
pnpm test          # Vitest via turbo (forks pool, parallel)
pnpm build         # Next.js build via turbo
# Python backend (from repo root):
pnpm db:migrate    # alembic upgrade head
cd apps/api && ruff check . && pytest tests/ -v -n auto
```

## Fast Testing Rules (MANDATORY for all agents)

Tests are parallelized. **Every agent MUST follow these rules.**

### Vitest (frontend + engine)
- `pool: 'forks'` is configured — tests run across all CPU cores automatically
- No special flags needed — just `pnpm test` from repo root

### Pytest (backend) — `-n auto` is MANDATORY
- Full suite: `py -m pytest tests/ -v -n auto` — uses all CPU cores via xdist
- **NEVER run `py -m pytest tests/ -v` without `-n auto`** — this is sequential and 8x slower
- `-n auto` is in `addopts` in pyproject.toml, so bare `py -m pytest tests/` already uses it

### Single test file during TDD (Red/Green phases)
- For a single file, DISABLE xdist (overhead > benefit for <20 tests):
  `py -m pytest tests/test_myfile.py -v -o "addopts=-v --tb=short"`
- The `-o "addopts=..."` override removes `-n auto` for that run only
- This is the FASTEST way to run a single test file (~2-5 seconds)

### Agent TDD execution pattern
1. **RED:** Run ONLY your test file: `py -m pytest tests/test_myfile.py -v -o "addopts=-v --tb=short"`
2. **GREEN:** Run ONLY your test file again after implementing
3. **FINAL (once):** Run full suite with xdist: `py -m pytest tests/ -v -n auto`
4. **Ruff:** `ruff check .`
- **NEVER run the full suite more than ONCE per agent**
- **NEVER run full suite during Red/Green phases** — only your test file

## Testing Philosophy — Testing Trophy + TDD

We follow the **Testing Trophy** (Kent C. Dodds): heavy on integration tests, light on unit tests. We practice **TDD** — tests are written FIRST, before implementation.

### TDD Workflow (MANDATORY for all new features)
1. **Red:** Write failing integration tests that describe the desired user behavior
2. **Green:** Implement the minimum code to make tests pass
3. **Refactor:** Clean up while keeping tests green
4. Tests are the acceptance criteria — if the tests pass, the feature is done

### What to Test (Integration > Unit)
- **Integration tests (80%):** Render the full tab/page with realistic fixtures. Assert what the user sees and can interact with. These are the primary tests.
- **Unit tests (20%):** Only for pure functions, utilities, type guards, and complex business logic (e.g., genetics calculations, risk formulas). Never for React components in isolation.
- **Never test:** Implementation details, component names, internal state, specific CSS classes, mock return values, or anything that would break on a refactor without behavior change.

### Testing Rules
- **Query by accessibility:** Use `getByRole`, `getByText`, `getByLabelText` — avoid `getByTestId` unless no semantic alternative exists
- **Test user behavior, not code structure:** "user sees coverage info" not "CoverageMeter renders with aria-valuenow=75"
- **Tests must survive refactors:** If you rename a component, extract a subcomponent, or restructure JSX — tests should NOT need changes unless behavior changed
- **Realistic fixtures:** Use data that resembles real API responses, not minimal stubs
- **One integration test > five unit tests:** A single test that renders `CarrierTab` and asserts the full user flow replaces 5 isolated component tests
- **Agents must follow TDD:** When an executor receives a feature task, it writes tests FIRST. Conductor enforces this by including "write tests first" in every executor prompt.

### Coverage Expectations
- Every new feature/component must have at least one integration test covering the happy path
- Edge cases (empty state, error state, loading state) tested at the integration level
- Pure utility functions get unit tests with boundary values
- No test should assert on implementation details that would break during refactoring

### Pre-existing TypeScript Issues (suppress, not blocking)
- `apps/web/lib/api/client.ts:157` — type comparison issue (`"HEAD"` vs method union)
- `apps/web/lib/data/demo-results.ts:268` — type literal mismatch (inheritance model union)

## Code Review (MANDATORY before every PR)
Run `/review-pipeline` for the full three-layer review process (Static → Gemini → Claude).

**11 Reviewers:** Architect, QA, Scientist, Technologist, Business, Marketing, Designer, Security Analyst, Code Reviewer, Legal+Privacy, Ethics/Bioethics.

**Reviewer Selection:** Only summon reviewers relevant to the task. Conductor decides which reviewers to include based on what changed. Skip reviewers with zero relevance (e.g., Scientist for pure frontend UX changes).

**Pass Threshold:** A reviewer passes when they give **A or A+**. Once a reviewer reaches A or A+, they do NOT need to be re-reviewed in subsequent rounds — they are done. Only re-review reviewers that scored below A.

**Resources:**
- Gemini review personas: `review-personas/{role}.md` (11 files)
- Gemini planning personas: `review-personas/planning-{role}.md` (11 files)
- Claude review agents: `.claude/agents/*-reviewer.md` (11 files)
- Calibration log: `docs/gemini-calibration.md`
- Delegation rules: `docs/GEMINI_DELEGATION_GUIDE.md`

## Model Selection Policy

Choose the right model tier for each agent type:

| Agent Type | Model | Rationale |
|-----------|-------|-----------|
| **Reviewers** (Gate 1 + Gate 2) | **Opus** | Deep reasoning, cross-file analysis, security judgment |
| **Executors** (code fixes, feature implementation) | **Sonnet** | Well-specified tasks with explicit instructions — speed > reasoning depth |
| **Exploration/research agents** | **Sonnet** | File reading and summarizing doesn't need Opus-level reasoning |
| **Planning synthesis** | **Opus** | Architectural decisions require highest capability |
| **Gemini personas** | gemini-3.1-pro-preview | Separate system, called via CLI |

When spawning Task agents, set `model: "sonnet"` for executors and explorers, omit (defaults to Opus) for reviewers and planners.

## Gemini Delegation
Call via bash CLI — MCP tools are broken on Windows. No rate limit waits needed (API tokens).
```bash
gemini -p "prompt" --model gemini-3.1-pro-preview 2>&1
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
