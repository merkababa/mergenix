/**
 * Safe localStorage helpers with in-memory fallback.
 *
 * When localStorage is unavailable (Safari private mode, disk full, iframe
 * sandbox), values are kept in a module-level object so that the age gate
 * and cookie banner don't re-appear on every render.
 */

// ── In-memory fallback for localStorage ────────────────────────────────
// Exported for testing only — not intended for direct use in application code.
export const memoryFallback: Record<string, string> = {};

// ── Safe localStorage helpers ──────────────────────────────────────────

export function safeLocalStorageGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined') {
      const value = localStorage.getItem(key);
      if (value !== null) return value;
    }
  } catch {
    // localStorage unavailable — fall through to memory fallback
  }
  return memoryFallback[key] ?? null;
}

export function safeLocalStorageSet(key: string, value: string): void {
  // Always write to memory fallback so the value survives even if
  // localStorage throws or is unavailable.
  memoryFallback[key] = value;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // localStorage unavailable — memoryFallback already has the value
  }
}
