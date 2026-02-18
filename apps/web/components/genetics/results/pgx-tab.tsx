"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { memo } from "react";
import { useRouter } from "next/navigation";
import { Pill, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { TierUpgradePrompt } from "@/components/genetics/tier-upgrade-prompt";
import { SensitiveContentGuard } from "@/components/ui/sensitive-content-guard";
import { CYP2D6Warning } from "@/components/genetics/results/cyp2d6-warning";
import { LimitationsSection } from "@/components/genetics/results/limitations-section";
import { ClinicalTestingBanner } from "@/components/genetics/results/clinical-testing-banner";
import { useAnalysisStore } from "@/lib/stores/analysis-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { canAccessFeature } from "@mergenix/shared-types";
import type { MetabolizerStatus, PgxGeneResult } from "@mergenix/shared-types";

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Map metabolizer status to Badge variant names.
 *
 * - normal_metabolizer   -> "normal"  (green)
 * - intermediate_metabolizer -> "carrier" (amber)
 * - poor_metabolizer     -> "affected" (red)
 * - rapid_metabolizer    -> "moderate" (amber)
 * - ultra_rapid_metabolizer -> "high" (red)
 * - unknown              -> "default"
 */
const METABOLIZER_BADGE_MAP: Record<
  MetabolizerStatus,
  "normal" | "carrier" | "affected" | "moderate" | "high" | "default"
> = {
  normal_metabolizer: "normal",
  intermediate_metabolizer: "carrier",
  poor_metabolizer: "affected",
  rapid_metabolizer: "moderate",
  ultra_rapid_metabolizer: "high",
  unknown: "default",
};

/** Human-readable metabolizer status labels. */
const METABOLIZER_LABELS: Record<MetabolizerStatus, string> = {
  normal_metabolizer: "Normal Metabolizer",
  intermediate_metabolizer: "Intermediate Metabolizer",
  poor_metabolizer: "Poor Metabolizer",
  rapid_metabolizer: "Rapid Metabolizer",
  ultra_rapid_metabolizer: "Ultra-Rapid Metabolizer",
  unknown: "Unknown",
};

/** Returns true if the metabolizer status is not normal or unknown. */
function isNonNormalMetabolizer(status: MetabolizerStatus): boolean {
  return status !== "normal_metabolizer" && status !== "unknown";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PgxTab() {
  const router = useRouter();
  const fullResults = useAnalysisStore((s) => s.fullResults);
  const user = useAuthStore((s) => s.user);
  const userTier = user?.tier ?? "free";

  if (!fullResults) return null;

  const { pgx } = fullResults;
  const geneResults = Object.values(pgx.results);

  return (
    <SensitiveContentGuard
      category="pgx"
      tier={userTier}
      requiredTier="premium"
      onUpgrade={() => {
        router.push("/subscription");
      }}
    >
    <div data-privacy-mask="true" className="space-y-6">
      {/* Clinical testing banner */}
      <ClinicalTestingBanner />

      {/* Header */}
      <div className="flex items-center gap-2">
        <Pill className="h-5 w-5 text-[var(--accent-teal)]" />
        <h3 className="font-heading text-xl font-bold text-[var(--text-heading)]">
          Pharmacogenomics
        </h3>
      </div>

      {/* CYP2D6 array limitation warning */}
      <CYP2D6Warning
        gene="CYP2D6"
        hasWarning={"CYP2D6" in pgx.results}
      />

      {/* Upgrade prompt for limited tiers */}
      {pgx.isLimited && (
        <TierUpgradePrompt
          message={pgx.upgradeMessage || "Upgrade your plan for full pharmacogenomic analysis."}
        />
      )}

      {/* Gene results grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {geneResults.map((gene) => (
          <GeneCard key={gene.gene} gene={gene} canShowOffspring={canAccessFeature(userTier, "couple")} />
        ))}
      </div>

      {/* Empty state */}
      {geneResults.length === 0 && (
        <GlassCard variant="subtle" hover="none" className="p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No pharmacogenomic results available.
          </p>
        </GlassCard>
      )}

      {/* DTC disclaimer */}
      {pgx.disclaimer && (
        <GlassCard variant="subtle" hover="none" className="p-4">
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            {pgx.disclaimer}
          </p>
        </GlassCard>
      )}

      {/* Limitations section */}
      <LimitationsSection limitations={[]} context="pgx" />
    </div>
    </SensitiveContentGuard>
  );
}

// ─── Gene Card Sub-component ────────────────────────────────────────────────

const GeneCard = memo(function GeneCard({ gene, canShowOffspring }: { gene: PgxGeneResult; canShowOffspring: boolean }) {
  const hasParentAWarning = isNonNormalMetabolizer(
    gene.parentA.metabolizerStatus.status,
  );
  const hasParentBWarning = isNonNormalMetabolizer(
    gene.parentB.metabolizerStatus.status,
  );
  const hasAnyWarning = hasParentAWarning || hasParentBWarning;

  return (
    <GlassCard variant="medium" hover="none" className="space-y-4 p-5">
      {/* Gene header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="flex items-center gap-2 font-heading text-base font-bold text-[#06b6d4]">
            {gene.gene}
            {hasAnyWarning && (
              <AlertTriangle className="h-4 w-4 text-[#f59e0b]" aria-hidden="true" />
            )}
          </h4>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {gene.description}
          </p>
        </div>
      </div>

      {/* Parent A */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">
          Parent A
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-body)]">
          <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-xs">
            {gene.parentA.diplotype}
          </code>
          <Badge
            variant={METABOLIZER_BADGE_MAP[gene.parentA.metabolizerStatus.status]}
          >
            {METABOLIZER_LABELS[gene.parentA.metabolizerStatus.status]}
          </Badge>
        </div>
      </div>

      {/* Parent B */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">
          Parent B
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-body)]">
          <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-xs">
            {gene.parentB.diplotype}
          </code>
          <Badge
            variant={METABOLIZER_BADGE_MAP[gene.parentB.metabolizerStatus.status]}
          >
            {METABOLIZER_LABELS[gene.parentB.metabolizerStatus.status]}
          </Badge>
        </div>
      </div>

      {/* Parent A Drug recommendations */}
      {gene.parentA.drugRecommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">
            Parent A Drug Recommendations
          </p>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Parent A drug recommendations">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                  <th className="pb-1.5 pr-3 font-medium">Drug</th>
                  <th className="pb-1.5 pr-3 font-medium">Recommendation</th>
                  <th className="pb-1.5 pr-3 font-medium">Strength</th>
                  <th className="pb-1.5 font-medium">Category</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-body)]">
                {gene.parentA.drugRecommendations.map((rec) => (
                  <tr
                    key={rec.drug}
                    className="border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <td className="py-1.5 pr-3 font-medium">{rec.drug}</td>
                    <td className="py-1.5 pr-3">{rec.recommendation}</td>
                    <td className="py-1.5 pr-3">
                      <Badge
                        variant={rec.strength === "strong" ? "high" : "moderate"}
                      >
                        {rec.strength}
                      </Badge>
                    </td>
                    <td className="py-1.5">{rec.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Parent B Drug recommendations */}
      {gene.parentB.drugRecommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">
            Parent B Drug Recommendations
          </p>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Parent B drug recommendations">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                  <th className="pb-1.5 pr-3 font-medium">Drug</th>
                  <th className="pb-1.5 pr-3 font-medium">Recommendation</th>
                  <th className="pb-1.5 pr-3 font-medium">Strength</th>
                  <th className="pb-1.5 font-medium">Category</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-body)]">
                {gene.parentB.drugRecommendations.map((rec) => (
                  <tr
                    key={`b-${rec.drug}`}
                    className="border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <td className="py-1.5 pr-3 font-medium">{rec.drug}</td>
                    <td className="py-1.5 pr-3">{rec.recommendation}</td>
                    <td className="py-1.5 pr-3">
                      <Badge
                        variant={rec.strength === "strong" ? "high" : "moderate"}
                      >
                        {rec.strength}
                      </Badge>
                    </td>
                    <td className="py-1.5">{rec.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Offspring predictions (Pro tier only — couple/offspring data is gated) */}
      {canShowOffspring && gene.offspringPredictions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">
            Offspring Predictions
          </p>
          <div className="space-y-1.5">
            {gene.offspringPredictions.map((pred) => (
              <div
                key={pred.diplotype}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-xs"
              >
                <code className="font-mono font-semibold text-[var(--text-heading)]">
                  {pred.diplotype}
                </code>
                <span className="text-[var(--text-muted)]">
                  {(pred.probability * 100).toFixed(0)}%
                </span>
                <Badge
                  variant={METABOLIZER_BADGE_MAP[pred.metabolizerStatus.status]}
                >
                  {METABOLIZER_LABELS[pred.metabolizerStatus.status]}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
});
