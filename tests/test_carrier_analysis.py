"""Tests for carrier risk analysis engine."""
import os

from Source.carrier_analysis import (
    analyze_carrier_risk,
    calculate_offspring_risk,
    calculate_offspring_risk_ad,
    calculate_offspring_risk_xlinked,
    determine_carrier_status,
)

PANEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "carrier_panel.json")


class TestDetermineCarrierStatus:
    """Test suite for determine_carrier_status function."""

    def test_normal_status(self):
        """Test normal status: genotype 'AA', pathogenic 'T', reference 'A' -> 'normal'."""
        status = determine_carrier_status("AA", "T", "A")
        assert status == "normal"

    def test_carrier_status(self):
        """Test carrier status: genotype 'AT', pathogenic 'T', reference 'A' -> 'carrier'."""
        status = determine_carrier_status("AT", "T", "A")
        assert status == "carrier"

    def test_carrier_status_reversed(self):
        """Test carrier status with reversed alleles: genotype 'TA', pathogenic 'T', reference 'A' -> 'carrier'."""
        status = determine_carrier_status("TA", "T", "A")
        assert status == "carrier"

    def test_affected_status(self):
        """Test affected status: genotype 'TT', pathogenic 'T', reference 'A' -> 'affected'."""
        status = determine_carrier_status("TT", "T", "A")
        assert status == "affected"

    def test_unknown_empty_genotype(self):
        """Test unknown status: empty genotype -> 'unknown'."""
        status = determine_carrier_status("", "T", "A")
        assert status == "unknown"

    def test_unknown_single_char_genotype(self):
        """Test unknown status: single char genotype -> 'unknown'."""
        status = determine_carrier_status("A", "T", "A")
        assert status == "unknown"

    def test_unknown_none_genotype(self):
        """Test unknown status: None genotype -> 'unknown'."""
        status = determine_carrier_status(None, "T", "A")
        assert status == "unknown"

    def test_case_insensitive(self):
        """Test that function handles lowercase genotypes correctly."""
        status = determine_carrier_status("at", "T", "A")
        assert status == "carrier"

    def test_normal_different_alleles(self):
        """Test normal with different alleles: genotype 'GG', pathogenic 'C', reference 'G' -> 'normal'."""
        status = determine_carrier_status("GG", "C", "G")
        assert status == "normal"

    def test_carrier_different_alleles(self):
        """Test carrier with different alleles: genotype 'GC', pathogenic 'C', reference 'G' -> 'carrier'."""
        status = determine_carrier_status("GC", "C", "G")
        assert status == "carrier"


class TestCalculateOffspringRisk:
    """Test suite for calculate_offspring_risk function."""

    def test_both_normal(self):
        """Test both normal -> 0% affected, 0% carrier, 100% normal."""
        risk = calculate_offspring_risk("normal", "normal")
        assert risk == {"affected": 0.0, "carrier": 0.0, "normal": 100.0}

    def test_one_carrier_one_normal(self):
        """Test one carrier, one normal -> 0% affected, 50% carrier, 50% normal."""
        risk = calculate_offspring_risk("carrier", "normal")
        assert risk == {"affected": 0.0, "carrier": 50.0, "normal": 50.0}

        # Test reverse order
        risk_reversed = calculate_offspring_risk("normal", "carrier")
        assert risk_reversed == {"affected": 0.0, "carrier": 50.0, "normal": 50.0}

    def test_both_carriers(self):
        """Test both carriers -> 25% affected, 50% carrier, 25% normal."""
        risk = calculate_offspring_risk("carrier", "carrier")
        assert risk == {"affected": 25.0, "carrier": 50.0, "normal": 25.0}

    def test_one_affected_one_carrier(self):
        """Test one affected, one carrier -> 50% affected, 50% carrier, 0% normal."""
        risk = calculate_offspring_risk("affected", "carrier")
        assert risk == {"affected": 50.0, "carrier": 50.0, "normal": 0.0}

        # Test reverse order
        risk_reversed = calculate_offspring_risk("carrier", "affected")
        assert risk_reversed == {"affected": 50.0, "carrier": 50.0, "normal": 0.0}

    def test_both_affected(self):
        """Test both affected -> 100% affected, 0% carrier, 0% normal."""
        risk = calculate_offspring_risk("affected", "affected")
        assert risk == {"affected": 100.0, "carrier": 0.0, "normal": 0.0}

    def test_one_affected_one_normal(self):
        """Test one affected, one normal -> 0% affected, 100% carrier, 0% normal."""
        risk = calculate_offspring_risk("affected", "normal")
        assert risk == {"affected": 0.0, "carrier": 100.0, "normal": 0.0}

        # Test reverse order
        risk_reversed = calculate_offspring_risk("normal", "affected")
        assert risk_reversed == {"affected": 0.0, "carrier": 100.0, "normal": 0.0}

    def test_one_unknown(self):
        """Test one unknown -> all 0%."""
        risk = calculate_offspring_risk("unknown", "normal")
        assert risk == {"affected": 0.0, "carrier": 0.0, "normal": 0.0}

        risk2 = calculate_offspring_risk("carrier", "unknown")
        assert risk2 == {"affected": 0.0, "carrier": 0.0, "normal": 0.0}

    def test_both_unknown(self):
        """Test both unknown -> all 0%."""
        risk = calculate_offspring_risk("unknown", "unknown")
        assert risk == {"affected": 0.0, "carrier": 0.0, "normal": 0.0}


