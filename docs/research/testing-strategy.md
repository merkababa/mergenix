# Mergenix Comprehensive Testing Strategy

## Executive Summary

The Mergenix codebase currently has **61 tests** across 3 test files covering carrier analysis, carrier panel schema validation, and OAuth integration. However, critical modules representing over **3,500 LOC remain completely untested**, including the genetic file parser (1,262 LOC), trait prediction engine (324 LOC), tier configuration system (330 LOC), authentication manager (462 LOC), payment handlers (~840 LOC combined), ClinVar client (351 LOC), and all UI/page code (~2,500+ LOC). Estimated line coverage is **15-20%**.

This report provides a prioritized, actionable testing plan with specific test cases, estimated coverage improvements, and tooling recommendations.

---

## 1. Current Test Coverage Analysis

### Existing Tests (61 total)

| Test File                        | Tests      | What It Covers                                                                           | Quality Assessment                                                                                                                |
| -------------------------------- | ---------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `tests/test_carrier_analysis.py` | 25         | `determine_carrier_status`, `calculate_offspring_risk`, `analyze_carrier_risk`           | **Good** -- covers all Mendelian inheritance patterns, edge cases (empty SNPs, unknown genotypes), result sorting, key validation |
| `tests/test_carrier_panel.py`    | 19         | Schema validation of `carrier_panel.json` (fields, formats, duplicates, categories)      | **Good** -- thorough schema validation, catches data corruption                                                                   |
| `tests/test_oauth.py`            | 13         | `GoogleOAuthHandler` init, config, auth URL, token exchange, user info, state validation | **Good** -- solid mock-based testing of OAuth flow                                                                                |
| `tests/conftest.py`              | 2 fixtures | Shared `carrier_panel_path` and `carrier_panel` fixtures                                 | **Adequate** -- could be expanded                                                                                                 |

### Untested Modules (Critical Gaps)

| Module                              | LOC     | Risk Level   | Reason                                                                                            |
| ----------------------------------- | ------- | ------------ | ------------------------------------------------------------------------------------------------- |
| `Source/parser.py`                  | 1,262   | **CRITICAL** | Core file parsing for 4 formats -- any bug here means wrong analysis results                      |
| `Source/trait_prediction.py`        | 324     | **HIGH**     | Punnett square math and phenotype mapping -- errors produce incorrect genetic predictions         |
| `Source/tier_config.py`             | 330     | **HIGH**     | Access control / paywall logic -- bugs could give free users paid features or lock paid users out |
| `Source/auth/manager.py`            | 462     | **HIGH**     | User registration, authentication, password hashing, lockout -- security-critical                 |
| `Source/auth/validators.py`         | 134     | **MEDIUM**   | Input validation for email, password, name -- security boundary                                   |
| `Source/auth/session.py`            | 148     | **MEDIUM**   | Session management, timeout, invalidation -- security boundary                                    |
| `Source/clinvar_client.py`          | 351     | **MEDIUM**   | External API integration -- needs mock-based testing                                              |
| `Source/payments/stripe_handler.py` | 439     | **MEDIUM**   | Stripe checkout, webhooks, subscription management                                                |
| `Source/payments/paypal_handler.py` | 401     | **MEDIUM**   | PayPal subscription management, webhooks                                                          |
| `Source/ui/theme.py`                | 973     | **LOW**      | CSS generation -- less likely to cause data errors                                                |
| `Source/ui/components.py`           | ~200    | **LOW**      | UI component rendering                                                                            |
| `Source/ui/navbar.py`               | ~150    | **LOW**      | Navigation bar rendering                                                                          |
| `pages/*.py` (9 files)              | ~2,500+ | **MEDIUM**   | Page-level integration -- hard to unit test but important for end-to-end                          |

### Estimated Current Coverage

- **Line coverage:** ~15-20% (only `carrier_analysis.py` functions + data schema are tested)
- **Branch coverage:** ~10-15% (many error paths and edge cases untested)
- **Module coverage:** 3 of ~15 modules tested (20%)

---

## 2. Priority 1: Parser Tests (CRITICAL)

**File:** `Source/parser.py` (1,262 LOC, 0% tested)
**Impact:** Every analysis depends on correct parsing. A parsing bug means wrong SNP data, wrong carrier status, wrong risk assessment.
**Estimated coverage improvement:** +15-18% overall

### Recommended Test File: `tests/test_parser.py`

#### 2.1 Format Detection Tests (`detect_format`, `_detect_format_from_content`)

```
test_detect_23andme_with_header_comment        -- file with "# 23andMe" comment line
test_detect_23andme_without_comment            -- file with tab-separated 4-col data, no "23andMe" header
test_detect_ancestry_with_comment              -- file with "# AncestryDNA" comment
test_detect_ancestry_with_allele_header        -- file with "rsid\tchromosome\tposition\tallele1\tallele2" header
test_detect_myheritage_with_csv_header         -- file with "RSID,CHROMOSOME,POSITION,RESULT" header
test_detect_myheritage_quoted_fields           -- file with quoted CSV fields
test_detect_vcf_with_fileformat_line           -- file with "##fileformat=VCFv4.1" meta line
test_detect_vcf_with_chrom_header              -- file with #CHROM header line
test_detect_unknown_format                     -- random text file returns "unknown"
test_detect_empty_file                         -- empty content returns "unknown"
test_detect_binary_garbage                     -- non-text data returns "unknown"
```

