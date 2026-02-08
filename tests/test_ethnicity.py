"""Tests for ethnicity-adjusted carrier frequency engine."""

import os

import pytest
from Source.ethnicity import (
    POPULATIONS,
    adjust_carrier_risk,
    calculate_bayesian_posterior,
    format_frequency_comparison,
    get_ethnicity_summary,
    get_population_frequency,
    load_ethnicity_data,
)

DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "ethnicity_frequencies.json"
)


@pytest.fixture
def ethnicity_data():
    """Load ethnicity frequency data for tests."""
    return load_ethnicity_data(DATA_PATH)


@pytest.fixture
def sample_ethnicity_data():
    """Minimal in-memory ethnicity data for unit tests."""
    return {
        "metadata": {
            "source": "test",
            "populations": ["European (Non-Finnish)", "East Asian"],
            "last_updated": "2026-01-01",
            "total_variants": 2,
        },
        "frequencies": {
            "rs100": {
                "gene": "TEST1",
                "condition": "Test Disease 1",
                "Global": 0.02,
                "European (Non-Finnish)": 0.04,
                "East Asian": 0.005,
            },
            "rs200": {
                "gene": "TEST2",
                "condition": "Test Disease 2",
                "Global": 0.01,
                "European (Non-Finnish)": 0.01,
            },
        },
    }


# ---------------------------------------------------------------------------
# TestPopulations
# ---------------------------------------------------------------------------
class TestPopulations:
    """Tests for the POPULATIONS constant."""

    def test_all_populations_defined(self):
        """All 9 expected populations are defined."""
        assert len(POPULATIONS) == 9
        assert "African/African American" in POPULATIONS
        assert "East Asian" in POPULATIONS
        assert "South Asian" in POPULATIONS
        assert "European (Non-Finnish)" in POPULATIONS
        assert "Finnish" in POPULATIONS
        assert "Latino/Admixed American" in POPULATIONS
        assert "Ashkenazi Jewish" in POPULATIONS
        assert "Middle Eastern" in POPULATIONS

    def test_global_always_present(self):
        """Global is always in the population list."""
        assert "Global" in POPULATIONS

    def test_no_duplicates(self):
        """No duplicate population names."""
        assert len(POPULATIONS) == len(set(POPULATIONS))


# ---------------------------------------------------------------------------
# TestGetPopulationFrequency
# ---------------------------------------------------------------------------
class TestGetPopulationFrequency:
    """Tests for get_population_frequency."""

    def test_known_rsid_known_population(self, sample_ethnicity_data):
        freq = get_population_frequency(
            "rs100", "European (Non-Finnish)", sample_ethnicity_data
        )
        assert freq == 0.04

    def test_unknown_rsid_returns_none(self, sample_ethnicity_data):
        freq = get_population_frequency(
            "rs999999", "European (Non-Finnish)", sample_ethnicity_data
        )
        assert freq is None

    def test_fallback_to_global(self, sample_ethnicity_data):
        """When population is missing for a variant, fall back to Global."""
        freq = get_population_frequency(
            "rs200", "East Asian", sample_ethnicity_data
        )
        assert freq == 0.01  # Global value

    def test_unknown_population_returns_global(self, sample_ethnicity_data):
        """Unknown population falls back to Global frequency."""
        freq = get_population_frequency(
            "rs100", "Nonexistent Population", sample_ethnicity_data
        )
        assert freq == 0.02  # Global fallback

    def test_returns_float(self, sample_ethnicity_data):
        freq = get_population_frequency(
            "rs100", "East Asian", sample_ethnicity_data
        )
        assert isinstance(freq, float)

    def test_real_data_cystic_fibrosis(self, ethnicity_data):
        """CF should be high in European, low in East Asian (real data)."""
        eur = get_population_frequency(
            "rs75030207", "European (Non-Finnish)", ethnicity_data
        )
        eas = get_population_frequency(
            "rs75030207", "East Asian", ethnicity_data
        )
        assert eur is not None
        assert eas is not None
        assert eur > eas

    def test_real_data_sickle_cell(self, ethnicity_data):
        """Sickle cell should be highest in African."""
        afr = get_population_frequency(
            "rs334", "African/African American", ethnicity_data
        )
        eur = get_population_frequency(
            "rs334", "European (Non-Finnish)", ethnicity_data
        )
        assert afr is not None
        assert eur is not None
        assert afr > eur

    def test_real_data_tay_sachs(self, ethnicity_data):
        """Tay-Sachs should be highest in Ashkenazi Jewish."""
        aj = get_population_frequency(
            "rs76173977", "Ashkenazi Jewish", ethnicity_data
        )
        glob = get_population_frequency(
            "rs76173977", "Global", ethnicity_data
        )
        assert aj is not None
        assert glob is not None
        assert aj > glob


