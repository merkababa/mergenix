/**
 * Coming Soon bypass feature tests.
 *
 * Covers three modules:
 *   1. lib/coming-soon-crypto.ts  — HMAC token derivation + timing-safe compare (unit tests)
 *   2. app/api/coming-soon-bypass/route.ts — POST handler (integration tests)
 *   3. middleware.ts — coming-soon gate logic (integration tests)
 *
 * Web Crypto API (crypto.subtle) is available in the jsdom environment used by
 * this project — confirmed by apps/web/__tests__/lib/encryption.test.ts which
 * calls globalThis.crypto.subtle directly without any mocking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── 1. Shared crypto utilities ──────────────────────────────────────────────

import {
  deriveBypassToken,
  timingSafeEqual,
  HMAC_MESSAGE,
} from '@/lib/coming-soon-crypto';

describe('coming-soon-crypto — deriveBypassToken', () => {
  it('returns a hex string', async () => {
    const token = await deriveBypassToken('my-secret');
    // HMAC-SHA-256 produces 32 bytes → 64 hex characters
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns a 64-character string (32-byte HMAC-SHA-256)', async () => {
    const token = await deriveBypassToken('any-secret');
    expect(token).toHaveLength(64);
  });

  it('is deterministic — same secret produces the same token', async () => {
    const secret = 'stable-secret-abc';
    const token1 = await deriveBypassToken(secret);
    const token2 = await deriveBypassToken(secret);
    expect(token1).toBe(token2);
  });

  it('produces different tokens for different secrets', async () => {
    const token1 = await deriveBypassToken('secret-alpha');
    const token2 = await deriveBypassToken('secret-beta');
    expect(token1).not.toBe(token2);
  });

  it('throws when passed an empty string (Web Crypto rejects zero-length HMAC keys)', async () => {
    // The Web Crypto API enforces that HMAC keys must have at least 1 byte.
    // An empty SITE_BYPASS_SECRET is therefore invalid — the route handler
    // guards against this by checking `!secret` before calling deriveBypassToken.
    await expect(deriveBypassToken('')).rejects.toThrow(/zero-length/i);
  });

  it('HMAC_MESSAGE constant is a non-empty string (used as the signed payload)', () => {
    expect(typeof HMAC_MESSAGE).toBe('string');
    expect(HMAC_MESSAGE.length).toBeGreaterThan(0);
  });
});

describe('coming-soon-crypto — timingSafeEqual', () => {
  it('returns true when comparing a string with itself', async () => {
    const result = await timingSafeEqual('hello', 'hello', 'key');
    expect(result).toBe(true);
  });

  it('returns true when both inputs are identical non-trivial strings', async () => {
    const a =
      'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
    const result = await timingSafeEqual(a, a, 'some-key');
    expect(result).toBe(true);
  });

  it('returns false when the strings differ', async () => {
    const result = await timingSafeEqual('hello', 'world', 'key');
    expect(result).toBe(false);
  });

  it('returns false when one string has extra characters appended', async () => {
    const result = await timingSafeEqual('token', 'tokenEXTRA', 'key');
    expect(result).toBe(false);
  });

  it('returns false when strings are swapped substrings of each other', async () => {
    const result = await timingSafeEqual('abc', 'abcd', 'key');
    expect(result).toBe(false);
  });

  it('returns false for empty string vs non-empty string', async () => {
    const result = await timingSafeEqual('', 'notempty', 'key');
    expect(result).toBe(false);
  });

  it('returns true for two empty strings', async () => {
    const result = await timingSafeEqual('', '', 'key');
    expect(result).toBe(true);
  });

  it('uses HMAC so the comparison is secret-key-bound (different key ≠ oracle)', async () => {
    // With a different secret key, the HMAC of the same strings differs —
    // we simply verify the function executes and returns a boolean.
    const result = await timingSafeEqual('value', 'value', 'different-key');
    expect(typeof result).toBe('boolean');
    expect(result).toBe(true); // same inputs must always match
  });

  it('correctly identifies a valid bypass token from deriveBypassToken', async () => {
    const secret = 'integration-secret';
    const expected = await deriveBypassToken(secret);
    // The token derived from the same secret must match itself via timingSafeEqual
    const result = await timingSafeEqual(expected, expected, secret);
    expect(result).toBe(true);
  });

  it('rejects a wrong token compared against a valid derived token', async () => {
    const secret = 'integration-secret';
    const expected = await deriveBypassToken(secret);
    const wrongToken = expected.replace(/[0-9a-f]/, 'z'); // corrupt one char
    const result = await timingSafeEqual(wrongToken, expected, secret);
    expect(result).toBe(false);
  });
});

// ─── 2. POST /api/coming-soon-bypass — route handler ─────────────────────────
//
// The route handler uses next/server and process.env.  We mock NextResponse and
// stub environment variables via vi.stubEnv() / vi.unstubAllEnvs().
//
// The in-memory rateLimitMap lives at module scope inside the route file.
// To test rate limiting we use vi.resetModules() to get a fresh map and then
// make enough requests to trip the limit (RATE_LIMIT_MAX = 5).

// ── Mock next/server ─────────────────────────────────────────────────────────

vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) => {
        const status = init?.status ?? 200;
        const headers = new Headers(init?.headers);
        return {
          _body: body,
          _headers: headers,
          status,
          type: 'json' as const,
          headers: {
            set: (key: string, value: string) => headers.set(key, value),
            get: (key: string) => headers.get(key),
          },
          json: () => Promise.resolve(body),
        };
      },
      redirect: (url: URL | string) => {
        const resolvedUrl = typeof url === 'string' ? new URL(url) : url;
        return {
          type: 'redirect' as const,
          url: resolvedUrl,
          status: 307,
          headers: { get: (_k: string) => null, set: () => {} },
        };
      },
      next: () => ({
        type: 'next' as const,
        status: 200,
        headers: { get: (_k: string) => null, set: () => {} },
      }),
    },
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a minimal NextRequest-like object for the route handler.
 *
 * @param opts.password  - The password field in the JSON body (undefined = no body)
 * @param opts.origin    - The Origin request header value (null = header absent)
 * @param opts.host      - The host used to construct nextUrl.origin
 * @param opts.ip        - Value for x-forwarded-for header
 */