#### 2.2 23andMe Parsing Tests

```
test_parse_23andme_valid_file                  -- standard 23andMe file with comment header
test_parse_23andme_from_path                   -- parse from file path (str)
test_parse_23andme_from_pathlib                -- parse from pathlib.Path
test_parse_23andme_from_bytesio               -- parse from BytesIO (Streamlit upload)
test_parse_23andme_from_file_object           -- parse from file-like object
test_parse_23andme_skips_nocall               -- genotype "--" entries are excluded
test_parse_23andme_skips_empty_genotype       -- empty genotype entries are excluded
test_parse_23andme_skips_comment_lines        -- lines starting with "#" are skipped
test_parse_23andme_skips_header_rows          -- "rsid" header rows without "#" are skipped
test_parse_23andme_handles_indel_ids          -- rsIDs starting with "i" are parsed
test_parse_23andme_invalid_format_raises      -- non-23andMe content raises ValueError
test_parse_23andme_empty_file_raises          -- empty file raises ValueError
test_parse_23andme_file_not_found             -- nonexistent path raises FileNotFoundError
test_parse_23andme_genotype_count             -- verify SNP count is correct
test_parse_23andme_specific_rsid              -- verify a specific rsid -> genotype mapping
```

#### 2.3 AncestryDNA Parsing Tests

```
test_parse_ancestry_valid_file                 -- standard AncestryDNA with allele1/allele2 columns
test_parse_ancestry_combines_alleles          -- allele1="A" + allele2="G" -> genotype "AG"
test_parse_ancestry_skips_nocall              -- allele value "0" entries are excluded
test_parse_ancestry_skips_header              -- header row with "rsid" is skipped
test_parse_ancestry_invalid_format_raises     -- non-Ancestry content raises ValueError
test_parse_ancestry_empty_data_raises         -- no valid SNP data raises ValueError
test_parse_ancestry_bytesio_input             -- parse from BytesIO
```

#### 2.4 MyHeritage/FTDNA Parsing Tests

```
test_parse_myheritage_valid_csv               -- standard MyHeritage CSV with RSID,CHROMOSOME,POSITION,RESULT
test_parse_myheritage_quoted_fields           -- CSV with quoted fields
test_parse_myheritage_skips_nocall            -- "--" results are excluded
test_parse_myheritage_accepts_vg_ids          -- VG-prefixed proprietary IDs are parsed
test_parse_myheritage_invalid_format_raises   -- non-MyHeritage content raises ValueError
test_parse_myheritage_bytesio_input           -- parse from BytesIO
```

#### 2.5 VCF Parsing Tests

```
test_parse_vcf_valid_file                     -- standard VCF with ##fileformat, #CHROM, and GT data
test_parse_vcf_snps_only                      -- indels (multi-base REF/ALT) are skipped
test_parse_vcf_skips_no_rsid                  -- variants with "." ID are skipped
test_parse_vcf_phased_genotype                -- genotype with "|" separator (phased)
test_parse_vcf_unphased_genotype              -- genotype with "/" separator (unphased)
test_parse_vcf_nocall_skipped                 -- "./." genotypes are excluded
test_parse_vcf_multiallelic                   -- ALT with multiple comma-separated alleles
test_parse_vcf_gt_not_first_format_field      -- GT is not at index 0 in FORMAT column
test_parse_vcf_invalid_format_raises          -- non-VCF content raises ValueError
test_parse_vcf_no_gt_field_raises             -- VCF without GT in FORMAT raises ValueError
```

#### 2.6 Universal Parser Tests (`parse_genetic_file`)

```
test_parse_genetic_file_autodetect_23andme    -- auto-detects and parses 23andMe
test_parse_genetic_file_autodetect_ancestry   -- auto-detects and parses AncestryDNA
test_parse_genetic_file_autodetect_myheritage -- auto-detects and parses MyHeritage
test_parse_genetic_file_autodetect_vcf        -- auto-detects and parses VCF
test_parse_genetic_file_returns_format_name   -- returns correct format name tuple element
test_parse_genetic_file_unknown_raises        -- unknown format raises ValueError
```

#### 2.7 Validation Tests

```
test_validate_23andme_valid                   -- returns (True, "")
test_validate_23andme_too_short               -- returns (False, "too short...")
test_validate_23andme_no_header               -- returns (False, "missing header...")
test_validate_ancestry_valid                  -- returns (True, "")
test_validate_ancestry_no_header              -- returns (False, "missing header...")
test_validate_myheritage_valid                -- returns (True, "")
test_validate_vcf_valid                       -- returns (True, "")
test_validate_vcf_no_fileformat               -- returns (False, "missing fileformat...")
test_validate_vcf_no_chrom_header             -- returns (False, "missing #CHROM...")
test_validate_genetic_file_universal          -- `validate_genetic_file` returns (bool, msg, format)
```

#### 2.8 Statistics Tests

```
test_get_genotype_stats_empty                 -- empty dict returns zeroes
test_get_genotype_stats_homozygous            -- "AA" counted as homozygous
test_get_genotype_stats_heterozygous          -- "AG" counted as heterozygous
test_get_genotype_stats_single_allele         -- single char "A" counted as homozygous (X/Y chr)
test_get_detailed_stats_with_metadata         -- chromosome counts from metadata
```

