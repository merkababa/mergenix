"use client";

import { memo, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { m, AnimatePresence } from "motion/react";
import { Archive, Trash2, Download, Clock, FileText, Crown } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useAnalysisStore } from "@/lib/stores/analysis-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { AnalysisListItem } from "@/lib/api/analysis-client";

// ── Helpers (hoisted) ──────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
}

const SKELETON_IDS = [1, 2, 3] as const;

// ── SavedResultItem (extracted + memoized) ────────────────────────────────

interface SavedResultItemProps {
  result: AnalysisListItem;
  onLoad: (id: string) => void;
  onDeleteClick: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
  isConfirming: boolean;
  isDeleting: boolean;
  isAnyLoading: boolean;
  isAnyDeleting: boolean;
  loadingId: string | null;
}

const SavedResultItem = memo(function SavedResultItem({
  result,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  isConfirming,
  isDeleting,
  isAnyLoading,
  isAnyDeleting,
}: SavedResultItemProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // When confirmation buttons appear, auto-focus the "No" (cancel) button
  useEffect(() => {
    if (isConfirming) {
      requestAnimationFrame(() => {
        cancelButtonRef.current?.focus();
      });
    }
  }, [isConfirming]);

  const handleCancelDelete = useCallback(() => {
    onDeleteCancel();
    // Restore focus to the trash icon button after cancel
    requestAnimationFrame(() => {
      deleteButtonRef.current?.focus();
    });
  }, [onDeleteCancel]);

  return (
    <m.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(6,214,160,0.1)]">
          <FileText className="h-4 w-4 text-[var(--accent-teal)]" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-semibold text-[var(--text-heading)]">
            {result.label}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--text-muted)]">
            <span>
              {result.parent1Filename} + {result.parent2Filename}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatRelativeTime(result.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {isConfirming ? (
            <>
              <span className="text-xs text-[var(--accent-rose)]">
                Delete?
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDeleteConfirm(result.id)}
                isLoading={isDeleting}
                disabled={isAnyDeleting}
                aria-label={`Confirm delete: ${result.label}`}
              >
                Yes
              </Button>
              <Button
                ref={cancelButtonRef}
                variant="ghost"
                size="sm"
                onClick={handleCancelDelete}
                disabled={isAnyDeleting}
                aria-label="Cancel delete"
              >
                No
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col items-end gap-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  aria-disabled="true"
                  aria-label={`Load analysis: ${result.label} (coming soon)`}
                >
                  <Download className="h-3.5 w-3.5" />
                  Load
                </Button>
                <span className="text-xs text-[var(--text-muted)]">Coming Soon</span>
              </div>
              <Button
                ref={deleteButtonRef}
                variant="ghost"
                size="sm"
                className="text-[var(--text-muted)] hover:text-[var(--accent-rose)]"
                onClick={() => onDeleteClick(result.id)}
                isLoading={isDeleting}
                disabled={isAnyLoading || isAnyDeleting}
                aria-label={`Delete analysis: ${result.label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </m.li>
  );
});

// ── Main Component ────────────────────────────────────────────────────────

export function SavedResultsList() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const savedResults = useAnalysisStore((s) => s.savedResults);
  const loadSavedResults = useAnalysisStore((s) => s.loadSavedResults);
  const loadSavedResult = useAnalysisStore((s) => s.loadSavedResult);
  const deleteSavedResult = useAnalysisStore((s) => s.deleteSavedResult);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userTier = useAuthStore((s) => s.user?.tier ?? "free");

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await loadSavedResults();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load saved analyses");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, loadSavedResults]);

  const handleLoad = useCallback(async (id: string) => {
    setLoadingId(id);
    setError(null);
    try {
      await loadSavedResult(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analysis");
    } finally {
      setLoadingId(null);
    }
  }, [loadSavedResult]);

  const handleDeleteClick = useCallback((id: string) => {
    setConfirmDeleteId(id);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  const handleDeleteConfirm = useCallback(async (id: string) => {
    setConfirmDeleteId(null);
    setDeletingId(id);
    setError(null);
    try {
      await deleteSavedResult(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete analysis");
    } finally {
      setDeletingId(null);
    }
  }, [deleteSavedResult]);

  const sortedResults = useMemo(
    () => [...savedResults].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    [savedResults],
  );

  if (!isAuthenticated) return null;

  return (
    <GlassCard variant="subtle" hover="none" className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <Archive className="h-5 w-5 text-[var(--accent-teal)]" aria-hidden="true" />
        <h2 className="font-heading text-lg font-bold text-[var(--text-heading)]">
          My Saved Analyses
        </h2>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3" aria-busy="true">
          <span className="sr-only" role="status">Loading saved analyses...</span>
          {SKELETON_IDS.map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[var(--border-subtle)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 rounded bg-[var(--border-subtle)]" />
                  <div className="h-3 w-48 rounded bg-[var(--border-subtle)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      <AnimatePresence mode="wait">
        {error && !isLoading && (
          <m.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 rounded-xl border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-sm text-[var(--accent-rose)]"
            role="alert"
          >
            {error}
          </m.div>
        )}
      </AnimatePresence>

      {/* Results list — semantic ul/li structure */}
      {!isLoading && !error && sortedResults.length > 0 && (
        <ul className="space-y-3" aria-live="polite" aria-label="Saved analyses">
          {sortedResults.map((result) => (
            <SavedResultItem
              key={result.id}
              result={result}
              onLoad={handleLoad}
              onDeleteClick={handleDeleteClick}
              onDeleteConfirm={handleDeleteConfirm}
              onDeleteCancel={handleDeleteCancel}
              isConfirming={confirmDeleteId === result.id}
              isDeleting={deletingId === result.id}
              isAnyLoading={loadingId !== null}
              isAnyDeleting={deletingId !== null}
              loadingId={loadingId}
            />
          ))}
        </ul>
      )}

      {/* Empty state */}
      {!isLoading && !error && sortedResults.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(6,214,160,0.1)]">
            <Archive className="h-6 w-6 text-[var(--accent-teal)]" aria-hidden="true" />
          </div>
          <p className="font-heading text-sm font-semibold text-[var(--text-heading)]">
            No saved analyses yet
          </p>
          <p className="mt-1.5 max-w-xs text-xs text-[var(--text-muted)]">
            Run an analysis and save the results to access them later.
          </p>
        </div>
      )}

      {/* Upgrade CTA for free users */}
      {!isLoading && userTier === "free" && sortedResults.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Crown className="h-3.5 w-3.5 text-[var(--accent-amber)]" aria-hidden="true" />
          <span>
            Free tier allows 1 saved analysis.{" "}
            <a href="/subscription" className="font-medium text-[var(--accent-teal)] hover:underline">
              Upgrade for more
            </a>
          </span>
        </div>
      )}
    </GlassCard>
  );
}
