'use client';

import {
  Dna,
  Shield,
  Microscope,
  Brain,
  Heart,
  BookOpen,
  Users,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { m } from 'motion/react';
import { GlassCard } from '@/components/ui/glass-card';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { HelixAnimation } from '@/components/marketing/helix-animation';
import { StepCircle } from '@/components/marketing/step-circle';
import { SectionHeading } from '@/components/marketing/section-heading';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { cn } from '@/lib/utils';
import { fadeUp, fadeIn, scaleIn, createStaggerContainer } from '@/lib/animation-variants';
import {
  CARRIER_PANEL_COUNT,
  CARRIER_PANEL_COUNT_DISPLAY,
  TRAIT_COUNT,
  TRAIT_COUNT_DISPLAY,
} from '@mergenix/genetics-data';
import { useCountUp } from '@/hooks/use-count-up';

const TEAM_MEMBERS = [
  {
    initials: 'AK',
    role: 'Founder',
    gradient: 'from-(--accent-teal) to-(--accent-cyan)',
    bg: 'bg-[rgba(6,214,160,0.1)]',
    text: 'text-(--accent-teal)',
  },
  {
    initials: 'MR',
    role: 'Lead Developer',
    gradient: 'from-(--accent-violet) to-(--accent-violet)',
    bg: 'bg-[rgba(139,92,246,0.1)]',
    text: 'text-(--accent-violet)',
  },
  {
    initials: 'JL',
    role: 'Genetics Advisor',
    gradient: 'from-(--accent-cyan) to-(--accent-cyan)',
    bg: 'bg-[rgba(6,182,212,0.1)]',
    text: 'text-(--accent-cyan)',
  },
] as const;

const SCIENCE_PRINCIPLES = [
  {
    icon: Microscope,
    svgIcon: 'dna-helix',
    title: 'Mendelian Inheritance Modeling',
    description:
      'Our carrier screening engine uses established Mendelian genetics \u2014 autosomal recessive, autosomal dominant, and X-linked inheritance models \u2014 to calculate offspring risk probabilities.',
  },
  {
    icon: Dna,
    svgIcon: 'database',
    title: 'Curated SNP Database',
    description: `We maintain a panel of ${CARRIER_PANEL_COUNT_DISPLAY} genetic conditions mapped to clinically-validated SNPs sourced from ClinVar, OMIM, and peer-reviewed literature.`,
  },
  {
    icon: Brain,
    svgIcon: 'bar-chart',
    title: 'Polygenic Risk Scoring',
    description:
      'For complex diseases influenced by many genes, we aggregate multiple variant effects into population-calibrated percentile scores using published genome-wide association studies.',
  },
  {
    icon: BookOpen,
    svgIcon: 'dna-helix',
    title: 'Evidence-Based Confidence',
    description:
      'Every result includes a confidence indicator (high, medium, low) based on the quality and quantity of supporting evidence. We never overstate certainty.',
  },
] as const;

const TEAM_VALUES = [
  {
    icon: Shield,
    title: 'Privacy is Non-Negotiable',
    description:
      'We believe genetic data is the most personal information that exists. Our architecture ensures your DNA never leaves your device \u2014 not as a policy, but as a technical guarantee.',
  },
  {
    icon: Heart,
    title: 'Empowerment, Not Anxiety',
    description:
      'Genetic information should empower informed decisions, not cause fear. Our UI uses calming language, contextual education, and genetic counselor referrals to support users emotionally.',
  },
  {
    icon: Lightbulb,
    title: 'Transparency in Every Result',
    description:
      'We show our sources, our confidence levels, and our limitations. We believe informed users make better decisions than reassured but uninformed ones.',
  },
  {
    icon: Users,
    title: 'Accessible to Everyone',
    description:
      'Genetic literacy should not be a luxury. Our free tier provides meaningful screening, and our educational glossary helps users understand results without a biology degree.',
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Upload',
    desc: 'Drop 23andMe, AncestryDNA, MyHeritage, or VCF files. Auto-format detection handles the rest.',
  },
  {
    step: 2,
    title: 'Analyze',
    desc: `Screen ${CARRIER_PANEL_COUNT_DISPLAY} diseases, predict ${TRAIT_COUNT_DISPLAY} traits, run PGx and polygenic risk scoring \u2014 all client-side.`,
  },
  {
    step: 3,
    title: 'Understand',
    desc: 'Visual results with Punnett squares, risk gauges, confidence scores, and counselor referrals.',
  },
] as const;

const STATS = [
  { countTarget: CARRIER_PANEL_COUNT, suffix: '', label: 'Diseases Screened', color: 'teal' },
  { countTarget: 8200, suffix: '+', label: 'SNPs Analyzed', color: 'cyan' },
  { countTarget: TRAIT_COUNT, suffix: '', label: 'Traits Predicted', color: 'violet' },
  { countTarget: 12, suffix: '', label: 'PGx Genes', color: 'amber' },
] as const;

/* -- Color maps -- */
const statColorMap: Record<string, { text: string; bg: string; shadow: string; bar: string }> = {
  teal: {
    text: 'text-(--accent-teal)',
    bg: 'bg-[rgba(6,214,160,0.08)]',
    shadow: 'shadow-[0_0_20px_rgba(6,214,160,0.15)]',
    bar: 'from-(--accent-teal) to-day-accent-teal',
  },
  cyan: {
    text: 'text-(--accent-cyan)',
    bg: 'bg-[rgba(6,182,212,0.08)]',
    shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    bar: 'from-(--accent-cyan) to-day-accent-cyan',
  },
  violet: {
    text: 'text-(--accent-violet)',
    bg: 'bg-[rgba(139,92,246,0.08)]',
    shadow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]',
    bar: 'from-accent-violet to-(--accent-violet)',
  },
  amber: {
    text: 'text-(--accent-amber)',
    bg: 'bg-[rgba(245,158,11,0.08)]',
    shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    bar: 'from-accent-amber to-day-accent-amber',
  },
};

