# Genetics Scientist Review -- Phase 0 Scaffolding

## Overall Grade: B+

The TypeScript port is a high-quality scaffolding effort. Function signatures, algorithm documentation, and most type definitions accurately mirror the Python originals. However, there are **2 CRITICAL mismatches** and several MEDIUM-severity issues that must be fixed before implementation begins. These would cause incorrect genetic analysis results if left unaddressed.

---

## Type Accuracy Assessment

| Module                          | Python Functions       | TS Stubs                                 | Missing                                                          | Mismatched                        | Grade |
| ------------------------------- | ---------------------- | ---------------------------------------- | ---------------------------------------------------------------- | --------------------------------- | ----- |
| Parser (`parser.ts`)            | 12 public + 5 internal | 10 public                                | 2 (parse_23andme_with_metadata, get_detailed_stats)              | 1 (getGenotypeStats return shape) | A-    |
| Carrier Analysis (`carrier.ts`) | 8 public + 1 internal  | 6 public                                 | 2 (load functions, is_free_disease)                              | 0                                 | A     |
| Trait Prediction (`traits.ts`)  | 8 public               | 6 public                                 | 2 (format_prediction_report, \_extract_phenotype_string)         | 0                                 | A     |
| Pharmacogenomics (`pgx.ts`)     | 10 public + 5 internal | 6 public                                 | 4 internal helpers                                               | 0                                 | A-    |
| PRS (`prs.ts`)                  | 8 public + 2 internal  | 7 public                                 | 1 (\_calculate_single_parent_prs -- folded into calculateRawPrs) | 0                                 | A     |
| Ethnicity (`ethnicity.ts`)      | 6 public               | 5 public                                 | 0                                                                | 0                                 | A     |
| Counseling (`counseling.ts`)    | 5 public + 3 internal  | 4 public + 3 internal                    | 0                                                                | 0                                 | A     |
| Shared Types (`genetics.ts`)    | N/A (types only)       | All defined                              | 0                                                                | 2 (MetabolizerStatus, severity)   | B-    |
| Data Types (`types.ts`)         | N/A (types only)       | All defined                              | 0                                                                | 2 (severity, MetabolizerStatus)   | B-    |
| Tier Config (`payments.ts`)     | 12 public              | 2 public (PRICING_TIERS, getPricingTier) | Remaining gating functions handled via TIER_GATING in types.ts   | 0                                 | A     |

---

## Critical Mismatches (will cause wrong results)

| #   | Module                                           | Python                                                                                                                                                                                           | TypeScript                                                                                                                                                                                    | Impact                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **genetics-data/types.ts** (CarrierPanelEntry)   | Actual JSON data uses severity values: `"high"`, `"moderate"`, `"low"`                                                                                                                           | TypeScript defines `severity: 'high' \| 'medium' \| 'low'`                                                                                                                                    | **CRITICAL**: 890 entries (33% of carrier panel) use `"moderate"` which does NOT match `"medium"`. Any UI filtering/grouping by severity will silently drop or misclassify one-third of all diseases. The value `"moderate"` will cause TypeScript strict type checking to fail at runtime if validated.      |
| 2   | **shared-types/genetics.ts** (MetabolizerStatus) | Python `determine_metabolizer_status()` returns whatever key matches in `metabolizer_status` dict from JSON. Actual pgx_panel.json contains `"rapid_metabolizer"` (found in CYP2C19 and CYP3A5). | TypeScript `MetabolizerStatus` union is: `'poor_metabolizer' \| 'intermediate_metabolizer' \| 'normal_metabolizer' \| 'ultra_rapid_metabolizer' \| 'unknown'`. Missing: `"rapid_metabolizer"` | **CRITICAL**: CYP2C19 rapid metabolizers (~15-20% of some populations) will be misclassified. The `rapid_metabolizer` status has specific drug recommendations (different from `ultra_rapid_metabolizer`). Wrong metabolizer classification = wrong drug guidance. Potentially harmful clinical implications. |

---

## Data Type vs Actual Data Verification

