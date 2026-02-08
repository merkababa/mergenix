"""
ClinVar Data Freshness Pipeline for Mergenix.

Downloads, parses, and compares ClinVar variant classifications against
the local carrier_panel.json to identify entries that may be stale or
reclassified. All updates require explicit human approval before being
applied.
"""

from __future__ import annotations

import gzip
import json
import logging
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CLINVAR_FTP_BASE = "https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited"
VARIANT_SUMMARY_FILE = "variant_summary.txt.gz"

DEFAULT_STALE_THRESHOLD_DAYS = 30


@dataclass
class ClinVarSyncConfig:
    """Configuration for ClinVar sync operations."""

    ftp_url: str = CLINVAR_FTP_BASE
    variant_summary_path: str = VARIANT_SUMMARY_FILE
    local_cache_dir: str = "data/clinvar_cache"
    panel_path: str = "data/carrier_panel.json"
    stale_threshold_days: int = DEFAULT_STALE_THRESHOLD_DAYS
    last_sync_file: str = field(default="")

    # Allowed hostnames for ClinVar data fetching (SSRF prevention)
    _ALLOWED_HOSTS: tuple[str, ...] = ("ftp.ncbi.nlm.nih.gov",)

    def __post_init__(self) -> None:
        # Validate FTP URL against allowlist to prevent SSRF
        parsed = urlparse(self.ftp_url)
        if parsed.hostname not in self._ALLOWED_HOSTS:
            msg = (
                f"ClinVar FTP URL host '{parsed.hostname}' is not in the "
                f"allowlist: {self._ALLOWED_HOSTS}"
            )
            raise ValueError(msg)
        if not self.last_sync_file:
            self.last_sync_file = str(Path(self.local_cache_dir) / "last_sync.json")

    @property
    def download_url(self) -> str:
        return f"{self.ftp_url}/{self.variant_summary_path}"


# ---------------------------------------------------------------------------
# Panel Freshness
# ---------------------------------------------------------------------------


def check_panel_freshness(
    panel_path: str,
    last_sync_date: str | None = None,
) -> dict:
    """Check how fresh the carrier panel data is.

    Args:
        panel_path: Path to carrier_panel.json.
        last_sync_date: ISO-8601 date string of last ClinVar sync, or None.

    Returns:
        Dict with total_variants, days_since_sync, is_stale, and
        stale_threshold_days.
    """
    with open(panel_path) as f:
        panel = json.load(f)

    total_variants = len(panel)

    if last_sync_date is None:
        days_since_sync = -1
        is_stale = True
    else:
        sync_dt = datetime.fromisoformat(last_sync_date).replace(tzinfo=timezone.utc)
        now = datetime.now(tz=timezone.utc)
        days_since_sync = (now - sync_dt).days
        is_stale = days_since_sync > DEFAULT_STALE_THRESHOLD_DAYS

    return {
        "total_variants": total_variants,
        "days_since_sync": days_since_sync,
        "is_stale": is_stale,
        "stale_threshold_days": DEFAULT_STALE_THRESHOLD_DAYS,
    }


# ---------------------------------------------------------------------------
# Download ClinVar Summary
# ---------------------------------------------------------------------------


def fetch_clinvar_summary(config: ClinVarSyncConfig, timeout: int = 60) -> Path:
    """Download ClinVar variant_summary.txt.gz.

    Args:
        config: Sync configuration.
        timeout: HTTP timeout in seconds.

    Returns:
        Path to the downloaded .gz file.

    Raises:
        requests.exceptions.Timeout: On timeout.
        requests.exceptions.HTTPError: On HTTP error.
        gzip.BadGzipFile: If the downloaded file is not valid gzip.
    """
    cache_dir = Path(config.local_cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)

    dest = cache_dir / config.variant_summary_path
    url = config.download_url

    logger.info("Downloading ClinVar summary from %s", url)
    resp = requests.get(url, timeout=timeout, stream=True)  # noqa: S113
    resp.raise_for_status()

    with open(dest, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)

    # Validate it is genuine gzip
    with gzip.open(dest, "rt") as gz:
        gz.read(1)

    # Record sync timestamp
    sync_meta = {
        "last_sync": datetime.now(tz=timezone.utc).isoformat(),
        "source_url": url,
        "file_size_bytes": dest.stat().st_size,
    }
    with open(config.last_sync_file, "w") as f:
        json.dump(sync_meta, f, indent=2)

    logger.info("Downloaded %d bytes to %s", dest.stat().st_size, dest)
    return dest


