"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { PrsGauge } from "@/components/genetics/prs-gauge";
import { MedicalDisclaimer } from "@/components/genetics/medical-disclaimer";
import { TierUpgradePrompt } from "@/components/genetics/tier-upgrade-prompt";
import { SensitiveContentGuard } from "@/components/ui/sensitive-content-guard";
import { AncestryConfidenceBadge } from "@/components/genetics/results/ancestry-confidence-badge";
import { PrsContextDisclaimer } from "@/components/genetics/results/prs-context-disclaimer";
import { LimitationsSection } from "@/components/genetics/results/limitations-section";
import { ClinicalTestingBanner } from "@/components/genetics/results/clinical-testing-banner";
import { useAnalysisStore } from "@/lib/stores/analysis-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { PRS_ANCESTRY_WARNING } from "@/lib/constants/disclaimers";
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

/**
 * Known ancestry terms that indicate high PRS confidence (European-derived GWAS).
 * Includes terms like "caucasian" and "white" that users may self-report;
 * these are matched for confidence purposes but mapped to geographic labels in output.
 */
const HIGH_CONFIDENCE_ANCESTRY_TERMS = [
  "european",
  "eur",
  "caucasian",
  "white",
];

/** Pre-compiled regex patterns for HIGH_CONFIDENCE_ANCESTRY_TERMS (avoids recompilation in loops). */
const HIGH_CONFIDENCE_PATTERNS = HIGH_CONFIDENCE_ANCESTRY_TERMS.map(
  (term) => new RegExp(`(?<!non[-\\s]?)\\b${term}\\b`, "i"),
);

/**
 * Infer ancestry confidence level from a free-text ancestry note.
 * Uses word-boundary matching against known high-confidence ancestry terms.
 * Defaults to 'low' if ancestry cannot be determined (safer assumption).
 */
function inferAncestryConfidence(
  ancestryNote: string | undefined,
): "high" | "medium" | "low" {
  if (!ancestryNote) return "low";

  const normalized = ancestryNote.toLowerCase();

  for (const pattern of HIGH_CONFIDENCE_PATTERNS) {
    if (pattern.test(normalized)) return "high";
  }

  return "low";
}

/**
 * Extract a human-readable ancestry label from the ancestry note.
 * Falls back to "Unknown" if no recognizable ancestry is mentioned.
 */
function extractAncestryLabel(ancestryNote: string | undefined): string {
  if (!ancestryNote) return "Unknown";

  const normalized = ancestryNote.toLowerCase();

  // Check for known ancestry groups — return geographic ancestry labels (ASHG recommended)
  if (/(?<!non[-\s]?)\beuropean\b/i.test(normalized)) return "European";
  if (/(?<!non[-\s]?)\b(?:eur)\b/i.test(normalized)) return "European";
  if (/(?<!non[-\s]?)\bcaucasian\b/i.test(normalized)) return "European";
  if (/(?<!non[-\s]?)\bwhite\b/i.test(normalized)) return "European";
  if (/\bafrican\b/i.test(normalized)) return "African";
  if (/\beast\s*asian\b/i.test(normalized)) return "East Asian";
  if (/\bsouth\s*asian\b/i.test(normalized)) return "South Asian";
  if (/\bhispanic\b|\blatino\b|\bamerindian\b/i.test(normalized)) return "Hispanic/Latino";

  return "Unknown";
}

export function PrsTab() {
  const router = useRouter();
  const fullResults = useAnalysisStore((s) => s.fullResults);
  const user = useAuthStore((s) => s.user);
  const userTier = user?.tier ?? "free";

  if (!fullResults) return null;

  const { prs } = fullResults;
  const conditions = Object.values(prs.conditions);

  return (
    <>
      {/* PRS ancestry warning — shown above the sensitive content guard */}
      <GlassCard
        variant="subtle"
        hover="none"
        className="mb-4 flex items-start gap-3 border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.04)] p-4"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#f59e0b]" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-[var(--text-body)]">
          {PRS_ANCESTRY_WARNING}
        </p>
      </GlassCard>

      <SensitiveContentGuard
        category="prs"
        tier={userTier}
        requiredTier="premium"
        onUpgrade={() => {
          router.push("/subscription");
        }}
      >
    <div className="space-y-6">
      {/* Clinical testing banner */}
      <ClinicalTestingBanner />

      <h3 className="font-heading text-lg font-bold text-[var(--text-heading)]">
        Polygenic Risk Scores
      </h3>

      {/* PRS context disclaimer */}
      <PrsContextDisclaimer conditionName="Polygenic Risk Scores" isOffspring />

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

      {/* Limitations section */}
      <LimitationsSection limitations={[]} context="prs" />
    </div>
      </SensitiveContentGuard>
    </>
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

      {/* Ancestry confidence badge */}
      <div className="mt-3">
        <AncestryConfidenceBadge
          ancestry={extractAncestryLabel(ancestryNote)}
          confidenceLevel={inferAncestryConfidence(ancestryNote)}
          ancestryNote={ancestryNote}
        />
      </div>
    </GlassCard>
  );
});
