import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page Not Found | Mergenix',
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="rounded-glass border-(--border-subtle) bg-(--bg-elevated) w-full max-w-md border p-10 text-center shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <p
          className="font-heading text-(--accent-teal) text-7xl font-extrabold"
          aria-label="Error 404"
        >
          404
        </p>
        <h1 className="font-heading text-(--text-heading) mt-4 text-2xl font-bold">
          Page not found
        </h1>
        <p className="text-(--text-muted) mt-3 text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="bg-(--accent-teal) font-heading text-bio-deep inline-flex min-h-[44px] items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:shadow-[0_0_12px_var(--glow-teal)]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
