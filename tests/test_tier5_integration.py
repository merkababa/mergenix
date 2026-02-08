"""Tests for Tier 5 integration — data loaders, tier access, cross-module
integration, UI components, and backward compatibility.

Covers:
- Data loaders for ethnicity, PGx, and PRS data files
- Tier-based access control for Tier 5 features
- Cross-module integration (carrier -> counseling, PRS -> counseling, etc.)
- UI component rendering (metabolizer badge, PRS gauge, counseling banner)
- Backward compatibility with existing carrier and trait analysis
"""

import json
import os

import pytest

# ---------------------------------------------------------------------------
# Paths to real data files
# ---------------------------------------------------------------------------
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
CARRIER_PANEL_PATH = os.path.join(DATA_DIR, "carrier_panel.json")
TRAIT_DB_PATH = os.path.join(DATA_DIR, "trait_snps.json")
ETHNICITY_DATA_PATH = os.path.join(DATA_DIR, "ethnicity_frequencies.json")
PGX_PANEL_PATH = os.path.join(DATA_DIR, "pgx_panel.json")
PRS_WEIGHTS_PATH = os.path.join(DATA_DIR, "prs_weights.json")
COUNSELING_PROVIDERS_PATH = os.path.join(DATA_DIR, "counseling_providers.json")


def _load_json(path: str):
    """Helper to load a JSON file."""
    with open(path) as f:
        return json.load(f)


# ===========================================================================
# TestDataLoaders — verify the new cached data loaders work correctly
# ===========================================================================


class TestDataLoaders:
    """Tests for the three new cached data loaders in Source/data_loader.py."""

    def test_load_ethnicity_data(self):
        """Ethnicity data file loads and has expected structure."""
        data = _load_json(ETHNICITY_DATA_PATH)
        assert isinstance(data, dict)
        assert "frequencies" in data or "metadata" in data

    def test_load_pgx_panel(self):
        """PGx panel file loads and has expected structure."""
        data = _load_json(PGX_PANEL_PATH)
        assert isinstance(data, dict)
        assert "genes" in data
        assert len(data["genes"]) > 0

    def test_load_prs_weights(self):
        """PRS weights file loads and has expected structure."""
        data = _load_json(PRS_WEIGHTS_PATH)
        assert isinstance(data, dict)
        assert "conditions" in data
        assert len(data["conditions"]) > 0

    def test_all_loaders_return_valid_data(self):
        """All three new data files load without errors and are non-empty."""
        ethnicity = _load_json(ETHNICITY_DATA_PATH)
        pgx = _load_json(PGX_PANEL_PATH)
        prs = _load_json(PRS_WEIGHTS_PATH)

        assert len(str(ethnicity)) > 100, "Ethnicity data too small"
        assert len(str(pgx)) > 100, "PGx panel too small"
        assert len(str(prs)) > 100, "PRS weights too small"

    def test_ethnicity_data_has_frequencies(self):
        """Ethnicity data has a frequencies dict with rsIDs."""
        data = _load_json(ETHNICITY_DATA_PATH)
        freqs = data.get("frequencies", {})
        assert isinstance(freqs, dict)
        # Should have at least some entries
        assert len(freqs) > 0

    def test_pgx_panel_has_star_alleles(self):
        """PGx panel genes contain star_alleles definitions."""
        data = _load_json(PGX_PANEL_PATH)
        genes = data.get("genes", {})
        # At least one gene should have star_alleles
        has_star = any("star_alleles" in g for g in genes.values())
        assert has_star, "No gene has star_alleles defined"

    def test_prs_weights_conditions_have_snps(self):
        """PRS conditions have SNP weight arrays."""
        data = _load_json(PRS_WEIGHTS_PATH)
        for cond_key, cond_data in data["conditions"].items():
            assert "snps" in cond_data, f"Condition {cond_key} missing snps"
            assert len(cond_data["snps"]) > 0, f"Condition {cond_key} has empty snps"


# ===========================================================================
# TestTierAccess — verify Tier 5 feature gating
# ===========================================================================


