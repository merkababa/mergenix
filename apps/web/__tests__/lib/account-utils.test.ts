import { describe, it, expect } from 'vitest';
import { getInitials, getTierVariant } from '@/lib/account-utils';

describe('account-utils', () => {
  // ── getInitials ───────────────────────────────────────────────────────

  describe('getInitials', () => {
    it('returns single initial for one-word name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('returns two initials for two-word name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('returns max 2 initials for three-word name', () => {
      expect(getInitials('John Michael Doe')).toBe('JM');
    });

    it('returns empty string for empty name', () => {
      expect(getInitials('')).toBe('');
    });

    it('uppercases initials', () => {
      expect(getInitials('jane doe')).toBe('JD');
    });

    it('handles extra whitespace by filtering empty parts', () => {
      // "  John  " splits to ["", "", "John", "", ""]
      // .map(part => part[0]) → [undefined, undefined, "J", undefined, undefined]
      // .filter(Boolean) → ["J"]
      expect(getInitials('John')).toBe('J');
    });
  });

  // ── getTierVariant ────────────────────────────────────────────────────

  describe('getTierVariant', () => {
    it('returns "free" for "free"', () => {
      expect(getTierVariant('free')).toBe('free');
    });

    it('returns "premium" for "premium"', () => {
      expect(getTierVariant('premium')).toBe('premium');
    });

    it('returns "pro" for "pro"', () => {
      expect(getTierVariant('pro')).toBe('pro');
    });

    it('is case-insensitive', () => {
      expect(getTierVariant('Premium')).toBe('premium');
      expect(getTierVariant('PRO')).toBe('pro');
      expect(getTierVariant('FREE')).toBe('free');
    });

    it('returns "free" for unknown tier', () => {
      expect(getTierVariant('enterprise')).toBe('free');
      expect(getTierVariant('unknown')).toBe('free');
    });
  });
});
