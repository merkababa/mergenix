'use client';

import { useState, useCallback, useMemo, useEffect, useRef, type RefObject } from 'react';
import { m, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { Save, X, Crown, AlertTriangle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Tier } from '@mergenix/shared-types';

// ── Constants (hoisted outside component) ──────────────────────────────────

const TIER_SAVE_LIMITS: Record<Tier, number> = {
  free: 1,
  premium: 10,
  pro: Infinity,
};

const CONSENT_KEY = 'mergenix_analysis_save_consent';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

// ── Helpers (hoisted) ─────────────────────────────────────────────────────

function createFocusTrapHandler(ref: RefObject<HTMLDivElement | null>) {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !ref.current) return;
    const focusable = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
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
}

/** Safe localStorage.getItem — returns null on SecurityError (strict privacy settings). */
function safeLocalStorageGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

/** Safe localStorage.setItem — silently fails on SecurityError. */
function safeLocalStorageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore — storage unavailable (strict privacy, iframe sandbox, etc.)
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function SaveResultDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [showConsent, setShowConsent] = useState(false);

  const consentModalRef = useRef<HTMLDivElement>(null);
  const saveDialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const fullResults = useAnalysisStore((s) => s.fullResults);
  const currentStep = useAnalysisStore((s) => s.currentStep);
  const isDemo = useAnalysisStore((s) => s.isDemo);
  const isSaving = useAnalysisStore((s) => s.isSaving);
  const saveError = useAnalysisStore((s) => s.saveError);
  const savedResults = useAnalysisStore((s) => s.savedResults);
  const saveCurrentResult = useAnalysisStore((s) => s.saveCurrentResult);
  const clearSaveError = useAnalysisStore((s) => s.clearSaveError);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const userTier = user?.tier ?? 'free';
  const tierLimit = TIER_SAVE_LIMITS[userTier];
  const savedCount = savedResults.length;
  const isAtLimit = savedCount >= tierLimit;

  const handleOpen = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement;
    clearSaveError();
    // Check if consent was previously given
    const hasConsent = safeLocalStorageGet(CONSENT_KEY) === 'true';
    if (!hasConsent) {
      setShowConsent(true);
    } else {
      setIsOpen(true);
    }
  }, [clearSaveError]);

  const handleConsent = useCallback(() => {
    safeLocalStorageSet(CONSENT_KEY, 'true');
    setShowConsent(false);
    setIsOpen(true);
  }, []);

  const handleConsentCancel = useCallback(() => {
    setShowConsent(false);
    triggerRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setLabel('');
    clearSaveError();
    triggerRef.current?.focus();
  }, [clearSaveError]);

  const handleSave = useCallback(async () => {
    if (!label.trim()) return;
    try {
      await saveCurrentResult(label.trim());
      setIsOpen(false);
      setLabel('');
      triggerRef.current?.focus();
    } catch {
      // Error is already set in the store
    }
  }, [label, saveCurrentResult]);

  const handleConsentBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowConsent(false);
      triggerRef.current?.focus();
    }
  }, []);

  const handleSaveBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  const tierLimitText = useMemo(() => {
    if (userTier === 'pro') return null;
    return `${savedCount} of ${tierLimit} saved ${tierLimit === 1 ? 'analysis' : 'analyses'} used`;
  }, [userTier, savedCount, tierLimit]);

  const upgradeCTAText = useMemo(() => {
    if (userTier === 'free') return 'Upgrade to Premium for 10 saved analyses';
    if (userTier === 'premium') return 'Upgrade to Pro for unlimited saved analyses';
    return null;
  }, [userTier]);

  // ── Focus trap + Escape for consent modal ─────────────────────────────

  useEffect(() => {
    if (!showConsent) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowConsent(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showConsent]);

  useEffect(() => {
    if (!showConsent || !consentModalRef.current) return;

    consentModalRef.current.focus();

    const handleFocusTrap = createFocusTrapHandler(consentModalRef);
    document.addEventListener('keydown', handleFocusTrap);
    return () => document.removeEventListener('keydown', handleFocusTrap);
  }, [showConsent]);

  // Prevent body scroll when consent modal is open
  useEffect(() => {
    if (!showConsent) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showConsent]);

  // ── Focus trap + Escape for save dialog ───────────────────────────────

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

  useEffect(() => {
    if (!isOpen || !saveDialogRef.current) return;

    // Focus the input field directly instead of the dialog container
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    const handleFocusTrap = createFocusTrapHandler(saveDialogRef);
    document.addEventListener('keydown', handleFocusTrap);
    return () => document.removeEventListener('keydown', handleFocusTrap);
  }, [isOpen]);

  // Prevent body scroll when save dialog is open
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Don't render if conditions aren't met
  if (!fullResults || currentStep !== 'complete') return null;

  // Demo results can't be saved
  if (isDemo) return null;

  // Not authenticated — prompt to sign in
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-sm text-(--text-muted)">
        <Save className="h-4 w-4" aria-hidden="true" />
        <span>Sign in to save your analysis</span>
      </div>
    );
  }

  return (
    <>
      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleOpen} disabled={isAtLimit || isSaving}>
          <Save className="h-4 w-4" />
          Save Analysis
        </Button>
        {tierLimitText && (
          <span className="text-xs text-(--text-muted)" aria-live="polite">
            {tierLimitText}
          </span>
        )}
        {isAtLimit && userTier !== 'pro' && upgradeCTAText && (
          <a
            href="/subscription"
            className="inline-flex items-center gap-1 text-xs font-medium text-(--accent-teal) hover:underline"
          >
            <Crown className="h-3 w-3" aria-hidden="true" />
            {upgradeCTAText}
          </a>
        )}
      </div>

      {/* Consent Modal */}
      <AnimatePresence>
        {showConsent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs"
            onClick={handleConsentBackdropClick}
            role="presentation"
          >
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mx-4 w-full max-w-md"
            >
              <div
                ref={consentModalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="consent-dialog-title"
                tabIndex={-1}
                className="outline-hidden"
              >
                <GlassCard variant="medium" hover="none" className="p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-(--accent-amber)" aria-hidden="true" />
                    <h2
                      id="consent-dialog-title"
                      className="font-heading text-lg font-bold text-(--text-heading)"
                    >
                      Save Analysis
                    </h2>
                  </div>

                  <p className="text-sm text-(--text-body)">
                    Your analysis results will be encrypted and stored on our servers. Your raw
                    genetic files are never uploaded — only the processed results.
                  </p>
                  <p className="mt-2 text-sm text-(--text-muted)">
                    You can delete your saved analyses at any time from your account. See our{' '}
                    <Link
                      href="/legal#privacy"
                      className="font-medium text-(--accent-teal) underline hover:no-underline"
                    >
                      Privacy Policy
                    </Link>{' '}
                    for details.
                  </p>

                  <div className="mt-6 flex gap-3">
                    <Button variant="primary" size="md" onClick={handleConsent} className="flex-1">
                      I Understand
                    </Button>
                    <Button variant="ghost" size="md" onClick={handleConsentCancel}>
                      Cancel
                    </Button>
                  </div>
                </GlassCard>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs"
            onClick={handleSaveBackdropClick}
            role="presentation"
          >
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mx-4 w-full max-w-md"
            >
              <div
                ref={saveDialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="save-dialog-title"
                tabIndex={-1}
                className="outline-hidden"
              >
                <GlassCard variant="medium" hover="none" className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2
                      id="save-dialog-title"
                      className="font-heading text-lg font-bold text-(--text-heading)"
                    >
                      Save Analysis
                    </h2>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-lg p-1 text-(--text-muted) transition-colors hover:bg-[rgba(6,214,160,0.06)] hover:text-(--text-primary)"
                      aria-label="Close save dialog"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <Input
                    ref={inputRef}
                    label="Analysis Label"
                    placeholder="e.g., Our First Analysis"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    maxLength={255}
                  />

                  {tierLimitText && (
                    <p className="mt-2 text-xs text-(--text-muted)">{tierLimitText}</p>
                  )}

                  {/* Save error */}
                  <AnimatePresence mode="wait">
                    {saveError && (
                      <m.div
                        key="save-error"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mt-3 rounded-xl border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-sm text-(--accent-rose)"
                        role="alert"
                      >
                        {saveError}
                      </m.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-5 flex gap-3">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleSave}
                      isLoading={isSaving}
                      disabled={!label.trim()}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                    <Button variant="ghost" size="md" onClick={handleClose} disabled={isSaving}>
                      Cancel
                    </Button>
                  </div>
                </GlassCard>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
