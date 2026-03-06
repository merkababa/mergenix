import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyEmailContent } from "./_components/verify-email-content";

export const metadata: Metadata = {
  title: "Verify Email | Mergenix",
  description: "Verify your Mergenix email address.",
};

function AuthSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md animate-pulse">
      <div className="h-[320px] rounded-glass bg-(--bg-elevated)" />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
