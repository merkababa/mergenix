# F6 — Global Terminology Rename Mapping

- **Task ID:** F6
- **Delegation:** Gemini (A+ tier)
- **Date:** 2026-02-14
- **Status:** COMPLETE

## Objective
Map all instances of clinically imprecise terminology across the codebase for rename. Identify breaking changes vs safe UI-only renames.

## Prompt Summary
Gemini searched all files in apps/web/, packages/genetics-engine/src/, packages/shared-types/src/, packages/genetics-data/. Mapped 6 term categories: Negative, Positive, Screening, Diagnosis, Test, Normal.

## Key Findings
1. **~60+ instances** found across 4 directories
2. **BREAKING CHANGES** in shared-types: CarrierStatus 'normal'→'typical', RiskLevel 'not_tested'→'not_analyzed', OffspringRisk property normal→typical, MetabolizerStatus 'normal_metabolizer'→'typical_metabolizer', CounselingSpecialty 'carrier_screening'→'carrier_analysis'
3. **"Screening"→"Analysis"** is the highest-volume rename (~40 instances, mostly UI-safe)
4. **"Normal"→"Typical"** touches types, data, and UI — most complex migration
5. **"Negative/Positive"** only found in pgx-panel.json data keys + comments (~14 instances)
6. **"Diagnosis"** correctly excluded — only appears in disclaimers ("does not constitute a medical diagnosis")

## Summary Statistics

| Term | Total | UI | Code | Type | Comment | Data |
|------|-------|-----|------|------|---------|------|
| Negative | ~8 | 0 | 0 | 0 | 2 | 6 |
| Positive | ~6 | 0 | 0 | 0 | 0 | 6 |
| Screening | ~40 | 25 | 2 | 3 | 5 | 5 |
| Diagnosis | ~5 | excluded | - | - | - | - |
| Test | ~20 | 1 | 2 | 2 | 4 | 0 |
| Normal | ~50 | 10 | 15 | 8 | 5 | 25 |

**By Directory:** apps/web ~45%, genetics-engine ~15%, shared-types ~10%, genetics-data ~30%

## Breaking Changes (MUST COORDINATE)

| Location | Change | Impact |
|----------|--------|--------|
| shared-types CarrierStatus | 'normal' → 'typical' | ALL carrier analysis code, tests, demo data |
| shared-types RiskLevel | 'not_tested' → 'not_analyzed' | Risk display, filtering, constants |
| shared-types OffspringRisk | normal: number → typical: number | Carrier tab, demo data, engine output |
| shared-types MetabolizerStatus | 'normal_metabolizer' → 'typical_metabolizer' | PGx analysis, PGx tab, PGx data |
| shared-types CounselingSpecialty | 'carrier_screening' → 'carrier_analysis' | Counseling engine, counseling tab |
| pgx-panel.json keys | "positive"/"negative" → "variant_detected"/"variant_not_detected" | PGx engine parser |
| pgx-panel.json keys | "normal_metabolizer" → "typical_metabolizer" | PGx engine lookup |

## Complete Rename Map

