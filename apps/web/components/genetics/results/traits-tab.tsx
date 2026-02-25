"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { useState, useMemo, memo, useCallback, useDeferredValue } from "react";
import { AlertCircle, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { MedicalDisclaimer } from "@/components/genetics/medical-disclaimer";
import { TierUpgradePrompt } from "@/components/genetics/tier-upgrade-prompt";
import { LimitationsSection } from "@/components/genetics/results/limitations-section";
import { useAnalysisStore } from "@/lib/stores/analysis-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { TRAIT_CATEGORIES } from "@mergenix/genetics-data";
import type { TraitResult } from "@mergenix/shared-types";

/** Categories containing health-related genetic information. */
const HEALTH_CATEGORIES = new Set([
  "Cancer Risk",
  "Neurological/Brain",
  "Pharmacogenomic",
  "Cardiovascular/Metabolic",
]);

/** Convert category name to a stable slug for DOM IDs. */
function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Map confidence level to Badge variant — hoisted to module scope to avoid per-call allocation. */
const CONFIDENCE_VARIANT_MAP = {
  high: "confidence-high",
  medium: "confidence-medium",
  low: "confidence-low",
} as const;

function confidenceVariant(confidence: TraitResult["confidence"]) {
  return CONFIDENCE_VARIANT_MAP[confidence];
}

const HEALTH_CONSENT_KEY = "mergenix_health_trait_consent";

/** One-time consent interstitial for health-related genetic results. */
function HealthConsentInterstitial({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="health-consent-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-lg rounded-xl border border-amber-500/30 bg-[var(--glass-bg)] p-6 shadow-2xl">
        <h2
          id="health-consent-title"
          className="font-heading text-lg font-bold text-amber-300"
        >
          Health-Related Genetic Results
        </h2>
        <div className="mt-3 space-y-3 text-sm text-[var(--text-body)]">
          <p>
            You are about to view genetic trait predictions related to health
            conditions including cancer risk, neurological conditions, and
            pharmacogenomics.
          </p>
          <p>
            These results are for <strong>educational purposes only</strong> and
            are <strong>NOT diagnostic</strong>. They should not replace clinical
            genetic testing or medical advice.
          </p>
          <p>
            Under GINA, health insurers and employers generally cannot use
            genetic information for coverage or employment decisions. However,
            GINA does not cover life, disability, or long-term care insurance.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDecline}
            className="min-h-[44px] rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-[var(--text-body)] transition-colors hover:bg-white/10"
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="min-h-[44px] rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
          >
            I Understand, Show Results
          </button>
        </div>
      </div>
    </div>
  );
}

/** Individual trait card — memoized to avoid re-renders when unrelated state changes. */
const TraitCard = memo(function TraitCard({
  trait,
  isHealthTrait,
}: {
  trait: TraitResult;
  isHealthTrait: boolean;
}) {
  return (
    <GlassCard variant="medium" hover="glow" className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-heading text-sm font-semibold text-[var(--text-heading)]">
            {trait.trait}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">
            {trait.gene} &middot; {trait.rsid}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={confidenceVariant(trait.confidence)}>
            {trait.confidence}
          </Badge>
          {trait.chipCoverage === false && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-400">
              Not on chip
            </span>
          )}
        </div>
      </div>

      {/* Show description and notes for health traits */}
      {isHealthTrait && trait.description && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {trait.description}
        </p>
      )}
      {isHealthTrait && trait.note && (
        <p className="mt-1 text-xs italic text-[var(--text-dim)]">
          {trait.note}
        </p>
      )}

      {/* Offspring probability bars */}
      <div className="mt-3 space-y-1.5">
        {Object.entries(trait.offspringProbabilities).map(
          ([phenotype, pct]) => (
            <div key={phenotype} className="flex items-center gap-2">
              <div className="w-20 truncate text-xs text-[var(--text-muted)]">
                {phenotype}
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${phenotype}: ${pct}%`}
                className="h-2 flex-1 rounded-full bg-[var(--glass-bg)]"
              >
                <div
                  className={`h-2 rounded-full ${isHealthTrait ? "bg-amber-500/60" : "bg-[var(--accent-teal)]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-medium text-[var(--text-body)]">
                {pct}%
              </span>
            </div>
          ),
        )}
      </div>

      {/* Show phenotype details for health traits */}
      {isHealthTrait && trait.phenotypeDetails && (
        <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
          {Object.entries(trait.phenotypeDetails).map(([key, detail]) => (
            <p key={key} className="text-[10px] text-[var(--text-dim)]">
              <span className="font-medium text-[var(--text-muted)]">{key}:</span>{" "}
              {detail.description}
            </p>
          ))}
        </div>
      )}
    </GlassCard>
  );
});

