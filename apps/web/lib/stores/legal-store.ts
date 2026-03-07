'use client';

import { create } from 'zustand';
import type { ConsentRecord } from '@mergenix/shared-types';
import * as legalClient from '@/lib/api/legal-client';
import {
  COOKIE_CONSENT_KEY,
  AGE_VERIFIED_KEY,
  CHIP_LIMITATION_ACK_KEY,
  ANALYTICS_ENABLED_KEY,
  MARKETING_ENABLED_KEY,
  PENDING_CONSENTS_KEY,
} from '../constants/legal';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/safe-storage';
import { useAnalysisStore } from './analysis-store';
import { extractErrorMessage } from '../utils/extract-error';

// ── Types ─────────────────────────────────────────────────────────────────

type CookieConsentStatus = 'pending' | 'accepted_all' | 'essential_only' | 'custom';

interface LegalState {
  cookieConsent: CookieConsentStatus;
  analyticsEnabled: boolean;
  marketingEnabled: boolean;
  ageVerified: boolean;
  geneticDataConsentGiven: boolean;
  partnerConsentGiven: boolean;
  chipLimitationAcknowledged: boolean;
  consentWithdrawn: boolean;
  consents: ConsentRecord[];
  isLoading: boolean;
  error: string | null;

  // Actions
  acceptAllCookies: () => Promise<void>;
  acceptEssentialOnly: () => Promise<void>;
  updateCookiePrefs: (analytics: boolean, marketing: boolean) => Promise<void>;
  verifyAge: () => void;
  syncAgeVerification: () => Promise<void>;
  setGeneticDataConsent: (given: boolean) => void;
  setPartnerConsent: (given: boolean) => void;
  setChipLimitationAcknowledged: (ack: boolean) => void;
  resetPartnerConsent: () => void;
  withdrawGeneticConsent: () => void;
  reGrantGeneticConsent: () => void;
  recordConsent: (type: string, version: string) => Promise<void>;
  flushPendingConsents: () => Promise<void>;
  loadConsents: () => Promise<void>;
  loadCookiePreferences: () => Promise<void>;
  clearError: () => void;
}

// ── Initial state from localStorage ───────────────────────────────────────

function getInitialCookieConsent(): CookieConsentStatus {
  const stored = safeLocalStorageGet(COOKIE_CONSENT_KEY);
  if (stored === 'accepted_all') return 'accepted_all';
  if (stored === 'essential_only') return 'essential_only';
  if (stored === 'custom') return 'custom';
  return 'pending';
}

function getInitialAnalyticsEnabled(): boolean {
  const consent = safeLocalStorageGet(COOKIE_CONSENT_KEY);
  if (consent === 'accepted_all') return true;
  if (consent === 'custom') {
    return safeLocalStorageGet(ANALYTICS_ENABLED_KEY) === 'true';
  }
  return false;
}

function getInitialMarketingEnabled(): boolean {
  const consent = safeLocalStorageGet(COOKIE_CONSENT_KEY);
  if (consent === 'accepted_all') return true;
  if (consent === 'custom') {
    return safeLocalStorageGet(MARKETING_ENABLED_KEY) === 'true';
  }
  return false;
}

function getInitialAgeVerified(): boolean {
  return safeLocalStorageGet(AGE_VERIFIED_KEY) === 'true';
}