function buildRequest(opts: {
  password?: string;
  bodyOverride?: unknown;
  origin?: string | null;
  host?: string;
  ip?: string;
  noBody?: boolean;
  malformedBody?: boolean;
}) {
  const host = opts.host ?? 'localhost:3000';
  const origin = opts.origin !== undefined ? opts.origin : null; // null = not present

  const headers: Record<string, string> = {};
  if (origin !== null) headers['origin'] = origin;
  if (opts.ip) headers['x-forwarded-for'] = opts.ip;

  let jsonBody: unknown;
  if (opts.noBody) {
    jsonBody = null; // will throw in request.json()
  } else if (opts.malformedBody) {
    jsonBody = 'INVALID_JSON';
  } else if (opts.bodyOverride !== undefined) {
    jsonBody = opts.bodyOverride;
  } else if (opts.password !== undefined) {
    jsonBody = { password: opts.password };
  } else {
    jsonBody = {};
  }

  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    nextUrl: {
      origin: `http://${host}`,
    },
    cookies: {
      get: (_name: string) => undefined,
    },
    json: opts.noBody || opts.malformedBody
      ? () => Promise.reject(new SyntaxError('invalid JSON'))
      : () => Promise.resolve(jsonBody),
  } as any;
}

// ── Tests: API route ──────────────────────────────────────────────────────────

