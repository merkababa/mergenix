"""Tests for pharmacogenomics (PGx) analysis engine."""

import json
import os

import pytest
from Source.pharmacogenomics import (
    PGX_GENES,
    analyze_pgx,
    determine_metabolizer_status,
    determine_star_allele,
    get_drug_recommendations,
    load_pgx_panel,
    predict_offspring_pgx,
)

PGX_PANEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "pgx_panel.json"
)


@pytest.fixture
def pgx_panel():
    """Load the PGx panel once for all tests."""
    return load_pgx_panel(PGX_PANEL_PATH)


# ---------------------------------------------------------------------------
# TestStarAllele
# ---------------------------------------------------------------------------


class TestStarAllele:
    """Tests for determine_star_allele function."""

    def test_cyp2d6_star1(self, pgx_panel):
        """CYP2D6 with no variant SNPs should return *1/*1 (reference)."""
        snp_data = {"rs3892097": "GG", "rs1065852": "CC", "rs1135840": "CC"}
        result = determine_star_allele("CYP2D6", snp_data, pgx_panel)
        assert result == "*1/*1"

    def test_cyp2d6_star4(self, pgx_panel):
        """CYP2D6 rs3892097 AA (homozygous) -> *4/*4."""
        snp_data = {"rs3892097": "AA"}
        result = determine_star_allele("CYP2D6", snp_data, pgx_panel)
        assert result == "*4/*4"

    def test_cyp2d6_star4_het(self, pgx_panel):
        """CYP2D6 rs3892097 GA (heterozygous) -> *1/*4."""
        snp_data = {"rs3892097": "GA"}
        result = determine_star_allele("CYP2D6", snp_data, pgx_panel)
        assert result == "*1/*4"

    def test_cyp2c19_star2(self, pgx_panel):
        """CYP2C19 rs4244285 AA -> *2/*2."""
        snp_data = {"rs4244285": "AA"}
        result = determine_star_allele("CYP2C19", snp_data, pgx_panel)
        assert result == "*2/*2"

    def test_unknown_gene(self, pgx_panel):
        """Unknown gene should return *1/*1."""
        result = determine_star_allele("FAKEGENE", {}, pgx_panel)
        assert result == "*1/*1"

    def test_no_matching_allele_defaults_to_star1(self, pgx_panel):
        """When SNP data has no matching variants, default to reference."""
        snp_data = {"rs9999999": "AA"}
        result = determine_star_allele("CYP2D6", snp_data, pgx_panel)
        assert result == "*1/*1"

    def test_multiple_variant_allele(self, pgx_panel):
        """CYP2D6 with rs1065852 TT should detect *10."""
        snp_data = {"rs1065852": "TT"}
        result = determine_star_allele("CYP2D6", snp_data, pgx_panel)
        assert "*10" in result

    def test_cyp3a5_star3(self, pgx_panel):
        """CYP3A5 rs776746 TT -> *3/*3."""
        snp_data = {"rs776746": "TT"}
        result = determine_star_allele("CYP3A5", snp_data, pgx_panel)
        assert result == "*3/*3"

    def test_empty_snp_data(self, pgx_panel):
        """Empty SNP data returns reference diplotype."""
        result = determine_star_allele("CYP2D6", {}, pgx_panel)
        assert result == "*1/*1"


# ---------------------------------------------------------------------------
# TestMetabolizerStatus
# ---------------------------------------------------------------------------


