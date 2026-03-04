"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { Trash2, ChevronDown, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { useAuthStore } from "@/lib/stores/auth-store";

export function DangerZone() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const handleDelete = useCallback(async () => {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteAccount(password);
      await logout();
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Account deletion failed",
      );
      setIsDeleting(false);
    }
  }, [deleteAccount, logout, password, router]);

  const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), []);

  const canDelete = password.trim().length > 0 && confirmed;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard
        variant="subtle"
        hover="none"
        className="border-[rgba(244,63,94,0.15)] p-7"
      >
        {/* Header with toggle */}
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex w-full items-center gap-3 text-left"
          aria-expanded={isExpanded}
          aria-controls="danger-zone-content"
        >
          <Trash2 className="h-5 w-5 text-[var(--accent-rose)]" />
          <h2 className="flex-1 font-heading text-lg font-bold text-[var(--accent-rose)]">
            Danger Zone
          </h2>
          <m.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-[var(--text-muted)]" />
          </m.div>
        </button>

        {/* Expandable content */}
        <AnimatePresence>
          {isExpanded && (
            <m.div
              id="danger-zone-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" as const }}
              className="overflow-hidden"
            >
              <div className="pt-5 space-y-4">
                <p className="text-sm text-[var(--text-muted)]">
                  Permanently delete your account and all associated data. This action
                  cannot be undone.
                </p>
                {/* Warning banner */}
                <div id="danger-zone-warning" className="flex items-start gap-2.5 rounded-xl border border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.04)] p-3.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-amber)]" />
                  <div className="text-xs text-[var(--text-muted)]">
                    <p className="font-semibold text-[var(--text-heading)]">
                      This will permanently delete:
                    </p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5">
                      <li>Your account profile and settings</li>
                      <li>All saved analysis history</li>
                      <li>Payment records and tier status</li>
                    </ul>
                    <p className="mt-1.5">
                      Since we never store raw genetic data, no DNA files will be affected.
                    </p>
                  </div>
                </div>

                {/* Password confirmation */}
                <PasswordInput
                  label="Confirm your password"
                  placeholder="Enter your password to confirm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />

                {/* Checkbox confirmation */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] accent-[var(--accent-rose)]"
                    aria-describedby="danger-zone-warning"
                  />
                  <span className="text-sm text-[var(--text-muted)]">
                    I understand this action is permanent and irreversible
                  </span>
                </label>

                {/* Error message */}
                <AnimatePresence mode="wait">
                  {error && (
                    <m.div
                      key="error"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-xl border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-sm text-[var(--accent-rose)]"
                      role="alert"
                    >
                      {error}
                    </m.div>
                  )}
                </AnimatePresence>

                {/* Delete button */}
                <Button
                  variant="destructive"
                  size="md"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                  disabled={!canDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete My Account Permanently
                </Button>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <p className="mt-4 text-xs text-[var(--text-dim)]">
          <Link
            href="/legal#privacy"
            className="text-[var(--text-muted)] transition-colors hover:text-[var(--accent-teal)] hover:underline"
          >
            Learn more about our data practices
          </Link>
        </p>
      </GlassCard>
    </m.div>
  );
}
