# Mergenix Genetic Data Quality & Algorithm Improvement Report

**Date:** 2026-02-08
**Scope:** carrier_analysis.py, trait_prediction.py, clinvar_client.py, carrier_panel.json, trait_snps.json
**Panel size:** 2,715 diseases (1,477 AR, 1,057 AD, 181 X-linked), 79 trait SNPs

---

## Table of Contents

1. [CRITICAL BUG: Trait Prediction Runtime Crash](#1-critical-bug-trait-prediction-runtime-crash)
2. [CRITICAL: Inheritance Model Accuracy](#2-critical-inheritance-model-accuracy)
3. [Compound Heterozygosity](#3-compound-heterozygosity)
4. [Incomplete Penetrance & Variable Expressivity](#4-incomplete-penetrance--variable-expressivity)
5. [Polygenic Risk Scores](#5-polygenic-risk-scores)
6. [Pharmacogenomics Depth](#6-pharmacogenomics-depth)
7. [Trait Prediction Beyond Punnett](#7-trait-prediction-beyond-punnett)
8. [ClinVar Freshness](#8-clinvar-freshness)
9. [Confidence Calibration](#9-confidence-calibration)
10. [Panel Comparison vs Clinical Labs](#10-panel-comparison-vs-clinical-labs)
11. [Ancestry-Aware Carrier Frequencies](#11-ancestry-aware-carrier-frequencies)
12. [VCF Annotation Improvements](#12-vcf-annotation-improvements)
13. [Offspring Prediction Model Correctness](#13-offspring-prediction-model-correctness)
14. [Scientific Disclaimers](#14-scientific-disclaimers)
15. [Prioritized Recommendations](#15-prioritized-recommendations)

---

## 1. CRITICAL BUG: Trait Prediction Runtime Crash

### Finding

**Severity: P0 -- Application crash on any trait prediction**

`trait_prediction.py:map_genotype_to_phenotype()` (line 104-124) returns the raw `phenotype_map` dict value, which is a nested dict like:

```python
{"phenotype": "Brown Eyes", "description": "...", "probability": "high"}
```

This dict is then used as a dict key at line 187:

```python
phenotype_probs[phenotype] = phenotype_probs.get(phenotype, 0.0) + prob
```

Python dicts are **not hashable** and cannot be used as dict keys. This raises `TypeError: unhashable type: 'dict'` at runtime for every trait prediction.

### Root Cause

The `trait_snps.json` schema was updated to use nested dicts for phenotype values (adding `description` and `probability` fields), but `map_genotype_to_phenotype()` was not updated to extract just the `phenotype` string.

### Fix Required

```python
# In map_genotype_to_phenotype(), change return values:
if genotype in phenotype_map:
    value = phenotype_map[genotype]
    return value['phenotype'] if isinstance(value, dict) else value
```

### Testing Gap

**There are zero tests for trait_prediction.py.** The functions `predict_trait()`, `analyze_traits()`, `map_genotype_to_phenotype()`, and `punnett_square()` have no test coverage whatsoever. This is how a runtime crash went undetected.

---

## 2. CRITICAL: Inheritance Model Accuracy

### Current State

`carrier_analysis.py` uses a **single** Mendelian autosomal recessive (AR) inheritance model for ALL 2,715 diseases, as documented in lines 2-5:

> "This module compares two parents' genotypes against a panel of known recessive diseases to identify offspring risk based on Mendelian autosomal recessive inheritance."

However, the actual panel contains:

| Inheritance         | Count | % of Panel |
| ------------------- | ----- | ---------- |
| autosomal_recessive | 1,477 | 54.4%      |
| autosomal_dominant  | 1,057 | 38.9%      |
| X-linked            | 181   | 6.7%       |

**45.6% of diseases use the WRONG inheritance model.** The `calculate_offspring_risk()` function (line 119) applies AR risk calculations to AD and X-linked conditions, producing scientifically incorrect results.

### Correct Offspring Risk Tables

#### Autosomal Dominant (AD)

For AD conditions, a single pathogenic allele causes disease. The risk table should be:

| Parent A       | Parent B       | Affected | Carrier\* | Normal |
| -------------- | -------------- | -------- | --------- | ------ |
| normal         | normal         | 0%       | 0%        | 100%   |
| normal         | affected (het) | 50%      | 0%        | 50%    |
| normal         | affected (hom) | 100%     | 0%        | 0%     |
| affected (het) | affected (het) | 75%      | 0%        | 25%    |
| affected (het) | affected (hom) | 100%     | 0%        | 0%     |

\*Note: "Carrier" is not a meaningful status for AD conditions -- one copy = affected.

#### X-Linked Recessive

X-linked conditions require **sex-aware** risk calculation:

**If mother is carrier (Xx) and father is normal (XY):**

- Daughters: 50% carrier, 50% normal
- Sons: 50% affected, 50% normal

**If mother is carrier (Xx) and father is affected (xY):**

- Daughters: 50% carrier, 50% affected
- Sons: 50% affected, 50% normal

**If mother is affected (xx) and father is normal (XY):**

- Daughters: 100% carrier
- Sons: 100% affected

### Impact

- For **1,057 autosomal dominant conditions**: A carrier parent (heterozygous for a dominant allele) would have a "carrier_detected" risk level when the offspring actually has a **50% chance of being affected**. This is a major understatement of risk.
- For **181 X-linked conditions**: Risk depends on offspring sex, which is not modeled. A carrier mother's sons have 50% chance of being affected, but the current model reports 0% affected risk for carrier x normal, which is dangerously wrong.

### Recommendation

Implement three separate risk calculation functions dispatched by inheritance type:

```python
def calculate_offspring_risk(parent_a_status, parent_b_status, inheritance):
    if inheritance == "autosomal_recessive":
        return _calculate_ar_risk(parent_a_status, parent_b_status)
    elif inheritance == "autosomal_dominant":
        return _calculate_ad_risk(parent_a_status, parent_b_status)
    elif inheritance == "X-linked":
        return _calculate_xlinked_risk(parent_a_status, parent_b_status)
```

For X-linked conditions, return **sex-stratified** results:

```python
{
    "sons": {"affected": 50.0, "carrier": 0.0, "normal": 50.0},
    "daughters": {"affected": 0.0, "carrier": 50.0, "normal": 50.0}
}
```

**Priority: CRITICAL -- this is a scientific accuracy issue affecting nearly half the panel.**

---

## 3. Compound Heterozygosity

### Current Gap

The system models each disease as a single SNP (rsid). However, many autosomal recessive conditions can be caused by **compound heterozygosity** -- inheriting two DIFFERENT pathogenic variants in the same gene.

For example, Cystic Fibrosis is caused by mutations in CFTR. Our panel has multiple CFTR entries (rs75030207 for F508del, rs113993960 for G542X). A parent could be heterozygous at rs75030207 (carrier for F508del) and a different parent could be heterozygous at rs113993960 (carrier for G542X). The current system would classify both parents as "carrier" for their respective variants but would NOT identify the compound heterozygosity risk for offspring.

### Clinical Significance

Compound heterozygosity is the cause of disease in a significant fraction of autosomal recessive conditions. For CF specifically, F508del/G542X compound heterozygotes are clinically affected.

### Recommendation

Add a gene-level aggregation step after per-SNP analysis:

1. Group panel entries by gene
2. For genes with multiple pathogenic variants, check if both parents carry different variants in the same gene
3. If parent A is carrier at variant 1 and parent B is carrier at variant 2 (same gene), flag compound heterozygosity risk
4. Note: without phasing data, we cannot determine if two variants in the same parent are in cis or trans

**Priority: HIGH -- affects diagnostic accuracy for multi-variant genes (CFTR, HBB, etc.)**

---

## 4. Incomplete Penetrance & Variable Expressivity

### Current Gap

The `determine_carrier_status()` function (line 75-116) and `_determine_risk_level()` (line 166-194) treat pathogenicity as binary: you either have the allele or you don't. This ignores:

1. **Incomplete penetrance**: Not all individuals with a pathogenic genotype develop the disease. For example:
   - BRCA1/2 mutations: 40-87% lifetime penetrance for breast cancer
   - Huntington's disease: nearly 100% penetrance but age-dependent
   - Hereditary hemochromatosis (HFE): only ~1-28% clinical penetrance

2. **Variable expressivity**: Same genotype can produce different severity. For example:
   - Marfan syndrome: ranges from mild to life-threatening
   - Neurofibromatosis type 1: variable severity even within families

### Recommendation

Add a `penetrance` field to `carrier_panel.json`:

```json
{
  "penetrance": {
    "value": 0.85,
    "type": "age_dependent",
    "notes": "85% by age 70"
  }
}
```

Adjust offspring risk calculation:

```python
adjusted_risk = raw_risk * penetrance_value
```

Display both raw Mendelian risk and penetrance-adjusted risk in the UI.

**Priority: MEDIUM -- improves accuracy but current binary model is the clinical standard for carrier screening panels.**

---

## 5. Polygenic Risk Scores

### Current State

The system only models single-SNP (monogenic) conditions. Complex diseases like type 2 diabetes, coronary artery disease, and most cancers are polygenic -- influenced by hundreds or thousands of SNPs.

### Research Findings

- FDA regulation of DTC polygenic risk scores (PRS) is still evolving (as of 2025-2026)
- PRS accuracy varies significantly by ancestry -- scores derived from European cohorts perform poorly in non-European populations
- Clinical utility is still debated: PRS results don't change management for most individuals
- The American Heart Association published a scientific statement cautioning about DTC genetic testing for cardiovascular disease, noting that PRS "do not provide a diagnosis"

### Feasibility Assessment

| Factor                    | Assessment                                                    |
| ------------------------- | ------------------------------------------------------------- |
| Data availability         | Consumer DTC files have ~600K-900K SNPs, enough for basic PRS |
| Scientific validity       | Moderate for European ancestry, poor for other populations    |
| Regulatory risk           | HIGH -- FDA is actively developing DTC-PRS framework          |
| Implementation complexity | HIGH -- requires genome-wide scoring, reference panels        |
| Liability                 | HIGH -- users may make medical decisions based on PRS         |

### Recommendation

**Do NOT implement clinical PRS at this time.** Instead:

1. Add educational content explaining polygenic vs monogenic inheritance
2. For traits already in the system (e.g., Type 2 Diabetes Risk, Obesity Risk), clearly label them as "single SNP association, not a clinical risk score"
3. Consider adding a "Research Interest" section that shows multiple SNP associations without making clinical claims
4. Monitor FDA guidance -- if a DTC-PRS framework is formalized, revisit

**Priority: LOW for implementation, HIGH for disclaimers on existing polygenic traits.**

---

## 6. Pharmacogenomics Depth

### Current State

The panel includes 158 pharmacogenomics entries across 43 genes. This is actually quite comprehensive.

### CPIC Coverage Assessment

CPIC has 28 active guidelines covering 34 genes and 164 drugs. Our panel covers the following CPIC-critical genes:

| Gene    | In Panel | CPIC Level A Drug Examples                 |
| ------- | -------- | ------------------------------------------ |
| CYP2D6  | Yes      | codeine, tramadol, tamoxifen, atomoxetine  |
| CYP2C19 | Yes      | clopidogrel, voriconazole, escitalopram    |
| CYP2C9  | Yes      | warfarin, phenytoin                        |
| VKORC1  | Yes      | warfarin                                   |
| CYP3A5  | Yes      | tacrolimus                                 |
| DPYD    | Yes      | fluoropyrimidines (5-FU, capecitabine)     |
| TPMT    | Yes      | thiopurines (azathioprine, mercaptopurine) |
| NUDT15  | Yes      | thiopurines                                |
| UGT1A1  | Yes      | irinotecan, atazanavir                     |
| SLCO1B1 | Yes      | simvastatin                                |
| HLA-B   | Yes      | abacavir, carbamazepine, allopurinol       |
| HLA-A   | Yes      | carbamazepine                              |
| G6PD    | Yes      | rasburicase, dapsone                       |
| IFNL3   | Yes      | peginterferon alfa-2a/2b                   |
| NAT2    | Yes      | hydralazine (newest CPIC guideline)        |
| CYP2B6  | Yes      | efavirenz                                  |
| RYR1    | Yes      | volatile anesthetics, succinylcholine      |
| CACNA1S | Yes      | volatile anesthetics                       |

### Gaps Identified

Missing CPIC genes that should be considered:

- **CYP4F2**: Affects warfarin dosing (Level A with VKORC1/CYP2C9)
- Wait, CYP4F2 IS in the panel. Good.

Additional DPWG genes not in panel:

- **CYP1A2**: Clozapine metabolism
- **CYP2E1**: Isoniazid hepatotoxicity
- **GSTT1/GSTM1**: Various drug metabolism

### Key Issue

Pharmacogenomics entries in the carrier panel are treated with the same carrier/affected model as diseases. This is conceptually wrong:

- Pharmacogenomics variants represent **metabolizer phenotypes** (poor, intermediate, normal, rapid, ultra-rapid), not carrier status
- A CYP2D6 poor metabolizer is not "affected" with a disease -- they metabolize certain drugs differently
- The UI should present these differently: "Your offspring may have altered metabolism of codeine, tramadol..." rather than "25% chance of being affected"

### Recommendation

1. Separate pharmacogenomics into its own analysis module with metabolizer phenotype classification
2. Use star allele nomenclature where applicable (e.g., CYP2D6 *1/*4)
3. Map to CPIC activity scores and drug recommendations
4. Present results as drug interaction information, not disease risk

**Priority: HIGH -- pharmacogenomics results are currently misleading.**

---

## 7. Trait Prediction Beyond Punnett

### Current Limitations

The trait prediction engine uses single-SNP Punnett squares. This is:

- **Appropriate** for truly Mendelian traits (earwax type, blood type, cilantro taste)
- **Oversimplified** for polygenic traits (eye color, height, skin pigmentation)

### Multi-SNP Prediction Models

The **HIrisPlex-S system** is the gold standard for appearance prediction from DNA:

- **IrisPlex**: 6 SNPs for eye color prediction (>90% accuracy for blue/brown)
- **HIrisPlex**: 24 SNPs for combined hair + eye color (~70-87% accuracy depending on color)
- **HIrisPlex-S**: 41 SNPs for eye + hair + skin color

Our current trait panel has:

- 4 Eye Color SNPs (rs12913832, rs1800407, rs12896399 -- partial IrisPlex overlap)
- 2 Red Hair SNPs (partial HIrisPlex overlap)
- 1 Hair Color - Blond Hair SNP

### Per-Trait Assessment

| Trait             | Current Approach        | Better Approach                    | Feasibility |
| ----------------- | ----------------------- | ---------------------------------- | ----------- |
| Eye Color         | Single-SNP Punnett      | IrisPlex 6-SNP model               | HIGH        |
| Hair Color        | Single-SNP Punnett      | HIrisPlex 24-SNP model             | HIGH        |
| Skin Pigmentation | Single-SNP Punnett      | HIrisPlex-S 41-SNP model           | HIGH        |
| Height            | 1 SNP (rs1042713)       | Need 100s-1000s of SNPs            | LOW         |
| Earwax Type       | Single-SNP (rs17822931) | Already correct (Mendelian)        | N/A         |
| Lactose Tolerance | Single-SNP (rs4988235)  | Already correct (nearly Mendelian) | N/A         |
| Bitter Taste      | 3 SNPs combined         | Already reasonable                 | N/A         |

### Recommendation

1. **Implement IrisPlex model for eye color** -- scientifically validated, uses only 6 SNPs, all available in consumer files. This would be a significant accuracy upgrade.
2. **Implement HIrisPlex model for hair color** -- 24 SNPs, well-validated, open-source web tool at hirisplex.erasmusmc.nl
3. **Mark quantitative traits** (height, BMI, head circumference) clearly as "single SNP association" not predictive
4. **Add confidence bands** for multi-SNP predictions

**Priority: MEDIUM -- IrisPlex/HIrisPlex implementation would significantly improve appearance predictions.**

---

## 8. ClinVar Freshness

### Current State

`clinvar_client.py` queries ClinVar via NCBI E-utilities API in real-time during analysis. This approach has pros and cons:

**Pros:**

- Always queries the latest ClinVar data
- No need to maintain a local copy

**Cons:**

- Rate limited (3 req/sec without API key, 10 req/sec with key)
- For 2,715 diseases, a full panel cross-reference would take 4.5-15 minutes
- Network dependency during analysis
- No offline capability

### ClinVar Update Frequency

ClinVar data is updated:

- **Weekly** on Mondays (website and FTP)
- **Monthly** comprehensive archived releases (first Thursday of each month)
- GitHub releases at https://github.com/ncbi/clinvar/releases

### Current Usage Issue

In `analyze_carrier_risk()` (line 258-280), ClinVar lookups are performed but **the results are never used**:

```python
# Cross-check parent A
if parent_a_genotype:
    clinvar_client.get_carrier_status(rsid, parent_a_genotype, pathogenic_allele)
    # Could use clinvar status to validate or override if needed
```

The result is discarded. The ClinVar integration is essentially a no-op.

### Recommendation

1. **Implement a local ClinVar snapshot** downloaded from the FTP site, updated monthly
2. **Use ClinVar data to**:
   - Validate that panel entries still have pathogenic/likely pathogenic classifications
   - Flag variants that have been reclassified (e.g., VUS -> benign)
   - Add ClinVar review star rating to confidence levels
3. **Add a data freshness indicator** to the UI showing when the panel was last validated against ClinVar
4. **Fix the current ClinVar integration** to actually use the returned data or remove the dead code

**Priority: MEDIUM -- the dead ClinVar code should be fixed; local snapshot is a nice-to-have.**

---

## 9. Confidence Calibration

### Current State

Confidence levels in the panel:

| Confidence | Count | %     |
| ---------- | ----- | ----- |
| high       | 2,533 | 93.3% |
| medium     | 131   | 4.8%  |
| low        | 51    | 1.9%  |

### ACMG 5-Tier Variant Classification

The ACMG/AMP framework classifies variants into:

1. **Pathogenic (P)** -- very strong evidence
2. **Likely Pathogenic (LP)** -- strong evidence
3. **Variant of Uncertain Significance (VUS)** -- insufficient evidence
4. **Likely Benign (LB)** -- evidence suggests benign
5. **Benign (B)** -- strong evidence of benign

### Assessment

Our 3-tier system (high/medium/low) does not map cleanly to the ACMG 5-tier system. Recommendations:

1. **Map confidence levels to ACMG tiers:**
   - high -> Pathogenic (P) or Likely Pathogenic (LP) with 3+ star ClinVar review
   - medium -> Likely Pathogenic (LP) with 1-2 star review, or Pathogenic with limited evidence
   - low -> VUS with some supporting evidence

2. **Calibration concern**: Having 93.3% of entries at "high" confidence suggests the confidence assignment may not be sufficiently discriminating. A well-calibrated panel would likely have:
   - 60-70% high confidence (P/LP with strong evidence)
   - 20-25% medium confidence (LP with moderate evidence)
   - 10-15% lower confidence (emerging evidence)

3. **Add ClinVar star rating** as a secondary confidence metric:
   - 4 stars: practice guideline
   - 3 stars: reviewed by expert panel
   - 2 stars: criteria provided, multiple submitters
   - 1 star: criteria provided, single submitter
   - 0 stars: no assertion criteria

### Recommendation

1. Re-calibrate confidence levels using ClinVar review status as primary evidence
2. Add star rating display in UI
3. Consider adding "last reviewed" date to each entry
4. Allow users to filter by confidence level (especially useful for genetic counselors)

**Priority: MEDIUM -- confidence calibration improves trust and clinical utility.**

---

## 10. Panel Comparison vs Clinical Labs

### Industry Comparison

| Panel                     | Genes          | Conditions        | Focus                             |
| ------------------------- | -------------- | ----------------- | --------------------------------- |
| **Mergenix**              | ~2,715 rsIDs   | ~2,715 conditions | Carrier + PGx + Dominant          |
| **Myriad Foresight**      | 274 genes      | ~175 conditions   | Carrier screening (AR + X-linked) |
| **Invitae Comprehensive** | 288 genes      | ~300 conditions   | Carrier screening (AR + X-linked) |
| **Counsyl/Myriad**        | 176 genes      | ~175 conditions   | Universal carrier screen          |
| **ACMG Tier 1**           | ~40 conditions | ~40 conditions    | CF+1 carrier freq > 1:100         |
| **ACMG Tier 2**           | ~75 conditions | ~75 conditions    | Carrier freq > 1:200              |

### Key Differences

1. **Mergenix is MUCH larger** but this isn't necessarily better:
   - Clinical labs focus on well-validated gene-disease relationships
   - Our panel includes AD conditions (not typical for carrier screening)
   - Our panel includes PGx (typically a separate test)
   - Larger panels increase the chance of false positives and VUS findings

2. **Gene vs SNP approach**: Clinical labs sequence entire genes (finding all variants); we test specific SNPs. This means:
   - We miss novel or rare variants not in our panel
   - We're faster and cheaper but less comprehensive per gene
   - Our approach is similar to 23andMe's carrier screening methodology

3. **Clinical validation**: Myriad and Invitae panels are FDA-cleared or CAP/CLIA validated. Mergenix has no clinical validation.

### Missing High-Impact Conditions

Conditions commonly on clinical panels but potentially missing from ours:

- **Spinal Muscular Atrophy (SMA)**: Requires copy number analysis of SMN1, not a single SNP
- **Fragile X syndrome**: Requires trinucleotide repeat expansion testing
- **Alpha-thalassemia**: Requires deletion analysis
- **Duchenne Muscular Dystrophy**: Requires deletion/duplication analysis

These conditions **cannot be detected by single-SNP genotyping** and would need structural variant analysis.

### Recommendation

1. **Separate the panel into clinically distinct sections**: Carrier Screening, Pharmacogenomics, Dominant Disease Risk
2. **Clearly label which conditions are detectable** by SNP genotyping vs which require full gene sequencing
3. **Acknowledge limitations** for conditions requiring structural variant analysis
4. **Consider ACMG Tier 1 subset** as a "core" panel to build clinical credibility

**Priority: MEDIUM -- panel organization improves clinical credibility.**

---

## 11. Ancestry-Aware Carrier Frequencies

### Current State

Carrier frequencies in the panel are single values (e.g., "1 in 25" for CF). These are typically based on European/pan-ethnic averages.

### Problem

Carrier frequencies vary dramatically by population:

| Condition           | European | Ashkenazi Jewish | African American | Hispanic |
| ------------------- | -------- | ---------------- | ---------------- | -------- |
| Cystic Fibrosis     | 1 in 25  | 1 in 24          | 1 in 65          | 1 in 46  |
| Sickle Cell Disease | 1 in 500 | rare             | 1 in 13          | 1 in 36  |
| Tay-Sachs Disease   | 1 in 300 | 1 in 30          | rare             | rare     |
| Beta-thalassemia    | 1 in 50  | 1 in 30          | 1 in 75          | variable |

Research shows:

- Self-reported ethnicity is an imperfect indicator of genetic ancestry (9% discordance)
- Admixed populations (Latin American) have variable carrier frequencies depending on ancestry proportions
- ACMG now recommends panethnic expanded carrier screening rather than ethnicity-based testing

### Recommendation

1. **Add population-specific carrier frequencies** where available:

```json
{
  "carrier_frequency": {
    "panethnic": "1 in 25",
    "european": "1 in 25",
    "ashkenazi_jewish": "1 in 24",
    "african_american": "1 in 65",
    "hispanic": "1 in 46",
    "east_asian": "1 in 100"
  }
}
```

2. **Allow optional ancestry input** to adjust displayed carrier frequencies
3. **Default to panethnic frequencies** -- do NOT require ancestry information
4. **Add disclaimer** that carrier frequencies are population estimates, not individual risk

**Priority: MEDIUM -- improves accuracy for diverse users, aligns with ACMG panethnic screening guidelines.**

---

## 12. VCF Annotation Improvements

### Current State

The VCF parser in `parser.py` extracts basic genotype information (rsid -> genotype). It does not leverage:

- Functional annotations (CADD, SIFT, PolyPhen-2)
- Quality metrics (GQ, DP)
- Allele frequency data

### Improvement Opportunities

1. **Quality filtering**: VCF files include genotype quality (GQ) and read depth (DP) fields. Low-quality genotype calls should be flagged or filtered:
   - GQ < 20: unreliable genotype call
   - DP < 10: insufficient sequencing depth

2. **Functional annotation integration** (for VCF files that include them):
   - CADD score > 20: likely deleterious (top 1% of variants)
   - SIFT: "deleterious" prediction
   - PolyPhen-2: "probably damaging" prediction
   - Could cross-reference with our pathogenic allele designations

3. **Novel variant detection**: VCF files may contain variants not in our panel. With CADD/SIFT/PolyPhen annotations, we could flag novel likely-pathogenic variants in genes we already cover.

### Recommendation

1. **Add VCF quality filtering** (GQ and DP thresholds) -- low effort, high impact
2. **Parse existing annotations** from INFO field if present
3. **Do NOT add external annotation lookups** (would require databases like ANNOVAR, VEP) -- too complex for a consumer tool
4. **Flag low-confidence genotype calls** in the results UI

**Priority: LOW-MEDIUM -- VCF quality filtering is quick to implement; full annotation is complex.**

---

## 13. Offspring Prediction Model Correctness

### Autosomal Recessive (AR) -- CORRECT

The current `calculate_offspring_risk()` function correctly implements AR inheritance:

| Parent A            | Parent B | Affected | Carrier | Normal |
| ------------------- | -------- | -------- | ------- | ------ |
| normal x normal     |          | 0%       | 0%      | 100%   |
| normal x carrier    |          | 0%       | 50%     | 50%    |
| carrier x carrier   |          | 25%      | 50%     | 25%    |
| carrier x affected  |          | 50%      | 50%     | 0%     |
| affected x affected |          | 100%     | 0%      | 0%     |

These values are scientifically correct for AR inheritance.

### Autosomal Dominant (AD) -- NOT IMPLEMENTED

See Section 2. The AR model is applied to AD conditions, producing incorrect results.

### X-Linked -- NOT IMPLEMENTED

See Section 2. The AR model is applied to X-linked conditions, producing incorrect results. Additionally, X-linked inheritance requires knowledge of offspring sex (or sex-stratified reporting).

### De Novo Mutations -- Not Modeled

Approximately 1-2% of genetic conditions arise from de novo mutations (new mutations not present in either parent). This is an inherent limitation of carrier screening and is standard across the industry. **No action needed** beyond a disclaimer.

### Mitochondrial Inheritance -- Not Modeled

Some conditions (Leber hereditary optic neuropathy, MELAS) follow maternal inheritance. These are not in our panel and would require different analysis. **No action needed** for current panel.

---

## 14. Scientific Disclaimers

### Required Disclaimers (per FDA/FTC guidance)

Based on FDA's DTC genetic testing framework and industry best practices, the following disclaimers are needed:

#### 1. Clinical Use Disclaimer (REQUIRED)

> "This analysis is for informational and educational purposes only. Results should NOT be used for clinical diagnosis or to make medical decisions. Always consult a certified genetic counselor or healthcare provider for clinical genetic testing and interpretation."

#### 2. Limitations of SNP-Based Testing (REQUIRED)

> "This analysis tests specific genetic variants (SNPs) and does not sequence entire genes. Many pathogenic variants, including structural variants, copy number changes, and trinucleotide repeat expansions, cannot be detected by this method. A negative result does not guarantee the absence of carrier status."

#### 3. Not a Clinical Test (REQUIRED)

> "This product has not been cleared or approved by the U.S. Food and Drug Administration (FDA). The laboratory tests used have not been validated by an FDA-cleared or CLIA-certified laboratory for clinical diagnostic use."

#### 4. Polygenic Trait Disclaimer (REQUIRED for traits)

> "Trait predictions are based on known genetic associations and simplified Mendelian models. Many traits, including eye color, height, and skin pigmentation, are influenced by multiple genes and environmental factors. Actual outcomes may differ significantly from predictions."

#### 5. Pharmacogenomics Disclaimer (REQUIRED for PGx)

> "Pharmacogenomics results are based on known drug-gene interactions from CPIC guidelines. Drug response is also influenced by other genetic variants not tested, drug interactions, organ function, and other factors. Do not change medications without consulting your healthcare provider."

#### 6. Ancestry Limitation (RECOMMENDED)

> "Carrier frequency data and risk estimates are primarily derived from studies of European-descent populations. These estimates may be less accurate for individuals of other ancestries."

#### 7. Penetrance Disclaimer (RECOMMENDED)

> "Not all individuals who carry a pathogenic variant will develop the associated condition (incomplete penetrance). The severity of conditions can also vary among affected individuals (variable expressivity)."

### Comparison with 23andMe Disclaimers

23andMe's FDA-authorized carrier screening includes:

- "This test is not a diagnostic test"
- "This test does not account for all possible genetic variants"
- "Results should be confirmed by an independent clinical test"
- "A negative result does not rule out the possibility of being a carrier"
- "Consult a healthcare professional for guidance"

### Recommendation

1. Display disclaimers prominently on the analysis results page (not just buried in legal text)
2. Require user acknowledgment before viewing results
3. Include a "What This Means" section with each result explaining limitations
4. Link to genetic counseling resources (NSGC Find a Counselor: nsgc.org)

**Priority: HIGH -- legal and ethical obligation, especially for health-related predictions.**

---

## 15. Prioritized Recommendations

### P0: Critical Bugs (Fix Immediately)

| #   | Issue                                                                               | Impact                                         | Effort                      |
| --- | ----------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------- |
| 1   | **Trait prediction crash** -- `map_genotype_to_phenotype()` returns unhashable dict | All trait predictions fail at runtime          | LOW (1 line fix)            |
| 2   | **Wrong inheritance model** for 45.6% of panel                                      | Incorrect risk calculations for 1,238 diseases | MEDIUM (new risk functions) |

### P1: High Priority (Next Sprint)

| #   | Issue                                  | Impact                              | Effort |
| --- | -------------------------------------- | ----------------------------------- | ------ |
| 3   | **Add scientific disclaimers**         | Legal/ethical compliance            | LOW    |
| 4   | **Fix ClinVar dead code**              | Code health, wasted API calls       | LOW    |
| 5   | **Separate pharmacogenomics analysis** | Misleading results currently        | MEDIUM |
| 6   | **Add trait prediction tests**         | Zero test coverage for trait engine | MEDIUM |

### P2: Medium Priority (Next Quarter)

| #   | Issue                                     | Impact                                     | Effort |
| --- | ----------------------------------------- | ------------------------------------------ | ------ |
| 7   | Compound heterozygosity detection         | Better accuracy for multi-variant genes    | MEDIUM |
| 8   | IrisPlex multi-SNP eye color model        | Major improvement for eye color prediction | MEDIUM |
| 9   | Ancestry-aware carrier frequencies        | Better accuracy for diverse populations    | MEDIUM |
| 10  | Confidence re-calibration with ClinVar    | Better trust/credibility                   | MEDIUM |
| 11  | Penetrance data for AD conditions         | More accurate AD risk estimates            | MEDIUM |
| 12  | Panel organization (carrier/PGx/dominant) | Clinical credibility                       | LOW    |

### P3: Low Priority (Backlog)

| #   | Issue                         | Impact                           | Effort    |
| --- | ----------------------------- | -------------------------------- | --------- |
| 13  | VCF quality filtering (GQ/DP) | Better reliability for VCF input | LOW       |
| 14  | HIrisPlex hair color model    | Better hair color predictions    | MEDIUM    |
| 15  | Local ClinVar snapshot        | Offline capability, speed        | HIGH      |
| 16  | Polygenic risk scores         | Complex disease risk             | VERY HIGH |

---

## Appendix A: Data Quality Statistics

### Carrier Panel (carrier_panel.json)

- **Total entries:** 2,715
- **Unique genes:** ~500+ (not deduplicated since multiple variants per gene)
- **Inheritance:** 1,477 AR (54.4%), 1,057 AD (38.9%), 181 X-linked (6.7%)
- **Severity:** 1,656 high (61%), 890 moderate (33%), 169 low (6.2%)
- **Confidence:** 2,533 high (93.3%), 131 medium (4.8%), 51 low (1.9%)
- **Categories:** 15 categories from Metabolic (411) to Other (55)
- **Sources:** All entries have OMIM, dbSNP, and ClinVar citations
- **Notes:** All entries have scientific notes with inheritance, frequency, and counseling guidance

### Trait SNPs (trait_snps.json)

- **Total entries:** 79
- **Unique traits:** 73
- **Multi-SNP traits:** Eye Color (4), Bitter Taste (3), Red Hair (2), Height (2)
- **Inheritance types:** codominant (49), additive (19), dominant (8), recessive (3)
- **Sources:** All entries have PubMed citations and dbSNP references
- **Notes:** All entries have scientific context notes

### Pharmacogenomics Subset

- **Entries:** 158 (5.8% of panel)
- **Unique genes:** 43
- **Key CPIC genes covered:** CYP2D6, CYP2C19, CYP2C9, VKORC1, DPYD, TPMT, NUDT15, UGT1A1, SLCO1B1, HLA-B, HLA-A, G6PD, NAT2, CYP2B6, RYR1, CACNA1S, CYP3A5, CYP4F2

---

## Appendix B: References

1. ACMG Screening Guidelines: https://pubmed.ncbi.nlm.nih.gov/34285390/
2. ACMG 2024 Technical Standard: https://pubmed.ncbi.nlm.nih.gov/38814327/
3. ACMG/AMP Variant Classification: https://pmc.ncbi.nlm.nih.gov/articles/PMC4544753/
4. CPIC Guidelines: https://cpicpgx.org/guidelines/
5. CPIC Genes-Drugs: https://cpicpgx.org/genes-drugs/
6. ClinVar Data Access: https://www.ncbi.nlm.nih.gov/clinvar/docs/maintenance_use/
7. ClinVar GitHub Releases: https://github.com/ncbi/clinvar/releases
8. HIrisPlex System: https://pubmed.ncbi.nlm.nih.gov/22917817/
9. HIrisPlex-S Validation: https://pubmed.ncbi.nlm.nih.gov/29753263/
10. HIrisPlex Web Tool: https://hirisplex.erasmusmc.nl/
11. Autosomal Dominant Inheritance: https://www.ncbi.nlm.nih.gov/books/NBK557512/
12. X-Linked Inheritance: https://www.ncbi.nlm.nih.gov/books/NBK557383/
13. Penetrance Estimation: https://pmc.ncbi.nlm.nih.gov/articles/PMC3459406/
14. Ancestry in Carrier Screening: https://www.nature.com/articles/s41436-020-0869-3
15. PRS Consumer Challenges: https://pmc.ncbi.nlm.nih.gov/articles/PMC10144199/
16. FDA DTC Testing Framework: https://www.ncbi.nlm.nih.gov/books/NBK209639/
17. Compound Heterozygosity Tools: https://pmc.ncbi.nlm.nih.gov/articles/PMC7905494/
18. CADD v1.7: https://academic.oup.com/nar/article/52/D1/D1143/7511313
19. Myriad Foresight: https://myriad.com/genetic-tests/foresight-carrier-screen/
20. Invitae Carrier Screen: https://www.invitae.com/us/providers/test-catalog/en/providers/test-catalog/test-60100
21. Panethnic Carrier Screening: https://pubmed.ncbi.nlm.nih.gov/34906503/
22. AHA DTC Cardiovascular Testing Statement: https://www.ahajournals.org/doi/10.1161/CIR.0000000000001304
