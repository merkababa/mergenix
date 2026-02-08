"""Tests for the ClinVar data freshness pipeline."""

from __future__ import annotations

import gzip
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from Source.clinvar_pipeline import (
    ClinVarSyncConfig,
    apply_clinvar_updates,
    check_panel_freshness,
    fetch_clinvar_summary,
    generate_freshness_report,
    identify_stale_entries,
    parse_clinvar_variants,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SAMPLE_PANEL = [
    {
        "rsid": "rs75030207",
        "gene": "CFTR",
        "condition": "Cystic Fibrosis (F508del)",
        "inheritance": "autosomal_recessive",
        "carrier_frequency": "1 in 25",
        "pathogenic_allele": "T",
        "reference_allele": "C",
        "description": "Progressive disorder causing persistent lung infections.",
        "severity": "high",
        "prevalence": "1 in 3,500",
        "omim_id": "219700",
        "category": "Pulmonary",
        "sources": [],
        "confidence": "high",
        "notes": "Test entry.",
    },
    {
        "rsid": "rs113993960",
        "gene": "CFTR",
        "condition": "Cystic Fibrosis (G542X)",
        "inheritance": "autosomal_recessive",
        "carrier_frequency": "1 in 100",
        "pathogenic_allele": "A",
        "reference_allele": "G",
        "description": "Second most common CFTR mutation.",
        "severity": "high",
        "prevalence": "1 in 3,500",
        "omim_id": "219700",
        "category": "Pulmonary",
        "sources": [],
        "confidence": "high",
        "notes": "Test entry 2.",
    },
    {
        "rsid": "rs80338939",
        "gene": "SMN1",
        "condition": "Spinal Muscular Atrophy",
        "inheritance": "autosomal_recessive",
        "carrier_frequency": "1 in 50",
        "pathogenic_allele": "A",
        "reference_allele": "G",
        "description": "Neurodegenerative disease.",
        "severity": "high",
        "prevalence": "1 in 10,000",
        "omim_id": "253300",
        "category": "Neurological",
        "sources": [],
        "confidence": "high",
        "notes": "Test entry 3.",
    },
]


def _write_panel(path: str | Path, panel: list[dict] | None = None) -> None:
    with open(path, "w") as f:
        json.dump(panel or SAMPLE_PANEL, f)


def _make_clinvar_gz(path: str | Path, rows: list[list[str]]) -> None:
    """Create a mock variant_summary.txt.gz with given data rows."""
    header = "\t".join([f"col{i}" for i in range(30)])
    lines = [header]
    for row in rows:
        # Pad row to 30 columns
        padded = row + [""] * (30 - len(row))
        lines.append("\t".join(padded))
    content = "\n".join(lines) + "\n"
    with gzip.open(path, "wt", encoding="utf-8") as gz:
        gz.write(content)


def _clinvar_row(
    rsid_num: str,
    clin_sig: str = "Pathogenic",
    review_status: str = "criteria provided, single submitter",
    last_eval: str = "2025-01-15",
    condition: str = "Cystic Fibrosis",
) -> list[str]:
    """Build a 30-column ClinVar TSV row with rsid at col 9, etc."""
    row = [""] * 30
    row[9] = rsid_num  # RS# (number only, no 'rs' prefix)
    row[6] = clin_sig
    row[24] = review_status
    row[14] = last_eval
    row[13] = condition
    return row


# ---------------------------------------------------------------------------
# TestPanelFreshness
# ---------------------------------------------------------------------------


class TestPanelFreshness:
    """Tests for check_panel_freshness."""

    def test_fresh_panel(self, tmp_path):
        panel_file = tmp_path / "panel.json"
        _write_panel(panel_file)
        yesterday = (datetime.now(tz=timezone.utc) - timedelta(days=1)).isoformat()

        result = check_panel_freshness(str(panel_file), yesterday)

        assert result["total_variants"] == 3
        assert result["days_since_sync"] <= 1
        assert result["is_stale"] is False
        assert result["stale_threshold_days"] == 30

    def test_stale_panel(self, tmp_path):
        panel_file = tmp_path / "panel.json"
        _write_panel(panel_file)
        old_date = (datetime.now(tz=timezone.utc) - timedelta(days=60)).isoformat()

        result = check_panel_freshness(str(panel_file), old_date)

        assert result["days_since_sync"] >= 59
        assert result["is_stale"] is True

    def test_no_sync_date(self, tmp_path):
        panel_file = tmp_path / "panel.json"
        _write_panel(panel_file)

        result = check_panel_freshness(str(panel_file), None)

        assert result["days_since_sync"] == -1
        assert result["is_stale"] is True

    def test_freshness_threshold(self, tmp_path):
        panel_file = tmp_path / "panel.json"
        _write_panel(panel_file)
        exactly_30 = (datetime.now(tz=timezone.utc) - timedelta(days=30)).isoformat()

        result = check_panel_freshness(str(panel_file), exactly_30)

        # 30 days == threshold, not stale (>30 is stale)
        assert result["is_stale"] is False


# ---------------------------------------------------------------------------
# TestFetchClinVar
# ---------------------------------------------------------------------------


class TestFetchClinVar:
    """Tests for fetch_clinvar_summary (mocked HTTP)."""

    def test_successful_download(self, tmp_path):
        config = ClinVarSyncConfig(local_cache_dir=str(tmp_path / "cache"))

        # Create valid gzip content
        gz_content = gzip.compress(b"header\ndata line\n")

        mock_resp = MagicMock()
        mock_resp.iter_content.return_value = [gz_content]
        mock_resp.raise_for_status.return_value = None

        with patch("Source.clinvar_pipeline.requests.get", return_value=mock_resp):
            result = fetch_clinvar_summary(config, timeout=10)

        assert result.exists()
        assert result.name == "variant_summary.txt.gz"
        # Sync metadata saved
        sync_meta = json.loads((tmp_path / "cache" / "last_sync.json").read_text())
        assert "last_sync" in sync_meta

    def test_timeout_handling(self, tmp_path):
        import requests as req

        config = ClinVarSyncConfig(local_cache_dir=str(tmp_path / "cache"))

        with patch("Source.clinvar_pipeline.requests.get", side_effect=req.exceptions.Timeout("timed out")):
            with pytest.raises(req.exceptions.Timeout):
                fetch_clinvar_summary(config, timeout=1)

    def test_http_error(self, tmp_path):
        import requests as req

        config = ClinVarSyncConfig(local_cache_dir=str(tmp_path / "cache"))

        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = req.exceptions.HTTPError("404")

        with patch("Source.clinvar_pipeline.requests.get", return_value=mock_resp):
            with pytest.raises(req.exceptions.HTTPError):
                fetch_clinvar_summary(config, timeout=10)

    def test_invalid_gz(self, tmp_path):
        config = ClinVarSyncConfig(local_cache_dir=str(tmp_path / "cache"))

        # Return non-gzip data
        mock_resp = MagicMock()
        mock_resp.iter_content.return_value = [b"this is not gzip"]
        mock_resp.raise_for_status.return_value = None

        with patch("Source.clinvar_pipeline.requests.get", return_value=mock_resp):
            with pytest.raises(gzip.BadGzipFile):
                fetch_clinvar_summary(config, timeout=10)


# ---------------------------------------------------------------------------
# TestParseClinVar
# ---------------------------------------------------------------------------


class TestParseClinVar:
    """Tests for parse_clinvar_variants."""

    def test_parse_known_rsids(self, tmp_path):
        gz_file = tmp_path / "variants.gz"
        rows = [
            _clinvar_row("75030207", "Pathogenic"),
            _clinvar_row("113993960", "Likely pathogenic"),
            _clinvar_row("9999999", "Benign"),  # Not in our interest set
        ]
        _make_clinvar_gz(gz_file, rows)

        rsids = {"rs75030207", "rs113993960"}
        result = parse_clinvar_variants(gz_file, rsids)

        assert len(result) == 2
        assert result["rs75030207"]["clinical_significance"] == "Pathogenic"
        assert result["rs113993960"]["clinical_significance"] == "Likely pathogenic"

    def test_filter_irrelevant_rsids(self, tmp_path):
        gz_file = tmp_path / "variants.gz"
        rows = [
            _clinvar_row("9999999", "Benign"),
            _clinvar_row("8888888", "Pathogenic"),
        ]
        _make_clinvar_gz(gz_file, rows)

        rsids = {"rs75030207"}  # Neither row matches
        result = parse_clinvar_variants(gz_file, rsids)

        assert len(result) == 0

    def test_empty_file(self, tmp_path):
        gz_file = tmp_path / "empty.gz"
        _make_clinvar_gz(gz_file, [])

        result = parse_clinvar_variants(gz_file, {"rs75030207"})
        assert len(result) == 0

    def test_malformed_line_skipped(self, tmp_path):
        gz_file = tmp_path / "malformed.gz"
        # Create file with a short line that doesn't have enough columns
        header = "col0\tcol1"
        data = "short_line"
        content = f"{header}\n{data}\n"
        with gzip.open(gz_file, "wt", encoding="utf-8") as gz:
            gz.write(content)

        result = parse_clinvar_variants(gz_file, {"rs75030207"})
        assert len(result) == 0  # Malformed line skipped, no crash


# ---------------------------------------------------------------------------
# TestIdentifyStale
# ---------------------------------------------------------------------------


class TestIdentifyStale:
    """Tests for identify_stale_entries."""

    def test_no_changes(self):
        clinvar_data = {
            "rs75030207": {
                "clinical_significance": "Pathogenic",
                "review_status": "criteria provided",
                "last_evaluated": "2025-01-01",
                "condition": "Cystic Fibrosis",
            },
        }
        result = identify_stale_entries(SAMPLE_PANEL, clinvar_data)
        assert len(result) == 0

    def test_downgraded_variant(self):
        clinvar_data = {
            "rs75030207": {
                "clinical_significance": "Benign",
                "review_status": "reviewed by expert panel",
                "last_evaluated": "2025-06-01",
                "condition": "Cystic Fibrosis",
            },
        }
        result = identify_stale_entries(SAMPLE_PANEL, clinvar_data)
        assert len(result) == 1
        assert result[0]["change_type"] == "downgraded"
        assert result[0]["rsid"] == "rs75030207"
        assert result[0]["clinvar_classification"] == "benign"

    def test_upgraded_variant(self):
        # Our panel says "pathogenic"; ClinVar can't really upgrade from
        # pathogenic, but we can test the logic by comparing two entries.
        clinvar_data = {
            "rs75030207": {
                "clinical_significance": "Uncertain significance",
                "review_status": "criteria provided",
                "last_evaluated": "2025-03-01",
                "condition": "Cystic Fibrosis",
            },
        }
        result = identify_stale_entries(SAMPLE_PANEL, clinvar_data)
        assert len(result) == 1
        # From pathogenic (4) down to uncertain (2) = downgraded
        assert result[0]["change_type"] == "downgraded"

    def test_reclassified(self):
        clinvar_data = {
            "rs113993960": {
                "clinical_significance": "risk factor",
                "review_status": "criteria provided",
                "last_evaluated": "2025-04-01",
                "condition": "Cystic Fibrosis",
            },
        }
        result = identify_stale_entries(SAMPLE_PANEL, clinvar_data)
        assert len(result) == 1
        assert result[0]["change_type"] == "reclassified"

    def test_multiple_changes(self):
        clinvar_data = {
            "rs75030207": {
                "clinical_significance": "Likely benign",
                "review_status": "criteria provided",
                "last_evaluated": "2025-05-01",
                "condition": "CF",
            },
            "rs113993960": {
                "clinical_significance": "drug response",
                "review_status": "no assertion criteria",
                "last_evaluated": "2025-05-01",
                "condition": "CF",
            },
        }
        result = identify_stale_entries(SAMPLE_PANEL, clinvar_data)
        assert len(result) == 2
        change_types = {r["change_type"] for r in result}
        assert "downgraded" in change_types
        assert "reclassified" in change_types


# ---------------------------------------------------------------------------
# TestFreshnessReport
# ---------------------------------------------------------------------------


class TestFreshnessReport:
    """Tests for generate_freshness_report."""

    def test_report_structure(self):
        report = generate_freshness_report([], {"total_variants": 100})
        assert "generated_at" in report
        assert report["total_checked"] == 100
        assert report["total_stale"] == 0
        assert isinstance(report["breakdown_by_change_type"], dict)
        assert isinstance(report["safe_to_auto_apply"], list)
        assert isinstance(report["needs_manual_review"], list)
        assert isinstance(report["recommendations"], list)

    def test_report_with_changes(self):
        stale = [
            {
                "rsid": "rs1",
                "condition": "Test",
                "our_classification": "pathogenic",
                "clinvar_classification": "benign",
                "change_type": "downgraded",
                "clinvar_review_status": "reviewed",
            },
            {
                "rsid": "rs2",
                "condition": "Test2",
                "our_classification": "pathogenic",
                "clinvar_classification": "likely pathogenic",
                "change_type": "upgraded",
                "clinvar_review_status": "criteria provided",
            },
        ]
        report = generate_freshness_report(stale, {"total_variants": 50})
        assert report["total_stale"] == 2
        assert report["breakdown_by_change_type"]["downgraded"] == 1
        assert report["breakdown_by_change_type"]["upgraded"] == 1
        assert len(report["needs_manual_review"]) == 1
        assert len(report["safe_to_auto_apply"]) == 1

    def test_report_no_changes(self):
        report = generate_freshness_report([], {"total_variants": 200})
        assert report["total_stale"] == 0
        assert len(report["recommendations"]) == 1
        assert "consistent" in report["recommendations"][0].lower()

    def test_manual_review_flagging(self):
        stale = [
            {
                "rsid": "rs1",
                "condition": "Disease A",
                "our_classification": "pathogenic",
                "clinvar_classification": "benign",
                "change_type": "downgraded",
                "clinvar_review_status": "reviewed",
            },
            {
                "rsid": "rs2",
                "condition": "Disease B",
                "our_classification": "pathogenic",
                "clinvar_classification": "risk factor",
                "change_type": "reclassified",
                "clinvar_review_status": "no assertion",
            },
        ]
        report = generate_freshness_report(stale, {"total_variants": 10})
        assert len(report["needs_manual_review"]) == 2
        assert len(report["safe_to_auto_apply"]) == 0


# ---------------------------------------------------------------------------
# TestApplyUpdates
# ---------------------------------------------------------------------------


class TestApplyUpdates:
    """Tests for apply_clinvar_updates."""

    def test_apply_creates_backup(self, tmp_path):
        panel_file = tmp_path / "panel.json"
        _write_panel(panel_file)

        updates = [
            {
                "rsid": "rs75030207",
                "clinvar_classification": "likely benign",
                "our_classification": "pathogenic",
            },
        ]
        result = apply_clinvar_updates(str(panel_file), updates, backup=True)

        assert result["backup_path"] != ""
        assert Path(result["backup_path"]).exists()
        assert result["applied"] == 1
        assert result["skipped"] == 0

    def test_apply_with_confirm(self, tmp_path):
        panel_file = tmp_path / "panel.json"
        _write_panel(panel_file)

        updates = [
            {
                "rsid": "rs113993960",
                "clinvar_classification": "uncertain significance",
                "our_classification": "pathogenic",
            },
        ]
        result = apply_clinvar_updates(str(panel_file), updates)

        # Verify the update was written to the file
        with open(panel_file) as f:
            updated_panel = json.load(f)

        matching = [e for e in updated_panel if e["rsid"] == "rs113993960"]
        assert len(matching) == 1
        assert "[UPDATE]" in matching[0]["notes"]
        assert result["applied"] == 1

    def test_apply_empty_updates(self, tmp_path):
        panel_file = tmp_path / "panel.json"
        _write_panel(panel_file)

        result = apply_clinvar_updates(str(panel_file), [], backup=False)

        assert result["applied"] == 0
        assert result["skipped"] == 0
        assert result["backup_path"] == ""


# ---------------------------------------------------------------------------
# TestCLI
# ---------------------------------------------------------------------------


class TestCLI:
    """Tests for the CLI entry point."""

    def test_check_command(self, tmp_path):
        from scripts.clinvar_sync import main

        panel_file = tmp_path / "panel.json"
        _write_panel(panel_file)

        # No sync file exists, so panel should be stale (exit 2)
        exit_code = main([
            "check",
            "--panel", str(panel_file),
            "--cache-dir", str(tmp_path / "cache"),
        ])
        assert exit_code == 2

    def test_sync_command(self, tmp_path):
        from scripts.clinvar_sync import main

        panel_file = tmp_path / "panel.json"
        _write_panel(panel_file)

        # Create a valid gz for fetch to "download"
        gz_content = gzip.compress(b"header\ndata\n")
        mock_resp = MagicMock()
        mock_resp.iter_content.return_value = [gz_content]
        mock_resp.raise_for_status.return_value = None

        with patch("Source.clinvar_pipeline.requests.get", return_value=mock_resp):
            exit_code = main([
                "sync",
                "--panel", str(panel_file),
                "--cache-dir", str(tmp_path / "cache"),
                "--output-dir", str(tmp_path / "reports"),
            ])

        assert exit_code == 0
        assert (tmp_path / "reports" / "sync_report.json").exists()

    def test_help_output(self, capsys):
        from scripts.clinvar_sync import main

        # No command = prints help and exits with 1
        exit_code = main([])
        assert exit_code == 1
