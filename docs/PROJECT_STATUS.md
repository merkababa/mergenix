# Mergenix — Project Status

**Last Updated:** 2026-02-09
**Version:** 3.0.0-alpha (V3 Rewrite — Phase 4 Analysis UI merged)
**Branch:** rewrite/main

---

## Platform Overview

Mergenix is a genetic offspring analysis platform that compares two parents' DNA to predict offspring disease risk, traits, pharmacogenomics, polygenic risk scores, and genetic counseling recommendations. The V3 rewrite moves from Streamlit to a modern Next.js + FastAPI monorepo with client-side Web Worker genetics analysis.

### Key Capabilities
- **Disease Screening:** 2,715 genetic diseases across three inheritance models (AR, AD, X-linked)
- **Trait Prediction:** 79 trait SNPs predicted using Punnett square logic
- **Pharmacogenomics (PGx):** CPIC-guided analysis across 12 genes with star allele nomenclature
- **Polygenic Risk Scores (PRS):** 10 complex disease conditions with GWAS effect weights
- **Genetic Counseling:** Triage logic with urgency levels, specialty inference, referral letters
- **Ethnicity Adjustment:** Bayesian posterior calculation with gnomAD v4.1 data (9 populations)
- **File Format Support:** 23andMe, AncestryDNA, MyHeritage, VCF
- **Pricing Model:** One-time payment (no subscriptions), three tiers (Free/Premium/Pro)
- **Privacy:** All analysis runs client-side in Web Workers — no genetic data sent to servers

### Technology Stack (V3 Rewrite)
- **Frontend:** Next.js 15 + React 19 + Tailwind CSS + Zustand
- **Backend:** FastAPI (Python 3.10+)
- **Genetics Engine:** TypeScript (runs in Web Workers, ~5,500 LOC)
- **Monorepo:** pnpm workspaces + Turborepo
- **Shared Types:** `@mergenix/shared-types` package
- **Testing:** Vitest (514 tests: 366 engine + 148 web)
- **Linting:** ESLint + ruff
- **CI/CD:** GitHub Actions

---

## V3 Rewrite Progress

### Completed Phases

| Phase | Description | PR | Status | Tests |
|-------|-------------|-----|--------|-------|
| Phase 1 | Monorepo scaffolding (Next.js, FastAPI, shared types, CI) | PR #28 | Merged | — |
| Phase 2 | Frontend pages (home, products, about, legal, glossary, disease catalog, auth) | PR #30 | Merged | — |
| Phase 3 | Genetics engine (TypeScript, Web Worker, 11 modules) | PR #31 | **Merged** | 366 |
| Phase 4 | Analysis UI (wire engine into Next.js, 6 result tabs, demo mode) | PR #32 | **Merged** | 148 |

### Phase 4: Analysis UI (Current)

Wire the genetics engine Web Worker into the Next.js frontend. Replaces all static demo content with a working end-to-end analysis flow.

**Key deliverables:**
- Worker shim + `useGeneticsWorker` hook (Web Worker lifecycle, message routing, cancellation)
- Zustand store rewrite with `FullAnalysisResult`, progress tracking, demo mode
- 6 result tab components: Overview, Carrier Risk, Traits, PGx, PRS, Counseling
- Demo data with 23 verified rsIDs (OMIM/ClinVar cross-referenced)
- 3 polish components: TierUpgradePrompt, MedicalDisclaimer, PopulationSelector
- Full ARIA tab navigation with keyboard support
- Tier-gated upgrade prompts in all 6 tabs
- Lazy-loaded demo data via dynamic import

**Review grades (R5, 5 rounds → 6/6 A+):**

