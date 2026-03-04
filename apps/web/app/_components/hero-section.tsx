"use client";

import Link from "next/link";
import { Shield, ChevronRight, Lock, Users } from "lucide-react";
import { m } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { DnaHelix3DDynamic } from "@/components/marketing/dna-helix-3d-dynamic";
import { useCountUp } from "@/hooks/use-count-up";
import { CARRIER_PANEL_COUNT, CARRIER_PANEL_COUNT_DISPLAY, TRAIT_COUNT } from "@mergenix/genetics-data";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants (hoisted — §3 of executor checklist)
// ---------------------------------------------------------------------------

interface TrustBadge {
  readonly icon: typeof Shield;
  readonly label: string;
}

const TRUST_BADGES: readonly TrustBadge[] = [
  { icon: Shield, label: "100% Client-Side Processing" },
  { icon: Lock, label: "Zero Data Storage" },
  { icon: Users, label: "No Third-Party Sharing" },
] as const;

// Shared className for all trust badge list items. The background and border use
// Tailwind's arbitrary value syntax — the underlying color is --accent-teal
// (rgba(6,214,160,...)). Tailwind doesn't expose a direct bg-primary shorthand
// for this token, so bg-[rgba(...)] is the idiomatic approach here.
const TRUST_BADGE_CLASS =
  "inline-flex items-center gap-2 rounded-xl border border-[rgba(6,214,160,0.12)] bg-[rgba(6,214,160,0.05)] px-3 py-2 backdrop-blur-sm";

/* -- Format number with commas -- */
function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// HeroSection
// ---------------------------------------------------------------------------

/**
 * Homepage hero: cinematic crown layout — full-width 3D DNA helix backdrop at
 * top, centered text content below with gradient overlap. Single-column at all
 * breakpoints.
 */
export function HeroSection() {
  const diseaseCount = useCountUp(CARRIER_PANEL_COUNT, 2200);
  const traitCount = useCountUp(TRAIT_COUNT, 1800);

  return (
    <m.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" as const }}
      className="relative overflow-hidden px-4 pb-16 pt-12 md:px-6 md:pb-24 md:pt-20"
      aria-label="Hero"
    >
      {/* Background glow orbs — colors are teal/violet at very low opacity.
          Using bg-[rgba(...)] is intentional: Tailwind's bg-primary-400/5 doesn't
          map to these exact theme tokens without a custom config extension. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-[rgba(6,214,160,0.06)] blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[rgba(139,92,246,0.05)] blur-[128px]" />
      </div>

      {/* Cinematic Crown: helix backdrop at top, text centered below */}
      <div className="relative mx-auto max-w-6xl">
        {/* 3D Helix — full-width crown at top with gradient fade overlap */}
        <div
          className="relative -mb-8 h-[250px] w-full md:h-[350px] lg:h-[400px]"
          aria-hidden="true"
        >
          <DnaHelix3DDynamic className="h-full w-full" />
          {/* Bottom gradient fade — blends helix into content below */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Text content block — centered, sits above helix gradient overlap */}
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Headline */}
          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" as const }}
            className="gradient-text max-w-3xl font-heading text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl xl:text-7xl"
          >
            Explore Your Genetic Possibilities
          </m.h1>

          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" as const }}
            className="mt-6 max-w-xl text-center text-lg text-[var(--text-muted)] md:text-xl"
          >
            Compare two parents&apos; DNA to predict offspring disease risk, traits,
            and drug responses.{" "}
            <span className="font-medium text-[var(--accent-teal)]">
              Your DNA never leaves your device.
            </span>
          </m.p>

          {/* Animated stats */}
          <m.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" as const }}
            className="mt-6 flex items-center justify-center gap-8"
            role="group"
            aria-label="Key statistics"
          >
            <div className="text-center">
              <span
                ref={diseaseCount.ref}
                className="font-heading text-3xl font-extrabold text-[var(--accent-teal)] md:text-4xl"
              >
                {formatNumber(diseaseCount.count)}
              </span>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Diseases Screened
              </p>
            </div>
            <div className="h-10 w-px bg-[var(--border-subtle)]" aria-hidden="true" />
            <div className="text-center">
              <span
                ref={traitCount.ref}
                className="font-heading text-3xl font-extrabold text-[var(--accent-violet)] md:text-4xl"
              >
                {formatNumber(traitCount.count)}
              </span>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Traits Predicted
              </p>
            </div>
          </m.div>

          {/* CTA buttons */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" as const }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Link
              href="/analysis"
              className={cn(buttonVariants({ variant: "primary", size: "xl" }))}
            >
              Start Free Analysis
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href="/diseases"
              className={cn(buttonVariants({ variant: "secondary", size: "xl" }))}
            >
              Browse {CARRIER_PANEL_COUNT_DISPLAY} Diseases
            </Link>
          </m.div>

          {/* Trust badges */}
          <m.ul
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75, ease: "easeOut" as const }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            role="list"
            aria-label="Trust indicators"
          >
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <li key={label} className={TRUST_BADGE_CLASS}>
                <Icon className="h-4 w-4 text-[var(--accent-teal)]" aria-hidden="true" />
                <span className="text-xs text-[var(--text-muted)]">{label}</span>
              </li>
            ))}
          </m.ul>
        </div>
      </div>
    </m.section>
  );
}
