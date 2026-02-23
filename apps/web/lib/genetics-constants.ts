import type { InheritancePattern, RiskCategory, RiskLevel } from "@mergenix/shared-types";

/** Maximum genetic file size in bytes (200 MB). */
export const MAX_GENETIC_FILE_SIZE = 200 * 1024 * 1024;

/** Map inheritance type strings to Badge variant names. */
export const INHERITANCE_BADGE_MAP: Record<InheritancePattern, string> = {
  autosomal_recessive: "autosomal-recessive",
  autosomal_dominant: "autosomal-dominant",
  "X-linked": "x-linked",
};

/** Map risk level strings to readable labels. */
export const RISK_LABELS: Record<RiskLevel, string> = {
  high_risk: "High Risk",
  carrier_detected: "Carrier Detected",
  low_risk: "Low Risk",
  unknown: "Unknown",
  potential_risk: "Potential Risk",
  coverage_insufficient: "Insufficient Coverage",
  not_tested: "Not Tested",
};

/** Map PRS risk category strings to readable labels. */
export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  low: "Low",
  below_average: "Below Average",
  average: "Average",
  above_average: "Above Average",
  elevated: "Elevated",
  high: "High",
};
