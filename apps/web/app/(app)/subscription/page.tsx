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
      <div className="rounded-glass bg-(--bg-elevated) h-10" />
      <div className="rounded-glass bg-(--bg-elevated) h-40" />
      <div className="rounded-glass bg-(--bg-elevated) h-32" />
      <div className="rounded-glass bg-(--bg-elevated) h-24" />
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
