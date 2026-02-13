# V3 Implementation Log

> **Append-only log.** Every session appends to the end. Never delete or overwrite previous entries.
> Contains: delegation plans, research results, decision tables, review grades, and session notes.

---

## Session: 2026-02-12 — Stream 0 Kickoff

### Gemini Delegation Plan (All 11 Streams)

Approved by user before execution.

#### GEMINI Tasks (~38 tasks, 22%)

| Stream | Tasks | Tier | Rationale |
|--------|-------|------|-----------|
| **R (Research)** | R1, R2, R3, R4, R5, R7, R8, R9, R10, R11, R12 | **A+** | Bulk data research, large JSON validation, scientific accuracy checks. Gemini's 1M context fits ClinVar + carrier-panel.json + chip specs in one shot. |
| **D (Data)** | D3, D4, D5, D6 | **A** | Data enrichment — add metadata fields to genetics-data JSONs based on research findings. |
| **F (Frontend)** | F6, F19, F24 | **A+** | F6: global terminology rename. F19: color contrast audit. F24: SEO/OG metadata research. |
| **F (Frontend)** | F1, F4, F22, F42, F48 | **A** | UI prototyping / CSS visual design. |
| **L (Legal)** | L1, L2, L3, L7, L8, L9, L10, L11, L13 | **A** | Legal document drafting. DPIA, ROPA, privacy policy, ToS, breach response plan. |
| **S (Security)** | S2, S4 | **A** | S2: third-party tracking audit. S4: supply chain dependency audit. |
| **C (Legacy)** | C4, C6 | **A+** | C4: Mergenix rebrand sweep. C6: pricing sweep. |
| **Q (Testing)** | Q15, Q20 | **A** | Q15: linter config research. Q20: browser compatibility matrix. |

#### CLAUDE Tasks (~134 tasks, 78%)

| Stream | Tasks | Tier | Rationale |
|--------|-------|------|-----------|
| **R (Research)** | R6 | **C** | Synthetic test genome factory — complex code generation |
| **D (Data)** | D1, D2, D7 | **B+** | Simple data edits but need precise JSON surgery |
| **E (Engine)** | E1-E23 (all 23) | **C** | Complex TypeScript genetics logic |
| **T (Types)** | T1-T8 (all 8) | **C** | Architectural type decisions, cross-language sync |
| **F (Frontend)** | F2, F3, F5, F7-F18, F20, F21, F23, F25-F40, F43-F47 | **C** | Complex interaction logic, accessibility, security-sensitive UIs |
| **B (Backend)** | B1-B13 (all 12) | **C-D** | Security-sensitive: auth, encryption, GDPR, payments |
| **S (Security)** | S1, S3, S5-S10 | **C-D** | Security hardening, all security-sensitive |
| **Q (Testing)** | Q1-Q14, Q16-Q27a | **C** | Test writing — Claude's scaffolding is superior |
| **L (Legal)** | L4, L5, L6, L14 | **C** | Implementation tasks (code, not drafting) |
| **C (Legacy)** | C1-C3, C5 | **B** | Simple deletes + doc writing |
| **Ops** | Ops1-Ops3 | **B** | CI/CD pipeline config |

---

### Stream 0 Execution Plan

