/**
 * Unit tests for canAccessFeature and getPricingTier from @mergenix/shared-types.
 *
 * Validates tier-gated feature access logic and pricing tier lookups.
 */
import { describe, it, expect } from 'vitest';
import { canAccessFeature, getPricingTier } from '@mergenix/shared-types';

// ── canAccessFeature ────────────────────────────────────────────────────────

describe('canAccessFeature', () => {
  describe('health feature (requires premium or higher)', () => {
    it('free tier cannot access health features', () => {
      expect(canAccessFeature('free', 'health')).toBe(false);
    });

    it('premium tier can access health features', () => {
      expect(canAccessFeature('premium', 'health')).toBe(true);
    });

    it('pro tier can access health features', () => {
      expect(canAccessFeature('pro', 'health')).toBe(true);
    });
  });

  describe('couple feature (requires pro)', () => {
    it('free tier cannot access couple features', () => {
      expect(canAccessFeature('free', 'couple')).toBe(false);
    });

    it('premium tier cannot access couple features', () => {
      expect(canAccessFeature('premium', 'couple')).toBe(false);
    });

    it('pro tier can access couple features', () => {
      expect(canAccessFeature('pro', 'couple')).toBe(true);
    });
  });
});

// ── getPricingTier ──────────────────────────────────────────────────────────

describe('getPricingTier', () => {
  it('returns the free tier object', () => {
    const tier = getPricingTier('free');
    expect(tier).toBeDefined();
    expect(tier!.id).toBe('free');
    expect(tier!.name).toBe('Free');
    expect(tier!.price).toBe(0);
    expect(tier!.showHealth).toBe(false);
    expect(tier!.showCouple).toBe(false);
  });

  it('returns the premium tier object', () => {
    const tier = getPricingTier('premium');
    expect(tier).toBeDefined();
    expect(tier!.id).toBe('premium');
    expect(tier!.name).toBe('Premium');
    expect(tier!.price).toBe(14.99);
    expect(tier!.showHealth).toBe(true);
    expect(tier!.showCouple).toBe(false);
  });

  it('returns the pro tier object', () => {
    const tier = getPricingTier('pro');
    expect(tier).toBeDefined();
    expect(tier!.id).toBe('pro');
    expect(tier!.name).toBe('Pro');
    expect(tier!.price).toBe(34.99);
    expect(tier!.showHealth).toBe(true);
    expect(tier!.showCouple).toBe(true);
  });

  it('returns undefined for an invalid tier', () => {
    // Cast to bypass TypeScript to test runtime behavior
    const tier = getPricingTier('invalid' as any);
    expect(tier).toBeUndefined();
  });
});
