import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mock the legal API client ───────────────────────────────────────────
const mockRecordConsent = vi.fn();
const mockListConsents = vi.fn();
const mockUpdateCookiePreferences = vi.fn();
const mockGetCookiePreferences = vi.fn();

vi.mock('@/lib/api/legal-client', () => ({
  recordConsent: (...args: unknown[]) => mockRecordConsent(...args),
  listConsents: (...args: unknown[]) => mockListConsents(...args),
  updateCookiePreferences: (...args: unknown[]) => mockUpdateCookiePreferences(...args),
  getCookiePreferences: (...args: unknown[]) => mockGetCookiePreferences(...args),
}));

// ── Mock localStorage ───────────────────────────────────────────────────
const localStorageStore: Record<string, string> = {};

beforeEach(() => {
  // Reset localStorage mock
  Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key]);

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
    (key: string) => localStorageStore[key] ?? null,
  );
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
    (key: string, value: string) => {
      localStorageStore[key] = value;
    },
  );

  // Clear the in-memory fallback used by safeLocalStorageGet/Set so that
  // values from prior tests (e.g. verifyAge setting 'mergenix_age_verified')
  // do not leak into subsequent tests.
  Object.keys(memoryFallback).forEach((key: string) => delete memoryFallback[key]);
});

import { useLegalStore } from '../../lib/stores/legal-store';
import { memoryFallback } from '../../lib/utils/safe-storage';

// ── Tests ────────────────────────────────────────────────────────────────

