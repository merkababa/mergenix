"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SelectFilter } from "@/components/ui/select-filter";
import { PunnettSquare } from "@/components/genetics/punnett-square";
import { TierUpgradePrompt } from "@/components/genetics/tier-upgrade-prompt";
import { useAnalysisStore } from "@/lib/stores/analysis-store";
import { INHERITANCE_BADGE_MAP, RISK_LABELS } from "@/lib/genetics-constants";
import type {
  CarrierResult,
  CarrierStatus,
  XLinkedOffspringRisk,
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
];

const SORT_OPTIONS = [
  { value: "severity", label: "Sort by Severity" },
  { value: "name", label: "Sort by Name" },
  { value: "risk", label: "Sort by Risk %" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function isXLinkedRisk(
  risk: CarrierResult["offspringRisk"],
): risk is XLinkedOffspringRisk {
  return "sons" in risk && "daughters" in risk;
}

function bothParentsCarriers(result: CarrierResult): boolean {
  return (
    (result.parentAStatus === "carrier" || result.parentAStatus === "affected") &&
    (result.parentBStatus === "carrier" || result.parentBStatus === "affected")
  );
}

function statusToAlleles(status: CarrierStatus): [string, string] {
  switch (status) {
    case "affected":
      return ["p", "p"];
    case "carrier":
      return ["N", "p"];
    default:
      return ["N", "N"];
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CarrierTab() {
  const fullResults = useAnalysisStore((s) => s.fullResults);

  // Local filter / sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [inheritanceFilter, setInheritanceFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "name" | "risk">("severity");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  if (!fullResults) return null;

  const totalCount = fullResults.carrier.length;
  const tier = fullResults.metadata.tier;

  return (
    <div className="space-y-6">
      {/* Header */}
      <h3 className="font-heading text-xl font-bold text-[var(--text-heading)]">
        Carrier Screening Results
      </h3>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
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
      <p className="text-sm text-[var(--text-muted)]">
        Showing{" "}
        <span className="font-semibold text-[var(--text-body)]">
          {filteredResults.length}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-[var(--text-body)]">
          {totalCount}
        </span>{" "}
        results
      </p>

      {/* Tier upgrade prompt for free/premium users */}
      {tier === "free" && (
        <TierUpgradePrompt
          message={`Showing ${filteredResults.length} of 2,715 diseases. Upgrade to unlock the complete carrier panel.`}
          buttonText="Unlock Full Screening"
        />
      )}
      {tier === "premium" && (
        <TierUpgradePrompt
          message={`You're screening ${filteredResults.length} diseases on Premium. Upgrade to Pro to unlock all 2,715 diseases including rare genetic conditions.`}
          buttonText="Upgrade to Pro"
        />
      )}

      {/* Result cards */}
      {filteredResults.length === 0 ? (
        <GlassCard variant="subtle" hover="none" className="p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No results match your filters.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filteredResults.map((result) => {
            const isExpanded = expandedId === result.rsid;
            const xLinked = isXLinkedRisk(result.offspringRisk);

            return (
              <GlassCard
                key={result.rsid}
                variant="medium"
                hover="none"
                className="p-5"
              >
                {/* Top row: condition + badges + offspring risk */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h4 className="font-heading text-base font-bold text-[var(--text-heading)]">
                      {result.condition}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={result.severity}>{result.severity}</Badge>
                      <Badge
                        variant={
                          INHERITANCE_BADGE_MAP[result.inheritance] as
                            | "autosomal-recessive"
                            | "autosomal-dominant"
                            | "x-linked"
                        }
                      >
                        {result.inheritance.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="default">
                        {RISK_LABELS[result.riskLevel] ?? result.riskLevel}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    {xLinked ? (
                      <div>
                        <p className="text-xs font-medium text-[var(--text-muted)]">
                          <span className="font-mono font-semibold text-[#f43f5e]">
                            {(result.offspringRisk as XLinkedOffspringRisk).sons.affected}%
                          </span>{" "}
                          sons
                        </p>
                        <p className="text-xs font-medium text-[var(--text-muted)]">
                          <span className="font-mono font-semibold text-[#06d6a0]">
                            {(result.offspringRisk as XLinkedOffspringRisk).daughters.affected}%
                          </span>{" "}
                          daughters
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
                          Affected Risk
                        </p>
                      </div>
                    ) : (
                      <>
                        <p
                          className={`font-heading text-2xl font-extrabold ${
                            result.offspringRisk.affected >= 25
                              ? "text-[#f43f5e]"
                              : result.offspringRisk.affected > 0
                                ? "text-[#f59e0b]"
                                : "text-[#06d6a0]"
                          }`}
                        >
                          {result.offspringRisk.affected}%
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
                          Offspring Risk
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Parent statuses */}
                <div className="mt-3 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-body)]">
                    <span className="font-medium">Parent A:</span>
                    <Badge
                      variant={
                        result.parentAStatus as "carrier" | "affected" | "normal"
                      }
                    >
                      {result.parentAStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-body)]">
                    <span className="font-medium">Parent B:</span>
                    <Badge
                      variant={
                        result.parentBStatus as "carrier" | "affected" | "normal"
                      }
                    >
                      {result.parentBStatus}
                    </Badge>
                  </div>
                </div>

                {/* Punnett square when both parents are carriers */}
                {bothParentsCarriers(result) && (
                  <div className="mt-4">
                    <PunnettSquare
                      parentAAlleles={statusToAlleles(result.parentAStatus)}
                      parentBAlleles={statusToAlleles(result.parentBStatus)}
                      riskType="carrier"
                    />
                  </div>
                )}

                {/* Expandable detail section */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : result.rsid)}
                  className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--accent-teal)] transition-colors hover:text-[var(--text-primary)]"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Hide" : "Show"} details for ${result.condition}`}
                  aria-controls={`carrier-details-${result.rsid}`}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Show Details
                    </>
                  )}
                </button>

                {isExpanded && (
                  <div
                    id={`carrier-details-${result.rsid}`}
                    className="mt-3 space-y-3 border-t border-[var(--border-subtle)] pt-3"
                  >
                    <div className="grid gap-2 text-sm text-[var(--text-body)] sm:grid-cols-2">
                      <div>
                        <span className="font-semibold text-[var(--text-heading)]">
                          Gene:{" "}
                        </span>
                        {result.gene}
                      </div>
                      <div>
                        <span className="font-semibold text-[var(--text-heading)]">
                          rsID:{" "}
                        </span>
                        <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-xs">
                          {result.rsid}
                        </code>
                      </div>
                    </div>

                    {result.description && (
                      <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                        {result.description}
                      </p>
                    )}

                    {/* Full risk breakdown */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)]">
                        Offspring Risk Breakdown
                      </p>

                      {xLinked ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {/* Sons */}
                          <GlassCard
                            variant="subtle"
                            hover="none"
                            className="p-3"
                          >
                            <p className="mb-2 text-xs font-semibold text-[var(--text-heading)]">
                              Sons
                            </p>
                            <div className="space-y-1 text-xs text-[var(--text-body)]">
                              <div className="flex justify-between">
                                <span>Affected</span>
                                <span className="font-mono font-semibold text-[#f43f5e]">
                                  {(result.offspringRisk as XLinkedOffspringRisk).sons.affected}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Carrier</span>
                                <span className="font-mono font-semibold text-[#f59e0b]">
                                  {(result.offspringRisk as XLinkedOffspringRisk).sons.carrier}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Unaffected</span>
                                <span className="font-mono font-semibold text-[#06d6a0]">
                                  {(result.offspringRisk as XLinkedOffspringRisk).sons.normal}%
                                </span>
                              </div>
                            </div>
                          </GlassCard>

                          {/* Daughters */}
                          <GlassCard
                            variant="subtle"
                            hover="none"
                            className="p-3"
                          >
                            <p className="mb-2 text-xs font-semibold text-[var(--text-heading)]">
                              Daughters
                            </p>
                            <div className="space-y-1 text-xs text-[var(--text-body)]">
                              <div className="flex justify-between">
                                <span>Affected</span>
                                <span className="font-mono font-semibold text-[#f43f5e]">
                                  {(result.offspringRisk as XLinkedOffspringRisk).daughters.affected}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Carrier</span>
                                <span className="font-mono font-semibold text-[#f59e0b]">
                                  {(result.offspringRisk as XLinkedOffspringRisk).daughters.carrier}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Unaffected</span>
                                <span className="font-mono font-semibold text-[#06d6a0]">
                                  {(result.offspringRisk as XLinkedOffspringRisk).daughters.normal}%
                                </span>
                              </div>
                            </div>
                          </GlassCard>
                        </div>
                      ) : (
                        <GlassCard
                          variant="subtle"
                          hover="none"
                          className="p-3"
                        >
                          <div className="space-y-1 text-xs text-[var(--text-body)]">
                            <div className="flex justify-between">
                              <span>Affected</span>
                              <span className="font-mono font-semibold text-[#f43f5e]">
                                {result.offspringRisk.affected}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Carrier</span>
                              <span className="font-mono font-semibold text-[#f59e0b]">
                                {result.offspringRisk.carrier}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Unaffected</span>
                              <span className="font-mono font-semibold text-[#06d6a0]">
                                {result.offspringRisk.normal}%
                              </span>
                            </div>
                          </div>
                        </GlassCard>
                      )}
                    </div>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
