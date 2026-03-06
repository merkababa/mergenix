"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "motion/react";
import { Mail, ChevronRight, ArrowLeft, CheckCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DnaDots } from "@/components/auth/dna-dots";
import { TrustSignals } from "@/components/auth/trust-signals";
import { useAuthStore } from "@/lib/stores/auth-store";
import { fadeUp } from "@/lib/animation-variants";

export function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearError();
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      // Anti-enumeration: show success even on most errors.
      // The store already surfaced the error; only keep it for rate-limit.
      if (error?.toLowerCase().includes("rate")) return;
      setSent(true);
    }
  }

  return (
    <>
      <m.div variants={fadeUp} initial="hidden" animate="visible">
        {/* GlassCard variant="strong" with glow-pulse (#6) */}
        <GlassCard variant="strong" hover="none" className="glow-pulse w-full max-w-md p-8">
          <AnimatePresence mode="wait">
            {!sent ? (
              <m.div
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                {/* DNA dots — reusable component */}
                <DnaDots />

                {/* Icon */}
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(6,214,160,0.1)]">
                    <Mail className="h-7 w-7 text-(--accent-teal)" />
                  </div>
                  <h1 className="gradient-text font-heading text-2xl font-extrabold">
                    Forgot Password
                  </h1>
                  <p className="mt-2 text-sm text-(--text-muted)">
                    Enter your email address and we&apos;ll send you a link to
                    reset your password.
                  </p>
                </div>

                {/* Error banner (rate-limit only) */}
                <AnimatePresence mode="wait">
                  {error && (
                    <m.div
                      key="error"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mb-4 rounded-xl border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-sm text-(--accent-rose)"
                      role="alert"
                    >
                      {error}
                    </m.div>
                  )}
                </AnimatePresence>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    icon={<Mail className="h-4 w-4" />}
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                  >
                    Send Reset Link
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </form>

                {/* Back to Login — touch target padding (#16) */}
                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 py-2 text-sm text-(--text-muted) transition-colors hover:text-(--accent-teal)"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Login
                  </Link>
                </div>
              </m.div>
            ) : (
              <m.div
                key="success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {/* Success icon */}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(6,214,160,0.1)]">
                  <CheckCircle className="h-7 w-7 text-(--accent-teal)" aria-hidden="true" />
                </div>
                <h1 className="gradient-text font-heading text-2xl font-extrabold">
                  Check Your Email
                </h1>
                <p className="mt-3 text-sm text-(--text-muted)">
                  If an account exists with{" "}
                  <span className="font-medium text-(--text-primary)">
                    {email}
                  </span>
                  , we&apos;ve sent a password reset link.
                </p>
                <p className="mt-2 text-xs text-(--text-dim)">
                  Didn&apos;t get the email? Check your spam folder or try again
                  in a few minutes.
                </p>

                <div className="mt-6 space-y-3">
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full"
                    onClick={() => {
                      setSent(false);
                      clearError();
                    }}
                  >
                    Try a different email
                  </Button>
                  {/* Touch target padding (#16) */}
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 py-2 text-sm text-(--text-muted) transition-colors hover:text-(--accent-teal)"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Login
                  </Link>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </m.div>

      {/* Trust footer — reusable component (#3, #5) */}
      <m.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.15 }}
      >
        <TrustSignals />
      </m.div>
    </>
  );
}
