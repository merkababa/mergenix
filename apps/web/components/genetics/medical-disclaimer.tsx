"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { Shield, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

interface MedicalDisclaimerProps {
  /** "compact" for in-tab single line, "full" for multi-paragraph */
  variant?: "compact" | "full";
  /** Optional custom disclaimer text (only used with compact variant) */
  text?: string;
}

/**
 * Medical disclaimer component with two variants:
 * - compact: single-line shield icon + short text (inline in result tabs)
 * - full: multi-paragraph warning covering DTC limitations (bottom of results)
 */
export function MedicalDisclaimer({
  variant = "compact",
  text,
}: MedicalDisclaimerProps) {
  if (variant === "compact") {
    return (
      <GlassCard
        variant="subtle"
        hover="none"
        role="note"
        aria-label="Medical disclaimer"
        className="flex items-start gap-3 border-[rgba(6,214,160,0.15)] p-4"
      >
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-teal)" />
        <p className="text-xs leading-relaxed text-(--text-muted)">
          {text ||
            "These results are for educational purposes only and are not medical diagnoses. Consult a genetic counselor or healthcare professional for medical decisions."}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      variant="subtle"
      hover="none"
      role="note"
      aria-label="Medical disclaimer"
      className="space-y-3 border-[rgba(6,214,160,0.15)] p-6"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-(--accent-amber)" />
        <h4 className="font-heading text-sm font-bold text-(--text-heading)">
          Important Medical Disclaimer
        </h4>
      </div>

      <p className="text-xs leading-relaxed text-(--text-muted)">
        These results are generated for <strong>educational purposes only</strong> and
        do not constitute a medical diagnosis, prognosis, or treatment recommendation.
      </p>

      <p className="text-xs leading-relaxed text-(--text-muted)">
        Always consult a <strong>certified genetic counselor</strong> or qualified
        healthcare professional before making any medical decisions based on genetic
        information.
      </p>

      <p className="text-xs leading-relaxed text-(--text-muted)">
        Direct-to-consumer (DTC) genotyping arrays have inherent limitations: they do
        not detect structural variants, copy number variations (CNVs), repeat
        expansions, or epigenetic modifications. Clinical-grade sequencing may be
        required for a comprehensive assessment.
      </p>

      <p className="text-xs leading-relaxed text-(--text-muted)">
        Accuracy of risk estimates may vary across ancestral populations due to
        differences in allele frequencies and the populations represented in
        genome-wide association studies (GWAS).
      </p>
    </GlassCard>
  );
}
