Execute the optimized 3-layer code review pipeline before creating a PR.

## Layer 0: Static Analysis Gate

Executors MUST pass all static checks before code goes to reviewers:

1. `pnpm lint` — ESLint
2. `pnpm typecheck` — TypeScript (exclude known pre-existing issues in `client.ts:157`, `demo-results.ts:268`)
3. `pnpm test` — All Vitest tests passing
4. `pnpm build` — No build errors
5. For Python backend: `cd apps/api && ruff check . && pytest tests/ -v -n auto`

Only code that passes Layer 0 proceeds.

## Layer 1: Self-Review (Shift Left)

After executors complete and Layer 0 passes, the Conductor reads each changed file and verifies against `docs/EXECUTOR_CHECKLIST.md`. This catches ~80% of what reviewers would find.

### Process

1. List changed files: `git diff origin/main...HEAD --name-only`
2. For each changed file, verify every applicable checklist item
3. Fix violations immediately (spawn targeted fix agents — Haiku for mechanical, Sonnet for contextual)
4. Re-run Layer 0
5. THEN proceed to Layer 2

**Why this works**: Most review findings are pattern violations (missing ARIA, hardcoded strings, wrong imports, blocking calls). The checklist catches these mechanically. Reviewers should focus on what checklists CAN'T catch: architectural issues, race conditions, logic errors, security flaws.

## Layer 2: External Review (2-4 Specialist Agents)

### Reviewer Selection (pick 2-4, NOT more)

| Trigger                        | Reviewers                     |
| ------------------------------ | ----------------------------- |
| **Default (any PR)**           | Architect + Code Reviewer (2) |
| **New UI screens**             | + Designer (3)                |
| **Backend / API / DB**         | + Security (3)                |
| **Genetics / health data**     | + Scientist (3)               |
| **Privacy / compliance**       | + Security + Legal (4)        |
| **Performance-sensitive**      | + Technologist (3)            |
| **User-facing copy / pricing** | + Business (3)                |
| **Genetic result display**     | + Ethics (3)                  |

**Rule**: More reviewers ≠ better. Overlapping reviewers find the same issues and waste tokens. 2 focused reviewers > 5 generalist reviewers. Only add a reviewer if the PR has clear relevance to their domain.

### Reviewer Prompt Requirements

Each reviewer agent uses `.claude/agents/*-reviewer.md`. Add to every reviewer prompt:

```
Issues covered by docs/EXECUTOR_CHECKLIST.md are already enforced.
Only flag checklist items if the checklist was VIOLATED.
Focus on architectural and logic issues that a checklist cannot catch.
```

### Severity Classification (required for every finding)

- **[BLOCK]**: Must fix before merge. Bugs, security issues, data loss risks, incorrect behavior.
- **[WARN]**: Should fix. Code smell, maintainability concern, minor inconsistency.
- **[INFO]**: Nice to have. Style preference, future improvement suggestion.

### Grading

- **A+ (95-100)**: Exemplary — zero issues
- **A (90-94)**: No BLOCKs, minor WARNs/INFOs only
- **B+ (85-89)**: 1-2 BLOCKs
- **B (80-84)**: 3-5 BLOCKs
- **C or below**: Major structural issues

### Fix & Re-Review (max 3 rounds, HARD CAP)

```
Round 1: All selected reviewers in parallel → collect ALL findings
         ↓
    Fix EVERYTHING (BLOCK + WARN + INFO) in ONE batch
    Re-run Layer 0
         ↓
Round 2: Re-review ONLY reviewers that had BLOCKs in R1
         If no new BLOCKs → done
         If new BLOCKs → fix → Round 3
         ↓
Round 3: Hard stop. Fix remaining BLOCKs only. No further review.
```

**Critical rule: Fix ALL severities at once.** The #1 cause of extra rounds is fixing only BLOCKs then discovering WARNs persist. One batch fixes everything.

### Exit Criteria

- **A grade (no BLOCKs) = pass.** WARNs and INFOs are fixed in a final cleanup pass but do NOT trigger additional review rounds.
- After all reviewers reach A: fix remaining WARN/INFO items per the Final Cleanup Rule below.
- Not-applicable = A+ with "N/A — no [domain] impact"

### Final Cleanup Rule (after all reviewers reach A)

After the last review round passes, triage every remaining WARN and INFO using this two-tier scope rule:

1. **WARNs/INFOs from code this PR changed** → fix in this PR, no exceptions. We touched it, we own it.
2. **WARNs/INFOs from pre-existing code** (reviewers flagged code we didn't change) → do NOT fix in this PR. Create tracked tech debt items (add to `PROGRESS.md` deferred items or create GitHub issues). Prevents scope creep.
3. **WARNs/INFOs requiring architectural decisions** → do NOT silently fix. Present options to the user and let them decide. Add to tech debt if deferred.

**Rationale:** "Acknowledged" WARNs that never get fixed are invisible debt. If we changed the code, we own the quality of what we ship. But pre-existing issues belong in their own PRs to keep scope focused.

To determine ownership, run: `git diff origin/main...HEAD -- <file>` — if the flagged lines are NOT in the diff, the finding is pre-existing.

### Gemini (Optional Pre-Check)

Gemini can optionally run BEFORE Claude reviewers as a cheap broad sweep:

- Fire selected roles via `review-personas/*.md` using Gemini CLI
- Use to catch surface-level issues before spending Opus tokens
- NOT required — skip if PR is small or time-constrained
- If used, Gemini must reach A before Claude reviewers start

### Grades Table Format

```
| Reviewer      | R1             | R2  | R3  | Key Fixes              |
|---------------|----------------|-----|-----|------------------------|
| Architect     | B+ (2 BLOCKs)  | A   | -   | Added error boundaries |
| Code Reviewer | A (3 WARNs)    | -   | -   | Fixed in final wave    |
```

### Fix Flow

- 6+ issues → executor team with file ownership (one executor per directory/module)
- 1-5 issues → single executor agent

### Feedback Loop

After each review cycle, record issues the self-review (Layer 1) missed → update `docs/EXECUTOR_CHECKLIST.md` with new items. The checklist is a living document that improves over time.

## Rules

- Each grade must cite specific `file:line` evidence — no hand-waving
- Each reviewer = separate agent — never combine multiple reviewers in one agent
- Review happens BEFORE the PR is created, not after
- Run all reviewers as background tasks — read only grade + summary from output
- Never accumulate 4+ full review results in conductor context — summarize as you go
