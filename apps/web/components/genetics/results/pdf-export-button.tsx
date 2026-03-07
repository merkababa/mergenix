'use client';

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import Link from 'next/link';
import { FileDown, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { usePdfExport } from '@/lib/pdf/use-pdf-export';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { FullAnalysisResult } from '@mergenix/shared-types';

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
  const userTier = useAuthStore((s) => s.user?.tier ?? 'free');
  const { isGenerating, progress, error, blobUrl, generatePdf, reset } = usePdfExport();

  // ── Non-pro users: show upgrade prompt ──────────────────────────────
  if (userTier !== 'pro') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.04)] px-4 py-3">
        <Lock className="text-accent-violet h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-(--text-body) flex-1 text-sm">
          PDF export is available on the Pro plan.
        </p>
        <Link
          href="/subscription"
          className="text-accent-violet hover:text-day-accent-violet text-sm font-medium underline"
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
        <div className="text-(--accent-rose) flex items-center gap-2 text-sm" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>{error}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            generatePdf(result);
          }}
          className="border-(--border-subtle) bg-(--bg-elevated) text-(--text-body) hover:bg-(--bg-surface) inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
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
        className="bg-linear-to-r from-accent-teal to-day-accent-teal text-bio-deep inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-[0_2px_8px_rgba(6,214,160,0.25)] transition-all hover:shadow-[0_4px_16px_rgba(6,214,160,0.35)]"
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
          className="border-(--border-subtle) bg-(--bg-elevated) text-(--text-muted) inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium opacity-70"
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
            className="bg-(--bg-surface) h-2 w-24 overflow-hidden rounded-full"
          >
            <div
              className="bg-linear-to-r from-accent-teal to-day-accent-teal h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-(--text-muted) text-xs" aria-live="polite">
            {progress}%
          </span>
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
      className="border-(--border-subtle) bg-(--bg-elevated) text-(--text-body) hover:bg-(--bg-surface) hover:text-(--accent-teal) inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
    >
      <FileDown className="h-4 w-4" aria-hidden="true" />
      Download PDF
    </button>
  );
}
