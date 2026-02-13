/* ------------------------------------------------------------------ */
/*  Single source of truth for pricing tier data                      */
/*  Consumed by home-content.tsx and products-content.tsx              */
/* ------------------------------------------------------------------ */

import { CARRIER_PANEL_COUNT_DISPLAY } from "@mergenix/genetics-data";

export interface PricingTier {
  /** Display name (e.g. "Free", "Premium", "Pro") */
  name: string;
  /** Formatted price string (e.g. "$12.90") */
  price: string;
  /** Price qualifier (e.g. "one-time", "forever") */
  priceNote: string;
  /** Short marketing description */
  description: string;
  /** Feature bullet list (short form for home page) */
  features: string[];
  /** Extended feature list (products page can append extras) */
  featuresExtended?: string[];
  /** CTA button label */
  cta: string;
  /** Button variant */
  ctaVariant: "primary" | "violet" | "outline";
  /** Navigation target */
  ctaHref: string;
  /** Show "Most Popular" badge */
  popular?: boolean;
  /** Tailwind gradient class for the top bar */
  barGradient: string;
  /** Extra card-level class overrides */
  cardClass: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    priceNote: "forever",
    description: "Basic carrier screening to get started",
    features: [
      "Top 25 disease screening",
      "10 basic trait predictions",
      "23andMe file support",
      "Community support",
    ],
    featuresExtended: [
      "Top 25 disease screening",
      "10 basic trait predictions",
      "23andMe file support",
      "Basic Punnett squares",
      "Community support",
    ],
    cta: "Get Started Free",
    ctaVariant: "outline",
    ctaHref: "/analysis",
    barGradient: "bg-gradient-to-r from-[#94a3b8] to-[#64748b]",
    cardClass: "",
  },
  {
    name: "Premium",
    price: "$12.90",
    priceNote: "one-time",
    description: "Full screening for serious family planners",
    features: [
      "500+ disease screening",
      "All 79 trait predictions",
      "All file formats supported",
      "Pharmacogenomics (5 genes)",
      "Polygenic risk scores (3 conditions)",
      "Priority email support",
    ],
    featuresExtended: [
      "500+ disease screening",
      "All 79 trait predictions",
      "All file formats (23andMe, Ancestry, MyHeritage, VCF)",
      "Pharmacogenomics (5 genes)",
      "Polygenic risk scores (3 conditions)",
      "Detailed Punnett squares with confidence",
      "Priority email support",
    ],
    cta: "Get Premium",
    ctaVariant: "violet",
    ctaHref: "/register",
    popular: true,
    barGradient: "bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa]",
    cardClass:
      "border-[rgba(139,92,246,0.4)] shadow-[0_4px_30px_var(--shadow-ambient),0_0_50px_var(--glow-violet)]",
  },
  {
    name: "Pro",
    price: "$29.90",
    priceNote: "one-time",
    description: "Advanced insights with counselor referrals",
    features: [
      `All ${CARRIER_PANEL_COUNT_DISPLAY} disease screening`,
      "Everything in Premium",
      "Ethnicity-adjusted frequencies",
      "Genetic counselor referrals",
      "ClinVar data integration",
      "Exportable PDF reports",
      "Dedicated support",
    ],
    featuresExtended: [
      `All ${CARRIER_PANEL_COUNT_DISPLAY} disease screening`,
      "Everything in Premium",
      "Ethnicity-adjusted carrier frequencies",
      "Genetic counselor referral system",
      "ClinVar database integration",
      "Exportable PDF reports",
      "Multi-analysis comparison",
      "Dedicated priority support",
    ],
    cta: "Get Pro",
    ctaVariant: "primary",
    ctaHref: "/register",
    barGradient: "bg-gradient-to-r from-[#06d6a0] to-[#06b6d4]",
    cardClass: "",
  },
];
