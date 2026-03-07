# R8: Carrier Panel Validation

> **Task:** Audit the carrier-panel.json for outdated gene symbols, incorrect disease names, and data inconsistencies
> **Delegated to:** Gemini (gemini-3-pro-preview)
> **Date:** 2026-02-12
> **Status:** COMPLETE
> **Tier:** A+ (research -- Gemini's 1M context ideal for large data analysis)

## Objective

Systematically audit all 2,715 entries in `carrier-panel.json` for outdated gene symbols (checking against HGNC), disease name mismatches (checking against OMIM preferred titles), and other data quality issues.

## Key Findings

- **6 issues found across 2,715 entries** -- a relatively clean panel overall
- **1 outdated gene symbol:** IKBKAP should be updated to ELP1 (Familial Dysautonomia)
- **5 disease name mismatches:** Wolman Disease and CESD should both use the unified OMIM title "Lysosomal acid lipase deficiency"; Familial Dysautonomia has a different OMIM preferred title
- **Duplicate disease entries exist** -- Wolman Disease and CESD appear both individually (entries 123, 143) and as combined entries (1344, 1345), suggesting data import artifacts

## Full Results

| Entry Index | Disease Name                                      | Issue Type    | Current Value                                     | Correct Value                                          | Source/Reference |
| :---------: | ------------------------------------------------- | ------------- | ------------------------------------------------- | ------------------------------------------------------ | ---------------- |
|      7      | Familial Dysautonomia                             | GENE_OUTDATED | IKBKAP                                            | ELP1                                                   | HGNC             |
|      7      | Familial Dysautonomia                             | NAME_MISMATCH | Familial Dysautonomia                             | Neuropathy, hereditary sensory and autonomic, type III | OMIM 223900      |
|     123     | Wolman Disease                                    | NAME_MISMATCH | Wolman Disease                                    | Lysosomal acid lipase deficiency                       | OMIM 278000      |
|     143     | Cholesteryl Ester Storage Disease                 | NAME_MISMATCH | Cholesteryl Ester Storage Disease                 | Lysosomal acid lipase deficiency                       | OMIM 278000      |
|    1344     | Wolman Disease (Lysosomal Acid Lipase Deficiency) | NAME_MISMATCH | Wolman Disease (Lysosomal Acid Lipase Deficiency) | Lysosomal acid lipase deficiency                       | OMIM 278000      |
|    1345     | Cholesteryl Ester Storage Disease (CESD)          | NAME_MISMATCH | Cholesteryl Ester Storage Disease (CESD)          | Lysosomal acid lipase deficiency                       | OMIM 278000      |

### Summary

- **Total entries checked:** 2,715
- **Total issues found:** 6
- **Breakdown by issue type:**
  - NAME_MISMATCH: 5
  - GENE_OUTDATED: 1

## Action Items

1. **Data: Update gene symbol** IKBKAP -> ELP1 in carrier-panel.json (entry 7)
2. **Data: Normalize disease names** -- Decide whether to use OMIM preferred titles or retain commonly-known names with OMIM cross-reference
3. **Data: Merge duplicate entries** -- Wolman Disease and CESD entries (123/143 and 1344/1345) should be consolidated under "Lysosomal acid lipase deficiency" with severity subtypes as metadata
4. **Data: Add OMIM ID cross-reference** -- Ensure every entry has a valid OMIM ID for verification
5. **Note on Familial Dysautonomia:** The OMIM preferred title "Neuropathy, hereditary sensory and autonomic, type III" is technically correct but less recognizable. Consider keeping "Familial Dysautonomia" as a display name with OMIM title as a secondary field.

## Impact on Downstream Streams

- **Stream D (Data):** Gene symbol update, disease name normalization, duplicate merging
- **Stream E (Engine):** Any code referencing "IKBKAP" must be updated to "ELP1"
- **Stream F (Frontend):** Display name decisions affect the results UI
- **Stream T (Testing):** Test data referencing affected entries must be updated
