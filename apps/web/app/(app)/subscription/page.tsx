import { Suspense } from "react";
import type { Metadata } from "next";
import { SubscriptionContent } from "./_components/subscription-content";

export const metadata: Metadata = {
  title: "My Plan | Mergenix",
  description:
    "Manage your Mergenix plan, view payment history, and upgrade to unlock more genetic analysis features.",
};

function SubscriptionSkeleton() {
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-2xl animate-pulse space-y-6">
      <span className="sr-only">Loading...</span>
      <div className="h-10 rounded-[20px] bg-[var(--bg-elevated)]" />
      <div className="h-40 rounded-[20px] bg-[var(--bg-elevated)]" />
      <div className="h-32 rounded-[20px] bg-[var(--bg-elevated)]" />
      <div className="h-24 rounded-[20px] bg-[var(--bg-elevated)]" />
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<SubscriptionSkeleton />}>
      <SubscriptionContent />
    </Suspense>
  );
}
