Review a PR created by GitHub Copilot to verify it meets Mergenix quality standards.

## Usage

Run this command after Copilot creates a PR. Provide the PR number as context.

## Review Steps

### 1. Fetch and inspect the PR

```bash
# Get PR details
gh pr view <pr-number>

# Check out the PR branch locally
gh pr checkout <pr-number>

# See what changed
git diff origin/main...HEAD --name-only
git diff origin/main...HEAD --stat
```

### 2. Layer 0: Static Analysis Gate

All checks must pass. If any fail, the PR needs fixes before review:

```bash
pnpm lint          # ESLint via turbo
pnpm typecheck     # tsc --noEmit via turbo
pnpm test          # Vitest via turbo (forks pool)
pnpm build         # Next.js production build
```

For Python backend changes:
```bash
cd apps/api && ruff check . && py -m pytest tests/ -v -n auto
```

### 3. Layer 1: Self-Review vs Executor Checklist

For each changed file, verify against `docs/EXECUTOR_CHECKLIST.md`:

```bash
# List changed files
git diff origin/main...HEAD --name-only

# For each file, read and check against checklist
```

Key checklist items to verify:
- [ ] Accessibility: ARIA attributes, keyboard support, heading hierarchy
- [ ] Styling: CSS variables only, Tailwind tokens, glass card pattern
- [ ] React patterns: useCallback/useMemo, constants hoisted, dynamic imports
- [ ] TypeScript: zero `any`, types from @mergenix/shared-types
- [ ] Testing: integration tests exist, query by accessibility, async handling
- [ ] Backend: asyncio.to_thread for blocking calls, hmac.compare_digest
- [ ] Business naming: "Analysis" not "Scan", "Upgrade" not "Subscribe"
- [ ] Code hygiene: no console.log, no dead code, no stale TODOs

### 4. Layer 2: External Review (select relevant reviewers)

Spawn Claude reviewers based on what changed:

| Trigger                    | Reviewers                      |
| -------------------------- | ------------------------------ |
| Default (any PR)           | Architect + Code Reviewer      |
| New UI screens             | + UX Reviewer                  |
| Backend / API / DB         | + Security Reviewer            |
| Genetics / health data     | + Security + Testing Reviewer  |
| Performance-sensitive      | + Performance Reviewer         |

Each reviewer uses `.claude/agents/*-reviewer.md` with:
```
Issues covered by docs/EXECUTOR_CHECKLIST.md are already enforced.
Only flag checklist items if the checklist was VIOLATED.
Focus on architectural and logic issues that a checklist cannot catch.
```

### 5. Verdict

After review, take one of these actions:

**APPROVE** — All gates pass, no BLOCKs:
```bash
gh pr review <pr-number> --approve --body "Reviewed by Claude Code. All quality gates pass. Grade: A/A+"
```

**REQUEST CHANGES** — BLOCKs found:
```bash
gh pr review <pr-number> --request-changes --body "$(cat <<'EOF'
## Review Findings

### BLOCKs (must fix)
- ...

### WARNs (should fix)
- ...

### INFOs (nice to have)
- ...

**Run these commands after fixing:**
```
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
EOF
)"
```

**CLOSE** — Fundamental issues, start over:
```bash
gh pr close <pr-number> --comment "Closing due to fundamental issues. See review findings above."
```

### 6. Post-Review

- If changes requested: wait for Copilot to push fixes, then re-run this review
- If approved: merge the PR
  ```bash
  gh pr merge <pr-number> --squash --delete-branch
  ```
- Update `PROGRESS.md` with the completed task
