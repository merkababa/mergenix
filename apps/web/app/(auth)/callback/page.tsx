import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CallbackContent } from './_components/callback-content';

export const metadata: Metadata = {
  title: 'Signing In... | Mergenix',
  description: 'Completing your Mergenix sign-in.',
};

function AuthSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md animate-pulse">
      <div className="rounded-glass h-[280px] bg-(--bg-elevated)" />
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <CallbackContent />
    </Suspense>
  );
}
