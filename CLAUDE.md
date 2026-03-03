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
3. **Reviewers** — 2-4 Claude agents from `.claude/agents/*-reviewer.md`, selected by trigger rules
4. **Gemini** (optional) — cheap pre-check via `review-personas/`, not required

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


## Code Review (MANDATORY before every PR)
Run `/review-pipeline` for the optimized 3-layer review (Static → Self-Review → External Review).

### 3-Layer Pipeline
1. **Layer 0 — Static Analysis:** lint + typecheck + tests + build (automated gate)
2. **Layer 1 — Self-Review:** Conductor verifies changed files against `docs/EXECUTOR_CHECKLIST.md`. Catches ~80% of review findings mechanically. Fix violations before spawning reviewers.
3. **Layer 2 — External Review:** 2-4 Claude Opus agents, selected by trigger rules (see below). Max 3 rounds, hard cap. Fix ALL severities (BLOCK+WARN+INFO) in one batch.

### Reviewer Trigger Rules (pick 2-4, NOT more)
| Trigger | Reviewers |
|---------|-----------|
| Default (any PR) | Architect + Code Reviewer |
| New UI screens | + Designer |
| Backend / API / DB | + Security |
| Genetics / health data | + Scientist |
| Privacy / compliance | + Security + Legal |
| User-facing copy / pricing | + Business |
| Genetic result display | + Ethics |

### Pass Threshold
- **A grade (no BLOCKs) = pass.** Not A+ — just A.
- Re-review ONLY reviewers that had BLOCKs. Once a reviewer reaches A, they're done.
- After Round 3: hard stop, fix remaining BLOCKs, no further review.

### Final Cleanup Rule (after all reviewers reach A)
Triage every remaining WARN/INFO by ownership:
1. **From code this PR changed** → fix in this PR, no exceptions. We touched it, we own it.
2. **From pre-existing code** → do NOT fix. Create tech debt items in `PROGRESS.md` or GitHub issues.
3. **Requiring architectural decisions** → present options to user, defer if needed.
Use `git diff origin/main...HEAD -- <file>` to determine if flagged lines are ours or pre-existing.

### Executor Checklist (Shift Left)
Every executor prompt MUST include: `Read and follow ALL items in docs/EXECUTOR_CHECKLIST.md before committing.`
Reviewers skip checklist-covered items unless violated. This eliminates 80% of review round-trips.

### Resources
- Executor checklist: `docs/EXECUTOR_CHECKLIST.md` (living document — update after each review cycle)
- Claude review agents: `.claude/agents/*-reviewer.md`
- Gemini review personas (optional): `review-personas/{role}.md`
- Development gotchas: `docs/DEVELOPMENT_GOTCHAS.md`

## Model Selection Policy

Choose the right model tier for each agent type:

| Agent Type | Model | Rationale |
|-----------|-------|-----------|
| **Reviewers** (Layer 2) | **Opus** | Deep reasoning, cross-file analysis, security judgment |
| **Executors** (features, contextual fixes) | **Sonnet** | Well-specified tasks with explicit instructions |
| **Fix agents** (mechanical — rename, import, typo) | **Haiku** | Simple pattern application, cheapest tier |
| **Exploration/research agents** | **Sonnet** | File reading and summarizing |
| **Planning synthesis** | **Opus** | Architectural decisions require highest capability |
| **Gemini personas** (optional) | gemini-3.1-pro-preview | Separate system, called via CLI |

**Rule**: Default one tier UP if unsure. A wasted minute on mid-tier is cheaper than broken output from cheapest tier that needs re-doing.

## Gemini Delegation
Call via bash CLI — MCP tools are broken on Windows. No rate limit waits needed (API tokens).
```bash
gemini -p "prompt" --model gemini-3.1-pro-preview 2>&1
```
- Always use `run_in_background: true` and append `2>&1`
- For reviews: include FULL source files (not just diffs) — Gemini has 1M context
- Before delegating: read `docs/GEMINI_DELEGATION_GUIDE.md` for the task tier matrix and 8 rules

## Agent Output Logging (MANDATORY)

Agent temp output files (`AppData/Local/Temp/claude/.../*.output`) are wiped to 0 bytes after agent completion. All detailed results only exist in conversation context, which gets compacted. **To prevent data loss:**

### Rules:
1. **After ANY research/analysis agent completes**, immediately save its full result to a persistent log file at `docs/research/agent-logs/{date}-{task-name}/`
2. **Log file naming:** `{agent-category}.md` (e.g., `neurological-brain.md`, `cancer-risk.md`)
3. **What to log:** The FULL agent result (not just a summary). Include all data, tables, findings, references.
4. **When to log:** As SOON as the agent result arrives in conversation — don't wait until "later" because compaction may erase it.
5. **Session log index:** At session end, write a `docs/research/agent-logs/{date}-{task-name}/INDEX.md` listing all agents run, their purpose, and their log file paths.
6. **For code review agents:** Log the full review output, grade, and all issues found.
7. **For executor agents:** Log a summary of files changed, tests written, and any issues encountered.

### Log directory structure:
```
docs/research/agent-logs/
  {YYYY-MM-DD}-{task-name}/
    INDEX.md           # Session summary: what agents ran, purpose, results
    {agent-name}.md    # Full agent output per agent
```

### Exception:
- Don't log trivial agents (file lookups, git status checks, single-command agents)
- DO log any agent that produces research, analysis, review results, or significant code changes

## PROGRESS.md
- Pushable directly to `main`
- Update when: starting a task, finishing a task, hitting a blocker
- Always update at END of every session

## Contributors
| Name | Role |
|------|------|
| kukiz | Developer (works from multiple PCs) |
| Claude | AI Assistant (creates PRs, pushes PROGRESS.md directly) |
