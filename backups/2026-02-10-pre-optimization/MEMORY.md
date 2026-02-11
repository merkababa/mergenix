# Mergenix Project Memory

## Project Overview
- **Name:** Mergenix (rebranded from Tortit in PR #14)
- **Version:** 3.0.0-alpha (V3 Rewrite)
- Genetic offspring analysis platform — compares two parents' DNA
- One-time pricing: Free/Premium/Pro tiers
- V3: Next.js 15 + FastAPI + TypeScript genetics engine in Web Workers

## V3 Rewrite Status (Active Development)
- **Phase 1:** Monorepo scaffolding (PR #28 — Merged)
- **Phase 2:** Frontend pages (PR #30 — Merged)
- **Phase 3:** Genetics engine TypeScript port (PR #31 — Merged, 6/6 A+)
- **Phase 4:** Analysis UI + Web Worker wiring (PR #32 — Merged, 6/6 A+)
- **Phase 5:** Auth UI (PR #34 — Merged, 7/7 A+)
- **Phase 6:** Payment UI (PR #35 — Merged, 8/8 A+)
- **Phase 7:** Backend API (PR #36 — Open, 8/8 A+)
- **Phase 8:** Polish & Launch

## V3 Test Coverage
- Genetics engine: 366 tests (8 suites)
- Web app: 503 tests (37 suites)
- Backend API: 60 tests (3 suites)
- **Total: 929 tests passing**

## V3 Key Files
- `apps/web/` — Next.js 15 frontend (React 19, Tailwind, Zustand)
- `apps/api/` — FastAPI backend (24 endpoints, 60 tests, cookie auth, Stripe, async)
- `packages/genetics-engine/` — TypeScript engine (~5,500 LOC, 366 tests)
- `packages/shared-types/` — Shared TypeScript types
- `packages/genetics-data/` — JSON data files

## Git Workflow
- Never push code to main (only PROGRESS.md/PROJECT_STATUS.md)
- Rewrite branches: `rewrite/phase-N-description` targeting `rewrite/main`
- `gh` CLI: `"C:\Program Files\GitHub CLI\gh.exe"` (not in PATH for bash)
- Squash merge PRs for clean history
- CI has pre-existing failures (backend lint/mypy/tests) — use `--admin` to merge

## User Preferences
- **Multi-agent status table (MANDATORY):** Always show final summary table
- **8/8 A+ target:** All review rounds must reach A+ from all 8 reviewers
- **Use proper TeamCreate** for multi-agent work (not fire-and-forget Tasks)
- **Sonnet for simple fixes, Opus for complex work**
- **Each reviewer = separate agent** — never combine reviewers into one agent
- **Ask user which reviewer roles each time** (default all 8)
- **Dev Team Leader orchestrates** — never writes code, splits across executors
- **Gemini gets full code + diff** — never just the diff alone
- **Fix flow:** 3+ issues → Dev Team Leader + executor team; 1-2 → single executor

## CONDUCTOR-ONLY Protocol (ABSOLUTE — NEVER VIOLATE)
See `conductor-protocol.md` for full details. Key rules:
1. **NEVER write/edit code files** — always delegate to executor agents
2. **NEVER read large source files** — delegate to explore/architect agents
3. **NEVER run tests/builds directly** — delegate to qa-tester/build-fixer agents
4. **Keep context pristine** — summarize agent output in 2-3 lines, don't paste full results
5. **Memory over context** — store decisions/patterns in memory files, not conversation
6. **Batch into agents** — one agent with 5 steps beats 5 tool calls in your context
7. **Only touch**: git commands, status files (PROGRESS.md, PROJECT_STATUS.md, CLAUDE.md), memory files, task orchestration

## Orchestration Model (MANDATORY)
See `conductor-protocol.md` for full details.

### Execution Flow
1. **Conductor** spawns **Dev Team Leader** via TeamCreate
2. **Dev Team Leader** does NOT write code — orchestrates executor agents with file ownership
3. **Executors** write code, each owns specific files
4. Dev Team Leader can delegate to Gemini where appropriate

### Review Flow (Two-Stage, Independent Agents)
**Stage 1 — Gemini:** Gemini Review Coordinator spawns separate Gemini instances per reviewer role (with FULL code + diff). Iterate to all A+.
**Stage 2 — Claude Opus:** Separate Claude Opus agents per reviewer (each with own context). Iterate to all A+.
**Fix flow:** 3+ issues → Dev Team Leader + executor team; 1-2 → single executor

### Planning Flow
Separate planning agents per perspective (ask user which roles each time, default all 8).

### The 8 Reviewer Roles
1. Architect — architecture, types, separation of concerns
2. QA — test coverage, edge cases, assertions
3. Scientist — rsID accuracy, genetics correctness, citations
4. Technologist — performance, React patterns, bundle size, async
5. Business — tier gating, conversion, upgrade CTAs, copy
6. Designer — accessibility, ARIA, responsive, heading hierarchy
7. Security Analyst — OWASP, injection, CSRF, token handling
8. Code Reviewer — readability, naming, style, DRY/SOLID
9. Legal + Privacy — GDPR, GINA, data retention, consent, right to deletion, cookie consent, age verification, data flow mapping, encryption, cross-border transfers
10. Ethics / Bioethics — population bias, responsible result framing, emotional harm, informed consent UX, eugenics guardrails

**PR grades table:** `| Reviewer | Gemini R1 | Gemini R2 | Claude Final | Key Fixes |`

## Gemini Delegation
- **MCP is BROKEN on Windows** — never use MCP tools for Gemini
- Use Bash: `gemini -p "prompt" --model gemini-3-pro-preview 2>&1`
- Always `run_in_background: true` (10-30s responses)
- A-tier: codebase analysis, JSON validation, CSS/UI, code review, PR descriptions
- D-tier (never): auth, payments, git ops, multi-step agentic, debugging
- **Code delegation rule:** Only delegate code to Gemini if it can do equal or better quality than Claude. Don't delegate just to delegate — save tokens by using Gemini where it genuinely matches or exceeds Claude's output

## Gemini Review Enhancement (from Claude-Gemini conversation 2026-02-10)
- See `docs/GEMINI_REVIEW_PROTOCOL.md` for full protocol
- **Key insight:** Gemini is a pattern-matcher, not a runtime simulator — misses async/concurrency/ORM interaction bugs
- **Fix:** Enhanced prompts with adversarial questions + mandatory checklists + grading calibration
- **Context packaging:** Interleaved format (diff + full file per file)
- **UNCERTAINTY flags:** Gemini marks uncertain issues for Claude to verify (reduces Claude's review scope)
- **Feedback loop:** After each Claude review, generate "lessons learned" for next Gemini review
- **Second pass instruction:** Mandatory "breaker mindset" re-read appended to every review prompt
- **Grading calibration:** A+ = zero issues; tied to most severe issue found, not "average feel"
- **gemini-3-pro-preview capacity issues:** NEVER fall back to weaker models. Wait and retry (60s, 120s, 300s). Inform user if still failing after 3 retries.

## Lessons Learned
- Multi-agent file ownership boundaries prevent merge conflicts
- Squash merge + rebase causes conflicts; use `git merge` instead
- Pre-existing CI failures in rewrite/main (backend Python code) — not blocking
- When PR base branch is deleted after squash merge, update target with `gh pr edit --base`
- R4→R5 pattern works: full review → fix all issues → verification round
- Business reviewer is strictest; needs demo CTAs, dynamic tier banners, conversion funnel
- Designer focuses on ARIA: progressbar roles, sr-only text, aria-controls, heading hierarchy
- Technologist wants: useCallback, React.memo, next/dynamic, hoisted constants
- Architect wants: no type duplication, derive types from shared-types, extract shared constants
- **Vitest jsdom hang root cause:** Proxy-based lucide-react mocks cause infinite loops. Fix: use explicit named exports (`{ User: (props) => <svg/> }`), not `new Proxy({}, handler)`
- **UI component mocking:** Components importing `@/components/ui/*` need explicit mocks in vitest jsdom
- **Relative imports in account tests:** Use relative paths, not `@/` aliases
- **Stale node processes:** After parallel agents, kill with `taskkill //F //IM node.exe`
- **Test groups:** Run tests in small groups, not all at once
- **URLSearchParams vs encodeURIComponent:** URLSearchParams encodes spaces as `+`, encodeURIComponent as `%20`
- **Tier type safety:** Always use `Tier` from shared-types, never `string`. In test fixtures use `as const`
- **Pre-existing TS errors:** `client.ts:157` (type comparison) and `demo-results.ts:268` (type literal) — not ours
- **lazy="raise" + cascade delete:** When using `lazy="raise"` on relationships, ORM cascade delete fails (can't load related objects). Fix: explicit SQL DELETE before `db.delete(user)`
- **JSON column vs json.loads:** When `backup_codes` is `sa.JSON()`, SQLAlchemy returns native Python list — don't call `json.loads()` on it
- **asyncio.to_thread for blocking libs:** bcrypt, Stripe SDK, Resend SDK all block the event loop — always wrap in `asyncio.to_thread()`
- **Independent 8-agent review** catches issues single-agent review misses (especially Technologist async concerns + Business naming)
- **pytest with venv on Windows:** Use `.venv/Scripts/python.exe -m pytest` not bare `python -m pytest`
