# Tailwind CSS 3.4 → 4.2 Migration Plan

**Created:** 2026-03-04
**Status:** Planned (not started)
**Branch:** `refactor/tailwind-v4-migration` (not yet created)

---

## Current State Summary

| Item               | Value                                                                              |
| ------------------ | ---------------------------------------------------------------------------------- |
| Current version    | `^3.4.0`                                                                           |
| Target version     | `4.2.0` (latest stable, released 2026-02-18)                                       |
| Config             | `apps/web/tailwind.config.ts` (TypeScript)                                         |
| PostCSS            | `tailwindcss` + `autoprefixer`                                                     |
| CSS entry          | `apps/web/app/globals.css` (1,059 lines)                                           |
| CSS variables      | 131 custom properties                                                              |
| Files with classes | 132 files                                                                          |
| Custom animations  | 11 in config + duplicates in CSS                                                   |
| Custom colors      | 13+ theme extensions (bio, accent, text-dark, text-light, day, day-accent)         |
| UI components      | 10 custom CVA-based (no shadcn/ui)                                                 |
| `cn()` usage       | 70 occurrences across 36 files                                                     |
| Arbitrary values   | 200+ instances                                                                     |
| Dark mode          | `selector` strategy with `[data-theme="dark"]`                                     |
| Plugins            | None (@tailwindcss/\*) — vanilla Tailwind                                          |
| PostCSS plugins    | tailwindcss, autoprefixer                                                          |
| Other TW deps      | tailwind-merge ^2.6.0, clsx ^2.1.1, CVA ^0.7.1, prettier-plugin-tailwindcss ^0.6.9 |

---

## Architecture Notes

### Design System

- **Bioluminescent Laboratory** (dark) + **Daylight Laboratory** (light)
- Custom color palette with CSS variables as source of truth
- All 10 UI components are custom-built with CVA (not shadcn/ui)
- globals.css is the single source of truth for custom utilities (`.glass`, `.glow-*`, `.text-fluid-*`)

### Theme Config (tailwind.config.ts)

- **Custom Colors (13+):** `bio.{deep, surface, elevated, glass}`, `accent.{teal, violet, cyan, amber, rose}`, `text-dark.*`, `text-light.*`, `day.*`, `day-accent.*`
- **Border Radius (4):** `glass: 20px`, `card: 18px`, `btn: 14px`, `pill: 9999px`
- **Box Shadows (7):** `glow`, `glow-strong`, `glow-violet`, `ambient`, `elevated`, `glass-border`, `light-ambient`, `light-elevated`
- **Backdrop Blur (2):** `glass: 16px`, `glass-strong: 20px`
- **Background Images (8):** Gradients: `gradient-app`, `gradient-app-light`, `gradient-teal`, `gradient-teal-cyan`, `gradient-violet`, `gradient-rainbow-bar`, `gradient-cta`, `gradient-card`, `gradient-card-light`
- **Keyframes (11):** `helixFloat`, `gradientShift`, `biolumPulse`, `shimmer`, `cardReveal`, `subtleScan`, `borderRainbow`, `spinSlow`, `scaleIn`, `slideInLeft`, `slideInRight`, `float`
- **Animations (11):** Matching keyframes with durations and easing

### globals.css Structure (1,059 lines)

- Lines 1-3: `@tailwind base/components/utilities`
- 131 CSS custom property declarations in `:root` and `[data-theme="light"]`
- 20+ `@keyframes` definitions (some duplicate config)
- 40+ custom utility classes in `@layer components`
- High-contrast mode support (`[data-contrast="high"]`)
- WCAG accessibility overlays (touch targets, reflow at 320px, view transitions)
- `@layer base`: CSS resets, global typography, font assignments, noise texture overlay
- `@layer components`: `.glass` variants, `.glow-*`, `.text-fluid-*`, `.section-glow-*`, `.gradient-text*`, GlassCard micro-interactions, utility patterns

### Content Paths (current)

```typescript
content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'];
```

### Dark Mode (current)

- Strategy: `selector` with custom data attribute `[data-theme="dark"]`
- Default: Light mode (inverted from typical Tailwind pattern)
- next-themes ^0.4.4 used for theme persistence

### Fonts (next/font)

- `--font-lexend`, `--font-sora`, `--font-jetbrains`

---

## Breaking Changes Reference (v3.4 → v4.x)

### Import System

```css
/* v3 — REMOVED */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* v4 */
@import 'tailwindcss';
```

### Deprecated Utilities Removed

