'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import * as legalClient from '@/lib/api/legal-client';

// ── Constants (hoisted outside component) ────────────────────────────────

type ExportState = 'idle' | 'loading' | 'success' | 'error';

// ── Component ────────────────────────────────────────────────────────────

export function DataExportCard() {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  // Clean up blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const handleExport = useCallback(async () => {
    // Clean up any previous blob URL
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    setExportState('loading');
    setErrorMessage(null);

    try {
      const blob = await legalClient.exportData();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setExportState('success');

      // Trigger download automatically
      requestAnimationFrame(() => {
        downloadRef.current?.click();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export data';
      setErrorMessage(message);
      setExportState('error');
    }
  }, [downloadUrl]);

  const handleRetry = useCallback(() => {
    setExportState('idle');
    setErrorMessage(null);
  }, []);

  return (
    <GlassCard variant="medium" hover="none" className="p-7">
      <div className="mb-4 flex items-center gap-3">
        <Download className="h-5 w-5 text-(--accent-teal)" aria-hidden="true" />
        <h3 className="font-heading text-lg font-semibold text-(--text-heading)">
          Export Your Data
        </h3>
      </div>

      <p className="mb-5 text-sm text-(--text-muted)">
        Download a copy of all your personal data in JSON format. This includes your profile,
        consent records, and payment history. Your genetic data is never stored on our servers.
      </p>

      {/* Export button — stays mounted to preserve focus during loading */}
      {(exportState === 'idle' || exportState === 'loading') && (
        <Button
          variant="outline"
          size="md"
          onClick={handleExport}
          disabled={exportState === 'loading'}
        >
          {exportState === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Preparing your data...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export as JSON
            </>
          )}
        </Button>
      )}

      {/* Loading status announcement for screen readers */}
      {exportState === 'loading' && (
        <p role="status" aria-live="polite" className="sr-only">
          Preparing your data export...
        </p>
      )}

      {/* Success state */}
      {exportState === 'success' && downloadUrl && (
        <div className="space-y-3">
          <div
            className="flex items-center gap-2 text-sm text-(--accent-teal)"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Export ready!</span>
          </div>
          <a
            ref={downloadRef}
            href={downloadUrl}
            download="mergenix-data-export.json"
            className="inline-flex items-center gap-2 rounded-[10px] border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.08)] px-4 py-2 text-sm font-medium text-(--accent-teal) transition-colors hover:border-[rgba(6,214,160,0.4)] hover:bg-[rgba(6,214,160,0.15)]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download mergenix-data-export.json
          </a>
        </div>
      )}

      {/* Error state */}
      {exportState === 'error' && (
        <div className="space-y-3">
          <div
            className="flex items-center gap-2 rounded-xl border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-sm text-(--accent-rose)"
            role="alert"
            aria-live="assertive"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage ?? 'Export failed. Please try again.'}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try Again
          </Button>
        </div>
      )}
    </GlassCard>
  );
}