| Reviewer | R4 | R5 (Final) | Key Notes |
|----------|----|----|-----------|
| Architect | A- | **A+** | Type derivation, shared constants, zero duplication |
| QA | A- | **A+** | 148 tests, 12 suites, full coverage |
| Scientist | A | **A+** | All rsIDs verified, freckling fixed, dynamic Punnett |
| Technologist | A- | **A+** | useCallback, React.memo, next/dynamic, store selectors |
| Business | B+ | **A+** | Dynamic tier banner, demo CTA, referral teaser, filled buttons |
| Designer | A- | **A+** | ARIA progressbar, sr-only gauge, keyboard tables, heading hierarchy |

**Test coverage (V3):**
- Genetics engine: 366 tests (8 suites)
- Web app: 148 tests (12 suites)
- **Total: 514 tests passing**

### Test Suites (V3 Web)

| Suite | Tests | What it covers |
|-------|-------|----------------|
| `analysis-store.test.ts` | 17 | Store state transitions, demo loading, reset, derived values |
| `use-genetics-worker.test.ts` | 16 | Worker lifecycle, message routing, cancel, file validation |
| `overview-tab.test.tsx` | 13 | Stat cards, metadata, disclaimer, tier upgrade prompts |
| `carrier-tab.test.tsx` | 21 | Search, filter, sort, Punnett squares, X-linked, ARIA expand |
| `traits-tab.test.tsx` | 13 | Grid display, probabilities, confidence, tier upgrade |
| `pgx-tab.test.tsx` | 17 | Gene cards, metabolizer badges, drug tables, categories |
| `prs-tab.test.tsx` | 14 | Gauges, percentiles, ancestry notes, coverage, disclaimer |
| `counseling-tab.test.tsx` | 19 | Urgency, reasons, specialties, referral, NSGC link |
| `medical-disclaimer.test.tsx` | 6 | Compact/full variants, ARIA role/label, custom text |
| `tier-upgrade-prompt.test.tsx` | 5 | Message, button text, /subscription link, aria-hidden |
| `population-selector.test.tsx` | 4 | Options, free disabled, premium enabled, store update |
| `analysis-page.test.tsx` | 8 | Idle/progress/complete states, tabs, error, demo, reset |

---

## Recent Changes — Phase 4: Analysis UI (MERGED — PR #32)

Wire the genetics engine Web Worker into the Next.js frontend. Replaces all static demo content with a working end-to-end analysis flow: file upload → Web Worker parsing → full analysis → typed result rendering across 6 tabs.

### Architecture

