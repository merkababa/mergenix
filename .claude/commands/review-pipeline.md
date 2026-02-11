Execute the full three-layer code review pipeline before creating a PR.

## Layer 0: Static Analysis Gate
Executors MUST pass all static checks before code goes to reviewers:
1. `pnpm lint` — ESLint
2. `pnpm typecheck` — TypeScript (exclude known pre-existing issues in `client.ts:157`, `demo-results.ts:268`)
3. `pnpm test` — All Vitest tests passing
4. `pnpm build` — No build errors
5. For Python backend: `cd apps/api && ruff check . && pytest tests/ -v`

Only code that passes Layer 0 proceeds to Stage 1.

## Review Panel (10 Reviewers)
| # | Reviewer | Focus Area |
|---|----------|------------|
| 1 | Architect | System design, modularity, separation of concerns, scalability, design patterns, type safety |
| 2 | QA | Test coverage, edge cases, assertions, error handling, regression risk, logging |
| 3 | Scientist | rsID accuracy, genetics correctness, citations, scientific methodology, data integrity |
| 4 | Technologist | Performance, React/Next.js patterns, bundle size, memory, async correctness |
| 5 | Business | Tier gating, conversion funnel, upgrade CTAs, copy quality, naming accuracy |
| 6 | Designer | Accessibility (ARIA), responsive design, heading hierarchy, keyboard navigation, UX flow |
| 7 | Security Analyst | OWASP top 10, injection, CSRF, token handling, encoding, secrets, timing attacks |
| 8 | Code Reviewer | Readability, naming, DRY/SOLID, style consistency, dead code, import hygiene |
| 9 | Legal + Privacy | GDPR, GINA, data retention, consent, right to deletion, cookie consent, age verification |
| 10 | Ethics / Bioethics | Population bias, responsible result framing, emotional harm prevention, eugenics guardrails |

Ask user which roles to include each time (default: all 10). Skip only clearly irrelevant roles.

### Phase-Type Pre-Selection Defaults
- **Frontend-only:** Architect, QA, Technologist, Business, Designer, Code Reviewer
- **Backend-only:** Architect, QA, Technologist, Business, Security, Code Reviewer
- **Genetics:** Architect, QA, Scientist, Technologist, Code Reviewer
- **Full-stack / Auth+Payments:** All 10
- Legal+Privacy and Ethics always included when touching user data or genetic data

## Stage 1: Gemini Reviews — ALL Selected MUST BE A+

1. Spawn a **Gemini Review Coordinator** agent (dedicated team member, not a bash script)
2. Coordinator reads changed files and prepares review prompts
3. Coordinator calls Gemini separately per reviewer role using personas from `review-personas/*.md`
   - One Gemini call = one reviewer — never combine reviewers
   - No need to wait between calls (API tokens, generous rate limits)
4. Each Gemini reviewer gets **FULL SOURCE FILES** + diff — not just the diff. Include all changed `.ts`/`.tsx`/`.py` files in their entirety + relevant `.json` data/config + test files for QA
5. Coordinator reports grades table to Conductor
6. Conductor spawns a **Judge/Synthesis agent** that deduplicates issues across reviewers, resolves conflicts, produces final grade table + fix manifest
7. Print **Consolidated Issues table** to user: Issue | Flagged By | Severity | Action Item
8. Fix issues: 6+ → executor team with file ownership; 1-5 → single executor
9. Re-review only failed roles (below A+)
10. Repeat until ALL selected Gemini reviewers grade A+
11. As each Gemini role reaches A+, immediately start the corresponding Claude reviewer (pipeline overlap)

## Stage 2: Claude Opus Reviews — ALL Selected MUST BE A+

1. Only after ALL Gemini reviewers are A+ — hard prerequisite
2. Spawn separate Claude Opus agents per reviewer role using `.claude/agents/*-reviewer.md` — all selected, no skipping
3. Each agent has its own context — fully independent, never combined
4. Agents read files themselves (they have tool access)
5. All agents run in parallel
6. Each grades independently — results not combined
7. Spawn a **Judge/Synthesis agent** — deduplicates, resolves conflicts, produces final grade table + fix manifest
8. Print **Consolidated Issues table** to user (same format as Stage 1)
9. Fix issues: 6+ → executor team; 1-5 → single executor
10. Re-review only failed roles
11. Repeat until ALL selected Claude reviewers grade A+
12. Only after both Stage 1 (A+) AND Stage 2 (A+) may a PR be created

## Fix Flow
- 6+ issues → executor team with file ownership (one executor per directory/module)
- 1-5 issues → single executor agent
- After fixes: re-review ONLY the roles that were below A+
- **Feedback loop:** After each Claude review cycle, record issues Gemini missed → append to `docs/gemini-calibration.md` → include in next Gemini review prompt

## Grades Table Format
```
| Reviewer | Gemini R1 | Gemini R2 | Claude Final | Key Fixes |
|----------|-----------|-----------|--------------|-----------|
| Architect | A- | A+ | A+ | Fixed X |
```

## Rules
- Each grade must cite specific evidence from the code — no hand-waving
- Not-applicable = A+ with "N/A — no [domain] impact" but still explicitly stated
- Each reviewer = separate agent — never combine multiple reviewers in one agent
- Review happens BEFORE the PR is created, not after
