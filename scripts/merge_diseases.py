"""
Merge new disease batch files into carrier_panel.json.

Usage:
    python scripts/merge_diseases.py

Reads all data/new_diseases_batch_*.json files, validates them,
deduplicates against existing carrier_panel.json, and writes the
merged result back.
"""

import json
import glob
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
PANEL_PATH = os.path.join(PROJECT_ROOT, "data", "carrier_panel.json")
BATCH_GLOB = os.path.join(PROJECT_ROOT, "data", "new_diseases_batch_*.json")

REQUIRED_FIELDS = [
    "rsid", "gene", "condition", "inheritance", "carrier_frequency",
    "pathogenic_allele", "reference_allele", "description",
    "severity", "prevalence", "omim_id", "category",
]

VALID_INHERITANCE = {"autosomal_recessive", "autosomal_dominant", "X-linked"}
VALID_SEVERITY = {"high", "moderate", "low"}
VALID_CATEGORIES = {
    "Metabolic", "Neurological", "Cardiovascular", "Cancer Predisposition",
    "Immunodeficiency", "Pharmacogenomics", "Connective Tissue", "Renal",
    "Sensory", "Endocrine", "Skeletal", "Hematological", "Pulmonary",
    "Other", "Dermatological",
}
VALID_ALLELES = {"A", "T", "C", "G"}


def validate_entry(entry, idx, existing_rsids):
    errors = []
    # Check required fields
    for field in REQUIRED_FIELDS:
        if field not in entry or not entry[field]:
            errors.append(f"  Entry {idx}: missing or empty field '{field}'")

    if errors:
        return errors

    # Field format checks
    if not re.match(r"^rs\d+$", entry["rsid"]):
        errors.append(f"  Entry {idx} ({entry['condition']}): invalid rsid '{entry['rsid']}'")

    if entry["rsid"] in existing_rsids:
        errors.append(f"  Entry {idx} ({entry['condition']}): duplicate rsid '{entry['rsid']}'")

    if entry["inheritance"] not in VALID_INHERITANCE:
        errors.append(f"  Entry {idx} ({entry['condition']}): invalid inheritance '{entry['inheritance']}'")

    if entry["severity"] not in VALID_SEVERITY:
        errors.append(f"  Entry {idx} ({entry['condition']}): invalid severity '{entry['severity']}'")

    if entry["category"] not in VALID_CATEGORIES:
        errors.append(f"  Entry {idx} ({entry['condition']}): invalid category '{entry['category']}'")

    if entry["pathogenic_allele"] not in VALID_ALLELES:
        errors.append(f"  Entry {idx} ({entry['condition']}): invalid pathogenic_allele '{entry['pathogenic_allele']}'")

    if entry["reference_allele"] not in VALID_ALLELES:
        errors.append(f"  Entry {idx} ({entry['condition']}): invalid reference_allele '{entry['reference_allele']}'")

    if entry["pathogenic_allele"] == entry["reference_allele"]:
        errors.append(f"  Entry {idx} ({entry['condition']}): pathogenic_allele == reference_allele")

    if not re.match(r"^1 in [\d,]+$", entry["carrier_frequency"]):
        errors.append(f"  Entry {idx} ({entry['condition']}): invalid carrier_frequency '{entry['carrier_frequency']}'")

    if not re.match(r"^1 in [\d,]+$", entry["prevalence"]):
        errors.append(f"  Entry {idx} ({entry['condition']}): invalid prevalence '{entry['prevalence']}'")

    if not re.match(r"^\d{5,6}$", entry["omim_id"]):
        errors.append(f"  Entry {idx} ({entry['condition']}): invalid omim_id '{entry['omim_id']}'")

    return errors


def main():
    # Load existing panel
    with open(PANEL_PATH) as f:
        existing = json.load(f)
    existing_rsids = {d["rsid"] for d in existing}
    print(f"Existing panel: {len(existing)} diseases, {len(existing_rsids)} unique rsIDs")

    # Find and load batch files
    batch_files = sorted(glob.glob(BATCH_GLOB))
    if not batch_files:
        print("No batch files found matching:", BATCH_GLOB)
        sys.exit(1)

    print(f"Found {len(batch_files)} batch files")

    all_new = []
    all_errors = []
    new_rsids = set()

    for bf in batch_files:
        print(f"\nProcessing: {os.path.basename(bf)}")
        with open(bf) as f:
            batch = json.load(f)
        print(f"  Entries: {len(batch)}")

        batch_errors = []
        batch_valid = []
        for i, entry in enumerate(batch):
            # Check against existing + already-added new rsids
            combined_rsids = existing_rsids | new_rsids
            errs = validate_entry(entry, i, combined_rsids)
            if errs:
                batch_errors.extend(errs)
            else:
                new_rsids.add(entry["rsid"])
                batch_valid.append(entry)

        if batch_errors:
            print(f"  ERRORS ({len(batch_errors)}):")
            for e in batch_errors[:10]:
                print(e)
            if len(batch_errors) > 10:
                print(f"  ... and {len(batch_errors) - 10} more errors")
            all_errors.extend(batch_errors)

        all_new.extend(batch_valid)
        print(f"  Valid entries added: {len(batch_valid)}")

    print(f"\n{'='*60}")
    print(f"Total new valid entries: {len(all_new)}")
    print(f"Total errors: {len(all_errors)}")

    if all_errors:
        print(f"\nWARNING: {len(all_errors)} validation errors found.")
        print("Proceeding with valid entries only.")

    # Merge
    merged = existing + all_new
    print(f"Merged panel size: {len(merged)}")

    # Category breakdown
    cats = {}
    for d in merged:
        cat = d.get("category", "Other")
        cats[cat] = cats.get(cat, 0) + 1
    print("\nCategory breakdown:")
    for cat in sorted(cats, key=cats.get, reverse=True):
        print(f"  {cat}: {cats[cat]}")

    # Write merged panel
    with open(PANEL_PATH, "w") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {len(merged)} entries to {PANEL_PATH}")

    return len(all_errors)


if __name__ == "__main__":
    error_count = main()
    sys.exit(1 if error_count > 50 else 0)