| Data File                    | Fields Match? | Issues                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `carrier_panel.json`         | PARTIAL       | **CRITICAL**: `severity` field uses `"moderate"` in data but TypeScript type says `'medium'`. All 890 moderate-severity entries will fail type validation. All other fields match perfectly (rsid, gene, condition, inheritance, carrier_frequency, pathogenic_allele, reference_allele, description, prevalence, omim_id, category, sources, confidence, notes). |
| `trait_snps.json`            | YES           | All fields verified: rsid, trait, gene, chromosome, inheritance, alleles (ref/alt), phenotype_map (with phenotype/description/probability), description, confidence, sources, notes. Perfect match.                                                                                                                                                               |
| `pgx_panel.json`             | PARTIAL       | Structure matches (metadata, genes, star_alleles, metabolizer_status, drugs). **Issue**: `rapid_metabolizer` exists as a metabolizer status key but is absent from TypeScript MetabolizerStatus union. All other structural fields (defining_variants, activity_score, function, recommendation_by_status, strength, source, category) match.                     |
| `prs_weights.json`           | YES           | All fields verified: metadata (source, version, conditions_covered, last_updated, disclaimer), conditions (name, pgs_id, description, population_mean, population_std, ancestry_note, reference, snps with rsid/effect_allele/effect_weight/chromosome/gene_region). Perfect match.                                                                               |
| `ethnicity_frequencies.json` | YES           | All fields verified: metadata (source, populations, last_updated, total_variants, notes), frequencies keyed by rsid with gene, condition, and all 9 population keys including Global. Population names match gnomAD naming exactly.                                                                                                                               |
| `counseling_providers.json`  | N/A           | File structure documented in types.ts matches the described format. Not independently verified against actual JSON content (file may not exist yet).                                                                                                                                                                                                              |
| `glossary.json`              | N/A           | Type matches described format. Not independently verified.                                                                                                                                                                                                                                                                                                        |

---

## Algorithm Documentation Accuracy

