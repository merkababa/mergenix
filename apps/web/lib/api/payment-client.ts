/**
 * Payment API client — wraps all FastAPI /payments/* endpoints.
 *
 * Each function maps 1:1 to a backend endpoint. The backend uses
 * snake_case in JSON; we convert to camelCase for the frontend.
 *
 * All functions throw ApiError on failure. The caller (payment store)
 * is responsible for catching and surfacing errors to the UI.
 */

import { get, post } from "./client";
import type { Tier } from "@mergenix/shared-types";

// ── API Response Types (snake_case from backend) ────────────────────────

/** Raw checkout response from POST /payments/checkout */
interface RawCheckoutResponse {
  checkout_url: string;
  session_id: string;
}

/** Raw payment history item from GET /payments/history */
interface RawPaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  tier_granted: string;
  created_at: string;
}

/** Raw subscription status from GET /payments/subscription */
interface RawSubscriptionStatus {
  tier: string;
  is_active: boolean;
  payments_count: number;
}

// ── Frontend Types (camelCase) ──────────────────────────────────────────

export interface CheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface PaymentHistoryItem {
  id: string;
  /** Amount in smallest currency unit (cents). */
  amount: number;
  /** ISO 4217 currency code (e.g., "USD"). */
  currency: string;
  /** Payment status: pending, succeeded, failed, refunded. */
  status: string;
  /** Tier granted by this payment. */
  tierGranted: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface SubscriptionStatus {
  tier: Tier;
  isActive: boolean;
  paymentsCount: number;
}

// ── Transformers ────────────────────────────────────────────────────────

function toCheckoutResponse(raw: RawCheckoutResponse): CheckoutResponse {
  return {
    checkoutUrl: raw.checkout_url,
    sessionId: raw.session_id,
  };
}

function toPaymentHistoryItem(raw: RawPaymentHistoryItem): PaymentHistoryItem {
  return {
    id: raw.id,
    amount: raw.amount,
    currency: raw.currency,
    status: raw.status,
    tierGranted: raw.tier_granted,
    createdAt: raw.created_at,
  };
}

function toSubscriptionStatus(raw: RawSubscriptionStatus): SubscriptionStatus {
  return {
    tier: raw.tier as Tier,
    isActive: raw.is_active,
    paymentsCount: raw.payments_count,
  };
}

// ── Payment API Functions ───────────────────────────────────────────────

/**
 * Create a Stripe checkout session for a tier upgrade.
 *
 * Returns the checkout URL to redirect the user to Stripe's hosted page,
 * plus the session ID for tracking.
 *
 * @throws ApiError with code "ALREADY_ON_TIER" if user is already on the requested tier.
 * @throws ApiError with code "DOWNGRADE_NOT_ALLOWED" if attempting a downgrade.
 * @throws ApiError with code "CHECKOUT_FAILED" for Stripe errors.
 */
export async function createCheckout(
  tier: "premium" | "pro",
): Promise<CheckoutResponse> {
  const raw = await post<RawCheckoutResponse>("/payments/checkout", { tier });
  return toCheckoutResponse(raw);
}

/**
 * Fetch the authenticated user's payment history, newest first.
 */
export async function getPaymentHistory(): Promise<PaymentHistoryItem[]> {
  const raw = await get<RawPaymentHistoryItem[]>("/payments/history");
  return raw.map(toPaymentHistoryItem);
}

/**
 * Fetch the authenticated user's current subscription/tier status.
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const raw = await get<RawSubscriptionStatus>("/payments/tier-status");
  return toSubscriptionStatus(raw);
}
