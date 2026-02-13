#!/usr/bin/env python3
"""
Stream D: Carrier Panel Data Cleanup Script

This script performs the following operations on carrier-panel.json:
1. Removes CNV-untestable disease entries (SMN1, DMD, HBA1, HBA2, FXN, DMPK, CNBP, C9orf72, PLP1, UBE3A, JPH3)
2. Adds disclaimer fields to partially-testable disease entries
3. Updates outdated gene symbols to current HGNC-approved names
4. Adds notes to Wolman/CESD (LIPA) entries about lysosomal acid lipase deficiency
5. Adds 4 new variant entries (HbC, GALT S135L, MEFV V726A, PAH IVS12+1G>A)
6. Writes the modified JSON with pretty-printing (2-space indent)
7. Prints a detailed summary of all changes
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

# ── Paths ──────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent
CARRIER_PANEL_PATH = REPO_ROOT / "packages" / "genetics-data" / "carrier-panel.json"

# ── Genes to REMOVE (CNV-untestable) ──────────────────────────────────────
GENES_TO_REMOVE = {
    "SMN1",   # Spinal Muscular Atrophy
    "DMD",    # Duchenne Muscular Dystrophy
    "HBA1",   # Alpha-Thalassemia
    "HBA2",   # Alpha-Thalassemia
    "FXN",    # Friedreich Ataxia
    "DMPK",   # Myotonic Dystrophy Type 1
    "CNBP",   # Myotonic Dystrophy Type 2
    "C9orf72", # ALS/FTD
    "PLP1",   # Pelizaeus-Merzbacher Disease
    "UBE3A",  # Angelman Syndrome
    "JPH3",   # Huntington Disease-Like 2 (repeat expansion)
}

# ── Disclaimers for partially-testable genes ──────────────────────────────
GENE_DISCLAIMERS = {
    "CYP21A2": (
        "Detects common point mutations only. Does not detect large deletions "
        "or gene conversions common in this gene."
    ),
    "GBA": (
        "Detects specific common variants (e.g., N370S). Due to gene complexity, "
        "some carriers may be missed."
    ),
    "F8": (
        "Detects specific variants only. Does not detect the chromosomal "
        "inversions responsible for ~50% of severe cases."
    ),
    "IDS": (
        "Detects point mutations only. Does not detect large deletions or "
        "rearrangements common in this condition."
    ),
    "GALC": (
        "This test does not detect the 30kb deletion which is a common cause "
        "of Krabbe disease in Europeans."
    ),
    "CTNS": (
        "Does not detect the 57kb deletion common in Northern European "
        "populations."
    ),
    "NEB": (
        "Limited sensitivity. This test covers only specific variants and "
        "does not rule out all carrier states."
    ),
    "OCA2": (
        "Does not detect the 2.7kb deletion common in African populations."
    ),
    "MTHFR": (
        "MTHFR C677T carrier screening is discouraged by ACMG due to lack "
        "of clinical utility for thrombophilia risk assessment. Results shown "
        "for informational purposes only."
    ),
}

# ── Gene symbol renames (old -> new) ──────────────────────────────────────
GENE_RENAMES = {
    "IKBKAP": "ELP1",
    "PKU": "PAH",
    "LCHAD": "HADHA",
    "NEMO": "IKBKG",
    "MUT": "MMUT",
    "C15orf41": "CDIN1",
    "KIAA0196": "WASHC5",
    "FAM126A": "HYCC1",
}

# ── Wolman/CESD note text ─────────────────────────────────────────────────
LIPA_NOTE_ADDITION = (
    " This condition is a subtype of Lysosomal acid lipase deficiency (OMIM 278000)."
)

# ── New entries to add ────────────────────────────────────────────────────
NEW_ENTRIES = [
    {
        "rsid": "rs33930165",
        "gene": "HBB",
        "condition": "Hemoglobin C Disease (HbC)",
        "inheritance": "autosomal_recessive",
        "carrier_frequency": "1 in 50",
        "pathogenic_allele": "A",
        "reference_allele": "G",
        "description": "Hemoglobin variant causing mild hemolytic anemia. Compound heterozygosity with HbS causes Hemoglobin SC disease.",
        "severity": "moderate",
        "prevalence": "1 in 5,000",
        "omim_id": "141900",
        "category": "Hematological",
        "sources": [
            {"name": "ClinVar", "url": "https://www.ncbi.nlm.nih.gov/clinvar/variation/15126/"},
            {"name": "dbSNP", "url": "https://www.ncbi.nlm.nih.gov/snp/rs33930165"}
        ],
        "confidence": "high",
        "notes": "Common in West African descent populations. Compound heterozygosity with HbS (rs334) causes HbSC disease."
    },
    {
        "rsid": "rs111033690",
        "gene": "GALT",
        "condition": "Galactosemia (S135L variant)",
        "inheritance": "autosomal_recessive",
        "carrier_frequency": "1 in 100",
        "pathogenic_allele": "T",
        "reference_allele": "C",
        "description": "Duarte-like galactosemia variant with reduced but not absent enzyme activity.",
        "severity": "moderate",
        "prevalence": "1 in 60,000",
        "omim_id": "230400",
        "category": "Metabolic",
        "sources": [
            {"name": "ClinVar", "url": "https://www.ncbi.nlm.nih.gov/clinvar/variation/3618/"},
            {"name": "dbSNP", "url": "https://www.ncbi.nlm.nih.gov/snp/rs111033690"}
        ],
        "confidence": "high",
        "notes": "Autosomal recessive. S135L causes partial enzyme deficiency. Compound heterozygosity with Q188R causes classic galactosemia."
    },
    {
        "rsid": "rs28940579",
        "gene": "MEFV",
        "condition": "Familial Mediterranean Fever (V726A)",
        "inheritance": "autosomal_recessive",
        "carrier_frequency": "1 in 7",
        "pathogenic_allele": "C",
        "reference_allele": "T",
        "description": "Common MEFV variant causing familial Mediterranean fever with episodic inflammation.",
        "severity": "moderate",
        "prevalence": "1 in 500",
        "omim_id": "249100",
        "category": "Inflammatory",
        "sources": [
            {"name": "ClinVar", "url": "https://www.ncbi.nlm.nih.gov/clinvar/variation/2540/"},
            {"name": "dbSNP", "url": "https://www.ncbi.nlm.nih.gov/snp/rs28940579"}
        ],
        "confidence": "high",
        "notes": "Autosomal recessive. High carrier frequency in Mediterranean populations (Turkish, Armenian, Arab, Sephardic Jewish)."
    },
    {
        "rsid": "rs5030855",
        "gene": "PAH",
        "condition": "Phenylketonuria (IVS12+1G>A)",
        "inheritance": "autosomal_recessive",
        "carrier_frequency": "1 in 50",
        "pathogenic_allele": "A",
        "reference_allele": "G",
        "description": "Splice-site mutation in PAH gene causing classic phenylketonuria.",
        "severity": "high",
        "prevalence": "1 in 12,000",
        "omim_id": "261600",
        "category": "Metabolic",
        "sources": [
            {"name": "ClinVar", "url": "https://www.ncbi.nlm.nih.gov/clinvar/variation/595/"},
            {"name": "dbSNP", "url": "https://www.ncbi.nlm.nih.gov/snp/rs5030855"}
        ],
        "confidence": "high",
        "notes": "Autosomal recessive. Common PKU mutation in Northern European populations. Compound heterozygosity with R408W causes severe PKU."
    },
]


def main():
    print(f"Loading carrier panel from: {CARRIER_PANEL_PATH}")

    with open(CARRIER_PANEL_PATH, "r", encoding="utf-8") as f:
        panel = json.load(f)

    original_count = len(panel)
    print(f"Original entry count: {original_count}")

    # ── Step 1: Remove CNV-untestable entries ─────────────────────────────
    removal_counts = defaultdict(int)
    kept_entries = []
    for entry in panel:
        gene = entry.get("gene", "")
        if gene in GENES_TO_REMOVE:
            removal_counts[gene] += 1
        else:
            kept_entries.append(entry)

    total_removed = sum(removal_counts.values())
    panel = kept_entries

    print(f"\n--- Step 1: Removed {total_removed} CNV-untestable entries ---")
    for gene, count in sorted(removal_counts.items()):
        print(f"  {gene}: {count} entries removed")

    # ── Step 2: Add disclaimers to partially-testable entries ─────────────
    disclaimer_counts = defaultdict(int)
    for entry in panel:
        gene = entry.get("gene", "")
        if gene in GENE_DISCLAIMERS:
            entry["disclaimer"] = GENE_DISCLAIMERS[gene]
            disclaimer_counts[gene] += 1

    total_disclaimers = sum(disclaimer_counts.values())
    print(f"\n--- Step 2: Added disclaimers to {total_disclaimers} entries ---")
    for gene, count in sorted(disclaimer_counts.items()):
        print(f"  {gene}: {count} entries")

    # ── Step 3: Update outdated gene symbols ──────────────────────────────
    rename_counts = defaultdict(int)
    for entry in panel:
        old_gene = entry.get("gene", "")
        if old_gene in GENE_RENAMES:
            new_gene = GENE_RENAMES[old_gene]
            entry["gene"] = new_gene
            rename_counts[f"{old_gene} -> {new_gene}"] += 1

    total_renames = sum(rename_counts.values())
    print(f"\n--- Step 3: Updated {total_renames} gene symbols ---")
    for rename, count in sorted(rename_counts.items()):
        print(f"  {rename}: {count} entries")

    # ── Step 4: Add notes to Wolman/CESD (LIPA) entries ───────────────────
    lipa_count = 0
    for entry in panel:
        if entry.get("gene") == "LIPA":
            existing_notes = entry.get("notes", "")
            # Only add if not already present
            if "Lysosomal acid lipase deficiency" not in existing_notes:
                entry["notes"] = existing_notes + LIPA_NOTE_ADDITION
                lipa_count += 1

    print(f"\n--- Step 4: Added Lysosomal acid lipase deficiency notes to {lipa_count} LIPA entries ---")

    # ── Step 5: Add new variant entries (idempotent — skips duplicates) ───
    existing_rsids = {e.get("rsid") for e in panel}
    added_count = 0
    for new_entry in NEW_ENTRIES:
        if new_entry["rsid"] not in existing_rsids:
            panel.append(new_entry)
            added_count += 1
        else:
            print(f"  Skipped (already exists): {new_entry['rsid']}")

    print(f"\n--- Step 5: Added {added_count} new variant entries ({len(NEW_ENTRIES) - added_count} skipped as duplicates) ---")
    for new_entry in NEW_ENTRIES:
        print(f"  {new_entry['rsid']} - {new_entry['gene']} - {new_entry['condition']}")

    # ── Write output ──────────────────────────────────────────────────────
    final_count = len(panel)
    print(f"\n--- Final Summary ---")
    print(f"  Original entries:    {original_count}")
    print(f"  Entries removed:     {total_removed}")
    print(f"  Entries added:       {added_count}")
    print(f"  Final entry count:   {final_count}")
    print(f"  Expected:            {original_count} - {total_removed} + {added_count} = {original_count - total_removed + added_count}")
    assert final_count == original_count - total_removed + added_count, "Entry count mismatch!"

    print(f"\n  Disclaimers added:   {total_disclaimers}")
    print(f"  Gene symbols updated:{total_renames}")
    print(f"  LIPA notes updated:  {lipa_count}")

    print(f"\nWriting updated carrier panel to: {CARRIER_PANEL_PATH}")
    with open(CARRIER_PANEL_PATH, "w", encoding="utf-8") as f:
        json.dump(panel, f, indent=2, ensure_ascii=False)
        f.write("\n")  # Trailing newline

    # ── Verification ──────────────────────────────────────────────────────
    print("\n--- Verification ---")

    # Check no removed genes remain
    remaining_genes = set(entry.get("gene", "") for entry in panel)
    for gene in GENES_TO_REMOVE:
        if gene in remaining_genes:
            print(f"  ERROR: {gene} still present in panel!")
            sys.exit(1)
        else:
            print(f"  OK: {gene} removed")

    # Check all gene renames applied (old names should not exist)
    for old_gene in GENE_RENAMES.keys():
        if old_gene in remaining_genes:
            print(f"  ERROR: Old gene symbol {old_gene} still present!")
            sys.exit(1)
        else:
            print(f"  OK: {old_gene} renamed to {GENE_RENAMES[old_gene]}")

    # Check disclaimers present
    disclaimer_genes_in_panel = set()
    for entry in panel:
        if "disclaimer" in entry:
            disclaimer_genes_in_panel.add(entry.get("gene", ""))
    for gene in GENE_DISCLAIMERS:
        # After renames, check the post-rename name if applicable
        check_gene = GENE_RENAMES.get(gene, gene)
        if check_gene in disclaimer_genes_in_panel or gene in disclaimer_genes_in_panel:
            print(f"  OK: Disclaimer present for {gene}")
        else:
            print(f"  WARNING: No disclaimer entries found for {gene}")

    # Check new entries
    all_rsids = set(entry.get("rsid", "") for entry in panel)
    for new_entry in NEW_ENTRIES:
        rsid = new_entry["rsid"]
        if rsid in all_rsids:
            print(f"  OK: New entry {rsid} ({new_entry['condition']}) present")
        else:
            print(f"  ERROR: New entry {rsid} missing!")
            sys.exit(1)

    print(f"\n=== All checks passed. Final count: {final_count} entries ===")


if __name__ == "__main__":
    main()