/** Health category warning banner shown when a health category accordion is expanded. */
function HealthCategoryBanner({ category }: { category: string }) {
  return (
    <div role="note" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="text-sm font-medium text-amber-300">
        {"\u26A0\uFE0F"} Health-Related Genetic Information
      </p>
      <p className="mt-1 text-xs text-amber-200/80">
        These results examine only one genetic variant per trait and are not diagnostic.
        They should not replace clinical genetic testing or medical advice.
        DTC genotyping arrays miss the vast majority of pathogenic variants.
        {category === "Cancer Risk" && " A normal result does NOT rule out cancer risk."}
        {category === "Pharmacogenomic" && " Do not change medication without consulting your doctor."}
      </p>
      <p className="mt-2 text-xs text-amber-200/60">
        We recommend consulting a certified genetic counselor for health-related results.
      </p>
    </div>
  );
}

export function TraitsTab() {
  const fullResults = useAnalysisStore((s) => s.fullResults);
  const user = useAuthStore((s) => s.user);
  const userTier = user?.tier ?? "free";

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  // Track which categories are expanded — first 3 open by default
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(TRAIT_CATEGORIES.slice(0, 3)),
  );

  // Health consent interstitial state
  const [healthConsentGiven, setHealthConsentGiven] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem(HEALTH_CONSENT_KEY) === "true",
  );
  const [pendingHealthCategory, setPendingHealthCategory] = useState<string | null>(null);

  const toggleCategory = useCallback((category: string) => {
    const isHealth = HEALTH_CATEGORIES.has(category);
    setExpandedCategories((prev) => {
      const isCurrentlyExpanded = prev.has(category);
      if (isCurrentlyExpanded) {
        // Always allow collapsing
        const next = new Set(prev);
        next.delete(category);
        return next;
      }
      if (isHealth && !healthConsentGiven) {
        // Defer expansion until consent given — show interstitial
        setPendingHealthCategory(category);
        return prev;
      }
      const next = new Set(prev);
      next.add(category);
      return next;
    });
  }, [healthConsentGiven]);

  const traits = fullResults?.traits ?? [];
  const metadata = fullResults?.metadata;

  const successful = useMemo(
    () => traits.filter((t) => t.status === "success"),
    [traits],
  );
  const missing = useMemo(
    () => traits.filter((t) => t.status === "missing"),
    [traits],
  );

  // Filter + group successful traits by category, following TRAIT_CATEGORIES order
  const groupedCategories = useMemo(() => {
    const lowerSearch = deferredSearch.toLowerCase();

    const filtered = successful.filter((t) => {
      const matchesSearch =
        !lowerSearch ||
        t.trait.toLowerCase().includes(lowerSearch) ||
        t.gene.toLowerCase().includes(lowerSearch) ||
        t.rsid.toLowerCase().includes(lowerSearch);

      const matchesConfidence =
        confidenceFilter === "all" || t.confidence === confidenceFilter;

      return matchesSearch && matchesConfidence;
    });

    // Build ordered category map following TRAIT_CATEGORIES order
    const categoryMap = new Map<string, TraitResult[]>();
    for (const cat of TRAIT_CATEGORIES) {
      categoryMap.set(cat, []);
    }
    // Uncategorised traits fall into an "Other" bucket
    categoryMap.set("Other", []);

    for (const trait of filtered) {
      const cat = trait.category ?? "Other";
      if (categoryMap.has(cat)) {
        categoryMap.get(cat)!.push(trait);
      } else {
        categoryMap.set(cat, [trait]);
      }
    }

    // Remove empty categories (especially when filtering)
    return Array.from(categoryMap.entries()).filter(
      ([, items]) => items.length > 0,
    );
  }, [successful, deferredSearch, confidenceFilter]);

  // Detected count per category across ALL successful traits (unaffected by filter),
  // used in accordion headers to show "X shown / Y detected".
  const detectedPerCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const trait of successful) {
      const cat = trait.category ?? "Other";
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return map;
  }, [successful]);

  const handleConsentAccept = useCallback(() => {
    localStorage.setItem(HEALTH_CONSENT_KEY, "true");
    setHealthConsentGiven(true);
    if (pendingHealthCategory) {
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        next.add(pendingHealthCategory);
        return next;
      });
      setPendingHealthCategory(null);
    }
  }, [pendingHealthCategory]);

  const handleConsentDecline = useCallback(() => {
    setPendingHealthCategory(null);
  }, []);

  if (!fullResults) return null;

  if (traits.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          No trait predictions available.
        </p>
      </div>
    );
  }

  const categoryCount = groupedCategories.length;
  const hasResults = groupedCategories.length > 0;

  return (
    <div data-privacy-mask="true" className="space-y-6">
      {pendingHealthCategory && (
        <HealthConsentInterstitial
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />
      )}
      {/* Free-tier banner — traits are included free */}
      {userTier === "free" && (
        <GlassCard
          variant="subtle"
          hover="none"
          className="flex items-center gap-3 border-[rgba(6,214,160,0.15)] bg-[rgba(6,214,160,0.04)] p-4"
        >
          <Sparkles
            className="h-5 w-5 flex-shrink-0 text-[var(--accent-teal)]"
            aria-hidden="true"
          />
          <p className="text-sm text-[var(--text-body)]">
            Traits are included free. Upgrade to Premium for health insights.
          </p>
        </GlassCard>
      )}

      <h3 className="font-heading text-lg font-bold text-[var(--text-heading)]">
        Trait Predictions
      </h3>

      {/* Tier upgrade prompts */}
      {metadata?.tier === "free" && (
        <TierUpgradePrompt
          message="Upgrade to Premium to unlock disease screening, pharmacogenomics, and polygenic risk scores."
          buttonText="Unlock Health Insights"
        />
      )}
      {metadata?.tier === "premium" && (
        <TierUpgradePrompt
          message="Upgrade to Pro for couple analysis, offspring predictions, and Virtual Baby."
          buttonText="Upgrade to Pro"
        />
      )}

      {/* Search & filter controls */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search traits..."
          className="min-h-[44px] min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-teal)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-teal)]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search traits"
        />
        <select
          className="min-h-[44px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--text-body)] focus:border-[var(--accent-teal)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-teal)]"
          value={confidenceFilter}
          onChange={(e) => setConfidenceFilter(e.target.value)}
          aria-label="Filter by confidence"
        >
          <option value="all">All confidence levels</option>
          <option value="high">High confidence</option>
          <option value="medium">Medium confidence</option>
          <option value="low">Low confidence</option>
        </select>
      </div>

      {/* Coverage summary banner */}
      <div aria-live="polite" className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-slate-300">
          Analyzing{" "}
          <span className="font-semibold text-white">{successful.length}</span>{" "}
          of <span className="font-semibold text-white">{traits.length}</span>{" "}
          traits across{" "}
          <span className="font-semibold text-white">{categoryCount}</span>{" "}
          {categoryCount === 1 ? "category" : "categories"}
        </p>
      </div>

      {/* Ancestry limitation banner */}
      <div aria-label="Ancestry limitation notice" className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-slate-400">
          Trait predictions are based primarily on studies of European-ancestry populations
          and may have reduced accuracy for other ancestries.
        </p>
      </div>

      {/* Category accordion sections */}
      {hasResults ? (
        <div className="space-y-3">
          {groupedCategories.map(([category, items]) => {
            const isExpanded = expandedCategories.has(category);
            const detectedCount = detectedPerCategory.get(category) ?? 0;
            const catSlug = slugify(category);
            const headerId = `header-${catSlug}`;
            const panelId = `panel-${catSlug}`;
            const isHealth = HEALTH_CATEGORIES.has(category);

            return (
              <div
                key={category}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
              >
                <button
                  id={headerId}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-[var(--text-dim)]"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-[var(--text-dim)]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="font-heading text-sm font-semibold text-[var(--text-heading)]">
                      {category}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--text-dim)]">
                    {items.length} shown
                    {items.length !== detectedCount &&
                      ` / ${detectedCount} detected`}
                  </span>
                </button>

                {/* Only render cards when expanded — avoids rendering all 236 traits at once */}
                {isExpanded && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headerId}
                    className="p-4 pt-0"
                  >
                    {isHealth && <HealthCategoryBanner category={category} />}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {items.map((trait) => (
                        <TraitCard key={trait.rsid} trait={trait} isHealthTrait={isHealth} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div aria-live="polite" className="rounded-lg border border-white/10 bg-white/5 py-10 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No traits match your search.
          </p>
        </div>
      )}

      {/* Missing data section */}
      {missing.length > 0 && (
        <GlassCard variant="subtle" hover="none" className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-dim)]" />
            <div>
              <p className="text-xs font-semibold text-[var(--text-body)]">
                Missing Data ({missing.length} trait
                {missing.length !== 1 ? "s" : ""})
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                The following traits could not be predicted because one or both
                parents are missing genotype data at the required SNP.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missing.map((trait) => (
                  <Badge key={trait.rsid} variant="default">
                    {trait.trait}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Limitations section */}
      <LimitationsSection limitations={[]} context="trait" />

      {/* Trait prediction disclaimer */}
      <MedicalDisclaimer
        variant="compact"
        text="Trait predictions are based on simplified genetic models and may not account for gene-gene interactions, epigenetics, or environmental factors."
      />
    </div>
  );
}
