"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { XCircle, ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { DnaDots } from "@/components/auth/dna-dots";
import { TrustSignals } from "@/components/auth/trust-signals";
import { useAuthStore } from "@/lib/stores/auth-store";
import { fadeUp } from "@/lib/animation-variants";

type CallbackState = "loading" | "error";

export function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const [pageState, setPageState] = useState<CallbackState>(
    code && state ? "loading" : "error",
  );
  const [errorMessage, setErrorMessage] = useState(
    code && state
      ? ""
      : "Missing authorization parameters. Please try signing in again.",
  );
  const hasRun = useRef(false);

  const googleCallback = useAuthStore((s) => s.googleCallback);

  useEffect(() => {
    if (!code || !state || hasRun.current) return;
    hasRun.current = true;

    googleCallback(code, state)
      .then(() => {
        router.replace("/account");
      })
      .catch((err: unknown) => {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Sign in failed. Please try again.",
        );
        setPageState("error");
      });
  }, [code, state, googleCallback, router]);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        {/* GlassCard variant="strong" with glow-pulse (#6) */}
        <GlassCard variant="strong" hover="none" className="glow-pulse w-full max-w-md p-8">
          <AnimatePresence mode="wait">
            {pageState === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="py-12 text-center"
              >
                {/* DNA dots — reusable component (#1), removed Loader2 (#10) */}
                <DnaDots />
                <h2 className="font-heading text-xl font-bold text-[var(--text-primary)]">
                  Completing sign in...
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Please wait while we verify your account.
                </p>
              </motion.div>
            )}

            {pageState === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="py-4 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                    delay: 0.1,
                  }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(244,63,94,0.1)]"
                >
                  <XCircle className="h-9 w-9 text-[var(--accent-rose)]" />
                </motion.div>
                <h2 className="font-heading text-2xl font-extrabold text-[var(--text-primary)]">
                  Sign In Failed
                </h2>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  {errorMessage}
                </p>
                <div className="mt-6 space-y-3">
                  <Link href="/login">
                    <Button variant="primary" size="lg" className="w-full">
                      Try Again
                    </Button>
                  </Link>
                  {/* Touch target padding (#16) */}
                  <div>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1 py-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent-teal)]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Home
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* Trust footer — reusable component */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.15 }}
      >
        <TrustSignals />
      </motion.div>
    </MotionConfig>
  );
}
