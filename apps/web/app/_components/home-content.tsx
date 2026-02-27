"use client";

import Link from "next/link";
import {
  Shield,
  Dna,
  Upload,
  BarChart3,
  Microscope,
  Pill,
  ChevronRight,
  Lock,
  Server,
  Eye,
  Users,
  Brain,
  HeartPulse,
} from "lucide-react";
import { m } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonVariants } from "@/components/ui/button";
import { HelixAnimation } from "@/components/marketing/helix-animation";
import { PricingCard } from "@/components/marketing/pricing-card";
import { StepCircle } from "@/components/marketing/step-circle";
import { Accordion } from "@/components/ui/accordion";
import { SectionHeading } from "@/components/marketing/section-heading";
import { useCountUp } from "@/hooks/use-count-up";
import { staggerContainer, staggerItem } from "@/lib/animation-variants";
import { MARKETING_TIERS } from "@/lib/pricing-data";
import { HOME_FAQ } from "@/lib/faq-data";
import { cn } from "@/lib/utils";
import { CARRIER_PANEL_COUNT, CARRIER_PANEL_COUNT_DISPLAY, TRAIT_COUNT, TRAIT_COUNT_DISPLAY } from "@mergenix/genetics-data";

/* -- Feature data -- */
const FEATURES = [
  {
    icon: Microscope,
    title: `${CARRIER_PANEL_COUNT_DISPLAY} Disease Screening`,
    description:
      "Comprehensive carrier screening across autosomal recessive, dominant, and X-linked conditions with Mendelian inheritance modeling.",
    badge: "Carrier Risk",
    color: "#f43f5e",
  },
  {
    icon: Dna,
    title: `${TRAIT_COUNT_DISPLAY} Trait Predictions`,
    description:
      "From eye color to earwax type, predict physical traits with Punnett square visualization and confidence scoring.",
    badge: "Traits",
    color: "#06d6a0",
  },
  {
    icon: Pill,
    title: "Pharmacogenomics",
    description:
      "Predict drug metabolism phenotypes (CYP2D6, CYP2C19, and more) for personalized medicine insights.",
    badge: "PGx",
    color: "#8b5cf6",
  },
  {
    icon: BarChart3,
    title: "Polygenic Risk Scores",
    description:
      "Multi-variant risk scoring for complex conditions like Type 2 Diabetes, Heart Disease, and Breast Cancer.",
    badge: "PRS",
    color: "#06b6d4",
  },
] as const;

const PRIVACY_FEATURES = [
  {
    icon: Lock,
    title: "Client-Side Processing",
    description: "All genetic analysis runs in your browser. Files never touch our servers.",
  },
  {
    icon: Server,
    title: "No Cloud Storage",
    description: "We never store your DNA data. Period. No databases, no backups, no exceptions.",
  },
  {
    icon: Eye,
    title: "No Third-Party Sharing",
    description: "Your genetic data is never shared with advertisers, insurers, or any third party.",
  },
  {
    icon: Shield,
    title: "HIPAA-Conscious Design",
    description: "Built with healthcare privacy standards in mind from day one.",
  },
] as const;

const STEPS = [
  {
    number: 1,
    icon: Upload,
    title: "Upload DNA Files",
    description:
      "Drop your 23andMe, AncestryDNA, MyHeritage, or VCF files. We support all major formats.",
  },
  {
    number: 2,
    icon: Brain,
    title: "Instant Analysis",
    description:
      `Our engine screens ${CARRIER_PANEL_COUNT_DISPLAY} diseases, predicts ${TRAIT_COUNT_DISPLAY} traits, and runs pharmacogenomic analysis in seconds.`,
  },
  {
    number: 3,
    icon: HeartPulse,
    title: "Clear, Understandable Results",
    description:
      "Get clear, visual results with risk scores, Punnett squares, and genetic counselor referrals.",
  },
] as const;

