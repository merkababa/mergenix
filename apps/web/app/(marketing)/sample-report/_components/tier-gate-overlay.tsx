'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';

// ─── Component ───────────────────────────────────────────────────────────────

interface TierGateOverlayProps {
  /** Number of locked items not shown. */
  lockedCount: number;
}

/**
 * Tier-gate overlay shown after the first 3 carrier items.
 *
 * Renders blurred placeholder cards with a lock icon + upgrade CTA.
 * The blurred container is aria-hidden="true"; screen readers receive
 * a sr-only message explaining the gated content instead.
 */
export function TierGateOverlay({ lockedCount }: TierGateOverlayProps) {
  if (lockedCount <= 0) return null;

  return (
    <div className="relative mt-3">
      {/* Screen reader explanation (visible to AT only) */}
      <p className="sr-only">
        {lockedCount} additional carrier screening results are available with a Premium or Pro plan.
        Upgrade to unlock all {lockedCount} locked disease screenings.
      </p>

      {/* Blurred preview cards — hidden from assistive technology */}
      <div aria-hidden="true" className="pointer-events-none space-y-3 blur-xs select-none">
        {Array.from({ length: Math.min(lockedCount, 3) }, (_, i) => i).map((i) => (
          <div
            key={i}
            className="rounded-glass relative overflow-hidden border border-[rgba(148,163,184,0.05)] bg-[rgba(12,18,32,0.35)] p-4 [backdrop-filter:blur(8px)]"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-3 w-36 rounded-sm bg-(--border-subtle)" />
                <div className="h-2.5 w-24 rounded-sm bg-(--border-subtle)" />
              </div>
              <div className="h-3 w-20 rounded-sm bg-(--border-subtle)" />
            </div>
          </div>
        ))}
      </div>

      {/* Overlay: lock icon + upgrade CTA */}
      <div className="rounded-glass absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[rgba(5,8,16,0.75)] backdrop-blur-xs">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-(--border-subtle) bg-(--bg-glass)">
          <Lock className="h-5 w-5 text-(--accent-teal)" aria-hidden="true" />
        </div>
        <p aria-hidden="true" className="text-center text-sm font-semibold text-(--text-heading)">
          Upgrade to Premium to unlock 500+ diseases
        </p>
        <p aria-hidden="true" className="text-center text-xs text-(--text-muted)">
          {lockedCount} more conditions locked
        </p>
        <Link href="/products" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          Upgrade to Premium
        </Link>
      </div>
    </div>
  );
}