### Test Data Strategy for Parser

Create **minimal synthetic test fixtures** in `tests/fixtures/`:

- `sample_23andme.txt` -- 20-30 SNP lines with proper 23andMe header
- `sample_ancestry.txt` -- 20-30 SNP lines with AncestryDNA format
- `sample_myheritage.csv` -- 20-30 SNP lines with MyHeritage format
- `sample.vcf` -- 20-30 variant lines with VCF format
- `malformed_empty.txt` -- empty file
- `malformed_binary.bin` -- random bytes

Alternatively, build these inline as `StringIO`/`BytesIO` objects in conftest.py fixtures.

---

## 3. Priority 2: Trait Prediction Tests (HIGH)

**File:** `Source/trait_prediction.py` (324 LOC, 0% tested)
**Impact:** Incorrect Punnett square math = incorrect offspring probability predictions.
**Estimated coverage improvement:** +5-7%

### Recommended Test File: `tests/test_trait_prediction.py`

#### 3.1 Allele Splitting

```
test_get_parent_alleles_valid                 -- "AG" returns ("A", "G")
test_get_parent_alleles_homozygous           -- "AA" returns ("A", "A")
test_get_parent_alleles_invalid_length       -- "A" or "AGT" raises ValueError
```

#### 3.2 Punnett Square

```
test_punnett_both_homozygous_same            -- AA x AA -> {"AA": 1.0}
test_punnett_both_homozygous_different       -- AA x GG -> {"AG": 1.0}
test_punnett_one_heterozygous                -- AG x AA -> {"AA": 0.5, "AG": 0.5}
test_punnett_both_heterozygous               -- AG x AG -> {"AA": 0.25, "AG": 0.5, "GG": 0.25}
test_punnett_probabilities_sum_to_one        -- all values sum to 1.0
test_punnett_genotype_normalized             -- "GA" stored as "AG" (alphabetical)
```

#### 3.3 Genotype-to-Phenotype Mapping

```
test_map_genotype_exact_match                -- "AA" -> phenotype from map
test_map_genotype_normalized_match           -- "GA" found via normalized "AG"
test_map_genotype_not_in_map                 -- returns None
test_normalize_genotype                      -- "GA" -> "AG", "TA" -> "AT"
```

#### 3.4 Single Trait Prediction

```
test_predict_trait_both_parents_present       -- returns success with probabilities
test_predict_trait_parent_a_missing           -- returns status="missing", note mentions Parent A
test_predict_trait_parent_b_missing           -- returns status="missing", note mentions Parent B
test_predict_trait_unmapped_genotype          -- returns status="error" when genotypes not in phenotype_map
test_predict_trait_partial_unmapped           -- some genotypes mapped, note lists unmapped
test_predict_trait_probabilities_sum_to_100   -- offspring_probabilities sum to ~100%
test_predict_trait_result_keys                -- result has all required keys
```

#### 3.5 Full Trait Analysis

```
test_analyze_traits_loads_database            -- loads trait_snps.json, returns list
test_analyze_traits_returns_predictions       -- results contain prediction dicts
test_analyze_traits_empty_snps                -- empty parent SNPs returns all "missing"
```

#### 3.6 Report Formatting

```
test_format_prediction_report_nonempty        -- returns non-empty string
test_format_prediction_report_sections        -- contains "PREDICTED TRAITS", "MISSING DATA"
test_format_prediction_report_empty_list      -- handles empty predictions list
```

---

## 4. Priority 3: Tier Configuration Tests (HIGH)

**File:** `Source/tier_config.py` (330 LOC, 0% tested)
**Impact:** Access control / paywall bugs could give free users paid features or block paid users.
**Estimated coverage improvement:** +4-5%

### Recommended Test File: `tests/test_tier_config.py`

```
test_tier_configs_have_all_tiers              -- FREE, PREMIUM, PRO all defined
test_free_tier_limits                         -- disease_limit=25, trait_limit=10
test_premium_tier_limits                      -- disease_limit=500, trait_limit=79
test_pro_tier_limits                          -- disease_limit=2715, trait_limit=79
test_free_tier_price_is_zero                  -- price == 0.0
test_paid_tiers_price_positive                -- PREMIUM and PRO have price > 0
test_get_tier_config_returns_correct          -- get_tier_config(TierType.FREE) matches expected

test_get_diseases_free_tier                   -- returns only TOP_25 diseases, max 25
test_get_diseases_premium_tier                -- returns up to 500 diseases
test_get_diseases_pro_tier                    -- returns all diseases (2715)
test_get_diseases_free_matches_list           -- free diseases match TOP_25_FREE_DISEASES names

test_get_traits_free_tier                     -- returns only TOP_10 traits, max 10
test_get_traits_premium_tier                  -- returns up to 79 traits
test_get_traits_pro_tier                      -- returns all 79 traits
test_get_traits_free_matches_list             -- free traits match TOP_10_FREE_TRAITS names

test_can_access_disease_free_yes              -- "Cystic Fibrosis" accessible on free
test_can_access_disease_free_no               -- random disease not accessible on free
test_can_access_disease_pro_always            -- any disease accessible on pro

test_can_access_trait_free_yes                -- "Eye Color" accessible on free
test_can_access_trait_free_no                 -- random trait not accessible on free

test_get_upgrade_message_free                 -- mentions "Premium"
test_get_upgrade_message_premium              -- mentions "Pro"
test_get_upgrade_message_pro                  -- mentions "lifetime access"

test_get_tier_comparison_structure             -- returns dict with "tiers", "prices", etc.
test_get_stripe_price_id_free_is_none         -- free tier has no Stripe price
test_get_stripe_price_id_paid_returns_string  -- paid tiers return string IDs

test_top_25_free_diseases_count               -- exactly 25 diseases in list
test_top_10_free_traits_count                 -- exactly 10 traits in list
```

