'use client';

import Link from 'next/link';
import { m } from 'motion/react';
import { GlassCard } from '@/components/ui/glass-card';
import { PrsGauge } from '@/components/genetics/prs-gauge';
import { PunnettSquare } from '@/components/genetics/punnett-square';
import { buttonVariants } from '@/components/ui/button-variants';
import { fadeUp, fadeIn, createStaggerContainer } from '@/lib/animation-variants';
import { SAMPLE_REPORT_DATA, SAMPLE_COUPLE } from '@/lib/data/sample-report-data';
import { RISK_LABELS, RISK_CATEGORY_LABELS } from '@/lib/genetics-constants';
import { AlertTriangle, Dna, FlaskConical, Pill, Activity, Stethoscope } from 'lucide-react';
import { TraitProbabilityBar } from './trait-probability-bar';
import { ReportSidebar } from './report-sidebar';
import { TierGateOverlay } from './tier-gate-overlay';

// ─── Constants (hoisted outside component body — checklist §3) ───────────────

const gridStagger = createStaggerContainer(0.1);

/**
 * Maps trait names to their display category.
 * Traits not listed here default to "physical".
 */
const TRAIT_CATEGORY_MAP: Record<string, 'physical' | 'health' | 'behavioral'> = {
  'Lactose Tolerance': 'health',
  'Caffeine Metabolism': 'health',
  'Bitter Taste Perception (PTC)': 'health',
  'Asparagus Metabolite Detection': 'health',
  'Cilantro Preference': 'behavioral',
  'Photic Sneeze Reflex': 'behavioral',
};

/**
 * Number of carrier cards shown un-gated before the tier-gate overlay.
 * First 3 are always visible; remaining are blurred + locked.
 */
const FREE_CARRIER_VISIBLE = 3;

// ─── Helpers ────────────────────────────────────────────────────────────────

type RiskLevel = 'high_risk' | 'carrier_detected' | 'low_risk' | (string & {});
type UrgencyLevel = 'high' | 'moderate' | 'low' | (string & {});

function riskColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'high_risk':
      return 'text-(--accent-rose)';
    case 'carrier_detected':
      return 'text-(--accent-amber)';
    default:
      return 'text-(--accent-teal)';
  }
}

function urgencyColor(urgency: UrgencyLevel): string {
  switch (urgency) {
    case 'high':
      return 'text-(--accent-rose)';
    case 'moderate':
      return 'text-(--accent-amber)';
    default:
      return 'text-(--accent-teal)';
  }
}

/**
 * Returns extra Tailwind classes for the carrier GlassCard wrapper
 * based on risk level (D3.3 requirement).
 */
