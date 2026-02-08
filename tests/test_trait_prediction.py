"""
Comprehensive tests for trait_prediction.py

Tests cover:
- get_parent_alleles: valid and invalid inputs
- punnett_square: various allele combinations
- normalize_genotype: ordering normalization
- map_genotype_to_phenotype: string format, dict format, missing genotypes
- predict_trait: end-to-end with both phenotype_map formats
- predict_offspring_genotypes: genotype probability calculation
- analyze_traits: full pipeline with mock data
- Crash regression: dict phenotype_map values must NOT cause TypeError
"""

import json
import os
import tempfile

import pytest
from Source.trait_prediction import (
    _extract_phenotype_string,
    analyze_traits,
    format_prediction_report,
    get_parent_alleles,
    map_genotype_to_phenotype,
    normalize_genotype,
    predict_offspring_genotypes,
    predict_trait,
    punnett_square,
)

# ---------------------------------------------------------------------------
# get_parent_alleles
# ---------------------------------------------------------------------------

class TestGetParentAlleles:
    """Tests for get_parent_alleles()."""

    def test_heterozygous(self):
        assert get_parent_alleles("AG") == ("A", "G")

    def test_homozygous(self):
        assert get_parent_alleles("AA") == ("A", "A")

    def test_different_alleles(self):
        assert get_parent_alleles("CT") == ("C", "T")

    def test_lowercase_input(self):
        """Function should accept lowercase (no validation on case)."""
        assert get_parent_alleles("ag") == ("a", "g")

    def test_single_char_raises(self):
        with pytest.raises(ValueError, match="Invalid genotype format"):
            get_parent_alleles("A")

    def test_three_chars_raises(self):
        with pytest.raises(ValueError, match="Invalid genotype format"):
            get_parent_alleles("AAG")

    def test_empty_string_raises(self):
        with pytest.raises(ValueError, match="Invalid genotype format"):
            get_parent_alleles("")


# ---------------------------------------------------------------------------
# punnett_square
# ---------------------------------------------------------------------------

class TestPunnettSquare:
    """Tests for punnett_square()."""

    def test_both_homozygous_same(self):
        """AA x AA -> 100% AA."""
        result = punnett_square(("A", "A"), ("A", "A"))
        assert result == {"AA": 1.0}

    def test_both_homozygous_different(self):
        """AA x GG -> 100% AG."""
        result = punnett_square(("A", "A"), ("G", "G"))
        assert result == {"AG": 1.0}

    def test_heterozygous_cross(self):
        """AG x AG -> 25% AA, 50% AG, 25% GG."""
        result = punnett_square(("A", "G"), ("A", "G"))
        assert result == pytest.approx({"AA": 0.25, "AG": 0.5, "GG": 0.25})

    def test_heterozygous_x_homozygous(self):
        """AG x GG -> 50% AG, 50% GG."""
        result = punnett_square(("A", "G"), ("G", "G"))
        assert result == pytest.approx({"AG": 0.5, "GG": 0.5})

    def test_probabilities_sum_to_one(self):
        """All probabilities must sum to 1.0."""
        result = punnett_square(("C", "T"), ("A", "G"))
        total = sum(result.values())
        assert total == pytest.approx(1.0)

    def test_genotype_normalization(self):
        """Genotypes should be normalized (sorted alphabetically)."""
        result = punnett_square(("G", "A"), ("G", "A"))
        # "GA" should be stored as "AG"
        assert "AG" in result
        assert "GA" not in result

    def test_ct_cross(self):
        """CT x CT -> 25% CC, 50% CT, 25% TT."""
        result = punnett_square(("C", "T"), ("C", "T"))
        assert result == pytest.approx({"CC": 0.25, "CT": 0.5, "TT": 0.25})


# ---------------------------------------------------------------------------
# normalize_genotype
# ---------------------------------------------------------------------------

class TestNormalizeGenotype:
    """Tests for normalize_genotype()."""

    def test_already_sorted(self):
        assert normalize_genotype("AG") == "AG"

    def test_needs_sorting(self):
        assert normalize_genotype("GA") == "AG"

    def test_homozygous(self):
        assert normalize_genotype("AA") == "AA"

    def test_ct_pair(self):
        assert normalize_genotype("TC") == "CT"

    def test_same_alleles(self):
        assert normalize_genotype("GG") == "GG"


# ---------------------------------------------------------------------------
# _extract_phenotype_string
# ---------------------------------------------------------------------------

class TestExtractPhenotypeString:
    """Tests for _extract_phenotype_string() helper."""

    def test_string_value(self):
        assert _extract_phenotype_string("Brown Eyes") == "Brown Eyes"

    def test_dict_value(self):
        value = {
            "phenotype": "Brown Eyes",
            "description": "Very high likelihood",
            "probability": "high",
        }
        assert _extract_phenotype_string(value) == "Brown Eyes"

    def test_dict_with_extra_fields(self):
        value = {
            "phenotype": "Curly Hair",
            "description": "Strong curl pattern",
            "probability": "medium",
            "extra_field": "something",
        }
        assert _extract_phenotype_string(value) == "Curly Hair"