# ---------------------------------------------------------------------------
# TestAdjustCarrierRisk
# ---------------------------------------------------------------------------
class TestAdjustCarrierRisk:
    """Tests for adjust_carrier_risk."""

    def test_higher_population_frequency(self):
        result = adjust_carrier_risk(0.05, 0.08, 0.02)
        assert result["adjusted_risk"] > result["base_risk"]
        assert result["adjustment_factor"] == pytest.approx(4.0)

    def test_lower_population_frequency(self):
        result = adjust_carrier_risk(0.05, 0.005, 0.02)
        assert result["adjusted_risk"] < result["base_risk"]
        assert result["adjustment_factor"] == pytest.approx(0.25)

    def test_equal_frequencies(self):
        result = adjust_carrier_risk(0.05, 0.02, 0.02)
        assert result["adjusted_risk"] == pytest.approx(0.05)
        assert result["adjustment_factor"] == pytest.approx(1.0)

    def test_zero_global_frequency(self):
        """Zero global frequency should return base risk unchanged."""
        result = adjust_carrier_risk(0.05, 0.03, 0.0)
        assert result["adjusted_risk"] == 0.05
        assert result["adjustment_factor"] == 1.0

    def test_adjusted_risk_clamped_to_one(self):
        """Adjusted risk should never exceed 1.0."""
        result = adjust_carrier_risk(0.5, 0.8, 0.01)
        assert result["adjusted_risk"] <= 1.0

    def test_adjusted_risk_never_negative(self):
        """Adjusted risk should never be negative."""
        result = adjust_carrier_risk(0.01, 0.0, 0.05)
        assert result["adjusted_risk"] >= 0.0

    def test_result_keys(self):
        result = adjust_carrier_risk(0.05, 0.03, 0.02)
        assert "base_risk" in result
        assert "adjusted_risk" in result
        assert "adjustment_factor" in result
        assert "population_frequency" in result
        assert "global_frequency" in result


# ---------------------------------------------------------------------------
# TestBayesianPosterior
# ---------------------------------------------------------------------------
class TestBayesianPosterior:
    """Tests for calculate_bayesian_posterior."""

    def test_basic_calculation(self):
        posterior = calculate_bayesian_posterior(
            0.04, {"status": "carrier"}, "European (Non-Finnish)"
        )
        assert 0.0 <= posterior <= 1.0

    def test_high_prior(self):
        posterior = calculate_bayesian_posterior(
            0.5, {"status": "carrier"}, "Global"
        )
        assert posterior > 0.5

    def test_low_prior(self):
        posterior = calculate_bayesian_posterior(
            0.001, {"status": "normal"}, "East Asian"
        )
        assert posterior < 0.001

    def test_carrier_genotype_increases_posterior(self):
        """Carrier genotype should increase posterior above prior."""
        prior = 0.04
        posterior = calculate_bayesian_posterior(
            prior, {"status": "carrier"}, "European (Non-Finnish)"
        )
        assert posterior > prior

    def test_normal_genotype_decreases_posterior(self):
        """Normal genotype should decrease posterior below prior."""
        prior = 0.04
        posterior = calculate_bayesian_posterior(
            prior, {"status": "normal"}, "European (Non-Finnish)"
        )
        assert posterior < prior

    def test_unknown_status_returns_prior(self):
        """Unknown genotype provides no evidence — posterior equals prior."""
        prior = 0.04
        posterior = calculate_bayesian_posterior(
            prior, {"status": "unknown"}, "Global"
        )
        assert posterior == pytest.approx(prior)

    def test_affected_genotype(self):
        """Affected genotype should increase posterior."""
        prior = 0.04
        posterior = calculate_bayesian_posterior(
            prior, {"status": "affected"}, "European (Non-Finnish)"
        )
        assert posterior > prior

    def test_none_prior_returns_zero(self):
        posterior = calculate_bayesian_posterior(
            None, {"status": "carrier"}, "Global"
        )
        assert posterior == 0.0

    def test_negative_prior_returns_zero(self):
        posterior = calculate_bayesian_posterior(
            -0.1, {"status": "carrier"}, "Global"
        )
        assert posterior == 0.0

    def test_prior_above_one_clamped(self):
        """Prior > 1 should be clamped to 1.0."""
        posterior = calculate_bayesian_posterior(
            1.5, {"status": "carrier"}, "Global"
        )
        assert 0.0 <= posterior <= 1.0

    def test_none_genotype_data(self):
        """None genotype data should return prior."""
        prior = 0.04
        posterior = calculate_bayesian_posterior(prior, None, "Global")
        assert posterior == pytest.approx(prior)

    def test_empty_genotype_data(self):
        """Empty dict should return prior (status defaults to unknown)."""
        prior = 0.04
        posterior = calculate_bayesian_posterior(prior, {}, "Global")
        assert posterior == pytest.approx(prior)