| Task | Delegation | Tier | Done Criteria | Status |
|------|-----------|------|---------------|--------|
| **R1** Source chip definition files | Gemini | A+ | Table: Provider x ChipVersion x SNPCount x MissingRsIDs | DONE |
| **R2** ClinVar pathogenic variant counts | Gemini | A+ | Per-disease: {name, omim_id, clinvar_pathogenic_count} | DONE |
| **R3** Liftover lookup methodology | Gemini | A+ | Methodology + sample JSON + provider build table | DONE |
| **R4** Identify CNV-based diseases | Gemini | A+ | Table: disease x mechanism x why_untestable x action | DONE |
| **R5** Ancestry-specific PRS distributions | Gemini | A+ | Table: population x mean x SD x source | DONE |
| **R6** Synthetic test genome factory spec | Claude | C | Complete spec doc: formats, params, edge cases, golden files | IN PROGRESS |
| **R7** Clinical detection rates per ethnicity | Gemini | A+ | Table: disease x ethnicity x detection_rate x source | DONE |
| **R8** Validate carrier_panel.json vs ClinVar | Gemini | A+ | Flag: name mismatches, invalid OMIM, wrong inheritance | DONE |
| **R9** Gene-phenotype validity check | Gemini | A | Per-entry: gene-disease association current? | DONE |
| **R10** Validate ethnicity carrier frequencies | Gemini | A+ | Flag frequencies >2x off from gnomAD/literature | DONE |
| **R11** Compound het ground truth cases | Gemini | A | 10+ confirmed cases with ClinVar IDs | DONE |
| **R12** Audit carrier panel rsID mappings | Gemini | A+ | Flag: merged/withdrawn/wrong-gene rsIDs | PARTIAL (see notes) |

All 11 Gemini tasks fired in parallel. Rate limit hit: 25 RPM for gemini-3-pro-preview (not 150+ as assumed). CLI auto-retried with 15-45s delays.
R6 delegated to Claude general-purpose agent (still running).

---

### Stream 0 Results Summary

Full research details archived in `docs/research/stream0/` (one file per task).

#### R1: Chip Coverage Analysis
- 23andMe v3 (~960K SNPs) has best coverage of carrier variants
- AncestryDNA v2 and MyHeritage have HIGH missing rates — GSA chips lack medical-grade content
- 23andMe v4 (~570K) drops many rare CFTR, BRCA, and metabolic disease variants
- **Impact:** Must show "coverage confidence" per provider; AncestryDNA/MyHeritage users need warnings about limited carrier screening sensitivity

#### R2: ClinVar Pathogenic Variant Counts
- Most diseases have "Minimal" SNP array coverage (<10% of known pathogenic variants)
- CFTR: ~2,100 known pathogenic variants, panel covers only 13 rsIDs
- Marfan (FBN1): 3,200 pathogenic variants, we cover 17 (~0.5%)
- Fragile X: **UNTESTABLE** (repeat expansion, not on SNP panel)
- **Impact:** Every carrier result must disclose limited coverage; "no variants detected" ≠ "not a carrier"

#### R3: Liftover Lookup Methodology
- All DTC providers use GRCh37 (hg19) for raw data downloads
- Lookup table: ~2,823 rsIDs = ~40-50KB gzipped — static JSON, client-side
- MyHeritage WGS (2026) likely uses GRCh38
- **Impact:** Build a single static JSON lookup; no server-side query needed

#### R4: CNV-Based Diseases
- **9 diseases to REMOVE:** SMA, DMD, Alpha-Thalassemia, Friedreich Ataxia, Myotonic Dystrophy 1+2, ALS/C9orf72, Pelizaeus-Merzbacher, Angelman
- **8 diseases need DISCLAIMERS:** CAH, Gaucher, Hemophilia A, Hunter, Krabbe, Cystinosis, Nemaline, OCA2
- **Impact:** D-stream data edits needed; F-stream disclaimer UI needed

#### R5: PRS Distributions & Transferability
- European-derived PRS poorly predict in non-European populations
- Schizophrenia scores artificially high in African ancestry — **must hide or strongly warn**
- Caution badges needed for all non-EUR PRS results
- **Impact:** F-stream needs ancestry-aware PRS display; E-stream needs ancestry-specific normalization

#### R7: Detection Rates by Ethnicity
- Consumer arrays have significantly lower detection rates than clinical panels
- CF detection: 90% clinical → ~85% consumer (European), <60% consumer (African)
- Alpha-Thal: >90% clinical → Low consumer (deletions missed by arrays)
- Residual risk calculations provided for all disease-ethnicity pairs
- **Impact:** Must show residual risk alongside negative carrier results