function carrierBorderClasses(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'high_risk':
      return 'border-l-4 border-rose-500 bg-rose-500/5';
    case 'carrier_detected':
      return 'border-l-4 border-amber-500 bg-amber-500/5';
    default:
      return '';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Sample report page content — renders a full analysis report using
 * fictional data. Includes:
 * - D3.1: TraitProbabilityBar for trait predictions
 * - D3.2: PrsGauge with percentile ticks for PRS section
 * - D3.3: Risk-differentiated carrier card borders
 * - D3.4: PunnettSquare for first both-carrier condition
 * - D3.5: ReportSidebar sticky navigation
 * - D3.6: TierGateOverlay locking carrier items 4+
 * - D3.7: Next.js Link + buttonVariants for all CTAs
 */
export function SampleReportContent() {
  const data = SAMPLE_REPORT_DATA;

  // D3.6: Split carrier results — first FREE_CARRIER_VISIBLE visible, rest locked
  const visibleCarriers = data.carrier.slice(0, FREE_CARRIER_VISIBLE);
  const lockedCarrierCount = Math.max(0, data.carrier.length - FREE_CARRIER_VISIBLE);

  // D3.4: Find first condition where both parents are carriers (for Punnett square)
  const bothCarrierCondition = data.carrier.find(
    (c) => c.parentAStatus === 'carrier' && c.parentBStatus === 'carrier',
  );

  return (
    <div className="flex gap-8">
      {/* D3.5: Sidebar navigation */}
      <ReportSidebar />

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Heading */}
        <m.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="gradient-text font-heading text-3xl font-extrabold md:text-4xl lg:text-5xl">
            Sample Report
          </h1>
          <p className="font-body mx-auto mt-3 max-w-2xl text-base text-(--text-muted) md:text-lg">
            {`Fictional analysis for ${SAMPLE_COUPLE.parentA} & ${SAMPLE_COUPLE.parentB}`}
          </p>
        </m.div>

        {/* Disclaimer */}
        <m.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div
            role="note"
            className="mb-10 flex items-start gap-3 rounded-xl border border-[rgba(6,182,212,0.2)] bg-[rgba(6,182,212,0.06)] p-4"
          >
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-(--accent-cyan)"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed font-medium text-(--text-body)">
              This is a sample report with fictional data for demonstration purposes only. No real
              genetic information is represented. Do not use this for any medical decisions.
            </p>
          </div>
        </m.div>

        {/* ── Carrier Screening Section ── */}
        <section
          id="carrier-section"
          className="mt-8"
          aria-labelledby="carrier-heading"
          tabIndex={-1}
        >
          <m.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2
              id="carrier-heading"
              className="font-heading mb-6 flex items-center gap-2 text-xl font-bold text-(--text-heading)"
            >
              <Dna className="h-5 w-5 text-(--accent-teal)" aria-hidden="true" />
              Carrier Screening Results
            </h2>
          </m.div>

          <m.div
            className="grid gap-3"
            variants={gridStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* D3.3: Visible carriers with risk-differentiated borders */}
            {visibleCarriers.map((result) => (
              <m.div key={result.rsid} variants={fadeUp}>
                {/* D3.3: Border color applied at GlassCard wrapper level */}
                <GlassCard
                  variant="subtle"
                  hover="none"
                  className={`p-4 ${carrierBorderClasses(result.riskLevel)}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-(--text-heading)">
                        {result.condition}
                      </h3>
                      <p className="mt-0.5 text-xs text-(--text-muted)">
                        {result.gene} &middot; {result.inheritance.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <span className={`text-xs font-bold uppercase ${riskColor(result.riskLevel)}`}>
                      {RISK_LABELS[result.riskLevel] ?? result.riskLevel}
                    </span>
                  </div>

                  {/* D3.4: Punnett square for the first both-carrier condition */}
                  {bothCarrierCondition && result.rsid === bothCarrierCondition.rsid && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-xs font-medium text-(--accent-teal) hover:opacity-80">
                        Show offspring probability grid
                      </summary>
                      <div className="mt-3">
                        <PunnettSquare
                          parentAAlleles={['A', 'a']}
                          parentBAlleles={['A', 'a']}
                          riskType="carrier"
                        />
                        <p className="mt-2 text-center text-xs text-(--text-dim)">
                          Autosomal recessive — both parents are carriers (Aa × Aa)
                        </p>
                      </div>
                    </details>
                  )}
                </GlassCard>
              </m.div>
            ))}
          </m.div>

          {/* D3.6: Tier-gate overlay for remaining locked carrier items */}
          <TierGateOverlay lockedCount={lockedCarrierCount} />
        </section>

        {/* ── Traits Section ── */}
        <section
          id="traits-section"
          className="mt-16"
          aria-labelledby="traits-heading"
          tabIndex={-1}
        >
          <m.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2
              id="traits-heading"
              className="font-heading mb-6 flex items-center gap-2 text-xl font-bold text-(--text-heading)"
            >
              <FlaskConical className="h-5 w-5 text-(--accent-violet)" aria-hidden="true" />
              Trait Predictions
            </h2>
          </m.div>

          <m.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={gridStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {data.traits
              .filter((t) => t.status === 'success')
              .map((trait) => (
                <m.div key={trait.rsid} variants={fadeUp}>
                  <GlassCard variant="subtle" hover="glow" className="h-full p-5">
                    <h3 className="text-sm font-semibold text-(--text-heading)">{trait.trait}</h3>
                    <p className="mt-1 text-xs text-(--text-muted)">
                      {trait.gene} &middot; {trait.confidence} confidence
                    </p>
                    {/* D3.1: TraitProbabilityBar replaces plain <span> percentage */}
                    <div className="mt-3 space-y-1.5">
                      {Object.entries(trait.offspringProbabilities).map(
                        ([phenotype, probability]) => (
                          <TraitProbabilityBar
                            key={phenotype}
                            phenotype={phenotype}
                            probability={probability}
                            category={TRAIT_CATEGORY_MAP[trait.trait] ?? 'physical'}
                          />
                        ),
                      )}
                    </div>
                  </GlassCard>
                </m.div>
              ))}
          </m.div>
        </section>

        {/* ── PGx Section ── */}
        <section id="pgx-section" className="mt-16" aria-labelledby="pgx-heading" tabIndex={-1}>
          <m.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2
              id="pgx-heading"
              className="font-heading mb-6 flex items-center gap-2 text-xl font-bold text-(--text-heading)"
            >
              <Pill className="h-5 w-5 text-(--accent-cyan)" aria-hidden="true" />
              Pharmacogenomics (PGx)
            </h2>
          </m.div>

          <m.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={gridStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {Object.values(data.pgx.results).map((gene) => (
              <m.div key={gene.gene} variants={fadeUp}>
                <GlassCard variant="subtle" hover="glow" className="h-full p-5">
                  <h3 className="text-sm font-semibold text-(--text-heading)">{gene.gene}</h3>
                  <p className="mt-1 text-xs text-(--text-muted)">Chr {gene.chromosome}</p>
                  <div className="mt-3 space-y-2">
                    <div className="text-xs">
                      <span className="text-(--text-muted)">{SAMPLE_COUPLE.parentA}: </span>
                      <span className="font-mono font-semibold text-(--accent-cyan)">
                        {gene.parentA.diplotype}
                      </span>
                      <span className="ml-1 text-(--text-dim)">
                        ({gene.parentA.metabolizerStatus.status.replace(/_/g, ' ')})
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-(--text-muted)">{SAMPLE_COUPLE.parentB}: </span>
                      <span className="font-mono font-semibold text-(--accent-cyan)">
                        {gene.parentB.diplotype}
                      </span>
                      <span className="ml-1 text-(--text-dim)">
                        ({gene.parentB.metabolizerStatus.status.replace(/_/g, ' ')})
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </m.div>
            ))}
          </m.div>
        </section>

        {/* ── PRS Section ── */}
        <section id="prs-section" className="mt-16" aria-labelledby="prs-heading" tabIndex={-1}>
          <m.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2
              id="prs-heading"
              className="font-heading mb-4 flex items-center gap-2 text-xl font-bold text-(--text-heading)"
            >
              <Activity className="h-5 w-5 text-(--accent-amber)" aria-hidden="true" />
              Polygenic Risk Scores (PRS)
            </h2>
            <p className="mb-6 text-xs text-(--text-muted) italic">
              Note: Most GWAS studies underlying these scores have disproportionately studied
              European-ancestry populations. PRS accuracy may be lower for individuals of
              non-European ancestry. Interpret these scores with caution and discuss with a genetic
              counselor if your ancestry differs.
            </p>
          </m.div>

          {/* D3.2: PrsGauge replaces text-only PRS cards */}
          <m.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            variants={gridStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {Object.values(data.prs.conditions).map((condition) => (
              <m.div key={condition.name} variants={fadeUp}>
                <GlassCard variant="subtle" hover="glow" className="h-full p-5">
                  {/* D3.2: PrsGauge visual */}
                  <PrsGauge
                    percentile={condition.offspring.expectedPercentile}
                    condition={condition.name}
                  />

                  {/* Supplementary text info below the gauge */}
                  <div className="mt-3 space-y-1 border-t border-(--border-subtle) pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-(--text-muted)">Range</span>
                      <span className="font-mono text-(--text-body)">
                        {condition.offspring.rangeLow}th &ndash; {condition.offspring.rangeHigh}th
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-(--text-muted)">Risk Interpretation</span>
                      <span className="font-semibold text-(--text-body)">
                        {RISK_CATEGORY_LABELS[condition.parentA.riskCategory] ??
                          condition.parentA.riskCategory}{' '}
                        /{' '}
                        {RISK_CATEGORY_LABELS[condition.parentB.riskCategory] ??
                          condition.parentB.riskCategory}
                      </span>
                    </div>
                    {condition.ancestryNote && (
                      <p className="text-xs text-(--text-muted) italic">{condition.ancestryNote}</p>
                    )}
                  </div>
                </GlassCard>
              </m.div>
            ))}
          </m.div>
        </section>

        {/* ── Counseling Section ── */}
        <section
          id="counseling-section"
          className="mt-16"
          aria-labelledby="counseling-heading"
          tabIndex={-1}
        >
          <m.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2
              id="counseling-heading"
              className="font-heading mb-6 flex items-center gap-2 text-xl font-bold text-(--text-heading)"
            >
              <Stethoscope className="h-5 w-5 text-(--accent-rose)" aria-hidden="true" />
              Genetic Counseling Recommendation
            </h2>
          </m.div>

          <m.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <GlassCard variant="subtle" hover="none" className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-sm font-semibold text-(--text-heading)">Urgency:</span>
                <span
                  className={`text-sm font-bold uppercase ${urgencyColor(data.counseling.urgency)}`}
                >
                  {data.counseling.urgency}
                </span>
              </div>

              <p className="mb-4 text-sm text-(--text-body)">{data.counseling.summaryText}</p>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-(--text-heading)">Key Findings</h3>
                {data.counseling.keyFindings?.map((finding) => (
                  <div
                    key={finding.condition}
                    className="flex items-center justify-between rounded-lg border border-(--border-subtle) p-3"
                  >
                    <div>
                      <span className="text-sm font-medium text-(--text-heading)">
                        {finding.condition}
                      </span>
                      <span className="ml-2 text-xs text-(--text-muted)">{finding.gene}</span>
                    </div>
                    <span className={`text-xs font-bold uppercase ${riskColor(finding.riskLevel)}`}>
                      {RISK_LABELS[finding.riskLevel] ?? finding.riskLevel}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <p className="mt-3 text-xs text-(--text-muted)">
              If you have concerns about genetic conditions, speak with a certified genetic
              counselor.{' '}
              <a
                href="https://www.nsgc.org/findageneticcounselor"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Find a Genetic Counselor (opens in new tab)"
                className="underline hover:text-(--accent-teal)"
              >
                Find a counselor (NSGC)
              </a>
            </p>
          </m.div>
        </section>

        {/* ── Call to Action ──────────────────────────────────────────── */}
        <section className="mt-16 mb-16 text-center" aria-labelledby="cta-heading">
          <GlassCard variant="medium" hover="glow" className="p-10">
            <h2
              id="cta-heading"
              className="font-heading mb-3 text-2xl font-bold text-(--text-heading)"
            >
              Ready to Analyze Your Own DNA?
            </h2>
            <p className="mb-6 text-sm text-(--text-muted)">
              Upload your raw DNA files from 23andMe, AncestryDNA, MyHeritage, or VCF and get your
              personalized genetic analysis.
            </p>
            {/* D3.7: Next.js Link + buttonVariants (not raw <a> tags) */}
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/analysis" className={buttonVariants({ variant: 'primary', size: 'md' })}>
                Start Free Analysis
              </Link>
              <Link
                href="/products"
                className={buttonVariants({ variant: 'secondary', size: 'md' })}
              >
                View Pro Plans
              </Link>
            </div>
          </GlassCard>
        </section>
      </div>
    </div>
  );
}
