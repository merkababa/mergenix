"use client";

import { create } from "zustand";
import type { ConsentRecord } from "@mergenix/shared-types";
import * as legalClient from "@/lib/api/legal-client";
import {
  COOKIE_CONSENT_KEY,
  AGE_VERIFIED_KEY,
  CHIP_LIMITATION_ACK_KEY,
  ANALYTICS_ENABLED_KEY,
  MARKETING_ENABLED_KEY,
} from "../constants/legal";
import { safeLocalStorageGet, safeLocalStorageSet } from "../utils/safe-storage";
import { useAnalysisStore } from "./analysis-store";

// ── Types ─────────────────────────────────────────────────────────────────

type CookieConsentStatus = "pending" | "accepted_all" | "essential_only" | "custom";

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
  loadConsents: () => Promise<void>;
  loadCookiePreferences: () => Promise<void>;
  clearError: () => void;
}

// ── Initial state from localStorage ───────────────────────────────────────

function getInitialCookieConsent(): CookieConsentStatus {
  const stored = safeLocalStorageGet(COOKIE_CONSENT_KEY);
  if (stored === "accepted_all") return "accepted_all";
  if (stored === "essential_only") return "essential_only";
  if (stored === "custom") return "custom";
  return "pending";
}

function getInitialAnalyticsEnabled(): boolean {
  const consent = safeLocalStorageGet(COOKIE_CONSENT_KEY);
  if (consent === "accepted_all") return true;
  if (consent === "custom") {
    return safeLocalStorageGet(ANALYTICS_ENABLED_KEY) === "true";
  }
  return false;
}

function getInitialMarketingEnabled(): boolean {
  const consent = safeLocalStorageGet(COOKIE_CONSENT_KEY);
  if (consent === "accepted_all") return true;
  if (consent === "custom") {
    return safeLocalStorageGet(MARKETING_ENABLED_KEY) === "true";
  }
  return false;
}

function getInitialAgeVerified(): boolean {
  return safeLocalStorageGet(AGE_VERIFIED_KEY) === "true";
}

function getInitialChipLimitationAcknowledged(): boolean {
  return safeLocalStorageGet(CHIP_LIMITATION_ACK_KEY) === "true";
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useLegalStore = create<LegalState>()((set) => ({
  // Initial state — hydrated from localStorage
  cookieConsent: getInitialCookieConsent(),
  analyticsEnabled: getInitialAnalyticsEnabled(),
  marketingEnabled: getInitialMarketingEnabled(),
  ageVerified: getInitialAgeVerified(),
  geneticDataConsentGiven: false, // Never persisted — GDPR requires re-consent each session
  partnerConsentGiven: false, // Never persisted — must re-confirm each session
  consentWithdrawn: false, // Tracks whether user has explicitly withdrawn genetic consent
  chipLimitationAcknowledged: getInitialChipLimitationAcknowledged(),
  consents: [],
  isLoading: false,
  error: null,

  acceptAllCookies: async () => {
    safeLocalStorageSet(COOKIE_CONSENT_KEY, "accepted_all");
    safeLocalStorageSet(ANALYTICS_ENABLED_KEY, "true");
    safeLocalStorageSet(MARKETING_ENABLED_KEY, "true");
    set({
      cookieConsent: "accepted_all",
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
    safeLocalStorageSet(COOKIE_CONSENT_KEY, "essential_only");
    safeLocalStorageSet(ANALYTICS_ENABLED_KEY, "false");
    safeLocalStorageSet(MARKETING_ENABLED_KEY, "false");
    set({
      cookieConsent: "essential_only",
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
    const status: CookieConsentStatus = hasCustom ? "custom" : "essential_only";
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
    safeLocalStorageSet(AGE_VERIFIED_KEY, "true");
    set({ ageVerified: true, error: null });
  },

  syncAgeVerification: async () => {
    // Called AFTER successful login to persist the
    // age-verification consent record on the server (audit trail).
    if (safeLocalStorageGet(AGE_VERIFIED_KEY) !== "true") return;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await legalClient.recordConsent("age_verification", "1.0");
        return; // success
      } catch {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
      }
    }
    // After 3 failed attempts, log but don't crash
    console.warn("Failed to sync age verification after 3 attempts");
  },

  setGeneticDataConsent: (given: boolean) => {
    // Not persisted in localStorage — GDPR requires re-consent each session
    set({ geneticDataConsentGiven: given, error: null });
  },

  setPartnerConsent: (given: boolean) => {
    // Not persisted in localStorage — must re-confirm each session
    set({ partnerConsentGiven: given, error: null });
  },

  setChipLimitationAcknowledged: (ack: boolean) => {
    if (ack) {
      safeLocalStorageSet(CHIP_LIMITATION_ACK_KEY, "true");
    }
    set({ chipLimitationAcknowledged: ack, error: null });
  },

  resetPartnerConsent: () => {
    set({ partnerConsentGiven: false });
  },

  withdrawGeneticConsent: () => {
    // Withdraws genetic data consent — sets consentWithdrawn=true, geneticDataConsentGiven=false
    // Also clears any locally-stored analysis results (GDPR right to withdrawal)
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
      const message =
        error instanceof Error ? error.message : "Failed to record consent";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  loadConsents: async () => {
    set({ isLoading: true, error: null });
    try {
      const consents = await legalClient.listConsents();
      set({ consents, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load consents";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  loadCookiePreferences: async () => {
    try {
      const prefs = await legalClient.getCookiePreferences();
      const hasCustom = prefs.analytics || prefs.marketing;
      const status: CookieConsentStatus = hasCustom ? "custom" : "essential_only";
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
