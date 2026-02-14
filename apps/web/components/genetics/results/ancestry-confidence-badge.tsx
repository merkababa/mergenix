import { memo } from "react";

interface AncestryConfidenceBadgeProps {
  ancestry: string;
  confidenceLevel: "high" | "medium" | "low";
  ancestryNote?: string;
}

const BADGE_STYLES: Record<
  "high" | "medium" | "low",
  { bg: string; text: string; border: string; label: string }
> = {
  high: {
    bg: "rgba(6, 214, 160, 0.08)",
    text: "var(--accent-teal)",
    border: "rgba(6, 214, 160, 0.2)",
    label: "High Confidence",
  },
  medium: {
    bg: "rgba(245, 158, 11, 0.08)",
    text: "var(--accent-amber)",
    border: "rgba(245, 158, 11, 0.2)",
    label: "Medium Confidence",
  },
  low: {
    bg: "rgba(244, 63, 94, 0.08)",
    text: "var(--accent-rose)",
    border: "rgba(244, 63, 94, 0.2)",
    label: "Low Confidence",
  },
};

export const AncestryConfidenceBadge = memo(function AncestryConfidenceBadge({
  ancestry,
  confidenceLevel,
  ancestryNote,
}: AncestryConfidenceBadgeProps) {
  const style = BADGE_STYLES[confidenceLevel];

  return (
    <div
      role="status"
      aria-label={`${style.label} for ${ancestry} ancestry`}
      className="inline-flex flex-col gap-1"
    >
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
        style={{
          backgroundColor: style.bg,
          color: style.text,
          border: `1px solid ${style.border}`,
        }}
      >
        {style.label}
      </span>
      {confidenceLevel === "low" && (
        <p className="text-[10px] leading-relaxed text-[var(--text-dim)]">
          {ancestry === "Unknown"
            ? "Most PRS studies are based on European populations. Ancestry could not be determined — accuracy may vary."
            : `Most PRS studies are based on European populations. Accuracy may be reduced for ${ancestry} ancestry.`}
        </p>
      )}
      {ancestryNote && confidenceLevel !== "low" && (
        <p className="text-[10px] leading-relaxed text-[var(--text-dim)]">
          {ancestryNote}
        </p>
      )}
    </div>
  );
});