describe('POST /api/coming-soon-bypass — route handler', () => {
  // Re-import the POST handler fresh for each test so the rate-limit map resets.
  // vi.resetModules() clears the module registry before each test.

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 401 when SITE_BYPASS_SECRET is not configured (empty string)', async () => {
    vi.stubEnv('SITE_BYPASS_SECRET', '');
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    const request = buildRequest({ password: 'anything' });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('returns 401 when SITE_BYPASS_SECRET env var is absent', async () => {
    // process.env.SITE_BYPASS_SECRET is not set — the route treats "" as falsy
    delete process.env.SITE_BYPASS_SECRET;
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    const request = buildRequest({ password: 'anything' });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 401 for a wrong password when secret is set', async () => {
    vi.stubEnv('SITE_BYPASS_SECRET', 'correct-secret');
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    const request = buildRequest({ password: 'wrong-password' });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/invalid password/i);
  });

  it('returns 200 and sets the bypass cookie for the correct password', async () => {
    const secret = 'correct-secret';
    vi.stubEnv('SITE_BYPASS_SECRET', secret);
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    const request = buildRequest({ password: secret });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('ok', true);
  });

  it('sets a Set-Cookie header containing the bypass token on success', async () => {
    const secret = 'cookie-test-secret';
    vi.stubEnv('SITE_BYPASS_SECRET', secret);
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    const request = buildRequest({ password: secret });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const cookieHeader = response.headers.get('Set-Cookie');
    expect(cookieHeader).not.toBeNull();
    expect(cookieHeader).toContain('site-bypass=');
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('SameSite=Lax');
  });

  it('cookie contains the HMAC-derived token (not the raw password)', async () => {
    const secret = 'raw-vs-hmac-test';
    vi.stubEnv('SITE_BYPASS_SECRET', secret);
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    const request = buildRequest({ password: secret });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const cookieHeader = response.headers.get('Set-Cookie') ?? '';
    // The raw secret must NOT appear in the cookie value
    expect(cookieHeader).not.toContain(secret);
    // The cookie value should be a 64-char hex HMAC token
    const match = cookieHeader.match(/site-bypass=([0-9a-f]{64})/);
    expect(match).not.toBeNull();
  });

  it('cookie token matches what deriveBypassToken would produce for the same secret', async () => {
    const secret = 'verify-hmac-matches';
    vi.stubEnv('SITE_BYPASS_SECRET', secret);
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    const request = buildRequest({ password: secret });
    const response = await POST(request);

    const cookieHeader = response.headers.get('Set-Cookie') ?? '';
    const match = cookieHeader.match(/site-bypass=([0-9a-f]{64})/);
    const tokenInCookie = match?.[1] ?? '';

    const expectedToken = await deriveBypassToken(secret);
    expect(tokenInCookie).toBe(expectedToken);
  });

  it('returns 400 for a malformed JSON body', async () => {
    vi.stubEnv('SITE_BYPASS_SECRET', 'some-secret');
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    const request = buildRequest({ malformedBody: true });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 400 when the password field is missing from the body', async () => {
    vi.stubEnv('SITE_BYPASS_SECRET', 'some-secret');
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    const request = buildRequest({ bodyOverride: { notPassword: 'value' } });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/missing password/i);
  });

  it('returns 400 when the password field is not a string', async () => {
    vi.stubEnv('SITE_BYPASS_SECRET', 'some-secret');
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    const request = buildRequest({ bodyOverride: { password: 12345 } });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 403 for a cross-origin request (CSRF protection)', async () => {
    vi.stubEnv('SITE_BYPASS_SECRET', 'some-secret');
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    // Origin header present but from a different domain
    const request = buildRequest({
      password: 'some-secret',
      origin: 'https://evil.com',
      host: 'localhost:3000',
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/forbidden/i);
  });

  it('allows same-origin requests (Origin matches host)', async () => {
    vi.stubEnv('SITE_BYPASS_SECRET', 'same-origin-secret');
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    // Origin matches the nextUrl.origin (http://localhost:3000)
    const request = buildRequest({
      password: 'same-origin-secret',
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('allows requests with no Origin header (same-origin browser requests, curl, etc.)', async () => {
    vi.stubEnv('SITE_BYPASS_SECRET', 'no-origin-secret');
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    // origin: null means the Origin header is absent
    const request = buildRequest({ password: 'no-origin-secret', origin: null });
    const response = await POST(request);

    // null origin is explicitly allowed by the route: "origin !== null && ..."
    expect(response.status).toBe(200);
  });

  it('returns 429 after exceeding the rate limit (5 failed attempts)', async () => {
    vi.stubEnv('SITE_BYPASS_SECRET', 'rate-limit-secret');
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    const ip = '10.0.0.42';

    // Make 5 failed attempts to consume the rate limit window for this IP.
    for (let i = 0; i < 5; i++) {
      const req = buildRequest({ password: 'wrong-password', ip });
      const res = await POST(req);
      // The first 5 should be 401 (wrong password), not 429
      expect(res.status).toBe(401);
    }

    // The 6th attempt from the same IP must be rate-limited
    const sixthReq = buildRequest({ password: 'wrong-password', ip });
    const sixthRes = await POST(sixthReq);

    expect(sixthRes.status).toBe(429);
    const body = await sixthRes.json();
    expect(body.error).toMatch(/too many attempts/i);
  });

  it('rate limit is per-IP — a different IP is not blocked', async () => {
    vi.stubEnv('SITE_BYPASS_SECRET', 'rate-limit-ip-test');
    const { POST } = await import('@/app/api/coming-soon-bypass/route');

    const blockedIp = '10.0.0.99';
    const cleanIp = '10.0.0.100';

    // Exhaust the limit for blockedIp
    for (let i = 0; i < 5; i++) {
      await POST(buildRequest({ password: 'wrong', ip: blockedIp }));
    }
    const blocked = await POST(buildRequest({ password: 'wrong', ip: blockedIp }));
    expect(blocked.status).toBe(429);

    // cleanIp is in a fresh window and must not be blocked
    const clean = await POST(
      buildRequest({ password: 'rate-limit-ip-test', ip: cleanIp }),
    );
    expect(clean.status).toBe(200);
  });
});

// ─── 3. Middleware — coming-soon gate ─────────────────────────────────────────
//
// The middleware function is async (it awaits deriveBypassToken / timingSafeEqual).
// We mock next/server (already mocked above) and re-import middleware freshly
// so env var changes take effect without cross-test contamination.
//
// The existing middleware.test.ts covers the auth gate logic; we add only the
// coming-soon gate tests here, following the same mock patterns.

describe('middleware — coming-soon gate', () => {
  // We need a fresh module for each test so SITE_COMING_SOON env changes take effect.
  // vi.resetModules() is already called in beforeEach of the route tests above,
  // but we scope it here independently.

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── Helper: build a mock request compatible with the middleware ────────────

  /**
   * Creates a mock NextRequest object for middleware tests.
   *
   * @param pathname       - The URL path being requested
   * @param bypassCookie   - Value of the 'site-bypass' cookie (undefined = absent)
   * @param hasAuthCookie  - Whether the 'mergenix_logged_in' cookie is present
   */
  async function buildMiddlewareRequest(
    pathname: string,
    bypassCookie?: string,
    hasAuthCookie = false,
  ) {
    const url = new URL(pathname, 'http://localhost:3000');
    return {
      nextUrl: url,
      url: url.toString(),
      cookies: {
        has: (name: string) =>
          (name === 'mergenix_logged_in' && hasAuthCookie) ||
          (name === 'site-bypass' && bypassCookie !== undefined),
        get: (name: string) => {
          if (name === 'site-bypass' && bypassCookie !== undefined) {
            return { value: bypassCookie };
          }
          return undefined;
        },
      },
    } as any;
  }

  it('redirects to /coming-soon when SITE_COMING_SOON=true and no bypass cookie', async () => {
    vi.stubEnv('SITE_COMING_SOON', 'true');
    vi.stubEnv('SITE_BYPASS_SECRET', 'test-secret');
    const { middleware } = await import('@/middleware');

    const request = await buildMiddlewareRequest('/');
    const result = await middleware(request);

    // The result should be a redirect — our mock returns { type: 'redirect', url }
    expect(result).toBeDefined();
    // The NextResponse.redirect mock returns an object with a `url` property
    expect((result as any).url?.pathname ?? (result as any).url?.toString()).toContain(
      '/coming-soon',
    );
  });

  it('allows /coming-soon through without redirect (no redirect loop)', async () => {
    vi.stubEnv('SITE_COMING_SOON', 'true');
    vi.stubEnv('SITE_BYPASS_SECRET', 'test-secret');
    const { middleware } = await import('@/middleware');

    const request = await buildMiddlewareRequest('/coming-soon');
    const result = await middleware(request);

    // NextResponse.next() — our mock returns { type: 'next' }
    expect((result as any).type).toBe('next');
  });

  it('redirects /contact to /coming-soon when SITE_COMING_SOON=true (no page exists)', async () => {
    vi.stubEnv('SITE_COMING_SOON', 'true');
    vi.stubEnv('SITE_BYPASS_SECRET', 'test-secret');
    const { middleware } = await import('@/middleware');

    const request = await buildMiddlewareRequest('/contact');
    const result = await middleware(request);

    expect((result as any).type).toBe('redirect');
  });

  it('allows /api/coming-soon-bypass through without redirect', async () => {
    vi.stubEnv('SITE_COMING_SOON', 'true');
    vi.stubEnv('SITE_BYPASS_SECRET', 'test-secret');
    const { middleware } = await import('@/middleware');

    const request = await buildMiddlewareRequest('/api/coming-soon-bypass');
    const result = await middleware(request);

    expect((result as any).type).toBe('next');
  });

  it('allows sub-paths of /coming-soon through (e.g. /coming-soon/info)', async () => {
    vi.stubEnv('SITE_COMING_SOON', 'true');
    vi.stubEnv('SITE_BYPASS_SECRET', 'test-secret');
    const { middleware } = await import('@/middleware');

    const request = await buildMiddlewareRequest('/coming-soon/info');
    const result = await middleware(request);

    expect((result as any).type).toBe('next');
  });

  it('does NOT allow /coming-soonFOO through (prefix must be exact segment boundary)', async () => {
    vi.stubEnv('SITE_COMING_SOON', 'true');
    vi.stubEnv('SITE_BYPASS_SECRET', 'test-secret');
    const { middleware } = await import('@/middleware');

    const request = await buildMiddlewareRequest('/coming-soonFOO');
    const result = await middleware(request);

    // Must redirect, not pass through
    expect((result as any).type).not.toBe('next');
    expect(
      (result as any).url?.pathname ?? (result as any).url?.toString(),
    ).toContain('/coming-soon');
  });

  it('allows requests with a valid bypass cookie through', async () => {
    const secret = 'bypass-secret-123';
    vi.stubEnv('SITE_COMING_SOON', 'true');
    vi.stubEnv('SITE_BYPASS_SECRET', secret);
    const { middleware } = await import('@/middleware');

    // Derive the exact token that middleware expects
    const validToken = await deriveBypassToken(secret);
    const request = await buildMiddlewareRequest('/', validToken);
    const result = await middleware(request);

    // Valid token — should pass through (falls through to auth logic, no auth cookie → NextResponse.next or redirect to /login, but NOT /coming-soon)
    // The key assertion: must NOT be a redirect to /coming-soon
    const redirectTarget = (result as any).url?.pathname ?? '';
    expect(redirectTarget).not.toBe('/coming-soon');
  });

  it('redirects requests with an invalid bypass cookie to /coming-soon', async () => {
    const secret = 'bypass-secret-456';
    vi.stubEnv('SITE_COMING_SOON', 'true');
    vi.stubEnv('SITE_BYPASS_SECRET', secret);
    const { middleware } = await import('@/middleware');

    const invalidToken = 'deadbeef'.repeat(8); // 64 chars but wrong value
    const request = await buildMiddlewareRequest('/', invalidToken);
    const result = await middleware(request);

    expect(
      (result as any).url?.pathname ?? (result as any).url?.toString(),
    ).toContain('/coming-soon');
  });

  it('redirects when bypass cookie is an empty string', async () => {
    const secret = 'bypass-secret-789';
    vi.stubEnv('SITE_COMING_SOON', 'true');
    vi.stubEnv('SITE_BYPASS_SECRET', secret);
    const { middleware } = await import('@/middleware');

    const request = await buildMiddlewareRequest('/', '');
    const result = await middleware(request);

    expect(
      (result as any).url?.pathname ?? (result as any).url?.toString(),
    ).toContain('/coming-soon');
  });

  it('redirects everyone to /coming-soon when secret is not configured', async () => {
    vi.stubEnv('SITE_COMING_SOON', 'true');
    vi.stubEnv('SITE_BYPASS_SECRET', ''); // empty = no secret
    const { middleware } = await import('@/middleware');

    const request = await buildMiddlewareRequest('/');
    const result = await middleware(request);

    expect(
      (result as any).url?.pathname ?? (result as any).url?.toString(),
    ).toContain('/coming-soon');
  });

  it('passes through normally when SITE_COMING_SOON is not set', async () => {
    // SITE_COMING_SOON env var absent — coming-soon gate is inactive
    delete process.env.SITE_COMING_SOON;
    const { middleware } = await import('@/middleware');

    const request = await buildMiddlewareRequest('/');
    const result = await middleware(request);

    // Public route — should pass through
    expect((result as any).type).toBe('next');
  });

  it('passes through normally when SITE_COMING_SOON is "false"', async () => {
    vi.stubEnv('SITE_COMING_SOON', 'false');
    const { middleware } = await import('@/middleware');

    const request = await buildMiddlewareRequest('/');
    const result = await middleware(request);

    expect((result as any).type).toBe('next');
  });

  it('normal auth logic still applies after bypass cookie is validated (protected route without auth)', async () => {
    const secret = 'combined-test-secret';
    vi.stubEnv('SITE_COMING_SOON', 'true');
    vi.stubEnv('SITE_BYPASS_SECRET', secret);
    const { middleware } = await import('@/middleware');

    // Valid bypass cookie but no auth cookie — visiting a protected route
    const validToken = await deriveBypassToken(secret);
    const request = await buildMiddlewareRequest('/account', validToken, false);
    const result = await middleware(request);

    // Should redirect to /login (auth gate), not /coming-soon
    const redirectTarget =
      (result as any).url?.pathname ?? (result as any).url?.toString() ?? '';
    expect(redirectTarget).toContain('/login');
    expect(redirectTarget).not.toContain('/coming-soon');
  });
});
