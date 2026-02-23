import type { Tier } from '@mergenix/shared-types';

const VALID_TIERS: readonly string[] = ['free', 'premium', 'pro'];

export function parseTier(value: unknown): Tier {
  if (typeof value === 'string' && VALID_TIERS.includes(value)) {
    return value as Tier;
  }
  return 'free';
}