---

## 5. Priority 4: Authentication Tests (HIGH -- Security-Critical)

**Files:** `Source/auth/manager.py` (462 LOC), `Source/auth/validators.py` (134 LOC)
**Impact:** Auth bypass, password hash failures, account lockout bugs = security vulnerabilities.
**Estimated coverage improvement:** +8-10%

### 5.1 Validator Tests (`tests/test_validators.py`)

```
test_validate_email_valid                     -- "user@example.com" -> (True, "")
test_validate_email_no_at                     -- "userexample.com" -> (False, "Invalid email")
test_validate_email_no_domain_dot             -- "user@example" -> (False, "Invalid email")
test_validate_email_multiple_at               -- "user@@example.com" -> (False, ...)
test_validate_email_empty                     -- "" -> (False, ...)

test_validate_password_strong                 -- "SecureP@ss1" -> (True, "")
test_validate_password_too_short              -- "Abc1" -> (False, "at least 8 characters")
test_validate_password_no_uppercase           -- "lowercase1" -> (False, "uppercase")
test_validate_password_no_lowercase           -- "UPPERCASE1" -> (False, "lowercase")
test_validate_password_no_digit               -- "NoDigitsHere" -> (False, "digit")

test_validate_name_valid                      -- "John" -> (True, "")
test_validate_name_too_short                  -- "J" -> (False, "at least 2 characters")
test_validate_name_empty                      -- "" -> (False, ...)
test_validate_name_whitespace_only            -- "  " -> (False, ...)

test_password_strength_weak                   -- score=1 for "abcdefgh"
test_password_strength_strong                 -- score=4 for "Str0ng!Pass#"
test_password_strength_empty                  -- score=0 for ""
```

### 5.2 AuthManager Tests (`tests/test_auth_manager.py`)

Uses a temp file for `users_file` to avoid side effects.

```
test_register_user_success                    -- valid inputs create user, returns (True, "Registration successful")
test_register_user_duplicate_email            -- same email twice returns (False, "already registered")
test_register_user_invalid_email              -- bad email returns (False, ...)
test_register_user_invalid_password           -- weak password returns (False, ...)
test_register_user_short_name                 -- 1-char name returns (False, ...)

test_authenticate_success                     -- correct credentials return (True, user_data)
test_authenticate_wrong_password              -- wrong password returns (False, None)
test_authenticate_nonexistent_user            -- unknown email returns (False, None)
test_authenticate_strips_email                -- " User@EXAMPLE.com " -> normalized lookup
test_authenticate_records_failed_login        -- failed attempt increments counter
test_authenticate_lockout_after_5_attempts    -- 5+ failures returns (False, None) even with correct password
test_authenticate_lockout_expires_30min       -- lockout resets after 30 minutes

test_get_user_found                           -- returns user dict without password_hash
test_get_user_not_found                       -- returns None
test_get_user_by_id_delegates                -- calls get_user

test_update_user_tier_valid                   -- tier changes to "premium"
test_update_user_tier_invalid_tier            -- invalid tier returns False
test_update_user_tier_invalid_provider        -- invalid provider returns False
test_update_user_tier_nonexistent_user        -- returns False

test_change_password_success                  -- correct old + valid new returns (True, ...)
test_change_password_wrong_old                -- wrong old password returns (False, "incorrect")
test_change_password_weak_new                 -- weak new password returns (False, ...)

test_create_oauth_user_success                -- google OAuth creates user without password_hash
test_create_oauth_user_invalid_provider       -- provider "facebook" returns (False, ...)
test_create_oauth_user_duplicate_email        -- returns (False, "already registered")

test_link_oauth_account_success               -- links OAuth to existing user
test_link_oauth_account_nonexistent           -- returns False

test_get_user_by_oauth_found                  -- finds user by provider + oauth_id
test_get_user_by_oauth_not_found              -- returns None
```

---

## 6. Priority 5: ClinVar Client Tests (MEDIUM)

**File:** `Source/clinvar_client.py` (351 LOC, 0% tested)
**Impact:** External API integration -- needs mock-based testing to avoid real API calls.
**Estimated coverage improvement:** +4-5%

### Recommended Test File: `tests/test_clinvar_client.py`

