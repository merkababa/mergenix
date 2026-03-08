'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLegalStore } from '@/lib/stores/legal-store';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useModalManager } from '@/hooks/use-modal-manager';
import { overlayVariants, modalVariants } from '@/lib/animations/modal-variants';
import {
  CONSENT_TEXT_GENETIC_PROCESSING,
  GENETIC_CONSENT_VERSION,
} from '@/lib/constants/legal-placeholders';

// ── Component ────────────────────────────────────────────────────────────

interface ConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentModal({ isOpen, onAccept, onDecline }: ConsentModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const setGeneticDataConsent = useLegalStore((s) => s.setGeneticDataConsent);
  const recordConsent = useLegalStore((s) => s.recordConsent);

  // Save trigger element when opening
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Register with modal manager for aria-hidden coordination
  useEffect(() => {
    if (isOpen) {
      useModalManager.getState().openModal('consent-modal');
    } else {
      useModalManager.getState().closeModal('consent-modal');
    }
    return () => useModalManager.getState().closeModal('consent-modal');
  }, [isOpen]);

  // Body scroll lock when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // ── Handlers (defined before effects that reference them) ──────────

  const handleAccept = useCallback(() => {
    setGeneticDataConsent(true);
    // Record consent server-side with versioned consent record (fire-and-forget)
    recordConsent('genetic_data_processing', GENETIC_CONSENT_VERSION).catch(() => {
      // Non-blocking: local consent state is already set above
    });
    onAccept();
    // Restore focus to the element that was focused before the modal opened
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [setGeneticDataConsent, recordConsent, onAccept]);

  const handleDecline = useCallback(() => {
    onDecline();
    // Restore focus
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [onDecline]);

  const handleCheckboxChange = useCallback(() => {
    setIsChecked((prev) => !prev);
  }, []);

  // Focus trap — Escape = decline
  useFocusTrap(modalRef, isOpen, true);

  // Handle Escape key to decline
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDecline();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDecline]);

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

  // IntersectionObserver on sentinel div to detect scroll-to-bottom
  useEffect(() => {
    if (!isOpen || !sentinelRef.current || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasScrolledToBottom(true);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 1.0,
      },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasScrolledToBottom(false);
      setIsChecked(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-md"
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
              aria-labelledby="consent-modal-title"
              aria-describedby="consent-modal-description"
              tabIndex={-1}
              className="rounded-2xl border border-(--glass-border) bg-(--bg-glass) p-8 shadow-[0_8px_40px_var(--shadow-elevated)] outline-hidden [backdrop-filter:blur(var(--glass-blur))] [-webkit-backdrop-filter:blur(var(--glass-blur))]"
            >
              {/* Icon */}
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(6,214,160,0.1)]">
                <FileSearch className="h-8 w-8 text-(--accent-teal)" aria-hidden="true" />
              </div>

              <h2
                id="consent-modal-title"
                className="font-heading mb-2 text-center text-xl font-bold text-(--text-heading)"
              >
                Consent for Genetic Data Processing
              </h2>

              <p
                id="consent-modal-description"
                className="mb-4 text-center text-sm text-(--text-muted)"
              >
                Please read the following consent information carefully before proceeding with
                genetic analysis.
              </p>

              {/* Scrollable consent text */}
              <div className="relative mb-4">
                <div
                  ref={scrollContainerRef}
                  tabIndex={0}
                  className="max-h-60 overflow-y-auto rounded-xl border border-(--border-subtle) bg-(--bg-elevated) p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-teal)"
                >
                  <div className="text-sm whitespace-pre-line text-(--text-body)">
                    {CONSENT_TEXT_GENETIC_PROCESSING}
                  </div>
                  {/* Sentinel div — IntersectionObserver target */}
                  <div ref={sentinelRef} aria-hidden="true" className="h-1" />
                </div>
                {!hasScrolledToBottom && (
                  <div
                    className="pointer-events-none absolute right-0 bottom-0 left-0 h-12 rounded-b-xl bg-linear-to-t from-(--bg-elevated) to-transparent"
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Checkbox — disabled until user has scrolled to bottom */}
              <label
                className={`mb-6 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  hasScrolledToBottom
                    ? 'border-(--border-subtle) bg-(--bg-elevated) hover:border-[rgba(6,214,160,0.2)]'
                    : 'cursor-not-allowed border-(--border-subtle) bg-(--bg-elevated) opacity-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={handleCheckboxChange}
                  disabled={!hasScrolledToBottom}
                  className="mt-0.5 h-4 w-4 rounded-sm border-(--border-subtle) bg-(--bg-elevated) accent-(--accent-teal)"
                  aria-label="I have read and agree to the genetic data processing terms"
                />
                <span className="text-sm text-(--text-body)">
                  I have read and agree to the genetic data processing terms
                </span>
              </label>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button variant="ghost" size="lg" className="flex-1" onClick={handleDecline}>
                  Decline
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={handleAccept}
                  disabled={!isChecked}
                >
                  Accept
                </Button>
              </div>

              <p className="mt-3 text-center text-xs text-(--text-dim)">
                Your consent is required under GDPR Article 9 for processing special category
                (genetic) data.
              </p>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