class TestTierAccess:
    """Tests for Tier 5 feature access control in tier_config.py."""

    def test_free_no_ethnicity(self):
        """Free tier has no ethnicity access."""
        from Source.tier_config import TierType, can_access_ethnicity
        assert can_access_ethnicity(TierType.FREE) is False

    def test_premium_has_ethnicity(self):
        """Premium tier has ethnicity access."""
        from Source.tier_config import TierType, can_access_ethnicity
        assert can_access_ethnicity(TierType.PREMIUM) is True

    def test_pro_has_ethnicity(self):
        """Pro tier has ethnicity access."""
        from Source.tier_config import TierType, can_access_ethnicity
        assert can_access_ethnicity(TierType.PRO) is True

    def test_free_no_pgx(self):
        """Free tier has 0 PGx genes."""
        from Source.tier_config import TierType, get_pgx_limit
        assert get_pgx_limit(TierType.FREE) == 0

    def test_premium_5_pgx_genes(self):
        """Premium tier has 5 PGx genes."""
        from Source.tier_config import TierType, get_pgx_limit
        assert get_pgx_limit(TierType.PREMIUM) == 5

    def test_pro_all_pgx(self):
        """Pro tier has all 12 PGx genes."""
        from Source.tier_config import TierType, get_pgx_limit
        assert get_pgx_limit(TierType.PRO) == 12

    def test_free_no_prs(self):
        """Free tier has 0 PRS conditions."""
        from Source.tier_config import TierType, get_prs_limit
        assert get_prs_limit(TierType.FREE) == 0

    def test_premium_3_prs(self):
        """Premium tier has 3 PRS conditions."""
        from Source.tier_config import TierType, get_prs_limit
        assert get_prs_limit(TierType.PREMIUM) == 3

    def test_pro_all_prs(self):
        """Pro tier has all 10 PRS conditions."""
        from Source.tier_config import TierType, get_prs_limit
        assert get_prs_limit(TierType.PRO) == 10

    def test_free_basic_counseling(self):
        """Free tier has basic counseling level."""
        from Source.tier_config import TierType, get_counseling_level
        assert get_counseling_level(TierType.FREE) == "basic"

    def test_premium_full_counseling(self):
        """Premium tier has full counseling level."""
        from Source.tier_config import TierType, get_counseling_level
        assert get_counseling_level(TierType.PREMIUM) == "full"

    def test_pro_full_plus_letter(self):
        """Pro tier has full_plus_letter counseling level."""
        from Source.tier_config import TierType, get_counseling_level
        assert get_counseling_level(TierType.PRO) == "full_plus_letter"

    def test_tier_config_dataclass_has_new_fields(self):
        """TierConfig dataclass includes all Tier 5 fields."""
        from Source.tier_config import TIER_CONFIGS, TierType
        for tier_type in TierType:
            config = TIER_CONFIGS[tier_type]
            assert hasattr(config, "ethnicity_access")
            assert hasattr(config, "pgx_gene_limit")
            assert hasattr(config, "prs_condition_limit")
            assert hasattr(config, "counseling_level")

    def test_tier_features_include_tier5(self):
        """Premium and Pro feature lists mention Tier 5 features."""
        from Source.tier_config import TIER_CONFIGS, TierType
        premium_features = " ".join(TIER_CONFIGS[TierType.PREMIUM].features).lower()
        pro_features = " ".join(TIER_CONFIGS[TierType.PRO].features).lower()

        assert "pharmacogenomics" in premium_features
        assert "polygenic" in premium_features
        assert "ethnicity" in premium_features
        assert "pharmacogenomics" in pro_features
        assert "polygenic" in pro_features


# ===========================================================================
# TestCrossModuleIntegration — verify modules work together
# ===========================================================================


