import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import { CYP2D6_ARRAY_LIMITATION } from "@/lib/constants/disclaimers";

interface CYP2D6WarningProps {
  gene: string;
  hasWarning: boolean;
  warningMessage?: string;
}

export const CYP2D6Warning = memo(function CYP2D6Warning({
  gene,
  hasWarning,
  warningMessage,
}: CYP2D6WarningProps) {
  if (!hasWarning) return null;

  const message = warningMessage || CYP2D6_ARRAY_LIMITATION;

  return (
    <div
      role="note"
      aria-label={`${gene} testing limitation`}
      className="flex items-start gap-2 rounded-lg border px-3 py-2"
      style={{
        backgroundColor: "rgba(245, 158, 11, 0.06)",
        borderColor: "rgba(245, 158, 11, 0.2)",
      }}
    >
      <AlertTriangle
        className="mt-0.5 h-4 w-4 flex-shrink-0"
        style={{ color: "var(--accent-amber)" }}
        aria-hidden="true"
      />
      <p className="text-[11px] leading-relaxed text-[var(--text-body)]">
        <span className="font-semibold">{gene}:</span> {message}
      </p>
    </div>
  );
});
