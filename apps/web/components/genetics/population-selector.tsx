"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { SelectFilter } from "@/components/ui/select-filter";
import { POPULATIONS } from "@mergenix/genetics-data";
import { useAnalysisStore } from "@/lib/stores/analysis-store";
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
 * from genetics-data. Available to all tiers.
 */
export function PopulationSelector() {
  const selectedPopulation = useAnalysisStore((s) => s.selectedPopulation);
  const setPopulation = useAnalysisStore((s) => s.setPopulation);

  return (
    <div className="relative">
      <SelectFilter
        options={options}
        value={selectedPopulation ?? ""}
        onChange={(val) => setPopulation((val || null) as Population | null)}
        ariaLabel="Select ancestral population"
      />
    </div>
  );
}