# ---------------------------------------------------------------------------
# map_genotype_to_phenotype
# ---------------------------------------------------------------------------

class TestMapGenotypeToPhenotype:
    """Tests for map_genotype_to_phenotype()."""

    def test_string_format_direct_match(self):
        """Legacy string format: phenotype_map values are strings."""
        phenotype_map = {"GG": "Brown Eyes", "AG": "Green Eyes", "AA": "Blue Eyes"}
        assert map_genotype_to_phenotype("GG", phenotype_map) == "Brown Eyes"

    def test_string_format_normalized_match(self):
        """Lookup via normalized genotype when original not in map."""
        phenotype_map = {"AG": "Green Eyes"}
        # "GA" should normalize to "AG" and match
        assert map_genotype_to_phenotype("GA", phenotype_map) == "Green Eyes"

    def test_string_format_no_match(self):
        phenotype_map = {"GG": "Brown Eyes"}
        assert map_genotype_to_phenotype("AA", phenotype_map) is None

    def test_dict_format_direct_match(self):
        """Rich dict format: phenotype_map values are dicts with 'phenotype' key."""
        phenotype_map = {
            "GG": {
                "phenotype": "Brown Eyes",
                "description": "Very high likelihood of brown eyes",
                "probability": "high",
            },
            "AG": {
                "phenotype": "Green/Hazel Eyes",
                "description": "Intermediate pigmentation",
                "probability": "high",
            },
            "AA": {
                "phenotype": "Blue Eyes",
                "description": "Very high likelihood of blue eyes",
                "probability": "high",
            },
        }
        assert map_genotype_to_phenotype("GG", phenotype_map) == "Brown Eyes"
        assert map_genotype_to_phenotype("AG", phenotype_map) == "Green/Hazel Eyes"
        assert map_genotype_to_phenotype("AA", phenotype_map) == "Blue Eyes"

    def test_dict_format_normalized_match(self):
        """Rich dict format with genotype normalization."""
        phenotype_map = {
            "AG": {
                "phenotype": "Green/Hazel Eyes",
                "description": "Intermediate pigmentation",
                "probability": "high",
            },
        }
        # "GA" normalizes to "AG"
        assert map_genotype_to_phenotype("GA", phenotype_map) == "Green/Hazel Eyes"

    def test_dict_format_no_match(self):
        phenotype_map = {
            "GG": {
                "phenotype": "Brown Eyes",
                "description": "desc",
                "probability": "high",
            },
        }
        assert map_genotype_to_phenotype("AA", phenotype_map) is None

    def test_returns_string_not_dict(self):
        """Regression test: must return a string, never a dict."""
        phenotype_map = {
            "GG": {
                "phenotype": "Brown Eyes",
                "description": "desc",
                "probability": "high",
            },
        }
        result = map_genotype_to_phenotype("GG", phenotype_map)
        assert isinstance(result, str)
        assert result == "Brown Eyes"


# ---------------------------------------------------------------------------
# predict_offspring_genotypes
# ---------------------------------------------------------------------------

class TestPredictOffspringGenotypes:
    """Tests for predict_offspring_genotypes()."""

    def test_basic_cross(self):
        result = predict_offspring_genotypes("AG", "AG")
        assert result == pytest.approx({"AA": 0.25, "AG": 0.5, "GG": 0.25})

    def test_homozygous_parents(self):
        result = predict_offspring_genotypes("AA", "GG")
        assert result == {"AG": 1.0}

    def test_same_homozygous(self):
        result = predict_offspring_genotypes("GG", "GG")
        assert result == {"GG": 1.0}

    def test_heterozygous_x_homozygous(self):
        result = predict_offspring_genotypes("AG", "AA")
        assert result == pytest.approx({"AA": 0.5, "AG": 0.5})


# ---------------------------------------------------------------------------
# predict_trait — end-to-end
# ---------------------------------------------------------------------------

