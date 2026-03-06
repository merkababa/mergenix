"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { memo } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CoverageMeterProps {
  /** Number of variants tested for this disease. */
  variantsTested: number;
  /** Total known variants for this disease. */
  variantsTotal: number;
  /** Coverage percentage (0-100). */
  coveragePct: number;
  /** Confidence level based on coverage. */
  confidenceLevel: string;
  /** Disease name for accessibility labelling. */
  diseaseName: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getConfidenceColor(level: string): string {
  switch (level) {
    case "high":
      return "var(--accent-teal)";
    case "moderate":
      return "var(--accent-amber)";
    case "low":
    case "insufficient":
      return "var(--accent-rose)";
    default:
      return "var(--text-muted)";
  }
}

function getConfidenceBgColor(level: string): string {
  switch (level) {
    case "high":
      return "rgba(6, 214, 160, 0.12)";
    case "moderate":
      return "rgba(245, 158, 11, 0.12)";
    case "low":
    case "insufficient":
      return "rgba(244, 63, 94, 0.12)";
    default:
      return "rgba(148, 163, 184, 0.08)";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Per-disease coverage meter showing how many target variants were tested.
 *
 * Uses `role="meter"` with full ARIA attributes for screen reader accessibility.
 * Color-coded by confidence level (high=teal, moderate=amber, low=rose).
 */
export const CoverageMeter = memo(function CoverageMeter({
  variantsTested,
  variantsTotal,
  coveragePct,
  confidenceLevel,
  diseaseName,
}: CoverageMeterProps) {
  const roundedPct = Math.round(coveragePct);
  const barColor = getConfidenceColor(confidenceLevel);
  const bgColor = getConfidenceBgColor(confidenceLevel);

  return (
    <div className="space-y-1.5" style={{ background: bgColor, borderRadius: "8px", padding: "8px 10px" }}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-(--text-body)">
          Tested {variantsTested} of {variantsTotal} variants
        </span>
        <span
          className="font-mono font-semibold"
          style={{ color: barColor }}
        >
          {roundedPct}%
        </span>
      </div>
      <div
        role="meter"
        aria-valuenow={roundedPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`Tested ${variantsTested} of ${variantsTotal} variants (${roundedPct}%)`}
        aria-label={`${diseaseName} variant coverage`}
        className="h-1.5 w-full rounded-full bg-(--border-subtle)"
      >
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${roundedPct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
});