| Module     | Algorithm                       | Correctly Documented? | Issues                                                                                                                                                                                                                                            |
| ---------- | ------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parser     | detectFormat()                  | YES                   | Detection priority matches Python's \_detect_format_from_content. All 5 format heuristics documented.                                                                                                                                             |
| Parser     | parse23andMe()                  | YES                   | 9-step algorithm matches Python exactly: skip comments, 4-col tab-split, no-call filtering, rsid validation.                                                                                                                                      |
| Parser     | parseAncestryDNA()              | YES                   | 5-column tab-split, allele1+allele2 concatenation, "0" no-call handling documented correctly.                                                                                                                                                     |
| Parser     | parseVcf()                      | YES                   | 14-step VCF parsing algorithm documented, including GT field parsing, allele index mapping, no-call detection.                                                                                                                                    |
| Parser     | getGenotypeStats()              | MINOR ISSUE           | Python returns `chromosomes` and `chromosome_counts` fields. TS return type omits these (returns only totalSnps, homozygousCount, heterozygousCount, genotypeDistribution). Acceptable since chromosome data isn't available from rsid-only maps. |
| Carrier    | determineCarrierStatus()        | YES                   | Count pathogenic alleles: 0=normal, 1=carrier, 2=affected. Matches Python.                                                                                                                                                                        |
| Carrier    | calculateOffspringRiskAR()      | YES                   | Mendelian lookup table with all 9 status combinations documented correctly. Risk values match Python.                                                                                                                                             |
| Carrier    | calculateOffspringRiskAD()      | YES                   | carrier->affected mapping, AD-specific risk table documented. Values match Python.                                                                                                                                                                |
| Carrier    | calculateOffspringRiskXLinked() | YES                   | Sex-stratified inheritance logic (sons get X from mother, daughters from both). All 6 daughter scenarios + 3 son scenarios documented. Average calculation matches.                                                                               |
| Carrier    | determineRiskLevel()            | YES                   | Inheritance-aware classification logic matches Python exactly for all 3 modes.                                                                                                                                                                    |
| Carrier    | analyzeCarrierRisk()            | YES                   | Sort order documented correctly: risk_priority -> -affected% -> alphabetical.                                                                                                                                                                     |
| Traits     | punnettSquare()                 | YES                   | 2x2 combination with 0.25 probability per outcome, alphabetical normalization. Matches Python.                                                                                                                                                    |
| Traits     | predictTrait()                  | YES                   | 9-step algorithm documented: SNP lookup, Punnett square, phenotype mapping, probability aggregation, percentage conversion. Matches Python.                                                                                                       |
| Traits     | mapGenotypeToPhenotype()        | YES                   | Dual-format handling (string/dict) with normalized genotype fallback. Matches Python.                                                                                                                                                             |
| PGx        | determineStarAllele()           | YES                   | Variant matching with heterozygous detection, diplotype construction from matched alleles. Matches Python.                                                                                                                                        |
| PGx        | determineMetabolizerStatus()    | YES                   | Activity score summation, range matching, normal_metabolizer fallback. Matches Python.                                                                                                                                                            |
| PGx        | getDrugRecommendations()        | YES                   | Filtering by metabolizer status in recommendation_by_status dict. Matches Python.                                                                                                                                                                 |
| PGx        | predictOffspringPgx()           | YES                   | Cartesian product of parent alleles, 25% per combination, normalized diplotype. Matches Python.                                                                                                                                                   |
| PGx        | getPgxDisclaimer()              | YES                   | Text is character-for-character identical to Python.                                                                                                                                                                                              |
| PRS        | normalCdf()                     | YES                   | Abramowitz & Stegun 26.2.17 approximation documented with correct coefficients. Valid replacement for scipy.stats.norm.cdf.                                                                                                                       |
| PRS        | calculateRawPrs()               | YES                   | Sum of (effect_weight \* dosage) per SNP. Matches Python.                                                                                                                                                                                         |
| PRS        | normalizePrs()                  | YES                   | z-score calculation with population mean/std, percentile via normalCdf. Matches Python.                                                                                                                                                           |
| PRS        | getRiskCategory()               | YES                   | Threshold-based mapping with exact values from Python.                                                                                                                                                                                            |
| PRS        | predictOffspringPrsRange()      | YES                   | Mid-parent regression with heritability_factor=0.5, uncertainty=0.5 SD. Matches Python.                                                                                                                                                           |
| PRS        | getPrsDisclaimer()              | YES                   | Text is character-for-character identical to Python.                                                                                                                                                                                              |
| Ethnicity  | getPopulationFrequency()        | YES                   | rsid lookup with Global fallback. Matches Python.                                                                                                                                                                                                 |
| Ethnicity  | adjustCarrierRisk()             | YES                   | Ratio-based adjustment with clamping. Matches Python.                                                                                                                                                                                             |
| Ethnicity  | calculateBayesianPosterior()    | YES                   | Bayesian formula with exact likelihood values (0.99/0.01/0.50/0.001). Prior\*0.01 for carrier non-carrier likelihood with 1e-10 floor. Matches Python exactly.                                                                                    |
| Ethnicity  | formatFrequencyComparison()     | YES                   | 5% tolerance for "equal", ratio formatting. Matches Python.                                                                                                                                                                                       |
| Counseling | shouldRecommendCounseling()     | YES                   | 4 trigger conditions documented correctly (dual carrier, high_risk, PRS>90th, actionable PGx). Matches Python.                                                                                                                                    |
| Counseling | generateReferralSummary()       | YES                   | 3-tier gating (free=base only, premium=full summary, pro=+letter). Matches Python.                                                                                                                                                                |
| Counseling | \_inferSpecialties()            | YES                   | Category-to-specialty mapping matches Python exactly.                                                                                                                                                                                             |
| Counseling | \_formatReferralLetter()        | YES                   | Letter format with date, findings, specialties, disclaimer, NSGC URL. Matches Python.                                                                                                                                                             |

---

## Tier Gating Verification

| Feature                | Python Limit                        | TypeScript Limit                                                      | Match? |
| ---------------------- | ----------------------------------- | --------------------------------------------------------------------- | ------ |
| Free diseases          | 25                                  | 25 (TIER_GATING.free.diseaseLimit + PRICING_TIERS[0].limits.diseases) | YES    |
| Premium diseases       | 500                                 | 500                                                                   | YES    |
| Pro diseases           | 2715                                | 2715                                                                  | YES    |
| Free traits            | 10                                  | 10                                                                    | YES    |
| Premium traits         | 79                                  | 79                                                                    | YES    |
| Pro traits             | 79                                  | 79                                                                    | YES    |
| Free PGx genes         | 0                                   | 0                                                                     | YES    |
| Premium PGx genes      | 5                                   | 5                                                                     | YES    |
| Pro PGx genes          | 12                                  | 12                                                                    | YES    |
| Free PRS conditions    | 0                                   | 0                                                                     | YES    |
| Premium PRS conditions | 3                                   | 3                                                                     | YES    |
| Pro PRS conditions     | 10                                  | 10                                                                    | YES    |
| Free ethnicity         | No                                  | false                                                                 | YES    |
| Premium ethnicity      | Yes                                 | true                                                                  | YES    |
| Pro ethnicity          | Yes                                 | true                                                                  | YES    |
| Free counseling        | "basic"                             | "basic"                                                               | YES    |
| Premium counseling     | "full"                              | "full"                                                                | YES    |
| Pro counseling         | "full_plus_letter"                  | "full_plus_letter"                                                    | YES    |
| Free price             | $0                                  | $0                                                                    | YES    |
| Premium price          | $12.90                              | $12.90                                                                | YES    |
| Pro price              | $29.90                              | $29.90                                                                | YES    |
| Premium PGx gene list  | CYP2D6, CYP2C19, CYP2C9, DPYD, TPMT | Same (PREMIUM_PGX_GENES)                                              | YES    |
| Free disease list      | 25 specific diseases                | Same (TOP_25_FREE_DISEASES)                                           | YES    |
| Free trait list        | 10 specific traits                  | Same (TOP_10_FREE_TRAITS)                                             | YES    |