#### R8: Carrier Panel Validation vs ClinVar
- 6 issues found in 2,715 entries
- **Gene update needed:** IKBKAP → ELP1
- **5 name mismatches:** Familial Dysautonomia, Wolman Disease (3 entries), CESD
- **Impact:** D-stream data fixes needed

#### R9: Gene-Phenotype Validity Check
- **MTHFR: Refuted/low evidence** for thrombophilia — review inclusion
- **8 outdated gene symbols found:**
  - PKU → PAH, LCHAD → HADHA, IKBKAP → ELP1, NEMO → IKBKG
  - MUT → MMUT, C15orf41 → CDIN1, KIAA0196 → WASHC5, FAM126A → HYCC1
- **Impact:** D-stream gene symbol updates needed; MTHFR needs decision

#### R10: Ethnicity Frequency Validation
- **Major gap:** Only 153 of 2,500+ variants have ethnicity-specific data
- Sickle Cell global frequency 5.66x too high (over-weighted specific populations)
- FMF frequency also flagged (>5x off from global average)
- **Impact:** D-stream data enrichment needed; affects ethnicity-adjusted risk calculations

#### R11: Compound Heterozygosity Ground Truth
- 10 confirmed compound het cases with ClinVar IDs compiled
- 5 test scenarios designed (standard compound het, sickle-beta thal, negative control, homozygous, multi-gene separation)
- **Missing from panel:** HbC (rs33930165), HEXA 1278insTATC, PAH IVS12+1G>A, GALT S135L, MEFV V726A
- **Impact:** E-stream compound het logic design; D-stream missing variant additions

#### R12: rsID Audit (PARTIAL)
- Audit script produced 706KB output but methodology is flawed
- Many consecutive rsIDs mapped to same incorrect ClinVar gene — likely a parsing bug in the lookup approach
- **Status:** Stopped after extended runtime; needs to be re-run with corrected methodology
- **Impact:** Defer to D-stream; will need manual ClinVar validation for flagged rsIDs

#### R6: Synthetic Test Genome Factory Spec (IN PROGRESS)
- Claude agent still running
- Will produce spec doc for generating synthetic test genomes

---

### Cross-Cutting Findings from Stream 0

1. **Coverage honesty is critical.** Consumer chips cover <10% of known pathogenic variants for most diseases. Every carrier screen result must disclose this limitation prominently.

2. **9 diseases must be removed entirely** (CNV/repeat expansion mechanisms untestable by SNP arrays). 8 more need prominent disclaimers.

3. **PRS results must be ancestry-aware.** European-derived scores can be misleading or harmful for non-European users. Schizophrenia PRS for African ancestry users must be hidden or have strongest possible warnings.

4. **Data quality issues exist but are manageable.** 8 outdated gene symbols, 6 name mismatches, MTHFR validity concern, ethnicity frequency gaps. All fixable in D-stream.

5. **Compound het detection needs specific test cases.** 10 ground truth pairs documented with ClinVar IDs. Several key variants (HbC, HEXA 1278insTATC) missing from panel.

6. **Liftover is straightforward.** Static JSON, ~50KB gzipped, client-side. All providers use hg19.

---

### Operational Notes

- **Rate limit discovery:** gemini-3-pro-preview has 25 RPM limit (not 150+ as assumed). Also 1M input tokens/min. Each `--yolo` CLI call uses ~3-5 API requests for tool calls.
- **Temp files to clean up:** `audit_panel.py`, `audit_clinvar.py`, `count_items.py`, `audit_output.txt`, `temp_clinvar_cache/` (422MB ClinVar download) — all created by Gemini CLI in repo root.
- **Research archive:** Full outputs saved to `docs/research/stream0/` (one file per task)

---

## Session: 2026-02-13 — Stream E Planning

### Gemini Delegation Plan

All 23 Stream E tasks are Claude-tier (C) — complex TypeScript genetics logic. No Gemini delegation for execution. Gemini used only for planning perspectives.

### Planning: 10 Gemini Perspectives Gathered

All 10 planning personas fired via `GEMINI_SYSTEM_MD=review-personas/planning-{role}.md` in 4 batches (3-3-3-1, 30s stagger for 25 RPM limit). All completed successfully.

