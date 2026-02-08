"""Tests for the Polygenic Risk Score (PRS) engine."""

import os

import pytest
from Source.prs import (
    PRS_CONDITIONS,
    _count_effect_alleles,
    analyze_prs,
    calculate_raw_prs,
    get_prs_disclaimer,
    get_risk_category,
    load_prs_weights,
    normalize_prs,
    predict_offspring_prs_range,
)

WEIGHTS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "prs_weights.json"
)


@pytest.fixture
def prs_weights():
    """Load the real PRS weights for testing."""
    return load_prs_weights(WEIGHTS_PATH)


@pytest.fixture
def sample_snp_data(prs_weights):
    """Create sample SNP data with known genotypes for CAD."""
    cad_snps = prs_weights["conditions"]["coronary_artery_disease"]["snps"]
    snp_data = {}
    for snp in cad_snps[:10]:
        # Set heterozygous for effect allele (dosage=1)
        other = "A" if snp["effect_allele"] != "A" else "T"
        snp_data[snp["rsid"]] = snp["effect_allele"] + other
    return snp_data


@pytest.fixture
def minimal_weights():
    """Create minimal PRS weights for unit testing."""
    return {
        "metadata": {"source": "test", "version": "test"},
        "conditions": {
            "test_condition": {
                "name": "Test Condition",
                "pgs_id": "PGS_TEST",
                "description": "A test condition",
                "population_mean": 0.0,
                "population_std": 1.0,
                "ancestry_note": "Test ancestry note",
                "reference": "Test reference",
                "snps": [
                    {"rsid": "rs111", "effect_allele": "A", "effect_weight": 0.3,
                     "chromosome": "1", "gene_region": "TEST1"},
                    {"rsid": "rs222", "effect_allele": "G", "effect_weight": 0.2,
                     "chromosome": "2", "gene_region": "TEST2"},
                    {"rsid": "rs333", "effect_allele": "C", "effect_weight": 0.1,
                     "chromosome": "3", "gene_region": "TEST3"},
                ],
            }
        },
    }


# ---------------------------------------------------------------------------
# TestCountEffectAlleles
# ---------------------------------------------------------------------------


class TestCountEffectAlleles:
    """Tests for the _count_effect_alleles helper."""

    def test_homozygous_effect(self):
        assert _count_effect_alleles("GG", "G") == 2

    def test_heterozygous(self):
        assert _count_effect_alleles("AG", "G") == 1

    def test_no_effect(self):
        assert _count_effect_alleles("AA", "G") == 0

    def test_empty_genotype(self):
        assert _count_effect_alleles("", "G") == 0

    def test_none_genotype(self):
        assert _count_effect_alleles(None, "G") == 0

    def test_single_char_genotype(self):
        assert _count_effect_alleles("A", "G") == 0

    def test_case_insensitive(self):
        assert _count_effect_alleles("ag", "G") == 1


# ---------------------------------------------------------------------------
# TestCalculateRawPRS
# ---------------------------------------------------------------------------


