# Design Overhaul Plan — "Make It Pop" for 2026

**Created:** 2026-03-02
**Goal:** Elevate Mergenix from B-grade to A+ — feel like a $50M biotech startup
**Current Grade:** B (solid engineering, dated visual design)
**Target Grade:** A+ (Linear meets 23andMe)

---

## Executive Summary

The review identified 20 improvements across 6 areas. The core problem: **the site has one visual pattern (glass card + fadeUp) repeated everywhere, with no data visualization despite being a data-rich product.** The fix is layout variety, animation vocabulary, interactive hero, and actual data viz.

---

## Sprint Plan (4 Sprints)

### Sprint D1 — Design System Foundation (3-4 days)
*"Lay the groundwork so every subsequent sprint benefits"*

| Task | Files | Effort | Why First |
|------|-------|--------|-----------|
| D1.1 Fluid typography system | `globals.css`, `tailwind.config.ts` | Low | Every page benefits immediately |
| D1.2 Scroll animation library | `components/ui/scroll-reveal.tsx` | Medium | Needed by all page improvements |
| D1.3 GlassCard evolution | `components/ui/glass-card.tsx` | Medium | Used on every page |
| D1.4 Section color narrative | `globals.css` | Low | Background system for all pages |
| D1.5 Card micro-interactions | `glass-card.tsx`, `pricing-card.tsx` | Low | Quick polish win |

**D1.1 — Fluid Typography**
- Replace fixed `text-4xl md:text-6xl` with CSS `clamp()` in globals.css
- Hero h1: `clamp(2.25rem, 5vw + 1rem, 4.5rem)`
- Section h2: `clamp(1.5rem, 3vw + 0.5rem, 2.5rem)`
- Body: `clamp(0.875rem, 1vw + 0.5rem, 1.125rem)`
- Stats/numbers: `clamp(2rem, 4vw + 0.5rem, 3.5rem)`

**D1.2 — Scroll Animation Library**
- Extend `ScrollReveal` with new `type` variants:
  - `"fade"` (existing) — opacity + translate
  - `"blur"` — blur(10px) → blur(0)
  - `"clip"` — clip-path wipe from bottom/left/right
  - `"scale"` — scale(0.9) → scale(1) + opacity
  - `"rotate"` — slight rotation in
- Add `useScrollProgress` hook wrapping `useScroll` + `useTransform`
- Add `will-change: transform, opacity` to animated elements

**D1.3 — GlassCard Evolution**
- Add new variants: `"frosted"` (backdrop-saturate 180%), `"aurora"` (shifting gradient bg)
- Add `spotlight` hover mode — mouse-tracking inner light (CSS `radial-gradient` at pointer position)
- Add subtle noise texture overlay option (tiny SVG noise via CSS `background-image`)
- Gradient border sweep on hover (animated `background-position` on pseudo-element)

**D1.4 — Section Color Narrative**
- Homepage glow orbs: increase to 600-800px, 0.12-0.15 opacity
- Color zones: teal hero → violet midpage → cyan pricing → teal CTA
- Add gradient wave dividers between sections (SVG or `repeating-linear-gradient`)

**D1.5 — Card Micro-interactions**
- Icon rotation/bounce on card hover
- Badge slide-in on hover
- Feature list items stagger-reveal on card entry

---

### Sprint D2 — Homepage & Hero Transformation (4-5 days)
*"The hero is the first 3 seconds — make them count"*

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| D2.1 Interactive DNA helix hero | New: `components/marketing/dna-helix-3d.tsx` | High | Transformative |
| D2.2 Split hero layout | `home-content.tsx` | Medium | High |
| D2.3 Bento grid features section | `home-content.tsx` | Medium | High |
| D2.4 "How It Works" scroll timeline | `home-content.tsx` | Medium | High |
| D2.5 Social proof section | `home-content.tsx` | Medium | High |
| D2.6 Product demo/screenshot section | `home-content.tsx` | Medium | Medium |