| Removed (v3)            | Replacement (v4)                  |
| ----------------------- | --------------------------------- |
| `bg-opacity-*`          | `bg-black/50` (opacity modifiers) |
| `text-opacity-*`        | `text-black/50`                   |
| `border-opacity-*`      | `border-black/50`                 |
| `divide-opacity-*`      | `divide-black/50`                 |
| `ring-opacity-*`        | `ring-black/50`                   |
| `placeholder-opacity-*` | `placeholder-black/50`            |
| `flex-shrink-*`         | `shrink-*`                        |
| `flex-grow-*`           | `grow-*`                          |
| `overflow-ellipsis`     | `text-ellipsis`                   |
| `decoration-slice`      | `box-decoration-slice`            |
| `decoration-clone`      | `box-decoration-clone`            |

### Renamed Utilities (Scale Shift)

| v3 class                | v4 class                        |
| ----------------------- | ------------------------------- |
| `shadow-sm`             | `shadow-xs`                     |
| `shadow` (default)      | `shadow-sm`                     |
| `drop-shadow-sm`        | `drop-shadow-xs`                |
| `drop-shadow`           | `drop-shadow-sm`                |
| `blur-sm`               | `blur-xs`                       |
| `blur`                  | `blur-sm`                       |
| `backdrop-blur-sm`      | `backdrop-blur-xs`              |
| `backdrop-blur`         | `backdrop-blur-sm`              |
| `rounded-sm`            | `rounded-xs`                    |
| `rounded` (default)     | `rounded-sm`                    |
| `outline-none`          | `outline-hidden`                |
| `ring` (3px default)    | `ring-3` (default ring now 1px) |
| `bg-gradient-to-r` etc. | `bg-linear-to-r` etc.           |

### Default Value Changes

| Property            | v3 default | v4 default                        |
| ------------------- | ---------- | --------------------------------- |
| `border-color`      | `gray-200` | `currentColor`                    |
| `ring-width`        | 3px        | 1px                               |
| `ring-color`        | `blue-500` | `currentColor`                    |
| `placeholder-color` | `gray-400` | current text color at 50% opacity |
| `button` cursor     | `pointer`  | `default` (browser default)       |

### Syntax Changes

| Change                   | v3                               | v4                                              |
| ------------------------ | -------------------------------- | ----------------------------------------------- |
| `!important` modifier    | `!flex`                          | `flex!`                                         |
| Variant stacking         | `first:*:pt-0` (right-to-left)   | `*:first:pt-0` (left-to-right)                  |
| CSS variable arbitrary   | `bg-[--var]`                     | `bg-(--var)`                                    |
| Grid commas in arbitrary | `grid-cols-[max-content,auto]`   | `grid-cols-[max-content_auto]`                  |
| Prefix syntax            | `tw-flex`                        | `tw:flex`                                       |
| Transform none           | `transform-none`                 | `scale-none` / `rotate-none` / `translate-none` |
| Transition transform     | `transition-[opacity,transform]` | `transition-[opacity,scale]`                    |

### Behavioral Changes

- **Hover** scoped to pointer devices (`@media (hover: hover)`)
- **Gradient** values persist across variants (use `via-none` to clear)
- **Space-between/divide** selector changed from `> :not([hidden]) ~ :not([hidden])` to `> :not(:last-child)`
- **Transform** uses individual CSS properties (`rotate`, `scale`, `translate`) not composite `transform`
- **`outline-none`** now sets `outline-style: none` (was `2px solid transparent`)
- **`transition`/`transition-colors`** now includes `outline-color`

### Removed Config Options

- `corePlugins` — no v4 equivalent
- `safelist` — use `@source inline("class1 class2")` instead
- `separator` — no v4 equivalent
- `resolveConfig` JS API — use `getComputedStyle(document.documentElement).getPropertyValue()` instead

### Browser Requirements

- Chrome 111+, Safari 16.4+, Firefox 128+

### Preprocessor Support

- **Sass, Less, Stylus NOT supported in v4** (Lightning CSS replaces them)

---

## Migration Phases

### Phase 1: Pre-Migration Prep

1. Create branch `refactor/tailwind-v4-migration`
2. Verify Node.js ≥ 20 (required by upgrade tool)
3. Run `pnpm build` and confirm green
4. Take visual screenshots of key pages (home, analysis, auth, pricing, account)
5. Run full test suite as baseline

### Phase 2: Run Official Upgrade Tool

```bash
npx @tailwindcss/upgrade
```

**Auto-migrates (~90%):**

- Package version bumps in `package.json`
- `postcss.config.js` → `postcss.config.mjs` with `@tailwindcss/postcss`
- Removes `autoprefixer`
- `@tailwind base/components/utilities` → `@import "tailwindcss"`
- Converts `tailwind.config.ts` theme → `@theme {}` in CSS
- Renames deprecated utilities across all 132 files

**Cannot auto-migrate (manual work):**

- Inline JavaScript plugin functions
- Dynamic theme functions (`theme => ({ ... })`)
- Complex screen objects
- `corePlugins`/`safelist`/`separator` (no v4 equivalent)

