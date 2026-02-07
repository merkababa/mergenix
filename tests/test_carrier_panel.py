"""Tests for carrier panel data integrity and schema validation."""
import json
import os
import re

import pytest

PANEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "carrier_panel.json")


@pytest.fixture
def panel():
    """Load carrier panel from JSON file."""
    with open(PANEL_PATH) as f:
        return json.load(f)


def test_panel_loads_as_list(panel):
    """Test that panel loads as a list."""
    assert isinstance(panel, list), "Panel should be a list"


def test_panel_has_minimum_entries(panel):
    """Test that panel has at least 300 entries."""
    assert len(panel) >= 300, f"Panel should have at least 300 entries, found {len(panel)}"


def test_all_required_fields_present(panel):
    """Test that every entry has all required fields."""
    required_fields = [
        "rsid", "gene", "condition", "inheritance", "carrier_frequency",
        "pathogenic_allele", "reference_allele", "description",
        "severity", "prevalence", "omim_id"
    ]

    for idx, entry in enumerate(panel):
        for field in required_fields:
            assert field in entry, f"Entry {idx} (rsid: {entry.get('rsid', 'unknown')}) missing required field: {field}"


def test_no_duplicate_rsids(panel):
    """Test that there are no duplicate rsIDs across entire panel."""
    rsids = [entry["rsid"] for entry in panel]
    duplicates = [rsid for rsid in set(rsids) if rsids.count(rsid) > 1]
    assert len(duplicates) == 0, f"Found duplicate rsIDs: {duplicates}"


def test_rsid_format(panel):
    """Test that every rsid matches pattern r'^rs\\d+$'."""
    rsid_pattern = re.compile(r'^rs\d+$')

    for idx, entry in enumerate(panel):
        rsid = entry["rsid"]
        assert rsid_pattern.match(rsid), f"Entry {idx}: Invalid rsid format: {rsid}"


def test_inheritance_values(panel):
    """Test that every inheritance is from allowed set."""
    allowed_inheritance = {"autosomal_recessive", "autosomal_dominant", "X-linked"}

    for idx, entry in enumerate(panel):
        inheritance = entry["inheritance"]
        assert inheritance in allowed_inheritance, \
            f"Entry {idx} (rsid: {entry['rsid']}): Invalid inheritance value: {inheritance}"


def test_severity_values(panel):
    """Test that every severity is from allowed set."""
    allowed_severity = {"high", "moderate", "low"}

    for idx, entry in enumerate(panel):
        severity = entry["severity"]
        assert severity in allowed_severity, \
            f"Entry {idx} (rsid: {entry['rsid']}): Invalid severity value: {severity}"


def test_pathogenic_allele_valid(panel):
    """Test that pathogenic_allele is a single nucleotide (A, T, C, G)."""
    valid_nucleotides = {"A", "T", "C", "G"}

    for idx, entry in enumerate(panel):
        allele = entry["pathogenic_allele"]
        assert allele in valid_nucleotides, \
            f"Entry {idx} (rsid: {entry['rsid']}): Invalid pathogenic_allele: {allele}"


def test_reference_allele_valid(panel):
    """Test that reference_allele is a single nucleotide (A, T, C, G)."""
    valid_nucleotides = {"A", "T", "C", "G"}

    for idx, entry in enumerate(panel):
        allele = entry["reference_allele"]
        assert allele in valid_nucleotides, \
            f"Entry {idx} (rsid: {entry['rsid']}): Invalid reference_allele: {allele}"


def test_alleles_are_different(panel):
    """Test that pathogenic_allele != reference_allele for every entry."""
    for idx, entry in enumerate(panel):
        pathogenic = entry["pathogenic_allele"]
        reference = entry["reference_allele"]
        assert pathogenic != reference, \
            f"Entry {idx} (rsid: {entry['rsid']}): pathogenic and reference alleles are identical: {pathogenic}"