```
test_init_default_rate_limit                  -- no API key -> rate_limit = 3
test_init_with_api_key_rate_limit             -- API key -> rate_limit = 10
test_cache_hit                                -- second call returns cached result
test_cache_clear                              -- clear_cache empties cache
test_query_variant_success (mocked)           -- mocked esearch + esummary returns structured result
test_query_variant_not_found (mocked)         -- empty esearch returns None
test_query_variant_normalizes_rsid            -- "334" becomes "rs334"
test_is_pathogenic_true (mocked)              -- "Pathogenic" significance returns True
test_is_pathogenic_false (mocked)             -- "Benign" significance returns False
test_query_variants_batch (mocked)            -- queries multiple rsIDs, returns dict
test_get_carrier_status_homozygous            -- "TT" with pathogenic "T" -> "homozygous_pathogenic"
test_get_carrier_status_carrier               -- "AT" with pathogenic "T" -> "carrier"
test_get_carrier_status_normal                -- "AA" with pathogenic "T" -> "normal"
test_rate_limit_wait                          -- _wait_for_rate_limit delays appropriately
test_retry_on_failure (mocked)                -- retries on request failure, then succeeds
test_max_retries_exhausted (mocked)           -- all retries fail returns None
```

---

## 7. Priority 6: Payment Handler Tests (MEDIUM)

### 7.1 Stripe Handler (`tests/test_stripe_handler.py`)

All Stripe API calls should be mocked with `unittest.mock.patch`.

```
test_init_invalid_api_key                     -- empty key raises StripeHandlerError
test_create_checkout_invalid_tier             -- invalid tier raises StripeHandlerError
test_create_checkout_invalid_period           -- invalid billing period raises StripeHandlerError
test_create_checkout_invalid_email            -- invalid email raises StripeHandlerError
test_create_checkout_success (mocked)         -- returns session_id, url
test_create_portal_session_no_customer        -- empty customer_id raises error
test_get_subscription_status_success (mocked) -- returns subscription details dict
test_cancel_subscription_success (mocked)     -- returns True
test_handle_webhook_checkout_completed        -- processes checkout.session.completed event
test_handle_webhook_subscription_updated      -- processes subscription.updated event
test_handle_webhook_subscription_deleted      -- processes subscription.deleted event
test_handle_webhook_invalid_signature         -- raises StripeHandlerError
```

### 7.2 PayPal Handler (`tests/test_paypal_handler.py`)

```
test_init_empty_credentials                   -- raises ValueError
test_create_subscription_invalid_tier         -- raises ValueError
test_create_subscription_invalid_period       -- raises ValueError
test_handle_webhook_activated                 -- returns action="enable_premium_features"
test_handle_webhook_cancelled                 -- returns action="disable_premium_features"
test_handle_webhook_suspended                 -- returns action="suspend_premium_features"
test_handle_webhook_expired                   -- returns action="disable_premium_features"
test_handle_webhook_unknown_event             -- unhandled event type, processed=False
test_handle_webhook_empty_payload             -- raises ValueError
test_handle_webhook_missing_event_type        -- raises ValueError
```

---

## 8. Integration Testing

### 8.1 End-to-End Analysis Flow

The critical user path: **Upload files -> Parse -> Analyze carrier risk -> Predict traits -> Display results**.

Create a test file `tests/test_integration.py`:

```
test_full_analysis_23andme_pair               -- parse two 23andMe files -> analyze_carrier_risk -> analyze_traits
test_full_analysis_mixed_formats              -- parse one 23andMe + one AncestryDNA -> analyze
test_full_analysis_ancestry_pair              -- parse two AncestryDNA files -> analyze
test_full_analysis_vcf_pair                   -- parse two VCF files -> analyze
test_analysis_respects_free_tier_limits       -- free tier returns <= 25 diseases, <= 10 traits
test_analysis_respects_premium_tier_limits    -- premium tier returns <= 500 diseases
test_analysis_pro_tier_all_diseases           -- pro tier returns all 2715 diseases
test_carrier_panel_diseases_are_parseable     -- every rsID in carrier_panel.json can be looked up in parsed data
test_trait_snps_are_parseable                 -- every rsID in trait_snps.json can be looked up in parsed data
```

### 8.2 Streamlit App Testing

Streamlit 1.28+ provides `st.testing.v1.AppTest` for headless testing:

```python
from streamlit.testing.v1 import AppTest

def test_home_page_renders():
    at = AppTest.from_file("pages/home.py")
    at.run()
    assert not at.exception

def test_disease_catalog_renders():
    at = AppTest.from_file("pages/disease_catalog.py")
    at.run()
    assert not at.exception

def test_auth_page_renders():
    at = AppTest.from_file("pages/auth.py")
    at.run()
    assert not at.exception
```

**Note:** AppTest has limitations -- it cannot fully simulate file_uploader interactions or complex widget state. For full UI testing, use Playwright (see Section 10).

---

## 9. Security Testing

### 9.1 File Upload Fuzzing (`tests/test_parser_security.py`)

```
test_parse_oversized_file                     -- 100MB file does not OOM / crashes gracefully
test_parse_zip_bomb                           -- compressed file does not exhaust memory
test_parse_unicode_attack                     -- files with unusual unicode (RTL override, null bytes)
test_parse_path_traversal_filename            -- filename like "../../etc/passwd" does not escape
test_parse_html_injection_in_genotype         -- "<script>" in genotype field is not rendered
test_parse_sql_injection_in_rsid              -- "rs'; DROP TABLE--" does not cause errors
test_parse_extremely_long_lines               -- single line > 1MB handled gracefully
test_parse_null_bytes_in_content              -- \x00 bytes in file content handled gracefully
test_parse_mixed_encodings                    -- UTF-8 BOM, Latin-1 content handled or rejected cleanly
```

