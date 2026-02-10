# Mergenix - Project Rules

## STOP AND CHECK (before EVERY action)
**Read this checklist BEFORE launching any agent, Gemini call, or execution step:**
1. **Delegation table shown?** — If planning/executing, print the Gemini vs Claude delegation table and WAIT for user approval
2. **Full source to Gemini?** — If sending to Gemini for review, include FULL source files (not just diff). Gemini has 1M context — USE IT
3. **6+ issues = TEAM?** — If fixing 6+ issues, use TeamCreate with file-ownership executors. NEVER send 6+ to a single agent
4. **ALL 10 = A+?** — Reviews: iterate until ALL 10 reviewers grade A+ at each gate (Gemini first, then Claude). No exceptions
5. **Consolidated table printed?** — After every review round, print the cross-reviewer issues table to the user before fixing
6. **Am I writing code?** — If yes, STOP. Delegate to an executor agent. You are the conductor.

## Conductor-Only Protocol (ABSOLUTE — NEVER VIOLATE)
**You are a CONDUCTOR, not a performer. Your context window is sacred.**

Long sessions = context compaction = lost memory = hallucination. Protect your context at all costs.

### NEVER do these directly:
- **NEVER write/edit code files** (.ts, .tsx, .py, .js, .css) — delegate to executor agents
- **NEVER read large source files** (>50 lines) — delegate to explore agents
- **NEVER run tests/builds** — delegate to qa-tester or build-fixer agents
- **NEVER paste code blocks in responses** — describe what was done + file path

### ALWAYS do these:
- **Orchestrate agents** — spawn, assign, track, summarize
- **Summarize agent output in 2-3 lines** — never paste full results into your context
- **Batch work into agents** — one agent with 5 steps beats 5 tool calls in your context
- **Use memory files** — write decisions/patterns to memory, don't rely on context
- **Background long tasks** — Gemini reviews, test runs, builds

### You MAY directly edit:
- `PROGRESS.md`, `docs/PROJECT_STATUS.md`, `CLAUDE.md` — status/rules files
- Memory files (`~/.claude/projects/*/memory/*.md`)
- Git commands (commit, push, branch, PR creation via `gh`)

### Orchestration Layers (MANDATORY for all real work):
1. **Conductor (you)** — top-level orchestrator + Dev Team Leader, NEVER writes code, directly spawns executors with file ownership
2. **Executor agents** — actual code writers, each owns specific files/directories
3. **Gemini Review Coordinator** — spawns separate Gemini instances per reviewer role
4. **Claude Opus Reviewers** — separate independent agents per reviewer (Stage 2, after Gemini all A+)

