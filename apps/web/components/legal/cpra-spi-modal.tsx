'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { X, Shield } from 'lucide-react';
import { CPRA_SPI_NOTICE } from '@/lib/constants/legal-placeholders';
import { useFocusTrap } from '@/hooks/use-focus-trap';

// ── Types ─────────────────────────────────────────────────────────────────

interface CpraSpiModalProps {
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────

/**
 * CPRA Sensitive Personal Information (SPI) notice modal.
 *
 * Required by the California Privacy Rights Act (CPRA) for businesses
 * that process sensitive personal information. Genetic data is classified
 * as SPI under CPRA. This modal explains that Mergenix already limits
 * the use of SPI to the minimum necessary by default.
 *
 * Shown when the user clicks "Limit the Use of My Sensitive Personal
 * Information" in the footer.
 */
export function CpraSpiModal({ onClose }: CpraSpiModalProps) {
  const titleId = useId();
  const descId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap: keeps Tab/Shift+Tab within the modal (WCAG 2.1.2)
  useFocusTrap(modalRef, true, true);

  // Move focus into the modal on mount; restore on unmount via useFocusTrap
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    const firstFocusable = modal.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (firstFocusable) {
      firstFocusable.focus();
    } else {
      modal.focus();
    }
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 [-webkit-backdrop-filter:blur(4px)] [backdrop-filter:blur(4px)]"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      {/* Modal panel */}
      <div
        ref={modalRef}
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-modal="true"
        tabIndex={-1}
        className="border-(--glass-border) bg-(--bg-glass) focus-visible:outline-hidden relative mx-auto max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl [-webkit-backdrop-filter:blur(var(--glass-blur))] [backdrop-filter:blur(var(--glass-blur))]"
      >
        {/* Header */}
        <div className="border-(--border-subtle) flex items-start gap-3 border-b p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(6,214,160,0.1)]">
            <Shield className="text-(--accent-teal) h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-heading text-(--text-heading) text-base font-semibold">
              Limit the Use of My Sensitive Personal Information
            </h2>
            <p className="text-(--text-muted) mt-0.5 text-xs">
              California Privacy Rights Act (CPRA)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close SPI notice"
            className="text-(--text-muted) hover:text-(--text-primary) focus-visible:outline-hidden focus-visible:ring-(--accent-teal) flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(6,214,160,0.06)] focus-visible:ring-2 focus-visible:ring-offset-1"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div id={descId} className="max-h-[calc(90vh-5rem)] overflow-y-auto p-5">
          <div className="text-(--text-body) space-y-3 text-sm leading-relaxed">
            {CPRA_SPI_NOTICE.split('\n\n').map((paragraph, idx) => {
              // Render the first paragraph (title) as a heading
              if (idx === 0) {
                return null; // title is in the header
              }
              // Bullet-point paragraphs
              if (paragraph.startsWith('•')) {
                const lines = paragraph.split('\n');
                return (
                  <ul key={idx} className="space-y-1 pl-1">
                    {lines.map((line, lineIdx) => (
                      <li
                        key={lineIdx}
                        className="text-(--text-body) flex items-start gap-2 text-sm"
                      >
                        {line.startsWith('•') ? (
                          <>
                            <span
                              className="bg-(--accent-teal) mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                              aria-hidden="true"
                            />
                            <span>{line.replace(/^•\s*/, '')}</span>
                          </>
                        ) : (
                          <span className="pl-3.5">{line}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="text-(--text-body) text-sm leading-relaxed">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
