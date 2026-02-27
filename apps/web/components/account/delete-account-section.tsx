"use client";

import { useState, useCallback, useEffect, useRef, useId } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useModalManager } from "@/hooks/use-modal-manager";
import { overlayVariants, modalVariants } from "@/lib/animations/modal-variants";

// ── Props ───────────────────────────────────────────────────────────────

interface DeleteAccountSectionProps {
  /** Callback invoked when the user fully confirms deletion. */
  onDeleteConfirmed: () => Promise<void>;
}

// ── Constants ───────────────────────────────────────────────────────────

const MODAL_ID = "delete-account-confirmation-modal";
const CONFIRMATION_WORD = "DELETE";

// ── Component ───────────────────────────────────────────────────────────

export function DeleteAccountSection({
  onDeleteConfirmed,
}: DeleteAccountSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const headingId = useId();
  const warningId = useId();

  const isConfirmed = confirmText === CONFIRMATION_WORD;

  // ── Handlers ────────────────────────────────────────────────────────

  const openModal = useCallback(() => {
    triggerRef.current = document.activeElement;
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setConfirmText("");
    setError(null);
    // Restore focus to the element that triggered the modal
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        closeModal();
      }
    },
    [closeModal],
  );

  const handleDelete = useCallback(async () => {
    if (!isConfirmed) return;

    setError(null);
    setIsDeleting(true);
    try {
      await onDeleteConfirmed();
      closeModal();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Account deletion failed. Please try again.";
      setError(message);
      setIsDeleting(false);
    }
  }, [isConfirmed, onDeleteConfirmed, closeModal]);

  // ── Effects ─────────────────────────────────────────────────────────

  // Register with modal manager for aria-hidden coordination
  useEffect(() => {
    if (isModalOpen) {
      useModalManager.getState().openModal(MODAL_ID);
    } else {
      useModalManager.getState().closeModal(MODAL_ID);
    }
    return () => useModalManager.getState().closeModal(MODAL_ID);
  }, [isModalOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isModalOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen]);

  // Focus trap
  useFocusTrap(modalRef, isModalOpen, true);

  // Focus the confirmation input when modal opens
  useEffect(() => {
    if (isModalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isModalOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setConfirmText("");
      setError(null);
      setIsDeleting(false);
    }
  }, [isModalOpen]);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Danger Zone Section ──────────────────────────────────────── */}
      <GlassCard
        variant="subtle"
        hover="none"
        className="border-[rgba(244,63,94,0.15)] p-7"
      >
        <div className="flex items-center gap-3 mb-4">
          <Trash2
            className="h-5 w-5 text-[var(--accent-rose)]"
            aria-hidden="true"
          />
          <h2 className="font-heading text-lg font-bold text-[var(--accent-rose)]">
            Delete Account
          </h2>
        </div>

        <p className="mb-5 text-sm text-[var(--text-muted)]">
          Permanently delete your account and all associated data. This action
          cannot be undone. Your raw genetic files are never stored on our
          servers — only your saved analysis results will be deleted.
        </p>

        <Button
          variant="destructive"
          size="md"
          onClick={openModal}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete My Account
        </Button>
      </GlassCard>

      {/* ── Confirmation Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <m.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md"
            onClick={handleBackdropClick}
            role="presentation"
          >
            <m.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md mx-4"
            >
              <div
                ref={modalRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={headingId}
                aria-describedby={warningId}
                tabIndex={-1}
                className="relative outline-none rounded-2xl border border-[rgba(244,63,94,0.2)] bg-[var(--bg-glass)] p-8 shadow-[0_8px_40px_var(--shadow-elevated)] [backdrop-filter:blur(var(--glass-blur))] [-webkit-backdrop-filter:blur(var(--glass-blur))]"
              >
                {/* ── Close button ──────────────────────────────────── */}
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isDeleting}
                  className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[rgba(148,163,184,0.1)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)] disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* ── Warning icon ──────────────────────────────────── */}
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(244,63,94,0.1)]">
                  <AlertTriangle
                    className="h-8 w-8 text-[var(--accent-rose)]"
                    aria-hidden="true"
                  />
                </div>

                {/* ── Heading ───────────────────────────────────────── */}
                <h2
                  id={headingId}
                  className="mb-2 text-center font-heading text-xl font-bold text-[var(--text-heading)]"
                >
                  Are you sure?
                </h2>

                {/* ── Warning text ──────────────────────────────────── */}
                <div
                  id={warningId}
                  className="mb-5 rounded-xl border border-[rgba(244,63,94,0.15)] bg-[rgba(244,63,94,0.04)] p-4 text-sm text-[var(--text-muted)]"
                >
                  <p className="mb-2">This will permanently delete:</p>
                  <ul className="list-inside list-disc space-y-1 ml-1">
                    <li>Your account and profile</li>
                    <li>All saved analysis results</li>
                    <li>Your plan and tier status</li>
                  </ul>
                  <p className="mt-3 font-semibold text-[var(--accent-rose)]">
                    This cannot be undone.
                  </p>
                </div>

                {/* ── Confirmation input ────────────────────────────── */}
                <div className="mb-5">
                  <label
                    htmlFor="delete-confirm-input"
                    className="mb-2 block text-sm text-[var(--text-muted)]"
                  >
                    Type <span className="font-mono font-bold text-[var(--text-primary)]">DELETE</span> to confirm
                  </label>
                  <input
                    ref={inputRef}
                    id="delete-confirm-input"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    disabled={isDeleting}
                    aria-label="Type DELETE to confirm account deletion"
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none transition-colors focus:border-[rgba(244,63,94,0.4)] focus:ring-2 focus:ring-[rgba(244,63,94,0.15)] disabled:opacity-50"
                  />
                </div>

                {/* ── Error message ─────────────────────────────────── */}
                <AnimatePresence mode="wait">
                  {error && (
                    <m.div
                      key="error"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mb-4 rounded-xl border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-sm text-[var(--accent-rose)]"
                      role="alert"
                      aria-live="assertive"
                    >
                      {error}
                    </m.div>
                  )}
                </AnimatePresence>

                {/* ── Action buttons ────────────────────────────────── */}
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="flex-1"
                    onClick={closeModal}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="flex-1"
                    onClick={handleDelete}
                    disabled={!isConfirmed || isDeleting}
                    isLoading={isDeleting}
                    aria-busy={isDeleting}
                  >
                    Delete Everything
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
