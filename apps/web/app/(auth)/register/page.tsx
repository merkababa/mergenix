import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterContent } from "./_components/register-content";

export const metadata: Metadata = {
  title: "Create Account | Mergenix",
  description:
    "Create your free Mergenix account to start analyzing genetic compatibility and predicting offspring traits.",
};

function AuthSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md animate-pulse space-y-4">
      <div className="h-[680px] rounded-[20px] bg-[var(--bg-elevated)]" />
      <div className="h-16 rounded-[20px] bg-[var(--bg-elevated)]" />
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