class TestPredictTrait:
    """Tests for predict_trait() end-to-end."""

    def _make_trait_entry_dict_format(self):
        """Create a trait entry using the rich dict phenotype_map format."""
        return {
            "rsid": "rs12913832",
            "trait": "Eye Color",
            "gene": "HERC2/OCA2",
            "chromosome": "15",
            "inheritance": "codominant",
            "alleles": {"ref": "G", "alt": "A"},
            "phenotype_map": {
                "GG": {
                    "phenotype": "Brown Eyes",
                    "description": "Very high likelihood of brown eyes (>95%)",
                    "probability": "high",
                },
                "AG": {
                    "phenotype": "Green/Hazel Eyes",
                    "description": "Intermediate pigmentation",
                    "probability": "high",
                },
                "AA": {
                    "phenotype": "Blue Eyes",
                    "description": "Very high likelihood of blue eyes (>90%)",
                    "probability": "high",
                },
            },
            "description": "Primary determinant of eye color variation.",
            "confidence": "high",
        }

    def _make_trait_entry_string_format(self):
        """Create a trait entry using the legacy string phenotype_map format."""
        return {
            "rsid": "rs12913832",
            "trait": "Eye Color",
            "gene": "HERC2/OCA2",
            "chromosome": "15",
            "inheritance": "codominant",
            "alleles": {"ref": "G", "alt": "A"},
            "phenotype_map": {
                "GG": "Brown Eyes",
                "AG": "Green/Hazel Eyes",
                "AA": "Blue Eyes",
            },
            "description": "Primary determinant of eye color variation.",
            "confidence": "high",
        }

    def test_dict_format_success(self):
        """End-to-end test with rich dict phenotype_map (the crash scenario)."""
        parent_a = {"rs12913832": "AG"}
        parent_b = {"rs12913832": "AG"}
        trait_entry = self._make_trait_entry_dict_format()

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result is not None
        assert result["status"] == "success"
        assert result["trait"] == "Eye Color"
        assert result["gene"] == "HERC2/OCA2"
        assert result["rsid"] == "rs12913832"
        assert result["chromosome"] == "15"
        assert result["confidence"] == "high"

        probs = result["offspring_probabilities"]
        # AG x AG -> 25% AA, 50% AG, 25% GG
        assert probs["Blue Eyes"] == pytest.approx(25.0)
        assert probs["Green/Hazel Eyes"] == pytest.approx(50.0)
        assert probs["Brown Eyes"] == pytest.approx(25.0)

        # Verify all values are floats (not dicts)
        for val in probs.values():
            assert isinstance(val, float)

    def test_dict_format_phenotype_details_included(self):
        """Verify phenotype_details is included when using rich format."""
        parent_a = {"rs12913832": "GG"}
        parent_b = {"rs12913832": "GG"}
        trait_entry = self._make_trait_entry_dict_format()

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result["status"] == "success"
        assert "phenotype_details" in result

        details = result["phenotype_details"]
        assert "Brown Eyes" in details
        assert details["Brown Eyes"]["description"] == "Very high likelihood of brown eyes (>95%)"
        assert details["Brown Eyes"]["probability"] == "high"

    def test_string_format_success(self):
        """End-to-end test with legacy string phenotype_map."""
        parent_a = {"rs12913832": "AG"}
        parent_b = {"rs12913832": "AG"}
        trait_entry = self._make_trait_entry_string_format()

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result is not None
        assert result["status"] == "success"

        probs = result["offspring_probabilities"]
        assert probs["Blue Eyes"] == pytest.approx(25.0)
        assert probs["Green/Hazel Eyes"] == pytest.approx(50.0)
        assert probs["Brown Eyes"] == pytest.approx(25.0)

    def test_string_format_no_phenotype_details(self):
        """Legacy string format should NOT include phenotype_details."""
        parent_a = {"rs12913832": "GG"}
        parent_b = {"rs12913832": "GG"}
        trait_entry = self._make_trait_entry_string_format()

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result["status"] == "success"
        assert "phenotype_details" not in result

    def test_parent_a_missing_snp(self):
        parent_a = {}  # Missing rs12913832
        parent_b = {"rs12913832": "AG"}
        trait_entry = self._make_trait_entry_dict_format()

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result["status"] == "missing"
        assert "Parent A" in result["note"]

    def test_parent_b_missing_snp(self):
        parent_a = {"rs12913832": "AG"}
        parent_b = {}  # Missing rs12913832
        trait_entry = self._make_trait_entry_dict_format()

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result["status"] == "missing"
        assert "Parent B" in result["note"]

    def test_unmapped_genotypes(self):
        """When phenotype_map is incomplete, unmapped genotypes noted."""
        trait_entry = {
            "rsid": "rs999",
            "trait": "Test Trait",
            "gene": "GENE",
            "phenotype_map": {
                "AA": "Phenotype A",
                # AG and GG are missing from the map
            },
        }
        parent_a = {"rs999": "AG"}
        parent_b = {"rs999": "AG"}

        result = predict_trait(parent_a, parent_b, trait_entry)

        # AA is 25%, AG and GG are unmapped
        assert result["status"] == "success"
        assert "Phenotype A" in result["offspring_probabilities"]
        assert "note" in result
        assert "unmapped" in result["note"]

    def test_all_genotypes_unmapped(self):
        """When NO genotypes map, return error status."""
        trait_entry = {
            "rsid": "rs999",
            "trait": "Test Trait",
            "gene": "GENE",
            "phenotype_map": {
                "CC": "Phenotype C",  # Not reachable from AG x AG parents
            },
        }
        parent_a = {"rs999": "AG"}
        parent_b = {"rs999": "AG"}

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result["status"] == "error"
        assert "not found in phenotype map" in result["note"]

    def test_homozygous_parents_single_outcome(self):
        """GG x GG -> 100% Brown Eyes."""
        parent_a = {"rs12913832": "GG"}
        parent_b = {"rs12913832": "GG"}
        trait_entry = self._make_trait_entry_dict_format()

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result["status"] == "success"
        probs = result["offspring_probabilities"]
        assert len(probs) == 1
        assert probs["Brown Eyes"] == pytest.approx(100.0)


