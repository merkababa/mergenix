"use client";

import { useEffect } from "react";
import { sora, lexend } from "@/lib/fonts";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[GlobalError] Root layout error:", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        className={`${sora.variable} ${lexend.variable} min-h-screen bg-bio-deep antialiased`}
        style={{ fontFamily: "var(--font-lexend), sans-serif" }}
      >
        <div className="flex min-h-screen items-center justify-center p-4">
          <main
            role="alert"
            className="w-full max-w-md rounded-glass border border-[rgba(148,163,184,0.15)] bg-[rgba(255,255,255,0.04)] p-10 text-center"
            style={{ backdropFilter: "blur(12px)" }}
          >
            <h1
              className="font-heading text-2xl font-bold"
              style={{ color: "#e2e8f0", fontFamily: "var(--font-sora, sans-serif)" }}
            >
              Something went wrong
            </h1>
            <p className="mt-3 text-sm" style={{ color: "#94a3b8" }}>
              A critical error occurred. Please try again.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={reset}
                className="min-h-[44px] rounded-xl px-6 py-3 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: "#06d6a0",
                  color: "#050810",
                  fontFamily: "var(--font-sora, sans-serif)",
                }}
              >
                Try again
              </button>
              <a
                href="/"
                className="min-h-[44px] rounded-xl px-6 py-3 text-sm font-medium transition-all"
                style={{
                  color: "#94a3b8",
                  border: "1px solid rgba(148,163,184,0.15)",
                  fontFamily: "var(--font-sora, sans-serif)",
                }}
              >
                Back to Home
              </a>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