/* Stagger container with slightly wider delay for the steps section */
const stepsStagger = createStaggerContainer(0.15);
/* Standard stagger for all other grids */
const gridStagger = createStaggerContainer(0.1);

// ---------------------------------------------------------------------------
// CountUpStat — animates a number from 0 to target on scroll into view
// ---------------------------------------------------------------------------
interface CountUpStatProps {
  countTarget: number;
  suffix: string;
  label: string;
  colors: { text: string; bg: string; shadow: string; bar: string };
}

function CountUpStat({ countTarget, suffix, label, colors }: CountUpStatProps) {
  const { count, ref } = useCountUp(countTarget, 2000);
  return (
    <GlassCard
      variant="medium"
      hover="glow"
      data-stat={label}
      className={`relative overflow-hidden p-6 text-center ${colors.shadow}`}
    >
      {/* Gradient top bar */}
      <div
        className={`absolute top-0 right-0 left-0 h-[3px] bg-linear-to-r ${colors.bar}`}
        aria-hidden="true"
      />
      <span
        ref={ref}
        data-count-up={countTarget}
        className={`font-heading text-4xl font-extrabold tracking-tight ${colors.text}`}
        aria-live="polite"
      >
        {count.toLocaleString('en-US')}
        {suffix}
      </span>
      <div className="mt-2 text-sm font-medium text-(--text-muted)">{label}</div>
    </GlassCard>
  );
}