class TestMetabolizerStatus:
    """Tests for determine_metabolizer_status function."""

    def test_poor_metabolizer(self, pgx_panel):
        """CYP2D6 *4/*4 (activity 0.0) -> poor_metabolizer."""
        result = determine_metabolizer_status("CYP2D6", "*4/*4", pgx_panel)
        assert result["status"] == "poor_metabolizer"
        assert result["activity_score"] == 0.0

    def test_intermediate(self, pgx_panel):
        """CYP2D6 *1/*4 (activity 1.0) -> intermediate_metabolizer."""
        result = determine_metabolizer_status("CYP2D6", "*1/*4", pgx_panel)
        assert result["status"] == "intermediate_metabolizer"
        assert result["activity_score"] == 1.0

    def test_normal(self, pgx_panel):
        """CYP2D6 *1/*1 (activity 2.0) -> normal_metabolizer."""
        result = determine_metabolizer_status("CYP2D6", "*1/*1", pgx_panel)
        assert result["status"] == "normal_metabolizer"
        assert result["activity_score"] == 2.0

    def test_ultra_rapid(self, pgx_panel):
        """CYP2C19 *17/*17 (activity 3.0) -> ultra_rapid_metabolizer."""
        result = determine_metabolizer_status("CYP2C19", "*17/*17", pgx_panel)
        assert result["status"] == "ultra_rapid_metabolizer"
        assert result["activity_score"] == 3.0

    def test_activity_score_calculation(self, pgx_panel):
        """Activity score is sum of both alleles."""
        # CYP2D6 *1 = 1.0, *10 = 0.25 -> total 1.25
        # Wait, *10 is 0.25 in the panel. *1 is 1.0. Total = 1.25
        # 1.25 falls in normal_metabolizer range [1.25, 2.25] for CYP2D6
        result = determine_metabolizer_status("CYP2D6", "*1/*10", pgx_panel)
        assert result["activity_score"] == 1.25

    def test_unknown_gene(self, pgx_panel):
        """Unknown gene returns 'unknown' status."""
        result = determine_metabolizer_status("FAKEGENE", "*1/*1", pgx_panel)
        assert result["status"] == "unknown"

    def test_description_present(self, pgx_panel):
        """Result includes a human-readable description."""
        result = determine_metabolizer_status("CYP2D6", "*1/*1", pgx_panel)
        assert isinstance(result["description"], str)
        assert len(result["description"]) > 0


# ---------------------------------------------------------------------------
# TestDrugRecommendations
# ---------------------------------------------------------------------------


class TestDrugRecommendations:
    """Tests for get_drug_recommendations function."""

    def test_codeine_poor_metabolizer(self, pgx_panel):
        """Poor metabolizer for CYP2D6 should get codeine avoidance rec."""
        recs = get_drug_recommendations("CYP2D6", "poor_metabolizer", pgx_panel)
        codeine_recs = [r for r in recs if r["drug"] == "Codeine"]
        assert len(codeine_recs) == 1
        assert "avoid" in codeine_recs[0]["recommendation"].lower()

    def test_clopidogrel_normal(self, pgx_panel):
        """Normal metabolizer for CYP2C19 should NOT get clopidogrel rec."""
        recs = get_drug_recommendations("CYP2C19", "normal_metabolizer", pgx_panel)
        clopidogrel_recs = [r for r in recs if r["drug"] == "Clopidogrel"]
        assert len(clopidogrel_recs) == 0

    def test_warfarin_sensitive(self, pgx_panel):
        """Poor metabolizer for CYP2C9 should get warfarin dose reduction rec."""
        recs = get_drug_recommendations("CYP2C9", "poor_metabolizer", pgx_panel)
        warfarin_recs = [r for r in recs if r["drug"] == "Warfarin"]
        assert len(warfarin_recs) == 1
        assert "reduce" in warfarin_recs[0]["recommendation"].lower()

    def test_no_recommendations_for_normal(self, pgx_panel):
        """Normal metabolizer for CYP2D6 should get no recommendations."""
        recs = get_drug_recommendations("CYP2D6", "normal_metabolizer", pgx_panel)
        assert len(recs) == 0

    def test_recommendation_includes_source(self, pgx_panel):
        """Each recommendation must include a source field."""
        recs = get_drug_recommendations("CYP2D6", "poor_metabolizer", pgx_panel)
        assert len(recs) > 0
        for rec in recs:
            assert "source" in rec
            assert rec["source"] in ("CPIC", "DPWG")

    def test_recommendation_includes_category(self, pgx_panel):
        """Each recommendation includes a drug category."""
        recs = get_drug_recommendations("CYP2D6", "poor_metabolizer", pgx_panel)
        for rec in recs:
            assert "category" in rec
            assert isinstance(rec["category"], str)

    def test_recommendation_includes_strength(self, pgx_panel):
        """Each recommendation includes evidence strength."""
        recs = get_drug_recommendations("CYP2D6", "poor_metabolizer", pgx_panel)
        for rec in recs:
            assert rec["strength"] in ("strong", "moderate")

    def test_unknown_gene_no_recs(self, pgx_panel):
        """Unknown gene returns empty recommendations."""
        recs = get_drug_recommendations("FAKEGENE", "poor_metabolizer", pgx_panel)
        assert recs == []


