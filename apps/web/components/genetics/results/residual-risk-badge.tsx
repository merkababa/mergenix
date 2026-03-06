"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { memo } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ResidualRiskBadgeProps {
  /** Coverage percentage for this disease (0–100). */
  coveragePct: number;
  /** Disease name for accessibility labelling. */
  diseaseName: string;
  /** Whether the carrier test result was "Not Detected". Only renders when true. */
  isNotDetected: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getQualitativeLabel(coveragePct: number): {
  label: string;
  explanation: string;
} {
  if (coveragePct >= 100) {
    return {
      label: "Fully Tested",
      explanation: "Residual risk is very low — novel variants not in current databases may still exist",
    };
  }
  if (coveragePct >= 95) {
    return {
      label: "Very Low Residual Risk",
      explanation: "Most known variants tested",
    };
  }
  if (coveragePct >= 80) {
    return {
      label: "Low Residual Risk",
      explanation: "Good variant coverage",
    };
  }
  if (coveragePct >= 50) {
    return {
      label: "Moderate Residual Risk",
      explanation: "Partial variant coverage",
    };
  }
  return {
    label: "Significant Residual Risk",
    explanation: "Clinical testing recommended",
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Shows qualitative post-test residual risk for "Not Detected" carrier results.
 *
 * Displays a label based on coverage percentage rather than a computed numeric
 * risk, since accurate residual risk requires carrier frequency data that is
 * not available from DTC genotyping alone.
 *
 * Only renders when `isNotDetected` is true.
 */
export const ResidualRiskBadge = memo(function ResidualRiskBadge({
  coveragePct,
  diseaseName,
  isNotDetected,
}: ResidualRiskBadgeProps) {
  if (!isNotDetected) return null;

  const { label, explanation } = getQualitativeLabel(coveragePct);

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-(--border-subtle) bg-(--bg-elevated) px-2.5 py-0.5 text-[11px] font-medium text-(--text-muted)"
      role="status"
      aria-label={`${diseaseName}: ${label} — ${explanation}`}
    >
      {label}
    </span>
  );
});
