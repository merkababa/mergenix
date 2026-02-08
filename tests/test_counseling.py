"""Tests for genetic counseling referral system."""

import json
import os

from Source.counseling import (
    COUNSELING_SPECIALTIES,
    NSGC_URL,
    find_providers_by_specialty,
    generate_referral_summary,
    get_counseling_specialties,
    should_recommend_counseling,
)

PROVIDERS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "counseling_providers.json"
)


def _load_providers():
    with open(PROVIDERS_PATH) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Fixtures: carrier result helpers
# ---------------------------------------------------------------------------

def _carrier_result(
    condition="Test Disease",
    gene="GENE1",
    parent_a="carrier",
    parent_b="carrier",
    risk_level="high_risk",
    inheritance="autosomal_recessive",
    category="General",
):
    return {
        "condition": condition,
        "gene": gene,
        "parent_a_status": parent_a,
        "parent_b_status": parent_b,
        "risk_level": risk_level,
        "inheritance": inheritance,
        "category": category,
        "severity": "high",
        "description": "Test description",
        "offspring_risk": {"affected": 25.0, "carrier": 50.0, "normal": 25.0},
        "rsid": "rs000001",
    }


# ===================================================================
# should_recommend_counseling
# ===================================================================


class TestShouldRecommendCounseling:
    def test_both_carriers_same_disease(self):
        """Both parents are carriers -> recommend counseling."""
        results = [_carrier_result(parent_a="carrier", parent_b="carrier")]
        recommend, reasons = should_recommend_counseling(results)
        assert recommend is True
        assert any("Both parents are carriers" in r for r in reasons)

    def test_high_risk_result(self):
        """Any high_risk result -> recommend counseling."""
        results = [_carrier_result(risk_level="high_risk", parent_a="affected", parent_b="carrier")]
        recommend, reasons = should_recommend_counseling(results)
        assert recommend is True
        assert any("High-risk" in r for r in reasons)

    def test_no_risk(self):
        """Both normal, low_risk -> do not recommend."""
        results = [_carrier_result(parent_a="normal", parent_b="normal", risk_level="low_risk")]
        recommend, reasons = should_recommend_counseling(results)
        assert recommend is False
        assert reasons == []

    def test_with_prs_results_high_percentile(self):
        """PRS >90th percentile -> recommend counseling."""
        carrier_results = [
            _carrier_result(parent_a="normal", parent_b="normal", risk_level="low_risk")
        ]
        prs_results = [{"trait": "Type 2 Diabetes", "percentile": 95.0}]
        recommend, reasons = should_recommend_counseling(carrier_results, prs_results=prs_results)
        assert recommend is True
        assert any("95th percentile" in r for r in reasons)

    def test_with_prs_results_low_percentile(self):
        """PRS <=90th percentile -> not sufficient alone."""
        carrier_results = [
            _carrier_result(parent_a="normal", parent_b="normal", risk_level="low_risk")
        ]
        prs_results = [{"trait": "Type 2 Diabetes", "percentile": 50.0}]
        recommend, reasons = should_recommend_counseling(carrier_results, prs_results=prs_results)
        assert recommend is False

    def test_with_pgx_results_actionable(self):
        """Actionable PGx finding -> recommend counseling."""
        carrier_results = [
            _carrier_result(parent_a="normal", parent_b="normal", risk_level="low_risk")
        ]
        pgx_results = [{"drug": "Warfarin", "actionable": True}]
        recommend, reasons = should_recommend_counseling(carrier_results, pgx_results=pgx_results)
        assert recommend is True
        assert any("Warfarin" in r for r in reasons)

    def test_with_pgx_results_not_actionable(self):
        """Non-actionable PGx finding -> not sufficient alone."""
        carrier_results = [
            _carrier_result(parent_a="normal", parent_b="normal", risk_level="low_risk")
        ]
        pgx_results = [{"drug": "Aspirin", "actionable": False}]
        recommend, reasons = should_recommend_counseling(carrier_results, pgx_results=pgx_results)
        assert recommend is False

    def test_empty_carrier_results(self):
        """Empty results -> do not recommend."""
        recommend, reasons = should_recommend_counseling([])
        assert recommend is False
        assert reasons == []


# ===================================================================
# generate_referral_summary
# ===================================================================


