"use client";

import { AlertTriangle, HeartPulse } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { MedicalDisclaimer } from "@/components/genetics/medical-disclaimer";
import { TierUpgradePrompt } from "@/components/genetics/tier-upgrade-prompt";
import { useAnalysisStore } from "@/lib/stores/analysis-store";

export function OverviewTab() {
  const fullResults = useAnalysisStore((s) => s.fullResults);
  const isDemo = useAnalysisStore((s) => s.isDemo);
  const highRiskCount = useAnalysisStore((s) => s.highRiskCount);

  if (!fullResults) return null;

  const { carrier, traits, prs, metadata } = fullResults;
  const carrierMatches = carrier.filter(
    (c) => c.parentAStatus === "carrier" && c.parentBStatus === "carrier",
  ).length;

  const stats = [
    { label: "Diseases Screened", value: carrier.length.toLocaleString(), color: "#06b6d4", icon: null },
    { label: "High Risk", value: String(highRiskCount), color: "#f43f5e", icon: AlertTriangle },
    { label: "Carrier Matches", value: String(carrierMatches), color: "#f59e0b", icon: HeartPulse },
    { label: "Traits Predicted", value: String(traits.length), color: "#06d6a0", icon: null },
  ];

  return (
    <div className="space-y-6">
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
          >
            <p
              className="flex items-center justify-center gap-1.5 font-heading text-2xl font-extrabold"
              style={{ color: stat.color }}
            >
              {stat.icon && <stat.icon className="h-4 w-4" />}
              {stat.value}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
              {stat.label}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* Tier upgrade prompt for free/premium users */}
      {metadata.tier === "free" && (
        <TierUpgradePrompt
          message={`You screened ${carrier.length.toLocaleString()} of 2,715 diseases and ${traits.length} of 79 traits. Upgrade to Pro for full screening.`}
        />
      )}
      {metadata.tier === "premium" && (
        <TierUpgradePrompt
          message="Upgrade to Pro to unlock full 2,715 disease screening and all 79 traits."
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

      {/* Medical disclaimer */}
      <MedicalDisclaimer variant="full" />
    </div>
  );
}
