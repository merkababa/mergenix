# R5: PRS Distributions

> **Task:** Research ancestry-specific Polygenic Risk Score (PRS) distributions and transferability limitations
> **Delegated to:** Gemini (gemini-3-pro-preview)
> **Date:** 2026-02-12
> **Status:** COMPLETE
> **Tier:** A+ (research -- Gemini's 1M context ideal for large data analysis)

## Objective
For each PRS condition in our platform, determine the discovery GWAS population, document how well the scores transfer to non-European ancestries, and recommend UI treatment (standard display, caution badge, warning badge, or hide result) for each ancestry group.

## Key Findings
- **All current PRS weights are derived from European-ancestry GWAS** -- applying them directly to non-European populations creates mean shifts and variance contraction artifacts
- **Schizophrenia PRS in African ancestry is actively harmful** -- scores are artificially elevated due to allele frequency differences, not actual disease risk; should be hidden or strongly warned
- **Alzheimer's PRS is the most transferable** because the APOE4 effect is universal across ancestries
- **Ancestry-specific normalization is essential** -- must compare user scores to reference panels of their genetic ancestry, not a single global mean
- **Inflammatory Bowel Disease PRS** performs very poorly in African ancestries

## Full Results

### Ancestry-Specific PRS Distributions & Transferability

**Note on Distributions:** Most PRS implementations standardize scores to the discovery population (Mean=0, SD=1). Absolute raw score distributions for non-European populations are rarely published as static values because they depend heavily on the specific set of SNPs and weights used. Instead, transferability is typically measured by the attenuation of predictive power (Odds Ratio per SD).

| Condition | GWAS Source Population | European (Mean +/- SD) | African | East Asian | South Asian | Hispanic/Latino | Transferability | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Coronary Artery Disease** | European (Khera 2018) | 0.0 +/- 1.0 (Ref) | Lower Predictability (OR 1.25) | Moderate (OR 1.66) | Moderate (OR 1.47) | Moderate (OR 1.52) | **Medium** - Good in EAS/SAS/HIS, poor in AFR | **Show Caution Badge** for AFR |
| **Type 2 Diabetes** | European (Mahajan 2018) | 0.0 +/- 1.0 (Ref) | N/A | N/A | N/A | N/A | **Low/Medium** - TCF7L2 is robust, but full PRS performs poorly in non-EUR | **Show Caution Badge** for all non-EUR |
| **Breast Cancer** | European (Mavaddat 2019) | 0.0 +/- 1.0 (Ref) | N/A | Shifted Dist. | N/A | N/A | **Low** - Distributions shift significantly; absolute cutoffs invalid | **Show Caution Badge** for all non-EUR |
| **Prostate Cancer** | European (Schumacher 2018) | 0.0 +/- 1.0 (Ref) | High Risk (8q24 driven) | N/A | N/A | N/A | **Medium** - 8q24 locus is robust, but calibration varies | **Show Caution Badge** |
| **Alzheimer's Disease** | European (Kunkle 2019) | 0.0 +/- 1.0 (Ref) | Moderate (APOE driven) | Moderate | Moderate | Moderate | **Medium/High** - APOE4 effect is universal, though magnitude varies | **Standard Display** (APOE is dominant) |
| **Atrial Fibrillation** | Multi-ethnic (predom. EUR) (Roselli 2018) | 0.0 +/- 1.0 (Ref) | N/A | N/A | N/A | N/A | **Medium** - Better than pure EUR, but still EUR-centric | **Show Caution Badge** |
| **Inflammatory Bowel Disease** | Mixed/European (de Lange 2017) | 0.0 +/- 1.0 (Ref) | Poor | N/A | N/A | N/A | **Low** - Very poor prediction in African ancestries | **Show Warning Badge** for AFR |
| **Schizophrenia** | European (Ripke 2014) | 0.0 +/- 1.0 (Ref) | **Shifted High** (Artifact) | N/A | N/A | N/A | **Low** - Mean scores in AFR are artificially high due to allele freq. diffs | **Hide Result** or Strong Warning for AFR |
| **Asthma** | Multi-ancestry (Demenais 2018) | 0.0 +/- 1.0 (Ref) | Low (OR 1.05) | Moderate (OR 1.10) | N/A | Moderate (OR 1.12) | **Medium** - Multi-ancestry GWAS helps, but power still lower in AFR | **Show Caution Badge** |
| **Obesity (BMI)** | European (Yengo 2018) | 0.0 +/- 1.0 (Ref) | Poor | Moderate | N/A | N/A | **Low** - Predictive accuracy drops significantly in non-EUR | **Show Caution Badge** |

### PRS Transferability Best Practices Summary

Recent literature (PGS Catalog, 2024-2025 guidelines) emphasizes that applying European-derived weights directly to non-European populations creates two major errors:
1.  **Mean Shift:** The distribution of raw scores often shifts significantly (e.g., Schizophrenia scores are much higher in African ancestry) due to differences in allele frequencies, not actual disease risk.
2.  **Variance Contraction:** The spread of scores is often narrower in non-target populations, reducing the ability to distinguish high vs. low risk.

**Best Practices for Implementation:**
*   **Ancestry-Specific Normalization:** Do not use a single global reference (like the currently hardcoded `population_mean: 0.0`). Instead, compare a user's raw PRS to a reference panel of *their* genetic ancestry (e.g., 1000 Genomes Super-populations).
*   **Empirical Percentiles:** Report risk based on percentiles within the user's ancestry group, not the European distribution.
*   **Confidence Badges:** Visually indicate "Low Confidence" for ancestries where the PRS performance (R-squared) drops below 50% of the discovery population performance.

## Action Items
1. **Data: Add ancestry-specific reference distributions** -- Precompute PRS distributions for each 1000 Genomes Super-population
2. **Engine: Implement ancestry-aware normalization** -- Replace hardcoded `population_mean: 0.0` with ancestry-specific reference
3. **Engine: Add PRS confidence scoring** -- Per-condition, per-ancestry confidence level based on transferability data
4. **UI: Implement badge system** -- "Standard", "Caution" (yellow), "Warning" (orange), "Hidden" (red) badges per condition per ancestry
5. **UI: Hide Schizophrenia PRS for African ancestry** -- Actively harmful to display without proper calibration
6. **Docs: Add PRS limitations page** -- Explain transferability limitations to users in plain language

## Impact on Downstream Streams
- **Stream D (Data):** Need ancestry-specific reference distributions from 1000 Genomes
- **Stream E (Engine):** Major PRS normalization refactor -- ancestry-aware scoring pipeline
- **Stream F (Frontend):** Badge system, conditional hiding, confidence indicators
- **Stream T (Testing):** Test PRS output for each ancestry group with known expected values
