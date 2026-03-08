import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RegisterContent } from './_components/register-content';

export const metadata: Metadata = {
  title: 'Create Account | Mergenix',
  description:
    'Create your free Mergenix account to start analyzing genetic traits and predicting offspring insights.',
};

function AuthSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md animate-pulse space-y-4">
      <div className="rounded-glass h-[680px] bg-(--bg-elevated)" />
      <div className="rounded-glass h-16 bg-(--bg-elevated)" />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <RegisterContent />
    </Suspense>
  );
}