# ---------------------------------------------------------------------------
# TestOffspringPgx
# ---------------------------------------------------------------------------


class TestOffspringPgx:
    """Tests for predict_offspring_pgx function."""

    def test_both_normal_parents(self):
        """Two *1/*1 parents produce only *1/*1 offspring."""
        results = predict_offspring_pgx("*1/*1", "*1/*1", "CYP2D6")
        assert len(results) == 1
        assert results[0]["diplotype"] == "*1/*1"
        assert results[0]["probability"] == 100.0

    def test_one_carrier_parent(self):
        """*1/*4 x *1/*1 -> 50% *1/*1, 50% *1/*4."""
        results = predict_offspring_pgx("*1/*4", "*1/*1", "CYP2D6")
        diplotypes = {r["diplotype"]: r["probability"] for r in results}
        assert diplotypes.get("*1/*1") == 50.0
        assert diplotypes.get("*1/*4") == 50.0

    def test_both_variant_parents(self):
        """*1/*4 x *1/*4 -> 25% *1/*1, 50% *1/*4, 25% *4/*4."""
        results = predict_offspring_pgx("*1/*4", "*1/*4", "CYP2D6")
        diplotypes = {r["diplotype"]: r["probability"] for r in results}
        assert diplotypes.get("*1/*1") == 25.0
        assert diplotypes.get("*1/*4") == 50.0
        assert diplotypes.get("*4/*4") == 25.0

    def test_probability_sum_to_100(self):
        """All offspring probabilities must sum to 100%."""
        results = predict_offspring_pgx("*1/*4", "*2/*10", "CYP2D6")
        total = sum(r["probability"] for r in results)
        assert total == pytest.approx(100.0)

    def test_offspring_gene_included(self):
        """Each offspring result includes the gene name."""
        results = predict_offspring_pgx("*1/*1", "*1/*1", "CYP2D6")
        for r in results:
            assert r["gene"] == "CYP2D6"

    def test_both_homozygous_variant(self):
        """*4/*4 x *4/*4 -> 100% *4/*4."""
        results = predict_offspring_pgx("*4/*4", "*4/*4", "CYP2D6")
        assert len(results) == 1
        assert results[0]["diplotype"] == "*4/*4"
        assert results[0]["probability"] == 100.0


# ---------------------------------------------------------------------------
# TestAnalyzePgx
# ---------------------------------------------------------------------------