class TestCrossModuleIntegration:
    """Tests for cross-module integration between Tier 5 modules."""

    def test_high_risk_carrier_triggers_counseling(self):
        """When both parents are carriers, counseling is recommended."""
        from Source.counseling import should_recommend_counseling

        carrier_results = [
            {
                "condition": "Cystic Fibrosis",
                "risk_level": "high_risk",
                "parent_a_status": "carrier",
                "parent_b_status": "carrier",
                "gene": "CFTR",
            },
        ]
        recommend, reasons = should_recommend_counseling(carrier_results)
        assert recommend is True
        assert len(reasons) >= 1
        assert any("Cystic Fibrosis" in r for r in reasons)

    def test_high_prs_triggers_counseling(self):
        """High PRS percentile (>90th) triggers counseling recommendation."""
        from Source.counseling import should_recommend_counseling

        carrier_results = [
            {"condition": "Test", "risk_level": "low_risk",
             "parent_a_status": "normal", "parent_b_status": "normal"},
        ]
        prs_results = [
            {"percentile": 95.0, "trait": "Coronary Artery Disease"},
        ]
        recommend, reasons = should_recommend_counseling(
            carrier_results, prs_results=prs_results,
        )
        assert recommend is True
        assert any("Coronary Artery Disease" in r for r in reasons)

    def test_ethnicity_adjusts_carrier_frequency(self):
        """Ethnicity module adjusts carrier risk based on population frequency."""
        from Source.ethnicity import adjust_carrier_risk

        result = adjust_carrier_risk(
            base_risk=0.04,
            population_frequency=0.08,
            global_frequency=0.04,
        )
        assert result["adjusted_risk"] > result["base_risk"]
        assert result["adjustment_factor"] == pytest.approx(2.0)
        assert result["adjusted_risk"] == pytest.approx(0.08)

    def test_pgx_analysis_returns_drug_recommendations(self):
        """PGx analysis returns drug recommendations for analyzed genes."""
        from Source.pharmacogenomics import analyze_pgx

        pgx_panel = _load_json(PGX_PANEL_PATH)
        # Use empty SNP data — will get reference alleles (*1/*1)
        result = analyze_pgx({}, {}, pgx_panel, tier="premium")
        assert result["tier"] == "premium"
        assert result["genes_analyzed"] <= 5
        # Verify structure
        for _gene_name, gene_data in result["results"].items():
            assert "parent_a" in gene_data
            assert "parent_b" in gene_data
            assert "metabolizer_status" in gene_data["parent_a"]
            assert "offspring_predictions" in gene_data

    def test_prs_analysis_returns_percentiles(self):
        """PRS analysis returns percentile scores for analyzed conditions."""
        from Source.prs import analyze_prs

        prs_weights = _load_json(PRS_WEIGHTS_PATH)
        result = analyze_prs({}, {}, prs_weights, tier="premium")
        assert result["tier"] == "premium"
        assert result["conditions_available"] <= 3
        for _cond_key, cond_data in result["conditions"].items():
            assert "parent_a" in cond_data
            assert "parent_b" in cond_data
            assert "percentile" in cond_data["parent_a"]
            assert "offspring" in cond_data

    def test_low_risk_no_counseling(self):
        """Low-risk carrier results do not trigger counseling."""
        from Source.counseling import should_recommend_counseling

        carrier_results = [
            {"condition": "Test", "risk_level": "low_risk",
             "parent_a_status": "normal", "parent_b_status": "normal"},
        ]
        recommend, reasons = should_recommend_counseling(carrier_results)
        assert recommend is False
        assert len(reasons) == 0

    def test_ethnicity_population_lookup(self):
        """Ethnicity module can look up population-specific frequencies."""
        from Source.ethnicity import get_population_frequency, load_ethnicity_data

        data = load_ethnicity_data(ETHNICITY_DATA_PATH)
        freqs = data.get("frequencies", {})
        if freqs:
            # Test with the first rsID in the data
            first_rsid = next(iter(freqs))
            result = get_population_frequency(first_rsid, "Global", data)
            # Should return a number or None
            assert result is None or isinstance(result, float)

    def test_pgx_free_tier_returns_no_genes(self):
        """Free tier PGx analysis returns 0 genes."""
        from Source.pharmacogenomics import analyze_pgx

        pgx_panel = _load_json(PGX_PANEL_PATH)
        result = analyze_pgx({}, {}, pgx_panel, tier="free")
        assert result["genes_analyzed"] == 0
        assert result["is_limited"] is True

    def test_prs_free_tier_returns_no_conditions(self):
        """Free tier PRS analysis returns 0 conditions."""
        from Source.prs import analyze_prs

        prs_weights = _load_json(PRS_WEIGHTS_PATH)
        result = analyze_prs({}, {}, prs_weights, tier="free")
        assert result["conditions_available"] == 0
        assert len(result["conditions"]) == 0

    def test_actionable_pgx_triggers_counseling(self):
        """Actionable pharmacogenomic finding triggers counseling recommendation."""
        from Source.counseling import should_recommend_counseling

        carrier_results = [
            {"condition": "Test", "risk_level": "low_risk",
             "parent_a_status": "normal", "parent_b_status": "normal"},
        ]
        pgx_results = [
            {"actionable": True, "drug": "Codeine"},
        ]
        recommend, reasons = should_recommend_counseling(
            carrier_results, pgx_results=pgx_results,
        )
        assert recommend is True
        assert any("Codeine" in r for r in reasons)

    def test_clinvar_freshness_against_real_panel(self):
        """ClinVar freshness check works against real carrier_panel.json."""
        from Source.clinvar_pipeline import check_panel_freshness

        result = check_panel_freshness(CARRIER_PANEL_PATH)
        assert isinstance(result, dict)
        assert "total_variants" in result
        assert result["total_variants"] >= 300
        assert "is_stale" in result
        assert "stale_threshold_days" in result
        assert result["stale_threshold_days"] == 30
        # No sync date provided, so should be stale
        assert result["is_stale"] is True

    def test_clinvar_freshness_with_recent_sync(self):
        """ClinVar freshness reports not stale when synced today."""
        from datetime import datetime, timezone

        from Source.clinvar_pipeline import check_panel_freshness

        today_iso = datetime.now(tz=timezone.utc).isoformat()
        result = check_panel_freshness(CARRIER_PANEL_PATH, last_sync_date=today_iso)
        assert result["is_stale"] is False
        assert result["days_since_sync"] == 0

    def test_end_to_end_carrier_with_ethnicity(self):
        """End-to-end: carrier analysis followed by ethnicity frequency adjustment."""
        from Source.carrier_analysis import analyze_carrier_risk
        from Source.ethnicity import adjust_carrier_risk, load_ethnicity_data

        # Run carrier analysis
        snps_a = {"rs123": "AG"}
        snps_b = {"rs123": "AG"}
        carrier_results = analyze_carrier_risk(snps_a, snps_b, CARRIER_PANEL_PATH)
        assert isinstance(carrier_results, list)

        # Load ethnicity data and apply adjustment
        eth_data = load_ethnicity_data(ETHNICITY_DATA_PATH)
        assert isinstance(eth_data, dict)

        # Simulate an adjustment using the ethnicity module
        adjusted = adjust_carrier_risk(
            base_risk=0.05,
            population_frequency=0.10,
            global_frequency=0.05,
        )
        assert adjusted["adjusted_risk"] == pytest.approx(0.10)
        assert adjusted["adjustment_factor"] == pytest.approx(2.0)

    def test_pgx_combined_with_carrier_analysis(self):
        """PGx and carrier analysis can run on the same SNP data."""
        from Source.carrier_analysis import analyze_carrier_risk
        from Source.pharmacogenomics import analyze_pgx

        snps = {"rs123": "AG", "rs3892097": "GA"}
        carrier_results = analyze_carrier_risk(snps, snps, CARRIER_PANEL_PATH)
        assert isinstance(carrier_results, list)

        pgx_panel = _load_json(PGX_PANEL_PATH)
        pgx_results = analyze_pgx(snps, snps, pgx_panel, tier="pro")
        assert pgx_results["genes_analyzed"] > 0
        assert isinstance(pgx_results["results"], dict)

    def test_prs_offspring_prediction_range(self):
        """PRS offspring prediction returns valid percentile ranges."""
        from Source.prs import analyze_prs

        prs_weights = _load_json(PRS_WEIGHTS_PATH)
        result = analyze_prs({}, {}, prs_weights, tier="pro")
        for _cond_key, cond_data in result["conditions"].items():
            offspring = cond_data["offspring"]
            assert "expected_percentile" in offspring
            assert "range_low" in offspring
            assert "range_high" in offspring
            assert 0 <= offspring["expected_percentile"] <= 100
            assert offspring["range_low"] <= offspring["expected_percentile"]
            assert offspring["expected_percentile"] <= offspring["range_high"]

    def test_full_pipeline_all_tier5_features(self):
        """Full pipeline: carrier + ethnicity + PGx + PRS + counseling together."""
        from Source.carrier_analysis import analyze_carrier_risk
        from Source.counseling import should_recommend_counseling
        from Source.ethnicity import load_ethnicity_data
        from Source.pharmacogenomics import analyze_pgx
        from Source.prs import analyze_prs

        # Step 1: Carrier analysis
        snps_a = {"rs123": "AG"}
        snps_b = {"rs123": "AA"}
        carrier_results = analyze_carrier_risk(snps_a, snps_b, CARRIER_PANEL_PATH)
        assert isinstance(carrier_results, list)

        # Step 2: Load ethnicity data
        eth_data = load_ethnicity_data(ETHNICITY_DATA_PATH)
        assert isinstance(eth_data, dict)

        # Step 3: PGx analysis
        pgx_panel = _load_json(PGX_PANEL_PATH)
        pgx_results = analyze_pgx(snps_a, snps_b, pgx_panel, tier="pro")
        assert pgx_results["genes_analyzed"] > 0

        # Step 4: PRS analysis
        prs_weights = _load_json(PRS_WEIGHTS_PATH)
        prs_results = analyze_prs(snps_a, snps_b, prs_weights, tier="pro")
        assert prs_results["conditions_available"] == 10

        # Step 5: Counseling recommendation (combine all results)
        prs_for_counseling = [
            {"percentile": cd["parent_a"]["percentile"], "trait": cd["name"]}
            for cd in prs_results["conditions"].values()
        ]
        recommend, reasons = should_recommend_counseling(
            carrier_results,
            prs_results=prs_for_counseling,
        )
        # Result is valid regardless of whether recommend is True or False
        assert isinstance(recommend, bool)
        assert isinstance(reasons, list)


