# Next.js 15 → 16 Migration Plan

**Created:** 2026-02-19
**Status:** Deferred (do after V3 feature-complete)
**Dependabot PR:** #82 (next 15 → 16.1.6)

---

## Gemini Planning Team Results

| Persona          | Risk Level  | Top Concern                                             |
| ---------------- | ----------- | ------------------------------------------------------- |
| **Architect**    | Medium      | Turbopack + Web Worker compatibility                    |
| **Technologist** | Medium-High | Webpack fallbacks (`fs: false`) may fail with Turbopack |
| **QA**           | Medium      | middleware.test.ts rename + async params in E2E         |
| **Security**     | High        | Auth bypass if proxy.ts migration fails silently        |

---

## Next.js 16 Breaking Changes (Complete List)

1. **Async Request APIs (BREAKING):** `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` MUST be awaited. Synchronous access fully removed.
2. **Turbopack default bundler:** Custom webpack configs will FAIL. Must migrate or opt out with `--webpack`.
3. **middleware.ts → proxy.ts:** File renamed. Export function must be named `proxy` not `middleware`. Runs on Node.js runtime (NOT edge).
4. **next/image defaults changed:** `minimumCacheTTL` 60s→4hrs, `imageSizes` removed 16, `qualities` restricted to `[75]`, local IP blocked, max 3 redirects.
5. **Parallel routes require default.js:** Build fails without explicit `default.js` in parallel route slots.
6. **next lint removed:** Must use ESLint CLI directly. `next build` no longer runs linting.
7. **ESLint flat config default:** `@next/eslint-plugin-next` now defaults to flat config.
8. **AMP support removed** (we don't use AMP — no impact).
9. **Runtime configs removed:** `serverRuntimeConfig`/`publicRuntimeConfig` gone. Use env vars.
10. **React 19.2:** View Transitions, `useEffectEvent`, `<Activity>` component.
11. **React Compiler support (stable):** Optional auto-memoization via `reactCompiler: true`.
12. **Node.js 20.9+ required** (Node 18 dropped).
13. **TypeScript 5+ required.**
14. **Caching APIs changed:** `revalidateTag` needs `cacheLife` profile as 2nd arg, new `updateTag()`/`refresh()` APIs.
15. **Scroll behavior override removed:** Add `data-scroll-behavior="smooth"` to `<html>` to opt back in.
16. **Concurrent dev/build output directories:** `.next/dev` for dev, `.next` for build.
17. **Sass tilde imports not supported in Turbopack.**
18. **`next/legacy/image` deprecated.**
19. **`images.domains` deprecated** — use `images.remotePatterns`.
20. **Cache Components:** New model replacing PPR (`cacheComponents: true`).

---

## Consensus: Key Risks

### 1. Turbopack + Web Workers (HIGH)

All 4 personas flagged this. Our `next.config.ts` has `config.resolve.fallback = { fs: false }` for the genetics engine Web Worker. Turbopack doesn't support custom webpack configs — the build will **fail** unless we:

- Migrate to Turbopack `resolveAlias` configuration, OR
- Add `browser` field to `@mergenix/genetics-engine`'s `package.json` to shim Node modules, OR
- Opt out with `--webpack` flag (temporary fallback)

### 2. middleware.ts → proxy.ts (HIGH)

Auth route protection is our security boundary. If the rename breaks silently, protected routes become public. Security persona recommends "deny by default" policy in `proxy.ts`. The proxy runs on Node.js runtime (not edge), which is actually an improvement — enables full JWT verification.

### 3. Async Request APIs (MEDIUM)

`params`, `cookies()`, `headers()` must be awaited everywhere. Architect notes our disease page already uses `await params`, but a full audit is needed across all pages/layouts/routes.

### 4. React Compiler vs Manual Memoization (LOW)

Technologist suggests enabling React Compiler and removing manual `useCallback`/`React.memo`, but this is optional and can be done post-migration.

---

## Migration Phases

### Phase 1: Dependencies & Types

1. Bump packages in `apps/web/package.json`:
   - `next` → `^16.0.0`
   - `react` / `react-dom` → `^19.2.0`
   - `@types/react` / `@types/node` → latest
2. Run `pnpm install` — resolve any peer dependency conflicts
3. Run `pnpm typecheck` in `apps/web`
4. Fix new type errors (async `PageProps`, `LayoutProps` — use `npx next typegen`)

### Phase 2: Config & Renames

1. **Rename middleware:**
   - `mv apps/web/middleware.ts apps/web/proxy.ts`
   - Change `export function middleware` → `export function proxy`
   - Update any `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize` in config
2. **Update test file:**
   - Rename `middleware.test.ts` → `proxy.test.ts`
   - Update imports and function references
3. **Audit async APIs:**
   - Search all `page.tsx`, `layout.tsx`, `route.ts` for sync access to `params`, `searchParams`, `cookies()`, `headers()`
   - Use Next.js codemod: `pnpm dlx @next/codemod@canary upgrade latest`
4. **Update next.config.ts:**
   - Move `experimental.turbopack` to top-level `turbopack` (if present)
   - Remove deprecated config options
   - Update ESLint config to flat format
5. **Update lint scripts:**
   - Replace `next lint` with direct `eslint` CLI call in `package.json`

### Phase 3: Turbopack Validation

1. Attempt `pnpm build` with Turbopack (now default)
2. If Web Worker build fails:
   ```ts
   // Try Turbopack resolveAlias in next.config.ts
   turbopack: {
     resolveAlias: {
       fs: { browser: './empty.ts' },
       path: { browser: './empty.ts' },
     },
   }
   ```
3. If still fails: add `--webpack` to build scripts as temporary fallback
   ```json
   { "build": "next build --webpack" }
   ```
4. Smoke test genetics analysis page — verify Web Worker loads and processes DNA files

### Phase 4: Full Verification

1. **Unit/Integration tests:** Run all ~1,070 Vitest tests (`pnpm test`)
2. **E2E tests:** Run all 153 Playwright tests (`pnpm test:e2e`)
3. **Security smoke test:**
   - Verify unauthenticated access to `/account` redirects to `/login`
   - Verify CSP headers still present
   - Verify cookie attributes (HttpOnly, Secure, SameSite)
4. **Manual verification:**
   - Auth flows (login, register, OAuth, 2FA)
   - Disease catalog with search/filter
   - Analysis page with demo data
   - OG images rendering
   - next/image rendering (check new defaults)

---

## Optional Enhancements (Post-Migration)

| Enhancement                                   | Effort | Benefit                                                    |
| --------------------------------------------- | ------ | ---------------------------------------------------------- |
| Enable React Compiler (`reactCompiler: true`) | Low    | Auto-memoization, remove manual `useCallback`/`React.memo` |
| Adopt `<Activity>` for result tabs            | Medium | Keep chart state when switching tabs                       |
| Enable Turbopack FS caching                   | Low    | Faster dev restarts                                        |
| View Transitions for navigation               | Medium | Smooth page transitions                                    |
| `useEffectEvent` adoption                     | Low    | Cleaner effect patterns                                    |
| Upgrade proxy.ts to verify JWT                | Medium | Stronger auth at network boundary                          |

---

## Files Affected (Estimated)

| Category            | Files           | Notes                                          |
| ------------------- | --------------- | ---------------------------------------------- |
| `proxy.ts` rename   | 2-3             | middleware.ts, test, config                    |
| Async API migration | 5-15            | All pages/layouts using params/cookies/headers |
| next.config.ts      | 1               | Turbopack config, removed options              |
| package.json        | 1-2             | Dependencies, lint scripts                     |
| ESLint config       | 1               | Flat config migration                          |
| Test updates        | 3-5             | proxy test, auth E2E, search params mocks      |
| **Total estimate**  | **15-30 files** |                                                |

---

## Decision: When to Execute

**Recommendation: DEFER until V3 is feature-complete.**

Remaining V3 streams: L (Legal), Q (QA), C (Content), Ops (Operations). The migration touches the entire frontend surface area and could destabilize active development. Close the Dependabot PR (#82) for now and revisit post-launch.

---

## Sources

- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16)
- Gemini Planning Personas: Architect, Technologist, QA, Security (2026-02-19)