# ---------------------------------------------------------------------------
# TestEthnicitySummary
# ---------------------------------------------------------------------------
class TestEthnicitySummary:
    """Tests for get_ethnicity_summary."""

    def test_returns_all_populations(self, sample_ethnicity_data):
        pops = ["European (Non-Finnish)", "East Asian", "Global"]
        summary = get_ethnicity_summary("rs100", pops, sample_ethnicity_data)
        assert summary["found"] is True
        for pop in pops:
            assert pop in summary["frequencies"]

    def test_includes_global(self, sample_ethnicity_data):
        summary = get_ethnicity_summary("rs100", None, sample_ethnicity_data)
        assert summary["global"] == 0.02

    def test_missing_rsid(self, sample_ethnicity_data):
        summary = get_ethnicity_summary("rs999", None, sample_ethnicity_data)
        assert summary["found"] is False
        assert summary["gene"] is None
        assert summary["condition"] is None
        assert all(v is None for v in summary["frequencies"].values())

    def test_gene_and_condition(self, sample_ethnicity_data):
        summary = get_ethnicity_summary("rs100", None, sample_ethnicity_data)
        assert summary["gene"] == "TEST1"
        assert summary["condition"] == "Test Disease 1"

    def test_default_populations(self, sample_ethnicity_data):
        """When all_populations is None, POPULATIONS constant is used."""
        summary = get_ethnicity_summary("rs100", None, sample_ethnicity_data)
        assert len(summary["frequencies"]) == len(POPULATIONS)


# ---------------------------------------------------------------------------
# TestFormatFrequencyComparison
# ---------------------------------------------------------------------------
class TestFormatFrequencyComparison:
    """Tests for format_frequency_comparison."""

    def test_higher_than_global(self):
        result = format_frequency_comparison(0.08, 0.02)
        assert "higher" in result
        assert "4.0x" in result

    def test_lower_than_global(self):
        result = format_frequency_comparison(0.005, 0.02)
        assert "lower" in result

    def test_equal_to_global(self):
        result = format_frequency_comparison(0.02, 0.02)
        assert "Equal" in result

    def test_zero_global(self):
        result = format_frequency_comparison(0.01, 0.0)
        assert "No global data" in result

    def test_none_global(self):
        result = format_frequency_comparison(0.01, None)
        assert "No global data" in result or "No data" in result

    def test_none_population(self):
        result = format_frequency_comparison(None, 0.02)
        assert "No population data" in result

    def test_both_zero(self):
        result = format_frequency_comparison(0.0, 0.0)
        assert "No data" in result or "No global" in result

    def test_nearly_equal(self):
        """Frequencies within 5% tolerance should show 'Equal'."""
        result = format_frequency_comparison(0.0201, 0.02)
        assert "Equal" in result


