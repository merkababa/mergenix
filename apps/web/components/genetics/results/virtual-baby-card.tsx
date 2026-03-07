'use client';

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { AlertTriangle, Lock, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { VIRTUAL_BABY_DISCLAIMER } from '@/lib/constants/disclaimers';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TraitPrediction {
  /** Trait name (e.g., "Eye Color"). */
  name: string;
  /** Predicted phenotype value (e.g., "Brown"). */
  prediction: string;
  /** Probability as a fraction (0-1, e.g., 0.78). */
  probability: number;
  /** Optional emoji or icon name for the trait. */
  icon?: string;
}

interface VirtualBabyCardProps {
  /** Array of trait predictions to display. */
  traits: TraitPrediction[];
  /** Subscription tier — controls which traits are visible. */
  tier: 'free' | 'premium' | 'pro';
  /** Callback fired when the user clicks an upgrade button. */
  onUpgrade?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert a 0-1 probability to a rounded whole-number percentage. */
function toPercent(p: number): number {
  return Math.round(p * 100);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TraitCard({ trait }: { trait: TraitPrediction }) {
  const pct = toPercent(trait.probability);

  return (
    <GlassCard
      variant="subtle"
      hover="none"
      className="p-4"
      aria-label={`${trait.name}: Likely ${trait.prediction}, approximately ${pct} percent probability`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-heading text-(--text-heading) text-sm font-semibold">
          {trait.icon && (
            <span className="mr-1.5" aria-hidden="true">
              {trait.icon}
            </span>
          )}
          {trait.name}
        </p>
      </div>

      <p className="text-(--text-body) mt-1 text-xs">
        Likely {trait.prediction} (~{pct}% likely)
      </p>

      {/* Probability bar */}
      <div className="mt-2">
        <div
          role="meter"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${trait.name} probability: ${pct} percent`}
          className="bg-(--bg-glass) h-2 w-full rounded-full"
        >
          <div className="bg-(--accent-teal) h-2 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </GlassCard>
  );
}

function LockedTraitCard({ traitName, onUpgrade }: { traitName: string; onUpgrade?: () => void }) {
  return (
    <GlassCard
      variant="subtle"
      hover="none"
      className="relative p-4"
      aria-label={`${traitName}: Locked. Upgrade to Pro to view.`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-heading text-(--text-dim) text-sm font-semibold">{traitName}</p>
        <Lock className="text-(--text-dim) h-4 w-4 shrink-0" aria-hidden="true" />
      </div>

      {/* Blurred placeholder for locked value */}
      <div className="bg-(--bg-glass) blur-xs mt-1 h-4 w-24 rounded-sm" aria-hidden="true" />

      {/* Blurred probability bar placeholder */}
      <div className="bg-(--bg-glass) blur-xs mt-2 h-2 w-full rounded-full" aria-hidden="true" />

      {onUpgrade && (
        <Button size="sm" variant="outline" className="mt-3 w-full text-xs" onClick={onUpgrade}>
          Upgrade to Pro
        </Button>
      )}
    </GlassCard>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

/**
 * Virtual Baby Card — displays probabilistic trait predictions for offspring.
 *
 * Tier behaviour:
 * - **Pro**: Shows full trait list with probability bars.
 * - **Free/Premium**: Only the first trait (e.g., Eye Color) is visible; rest locked with upgrade CTA.
 *
 * Uses neutral, probabilistic language throughout. Never frames any trait
 * as "good" or "bad", and never uses "will have" phrasing.
 */
export function VirtualBabyCard({ traits, tier, onUpgrade }: VirtualBabyCardProps) {
  // Determine visible vs locked traits based on tier
  const visibleTraits = tier === 'pro' ? traits : traits.slice(0, 1);
  const lockedTraits = tier === 'pro' ? [] : traits.slice(1);

  return (
    <GlassCard variant="medium" hover="none" className="p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="text-(--accent-teal) h-5 w-5" aria-hidden="true" />
        <h3 className="font-heading text-(--text-heading) text-lg font-bold">
          Virtual Baby — Genetic Possibilities
        </h3>
      </div>

      {/* MANDATORY disclaimer — non-dismissable, prominent, high-contrast */}
      <section aria-label="Important disclaimer" className="mt-4">
        <div className="flex items-start gap-3 rounded-xl border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.06)] p-4">
          <AlertTriangle className="text-accent-amber mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-(--text-body) text-xs font-medium leading-relaxed">
            {VIRTUAL_BABY_DISCLAIMER}
          </p>
        </div>
      </section>

      {/* Trait grid */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {/* Visible (unlocked) traits */}
        {visibleTraits.map((trait) => (
          <TraitCard key={trait.name} trait={trait} />
        ))}

        {/* Locked traits */}
        {lockedTraits.map((trait) => (
          <LockedTraitCard key={trait.name} traitName={trait.name} onUpgrade={onUpgrade} />
        ))}
      </div>

      {/* Upgrade CTA for non-pro tiers */}
      {tier !== 'pro' && (
        <div className="mt-5 flex items-center gap-4 rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.04)] p-4">
          <Lock className="text-accent-violet h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-(--text-body) flex-1 text-sm">
            {`Showing 1 of ${traits.length} trait predictions. Upgrade to Pro for full access.`}
          </p>
          {onUpgrade && (
            <Button
              size="sm"
              className="text-accent-violet border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.15)] hover:bg-[rgba(139,92,246,0.25)]"
              onClick={onUpgrade}
            >
              Upgrade to Pro
            </Button>
          )}
        </div>
      )}
    </GlassCard>
  );
}
