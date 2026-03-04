"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { m, AnimatePresence } from "motion/react";
import { X, Check } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  validatePassword,
  PASSWORD_REQUIREMENTS,
  getPasswordStrength,
  STRENGTH_TEXT_COLORS,
} from "@/lib/password-utils";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const changePassword = useAuthStore((s) => s.changePassword);
  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  // Body scroll lock when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Focus trap + Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        setError(validation.errors[0]);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      setIsSubmitting(true);
      try {
        await changePassword(currentPassword, newPassword);
        setSuccess(true);
        setTimeout(onClose, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to change password");
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentPassword, newPassword, confirmPassword, changePassword, onClose],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Change password"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <m.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md"
          >
            <GlassCard variant="strong" hover="none" className="p-7">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-dim)] transition-colors hover:bg-[rgba(244,63,94,0.1)] hover:text-[var(--accent-rose)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="mb-1 font-heading text-lg font-bold text-[var(--text-heading)]">
                Change Password
              </h2>
              <p className="mb-5 text-sm text-[var(--text-muted)]">
                Enter your current password and choose a new one.
              </p>

              {success ? (
                <m.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(6,214,160,0.15)]">
                    <svg className="h-6 w-6 text-[var(--accent-teal)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="font-heading text-sm font-semibold text-[var(--accent-teal)]">
                    Password changed successfully
                  </p>
                </m.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <PasswordInput
                    label="Current Password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    autoFocus
                  />

                  <PasswordInput
                    label="New Password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />

                  {/* Password strength meter */}
                  {newPassword && (
                    <div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                        <m.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${strength.widthPercent}%` }}
                          transition={{ duration: 0.3, ease: "easeOut" as const }}
                          style={{ background: strength.color }}
                        />
                      </div>
                      <p
                        className="mt-1 text-xs font-medium"
                        style={{ color: STRENGTH_TEXT_COLORS[strength.level] }}
                        aria-live="polite"
                      >
                        {strength.label && `${strength.label} password`}
                      </p>
                    </div>
                  )}

                  {/* Password requirements checklist */}
                  <div className="space-y-1.5" role="list" aria-label="Password requirements">
                    {PASSWORD_REQUIREMENTS.map(({ check, text }) => {
                      const met = check(newPassword);
                      return (
                        <div
                          key={text}
                          className="flex items-center gap-2 text-xs"
                          role="listitem"
                        >
                          <Check
                            className={`h-3.5 w-3.5 ${
                              met
                                ? "text-[var(--accent-teal)]"
                                : "text-[var(--text-dim)]"
                            }`}
                          />
                          <span
                            className={
                              met
                                ? "text-[var(--text-body)]"
                                : "text-[var(--text-dim)]"
                            }
                          >
                            {text}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <PasswordInput
                    label="Confirm New Password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={
                      confirmPassword && newPassword !== confirmPassword
                        ? "Passwords do not match"
                        : undefined
                    }
                    autoComplete="new-password"
                  />

                  <AnimatePresence mode="wait">
                    {error && (
                      <m.div
                        key="error"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="rounded-xl border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-sm text-[var(--accent-rose)]"
                        role="alert"
                      >
                        {error}
                      </m.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      className="flex-1"
                      onClick={onClose}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      className="flex-1"
                      isLoading={isSubmitting}
                      disabled={
                        !currentPassword || !newPassword || !confirmPassword
                      }
                    >
                      Change Password
                    </Button>
                  </div>
                </form>
              )}
            </GlassCard>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
