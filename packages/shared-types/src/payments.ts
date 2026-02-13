/**
 * Payment types shared between frontend and API.
 *
 * Mergenix uses a one-time purchase model (no recurring subscriptions).
 * Payment processing supports Stripe.
 * Mirrors tier_config.py pricing and feature definitions.
 */

import type { Tier } from './genetics';
import { CARRIER_PANEL_COUNT } from '@mergenix/genetics-data';

/**
 * Payment processing status.
 */
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

/**
 * Payment provider identifiers.
 */
// PayPal integration planned for future release
export type PaymentProvider = 'stripe';

/**
 * Record of a completed (or attempted) payment.
 */
export interface PaymentRecord {
  /** Unique payment identifier. */
  id: string;
  /** Payment amount in cents (e.g., 1290 = $12.90). */
  amountCents: number;
  /** ISO 4217 currency code (e.g., "USD"). */
  currency: string;
  /** Current payment status. */
  status: PaymentStatus;
  /** Tier granted upon successful payment. */
  tierGranted: 'premium' | 'pro';
  /** Payment provider used. */
  provider: PaymentProvider;
  /** Provider-specific transaction ID. */
  providerTransactionId: string;
  /** ISO 8601 timestamp of payment creation. */
  createdAt: string;
}

/**
 * Feature limits for a pricing tier.
 *
 * Mirrors TierConfig in tier_config.py with exact field mappings:
 * - disease_limit -> diseases
 * - trait_limit -> traits
 * - pgx_gene_limit -> pgxGenes
 * - prs_condition_limit -> prsConditions
 * - counseling_level -> counseling
 * - ethnicity_access -> ethnicity
 */
export interface TierLimits {
  /** Maximum number of diseases to analyze. null = unlimited. */
  diseases: number | null;
  /** Maximum number of traits to analyze. */
  traits: number;
  /** Number of pharmacogenomics genes accessible. 0 = no access. */
  pgxGenes: number;
  /** Number of PRS conditions accessible. 0 = no access. */
  prsConditions: number;
  /** Counseling feature level. */
  counseling: 'basic' | 'full' | 'full_plus_letter';
  /** Whether ethnicity-adjusted frequencies are available. */
  ethnicity: boolean;
}

/**
 * Pricing tier definition for display and logic.
 *
 * Mirrors the TIER_CONFIGS dict in tier_config.py.
 * Prices are from the actual tier_config.py values:
 * - Free: $0
 * - Premium: $12.90 (one-time)
 * - Pro: $29.90 (one-time)
 */
export interface PricingTier {
  /** Tier identifier. */
  id: Tier;
  /** Display name. */
  name: string;
  /** Price in dollars (0 for free). One-time purchase, not subscription. */
  price: number;
  /** Feature descriptions for marketing display. */
  features: string[];
  /** Quantitative tier limits for logic. */
  limits: TierLimits;
}

/**
 * Complete pricing tier definitions.
 *
 * Values sourced directly from Source/tier_config.py TIER_CONFIGS.
 */
export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Analyze top 25 genetic diseases',
      'Analyze top 10 genetic traits',
      'Basic carrier status report',
      'Disease prevalence data',
      'Basic counseling recommendations',
    ],
    limits: {
      diseases: 25,
      traits: 10,
      pgxGenes: 0,
      prsConditions: 0,
      counseling: 'basic',
      ethnicity: false,
    },
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 12.9,
    features: [
      'Analyze 500+ genetic diseases',
      'Analyze all 79 genetic traits',
      'Detailed carrier reports',
      'Disease prevalence data with OMIM links',
      'Advanced filtering and search',
      'Pharmacogenomics analysis (5 genes)',
      'Polygenic risk scores (3 conditions)',
      'Full counseling summary',
    ],
    limits: {
      diseases: 500,
      traits: 79,
      pgxGenes: 5,
      prsConditions: 3,
      counseling: 'full',
      ethnicity: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29.9,
    features: [
      'Analyze all 2700+ genetic diseases',
      'Analyze all 79 genetic traits',
      'Comprehensive carrier reports',
      'Disease prevalence data with OMIM links',
      'Advanced filtering and search',
      'PDF export',
      'All future disease updates included',
      'Priority support',
      'API access',
      'Ethnicity-adjusted carrier frequencies',
      'Pharmacogenomics analysis (all 12 genes)',
      'Polygenic risk scores (all 10 conditions)',
      'Full counseling summary with referral letter',
    ],
    limits: {
      diseases: CARRIER_PANEL_COUNT,
      traits: 79,
      pgxGenes: 12,
      prsConditions: 10,
      counseling: 'full_plus_letter',
      ethnicity: true,
    },
  },
];

/**
 * Look up a pricing tier by its ID.
 *
 * @param tier - The tier ID to look up.
 * @returns The matching PricingTier, or undefined if not found.
 */
export function getPricingTier(tier: Tier): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.id === tier);
}