# ===========================================================================
# TestUIComponents — verify new UI component functions
# ===========================================================================


class TestUIComponents:
    """Tests for new Tier 5 UI components in Source/ui/components.py."""

    def test_metabolizer_badge_renders(self):
        """render_metabolizer_badge returns HTML for a valid status."""
        from Source.ui.components import render_metabolizer_badge

        html = render_metabolizer_badge("poor_metabolizer")
        assert isinstance(html, str)
        assert "Poor Metabolizer" in html
        assert "style=" in html

    def test_metabolizer_badge_unknown_status(self):
        """render_metabolizer_badge handles unknown status gracefully."""
        from Source.ui.components import render_metabolizer_badge

        html = render_metabolizer_badge("unknown_status")
        assert isinstance(html, str)
        assert "Unknown Status" in html

    def test_prs_gauge_renders(self):
        """render_prs_gauge returns HTML for a valid percentile."""
        from Source.ui.components import render_prs_gauge

        html = render_prs_gauge(75.0, "Coronary Artery Disease")
        assert isinstance(html, str)
        assert "Coronary Artery Disease" in html
        assert "75" in html

    def test_prs_gauge_low_percentile(self):
        """render_prs_gauge shows 'Low' for percentiles under 20."""
        from Source.ui.components import render_prs_gauge

        html = render_prs_gauge(10.0, "Test Condition")
        assert "Low" in html

    def test_prs_gauge_high_percentile(self):
        """render_prs_gauge shows 'High' for percentiles over 95."""
        from Source.ui.components import render_prs_gauge

        html = render_prs_gauge(97.0, "Test Condition")
        assert "High" in html

    def test_counseling_banner_renders_when_recommended(self):
        """render_counseling_banner returns HTML when counseling is recommended."""
        from Source.ui.components import render_counseling_banner

        html = render_counseling_banner(
            should_recommend=True,
            reasons=["Both parents are carriers for Cystic Fibrosis"],
        )
        assert isinstance(html, str)
        assert len(html) > 0
        assert "Genetic Counselor" in html

    def test_counseling_banner_empty_when_not_recommended(self):
        """render_counseling_banner returns empty string when not recommended."""
        from Source.ui.components import render_counseling_banner

        html = render_counseling_banner(should_recommend=False, reasons=[])
        assert html == ""

    def test_metabolizer_badge_all_known_statuses(self):
        """render_metabolizer_badge renders all known metabolizer statuses."""
        from Source.ui.components import render_metabolizer_badge

        statuses = [
            "poor_metabolizer",
            "intermediate_metabolizer",
            "normal_metabolizer",
            "rapid_metabolizer",
            "ultra_rapid_metabolizer",
        ]
        for status in statuses:
            html = render_metabolizer_badge(status)
            assert isinstance(html, str)
            assert len(html) > 0