# ---------------------------------------------------------------------------
# Parse ClinVar Variants
# ---------------------------------------------------------------------------

# Expected columns in variant_summary.txt (0-indexed)
_COL_RSID = 9        # RS# (dbSNP)
_COL_CLIN_SIG = 6    # ClinicalSignificance
_COL_REVIEW = 24      # ReviewStatus
_COL_LAST_EVAL = 14   # LastEvaluated
_COL_CONDITION = 13   # PhenotypeList


def parse_clinvar_variants(
    gz_path: str | Path,
    rsids_of_interest: set[str],
) -> dict[str, dict]:
    """Stream-parse ClinVar variant_summary.txt.gz for our panel rsIDs.

    Only retains rows whose RS# matches an rsID in the interest set.
    Memory-efficient: reads line by line rather than loading the whole file.

    Args:
        gz_path: Path to variant_summary.txt.gz.
        rsids_of_interest: Set of rsIDs (e.g. {"rs123", "rs456"}).

    Returns:
        Dict mapping rsid -> {clinical_significance, review_status,
        last_evaluated, condition}.
    """
    results: dict[str, dict] = {}
    gz_path = Path(gz_path)

    with gzip.open(gz_path, "rt", encoding="utf-8", errors="replace") as fh:
        for line_no, line in enumerate(fh):
            # Skip header line(s)
            if line_no == 0 and line.startswith("#"):
                continue
            if line_no == 0:
                # First line is the header row in variant_summary.txt
                continue

            parts = line.rstrip("\n").split("\t")
            if len(parts) <= max(_COL_RSID, _COL_CLIN_SIG, _COL_REVIEW, _COL_LAST_EVAL, _COL_CONDITION):
                # Malformed line - skip silently
                continue

            raw_rs = parts[_COL_RSID].strip()
            if not raw_rs or raw_rs == "-1":
                continue

            rsid = f"rs{raw_rs}" if not raw_rs.startswith("rs") else raw_rs

            if rsid not in rsids_of_interest:
                continue

            results[rsid] = {
                "clinical_significance": parts[_COL_CLIN_SIG].strip(),
                "review_status": parts[_COL_REVIEW].strip(),
                "last_evaluated": parts[_COL_LAST_EVAL].strip(),
                "condition": parts[_COL_CONDITION].strip(),
            }

    logger.info(
        "Parsed %d matching variants out of interest set of %d",
        len(results),
        len(rsids_of_interest),
    )
    return results


# ---------------------------------------------------------------------------
# Identify Stale Entries
# ---------------------------------------------------------------------------

# Mapping of ClinVar significance terms to severity buckets for comparison
_SEVERITY_RANK = {
    "pathogenic": 4,
    "likely pathogenic": 3,
    "uncertain significance": 2,
    "likely benign": 1,
    "benign": 0,
}


def _normalise_significance(sig: str) -> str:
    """Lower-case and strip extra qualifiers to get a canonical significance."""
    sig = sig.lower().strip()
    # ClinVar sometimes has "Pathogenic/Likely pathogenic" — take the first
    if "/" in sig:
        sig = sig.split("/")[0].strip()
    return sig


def _classify_change(our_sig: str, clinvar_sig: str) -> str:
    """Determine if a change is upgraded, downgraded, or reclassified."""
    our_rank = _SEVERITY_RANK.get(our_sig)
    cv_rank = _SEVERITY_RANK.get(clinvar_sig)

    if our_rank is None or cv_rank is None:
        return "reclassified"
    if cv_rank > our_rank:
        return "upgraded"
    if cv_rank < our_rank:
        return "downgraded"
    return "reclassified"


def identify_stale_entries(
    panel: list[dict],
    clinvar_data: dict[str, dict],
) -> list[dict]:
    """Compare panel classifications against latest ClinVar data.

    Args:
        panel: Loaded carrier_panel.json list.
        clinvar_data: Output of parse_clinvar_variants.

    Returns:
        List of dicts describing variants whose ClinVar classification
        has changed relative to our panel.
    """
    stale: list[dict] = []

    for entry in panel:
        rsid = entry.get("rsid", "")
        if rsid not in clinvar_data:
            continue

        cv = clinvar_data[rsid]
        cv_sig = _normalise_significance(cv["clinical_significance"])

        # Our panel always marks entries as pathogenic (they are disease
        # entries), so we compare against "pathogenic"
        our_sig = "pathogenic"

        if cv_sig == our_sig:
            continue

        change_type = _classify_change(our_sig, cv_sig)

        stale.append({
            "rsid": rsid,
            "condition": entry.get("condition", ""),
            "our_classification": our_sig,
            "clinvar_classification": cv_sig,
            "change_type": change_type,
            "clinvar_review_status": cv.get("review_status", ""),
        })

    logger.info("Identified %d stale entries", len(stale))
    return stale