### 9.2 Authentication Security (`tests/test_auth_security.py`)

```
test_password_hash_not_returned               -- get_user never returns password_hash field
test_password_hash_is_bcrypt                  -- stored hash starts with "$2b$"
test_timing_attack_resistance                 -- authenticate takes similar time for wrong email vs wrong password
test_lockout_prevents_brute_force             -- 5 wrong attempts lock account
test_session_token_is_cryptographic           -- token has sufficient entropy (>= 256 bits)
test_email_case_normalization                 -- "User@EXAMPLE.com" and "user@example.com" are same account
test_xss_in_user_name                         -- "<script>alert(1)</script>" as name is stored safely
test_sql_injection_in_email                   -- email with SQL chars does not cause errors
```

### 9.3 Payment Security

```
test_webhook_signature_required               -- unsigned webhook payload is rejected
test_webhook_replay_protection                -- same event_id processed only once
test_tier_downgrade_on_cancel                 -- cancelled subscription reverts to free tier
```

---

## 10. Visual & UI Regression Testing

### 10.1 Playwright E2E Tests (Recommended)

Install: `pip install playwright && playwright install`

Create `tests/e2e/test_app_e2e.py`:

```python
# Run Streamlit in background, then test with Playwright
# Uses pytest-playwright for integration

def test_home_page_loads(page):
    page.goto("http://localhost:8501")
    assert page.title() == "Mergenix - Genetic Offspring Analysis"
    assert page.locator("text=Mergenix").is_visible()

def test_disease_catalog_navigation(page):
    page.goto("http://localhost:8501")
    page.click("text=Disease Catalog")
    assert page.locator("text=Genetic Disease Reference").is_visible()

def test_dark_light_toggle(page):
    page.goto("http://localhost:8501")
    # Toggle theme and verify CSS changes
```

### 10.2 Snapshot Testing

Use `pytest-snapshot` or `syrupy` for HTML/CSS output comparison:

```
test_theme_dark_css_snapshot                  -- dark mode CSS output matches baseline
test_theme_light_css_snapshot                 -- light mode CSS output matches baseline
test_navbar_html_snapshot                     -- navbar HTML matches baseline
```

---

## 11. Performance Testing

### 11.1 Parser Benchmarks (`tests/test_parser_performance.py`)

```
test_parse_23andme_under_2_seconds            -- 600K+ SNP file parses < 2s
test_parse_ancestry_under_2_seconds           -- 700K+ SNP file parses < 2s
test_parse_vcf_under_3_seconds                -- large VCF with 1M variants parses < 3s
test_detect_format_under_50ms                 -- format detection < 50ms
test_carrier_analysis_under_5_seconds         -- 2715-disease panel analysis < 5s
test_trait_analysis_under_1_second            -- 79-trait analysis < 1s
test_memory_usage_under_500mb                 -- parsing 600K SNP file uses < 500MB RAM
```

### 11.2 Load Testing

Use `locust` or `pytest-benchmark` for sustained throughput:

- 10 concurrent users uploading files
- Disease catalog page with 2715 entries
- Repeated analysis runs

---

## 12. Edge Cases & Regression Tests

### 12.1 Genetic Data Edge Cases (`tests/test_edge_cases.py`)

```
test_multiallelic_site_vcf                    -- VCF with ALT="A,C,G" -- 3+ alleles
test_indel_variant_skipped                    -- REF="AT", ALT="A" skipped in VCF
test_mitochondrial_chromosome                 -- chromosome "MT" or "M" handled correctly
test_x_linked_inheritance                     -- X-linked disease with male (single X allele)
test_no_overlap_between_parents               -- Parent A and B have zero shared rsIDs
test_all_rsids_shared                         -- Both parents have identical rsID sets
test_huge_carrier_panel                       -- 2715 diseases doesn't break analysis
test_empty_phenotype_map                      -- trait with empty phenotype_map
test_special_characters_in_condition_name     -- apostrophes, hyphens, parentheses in disease names
test_unicode_in_description                   -- non-ASCII characters in descriptions
```

### 12.2 Data Integrity Regression

```
test_carrier_panel_no_new_duplicates          -- re-run after data updates
test_trait_snps_all_have_phenotype_maps       -- every trait has non-empty phenotype_map
test_carrier_panel_sources_present            -- entries have "sources" field with citations
test_carrier_panel_confidence_present         -- entries have "confidence" field
test_carrier_panel_notes_present              -- entries have "notes" field
```

---

## 13. CI/CD Improvements

### 13.1 Current CI Configuration

The current `ci.yml` runs:

- `pytest tests/ -v` on Python 3.10 and 3.12
- `ruff check` (with `continue-on-error: true` -- should be `false`)

### 13.2 Recommended CI Enhancements

#### A. Coverage Reports

```yaml
- name: Run tests with coverage
  run: |
    pip install pytest-cov
    pytest tests/ -v --cov=Source --cov=pages --cov-report=xml --cov-report=term-missing

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    file: ./coverage.xml
    fail_ci_if_error: false
```

#### B. Make Linting Fail CI

```yaml
- name: Run ruff check
  run: ruff check Source/ pages/ tests/ app.py
  # Remove: continue-on-error: true
```

#### C. Mutation Testing (Optional)

