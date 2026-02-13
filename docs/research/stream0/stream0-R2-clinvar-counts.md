# R2: ClinVar Pathogenic Counts

> **Task:** Count ClinVar pathogenic/likely-pathogenic variants per gene vs our panel's rsID coverage
> **Delegated to:** Gemini (gemini-3-pro-preview)
> **Date:** 2026-02-12
> **Status:** COMPLETE
> **Tier:** A+ (research -- Gemini's 1M context ideal for large data analysis)

## Objective
For each gene in our carrier panel, determine how many pathogenic/likely-pathogenic variants exist in ClinVar compared to how many rsIDs we actually test, and assess whether our coverage is "Good", "Partial", or "Minimal" for each disease.

## Key Findings
- **Most large genes have "Minimal" coverage** -- genes like BRCA1/2, FBN1, COL1A1, F8 have thousands of ClinVar variants but we test <20 rsIDs each
- **Focused panels for Ashkenazi diseases are "Good"** -- Canavan, Gaucher, Tay-Sachs, Familial Dysautonomia have excellent coverage because a few founder mutations account for >90% of cases
- **Fragile X is completely untestable** on SNP arrays (repeat expansion mechanism)
- **SMA requires dosage analysis** -- our SNP-based approach is only a proxy for the exon 7 deletion that causes 95% of cases
- **PGx genes (CYP2D6, CYP2C19) have "Good" coverage** because major star alleles are well-defined SNPs

## Full Results

| Disease Name | Gene | OMIM ID | ClinVar Pathogenic Count (est.) | SNP-testable Count | Our rsID Count | Coverage Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cystic Fibrosis** | *CFTR* | 219700 | ~2,100 | ~1,800 | 13 | **Partial** (Covers common Caucasian variants, misses many ethnic-specific ones) |
| **Sickle Cell Disease** | *HBB* | 603903 | ~550 | ~400 | 13 | **Good** (Includes HbS, HbC, key beta-thal variants) |
| **Tay-Sachs Disease** | *HEXA* | 272800 | ~180 | ~150 | 4 | **Good** (Common AJ mutations covered, misses rare ones) |
| **Marfan Syndrome** | *FBN1* | 154700 | ~3,200 | ~2,800 | 17 | **Minimal** (Requires sequencing; <1% coverage) |
| **Muenke Syndrome** | *FGFR3* | 602849 | ~450 | ~400 | 16 | **Good** (Hotspot mutations well-covered) |
| **CYP2D6 Poor Metabolizer** | *CYP2D6* | 124030 | N/A (PGx) | N/A | 15 | **Good** (Covers major *4, *10, *17, *41 alleles) |
| **CYP2C19 Poor Metabolizer** | *CYP2C19* | 124020 | N/A (PGx) | N/A | 14 | **Good** (Covers major *2, *3 alleles) |
| **Osteogenesis Imperfecta Type 1** | *COL1A1* | 166200 | ~1,400 | ~1,200 | 12 | **Minimal** (Requires sequencing) |
| **Spondyloepiphyseal Dysplasia** | *COL2A1* | 183900 | ~800 | ~700 | 12 | **Minimal** (Requires sequencing) |
| **Long QT Syndrome Type 3** | *SCN5A* | 603830 | ~1,100 | ~1,000 | 12 | **Minimal** (Hotspots covered, but many private mutations exist) |
| **DPD Deficiency** | *DPD* | 274270 | ~150 | ~130 | 12 | **Good** (Covers *2A and key toxicity variants) |
| **Fabry Disease** | *GLA* | 301500 | ~1,200 | ~1,100 | 11 | **Minimal** (Requires sequencing) |
| **Von Willebrand Disease** | *VWF* | 193400 | ~900 | ~800 | 11 | **Minimal** (Requires sequencing) |
| **Li-Fraumeni Syndrome** | *TP53* | 151623 | ~1,800 | ~1,600 | 11 | **Minimal** (Covers only top hotspots) |
| **Congenital Adrenal Hyperplasia** | *CYP21A2* | 201910 | ~250 | ~150 | 10 | **Good** (Covers common SNPs, misses large deletions/conversions) |
| **Cystinosis** | *CTNS* | 219800 | ~160 | ~140 | 10 | **Partial** (Covers common 57kb deletion proxy + SNPs) |
| **Osteogenesis Imperfecta Type 3** | *COL1A2* | 259420 | ~850 | ~800 | 10 | **Minimal** |
| **BRCA2-Related Cancer** | *BRCA2* | 612555 | ~4,500 | ~3,500 | 10 | **Minimal** (Likely AJ founder mutations only) |
| **Ataxia-Telangiectasia** | *ATM* | 208900 | ~2,200 | ~1,800 | 9 | **Minimal** |
| **Gitelman Syndrome** | *SLC12A3* | 263800 | ~550 | ~500 | 9 | **Minimal** |
| **Vascular Ehlers-Danlos** | *COL3A1* | 130050 | ~750 | ~700 | 9 | **Minimal** |
| **Crouzon Syndrome** | *FGFR2* | 123500 | ~400 | ~380 | 9 | **Partial** (Hotspots covered) |
| **Dilated Cardiomyopathy** | *LMNA* | 115200 | ~1,200 | ~1,100 | 9 | **Minimal** |
| **BRCA1-Related Cancer** | *BRCA1* | 604370 | ~3,800 | ~3,000 | 9 | **Minimal** (Likely AJ founder mutations only) |
| **Pseudohypoparathyroidism** | *GNAS* | 103580 | ~300 | ~250 | 9 | **Minimal** |
| **G6PD Deficiency** | *G6PD* | 305900 | ~250 | ~220 | 8 | **Good** (Covers common A-, Mediterranean variants) |
| **Crigler-Najjar Syndrome** | *UGT1A1* | 218800 | ~150 | ~120 | 8 | **Good** (Covers Gilbert/*28 and major alleles) |
| **Hypertrophic Cardiomyopathy** | *MYBPC3* | 115197 | ~1,600 | ~1,400 | 8 | **Minimal** |
| **Familial Adenomatous Polyposis** | *APC* | 175100 | ~1,900 | ~1,200 | 8 | **Minimal** |
| **Wilms Tumor** | *WT1* | 194070 | ~450 | ~400 | 8 | **Minimal** |
| **Stargardt Disease** | *ABCA4* | 248200 | ~1,500 | ~1,300 | 7 | **Minimal** |
| **Congenital Deafness** | *GJB2* | 220290 | ~150 | ~120 | 7 | **Good** (Covers 35delG, 167delT, M34T - top alleles) |
| **Hemophilia A** | *F8* | 306700 | ~2,500 | ~1,500 | 7 | **Minimal** (Misses inversions and rare SNPs) |
| **Jervell and Lange-Nielsen** | *KCNQ1* | 220400 | ~800 | ~750 | 7 | **Minimal** |
| **AD Polycystic Kidney Disease** | *PKD1* | 173900 | ~2,200 | ~1,800 | 7 | **Minimal** |
| **Spinal Muscular Atrophy** | *SMN1* | 253300 | ~50 | ~5 | 5 | **Partial** (SNPs are proxies; requires dosage analysis for 95%) |
| **Gaucher Disease** | *GBA* | 230800 | ~350 | ~300 | 5 | **Good** (N370S, L444P, 84GG cover >90% of AJ/Western cases) |
| **Familial Hypercholesterolemia** | *LDLR* | 143890 | ~2,300 | ~2,000 | 6 | **Minimal** |
| **Phenylketonuria** | *PAH* | 261600 | ~1,300 | ~1,200 | 3 | **Partial** (Covers R408W and top 2-3 alleles) |
| **Canavan Disease** | *ASPA* | 271900 | ~80 | ~70 | 3 | **Good** (E285A, Y231X, A305E cover >98% of AJ cases) |
| **Fragile X Syndrome** | *FMR1* | 300624 | N/A | 0 | 0 | **Untestable** (Repeat expansion not on SNP panel) |

## Action Items
1. **Data: Add coverage tier to each disease entry** -- "Good", "Partial", "Minimal", or "Untestable" should be a field in `carrier-panel.json`
2. **UI: Display coverage tier** -- Users should see whether a negative result is meaningful for each disease
3. **Data: Remove Fragile X** from carrier panel (untestable on SNP arrays) or add a permanent "untestable" disclaimer
4. **Engine: Add coverage-aware risk calculations** -- A "Minimal" coverage negative should not be reported the same as a "Good" coverage negative

## Impact on Downstream Streams
- **Stream D (Data):** Coverage tier field must be added to carrier-panel.json schema
- **Stream E (Engine):** Risk calculation must factor in coverage tier
- **Stream F (Frontend):** Results UI must visually differentiate coverage levels
- **Stream T (Testing):** Test matrix must cover all four coverage tiers
