"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { Lock } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonVariants } from "@/components/ui/button";

interface TierUpgradePromptProps {
  /** Message explaining what the user is missing (from engine's upgradeMessage field) */
  message: string;
  /** Optional custom button text (default: "Upgrade Plan") */
  buttonText?: string;
}

/**
 * Reusable upgrade prompt shown in PGx, PRS, and Counseling tabs
 * when results are tier-limited. Displays a purple-tinted glass card
 * with a lock icon, descriptive text, and an upgrade CTA.
 */
export function TierUpgradePrompt({
  message,
  buttonText = "Upgrade Plan",
}: TierUpgradePromptProps) {
  return (
    <GlassCard
      variant="medium"
      hover="none"
      className="flex items-center gap-4 border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.04)] p-5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(139,92,246,0.1)]">
        <Lock className="h-5 w-5 text-accent-violet" aria-hidden="true" />
      </div>

      <div className="flex-1">
        <p className="text-sm text-(--text-body)">{message}</p>
      </div>

      <Link
        href="/subscription"
        className={buttonVariants({ size: "sm", className: "bg-[rgba(139,92,246,0.15)] border-[rgba(139,92,246,0.3)] text-accent-violet hover:bg-[rgba(139,92,246,0.25)]" })}
      >
        {buttonText}
      </Link>
    </GlassCard>
  );
}