class TestGenerateReferralSummary:
    def test_free_tier_basic_response(self):
        """Free tier: only NSGC link, no summary text."""
        results = [_carrier_result()]
        summary = generate_referral_summary(results, tier="free")
        assert summary["nsgc_url"] == NSGC_URL
        assert summary["summary_text"] is None
        assert summary["key_findings"] is None
        assert summary["recommended_specialties"] is None
        assert summary["referral_letter"] is None
        assert summary["recommend"] is True

    def test_premium_tier_full_summary(self):
        """Premium tier: full summary with findings, no referral letter."""
        results = [_carrier_result()]
        summary = generate_referral_summary(results, tier="premium")
        assert summary["summary_text"] is not None
        assert "Mergenix Genetic Counseling Summary" in summary["summary_text"]
        assert summary["key_findings"] is not None
        assert len(summary["key_findings"]) > 0
        assert summary["recommended_specialties"] is not None
        assert summary["referral_letter"] is None

    def test_pro_tier_full_summary_with_letter(self):
        """Pro tier: full summary + referral letter."""
        results = [_carrier_result()]
        summary = generate_referral_summary(results, user_name="Jane Doe", tier="pro")
        assert summary["summary_text"] is not None
        assert summary["key_findings"] is not None
        assert summary["referral_letter"] is not None
        assert "Jane Doe" in summary["referral_letter"]
        assert "GENETIC COUNSELING REFERRAL" in summary["referral_letter"]

    def test_referral_summary_includes_key_findings(self):
        """Key findings include high_risk and carrier_detected results."""
        results = [
            _carrier_result(condition="Disease A", risk_level="high_risk"),
            _carrier_result(condition="Disease B", risk_level="carrier_detected",
                            parent_a="carrier", parent_b="normal"),
            _carrier_result(condition="Disease C", risk_level="low_risk",
                            parent_a="normal", parent_b="normal"),
        ]
        summary = generate_referral_summary(results, tier="premium")
        conditions = [f["condition"] for f in summary["key_findings"]]
        assert "Disease A" in conditions
        assert "Disease B" in conditions
        assert "Disease C" not in conditions

    def test_referral_letter_format_pro_only(self):
        """Referral letter is only present for pro tier."""
        results = [_carrier_result()]
        free = generate_referral_summary(results, tier="free")
        premium = generate_referral_summary(results, tier="premium")
        pro = generate_referral_summary(results, tier="pro")
        assert free["referral_letter"] is None
        assert premium["referral_letter"] is None
        assert pro["referral_letter"] is not None

    def test_no_risk_summary(self):
        """Summary with no risky results still works."""
        results = [
            _carrier_result(parent_a="normal", parent_b="normal", risk_level="low_risk")
        ]
        summary = generate_referral_summary(results, tier="premium")
        assert summary["recommend"] is False
        assert "No urgent findings" in summary["summary_text"]
        assert summary["key_findings"] == []

    def test_tier_case_insensitive(self):
        """Tier string is case-insensitive."""
        results = [_carrier_result()]
        summary = generate_referral_summary(results, tier="FREE")
        assert summary["summary_text"] is None
        summary2 = generate_referral_summary(results, tier="Pro")
        assert summary2["referral_letter"] is not None


# ===================================================================
# find_providers_by_specialty
# ===================================================================


class TestFindProviders:
    def test_by_specialty(self):
        """Filter providers by specialty."""
        providers = _load_providers()
        cancer = find_providers_by_specialty(providers, specialty="cancer")
        assert len(cancer) > 0
        assert all(
            "cancer" in [s.lower() for s in p["specialty"]]
            for p in cancer
        )

    def test_by_state(self):
        """Filter providers by US state."""
        providers = _load_providers()
        ca = find_providers_by_specialty(providers, state="CA")
        assert len(ca) > 0
        assert all(p["state"] == "CA" for p in ca)

    def test_no_filter_returns_all(self):
        """No filters -> return all providers."""
        providers = _load_providers()
        result = find_providers_by_specialty(providers)
        assert len(result) == len(providers)

    def test_empty_results(self):
        """Non-existent specialty -> empty list."""
        providers = _load_providers()
        result = find_providers_by_specialty(providers, specialty="nonexistent_specialty")
        assert result == []

    def test_combined_specialty_and_state(self):
        """Filter by both specialty and state."""
        providers = _load_providers()
        result = find_providers_by_specialty(providers, specialty="prenatal", state="CA")
        assert len(result) > 0
        for p in result:
            assert p["state"] == "CA"
            assert "prenatal" in [s.lower() for s in p["specialty"]]

    def test_case_insensitive_specialty(self):
        """Specialty filter is case-insensitive."""
        providers = _load_providers()
        upper = find_providers_by_specialty(providers, specialty="CANCER")
        lower = find_providers_by_specialty(providers, specialty="cancer")
        assert len(upper) == len(lower)

    def test_case_insensitive_state(self):
        """State filter is case-insensitive."""
        providers = _load_providers()
        upper = find_providers_by_specialty(providers, state="CA")
        lower = find_providers_by_specialty(providers, state="ca")
        assert len(upper) == len(lower)


# ===================================================================
# get_counseling_specialties
# ===================================================================


class TestGetCounselingSpecialties:
    def test_returns_list(self):
        """Returns a list of specialty strings."""
        specs = get_counseling_specialties()
        assert isinstance(specs, list)
        assert len(specs) == len(COUNSELING_SPECIALTIES)

    def test_expected_specialties(self):
        """Contains all expected specialties."""
        specs = get_counseling_specialties()
        for expected in ["prenatal", "cancer", "cardiovascular", "pharmacogenomics", "general"]:
            assert expected in specs

    def test_returns_copy(self):
        """Returns a copy, not the original list."""
        specs1 = get_counseling_specialties()
        specs1.append("bogus")
        specs2 = get_counseling_specialties()
        assert "bogus" not in specs2


# ===================================================================
# Data file integrity
# ===================================================================


class TestProvidersData:
    def test_providers_file_exists(self):
        """counseling_providers.json exists."""
        assert os.path.exists(PROVIDERS_PATH)

    def test_minimum_provider_count(self):
        """At least 50 providers in the directory."""
        providers = _load_providers()
        assert len(providers) >= 50

    def test_all_providers_have_required_fields(self):
        """Every provider has the required fields."""
        providers = _load_providers()
        required = {"name", "credentials", "specialty", "organization", "state", "city"}
        for p in providers:
            missing = required - set(p.keys())
            assert not missing, f"Provider {p.get('name')} missing fields: {missing}"

    def test_specialty_coverage(self):
        """Providers cover at least 8 specialties."""
        providers = _load_providers()
        all_specs = set()
        for p in providers:
            all_specs.update(p["specialty"])
        assert len(all_specs) >= 8

    def test_state_coverage(self):
        """Providers cover at least 15 US states."""
        providers = _load_providers()
        states = {p["state"] for p in providers}
        assert len(states) >= 15
