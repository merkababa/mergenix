# R7: Detection Rates by Ethnicity

> **Task:** Compile clinical vs. consumer-array detection rates for key carrier diseases across ethnic groups, with residual risk calculations
> **Delegated to:** Gemini (gemini-3-pro-preview)
> **Date:** 2026-02-12
> **Status:** COMPLETE
> **Tier:** A+ (research -- Gemini's 1M context ideal for large data analysis)

## Objective

For each high-priority carrier disease, document the carrier frequency per ethnicity, the clinical-grade detection rate, the estimated consumer-array detection rate, and the residual risk after a negative test result. This data is critical for accurate post-test risk reporting.

## Key Findings

- **Consumer array detection rates are dramatically lower than clinical detection rates** for most conditions, especially Beta-Thalassemia (<20% on arrays vs >99% clinical) and Alpha-Thalassemia (near-zero on arrays)
- **Cystic Fibrosis detection varies enormously by ethnicity** -- 90% for Europeans but <30% for East Asians on consumer arrays
- **Residual risk after negative test is ethnicity-dependent** -- an African American testing negative for CF still has ~1 in 550-830 residual carrier risk vs ~1 in 240-480 for Europeans
- **Fragile X is 0% detectable on consumer arrays** -- repeat expansion mechanism is completely incompatible with SNP testing
- **Sickle Cell Trait (rs334) is technically detectable** on many consumer arrays but reporting varies by platform and regulatory status

## Full Results

| Disease                     | Ethnicity                | Carrier Frequency | Clinical Detection Rate   | Consumer Array Detection Rate (est.) | Residual Risk (post-negative) | Source               |
| :-------------------------- | :----------------------- | :---------------- | :------------------------ | :----------------------------------- | :---------------------------- | :------------------- |
| **Cystic Fibrosis**         | Ashkenazi Jewish         | 1 in 26 (3.8%)    | >97%                      | ~90% (28-variant panel)              | ~1 in 850                     | `ethnicity.ts` / Lit |
|                             | European (Non-Finnish)   | 1 in 25 (4.0%)    | 90-95%                    | ~85-90%                              | ~1 in 240 to 1 in 480         | `ethnicity.ts` / Lit |
|                             | African/African-American | 1 in 166 (0.6%)   | 70-80%                    | <60%                                 | ~1 in 550 to 1 in 830         | `ethnicity.ts` / Lit |
|                             | Hispanic/Latino          | 1 in 62 (1.6%)    | 80-90%                    | ~60-70%                              | ~1 in 300 to 1 in 600         | `ethnicity.ts` / Lit |
|                             | East Asian               | 1 in 1000 (0.1%)  | 50-60%                    | <30%                                 | ~1 in 2000                    | `ethnicity.ts` / Lit |
|                             | South Asian              | 1 in 200 (0.5%)   | 60-70%                    | <40%                                 | ~1 in 500                     | `ethnicity.ts` / Lit |
| **Sickle Cell Disease**     | African/African-American | 1 in 12 (8.3%)    | >99%                      | High (if reported)\*                 | ~1 in 1200                    | `ethnicity.ts` / Lit |
|                             | Hispanic/Latino          | 1 in 66 (1.5%)    | >99%                      | High (if reported)\*                 | ~1 in 6600                    | `ethnicity.ts` / Lit |
|                             | Middle Eastern           | 1 in 40 (2.5%)    | >99%                      | High (if reported)\*                 | ~1 in 4000                    | `ethnicity.ts` / Lit |
|                             | European (Non-Finnish)   | 1 in 1000 (0.1%)  | >99%                      | High (if reported)\*                 | ~1 in 100,000                 | `ethnicity.ts` / Lit |
| **Tay-Sachs Disease**       | Ashkenazi Jewish         | 1 in 30 (3.3%)    | 99% (Enzyme+DNA)          | ~90-95%                              | ~1 in 3000                    | `ethnicity.ts` / Lit |
|                             | European (Non-Finnish)   | 1 in 300 (0.3%)   | 95% (Sequencing)          | <5% (rarely on panel)                | ~1 in 6000                    | `ethnicity.ts` / Lit |
|                             | French Canadian / Cajun  | 1 in 50 (2.0%)    | 99% (Sequencing)          | Varies (often specific)              | ~1 in 5000                    | Lit                  |
| **Beta-Thalassemia**        | South Asian              | 1 in 20 (5.0%)    | >99% (Hb Electrophoresis) | Low (<20%)                           | ~1 in 2000                    | `ethnicity.ts` / Lit |
|                             | Middle Eastern           | 1 in 16 (6.0%)    | >99%                      | Low (<20%)                           | ~1 in 1600                    | `ethnicity.ts` / Lit |
|                             | East Asian               | 1 in 25 (4.0%)    | >99%                      | Low (<20%)                           | ~1 in 2500                    | `ethnicity.ts` / Lit |
|                             | African/African-American | 1 in 50 (2.0%)    | >99%                      | Low (<20%)                           | ~1 in 5000                    | `ethnicity.ts` / Lit |
|                             | European (Non-Finnish)   | 1 in 66 (1.5%)    | >99%                      | Low (<20%)                           | ~1 in 6600                    | `ethnicity.ts` / Lit |
| **Alpha-Thalassemia**       | East Asian               | 1 in 12 (8.0%)    | >90% (PCR/Sequencing)     | Low (Deletions missed)               | ~1 in 120                     | `ethnicity.ts` / Lit |
|                             | African/African-American | 1 in 14 (7.0%)    | >90%                      | Low                                  | ~1 in 140                     | `ethnicity.ts` / Lit |
|                             | South Asian              | 1 in 16 (6.0%)    | >90%                      | Low                                  | ~1 in 160                     | `ethnicity.ts` / Lit |
|                             | Middle Eastern           | 1 in 20 (5.0%)    | >90%                      | Low                                  | ~1 in 200                     | `ethnicity.ts` / Lit |
| **Fragile X Syndrome**      | All Ethnicities (Female) | ~1 in 178         | 99% (Repeat Sizing)       | 0% (Not on arrays)                   | ~1 in 17,800                  | Lit                  |
| **Spinal Muscular Atrophy** | European (Non-Finnish)   | 1 in 45 (2.2%)    | 95% (Dosage)              | ~90% (Deletion only)                 | ~1 in 900                     | `ethnicity.ts` / Lit |
|                             | African/African-American | 1 in 71 (1.4%)    | ~71% (Silent carriers)    | ~70%                                 | ~1 in 240                     | `ethnicity.ts` / Lit |
|                             | Asian                    | 1 in 50 (2.0%)    | ~93%                      | ~90%                                 | ~1 in 700                     | `ethnicity.ts` / Lit |
| **Gaucher Disease**         | Ashkenazi Jewish         | 1 in 16 (6.0%)    | >99%                      | ~90-95%                              | ~1 in 1600                    | `ethnicity.ts` / Lit |
|                             | European/General         | 1 in 200 (0.5%)   | >99%                      | Low (<10%)                           | ~1 in 20,000                  | `ethnicity.ts` / Lit |
| **Canavan Disease**         | Ashkenazi Jewish         | 1 in 40 (2.5%)    | >98%                      | ~95%                                 | ~1 in 2000                    | Lit                  |
| **Familial Dysautonomia**   | Ashkenazi Jewish         | 1 in 30 (3.3%)    | >99%                      | ~99% (Major mutation)                | ~1 in 3000                    | Lit                  |

\* _Sickle Cell Trait (HbAS) is technically detectable on many consumer arrays (e.g., rs334), but reporting varies by platform and regulatory status. "High" assumes the variant is assayed and reported._

**Key Notes:**

- **Clinical Detection Rate:** Refers to standard-of-care carrier screening (often NGS or specific genotyping panels).
- **Consumer Array Detection Rate:** Estimated based on typical SNP arrays (e.g., Illumina GSA) used by DTC companies, which focus on specific point mutations and often miss copy number variants (CNVs), deletions (alpha-thalassemia, SMA), or triplet repeats (Fragile X).
- **Residual Risk:** Calculated as `(Carrier Freq * (1 - Detection Rate)) / (1 - (Carrier Freq * Detection Rate))`. This represents the risk of being a carrier _after_ testing negative.
- **Data Sources:** `ethnicity.ts`/`ethnicity-frequencies.json` for base frequencies; clinical literature (ACMG, ACOG, OMIM) for detection rates.

## Action Items

1. **Data: Add detection rate fields** to carrier-panel.json -- `clinical_detection_rate` and `consumer_array_detection_rate` per ethnicity
2. **Engine: Implement residual risk calculation** -- Use the formula above with ethnicity-specific inputs
3. **UI: Display residual risk** -- After a negative result, show "Your residual carrier risk is X" based on ethnicity
4. **UI: Add ethnicity-specific context** -- Different messaging for ethnicities with low consumer detection rates
5. **Docs: Create "Understanding Your Results" page** -- Explain difference between clinical and consumer testing

## Impact on Downstream Streams

- **Stream D (Data):** Detection rate fields needed per disease per ethnicity
- **Stream E (Engine):** Residual risk calculation module
- **Stream F (Frontend):** Residual risk display, ethnicity-contextualized messaging
- **Stream T (Testing):** Validate residual risk calculations across all ethnicity/disease combinations