# ---------------------------------------------------------------------------
# TestDataFileIntegrity
# ---------------------------------------------------------------------------
class TestDataFileIntegrity:
    """Tests for the ethnicity_frequencies.json data file."""

    def test_data_file_loads(self, ethnicity_data):
        assert ethnicity_data is not None
        assert "frequencies" in ethnicity_data

    def test_all_entries_have_global(self, ethnicity_data):
        """Every variant entry must have a Global frequency."""
        for rsid, entry in ethnicity_data["frequencies"].items():
            assert "Global" in entry, f"{rsid} missing Global frequency"

    def test_frequencies_are_valid_range(self, ethnicity_data):
        """All frequency values must be between 0.0 and 1.0."""
        populations = POPULATIONS[:-1]  # Exclude "Global" from list — check separately
        for rsid, entry in ethnicity_data["frequencies"].items():
            for pop in populations + ["Global"]:
                if pop in entry:
                    freq = entry[pop]
                    assert 0.0 <= freq <= 1.0, (
                        f"{rsid} {pop}: frequency {freq} out of range"
                    )

    def test_metadata_present(self, ethnicity_data):
        meta = ethnicity_data["metadata"]
        assert "source" in meta
        assert "populations" in meta
        assert "last_updated" in meta
        assert "total_variants" in meta

    def test_minimum_entry_count(self, ethnicity_data):
        """At least 100 disease entries must be present."""
        assert len(ethnicity_data["frequencies"]) >= 100

    def test_all_entries_have_gene(self, ethnicity_data):
        for rsid, entry in ethnicity_data["frequencies"].items():
            assert "gene" in entry, f"{rsid} missing gene field"

    def test_all_entries_have_condition(self, ethnicity_data):
        for rsid, entry in ethnicity_data["frequencies"].items():
            assert "condition" in entry, f"{rsid} missing condition field"

    def test_rsids_start_with_rs(self, ethnicity_data):
        for rsid in ethnicity_data["frequencies"]:
            assert rsid.startswith("rs"), f"Invalid rsID format: {rsid}"

    def test_metadata_total_matches_actual(self, ethnicity_data):
        actual = len(ethnicity_data["frequencies"])
        reported = ethnicity_data["metadata"]["total_variants"]
        assert actual == reported, (
            f"Metadata says {reported} but found {actual} variants"
        )


# ---------------------------------------------------------------------------
# TestLoadEthnicityData
# ---------------------------------------------------------------------------
class TestLoadEthnicityData:
    """Tests for load_ethnicity_data."""

    def test_default_path_works(self):
        data = load_ethnicity_data()
        assert "frequencies" in data
        assert len(data["frequencies"]) >= 100

    def test_explicit_path_works(self):
        data = load_ethnicity_data(DATA_PATH)
        assert "frequencies" in data

    def test_missing_file_raises(self):
        with pytest.raises(FileNotFoundError):
            load_ethnicity_data("/nonexistent/path.json")


# ---------------------------------------------------------------------------
# Edge Cases
# ---------------------------------------------------------------------------
class TestEdgeCases:
    """Edge case tests."""

    def test_empty_ethnicity_data(self):
        freq = get_population_frequency("rs100", "Global", {"frequencies": {}})
        assert freq is None

    def test_none_inputs_bayesian(self):
        posterior = calculate_bayesian_posterior(None, None, "Global")
        assert posterior == 0.0

    def test_very_small_frequencies(self):
        result = adjust_carrier_risk(0.0001, 0.00005, 0.0001)
        assert result["adjusted_risk"] == pytest.approx(0.00005)
        assert result["adjustment_factor"] == pytest.approx(0.5)

    def test_summary_with_no_frequencies_key(self):
        summary = get_ethnicity_summary("rs100", None, {})
        assert summary["found"] is False

    def test_adjust_risk_with_very_high_factor(self):
        """Even huge adjustment factor should clamp to 1.0."""
        result = adjust_carrier_risk(0.9, 1.0, 0.001)
        assert result["adjusted_risk"] == 1.0

    def test_format_comparison_very_high_ratio(self):
        result = format_frequency_comparison(0.1, 0.001)
        assert "higher" in result
        assert "100.0x" in result

    def test_format_comparison_very_low_ratio(self):
        result = format_frequency_comparison(0.001, 0.1)
        assert "lower" in result

    def test_bayesian_zero_prior(self):
        posterior = calculate_bayesian_posterior(0.0, {"status": "carrier"}, "Global")
        assert posterior == 0.0