class TestAnalyzeCarrierRisk:
    """Test suite for analyze_carrier_risk function."""

    def test_loads_panel_successfully(self):
        """Test that analyze_carrier_risk loads panel successfully."""
        parent_a_snps = {}
        parent_b_snps = {}

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)
        assert isinstance(results, list)
        assert len(results) > 0

    def test_returns_list_of_results(self):
        """Test that results is a list."""
        parent_a_snps = {"rs334": "AT"}
        parent_b_snps = {"rs334": "AA"}

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)
        assert isinstance(results, list)

    def test_results_sorted_by_risk_level(self):
        """Test that results are sorted by risk level (high_risk first)."""
        # Create scenario with different risk levels
        parent_a_snps = {
            "rs334": "AT",  # Sickle Cell - carrier
            "rs76173977": "AT",  # Tay-Sachs - carrier
            "rs75030207": "CC"  # Cystic Fibrosis - normal
        }
        parent_b_snps = {
            "rs334": "AT",  # Sickle Cell - carrier (both carriers = high_risk)
            "rs76173977": "CC",  # Tay-Sachs - normal (one carrier = carrier_detected)
            "rs75030207": "CC"  # Cystic Fibrosis - normal (both normal = low_risk)
        }

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)

        # Verify ordering: high_risk entries should come before carrier_detected, which should come before low_risk
        risk_order = [r["risk_level"] for r in results]

        # Find positions of each risk level
        high_risk_positions = [i for i, r in enumerate(risk_order) if r == "high_risk"]
        carrier_detected_positions = [i for i, r in enumerate(risk_order) if r == "carrier_detected"]
        low_risk_positions = [i for i, r in enumerate(risk_order) if r == "low_risk"]

        if high_risk_positions and carrier_detected_positions:
            assert max(high_risk_positions) < min(carrier_detected_positions), \
                "high_risk should come before carrier_detected"

        if carrier_detected_positions and low_risk_positions:
            assert max(carrier_detected_positions) < min(low_risk_positions), \
                "carrier_detected should come before low_risk"

    def test_result_dict_has_required_keys(self):
        """Test that each result dict has all required keys."""
        parent_a_snps = {"rs334": "AT"}
        parent_b_snps = {"rs334": "AA"}

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)

        required_keys = {
            "condition", "gene", "severity", "description",
            "parent_a_status", "parent_b_status", "offspring_risk",
            "risk_level", "rsid", "inheritance"
        }

        for result in results:
            for key in required_keys:
                assert key in result, f"Result missing required key: {key}"

    def test_high_risk_when_both_carriers(self):
        """Test high_risk classification when both parents are carriers for same disease."""
        # Both parents carriers for Sickle Cell (rs334)
        parent_a_snps = {"rs334": "AT"}  # Carrier (A=reference, T=pathogenic)
        parent_b_snps = {"rs334": "AT"}  # Carrier

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)

        # Find the Sickle Cell Disease result
        sickle_cell_result = next((r for r in results if r["rsid"] == "rs334"), None)
        assert sickle_cell_result is not None, "Sickle Cell Disease result not found"
        assert sickle_cell_result["risk_level"] == "high_risk"
        assert sickle_cell_result["parent_a_status"] == "carrier"
        assert sickle_cell_result["parent_b_status"] == "carrier"
        assert sickle_cell_result["offspring_risk"]["affected"] == 25.0

    def test_carrier_detected_when_one_carrier(self):
        """Test carrier_detected classification when one parent is carrier."""
        # One parent carrier for Tay-Sachs (rs76173977)
        parent_a_snps = {"rs76173977": "CT"}  # Carrier (C=reference, T=pathogenic)
        parent_b_snps = {"rs76173977": "CC"}  # Normal

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)

        # Find the Tay-Sachs result
        taysachs_result = next((r for r in results if r["rsid"] == "rs76173977"), None)
        assert taysachs_result is not None, "Tay-Sachs result not found"
        assert taysachs_result["risk_level"] == "carrier_detected"
        assert taysachs_result["parent_a_status"] == "carrier"
        assert taysachs_result["parent_b_status"] == "normal"
        assert taysachs_result["offspring_risk"]["affected"] == 0.0
        assert taysachs_result["offspring_risk"]["carrier"] == 50.0

    def test_low_risk_when_neither_carrier(self):
        """Test low_risk classification when neither parent is carrier."""
        # Both parents normal for Cystic Fibrosis (rs75030207)
        parent_a_snps = {"rs75030207": "CC"}  # Normal (C=reference, T=pathogenic)
        parent_b_snps = {"rs75030207": "CC"}  # Normal

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)

        # Find the Cystic Fibrosis result
        cf_result = next((r for r in results if r["rsid"] == "rs75030207"), None)
        assert cf_result is not None, "Cystic Fibrosis result not found"
        assert cf_result["risk_level"] == "low_risk"
        assert cf_result["parent_a_status"] == "normal"
        assert cf_result["parent_b_status"] == "normal"
        assert cf_result["offspring_risk"]["affected"] == 0.0

    def test_with_sample_data_comprehensive(self):
        """Test with comprehensive sample data including multiple risk scenarios."""
        parent_a_snps = {
            "rs334": "AT",  # Sickle Cell - carrier
            "rs76173977": "CT",  # Tay-Sachs - carrier
            "rs75030207": "CC",  # Cystic Fibrosis F508del - normal
            "rs113993960": "GG"  # Cystic Fibrosis G542X - normal
        }

        parent_b_snps = {
            "rs334": "AT",  # Sickle Cell - carrier (HIGH RISK: both carriers)
            "rs76173977": "CC",  # Tay-Sachs - normal (CARRIER DETECTED: one carrier)
            "rs75030207": "CC",  # Cystic Fibrosis F508del - normal (LOW RISK: both normal)
            "rs113993960": "AG"  # Cystic Fibrosis G542X - carrier (CARRIER DETECTED: one carrier)
        }

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)

        # Verify we have results for all tested diseases
        assert len(results) > 0

        # Check Sickle Cell (high risk)
        sickle_result = next((r for r in results if r["rsid"] == "rs334"), None)
        assert sickle_result is not None
        assert sickle_result["risk_level"] == "high_risk"
        assert sickle_result["offspring_risk"]["affected"] == 25.0

        # Check Tay-Sachs (carrier detected)
        taysachs_result = next((r for r in results if r["rsid"] == "rs76173977"), None)
        assert taysachs_result is not None
        assert taysachs_result["risk_level"] == "carrier_detected"

        # Check CF F508del (low risk)
        cf1_result = next((r for r in results if r["rsid"] == "rs75030207"), None)
        assert cf1_result is not None
        assert cf1_result["risk_level"] == "low_risk"

        # Check CF G542X (carrier detected)
        cf2_result = next((r for r in results if r["rsid"] == "rs113993960"), None)
        assert cf2_result is not None
        assert cf2_result["risk_level"] == "carrier_detected"

    def test_missing_genotype_data(self):
        """Test handling of missing genotype data (unknown status)."""
        # Parent A has data, Parent B has no data for rs334
        parent_a_snps = {"rs334": "AT"}
        parent_b_snps = {}  # No genotype data

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)

        sickle_result = next((r for r in results if r["rsid"] == "rs334"), None)
        assert sickle_result is not None
        assert sickle_result["parent_a_status"] == "carrier"
        assert sickle_result["parent_b_status"] == "unknown"
        assert sickle_result["risk_level"] == "unknown"

    def test_empty_parent_snps(self):
        """Test with empty parent SNP dictionaries."""
        results = analyze_carrier_risk({}, {}, PANEL_PATH)

        # Should still return results for all panel entries
        assert len(results) > 0

        # All should have unknown status
        for result in results:
            assert result["parent_a_status"] == "unknown"
            assert result["parent_b_status"] == "unknown"
            assert result["risk_level"] == "unknown"

    def test_inheritance_field_present_in_results(self):
        """Test that every result includes the 'inheritance' field."""
        parent_a_snps = {"rs334": "AT"}
        parent_b_snps = {"rs334": "AA"}
        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)

        for result in results:
            assert "inheritance" in result, f"Result for {result['condition']} missing 'inheritance' key"
            assert result["inheritance"] in (
                "autosomal_recessive", "autosomal_dominant", "X-linked"
            ), f"Unexpected inheritance value: {result['inheritance']}"

    def test_ad_disease_carrier_is_high_risk(self):
        """Test that an AD disease with a carrier parent is classified as high_risk, not carrier_detected."""
        # rs28942078 = Familial Hypercholesterolemia (autosomal_dominant, path=T, ref=C)
        parent_a_snps = {"rs28942078": "CT"}  # Carrier (one pathogenic T allele)
        parent_b_snps = {"rs28942078": "CC"}  # Normal

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)
        fh_result = next((r for r in results if r["rsid"] == "rs28942078"), None)

        assert fh_result is not None, "Familial Hypercholesterolemia result not found"
        assert fh_result["inheritance"] == "autosomal_dominant"
        # AD carrier = affected, so this should be high_risk with 50% affected offspring
        assert fh_result["risk_level"] == "high_risk"
        assert fh_result["offspring_risk"]["affected"] == 50.0
        assert fh_result["offspring_risk"]["carrier"] == 0.0
        assert fh_result["offspring_risk"]["normal"] == 50.0

    def test_xlinked_disease_has_sex_stratified_risk(self):
        """Test that an X-linked disease result contains sons and daughters sub-dicts."""
        # rs121913326 = OTC Deficiency (X-linked, path=A, ref=G)
        # Female carrier x Normal male
        parent_a_snps = {"rs121913326": "GA"}  # Female carrier
        parent_b_snps = {"rs121913326": "GG"}  # Male normal

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)
        otc_result = next((r for r in results if r["rsid"] == "rs121913326"), None)

        assert otc_result is not None, "OTC Deficiency result not found"
        assert otc_result["inheritance"] == "X-linked"
        assert "sons" in otc_result["offspring_risk"]
        assert "daughters" in otc_result["offspring_risk"]
        # Female carrier x normal male -> sons 50% affected, daughters 50% carrier
        assert otc_result["offspring_risk"]["sons"]["affected"] == 50.0
        assert otc_result["offspring_risk"]["sons"]["normal"] == 50.0
        assert otc_result["offspring_risk"]["daughters"]["carrier"] == 50.0
        assert otc_result["offspring_risk"]["daughters"]["normal"] == 50.0
        assert otc_result["risk_level"] == "high_risk"

    def test_ar_disease_unchanged_behavior(self):
        """Test that autosomal recessive diseases still behave exactly as before."""
        # rs334 = Sickle Cell (autosomal_recessive, path=T, ref=A)
        parent_a_snps = {"rs334": "AT"}  # Carrier
        parent_b_snps = {"rs334": "AT"}  # Carrier

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)
        sickle_result = next((r for r in results if r["rsid"] == "rs334"), None)

        assert sickle_result is not None
        assert sickle_result["inheritance"] == "autosomal_recessive"
        assert sickle_result["risk_level"] == "high_risk"
        assert sickle_result["offspring_risk"]["affected"] == 25.0
        assert sickle_result["offspring_risk"]["carrier"] == 50.0
        assert sickle_result["offspring_risk"]["normal"] == 25.0

    def test_dispatching_covers_all_three_inheritance_types(self):
        """Test that results include diseases from all 3 inheritance types."""
        # Use SNPs from each inheritance type
        parent_a_snps = {
            "rs334": "AT",        # AR: Sickle Cell
            "rs28942078": "CT",   # AD: Familial Hypercholesterolemia
            "rs121913326": "GA",  # XL: OTC Deficiency
        }
        parent_b_snps = {
            "rs334": "AT",        # AR: Sickle Cell
            "rs28942078": "CC",   # AD: Familial Hypercholesterolemia
            "rs121913326": "GG",  # XL: OTC Deficiency
        }

        results = analyze_carrier_risk(parent_a_snps, parent_b_snps, PANEL_PATH)
        inheritance_types = {r["inheritance"] for r in results}

        assert "autosomal_recessive" in inheritance_types
        assert "autosomal_dominant" in inheritance_types
        assert "X-linked" in inheritance_types


