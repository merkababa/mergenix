"use client";

import { create } from "zustand";
import * as paymentClient from "@/lib/api/payment-client";
import type {
  CheckoutResponse,
  PaymentHistoryItem,
  SubscriptionStatus,
} from "@/lib/api/payment-client";
import { extractErrorMessage } from "@/lib/utils/extract-error";

// ── Payment Store State & Actions ───────────────────────────────────────

interface PaymentState {
  /** User's payment history, newest first. null = not yet fetched. */
  paymentHistory: PaymentHistoryItem[] | null;
  /** Current subscription/tier status. null = not yet fetched. */
  subscriptionStatus: SubscriptionStatus | null;
  /** True during any async payment operation. */
  isLoading: boolean;
  /** True during checkout creation (separate from general loading). */
  isCheckoutLoading: boolean;
  /** Current error message, null when no error. */
  error: string | null;

  // ── Actions ─────────────────────────────────────────────────────────

  /**
   * Create a Stripe checkout session and redirect to the checkout URL.
   * Returns the checkout response for the caller to handle the redirect.
   */
  createCheckout: (tier: "premium" | "pro") => Promise<CheckoutResponse>;
  /** Fetch the user's payment history. */
  fetchPaymentHistory: () => Promise<void>;
  /** Fetch the user's subscription/tier status. */
  fetchSubscriptionStatus: () => Promise<void>;
  /** Clear the current error. */
  clearError: () => void;
  /** Reset the store to initial state (e.g., on logout). */
  reset: () => void;
}

const INITIAL_STATE = {
  paymentHistory: null,
  subscriptionStatus: null,
  isLoading: false,
  isCheckoutLoading: false,
  error: null,
} as const;

export const usePaymentStore = create<PaymentState>()((set) => ({
  ...INITIAL_STATE,

  createCheckout: async (tier) => {
    set({ isCheckoutLoading: true, error: null });
    try {
      const response = await paymentClient.createCheckout(tier);
      set({ isCheckoutLoading: false });
      return response;
    } catch (error) {
      const message = extractErrorMessage(error, "Checkout failed");
      set({ isCheckoutLoading: false, error: message });
      throw error;
    }
  },

  fetchPaymentHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const history = await paymentClient.getPaymentHistory();
      set({ paymentHistory: history, isLoading: false });
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to load payment history");
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  fetchSubscriptionStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await paymentClient.getSubscriptionStatus();
      set({ subscriptionStatus: status, isLoading: false });
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to load subscription status");
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set(INITIAL_STATE),
}));
