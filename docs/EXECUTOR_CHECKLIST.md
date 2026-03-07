# Executor Quality Checklist

Every executor agent MUST verify compliance before committing. The conductor includes this in every executor prompt:

```
Read and follow ALL items in docs/EXECUTOR_CHECKLIST.md before committing.
```

Issues covered by this checklist are NOT review findings. Reviewers skip these unless the checklist was VIOLATED.

---

## 1. Accessibility (Designer reviewer coverage)

- [ ] Interactive elements have `role`, `aria-label`, and keyboard support
- [ ] Progress indicators use `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax`
- [ ] Decorative images marked with `aria-hidden="true"` or empty `alt=""`
- [ ] Screen-reader-only text uses `sr-only` class (not `display: none`)
- [ ] `aria-controls` links interactive elements to their controlled regions
- [ ] Heading hierarchy is sequential (`h1` → `h2` → `h3`, no skips)
- [ ] Touch/click targets meet 44px minimum

## 2. Styling & Theming

- [ ] All colors from CSS variables (`var(--bg-elevated)`, `var(--border-subtle)`, etc.) — zero hardcoded hex/rgb
- [ ] All spacing from Tailwind tokens — zero magic pixel numbers
- [ ] Glass card pattern: `bg-[var(--bg-elevated)]`, `border-[var(--border-subtle)]`, `rounded-[20px]`
- [ ] Dark mode compatible (uses CSS variables, not hardcoded light colors)

## 3. React / Next.js Patterns (Technologist reviewer coverage)

- [ ] Event handlers wrapped in `useCallback` when passed as props
- [ ] Expensive computations wrapped in `useMemo`
- [ ] Constants hoisted OUTSIDE component bodies (arrays, objects, configs)
- [ ] Heavy optional components loaded with `next/dynamic` (code splitting)
- [ ] `useEffect` cleanup functions for subscriptions/timers/listeners
- [ ] Dependency arrays complete and correct (no missing deps, no over-inclusion)

## 4. TypeScript / Types (Architect reviewer coverage)

- [ ] Zero `any` types in production code
- [ ] `Tier` imported from `@mergenix/shared-types` — never bare `string`
- [ ] Test fixtures use `as const` for tier values: `{ tier: 'premium' as const }`
- [ ] New interfaces exported if used cross-file
- [ ] No unsafe type assertions without explanatory comment

## 5. Testing (QA reviewer coverage)

- [ ] New features have integration tests covering happy path
- [ ] Query by accessibility: `getByRole`, `getByText`, `getByLabelText` — avoid `getByTestId`
- [ ] Async state changes wrapped in `waitFor` or `act`
- [ ] Mocks re-established after `clearAllMocks()`
- [ ] No `console.log` in committed test or production code

## 6. Backend / FastAPI (Security + Technologist coverage)

- [ ] Blocking calls wrapped in `asyncio.to_thread()`: bcrypt, Stripe SDK, Resend SDK
- [ ] ALL secret comparisons use `hmac.compare_digest()` — never `==`
- [ ] Webhook signatures verified BEFORE any processing
- [ ] Tier gating enforced on BACKEND, not just frontend
- [ ] `selectinload()` / `joinedload()` for relationship queries (no N+1)
- [ ] `sa.JSON()` columns return native Python — don't call `json.loads()`

## 7. Business / Naming (Business reviewer coverage)

- [ ] Product is ONE-TIME PURCHASE — never "subscription", "monthly", "recurring"
- [ ] Tiers: Free / Premium / Pro — "Upgrade" is correct, "Subscribe" is WRONG
- [ ] "Analysis" or "Report" — never "Scan"
- [ ] Genetic results use probabilistic language ("estimated probability", "predicted likelihood")
- [ ] Carrier status includes context ("carrier" ≠ "affected")

## 8. Code Hygiene

- [ ] No stale TODO comments for completed work
- [ ] No dead code (unused imports, unreachable branches)
- [ ] Constants extracted for repeated literal values
- [ ] No `console.log` / `print()` debug statements in production code
- [ ] Imports cleaned — no unused imports
