"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Virtuoso } from "react-virtuoso";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { SelectFilter } from "@/components/ui/select-filter";
import { TierUpgradePrompt } from "@/components/genetics/tier-upgrade-prompt";
import { SensitiveContentGuard } from "@/components/ui/sensitive-content-guard";
import { ClinicalTestingBanner } from "@/components/genetics/results/clinical-testing-banner";
import { LimitationsSection } from "@/components/genetics/results/limitations-section";
import { CarrierResultCard } from "@/components/genetics/results/carrier-result-card";
import { CARRIER_PANEL_COUNT_DISPLAY } from "@mergenix/genetics-data";
import { useAnalysisStore } from "@/lib/stores/analysis-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { canAccessFeature } from "@mergenix/shared-types";
import type {
  CarrierResult,
} from "@mergenix/shared-types";

// ─── Constants ──────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = { high: 0, moderate: 1, low: 2 };

const SEVERITY_OPTIONS = [
  { value: "", label: "All Severities" },
  { value: "high", label: "High" },
  { value: "moderate", label: "Moderate" },
  { value: "low", label: "Low" },
];

const INHERITANCE_OPTIONS = [
  { value: "", label: "All Inheritance" },
  { value: "autosomal_recessive", label: "Autosomal Recessive" },
  { value: "autosomal_dominant", label: "Autosomal Dominant" },
  { value: "X-linked", label: "X-Linked" },
];

const RISK_OPTIONS = [
  { value: "", label: "All Risk Levels" },
  { value: "high_risk", label: "High Risk" },
  { value: "carrier_detected", label: "Carrier Detected" },
  { value: "low_risk", label: "Low Risk" },
  { value: "potential_risk", label: "Potential Risk" },
  { value: "coverage_insufficient", label: "Insufficient Coverage" },
  { value: "not_tested", label: "Not Tested" },
];

const SORT_OPTIONS = [
  { value: "severity", label: "Sort by Severity" },
  { value: "name", label: "Sort by Name" },
  { value: "risk", label: "Sort by Risk %" },
];

/** Height threshold: use Virtuoso only when result count exceeds this. */
const VIRTUOSO_THRESHOLD = 20;

// ─── Virtuoso ARIA components ───────────────────────────────────────────────

const VirtuosoList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function VirtuosoList(props, ref) {
    return <div {...props} ref={ref} role="list" aria-label="Carrier screening results list" />;
  },
);