# ---------------------------------------------------------------------------
# Crash regression test (the specific bug scenario)
# ---------------------------------------------------------------------------

class TestCrashRegression:
    """
    Regression tests for the dict-as-dict-key crash.

    The original bug: map_genotype_to_phenotype() returned the full dict
    value from phenotype_map, which was then used as a dict key in
    predict_trait() at line 187:
        phenotype_probs[phenotype] = phenotype_probs.get(phenotype, 0.0) + prob
    This caused: TypeError: unhashable type: 'dict'
    """

    def test_dict_phenotype_map_does_not_crash(self):
        """The exact crash scenario from the bug report."""
        phenotype_map = {
            "GG": {
                "phenotype": "Brown Eyes",
                "description": "Very high likelihood of brown eyes (>95%)",
                "probability": "high",
            },
            "AG": {
                "phenotype": "Green/Hazel Eyes",
                "description": "Intermediate pigmentation",
                "probability": "high",
            },
            "AA": {
                "phenotype": "Blue Eyes",
                "description": "Very high likelihood of blue eyes (>90%)",
                "probability": "high",
            },
        }

        # This was crashing with TypeError: unhashable type: 'dict'
        result = map_genotype_to_phenotype("GG", phenotype_map)
        assert isinstance(result, str)
        assert result == "Brown Eyes"

        # The returned string must be usable as a dict key
        phenotype_probs = {}
        phenotype_probs[result] = phenotype_probs.get(result, 0.0) + 0.25
        assert phenotype_probs["Brown Eyes"] == 0.25

    def test_full_predict_trait_with_dict_map_no_crash(self):
        """Full end-to-end: predict_trait must not crash with dict phenotype_map."""
        trait_entry = {
            "rsid": "rs12913832",
            "trait": "Eye Color",
            "gene": "HERC2/OCA2",
            "chromosome": "15",
            "inheritance": "codominant",
            "phenotype_map": {
                "GG": {
                    "phenotype": "Brown Eyes",
                    "description": "Very high likelihood of brown eyes (>95%)",
                    "probability": "high",
                },
                "AG": {
                    "phenotype": "Green/Hazel Eyes",
                    "description": "Intermediate pigmentation",
                    "probability": "high",
                },
                "AA": {
                    "phenotype": "Blue Eyes",
                    "description": "Very high likelihood of blue eyes (>90%)",
                    "probability": "high",
                },
            },
            "description": "Eye color determination.",
            "confidence": "high",
        }
        parent_a = {"rs12913832": "AG"}
        parent_b = {"rs12913832": "GG"}

        # This must NOT raise TypeError: unhashable type: 'dict'
        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result is not None
        assert result["status"] == "success"

        # offspring_probabilities keys must all be strings
        for key in result["offspring_probabilities"]:
            assert isinstance(key, str), f"Key {key!r} should be str, got {type(key)}"

        # offspring_probabilities values must all be floats
        for val in result["offspring_probabilities"].values():
            assert isinstance(val, float), f"Value {val!r} should be float, got {type(val)}"


# ---------------------------------------------------------------------------
# analyze_traits — integration with file I/O
# ---------------------------------------------------------------------------