function getInitialChipLimitationAcknowledged(): boolean {
  return safeLocalStorageGet(CHIP_LIMITATION_ACK_KEY) === 'true';
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useLegalStore = create<LegalState>()((set) => ({
  // Initial state — hydrated from localStorage
  cookieConsent: getInitialCookieConsent(),
  analyticsEnabled: getInitialAnalyticsEnabled(),
  marketingEnabled: getInitialMarketingEnabled(),
  ageVerified: getInitialAgeVerified(),
  geneticDataConsentGiven: false, // Never persisted — deliberate design choice: re-consent each session for additional user protection (not a GDPR requirement)
  partnerConsentGiven: false, // Never persisted — must re-confirm each session
  consentWithdrawn: false, // Tracks whether user has explicitly withdrawn genetic consent
  chipLimitationAcknowledged: getInitialChipLimitationAcknowledged(),
  consents: [],
  isLoading: false,
  error: null,

  acceptAllCookies: async () => {
    safeLocalStorageSet(COOKIE_CONSENT_KEY, 'accepted_all');
    safeLocalStorageSet(ANALYTICS_ENABLED_KEY, 'true');
    safeLocalStorageSet(MARKETING_ENABLED_KEY, 'true');
    set({
      cookieConsent: 'accepted_all',
      analyticsEnabled: true,
      marketingEnabled: true,
      error: null,
    });
    try {
      await legalClient.updateCookiePreferences(true, true);
    } catch {
      // Cookie preference saved locally — API failure is non-critical
    }
  },

  acceptEssentialOnly: async () => {
    safeLocalStorageSet(COOKIE_CONSENT_KEY, 'essential_only');
    safeLocalStorageSet(ANALYTICS_ENABLED_KEY, 'false');
    safeLocalStorageSet(MARKETING_ENABLED_KEY, 'false');
    set({
      cookieConsent: 'essential_only',
      analyticsEnabled: false,
      marketingEnabled: false,
      error: null,
    });
    try {
      await legalClient.updateCookiePreferences(false, false);
    } catch {
      // Cookie preference saved locally — API failure is non-critical
    }
  },

  updateCookiePrefs: async (analytics: boolean, marketing: boolean) => {
    const hasCustom = analytics || marketing;
    const status: CookieConsentStatus = hasCustom ? 'custom' : 'essential_only';
    safeLocalStorageSet(COOKIE_CONSENT_KEY, status);
    safeLocalStorageSet(ANALYTICS_ENABLED_KEY, String(analytics));
    safeLocalStorageSet(MARKETING_ENABLED_KEY, String(marketing));
    set({
      cookieConsent: status,
      analyticsEnabled: analytics,
      marketingEnabled: marketing,
      error: null,
    });
    try {
      await legalClient.updateCookiePreferences(analytics, marketing);
    } catch {
      // Cookie preference saved locally — API failure is non-critical
    }
  },

  verifyAge: () => {
    // Save to localStorage / memory only — no API call.
    // On the registration page the user doesn't have an account yet,
    // so calling the authenticated API here would always 401.
    // Use syncAgeVerification() after login/register to persist the
    // audit trail server-side.
    safeLocalStorageSet(AGE_VERIFIED_KEY, 'true');
    set({ ageVerified: true, error: null });
  },

  syncAgeVerification: async () => {
    // Called AFTER successful login to persist the
    // age-verification consent record on the server (audit trail).
    // Also a good moment to flush any pending consents from previous failures.
    void useLegalStore.getState().flushPendingConsents();
    if (safeLocalStorageGet(AGE_VERIFIED_KEY) !== 'true') return;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await legalClient.recordConsent('age_verification', '1.0');
        return; // success
      } catch {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
      }
    }
    // After 3 failed attempts, silently give up — non-critical background sync
  },

  setGeneticDataConsent: (given: boolean) => {
    // Not persisted in localStorage — deliberate design choice: re-consent each session for additional user protection (not a GDPR requirement)
    set({ geneticDataConsentGiven: given, error: null });
  },

  setPartnerConsent: (given: boolean) => {
    // Not persisted in localStorage — must re-confirm each session
    set({ partnerConsentGiven: given, error: null });
  },

  setChipLimitationAcknowledged: (ack: boolean) => {
    if (ack) {
      safeLocalStorageSet(CHIP_LIMITATION_ACK_KEY, 'true');
    }
    set({ chipLimitationAcknowledged: ack, error: null });
  },

  resetPartnerConsent: () => {
    set({ partnerConsentGiven: false });
  },

  withdrawGeneticConsent: () => {
    // Withdraws genetic data consent — sets consentWithdrawn=true, geneticDataConsentGiven=false
    // Also clears any locally-stored analysis results (GDPR right to withdrawal)
    // Clear health consent so the interstitial re-appears if consent is re-granted
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mergenix_health_trait_consent');
    }
    set({ consentWithdrawn: true, geneticDataConsentGiven: false, error: null });
    useAnalysisStore.getState().reset();
  },

  reGrantGeneticConsent: () => {
    // Re-grants genetic data consent after withdrawal
    set({ consentWithdrawn: false, geneticDataConsentGiven: true, error: null });
  },

  recordConsent: async (type: string, version: string) => {
    set({ isLoading: true, error: null });
    try {
      const record = await legalClient.recordConsent(type, version);
      set((state) => ({
        consents: [...state.consents, record],
        isLoading: false,
      }));
    } catch (error) {
      const message = extractErrorMessage(error, 'Failed to record consent');
      // Queue the failed consent record so it can be retried on next opportunity
      // (GDPR Article 7(1) — proof-of-consent must eventually reach the server)
      const existing = safeLocalStorageGet(PENDING_CONSENTS_KEY);
      const queue: Array<{ consentType: string; version: string; timestamp: string }> = existing
        ? (JSON.parse(existing) as Array<{
            consentType: string;
            version: string;
            timestamp: string;
          }>)
        : [];
      queue.push({ consentType: type, version, timestamp: new Date().toISOString() });
      safeLocalStorageSet(PENDING_CONSENTS_KEY, JSON.stringify(queue));
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  flushPendingConsents: async () => {
    const existing = safeLocalStorageGet(PENDING_CONSENTS_KEY);
    if (!existing) return;
    const queue: Array<{ consentType: string; version: string; timestamp: string }> = JSON.parse(
      existing,
    ) as Array<{ consentType: string; version: string; timestamp: string }>;
    if (queue.length === 0) return;
    const remaining: typeof queue = [];
    for (const pending of queue) {
      try {
        const record = await legalClient.recordConsent(pending.consentType, pending.version);
        set((state) => ({ consents: [...state.consents, record] }));
      } catch {
        remaining.push(pending);
      }
    }
    if (remaining.length === 0) {
      safeLocalStorageSet(PENDING_CONSENTS_KEY, '[]');
    } else {
      safeLocalStorageSet(PENDING_CONSENTS_KEY, JSON.stringify(remaining));
    }
  },

  loadConsents: async () => {
    // Flush any pending consents before loading — server is reachable at this point
    void useLegalStore.getState().flushPendingConsents();
    set({ isLoading: true, error: null });
    try {
      const consents = await legalClient.listConsents();
      set({ consents, isLoading: false });
    } catch (error) {
      const message = extractErrorMessage(error, 'Failed to load consents');
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  loadCookiePreferences: async () => {
    try {
      const prefs = await legalClient.getCookiePreferences();
      const hasCustom = prefs.analytics || prefs.marketing;
      const status: CookieConsentStatus = hasCustom ? 'custom' : 'essential_only';
      set({
        analyticsEnabled: prefs.analytics,
        marketingEnabled: prefs.marketing,
        cookieConsent: status,
      });
    } catch {
      // Silent failure — use local state
    }
  },

  clearError: () => set({ error: null }),
}));