class TestCalculateRawPRS:
    """Tests for calculate_raw_prs function."""

    def test_basic_calculation(self, minimal_weights):
        """Test basic PRS calculation with known values."""
        snp_data = {
            "rs111": "AA",  # dosage 2 -> 0.3 * 2 = 0.6
            "rs222": "AG",  # dosage 0 -> 0.2 * 0 = 0.0 (A is not G)
            "rs333": "CC",  # dosage 2 -> 0.1 * 2 = 0.2
        }
        # rs222 has effect_allele G, genotype AG -> dosage 1 -> 0.2 * 1 = 0.2
        snp_data["rs222"] = "GG"  # dosage 2 -> 0.2 * 2 = 0.4
        score = calculate_raw_prs(snp_data, "test_condition", minimal_weights)
        expected = 0.3 * 2 + 0.2 * 2 + 0.1 * 2  # 0.6 + 0.4 + 0.2 = 1.2
        assert abs(score - expected) < 1e-10

    def test_homozygous_effect_allele_dosage_2(self, minimal_weights):
        """Homozygous for effect allele should give dosage 2."""
        snp_data = {"rs111": "AA"}
        score = calculate_raw_prs(snp_data, "test_condition", minimal_weights)
        assert abs(score - 0.6) < 1e-10  # 0.3 * 2

    def test_heterozygous_dosage_1(self, minimal_weights):
        """Heterozygous should give dosage 1."""
        snp_data = {"rs111": "AT"}
        score = calculate_raw_prs(snp_data, "test_condition", minimal_weights)
        assert abs(score - 0.3) < 1e-10  # 0.3 * 1

    def test_no_effect_allele_dosage_0(self, minimal_weights):
        """No effect allele should give dosage 0."""
        snp_data = {"rs111": "TT"}
        score = calculate_raw_prs(snp_data, "test_condition", minimal_weights)
        assert abs(score - 0.0) < 1e-10  # 0.3 * 0

    def test_missing_snps_skipped(self, minimal_weights):
        """SNPs not in user data should be skipped gracefully."""
        snp_data = {"rs111": "AA"}  # only 1 of 3 SNPs
        score = calculate_raw_prs(snp_data, "test_condition", minimal_weights)
        assert abs(score - 0.6) < 1e-10  # only rs111 contributes

    def test_all_snps_missing_returns_zero(self, minimal_weights):
        """If no SNPs match, raw score should be 0."""
        snp_data = {"rs999": "AA"}  # no matching rsids
        score = calculate_raw_prs(snp_data, "test_condition", minimal_weights)
        assert score == 0.0

    def test_with_real_data(self, prs_weights, sample_snp_data):
        """Test calculation works with real weights data."""
        score = calculate_raw_prs(
            sample_snp_data, "coronary_artery_disease", prs_weights
        )
        assert isinstance(score, float)
        assert score > 0  # We set heterozygous genotypes, so score > 0


# ---------------------------------------------------------------------------
# TestNormalizePRS
# ---------------------------------------------------------------------------


class TestNormalizePRS:
    """Tests for normalize_prs function."""

    def test_mean_score_gives_50th_percentile(self, minimal_weights):
        """A raw score equal to population mean should give ~50th percentile."""
        result = normalize_prs(0.0, "test_condition", minimal_weights)
        assert abs(result["percentile"] - 50.0) < 0.01

    def test_high_score_high_percentile(self, minimal_weights):
        """A score 2 SD above mean should give ~97.7th percentile."""
        result = normalize_prs(2.0, "test_condition", minimal_weights)
        assert result["percentile"] > 95.0

    def test_low_score_low_percentile(self, minimal_weights):
        """A score 2 SD below mean should give ~2.3rd percentile."""
        result = normalize_prs(-2.0, "test_condition", minimal_weights)
        assert result["percentile"] < 5.0

    def test_coverage_percentage(self, minimal_weights):
        """Coverage should be correctly calculated."""
        result = normalize_prs(
            0.5, "test_condition", minimal_weights,
            snps_found=2, snps_total=3,
        )
        assert abs(result["coverage_pct"] - 66.7) < 0.1
        assert result["snps_found"] == 2
        assert result["snps_total"] == 3

    def test_full_coverage(self, minimal_weights):
        """Full coverage should give 100%."""
        result = normalize_prs(
            0.5, "test_condition", minimal_weights,
            snps_found=3, snps_total=3,
        )
        assert abs(result["coverage_pct"] - 100.0) < 0.01

    def test_zero_std_no_crash(self):
        """Zero population_std should not crash (edge case)."""
        weights = {
            "conditions": {
                "zero_std": {
                    "population_mean": 0.0,
                    "population_std": 0.0,
                    "snps": [{"rsid": "rs1", "effect_allele": "A", "effect_weight": 0.1}],
                }
            }
        }
        result = normalize_prs(0.5, "zero_std", weights)
        assert result["z_score"] == 0.0
        assert result["percentile"] == 50.0

    def test_result_keys(self, minimal_weights):
        """Verify all expected keys are present in result."""
        result = normalize_prs(0.0, "test_condition", minimal_weights)
        expected_keys = {"z_score", "percentile", "raw_score", "snps_found",
                         "snps_total", "coverage_pct"}
        assert set(result.keys()) == expected_keys


# ---------------------------------------------------------------------------
# TestRiskCategory
# ---------------------------------------------------------------------------