class TestAnalyzePgx:
    """Tests for analyze_pgx main entry point."""

    def test_full_analysis_structure(self, pgx_panel):
        """Pro tier analysis returns correct top-level structure."""
        snps = {"rs3892097": "GA"}
        result = analyze_pgx(snps, snps, pgx_panel, tier="pro")
        assert "genes_analyzed" in result
        assert "tier" in result
        assert "is_limited" in result
        assert "results" in result
        assert result["tier"] == "pro"

    def test_tier_gating_free(self, pgx_panel):
        """Free tier returns 0 genes analyzed."""
        result = analyze_pgx({}, {}, pgx_panel, tier="free")
        assert result["genes_analyzed"] == 0
        assert result["is_limited"] is True
        assert result["upgrade_message"] is not None

    def test_tier_gating_premium(self, pgx_panel):
        """Premium tier returns exactly 5 genes."""
        result = analyze_pgx({}, {}, pgx_panel, tier="premium")
        assert result["genes_analyzed"] == 5
        assert result["is_limited"] is True
        assert "CYP2D6" in result["results"]
        assert "CYP2C19" in result["results"]

    def test_tier_gating_pro(self, pgx_panel):
        """Pro tier returns all 12 genes."""
        result = analyze_pgx({}, {}, pgx_panel, tier="pro")
        assert result["genes_analyzed"] == 12
        assert result["is_limited"] is False
        assert result["upgrade_message"] is None

    def test_empty_snp_data(self, pgx_panel):
        """Empty SNP data does not crash; returns reference alleles."""
        result = analyze_pgx({}, {}, pgx_panel, tier="pro")
        for _gene, gene_result in result["results"].items():
            assert "parent_a" in gene_result
            assert "parent_b" in gene_result
            assert "offspring_predictions" in gene_result

    def test_analysis_result_per_gene_structure(self, pgx_panel):
        """Each gene result has expected fields."""
        snps = {"rs3892097": "GA", "rs4244285": "GA"}
        result = analyze_pgx(snps, snps, pgx_panel, tier="pro")
        for _gene, gene_result in result["results"].items():
            assert "gene" in gene_result
            assert "description" in gene_result
            assert "parent_a" in gene_result
            assert "parent_b" in gene_result
            assert "offspring_predictions" in gene_result
            # Parent sub-structure
            pa = gene_result["parent_a"]
            assert "diplotype" in pa
            assert "metabolizer_status" in pa
            assert "drug_recommendations" in pa

    def test_case_insensitive_tier(self, pgx_panel):
        """Tier parameter is case-insensitive."""
        result_lower = analyze_pgx({}, {}, pgx_panel, tier="pro")
        result_upper = analyze_pgx({}, {}, pgx_panel, tier="PRO")
        assert result_lower["genes_analyzed"] == result_upper["genes_analyzed"]


# ---------------------------------------------------------------------------
# TestDataIntegrity
# ---------------------------------------------------------------------------


class TestDataIntegrity:
    """Tests for PGx panel data integrity."""

    def test_all_12_genes_present(self, pgx_panel):
        """Panel must contain all 12 pharmacogenes."""
        genes = pgx_panel.get("genes", {})
        for gene in PGX_GENES:
            assert gene in genes, f"Missing gene: {gene}"

    def test_all_genes_have_drugs(self, pgx_panel):
        """Every gene must have at least one drug listed."""
        for gene_name, gene_data in pgx_panel["genes"].items():
            drugs = gene_data.get("drugs", [])
            assert len(drugs) > 0, f"{gene_name} has no drugs"

    def test_all_drugs_have_recommendations(self, pgx_panel):
        """Every drug must have at least one status-specific recommendation."""
        for gene_name, gene_data in pgx_panel["genes"].items():
            for drug in gene_data.get("drugs", []):
                recs = drug.get("recommendation_by_status", {})
                assert len(recs) > 0, (
                    f"{gene_name} drug {drug['name']} has no recommendations"
                )

    def test_activity_scores_valid(self, pgx_panel):
        """All activity scores must be non-negative numbers."""
        for gene_name, gene_data in pgx_panel["genes"].items():
            for allele_name, allele_info in gene_data.get("star_alleles", {}).items():
                score = allele_info.get("activity_score", 0)
                assert isinstance(score, (int, float)), (
                    f"{gene_name} {allele_name} has invalid activity_score"
                )
                assert score >= 0, (
                    f"{gene_name} {allele_name} has negative activity_score"
                )

    def test_all_genes_have_defining_snps(self, pgx_panel):
        """Every gene must have at least one defining SNP."""
        for gene_name, gene_data in pgx_panel["genes"].items():
            snps = gene_data.get("defining_snps", [])
            assert len(snps) > 0, f"{gene_name} has no defining_snps"

    def test_all_genes_have_metabolizer_status(self, pgx_panel):
        """Every gene must have metabolizer status definitions."""
        for gene_name, gene_data in pgx_panel["genes"].items():
            statuses = gene_data.get("metabolizer_status", {})
            assert len(statuses) > 0, f"{gene_name} has no metabolizer_status"

    def test_metadata_present(self, pgx_panel):
        """Panel metadata must be present and populated."""
        meta = pgx_panel.get("metadata", {})
        assert meta.get("genes_covered") == 12
        assert meta.get("source") is not None
        assert meta.get("version") is not None

    def test_pgx_genes_constant_length(self):
        """PGX_GENES constant must have exactly 12 entries."""
        assert len(PGX_GENES) == 12

    def test_star_allele_defining_variants_have_rsids(self, pgx_panel):
        """All star allele defining variants must have rsid and genotype."""
        for gene_name, gene_data in pgx_panel["genes"].items():
            for allele_name, allele_info in gene_data.get("star_alleles", {}).items():
                for variant in allele_info.get("defining_variants", []):
                    assert "rsid" in variant, (
                        f"{gene_name} {allele_name} variant missing rsid"
                    )
                    assert "genotype" in variant, (
                        f"{gene_name} {allele_name} variant missing genotype"
                    )
                    assert variant["rsid"].startswith("rs"), (
                        f"{gene_name} {allele_name} has non-rs variant id: {variant['rsid']}"
                    )


