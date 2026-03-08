import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SubscriptionContent } from './_components/subscription-content';

export const metadata: Metadata = {
  title: 'My Plan | Mergenix',
  description:
    'Manage your Mergenix plan, view payment history, and upgrade to unlock more genetic analysis features.',
};

function SubscriptionSkeleton() {
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-2xl animate-pulse space-y-6">
      <span className="sr-only">Loading...</span>
      <div className="rounded-glass h-10 bg-(--bg-elevated)" />
      <div className="rounded-glass h-40 bg-(--bg-elevated)" />
      <div className="rounded-glass h-32 bg-(--bg-elevated)" />
      <div className="rounded-glass h-24 bg-(--bg-elevated)" />
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
