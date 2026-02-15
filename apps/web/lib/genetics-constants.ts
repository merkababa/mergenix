import type { InheritancePattern } from "@mergenix/shared-types";

/** Map inheritance type strings to Badge variant names. */
export const INHERITANCE_BADGE_MAP: Record<InheritancePattern, string> = {
  autosomal_recessive: "autosomal-recessive",
  autosomal_dominant: "autosomal-dominant",
  "X-linked": "x-linked",
};

/** Map risk level strings to readable labels. */
export const RISK_LABELS: Record<string, string> = {
  high_risk: "High Risk",
  carrier_detected: "Carrier Detected",
  low_risk: "Low Risk",
  unknown: "Unknown",
  potential_risk: "Potential Risk",
  coverage_insufficient: "Insufficient Coverage",
  not_tested: "Not Tested",
};

/** Map PRS risk category strings to readable labels. */
export const RISK_CATEGORY_LABELS: Record<string, string> = {
  low: "Low",
  below_average: "Below Average",
  average: "Average",
  above_average: "Above Average",
  elevated: "Elevated",
  high: "High",
};