class TestCalculateOffspringRiskAD:
    """Test suite for calculate_offspring_risk_ad function (autosomal dominant)."""

    def test_both_normal(self):
        """Test both normal -> 0% affected, 0% carrier, 100% normal."""
        risk = calculate_offspring_risk_ad("normal", "normal")
        assert risk == {"affected": 0.0, "carrier": 0.0, "normal": 100.0}

    def test_one_carrier_one_normal(self):
        """AD carrier = affected. One carrier + normal -> 50% affected, 50% normal."""
        risk = calculate_offspring_risk_ad("carrier", "normal")
        assert risk == {"affected": 50.0, "carrier": 0.0, "normal": 50.0}

        # Reverse order
        risk_rev = calculate_offspring_risk_ad("normal", "carrier")
        assert risk_rev == {"affected": 50.0, "carrier": 0.0, "normal": 50.0}

    def test_one_affected_one_normal(self):
        """One affected + normal -> 50% affected, 50% normal."""
        risk = calculate_offspring_risk_ad("affected", "normal")
        assert risk == {"affected": 50.0, "carrier": 0.0, "normal": 50.0}

        risk_rev = calculate_offspring_risk_ad("normal", "affected")
        assert risk_rev == {"affected": 50.0, "carrier": 0.0, "normal": 50.0}

    def test_both_carriers(self):
        """Both carriers (=both affected for AD) -> 100% affected."""
        risk = calculate_offspring_risk_ad("carrier", "carrier")
        assert risk == {"affected": 100.0, "carrier": 0.0, "normal": 0.0}

    def test_both_affected(self):
        """Both affected -> 100% affected."""
        risk = calculate_offspring_risk_ad("affected", "affected")
        assert risk == {"affected": 100.0, "carrier": 0.0, "normal": 0.0}

    def test_carrier_and_affected(self):
        """Carrier + affected (both are effectively affected for AD) -> 100% affected."""
        risk = calculate_offspring_risk_ad("carrier", "affected")
        assert risk == {"affected": 100.0, "carrier": 0.0, "normal": 0.0}

        risk_rev = calculate_offspring_risk_ad("affected", "carrier")
        assert risk_rev == {"affected": 100.0, "carrier": 0.0, "normal": 0.0}

    def test_unknown_parent(self):
        """One unknown -> all 0%."""
        risk = calculate_offspring_risk_ad("unknown", "normal")
        assert risk == {"affected": 0.0, "carrier": 0.0, "normal": 0.0}

        risk2 = calculate_offspring_risk_ad("carrier", "unknown")
        assert risk2 == {"affected": 0.0, "carrier": 0.0, "normal": 0.0}

    def test_both_unknown(self):
        """Both unknown -> all 0%."""
        risk = calculate_offspring_risk_ad("unknown", "unknown")
        assert risk == {"affected": 0.0, "carrier": 0.0, "normal": 0.0}

    def test_carrier_never_in_ad_result(self):
        """Verify that carrier percentage is always 0 for AD results."""
        for a_status in ("normal", "carrier", "affected"):
            for b_status in ("normal", "carrier", "affected"):
                risk = calculate_offspring_risk_ad(a_status, b_status)
                assert risk["carrier"] == 0.0, (
                    f"carrier should be 0.0 for AD, got {risk['carrier']} "
                    f"with parents ({a_status}, {b_status})"
                )


