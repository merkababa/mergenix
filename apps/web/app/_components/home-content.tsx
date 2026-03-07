'use client';

import Link from 'next/link';
import { Shield, ChevronRight, Lock, Server, Eye } from 'lucide-react';
import { m } from 'motion/react';
import { GlassCard } from '@/components/ui/glass-card';
import { buttonVariants } from '@/components/ui/button';
import { HelixAnimation } from '@/components/marketing/helix-animation';
import { PricingCard } from '@/components/marketing/pricing-card';
import { Accordion } from '@/components/ui/accordion';
import { SectionHeading } from '@/components/marketing/section-heading';
import { staggerContainer, staggerItem } from '@/lib/animation-variants';
import { MARKETING_TIERS } from '@/lib/pricing-data';
import { HOME_FAQ } from '@/lib/faq-data';
import { cn } from '@/lib/utils';
import { BentoFeatures } from '@/app/_components/bento-features';
import { ScrollTimeline } from '@/app/_components/scroll-timeline';
import { SocialProof } from '@/app/_components/social-proof';
import { ProductDemo } from '@/app/_components/product-demo';
import { HeroSection } from '@/app/_components/hero-section';

const PRIVACY_FEATURES = [
  {
    icon: Lock,
    title: 'Client-Side Processing',
    description: 'All genetic analysis runs in your browser. Files never touch our servers.',
  },
  {
    icon: Server,
    title: 'No Cloud Storage',
    description: 'We never store your DNA data. Period. No databases, no backups, no exceptions.',
  },
  {
    icon: Eye,
    title: 'No Third-Party Sharing',
    description:
      'Your genetic data is never shared with advertisers, insurers, or any third party.',
  },
  {
    icon: Shield,
    title: 'Healthcare-Grade Privacy',
    description: 'Built with healthcare privacy standards in mind from day one.',
  },
] as const;

export function HomeContent() {
  return (
    <div className="relative">
      {/* HERO SECTION */}
      <HeroSection />

      {/* PRIVACY SECTION */}
      <m.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' as const }}
        className="relative px-4 py-16 md:px-6 md:py-24"
        aria-label="Privacy and security"
      >
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            title="Your DNA Never Leaves Your Device"
            subtitle="Privacy is not a feature — it is our architecture."
            className="mb-12"
          />

          <m.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {PRIVACY_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <m.div key={feature.title} variants={staggerItem}>
                  <GlassCard variant="medium" hover="lift" className="h-full p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(6,214,160,0.1)]">
                      <Icon className="text-(--accent-teal) h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="font-heading text-(--text-heading) mb-2 text-base font-semibold">
                      {feature.title}
                    </h3>
                    <p className="text-(--text-muted) text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </GlassCard>
                </m.div>
              );
            })}
          </m.div>
        </div>
      </m.section>

      {/* SOCIAL PROOF — after privacy, before how it works */}
      <SocialProof />

      {/* HOW IT WORKS — scroll-driven timeline */}
      <ScrollTimeline />

      {/* PRODUCT DEMO — browser mockup with perspective tilt */}
      <ProductDemo />

      {/* KEY FEATURES — asymmetric bento grid */}
      <BentoFeatures />

      {/* PRICING PREVIEW */}
      <m.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' as const }}
        className="relative px-4 py-16 md:px-6 md:py-24"
        aria-label="Pricing"
      >
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            title="Simple, One-Time Pricing"
            subtitle="Pay once, use forever. No subscriptions, no hidden fees."
            className="mb-12"
          />

          <m.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-6 pt-4 sm:grid-cols-2 md:grid-cols-3"
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
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' as const }}
        className="relative px-4 py-16 md:px-6 md:py-24"
        aria-label="Frequently asked questions"
      >
        <div className="mx-auto max-w-3xl">
          <SectionHeading title="Frequently Asked Questions" className="mb-12" />

          <Accordion items={HOME_FAQ} />
        </div>
      </m.section>

      {/* FINAL CTA */}
      <m.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' as const }}
        className="px-4 py-16 md:px-6 md:py-24"
        aria-label="Call to action"
      >
        <div className="mx-auto max-w-3xl">
          <GlassCard
            variant="strong"
            hover="none"
            className="relative overflow-hidden p-10 text-center md:p-14"
          >
            {/* DNA helix animation */}
            <HelixAnimation dotCount={3} className="relative mx-auto mb-6 h-6 w-24" />

            <h2 className="text-(--text-heading) font-heading relative text-3xl font-extrabold md:text-4xl">
              Ready to Know?
            </h2>
            <p className="text-(--text-muted) relative mx-auto mt-4 max-w-lg">
              Create a free account and start your genetic analysis today. Your DNA stays on your
              device — always.
            </p>

            <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/analysis"
                className={cn(buttonVariants({ variant: 'primary', size: 'xl' }))}
              >
                Start Free Analysis
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link href="/about" className={cn(buttonVariants({ variant: 'ghost', size: 'xl' }))}>
                Learn More
              </Link>
            </div>
          </GlassCard>
        </div>
      </m.section>
    </div>
  );
}
