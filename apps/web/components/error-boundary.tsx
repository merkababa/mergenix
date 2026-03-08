'use client';

import React from 'react';
import { getErrorMessage } from '@/lib/constants/error-messages';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Try to extract an error code from the Error object.
 * Supports `error.code` (custom property), or codes embedded as
 * `[CODE]` at the start of the message (e.g. "[FILE_TOO_LARGE] ...").
 */
function extractErrorCode(error: Error): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const code = (error as any).code;
  if (typeof code === 'string' && code.length > 0) return code;

  const match = error.message.match(/^\[([A-Z_]+)\]/);
  if (match) return match[1];

  return 'UNKNOWN_ERROR';
}

// ─── Error Boundary ──────────────────────────────────────────────────────────

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log in non-production environments only
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    // Notify custom handler
    this.props.onError?.(error, errorInfo);

    // Announce to screen readers via announcer store (async import, may not exist yet)
    void (async () => {
      try {
        const { useAnnouncerStore } = await import('@/lib/stores/announcer-store');
        const code = extractErrorCode(error);
        const msg = getErrorMessage(code);
        useAnnouncerStore.getState().announce(`Error: ${msg.title}. ${msg.message}`, 'assertive');
      } catch {
        /* announcer store not available yet */
      }
    })();
  }

  componentWillUnmount(): void {
    if (this.copyTimer) clearTimeout(this.copyTimer);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, copied: false });
  };

  private handleCopyDebugInfo = async () => {
    const { error } = this.state;
    if (!error) return;

    const code = extractErrorCode(error);
    const timestamp = new Date().toISOString();
    const browser = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

    const debugInfo = [
      `Error Code: ${code}`,
      `Timestamp: ${timestamp}`,
      `Browser: ${browser}`,
      `Error: ${process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message}`,
      process.env.NODE_ENV !== 'production' ? `Name: ${error.name}` : '',
      process.env.NODE_ENV !== 'production' && error.stack ? `Stack:\n${error.stack}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(debugInfo);
      this.setState({ copied: true });

      // Reset copied state after 2 seconds
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => {
        this.setState({ copied: false });
      }, 2000);

      // Announce to screen readers
      try {
        const { useAnnouncerStore } = await import('@/lib/stores/announcer-store');
        useAnnouncerStore.getState().announce('Debug information copied to clipboard', 'polite');
      } catch {
        /* announcer store not available */
      }
    } catch {
      /* clipboard API not available */
    }
  };

  render(): React.ReactNode {
    const { hasError, error, copied } = this.state;
    const { children, fallback } = this.props;

    if (!hasError || !error) {
      return children;
    }

    // Custom fallback (render prop or ReactNode)
    if (typeof fallback === 'function') {
      return fallback(error, this.handleReset);
    }
    if (fallback !== undefined) {
      return fallback;
    }

    // Look up user-friendly message
    const code = extractErrorCode(error);
    const errorMsg = getErrorMessage(code);

    // In development, append the raw error message
    const detail = process.env.NODE_ENV !== 'production' ? error.message : errorMsg.message;

    return (
      <div
        role="alert"
        aria-invalid="true"
        className="rounded-glass border border-(--border-subtle) bg-(--bg-elevated) p-6 text-center"
      >
        <h3 className="font-heading text-lg font-semibold text-(--text-primary)">
          {errorMsg.title}
        </h3>
        <p className="mt-2 text-sm text-(--text-muted)">{detail}</p>
        <p className="mt-1 text-xs text-(--text-muted)">{errorMsg.action}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="text-bio-deep rounded-xl bg-(--accent-teal) px-4 py-2 text-sm font-semibold transition-all hover:shadow-[0_0_12px_var(--glow-teal)]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.handleCopyDebugInfo}
            className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) px-4 py-2 text-sm font-medium text-(--text-muted) transition-all hover:border-[rgba(6,214,160,0.3)] hover:text-(--text-primary)"
          >
            {copied ? 'Copied!' : 'Copy debug info'}
          </button>
        </div>
      </div>
    );
  }
}
