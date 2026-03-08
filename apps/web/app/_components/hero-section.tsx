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
 * Homepage hero: centered layout with immersive 3D DNA helix background.
 * Everything is centered — headline, subtitle, stats, CTAs, and trust badges.
 * The 3D helix fills the background with glow orbs for atmosphere.
 */
export function HeroSection() {
  return (
    <m.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' as const }}
      className="relative flex min-h-[90vh] items-center justify-center overflow-hidden"
      aria-label="Hero"
    >
      {/* Background layer: 3D Helix + glow orbs */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.35]"
        style={{ filter: 'blur(2px)' }}
        aria-hidden="true"
      >
        {/* Teal glow orb — top-left area */}
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(6,214,160,0.15)_0%,transparent_70%)]" />
        {/* Violet glow orb — bottom-right area */}
        <div className="absolute -right-24 -bottom-24 h-[500px] w-[500px] bg-[radial-gradient(circle,rgba(139,92,246,0.10)_0%,transparent_70%)]" />
        {/* 3D DNA Helix — fills entire background */}
        <DnaHelix3DDynamic className="h-full w-full" />
      </div>

      {/* Content layer: centered text */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        {/* Headline */}
        <m.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' as const }}
          className="font-heading mx-auto max-w-3xl text-4xl leading-tight font-extrabold text-(--text-heading) md:text-5xl lg:text-6xl xl:text-7xl"
        >
          Explore Your Genetic Possibilities
        </m.h1>

        <m.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' as const }}
          className="mx-auto mt-6 max-w-2xl text-lg text-(--text-muted) md:text-xl"
        >
          Compare two parents&apos; DNA to predict offspring disease risk, traits, and drug
          responses.{' '}
          <span className="font-medium text-(--accent-teal)">
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
            <span className="font-heading text-3xl font-extrabold text-(--accent-teal) md:text-4xl">
              {formatNumber(CARRIER_PANEL_COUNT)}
            </span>
            <p className="mt-1 text-xs font-medium tracking-wider text-(--text-muted) uppercase">
              Diseases Screened
            </p>
          </div>
          <div className="h-10 w-px bg-(--border-subtle)" aria-hidden="true" />
          <div className="text-center">
            <span className="font-heading text-3xl font-extrabold text-(--accent-teal) md:text-4xl">
              {formatNumber(TRAIT_COUNT)}
            </span>
            <p className="mt-1 text-xs font-medium tracking-wider text-(--text-muted) uppercase">
              Traits Predicted
            </p>
          </div>
        </m.div>

        {/* CTA buttons */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' as const }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link href="/analysis" className={cn(buttonVariants({ variant: 'primary', size: 'xl' }))}>
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
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          role="list"
          aria-label="Trust indicators"
        >
          {TRUST_BADGES.map(({ icon: Icon, label }) => (
            <li key={label} className={TRUST_BADGE_CLASS}>
              <Icon className="h-4 w-4 text-(--accent-teal)" aria-hidden="true" />
              <span className="text-xs text-(--text-muted)">{label}</span>
            </li>
          ))}
        </m.ul>
      </div>
    </m.section>
  );
}