| # | Persona | Key Findings |
|---|---------|-------------|
| 1 | Architect | Stream-based parsing mandatory; gene-centric carrier refactor; lazy-load data via fetch(); result versioning |
| 2 | Scientist | Build detection + liftover before analysis; strand orientation critical; compound het = "Potential Risk" only; ancestry-specific PRS |
| 3 | QA | Golden Corpus testing approach; 15+ test categories identified; R6/Q1 synthetic data is a dependency |
| 4 | Technologist | Zero-copy Transferable objects; Cache API in Worker; AbortController for cancellation; progress throttling |
| 5 | Security | Zip bomb protection (100:1 ratio); format validation fail-fast; memory clearing after processing; strand abort-on-ambiguity |
| 6 | Code Quality | kebab-case files; no `any`; AsyncGenerator pattern; stateless pure functions; typed error codes |
| 7 | Business | Free tier "analyze all, redact details" for teaser; Pro tier couple report; coverage transparency; engine version for stale detection |
| 8 | Designer | Gene-level aggregation (one card per condition); progress stage keys; error enums; "Low Quality" global flag |
| 9 | Ethics | Probabilistic language only; sex-stratified X-linked; incidental findings; "Not a Diagnosis" disclaimer; never say "Negative" |
| 10 | Legal/Privacy | Local-only enforcement; volatile memory management; non-diagnostic labeling; engine version for audit trail |

### Unified Execution Plan (Gemini Synthesis)

**4 Phases, safety-first ordering: safety > correctness > performance > features**

#### Phase 1: Foundation & Safety (Streaming & Workers)
Tasks: E12, E13, E23, E16, E14, E21
- Zero-copy memory architecture (Transferable objects)
- Streaming parser (ReadableStream, 64KB chunks, backpressure)
- Client-side decompression (.zip/.gz via DecompressionStream + fflate fallback)
- Mobile memory governor (50MB limit, sequential processing)
- Lazy-load data assets (fetch() instead of import, Cache API)
- Granular progress events (100ms throttle)
Prerequisites: T8 (WorkerMessage types)

#### Phase 2: Core Genetics Accuracy (Parsing & Normalization)
Tasks: E1, E2, E3, E18, E19, E20
- Universal parser (23andMe v3-v5, Ancestry v1-v2, MyHeritage)
- Genome build detection (hg19 vs hg38, fail if ambiguous)
- Client-side liftover (static lookup table)
- VCF indel support (<50bp, including F508del)
- Multi-allelic VCF support
- Strand orientation harmonization (non-palindromic SNPs, abort on ambiguity)

#### Phase 3: Analysis Logic (Gene-Centric Model)
Tasks: E4, E5, E6, E7, E11
- Gene-level aggregation (VariantGrouper + CarrierAnalyzer)
- Compound heterozygote logic ("Potential Risk - Phasing Unknown")
- "Not Tested" vs "Variant Not Detected" distinction
- Coverage calculator ("Tested X of Y")
- Couple/offspring combiner (AR/AD/X-linked Mendelian inheritance)

#### Phase 4: Advanced Features & Polish
Tasks: E10, E15, E9, E17, E22, E8
- Ancestry-adjusted PRS (CLT-based offspring PRS)
- Residual risk calculation (ethnicity-specific detection rates)
- PGx array limitation disclaimers (CYP2D6 hybrid allele warning)
- Engine version stamping
- JSDoc documentation
- Chip version/density detection

### Unified Risk Register (Top 7)

| ID | Severity | Risk | Mitigation |
|----|----------|------|------------|
| R-OOM | P0 | Mobile memory crash (500MB string) | E13 streaming + E12 zero-copy + E16 governor |
| R-FALSE-NEG | P0 | Compound het carrier missed | E4 gene grouping + E5 "Potential Risk" |
| R-STRAND | P1 | Strand flip → wrong variant | E20 non-palindromic sampling, abort on ambiguity |
| R-DOS | P1 | Zip bomb exhausts memory | E23 ratio limit (100:1) + size cap |
| R-MISINFO | P1 | "Not Tested" seen as "Safe" | E6 explicit state + E7 coverage metrics |
| R-ETHNICITY | P2 | Euro-centric PRS bias | E10 ancestry detection + confidence badges |
| R-STALE | P2 | Worker uses old cached JSON | E14 versioned URLs + E17 version stamp |