class TestCalculateOffspringRiskXLinked:
    """Test suite for calculate_offspring_risk_xlinked function (X-linked)."""

    def test_both_normal(self):
        """Normal female + normal male -> all offspring normal."""
        risk = calculate_offspring_risk_xlinked("normal", "normal")
        assert risk["sons"] == {"affected": 0.0, "carrier": 0.0, "normal": 100.0}
        assert risk["daughters"] == {"affected": 0.0, "carrier": 0.0, "normal": 100.0}
        assert risk["affected"] == 0.0
        assert risk["normal"] == 100.0

    def test_female_carrier_male_normal(self):
        """Carrier female + normal male -> 50% sons affected, 50% daughters carrier."""
        risk = calculate_offspring_risk_xlinked("carrier", "normal")
        assert risk["sons"] == {"affected": 50.0, "carrier": 0.0, "normal": 50.0}
        assert risk["daughters"] == {"affected": 0.0, "carrier": 50.0, "normal": 50.0}
        # Overall average: 25% affected, 25% carrier, 50% normal
        assert risk["affected"] == 25.0
        assert risk["carrier"] == 25.0
        assert risk["normal"] == 50.0

    def test_normal_female_affected_male(self):
        """Normal female + affected male -> all daughters carriers, all sons normal."""
        risk = calculate_offspring_risk_xlinked("normal", "affected")
        assert risk["sons"] == {"affected": 0.0, "carrier": 0.0, "normal": 100.0}
        assert risk["daughters"] == {"affected": 0.0, "carrier": 100.0, "normal": 0.0}
        assert risk["affected"] == 0.0
        assert risk["carrier"] == 50.0
        assert risk["normal"] == 50.0

    def test_female_carrier_affected_male(self):
        """Carrier female + affected male -> 50% sons affected, 50% daughters affected + 50% carrier."""
        risk = calculate_offspring_risk_xlinked("carrier", "affected")
        assert risk["sons"] == {"affected": 50.0, "carrier": 0.0, "normal": 50.0}
        assert risk["daughters"] == {"affected": 50.0, "carrier": 50.0, "normal": 0.0}
        assert risk["affected"] == 50.0
        assert risk["carrier"] == 25.0
        assert risk["normal"] == 25.0

    def test_affected_female_normal_male(self):
        """Affected female + normal male -> all sons affected, all daughters carriers."""
        risk = calculate_offspring_risk_xlinked("affected", "normal")
        assert risk["sons"] == {"affected": 100.0, "carrier": 0.0, "normal": 0.0}
        assert risk["daughters"] == {"affected": 0.0, "carrier": 100.0, "normal": 0.0}
        assert risk["affected"] == 50.0
        assert risk["carrier"] == 50.0
        assert risk["normal"] == 0.0

    def test_affected_female_affected_male(self):
        """Affected female + affected male -> all offspring affected."""
        risk = calculate_offspring_risk_xlinked("affected", "affected")
        assert risk["sons"] == {"affected": 100.0, "carrier": 0.0, "normal": 0.0}
        assert risk["daughters"] == {"affected": 100.0, "carrier": 0.0, "normal": 0.0}
        assert risk["affected"] == 100.0
        assert risk["carrier"] == 0.0
        assert risk["normal"] == 0.0

    def test_male_carrier_maps_to_affected(self):
        """Male 'carrier' should be treated as 'affected' (hemizygous)."""
        # Normal female + carrier male (= affected male)
        risk = calculate_offspring_risk_xlinked("normal", "carrier")
        # Should be same as normal female + affected male
        expected = calculate_offspring_risk_xlinked("normal", "affected")
        assert risk == expected

    def test_unknown_parent(self):
        """One unknown parent -> all zeros with sex-stratified structure."""
        risk = calculate_offspring_risk_xlinked("unknown", "normal")
        assert risk["sons"] == {"affected": 0.0, "carrier": 0.0, "normal": 0.0}
        assert risk["daughters"] == {"affected": 0.0, "carrier": 0.0, "normal": 0.0}
        assert risk["affected"] == 0.0

        risk2 = calculate_offspring_risk_xlinked("carrier", "unknown")
        assert risk2["sons"] == {"affected": 0.0, "carrier": 0.0, "normal": 0.0}
        assert risk2["daughters"] == {"affected": 0.0, "carrier": 0.0, "normal": 0.0}

    def test_both_unknown(self):
        """Both unknown -> all zeros with sex-stratified structure."""
        risk = calculate_offspring_risk_xlinked("unknown", "unknown")
        assert risk["sons"] == {"affected": 0.0, "carrier": 0.0, "normal": 0.0}
        assert risk["daughters"] == {"affected": 0.0, "carrier": 0.0, "normal": 0.0}
        assert risk["affected"] == 0.0
        assert risk["carrier"] == 0.0
        assert risk["normal"] == 0.0

    def test_sons_never_carriers(self):
        """Sons are hemizygous for X-linked: they're either affected or normal, never carriers."""
        for a_status in ("normal", "carrier", "affected"):
            for b_status in ("normal", "carrier", "affected"):
                risk = calculate_offspring_risk_xlinked(a_status, b_status)
                assert risk["sons"]["carrier"] == 0.0, (
                    f"Sons carrier should be 0.0, got {risk['sons']['carrier']} "
                    f"with parents ({a_status}, {b_status})"
                )

    def test_result_has_overall_keys(self):
        """Verify result always has top-level affected/carrier/normal for sorting compatibility."""
        risk = calculate_offspring_risk_xlinked("carrier", "normal")
        assert "affected" in risk
        assert "carrier" in risk
        assert "normal" in risk
        assert "sons" in risk
        assert "daughters" in risk
