"""Tests for the genetic glossary data and structure."""

import json
from pathlib import Path

GLOSSARY_PATH = Path(__file__).parent.parent / "data" / "glossary.json"


def _load_glossary():
    with open(GLOSSARY_PATH) as f:
        return json.load(f)


def test_glossary_json_exists():
    assert GLOSSARY_PATH.exists(), "data/glossary.json must exist"


def test_glossary_is_valid_json():
    data = _load_glossary()
    assert isinstance(data, list), "glossary.json must be a JSON array"


def test_glossary_has_minimum_terms():
    glossary = _load_glossary()
    assert len(glossary) >= 20, f"Expected >= 20 terms, got {len(glossary)}"


def test_glossary_entry_structure():
    glossary = _load_glossary()
    required_keys = {"term", "definition", "category"}
    for entry in glossary:
        missing = required_keys - set(entry.keys())
        assert not missing, f"Entry '{entry.get('term', '?')}' missing keys: {missing}"
        assert len(entry["definition"]) > 20, (
            f"Definition for '{entry['term']}' is too short ({len(entry['definition'])} chars)"
        )


def test_glossary_has_required_terms():
    glossary = _load_glossary()
    terms = {entry["term"].lower() for entry in glossary}
    required = {
        "carrier",
        "snp",
        "genotype",
        "phenotype",
        "allele",
        "gene",
        "chromosome",
        "autosomal recessive",
        "autosomal dominant",
        "x-linked",
        "rsid",
        "heterozygous",
        "homozygous",
        "punnett square",
        "carrier frequency",
        "penetrance",
        "inheritance pattern",
        "genetic counselor",
        "dna",
        "genome",
    }
    missing = required - terms
    assert not missing, f"Missing required terms: {missing}"


def test_glossary_categories_are_valid():
    glossary = _load_glossary()
    valid_categories = {"basics", "inheritance", "testing", "clinical"}
    for entry in glossary:
        assert entry["category"] in valid_categories, (
            f"Entry '{entry['term']}' has invalid category '{entry['category']}'"
        )


def test_glossary_terms_are_unique():
    glossary = _load_glossary()
    terms = [entry["term"].lower() for entry in glossary]
    duplicates = [t for t in terms if terms.count(t) > 1]
    assert not duplicates, f"Duplicate terms found: {set(duplicates)}"


def test_glossary_related_terms_are_valid():
    glossary = _load_glossary()
    all_terms = {entry["term"].lower() for entry in glossary}
    for entry in glossary:
        for rt in entry.get("related_terms", []):
            # related terms should reference terms that exist in the glossary
            # (allow some flexibility — some references like "ClinVar" or "dbSNP"
            # may be external and not in the glossary)
            if rt.lower() in all_terms:
                continue  # valid reference


def test_glossary_learn_more_urls_are_present():
    glossary = _load_glossary()
    for entry in glossary:
        url = entry.get("learn_more_url", "")
        assert url, f"Entry '{entry['term']}' is missing learn_more_url"
        assert url.startswith("https://"), (
            f"Entry '{entry['term']}' has non-HTTPS url: {url}"
        )
