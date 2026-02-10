# Mergenix - Project Rules

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

### Team-First Rule:
- **Default to TeamCreate** for any real work (phases, multi-file changes, code+tests)
- Fire-and-forget Task agents only for single quick lookups or one-off Gemini calls
- Teams let teammates coordinate, message when blocked, and keep context out of conductor

### Red flags (you're doing it wrong):
- Reading a .ts/.tsx/.py file → delegate to explore agent
- Writing code in Edit/Write → delegate to executor agent
- Tool output >100 lines → should have delegated
- Running vitest/pytest directly → delegate to agent
- Spawning 3+ fire-and-forget Tasks instead of a team → use TeamCreate
- Context filling fast → doing too much yourself

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
After code changes are complete and pass quality gates, Claude MUST review the changes from **all 7 perspectives** below. Each reviewer grades A+ through F. **Iterate and fix until every reviewer gives A+.**

### Review Panel
| Reviewer | Focus Area |
|----------|------------|
| **Architect** | System design, modularity, separation of concerns, scalability, design patterns, dependency management |
| **Frontend Designer** | UI/UX quality, accessibility, responsiveness, visual consistency, user flow, Streamlit best practices |
| **Businessman** | Business value, user impact, cost efficiency, market fit, feature completeness, ROI |
| **Technologist** | Tech stack choices, performance, modern practices, maintainability, code elegance, DRY/SOLID |
| **Security** | OWASP top 10, input validation, auth/authz, secrets management, data privacy, injection vectors |
| **QA** | Test coverage, edge cases, error handling, regression risk, test quality, logging/observability |
| **Code Reviewer** | Readability, naming, documentation, consistency with codebase style, PR size, commit hygiene |

### Process
1. After code is written and linting/tests pass, run the review panel
2. Present findings in a table:
   ```
   | Reviewer | Grade | Key Findings | Action Items |
   |----------|-------|--------------|--------------|
   | Architect | B+ | Tight coupling in X | Extract interface |
   ```
3. Fix all action items from any reviewer grading below A+
4. Re-review **only the perspectives that were below A+**
5. Repeat until **all 7 reviewers grade A+**
6. Only then proceed to create the PR

### Rules
- **No skipping reviewers** — all 7 must weigh in on every PR
- **No hand-waving grades** — each grade must cite specific evidence from the code
- **Not-applicable is not A+** — if a perspective doesn't apply (e.g., Frontend Designer for a pure backend change), grade it A+ with "N/A — no frontend impact" but still explicitly state it
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
That file contains the **A/B/C/D task tier matrix** and **7 delegation rules** that determine when and how to use Gemini. Do not delegate without consulting it first.

### Gemini Delegation Plan (MANDATORY — before every execution)
**ALWAYS print a Gemini Delegation Table to the user BEFORE starting any execution.** The table must show:
- Which tasks go to Gemini (with tier rating A/B/C/D)
- Which tasks stay on Claude
- Rationale for each assignment
- **User must see and approve this table before any work begins**
- Never skip this step. Never start execution without showing the table first.

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