```yaml
- name: Mutation testing
  run: |
    pip install mutmut
    mutmut run --paths-to-mutate=Source/carrier_analysis.py,Source/trait_prediction.py
    mutmut results
```

#### D. Parallel Test Execution

```yaml
- name: Run tests in parallel
  run: |
    pip install pytest-xdist
    pytest tests/ -v -n auto
```

---

## 14. Test Data Assessment

### Current State

- `scripts/regenerate_sample_data.py` generates 23 sample files
- These are NOT in the repository (`.gitignore` or just ungenerated)
- No test fixtures directory exists

### Recommendations

1. **Create `tests/fixtures/` directory** with small, deterministic test files:
   - One file per format (23andMe, Ancestry, MyHeritage, VCF)
   - Each containing 50-100 curated SNPs that overlap with `carrier_panel.json` and `trait_snps.json`
   - Include specific rsIDs that trigger known carrier/affected/normal statuses
   - Include rsIDs from `trait_snps.json` for trait prediction testing

2. **Curate overlap SNPs:** Pick 5-10 rsIDs from `carrier_panel.json` and 5-10 from `trait_snps.json`, create test files with known genotypes so integration tests produce predictable results.

3. **Edge case files:**
   - Empty file (0 bytes)
   - File with only headers (no data)
   - File with all no-call entries
   - File with 1 million entries (performance test)
   - File with mixed valid/invalid lines

---

## 15. Recommended Implementation Roadmap

### Phase 1: Foundation (Week 1) -- Target: +25% coverage

| Priority | Task                                                                    | Estimated Tests | Coverage Gain |
| -------- | ----------------------------------------------------------------------- | --------------- | ------------- |
| P0       | Create `tests/fixtures/` with synthetic test data for all 4 formats     | --              | --            |
| P0       | `tests/test_parser.py` -- format detection + parsing for all 4 formats  | ~55 tests       | +15-18%       |
| P0       | `tests/test_trait_prediction.py` -- Punnett squares + phenotype mapping | ~20 tests       | +5-7%         |
| P0       | Add `pytest-cov` to CI and set 30% minimum threshold                    | --              | --            |

### Phase 2: Security & Auth (Week 2) -- Target: +40% coverage

| Priority | Task                                                                  | Estimated Tests | Coverage Gain |
| -------- | --------------------------------------------------------------------- | --------------- | ------------- |
| P1       | `tests/test_validators.py` -- email, password, name validation        | ~15 tests       | +2%           |
| P1       | `tests/test_auth_manager.py` -- registration, authentication, lockout | ~25 tests       | +6-8%         |
| P1       | `tests/test_tier_config.py` -- tier limits, access control, pricing   | ~25 tests       | +4-5%         |
| P1       | `tests/test_auth_security.py` -- security-specific tests              | ~8 tests        | +1%           |

### Phase 3: Integration & API (Week 3) -- Target: +55% coverage

| Priority | Task                                                    | Estimated Tests | Coverage Gain |
| -------- | ------------------------------------------------------- | --------------- | ------------- |
| P2       | `tests/test_clinvar_client.py` -- mocked API tests      | ~15 tests       | +4-5%         |
| P2       | `tests/test_integration.py` -- end-to-end analysis flow | ~10 tests       | +3-4%         |
| P2       | `tests/test_stripe_handler.py` -- mocked Stripe tests   | ~12 tests       | +3%           |
| P2       | `tests/test_paypal_handler.py` -- mocked PayPal tests   | ~10 tests       | +2%           |

### Phase 4: Edge Cases & E2E (Week 4) -- Target: +65% coverage

| Priority | Task                                                   | Estimated Tests | Coverage Gain |
| -------- | ------------------------------------------------------ | --------------- | ------------- |
| P3       | `tests/test_edge_cases.py` -- genetic data edge cases  | ~10 tests       | +2%           |
| P3       | `tests/test_parser_security.py` -- fuzzing & injection | ~10 tests       | +2%           |
| P3       | Streamlit `AppTest` page render tests                  | ~9 tests        | +3%           |
| P3       | CI: coverage threshold enforcement (fail below 50%)    | --              | --            |

### Phase 5: Polish (Ongoing) -- Target: +75% coverage

| Priority | Task                                           | Estimated Tests | Coverage Gain      |
| -------- | ---------------------------------------------- | --------------- | ------------------ |
| P4       | Playwright E2E tests for critical user flows   | ~5-10 tests     | +5%                |
| P4       | Performance benchmarks                         | ~7 tests        | +2%                |
| P4       | Mutation testing with `mutmut` on core engines | --              | quality validation |
| P4       | Snapshot testing for UI consistency            | ~5 tests        | +1%                |

---

## 16. Tooling Recommendations

| Tool               | Purpose                                              | Install                                        |
| ------------------ | ---------------------------------------------------- | ---------------------------------------------- |
| `pytest-cov`       | Line + branch coverage reports                       | `pip install pytest-cov`                       |
| `pytest-xdist`     | Parallel test execution                              | `pip install pytest-xdist`                     |
| `pytest-mock`      | Simplified mocking                                   | `pip install pytest-mock`                      |
| `pytest-benchmark` | Performance benchmarks                               | `pip install pytest-benchmark`                 |
| `mutmut`           | Mutation testing                                     | `pip install mutmut`                           |
| `playwright`       | Browser E2E testing                                  | `pip install playwright && playwright install` |
| `hypothesis`       | Property-based testing (great for parser edge cases) | `pip install hypothesis`                       |
| `syrupy`           | Snapshot testing                                     | `pip install syrupy`                           |
| `Codecov`          | Coverage tracking in CI                              | GitHub Action                                  |
| `faker`            | Generate realistic test data                         | `pip install faker`                            |

