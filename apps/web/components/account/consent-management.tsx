"use client";

import { useState, useId, useRef, useEffect, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldOff,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useLegalStore } from "@/lib/stores/legal-store";

// ── Component ───────────────────────────────────────────────────────────

export function ConsentManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const dialogHeadingId = useId();
  const dialogDescriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Return focus to trigger button when dialog closes
  const closeDialog = useCallback(() => {
    setShowDialog(false);
    // Use requestAnimationFrame to ensure the dialog is unmounted before focusing
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, []);

  // Focus trap: when dialog opens, focus first interactive element and trap Tab/Shift+Tab
  useEffect(() => {
    if (!showDialog) return;

    const dialogEl = dialogRef.current;
    if (!dialogEl) return;

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = dialogEl.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusableElements[0];

    // Focus the first interactive element (Cancel button)
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeDialog();
        return;
      }

      if (e.key !== 'Tab') return;

      const currentFocusables = dialogEl!.querySelectorAll<HTMLElement>(focusableSelector);
      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDialog, closeDialog]);

  // Body scroll lock when dialog is open
  useEffect(() => {
    if (showDialog) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [showDialog]);

  const geneticDataConsentGiven = useLegalStore(
    (state) => state.geneticDataConsentGiven,
  );
  const consentWithdrawn = useLegalStore((state) => state.consentWithdrawn);
  const withdrawGeneticConsent = useLegalStore(
    (state) => state.withdrawGeneticConsent,
  );
  const reGrantGeneticConsent = useLegalStore(
    (state) => state.reGrantGeneticConsent,
  );

  const isActive = geneticDataConsentGiven && !consentWithdrawn;

  const handleWithdrawClick = () => {
    setShowDialog(true);
  };

  const handleConfirmWithdrawal = () => {
    withdrawGeneticConsent();
    closeDialog();
  };

  const handleCancel = () => {
    closeDialog();
  };

  const handleReConsent = () => {
    reGrantGeneticConsent();
  };

  return (
    <>
      <GlassCard variant="subtle" hover="none" className="p-7">
        <div className="flex items-center gap-3 mb-4">
          <Shield
            className="h-5 w-5 text-[var(--accent-teal)]"
            aria-hidden="true"
          />
          <h2 className="font-heading text-lg font-bold text-[var(--text-heading)]">
            Consent Management
          </h2>
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">
              Genetic Data Processing Consent:
            </span>
            {isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(6,214,160,0.1)] px-3 py-1 text-xs font-semibold text-[var(--accent-teal)]">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(244,63,94,0.1)] px-3 py-1 text-xs font-semibold text-[var(--accent-rose)]">
                <ShieldOff className="h-3 w-3" aria-hidden="true" />
                Withdrawn
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {isActive
              ? "You have granted consent for genetic data processing. You may withdraw this consent at any time."
              : "Your genetic data processing consent is no longer active. You may re-consent at any time to use genetic analysis features."}
          </p>
        </div>

        {isActive ? (
          <Button
            ref={triggerRef}
            variant="destructive"
            size="md"
            onClick={handleWithdrawClick}
            aria-label="Withdraw consent"
          >
            <ShieldOff className="h-4 w-4" aria-hidden="true" />
            Withdraw Consent
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={handleReConsent}
            aria-label="Re-consent to genetic data processing"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Re-consent
          </Button>
        )}
      </GlassCard>

      {/* ── Confirmation Dialog ────────────────────────────────────────── */}
      <AnimatePresence>
        {showDialog && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md"
            role="presentation"
          >
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md mx-4"
            >
              <div
                ref={dialogRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={dialogHeadingId}
                aria-describedby={dialogDescriptionId}
                className="relative outline-none rounded-2xl border border-[rgba(244,63,94,0.2)] bg-[var(--bg-glass)] p-8 shadow-[0_8px_40px_var(--shadow-elevated)] [backdrop-filter:blur(var(--glass-blur))] [-webkit-backdrop-filter:blur(var(--glass-blur))]"
              >
                {/* ── Warning icon ──────────────────────────────────── */}
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(244,63,94,0.1)]">
                  <AlertTriangle
                    className="h-8 w-8 text-[var(--accent-rose)]"
                    aria-hidden="true"
                  />
                </div>

                {/* ── Heading ───────────────────────────────────────── */}
                <h2
                  id={dialogHeadingId}
                  className="mb-2 text-center font-heading text-xl font-bold text-[var(--text-heading)]"
                >
                  Withdraw Genetic Data Consent
                </h2>

                {/* ── Consequences ──────────────────────────────────── */}
                <div
                  id={dialogDescriptionId}
                  className="mb-5 rounded-xl border border-[rgba(244,63,94,0.15)] bg-[rgba(244,63,94,0.04)] p-4 text-sm text-[var(--text-muted)]"
                >
                  <p className="mb-2">
                    By withdrawing consent, the following will happen:
                  </p>
                  <ul className="list-inside list-disc space-y-1 ml-1">
                    <li>Your locally saved analysis results will be cleared</li>
                    <li>Your genetic data consent will be revoked</li>
                    <li>
                      You will not be able to use genetic analysis features
                      until you re-consent
                    </li>
                    <li>
                      You will need to re-upload and re-analyze your genetic
                      data after re-consenting
                    </li>
                  </ul>
                </div>

                {/* ── Action buttons ────────────────────────────────── */}
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="flex-1"
                    onClick={handleCancel}
                    aria-label="Cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="flex-1"
                    onClick={handleConfirmWithdrawal}
                    aria-label="Confirm withdrawal"
                  >
                    Confirm Withdrawal
                  </Button>
                </div>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