---

## Enum/Constant Value Verification

| Category                   | Python Values                                                                                                                                                                     | TypeScript Values                                                                                                    | Match?                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Inheritance patterns       | `"autosomal_recessive"`, `"autosomal_dominant"`, `"X-linked"`                                                                                                                     | `'autosomal_recessive' \| 'autosomal_dominant' \| 'X-linked'`                                                        | YES                                   |
| Carrier status             | `"normal"`, `"carrier"`, `"affected"`, `"unknown"`                                                                                                                                | `'normal' \| 'carrier' \| 'affected' \| 'unknown'`                                                                   | YES                                   |
| Risk levels                | `"high_risk"`, `"carrier_detected"`, `"low_risk"`, `"unknown"`                                                                                                                    | `'high_risk' \| 'carrier_detected' \| 'low_risk' \| 'unknown'`                                                       | YES                                   |
| Metabolizer statuses       | `"poor_metabolizer"`, `"intermediate_metabolizer"`, `"normal_metabolizer"`, `"rapid_metabolizer"`, `"ultra_rapid_metabolizer"`, `"unknown"`                                       | `'poor_metabolizer' \| 'intermediate_metabolizer' \| 'normal_metabolizer' \| 'ultra_rapid_metabolizer' \| 'unknown'` | **NO -- missing `rapid_metabolizer`** |
| Risk categories            | `"low"`, `"below_average"`, `"average"`, `"above_average"`, `"elevated"`, `"high"`                                                                                                | Same values                                                                                                          | YES                                   |
| Risk thresholds            | (20, low), (40, below_average), (60, average), (80, above_average), (95, elevated), (100, high)                                                                                   | Same values                                                                                                          | YES                                   |
| PGx genes (12)             | CYP2D6, CYP2C19, CYP2C9, CYP3A5, CYP1A2, DPYD, TPMT, NUDT15, SLCO1B1, VKORC1, HLA-B, UGT1A1                                                                                       | Same list in PGX_GENES                                                                                               | YES                                   |
| PRS conditions (10)        | coronary_artery_disease, type_2_diabetes, breast_cancer, prostate_cancer, alzheimers_disease, atrial_fibrillation, inflammatory_bowel_disease, schizophrenia, asthma, obesity_bmi | Same list in PRS_CONDITIONS                                                                                          | YES                                   |
| Populations (9)            | African/African American, East Asian, South Asian, European (Non-Finnish), Finnish, Latino/Admixed American, Ashkenazi Jewish, Middle Eastern, Global                             | Same list in POPULATIONS                                                                                             | YES                                   |
| Counseling specialties (8) | prenatal, carrier_screening, cancer, cardiovascular, pediatric, neurogenetics, pharmacogenomics, general                                                                          | Same list in COUNSELING_SPECIALTIES                                                                                  | YES                                   |
| File formats               | 23andme, ancestrydna, myheritage, vcf, unknown                                                                                                                                    | Same values in FileFormat                                                                                            | YES                                   |
| Tier names                 | free, premium, pro                                                                                                                                                                | Same values in Tier                                                                                                  | YES                                   |

---

## Population Name Verification (gnomAD)

