"""Tests for carrier risk analysis engine."""
import os
import pytest
from Source.carrier_analysis import (
    load_carrier_panel,
    determine_carrier_status,
    calculate_offspring_risk,
    analyze_carrier_risk,
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
            "risk_level", "rsid"
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