export function AboutContent() {
  return (
    <>
      <PageHeader
        title="About Mergenix"
        subtitle="Privacy-first genetic offspring analysis. Built by scientists, designed for families."
        breadcrumbs={[{ label: 'About', href: '/about' }]}
      />

      {/* -- Mission -- */}
      <m.section
        id="mission"
        className="mt-12"
        aria-labelledby="mission-heading"
        variants={scaleIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        <GlassCard
          variant="strong"
          hover="none"
          className="glow-pulse px-8 py-14 text-center md:px-16 md:py-20"
        >
          <div className="relative mx-auto mb-8 h-6 w-28">
            <HelixAnimation dotCount={3} />
          </div>

          <h2
            id="mission-heading"
            className="font-heading text-3xl font-extrabold text-(--text-heading) md:text-4xl lg:text-5xl"
          >
            Our Mission
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-(--text-body) md:text-xl">
            Every family deserves access to genetic insights that were once available only through
            expensive clinical testing. Mergenix makes comprehensive carrier screening, trait
            prediction, and pharmacogenomic analysis accessible to anyone with a consumer DNA test
            &mdash; while keeping their data absolutely private.
          </p>
        </GlassCard>
      </m.section>

      {/* -- How It Works -- */}
      <section id="how-it-works" className="mt-24" aria-labelledby="how-it-works-heading">
        <m.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <SectionHeading
            id="how-it-works-heading"
            title="How It Works"
            subtitle="Upload DNA files from any major provider. Our engine runs entirely in your browser — your files never leave your device."
          />
        </m.div>

        <m.div
          className="mt-10 grid gap-6 md:grid-cols-3"
          variants={stepsStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {HOW_IT_WORKS.map((item) => (
            <m.div key={item.step} variants={fadeUp}>
              <GlassCard variant="medium" hover="glow" className="p-7 text-center">
                <div className="mx-auto mb-4">
                  <StepCircle step={item.step} size="lg" />
                </div>
                <h3 className="font-heading mb-2 text-lg font-semibold text-(--text-heading)">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-(--text-muted)">{item.desc}</p>
              </GlassCard>
            </m.div>
          ))}
        </m.div>
      </section>

      {/* -- Our Science -- */}
      <section id="science" className="mt-24" aria-labelledby="science-heading">
        <m.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <SectionHeading
            id="science-heading"
            title="Our Science"
            subtitle="Built on established genetic principles and peer-reviewed research"
          />
        </m.div>

        <m.div
          className="mt-10 grid gap-6 md:grid-cols-2"
          variants={gridStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {SCIENCE_PRINCIPLES.map((item, index) => {
            const Icon = item.icon;
            /* Alternate between teal and cyan for science section */
            const isTeal = index % 2 === 0;
            const iconBg = isTeal ? 'bg-[rgba(6,214,160,0.1)]' : 'bg-[rgba(6,182,212,0.1)]';
            const iconColor = isTeal ? 'text-(--accent-teal)' : 'text-(--accent-cyan)';

            return (
              <m.div key={item.title} variants={fadeUp}>
                <GlassCard
                  variant="medium"
                  hover="glow"
                  rainbow
                  data-science-card={item.svgIcon}
                  className="h-full p-7"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
                    >
                      <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-heading mb-2 text-base font-semibold text-(--text-heading)">
                        {item.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-(--text-muted)">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </m.div>
            );
          })}
        </m.div>
      </section>

      {/* -- What We Believe -- */}
      <section id="values" className="mt-24" aria-labelledby="values-heading">
        <m.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <SectionHeading
            id="values-heading"
            title="What We Believe"
            subtitle="The principles that guide every decision we make"
          />
        </m.div>

        <m.div
          className="mt-10 grid gap-6 md:grid-cols-2"
          variants={gridStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {TEAM_VALUES.map((item, index) => {
            const Icon = item.icon;
            /* Alternate between violet and amber for values section */
            const isViolet = index % 2 === 0;
            const iconBg = isViolet ? 'bg-[rgba(139,92,246,0.1)]' : 'bg-[rgba(245,158,11,0.1)]';
            const iconColor = isViolet ? 'text-(--accent-violet)' : 'text-(--accent-amber)';

            return (
              <m.div key={item.title} variants={fadeUp}>
                <GlassCard variant="subtle" hover="glow" className="h-full p-7">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
                    >
                      <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-heading mb-2 text-base font-semibold text-(--text-heading)">
                        {item.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-(--text-muted)">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </m.div>
            );
          })}
        </m.div>
      </section>

      {/* -- Meet the Team -- */}
      <section id="team" className="mt-24" aria-labelledby="team-heading">
        <m.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <SectionHeading
            id="team-heading"
            title="Meet the Team"
            subtitle="A small team with deep expertise in genetics, privacy engineering, and user experience"
          />
        </m.div>

        <ScrollReveal type="fade" delay={0.1} className="mt-10">
          <div className="flex flex-wrap justify-center gap-8">
            {TEAM_MEMBERS.map((member) => (
              <div key={member.role} className="flex flex-col items-center gap-3">
                {/* Avatar circle with gradient border */}
                <div
                  className={cn(
                    'relative flex h-20 w-20 items-center justify-center rounded-full',
                    'bg-linear-to-br p-0.5',
                    member.gradient,
                  )}
                >
                  <div
                    className={cn(
                      'flex h-full w-full items-center justify-center rounded-full',
                      member.bg,
                    )}
                    role="img"
                    aria-label={`${member.role} — initials ${member.initials}`}
                  >
                    <span
                      className={cn('font-heading text-lg font-bold', member.text)}
                      aria-hidden="true"
                    >
                      {member.initials}
                    </span>
                  </div>
                </div>
                {/* Role label */}
                <span className="text-sm font-medium text-(--text-body)">{member.role}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* -- Backed by Science (stats) -- */}
      <section id="stats" className="mt-24" aria-labelledby="stats-heading">
        <m.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <SectionHeading
            id="stats-heading"
            title="Backed by Science"
            subtitle="Our data sources and methodology"
          />
        </m.div>

        <m.div
          className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4"
          variants={gridStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {STATS.map((stat) => {
            const colors = statColorMap[stat.color];
            return (
              <m.div key={stat.label} variants={fadeUp}>
                <CountUpStat
                  countTarget={stat.countTarget}
                  suffix={stat.suffix}
                  label={stat.label}
                  colors={colors}
                />
              </m.div>
            );
          })}
        </m.div>
      </section>

      {/* -- CTA -- */}
      <m.section
        className="mt-24 text-center"
        aria-labelledby="cta-heading"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <GlassCard variant="medium" hover="none" className="p-10 md:p-14">
          <h2
            id="cta-heading"
            className="gradient-text font-heading text-2xl font-bold md:text-3xl"
          >
            Ready to Explore Your Genetics?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-(--text-muted)">
            Start with a free account. Begin your analysis in minutes.
          </p>
          <div className="mt-6">
            <Link
              href="/analysis"
              className={cn(buttonVariants({ variant: 'primary', size: 'lg' }))}
            >
              Start Free Analysis
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </GlassCard>
      </m.section>
    </>
  );
}
