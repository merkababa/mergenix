"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import Link from "next/link";
import { FileDown, AlertCircle, RefreshCw, Lock } from "lucide-react";
import { usePdfExport } from "@/lib/pdf/use-pdf-export";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { FullAnalysisResult } from "@mergenix/shared-types";

interface PdfExportButtonProps {
  result: FullAnalysisResult;
}

/**
 * PDF export button for analysis results.
 *
 * - Pro-tier users: renders a "Download PDF" button that triggers PDF generation
 * - Free/premium users: shows an upgrade prompt directing to /subscription
 * - Displays progress during generation, error state with retry, and download link when ready
 */
export function PdfExportButton({ result }: PdfExportButtonProps) {
  const userTier = useAuthStore((s) => s.user?.tier ?? "free");
  const { isGenerating, progress, error, blobUrl, generatePdf, reset } =
    usePdfExport();

  // ── Non-pro users: show upgrade prompt ──────────────────────────────
  if (userTier !== "pro") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.04)] px-4 py-3">
        <Lock className="h-4 w-4 flex-shrink-0 text-[#8b5cf6]" aria-hidden="true" />
        <p className="flex-1 text-sm text-[var(--text-body)]">
          PDF export is available on the Pro plan.
        </p>
        <Link
          href="/subscription"
          className="text-sm font-medium text-[#8b5cf6] underline hover:text-[#7c3aed]"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-[var(--accent-rose)]" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>{error}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            generatePdf(result);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm font-medium text-[var(--text-body)] transition-colors hover:bg-[var(--bg-surface)]"
          aria-label="Retry PDF generation"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  // ── Download link (blob ready) ──────────────────────────────────────
  if (blobUrl) {
    return (
      <a
        href={blobUrl}
        download="mergenix-report.pdf"
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#06d6a0] to-[#059669] px-4 py-2 text-sm font-semibold text-[#050810] shadow-[0_2px_8px_rgba(6,214,160,0.25)] transition-all hover:shadow-[0_4px_16px_rgba(6,214,160,0.35)]"
        aria-label="Download PDF report"
      >
        <FileDown className="h-4 w-4" aria-hidden="true" />
        Download PDF
      </a>
    );
  }

  // ── Generating state ────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled
          aria-busy="true"
          aria-label="Generating PDF report"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-muted)] opacity-70"
        >
          <FileDown className="h-4 w-4 animate-pulse" aria-hidden="true" />
          Generating...
        </button>
        <div className="flex items-center gap-2">
          <div
            role="progressbar"
            aria-label="PDF generation progress"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 w-24 overflow-hidden rounded-full bg-[var(--bg-surface)]"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#06d6a0] to-[#059669] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-[var(--text-muted)]" aria-live="polite">{progress}%</span>
        </div>
      </div>
    );
  }

  // ── Idle state: Download PDF button ─────────────────────────────────
  return (
    <button
      type="button"
      onClick={() => generatePdf(result)}
      aria-label="Download PDF report"
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-body)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--accent-teal)]"
    >
      <FileDown className="h-4 w-4" aria-hidden="true" />
      Download PDF
    </button>
  );
}
