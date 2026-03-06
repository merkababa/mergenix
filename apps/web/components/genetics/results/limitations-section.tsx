"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { memo } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LimitationsSectionProps {
  /** List of limitation statements to display. */
  limitations: string[];
  /** Tab context name (e.g., "carrier", "prs", "pgx") for heading. */
  context?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const DEFAULT_GENETIC_LIMITATIONS = [
  "Cannot detect de novo (new) mutations not inherited from either parent.",
  "Does not account for gene-gene interactions (epistasis) that may modify risk.",
  "Environmental factors, lifestyle, and epigenetic modifications are not captured.",
  "Limited to variants present on the genotyping chip used — rare mutations may be missed.",
  "Cannot determine the phase (cis/trans) of compound heterozygous variants.",
  "Copy number variations (CNVs) and structural variants are not assessed.",
  "Results reflect population-level statistics and may not apply to every individual equally.",
];

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Collapsible "What This Cannot Tell You" section.
 *
 * Uses native `<details>/<summary>` elements for built-in accessibility
 * (keyboard navigation, screen reader support). Collapsed by default.
 */
export const LimitationsSection = memo(function LimitationsSection({
  limitations,
  context,
}: LimitationsSectionProps) {
  const items = limitations.length > 0 ? limitations : DEFAULT_GENETIC_LIMITATIONS;
  const heading = context
    ? `What ${context.charAt(0).toUpperCase() + context.slice(1)} Analysis Cannot Tell You`
    : "What This Analysis Cannot Tell You";

  return (
    <details
      data-testid={context ? `limitations-${context}` : 'limitations-section'}
      className="group rounded-xl border border-(--border-subtle) bg-(--bg-elevated)"
    >
      <summary className="flex min-h-[44px] cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-(--text-heading) transition-colors hover:text-(--accent-teal)">
        {heading}
        <span
          className="ml-2 text-(--text-muted) transition-transform group-open:rotate-180"
          aria-hidden="true"
        >
          &#9662;
        </span>
      </summary>
      <div className="border-t border-(--border-subtle) px-4 py-3">
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-xs leading-relaxed text-(--text-muted)"
            >
              <span className="mt-0.5 shrink-0 text-(--accent-amber)" aria-hidden="true">
                &bull;
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
});
