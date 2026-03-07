'use client';

import Link from 'next/link';
import { Shield, ChevronRight, Lock, Users } from 'lucide-react';
import { m } from 'motion/react';
import { buttonVariants } from '@/components/ui/button';
import { DnaHelix3DDynamic } from '@/components/marketing/dna-helix-3d-dynamic';
import {
  CARRIER_PANEL_COUNT,
  CARRIER_PANEL_COUNT_DISPLAY,
  TRAIT_COUNT,
} from '@mergenix/genetics-data';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants (hoisted — §3 of executor checklist)
// ---------------------------------------------------------------------------

interface TrustBadge {
  readonly icon: typeof Shield;
  readonly label: string;
}

const TRUST_BADGES: readonly TrustBadge[] = [
  { icon: Shield, label: '100% Client-Side Processing' },
  { icon: Lock, label: 'Zero Data Storage' },
  { icon: Users, label: 'No Third-Party Sharing' },
] as const;

// Shared className for all trust badge list items. Uses solid elevated background
// instead of backdrop-blur for a cleaner, more professional appearance.
const TRUST_BADGE_CLASS =
  'inline-flex items-center gap-2 rounded-xl border border-[rgba(6,214,160,0.12)] bg-(--bg-elevated) px-3 py-2';

/* -- Format number with commas -- */
function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// HeroSection
// ---------------------------------------------------------------------------

/**
 * Homepage hero: professional medical SaaS layout — headline text on left with
 * small DNA helix accent on right (desktop). Stacked on mobile.
 */
export function HeroSection() {
  return (
    <m.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' as const }}
      className="relative overflow-hidden px-4 pb-16 pt-12 md:px-6 md:pb-24 md:pt-20"
      aria-label="Hero"
    >
      <div className="relative mx-auto max-w-6xl">
        {/* Hero row: headline left, helix accent right */}
        <div className="relative z-10 flex flex-col items-center gap-8 text-center md:flex-row md:items-center md:text-left">
          {/* Text content block */}
          <div className="flex flex-1 flex-col items-center md:items-start">
            {/* Headline */}
            <m.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' as const }}
              className="text-(--text-heading) font-heading max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl xl:text-7xl"
            >
              Explore Your Genetic Possibilities
            </m.h1>

            <m.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' as const }}
              className="text-(--text-muted) mt-6 max-w-xl text-center text-lg md:text-left md:text-xl"
            >
              Compare two parents&apos; DNA to predict offspring disease risk, traits, and drug
              responses.{' '}
              <span className="text-(--accent-teal) font-medium">
                Your DNA never leaves your device.
              </span>
            </m.p>

            {/* Animated stats */}
            <m.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' as const }}
              className="mt-6 flex items-center justify-center gap-8"
              role="group"
              aria-label="Key statistics"
            >
              <div className="text-center">
                <span className="font-heading text-(--accent-teal) text-3xl font-extrabold md:text-4xl">
                  {formatNumber(CARRIER_PANEL_COUNT)}
                </span>
                <p className="text-(--text-muted) mt-1 text-xs font-medium uppercase tracking-wider">
                  Diseases Screened
                </p>
              </div>
              <div className="bg-(--border-subtle) h-10 w-px" aria-hidden="true" />
              <div className="text-center">
                <span className="font-heading text-(--accent-teal) text-3xl font-extrabold md:text-4xl">
                  {formatNumber(TRAIT_COUNT)}
                </span>
                <p className="text-(--text-muted) mt-1 text-xs font-medium uppercase tracking-wider">
                  Traits Predicted
                </p>
              </div>
            </m.div>

            {/* CTA buttons */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' as const }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
            >
              <Link
                href="/analysis"
                className={cn(buttonVariants({ variant: 'primary', size: 'xl' }))}
              >
                Start Free Analysis
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/diseases"
                className={cn(buttonVariants({ variant: 'secondary', size: 'xl' }))}
              >
                Browse {CARRIER_PANEL_COUNT_DISPLAY} Diseases
              </Link>
            </m.div>

            {/* Trust badges */}
            <m.ul
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.75, ease: 'easeOut' as const }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start"
              role="list"
              aria-label="Trust indicators"
            >
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <li key={label} className={TRUST_BADGE_CLASS}>
                  <Icon className="text-(--accent-teal) h-4 w-4" aria-hidden="true" />
                  <span className="text-(--text-muted) text-xs">{label}</span>
                </li>
              ))}
            </m.ul>
          </div>

          {/* DNA Helix — side accent on desktop, hidden on mobile */}
          <div className="hidden h-[120px] w-[120px] shrink-0 md:block" aria-hidden="true">
            <DnaHelix3DDynamic className="h-full w-full" />
          </div>
        </div>
      </div>
    </m.section>
  );
}
