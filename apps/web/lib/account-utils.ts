/**
 * Shared helpers for account-related components.
 * Used by ProfileSection, UserMenu, and other account UI.
 */

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
export function getTierVariant(tier: string): "free" | "premium" | "pro" {
  const t = tier.toLowerCase();
  if (t === "premium") return "premium";
  if (t === "pro") return "pro";
  return "free";
}
