"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, HeartPulse } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { MedicalDisclaimer } from "@/components/genetics/medical-disclaimer";
import { TierUpgradePrompt } from "@/components/genetics/tier-upgrade-prompt";
import { LimitationsSection } from "@/components/genetics/results/limitations-section";
import { VirtualBabyCard } from "@/components/genetics/results/virtual-baby-card";
import type { TraitPrediction } from "@/components/genetics/results/virtual-baby-card";
import { useAnalysisStore } from "@/lib/stores/analysis-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { CARRIER_PANEL_COUNT_DISPLAY, TRAIT_COUNT_DISPLAY } from "@mergenix/genetics-data";

/** Emoji icons for common trait names. */
const TRAIT_ICONS: Record<string, string> = {
  "Eye Color": "\ud83d\udc41\ufe0f",
  "Hair Color": "\ud83d\udc87",
  "Earwax Type": "\ud83d\udc42",
  "Bitter Taste": "\ud83d\udc45",
  "Lactose Tolerance": "\ud83e\udd5b",
  "Muscle Composition": "\ud83d\udcaa",
  "Freckling": "\u2600\ufe0f",
  "Cleft Chin": "\ud83e\uddd1",
  "Widow's Peak": "\ud83e\uddd1",
  "Asparagus Smell": "\ud83e\udd66",
};

/**
 * Convert analysis trait results into VirtualBabyCard TraitPrediction format.
 *
 * For each successful trait, picks the most likely offspring phenotype and
 * converts the percentage to a 0-1 probability fraction.
 */
function toVirtualBabyTraits(traits: { trait: string; status: string; offspringProbabilities: Record<string, number> }[]): TraitPrediction[] {
  return traits
    .filter((t) => t.status === "success")
    .map((t) => {
      // Find the most likely phenotype
      const entries = Object.entries(t.offspringProbabilities);
      if (entries.length === 0) {
        return { name: t.trait, prediction: "Unknown", probability: 0, icon: TRAIT_ICONS[t.trait] };
      }
      const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a), entries[0]);
      return {
        name: t.trait,
        prediction: best[0],
        probability: best[1] / 100,
        icon: TRAIT_ICONS[t.trait],
      };
    });
}

export function OverviewTab() {
  const router = useRouter();
  const fullResults = useAnalysisStore((s) => s.fullResults);
  const isDemo = useAnalysisStore((s) => s.isDemo);
  const highRiskCount = useAnalysisStore((s) => s.highRiskCount);
  const parentA = useAnalysisStore((s) => s.parentA);
  const parentB = useAnalysisStore((s) => s.parentB);
  const user = useAuthStore((s) => s.user);
  const userTier = user?.tier ?? "free";

  if (!fullResults) return null;

  const { carrier, traits, prs, metadata } = fullResults;

  // Couple analysis = both parents provided (or demo mode which always has both)
  const isCoupleAnalysis = isDemo || (parentA !== null && parentB !== null);
  const carrierMatches = carrier.filter(
    (c) => c.parentAStatus === "carrier" && c.parentBStatus === "carrier",
  ).length;

  // Build VirtualBabyCard trait predictions from analysis trait results
  const virtualBabyTraits = useMemo(
    () => toVirtualBabyTraits(traits),
    [traits],
  );

  const stats = [
    { label: "Diseases Screened", value: carrier.length.toLocaleString(), color: "#06b6d4", icon: null },
    { label: "High Risk", value: String(highRiskCount), color: "#f43f5e", icon: AlertTriangle },
    { label: "Carrier Matches", value: String(carrierMatches), color: "#f59e0b", icon: HeartPulse },
    { label: "Traits Predicted", value: String(traits.length), color: "#06d6a0", icon: null },
  ];

  return (
    <div data-privacy-mask="true" className="space-y-6">
      <h3 className="sr-only">Results Overview</h3>

      {/* Demo label */}
      {isDemo && (
        <div className="flex items-center gap-2">
          <Badge variant="pro">Demo Results (Pro Tier)</Badge>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <GlassCard
            key={stat.label}
            variant="medium"
            hover="glow"
            rainbow
            className="p-5 text-center"
            title={stat.label === "High Risk" ? "Based on statistical associations, not clinical diagnoses" : undefined}
          >
            <p
              className="flex items-center justify-center gap-1.5 font-heading text-2xl font-extrabold"
              style={{ color: stat.color }}
            >
              {stat.icon && <stat.icon className="h-4 w-4" aria-hidden="true" />}
              {stat.value}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
              {stat.label}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* Tier upgrade prompt for free/premium users */}
      {metadata.tier === "free" && (
        <TierUpgradePrompt
          message={`You screened ${carrier.length.toLocaleString()} of ${CARRIER_PANEL_COUNT_DISPLAY} diseases and ${traits.length} of ${TRAIT_COUNT_DISPLAY} traits. Upgrade to Premium to unlock disease screening.`}
        />
      )}
      {metadata.tier === "premium" && (
        <TierUpgradePrompt
          message="Upgrade to Pro to unlock all disease screening, couple analysis, offspring predictions, and PDF export."
        />
      )}

      {/* Metadata */}
      <GlassCard variant="subtle" hover="none" className="p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-[var(--text-muted)] sm:grid-cols-3">
          <div>
            <span className="font-semibold text-[var(--text-body)]">Engine: </span>
            {metadata.engineVersion}
          </div>
          <div>
            <span className="font-semibold text-[var(--text-body)]">Analyzed: </span>
            {new Date(metadata.analysisTimestamp).toLocaleString()}
          </div>
          <div>
            <span className="font-semibold text-[var(--text-body)]">Tier: </span>
            <span className="capitalize">{metadata.tier}</span>
          </div>
          <div>
            <span className="font-semibold text-[var(--text-body)]">Parent A: </span>
            {metadata.parent1Format.toUpperCase()} ({metadata.parent1SnpCount.toLocaleString()} SNPs)
          </div>
          <div>
            <span className="font-semibold text-[var(--text-body)]">Parent B: </span>
            {metadata.parent2Format.toUpperCase()} ({metadata.parent2SnpCount.toLocaleString()} SNPs)
          </div>
          <div>
            <span className="font-semibold text-[var(--text-body)]">PRS Conditions: </span>
            {prs.conditionsAvailable}/{prs.conditionsTotal}
          </div>
        </div>
      </GlassCard>

      {/* Virtual Baby Card (only shown for couple analyses) */}
      {isCoupleAnalysis && virtualBabyTraits.length > 0 && (
        <VirtualBabyCard
          traits={virtualBabyTraits}
          tier={userTier}
          onUpgrade={() => {
            router.push("/subscription");
          }}
        />
      )}

      {/* Limitations section */}
      <LimitationsSection limitations={[]} context="overview" />

      {/* Medical disclaimer */}
      <MedicalDisclaimer variant="full" />
    </div>
  );
}
