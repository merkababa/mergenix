"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  Crown,
  Sparkles,
  ChevronRight,
  CreditCard,
  Clock,
  Download,
  AlertCircle,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePaymentStore } from "@/lib/stores/payment-store";
import { PRICING_TIERS, getPricingTier } from "@mergenix/shared-types";
import type { Tier, PricingTier } from "@mergenix/shared-types";

/** Format cents to a dollar string, e.g. 1499 -> "14.99" */
function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Format an ISO date string to locale date */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

/** Skeleton placeholder for loading states */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-[rgba(148,163,184,0.1)]",
        className,
      )}
    />
  );
}

export default function SubscriptionPage() {
  const user = useAuthStore((s) => s.user);
  const {
    paymentHistory,
    subscriptionStatus,
    isLoading,
    isCheckoutLoading,
    error,
    createCheckout,
    fetchPaymentHistory,
    fetchSubscriptionStatus,
    clearError,
  } = usePaymentStore();

  // ── Fetch data on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetchPaymentHistory().catch(() => {
      // Error is handled in the store
    });
    fetchSubscriptionStatus().catch(() => {
      // Error is handled in the store
    });
  }, [fetchPaymentHistory, fetchSubscriptionStatus]);

  // ── Derived values ───────────────────────────────────────────────────

  const userTier: Tier = user?.tier ?? "free";

  const currentTierData = useMemo<PricingTier | undefined>(
    () => getPricingTier(userTier),
    [userTier],
  );

  const formattedPrice = useMemo<string>(() => {
    if (!currentTierData) return "$0.00";
    return `$${currentTierData.price.toFixed(2)}`;
  }, [currentTierData]);

  const upgradeOptions = useMemo<PricingTier[]>(() => {
    const tierOrder: Tier[] = ["free", "premium", "pro"];
    const currentIndex = tierOrder.indexOf(userTier);
    return PRICING_TIERS.filter((tier) => {
      const tierIndex = tierOrder.indexOf(tier.id);
      return tierIndex > currentIndex;
    });
  }, [userTier]);

  const isActive = subscriptionStatus?.isActive ?? userTier !== "free";

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleCheckout = useCallback(
    async (tier: "premium" | "pro") => {
      try {
        const response = await createCheckout(tier);
        window.location.href = response.checkoutUrl;
      } catch {
        // Error is surfaced via the store's error state
      }
    },
    [createCheckout],
  );

  // ── Loading state ────────────────────────────────────────────────────

  if (isLoading && !paymentHistory && !subscriptionStatus) {
    return (
      <>
        <div className="mb-8 text-center">
          <h1 className="gradient-text font-heading text-3xl font-extrabold md:text-4xl">
            Subscription
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[var(--text-muted)]">
            Manage your plan and view payment history
          </p>
        </div>

        <div
          className="mx-auto max-w-2xl space-y-6"
          aria-busy="true"
          role="status"
        >
          <span className="sr-only">Loading subscription information...</span>
          {/* Current plan skeleton */}
          <GlassCard variant="medium" hover="none" className="p-7">
            <Skeleton className="mb-4 h-6 w-32" />
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-9 w-40" />
                <Skeleton className="mt-2 h-4 w-56" />
              </div>
              <div className="text-right">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="mt-1 h-3 w-16" />
              </div>
            </div>
          </GlassCard>

          {/* Upgrade option skeleton */}
          <GlassCard variant="subtle" hover="none" className="p-7">
            <Skeleton className="mb-3 h-6 w-48" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-3/4" />
            <Skeleton className="mt-5 h-10 w-40" />
          </GlassCard>

          {/* Payment history skeleton */}
          <GlassCard variant="medium" hover="none" className="p-7">
            <Skeleton className="mb-5 h-6 w-40" />
            <Skeleton className="h-16 w-full" />
          </GlassCard>
        </div>
      </>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="gradient-text font-heading text-3xl font-extrabold md:text-4xl">
          Subscription
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[var(--text-muted)]">
          Manage your plan and view payment history
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* ── Error Banner ── */}
        {error && (
          <div
            className="flex items-center gap-3 rounded-xl border border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.08)] p-4 text-sm text-[#f43f5e]"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="flex-1">{error}</p>
            <button
              onClick={clearError}
              className="text-xs font-medium underline hover:no-underline"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Current Plan ── */}
        <GlassCard variant="medium" hover="none" className="glow-pulse p-7">
          <div className="mb-4 flex items-center gap-3">
            <Crown className="h-5 w-5 text-[#8b5cf6]" />
            <h2 className="font-heading text-lg font-bold text-[var(--text-heading)]">
              Current Plan
            </h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-heading text-3xl font-extrabold text-[var(--text-primary)]">
                  {currentTierData?.name ?? "Free"}
                </span>
                <Badge variant={userTier}>
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {userTier === "free"
                  ? "Free plan - No purchase required"
                  : "One-time purchase - Lifetime access"}
              </p>
            </div>
            <div className="text-right">
              <span className="font-heading text-2xl font-bold text-[var(--accent-teal)]">
                {formattedPrice}
              </span>
              <p className="text-xs text-[var(--text-dim)]">
                {userTier === "free" ? "free forever" : "paid once"}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="inline-flex rounded-xl bg-gradient-to-r from-[#06d6a0] to-[#06b6d4] px-5 py-2 font-heading text-xs font-bold uppercase tracking-wider text-[#050810] shadow-[0_4px_16px_rgba(6,214,160,0.3)]">
              Your Current Plan
            </div>
          </div>
        </GlassCard>

        {/* ── Upgrade Options ── */}
        {upgradeOptions.length > 0 ? (
          upgradeOptions.map((tier) => (
            <GlassCard
              key={tier.id}
              variant="subtle"
              hover="glow"
              className="p-7"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[var(--accent-teal)]" />
                    <h3 className="font-heading text-lg font-bold text-[var(--text-heading)]">
                      Upgrade to {tier.name}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {tier.id === "premium"
                      ? "Unlock 500+ diseases, 79 traits, pharmacogenomics, and full counseling."
                      : "Get ethnicity-adjusted frequencies, genetic counselor referrals, ClinVar integration, and PDF exports."}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {tier.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-xs text-[var(--text-body)]"
                      >
                        <Sparkles className="h-3 w-3 shrink-0 text-[var(--accent-teal)]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="ml-4 shrink-0 text-right">
                  <span className="font-heading text-2xl font-bold text-[var(--accent-teal)]">
                    ${tier.price.toFixed(2)}
                  </span>
                  <p className="text-xs text-[var(--text-dim)]">one-time</p>
                  {currentTierData && currentTierData.price > 0 && (
                    <p className="text-xs text-[var(--text-dim)]">
                      Pay ${(tier.price - currentTierData.price).toFixed(2)} to
                      upgrade
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <Button
                  variant={tier.id === "pro" ? "primary" : "violet"}
                  size="md"
                  disabled={isCheckoutLoading}
                  isLoading={isCheckoutLoading}
                  onClick={() =>
                    handleCheckout(tier.id as "premium" | "pro")
                  }
                  aria-label={`Upgrade to ${tier.name} for $${tier.price.toFixed(2)}`}
                >
                  Upgrade to {tier.name}
                  {!isCheckoutLoading && (
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </GlassCard>
          ))
        ) : (
          <GlassCard variant="subtle" hover="none" className="p-7">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-[var(--accent-teal)]" />
              <h3 className="font-heading text-lg font-bold text-[var(--text-heading)]">
                You have the best plan
              </h3>
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              You&apos;re on the Pro plan with full access to all features.
              Thank you for your support!
            </p>
          </GlassCard>
        )}

        {/* ── Payment History ── */}
        <GlassCard variant="medium" hover="none" className="p-7">
          <div className="mb-5 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-[var(--accent-teal)]" />
            <h2 className="font-heading text-lg font-bold text-[var(--text-heading)]">
              Payment History
            </h2>
          </div>

          <div
            className="space-y-3"
            aria-busy={isLoading && !paymentHistory}
          >
            {!paymentHistory ? (
              /* Still loading payment history */
              <div role="status">
                <span className="sr-only">Loading payment history...</span>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="mt-3 h-16 w-full" />
              </div>
            ) : paymentHistory.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center py-8 text-center">
                <Clock className="mb-3 h-8 w-8 text-[var(--text-dim)]" />
                <p className="font-heading text-sm font-medium text-[var(--text-muted)]">
                  No payments yet
                </p>
                <p className="mt-1 text-xs text-[var(--text-dim)]">
                  Your payment history will appear here after your first
                  purchase.
                </p>
              </div>
            ) : (
              /* Payment list */
              paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 shrink-0 text-[var(--text-dim)]" />
                    <div>
                      <p className="font-heading text-sm font-medium text-[var(--text-heading)]">
                        {payment.tierGranted.charAt(0).toUpperCase() +
                          payment.tierGranted.slice(1)}{" "}
                        Plan Purchase
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatDate(payment.createdAt)}{" "}
                        <span className="capitalize">
                          &middot; {payment.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-sm font-bold text-[var(--accent-teal)]">
                      ${formatAmount(payment.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Download receipt for ${payment.tierGranted} plan purchase`}
                      onClick={() => {
                        const receiptContent = [
                          "MERGENIX - PAYMENT RECEIPT",
                          "=".repeat(40),
                          "",
                          `Plan: ${payment.tierGranted.charAt(0).toUpperCase() + payment.tierGranted.slice(1)}`,
                          `Amount: $${formatAmount(payment.amount)} ${payment.currency.toUpperCase()}`,
                          `Date: ${formatDate(payment.createdAt)}`,
                          `Status: ${payment.status}`,
                          `Payment ID: ${payment.id}`,
                          "",
                          "=".repeat(40),
                          "Thank you for your purchase!",
                          "mergenix.com",
                        ].join("\n");

                        const blob = new Blob([receiptContent], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `mergenix-receipt-${payment.id}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* ── Comparison link ── */}
        <div className="text-center">
          <Link
            href="/products"
            className={cn(buttonVariants({ variant: "ghost", size: "md" }))}
          >
            Compare All Plans
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