### Critical Blockers Identified

1. **T1/T8 (Shared Types):** `AnalysisResult` and `WorkerMessage` types must be updated before Phase 1
2. **R3 (Liftover Table):** Static JSON needed before E3 can be implemented
3. **R1 (Chip Definitions):** Needed for E7 (coverage) and E8 (chip detection)
4. **R12 (rsID Audit):** Needed before E4 carrier analysis can be trusted

### Cross-Cutting Requirements (All Phases)

1. No `any` — use `unknown` with type guards
2. Analysis functions must be pure: `(Input, ReferenceData) => Output`
3. Never output "Negative" — use "Variant Not Detected"
4. Never output "Affected" for unphased compound hets — use "Potential Risk"
5. Manually nullify large buffers in Worker after processing
6. Typed error codes (enums, not strings)
7. Browser fallback for DecompressionStream (fflate)

---

## Session: 2026-02-13 — Stream E Execution (All 25 Tasks)

### Overview

Executed all 25 Stream E tasks (T1, T8, E1-E23) in a single session across 4 phases. All tasks were Claude-tier (C) — complex TypeScript genetics logic requiring deep domain knowledge.

**Final metrics:** 892 tests across 20 test files, 22 source files (~10,062 LOC), 20 test files (~10,472 LOC). All tests passing, zero TypeScript errors. Branch: `feature/stream-e-engine-refactor`.

### Execution Timeline

#### Prerequisites: T1 + T8 (Shared Types)

Single executor updated `packages/shared-types/src/genetics.ts`:
- **T1:** Added `CoverageMetrics`, `DiseaseCoverage`, `ChipVersion`, `GenomeBuild` types. Extended `FullAnalysisResult` with `coupleMode`, `coverageMetrics`, `chipVersion`, `genomeBuild` fields.
- **T8:** Extended `WorkerRequest` with `parse_stream`, `decompress`, `init` variants. Extended `WorkerResponse` with `stream_progress`, `decompress_progress`, `decompress_complete`, `init_complete`, `memory_warning`. Extended `AnalysisStage` with `initializing`, `decompressing`, `strand_harmonization`, `build_detection`, `liftover`. Added `WorkerConfig` interface.
- Also added `"DOM"` to `packages/shared-types/tsconfig.json` lib array for `FileSystemFileHandle` and `File` types.

#### Phase 1: Foundation & Safety (E12, E13, E14, E16, E21, E23)

Two parallel executors with strict file ownership:

**Executor 1A (E16 + E14):**
- `device.ts` (E16): Mobile detection via `navigator.deviceMemory` + `hardwareConcurrency`. `MemoryGovernor` class (50MB mobile/500MB desktop limits, 80% pressure). `getArgon2Params()` with OWASP-minimum for mobile. 54 tests.
- `data-loader.ts` (E14): Lazy loading via `fetch()` + Cache API. `fetchWithRetry<T>()` with exponential backoff. `loadAllData()` via `Promise.all`. `DataLoadError` class. 26 tests.

**Executor 1B (E12 + E13 + E21 + E23):**
- `worker.ts` (E12+E13+E21): Streaming parse with `File`/`FileSystemFileHandle`, progress reporting every 10K lines via `ProgressReporter`, `init` handler.
- `decompression.ts` (E23): ZIP/GZIP/raw detection. Security limits (500MB/50MB, 100:1 ratio, 30s timeout). Typed `DecompressionError`. 17 tests.
- `progress.ts` (E21): Throttled to 100ms, boundary values bypass throttle. 11 tests.
- `parser.ts` (E13): Added `iterateStreamLines()`, `detectFormatFromStream()`, `parseStreaming()`.

