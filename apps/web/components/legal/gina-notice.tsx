'use client';

import { useState, useCallback, useEffect, useId } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'motion/react';
import { ShieldCheck, ChevronDown, X } from 'lucide-react';
import Link from 'next/link';
import { safeLocalStorageGet, safeLocalStorageSet } from '@/lib/utils/safe-storage';

// ── Constants (hoisted outside component) ────────────────────────────────

const GINA_NOTICE_DISMISSED_KEY = 'mergenix_gina_notice_dismissed';

const GINA_BODY_TEXT =
  'The Genetic Information Nondiscrimination Act (GINA) protects you from discrimination by health insurers and employers based on genetic information. However, GINA does not cover life insurance, disability insurance, or long-term care insurance.';

const expandVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.22, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.18, ease: 'easeIn' as const },
  },
};

const reducedMotionVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto', transition: { duration: 0 } },
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
      className="mb-4 rounded-xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.04)] [-webkit-backdrop-filter:blur(8px)] [backdrop-filter:blur(8px)]"
    >
      {/* ── Collapsed header row ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <ShieldCheck className="text-(--accent-teal) h-4 w-4 shrink-0" aria-hidden="true" />

        <h3 className="m-0 flex-1 text-sm font-medium" id={headerId}>
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="text-(--text-body) hover:text-(--text-heading) focus-visible:outline-hidden focus-visible:ring-(--accent-teal) rounded-xs inline-flex min-h-[44px] w-full items-center gap-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
          >
            <span>
              <span className="text-(--text-heading) font-semibold">Important:</span> Know your
              genetic privacy rights (GINA)
            </span>
            <m.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              className="shrink-0"
              aria-hidden="true"
            >
              <ChevronDown className="text-(--text-muted) h-4 w-4" />
            </m.span>
          </button>
        </h3>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss GINA notice"
          className="text-(--text-muted) hover:text-(--text-primary) focus-visible:outline-hidden focus-visible:ring-(--accent-teal) flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md p-1 transition-colors hover:bg-[rgba(6,214,160,0.08)] focus-visible:ring-2 focus-visible:ring-offset-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Expandable body ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <m.div
            id={panelId}
            variants={prefersReducedMotion ? reducedMotionVariants : expandVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="border-t border-[rgba(6,214,160,0.15)] px-4 pb-4 pt-3">
              <p className="text-(--text-body) text-sm leading-relaxed">{GINA_BODY_TEXT}</p>
              <Link
                href="/legal#gina"
                className="text-(--accent-teal) focus-visible:outline-hidden focus-visible:ring-(--accent-teal) rounded-xs mt-3 inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-offset-1"
              >
                Read the full GINA notice
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