describe('useLegalStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useLegalStore.setState({
      cookieConsent: 'pending',
      analyticsEnabled: false,
      ageVerified: false,
      consents: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  // ── Initial State ─────────────────────────────────────────────────────

  it('has correct initial state', () => {
    const state = useLegalStore.getState();
    expect(state.cookieConsent).toBe('pending');
    expect(state.analyticsEnabled).toBe(false);
    expect(state.ageVerified).toBe(false);
    expect(state.consents).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  // ── acceptAllCookies ─────────────────────────────────────────────────

  describe('acceptAllCookies', () => {
    it('sets cookieConsent to accepted_all and analyticsEnabled to true', async () => {
      mockUpdateCookiePreferences.mockResolvedValue({ essential: true, analytics: true });

      await useLegalStore.getState().acceptAllCookies();

      const state = useLegalStore.getState();
      expect(state.cookieConsent).toBe('accepted_all');
      expect(state.analyticsEnabled).toBe(true);
      expect(state.error).toBeNull();
    });

    it('saves to localStorage', async () => {
      mockUpdateCookiePreferences.mockResolvedValue({ essential: true, analytics: true });

      await useLegalStore.getState().acceptAllCookies();

      expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        'mergenix_cookie_consent',
        'accepted_all',
      );
    });

    it('calls API to update cookie preferences', async () => {
      mockUpdateCookiePreferences.mockResolvedValue({ essential: true, analytics: true });

      await useLegalStore.getState().acceptAllCookies();

      expect(mockUpdateCookiePreferences).toHaveBeenCalledWith(true);
    });

    it('does not revert state on API failure (non-critical)', async () => {
      mockUpdateCookiePreferences.mockRejectedValue(new Error('Network error'));

      await useLegalStore.getState().acceptAllCookies();

      // State should still be set despite API failure
      const state = useLegalStore.getState();
      expect(state.cookieConsent).toBe('accepted_all');
      expect(state.analyticsEnabled).toBe(true);
    });
  });

  // ── acceptEssentialOnly ──────────────────────────────────────────────

  describe('acceptEssentialOnly', () => {
    it('sets cookieConsent to essential_only and analyticsEnabled to false', async () => {
      mockUpdateCookiePreferences.mockResolvedValue({ essential: true, analytics: false });

      await useLegalStore.getState().acceptEssentialOnly();

      const state = useLegalStore.getState();
      expect(state.cookieConsent).toBe('essential_only');
      expect(state.analyticsEnabled).toBe(false);
      expect(state.error).toBeNull();
    });

    it('saves to localStorage', async () => {
      mockUpdateCookiePreferences.mockResolvedValue({ essential: true, analytics: false });

      await useLegalStore.getState().acceptEssentialOnly();

      expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        'mergenix_cookie_consent',
        'essential_only',
      );
    });

    it('calls API with analytics=false', async () => {
      mockUpdateCookiePreferences.mockResolvedValue({ essential: true, analytics: false });

      await useLegalStore.getState().acceptEssentialOnly();

      expect(mockUpdateCookiePreferences).toHaveBeenCalledWith(false);
    });
  });

  // ── updateCookiePrefs ────────────────────────────────────────────────

  describe('updateCookiePrefs', () => {
    it('with analytics=true sets cookieConsent to custom and analyticsEnabled to true', async () => {
      mockUpdateCookiePreferences.mockResolvedValue({ essential: true, analytics: true });

      await useLegalStore.getState().updateCookiePrefs(true);

      const state = useLegalStore.getState();
      expect(state.cookieConsent).toBe('custom');
      expect(state.analyticsEnabled).toBe(true);
    });

    it('with analytics=false sets cookieConsent to essential_only', async () => {
      mockUpdateCookiePreferences.mockResolvedValue({ essential: true, analytics: false });

      await useLegalStore.getState().updateCookiePrefs(false);

      const state = useLegalStore.getState();
      expect(state.cookieConsent).toBe('essential_only');
      expect(state.analyticsEnabled).toBe(false);
    });
  });

  // ── verifyAge ────────────────────────────────────────────────────────

  describe('verifyAge', () => {
    it('sets ageVerified to true and saves to localStorage', () => {
      useLegalStore.getState().verifyAge();

      expect(useLegalStore.getState().ageVerified).toBe(true);
      expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        'mergenix_age_verified',
        'true',
      );
    });

    it('does not call the API (no server request)', () => {
      useLegalStore.getState().verifyAge();

      expect(mockRecordConsent).not.toHaveBeenCalled();
    });

    it('clears any existing error', () => {
      useLegalStore.setState({ error: 'previous error' });

      useLegalStore.getState().verifyAge();

      expect(useLegalStore.getState().error).toBeNull();
    });
  });

  // ── syncAgeVerification ────────────────────────────────────────────

  describe('syncAgeVerification', () => {
    it('calls API with consent_type age_verification when localStorage has age verified', async () => {
      // Set age as verified in localStorage
      localStorageStore['mergenix_age_verified'] = 'true';
      mockRecordConsent.mockResolvedValue({
        id: 'uuid-1',
        consentType: 'age_verification',
        version: '1.0',
        acceptedAt: '2026-02-10T00:00:00Z',
      });

      await useLegalStore.getState().syncAgeVerification();

      expect(mockRecordConsent).toHaveBeenCalledWith('age_verification', '1.0');
    });

    it('does nothing when age is not verified in localStorage', async () => {
      // Ensure localStorage does NOT have age verified
      delete localStorageStore['mergenix_age_verified'];

      await useLegalStore.getState().syncAgeVerification();

      expect(mockRecordConsent).not.toHaveBeenCalled();
    });

    it('retries on API failure and does not throw', async () => {
      localStorageStore['mergenix_age_verified'] = 'true';
      mockRecordConsent.mockRejectedValue(new Error('Network error'));

      // Should not throw even after 3 failed attempts
      await useLegalStore.getState().syncAgeVerification();

      expect(mockRecordConsent).toHaveBeenCalledTimes(3);
    });
  });

  // ── recordConsent ────────────────────────────────────────────────────

  describe('recordConsent', () => {
    it('calls API and adds consent to list', async () => {
      const mockRecord = {
        id: 'uuid-1',
        consentType: 'terms',
        version: '1.0',
        acceptedAt: '2026-02-10T12:00:00Z',
      };
      mockRecordConsent.mockResolvedValue(mockRecord);

      await useLegalStore.getState().recordConsent('terms', '1.0');

      const state = useLegalStore.getState();
      expect(state.consents).toHaveLength(1);
      expect(state.consents[0]).toEqual(mockRecord);
      expect(state.isLoading).toBe(false);
    });

    it('sets error on API failure', async () => {
      mockRecordConsent.mockRejectedValue(new Error('Failed to record'));

      await expect(
        useLegalStore.getState().recordConsent('terms', '1.0'),
      ).rejects.toThrow('Failed to record');

      const state = useLegalStore.getState();
      expect(state.error).toBe('Failed to record');
      expect(state.isLoading).toBe(false);
    });
  });

  // ── loadConsents ─────────────────────────────────────────────────────

  describe('loadConsents', () => {
    it('fetches consents from API and stores them', async () => {
      const mockConsents = [
        { id: 'uuid-1', consentType: 'terms', version: '1.0', acceptedAt: '2026-01-01T00:00:00Z' },
        { id: 'uuid-2', consentType: 'privacy', version: '2.0', acceptedAt: '2026-01-02T00:00:00Z' },
      ];
      mockListConsents.mockResolvedValue(mockConsents);

      await useLegalStore.getState().loadConsents();

      expect(mockListConsents).toHaveBeenCalled();
      expect(useLegalStore.getState().consents).toEqual(mockConsents);
      expect(useLegalStore.getState().isLoading).toBe(false);
    });

    it('sets error on API failure', async () => {
      mockListConsents.mockRejectedValue(new Error('Network error'));

      await expect(
        useLegalStore.getState().loadConsents(),
      ).rejects.toThrow('Network error');

      expect(useLegalStore.getState().error).toBe('Network error');
      expect(useLegalStore.getState().isLoading).toBe(false);
    });
  });

  // ── loadCookiePreferences ────────────────────────────────────────────

  describe('loadCookiePreferences', () => {
    it('fetches preferences from API and updates state (analytics=true)', async () => {
      mockGetCookiePreferences.mockResolvedValue({ essential: true, analytics: true });

      await useLegalStore.getState().loadCookiePreferences();

      const state = useLegalStore.getState();
      expect(state.analyticsEnabled).toBe(true);
      expect(state.cookieConsent).toBe('accepted_all');
    });

    it('fetches preferences from API and updates state (analytics=false)', async () => {
      mockGetCookiePreferences.mockResolvedValue({ essential: true, analytics: false });

      await useLegalStore.getState().loadCookiePreferences();

      const state = useLegalStore.getState();
      expect(state.analyticsEnabled).toBe(false);
      expect(state.cookieConsent).toBe('essential_only');
    });

    it('silently handles API failure — does not set error', async () => {
      mockGetCookiePreferences.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await useLegalStore.getState().loadCookiePreferences();

      // Error should NOT be set — loadCookiePreferences has silent failure
      expect(useLegalStore.getState().error).toBeNull();
    });
  });

  // ── setGeneticDataConsent ────────────────────────────────────────────

  describe('setGeneticDataConsent', () => {
    it('sets geneticDataConsentGiven to true', () => {
      useLegalStore.getState().setGeneticDataConsent(true);

      expect(useLegalStore.getState().geneticDataConsentGiven).toBe(true);
      expect(useLegalStore.getState().error).toBeNull();
    });

    it('sets geneticDataConsentGiven back to false', () => {
      useLegalStore.getState().setGeneticDataConsent(true);
      expect(useLegalStore.getState().geneticDataConsentGiven).toBe(true);

      useLegalStore.getState().setGeneticDataConsent(false);
      expect(useLegalStore.getState().geneticDataConsentGiven).toBe(false);
    });
  });

  // ── setPartnerConsent ──────────────────────────────────────────────

  describe('setPartnerConsent', () => {
    it('sets partnerConsentGiven to true', () => {
      useLegalStore.getState().setPartnerConsent(true);

      expect(useLegalStore.getState().partnerConsentGiven).toBe(true);
      expect(useLegalStore.getState().error).toBeNull();
    });
  });

  // ── resetPartnerConsent ────────────────────────────────────────────

  describe('resetPartnerConsent', () => {
    it('resets partnerConsentGiven to false', () => {
      useLegalStore.getState().setPartnerConsent(true);
      expect(useLegalStore.getState().partnerConsentGiven).toBe(true);

      useLegalStore.getState().resetPartnerConsent();
      expect(useLegalStore.getState().partnerConsentGiven).toBe(false);
    });
  });

  // ── setChipLimitationAcknowledged ──────────────────────────────────

  describe('setChipLimitationAcknowledged', () => {
    it('sets chipLimitationAcknowledged to true and persists to localStorage', () => {
      useLegalStore.getState().setChipLimitationAcknowledged(true);

      expect(useLegalStore.getState().chipLimitationAcknowledged).toBe(true);
      expect(useLegalStore.getState().error).toBeNull();
      expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        'mergenix_chip_limitation_ack',
        'true',
      );
    });

    it('sets chipLimitationAcknowledged to false without persisting', () => {
      // First acknowledge, then un-acknowledge
      useLegalStore.getState().setChipLimitationAcknowledged(true);
      vi.clearAllMocks(); // Clear the setItem call from above

      useLegalStore.getState().setChipLimitationAcknowledged(false);

      expect(useLegalStore.getState().chipLimitationAcknowledged).toBe(false);
      // When ack=false, localStorage.setItem should NOT be called (only persists on true)
      expect(Storage.prototype.setItem).not.toHaveBeenCalledWith(
        'mergenix_chip_limitation_ack',
        expect.anything(),
      );
    });
  });

  // ── clearError ───────────────────────────────────────────────────────

  describe('clearError', () => {
    it('resets error to null', () => {
      useLegalStore.setState({ error: 'some error' });

      useLegalStore.getState().clearError();

      expect(useLegalStore.getState().error).toBeNull();
    });
  });
});
