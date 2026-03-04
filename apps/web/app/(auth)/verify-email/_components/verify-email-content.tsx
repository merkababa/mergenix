"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { CheckCircle, XCircle, Mail, ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DnaDots } from "@/components/auth/dna-dots";
import { TrustSignals } from "@/components/auth/trust-signals";
import { useAuthStore } from "@/lib/stores/auth-store";
import { fadeUp } from "@/lib/animation-variants";

type VerifyState = "loading" | "success" | "error";

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>(token ? "loading" : "error");
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "No verification token found. Please check your email link.",
  );
  const hasRun = useRef(false);

  // Resend state (#8)
  const [resendEmail, setResendEmail] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendError, setResendError] = useState<string | null>(null);

  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const resendVerification = useAuthStore((s) => s.resendVerification);

  useEffect(() => {
    if (!token || hasRun.current) return;
    hasRun.current = true;

    verifyEmail(token)
      .then(() => setState("success"))
      .catch((err: unknown) => {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Verification failed. The link may have expired.",
        );
        setState("error");
      });
  }, [token, verifyEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Resend verification handler (#8)
  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || !resendEmail) return;
    setResendError(null);
    try {
      await resendVerification(resendEmail);
      setResendSent(true);
      setResendCooldown(60);
    } catch {
      // Anti-enumeration: show success regardless
      setResendSent(true);
      setResendCooldown(60);
    }
  }, [resendCooldown, resendEmail, resendVerification]);

  return (
    <>
      <m.div variants={fadeUp} initial="hidden" animate="visible">
        {/* GlassCard variant="strong" with glow-pulse (#6) */}
        <GlassCard variant="strong" hover="none" className="glow-pulse w-full max-w-md p-8">
          <AnimatePresence mode="wait">
            {state === "loading" && (
              <m.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="py-8 text-center"
                role="status"
                aria-live="polite"
              >
                {/* DNA helix loading — reusable component (#1), removed Loader2 (#10) */}
                <DnaDots />
                <h1 className="font-heading text-xl font-bold text-[var(--text-primary)]">
                  Verifying your email...
                </h1>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  This will only take a moment.
                </p>
              </m.div>
            )}

            {state === "success" && (
              <m.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="py-4 text-center"
              >
                <m.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring" as const,
                    stiffness: 300,
                    damping: 15,
                    delay: 0.1,
                  }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(6,214,160,0.1)]"
                >
                  <CheckCircle className="h-9 w-9 text-[var(--accent-teal)]" />
                </m.div>
                <h1 className="gradient-text font-heading text-2xl font-extrabold">
                  Email Verified!
                </h1>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  Your email address has been confirmed. You can now sign in to
                  your account.
                </p>
                <div className="mt-6">
                  <Link href="/login" className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}>
                    Continue to Sign In
                  </Link>
                </div>
              </m.div>
            )}

            {state === "error" && (
              <m.div
                key="error"
                role="alert"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="py-4 text-center"
              >
                <m.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring" as const,
                    stiffness: 300,
                    damping: 15,
                    delay: 0.1,
                  }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(244,63,94,0.1)]"
                >
                  <XCircle className="h-9 w-9 text-[var(--accent-rose)]" />
                </m.div>
                <h1 className="font-heading text-2xl font-extrabold text-[var(--text-primary)]">
                  Verification Failed
                </h1>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  {errorMessage}
                </p>

                {/* Resend verification — email input instead of /register link (#8) */}
                <div className="mt-6 space-y-3 text-left">
                  <p className="text-center text-xs text-[var(--text-dim)]">
                    Enter your email to resend the verification link:
                  </p>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    aria-label="Email address"
                    icon={<Mail className="h-4 w-4" />}
                    autoComplete="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                  />
                  {resendError && (
                    <p className="text-xs text-[var(--accent-rose)]">{resendError}</p>
                  )}
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={handleResend}
                    disabled={!resendEmail || resendCooldown > 0}
                  >
                    <Mail className="h-4 w-4" />
                    {resendCooldown > 0
                      ? `Resend (${resendCooldown}s)`
                      : resendSent
                        ? "Link Sent"
                        : "Resend Verification Email"}
                  </Button>
                  {/* Touch target padding (#16) */}
                  <div className="text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1 py-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent-teal)]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Login
                    </Link>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </m.div>

      {/* Trust footer — reusable component */}
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
