# Development Gotchas — Quick Reference for Executor Agents

This file contains common pitfalls discovered during development. **Every executor agent should be told to read this file before writing code.**

---

## Python / FastAPI / Backend

### Async Event Loop Blocking (CRITICAL)

- `bcrypt.hashpw()` / `bcrypt.checkpw()` → ALWAYS wrap in `asyncio.to_thread()`
- `stripe.Customer.create()` and ALL Stripe SDK calls → `asyncio.to_thread()`
- `resend.Emails.send()` → `asyncio.to_thread()`
- Any CPU-bound or blocking I/O operation in an async endpoint → `asyncio.to_thread()`

### SQLAlchemy ORM

- `lazy="raise"` + cascade delete = BROKEN. ORM can't load related objects to cascade. Fix: explicit `DELETE FROM child WHERE parent_id = ?` before `db.delete(parent)`
- `sa.JSON()` columns return native Python types. Do NOT call `json.loads()` on them — they're already deserialized
- Always use `selectinload()` or `joinedload()` for relationships to avoid N+1 queries
- Use `async_sessionmaker` with `expire_on_commit=False` for async sessions

### pytest on Windows

- Use `.venv/Scripts/python.exe -m pytest` — NOT bare `python -m pytest`
- Always run from project root with explicit test paths

### Security

- ALL secret comparisons must use `hmac.compare_digest()` (constant-time) — never `==`
- Webhook signatures: verify BEFORE any processing
- Cookie flags: `httponly=True`, `secure=True`, `samesite="lax"` minimum
- Rate limiting on ALL auth endpoints

---

## TypeScript / React / Next.js / Frontend

### Vitest jsdom Hangs (CRITICAL)

- Proxy-based mocks (e.g., lucide-react) cause infinite loops in jsdom
- Fix: use explicit named exports: `{ User: (props: any) => React.createElement('svg') }`
- NEVER use `new Proxy({}, handler)` for component mocks in jsdom environment

### UI Component Mocking

- Components importing `@/components/ui/*` need explicit mocks in vitest
- Mock at the module level with `vi.mock('@/components/ui/button', ...)`

### Import Paths

- In test files under `__tests__/components/account/`, use relative paths to source, NOT `@/` aliases
- `@/` aliases may not resolve correctly in all test configurations

### React Performance Patterns

- `useCallback` for ALL handlers passed as props to child components
- `React.memo()` for components receiving complex objects as props
- Hoist constants OUTSIDE component bodies (don't recreate objects on every render)
- Use `next/dynamic` for heavy optional components (code splitting)

### Type Safety

- Always import `Tier` from `@mergenix/shared-types` — never use bare `string`
- In test fixtures, use `as const` for tier values: `{ tier: 'premium' as const }`
- Pre-existing TS errors (NOT ours — don't try to fix): `client.ts:157` (type comparison), `demo-results.ts:268` (type literal), `payment-client.test.ts:274-295` (type assertion cast)

### URLSearchParams Gotcha

- `URLSearchParams` encodes spaces as `+`, `encodeURIComponent` as `%20`
- Be consistent — pick one and stick with it per module

---

## Git / Workflow

### Stale Node Processes

- After running parallel agents, kill stale node processes: `taskkill //F //IM node.exe`
- Check before running tests if previous tests seem hung

### Test Execution

- Run tests in small groups (5-10 suites), NOT all at once
- Large parallel test runs can exhaust memory or hang on Windows

### Branch Strategy

- Rewrite branches: `rewrite/phase-N-description` targeting `rewrite/main`
- NEVER push code to `main` — only `PROGRESS.md` and `PROJECT_STATUS.md`
- Squash merge PRs for clean history
- If PR base branch is deleted after squash merge: `gh pr edit --base rewrite/main`

---

## Naming / Business Rules

### Product Terminology (CRITICAL for Business reviewer)

- This is a ONE-TIME PURCHASE platform — NEVER use "subscription", "monthly", "recurring"
- Tiers: Free / Premium / Pro (one-time payment)
- "Upgrade" is correct. "Subscribe" is WRONG.
- "Analysis" is correct. "Report" is acceptable. "Scan" is WRONG.

### Genetic Data Context

- We analyze two parents' DNA to predict offspring traits and carrier status
- Results are PROBABILISTIC — never use definitive language ("your child WILL have...")
- Always frame as "estimated probability" or "predicted likelihood"
- Carrier status must include context (e.g., "carrier" ≠ "affected")

---

## Common Review Failures (Top 5)

1. **Blocking the event loop** — bcrypt/Stripe/Resend not in asyncio.to_thread()
2. **Missing tier gating on backend** — frontend-only tier checks are bypassable
3. **Non-constant-time secret comparison** — using `==` instead of hmac.compare_digest()
4. **"Subscription" terminology** — product is one-time purchase
5. **Missing ARIA attributes** — progressbar roles, sr-only text, aria-controls
