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
  /** Payment amount in cents (e.g., 1499 = $14.99). */
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
 * Feature categories for tier gating.
 *
 * - 'health': Carrier screening, PRS, PGx — requires Premium or higher.
 * - 'couple': Couple analysis, Virtual Baby, offspring predictions — requires Pro.
 */
export type GatedFeature = 'health' | 'couple';

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
  /** Maximum number of diseases to analyze. 0 = no disease access, null = unlimited. */
  diseases: number | null;
  /** Maximum number of traits to analyze. 'all' = unlimited. */
  traits: number | 'all';
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
 * Prices (one-time, not subscription):
 * - Free: $0 — traits only
 * - Premium: $14.99 — individual health (carrier + PGx + PRS)
 * - Pro: $34.99 — couple/offspring + Virtual Baby + all Premium features
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
  /** Whether this tier grants access to health features (carrier, PRS, PGx). Premium+. */
  showHealth: boolean;
  /** Whether this tier grants access to couple features (couple analysis, Virtual Baby). Pro only. */
  showCouple: boolean;
}

/**
 * Complete pricing tier definitions.
 *
 * Free: traits-only (no disease/carrier access).
 * Premium ($14.99): individual health — carrier screening, PGx, PRS.
 * Pro ($34.99): everything in Premium + couple analysis, Virtual Baby, offspring predictions.
 */
export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Analyze all genetic traits',
      'Basic trait predictions',
      'Basic counseling recommendations',
    ],
    limits: {
      diseases: 0,
      traits: 'all',
      pgxGenes: 0,
      prsConditions: 0,
      counseling: 'basic',
      ethnicity: false,
    },
    showHealth: false,
    showCouple: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 14.99,
    features: [
      'Analyze 500+ genetic diseases',
      'Analyze all genetic traits',
      'Detailed carrier reports',
      'Disease prevalence data with OMIM links',
      'Advanced filtering and search',
      'Pharmacogenomics analysis (5 genes)',
      'Polygenic risk scores (3 conditions)',
      'Full counseling summary',
    ],
    limits: {
      diseases: 500,
      traits: 'all',
      pgxGenes: 5,
      prsConditions: 3,
      counseling: 'full',
      ethnicity: false,
    },
    showHealth: true,
    showCouple: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 34.99,
    features: [
      'Analyze all 2700+ genetic diseases',
      'Analyze all genetic traits',
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
      'Couple analysis & offspring predictions',
      'Virtual Baby feature',
    ],
    limits: {
      diseases: CARRIER_PANEL_COUNT,
      traits: 'all',
      pgxGenes: 12,
      prsConditions: 10,
      counseling: 'full_plus_letter',
      ethnicity: true,
    },
    showHealth: true,
    showCouple: true,
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

/**
 * Tier hierarchy for comparison. Higher number = more permissive.
 */
const TIER_RANK: Record<Tier, number> = {
  free: 0,
  premium: 1,
  pro: 2,
};

/**
 * Check whether a given tier has access to a gated feature category.
 *
 * - 'health' (carrier, PRS, PGx): requires 'premium' or higher.
 * - 'couple' (couple analysis, Virtual Baby): requires 'pro'.
 *
 * @param tier - The user's current tier.
 * @param feature - The feature category to check access for.
 * @returns `true` if the tier grants access to the feature.
 */
export function canAccessFeature(tier: Tier, feature: GatedFeature): boolean {
  const requiredTier: Tier = feature === 'health' ? 'premium' : 'pro';
  return TIER_RANK[tier] >= TIER_RANK[requiredTier];
}