# ---------------------------------------------------------------------------
# Freshness Report
# ---------------------------------------------------------------------------


def generate_freshness_report(
    stale_entries: list[dict],
    panel_stats: dict,
) -> dict:
    """Generate a human-readable freshness report.

    Args:
        stale_entries: Output of identify_stale_entries.
        panel_stats: Output of check_panel_freshness.

    Returns:
        Report dict with summary, breakdown, and categorised entries.
    """
    breakdown: dict[str, int] = {}
    safe_to_auto = []
    needs_manual = []

    for entry in stale_entries:
        ct = entry["change_type"]
        breakdown[ct] = breakdown.get(ct, 0) + 1

        # Upgraded variants (benign -> pathogenic direction) are safe to
        # auto-flag; downgrades and reclassifications need manual review.
        if ct == "upgraded":
            safe_to_auto.append(entry)
        else:
            needs_manual.append(entry)

    recommendations = []
    if needs_manual:
        recommendations.append(
            f"{len(needs_manual)} variant(s) downgraded or reclassified — "
            "manual genetic counselor review recommended before updating."
        )
    if safe_to_auto:
        recommendations.append(
            f"{len(safe_to_auto)} variant(s) upgraded in severity — "
            "safe to apply after brief review."
        )
    if not stale_entries:
        recommendations.append("All panel entries are consistent with current ClinVar data.")

    return {
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
        "total_checked": panel_stats.get("total_variants", 0),
        "total_stale": len(stale_entries),
        "breakdown_by_change_type": breakdown,
        "safe_to_auto_apply": safe_to_auto,
        "needs_manual_review": needs_manual,
        "recommendations": recommendations,
    }


# ---------------------------------------------------------------------------
# Apply Updates
# ---------------------------------------------------------------------------


def apply_clinvar_updates(
    panel_path: str,
    approved_updates: list[dict],
    backup: bool = True,
) -> dict:
    """Apply approved ClinVar updates to carrier_panel.json.

    This function NEVER auto-applies updates. Only explicitly approved
    entries (passed in *approved_updates*) are written.

    Args:
        panel_path: Path to carrier_panel.json.
        approved_updates: List of stale-entry dicts that have been
            approved for update (each must have 'rsid' and
            'clinvar_classification').
        backup: If True, create a timestamped backup before modifying.

    Returns:
        Dict with applied count, skipped count, and backup_path.
    """
    panel_file = Path(panel_path)

    # Create backup
    backup_path = ""
    if backup:
        ts = datetime.now(tz=timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup_dest = panel_file.with_suffix(f".backup.{ts}.json")
        shutil.copy2(panel_file, backup_dest)
        backup_path = str(backup_dest)
        logger.info("Backup created at %s", backup_path)

    with open(panel_file) as f:
        panel = json.load(f)

    # Build lookup for approved updates
    update_map = {u["rsid"]: u for u in approved_updates}

    applied = 0
    skipped = 0

    for entry in panel:
        rsid = entry.get("rsid", "")
        if rsid not in update_map:
            continue

        upd = update_map[rsid]
        new_note = (
            f"ClinVar reclassification ({upd.get('clinvar_classification', 'unknown')}) "
            f"applied on {datetime.now(tz=timezone.utc).strftime('%Y-%m-%d')}. "
            f"Previous classification: {upd.get('our_classification', 'pathogenic')}."
        )

        existing_notes = entry.get("notes", "")
        entry["notes"] = f"{existing_notes} [UPDATE] {new_note}" if existing_notes else new_note
        applied += 1

    skipped = len(approved_updates) - applied

    with open(panel_file, "w") as f:
        json.dump(panel, f, indent=2)

    logger.info("Applied %d updates, skipped %d", applied, skipped)
    return {
        "applied": applied,
        "skipped": skipped,
        "backup_path": backup_path,
    }
