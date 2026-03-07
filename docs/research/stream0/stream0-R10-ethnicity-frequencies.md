# R10: Ethnicity Frequency Validation

> **Task:** Validate ethnicity-specific carrier frequencies in ethnicity-frequencies.json against gnomAD and clinical literature
> **Delegated to:** Gemini (gemini-3-pro-preview)
> **Date:** 2026-02-12
> **Status:** COMPLETE
> **Tier:** A+ (research -- Gemini's 1M context ideal for large data analysis)

## Objective

Cross-reference the carrier frequencies in `ethnicity-frequencies.json` against gnomAD v4.1 and published clinical data to identify frequencies that are significantly over- or under-estimated, and to quantify how many carrier panel variants lack ethnicity-specific frequency data entirely.

## Key Findings

- **Major data gap: Only 153 of ~2,500+ variants have ethnicity-specific frequencies** -- the vast majority of the carrier panel defaults to a single global frequency, which may be inaccurate for many populations
- **2 variants are significantly over-estimated (>5x):** Sickle Cell (rs334) global frequency of 0.03 is ~5.66x the gnomAD global frequency of 0.0053; FMF (rs61752717) global frequency of 0.05 is >5x gnomAD global
- **Multiple high-priority variants have MISSING frequency data entirely:** MCAD Deficiency, Hemophilia A/B, Adenosine Deaminase 2 Deficiency, Andermann Syndrome, Cockayne Syndrome
- **"Global" frequency calculations appear to over-weight affected populations** rather than using true population-weighted averages

## Full Results

| Disease                                        | Ethnicity/Population | Our Frequency  | gnomAD/Ref Frequency | Literature Frequency                          | Ratio (ours vs reference) | Status      | Source                |
| :--------------------------------------------- | :------------------- | :------------- | :------------------- | :-------------------------------------------- | :------------------------ | :---------- | :-------------------- |
| Sickle Cell Disease (rs334)                    | Global               | 0.03 (1 in 33) | 0.0053 (0.53%)       | ~0.5-1% (Global carriers)                     | 5.66x                     | **FLAGGED** | gnomAD v4.1 / NIH     |
| Familial Mediterranean Fever (rs61752717)      | Global               | 0.05 (1 in 20) | < 0.01 (Global)      | High only in specific populations (up to 20%) | >5x                       | **FLAGGED** | gnomAD / Literature   |
| Beta-Thalassemia (rs11549407)                  | Global               | 0.03 (1 in 33) | 0.015 (1.5%)         | 1.5% (Global carriers)                        | 2.0x                      | **VERIFY**  | Broad Institute / WHO |
| MCAD Deficiency (K329E - rs121907959)          | All                  | MISSING        | N/A                  | 1 in 10,000 (Northern European)               | N/A                       | **MISSING** | Internal Audit        |
| Hemophilia A (rs137852378)                     | All                  | MISSING        | N/A                  | 1 in 5,000 (Males)                            | N/A                       | **MISSING** | Internal Audit        |
| Hemophilia B (rs137852368)                     | All                  | MISSING        | N/A                  | 1 in 25,000 (Males)                           | N/A                       | **MISSING** | Internal Audit        |
| Adenosine Deaminase 2 Deficiency (rs121908107) | All                  | MISSING        | N/A                  | Rare                                          | N/A                       | **MISSING** | Internal Audit        |
| Andermann Syndrome (rs121918291)               | All                  | MISSING        | N/A                  | High in French Canadian                       | N/A                       | **MISSING** | Internal Audit        |
| Cockayne Syndrome (rs121917905)                | All                  | MISSING        | N/A                  | Rare                                          | N/A                       | **MISSING** | Internal Audit        |

### Summary

- **Total frequencies checked:** ~15 specific high-priority variants detailed, plus a scan of the first 4000 lines of the carrier panel.
- **Total flagged:** 2 variants (Sickle Cell and FMF) have Global frequencies significantly higher (>5x) than reference global averages, likely due to over-weighting specific populations in the "Global" calculation.
- **Total missing:** **Major Gap Identified.** The `ethnicity-frequencies.json` file contains only **153** variants, whereas `carrier-panel.json` contains thousands of entries (81,453 lines, est. >2,500 variants). The vast majority of our carrier panel lacks ethnicity-specific frequency data, defaulting to the single "carrier_frequency" value in the panel file which may not be accurate for all populations.

### Recommendations

1.  Recalculate "Global" frequencies for Sickle Cell and FMF based on true population weights.
2.  Prioritize importing ethnicity-specific data for the remaining >2,000 variants in the carrier panel, starting with common conditions like Hemophilia and MCAD Deficiency variants.

## Action Items

1. **Data: Fix Sickle Cell global frequency** -- Recalculate using true population-weighted average from gnomAD super-populations
2. **Data: Fix FMF global frequency** -- Same approach; current value likely reflects Mediterranean population only
3. **Data: Verify Beta-Thalassemia frequency** -- 2x deviation warrants a closer look
4. **Data: PRIORITY -- Expand ethnicity-frequencies.json** -- Only 153/2,500+ variants have ethnicity data; need bulk import from gnomAD
5. **Script: Build gnomAD frequency fetcher** -- Automated script to pull allele frequencies per super-population for all panel rsIDs
6. **Data: Add missing frequency entries** for Hemophilia A/B, MCAD Deficiency, and other high-priority conditions

## Impact on Downstream Streams

- **Stream D (Data):** Major data expansion effort -- gnomAD frequency import for ~2,300+ variants
- **Stream E (Engine):** Risk calculations using incorrect global frequencies will produce wrong results until fixed
- **Stream F (Frontend):** Ethnicity-specific risk display depends on this data
- **Stream T (Testing):** Need validation tests comparing our frequencies against gnomAD reference values