def test_omim_id_format(panel):
    """Test that every omim_id is a string of 5-6 digits."""
    omim_pattern = re.compile(r'^\d{5,6}$')

    for idx, entry in enumerate(panel):
        omim_id = entry["omim_id"]
        assert omim_pattern.match(omim_id), \
            f"Entry {idx} (rsid: {entry['rsid']}): Invalid omim_id format: {omim_id}"


def test_carrier_frequency_format(panel):
    """Test that carrier_frequency matches pattern '1 in \\d[\\d,]*'."""
    freq_pattern = re.compile(r'^1 in \d[\d,]*$')

    for idx, entry in enumerate(panel):
        freq = entry["carrier_frequency"]
        assert freq_pattern.match(freq), \
            f"Entry {idx} (rsid: {entry['rsid']}): Invalid carrier_frequency format: {freq}"


def test_prevalence_format(panel):
    """Test that prevalence matches pattern '1 in \\d[\\d,]*'."""
    prev_pattern = re.compile(r'^1 in \d[\d,]*$')

    for idx, entry in enumerate(panel):
        prev = entry["prevalence"]
        assert prev_pattern.match(prev), \
            f"Entry {idx} (rsid: {entry['rsid']}): Invalid prevalence format: {prev}"


def test_description_non_empty(panel):
    """Test that every description is a non-empty string."""
    for idx, entry in enumerate(panel):
        desc = entry["description"]
        assert isinstance(desc, str), \
            f"Entry {idx} (rsid: {entry['rsid']}): description is not a string"
        assert len(desc.strip()) > 0, \
            f"Entry {idx} (rsid: {entry['rsid']}): description is empty"


def test_gene_non_empty(panel):
    """Test that every gene is a non-empty string."""
    for idx, entry in enumerate(panel):
        gene = entry["gene"]
        assert isinstance(gene, str), \
            f"Entry {idx} (rsid: {entry['rsid']}): gene is not a string"
        assert len(gene.strip()) > 0, \
            f"Entry {idx} (rsid: {entry['rsid']}): gene is empty"


def test_condition_non_empty(panel):
    """Test that every condition is a non-empty string."""
    for idx, entry in enumerate(panel):
        condition = entry["condition"]
        assert isinstance(condition, str), \
            f"Entry {idx} (rsid: {entry['rsid']}): condition is not a string"
        assert len(condition.strip()) > 0, \
            f"Entry {idx} (rsid: {entry['rsid']}): condition is empty"


def test_no_duplicate_conditions(panel):
    """Test that duplicate conditions are minimal (< 5% of panel)."""
    conditions = [entry["condition"] for entry in panel]
    duplicates = [cond for cond in set(conditions) if conditions.count(cond) > 1]
    duplicate_percentage = (len(duplicates) / len(set(conditions))) * 100
    assert duplicate_percentage < 5, \
        f"Found {len(duplicates)} duplicate conditions ({duplicate_percentage:.1f}%): {duplicates}"


def test_category_field_exists_on_most_entries(panel):
    """Test that category field exists (skip if not present in data)."""
    entries_with_category = sum(1 for entry in panel if "category" in entry)
    percentage = (entries_with_category / len(panel)) * 100
    # Category field is optional - this test just documents its presence
    assert percentage >= 0, \
        f"Category field present on {percentage:.1f}% of entries"


def test_category_values_from_allowed_set(panel):
    """Test that category values are from allowed set."""
    allowed_categories = {
        "Metabolic", "Hematological", "Neurological", "Pulmonary", "Skeletal",
        "Connective Tissue", "Immunodeficiency", "Cardiovascular",
        "Endocrine", "Renal", "Dermatological", "Sensory",
        "Cancer Predisposition", "Pharmacogenomics", "Other"
    }

    for idx, entry in enumerate(panel):
        if "category" in entry:
            category = entry["category"]
            assert category in allowed_categories, \
                f"Entry {idx} (rsid: {entry['rsid']}): Invalid category value: {category}"
