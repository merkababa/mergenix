"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { CURRENT_DATA_VERSION } from "@mergenix/genetics-engine";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StaleResultsBannerProps {
  /** The data version stored with the analysis result. */
  dataVersion?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Warning banner displayed when a saved analysis result was generated with
 * an older data version than the current engine. Users can dismiss it for
 * the session.
 *
 * Uses `role="alert"` for screen reader announcement. Styled as an
 * amber/warning banner consistent with the design system.
 */
export function StaleResultsBanner({ dataVersion }: StaleResultsBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Show banner when dataVersion is undefined (legacy results) or mismatched
  if (dataVersion === CURRENT_DATA_VERSION) {
    return null;
  }

  // No banner if dismissed for this session
  if (dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.06)] p-4"
    >
      <AlertTriangle
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--accent-amber)]"
        aria-hidden="true"
      />
      <div className="flex-1">
        <p className="text-sm font-medium leading-relaxed text-[var(--text-body)]">
          Results may not reflect the latest genetic data.{" "}
          {dataVersion ? (
            <>
              These results were generated with data version{" "}
              <strong>{dataVersion}</strong>, but the current version is{" "}
              <strong>{CURRENT_DATA_VERSION}</strong>.
            </>
          ) : (
            <>
              The data version could not be determined. The current version is{" "}
              <strong>{CURRENT_DATA_VERSION}</strong>.
            </>
          )}{" "}
          Consider re-running your analysis for the most up-to-date results.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="flex flex-shrink-0 items-center justify-center rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-[rgba(245,158,11,0.1)] hover:text-[var(--accent-amber)] min-h-[44px] min-w-[44px]"
        aria-label="Dismiss stale results warning"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
