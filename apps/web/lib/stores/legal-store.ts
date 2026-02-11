"use client";

import { create } from "zustand";
import type { ConsentRecord } from "@mergenix/shared-types";
import * as legalClient from "@/lib/api/legal-client";
import { COOKIE_CONSENT_KEY, AGE_VERIFIED_KEY } from "../constants/legal";
import { safeLocalStorageGet, safeLocalStorageSet } from "../utils/safe-storage";

// ── Types ─────────────────────────────────────────────────────────────────

type CookieConsentStatus = "pending" | "accepted_all" | "essential_only" | "custom";

interface LegalState {
  cookieConsent: CookieConsentStatus;
  analyticsEnabled: boolean;
  ageVerified: boolean;
  consents: ConsentRecord[];
  isLoading: boolean;
  error: string | null;

  // Actions
  acceptAllCookies: () => Promise<void>;
  acceptEssentialOnly: () => Promise<void>;
  updateCookiePrefs: (analytics: boolean) => Promise<void>;
  verifyAge: () => void;
  syncAgeVerification: () => Promise<void>;
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
  return consent === "accepted_all" || consent === "custom";
}

function getInitialAgeVerified(): boolean {
  return safeLocalStorageGet(AGE_VERIFIED_KEY) === "true";
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useLegalStore = create<LegalState>()((set) => ({
  // Initial state — hydrated from localStorage
  cookieConsent: getInitialCookieConsent(),
  analyticsEnabled: getInitialAnalyticsEnabled(),
  ageVerified: getInitialAgeVerified(),
  consents: [],
  isLoading: false,
  error: null,

  acceptAllCookies: async () => {
    safeLocalStorageSet(COOKIE_CONSENT_KEY, "accepted_all");
    set({
      cookieConsent: "accepted_all",
      analyticsEnabled: true,
      error: null,
    });
    try {
      await legalClient.updateCookiePreferences(true);
    } catch {
      // Cookie preference saved locally — API failure is non-critical
    }
  },

  acceptEssentialOnly: async () => {
    safeLocalStorageSet(COOKIE_CONSENT_KEY, "essential_only");
    set({
      cookieConsent: "essential_only",
      analyticsEnabled: false,
      error: null,
    });
    try {
      await legalClient.updateCookiePreferences(false);
    } catch {
      // Cookie preference saved locally — API failure is non-critical
    }
  },

  updateCookiePrefs: async (analytics: boolean) => {
    const status: CookieConsentStatus = analytics ? "custom" : "essential_only";
    safeLocalStorageSet(COOKIE_CONSENT_KEY, status);
    set({
      cookieConsent: status,
      analyticsEnabled: analytics,
      error: null,
    });
    try {
      await legalClient.updateCookiePreferences(analytics);
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
      const status: CookieConsentStatus = prefs.analytics
        ? "accepted_all"
        : "essential_only";
      set({
        analyticsEnabled: prefs.analytics,
        cookieConsent: status,
      });
    } catch {
      // Silent failure — use local state
    }
  },

  clearError: () => set({ error: null }),
}));