# ===========================================================================
# TestBackwardCompatibility — ensure existing functionality is not broken
# ===========================================================================


class TestBackwardCompatibility:
    """Tests to ensure Tier 5 changes don't break existing functionality."""

    def test_existing_carrier_analysis_unchanged(self):
        """analyze_carrier_risk still works with original parameters."""
        from Source.carrier_analysis import analyze_carrier_risk

        snps_a = {"rs123": "AG"}
        snps_b = {"rs123": "AA"}
        results = analyze_carrier_risk(snps_a, snps_b, CARRIER_PANEL_PATH)
        assert isinstance(results, list)

    def test_existing_trait_analysis_unchanged(self):
        """predict_trait still works with trait data."""
        from Source.trait_prediction import predict_trait

        raw = _load_json(TRAIT_DB_PATH)
        traits = raw if isinstance(raw, list) else raw.get("snps", raw)
        if traits:
            trait = traits[0]
            result = predict_trait({"rs123": "AG"}, {"rs123": "AA"}, trait)
            # Result may be None if SNPs don't match — that's fine
            assert result is None or isinstance(result, dict)

    def test_all_existing_tests_pass_count(self):
        """Verify all existing test files are still present (no accidental deletion)."""
        tests_dir = os.path.dirname(__file__)
        test_files = [
            f for f in os.listdir(tests_dir)
            if f.startswith("test_") and f.endswith(".py")
        ]
        # We had 21 test files before + this new one = 22
        assert len(test_files) >= 22, f"Expected >= 22 test files, found {len(test_files)}"

    def test_tier_config_backward_compatible(self):
        """TierConfig still has all original fields."""
        from Source.tier_config import TIER_CONFIGS, TierType

        for tier_type in TierType:
            config = TIER_CONFIGS[tier_type]
            assert hasattr(config, "name")
            assert hasattr(config, "display_name")
            assert hasattr(config, "price")
            assert hasattr(config, "disease_limit")
            assert hasattr(config, "trait_limit")
            assert hasattr(config, "features")

    def test_get_tier_config_still_works(self):
        """get_tier_config returns valid configs for all tiers."""
        from Source.tier_config import TierType, get_tier_config

        for tier in TierType:
            config = get_tier_config(tier)
            assert config.name == tier.value

    def test_get_diseases_for_tier_still_works(self):
        """get_diseases_for_tier returns correct counts."""
        from Source.tier_config import TierType, get_diseases_for_tier

        panel = _load_json(CARRIER_PANEL_PATH)
        free_diseases = get_diseases_for_tier(TierType.FREE, panel)
        assert len(free_diseases) <= 25

    def test_counseling_providers_file_exists(self):
        """Counseling providers data file exists and is valid JSON."""
        providers = _load_json(COUNSELING_PROVIDERS_PATH)
        assert isinstance(providers, list)
        assert len(providers) > 0

    def test_counseling_module_functions_exist(self):
        """Counseling module has all expected public functions."""
        from Source.counseling import (
            find_providers_by_specialty,
            generate_referral_summary,
            should_recommend_counseling,
        )
        assert callable(should_recommend_counseling)
        assert callable(generate_referral_summary)
        assert callable(find_providers_by_specialty)

    def test_app_router_has_counseling_page(self):
        """app.py includes the counseling page in the router."""
        app_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "app.py"
        )
        with open(app_path) as f:
            app_content = f.read()
        assert "counseling.py" in app_content
        assert "Genetic Counseling" in app_content
