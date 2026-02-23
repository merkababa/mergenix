/**
 * Tests for legal-store.ts — focusing on the flushPendingConsents queue
 * behaviour and the recordConsent failure-queuing path.
 *
 * Strategy:
 *  - Mock @/lib/api/legal-client so we control when recordConsent resolves/rejects.
 *  - Mock the analysis-store (required by withdrawGeneticConsent) to a no-op.
 *  - Reset Zustand store state, localStorage, AND the in-memory safeStorage
 *    fallback between tests to prevent cross-test leakage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mocks (must be before imports) ────────────────────────────────────────────

// Mock the analysis-store to avoid pulling in its heavy dependencies.
vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: Object.assign(
    () => ({ reset: vi.fn() }),
    { getState: () => ({ reset: vi.fn() }) },
  ),
}));

// We will configure legalClient mock per-test below.
const mockRecordConsent = vi.fn();
const mockListConsents = vi.fn();
const mockUpdateCookiePreferences = vi.fn();
const mockGetCookiePreferences = vi.fn();

vi.mock('@/lib/api/legal-client', () => ({
  recordConsent: (...args: unknown[]) => mockRecordConsent(...args),
  listConsents: () => mockListConsents(),
  updateCookiePreferences: (...args: unknown[]) => mockUpdateCookiePreferences(...args),
  getCookiePreferences: () => mockGetCookiePreferences(),
}));

// ── Imports after mocks ────────────────────────────────────────────────────────

import { useLegalStore } from '@/lib/stores/legal-store';
import { PENDING_CONSENTS_KEY } from '@/lib/constants/legal';
import { memoryFallback } from '@/lib/utils/safe-storage';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Reset Zustand store to its initial values between tests.
 */
function resetStore() {
  useLegalStore.setState({
    cookieConsent: 'pending',
    analyticsEnabled: false,
    marketingEnabled: false,
    ageVerified: false,
    geneticDataConsentGiven: false,
    partnerConsentGiven: false,
    chipLimitationAcknowledged: false,
    consentWithdrawn: false,
    consents: [],
    isLoading: false,
    error: null,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('recordConsent — queuing on failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear real localStorage (available in jsdom)
    localStorage.clear();
    // Clear the in-memory safeStorage fallback so values don't leak between tests
    Object.keys(memoryFallback).forEach((key) => delete memoryFallback[key]);
    resetStore();
    // Default: updateCookiePreferences & getCookiePreferences are no-ops
    mockUpdateCookiePreferences.mockResolvedValue(undefined);
    mockGetCookiePreferences.mockResolvedValue({ analytics: false, marketing: false });
  });

  it('queues consent in localStorage when recordConsent API call fails', async () => {
    mockRecordConsent.mockRejectedValue(new Error('Network error'));

    const store = useLegalStore.getState();

    await expect(store.recordConsent('gdpr_analytics', '1.0')).rejects.toThrow('Network error');

    const raw = localStorage.getItem(PENDING_CONSENTS_KEY);
    expect(raw).not.toBeNull();

    const queue = JSON.parse(raw!) as Array<{
      consentType: string;
      version: string;
      timestamp: string;
    }>;
    expect(queue).toHaveLength(1);
    expect(queue[0]!.consentType).toBe('gdpr_analytics');
    expect(queue[0]!.version).toBe('1.0');
    expect(queue[0]!.timestamp).toBeTruthy();
  });

  it('appends multiple failures to the queue', async () => {
    mockRecordConsent.mockRejectedValue(new Error('offline'));

    const store = useLegalStore.getState();

    await expect(store.recordConsent('gdpr_analytics', '1.0')).rejects.toThrow();
    await expect(store.recordConsent('cookie_consent', '2.0')).rejects.toThrow();

    const raw = localStorage.getItem(PENDING_CONSENTS_KEY);
    const queue = JSON.parse(raw!) as Array<{ consentType: string; version: string }>;
    expect(queue).toHaveLength(2);
    expect(queue[0]!.consentType).toBe('gdpr_analytics');
    expect(queue[1]!.consentType).toBe('cookie_consent');
  });

  it('sets error state when recordConsent API call fails', async () => {
    mockRecordConsent.mockRejectedValue(new Error('Timeout'));

    const store = useLegalStore.getState();
    await expect(store.recordConsent('gdpr_analytics', '1.0')).rejects.toThrow();

    expect(useLegalStore.getState().error).not.toBeNull();
  });
});

