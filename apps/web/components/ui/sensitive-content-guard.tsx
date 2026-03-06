"use client";

import { useCallback, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useModalManager } from "@/hooks/use-modal-manager";
import { modalVariants, overlayVariants } from "@/lib/animations/modal-variants";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentCategory = "carrier" | "prs" | "pgx";
type TierLevel = "free" | "premium" | "pro";

export interface SensitiveContentGuardProps {
  /** Content to protect behind the guard. */
  children: React.ReactNode;
  /** Category of sensitive content (determines labelling). */
  category: ContentCategory;
  /** Whether the content relates to an autosomal dominant condition. */
  isAutosomalDominant?: boolean;
  /** The user's current subscription tier. */
  tier: TierLevel;
  /** The minimum tier required to view this content. */
  requiredTier: "premium" | "pro";
  /** Callback fired when the user clicks the upgrade CTA. */
  onUpgrade?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Tier hierarchy for comparison. Higher number = more permissive.
 * Mirrors the private TIER_RANK in @mergenix/shared-types/payments
 * (not exported — kept local because SensitiveContentGuard compares
 * two arbitrary tiers directly rather than mapping through GatedFeature).
 */
const TIER_RANK: Record<TierLevel, number> = {
  free: 0,
  premium: 1,
  pro: 2,
};

const CATEGORY_LABELS: Record<ContentCategory, string> = {
  carrier: "Carrier Screening",
  prs: "Polygenic Risk Scores",
  pgx: "Pharmacogenomics",
};

const TIER_DISPLAY_NAMES: Record<"premium" | "pro", string> = {
  premium: "Premium",
  pro: "Pro",
};

const AD_WARNING_MODAL_ID = "sensitive-content-ad-warning";

// ─── Component ────────────────────────────────────────────────────────────────

export function SensitiveContentGuard({
  children,
  category,
  isAutosomalDominant = false,
  tier,
  requiredTier,
  onUpgrade,
}: SensitiveContentGuardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showAdWarning, setShowAdWarning] = useState(false);

  const uniqueId = useId();
  const contentId = `sensitive-content-${uniqueId}`;
  const revealButtonId = `reveal-btn-${uniqueId}`;
  const modalRef = useRef<HTMLDivElement>(null);

  const { openModal, closeModal } = useModalManager();

  // Focus trap for the AD warning modal
  useFocusTrap(modalRef, showAdWarning);

  const hasSufficientTier = TIER_RANK[tier] >= TIER_RANK[requiredTier];

  const handleRevealClick = useCallback(() => {
    if (isAutosomalDominant) {
      setShowAdWarning(true);
      openModal(AD_WARNING_MODAL_ID);
    } else {
      setIsRevealed(true);
    }
  }, [isAutosomalDominant, openModal]);

  const handleAdContinue = useCallback(() => {
    setShowAdWarning(false);
    closeModal(AD_WARNING_MODAL_ID);
    setIsRevealed(true);
  }, [closeModal]);

  const handleAdGoBack = useCallback(() => {
    setShowAdWarning(false);
    closeModal(AD_WARNING_MODAL_ID);
  }, [closeModal]);

  const handleAdKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleAdGoBack();
      }
    },
    [handleAdGoBack],
  );

  // ── Upgrade CTA (insufficient tier) ──────────────────────────────────────

  if (!hasSufficientTier) {
    return (
      <GlassCard
        variant="medium"
        hover="none"
        className="relative p-8"
      >
        {/* Decorative blurred placeholder — NOT the real content */}
        <div
          className="pointer-events-none select-none"
          style={{ filter: "blur(8px)" }}
          aria-hidden="true"
        >
          <div className="space-y-3">
            <div className="h-4 w-3/4 rounded-sm bg-(--text-muted) opacity-20" />
            <div className="h-4 w-1/2 rounded-sm bg-(--text-muted) opacity-20" />
            <div className="h-4 w-5/6 rounded-sm bg-(--text-muted) opacity-20" />
            <div className="h-4 w-2/3 rounded-sm bg-(--text-muted) opacity-20" />
          </div>
        </div>

        {/* Upgrade overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-glass bg-[rgba(5,8,16,0.7)] p-6 text-center">
          <p className="text-sm font-medium text-(--text-body)">
            {CATEGORY_LABELS[category]} results require{" "}
            {TIER_DISPLAY_NAMES[requiredTier]}
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={onUpgrade}
            className="min-h-[44px] min-w-[44px]"
          >
            Unlock with {TIER_DISPLAY_NAMES[requiredTier]}
          </Button>
        </div>
      </GlassCard>
    );
  }

  // ── Sufficient tier: blurred with reveal toggle ──────────────────────────

  return (
    <>
      <div className="relative">
        {!isRevealed ? (
          // Blurred state: real content is NOT in the DOM
          <GlassCard
            variant="medium"
            hover="none"
            className="relative p-8"
          >
            {/* Decorative blurred placeholder */}
            <div
              className="pointer-events-none select-none"
              style={{ filter: "blur(8px)" }}
              aria-hidden="true"
            >
              <div className="space-y-3">
                <div className="h-4 w-3/4 rounded-sm bg-(--text-muted) opacity-20" />
                <div className="h-4 w-1/2 rounded-sm bg-(--text-muted) opacity-20" />
                <div className="h-4 w-5/6 rounded-sm bg-(--text-muted) opacity-20" />
                <div className="h-4 w-2/3 rounded-sm bg-(--text-muted) opacity-20" />
              </div>
            </div>

            {/* Reveal button centered over the blur */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                id={revealButtonId}
                variant="primary"
                size="lg"
                onClick={handleRevealClick}
                aria-expanded={false}
                aria-controls={contentId}
                className="min-h-[44px] min-w-[44px]"
              >
                Reveal Results
              </Button>
            </div>
          </GlassCard>
        ) : (
          // Revealed state: actual content is rendered
          <div
            id={contentId}
          >
            {children}
          </div>
        )}
      </div>

      {/* Autosomal Dominant warning modal */}
      <AnimatePresence>
        {showAdWarning && (
          <m.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="presentation"
            onClick={handleAdGoBack}
            onKeyDown={handleAdKeyDown}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)]" aria-hidden="true" />

            {/* Modal panel */}
            <m.div
              ref={modalRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={`ad-warning-title-${uniqueId}`}
              aria-describedby={`ad-warning-desc-${uniqueId}`}
              className="relative z-10 mx-4 max-w-md rounded-glass border border-[rgba(244,63,94,0.3)] bg-[rgba(12,18,32,0.95)] p-6 shadow-[0_4px_30px_rgba(244,63,94,0.15)]"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleAdKeyDown}
            >
              <h2
                id={`ad-warning-title-${uniqueId}`}
                className="mb-3 text-lg font-heading font-semibold text-(--text-primary)"
              >
                Important: Autosomal Dominant Condition
              </h2>

              <p
                id={`ad-warning-desc-${uniqueId}`}
                className="mb-6 text-sm leading-relaxed text-(--text-body)"
              >
                This result relates to an autosomal dominant condition. It has
                direct medical implications for you. We recommend reviewing with
                a genetic counselor before viewing.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleAdGoBack}
                  className="min-h-[44px] min-w-[44px] flex-1"
                >
                  Go Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAdContinue}
                  className="min-h-[44px] min-w-[44px] flex-1"
                >
                  Continue
                </Button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
