'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { usePaymentStore } from '@/lib/stores/payment-store';
import { useLegalStore } from '@/lib/stores/legal-store';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useModalManager } from '@/hooks/use-modal-manager';
import { getPricingTier } from '@mergenix/shared-types';
import type { PricingTier } from '@mergenix/shared-types';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChipDisclosureModal } from '@/components/legal/chip-disclosure-modal';
import { Sparkles, ArrowRight, Shield, X, AlertCircle, Check } from 'lucide-react';

// ── Props ───────────────────────────────────────────────────────────────

interface UpgradeModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Target tier to upgrade to */
  targetTier: 'premium' | 'pro';
  /** Current user tier */
  currentTier: 'free' | 'premium' | 'pro';
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Format a dollar amount to two decimal places. */
function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Compute the upgrade price. For fresh purchases the full price is charged.
 * For Premium -> Pro upgrades, the user pays the difference.
 */
function getUpgradePrice(currentTier: PricingTier, targetTier: PricingTier): number {
  return Math.max(targetTier.price - currentTier.price, 0);
}

/** Return only the features the target tier has that the current tier does not. */
function getNewFeatures(currentTier: PricingTier, targetTier: PricingTier): string[] {
  const currentSet = new Set(currentTier.features);
  return targetTier.features.filter((f) => !currentSet.has(f));
}

// ── Constants ───────────────────────────────────────────────────────────

/** Maximum number of new features to display in the modal. */
const MAX_FEATURES_SHOWN = 6;

// ── Component ───────────────────────────────────────────────────────────

