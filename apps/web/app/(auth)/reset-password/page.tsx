import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordContent } from './_components/reset-password-content';

export const metadata: Metadata = {
  title: 'Reset Password | Mergenix',
  description: 'Set a new password for your Mergenix account.',
};

function AuthSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md animate-pulse">
      <div className="rounded-glass bg-(--bg-elevated) h-[520px]" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