**D2.1 — Interactive 3D DNA Helix**
- Options (choose one):
  - **Option A (Premium):** React Three Fiber / Three.js — actual 3D double helix with mouse parallax tilt. Dynamic import to avoid bundle bloat.
  - **Option B (Lightweight):** Pure CSS 3D using `perspective`, `rotateX`, paired dots with connecting gradient rungs, staggered animation delays. No JS dependencies.
  - **Option C (Middle ground):** High-quality Lottie animation — pre-rendered 3D helix. ~50KB, zero runtime cost.
- Replaces current bouncing dots in `helix-animation.tsx`
- Must respond to `prefers-reduced-motion`

**D2.2 — Split Hero Layout**
- Desktop: `grid-cols-1 lg:grid-cols-2` — text left, helix right
- Mobile: helix above text at reduced size
- Move trust badges beneath CTA buttons
- Add animated stat counters inline (currently in separate section)

**D2.3 — Bento Grid Features**
- Replace uniform `sm:grid-cols-2` with asymmetric bento:
  - First card (673+ diseases): `col-span-2` with embedded mini chart + "Browse diseases" link
  - Remaining 3: `1x3` column
- Each card gets a distinct animated illustration (not just Lucide icons in colored boxes)

**D2.4 — "How It Works" Scroll Timeline**
- Vertical connecting line that draws with scroll (`useScroll` + `useTransform`)
- Steps reveal with alternating direction (left, right, left)
- Small animated illustrations per step (upload, analyze, report)

**D2.5 — Social Proof**
- Position after hero or privacy section
- Counter: "X analyses completed"
- 3 testimonial cards (carousel or static grid)
- Optional: press/partner logo marquee (infinite scroll)

**D2.6 — Product Demo Section**
- Full-bleed section between How It Works and Features
- Screenshot/mockup of analysis dashboard
- Perspective transform: `perspective(1200px) rotateY(-5deg)`
- Glassmorphic UI elements animate in on scroll

---

### Sprint D3 — Sample Report & Data Visualization (4-5 days)
*"This converts visitors to users — it must be stunning"*

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| D3.1 Trait probability bars | `sample-report-content.tsx` | Medium | High |
| D3.2 PRS gauge/arc charts | `sample-report-content.tsx`, `prs-gauge.tsx` | Medium | High |
| D3.3 Carrier risk card differentiation | `sample-report-content.tsx` | Low | Medium-High |
| D3.4 Sample Punnett square visualization | `sample-report-content.tsx` | Medium | Medium |
| D3.5 Sticky sidebar navigation | `sample-report-content.tsx` | Medium | Medium |
| D3.6 Interactive tier-gate overlay | `sample-report-content.tsx` | Medium | Medium |
| D3.7 Fix CTA to use buttonVariants | `sample-report-content.tsx` | Low | Low |

**D3.1 — Trait Probability Bars**
- Replace text "Blue Eyes: 25%" with horizontal stacked color bars
- CSS-only: `div` with gradient `background` and `width: X%`
- Color mapped to trait category (eye color = blue/green/brown palette)
- Animate bar width on scroll entry

**D3.2 — PRS Gauge Charts**
- Population distribution arc showing user's percentile position
- SVG arc with `stroke-dasharray` + `stroke-dashoffset` animation
- Color gradient from green (low risk) through amber to red (high risk)
- Tick marks at 25th, 50th, 75th percentile

**D3.3 — Risk Card Differentiation**
- High-risk: rose-tinted left border + subtle rose background gradient
- Carrier-detected: amber tinting
- Low-risk: standard teal subtle glass
- Apply at the card level, not just text labels

**D3.4 — Sample Punnett Square**
- 2x2 CSS grid with allele labels
- Probability percentages in each cell
- Color-coded cells (affected vs carrier vs clear)
- Show for one representative carrier condition

**D3.5 — Sticky Sidebar Navigation**
- Desktop: sticky left sidebar with section links + scroll-spy highlighting
- Mobile: horizontal scroll tab bar at top
- Use Intersection Observer for active section detection

**D3.6 — Interactive Tier-Gate Overlay**
- Show 3 conditions fully, blur/overlay the rest
- "Upgrade to Premium to unlock 500+ diseases" CTA on overlay
- Demonstrates tier gating as a feature, not just a blocker

---

