'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLegalStore } from '@/lib/stores/legal-store';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useModalManager } from '@/hooks/use-modal-manager';
import { overlayVariants, modalVariants } from '@/lib/animations/modal-variants';
import { CHIP_LIMITATION_TEXT } from '@/lib/constants/legal-placeholders';

// ── Component ────────────────────────────────────────────────────────────

interface ChipDisclosureModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export function ChipDisclosureModal({ isOpen, onContinue, onCancel }: ChipDisclosureModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const setChipLimitationAcknowledged = useLegalStore((s) => s.setChipLimitationAcknowledged);

  // Save trigger element when opening
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Register with modal manager for aria-hidden coordination
  useEffect(() => {
    if (isOpen) {
      useModalManager.getState().openModal('chip-disclosure');
    } else {
      useModalManager.getState().closeModal('chip-disclosure');
    }
    return () => useModalManager.getState().closeModal('chip-disclosure');
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

  const handleContinue = useCallback(() => {
    setChipLimitationAcknowledged(true);
    onContinue();
    // Restore focus
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [setChipLimitationAcknowledged, onContinue]);

  const handleCancel = useCallback(() => {
    onCancel();
    // Restore focus
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [onCancel]);

  const handleCheckboxChange = useCallback(() => {
    setIsChecked((prev) => !prev);
  }, []);

  // Focus trap — Escape allowed (maps to Cancel)
  useFocusTrap(modalRef, isOpen, true);

  // Handle Escape key to cancel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCancel]);

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

  // Reset checkbox when modal closes
  useEffect(() => {
    if (!isOpen) {
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
          className="z-60 fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md"
        >
          <m.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mx-4 w-full max-w-md"
          >
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="chip-disclosure-title"
              aria-describedby="chip-disclosure-description"
              tabIndex={-1}
              className="outline-hidden border-(--glass-border) bg-(--bg-glass) rounded-2xl border p-8 shadow-[0_8px_40px_var(--shadow-elevated)] [-webkit-backdrop-filter:blur(var(--glass-blur))] [backdrop-filter:blur(var(--glass-blur))]"
            >
              {/* Icon */}
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(245,158,11,0.1)]">
                <AlertTriangle
                  className="text-(--accent-amber,#f59e0b) h-8 w-8"
                  aria-hidden="true"
                />
              </div>

              <h2
                id="chip-disclosure-title"
                className="font-heading text-(--text-heading) mb-2 text-center text-xl font-bold"
              >
                Important: Test Limitations
              </h2>

              <p
                id="chip-disclosure-description"
                className="text-(--text-body) border-(--border-subtle) bg-(--bg-elevated) mb-6 rounded-xl border p-4 text-sm leading-relaxed"
              >
                {CHIP_LIMITATION_TEXT}
              </p>

              {/* Checkbox */}
              <label className="border-(--border-subtle) bg-(--bg-elevated) mb-6 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:border-[rgba(6,214,160,0.2)]">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={handleCheckboxChange}
                  className="border-(--border-subtle) bg-(--bg-elevated) accent-(--accent-teal) mt-0.5 h-4 w-4 rounded-sm"
                  aria-label="I understand these limitations"
                />
                <span className="text-(--text-body) text-sm">I understand these limitations</span>
              </label>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button variant="ghost" size="lg" className="flex-1" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={handleContinue}
                  disabled={!isChecked}
                >
                  Continue to Analysis
                </Button>
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