| Python POPULATIONS list    | TypeScript POPULATIONS list | TypeScript Population type   | Match? |
| -------------------------- | --------------------------- | ---------------------------- | ------ |
| "African/African American" | "African/African American"  | `'African/African American'` | YES    |
| "East Asian"               | "East Asian"                | `'East Asian'`               | YES    |
| "South Asian"              | "South Asian"               | `'South Asian'`              | YES    |
| "European (Non-Finnish)"   | "European (Non-Finnish)"    | `'European (Non-Finnish)'`   | YES    |
| "Finnish"                  | "Finnish"                   | `'Finnish'`                  | YES    |
| "Latino/Admixed American"  | "Latino/Admixed American"   | `'Latino/Admixed American'`  | YES    |
| "Ashkenazi Jewish"         | "Ashkenazi Jewish"          | `'Ashkenazi Jewish'`         | YES    |
| "Middle Eastern"           | "Middle Eastern"            | `'Middle Eastern'`           | YES    |
| "Global"                   | "Global"                    | `'Global'`                   | YES    |

All population names match the actual JSON data keys exactly.

---

## Additional Issues (MEDIUM severity)

| #   | Module                                      | Issue                                                                                                                                                                                                                                                                                                                     | Impact                                                                                                                                                                                                                                                                                                | Recommendation                                                                                                                                                                                             |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3   | `carrier_analysis.py` docstring             | `load_carrier_panel_for_tier()` docstring says "Basic tier returns 171 diseases" but the actual PREMIUM tier limit is 500.                                                                                                                                                                                                | LOW: Documentation-only; no logic error in Python or TypeScript. The TypeScript port correctly uses 500.                                                                                                                                                                                              | Fix the Python docstring for accuracy.                                                                                                                                                                     |
| 4   | `shared-types/genetics.ts` (TraitResult)    | Python `predict_trait()` can return results with `status='missing'` that have NO `parent_a_genotype`/`parent_b_genotype` fields (these fields are only set for `status='success'` and `status='error'`). TypeScript makes `parentAGenotype` and `parentBGenotype` required (not optional).                                | MEDIUM: Missing-status trait results in Python don't include parent genotypes. The TS type should make these optional or provide default empty strings.                                                                                                                                               | Change `parentAGenotype` and `parentBGenotype` to optional (`string?`) or use `string \| undefined` in TraitResult. Alternatively, ensure the implementation always sets them (e.g., to `''`).             |
| 5   | `shared-types/genetics.ts` (TraitResult)    | Python `predict_trait()` missing-status results also lack `chromosome`, `description`, `confidence`, `inheritance`, and `offspringProbabilities` fields. The TS type requires all of these.                                                                                                                               | MEDIUM: The TypeScript TraitResult type doesn't accommodate partial results. Either make these fields optional or define separate result interfaces for success/missing/error states.                                                                                                                 | Consider a discriminated union: `TraitResultSuccess \| TraitResultMissing \| TraitResultError`.                                                                                                            |
| 6   | `genetics-data/types.ts` (TraitSnpEntry)    | The `phenotype_map` field is typed as `Record<string, PhenotypeMapValue>` (rich format only). Python `_extract_phenotype_string()` handles both string and dict formats: `"GG": "Brown Eyes"` (legacy) OR `"GG": {"phenotype": "Brown Eyes", ...}` (rich).                                                                | LOW: Current data appears to exclusively use rich format, so this may not be an issue in practice. But the TypeScript traits engine `mapGenotypeToPhenotype()` signature correctly accepts both formats via `Record<string, string \| PhenotypeMapValue>`, creating a discrepancy with the data type. | Either update `TraitSnpEntry.phenotype_map` to `Record<string, string \| PhenotypeMapValue>` for backward compatibility, or explicitly document that only rich format is supported in the TypeScript port. |
| 7   | `parser.ts` (getGenotypeStats)              | Python returns `chromosomes` and `chromosome_counts` in the stats dict. TypeScript return type omits these fields.                                                                                                                                                                                                        | LOW: The Python version notes these are "N/A" for rsid-only dictionaries anyway. Acceptable omission for the browser-based port.                                                                                                                                                                      | No action needed. Document the intentional omission.                                                                                                                                                       |
| 8   | `pgx.ts` (MetabolizerResult)                | Python `determine_metabolizer_status()` returns `{"status": ..., "activity_score": ..., "description": ...}`. TypeScript `MetabolizerResult` uses camelCase: `{status, activityScore, description}`. This is intentional (JS convention), but the `status` field type `MetabolizerStatus` is missing `rapid_metabolizer`. | Covered by Critical #2 above.                                                                                                                                                                                                                                                                         | Fix MetabolizerStatus.                                                                                                                                                                                     |
| 9   | `carrier.ts` (analyzeCarrierRisk)           | Python `analyze_carrier_risk()` accepts optional `clinvar_client` parameter for cross-reference. TypeScript stub omits this parameter entirely.                                                                                                                                                                           | LOW: ClinVar cross-reference is optional and its results are currently not used to override local analysis. Acceptable omission for Phase 0.                                                                                                                                                          | Document the ClinVar integration as a future enhancement.                                                                                                                                                  |
| 10  | `ethnicity.ts` (calculateBayesianPosterior) | Python signature takes `genotype_data: dict` (a dict with at least a "status" key). TypeScript takes `genotypeStatus: CarrierStatus` (just the status string).                                                                                                                                                            | LOW: The TypeScript simplification is actually cleaner -- it extracts the relevant field before calling the function. No algorithmic impact as long as the correct status string is passed.                                                                                                           | No action needed; intentional simplification.                                                                                                                                                              |

