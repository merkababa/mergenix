"use client";

import { useState, useCallback, useEffect, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShieldCheck, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/utils/safe-storage";

// ── Constants (hoisted outside component) ────────────────────────────────

const GINA_NOTICE_DISMISSED_KEY = "mergenix_gina_notice_dismissed";

const GINA_BODY_TEXT =
  "The Genetic Information Nondiscrimination Act (GINA) protects you from discrimination by health insurers and employers based on genetic information. However, GINA does not cover life insurance, disability insurance, or long-term care insurance.";

const expandVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: { duration: 0.22, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

const reducedMotionVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: { duration: 0 } },
  exit: { opacity: 0, height: 0, transition: { duration: 0 } },
};

// ── Helpers (hoisted) ────────────────────────────────────────────────────

function isDismissed(): boolean {
  const val = safeLocalStorageGet(GINA_NOTICE_DISMISSED_KEY);
  if (!val) return false;
  const ts = Number(val);
  if (Number.isNaN(ts)) return false;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - ts < thirtyDays;
}

// ── Component ────────────────────────────────────────────────────────────

export function GinaNotice() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const panelId = useId();
  const headerId = useId();

  // Show only if not previously dismissed
  useEffect(() => {
    if (!isDismissed()) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    safeLocalStorageSet(GINA_NOTICE_DISMISSED_KEY, Date.now().toString());
  }, []);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-labelledby={headerId}
      className="mb-4 rounded-xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.04)] [backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)]"
    >
      {/* ── Collapsed header row ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <ShieldCheck
          className="h-4 w-4 shrink-0 text-[var(--accent-teal)]"
          aria-hidden="true"
        />

        <h3 className="flex-1 m-0 text-sm font-medium" id={headerId}>
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="w-full min-h-[44px] text-left text-[var(--text-body)] hover:text-[var(--text-heading)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-teal)] focus-visible:ring-offset-1 rounded-sm inline-flex items-center gap-2"
          >
            <span>
              <span className="font-semibold text-[var(--text-heading)]">
                Important:
              </span>{" "}
              Know your genetic privacy rights (GINA)
            </span>
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              className="shrink-0"
              aria-hidden="true"
            >
              <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
            </motion.span>
          </button>
        </h3>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss GINA notice"
          className="shrink-0 rounded-md p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-muted)] transition-colors hover:bg-[rgba(6,214,160,0.08)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-teal)] focus-visible:ring-offset-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Expandable body ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={panelId}
            variants={prefersReducedMotion ? reducedMotionVariants : expandVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="border-t border-[rgba(6,214,160,0.15)] px-4 pb-4 pt-3">
              <p className="text-sm leading-relaxed text-[var(--text-body)]">
                {GINA_BODY_TEXT}
              </p>
              <Link
                href="/legal#gina"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-teal)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-teal)] focus-visible:ring-offset-1 rounded-sm"
              >
                Read the full GINA notice
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
