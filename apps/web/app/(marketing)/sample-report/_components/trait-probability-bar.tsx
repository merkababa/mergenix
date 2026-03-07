'use client';

import { cn } from '@/lib/utils';

// ─── Constants (hoisted outside component body — checklist §3) ───────────────

type TraitCategory = 'physical' | 'health' | 'behavioral';

const CATEGORY_COLORS: Record<TraitCategory, string> = {
  physical: 'bg-(--accent-teal)',
  health: 'bg-amber-500/60',
  behavioral: 'bg-violet-500/60',
};

const CATEGORY_TEXT_COLORS: Record<TraitCategory, string> = {
  physical: 'text-(--accent-teal)',
  health: 'text-amber-400',
  behavioral: 'text-violet-400',
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface TraitProbabilityBarProps {
  phenotype: string;
  probability: number;
  category?: TraitCategory;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Accessible probability bar for trait predictions.
 *
 * Uses role="meter" with full ARIA attributes per the executor checklist.
 * Color is mapped by trait category: teal=physical, amber=health, violet=behavioral.
 */
export function TraitProbabilityBar({
  phenotype,
  probability,
  category = 'physical',
  className,
}: TraitProbabilityBarProps) {
  const clamped = Math.min(Math.max(probability, 0), 100);
  const barColor = CATEGORY_COLORS[category];
  const textColor = CATEGORY_TEXT_COLORS[category];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="text-(--text-muted) w-20 truncate text-xs">{phenotype}</div>
      <div
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${phenotype}: ${clamped}%`}
        aria-valuetext={`${phenotype}: ${clamped}% probability`}
        className="bg-(--bg-glass) h-2 flex-1 rounded-full"
      >
        <div
          className={cn('h-2 rounded-full transition-[width] duration-700 ease-out', barColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className={cn('w-10 text-right text-xs font-medium', textColor)}>{clamped}%</span>
    </div>
  );
}
