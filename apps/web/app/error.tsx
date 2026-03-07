'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorPage] Unhandled error:', error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div
        role="alert"
        className="rounded-glass border-(--border-subtle) bg-(--bg-elevated) w-full max-w-md border p-10 text-center shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
      >
        <h1 className="font-heading text-(--text-heading) text-2xl font-bold">
          Something went wrong
        </h1>
        <p className="text-(--text-muted) mt-3 text-sm">
          An unexpected error occurred. Please try again or return to the home page.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="bg-(--accent-teal) font-heading text-bio-deep min-h-[44px] rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:shadow-[0_0_12px_var(--glow-teal)]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border-(--border-subtle) font-heading text-(--text-muted) hover:text-(--text-primary) min-h-[44px] rounded-xl border px-6 py-3 text-sm font-medium transition-all hover:border-[rgba(6,214,160,0.3)]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
