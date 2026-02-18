"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { memo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VariantDrug {
  name: string;
  recommendation: string;
  level: string;
}

export interface VariantCardProps {
  geneName: string;
  diplotype: string;
  phenotype: string;
  drugs: VariantDrug[];
  className?: string;
}

// ─── Evidence Level Badge Variant ───────────────────────────────────────────

export function levelBadgeVariant(
  level: string,
): "high" | "moderate" | "default" {
  switch (level.toLowerCase()) {
    case "strong":
      return "high";
    case "moderate":
      return "moderate";
    default:
      return "default";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Mobile card view for a single gene variant with associated drug recommendations.
 * Designed for touch devices with 44px minimum touch targets.
 */
export const VariantCard = memo(function VariantCard({
  geneName,
  diplotype,
  phenotype,
  drugs,
  className,
}: VariantCardProps) {
  return (
    <GlassCard
      variant="medium"
      hover="none"
      className={`space-y-3 p-4 ${className ?? ""}`}
    >
      {/* Gene header */}
      <div>
        <h4 className="font-heading text-base font-bold text-[#06b6d4]">
          {geneName}
        </h4>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-body)]">
            {diplotype}
          </code>
          <span className="text-xs text-[var(--text-muted)]">{phenotype}</span>
        </div>
      </div>

      {/* Drug list */}
      {drugs.length > 0 && (
        <ul className="space-y-2">
          {drugs.map((drug) => (
            <li
              key={drug.name}
              className="flex min-h-[44px] flex-col gap-1 rounded-lg bg-[var(--bg-elevated)] px-3 py-2"
            >
              <span className="text-sm font-medium text-[var(--text-heading)]">
                {drug.name}
              </span>
              <span className="text-xs leading-relaxed text-[var(--text-body)]">
                {drug.recommendation}
              </span>
              <Badge variant={levelBadgeVariant(drug.level)}>
                {drug.level}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
});
