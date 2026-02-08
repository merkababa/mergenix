# Mergenix - Project Rules

## Session Start Protocol
1. **ALWAYS run `git pull origin main`** at the start of every session
2. **Check for open PRs** before starting new work: `gh pr list --state open`
   - If there are open PRs, review them first — they may need to be merged before branching
   - This prevents working on a stale `main` branch (critical for multi-PC workflows)
   - If an open PR is yours and approved, merge it before starting new work
3. Check `PROGRESS.md` for current status and who's working on what
4. Claim your task in PROGRESS.md before starting work

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

## PROGRESS.md Rules
- This is the **one file** that can be pushed directly to `main`
- Update it when you: start a task, finish a task, or hit a blocker
- Format: who did what, when, current status
- This keeps everyone in sync across computers and sessions

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

## Claude-Specific Rules
- Always pull before starting work
- **Always check for open PRs** (`gh pr list --state open`) before starting new work
- Always create work on feature branches, never push code to main
- PROGRESS.md is the only file Claude can push directly to main
- Always run `ruff check` and `pytest` before committing
- Create small, focused PRs with clear descriptions
- After completing work, update PROGRESS.md and push it
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
