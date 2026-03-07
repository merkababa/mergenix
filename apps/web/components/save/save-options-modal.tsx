'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { FileDown, Lock, Shield, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useModalManager } from '@/hooks/use-modal-manager';
import { overlayVariants, modalVariants } from '@/lib/animations/modal-variants';

// ── Props ───────────────────────────────────────────────────────────────

interface SaveOptionsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Callback when user chooses to download a PDF report */
  onDownloadPDF: () => void;
  /** Current user tier */
  tier: 'free' | 'premium' | 'pro';
}

// ── Constants ───────────────────────────────────────────────────────────

const MODAL_ID = 'save-options-modal';

// ── Component ───────────────────────────────────────────────────────────

export function SaveOptionsModal({ isOpen, onClose, onDownloadPDF, tier }: SaveOptionsModalProps) {
  /** PDF export is a Pro-only feature per PRICING_TIERS in payments.ts */
  const canExportPDF = tier === 'pro';
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const headingId = useId();
  const descriptionId = useId();

  // ── Handlers ────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    onClose();
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  const handleDownloadPDF = useCallback(() => {
    onDownloadPDF();
  }, [onDownloadPDF]);

  // ── Effects ─────────────────────────────────────────────────────────

  // Save trigger element when opening for focus restoration
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Register with modal manager for aria-hidden coordination
  useEffect(() => {
    if (isOpen) {
      useModalManager.getState().openModal(MODAL_ID);
    } else {
      useModalManager.getState().closeModal(MODAL_ID);
    }
    return () => useModalManager.getState().closeModal(MODAL_ID);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Focus trap: cycle Tab/Shift+Tab within the modal
  useFocusTrap(modalRef, isOpen, true);

  // Focus first focusable element when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
      );
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        modalRef.current.focus();
      }
    }
  }, [isOpen]);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={handleBackdropClick}
          role="presentation"
        >
          <m.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mx-4 w-full max-w-lg"
          >
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={headingId}
              aria-describedby={descriptionId}
              tabIndex={-1}
              className="outline-hidden border-(--glass-border) bg-(--bg-glass) relative rounded-2xl border p-8 shadow-[0_8px_40px_var(--shadow-elevated)] [-webkit-backdrop-filter:blur(var(--glass-blur))] [backdrop-filter:blur(var(--glass-blur))]"
            >
              {/* ── Close button ────────────────────────────────────────── */}
              <button
                type="button"
                onClick={handleClose}
                className="text-(--text-muted) hover:text-(--text-primary) focus-visible:outline-(--accent-teal) absolute right-4 top-4 rounded-lg p-1.5 transition-colors hover:bg-[rgba(148,163,184,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>

              {/* ── Header ──────────────────────────────────────────────── */}
              <h2
                id={headingId}
                className="font-heading text-(--text-heading) mb-2 text-center text-xl font-bold"
              >
                Save Your Results
              </h2>

              <p id={descriptionId} className="text-(--text-muted) mb-6 text-center text-sm">
                Choose how you want to save your analysis results.
              </p>

              {/* ── Option Cards ────────────────────────────────────────── */}
              <div className="space-y-4">
                {/* Option 1: Download PDF */}
                <GlassCard
                  variant="subtle"
                  hover="none"
                  className="p-5"
                  data-testid="option-download-pdf"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(6,214,160,0.1)]">
                      <FileDown className="text-(--accent-teal) h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading text-(--text-heading) text-base font-semibold">
                        Download PDF Report
                      </h3>
                      <p className="text-(--text-muted) mt-1 text-sm">
                        Generate a PDF report you can save locally or print
                      </p>
                      {canExportPDF ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleDownloadPDF}
                          className="mt-3"
                        >
                          Download PDF
                        </Button>
                      ) : (
                        <div className="mt-3 flex items-center gap-2">
                          <Button variant="secondary" size="sm" disabled aria-disabled="true">
                            <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                            Pro Only
                          </Button>
                          <span className="text-(--text-dim) text-xs">
                            Upgrade to Pro to export PDF reports
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>

                {/* Option 2: Save Encrypted (STUBBED) */}
                <GlassCard
                  variant="subtle"
                  hover="none"
                  className="border-(--border-subtle) p-5"
                  data-testid="option-save-encrypted"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(139,92,246,0.1)]">
                      <Shield className="text-(--text-muted) h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading text-(--text-dim) text-base font-semibold">
                        Save to Secure Cloud
                      </h3>
                      <p className="text-(--text-dim) mt-1 text-sm">
                        End-to-end encrypted storage — access from any device
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        aria-disabled="true"
                        className="mt-3"
                      >
                        Coming Soon
                      </Button>
                      <p className="text-(--text-dim) mt-2 text-xs">
                        Encrypted cloud storage is being built. Check back soon!
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
