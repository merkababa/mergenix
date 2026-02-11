"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLegalStore } from "@/lib/stores/legal-store";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { AGE_VERIFIED_KEY, UNDER_18_KEY } from "../../lib/constants/legal";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "../../lib/utils/safe-storage";

// ── Animation variants (hoisted outside component) ───────────────────────

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

// ── Under-18 expiry (6 months = 182 days) ────────────────────────────────

const UNDER_18_EXPIRY_MS = 182 * 24 * 60 * 60 * 1000;

function isUnder18Blocked(): boolean {
  const raw = safeLocalStorageGet(UNDER_18_KEY);
  if (!raw) return false;
  // Legacy value "true" — treat as expired (force re-prompt)
  const ts = Number(raw);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < UNDER_18_EXPIRY_MS;
}

// ── Component ────────────────────────────────────────────────────────────

interface AgeVerificationModalProps {
  onVerified?: () => void;
}

export function AgeVerificationModal({
  onVerified,
}: AgeVerificationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const ageVerified = useLegalStore((s) => s.ageVerified);
  const verifyAge = useLegalStore((s) => s.verifyAge);

  // Check localStorage on mount — show modal if not verified
  // Also redirect immediately if the user previously indicated under-18 (within 6 months)
  useEffect(() => {
    if (isUnder18Blocked()) {
      router.push("/");
      return;
    }
    if (safeLocalStorageGet(AGE_VERIFIED_KEY) !== "true" && !ageVerified) {
      setIsOpen(true);
    }
  }, [ageVerified, router]);

  // Body scroll lock when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Focus trap — Escape does NOT close (using extracted hook)
  useFocusTrap(modalRef, isOpen, false);

  // Auto-focus modal when opened
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    verifyAge();
    onVerified?.();
  }, [verifyAge, onVerified]);

  const handleCheckboxChange = useCallback(() => {
    setIsChecked((prev) => !prev);
  }, []);

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
              aria-labelledby="age-verify-title"
              aria-describedby="age-verify-description"
              tabIndex={-1}
              className="outline-none rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-glass)] p-8 shadow-[0_8px_40px_var(--shadow-elevated)] [backdrop-filter:blur(var(--glass-blur))] [-webkit-backdrop-filter:blur(var(--glass-blur))]"
            >
              {/* Icon */}
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(6,214,160,0.1)]">
                <ShieldCheck
                  className="h-8 w-8 text-[var(--accent-teal)]"
                  aria-hidden="true"
                />
              </div>

              <h2
                id="age-verify-title"
                className="mb-2 text-center font-heading text-xl font-bold text-[var(--text-heading)]"
              >
                Age Verification Required
              </h2>

              <p
                id="age-verify-description"
                className="mb-6 text-center text-sm text-[var(--text-muted)]"
              >
                Mergenix provides genetic health information. You must be at
                least 18 years old to use this service.
              </p>

              {/* Checkbox */}
              <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 transition-colors hover:border-[rgba(6,214,160,0.2)]">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={handleCheckboxChange}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-elevated)] accent-[var(--accent-teal)]"
                  aria-label="I confirm that I am 18 years of age or older"
                />
                <span className="text-sm text-[var(--text-body)]">
                  I confirm that I am 18 years of age or older
                </span>
              </label>

              {/* Continue button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleConfirm}
                disabled={!isChecked}
              >
                Continue
              </Button>

              {/* Under-18 exit ramp */}
              <p className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    safeLocalStorageSet(UNDER_18_KEY, Date.now().toString());
                    router.push("/");
                  }}
                  className="text-sm text-[var(--text-muted)] underline hover:text-[var(--text-primary)]"
                >
                  I am under 18
                </button>
              </p>

              <p className="mt-3 text-center text-xs text-[var(--text-dim)]">
                This verification is required by applicable regulations
                governing genetic health information services.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
