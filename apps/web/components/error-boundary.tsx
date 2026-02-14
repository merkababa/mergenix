"use client";

import React from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?:
    | React.ReactNode
    | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ─── Error Boundary ──────────────────────────────────────────────────────────

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log in non-production environments only
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    }

    // Notify custom handler
    this.props.onError?.(error, errorInfo);

    // Announce to screen readers via announcer store (async import, may not exist yet)
    void (async () => {
      try {
        const { useAnnouncerStore } = await import(
          "@/lib/stores/announcer-store"
        );
        const announcerMessage =
          process.env.NODE_ENV === "production"
            ? "An unexpected error occurred."
            : `Error: ${error.message}`;
        useAnnouncerStore
          .getState()
          .announce(announcerMessage, "assertive");
      } catch {
        /* announcer store not available yet */
      }
    })();
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleCopyDebugInfo = async () => {
    const { error } = this.state;
    if (!error) return;

    const debugInfo = [
      `Error: ${process.env.NODE_ENV === "production" ? "An unexpected error occurred" : error.message}`,
      process.env.NODE_ENV !== "production" ? `Name: ${error.name}` : "",
      process.env.NODE_ENV !== "production" && error.stack ? `Stack:\n${error.stack}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(debugInfo);
    } catch {
      /* clipboard API not available */
    }
  };

  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError || !error) {
      return children;
    }

    // Custom fallback (render prop or ReactNode)
    if (typeof fallback === "function") {
      return fallback(error, this.handleReset);
    }
    if (fallback !== undefined) {
      return fallback;
    }

    // Default fallback UI
    const displayMessage =
      process.env.NODE_ENV !== "production"
        ? error.message
        : "An unexpected error occurred.";

    return (
      <div
        role="alert"
        className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 text-center"
      >
        <h3 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
          Something went wrong
        </h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {displayMessage}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-xl bg-[var(--accent-teal)] px-4 py-2 text-sm font-semibold text-[#050810] transition-all hover:shadow-[0_0_12px_var(--glow-teal)]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.handleCopyDebugInfo}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-muted)] transition-all hover:border-[rgba(6,214,160,0.3)] hover:text-[var(--text-primary)]"
          >
            Copy debug info
          </button>
        </div>
      </div>
    );
  }
}