function VirtuosoItem(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} role="listitem" />;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CarrierTab() {
  const router = useRouter();
  const fullResults = useAnalysisStore((s) => s.fullResults);
  const user = useAuthStore((s) => s.user);
  const userTier = user?.tier ?? "free";
  const canShowOffspring = canAccessFeature(userTier, "couple");

  // Local filter / sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [inheritanceFilter, setInheritanceFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "name" | "risk">("severity");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Default to Research Mode (Raw Data) to mitigate regulatory risk
  const [isResearchMode, setIsResearchMode] = useState(true);

  // Check if any carrier result has autosomal dominant inheritance
  const hasAutosomalDominant = useMemo(
    () => fullResults?.carrier.some((r) => r.inheritance === "autosomal_dominant") ?? false,
    [fullResults],
  );

  // Filtered + sorted results
  const filteredResults = useMemo(() => {
    if (!fullResults) return [];

    let results = [...fullResults.carrier];

    // 1. Search filter (case-insensitive on condition + gene)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (r) =>
          r.condition.toLowerCase().includes(q) ||
          r.gene.toLowerCase().includes(q),
      );
    }

    // 2. Severity filter
    if (severityFilter) {
      results = results.filter((r) => r.severity === severityFilter);
    }

    // 3. Inheritance filter
    if (inheritanceFilter) {
      results = results.filter((r) => r.inheritance === inheritanceFilter);
    }

    // 4. Risk filter
    if (riskFilter) {
      results = results.filter((r) => r.riskLevel === riskFilter);
    }

    // 5. Sort
    results.sort((a, b) => {
      switch (sortBy) {
        case "severity":
          return (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
        case "name":
          return a.condition.localeCompare(b.condition);
        case "risk":
          return b.offspringRisk.affected - a.offspringRisk.affected;
        default:
          return 0;
      }
    });

    return results;
  }, [fullResults, searchQuery, severityFilter, inheritanceFilter, riskFilter, sortBy]);

  // Coverage metrics for per-disease coverage meters
  const coverageMetrics = fullResults?.coverageMetrics;

  const handleToggleExpand = useCallback((rsid: string) => {
    setExpandedId((prev) => (prev === rsid ? null : rsid));
  }, []);

  const totalItemsRef = useRef(filteredResults.length);
  useEffect(() => { totalItemsRef.current = filteredResults.length; }, [filteredResults.length]);

  const renderResultCard = useCallback(
    (index: number, result: CarrierResult) => {
      const coverage = coverageMetrics?.perDisease[result.condition];
      return (
        <CarrierResultCard
          result={result}
          index={index}
          totalItems={totalItemsRef.current}
          isExpanded={expandedId === result.rsid}
          onToggleExpand={handleToggleExpand}
          canShowOffspring={canShowOffspring}
          coveragePct={coverage?.coveragePct ?? 0}
          confidenceLevel={coverage?.confidenceLevel ?? "low"}
          hasCoverage={!!coverage}
          coverageVariantsTested={coverage?.variantsTested ?? 0}
          coverageVariantsTotal={coverage?.variantsTotal ?? 0}
          isResearchMode={isResearchMode}
        />
      );
    },
    [expandedId, canShowOffspring, coverageMetrics, handleToggleExpand, isResearchMode],
  );

  if (!fullResults) return null;

  const totalCount = fullResults.carrier.length;
  const tier = fullResults.metadata.tier;
  const useVirtualization = filteredResults.length > VIRTUOSO_THRESHOLD;

  return (
    <SensitiveContentGuard
      category="carrier"
      isAutosomalDominant={hasAutosomalDominant}
      tier={userTier}
      requiredTier="premium"
      onUpgrade={() => {
        router.push("/subscription");
      }}
    >
    <div data-privacy-mask="true" className="space-y-6">
      {/* Clinical testing banner — prominent warning at top (hidden in Research Mode) */}
      {!isResearchMode && <ClinicalTestingBanner variant="carrier" />}

      {/* Header and Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-heading text-xl font-bold text-(--text-heading)">
          {isResearchMode ? "Raw Genotype Browser" : "Carrier Screening Results"}
        </h3>
        <div
          role="radiogroup"
          aria-label="View mode"
          className="flex items-center gap-3 rounded-lg border border-(--border-subtle) bg-(--bg-elevated) p-2"
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(e.key)) {
              e.preventDefault();
              setIsResearchMode((prev) => !prev);
              const radiogroup = e.currentTarget;
              requestAnimationFrame(() => {
                const selected = radiogroup.querySelector('[aria-checked="true"]');
                (selected as HTMLElement)?.focus();
              });
            }
          }}
        >
          <span className="text-xs font-medium text-(--text-muted)">Mode:</span>
          <button
            type="button"
            role="radio"
            onClick={() => setIsResearchMode(true)}
            aria-checked={isResearchMode}
            tabIndex={isResearchMode ? 0 : -1}
            className={`flex min-h-[44px] items-center rounded px-3 py-1 text-xs font-semibold transition-colors ${
              isResearchMode
                ? "bg-(--accent-teal) text-white shadow-xs"
                : "text-(--text-body) hover:bg-(--bg-subtle)"
            }`}
          >
            Raw Data
          </button>
          <button
            type="button"
            role="radio"
            onClick={() => setIsResearchMode(false)}
            aria-checked={!isResearchMode}
            tabIndex={!isResearchMode ? 0 : -1}
            className={`flex min-h-[44px] items-center rounded px-3 py-1 text-xs font-semibold transition-colors ${
              !isResearchMode
                ? "bg-(--accent-teal) text-white shadow-xs"
                : "text-(--text-body) hover:bg-(--bg-subtle)"
            }`}
          >
            Clinical
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            aria-label="Search carrier results by condition or gene"
            placeholder="Search by condition or gene..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="w-[160px]">
          <SelectFilter
            options={SEVERITY_OPTIONS}
            value={severityFilter}
            onChange={setSeverityFilter}
            ariaLabel="Filter by severity"
            placeholder="All Severities"
          />
        </div>
        <div className="w-[180px]">
          <SelectFilter
            options={INHERITANCE_OPTIONS}
            value={inheritanceFilter}
            onChange={setInheritanceFilter}
            ariaLabel="Filter by inheritance pattern"
            placeholder="All Inheritance"
          />
        </div>
        <div className="w-[170px]">
          <SelectFilter
            options={RISK_OPTIONS}
            value={riskFilter}
            onChange={setRiskFilter}
            ariaLabel="Filter by risk level"
            placeholder="All Risk Levels"
          />
        </div>
        <div className="w-[160px]">
          <SelectFilter
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(v) => setSortBy(v as "severity" | "name" | "risk")}
            ariaLabel="Sort results"
            placeholder="Sort by Severity"
          />
        </div>
      </div>

      {/* Count display */}
      <p className="text-sm text-(--text-muted)">
        Showing{" "}
        <span className="font-semibold text-(--text-body)">
          {filteredResults.length}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-(--text-body)">
          {totalCount}
        </span>{" "}
        results
      </p>

      {/* Tier upgrade prompt for premium users upselling to pro */}
      {tier === "premium" && (
        <TierUpgradePrompt
          message={`You're screening ${filteredResults.length} diseases on Premium. Upgrade to Pro to unlock all ${CARRIER_PANEL_COUNT_DISPLAY} diseases including rare genetic conditions.`}
          buttonText="Upgrade to Pro"
        />
      )}

      {/* Result cards */}
      {filteredResults.length === 0 ? (
        <GlassCard variant="subtle" hover="none" className="p-8 text-center">
          <p className="text-sm text-(--text-muted)">
            No results match your filters.
          </p>
        </GlassCard>
      ) : useVirtualization ? (
        <Virtuoso
          useWindowScroll
          data={filteredResults}
          components={{
            List: VirtuosoList,
            Item: VirtuosoItem,
          }}
          itemContent={(index, result) =>
            renderResultCard(index, result)
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredResults.map((result, index) =>
            renderResultCard(index, result),
          )}
        </div>
      )}

      {/* Limitations section — collapsible at bottom */}
      {filteredResults.length > 0 && (
        <LimitationsSection limitations={[]} context="carrier" />
      )}
    </div>
    </SensitiveContentGuard>
  );
}
