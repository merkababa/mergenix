/* ------------------------------------------------------------------ */
/*  Marketing display data for pricing tiers                          */
/*  Consumed by home-content.tsx and products-content.tsx              */
/*  NOTE: Canonical pricing logic lives in @mergenix/shared-types     */
/* ------------------------------------------------------------------ */

import { CARRIER_PANEL_COUNT_DISPLAY, TRAIT_COUNT_DISPLAY } from '@mergenix/genetics-data';

export interface MarketingTier {
  /** Display name (e.g. "Free", "Premium", "Pro") */
  name: string;
  /** Formatted price string (e.g. "$14.99") */
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
  ctaVariant: 'primary' | 'violet' | 'outline';
  /** Navigation target */
  ctaHref: string;
  /** Show "Most Popular" badge */
  popular?: boolean;
  /** Tailwind gradient class for the top bar */
  barGradient: string;
  /** Extra card-level class overrides */
  cardClass: string;
}

export const MARKETING_TIERS: MarketingTier[] = [
  {
    name: 'Free',
    price: '$0',
    priceNote: 'forever',
    description: 'Trait predictions with no disease screening',
    features: [
      `All ${TRAIT_COUNT_DISPLAY} trait predictions`,
      'Ethnicity-adjusted frequencies',
      'All file formats supported',
      'Community support',
    ],
    featuresExtended: [
      `All ${TRAIT_COUNT_DISPLAY} trait predictions`,
      'Ethnicity-adjusted carrier frequencies',
      'All file formats (23andMe, Ancestry, MyHeritage, VCF)',
      'Basic Punnett squares',
      'Community support',
    ],
    cta: 'Get Started Free',
    ctaVariant: 'outline',
    ctaHref: '/analysis',
    barGradient: 'bg-linear-to-r from-text-dark-muted to-[#64748b]',
    cardClass: '',
  },
  {
    name: 'Premium',
    price: '$14.99',
    priceNote: 'one-time',
    description: 'Comprehensive screening for families',
    features: [
      '500+ disease screening',
      `All ${TRAIT_COUNT_DISPLAY} trait predictions`,
      'All file formats supported',
      'Pharmacogenomics (5 genes)',
      'Polygenic risk scores (3 conditions)',
      'Priority email support',
    ],
    featuresExtended: [
      '500+ disease screening',
      `All ${TRAIT_COUNT_DISPLAY} trait predictions`,
      'All file formats (23andMe, Ancestry, MyHeritage, VCF)',
      'Pharmacogenomics (5 genes)',
      'Polygenic risk scores (3 conditions)',
      'Detailed Punnett squares with confidence',
      'Priority email support',
    ],
    cta: 'Get Premium',
    ctaVariant: 'violet',
    ctaHref: '/register',
    popular: true,
    barGradient: 'bg-linear-to-r from-accent-violet to-[#a78bfa]',
    cardClass:
      'border-[rgba(139,92,246,0.4)] shadow-[0_4px_30px_var(--shadow-ambient),0_0_50px_var(--glow-violet)]',
  },
  {
    name: 'Pro',
    price: '$34.99',
    priceNote: 'one-time',
    description: 'Advanced insights with automated referral letters',
    features: [
      `All ${CARRIER_PANEL_COUNT_DISPLAY} disease screening`,
      'Everything in Premium',
      'Ethnicity-adjusted frequencies',
      'Automated referral letters',
      'ClinVar data integration',
      'Exportable PDF reports',
      'Dedicated support',
    ],
    featuresExtended: [
      `All ${CARRIER_PANEL_COUNT_DISPLAY} disease screening`,
      'Everything in Premium',
      'Ethnicity-adjusted carrier frequencies',
      'Automated referral letter system',
      'ClinVar database integration',
      'Exportable PDF reports',
      'Multi-analysis comparison',
      'Dedicated priority support',
    ],
    cta: 'Get Pro',
    ctaVariant: 'primary',
    ctaHref: '/register',
    barGradient: 'bg-linear-to-r from-accent-teal to-accent-cyan',
    cardClass: '',
  },
];
