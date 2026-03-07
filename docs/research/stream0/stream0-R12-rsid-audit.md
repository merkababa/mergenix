# R12: Carrier Panel rsID Audit

> **Task:** Audit all rsIDs in carrier-panel.json against ClinVar for validity and correctness
> **Delegated to:** Gemini (gemini-3-pro-preview)
> **Date:** 2026-02-12
> **Status:** PARTIAL — methodology issues, needs re-run
> **Tier:** A+ (large-scale data validation — Gemini's 1M context ideal)

## Objective

For each rsID in the carrier panel (~2,715 entries), verify:

1. Is it a current, active dbSNP ID? (has it been merged into another rsID?)
2. Is it mapped to the correct gene according to dbSNP?
3. Does it have a known pathogenic/likely-pathogenic interpretation in ClinVar?
4. Are any rsIDs multi-allelic (multiple alt alleles)?
5. Are any rsIDs on non-standard chromosomes or patches?

## Prompt Sent

"You are a genetics data quality auditor. Your task is to verify that all rsIDs in our carrier panel are valid, current, and correctly mapped. READ packages/genetics-data/carrier-panel.json (all entries). For each rsID: check if current active dbSNP ID, mapped to correct gene, has pathogenic ClinVar interpretation, is multi-allelic, or on non-standard chromosomes. OUTPUT: markdown table with columns: rsID, Disease, Gene, Issue Type (MERGED/WITHDRAWN/WRONG_GENE/NO_CLINVAR_PATHOGENIC/MULTI_ALLELIC/NON_STANDARD_CHROM), Details, Corrected Value."

## Key Findings (Partial)

- Gemini downloaded the full ClinVar variant_summary.txt.gz (422MB) and wrote a Python audit script
- The audit script produced 706KB of output but the **methodology was flawed**
- Many consecutive rsIDs (e.g., rs121918141-rs121918162) were all flagged as WRONG_GENE mapping to the same incorrect gene (e.g., "ClinVar lists PROC")
- This pattern indicates the ClinVar lookup was matching rsIDs to wrong entries — likely a parsing bug where the script matched by row position rather than by rsID value
- Some findings appear valid: pharmacogenomics variants (DPYD, NAT2) correctly flagged as "drug response" rather than "pathogenic"
- Factor V Leiden (rs6025) correctly flagged as "drug response" classification

## Full Results

The raw audit output (706KB, UTF-16 encoded) was saved to `audit_output.txt` in the repo root but was **deleted during cleanup before being archived**. This was a mistake — per the new logging rules, raw output must always be archived before cleanup.

**Issue types found in partial output (before methodology failure became apparent):**

- WRONG_GENE: ~100+ entries (many likely false positives due to script bug)
- NO_CLINVAR_PATHOGENIC: ~15 entries (pharmacogenomics + risk factor variants correctly flagged)
- Valid findings mixed with false positives — cannot be trusted without re-run

## Why It Failed

1. The Gemini CLI session hit rate limits repeatedly (25 RPM for gemini-3-pro-preview)
2. Gemini downloaded the full ClinVar variant_summary.txt.gz and wrote a custom Python audit script
3. The script's ClinVar lookup logic had a bug — it appeared to match rsIDs to incorrect gene entries, likely because:
   - ClinVar's variant_summary.txt has multiple rows per rsID (one per condition/submitter)
   - The script may have used sequential row matching instead of rsID-based lookup
   - Many consecutive rsIDs mapping to the same "corrected" gene (PROC, OCA2, etc.) confirms this
4. The task was stopped after extended runtime (~45 minutes) of repeated rate limit retries and script debugging

## Action Items

- [ ] **Re-run R12** with corrected methodology:
  - Use dbSNP's rsID merge archive (`RsMergeArch.bz2`) instead of parsing variant_summary.txt
  - Cross-reference gene symbols via Ensembl REST API batch queries (more reliable than ClinVar gene mapping)
  - Or: use the existing `scripts/clinvar_sync.py` which already handles this correctly
- [ ] Archive raw output BEFORE deleting temp files (lesson learned)
- [ ] Consider running the audit in smaller batches (500 rsIDs at a time) to avoid rate limits

## Impact on Downstream Streams

- **D (Data):** Deferred — will inform D-stream data edits once re-run produces reliable results
- **E (Engine):** No immediate impact — engine logic doesn't depend on rsID validity audit
- **Non-blocking:** Other streams can proceed while R12 is re-run