class TestAnalyzeTraits:
    """Tests for analyze_traits() with mock JSON files."""

    def _create_temp_trait_db(self, entries):
        """Write trait entries to a temp JSON file and return the path."""
        fd, path = tempfile.mkstemp(suffix=".json")
        with os.fdopen(fd, "w") as f:
            json.dump(entries, f)
        return path

    def test_analyze_with_dict_format(self):
        """analyze_traits with rich dict phenotype_map entries."""
        entries = [
            {
                "rsid": "rs12913832",
                "trait": "Eye Color",
                "gene": "HERC2/OCA2",
                "chromosome": "15",
                "inheritance": "codominant",
                "alleles": {"ref": "G", "alt": "A"},
                "phenotype_map": {
                    "GG": {
                        "phenotype": "Brown Eyes",
                        "description": "desc",
                        "probability": "high",
                    },
                    "AG": {
                        "phenotype": "Green/Hazel Eyes",
                        "description": "desc",
                        "probability": "high",
                    },
                    "AA": {
                        "phenotype": "Blue Eyes",
                        "description": "desc",
                        "probability": "high",
                    },
                },
                "description": "Eye color.",
                "confidence": "high",
            },
        ]
        db_path = self._create_temp_trait_db(entries)
        try:
            parent_a = {"rs12913832": "AG"}
            parent_b = {"rs12913832": "GG"}

            results = analyze_traits(parent_a, parent_b, db_path)

            assert len(results) == 1
            assert results[0]["status"] == "success"
            assert results[0]["trait"] == "Eye Color"
        finally:
            os.unlink(db_path)

    def test_analyze_with_string_format(self):
        """analyze_traits with legacy string phenotype_map entries."""
        entries = [
            {
                "rsid": "rs999",
                "trait": "Hair Type",
                "gene": "TCHH",
                "chromosome": "1",
                "inheritance": "additive",
                "alleles": {"ref": "C", "alt": "T"},
                "phenotype_map": {
                    "CC": "Straight Hair",
                    "CT": "Wavy Hair",
                    "TT": "Curly Hair",
                },
                "description": "Hair type.",
                "confidence": "medium",
            },
        ]
        db_path = self._create_temp_trait_db(entries)
        try:
            parent_a = {"rs999": "CT"}
            parent_b = {"rs999": "CT"}

            results = analyze_traits(parent_a, parent_b, db_path)

            assert len(results) == 1
            assert results[0]["status"] == "success"
            probs = results[0]["offspring_probabilities"]
            assert probs["Straight Hair"] == pytest.approx(25.0)
            assert probs["Wavy Hair"] == pytest.approx(50.0)
            assert probs["Curly Hair"] == pytest.approx(25.0)
        finally:
            os.unlink(db_path)

    def test_analyze_with_mixed_formats(self):
        """analyze_traits with both string and dict format entries."""
        entries = [
            {
                "rsid": "rs001",
                "trait": "Trait A",
                "gene": "GENE_A",
                "phenotype_map": {
                    "AA": "Phenotype A1",
                    "AG": "Phenotype A2",
                    "GG": "Phenotype A3",
                },
            },
            {
                "rsid": "rs002",
                "trait": "Trait B",
                "gene": "GENE_B",
                "phenotype_map": {
                    "CC": {
                        "phenotype": "Phenotype B1",
                        "description": "desc",
                        "probability": "high",
                    },
                    "CT": {
                        "phenotype": "Phenotype B2",
                        "description": "desc",
                        "probability": "medium",
                    },
                    "TT": {
                        "phenotype": "Phenotype B3",
                        "description": "desc",
                        "probability": "low",
                    },
                },
            },
        ]
        db_path = self._create_temp_trait_db(entries)
        try:
            parent_a = {"rs001": "AG", "rs002": "CT"}
            parent_b = {"rs001": "AG", "rs002": "CT"}

            results = analyze_traits(parent_a, parent_b, db_path)

            assert len(results) == 2
            assert all(r["status"] == "success" for r in results)

            # Trait A (string format) should NOT have phenotype_details
            trait_a = [r for r in results if r["trait"] == "Trait A"][0]
            assert "phenotype_details" not in trait_a

            # Trait B (dict format) should have phenotype_details
            trait_b = [r for r in results if r["trait"] == "Trait B"][0]
            assert "phenotype_details" in trait_b
        finally:
            os.unlink(db_path)

    def test_analyze_no_matching_snps(self):
        """analyze_traits when parents have none of the required SNPs."""
        entries = [
            {
                "rsid": "rs999",
                "trait": "Test",
                "gene": "GENE",
                "phenotype_map": {"AA": "Pheno"},
            },
        ]
        db_path = self._create_temp_trait_db(entries)
        try:
            parent_a = {"rs000": "AG"}
            parent_b = {"rs000": "AG"}

            results = analyze_traits(parent_a, parent_b, db_path)

            assert len(results) == 1
            assert results[0]["status"] == "missing"
        finally:
            os.unlink(db_path)

    def test_analyze_empty_database(self):
        """analyze_traits with empty trait database."""
        db_path = self._create_temp_trait_db([])
        try:
            results = analyze_traits({"rs1": "AG"}, {"rs1": "AG"}, db_path)
            assert results == []
        finally:
            os.unlink(db_path)

    def test_analyze_partial_snp_coverage(self):
        """Some traits match, some are missing — mixed results."""
        entries = [
            {
                "rsid": "rs001",
                "trait": "Trait A",
                "gene": "GENE_A",
                "phenotype_map": {"AA": "Pheno A1", "AG": "Pheno A2", "GG": "Pheno A3"},
            },
            {
                "rsid": "rs002",
                "trait": "Trait B",
                "gene": "GENE_B",
                "phenotype_map": {"CC": "Pheno B1", "CT": "Pheno B2", "TT": "Pheno B3"},
            },
        ]
        db_path = self._create_temp_trait_db(entries)
        try:
            # Parents only have rs001, not rs002
            parent_a = {"rs001": "AG"}
            parent_b = {"rs001": "GG"}

            results = analyze_traits(parent_a, parent_b, db_path)

            assert len(results) == 2
            statuses = {r["trait"]: r["status"] for r in results}
            assert statuses["Trait A"] == "success"
            assert statuses["Trait B"] == "missing"
        finally:
            os.unlink(db_path)

    def test_analyze_multiple_traits_all_success(self):
        """Multiple traits where both parents have all required SNPs."""
        entries = [
            {
                "rsid": "rs001",
                "trait": "Trait A",
                "gene": "GENE_A",
                "phenotype_map": {"AA": "A1", "AG": "A2", "GG": "A3"},
            },
            {
                "rsid": "rs002",
                "trait": "Trait B",
                "gene": "GENE_B",
                "phenotype_map": {"CC": "B1", "CT": "B2", "TT": "B3"},
            },
            {
                "rsid": "rs003",
                "trait": "Trait C",
                "gene": "GENE_C",
                "phenotype_map": {"AA": "C1", "AT": "C2", "TT": "C3"},
            },
        ]
        db_path = self._create_temp_trait_db(entries)
        try:
            parent_a = {"rs001": "AG", "rs002": "CT", "rs003": "AT"}
            parent_b = {"rs001": "GG", "rs002": "CC", "rs003": "TT"}

            results = analyze_traits(parent_a, parent_b, db_path)

            assert len(results) == 3
            assert all(r["status"] == "success" for r in results)
        finally:
            os.unlink(db_path)