### Sprint D4 — Secondary Pages & Polish (3-4 days)
*"Every page reinforces the premium brand"*

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| D4.1 "Most Popular" pricing card dominant | `pricing-card.tsx`, `products-content.tsx` | Low | Medium |
| D4.2 Comparison table enhancement | `products-content.tsx` | Low | Medium |
| D4.3 About page: team section + science diagrams | `about-content.tsx` | Medium | Medium |
| D4.4 About page: count-up animation | `about-content.tsx` | Low | Low |
| D4.5 Custom SVG logo mark | `navbar.tsx` | Low | Low |
| D4.6 Footer brand moment | `footer.tsx` | Low | Low |
| D4.7 Mobile menu full-screen overlay | `navbar.tsx` | Medium | Medium |
| D4.8 Gradient text audit (reduce overuse) | All pages | Low | Medium |
| D4.9 View Transitions API | `layout.tsx` | Medium | Medium |

**D4.1 — Dominant Pricing Card**
- Scale "Most Popular" to 1.05x
- Gradient background instead of same glass as others
- Persistent subtle glow pulse animation
- Increase violet accent intensity

**D4.3 — About Page Team + Science**
- Team section with circular photo frames + teal glow borders
- Inline SVGs in "Our Science" cards:
  - Mini Punnett square in Mendelian Inheritance card
  - Simplified Manhattan plot in PRS card
  - ClinVar data snippet in SNP Database card
- Scroll-triggered draw-on animations for SVGs

**D4.8 — Gradient Text Audit**
- Currently on 6+ page h2s — dilutes impact
- Reserve for: homepage h1 only, and one CTA per page max
- Replace others with solid white/cream text with subtle text-shadow

**D4.9 — View Transitions**
- Implement Next.js View Transitions API for page navigation
- Crossfade between pages
- Shared element transitions for navbar/layout elements

---

## Implementation Strategy

### File Ownership (per sprint)

| Sprint | Owner | Key Files |
|--------|-------|-----------|
| D1 | Executor A | `globals.css`, `tailwind.config.ts`, `glass-card.tsx`, `scroll-reveal.tsx` |
| D2 | Executor B (hero) + Executor C (sections) | `home-content.tsx`, new `dna-helix-3d.tsx` |
| D3 | Executor D | `sample-report-content.tsx`, `prs-gauge.tsx` |
| D4 | Executor E (products/about) + Executor F (layout) | `products-content.tsx`, `about-content.tsx`, `navbar.tsx`, `footer.tsx` |

### Dependencies
```
D1 (foundation) → D2, D3, D4 (all depend on D1's design tokens)
D2 and D3 are independent (can parallel after D1)
D4 depends on D1 only
```

### Risk Mitigation
- **Three.js bundle size:** Use dynamic import + Suspense fallback. Measure with `next/bundle-analyzer`.
- **Animation performance:** Test on low-end devices. All animations must respect `prefers-reduced-motion`.
- **Accessibility regression:** Run axe-core after every sprint. Keep ARIA, heading hierarchy, focus management intact.
- **Mobile regression:** Test at 320px, 375px, 768px, 1024px, 1440px after every sprint.

### Review Strategy (per sprint)
- **Reviewers:** Architect + Designer (mandatory), + Code Reviewer
- **Skip:** Scientist, Legal, Security, Ethics, Business (pure visual changes, no logic)
- **Exception:** If Sprint D3 tier-gate overlay changes business logic → add Business reviewer

---

## Estimated Effort

| Sprint | Days | Executor Count |
|--------|------|----------------|
| D1 — Foundation | 3-4 | 1 |
| D2 — Homepage | 4-5 | 2 (parallel) |
| D3 — Sample Report | 4-5 | 1 |
| D4 — Secondary + Polish | 3-4 | 2 (parallel) |
| **Total** | **~15-18 days** | |

---

## Decision Points (Need User Input)

1. **Hero helix approach:** Three.js 3D (premium, ~150KB) vs CSS 3D (lightweight, 0KB) vs Lottie (middle, ~50KB)?
2. **Social proof:** Use real/placeholder data? Testimonials need content.
3. **Team section:** Real photos/bios or skip for now?
4. **Tier recommender quiz on products page:** Build now or defer?
5. **View Transitions:** Experimental API — ship it or wait for broader support?