# ---------------------------------------------------------------------------
# Scientific accuracy checks
# ---------------------------------------------------------------------------
class TestScientificAccuracy:
    """Validate that well-known population frequency patterns are represented."""

    def test_cf_european_highest(self, ethnicity_data):
        """Cystic Fibrosis carrier rate highest in European."""
        entry = ethnicity_data["frequencies"]["rs75030207"]
        eur = entry["European (Non-Finnish)"]
        for pop in ["African/African American", "East Asian", "South Asian"]:
            assert eur > entry[pop], f"CF: European should be > {pop}"

    def test_sickle_cell_african_highest(self, ethnicity_data):
        """Sickle Cell carrier rate highest in African."""
        entry = ethnicity_data["frequencies"]["rs334"]
        afr = entry["African/African American"]
        for pop in ["European (Non-Finnish)", "East Asian", "Finnish"]:
            assert afr > entry[pop], f"SCD: African should be > {pop}"

    def test_tay_sachs_ashkenazi_highest(self, ethnicity_data):
        """Tay-Sachs carrier rate highest in Ashkenazi Jewish."""
        entry = ethnicity_data["frequencies"]["rs76173977"]
        aj = entry["Ashkenazi Jewish"]
        for pop in ["European (Non-Finnish)", "East Asian", "African/African American"]:
            assert aj > entry[pop], f"TSD: Ashkenazi should be > {pop}"

    def test_beta_thal_south_asian_high(self, ethnicity_data):
        """Beta-Thalassemia carrier rate should be high in South Asian and Middle Eastern."""
        entry = ethnicity_data["frequencies"]["rs11549407"]
        sa = entry["South Asian"]
        me = entry["Middle Eastern"]
        eur = entry["European (Non-Finnish)"]
        assert sa > eur
        assert me > eur

    def test_alpha_thal_east_asian_high(self, ethnicity_data):
        """Alpha-Thalassemia carrier rate should be high in East Asian and African."""
        entry = ethnicity_data["frequencies"]["rs41474145"]
        eas = entry["East Asian"]
        afr = entry["African/African American"]
        eur = entry["European (Non-Finnish)"]
        assert eas > eur
        assert afr > eur

    def test_fmf_middle_eastern_highest(self, ethnicity_data):
        """Familial Mediterranean Fever should be highest in Middle Eastern."""
        entry = ethnicity_data["frequencies"]["rs61752717"]
        me = entry["Middle Eastern"]
        for pop in ["European (Non-Finnish)", "East Asian", "African/African American"]:
            assert me > entry[pop], f"FMF: Middle Eastern should be > {pop}"

    def test_gaucher_ashkenazi_highest(self, ethnicity_data):
        """Gaucher Disease should be highest in Ashkenazi Jewish."""
        entry = ethnicity_data["frequencies"]["rs76763715"]
        aj = entry["Ashkenazi Jewish"]
        glob = entry["Global"]
        assert aj > glob

    def test_g6pd_african_highest(self, ethnicity_data):
        """G6PD Deficiency should be highest in African populations."""
        entry = ethnicity_data["frequencies"]["rs1050828"]
        afr = entry["African/African American"]
        eur = entry["European (Non-Finnish)"]
        assert afr > eur

    def test_hemochromatosis_european_highest(self, ethnicity_data):
        """Hereditary Hemochromatosis should be highest in European."""
        entry = ethnicity_data["frequencies"]["rs1800562"]
        eur = entry["European (Non-Finnish)"]
        for pop in ["East Asian", "African/African American", "South Asian"]:
            assert eur > entry[pop], f"HFE: European should be > {pop}"

    def test_pku_higher_in_european_and_middle_eastern(self, ethnicity_data):
        """PKU should be higher in European and Middle Eastern."""
        entry = ethnicity_data["frequencies"]["rs5030849"]
        eur = entry["European (Non-Finnish)"]
        me = entry["Middle Eastern"]
        afr = entry["African/African American"]
        assert eur > afr
        assert me > afr
