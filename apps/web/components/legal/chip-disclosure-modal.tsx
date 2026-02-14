"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLegalStore } from "@/lib/stores/legal-store";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useModalManager } from "@/hooks/use-modal-manager";
import { overlayVariants, modalVariants } from "@/lib/animations/modal-variants";
import { CHIP_LIMITATION_TEXT } from "@/lib/constants/legal-placeholders";

// ── Component ────────────────────────────────────────────────────────────

interface ChipDisclosureModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export function ChipDisclosureModal({
  isOpen,
  onContinue,
  onCancel,
}: ChipDisclosureModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const setChipLimitationAcknowledged = useLegalStore(
    (s) => s.setChipLimitationAcknowledged,
  );

  // Save trigger element when opening
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Register with modal manager for aria-hidden coordination
  useEffect(() => {
    if (isOpen) {
      useModalManager.getState().openModal("chip-disclosure");
    } else {
      useModalManager.getState().closeModal("chip-disclosure");
    }
    return () => useModalManager.getState().closeModal("chip-disclosure");
  }, [isOpen]);

  // Body scroll lock when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md"
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md mx-4"
          >
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="chip-disclosure-title"
              aria-describedby="chip-disclosure-description"
              tabIndex={-1}
              className="outline-none rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-glass)] p-8 shadow-[0_8px_40px_var(--shadow-elevated)] [backdrop-filter:blur(var(--glass-blur))] [-webkit-backdrop-filter:blur(var(--glass-blur))]"
            >
              {/* Icon */}
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(245,158,11,0.1)]">
                <AlertTriangle
                  className="h-8 w-8 text-[var(--accent-amber,#f59e0b)]"
                  aria-hidden="true"
                />
              </div>

              <h2
                id="chip-disclosure-title"
                className="mb-2 text-center font-heading text-xl font-bold text-[var(--text-heading)]"
              >
                Important: Test Limitations
              </h2>

              <p
                id="chip-disclosure-description"
                className="mb-6 text-sm text-[var(--text-body)] leading-relaxed rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
              >
                {CHIP_LIMITATION_TEXT}
              </p>

              {/* Checkbox */}
              <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 transition-colors hover:border-[rgba(6,214,160,0.2)]">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={handleCheckboxChange}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-elevated)] accent-[var(--accent-teal)]"
                  aria-label="I understand these limitations"
                />
                <span className="text-sm text-[var(--text-body)]">
                  I understand these limitations
                </span>
              </label>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex-1"
                  onClick={handleCancel}
                >
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
