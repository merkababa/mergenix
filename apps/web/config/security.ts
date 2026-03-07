/**
 * Content Security Policy and security headers configuration.
 *
 * This module defines typed CSP directives and security headers for the
 * Next.js frontend. It is environment-aware: development mode permits
 * localhost connections and eval for Next.js HMR/Fast Refresh, while
 * production enforces a strict policy.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single { key, value } security header. */
export interface SecurityHeadersConfig {
  key: string;
  value: string;
}

/** All CSP directive names used by this application. */
export type CSPDirectiveName =
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'worker-src'
  | 'connect-src'
  | 'img-src'
  | 'font-src'
  | 'frame-ancestors'
  | 'base-uri'
  | 'form-action'
  | 'object-src'
  | 'upgrade-insecure-requests';

/** CSP directive map — typed to the known directive names used by this app. */
export type CSPDirectives = Partial<Record<CSPDirectiveName, string[]>>;

// ─── Constants ────────────────────────────────────────────────────────────────

/** HSTS max-age in seconds (2 years). */
const HSTS_MAX_AGE_SECONDS = 63072000;

// ─── Production CSP Directives ────────────────────────────────────────────────

/**
 * Resolve the API origin for CSP connect-src.
 *
 * Strategy:
 * - If NEXT_PUBLIC_API_URL is set AND points to a different origin, include it.
 * - If it's unset or same-origin, 'self' already covers it (assumes a reverse
 *   proxy in production, e.g. /api/* → FastAPI backend).
 */
function getApiOrigin(): string | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    const url = new URL(apiUrl);
    return url.origin;
  } catch {
    // Not a valid absolute URL — likely a relative path, 'self' covers it.
    return null;
  }
}

/**
 * Base CSP directives for production.
 *
 * // TODO(S-future): Migrate to nonce-based CSP when Next.js native support matures
 *
 * - `script-src 'unsafe-inline'`: Required for Next.js inline scripts
 *   (hydration bootstrap, page data). Nonce-based CSP would require custom
 *   Next.js middleware for every response — `'unsafe-inline'` is the standard
 *   approach for Next.js apps.
 * - `style-src 'unsafe-inline'`: Tailwind CSS injects inline styles.
 * - `worker-src blob:`: The genetics engine creates Web Workers from blob: URLs.
 */
// TODO(S-future): Add report-uri/report-to
const apiOrigin = getApiOrigin();

export const CSP_DIRECTIVES: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'worker-src': ["'self'", 'blob:'],
  'connect-src': [
    "'self'",
    // Include API origin if it differs from the app's own origin (cross-origin API).
    // When NEXT_PUBLIC_API_URL is unset, we assume a same-origin proxy handles API routes.
    ...(apiOrigin ? [apiOrigin] : []),
  ],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
  'upgrade-insecure-requests': [],
};

// ─── CSP Builder ──────────────────────────────────────────────────────────────

/** Serialise a CSPDirectives map into a CSP header string. */
export function buildCSPString(directives: CSPDirectives): string {
  return Object.entries(directives)
    .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]))
    .map(([key, values]) => (values.length > 0 ? `${key} ${values.join(' ')}` : key))
    .join('; ');
}

// ─── Environment-aware CSP ────────────────────────────────────────────────────

/**
 * Return CSP directives appropriate for the given environment.
 *
 * Development additions:
 * - `connect-src` gets `http://localhost:*` (API) and `ws://localhost:*` (HMR)
 * - `script-src` gets `'unsafe-eval'` (Next.js Fast Refresh / source maps)
 */
export function getCSPDirectives(isDev: boolean): CSPDirectives {
  if (!isDev) {
    return { ...CSP_DIRECTIVES };
  }

  return {
    ...CSP_DIRECTIVES,
    'script-src': [...(CSP_DIRECTIVES['script-src'] ?? []), "'unsafe-eval'"],
    'connect-src': [
      ...(CSP_DIRECTIVES['connect-src'] ?? []),
      'http://localhost:*',
      'ws://localhost:*',
    ],
  };
}

// ─── Non-CSP Security Headers ─────────────────────────────────────────────────

const NON_CSP_HEADERS: SecurityHeadersConfig[] = [
  {
    key: 'Strict-Transport-Security',
    value: `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains; preload`,
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()',
  },
];

// ─── Combined Headers ─────────────────────────────────────────────────────────

/**
 * Return all security headers for the given environment.
 * CSP varies by environment; the other headers are constant.
 */
export function getSecurityHeaders(isDev: boolean): SecurityHeadersConfig[] {
  const cspDirectives = getCSPDirectives(isDev);
  return [
    {
      key: 'Content-Security-Policy',
      value: buildCSPString(cspDirectives),
    },
    ...NON_CSP_HEADERS,
  ];
}

/**
 * Default export: production security headers.
 * Used by next.config.ts and tests that import `SECURITY_HEADERS` directly.
 */
export const SECURITY_HEADERS: SecurityHeadersConfig[] = getSecurityHeaders(false);