### Phase 3: Manual Migration

#### 3A. PostCSS Config

```js
// FROM: postcss.config.js
{ plugins: { tailwindcss: {}, autoprefixer: {} } }

// TO: postcss.config.mjs
export default { plugins: { "@tailwindcss/postcss": {} } }
```

#### 3B. Package Changes

```
REMOVE: autoprefixer, postcss-import (if present)
ADD:    @tailwindcss/postcss
UPDATE: tailwindcss → 4.2.x
UPDATE: prettier-plugin-tailwindcss → latest v4-compat
CHECK:  tailwind-merge → must support v4 class names
```

#### 3C. CSS Entry Point (`globals.css`)

Replace directives:

```css
/* FROM */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* TO */
@import 'tailwindcss';
```

#### 3D. Theme Migration (`tailwind.config.ts` → `@theme {}`)

Move all custom theme extensions to `@theme {}` in globals.css:

```css
@theme {
  /* Colors */
  --color-bio-deep: /* value */;
  --color-bio-surface: /* value */;
  --color-bio-elevated: /* value */;
  --color-bio-glass: /* value */;
  --color-accent-teal: /* value */;
  --color-accent-violet: /* value */;
  --color-accent-cyan: /* value */;
  --color-accent-amber: /* value */;
  --color-accent-rose: /* value */;
  /* ... all remaining colors ... */

  /* Border Radius */
  --radius-glass: 20px;
  --radius-card: 18px;
  --radius-btn: 14px;
  --radius-pill: 9999px;

  /* Shadows */
  --shadow-glow: /* value */;
  --shadow-glow-strong: /* value */;
  --shadow-glow-violet: /* value */;
  --shadow-ambient: /* value */;
  --shadow-elevated: /* value */;
  --shadow-glass-border: /* value */;
  --shadow-light-ambient: /* value */;
  --shadow-light-elevated: /* value */;

  /* Backdrop Blur */
  --backdrop-blur-glass: 16px;
  --backdrop-blur-glass-strong: 20px;

  /* Background Images (Gradients) */
  --background-image-gradient-app: /* value */;
  /* ... all 8 gradients ... */

  /* Animations */
  --animate-helix-float: helix-float 2.2s ease-in-out infinite;
  --animate-gradient-shift: gradient-shift 6s ease infinite;
  --animate-biolum-pulse: biolum-pulse 5s ease-in-out infinite;
  --animate-shimmer: shimmer 1.5s linear infinite;
  --animate-card-reveal: card-reveal 0.5s ease-out;
  --animate-subtle-scan: subtle-scan 30s linear infinite;
  --animate-border-rainbow: border-rainbow 3s ease infinite;
  --animate-spin-slow: spin-slow 3s linear infinite;
  --animate-scale-in: scale-in 0.4s ease-out;
  --animate-slide-in-left: slide-in-left 0.5s ease-out;
  --animate-slide-in-right: slide-in-right 0.5s ease-out;
  --animate-float: float 3s ease-in-out infinite;

  @keyframes helix-float {
    /* ... */
  }
  @keyframes gradient-shift {
    /* ... */
  }
  /* ... all keyframes ... */
}
```

#### 3E. Dark Mode Config

