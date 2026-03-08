'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'mergenix-high-contrast';

interface HighContrastToggleProps {
  className?: string;
}

export const HighContrastToggle = memo(function HighContrastToggle({
  className,
}: HighContrastToggleProps) {
  const [enabled, setEnabled] = useState(false);

  // On mount, restore preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setEnabled(true);
    } catch {
      // localStorage unavailable (SSR, private browsing) — ignore
    }
  }, []);

  // Sync side effects (DOM attribute + localStorage) with state
  useEffect(() => {
    if (enabled) {
      document.documentElement.setAttribute('data-contrast', 'high');
    } else {
      document.documentElement.removeAttribute('data-contrast');
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // localStorage unavailable — ignore
    }
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
        enabled
          ? 'border-(--accent-teal) bg-[rgba(6,214,160,0.1)] text-(--accent-teal)'
          : 'border-(--border-subtle) text-(--text-muted) hover:border-(--accent-teal) hover:text-(--accent-teal)',
        className,
      )}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
      </svg>
      High Contrast
    </button>
  );
});
