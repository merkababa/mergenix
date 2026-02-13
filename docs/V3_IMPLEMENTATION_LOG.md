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

