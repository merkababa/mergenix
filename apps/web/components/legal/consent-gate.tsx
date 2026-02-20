"use client";

import type { ReactNode } from "react";
import { useLegalStore } from "@/lib/stores/legal-store";

// ── Types ─────────────────────────────────────────────────────────────────

export interface ConsentGateProps {
  /** The cookie category that must be consented to before children render. */
  category: "analytics" | "marketing";
  children: ReactNode;
  /**
   * Optional content to render when consent has NOT been granted.
   * Defaults to `null` for backward compatibility.
   *
   * Example:
   * ```tsx
   * <ConsentGate
   *   category="marketing"
   *   fallback={<p>Enable marketing cookies to see this content.</p>}
   * >
   *   <ThirdPartyWidget />
   * </ConsentGate>
   * ```
   */
  fallback?: ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────

/**
 * ConsentGate — renders children only when explicit consent is confirmed
 * for the specified cookie category.
 *
 * This prevents any tracking scripts from firing before explicit consent.
 * The gate reads from the Zustand legal store, which is hydrated from
 * localStorage on mount (SSR-safe).
 *
 * Usage:
 * ```tsx
 * <ConsentGate category="analytics">
 *   <AnalyticsScript />
 * </ConsentGate>
 *
 * // With fallback explanation:
 * <ConsentGate
 *   category="marketing"
 *   fallback={<p>Enable marketing cookies to see this content.</p>}
 * >
 *   <ThirdPartyWidget />
 * </ConsentGate>
 * ```
 */
export function ConsentGate({ category, children, fallback = null }: ConsentGateProps) {
  const analyticsEnabled = useLegalStore((s) => s.analyticsEnabled);
  const marketingEnabled = useLegalStore((s) => s.marketingEnabled);

  const isGranted =
    category === "analytics" ? analyticsEnabled : marketingEnabled;

  if (!isGranted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
