'use client';

import Link from 'next/link';
import { Microscope, Dna, Pill, BarChart3, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { SectionHeading } from '@/components/marketing/section-heading';
import { CARRIER_PANEL_COUNT_DISPLAY, TRAIT_COUNT_DISPLAY } from '@mergenix/genetics-data';

// ---------------------------------------------------------------------------
// Feature data (hoisted — §3 of executor checklist)
// ---------------------------------------------------------------------------

// Note: `color` and `colorAlpha` values below mirror the CSS custom properties
// --accent-rose (#f43f5e), --accent-teal (#06d6a0), --accent-violet (#8b5cf6),
// and --accent-cyan (#06b6d4). They are used in dynamic inline style objects
// (border: `1px solid ${color}30`, background: colorAlpha) where CSS variables
// cannot be interpolated inside template literals — a limitation of inline styles.
// If a CSS-var-only approach becomes feasible (e.g. via @property), migrate then.
/** Screening category breakdown — fills the hero card with visual depth. */
const SCREENING_CATEGORIES = [
  {
    label: 'Autosomal Recessive',
    color: '#06b6d4', // mirrors var(--accent-cyan)
    bg: 'rgba(6,182,212,0.08)',
    pct: '68',
  },
  {
    label: 'X-Linked',
    color: '#f59e0b', // mirrors var(--accent-amber)
    bg: 'rgba(245,158,11,0.08)',
    pct: '12',
  },
  {
    label: 'Autosomal Dominant',
    color: '#8b5cf6', // mirrors var(--accent-violet)
    bg: 'rgba(139,92,246,0.08)',
    pct: '20',
  },
] as const;

const HERO_FEATURE = {
  icon: Microscope,
  title: `${CARRIER_PANEL_COUNT_DISPLAY} Disease Screening`,
  description:
    'Comprehensive carrier screening across autosomal recessive, dominant, and X-linked conditions with Mendelian inheritance modeling.',
  badge: 'Carrier Risk',
  color: '#f43f5e', // mirrors var(--accent-rose)
  colorAlpha: 'rgba(244,63,94,0.1)', // mirrors var(--accent-rose) at 10% opacity
} as const;

const SECONDARY_FEATURES = [
  {
    icon: Dna,
    title: `${TRAIT_COUNT_DISPLAY} Trait Predictions`,
    description:
      'From eye color to earwax type, predict physical traits with Punnett square visualization and confidence scoring.',
    badge: 'Traits',
    color: '#06d6a0', // mirrors var(--accent-teal)
    colorAlpha: 'rgba(6,214,160,0.1)', // mirrors var(--accent-teal) at 10% opacity
  },
  {
    icon: Pill,
    title: 'Pharmacogenomics',
    description: 'Predict drug metabolism phenotypes for personalized medicine insights.',
    badge: 'PGx',
    color: '#8b5cf6', // mirrors var(--accent-violet)
    colorAlpha: 'rgba(139,92,246,0.1)', // mirrors var(--accent-violet) at 10% opacity
  },
  {
    icon: BarChart3,
    title: 'Polygenic Risk Scores',
    description:
      'Multi-variant risk scoring for complex conditions like Type 2 Diabetes, Heart Disease, and Breast Cancer.',
    badge: 'PRS',
    color: '#06b6d4', // mirrors var(--accent-cyan)
    colorAlpha: 'rgba(6,182,212,0.1)', // mirrors var(--accent-cyan) at 10% opacity
  },
] as const;

// ---------------------------------------------------------------------------
// Mini bar chart SVG illustration for the hero feature card
// ---------------------------------------------------------------------------

function DiseaseBarChart() {
  // SVG fill attributes cannot reference CSS custom properties — these rgba values
  // all derive from --accent-rose (#f43f5e / rgba(244,63,94)) at varying opacities.
  return (
    <svg
      width="120"
      height="56"
      viewBox="0 0 120 56"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Bar chart bars — representing disease distribution; fills = --accent-rose opacity variants */}
      <rect x="4" y="20" width="12" height="32" rx="3" fill="rgba(244,63,94,0.35)" />
      <rect x="22" y="10" width="12" height="42" rx="3" fill="rgba(244,63,94,0.5)" />
      <rect x="40" y="16" width="12" height="36" rx="3" fill="rgba(244,63,94,0.4)" />
      <rect x="58" y="6" width="12" height="46" rx="3" fill="rgba(244,63,94,0.65)" />
      <rect x="76" y="14" width="12" height="38" rx="3" fill="rgba(244,63,94,0.45)" />
      <rect x="94" y="22" width="12" height="30" rx="3" fill="rgba(244,63,94,0.3)" />
      <rect x="112" y="18" width="4" height="34" rx="2" fill="rgba(244,63,94,0.25)" />
      {/* Baseline — stroke = --accent-rose at 15% opacity */}
      <line x1="0" y1="54" x2="120" y2="54" stroke="rgba(244,63,94,0.15)" strokeWidth="1" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// BentoFeatures
// ---------------------------------------------------------------------------

export function BentoFeatures() {
  const HeroIcon = HERO_FEATURE.icon;

  return (
    <section className="relative px-4 py-16 md:px-6 md:py-24" aria-label="Key features">
      <div className="relative mx-auto max-w-6xl">
        <SectionHeading
          title="Comprehensive Genetic Intelligence"
          subtitle="Everything you need to make informed family planning decisions"
          className="text-fluid-heading mb-12"
        />

        {/* Bento grid: hero card takes col-span-2 on md+, 3 stacked cards on right */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Hero feature card — col-span-2 */}
          <ScrollReveal type="scale" className="md:col-span-2">
            <GlassCard
              variant="medium"
              hover="lift"
              className="relative h-full overflow-hidden p-7 md:p-8"
            >
              {/* Badge */}
              <span
                className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: HERO_FEATURE.colorAlpha,
                  color: HERO_FEATURE.color,
                  border: `1px solid ${HERO_FEATURE.color}30`,
                }}
              >
                <HeroIcon className="card-icon h-3.5 w-3.5" aria-hidden="true" />
                {HERO_FEATURE.badge}
              </span>

              {/* Title */}
              <h3
                className="font-heading text-(--text-heading) mb-3 text-2xl font-bold md:text-3xl"
                style={{ fontSize: 'var(--font-size-fluid-heading)' }}
              >
                {HERO_FEATURE.title}
              </h3>

              {/* Description + chart row */}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-(--text-muted) max-w-sm text-sm leading-relaxed sm:text-base">
                  {HERO_FEATURE.description}
                </p>
                <DiseaseBarChart />
              </div>

              {/* Screening categories breakdown */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                {SCREENING_CATEGORIES.map((cat) => (
                  <div
                    key={cat.label}
                    className="rounded-xl p-3"
                    style={{ background: cat.bg, border: `1px solid ${cat.color}20` }}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{ color: cat.color }}
                    >
                      {cat.label}
                    </span>
                    <div
                      className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
                      style={{ background: `${cat.color}15` }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${cat.pct}%`, background: cat.color }}
                      />
                    </div>
                    <span
                      className="mt-1.5 block text-xs font-medium"
                      style={{ color: `${cat.color}cc` }}
                    >
                      {cat.pct}% of panel
                    </span>
                  </div>
                ))}
              </div>

              {/* Stat + CTA */}
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-heading text-(--accent-rose) text-3xl font-extrabold">
                    {CARRIER_PANEL_COUNT_DISPLAY}
                  </span>
                  <span className="text-(--text-dim) ml-2 text-sm">conditions analyzed</span>
                </div>
                <Link
                  href="/diseases"
                  className="text-(--accent-rose) inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                  aria-label="Browse the full disease catalog"
                >
                  Browse Disease Catalog
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </GlassCard>
          </ScrollReveal>

          {/* Three stacked secondary cards */}
          <div className="flex flex-col gap-6">
            {SECONDARY_FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <ScrollReveal key={feature.title} type="fade" direction="up" delay={0.1 + i * 0.1}>
                  <GlassCard variant="subtle" hover="lift" className="h-full p-5">
                    {/* Gradient icon container */}
                    <div
                      className="card-icon mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: feature.colorAlpha }}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{ color: feature.color }}
                        aria-hidden="true"
                      />
                    </div>

                    {/* Badge */}
                    <span
                      className="card-badge mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                      style={{
                        background: `${feature.color}18`,
                        color: feature.color,
                      }}
                    >
                      {feature.badge}
                    </span>

                    <h3 className="font-heading text-(--text-heading) mb-1.5 text-sm font-semibold">
                      {feature.title}
                    </h3>
                    <p className="text-(--text-muted) text-xs leading-relaxed">
                      {feature.description}
                    </p>
                  </GlassCard>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
