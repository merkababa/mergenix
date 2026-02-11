import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginContent } from "./_components/login-content";

export const metadata: Metadata = {
  title: "Sign In | Mergenix",
  description:
    "Sign in to Mergenix to access your genetic offspring analysis, carrier reports, and trait predictions.",
  openGraph: {
    title: "Sign In | Mergenix",
    description:
      "Sign in to access your genetic analysis dashboard.",
    type: "website",
    siteName: "Mergenix",
  },
  twitter: {
    card: "summary",
    title: "Sign In | Mergenix",
    description:
      "Sign in to access your genetic analysis dashboard.",
  },
};

function AuthSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md animate-pulse space-y-4">
      <div className="h-[480px] rounded-[20px] bg-[var(--bg-elevated)]" />
      <div className="h-16 rounded-[20px] bg-[var(--bg-elevated)]" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}
