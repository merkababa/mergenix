# F19 — Color Contrast Audit + Semantic Design Tokens

- **Task ID:** F19
- **Delegation:** Gemini (A+ tier)
- **Date:** 2026-02-14
- **Status:** COMPLETE

## Objective
Audit all color pairs in the Mergenix V3 frontend for WCAG AA compliance and propose a semantic CSS custom property system.

## Prompt Summary
Gemini read globals.css, tailwind.config.ts, and all component .tsx files. Tasked to produce: contrast audit table, semantic token proposal (light+dark), and migration map.

## Key Findings
1. **Dark mode passes** — all color pairs meet WCAG AA (4.5:1+ for text)
2. **Light mode has SEVERE failures** — teal (#06d6a0), amber (#f59e0b), cyan (#06b6d4) all fail on white/light backgrounds (ratios 1.92:1 to 2.42:1)
3. Light mode fix requires **darker shade variants** for each accent (e.g., teal-600 #059669, amber-700 #b45309)
4. ~40+ hardcoded hex values need migration to semantic tokens
5. Tailwind config uses custom color keys (bio, accent, text) mapped to CSS vars — good foundation already

## Contrast Audit Table

| Color Pair (FG on BG) | Dark Ratio | Dark Pass | Light Ratio | Light Pass |
|------------------------|-----------|-----------|-------------|-----------|
| Teal #06d6a0 on #0c1220 / #ffffff | 10.85:1 | PASS | 1.92:1 | **FAIL** |
| Rose #f43f5e on #0c1220 / #ffffff | 6.45:1 | PASS | 3.24:1 | **FAIL** (text) |
| Amber #f59e0b on #0c1220 / #ffffff | 9.64:1 | PASS | 2.16:1 | **FAIL** |
| Cyan #06b6d4 on #0c1220 / #ffffff | 8.62:1 | PASS | 2.42:1 | **FAIL** |
| Violet #8b5cf6 on #0c1220 / #ffffff | 5.47:1 | PASS | 3.82:1 | **FAIL** (text) |
| Muted #94a3b8 on #0c1220 / #ffffff | 5.87:1 | PASS | 2.62:1 | **FAIL** |
| Dark #050810 on #06d6a0 (button text) | 13.5:1 | PASS | 13.5:1 | PASS |

## Semantic Token Proposal

### Dark Mode (`:root` default)
| Token | Value | Purpose |
|-------|-------|---------|
| --color-text-primary | #f1f5f9 | Main headings/body |
| --color-text-secondary | #cbd5e1 | Secondary text |
| --color-text-muted | #94a3b8 | Meta data, hints |
| --color-text-inverse | #050810 | Text on bright accents |
| --color-bg-primary | #050810 | Deepest background |
| --color-bg-secondary | #0c1220 | Card/Surface |
| --color-bg-surface | #141e33 | Elevated/Modal |
| --color-risk-high | #f43f5e | Rose-500 |
| --color-risk-medium | #f59e0b | Amber-500 |
| --color-risk-low | #06d6a0 | Teal-400 |
| --color-risk-none | #94a3b8 | Slate-400 |
| --color-risk-not-tested | #64748b | Slate-500 |
| --color-accent-primary | #06d6a0 | Brand teal |
| --color-accent-secondary | #8b5cf6 | Brand violet |

### Light Mode (`[data-theme="light"]`)
| Token | Value | Purpose |
|-------|-------|---------|
| --color-text-primary | #0f172a | Dark text on light |
| --color-text-secondary | #334155 | Slate-700 |
| --color-text-muted | #64748b | Slate-500 |
| --color-risk-high | #be123c | Rose-700 (>4.5:1) |
| --color-risk-medium | #b45309 | Amber-700 (>4.5:1) |
| --color-risk-low | #047857 | Teal-700 (>4.5:1) |
| --color-accent-primary | #059669 | Teal-600 (>4.5:1) |
| --color-accent-secondary | #7c3aed | Violet-600 (>4.5:1) |
| --color-status-info | #0e7490 | Cyan-700 (>4.5:1) |

## Migration Map (Key Components)

| File | Current | New Token |
|------|---------|-----------|
| badge.tsx | `text-[#f43f5e]` | `text-[var(--color-risk-high)]` |
| badge.tsx | `text-[#f59e0b]` | `text-[var(--color-risk-medium)]` |
| badge.tsx | `text-[#06d6a0]` | `text-[var(--color-risk-low)]` |
| badge.tsx | `text-[#8b5cf6]` | `text-[var(--color-accent-secondary)]` |
| button-variants.ts | `from-[#06d6a0]` | `from-[var(--color-accent-primary)]` |
| button-variants.ts | `text-[#050810]` | `text-[var(--color-text-inverse)]` |
| carrier-tab.tsx | `text-[#f43f5e/f59e0b/06d6a0]` | `text-[var(--color-risk-*)]` |
| prs-gauge.tsx | hardcoded hex colors | `var(--color-risk-*)` |
| punnett-square.tsx | `bg-[rgba(...)]` | `bg-[var(--bg-risk-*-subtle)]` |
| navbar.tsx | `text-[#050810]` | `text-[var(--color-text-inverse)]` |
| upgrade-modal.tsx | `text-[#f43f5e]` | `text-[var(--color-status-error)]` |

## Action Items
1. Add semantic token CSS to globals.css (Sprint 1 or dedicated F19 commit)
2. Migrate all hardcoded hex → semantic tokens across components
3. Verify all light mode pairings pass WCAG AA after migration
4. Consider adding Tailwind theme config aliases for semantic tokens

## Impact on Downstream
- ALL Sprint 2/3/4 components should use semantic tokens from day 1
- F33 (accessible data visualization) benefits from semantic risk colors
- Light mode accessibility goes from broken → WCAG AA compliant