export function UpgradeModal({ isOpen, onClose, targetTier, currentTier }: UpgradeModalProps) {
  const createCheckout = usePaymentStore((s) => s.createCheckout);
  const isCheckoutLoading = usePaymentStore((s) => s.isCheckoutLoading);
  const [error, setError] = useState<string | null>(null);
  const [showChipDisclosure, setShowChipDisclosure] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const descriptionId = useId();

  const triggerRef = useRef<Element | null>(null);

  // ── Derived data ────────────────────────────────────────────────────

  const currentPlan = getPricingTier(currentTier);
  const targetPlan = getPricingTier(targetTier);

  const upgradePrice = currentPlan && targetPlan ? getUpgradePrice(currentPlan, targetPlan) : 0;
  const isPayingDifference = currentPlan ? currentPlan.price > 0 : false;
  const newFeatures = currentPlan && targetPlan ? getNewFeatures(currentPlan, targetPlan) : [];
  const displayFeatures = newFeatures.slice(0, MAX_FEATURES_SHOWN);
  const hiddenFeaturesCount = newFeatures.length - displayFeatures.length;

  // ── Handlers ────────────────────────────────────────────────────────

  const proceedToCheckout = useCallback(async () => {
    setError(null);
    try {
      const { checkoutUrl } = await createCheckout(targetTier);
      if (!checkoutUrl.startsWith('https://checkout.stripe.com/')) {
        throw new Error('Invalid checkout URL');
      }
      window.location.href = checkoutUrl;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    }
  }, [createCheckout, targetTier]);

  const handleConfirm = useCallback(async () => {
    // Gate: require chip limitation acknowledgment before proceeding to payment
    if (!useLegalStore.getState().chipLimitationAcknowledged) {
      setShowChipDisclosure(true);
      return;
    }
    await proceedToCheckout();
  }, [proceedToCheckout]);

  const handleChipDisclosureContinue = useCallback(async () => {
    setShowChipDisclosure(false);
    // Acknowledgment was set in the store by ChipDisclosureModal — now proceed
    await proceedToCheckout();
  }, [proceedToCheckout]);

  const handleChipDisclosureCancel = useCallback(() => {
    setShowChipDisclosure(false);
    // User cancelled — stay on the upgrade modal
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    // Restore focus to the element that triggered the modal
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only close if clicking the backdrop itself, not modal content.
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  // ── Effects ─────────────────────────────────────────────────────────

  // Save trigger element when opening (Fix 4: triggerRef for focus restoration).
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Register with modal manager for aria-hidden coordination (Fix 2).
  useEffect(() => {
    if (isOpen) {
      useModalManager.getState().openModal('upgrade-modal');
    } else {
      useModalManager.getState().closeModal('upgrade-modal');
    }
    return () => useModalManager.getState().closeModal('upgrade-modal');
  }, [isOpen]);

  // Close on Escape key.
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

  // Prevent body scroll when modal is open.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Focus trap: cycle Tab/Shift+Tab within the modal (Escape allowed).
  useFocusTrap(modalRef, isOpen, true);

  // Focus first focusable element when modal opens (Fix 3: replaces autoFocus).
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

  // Clear error when modal closes.
  useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  // ── Render ──────────────────────────────────────────────────────────

  // Safeguard: should never happen if tier IDs are valid (Fix 1: moved after all hooks).
  if (!isOpen || !currentPlan || !targetPlan) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative mx-4 w-full max-w-md outline-hidden"
      >
        <GlassCard variant="strong" hover="none" className="p-6">
          {/* ── Close button ────────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleClose}
            disabled={isCheckoutLoading}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-(--text-muted) transition-colors hover:bg-[rgba(148,163,184,0.1)] hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-teal) disabled:pointer-events-none disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-[rgba(139,92,246,0.2)] to-[rgba(6,214,160,0.2)]">
              <Sparkles className="h-5 w-5 text-(--accent-teal)" aria-hidden="true" />
            </div>
            <h2 id={headingId} className="font-heading text-xl font-bold text-(--text-primary)">
              Upgrade to {targetPlan.name}
            </h2>
          </div>

          {/* ── Description (for aria-describedby) ──────────────────── */}
          <p id={descriptionId} className="mb-5 text-sm text-(--text-muted)">
            Unlock more features with a one-time upgrade to {targetPlan.name}.
          </p>

          {/* ── Plan comparison ──────────────────────────────────────── */}
          <div className="mb-5 flex items-center justify-center gap-4 rounded-2xl border border-(--glass-border) bg-[rgba(148,163,184,0.04)] px-5 py-4">
            {/* Current plan */}
            <div className="flex flex-col items-center gap-1.5">
              <Badge variant={currentTier === 'free' ? 'free' : currentTier}>
                {currentPlan.name}
              </Badge>
              <span className="text-xs text-(--text-muted)">
                {currentPlan.price === 0 ? 'Free' : formatPrice(currentPlan.price)}
              </span>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-5 w-5 shrink-0 text-(--accent-teal)" aria-hidden="true" />

            {/* Target plan */}
            <div className="flex flex-col items-center gap-1.5">
              <Badge variant={targetTier}>{targetPlan.name}</Badge>
              <span className="text-xs font-semibold text-(--text-primary)">
                {formatPrice(targetPlan.price)}
              </span>
            </div>
          </div>

          {/* ── New features list ────────────────────────────────────── */}
          {displayFeatures.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2.5 text-xs font-semibold tracking-wider text-(--text-muted) uppercase">
                What you get
              </h3>
              <ul className="space-y-2">
                {displayFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-(--text-body)">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-teal)"
                      aria-hidden="true"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
                {hiddenFeaturesCount > 0 && (
                  <li className="pl-6 text-xs text-(--text-muted)">
                    +{hiddenFeaturesCount} more feature
                    {hiddenFeaturesCount !== 1 ? 's' : ''}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* ── Price display ────────────────────────────────────────── */}
          <div className="mb-5 rounded-xl border border-(--glass-border) bg-[rgba(6,214,160,0.04)] px-4 py-3">
            {isPayingDifference ? (
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-(--text-body)">Pay the difference</span>
                <span className="font-heading text-lg font-bold text-(--accent-teal)">
                  {formatPrice(upgradePrice)}
                </span>
              </div>
            ) : (
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-(--text-body)">One-time payment</span>
                <span className="font-heading text-lg font-bold text-(--accent-teal)">
                  {formatPrice(targetPlan.price)}
                </span>
              </div>
            )}
          </div>

          {/* ── Error message ────────────────────────────────────────── */}
          {error && (
            <div
              className="mb-4 flex items-start gap-2 rounded-xl border border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.08)] px-4 py-3"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle
                className="text-accent-rose mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <p className="text-accent-rose text-sm">{error}</p>
            </div>
          )}

          {/* ── Action buttons ───────────────────────────────────────── */}
          <div className="flex flex-col gap-2.5">
            <Button
              variant="primary"
              size="lg"
              onClick={handleConfirm}
              disabled={isCheckoutLoading}
              isLoading={isCheckoutLoading}
              aria-busy={isCheckoutLoading}
              className="w-full"
            >
              {isCheckoutLoading ? 'Processing...' : 'Confirm Upgrade'}
            </Button>

            <Button
              variant="ghost"
              size="md"
              onClick={handleClose}
              disabled={isCheckoutLoading}
              className="w-full"
            >
              Cancel
            </Button>
          </div>

          {/* ── Disclaimer ───────────────────────────────────────────── */}
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-(--text-muted)">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            You&apos;ll be redirected to Stripe&apos;s secure checkout
          </p>
        </GlassCard>
      </div>

      {/* ── Chip Disclosure Modal (shown before first checkout) ── */}
      <ChipDisclosureModal
        isOpen={showChipDisclosure}
        onContinue={handleChipDisclosureContinue}
        onCancel={handleChipDisclosureCancel}
      />
    </div>
  );
}