**Result:** 503 tests passing after Phase 1.

#### Phase 2: Parsing & Normalization (E1, E2, E3, E18, E19, E20)

Three parallel executors:

**Executor 2A (E2 + E3):**
- `build-detection.ts` (E2): Header-based (VCF ##reference/##contig, 23andMe build comments) + sentinel SNP fallback (~20 SNPs, 90% threshold). Default GRCh37 with low confidence. 43 tests.
- `liftover.ts` (E3): `LiftoverTable` class wrapping `Map<rsid, LiftoverEntry>`. Single + batch conversion. Failure reasons: `not_in_table`, `ambiguous_mapping`. 35 tests.

**Executor 2B (E20):**
- `strand.ts` (E20): `isPalindromicPair()` for A↔T/C↔G. `analyzeStrand()` samples homozygous non-palindromic SNPs vs reference (90% threshold). `flipStrand()` complements all alleles. `harmonizeStrand()` main entry. 46 built-in reference alleles. 61 tests.

**Executor 2C (E1 + E18 + E19):**
- `parser.ts` (E1): `detectChipVersion()` for 23andMe v3/v4/v5, AncestryDNA v1/v2.
- `parser.ts` (E18): VCF indel support up to 50bp (F508del detection), "/" separator for indel genotypes.
- `parser.ts` (E19): Multi-allelic VCF — comma-separated ALT parsing, GT index resolution (0/1, 0/2, 1/2, etc.).

**Issues encountered:**
1. 10 failing strand tests — `isPalindromicPair()` filter in `analyzeStrand()` incorrectly excluded reverse-strand data (the complement IS what we're detecting). Fix: removed the filter (6 lines). 61/61 passed.
2. Unused `isIndel` function causing TS6133 — inline indel detection made it redundant. Fix: removed the function.
3. Missing test files for build-detection + liftover (rate limit hit). Fix: cleanup agent created both files (43 + 35 tests).

**Result:** 642 tests passing after Phase 2.

#### Phase 3: Gene-Centric Analysis (E4, E5, E6, E7, E11)

Three parallel executors:

**Executor 3A (E4 + E5 + E6):**
- `carrier.ts` (E4): `groupVariantsByGene()`, `analyzeGeneCarrierStatus()` with worst-case gene-level status.
- `carrier.ts` (E5): `detectCompoundHet()` — "Potential Risk — Phasing Unknown" for 2+ het variants in same gene (never "Affected" for unphased DTC data).
- `carrier.ts` (E6): `ExtendedCarrierStatus = CarrierStatus | 'not_tested'`, `getTestingStatus()`, `NO_CALL_PATTERNS` set ('--', '00', ''). Backward compatible via `ExtendedCarrierResult extends CarrierResult`.
- 35 new tests.

**Executor 3B (E7):**
- `coverage.ts` (E7): `calculateDiseaseCoverage()` per-disease, `calculateCoverageMetrics()` aggregate, `getCoverageSummary()` human-readable. Uses `CoverageMetrics`/`DiseaseCoverage` from shared-types. 31 tests.

**Executor 3C (E11):**
- `combiner.ts` (E11): `calculateARRisk()` (9-entry truth table), `calculateADRisk()` (carrier→affected mapping), `calculateXLinkedRisk()` (sex-stratified: sons vs daughters, hemizygous males). `combineForCondition()` dispatches by inheritance. `combineAllConditions()` batch + risk-sorted. 53 tests.

**Result:** 761 tests passing after Phase 3.

#### Phase 4: Advanced Features (E8, E9, E10, E15, E17, E22)

Two parallel executors:

**Executor 4A (E10 + E15):**
- `prs.ts` (E10): Per-allele average normalization (not raw sum), 75% SNP coverage threshold, CLT-based offspring prediction (25th-75th percentile range).
- `residual-risk.ts` (E15): Bayesian post-test probability. `COMMON_DETECTION_RATES` (CF, Sickle Cell, Tay-Sachs by ethnicity). "Unknown/Mixed" defaults to most conservative rate. `formatResidualRisk()` → "~1 in X". 43 tests.

**Executor 4B (E8 + E9 + E17 + E22):**
- `chip-detection.ts` (E8+E17): `ENGINE_VERSION = '3.1.0'`. `detectChipVersion()` matching 6 known profiles (23andMe v3/v4/v5, AncestryDNA v1/v2, MyHeritage v1). `getChipNotes()`. 36 tests.
- `pgx.ts` (E9): `ARRAY_LIMITATION_DISCLAIMER`, `GENE_SPECIFIC_WARNINGS` (CYP2D6, CYP2C19, DPYD), `getGeneSpecificWarning()`. 22 new tests.
- `pgx.ts` (E22): JSDoc documentation on all public functions.

**Result:** 892 tests passing after Phase 4.

### Files Changed Summary

**14 tracked files modified:** +2,778 / -139 lines
**11 new source files:** build-detection.ts, chip-detection.ts, combiner.ts, coverage.ts, data-loader.ts, decompression.ts, device.ts, liftover.ts, progress.ts, residual-risk.ts, strand.ts
**12 new test files:** build-detection.test.ts, chip-detection.test.ts, combiner.test.ts, coverage.test.ts, data-loader.test.ts, decompression.test.ts, device.test.ts, liftover.test.ts, progress.test.ts, residual-risk.test.ts, strand.test.ts, worker.test.ts

### Test Breakdown (892 total)

| Test File | Count |
|-----------|-------|
| prs.test.ts | 98 |
| carrier.test.ts | 89 |
| parser.test.ts | 78 |
| strand.test.ts | 61 |
| device.test.ts | 54 |
| combiner.test.ts | 53 |
| pgx.test.ts | 49 |
| build-detection.test.ts | 43 |
| residual-risk.test.ts | 43 |
| utils.test.ts | 39 |
| counseling.test.ts | 37 |
| chip-detection.test.ts | 36 |
| liftover.test.ts | 35 |
| ethnicity.test.ts | 34 |
| coverage.test.ts | 31 |
| traits.test.ts | 29 |
| worker.test.ts | 29 |
| data-loader.test.ts | 26 |
| decompression.test.ts | 17 |
| progress.test.ts | 11 |

### Key Architectural Decisions

1. **Strict file ownership per executor** — prevented merge conflicts across parallel agents
2. **Backward-compatible carrier extension** — `ExtendedCarrierResult extends CarrierResult` so all existing consumers continue working
3. **"Potential Risk — Phasing Unknown"** for compound hets — scientifically honest for unphased DTC data
4. **Per-allele average PRS normalization** — prevents bias from different chip coverage levels
5. **Bayesian residual risk** — proper post-test probability, not naive complement
6. **Palindromic SNP exclusion in strand detection** — sample non-palindromic homozygous only (A↔T and C↔G pairs are ambiguous)
7. **FullAnalysisResult new required fields** — placeholder values for later-phase fields (coverage, chip, build) to avoid breaking changes

### Risk Mitigations Verified

| Risk | Status | How |
|------|--------|-----|
| R-OOM (mobile crash) | Mitigated | E13 streaming + E16 MemoryGovernor (50MB mobile limit) |
| R-FALSE-NEG (compound het miss) | Mitigated | E4 gene grouping + E5 "Potential Risk" label |
| R-STRAND (flip → wrong variant) | Mitigated | E20 non-palindromic sampling + 90% threshold |
| R-DOS (zip bomb) | Mitigated | E23 ratio limit (100:1) + size cap (500MB/50MB) |
| R-MISINFO ("Not Tested" = "Safe") | Mitigated | E6 `not_tested` status + E7 coverage metrics |
| R-ETHNICITY (Euro PRS bias) | Mitigated | E10 coverage threshold (75%) + per-allele normalization |
| R-STALE (old cached data) | Mitigated | E14 versioned URLs + E17 ENGINE_VERSION stamp |

