# R11: Compound Het Ground Truth

> **Task:** Compile clinically confirmed compound heterozygosity examples for carrier analysis logic testing
> **Delegated to:** Gemini (gemini-3-pro-preview)
> **Date:** 2026-02-12
> **Status:** COMPLETE
> **Tier:** A+ (research -- Gemini's 1M context ideal for large data analysis)

## Objective

Build a ground truth dataset of 10 confirmed compound heterozygote cases (with ClinVar IDs and literature references) to validate the carrier analysis engine's ability to correctly detect two different pathogenic variants in the same gene, distinguish from simple carrier status, and avoid false-positive cross-gene matches.

## Key Findings

- **10 confirmed compound het cases compiled** spanning CFTR, HBB, GBA, HEXA, PAH, GALT, MEFV, DHCR7, and ASPA
- **Several variant pairs are MISSING from our carrier panel:** HbC (rs33930165) for HBB, 1278insTATC (rs387906309) for HEXA, IVS12+1G>A for PAH, S135L (rs111033690) for GALT, V726A for MEFV
- **Critical test scenario identified:** Multi-gene separation -- the engine must NOT cross-match variants between different genes (e.g., CFTR carrier + HBB carrier should not be flagged as compound het)
- **Homozygous vs. compound het distinction** is essential -- GBA N370S homozygous is a different clinical scenario than N370S/L444P compound het

## Full Results

### Compound Heterozygote Ground Truth Examples

| #   | Disease                 | Gene    | Variant 1 (rsID / HGVS)   | ClinVar ID 1                                                   | Variant 2 (rsID / HGVS)     | ClinVar ID 2                                                   | Clinical Outcome                    | Reference                                                                     |
| --- | ----------------------- | ------- | ------------------------- | -------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Cystic Fibrosis         | _CFTR_  | rs75030207 (F508del)      | [7105](https://www.ncbi.nlm.nih.gov/clinvar/variation/7105/)   | rs113993960 (G542X)         | [7115](https://www.ncbi.nlm.nih.gov/clinvar/variation/7115/)   | **Affected** (CF)                   | [PubMed 25741868](https://pubmed.ncbi.nlm.nih.gov/25741868/)                  |
| 2   | Sickle-Beta Thalassemia | _HBB_   | rs334 (HbS, Glu7Val)      | [15239](https://www.ncbi.nlm.nih.gov/clinvar/variation/15239/) | rs11549407 (Beta-Thal, G>A) | [15437](https://www.ncbi.nlm.nih.gov/clinvar/variation/15437/) | **Affected** (Sickle-Beta Thal)     | [ClinVar VCV000015239](https://www.ncbi.nlm.nih.gov/clinvar/variation/15239/) |
| 3   | Gaucher Disease         | _GBA_   | rs76763715 (N370S)        | [4288](https://www.ncbi.nlm.nih.gov/clinvar/variation/4288/)   | rs28934895 (L444P)          | [4290](https://www.ncbi.nlm.nih.gov/clinvar/variation/4290/)   | **Affected** (Type 1 Gaucher)       | [PubMed 8104533](https://pubmed.ncbi.nlm.nih.gov/8104533/)                    |
| 4   | Tay-Sachs Disease       | _HEXA_  | rs387906309 (1278insTATC) | [3889](https://www.ncbi.nlm.nih.gov/clinvar/variation/3889/)   | rs76173977 (IVS9+1G>A)      | [3920](https://www.ncbi.nlm.nih.gov/clinvar/variation/3920/)   | **Affected** (Infantile TSD)        | [ClinVar VCV000003889](https://www.ncbi.nlm.nih.gov/clinvar/variation/3889/)  |
| 5   | Hemoglobin SC Disease   | _HBB_   | rs334 (HbS)               | [15239](https://www.ncbi.nlm.nih.gov/clinvar/variation/15239/) | rs33930165 (HbC, Glu7Lys)   | [15126](https://www.ncbi.nlm.nih.gov/clinvar/variation/15126/) | **Affected** (HbSC Disease)         | [ClinVar VCV000015126](https://www.ncbi.nlm.nih.gov/clinvar/variation/15126/) |
| 6   | Phenylketonuria (PKU)   | _PAH_   | rs5030858 (R408W)         | [576](https://www.ncbi.nlm.nih.gov/clinvar/variation/576/)     | NM_000277.3:c.1315+1G>A     | [595](https://www.ncbi.nlm.nih.gov/clinvar/variation/595/)     | **Affected** (Severe PKU)           | [PubMed 1960010](https://pubmed.ncbi.nlm.nih.gov/1960010/)                    |
| 7   | Galactosemia            | _GALT_  | rs111033604 (Q188R)       | [3612](https://www.ncbi.nlm.nih.gov/clinvar/variation/3612/)   | rs111033690 (S135L)         | [3618](https://www.ncbi.nlm.nih.gov/clinvar/variation/3618/)   | **Affected** (Classic Galactosemia) | [PubMed 10560205](https://pubmed.ncbi.nlm.nih.gov/10560205/)                  |
| 8   | Familial Med. Fever     | _MEFV_  | rs61752717 (M694V)        | [2538](https://www.ncbi.nlm.nih.gov/clinvar/variation/2538/)   | rs28940579 (V726A)          | [2540](https://www.ncbi.nlm.nih.gov/clinvar/variation/2540/)   | **Affected** (FMF)                  | [ClinVar VCV000002538](https://www.ncbi.nlm.nih.gov/clinvar/variation/2538/)  |
| 9   | Smith-Lemli-Opitz       | _DHCR7_ | rs121913530 (W151X)       | [21342](https://www.ncbi.nlm.nih.gov/clinvar/variation/21342/) | rs11556942 (T93M)           | [21349](https://www.ncbi.nlm.nih.gov/clinvar/variation/21349/) | **Affected** (SLOS)                 | [ClinVar VCV00021342](https://www.ncbi.nlm.nih.gov/clinvar/variation/21342/)  |
| 10  | Canavan Disease         | _ASPA_  | rs28940279 (E285A)        | [3389](https://www.ncbi.nlm.nih.gov/clinvar/variation/3389/)   | rs28940574 (Y231X)          | [3393](https://www.ncbi.nlm.nih.gov/clinvar/variation/3393/)   | **Affected** (Canavan)              | [PubMed 9400998](https://pubmed.ncbi.nlm.nih.gov/9400998/)                    |

### Coverage in `carrier-panel.json`

- **CFTR:** Both `rs75030207` (F508del) and `rs113993960` (G542X) are present.
- **HBB:** `rs334` (Sickle) and `rs11549407` (Beta-Thal) are present. `rs33930165` (HbC) is **missing** from the panel (only HbS and Beta-Thal are listed).
- **GBA:** `rs76763715` (N370S) and `rs28934895` (L444P) are present.
- **HEXA:** `rs76173977` is present. `rs387906309` (1278insTATC) is **not explicitly listed** as a separate rsID, though `rs76173977` is often used as a proxy or misidentified as the main Tay-Sachs variant in some panels.
- **PAH:** `rs5030858` (R408W) is present. IVS12+1G>A is **missing**.
- **GALT:** `rs74315350` is present (often linked to Q188R). S135L (`rs111033690`) is **missing**.
- **MEFV:** `rs61752717` (M694V) is present. V726A is **missing**.

### Recommended Test Scenarios for Carrier Analysis Logic

1.  **Standard Compound Heterozygote (CFTR):**
    - **Input:** User Genotype includes `rs75030207` (GT: T/C or 1/0) AND `rs113993960` (GT: A/G or 1/0).
    - **Expected Output:** `status: affected`, `risk_level: high`. Logic should detect two pathogenic variants in the _same_ gene.

2.  **Sickle-Beta Thalassemia (HBB):**
    - **Input:** User Genotype includes `rs334` (Sickle) AND `rs11549407` (Beta-Thal).
    - **Expected Output:** `status: affected`, `risk_level: high`. This validates detecting different variants associated with the same "condition" grouping or simply the same gene.

3.  **Simple Carrier (Negative Control for Compound Het):**
    - **Input:** User Genotype includes `rs75030207` (CFTR F508del) only.
    - **Expected Output:** `status: carrier`, `risk_level: medium` (or carrier specific). Should _not_ trigger compound het logic.

4.  **Homozygous Pathogenic (GBA):**
    - **Input:** User Genotype includes `rs76763715` (N370S) as Homozygous Alt (GT: T/T or 1/1).
    - **Expected Output:** `status: affected`, `risk_level: high`. Logic must distinguish between 1 copy (carrier) and 2 copies (affected).

5.  **Multi-Gene Separation (CFTR + HBB):**
    - **Input:** User Genotype includes `rs75030207` (CFTR Carrier) AND `rs334` (HBB Carrier).
    - **Expected Output:** `status: carrier` (Double Carrier), but **NOT** `affected`. Logic must ensure it doesn't cross-match variants between different genes.

## Action Items

1. **Data: Add missing variants to carrier panel** -- HbC (rs33930165), HEXA 1278insTATC (rs387906309), PAH IVS12+1G>A, GALT S135L (rs111033690), MEFV V726A (rs28940579)
2. **Engine: Implement compound het detection** -- Detect two different pathogenic variants in the same gene
3. **Engine: Implement gene-boundary enforcement** -- Never cross-match variants between different genes
4. **Testing: Create test fixtures** from the 5 recommended test scenarios above
5. **Testing: Add negative control tests** -- Ensure single-carrier and multi-gene carrier cases do NOT trigger compound het alerts

## Impact on Downstream Streams

- **Stream D (Data):** 5 missing variants must be added to carrier-panel.json
- **Stream E (Engine):** Compound het detection logic is a core feature requirement
- **Stream T (Testing):** 5+ test scenarios defined with specific inputs and expected outputs
- **Stream F (Frontend):** Results must distinguish "carrier" from "affected (compound het)" from "affected (homozygous)"