describe('flushPendingConsents — replay and clear on success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.keys(memoryFallback).forEach((key) => delete memoryFallback[key]);
    resetStore();
    mockUpdateCookiePreferences.mockResolvedValue(undefined);
    mockGetCookiePreferences.mockResolvedValue({ analytics: false, marketing: false });
  });

  it('does nothing when queue is empty', async () => {
    // No pending consents in localStorage or memoryFallback
    await useLegalStore.getState().flushPendingConsents();
    expect(mockRecordConsent).not.toHaveBeenCalled();
  });

  it('replays queued consents and clears the queue on full success', async () => {
    // Seed the pending queue directly in localStorage
    const queue = [
      { consentType: 'gdpr_analytics', version: '1.0', timestamp: new Date().toISOString() },
      { consentType: 'cookie_consent', version: '2.0', timestamp: new Date().toISOString() },
    ];
    localStorage.setItem(PENDING_CONSENTS_KEY, JSON.stringify(queue));
    // Also write to memoryFallback since safeLocalStorageGet reads from both
    memoryFallback[PENDING_CONSENTS_KEY] = JSON.stringify(queue);

    const fakeRecord = { id: 'rec-1', consentType: 'gdpr_analytics', version: '1.0', createdAt: '' };
    mockRecordConsent.mockResolvedValue(fakeRecord);

    await useLegalStore.getState().flushPendingConsents();

    // Both queued consents should have been retried
    expect(mockRecordConsent).toHaveBeenCalledTimes(2);
    expect(mockRecordConsent).toHaveBeenCalledWith('gdpr_analytics', '1.0');
    expect(mockRecordConsent).toHaveBeenCalledWith('cookie_consent', '2.0');

    // Queue should be empty after full success
    const raw = localStorage.getItem(PENDING_CONSENTS_KEY);
    const remaining = JSON.parse(raw!) as unknown[];
    expect(remaining).toHaveLength(0);
  });

  it('retains items that still fail during flush (partial flush)', async () => {
    // Seed two pending consents
    const queue = [
      { consentType: 'gdpr_analytics', version: '1.0', timestamp: new Date().toISOString() },
      { consentType: 'cookie_consent', version: '2.0', timestamp: new Date().toISOString() },
    ];
    localStorage.setItem(PENDING_CONSENTS_KEY, JSON.stringify(queue));
    memoryFallback[PENDING_CONSENTS_KEY] = JSON.stringify(queue);

    const fakeRecord = { id: 'rec-1', consentType: 'cookie_consent', version: '2.0', createdAt: '' };

    // First call (gdpr_analytics) still fails; second call (cookie_consent) succeeds
    mockRecordConsent
      .mockRejectedValueOnce(new Error('still failing'))
      .mockResolvedValueOnce(fakeRecord);

    await useLegalStore.getState().flushPendingConsents();

    // Both consents were attempted
    expect(mockRecordConsent).toHaveBeenCalledTimes(2);

    // Only the failing consent remains in the queue
    const raw = localStorage.getItem(PENDING_CONSENTS_KEY);
    const remaining = JSON.parse(raw!) as Array<{ consentType: string }>;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.consentType).toBe('gdpr_analytics');
  });

  it('adds successfully replayed consents to store state', async () => {
    const queue = [
      { consentType: 'gdpr_analytics', version: '1.0', timestamp: new Date().toISOString() },
    ];
    localStorage.setItem(PENDING_CONSENTS_KEY, JSON.stringify(queue));
    memoryFallback[PENDING_CONSENTS_KEY] = JSON.stringify(queue);

    const fakeRecord = {
      id: 'rec-99',
      consentType: 'gdpr_analytics',
      version: '1.0',
      createdAt: new Date().toISOString(),
    };
    mockRecordConsent.mockResolvedValue(fakeRecord);

    expect(useLegalStore.getState().consents).toHaveLength(0);

    await useLegalStore.getState().flushPendingConsents();

    // The successfully replayed record should appear in store.consents
    expect(useLegalStore.getState().consents).toHaveLength(1);
    expect(useLegalStore.getState().consents[0]).toEqual(fakeRecord);
  });
});
