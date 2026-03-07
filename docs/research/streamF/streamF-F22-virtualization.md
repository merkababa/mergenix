# F22 — List Virtualization Component Research

- **Task ID:** F22
- **Delegation:** Gemini (A tier)
- **Date:** 2026-02-14
- **Status:** COMPLETE

## Objective

Evaluate virtualization libraries for rendering 2,697 carrier panel entries with expandable variable-height cards. Select best library and produce prototype.

## Prompt Summary

Gemini read CarrierTab.tsx, types, shared-types, package.json. Compared react-virtuoso vs virtua vs @tanstack/react-virtual.

## Key Findings

1. **react-virtuoso** recommended — best expandable card support, auto-measures dynamic heights, zero-config
2. virtua is smaller (3.2kB vs 10.5kB) but react-virtuoso handles content expansion natively
3. @tanstack/react-virtual requires manual ResizeObserver on every item — too much boilerplate
4. react-virtuoso has `useWindowScroll` mode for global page scrolling (important for mobile)
5. All three support React 19 and Next.js SSR

## Library Comparison

| Feature          | react-virtuoso          | virtua                  | @tanstack/react-virtual       |
| ---------------- | ----------------------- | ----------------------- | ----------------------------- |
| Bundle (gzip)    | ~10.5kB                 | ~3.2kB                  | ~6.5kB                        |
| Variable height  | Excellent (auto)        | Excellent (auto)        | Manual measurement            |
| Expandable cards | Best-in-class           | Great                   | Requires ResizeObserver       |
| ARIA support     | Good (built-in props)   | Basic                   | Complete control (headless)   |
| React 19         | Yes (v4.12+)            | Yes                     | Yes                           |
| SSR/Next.js      | Excellent               | Good                    | Excellent                     |
| Maintenance      | High (v4.18.1 Dec 2025) | High (v0.48.5 Jan 2026) | Very High (v3.13.18 Feb 2026) |

**Winner:** react-virtuoso — best DX for our use case (expandable cards with dynamic content).

## Prototype Summary

Complete VirtualizedCarrierList component provided with:

- react-virtuoso `<Virtuoso>` with `useWindowScroll`
- Search/filter with 300ms debounce
- ARIA attributes (aria-rowcount, aria-setsize, aria-posinset)
- "Skip to end of results" keyboard link
- Empty + loading states
- CarrierTab decomposition (layout → virtualization → presentation)

## Action Items

1. Install react-virtuoso: `pnpm add react-virtuoso -w --filter @mergenix/web`
2. Create VirtualizedCarrierList in Sprint 3 (F39 integration)
3. Refactor CarrierTab to use VirtualizedCarrierList
4. Test with full 2,697-entry dataset on mobile viewport

## Impact on Downstream

- Sprint 1: Library added to dependencies
- Sprint 3 (F39): Virtualized list accessibility integration
- Sprint 3 (F17): Mobile card view for variant tables builds on this