/* -- Format number with commas -- */
function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function HomeContent() {
  const diseaseCount = useCountUp(CARRIER_PANEL_COUNT, 2200);
  const traitCount = useCountUp(TRAIT_COUNT, 1800);

  return (
    <div className="relative">
      {/* HERO SECTION */}
      <m.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative overflow-hidden px-4 pb-16 pt-12 md:px-6 md:pb-24 md:pt-20"
        aria-label="Hero"
      >
        {/* Background glow orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-[rgba(6,214,160,0.06)] blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[rgba(139,92,246,0.05)] blur-[128px]" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          {/* DNA helix animation */}
          <HelixAnimation dotCount={5} className="mx-auto mb-8 h-6 w-40" />

          {/* Headline */}
          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="gradient-text mx-auto max-w-4xl font-heading text-4xl font-extrabold leading-tight md:text-6xl lg:text-7xl"
          >
            Explore Your Genetic Possibilities
          </m.h1>

          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-2xl text-lg text-[var(--text-muted)] md:text-xl"
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
            transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
            className="mt-6 flex items-center justify-center gap-8 text-center"
            aria-label="Key statistics"
          >
            <div>
              <span
                ref={diseaseCount.ref}
                className="font-heading text-3xl font-extrabold text-[var(--accent-teal)] md:text-4xl"
              >
                {formatNumber(diseaseCount.count)}
              </span>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[var(--text-dim)]">
                Diseases Screened
              </p>
            </div>
            <div className="h-10 w-px bg-[var(--border-subtle)]" aria-hidden="true" />
            <div>
              <span
                ref={traitCount.ref}
                className="font-heading text-3xl font-extrabold text-[var(--accent-violet)] md:text-4xl"
              >
                {formatNumber(traitCount.count)}
              </span>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[var(--text-dim)]">
                Traits Predicted
              </p>
            </div>
          </m.div>

          {/* CTA buttons — use Link styled as button to avoid nested interactive elements */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
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
            transition={{ duration: 0.5, delay: 0.75, ease: "easeOut" }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            role="list"
            aria-label="Trust indicators"
          >
            <li className="inline-flex items-center gap-2 rounded-xl border border-[rgba(6,214,160,0.12)] bg-[rgba(6,214,160,0.05)] px-3 py-2 backdrop-blur-sm">
              <Shield className="h-4 w-4 text-[var(--accent-teal)]" aria-hidden="true" />
              <span className="text-xs text-[var(--text-muted)]">
                100% Client-Side Processing
              </span>
            </li>
            <li className="inline-flex items-center gap-2 rounded-xl border border-[rgba(6,214,160,0.12)] bg-[rgba(6,214,160,0.05)] px-3 py-2 backdrop-blur-sm">
              <Lock className="h-4 w-4 text-[var(--accent-teal)]" aria-hidden="true" />
              <span className="text-xs text-[var(--text-muted)]">
                Zero Data Storage
              </span>
            </li>
            <li className="inline-flex items-center gap-2 rounded-xl border border-[rgba(6,214,160,0.12)] bg-[rgba(6,214,160,0.05)] px-3 py-2 backdrop-blur-sm">
              <Users className="h-4 w-4 text-[var(--accent-teal)]" aria-hidden="true" />
              <span className="text-xs text-[var(--text-muted)]">
                No Third-Party Sharing
              </span>
            </li>
          </m.ul>
        </div>
      </m.section>

      {/* PRIVACY SECTION */}
      <m.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative px-4 py-16 md:px-6 md:py-24"
        aria-label="Privacy and security"
      >
        {/* Background orb */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute right-1/3 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-[rgba(6,214,160,0.04)] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <SectionHeading
            title="Your DNA Never Leaves Your Device"
            subtitle="Privacy is not a feature — it is our architecture."
            gradient="teal"
            className="mb-12"
          />

          <m.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {PRIVACY_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <m.div key={feature.title} variants={staggerItem}>
                  <GlassCard
                    variant="medium"
                    hover="glow"
                    className="h-full p-6"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(6,214,160,0.1)]">
                      <Icon className="h-6 w-6 text-[var(--accent-teal)]" aria-hidden="true" />
                    </div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                      {feature.description}
                    </p>
                  </GlassCard>
                </m.div>
              );
            })}
          </m.div>
        </div>
      </m.section>

      {/* HOW IT WORKS */}
      <m.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative px-4 py-16 md:px-6 md:py-24"
        aria-label="How it works"
      >
        {/* Background orb */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/4 top-1/3 h-72 w-72 rounded-full bg-[rgba(139,92,246,0.04)] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <SectionHeading
            title="How It Works"
            subtitle="Three simple steps to understand your family's genetic health"
            className="mb-12"
          />

          <m.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-8 md:grid-cols-3"
          >
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <m.div key={step.number} variants={staggerItem}>
                  <GlassCard
                    variant="medium"
                    hover="glow"
                    className="h-full p-8 text-center"
                  >
                    {/* Step number */}
                    <StepCircle step={step.number} className="mx-auto mb-5" />

                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(6,214,160,0.08)]">
                      <Icon className="h-7 w-7 text-[var(--accent-teal)]" aria-hidden="true" />
                    </div>

                    <h3 className="mb-2 font-heading text-lg font-semibold text-[var(--text-heading)]">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                      {step.description}
                    </p>
                  </GlassCard>
                </m.div>
              );
            })}
          </m.div>
        </div>
      </m.section>

      {/* KEY FEATURES */}
      <m.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative px-4 py-16 md:px-6 md:py-24"
        aria-label="Key features"
      >
        {/* Background orb */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-[rgba(6,182,212,0.04)] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <SectionHeading
            title="Comprehensive Genetic Intelligence"
            subtitle="Everything you need to make informed family planning decisions"
            className="mb-12"
          />

          <m.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-6 sm:grid-cols-2"
          >
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <m.div key={feature.title} variants={staggerItem}>
                  <GlassCard
                    variant="medium"
                    hover="glow"
                    rainbow
                    className="relative h-full overflow-hidden p-7"
                  >
                    <div className="flex items-start gap-5">
                      <div
                        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
                        style={{ background: `${feature.color}18` }}
                      >
                        <Icon
                          className="h-7 w-7"
                          style={{ color: feature.color }}
                          aria-hidden="true"
                        />
                      </div>
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="font-heading text-lg font-semibold text-[var(--text-heading)]">
                            {feature.title}
                          </h3>
                        </div>
                        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </m.div>
              );
            })}
          </m.div>
        </div>
      </m.section>

      {/* PRICING PREVIEW */}
      <m.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative px-4 py-16 md:px-6 md:py-24"
        aria-label="Pricing"
      >
        {/* Background orb */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/3 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[rgba(139,92,246,0.04)] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <SectionHeading
            title="Simple, One-Time Pricing"
            subtitle="Pay once, use forever. No subscriptions, no hidden fees."
            className="mb-12"
          />

          <m.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-6 sm:grid-cols-2 md:grid-cols-3"
          >
            {MARKETING_TIERS.map((plan) => (
              <m.div key={plan.name} variants={staggerItem}>
                <PricingCard
                  tier={plan.name}
                  price={plan.price}
                  priceNote={plan.priceNote}
                  description={plan.description}
                  features={plan.features}
                  cta={plan.cta}
                  ctaHref={plan.ctaHref}
                  ctaVariant={plan.ctaVariant}
                  popular={plan.popular ?? false}
                  barGradient={plan.barGradient}
                  cardClass={plan.cardClass}
                  disableAnimation
                  className="h-full"
                />
              </m.div>
            ))}
          </m.div>
        </div>
      </m.section>

      {/* FAQ */}
      <m.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative px-4 py-16 md:px-6 md:py-24"
        aria-label="Frequently asked questions"
      >
        {/* Background orb */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-[rgba(6,214,160,0.03)] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <SectionHeading
            title="Frequently Asked Questions"
            className="mb-12"
          />

          <Accordion items={HOME_FAQ} />
        </div>
      </m.section>

      {/* FINAL CTA */}
      <m.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="px-4 py-16 md:px-6 md:py-24"
        aria-label="Call to action"
      >
        <div className="mx-auto max-w-3xl">
          <GlassCard
            variant="strong"
            hover="none"
            className="glow-pulse relative overflow-hidden p-10 text-center md:p-14"
          >
            {/* Background orb inside CTA card */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(6,214,160,0.06)] blur-[80px]" />
            </div>

            {/* DNA helix animation */}
            <HelixAnimation dotCount={3} className="relative mx-auto mb-6 h-6 w-24" />

            <h2 className="gradient-text relative font-heading text-3xl font-extrabold md:text-4xl">
              Ready to Know?
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-[var(--text-muted)]">
              Create a free account and start your genetic analysis today.
              Your DNA stays on your device — always.
            </p>

            <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/analysis"
                className={cn(buttonVariants({ variant: "primary", size: "xl" }))}
              >
                Start Free Analysis
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/about"
                className={cn(buttonVariants({ variant: "ghost", size: "xl" }))}
              >
                Learn More
              </Link>
            </div>
          </GlassCard>
        </div>
      </m.section>
    </div>
  );
}
