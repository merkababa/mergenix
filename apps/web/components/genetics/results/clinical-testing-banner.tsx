"use client";

import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import { CLINICAL_TESTING_DISCLAIMER } from "@/lib/constants/disclaimers";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClinicalTestingBannerProps {
  /** Variant controls context-specific messaging. */
  variant?: "carrier" | "prs" | "pgx";
}

// ─── Constants ──────────────────────────────────────────────────────────────

const VARIANT_MESSAGES: Record<string, string> = {
  carrier:
    "This is NOT a replacement for clinical carrier screening. Consumer DNA chips test a limited subset of variants. Consult a certified genetic counselor or medical geneticist for comprehensive carrier testing before making reproductive decisions.",
  prs:
    "Polygenic risk scores are NOT diagnostic. They reflect statistical associations, not clinical diagnoses. Discuss any concerns with your healthcare provider for proper evaluation.",
  pgx:
    "Pharmacogenomic results are NOT a substitute for clinical pharmacogenomic testing. Always consult your prescribing physician or pharmacist before making any medication changes.",
};

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Alert banner reminding users that results are not clinical-grade.
 *
 * Uses `role="alert"` for screen reader announcement. Styled as an
 * amber/warning banner consistent with the design system.
 */
export const ClinicalTestingBanner = memo(function ClinicalTestingBanner({
  variant,
}: ClinicalTestingBannerProps) {
  const message = variant ? VARIANT_MESSAGES[variant] ?? CLINICAL_TESTING_DISCLAIMER : CLINICAL_TESTING_DISCLAIMER;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.06)] p-4"
    >
      <AlertTriangle
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--accent-amber)]"
        aria-hidden="true"
      />
      <p className="text-xs font-medium leading-relaxed text-[var(--text-body)]">
        {message}
      </p>
    </div>
  );
});
