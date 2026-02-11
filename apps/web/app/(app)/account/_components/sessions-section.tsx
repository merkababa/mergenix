"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Smartphone, Globe, Clock, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Session } from "@/lib/api/auth-client";

/** Format a date string as relative time (e.g., "2 hours ago"). */
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

/** Skeleton placeholder IDs for loading state. */
const SKELETON_IDS = [1, 2, 3] as const;

/** Determine if a device name suggests a mobile device. */
function isMobileDevice(device: string): boolean {
  const lower = device.toLowerCase();
  return (
    lower.includes("mobile") ||
    lower.includes("phone") ||
    lower.includes("android") ||
    lower.includes("iphone") ||
    lower.includes("ipad")
  );
}

export function SessionsSection() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const getSessions = useAuthStore((s) => s.getSessions);
  const revokeSession = useAuthStore((s) => s.revokeSession);
  const revokeAllSessions = useAuthStore((s) => s.revokeAllSessions);

  const fetchSessions = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSessions();
      if (!signal?.aborted) {
        setSessions(data);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [getSessions]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSessions(controller.signal);
    return () => controller.abort();
  }, [fetchSessions]);

  const handleRevoke = useCallback(
    async (id: string) => {
      setRevokingId(id);
      try {
        await revokeSession(id);
        await fetchSessions();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to revoke session",
        );
      } finally {
        setRevokingId(null);
      }
    },
    [revokeSession, fetchSessions],
  );

  const handleRevokeAll = useCallback(async () => {
    setIsRevokingAll(true);
    try {
      await revokeAllSessions();
      await fetchSessions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to revoke sessions",
      );
    } finally {
      setIsRevokingAll(false);
    }
  }, [revokeAllSessions, fetchSessions]);

  const otherSessions = useMemo(() => sessions.filter((s) => !s.isCurrent), [sessions]);

  return (
    <GlassCard variant="medium" hover="none" className="p-7">
      <div className="mb-5 flex items-center gap-3">
        <Monitor className="h-5 w-5 text-[var(--accent-teal)]" aria-hidden="true" />
        <h2 className="font-heading text-lg font-bold text-[var(--text-heading)]">
          Active Sessions
        </h2>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3" aria-busy="true">
          <span className="sr-only" role="status">Loading sessions...</span>
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
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 rounded-xl border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-sm text-[var(--accent-rose)]"
            role="alert"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessions list */}
      {!isLoading && !error && sessions.length > 0 && (
        <div className="space-y-3" aria-live="polite">
          {sessions.map((session) => {
            const DeviceIcon = isMobileDevice(session.device)
              ? Smartphone
              : Monitor;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(6,214,160,0.1)]">
                    <DeviceIcon className="h-4.5 w-4.5 text-[var(--accent-teal)]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-heading text-sm font-semibold text-[var(--text-heading)]">
                        {session.device}
                      </p>
                      {session.isCurrent && (
                        <Badge
                          variant="confidence-high"
                          className="flex-shrink-0"
                        >
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-3 w-3" aria-hidden="true" />
                        {session.ip}
                        {session.location && ` \u2022 ${session.location}`}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {formatRelativeTime(session.lastActive)}
                      </span>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--accent-rose)]"
                      onClick={() => handleRevoke(session.id)}
                      isLoading={revokingId === session.id}
                      disabled={revokingId !== null}
                      aria-label={`Revoke session on ${session.device}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Revoke All button */}
          {otherSessions.length > 0 && (
            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleRevokeAll}
                isLoading={isRevokingAll}
                disabled={revokingId !== null}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Revoke All Other Sessions
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(6,214,160,0.1)]">
            <Clock className="h-6 w-6 text-[var(--accent-teal)]" />
          </div>
          <p className="font-heading text-sm font-semibold text-[var(--text-heading)]">
            No other sessions found
          </p>
          <p className="mt-1.5 max-w-xs text-xs text-[var(--text-muted)]">
            You are only signed in on this device.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