# ---------------------------------------------------------------------------
# Expanded Punnett square edge cases
# ---------------------------------------------------------------------------

class TestPunnettSquareEdgeCases:
    """Additional edge cases for punnett_square()."""

    def test_all_four_alleles_different(self):
        """CT x AG -> 4 unique genotypes each at 25%."""
        result = punnett_square(("C", "T"), ("A", "G"))
        assert len(result) == 4
        assert result == pytest.approx({"AC": 0.25, "CG": 0.25, "AT": 0.25, "GT": 0.25})

    def test_homozygous_x_heterozygous_reversed(self):
        """AA x AG -> 50% AA, 50% AG (reversed parent order)."""
        result = punnett_square(("A", "A"), ("A", "G"))
        assert result == pytest.approx({"AA": 0.5, "AG": 0.5})

    def test_symmetry(self):
        """Swapping parents should give the same result."""
        result_ab = punnett_square(("A", "G"), ("C", "T"))
        result_ba = punnett_square(("C", "T"), ("A", "G"))
        assert result_ab == result_ba

    @pytest.mark.parametrize("alleles_a,alleles_b", [
        (("A", "A"), ("A", "A")),
        (("A", "G"), ("A", "G")),
        (("C", "T"), ("A", "G")),
        (("G", "G"), ("A", "G")),
        (("T", "T"), ("C", "C")),
    ])
    def test_probabilities_always_sum_to_one(self, alleles_a, alleles_b):
        """Probabilities must sum to 1.0 for any input combination."""
        result = punnett_square(alleles_a, alleles_b)
        assert sum(result.values()) == pytest.approx(1.0)

    def test_homozygous_different_alleles_cross(self):
        """CC x TT -> 100% CT."""
        result = punnett_square(("C", "C"), ("T", "T"))
        assert result == {"CT": 1.0}
        assert len(result) == 1


# ---------------------------------------------------------------------------
# predict_offspring_genotypes — expanded
# ---------------------------------------------------------------------------

class TestPredictOffspringGenotypesExpanded:
    """Additional tests for predict_offspring_genotypes()."""

    def test_invalid_genotype_single_char_raises(self):
        """Invalid genotype length should propagate ValueError."""
        with pytest.raises(ValueError, match="Invalid genotype format"):
            predict_offspring_genotypes("A", "AG")

    def test_invalid_genotype_three_chars_raises(self):
        with pytest.raises(ValueError, match="Invalid genotype format"):
            predict_offspring_genotypes("AG", "AGG")

    def test_ct_x_ag_four_outcomes(self):
        """CT x AG should produce 4 distinct genotypes."""
        result = predict_offspring_genotypes("CT", "AG")
        assert len(result) == 4
        for prob in result.values():
            assert prob == pytest.approx(0.25)


# ---------------------------------------------------------------------------
# predict_trait — expanded edge cases
# ---------------------------------------------------------------------------

