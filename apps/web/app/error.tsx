"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorPage] Unhandled error:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div
        role="alert"
        className="w-full max-w-md rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-10 text-center shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
      >
        <h1 className="font-heading text-2xl font-bold text-[var(--text-heading)]">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          An unexpected error occurred. Please try again or return to the home page.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="min-h-[44px] rounded-xl bg-[var(--accent-teal)] px-6 py-3 font-heading text-sm font-semibold text-[#050810] transition-all hover:shadow-[0_0_12px_var(--glow-teal)]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="min-h-[44px] rounded-xl border border-[var(--border-subtle)] px-6 py-3 font-heading text-sm font-medium text-[var(--text-muted)] transition-all hover:border-[rgba(6,214,160,0.3)] hover:text-[var(--text-primary)]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
