# R4: CNV-Based Diseases

> **Task:** Identify diseases in the carrier panel that are primarily caused by copy number variations (CNVs), repeat expansions, or structural variants -- mechanisms untestable on consumer SNP arrays
> **Delegated to:** Gemini (gemini-3-pro-preview)
> **Date:** 2026-02-12
> **Status:** COMPLETE
> **Tier:** A+ (research -- Gemini's 1M context ideal for large data analysis)

## Objective

Audit the carrier panel to identify diseases whose primary pathogenic mechanism (CNV, repeat expansion, large deletion/duplication, pseudogene conversion) makes them untestable or only partially testable on consumer SNP microarrays, and recommend which to remove vs. which to keep with disclaimers.

## Key Findings

- **9 diseases should be REMOVED entirely** -- their primary mechanisms (repeat expansions, whole-gene deletions, large duplications) are fundamentally incompatible with SNP array testing
- **8 diseases should be kept with mandatory disclaimers** -- they have both SNP-testable and untestable mechanisms, so a negative result cannot rule out carrier status
- **SMA, Alpha-Thalassemia, and Fragile X** are the highest-impact removals -- all are common conditions with significant carrier frequencies that our platform simply cannot detect reliably
- **Pseudogene interference** (CYP21A2, GBA, IDS) is an underappreciated source of false results on SNP arrays

## Full Results

### Table 1 -- Diseases to REMOVE (Untestable on consumer chips)

These conditions are primarily caused by mechanisms (Copy Number Variations, Repeat Expansions, Structural Variants) that standard SNP arrays cannot reliably detect. Testing single SNPs for these conditions is clinically misleading as it misses the vast majority of carriers.

| Disease                                  | Gene           | Mechanism                              | Why Untestable                                                                                                                                            | Recommendation               |
| :--------------------------------------- | :------------- | :------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------- |
| **Spinal Muscular Atrophy (SMA)**        | _SMN1_         | **Copy Number Loss** (Exon 7 deletion) | Caused by loss of _SMN1_ copies (0 copies = affected, 1 copy = carrier). SNP arrays cannot count gene copies reliably without specific probes/algorithms. | **REMOVE** (Already flagged) |
| **Duchenne / Becker Muscular Dystrophy** | _DMD_          | **Large Deletions/Duplications**       | ~65-70% of cases are large intragenic deletions/duplications. Point mutations are a minority. Arrays rarely cover the thousands of potential breakpoints. | **REMOVE**                   |
| **Alpha-Thalassemia**                    | _HBA1_, _HBA2_ | **Large Deletions** (`--SEA`, etc.)    | >90% of cases are whole-gene deletions. The homologous _HBA1_ and _HBA2_ genes are hard to distinguish on arrays, and deletions are not detected by SNPs. | **REMOVE**                   |
| **Friedreich Ataxia**                    | _FXN_          | **Trinucleotide Repeat** (GAA)         | Caused by >66 GAA repeats in intron 1. Arrays cannot size repeat expansions. SNPs do not correlate perfectly with expansion status.                       | **REMOVE**                   |
| **Myotonic Dystrophy Type 1**            | _DMPK_         | **Trinucleotide Repeat** (CTG)         | Caused by >50 CTG repeats in 3' UTR. Arrays cannot detect or size this expansion.                                                                         | **REMOVE**                   |
| **Myotonic Dystrophy Type 2**            | _CNBP_         | **Tetranucleotide Repeat** (CCTG)      | Caused by CCTG expansion in intron 1. Untestable on SNP arrays.                                                                                           | **REMOVE**                   |
| **ALS / Frontotemporal Dementia**        | _C9orf72_      | **Hexanucleotide Repeat** (GGGGCC)     | Pathogenicity is defined by >30 repeats. SNP arrays cannot detect this. The rsID listed (`rs74102936`) is a risk tag, not diagnostic.                     | **REMOVE**                   |
| **Pelizaeus-Merzbacher Disease**         | _PLP1_         | **Gene Duplication**                   | ~60-70% of cases are whole _PLP1_ gene duplications. Arrays are poor at detecting single-gene duplications.                                               | **REMOVE**                   |
| **Angelman Syndrome**                    | _UBE3A_        | **Imprinting / Deletion**              | Mostly caused by maternal 15q11-q13 deletion (70%) or UPD. _UBE3A_ point mutations are rare (~10%). Testing SNPs misses the major causes.                 | **REMOVE**                   |

### Table 2 -- Diseases to ADD DISCLAIMER (Partially testable, mixed mechanism)

These conditions have a significant number of cases caused by SNPs (testable), but also a significant portion caused by structural variants or pseudogene issues (untestable). They can be kept but require strong disclaimers that a "negative" result does not rule out being a carrier.

| Disease                            | Gene      | Mechanism                      | What Is Testable                                      | What Is Not                                                                                       | Suggested Disclaimer                                                                                               |
| :--------------------------------- | :-------- | :----------------------------- | :---------------------------------------------------- | :------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------- |
| **Congenital Adrenal Hyperplasia** | _CYP21A2_ | **Pseudogene / Conversion**    | Specific point mutations (e.g., I172N) can be tested. | Large deletions and gene conversions with _CYP21A1P_ pseudogene (20-30% of alleles).              | "Detects common point mutations only. Does not detect large deletions or gene conversions common in this gene."    |
| **Gaucher Disease**                | _GBA_     | **Pseudogene / Recombination** | Common variants like N370S, L444P are SNPs.           | Recombinant alleles from _GBAP1_ pseudogene; complex rearrangements.                              | "Detects specific common variants (e.g., N370S). Due to gene complexity, some carriers may be missed."             |
| **Hemophilia A**                   | _F8_      | **Inversion**                  | Point mutations (nonsense/missense) are testable.     | Intron 22 and Intron 1 inversions cause ~45-50% of severe cases.                                  | "Detects specific variants only. Does not detect the chromosomal inversions responsible for ~50% of severe cases." |
| **Hunter Syndrome**                | _IDS_     | **Recombination / Deletion**   | Point mutations.                                      | Large deletions and recombination with _IDS2_ pseudogene (~20% of cases).                         | "Detects point mutations only. Does not detect large deletions or rearrangements common in this condition."        |
| **Krabbe Disease**                 | _GALC_    | **Large Deletion**             | Point mutations.                                      | A specific 30kb deletion is the most common pathogenic allele in Europeans (~40-50% of carriers). | "This test does not detect the 30kb deletion which is a common cause of Krabbe disease in Europeans."              |
| **Cystinosis**                     | _CTNS_    | **Large Deletion**             | Point mutations.                                      | A 57kb deletion is the most common cause in Northern Europeans (~75% of alleles).                 | "Does not detect the 57kb deletion common in Northern European populations."                                       |
| **Nemaline Myopathy**              | _NEB_     | **CNV / Giant Gene**           | Specific familial mutations.                          | _NEB_ is huge (183 exons). Deletions/duplications are common and missed by SNPs.                  | "Limited sensitivity. This test covers only specific variants and does not rule out all carrier states."           |
| **Oculocutaneous Albinism Type 2** | _OCA2_    | **Large Deletion**             | Point mutations.                                      | A 2.7kb deletion is the founder mutation in many African populations.                             | "Does not detect the 2.7kb deletion common in African populations."                                                |

## Action Items

1. **Data: REMOVE 9 diseases** from carrier-panel.json (SMA, DMD, Alpha-Thal, Friedreich Ataxia, DM1, DM2, C9orf72 ALS, PMD, Angelman)
2. **Data: ADD disclaimer field** to 8 diseases (CAH, Gaucher, Hemophilia A, Hunter, Krabbe, Cystinosis, Nemaline Myopathy, OCA2)
3. **UI: Display disclaimers prominently** -- these must be visible in the results, not buried in a footer
4. **Docs: Update condition list** in marketing/about pages to reflect removed conditions
5. **Engine: Add "partially testable" flag** to analysis output for disclaimer diseases

## Impact on Downstream Streams

- **Stream D (Data):** Major panel cleanup -- remove 9 diseases, add disclaimer field to 8 others
- **Stream E (Engine):** Must handle "partially testable" flag in analysis logic
- **Stream F (Frontend):** Disclaimer rendering in results UI
- **Stream T (Testing):** Update test suite to exclude removed diseases and verify disclaimer display
