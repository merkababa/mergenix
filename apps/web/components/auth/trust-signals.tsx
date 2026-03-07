'use client';

import { Shield } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

interface TrustSignalsProps {
  lines?: string[];
}

const DEFAULT_LINES = [
  'Your DNA never leaves your device',
  'Encrypted in transit. HIPAA-conscious design.',
];

/**
 * Trust footer with shield icon and configurable privacy text lines.
 * Wrapped in a GlassCard variant="subtle" for visual consistency.
 */
export function TrustSignals({ lines = DEFAULT_LINES }: TrustSignalsProps) {
  return (
    <GlassCard variant="subtle" hover="none" className="mt-4 p-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <Shield className="text-(--accent-teal) h-4 w-4" aria-hidden="true" />
        <span className="text-(--text-muted) text-xs">{lines[0]}</span>
      </div>
      {lines.slice(1).map((line) => (
        <p key={line} className="text-(--text-muted) mt-1 text-xs">
          {line}
        </p>
      ))}
    </GlassCard>
  );
}
