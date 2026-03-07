# Stream 0: Research Phase -- Index

> **Phase:** Stream 0 (Research)
> **Date:** 2026-02-12
> **Delegated to:** Gemini (gemini-3-pro-preview) via CLI
> **Purpose:** Validate genetics data accuracy, identify platform limitations, and establish ground truth before implementation streams begin

## Research Task Summary

| Task | Title                          | Status   | Key Finding                                                                                                                      | File                                                                             |
| ---- | ------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| R1   | Chip Coverage Analysis         | COMPLETE | Consumer chips miss most rare carrier variants; 23andMe v3 is gold standard, AncestryDNA/MyHeritage have highest miss rates      | [stream0-R1-chip-coverage.md](stream0-R1-chip-coverage.md)                       |
| R2   | ClinVar Pathogenic Counts      | COMPLETE | Most large genes have "Minimal" coverage (<1% of ClinVar variants); Fragile X is untestable; focused AJ panels are "Good"        | [stream0-R2-clinvar-counts.md](stream0-R2-clinvar-counts.md)                     |
| R3   | Liftover Methodology           | COMPLETE | Nearly all DTC providers output GRCh37 (hg19); lookup table is ~40-50KB gzipped for ~2,823 rsIDs; rsID merges are a key pitfall  | [stream0-R3-liftover-methodology.md](stream0-R3-liftover-methodology.md)         |
| R4   | CNV-Based Diseases             | COMPLETE | 9 diseases must be REMOVED (untestable on SNP arrays); 8 need mandatory disclaimers for partial testability                      | [stream0-R4-cnv-diseases.md](stream0-R4-cnv-diseases.md)                         |
| R5   | PRS Distributions              | COMPLETE | All PRS weights are EUR-derived; Schizophrenia PRS is harmful for African ancestry; ancestry-specific normalization is essential | [stream0-R5-prs-distributions.md](stream0-R5-prs-distributions.md)               |
| R6   | Synthetic Test Genome Factory  | COMPLETE | 1,534-line spec covering all formats, edge cases, golden files, TypeScript API                                                   | [stream0-R6-synthetic-genome-factory.md](stream0-R6-synthetic-genome-factory.md) |
| R7   | Detection Rates by Ethnicity   | COMPLETE | Consumer array detection rates are dramatically lower than clinical rates; CF detection ranges from 90% (EUR) to <30% (EAS)      | [stream0-R7-detection-rates.md](stream0-R7-detection-rates.md)                   |
| R8   | Carrier Panel Validation       | COMPLETE | 6 issues found in 2,715 entries: 1 outdated gene symbol (IKBKAP->ELP1), 5 disease name mismatches vs OMIM                        | [stream0-R8-carrier-panel-validation.md](stream0-R8-carrier-panel-validation.md) |
| R9   | Gene-Phenotype Validity        | COMPLETE | 9 concerns: 1 disputed gene (MTHFR for thrombophilia), 8 outdated gene symbols needing HGNC updates                              | [stream0-R9-gene-phenotype-validity.md](stream0-R9-gene-phenotype-validity.md)   |
| R10  | Ethnicity Frequency Validation | COMPLETE | Only 153/2,500+ variants have ethnicity data; Sickle Cell and FMF global frequencies are 5x+ overestimated                       | [stream0-R10-ethnicity-frequencies.md](stream0-R10-ethnicity-frequencies.md)     |
| R11  | Compound Het Ground Truth      | COMPLETE | 10 confirmed cases compiled; 5 variant pairs are MISSING from our panel; 5 test scenarios defined                                | [stream0-R11-compound-het-cases.md](stream0-R11-compound-het-cases.md)           |
| R12  | Carrier Panel rsID Audit       | PARTIAL  | Audit script methodology flawed — needs re-run; raw output lost during cleanup                                                   | [stream0-R12-rsid-audit.md](stream0-R12-rsid-audit.md)                           |

## Cross-Cutting Findings

The research phase revealed several major themes that cut across multiple tasks and will shape all downstream implementation streams:

### 1. Consumer SNP Arrays Are Fundamentally Limited for Clinical-Grade Screening

**Affected tasks:** R1, R2, R4, R7

Consumer DNA chips (especially AncestryDNA v2 and MyHeritage) were designed for genealogy, not medical genetics. Our platform must be honest about these limitations:

- Most rare pathogenic variants are not on consumer chips
- 9 diseases are completely untestable (CNV/repeat-based mechanisms)
- Detection rates vary dramatically by ethnicity (CF: 90% EUR vs <30% EAS)
- "Not tested" must be clearly distinguished from "negative" in the UI

### 2. Ethnicity-Specific Data Is Critically Incomplete

**Affected tasks:** R5, R7, R10

The platform's ethnicity handling has significant gaps:

- Only 153 of ~2,500+ carrier variants have ethnicity-specific frequencies
- PRS weights are entirely European-derived with no ancestry-specific normalization
- "Global" frequencies for some conditions are 5x+ overestimated due to population weighting errors
- Residual risk calculations cannot be accurate without proper ethnicity data

### 3. The Carrier Panel Needs Significant Data Cleanup

**Affected tasks:** R4, R8, R9, R11

Data quality issues span multiple dimensions:

- 9 diseases to remove (untestable mechanisms)
- 8 diseases needing disclaimers (partially testable)
- 8 outdated gene symbols needing HGNC updates
- 1 disputed gene (MTHFR) needing review
- 5 clinically important variants missing from the panel
- Duplicate entries (Wolman/CESD) need consolidation

### 4. Compound Heterozygosity Detection Is Critical but Under-Supported

**Affected tasks:** R2, R11

The engine must correctly handle:

- Two different pathogenic variants in the same gene (compound het = affected)
- Homozygous pathogenic variants (affected)
- Single carrier variants (carrier, not affected)
- Variants in different genes (double carrier, NOT compound het)
- Several key variant pairs for common diseases are missing from the panel

### 5. The Liftover Infrastructure Is Straightforward but Has Pitfalls

**Affected tasks:** R3

The technical approach is well-defined (static JSON, ~40KB gzipped), but:

- rsID merges in dbSNP can silently break lookups
- Strand flips between chip versions need detection
- MyHeritage WGS and Nebula/Dante use hg38, not hg19 like all other providers

## Priority Ranking for Downstream Streams

Based on research findings, the recommended priority order for implementation:

1. **Stream D (Data Cleanup)** -- Fix panel data first; everything else depends on accurate data
2. **Stream E (Engine)** -- Build on clean data; implement compound het, coverage tiers, residual risk
3. **Stream F (Frontend)** -- Display coverage badges, disclaimers, ethnicity-aware messaging
4. **Stream T (Testing)** -- Validate using ground truth from R11; test all coverage tier scenarios