```css
/* FROM: tailwind.config.ts darkMode: ['selector', '[data-theme="dark"]'] */
/* TO: in globals.css */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

#### 3F. Font Integration (next/font)

```css
@theme inline {
  --font-sans: var(--font-lexend);
  --font-display: var(--font-sora);
  --font-mono: var(--font-jetbrains);
}
```

#### 3G. Content Detection

Remove `content: [...]` from config. V4 auto-detects via `.gitignore`.
For the monorepo, add explicit sources if needed:

```css
@source '../../packages/shared-types';
@source '../../packages/genetics-engine';
```

#### 3H. Custom Layers → v4 Patterns

- `@layer components { .glass { ... } }` → stays as `@layer base` or becomes `@utility` blocks
- `@layer utilities { ... }` → `@utility name { ... }` blocks
- Evaluate which custom classes should become `@utility` vs remain in `@layer base`

#### 3I. Behavioral Defaults to Restore

```css
@layer base {
  /* Restore v3 border color default */
  *,
  ::after,
  ::before,
  ::backdrop,
  ::file-selector-button {
    border-color: var(--color-gray-200, currentColor);
  }

  /* Restore v3 button cursor */
  button:not(:disabled),
  [role='button']:not(:disabled) {
    cursor: pointer;
  }
}
```

### Phase 4: Class Renames Verification (132 files)

The upgrade tool handles most, but grep and verify:

| Pattern to search             | Expected v4 replacement | Priority                    |
| ----------------------------- | ----------------------- | --------------------------- |
| `shadow-sm` (not `shadow-xs`) | `shadow-xs`             | High                        |
| bare `shadow` class           | `shadow-sm`             | High                        |
| bare `rounded` class          | `rounded-sm`            | High                        |
| `rounded-sm`                  | `rounded-xs`            | Medium                      |
| `outline-none`                | `outline-hidden`        | Medium                      |
| bare `ring` class             | `ring-3`                | Low                         |
| bare `blur` class             | `blur-sm`               | Low                         |
| `!` prefix (e.g. `!flex`)     | suffix (e.g. `flex!`)   | Grep needed                 |
| `bg-[--` pattern              | `bg-(--`                | Check 200+ arbitrary values |
| `bg-gradient-to-`             | `bg-linear-to-`         | Grep needed                 |

### Phase 5: Special Concerns for This Codebase

1. **131 CSS custom properties** — Already v4-compatible (native CSS variables). No changes needed for the variables themselves, only for how they're referenced in Tailwind config.

2. **`[[data-theme='light']_&]:` variant pattern** — Verify this arbitrary variant syntax still works in v4. May need `@custom-variant` instead.

3. **`tailwind-merge` compatibility** — Verify `tailwind-merge@^2.6.0` supports v4 class names (renamed classes like `shadow-xs`, `rounded-xs`). May need update.

4. **`class-variance-authority`** — No changes needed; CVA is framework-agnostic.

5. **`prettier-plugin-tailwindcss`** — Must update to v4-compatible version.

6. **Three.js / React Three Fiber** — No Tailwind interaction, safe.

7. **View Transitions API** — CSS feature, not Tailwind-dependent, safe.

8. **High-contrast mode** (`[data-contrast="high"]`) — Custom CSS, not affected.

9. **Keyframe deduplication** — Currently defined in BOTH config and globals.css. Migration is an opportunity to consolidate into `@theme {}` only.

10. **next-themes** — Still works with v4. Keep `attribute="class"` on `ThemeProvider`, update dark variant with `@custom-variant`.

### Phase 6: Verification

1. `pnpm typecheck` — zero errors
2. `pnpm lint` — no new warnings
3. `pnpm test` — all 3,090 Vitest tests pass
4. `pnpm build` — clean build
5. Visual comparison of all key pages (home, analysis, auth, pricing, account)
6. Dark/light mode toggle test
7. High-contrast mode test
8. Reduced-motion preference test
9. Mobile responsive check (320px reflow)

### Phase 7: Cleanup

1. Delete `tailwind.config.ts` if fully migrated to CSS-first (or keep with `@config` reference if any JS-only features remain)
2. Remove unused packages (`autoprefixer`, `postcss-import`)
3. Deduplicate keyframes (consolidate into `@theme {}` only)
4. Update documentation referencing old config

---

## Risk Assessment

| Risk                                                     | Severity   | Mitigation                                            |
| -------------------------------------------------------- | ---------- | ----------------------------------------------------- |
| Shadow/rounded scale shift breaks visual design          | **High**   | Screenshot comparison before/after                    |
| `tailwind-merge` doesn't recognize v4 classes            | **Medium** | Check twMerge version compatibility, update if needed |
| Monorepo content auto-detection misses packages          | **Medium** | Add explicit `@source` directives                     |
| Next.js 15 + Turbopack + TW4 issues                      | **Medium** | Use PostCSS path, avoid Turbopack for now             |
| `prettier-plugin-tailwindcss` incompatibility            | **Low**    | Update to latest version                              |
| 1,059-line globals.css becomes unwieldy with `@theme`    | **Low**    | Consider splitting into partials with `@import`       |
| `[[data-theme='light']_&]:` variant breaks               | **Medium** | Test early, convert to `@custom-variant` if needed    |
| Browser compat (Chrome 111+, Safari 16.4+, Firefox 128+) | **Low**    | Our target audience uses modern browsers              |

## Estimated Scope

- **132 files** touched by class renames
- **1 config file** to migrate or delete
- **1 CSS entry point** significantly restructured
- **1-2 PostCSS configs** updated
- **4-6 packages** added/removed/updated
- **Reviewers:** Architect + Code Reviewer + Designer (UI visual regression)

---

## Key Resources

- [Official Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [Tailwind v4.0 Blog Post](https://tailwindcss.com/blog/tailwindcss-v4)
- [v4 Theme Docs](https://tailwindcss.com/docs/theme)
- [v4 Dark Mode Docs](https://tailwindcss.com/docs/dark-mode)
- [v4 Content Detection](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [Next.js 15 Install Guide](https://tailwindcss.com/docs/guides/nextjs)
- [GitHub v4.2.0 Release](https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.2.0)
- [Monorepo Auto-Detection Issue](https://github.com/tailwindlabs/tailwindcss/issues/13136)
- [Next.js Turbopack + TW4 Issue](https://github.com/vercel/next.js/issues/71923)