### Execution Rules:
- Conductor directly spawns executor agents with strict file ownership boundaries
- Use TeamCreate when executors need to coordinate/message each other
- Use fire-and-forget Task agents for independent executor work
- **Gemini Review Coordinator spawns separate Gemini instances** — one per reviewer role, with full code context
- **No separate Dev Team Leader agent** — it was tried and failed (can't use TeamCreate, writes code itself, ignores fix requests)

### Planning Team (MANDATORY for phase planning):
- Before starting any phase, spawn **separate planning agents** per perspective (default: all 8 reviewers)
- **Ask user which perspectives to include each time**
- Each agent analyzes the phase from their perspective, then Conductor aggregates into unified plan

### Pre-Flight Checklist (MANDATORY — before EVERY execution phase):
Before spawning ANY agent, STOP and verify:
1. Does each executor have **explicit file ownership**? (no agent touches 2+ directories)
2. Did I **re-read conductor-protocol.md**? (not from memory — actually read the file)
3. Did I include DEVELOPMENT_GOTCHAS.md + checklists in every executor prompt?
4. Am I about to do work I should delegate? (reading code, running tests, writing code)

**If ANY box is unchecked, STOP and fix it.**

### Red flags (you're doing it wrong):
- Reading a .ts/.tsx/.py file → delegate to explore agent
- Writing code in Edit/Write → delegate to executor agent
- Tool output >100 lines → should have delegated
- Running vitest/pytest directly → delegate to agent
- Context filling fast → doing too much yourself
- Combining 10 reviewers into 1 agent → each needs own context
- Sending Gemini only a diff → always include full file contents
- Spawning single agent to fix 6+ issues → use executor team (one per file ownership area)
- **Combining multiple executors into one** → each executor needs strict file ownership
- Dev Team Leader writing code directly → should delegate to executors

---

## Session Start Protocol (MANDATORY — every session, every PC)
1. **ALWAYS run `git pull origin main`** at the start of every session
2. **Check for open PRs** before starting new work: `gh pr list --state open`
   - If there are open PRs, review them first — they may need to be merged before branching
   - This prevents working on a stale `main` branch (critical for multi-PC workflows)
   - If an open PR is yours and approved, merge it before starting new work
3. **Read `PROGRESS.md`** for current status — this tells you exactly where we left off
4. **Read `docs/PROJECT_STATUS.md`** for the full project state, known issues, and next steps
5. **Present a status summary to the user** — show what's done, what's in progress, what's next
   - Never ask the user "where did we leave off?" — the answer is always in PROGRESS.md and PROJECT_STATUS.md
6. Claim your task in PROGRESS.md before starting work

## Git Workflow

### Branching Strategy
- **Never push directly to `main`** (exception: PROGRESS.md updates only)
- Always create feature branches from latest `main`
- Branch naming convention:
  - `feature/short-description` — new features
  - `fix/short-description` — bug fixes
  - `refactor/short-description` — code restructuring
  - `docs/short-description` — documentation only
  - `test/short-description` — test additions/changes

### Commit Messages
Use conventional commits:
- `feat: add login page with OAuth support`
- `fix: resolve VCF parser edge case for multi-allelic sites`
- `refactor: extract carrier analysis into separate module`
- `docs: update README with setup instructions`
- `test: add unit tests for trait prediction engine`
- `chore: update dependencies in requirements.txt`

### Pull Request Workflow
1. Create a PR from your feature branch to `main`
2. Write a clear PR description: what changed and why
3. Request review from the team
4. **Only merge after review approval**
5. Use squash merge to keep `main` history clean
6. Delete the branch after merge

## Conflict Prevention
- **Check PROGRESS.md** before starting any work to see what others are doing
- **Claim your task** by updating PROGRESS.md with your name and "In Progress"
- Keep PRs small and focused — one feature/fix per PR
- If two people need to touch the same file, coordinate first
- Pull and rebase frequently: `git pull origin main --rebase`

## Quality Gates (Before Every Commit)
```bash
# Run linting
ruff check Source/ pages/ tests/ app.py

# Run tests
pytest tests/ -v

# Check for secrets
# Never commit .env, credentials, API keys
```

## Multi-Perspective Code Review (MANDATORY — before every PR)

### Review Panel (10 Reviewers)
| # | Reviewer | Focus Area |
|---|----------|------------|
| 1 | **Architect** | System design, modularity, separation of concerns, scalability, design patterns, type safety |
| 2 | **QA** | Test coverage, edge cases, assertions, error handling, regression risk, logging/observability |
| 3 | **Scientist** | rsID accuracy, genetics correctness, citations, scientific methodology, data integrity |
| 4 | **Technologist** | Performance, React/Next.js patterns, bundle size, memory, async correctness, modern practices |
| 5 | **Business** | Tier gating, conversion funnel, upgrade CTAs, copy quality, naming accuracy, market fit |
| 6 | **Designer** | Accessibility (ARIA), responsive design, heading hierarchy, keyboard navigation, UX flow |
| 7 | **Security Analyst** | OWASP top 10, injection, CSRF, token handling, encoding, secrets, timing attacks |
| 8 | **Code Reviewer** | Readability, naming, DRY/SOLID, style consistency, dead code, import hygiene |
| 9 | **Legal + Privacy** | GDPR, GINA, data retention, consent, right to deletion, cookie consent, age verification, data flow mapping, encryption adequacy, cross-border transfers |
| 10 | **Ethics / Bioethics** | Population bias in genetic data, responsible result framing, emotional harm prevention, informed consent UX, eugenics guardrails, disclaimers |

**Ask user each time which roles to include (default: all 10). Skip only clearly irrelevant roles.**

### Three-Layer Review Process (MANDATORY)

#### Layer 0: Static Analysis Gate (before any LLM review)
Executors MUST pass all static checks before code goes to reviewers:
1. `ruff check` — Python linting (exclude known pre-existing errors)
2. `tsc --noEmit` — TypeScript type checking (exclude `client.ts:157`, `demo-results.ts:268`)
3. All tests passing (`vitest --run` / `pytest`)
4. No build errors
Only code that passes Layer 0 proceeds to Stage 1.

#### Stage 1: Gemini Reviews — ALL 10 MUST BE A+ (ABSOLUTE — NO EXCEPTIONS)
1. Conductor spawns a **Gemini Review Coordinator** team member
2. Coordinator reads changed files and prepares review prompts
3. Coordinator spawns **separate Gemini instances** per reviewer role (one Gemini call = one reviewer)
4. **CRITICAL:** Each Gemini reviewer gets FULL SOURCE FILES + diff (NOT just the diff — Gemini has 1M context, USE IT. Sending only the diff is a RULE VIOLATION.)
5. Coordinator reports grades table to Conductor
6. **Judge/Synthesis agent** deduplicates issues, resolves conflicts, produces final grade table + fix manifest
7. **ALWAYS print Consolidated Issues table to the user** — cross-reviewer deduplication showing: Issue, Flagged By (which reviewers), Severity, Action Item. This is MANDATORY after every review round.
8. Fix issues (6+ issues → Dev Team Leader + executor team; 1-5 → single executor)
9. Re-review only failed roles
10. **HARD GATE: Repeat steps 3-9 until ALL 10 Gemini reviewers grade A+. No exceptions. No "close enough". No moving on with A or A-. ALL 10 = A+.**
10. **Pipeline overlap:** As each Gemini role reaches A+, immediately start the corresponding Claude Opus reviewer (don't wait for all Gemini roles)

#### Stage 2: Claude Opus Independent Reviews — ALL 10 MUST BE A+ (ABSOLUTE — NO EXCEPTIONS)
1. **ONLY after ALL 10 Gemini reviewers are A+** — this is a hard prerequisite, never skip
2. Conductor spawns **separate Claude Opus agents** per reviewer role — ALL 10, no skipping
3. Each agent has its OWN context — fully independent, never combined
4. Agents READ files themselves (they have tool access)
5. All agents run in parallel
6. Each agent grades independently — results are NOT combined into a single review
7. **Judge/Synthesis agent** deduplicates, resolves conflicts, produces final grade table + fix manifest
8. **ALWAYS print Consolidated Issues table to the user** — same format as Stage 1: Issue, Flagged By, Severity, Action Item. MANDATORY after every review round.
9. Fix issues (6+ → Dev Team Leader + executor team; 1-5 → single executor)
10. Re-review only failed roles
11. **HARD GATE: Repeat steps 2-10 until ALL 10 Claude reviewers grade A+. No exceptions. ALL 10 = A+.**
11. **ONLY after both Stage 1 (10/10 A+) AND Stage 2 (10/10 A+) may a PR be created**

### Fix Flow After Reviews
- **6+ issues:** Conductor → Dev Team Leader → executor team with file ownership
- **1-5 issues:** Conductor → single executor agent
- **NEVER spawn a single agent to fix 6+ review issues — always use the team flow**
- After fixes: re-review ONLY the roles that were below A+
- **Feedback loop (MANDATORY):** After each Claude review cycle, record all issues Gemini missed → append to `docs/gemini-calibration.md` → include in next Gemini review prompt

### Phase-Type Reviewer Pre-Selection
Classify each phase/PR by type to pre-select default reviewers (always confirm with user):
- **Frontend-only:** Architect, QA, Technologist, Business, Designer, Code Reviewer (skip Scientist, Security unless auth UI)
- **Backend-only:** Architect, QA, Technologist, Business, Security, Code Reviewer (skip Scientist, Designer)
- **Genetics:** Architect, QA, Scientist, Technologist, Code Reviewer
- **Full-stack / Auth+Payments:** ALL 10 reviewers
- Legal+Privacy and Ethics always included when touching user data or genetic data

### Executor Enhancement
- All executor prompts MUST reference `docs/DEVELOPMENT_GOTCHAS.md` for common pitfalls
- Pre-embed Technologist checklist (asyncio.to_thread, useCallback, React.memo, N+1) and Business checklist (terminology, tier gating, price validation) in every executor prompt
- Gemini reviews can use `scripts/gemini-review.sh` bash script instead of a dedicated Coordinator agent

### Grades Table Format
```
| Reviewer | Gemini R1 | Gemini R2 | Claude Final | Key Fixes |
|----------|-----------|-----------|--------------|-----------|
| Architect | A- | A+ | A+ | Fixed X |
```

### Rules
- **No skipping reviewers** — all selected reviewers must weigh in
- **No hand-waving grades** — each grade must cite specific evidence from the code
- **Not-applicable = A+** with "N/A — no [domain] impact" but still explicitly stated
- **Each reviewer = separate agent** — never combine multiple reviewers in one agent
- This review happens **before** the PR is created, not after

## PROGRESS.md Rules
- This is the **one file** that can be pushed directly to `main` (along with CLAUDE.md)
- Update it when you: start a task, finish a task, or hit a blocker
- Format: who did what, when, current status
- This keeps everyone in sync across computers and sessions
- **ALWAYS update PROGRESS.md at the END of every session** — so the next session on any PC knows exactly where we left off

## File Organization
```
Mergenix/
├── app.py                  # Main Streamlit app
├── pages/                  # Streamlit multipage apps
├── Source/                  # Core Python modules
│   ├── auth/               # Authentication system
│   ├── payments/           # Payment processing
│   ├── parser.py           # Genetic file parsers
│   ├── carrier_analysis.py # Disease carrier analysis
│   ├── trait_prediction.py # Trait prediction engine
│   └── ...
├── data/                   # JSON data files (carrier panel, traits)
├── tests/                  # pytest test suite
├── sample_data/            # Test genetic data files
├── docs/                   # PRDs, research, plans
├── CLAUDE.md               # THIS FILE - project rules
├── PROGRESS.md             # Task tracking (pushable to main)
└── README.md               # Project documentation
```

## Security Rules
- **Never commit** `.env`, API keys, secrets, or credentials
- Use `.env.example` for template (already exists)
- Sensitive config goes in `.streamlit/secrets.toml` (gitignored)
- User data files (`data/users.json`, `data/audit_log.json`) should not contain real user data in git

## Contributors
| Name | Role | Notes |
|------|------|-------|
| kukiz | Developer | Works from work room & living room computers |
| Maayan | Developer / Reviewer | Codes, reviews PRs, uses Claude Code |
| Claude | AI Assistant | Creates PRs for review, pushes PROGRESS.md directly |

## Session End Protocol (MANDATORY — before ending every session)
1. **Update `PROGRESS.md`** with what was done, current status, and next steps
2. **Update `docs/PROJECT_STATUS.md`** if any bugs were fixed, features added, or known issues changed
3. **Push both files to `main`** so the next session on ANY PC starts with full context
4. Never leave the user having to investigate where we left off — the status files must tell the full story

## Gemini Delegation (MANDATORY — all PCs)

### CRITICAL: DO NOT use MCP tools for Gemini
**The MCP tool is BROKEN on Windows.** `mcp__gemini-cli__ask-gemini`, `mcp_g_ask_gemini`, and ANY Gemini MCP tool will fail with ENOENT. **Do NOT attempt to use them. Do NOT suggest installing or configuring them. They do not work.**

### ONLY use Bash to call Gemini (ALWAYS pass `--model gemini-3-pro-preview`)
The default model without `--model` is gemini-2.0-flash (much weaker). Always specify the model explicitly.
```bash
# Simple prompt
gemini -p "Your prompt here" --model gemini-3-pro-preview 2>&1

# Long prompt (via file)
cat <<'EOF' > /tmp/gemini-prompt.txt
Your long prompt here...
EOF
gemini -p "" --model gemini-3-pro-preview < /tmp/gemini-prompt.txt 2>&1

# Use gemini-2.5-flash ONLY for trivial tasks where speed matters more than quality
gemini -p "prompt" --model gemini-2.5-flash 2>&1
```

- **Use `run_in_background: true`** — responses take 10-30s
- **Always append `2>&1`** — CLI prints status to stderr
- **Auth:** API key (`GEMINI_API_KEY` env var) in `~/.bashrc` — CLI auto-detects it (paid tier: 150+ RPM, 1,000+ RPD)
- If key missing: `source ~/.bashrc` to reload
- **NEVER hardcode the API key in any git-tracked file**
- MCP tools for Gemini are BROKEN on Windows — always use Bash
- **NEVER fall back to weaker models** when rate-limited — wait and retry (60s, 120s, 300s)
- Best for: design review, documentation, visual analysis, multi-file review (1M context window)
- NOT for: code editing, codebase search, git ops, running tests (use Claude agents for those)
- **Code delegation rule:** Only delegate code to Gemini if it can do equal or better quality than Claude

### Before delegating, read `docs/GEMINI_DELEGATION_GUIDE.md`
That file contains the **A/B/C/D task tier matrix** and **8 delegation rules** that determine when and how to use Gemini. Do not delegate without consulting it first.

### Gemini Delegation Plan (MANDATORY — before planning AND before executing)
**ALWAYS print a Gemini Delegation Table to the user BEFORE planning any phase AND BEFORE starting any execution.** The table must show:
- Which tasks go to Gemini (with tier rating A/B/C/D)
- Which tasks stay on Claude
- Rationale for each assignment
- **User must see and approve this table before any planning or work begins**
- This applies TWICE: once when planning (to decide delegation), and again before executing (to confirm)
- Never skip this step. Never start planning or execution without showing the table first.

### Consolidated Issues Table (MANDATORY — after every review round)
**ALWAYS print a Consolidated Issues table to the user after every review round (both Gemini and Claude stages).**
- Cross-reviewer deduplication showing: Issue, Flagged By (which reviewers), Severity, Action Item
- Never skip this step. The user must see all issues before fixes begin.

## Claude-Specific Rules
- Always pull before starting work
- **Always check for open PRs** (`gh pr list --state open`) before starting new work
- Always create work on feature branches, never push code to main
- PROGRESS.md and CLAUDE.md can be pushed directly to main
- Always run `ruff check` and `pytest` before committing
- Create small, focused PRs with clear descriptions
- **After completing work, ALWAYS update PROGRESS.md and PROJECT_STATUS.md and push them**
- If unsure about a design decision, ask — don't guess

## PR Summary Format (MANDATORY)
Every PR description MUST include a summary table. Use this format:

```
| Item | Severity | File(s) | Status |
|------|----------|---------|--------|
| Short description of change | CRITICAL/HIGH/MEDIUM/LOW | path/to/file.py | Fixed + N tests |
```

When orchestrating multiple agents, ALWAYS show a final status table to the user:

```
| Task | Agent | Status | Tests Added |
|------|-------|--------|-------------|
| Task description | model tier | Done/Failed | N new |
```

These tables are mandatory — never skip them.