```
User uploads 2 DNA files (23andMe/AncestryDNA/MyHeritage/VCF)
    ↓
useGeneticsWorker hook → reads File.text() on main thread
    ↓
Web Worker (genetics.worker.ts shim → @mergenix/genetics-engine)
    ↓  parse → parse_progress → parse_complete
    ↓  analyze → analysis_progress → analysis_complete
    ↓
Zustand store (analysis-store.ts) ← FullAnalysisResult
    ↓
6 result tabs read from store via selectors
    ↓
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Overview │ Carrier  │ Traits   │ PGx      │ PRS      │ Counsel. │
│ 4 stats  │ Search   │ Grid     │ Gene     │ Gauges   │ Urgency  │
│ Metadata │ Filter   │ Probs    │ Drugs    │ Ranges   │ Findings │
│ Disclaim │ Punnett  │ Confid.  │ Metabol. │ Parents  │ Referral │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

### Key Files (30+ new/modified)

| File | LOC | Description |
|------|-----|-------------|
| `apps/web/hooks/use-genetics-worker.ts` | ~150 | Worker lifecycle, message routing, cancel, error handling |
| `apps/web/lib/stores/analysis-store.ts` | ~200 | Zustand store with FullAnalysisResult, progress, demo mode |
| `apps/web/lib/workers/genetics.worker.ts` | ~5 | Thin shim re-exporting engine worker |
| `apps/web/lib/data/demo-results.ts` | ~300 | Static FullAnalysisResult with 23 verified rsIDs |
| `apps/web/app/(app)/analysis/page.tsx` | ~200 | Main page: upload, progress, cancel, results tabs |
| `apps/web/components/genetics/results/overview-tab.tsx` | ~100 | 4 stat cards, metadata, MedicalDisclaimer |
| `apps/web/components/genetics/results/carrier-tab.tsx` | ~250 | Search, filter, sort, Punnett squares, expandable |
| `apps/web/components/genetics/results/traits-tab.tsx` | ~120 | 2-col grid, probabilities, confidence badges |
| `apps/web/components/genetics/results/pgx-tab.tsx` | ~200 | Gene cards, metabolizer badges, drug tables |
| `apps/web/components/genetics/results/prs-tab.tsx` | ~150 | PrsGauge, offspring range, parent details |
| `apps/web/components/genetics/results/counseling-tab.tsx` | ~180 | Urgency header, findings, specialties, referral |
| `apps/web/components/genetics/tier-upgrade-prompt.tsx` | ~50 | Reusable upgrade CTA (Lock icon + message) |
| `apps/web/components/genetics/medical-disclaimer.tsx` | ~60 | Compact/full variants with ARIA role="note" |
| `apps/web/components/genetics/population-selector.tsx` | ~60 | gnomAD population selector with clear option |

### Commits (5)

1. `b90010e` feat: Phase 4 — Analysis UI wiring (Web Worker + store + 6 result tabs)
2. `9664094` fix: R1 review fixes — accuracy, type safety, tests, tier gating, exports
3. `a91a4ba` fix: R2 review fixes — tier gating, error handling, tests, polish
4. `59d44c3` fix: R3 review fixes — demo try/catch, tier-specific carrier copy
5. `22b01bd` fix: R4 review fixes — types, perf, accessibility, business, tests (+31 tests)

---

## Known Issues & Future Work

### V3 Rewrite — Remaining Phases

- [ ] **Phase 5: Auth UI** — Login, register, OAuth, account management pages in Next.js
- [ ] **Phase 6: Payment UI** — Stripe/PayPal integration, subscription management
- [ ] **Phase 7: Backend API** — FastAPI endpoints, database, deployment
- [ ] **Phase 8: Polish & Launch** — E2E tests, performance, production deployment

### Performance Optimizations (from Phase 4 reviews)

- [x] **useCallback for handlers** — All page handlers wrapped in useCallback (R4 fix)
- [x] **React.memo sub-components** — GeneCard and PrsConditionCard memoized (R4 fix)
- [x] **next/dynamic lazy tabs** — All 6 tab components lazy-loaded (R4 fix)
- [ ] **Carrier tab virtualization** — For 2,715 disease results at Pro tier, consider windowed rendering
- [ ] **Worker pool** — Consider SharedWorker for multi-tab scenarios

### Legacy Streamlit App (v1/v2)

The original Streamlit app (Source/, pages/, app.py) remains in the repo for reference. PRs #19-#26 contain improvements to the legacy app. The V3 rewrite (apps/web, apps/api, packages/) is the active development target.

---

## Architecture (V3 Rewrite)

### Monorepo Structure

```
Mergenix/
├── apps/
│   ├── web/                         # Next.js 15 frontend
│   │   ├── app/(app)/               # App routes (analysis, products, about, etc.)
│   │   ├── components/              # React components
│   │   │   ├── ui/                  # Design system (GlassCard, Button, Badge, etc.)
│   │   │   └── genetics/            # Genetics-specific components
│   │   │       ├── results/         # 6 result tab components
│   │   │       ├── file-dropzone.tsx
│   │   │       ├── analysis-progress.tsx
│   │   │       ├── tier-upgrade-prompt.tsx
│   │   │       ├── medical-disclaimer.tsx
│   │   │       └── population-selector.tsx
│   │   ├── hooks/                   # Custom hooks (useGeneticsWorker)
│   │   ├── lib/
│   │   │   ├── stores/              # Zustand stores (analysis, auth)
│   │   │   ├── workers/             # Web Worker shims
│   │   │   └── data/                # Static data (demo results)
│   │   └── __tests__/               # Vitest test suites (117 tests)
│   └── api/                         # FastAPI backend (placeholder)
├── packages/
│   ├── genetics-engine/             # TypeScript genetics engine (~5,500 LOC)
│   │   ├── src/
│   │   │   ├── parser.ts            # Multi-format file parser
│   │   │   ├── carrier.ts           # Carrier risk analysis
│   │   │   ├── traits.ts            # Trait prediction
│   │   │   ├── pgx.ts               # Pharmacogenomics
│   │   │   ├── prs.ts               # Polygenic risk scores
│   │   │   ├── ethnicity.ts         # Ethnicity adjustment
│   │   │   ├── counseling.ts        # Genetic counseling
│   │   │   ├── worker.ts            # Web Worker entry point
│   │   │   └── index.ts             # Barrel exports
│   │   └── __tests__/               # 366 tests (8 suites)
│   ├── shared-types/                # TypeScript types (FullAnalysisResult, etc.)
│   └── genetics-data/               # JSON data files (carrier panel, traits, etc.)
├── CLAUDE.md                        # Project rules
├── PROGRESS.md                      # Task tracking
└── docs/PROJECT_STATUS.md           # THIS FILE
```

### Data Flow (V3)

```
User uploads 2 DNA files → FileDropzone validates format
    ↓
