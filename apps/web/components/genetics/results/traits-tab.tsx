"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { AlertCircle, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { MedicalDisclaimer } from "@/components/genetics/medical-disclaimer";
import { TierUpgradePrompt } from "@/components/genetics/tier-upgrade-prompt";
import { LimitationsSection } from "@/components/genetics/results/limitations-section";
import { useAnalysisStore } from "@/lib/stores/analysis-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { TraitResult } from "@mergenix/shared-types";

/** Map confidence level to Badge variant. */
function confidenceVariant(confidence: TraitResult["confidence"]) {
  const map = {
    high: "confidence-high",
    medium: "confidence-medium",
    low: "confidence-low",
  } as const;
  return map[confidence];
}

export function TraitsTab() {
  const fullResults = useAnalysisStore((s) => s.fullResults);
  const user = useAuthStore((s) => s.user);
  const userTier = user?.tier ?? "free";

  if (!fullResults) return null;

  const { traits, metadata } = fullResults;

  if (traits.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[var(--text-muted)]">No trait predictions available.</p>
      </div>
    );
  }

  const successful = traits.filter((t) => t.status === "success");
  const missing = traits.filter((t) => t.status === "missing");

  return (
    <div data-privacy-mask="true" className="space-y-6">
      {/* Free-tier banner — traits are included free */}
      {userTier === "free" && (
        <GlassCard
          variant="subtle"
          hover="none"
          className="flex items-center gap-3 border-[rgba(6,214,160,0.15)] bg-[rgba(6,214,160,0.04)] p-4"
        >
          <Sparkles className="h-5 w-5 flex-shrink-0 text-[var(--accent-teal)]" aria-hidden="true" />
          <p className="text-sm text-[var(--text-body)]">
            Traits are included free. Upgrade to Premium for health insights.
          </p>
        </GlassCard>
      )}

      <h3 className="font-heading text-lg font-bold text-[var(--text-heading)]">
        Trait Predictions
      </h3>

      {/* Tier upgrade prompt — upsell health/couple features (traits are free for all tiers) */}
      {metadata.tier === "free" && (
        <TierUpgradePrompt
          message="Upgrade to Premium to unlock disease screening, pharmacogenomics, and polygenic risk scores."
          buttonText="Unlock Health Insights"
        />
      )}
      {metadata.tier === "premium" && (
        <TierUpgradePrompt
          message="Upgrade to Pro for couple analysis, offspring predictions, and Virtual Baby."
          buttonText="Upgrade to Pro"
        />
      )}

      {/* Successful trait cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {successful.map((trait) => (
          <GlassCard
            key={trait.rsid}
            variant="medium"
            hover="glow"
            className="p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-heading text-sm font-semibold text-[var(--text-heading)]">
                  {trait.trait}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">
                  {trait.gene} &middot; {trait.rsid}
                </p>
              </div>
              <Badge variant={confidenceVariant(trait.confidence)}>
                {trait.confidence}
              </Badge>
            </div>

            {/* Offspring probability bars */}
            <div className="mt-3 space-y-1.5">
              {Object.entries(trait.offspringProbabilities).map(
                ([phenotype, pct]) => (
                  <div key={phenotype} className="flex items-center gap-2">
                    <div className="w-20 truncate text-xs text-[var(--text-muted)]">
                      {phenotype}
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${phenotype}: ${pct}%`}
                      className="h-2 flex-1 rounded-full bg-[var(--glass-bg)]"
                    >
                      <div
                        className="h-2 rounded-full bg-[var(--accent-teal)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-medium text-[var(--text-body)]">
                      {pct}%
                    </span>
                  </div>
                ),
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Missing data section */}
      {missing.length > 0 && (
        <GlassCard variant="subtle" hover="none" className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-dim)]" />
            <div>
              <p className="text-xs font-semibold text-[var(--text-body)]">
                Missing Data ({missing.length} trait{missing.length !== 1 ? "s" : ""})
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                The following traits could not be predicted because one or both parents
                are missing genotype data at the required SNP.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missing.map((trait) => (
                  <Badge key={trait.rsid} variant="default">
                    {trait.trait}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Limitations section */}
      <LimitationsSection limitations={[]} context="trait" />

      {/* Trait prediction disclaimer */}
      <MedicalDisclaimer
        variant="compact"
        text="Trait predictions are based on simplified genetic models and may not account for gene-gene interactions, epigenetics, or environmental factors."
      />
    </div>
  );
}
