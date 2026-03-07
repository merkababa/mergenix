'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLegalStore } from '@/lib/stores/legal-store';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { COOKIE_CONSENT_KEY } from '@/lib/constants/legal';
import { safeLocalStorageGet } from '@/lib/utils/safe-storage';

// ── Constants (hoisted outside component) ────────────────────────────────

const slideUpVariants = {
  hidden: { opacity: 0, y: 80 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
  exit: {
    opacity: 0,
    y: 80,
    transition: { duration: 0.25, ease: 'easeIn' as const },
  },
};

// ── Helpers (hoisted) ────────────────────────────────────────────────────

function hasExistingConsent(): boolean {
  return safeLocalStorageGet(COOKIE_CONSENT_KEY) !== null;
}

// ── Sub-component: Cookie Category Toggle ────────────────────────────────

interface CategoryToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  ariaLabel: string;
  onToggle: () => void;
}

function CategoryToggle({ label, description, enabled, ariaLabel, onToggle }: CategoryToggleProps) {
  return (
    /* min-h-[44px] + py-1.5 ensures the touch target meets WCAG 2.5.5 (44×44px minimum) */
    <div className="flex min-h-[44px] items-center justify-between py-1.5" data-touch-target="true">
      <div>
        <span className="text-(--text-heading) text-sm font-medium">{label}</span>
        <p className="text-(--text-muted) text-xs">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={ariaLabel}
        onClick={onToggle}
        className={`focus-visible:outline-hidden focus-visible:ring-(--accent-teal) relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-1 ${
          enabled ? 'bg-(--accent-teal)' : 'bg-(--border-subtle)'
        }`}
      >
        <span
          className={`shadow-xs inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
            enabled ? 'translate-x-[22px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analyticsToggle, setAnalyticsToggle] = useState(false);
  const [marketingToggle, setMarketingToggle] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  const acceptAllCookies = useLegalStore((s) => s.acceptAllCookies);
  const acceptEssentialOnly = useLegalStore((s) => s.acceptEssentialOnly);
  const updateCookiePrefs = useLegalStore((s) => s.updateCookiePrefs);

  // Focus trap: keep keyboard focus within the banner while it's visible
  useFocusTrap(bannerRef, isVisible, true);

  // Show banner on first visit only
  useEffect(() => {
    if (!hasExistingConsent()) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = useCallback(async () => {
    setIsVisible(false);
    try {
      await acceptAllCookies();
    } catch {
      // Banner already closed — API failure is non-critical
    }
  }, [acceptAllCookies]);

  const handleEssentialOnly = useCallback(async () => {
    setIsVisible(false);
    try {
      await acceptEssentialOnly();
    } catch {
      // Banner already closed — API failure is non-critical
    }
  }, [acceptEssentialOnly]);

  const handleCustomize = useCallback(() => {
    setShowCustomize((prev) => !prev);
  }, []);

  const handleSaveCustom = useCallback(async () => {
    setIsVisible(false);
    try {
      await updateCookiePrefs(analyticsToggle, marketingToggle);
    } catch {
      // Banner already closed — API failure is non-critical
    }
  }, [analyticsToggle, marketingToggle, updateCookiePrefs]);

  const handleToggleAnalytics = useCallback(() => {
    setAnalyticsToggle((prev) => !prev);
  }, []);

  const handleToggleMarketing = useCallback(() => {
    setMarketingToggle((prev) => !prev);
  }, []);

  const handleDismiss = useCallback(async () => {
    setIsVisible(false);
    try {
      await acceptEssentialOnly();
    } catch {
      // Banner already closed — API failure is non-critical
    }
  }, [acceptEssentialOnly]);

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          variants={slideUpVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
        >
          <div
            ref={bannerRef}
            role="dialog"
            aria-label="Cookie consent"
            aria-describedby="cookie-consent-description"
            className="border-(--glass-border) bg-(--bg-glass) mx-auto max-w-3xl rounded-2xl border p-5 shadow-[0_-4px_30px_var(--shadow-ambient)] [-webkit-backdrop-filter:blur(var(--glass-blur))] [backdrop-filter:blur(var(--glass-blur))]"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(6,214,160,0.1)]">
                <Cookie className="text-(--accent-amber) h-5 w-5" aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-(--text-heading) text-base font-semibold">
                  Cookie Preferences
                </h2>
                <p id="cookie-consent-description" className="text-(--text-muted) mt-1 text-sm">
                  We use essential cookies for authentication and theme preferences. You can
                  optionally enable analytics or marketing cookies — all non-essential cookies are
                  off by default.
                </p>

                {/* Customize panel */}
                <AnimatePresence>
                  {showCustomize && (
                    <m.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        id="cookie-customize-panel"
                        className="border-(--border-subtle) bg-(--bg-elevated) mt-4 space-y-3 rounded-xl border p-4"
                      >
                        {/* Essential cookies — always on, non-toggleable */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-(--text-heading) text-sm font-medium">
                              Essential Cookies
                            </span>
                            <p className="text-(--text-muted) text-xs">
                              Authentication, theme, consent storage
                            </p>
                          </div>
                          <span className="text-(--accent-teal) rounded-full bg-[rgba(6,214,160,0.15)] px-2.5 py-0.5 text-xs font-medium">
                            Always on
                          </span>
                        </div>

                        {/* Analytics cookies — toggleable, default OFF */}
                        <CategoryToggle
                          label="Analytics Cookies"
                          description="Anonymous usage data, no genetic info"
                          enabled={analyticsToggle}
                          ariaLabel="Enable analytics cookies"
                          onToggle={handleToggleAnalytics}
                        />

                        {/* Marketing cookies — toggleable, default OFF */}
                        <CategoryToggle
                          label="Marketing Cookies"
                          description="Personalized product updates, opt-in only"
                          enabled={marketingToggle}
                          ariaLabel="Enable marketing cookies"
                          onToggle={handleToggleMarketing}
                        />
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>

                {/* Action buttons — equal visual weight, no dark patterns */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="primary" size="sm" onClick={handleAcceptAll}>
                    Accept All
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleEssentialOnly}>
                    Essential Only
                  </Button>
                  {showCustomize ? (
                    <Button variant="outline" size="sm" onClick={handleSaveCustom}>
                      Save Preferences
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCustomize}
                      aria-expanded={showCustomize}
                      aria-controls="cookie-customize-panel"
                    >
                      Customize
                    </Button>
                  )}
                </div>
              </div>

              {/* Dismiss button */}
              <button
                type="button"
                onClick={handleDismiss}
                className="text-(--text-muted) hover:text-(--text-primary) flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(6,214,160,0.06)]"
                aria-label="Dismiss cookie banner"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
