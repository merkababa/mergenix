# R9: Gene-Phenotype Validity

> **Task:** Verify gene-disease associations in the carrier panel against ClinGen clinical validity classifications and HGNC current gene symbols
> **Delegated to:** Gemini (gemini-3-pro-preview)
> **Date:** 2026-02-12
> **Status:** COMPLETE
> **Tier:** A+ (research -- Gemini's 1M context ideal for large data analysis)

## Objective
Cross-reference all gene-disease pairs in `carrier-panel.json` against ClinGen clinical validity classifications to identify low-evidence associations and outdated/incorrect gene symbols that need updating per HGNC standards.

## Key Findings
- **9 concerns found across 2,715 gene-disease pairs**
- **1 gene with disputed clinical utility:** MTHFR -- ClinGen has Refuted the association with thrombophilia; carrier screening for C677T is discouraged by ACMG
- **8 outdated or incorrect gene symbols:** PKU (should be PAH), LCHAD (should be HADHA), IKBKAP (should be ELP1), NEMO (should be IKBKG), MUT (should be MMUT), C15orf41 (should be CDIN1), KIAA0196 (should be WASHC5), FAM126A (should be HYCC1)
- All outdated symbols have HGNC-approved replacements that should be applied to the panel

## Full Results

| Gene | Disease | ClinGen Evidence Level | Concern | Details | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MTHFR** | Homocystinuria / Thrombophilia | **No Classification / Refuted** | **LOW_EVIDENCE** | ClinGen has Refuted MTHFR for Thrombophilia. Association with Homocystinuria is valid for severe deficiency but carrier screening for common variants (C677T) is generally discouraged by ACMG due to lack of clinical utility. | Review inclusion. If retained, restrict to severe deficiency alleles and add disclaimer regarding lack of utility for thrombophilia risk. |
| **PKU** | Phenylketonuria | **Definitive (as PAH)** | **OUTDATED_ASSOCIATION** | `PKU` is not a valid HGNC gene symbol; it is an abbreviation for the condition. The correct gene is `PAH`. | Update symbol to `PAH`. Merge with existing `PAH` entries. |
| **LCHAD** | LCHAD Deficiency | **Definitive (as HADHA)** | **OUTDATED_ASSOCIATION** | `LCHAD` is not a valid HGNC gene symbol; it is an abbreviation for the condition. The correct gene is `HADHA`. | Update symbol to `HADHA`. |
| **IKBKAP** | Familial Dysautonomia | **Definitive (as ELP1)** | **OUTDATED_ASSOCIATION** | Gene symbol has been updated to `ELP1`. | Update symbol to `ELP1`. |
| **NEMO** | NEMO Deficiency Syndrome | **Definitive (as IKBKG)** | **OUTDATED_ASSOCIATION** | `NEMO` is an alias/previous symbol. The correct HGNC symbol is `IKBKG`. | Update symbol to `IKBKG`. Merge with existing `IKBKG` entries. |
| **MUT** | Methylmalonic Acidemia | **Definitive (as MMUT)** | **OUTDATED_ASSOCIATION** | Gene symbol has been updated to `MMUT`. | Update symbol to `MMUT`. Merge with existing `MMUT` entries. |
| **C15orf41** | Congenital Dyserythropoietic Anemia Type I | **Definitive (as CDIN1)** | **OUTDATED_ASSOCIATION** | Gene symbol has been updated to `CDIN1`. | Update symbol to `CDIN1`. |
| **KIAA0196** | Hereditary Spastic Paraplegia Type 8 | **Definitive (as WASHC5)** | **OUTDATED_ASSOCIATION** | Gene symbol has been updated to `WASHC5`. | Update symbol to `WASHC5`. |
| **FAM126A** | Hypomyelinating Leukodystrophy Type 5 | **Definitive (as HYCC1)** | **OUTDATED_ASSOCIATION** | Gene symbol has been updated to `HYCC1`. | Update symbol to `HYCC1`. |

### Summary
*   **Total gene-disease pairs checked:** 2,715
*   **Total concerns found:** 9
    *   **1** Low Evidence / Disputed utility for general screening (MTHFR).
    *   **8** Outdated or Incorrect Gene Symbols (PKU, LCHAD, IKBKAP, NEMO, MUT, C15orf41, KIAA0196, FAM126A).

## Action Items
1. **Data: Update 8 gene symbols** in carrier-panel.json:
   - IKBKAP -> ELP1
   - PKU -> PAH (merge with existing PAH entries)
   - LCHAD -> HADHA
   - NEMO -> IKBKG (merge with existing IKBKG entries)
   - MUT -> MMUT (merge with existing MMUT entries)
   - C15orf41 -> CDIN1
   - KIAA0196 -> WASHC5
   - FAM126A -> HYCC1
2. **Data: Review MTHFR inclusion** -- Either remove entirely or restrict to severe deficiency alleles with prominent disclaimer
3. **Data: Add gene symbol aliases** -- Maintain a mapping of old -> new symbols for backward compatibility with user-facing searches
4. **Engine: Update any code referencing old symbols** -- Search codebase for all 8 outdated symbols

## Impact on Downstream Streams
- **Stream D (Data):** Major data cleanup -- 8 symbol updates, potential MTHFR removal, merge operations for PKU/NEMO/MUT entries
- **Stream E (Engine):** Code search and update for old gene symbols
- **Stream F (Frontend):** If MTHFR is retained, disclaimer must be displayed
- **Stream T (Testing):** Test data using old symbols must be updated
