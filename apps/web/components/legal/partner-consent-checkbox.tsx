"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { useLegalStore } from "@/lib/stores/legal-store";
import { PARTNER_CONSENT_LABEL } from "@/lib/constants/legal-placeholders";

// ── Component ────────────────────────────────────────────────────────────

const EXPLANATION_TEXT =
  "Genetic data is sensitive personal information. Analyzing someone else's DNA without their knowledge or consent may violate privacy laws including GINA and GDPR.";

interface PartnerConsentCheckboxProps {
  /** Called when files change — resets consent to unchecked */
  filesChanged?: unknown;
}

export function PartnerConsentCheckbox({
  filesChanged,
}: PartnerConsentCheckboxProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const partnerConsentGiven = useLegalStore((s) => s.partnerConsentGiven);
  const setPartnerConsent = useLegalStore((s) => s.setPartnerConsent);
  const resetPartnerConsent = useLegalStore((s) => s.resetPartnerConsent);

  // Reset consent when files change
  useEffect(() => {
    resetPartnerConsent();
  }, [filesChanged, resetPartnerConsent]);

  // Reset consent on unmount
  useEffect(() => {
    return () => {
      resetPartnerConsent();
    };
  }, [resetPartnerConsent]);

  const handleChange = useCallback(() => {
    setPartnerConsent(!partnerConsentGiven);
  }, [partnerConsentGiven, setPartnerConsent]);

  const handleInfoMouseEnter = useCallback(() => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }
    setShowTooltip(true);
  }, []);

  const handleInfoMouseLeave = useCallback(() => {
    tooltipTimerRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 200);
  }, []);

  const handleInfoClick = useCallback(() => {
    setShowTooltip((prev) => !prev);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="rounded-xl border-2 border-(--accent-amber,#f59e0b) bg-[rgba(245,158,11,0.05)] p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="partner-consent-checkbox"
          checked={partnerConsentGiven}
          onChange={handleChange}
          className="mt-1 h-4 w-4 shrink-0 rounded-sm border-(--border-subtle) bg-(--bg-elevated) accent-(--accent-teal)"
          aria-describedby="partner-consent-explanation"
        />
        <div className="flex-1">
          <label
            htmlFor="partner-consent-checkbox"
            className="cursor-pointer text-sm font-medium text-(--text-body)"
          >
            {PARTNER_CONSENT_LABEL}
          </label>

          {/* Info icon with tooltip */}
          <div className="mt-2 relative inline-block">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors"
              onMouseEnter={handleInfoMouseEnter}
              onMouseLeave={handleInfoMouseLeave}
              onClick={handleInfoClick}
              aria-label="Why is partner consent required?"
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Why is this required?</span>
            </button>

            {showTooltip && (
              <div
                role="tooltip"
                id="partner-consent-explanation"
                className="absolute left-0 top-full z-10 mt-1 w-72 rounded-lg border border-(--border-subtle) bg-(--bg-elevated) p-3 text-xs text-(--text-body) shadow-lg"
              >
                {EXPLANATION_TEXT}
              </div>
            )}
          </div>

          {/* Always-accessible description for screen readers */}
          {!showTooltip && (
            <p id="partner-consent-explanation" className="sr-only">
              {EXPLANATION_TEXT}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
