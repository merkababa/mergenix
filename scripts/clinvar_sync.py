#!/usr/bin/env python3
"""
CLI entry point for ClinVar data freshness sync.

Usage:
    python scripts/clinvar_sync.py check              # Report freshness status
    python scripts/clinvar_sync.py sync               # Download + diff report
    python scripts/clinvar_sync.py report             # Show last sync report
    python scripts/clinvar_sync.py apply --confirm     # Apply approved updates

Exit codes:
    0 = success
    1 = error
    2 = stale data found (check/sync)
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from Source.clinvar_pipeline import (
    ClinVarSyncConfig,
    apply_clinvar_updates,
    check_panel_freshness,
    fetch_clinvar_summary,
    generate_freshness_report,
    identify_stale_entries,
    parse_clinvar_variants,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def _load_last_sync_date(config: ClinVarSyncConfig) -> str | None:
    """Read last sync date from the sync metadata file."""
    sync_file = Path(config.last_sync_file)
    if not sync_file.exists():
        return None
    with open(sync_file) as f:
        meta = json.load(f)
    return meta.get("last_sync")


def cmd_check(config: ClinVarSyncConfig) -> int:
    """Report panel freshness status."""
    last_sync = _load_last_sync_date(config)
    status = check_panel_freshness(config.panel_path, last_sync)

    print(f"Total variants in panel: {status['total_variants']}")
    print(f"Days since last sync:    {status['days_since_sync']}")
    print(f"Stale threshold:         {status['stale_threshold_days']} days")
    print(f"Panel is stale:          {'YES' if status['is_stale'] else 'No'}")

    return 2 if status["is_stale"] else 0


def cmd_sync(config: ClinVarSyncConfig, output_dir: str | None = None) -> int:
    """Download latest ClinVar data and generate diff report."""
    # Download
    try:
        gz_path = fetch_clinvar_summary(config)
    except Exception as exc:
        logger.error("Failed to download ClinVar data: %s", exc)
        return 1

    # Load panel and extract rsIDs of interest
    with open(config.panel_path) as f:
        panel = json.load(f)
    rsids = {entry["rsid"] for entry in panel}

    # Parse
    clinvar_data = parse_clinvar_variants(gz_path, rsids)

    # Identify stale
    stale = identify_stale_entries(panel, clinvar_data)

    # Freshness stats
    last_sync = _load_last_sync_date(config)
    panel_stats = check_panel_freshness(config.panel_path, last_sync)

    # Report
    report = generate_freshness_report(stale, panel_stats)

    # Output
    if output_dir:
        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)
        report_path = out / "sync_report.json"
    else:
        report_path = Path(config.local_cache_dir) / "sync_report.json"

    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"Sync complete. Report saved to {report_path}")
    print(f"Total checked:  {report['total_checked']}")
    print(f"Total stale:    {report['total_stale']}")
    for rec in report["recommendations"]:
        print(f"  - {rec}")

    return 2 if report["total_stale"] > 0 else 0


def cmd_report(config: ClinVarSyncConfig) -> int:
    """Show last sync report without downloading."""
    report_path = Path(config.local_cache_dir) / "sync_report.json"
    if not report_path.exists():
        logger.error("No sync report found. Run 'sync' first.")
        return 1

    with open(report_path) as f:
        report = json.load(f)

    print(json.dumps(report, indent=2))
    return 0


def cmd_apply(config: ClinVarSyncConfig, confirm: bool) -> int:
    """Apply approved updates to carrier_panel.json."""
    if not confirm:
        logger.error("Safety: --confirm flag required to apply updates.")
        return 1

    report_path = Path(config.local_cache_dir) / "sync_report.json"
    if not report_path.exists():
        logger.error("No sync report found. Run 'sync' first.")
        return 1

    with open(report_path) as f:
        report = json.load(f)

    approved = report.get("safe_to_auto_apply", [])
    if not approved:
        print("No safe-to-auto-apply updates found.")
        return 0

    result = apply_clinvar_updates(config.panel_path, approved)
    print(f"Applied: {result['applied']}, Skipped: {result['skipped']}")
    if result["backup_path"]:
        print(f"Backup:  {result['backup_path']}")
    return 0


def _add_common_args(parser: argparse.ArgumentParser) -> None:
    """Add --panel and --cache-dir to a subparser."""
    parser.add_argument("--panel", default="data/carrier_panel.json", help="Path to carrier_panel.json")
    parser.add_argument("--cache-dir", default="data/clinvar_cache", help="Local cache directory")


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI argument parser."""
    parser = argparse.ArgumentParser(
        prog="clinvar_sync",
        description="ClinVar data freshness pipeline for Mergenix.",
    )
    sub = parser.add_subparsers(dest="command", help="Available commands")

    check_p = sub.add_parser("check", help="Report panel freshness status")
    _add_common_args(check_p)

    sync_p = sub.add_parser("sync", help="Download latest ClinVar data and generate diff report")
    sync_p.add_argument("--output-dir", default=None, help="Directory for report output")
    _add_common_args(sync_p)

    report_p = sub.add_parser("report", help="Show last sync report")
    _add_common_args(report_p)

    apply_p = sub.add_parser("apply", help="Apply approved updates")
    apply_p.add_argument("--confirm", action="store_true", help="Required safety flag")
    _add_common_args(apply_p)

    return parser


def main(argv: list[str] | None = None) -> int:
    """Main entry point, returns exit code."""
    parser = build_parser()
    args = parser.parse_args(argv)

    if not args.command:
        parser.print_help()
        return 1

    config = ClinVarSyncConfig(
        panel_path=args.panel,
        local_cache_dir=args.cache_dir,
    )

    if args.command == "check":
        return cmd_check(config)
    elif args.command == "sync":
        return cmd_sync(config, getattr(args, "output_dir", None))
    elif args.command == "report":
        return cmd_report(config)
    elif args.command == "apply":
        return cmd_apply(config, getattr(args, "confirm", False))
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