---

## Bayesian Formula Verification

The Bayesian posterior calculation in `ethnicity.ts` is **correctly documented**:

```
P(carrier | genotype, population) =
    P(genotype | carrier) * P(carrier) /
    [P(genotype | carrier) * P(carrier) + P(genotype | non-carrier) * P(non-carrier)]
```

Genotype likelihoods exactly match Python:

- carrier status: P(obs|carrier) = 0.99, P(obs|non-carrier) = max(prior \* 0.01, 1e-10)
- normal status: P(obs|carrier) = 0.01, P(obs|non-carrier) = 0.99
- affected status: P(obs|carrier) = 0.50, P(obs|non-carrier) = 0.001
- unknown status: Returns prior unchanged

## Normal CDF Stub Verification

The Abramowitz & Stegun approximation (formula 26.2.17) is **correctly documented** in `prs.ts`:

- Coefficients: 0.2316419, 0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429
- PDF constant: 0.3989422804014327 (= 1/sqrt(2\*pi))
- Symmetry: CDF(-z) = 1 - CDF(z)
- Accuracy: ~7.5e-8, which is more than sufficient for percentile calculations

This is a valid replacement for `scipy.stats.norm.cdf`.

---

## Summary of Required Fixes

### MUST FIX before implementation (Critical):

1. **`genetics-data/types.ts` line 56**: Change `CarrierPanelEntry.severity` from `'high' | 'medium' | 'low'` to `'high' | 'moderate' | 'low'` to match actual JSON data.

2. **`shared-types/genetics.ts` line 162**: Add `'rapid_metabolizer'` to the `MetabolizerStatus` union type:
   ```typescript
   export type MetabolizerStatus =
     | 'poor_metabolizer'
     | 'intermediate_metabolizer'
     | 'normal_metabolizer'
     | 'rapid_metabolizer' // <-- ADD THIS
     | 'ultra_rapid_metabolizer'
     | 'unknown';
   ```

### SHOULD FIX (Medium):

3. **`shared-types/genetics.ts` (TraitResult)**: Make `parentAGenotype`, `parentBGenotype`, `chromosome`, `description`, `confidence`, `inheritance`, and `offspringProbabilities` optional, OR create a discriminated union for success/missing/error states.

4. **`genetics-data/types.ts` (TraitSnpEntry)**: Consider changing `phenotype_map` to `Record<string, string | PhenotypeMapValue>` for backward compatibility with legacy string format.

### NICE TO HAVE (Low):

5. Document the intentional omission of `clinvar_client` parameter from `analyzeCarrierRisk()`.
6. Document the intentional simplification of `calculateBayesianPosterior()` parameter (status string vs dict).
7. Fix the Python docstring in `load_carrier_panel_for_tier()` (says "171 diseases" for Basic tier; should say "500 diseases" for Premium tier).

---

## Verdict: NEEDS CHANGES

Two critical type mismatches must be fixed before proceeding to implementation:

1. **Severity value mismatch** (`"moderate"` vs `"medium"`) -- affects 33% of the carrier panel
2. **Missing MetabolizerStatus value** (`"rapid_metabolizer"`) -- affects CYP2C19 and CYP3A5 drug recommendations

Both are one-line fixes. After these corrections, the scaffolding is ready for implementation.

Everything else -- function signatures, algorithm documentation, tier gating values, constant lists, population names, risk thresholds, Bayesian formula, and normal CDF approximation -- is accurate and complete.