class TestPredictTraitExpanded:
    """Extended predict_trait() tests for edge cases and structure validation."""

    def _make_trait_entry(self, **overrides):
        """Build a trait entry with sensible defaults, applying overrides."""
        entry = {
            "rsid": "rs100",
            "trait": "Test Trait",
            "gene": "TEST_GENE",
            "chromosome": "7",
            "inheritance": "dominant",
            "alleles": {"ref": "A", "alt": "G"},
            "phenotype_map": {
                "AA": "Phenotype Dominant",
                "AG": "Phenotype Carrier",
                "GG": "Phenotype Recessive",
            },
            "description": "A test trait for unit testing.",
            "confidence": "medium",
        }
        entry.update(overrides)
        return entry

    def test_success_result_has_all_required_fields(self):
        """Verify every required field is present in a successful result."""
        parent_a = {"rs100": "AG"}
        parent_b = {"rs100": "GG"}
        trait_entry = self._make_trait_entry()

        result = predict_trait(parent_a, parent_b, trait_entry)

        required_fields = [
            "trait", "gene", "rsid", "chromosome", "description",
            "confidence", "inheritance", "status", "parent_a_genotype",
            "parent_b_genotype", "offspring_probabilities",
        ]
        for field in required_fields:
            assert field in result, f"Missing required field: {field}"

    def test_success_result_field_types(self):
        """Verify field types in a successful result."""
        parent_a = {"rs100": "AG"}
        parent_b = {"rs100": "AG"}
        trait_entry = self._make_trait_entry()

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert isinstance(result["trait"], str)
        assert isinstance(result["gene"], str)
        assert isinstance(result["rsid"], str)
        assert isinstance(result["status"], str)
        assert isinstance(result["offspring_probabilities"], dict)
        assert result["status"] == "success"

    def test_missing_optional_fields_use_defaults(self):
        """Trait entry missing optional fields should use defaults."""
        trait_entry = {
            "rsid": "rs200",
            "trait": "Minimal Trait",
            "gene": "MIN_GENE",
            "phenotype_map": {"AA": "Pheno A", "AG": "Pheno AG", "GG": "Pheno G"},
        }
        parent_a = {"rs200": "AA"}
        parent_b = {"rs200": "GG"}

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result["status"] == "success"
        assert result["chromosome"] == "Unknown"
        assert result["confidence"] == "Unknown"
        assert result["inheritance"] == "Unknown"
        assert result["description"] == ""

    def test_both_parents_missing_snp(self):
        """When both parents lack the SNP, Parent A's missing is reported first."""
        parent_a = {}
        parent_b = {}
        trait_entry = self._make_trait_entry()

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result["status"] == "missing"
        assert "Parent A" in result["note"]

    def test_missing_result_structure(self):
        """Missing result should have trait, gene, rsid, status, and note."""
        parent_a = {}
        parent_b = {"rs100": "AG"}
        trait_entry = self._make_trait_entry()

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result["trait"] == "Test Trait"
        assert result["gene"] == "TEST_GENE"
        assert result["rsid"] == "rs100"
        assert result["status"] == "missing"
        assert "note" in result

    def test_error_result_includes_parent_genotypes(self):
        """Error results should include parent genotype information."""
        trait_entry = self._make_trait_entry(
            phenotype_map={"CC": "Unreachable Phenotype"},
        )
        parent_a = {"rs100": "AG"}
        parent_b = {"rs100": "AG"}

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result["status"] == "error"
        assert result["parent_a_genotype"] == "AG"
        assert result["parent_b_genotype"] == "AG"

    def test_phenotype_probability_aggregation(self):
        """Two genotypes mapping to the same phenotype should aggregate probabilities."""
        trait_entry = self._make_trait_entry(
            phenotype_map={
                "AA": "Common Phenotype",
                "AG": "Common Phenotype",  # Same phenotype as AA
                "GG": "Rare Phenotype",
            },
        )
        parent_a = {"rs100": "AG"}
        parent_b = {"rs100": "AG"}

        result = predict_trait(parent_a, parent_b, trait_entry)

        assert result["status"] == "success"
        probs = result["offspring_probabilities"]
        # AA (25%) + AG (50%) = 75% for Common Phenotype
        assert probs["Common Phenotype"] == pytest.approx(75.0)
        assert probs["Rare Phenotype"] == pytest.approx(25.0)

    def test_offspring_probabilities_sum_to_100(self):
        """Offspring probabilities should sum to 100% when all genotypes are mapped."""
        parent_a = {"rs100": "AG"}
        parent_b = {"rs100": "AG"}
        trait_entry = self._make_trait_entry()

        result = predict_trait(parent_a, parent_b, trait_entry)

        total = sum(result["offspring_probabilities"].values())
        assert total == pytest.approx(100.0)

    def test_confidence_values_propagated(self):
        """Confidence from trait entry should be propagated to result."""
        for confidence in ["high", "medium", "low"]:
            trait_entry = self._make_trait_entry(confidence=confidence)
            parent_a = {"rs100": "AA"}
            parent_b = {"rs100": "GG"}

            result = predict_trait(parent_a, parent_b, trait_entry)

            assert result["confidence"] == confidence

    def test_inheritance_values_propagated(self):
        """Inheritance pattern should be propagated to result."""
        for inheritance in ["dominant", "recessive", "codominant", "additive"]:
            trait_entry = self._make_trait_entry(inheritance=inheritance)
            parent_a = {"rs100": "AA"}
            parent_b = {"rs100": "GG"}

            result = predict_trait(parent_a, parent_b, trait_entry)

            assert result["inheritance"] == inheritance


# ---------------------------------------------------------------------------
# format_prediction_report — new test class
# ---------------------------------------------------------------------------

