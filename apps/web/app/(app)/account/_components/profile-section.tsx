"use client";

import { useState, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { User, Mail } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getInitials, getTierVariant } from "@/lib/account-utils";

export function ProfileSection() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [name, setName] = useState(user?.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = getInitials(user?.name ?? "U");
  const hasChanges = name.trim() !== (user?.name ?? "");

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await updateProfile({ name: name.trim() });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }, [name, updateProfile]);

  return (
    <GlassCard variant="medium" hover="none" className="p-7">
      <div className="mb-5 flex items-center gap-3">
        <User className="h-5 w-5 text-[var(--accent-teal)]" />
        <h2 className="font-heading text-lg font-bold text-[var(--text-heading)]">
          Profile
        </h2>
      </div>

      <div className="space-y-4">
        {/* User card */}
        <div className="flex items-center justify-between rounded-xl bg-[var(--bg-elevated)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-teal)] to-[var(--accent-cyan)]">
              <span className="font-heading text-lg font-bold text-[var(--bg-deep)]">
                {initials}
              </span>
            </div>
            <div>
              <p className="font-heading text-sm font-semibold text-[var(--text-heading)]">
                {user?.name ?? "User"}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {user?.email ?? ""}
              </p>
            </div>
          </div>
          {user?.tier && (
            <Badge variant={getTierVariant(user.tier)}>
              {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
            </Badge>
          )}
        </div>

        {/* Editable fields */}
        <Input
          label="Display Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
            setSaveSuccess(false);
          }}
          error={error ?? undefined}
        />
        <div>
          <Input
            label="Email"
            type="email"
            value={user?.email ?? ""}
            icon={<Mail className="h-4 w-4" />}
            disabled
            className="opacity-60"
          />
          <p className="mt-1.5 text-xs text-[var(--text-dim)]">
            Contact support to change your email address.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
          <AnimatePresence>
            {saveSuccess && (
              <m.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-medium text-[var(--accent-teal)]"
              >
                Changes saved!
              </m.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </GlassCard>
  );
}