---

## 17. Conftest.py Expansion

Recommended additions to `tests/conftest.py`:

```python
import json
import os
import tempfile
from io import BytesIO, StringIO

import pytest


@pytest.fixture
def trait_snps_path():
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "trait_snps.json")

@pytest.fixture
def trait_snps(trait_snps_path):
    with open(trait_snps_path) as f:
        return json.load(f)

@pytest.fixture
def sample_23andme_content():
    """Minimal valid 23andMe file content."""
    return (
        "# This data file generated by 23andMe\n"
        "# rsid\tchromosome\tposition\tgenotype\n"
        "rs334\t11\t5227002\tAT\n"
        "rs76173977\t15\t72346580\tCT\n"
        "rs75030207\t7\t117171029\tCC\n"
        "rs12913832\t15\t28365618\tAG\n"
    )

@pytest.fixture
def sample_23andme_bytesio(sample_23andme_content):
    return BytesIO(sample_23andme_content.encode("utf-8"))

@pytest.fixture
def sample_ancestry_content():
    """Minimal valid AncestryDNA file content."""
    return (
        "#AncestryDNA raw data download\n"
        "rsid\tchromosome\tposition\tallele1\tallele2\n"
        "rs334\t11\t5227002\tA\tT\n"
        "rs76173977\t15\t72346580\tC\tT\n"
        "rs75030207\t7\t117171029\tC\tC\n"
    )

@pytest.fixture
def sample_myheritage_content():
    """Minimal valid MyHeritage/FTDNA CSV content."""
    return (
        "RSID,CHROMOSOME,POSITION,RESULT\n"
        "rs334,11,5227002,AT\n"
        "rs76173977,15,72346580,CT\n"
        "rs75030207,7,117171029,CC\n"
    )

@pytest.fixture
def sample_vcf_content():
    """Minimal valid VCF file content."""
    return (
        "##fileformat=VCFv4.1\n"
        "##source=test\n"
        "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE\n"
        "11\t5227002\trs334\tA\tT\t50\tPASS\t.\tGT:DP\t0/1:30\n"
        "15\t72346580\trs76173977\tC\tT\t50\tPASS\t.\tGT:DP\t0/1:25\n"
        "7\t117171029\trs75030207\tC\tT\t50\tPASS\t.\tGT:DP\t0/0:35\n"
    )

@pytest.fixture
def temp_users_file():
    """Create a temporary users.json file for auth testing."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({}, f)
        path = f.name
    yield path
    os.unlink(path)
```

---

## 18. Key Metrics & Targets

| Metric            | Current | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
| ----------------- | ------- | ------- | ------- | ------- | ------- | ------- |
| Total tests       | 61      | ~136    | ~201    | ~248    | ~277    | ~300+   |
| Line coverage     | ~15-20% | ~40%    | ~50%    | ~60%    | ~65%    | ~75%    |
| Modules tested    | 3/15    | 5/15    | 8/15    | 12/15   | 14/15   | 15/15   |
| CI coverage gate  | None    | 30%     | 40%     | 50%     | 50%     | 60%     |
| Security tests    | 0       | 0       | 8       | 8       | 18      | 18      |
| Integration tests | 0       | 0       | 0       | 10      | 10      | 20      |

---

## 19. Critical Findings

1. **Parser is completely untested** -- this is the most dangerous gap. A single parsing bug could silently produce wrong genotype data for thousands of users. Every downstream analysis depends on the parser.

2. **Trait prediction math is untested** -- the Punnett square implementation has not been verified against known genetic crosses. An off-by-one error in probability calculation would produce scientifically incorrect predictions.

3. **Tier access control has no tests** -- a bug in `get_diseases_for_tier` could expose the full 2,715-disease panel to free users (revenue loss) or block paid users from their purchased features (customer churn).

4. **AuthManager password hashing is untested** -- the bcrypt integration could silently fail on some inputs, leading to broken authentication. The lockout mechanism has timing-dependent behavior that needs explicit testing.

5. **CI linting is non-blocking** -- `continue-on-error: true` on ruff means linting failures are silently ignored. This should be changed to `false`.

6. **No coverage tracking** -- without `pytest-cov`, there is no visibility into what percentage of code is actually exercised by tests.

7. **Payment handlers lack tests entirely** -- webhook handling logic for Stripe and PayPal is untested, meaning subscription lifecycle events (activation, cancellation, updates) could be processed incorrectly.

---

## 20. Quick Wins (Implement Today)

1. **Add `pytest-cov` to CI** -- single-line change, instant coverage visibility
2. **Remove `continue-on-error: true`** from ruff check -- make linting failures block PRs
3. **Write 5 parser tests** -- test `detect_format` with synthetic strings (no file I/O needed, 30 minutes of work)
4. **Write 3 Punnett square tests** -- verify `punnett_square` with known AA x AG cross (15 minutes)
5. **Write 5 validator tests** -- pure functions, no dependencies, trivial to test (15 minutes)
