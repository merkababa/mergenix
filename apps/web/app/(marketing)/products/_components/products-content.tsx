"use client";

import Link from "next/link";
import {
  Check,
  X,
  Shield,
  Zap,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { PricingCard } from "@/components/marketing/pricing-card";
import { Accordion } from "@/components/ui/accordion";
import { SectionHeading } from "@/components/marketing/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import {
  staggerContainer,
  staggerItem,
  fadeUp,
  fadeIn,
} from "@/lib/animation-variants";
import { PRICING_TIERS } from "@/lib/pricing-data";
import { PRICING_FAQ } from "@/lib/faq-data";
import { CARRIER_PANEL_COUNT_DISPLAY } from "@mergenix/genetics-data";

/* -- Comparison table rows -- */
const COMPARISON = [
  { feature: "Disease screening", free: false, premium: "500+", pro: `All ${CARRIER_PANEL_COUNT_DISPLAY}` },
  { feature: "Trait predictions", free: "All traits", premium: "All traits", pro: "All traits" },
  { feature: "File formats", free: "23andMe only", premium: "All 4 formats", pro: "All 4 formats" },
  { feature: "Pharmacogenomics", free: false, premium: "5 genes", pro: "All 12 genes" },
  { feature: "Polygenic risk scores", free: false, premium: "3 conditions", pro: "All 10 conditions" },
  { feature: "Ethnicity adjustment", free: false, premium: false, pro: true },
  { feature: "Counselor referrals", free: false, premium: false, pro: true },
  { feature: "ClinVar integration", free: false, premium: false, pro: true },
  { feature: "PDF export", free: false, premium: false, pro: true },
  { feature: "Support", free: "Community", premium: "Priority email", pro: "Dedicated" },
] as const;

function ComparisonCell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check
        className="mx-auto h-5 w-5 text-[var(--accent-teal)]"
        aria-label="Included"
      />
    ) : (
      <X
        className="mx-auto h-5 w-5 text-[var(--text-dim)]"
        aria-label="Not included"
      />
    );
  }
  return (
    <span className="text-sm text-[var(--text-body)]">{value}</span>
  );
}

const trustBadges = [
  { icon: Shield, text: "Your DNA never leaves your device" },
  { icon: Zap, text: "One-time payment, use forever" },
  { icon: Users, text: "30-day guarantee for technical issues" },
] as const;

export function ProductsContent() {
  return (
    <>
      <PageHeader
        title="Simple, One-Time Pricing"
        subtitle="Pay once, use forever. No subscriptions, no hidden fees, no surprises."
      />

      {/* -- Tier Cards -- */}
      <motion.div
        className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-3"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
      >
        {PRICING_TIERS.map((tier) => (
          <motion.div key={tier.name} variants={staggerItem}>
            <PricingCard
              tier={tier.name}
              price={tier.price}
              priceNote={tier.priceNote}
              description={tier.description}
              features={tier.featuresExtended ?? tier.features}
              cta={tier.cta}
              ctaHref={tier.ctaHref}
              ctaVariant={tier.ctaVariant}
              popular={tier.popular ?? false}
              barGradient={tier.barGradient}
              cardClass={tier.cardClass}
              disableAnimation
              className="h-full"
            />
          </motion.div>
        ))}
      </motion.div>

      {/* -- Feature Comparison Table -- */}
      <motion.div
        className="mt-20"
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <SectionHeading
          title="Feature Comparison"
          subtitle="See exactly what each tier includes"
        />

        <GlassCard variant="medium" hover="none" className="mt-8 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">
                Feature comparison between Free, Premium, and Pro tiers
              </caption>
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th
                    scope="col"
                    className="px-6 py-4 font-heading text-sm font-semibold text-[var(--text-heading)]"
                  >
                    Feature
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-center font-heading text-sm font-semibold text-[var(--text-muted)]"
                  >
                    Free
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-center font-heading text-sm font-semibold text-[#8b5cf6]"
                  >
                    Premium
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-center font-heading text-sm font-semibold text-[var(--accent-teal)]"
                  >
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-[var(--border-subtle)] transition-colors duration-200 hover:bg-[rgba(6,214,160,0.04)] hover:shadow-[inset_3px_0_0_var(--accent-teal)]"
                  >
                    <td className="px-6 py-3.5 text-sm font-medium text-[var(--text-body)]">
                      {row.feature}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <ComparisonCell value={row.free} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <ComparisonCell value={row.premium} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <ComparisonCell value={row.pro} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>

      {/* -- Trust badges -- */}
      <motion.div
        className="mt-16 flex flex-wrap items-center justify-center gap-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {trustBadges.map(({ icon: Icon, text }) => (
          <motion.div
            key={text}
            variants={fadeUp}
            className="flex items-center gap-2 text-sm text-[var(--text-muted)]"
          >
            <Icon className="h-4 w-4 text-[var(--accent-teal)]" aria-hidden="true" />
            <span>{text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* -- FAQ -- */}
      <motion.div
        className="mt-20"
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
      >
        <SectionHeading
          title="Pricing FAQ"
          subtitle="Common questions about our one-time pricing model"
        />

        <div className="mx-auto mt-8 max-w-2xl">
          <Accordion items={PRICING_FAQ} />
        </div>
      </motion.div>

      {/* -- Bottom CTA -- */}
      <motion.div
        className="mt-20 text-center"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        <GlassCard variant="medium" hover="none" className="p-10">
          <h2 className="gradient-text font-heading text-2xl font-bold">
            Start Your Free Analysis Today
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[var(--text-muted)]">
            Sign up free. Upload your DNA files and get instant results.
          </p>
          <div className="mt-6">
            <Link
              href="/analysis"
              className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
            >
              Get Started Free
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </>
  );
}
