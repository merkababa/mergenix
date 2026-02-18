"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { SelectFilter } from "@/components/ui/select-filter";
import { POPULATIONS } from "@mergenix/genetics-data";
import { useAnalysisStore } from "@/lib/stores/analysis-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Population } from "@mergenix/shared-types";

const options = [
  { value: "", label: "Select population (optional)" },
  ...POPULATIONS.map((pop: string) => ({
    value: pop,
    label: pop,
  })),
];

/**
 * Population ancestry selector for ethnicity-adjusted analysis.
 * Wraps the design-system SelectFilter with the POPULATIONS list
 * from genetics-data. Disabled for free-tier users.
 */
export function PopulationSelector() {
  const selectedPopulation = useAnalysisStore((s) => s.selectedPopulation);
  const setPopulation = useAnalysisStore((s) => s.setPopulation);
  const user = useAuthStore((s) => s.user);
  const tier = user?.tier ?? "free";
  const isDisabled = tier === "free";

  return (
    <div className={`relative${isDisabled ? " opacity-50 cursor-not-allowed" : ""}`}>
      <SelectFilter
        options={options}
        value={selectedPopulation ?? ""}
        onChange={(val) => setPopulation((val || null) as Population | null)}
        ariaLabel="Select ancestral population"
        disabled={isDisabled}
      />
      {isDisabled && (
        <p className="mt-1.5 text-xs text-[var(--text-dim)]">
          Population-adjusted analysis available on Premium and Pro tiers.
        </p>
      )}
    </div>
  );
}