useGeneticsWorker hook reads File.text() (main thread)
    ↓
Web Worker receives file contents + tier + population
    ↓
Parser → {rsid → genotype} map (streaming line iterator)
    ↓
┌─────────────┬──────────┬─────────┬──────────┬──────────┬──────────┐
│ Carrier      │ Traits   │ PGx     │ PRS      │ Ethnicity│ Counsel. │
│ AR/AD/X-link │ Punnett  │ CPIC    │ Z-score  │ Bayesian │ Triage   │
│ 2,715 diseas │ 79 SNPs  │ 12 genes│ 10 conds │ 9 pops   │ referral │
└─────────────┴──────────┴─────────┴──────────┴──────────┴──────────┘
    ↓
FullAnalysisResult → postMessage → Zustand store
    ↓
6 result tabs render from store selectors
```

---

## Project History (Recent PRs)

| PR | Title | Status |
|----|-------|--------|
| #32 | Phase 4: Analysis UI (wire engine + 6 tabs + 148 tests, 6/6 A+) | **Merged** |
| #31 | Phase 3: Genetics Engine (TypeScript, 366 tests, 6/6 A+) | **Merged** |
| #30 | Phase 2: Frontend pages (7 pages, design system) | Merged |
| #28 | Phase 1: Monorepo scaffolding | Merged |
| #26 | Tier 5: Genetic science (ethnicity, PGx, PRS, ClinVar, counseling) | Open |
| #25 | Tier 4: Testing & infrastructure (515 new tests) | Open |
| #24 | Tier 2+3: Performance + frontend/UX (440 tests) | Merged |
| #23 | Tier 1: Security & data integrity (378 tests) | Merged |
| #22 | Tier 0: 6 critical bug fixes | Merged |

---

## Next Steps

1. ~~Create PR for Phase 4~~ → **PR #32 merged** (6/6 A+)
2. ~~Merge PR #31 (Phase 3)~~ → **Merged**
3. **Phase 5: Auth UI** — Login, register, OAuth pages in Next.js
4. **Phase 6: Payment UI** — Stripe/PayPal integration
5. **Phase 7: Backend API** — FastAPI endpoints + database
6. **Phase 8: Polish & Launch** — E2E testing, deployment

---

## Contributors

| Name | Role | Notes |
|------|------|-------|
| kukiz | Developer | Works from work room & living room computers |
| Maayan | Developer / Reviewer | Codes, reviews PRs, uses Claude Code |
| Claude | AI Assistant | Creates PRs for review, pushes PROGRESS.md directly |

---

**Version Control:** All work tracked in git, main branch protected, PRs required for code changes.