class TestFormatPredictionReport:
    """Tests for format_prediction_report()."""

    def test_report_with_successful_predictions(self):
        """Report should include successful predictions section."""
        predictions = [
            {
                "trait": "Eye Color",
                "gene": "HERC2",
                "rsid": "rs12913832",
                "chromosome": "15",
                "inheritance": "codominant",
                "confidence": "high",
                "description": "Eye color determination.",
                "status": "success",
                "parent_a_genotype": "AG",
                "parent_b_genotype": "GG",
                "offspring_probabilities": {"Brown Eyes": 50.0, "Green Eyes": 50.0},
            },
        ]

        report = format_prediction_report(predictions)

        assert "OFFSPRING TRAIT PREDICTION REPORT" in report
        assert "PREDICTED TRAITS (1)" in report
        assert "Eye Color" in report
        assert "HERC2" in report
        assert "Brown Eyes: 50.0%" in report
        assert "Green Eyes: 50.0%" in report
        assert "Successful predictions: 1" in report
        assert "Total traits analyzed: 1" in report

    def test_report_with_missing_predictions(self):
        """Report should include missing data section."""
        predictions = [
            {
                "trait": "Hair Type",
                "gene": "TCHH",
                "rsid": "rs999",
                "status": "missing",
                "note": "Parent A missing this SNP",
            },
        ]

        report = format_prediction_report(predictions)

        assert "MISSING DATA (1)" in report
        assert "Hair Type (TCHH): Parent A missing this SNP" in report
        assert "Missing data: 1" in report

    def test_report_with_error_predictions(self):
        """Report should include errors section."""
        predictions = [
            {
                "trait": "Test Trait",
                "gene": "GENE",
                "rsid": "rs123",
                "status": "error",
                "note": "Genotypes ['XX'] not found in phenotype map",
            },
        ]

        report = format_prediction_report(predictions)

        assert "ERRORS (1)" in report
        assert "Test Trait (GENE)" in report
        assert "Errors: 1" in report

    def test_report_with_mixed_statuses(self):
        """Report with success, missing, and error predictions."""
        predictions = [
            {
                "trait": "Trait A",
                "gene": "GENE_A",
                "rsid": "rs001",
                "chromosome": "1",
                "inheritance": "dominant",
                "confidence": "high",
                "description": "Trait A desc.",
                "status": "success",
                "parent_a_genotype": "AA",
                "parent_b_genotype": "AA",
                "offspring_probabilities": {"Pheno A": 100.0},
            },
            {
                "trait": "Trait B",
                "gene": "GENE_B",
                "rsid": "rs002",
                "status": "missing",
                "note": "Parent B missing this SNP",
            },
            {
                "trait": "Trait C",
                "gene": "GENE_C",
                "rsid": "rs003",
                "status": "error",
                "note": "Genotypes not found",
            },
        ]

        report = format_prediction_report(predictions)

        assert "PREDICTED TRAITS (1)" in report
        assert "MISSING DATA (1)" in report
        assert "ERRORS (1)" in report
        assert "Total traits analyzed: 3" in report
        assert "Successful predictions: 1" in report
        assert "Missing data: 1" in report
        assert "Errors: 1" in report

    def test_report_empty_predictions(self):
        """Report with no predictions should still have header and footer."""
        report = format_prediction_report([])

        assert "OFFSPRING TRAIT PREDICTION REPORT" in report
        assert "Total traits analyzed: 0" in report
        assert "Successful predictions: 0" in report
        assert "Missing data: 0" in report
        assert "Errors: 0" in report

    def test_report_includes_note_when_present(self):
        """Success prediction with a note should include it in the report."""
        predictions = [
            {
                "trait": "Trait A",
                "gene": "GENE_A",
                "rsid": "rs001",
                "chromosome": "1",
                "inheritance": "dominant",
                "confidence": "high",
                "description": "desc.",
                "status": "success",
                "parent_a_genotype": "AG",
                "parent_b_genotype": "AG",
                "offspring_probabilities": {"Pheno A": 25.0},
                "note": "Some genotypes unmapped: ['GG']",
            },
        ]

        report = format_prediction_report(predictions)

        assert "Note: Some genotypes unmapped" in report

    def test_report_returns_string(self):
        """format_prediction_report must return a string."""
        report = format_prediction_report([])
        assert isinstance(report, str)


# ---------------------------------------------------------------------------
# normalize_genotype — expanded
# ---------------------------------------------------------------------------

class TestNormalizeGenotypeExpanded:
    """Additional normalize_genotype edge cases."""

    @pytest.mark.parametrize("input_gt,expected", [
        ("TA", "AT"),
        ("GC", "CG"),
        ("TG", "GT"),
        ("CA", "AC"),
    ])
    def test_all_reverse_pairs(self, input_gt, expected):
        """All reverse allele pairs should normalize correctly."""
        assert normalize_genotype(input_gt) == expected

    def test_single_char_input(self):
        """Single character normalizes to itself (no validation here)."""
        assert normalize_genotype("A") == "A"
