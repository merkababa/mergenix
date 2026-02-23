/**
 * Shared helpers for account-related components.
 * Used by ProfileSection, UserMenu, and other account UI.
 */

import type { Tier } from "@mergenix/shared-types";

/** Extract initials from a display name (max 2 chars). */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Map a tier string to the Badge component's tier variant. */
export function getTierVariant(tier: Tier): "free" | "premium" | "pro" {
  if (tier === "premium") return "premium";
  if (tier === "pro") return "pro";
  return "free";
}
