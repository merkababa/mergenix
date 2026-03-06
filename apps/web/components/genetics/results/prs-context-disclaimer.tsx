"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { memo } from "react";
import { Info } from "lucide-react";
import {
  PRS_CONTEXT_DISCLAIMER,
  PRS_OFFSPRING_DISCLAIMER,
} from "@/lib/constants/disclaimers";

interface PrsContextDisclaimerProps {
  conditionName: string;
  isOffspring?: boolean;
}

export const PrsContextDisclaimer = memo(function PrsContextDisclaimer({
  conditionName,
  isOffspring,
}: PrsContextDisclaimerProps) {
  return (
    <div
      role="note"
      aria-label={`Context disclaimer for ${conditionName}`}
      className="flex items-start gap-3 rounded-xl border px-4 py-3"
      style={{
        backgroundColor: "rgba(6, 182, 212, 0.06)",
        borderColor: "rgba(6, 182, 212, 0.2)",
      }}
    >
      <Info
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ color: "var(--accent-cyan)" }}
        aria-hidden="true"
      />
      <div className="space-y-1.5">
        <p className="text-xs leading-relaxed text-(--text-body)">
          {PRS_CONTEXT_DISCLAIMER}
        </p>
        {isOffspring && (
          <p className="text-xs leading-relaxed text-(--text-muted)">
            {PRS_OFFSPRING_DISCLAIMER}
          </p>
        )}
      </div>
    </div>
  );
});
