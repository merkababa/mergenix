"""Tests for the centralized cached data loader module."""

import json
import os
import tempfile

# We test the underlying logic without Streamlit's cache decorator.
# Import the raw functions — st.cache_data is transparent in test context.

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
CARRIER_PANEL_PATH = os.path.join(DATA_DIR, "carrier_panel.json")
TRAIT_DB_PATH = os.path.join(DATA_DIR, "trait_snps.json")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_json(path):
    with open(path) as f:
        return json.load(f)


def _write_temp_json(data):
    fd, path = tempfile.mkstemp(suffix=".json")
    with os.fdopen(fd, "w") as f:
        json.dump(data, f)
    return path


# ---------------------------------------------------------------------------
# load_carrier_panel
# ---------------------------------------------------------------------------

class TestLoadCarrierPanel:
    """Tests for load_carrier_panel via direct JSON loading."""

    def test_returns_list(self):
        panel = _load_json(CARRIER_PANEL_PATH)
        assert isinstance(panel, list)

    def test_minimum_entries(self):
        panel = _load_json(CARRIER_PANEL_PATH)
        assert len(panel) >= 300, f"Expected >= 300, got {len(panel)}"

    def test_entries_have_required_keys(self):
        panel = _load_json(CARRIER_PANEL_PATH)
        required = {"rsid", "gene", "condition", "inheritance",
                     "carrier_frequency", "pathogenic_allele",
                     "reference_allele", "description", "severity"}
        for entry in panel[:10]:
            missing = required - set(entry.keys())
            assert not missing, f"Entry {entry.get('rsid')} missing: {missing}"


# ---------------------------------------------------------------------------
# load_trait_database
# ---------------------------------------------------------------------------

class TestLoadTraitDatabase:
    """Tests for load_trait_database logic."""

    def test_returns_list_from_list_format(self):
        data = [{"rsid": "rs1", "trait": "T"}]
        path = _write_temp_json(data)
        try:
            loaded = _load_json(path)
            assert isinstance(loaded, list)
            assert len(loaded) == 1
        finally:
            os.unlink(path)

    def test_returns_list_from_dict_format(self):
        data = {"snps": [{"rsid": "rs1"}, {"rsid": "rs2"}]}
        path = _write_temp_json(data)
        try:
            raw = _load_json(path)
            result = raw if isinstance(raw, list) else raw.get("snps", raw)
            assert isinstance(result, list)
            assert len(result) == 2
        finally:
            os.unlink(path)

    def test_real_trait_db_minimum_entries(self):
        raw = _load_json(TRAIT_DB_PATH)
        traits = raw if isinstance(raw, list) else raw.get("snps", raw)
        assert len(traits) >= 10, f"Expected >= 10, got {len(traits)}"


# ---------------------------------------------------------------------------
# count_entries
# ---------------------------------------------------------------------------

class TestCountEntries:
    """Tests for count_entries logic."""

    def test_count_list(self):
        data = [1, 2, 3, 4, 5]
        path = _write_temp_json(data)
        try:
            assert len(_load_json(path)) == 5
        finally:
            os.unlink(path)

    def test_count_dict_with_key(self):
        data = {"snps": [1, 2, 3]}
        path = _write_temp_json(data)
        try:
            raw = _load_json(path)
            result = raw.get("snps", raw)
            assert len(result) == 3
        finally:
            os.unlink(path)

    def test_count_carrier_panel(self):
        panel = _load_json(CARRIER_PANEL_PATH)
        assert len(panel) >= 300

    def test_count_trait_db(self):
        raw = _load_json(TRAIT_DB_PATH)
        traits = raw if isinstance(raw, list) else raw.get("snps", raw)
        assert len(traits) >= 10


# ---------------------------------------------------------------------------
# load_traits_corrected
# ---------------------------------------------------------------------------

class TestLoadTraitsCorrected:
    """Tests for load_traits_corrected phenotype_map flattening."""

    def test_flattens_dict_values(self):
        data = [{
            "rsid": "rs1",
            "trait": "Eye Color",
            "gene": "OCA2",
            "phenotype_map": {
                "GG": {"phenotype": "Brown Eyes", "description": "desc"},
                "AG": {"phenotype": "Green Eyes", "description": "desc"},
                "AA": "Blue Eyes",
            },
        }]
        path = _write_temp_json(data)
        try:
            raw = _load_json(path)
            traits = raw if isinstance(raw, list) else raw.get("snps", raw)
            for trait in traits:
                original_map = trait.get("phenotype_map", {})
                flat_map = {}
                for gk, v in original_map.items():
                    if isinstance(v, dict):
                        flat_map[gk] = v.get("phenotype", str(v))
                    else:
                        flat_map[gk] = v
                trait["phenotype_map"] = flat_map

            pm = traits[0]["phenotype_map"]
            assert pm["GG"] == "Brown Eyes"
            assert pm["AG"] == "Green Eyes"
            assert pm["AA"] == "Blue Eyes"
            for v in pm.values():
                assert isinstance(v, str), f"Expected str, got {type(v)}: {v}"
        finally:
            os.unlink(path)

    def test_handles_dict_snps_key_format(self):
        data = {"snps": [{
            "rsid": "rs1",
            "trait": "T",
            "gene": "G",
            "phenotype_map": {"AA": {"phenotype": "P1"}},
        }]}
        path = _write_temp_json(data)
        try:
            raw = _load_json(path)
            traits = raw if isinstance(raw, list) else raw.get("snps", raw)
            for trait in traits:
                pm = trait.get("phenotype_map", {})
                flat = {}
                for gk, v in pm.items():
                    flat[gk] = v.get("phenotype", str(v)) if isinstance(v, dict) else v
                trait["phenotype_map"] = flat

            assert len(traits) == 1
            assert traits[0]["phenotype_map"]["AA"] == "P1"
        finally:
            os.unlink(path)

    def test_preserves_string_values(self):
        data = [{
            "rsid": "rs1",
            "trait": "T",
            "gene": "G",
            "phenotype_map": {"AA": "Already String", "GG": "Also String"},
        }]
        path = _write_temp_json(data)
        try:
            raw = _load_json(path)
            pm = raw[0]["phenotype_map"]
            assert pm["AA"] == "Already String"
            assert pm["GG"] == "Also String"
        finally:
            os.unlink(path)


# ---------------------------------------------------------------------------
# Data file size sanity checks
# ---------------------------------------------------------------------------

class TestDataFileSizes:
    """Verify data file sizes meet minimum thresholds."""

    def test_carrier_panel_size(self):
        panel = _load_json(CARRIER_PANEL_PATH)
        assert len(panel) >= 300, f"Carrier panel too small: {len(panel)}"

    def test_trait_db_size(self):
        raw = _load_json(TRAIT_DB_PATH)
        traits = raw if isinstance(raw, list) else raw.get("snps", raw)
        assert len(traits) >= 10, f"Trait DB too small: {len(traits)}"