class TestRiskCategory:
    """Tests for get_risk_category function."""

    def test_low_risk(self):
        assert get_risk_category(10.0) == "low"

    def test_below_average(self):
        assert get_risk_category(30.0) == "below_average"

    def test_average(self):
        assert get_risk_category(50.0) == "average"

    def test_above_average(self):
        assert get_risk_category(70.0) == "above_average"

    def test_elevated(self):
        assert get_risk_category(90.0) == "elevated"

    def test_high_risk(self):
        assert get_risk_category(97.0) == "high"

    def test_boundary_low_to_below_average(self):
        """Exactly 20 should be below_average (not low)."""
        assert get_risk_category(20.0) == "below_average"

    def test_boundary_below_average_to_average(self):
        """Exactly 40 should be average."""
        assert get_risk_category(40.0) == "average"

    def test_boundary_average_to_above_average(self):
        """Exactly 60 should be above_average."""
        assert get_risk_category(60.0) == "above_average"

    def test_boundary_above_average_to_elevated(self):
        """Exactly 80 should be elevated."""
        assert get_risk_category(80.0) == "elevated"

    def test_boundary_elevated_to_high(self):
        """Exactly 95 should be high."""
        assert get_risk_category(95.0) == "high"

    def test_zero_percentile(self):
        assert get_risk_category(0.0) == "low"

    def test_100_percentile(self):
        assert get_risk_category(100.0) == "high"


# ---------------------------------------------------------------------------
# TestOffspringPRS
# ---------------------------------------------------------------------------


class TestOffspringPRS:
    """Tests for predict_offspring_prs_range function."""

    def test_mid_parent_calculation(self):
        """Mid-parent regression should center around average of parents."""
        result = predict_offspring_prs_range(1.0, 1.0, "coronary_artery_disease")
        # Expected: mid_parent=1.0, after regression to mean (*0.5)=0.5
        assert result["expected_percentile"] > 50.0  # Above average

    def test_both_average_parents(self):
        """Two average parents (z=0) should predict average offspring."""
        result = predict_offspring_prs_range(0.0, 0.0, "coronary_artery_disease")
        assert abs(result["expected_percentile"] - 50.0) < 0.1

    def test_one_high_one_low_parent(self):
        """One high and one low parent should average out near mean."""
        result = predict_offspring_prs_range(2.0, -2.0, "coronary_artery_disease")
        # Mid-parent = 0.0, after regression = 0.0 -> ~50th percentile
        assert abs(result["expected_percentile"] - 50.0) < 0.1

    def test_range_includes_regression_to_mean(self):
        """Offspring range should be narrower than parents' extremes."""
        result = predict_offspring_prs_range(2.0, 2.0, "coronary_artery_disease")
        # Parents at 97.7th percentile -> offspring expected lower due to regression
        assert result["expected_percentile"] < 97.7

    def test_range_bounds_ordered(self):
        """range_low should be less than range_high."""
        result = predict_offspring_prs_range(1.0, -0.5, "coronary_artery_disease")
        assert result["range_low"] < result["range_high"]

    def test_confidence_field_present(self):
        """Result should include a confidence description."""
        result = predict_offspring_prs_range(0.0, 0.0, "coronary_artery_disease")
        assert "confidence" in result
        assert isinstance(result["confidence"], str)

    def test_result_keys(self):
        """Verify all expected keys are present."""
        result = predict_offspring_prs_range(0.0, 0.0, "coronary_artery_disease")
        expected_keys = {"expected_percentile", "range_low", "range_high", "confidence"}
        assert set(result.keys()) == expected_keys


# ---------------------------------------------------------------------------
# TestAnalyzePRS
# ---------------------------------------------------------------------------