| File | Line | Current | Proposed | Category | Confidence |
|------|------|---------|----------|----------|-----------|
| home-content.tsx | 38 | Disease Screening | Disease Analysis | UI | HIGH |
| home-content.tsx | 40 | Comprehensive carrier screening | Comprehensive carrier analysis | UI | HIGH |
| home-content.tsx | 538 | basic screening | basic analysis | UI | HIGH |
| layout.tsx | 22 | "genetic testing" | "genetic analysis" | Code/UI | HIGH |
| layout.tsx | 23 | "carrier screening" | "carrier analysis" | Code/UI | HIGH |
| products-content.tsx | 31 | Disease screening | Disease analysis | UI | HIGH |
| legal-content.tsx | 168 | screening, trait | analysis, trait | UI | HIGH |
| glossary/page.tsx | 7 | carrier screening | carrier analysis | UI | HIGH |
| analysis/page.tsx | 207 | disease screening | disease analysis | UI | HIGH |
| counseling/page.tsx | 40 | carrier screening counseling | carrier analysis counseling | UI | HIGH |
| about-content.tsx | 36,81,180 | carrier screening (3×) | carrier analysis | UI | HIGH |
| footer.tsx | 11 | Carrier Screening | Carrier Analysis | UI | HIGH |
| analysis-progress.tsx | 15 | Screening carrier risk | Analyzing carrier risk | UI | HIGH |
| punnett-square.tsx | 12,20,28,34 | "normal" (type+code) | "typical" | Type/Code | HIGH |
| carrier-tab.tsx | 45 | "Not Tested" / "not_tested" | "Not Analyzed" / "not_analyzed" | Code/UI | HIGH |
| carrier-tab.tsx | 150 | Carrier Screening Results | Carrier Analysis Results | UI | HIGH |
| carrier-tab.tsx | 218 | Unlock Full Screening | Unlock Full Analysis | UI | HIGH |
| carrier-tab.tsx | 317 | "normal" (status type) | "typical" | Type | HIGH |
| carrier-tab.tsx | 488 | offspringRisk.normal | offspringRisk.typical | Code | HIGH |
| overview-tab.tsx | 66 | full screening | full analysis | UI | HIGH |
| counseling-tab.tsx | 50 | carrier_screening | carrier_analysis | Code/UI | HIGH |
| pgx-tab.tsx | 27,37 | normal_metabolizer / Normal Metabolizer | typical_metabolizer / Typical Metabolizer | Code/UI | HIGH |
| pricing-data.ts | 40,64 | carrier screening / Full screening | carrier analysis / Full analysis | UI | HIGH |
| genetics-constants.ts | 18 | not_tested: "Not Tested" | not_analyzed: "Not Analyzed" | Code/UI | HIGH |
| demo-results.ts | 24,64,382,384 | normal, normal_metabolizer | typical, typical_metabolizer | Code | HIGH |
| counseling.ts | 330,373 | carrier_screening | carrier_analysis | Code | HIGH |
| residual-risk.ts | 4,37,66 | negative test / test detects / screening | analysis | Comment | HIGH |
| pgx.ts | 310 | normal_metabolizer | typical_metabolizer | Code | HIGH |
| genetics.ts (shared-types) | 37,42,50,55,64,167,428 | normal, not_tested, normal_metabolizer, carrier_screening | typical, not_analyzed, typical_metabolizer, carrier_analysis | Type | HIGH |
| genetics-data/types.ts | 51,223,491 | Normal, normal, carrier_screening | Typical, typical, carrier_analysis | Code/Comment | HIGH |
| trait-snps.json | 57,728,2871 | Normal melanin/alcohol/clotting | Typical melanin/alcohol/clotting | Data | HIGH |
| pgx-panel.json | 18,66,68,838,842 | normal, normal_metabolizer, positive, negative | typical, typical_metabolizer, variant_detected, variant_not_detected | Data | HIGH |
| glossary.json | 130 | being normal | being typical | Data | HIGH |

## Action Items
1. **Type changes first** — update shared-types, then engine, then data, then UI (dependency order)
2. **Coordinate with engine tests** — 900+ tests reference old terminology
3. **Do NOT apply during Sprint 1** — this is a cross-cutting rename that touches 50+ files. Schedule as a dedicated Sprint 2 or standalone commit.
4. **Consider: rename engine output types without changing JSON data keys** (to avoid carrier-panel.json breakage). Data keys like "positive"/"negative" in pgx-panel are internal and may not need user-facing rename.

## Impact on Downstream
- Affects ALL streams that touch carrier/PGx/counseling code
- Stream E engine: types and logic need updating
- Sprint 2 (tier logic): uses RiskLevel types
- Sprint 3 (results tabs): display strings and type assertions
- MUST be applied as a single atomic commit to avoid intermediate type mismatches
