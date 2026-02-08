"""
Centralized cached data loaders for Mergenix.

All JSON data loading goes through this module so that repeated calls
within a single Streamlit rerun are served from cache instead of
re-parsing multi-megabyte JSON files.
"""

import json

import streamlit as st


@st.cache_data
def load_carrier_panel(panel_path: str) -> list[dict]:
    """Load the carrier disease panel from JSON, cached across reruns."""
    with open(panel_path) as f:
        return json.load(f)


@st.cache_data
def load_trait_database(db_path: str) -> list[dict]:
    """
    Load the trait SNP database from JSON, cached across reruns.

    Handles both formats:
    - List of trait entries (direct)
    - Dict with a "snps" key containing the list
    """
    with open(db_path) as f:
        raw = json.load(f)
    return raw if isinstance(raw, list) else raw.get("snps", raw)


@st.cache_data
def count_entries(path: str, key: str | None = None) -> int:
    """
    Count entries in a JSON data file, cached across reruns.

    Args:
        path: Path to JSON file
        key: Optional key to index into if the JSON root is a dict
    """
    with open(path) as f:
        data = json.load(f)
    if key and isinstance(data, dict):
        data = data.get(key, data)
    return len(data) if isinstance(data, (list, dict)) else 0


@st.cache_data
def load_traits_corrected(db_path: str) -> list[dict]:
    """
    Load trait database with phenotype_map values flattened to strings.

    Rich dict entries like {"phenotype": "Brown Eyes", "description": "..."}
    are replaced with just the phenotype string "Brown Eyes" so that downstream
    code can use them as dict keys without TypeError.
    """
    with open(db_path) as f:
        raw = json.load(f)
    traits = raw if isinstance(raw, list) else raw.get("snps", raw)
    for trait in traits:
        original_map = trait.get("phenotype_map", {})
        flat_map = {}
        for genotype_key, value in original_map.items():
            if isinstance(value, dict):
                flat_map[genotype_key] = value.get("phenotype", str(value))
            else:
                flat_map[genotype_key] = value
        trait["phenotype_map"] = flat_map
    return traits
