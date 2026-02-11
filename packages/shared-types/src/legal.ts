/**
 * Legal and privacy types — consent records, cookie preferences,
 * age verification, and GDPR data export shapes.
 */

// ── Consent ──────────────────────────────────────────────────────────────

export type ConsentType = "terms" | "privacy" | "cookies" | "age_verification";

export interface ConsentRecord {
  id: string;
  consentType: ConsentType;
  version: string;
  acceptedAt: string; // ISO 8601
}

// ── Cookies ──────────────────────────────────────────────────────────────

export interface CookiePreferences {
  essential: true; // always true, read-only
  analytics: boolean;
}

// ── Age Verification ─────────────────────────────────────────────────────

/**
 * @future Pre-declared for future use when client-side parsing of age verification records is needed.
 */
export interface AgeVerification {
  confirmed: boolean;
  confirmedAt: string; // ISO 8601
}

// ── GDPR Data Export ─────────────────────────────────────────────────────

/**
 * @future Pre-declared for future use when client-side parsing of GDPR data export responses is needed.
 *
 * Represents the parsed GDPR data export structure in camelCase.
 *
 * Note: The API returns snake_case JSON and the current legal-client
 * returns a Blob (not parsed JSON). This type represents the parsed
 * structure for use if client-side parsing is ever added. The snake_case
 * API response fields (user_id, created_at, etc.) would need to be
 * transformed to match these camelCase fields.
 */
export interface DataExportResponse {
  userId: string;
  email: string;
  name: string;
  tier: string;
  createdAt: string;
  consents: ConsentRecord[];
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
  cookiePreferences: {
    essential: true;
    analytics: boolean;
    updatedAt: string;
  } | null;
  sessions: Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    expiresAt: string;
  }>;
  analyses: Array<{
    id: string;
    label: string;
    createdAt: string;
    updatedAt: string;
  }>;
  analysisCount: number;
  exportedAt: string;
}
