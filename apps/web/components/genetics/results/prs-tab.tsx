"use client";

import { memo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { PrsGauge } from "@/components/genetics/prs-gauge";
import { MedicalDisclaimer } from "@/components/genetics/medical-disclaimer";
import { TierUpgradePrompt } from "@/components/genetics/tier-upgrade-prompt";
import { useAnalysisStore } from "@/lib/stores/analysis-store";
import type { RiskCategory, PrsConditionResult } from "@mergenix/shared-types";

/** Map a RiskCategory to the corresponding Badge variant. */
function riskBadgeVariant(
  category: RiskCategory,
): "low" | "default" | "moderate" | "high" {
  switch (category) {
    case "low":
    case "below_average":
      return "low";
    case "average":
      return "default";
    case "above_average":
    case "elevated":
      return "moderate";
    case "high":
      return "high";
  }
}

/** Human-readable label for a RiskCategory. */
function riskLabel(category: RiskCategory): string {
  const labels: Record<RiskCategory, string> = {
    low: "Low",
    below_average: "Below Average",
    average: "Average",
    above_average: "Above Average",
    elevated: "Elevated",
    high: "High",
  };
  return labels[category];
}

export function PrsTab() {
  const fullResults = useAnalysisStore((s) => s.fullResults);

  if (!fullResults) return null;

  const { prs } = fullResults;
  const conditions = Object.values(prs.conditions);

  return (
    <div className="space-y-6">
      <h3 className="font-heading text-lg font-bold text-[var(--text-heading)]">
        Polygenic Risk Scores
      </h3>

      {/* Tier-limited upgrade prompt */}
      {prs.isLimited && (
        <TierUpgradePrompt
          message={prs.upgradeMessage || "Upgrade your plan for comprehensive polygenic risk scores."}
        />
      )}

      {/* No conditions available */}
      {conditions.length === 0 && (
        <GlassCard variant="subtle" hover="none" className="p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No polygenic risk score data available.
          </p>
        </GlassCard>
      )}

      {/* Condition cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {conditions.map((condition) => (
          <PrsConditionCard key={condition.name} condition={condition} />
        ))}
      </div>

      {/* PRS disclaimer */}
      {prs.disclaimer && (
        <GlassCard variant="subtle" hover="none" className="p-4">
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            {prs.disclaimer}
          </p>
        </GlassCard>
      )}

      {/* Medical disclaimer */}
      <MedicalDisclaimer
        variant="compact"
        text="Polygenic risk scores are statistical estimates based on population-level data and may not reflect individual risk. Results should be discussed with a healthcare professional."
      />
    </div>
  );
}

// ─── Sub-component ──────────────────────────────────────────────────────────

interface PrsConditionCardProps {
  condition: PrsConditionResult;
}

const PrsConditionCard = memo(function PrsConditionCard({ condition }: PrsConditionCardProps) {
  const { offspring, parentA, parentB, ancestryNote } = condition;

  return (
    <GlassCard variant="medium" hover="glow" className="p-5">
      {/* Gauge */}
      <PrsGauge
        percentile={offspring.expectedPercentile}
        condition={condition.name}
      />

      {/* Offspring expected range */}
      <div className="mt-4 rounded-[10px] bg-[rgba(6,182,212,0.06)] px-3 py-2 text-center">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-dim)]">
          Expected Range
        </p>
        <p className="mt-0.5 font-heading text-sm font-bold text-[var(--text-heading)]">
          {Math.round(offspring.rangeLow)}
          <span className="text-[var(--text-dim)]">th</span>
          {" \u2013 "}
          {Math.round(offspring.rangeHigh)}
          <span className="text-[var(--text-dim)]">th</span>
          {" percentile"}
        </p>
      </div>

      {/* Parent details */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <p className="font-semibold text-[var(--text-body)]">Parent A</p>
          <p className="text-[var(--text-muted)]">
            {Math.round(parentA.percentile)}th percentile
          </p>
          <Badge variant={riskBadgeVariant(parentA.riskCategory)}>
            {riskLabel(parentA.riskCategory)}
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-[var(--text-body)]">Parent B</p>
          <p className="text-[var(--text-muted)]">
            {Math.round(parentB.percentile)}th percentile
          </p>
          <Badge variant={riskBadgeVariant(parentB.riskCategory)}>
            {riskLabel(parentB.riskCategory)}
          </Badge>
        </div>
      </div>

      {/* Ancestry note */}
      {ancestryNote && (
        <p className="mt-3 text-[10px] leading-relaxed text-[var(--text-dim)]">
          {ancestryNote}
        </p>
      )}
    </GlassCard>
  );
});
