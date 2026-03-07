/**
 * Legal API client — wraps all FastAPI /legal/* endpoints.
 *
 * Each function maps 1:1 to a backend endpoint. The backend uses
 * snake_case in JSON; we convert to camelCase for the frontend.
 *
 * All functions throw ApiError on failure. The caller (legal store)
 * is responsible for catching and surfacing errors to the UI.
 */

import { get, post } from './client';
import type { ConsentRecord, CookiePreferences } from '@mergenix/shared-types';

// ── API Response Types (snake_case from backend) ────────────────────────

/** Raw consent record from POST /legal/consent or GET /legal/consent */
interface RawConsentRecord {
  id: string;
  consent_type: string;
  version: string;
  accepted_at: string;
}

/** Raw cookie preferences from POST /legal/cookies or GET /legal/cookies */
interface RawCookiePreferences {
  essential: true;
  analytics: boolean;
  marketing: boolean;
}

// ── Transformers ────────────────────────────────────────────────────────

function toConsentRecord(raw: RawConsentRecord): ConsentRecord {
  return {
    id: raw.id,
    consentType: raw.consent_type as ConsentRecord['consentType'],
    version: raw.version,
    acceptedAt: raw.accepted_at,
  };
}

function toCookiePreferences(raw: RawCookiePreferences): CookiePreferences {
  return {
    essential: raw.essential,
    analytics: raw.analytics,
    marketing: raw.marketing,
  };
}

// ── Shared Options Type ────────────────────────────────────────────────

/** Optional request configuration for legal API calls. */
interface LegalRequestOptions {
  /** AbortSignal for request cancellation. */
  signal?: AbortSignal;
}

// ── Legal API Functions ─────────────────────────────────────────────────

/**
 * Record a new consent entry (e.g., terms acceptance, age verification).
 */
export async function recordConsent(
  consentType: string,
  version: string,
  options?: LegalRequestOptions,
): Promise<ConsentRecord> {
  const raw = await post<RawConsentRecord>(
    '/legal/consent',
    {
      consent_type: consentType,
      version,
    },
    { signal: options?.signal },
  );
  return toConsentRecord(raw);
}

/**
 * List all consent records for the current user.
 */
export async function listConsents(options?: LegalRequestOptions): Promise<ConsentRecord[]> {
  const raw = await get<RawConsentRecord[]>('/legal/consent', {
    signal: options?.signal,
  });
  return raw.map(toConsentRecord);
}

/**
 * Update cookie preferences (analytics and marketing opt-in/out).
 */
export async function updateCookiePreferences(
  analytics: boolean,
  marketing: boolean,
  options?: LegalRequestOptions,
): Promise<CookiePreferences> {
  const raw = await post<RawCookiePreferences>(
    '/legal/cookies',
    { analytics, marketing },
    { signal: options?.signal },
  );
  return toCookiePreferences(raw);
}

/**
 * Get current cookie preferences for the authenticated user.
 */
export async function getCookiePreferences(
  options?: LegalRequestOptions,
): Promise<CookiePreferences> {
  const raw = await get<RawCookiePreferences>('/legal/cookies', {
    signal: options?.signal,
  });
  return toCookiePreferences(raw);
}

/**
 * Export all user data as a JSON blob for GDPR compliance.
 *
 * Unlike other endpoints, this returns a Blob suitable for download
 * rather than a parsed JSON object.
 */
export async function exportData(options?: LegalRequestOptions): Promise<Blob> {
  const response = await get<Record<string, unknown>>('/legal/export-data', {
    signal: options?.signal,
  });
  return new Blob([JSON.stringify(response, null, 2)], {
    type: 'application/json',
  });
}