class TestAnalyzePRS:
    """Tests for the main analyze_prs entry point."""

    def test_full_analysis_structure(self, prs_weights, sample_snp_data):
        """Full analysis should return expected top-level keys."""
        result = analyze_prs(
            sample_snp_data, sample_snp_data, prs_weights, tier="pro"
        )
        assert "conditions" in result
        assert "metadata" in result
        assert "tier" in result
        assert "conditions_available" in result
        assert "conditions_total" in result
        assert "disclaimer" in result

    def test_tier_gating_free(self, prs_weights, sample_snp_data):
        """Free tier should return no conditions."""
        result = analyze_prs(
            sample_snp_data, sample_snp_data, prs_weights, tier="free"
        )
        assert result["conditions_available"] == 0
        assert len(result["conditions"]) == 0

    def test_tier_gating_premium_3_conditions(self, prs_weights, sample_snp_data):
        """Premium tier should return exactly 3 conditions."""
        result = analyze_prs(
            sample_snp_data, sample_snp_data, prs_weights, tier="premium"
        )
        assert result["conditions_available"] == 3
        assert len(result["conditions"]) == 3

    def test_tier_gating_pro_all(self, prs_weights, sample_snp_data):
        """Pro tier should return all 10 conditions."""
        result = analyze_prs(
            sample_snp_data, sample_snp_data, prs_weights, tier="pro"
        )
        assert result["conditions_available"] == 10
        assert len(result["conditions"]) == 10

    def test_both_parents_analyzed(self, prs_weights, sample_snp_data):
        """Each condition should have parent_a, parent_b, and offspring results."""
        result = analyze_prs(
            sample_snp_data, sample_snp_data, prs_weights, tier="premium"
        )
        for _condition_key, condition_data in result["conditions"].items():
            assert "parent_a" in condition_data
            assert "parent_b" in condition_data
            assert "offspring" in condition_data
            assert "percentile" in condition_data["parent_a"]
            assert "percentile" in condition_data["parent_b"]
            assert "expected_percentile" in condition_data["offspring"]

    def test_condition_names_present(self, prs_weights, sample_snp_data):
        """Each condition result should include the human-readable name."""
        result = analyze_prs(
            sample_snp_data, sample_snp_data, prs_weights, tier="pro"
        )
        for condition_data in result["conditions"].values():
            assert "name" in condition_data
            assert isinstance(condition_data["name"], str)
            assert len(condition_data["name"]) > 0

    def test_case_insensitive_tier(self, prs_weights, sample_snp_data):
        """Tier string should be case-insensitive."""
        result = analyze_prs(
            sample_snp_data, sample_snp_data, prs_weights, tier="PRO"
        )
        assert len(result["conditions"]) == 10


# ---------------------------------------------------------------------------
# TestDisclaimer
# ---------------------------------------------------------------------------


class TestDisclaimer:
    """Tests for get_prs_disclaimer function."""

    def test_disclaimer_mentions_ancestry(self):
        """Disclaimer must mention ancestry bias."""
        disclaimer = get_prs_disclaimer()
        assert "ancestry" in disclaimer.lower()

    def test_disclaimer_mentions_not_diagnostic(self):
        """Disclaimer must state results are not diagnostic."""
        disclaimer = get_prs_disclaimer()
        assert "not diagnostic" in disclaimer.lower()

    def test_disclaimer_mentions_healthcare(self):
        """Disclaimer should recommend consulting healthcare professional."""
        disclaimer = get_prs_disclaimer()
        assert "healthcare" in disclaimer.lower() or "medical" in disclaimer.lower()

    def test_disclaimer_is_string(self):
        """Disclaimer should be a non-empty string."""
        disclaimer = get_prs_disclaimer()
        assert isinstance(disclaimer, str)
        assert len(disclaimer) > 100  # Should be substantial


# ---------------------------------------------------------------------------
# TestDataIntegrity
# ---------------------------------------------------------------------------