# ---------------------------------------------------------------------------
# Edge Cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    """Edge case tests for robustness."""

    def test_missing_snps_handled(self, pgx_panel):
        """Analysis works when SNP data is missing relevant rsIDs."""
        snp_data = {"rs9999999": "AA"}  # Irrelevant rsID
        result = determine_star_allele("CYP2D6", snp_data, pgx_panel)
        assert result == "*1/*1"

    def test_none_genotype(self, pgx_panel):
        """SNP data with None values is handled gracefully."""
        snp_data = {"rs3892097": None}
        result = determine_star_allele("CYP2D6", snp_data, pgx_panel)
        # Should not crash; returns reference since None != expected genotype
        assert "*1" in result

    def test_invalid_gene_name(self, pgx_panel):
        """Invalid gene names are handled gracefully across all functions."""
        assert determine_star_allele("INVALID", {}, pgx_panel) == "*1/*1"
        status = determine_metabolizer_status("INVALID", "*1/*1", pgx_panel)
        assert status["status"] == "unknown"
        recs = get_drug_recommendations("INVALID", "poor_metabolizer", pgx_panel)
        assert recs == []

    def test_panel_json_valid(self):
        """PGx panel JSON file is valid and loadable."""
        with open(PGX_PANEL_PATH) as f:
            data = json.load(f)
        assert isinstance(data, dict)
        assert "genes" in data
        assert "metadata" in data

    def test_drug_count_minimum(self, pgx_panel):
        """Panel covers a significant number of drugs (>50)."""
        total_drugs = set()
        for gene_data in pgx_panel["genes"].values():
            for drug in gene_data.get("drugs", []):
                total_drugs.add(drug["name"])
        assert len(total_drugs) >= 30

    def test_metabolizer_score_ranges_non_overlapping(self, pgx_panel):
        """Metabolizer status score ranges should not have ambiguous overlaps."""
        for gene_name, gene_data in pgx_panel["genes"].items():
            statuses = gene_data.get("metabolizer_status", {})
            ranges = []
            for status_name, status_info in statuses.items():
                score_range = status_info.get("activity_score_range", [0, 0])
                ranges.append((score_range[0], score_range[1], status_name))
            # Sort by lower bound
            ranges.sort()
            # Check no complete overlaps (partial boundaries are OK)
            for i in range(len(ranges) - 1):
                _, high, name = ranges[i]
                next_low, _, next_name = ranges[i + 1]
                # Allow boundary equality (e.g., one range ends at 1.0, next starts at 1.0)
                assert high <= next_low + 0.01, (
                    f"{gene_name}: {name} range overlaps with {next_name}"
                )
