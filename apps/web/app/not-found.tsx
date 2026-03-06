import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found | Mergenix",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-glass border border-(--border-subtle) bg-(--bg-elevated) p-10 text-center shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <p
          className="font-heading text-7xl font-extrabold text-(--accent-teal)"
          aria-label="Error 404"
        >
          404
        </p>
        <h1 className="mt-4 font-heading text-2xl font-bold text-(--text-heading)">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-(--text-muted)">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-(--accent-teal) px-6 py-3 font-heading text-sm font-semibold text-bio-deep transition-all hover:shadow-[0_0_12px_var(--glow-teal)]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