class TestDataIntegrity:
    """Tests for the integrity of prs_weights.json data."""

    def test_all_10_conditions_present(self, prs_weights):
        """All 10 PRS_CONDITIONS should exist in the weights file."""
        for condition in PRS_CONDITIONS:
            assert condition in prs_weights["conditions"], (
                f"Missing condition: {condition}"
            )

    def test_all_conditions_have_snps(self, prs_weights):
        """Every condition should have at least 15 SNPs."""
        for condition_key, condition_data in prs_weights["conditions"].items():
            snps = condition_data["snps"]
            assert len(snps) >= 15, (
                f"{condition_key} has only {len(snps)} SNPs (need >= 15)"
            )

    def test_weights_are_numeric(self, prs_weights):
        """All effect_weight values should be numeric (int or float)."""
        for condition_key, condition_data in prs_weights["conditions"].items():
            for snp in condition_data["snps"]:
                assert isinstance(snp["effect_weight"], (int, float)), (
                    f"{condition_key}/{snp['rsid']}: weight is {type(snp['effect_weight'])}"
                )

    def test_rsids_start_with_rs(self, prs_weights):
        """All rsIDs should start with 'rs'."""
        for condition_key, condition_data in prs_weights["conditions"].items():
            for snp in condition_data["snps"]:
                assert snp["rsid"].startswith("rs"), (
                    f"{condition_key}: invalid rsid {snp['rsid']}"
                )

    def test_effect_alleles_valid(self, prs_weights):
        """All effect alleles should be valid nucleotides (A, C, G, T)."""
        valid_alleles = {"A", "C", "G", "T"}
        for condition_key, condition_data in prs_weights["conditions"].items():
            for snp in condition_data["snps"]:
                assert snp["effect_allele"] in valid_alleles, (
                    f"{condition_key}/{snp['rsid']}: invalid allele {snp['effect_allele']}"
                )

    def test_population_stats_present(self, prs_weights):
        """Every condition should have population_mean and population_std."""
        for _condition_key, condition_data in prs_weights["conditions"].items():
            assert "population_mean" in condition_data
            assert "population_std" in condition_data
            assert isinstance(condition_data["population_mean"], (int, float))
            assert isinstance(condition_data["population_std"], (int, float))

    def test_metadata_present(self, prs_weights):
        """PRS weights should have metadata section."""
        assert "metadata" in prs_weights
        assert "source" in prs_weights["metadata"]
        assert "version" in prs_weights["metadata"]

    def test_no_duplicate_rsids_per_condition(self, prs_weights):
        """No condition should have duplicate rsIDs."""
        for condition_key, condition_data in prs_weights["conditions"].items():
            rsids = [snp["rsid"] for snp in condition_data["snps"]]
            assert len(rsids) == len(set(rsids)), (
                f"{condition_key} has duplicate rsIDs"
            )

    def test_weights_in_realistic_range(self, prs_weights):
        """Most effect weights should be in realistic range (absolute value 0.01-1.5)."""
        for condition_key, condition_data in prs_weights["conditions"].items():
            for snp in condition_data["snps"]:
                weight = abs(snp["effect_weight"])
                assert 0.01 <= weight <= 1.5, (
                    f"{condition_key}/{snp['rsid']}: weight {weight} outside range"
                )

    def test_conditions_count_matches_metadata(self, prs_weights):
        """Number of conditions should match metadata count."""
        assert prs_weights["metadata"]["conditions_covered"] == len(
            prs_weights["conditions"]
        )


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    """Edge case tests for PRS calculations."""

    def test_empty_snp_data(self, minimal_weights):
        """Empty SNP data should return zero score."""
        score = calculate_raw_prs({}, "test_condition", minimal_weights)
        assert score == 0.0

    def test_single_snp_prs(self, minimal_weights):
        """PRS with a single matching SNP should work correctly."""
        snp_data = {"rs222": "GG"}  # dosage 2 for effect_allele G
        score = calculate_raw_prs(snp_data, "test_condition", minimal_weights)
        assert abs(score - 0.4) < 1e-10  # 0.2 * 2

    def test_negative_weight(self):
        """Negative weights (protective alleles) should reduce score."""
        weights = {
            "conditions": {
                "neg_test": {
                    "population_mean": 0.0,
                    "population_std": 1.0,
                    "snps": [
                        {"rsid": "rs1", "effect_allele": "T", "effect_weight": -0.47},
                    ],
                }
            }
        }
        snp_data = {"rs1": "TT"}  # dosage 2
        score = calculate_raw_prs(snp_data, "neg_test", weights)
        assert score < 0  # Protective effect

    def test_analyze_with_empty_data(self, prs_weights):
        """Analyze with empty SNP data should not crash."""
        result = analyze_prs({}, {}, prs_weights, tier="premium")
        assert len(result["conditions"]) == 3
        for cond in result["conditions"].values():
            assert cond["parent_a"]["raw_score"] == 0.0
            assert cond["parent_b"]["raw_score"] == 0.0

    def test_analyze_unknown_tier_defaults_to_free(self, prs_weights):
        """Unknown tier string should default to free (no conditions)."""
        result = analyze_prs({}, {}, prs_weights, tier="unknown")
        assert result["conditions_available"] == 0
