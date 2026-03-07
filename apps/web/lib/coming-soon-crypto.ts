/**
 * Shared HMAC crypto utilities for the coming-soon bypass flow.
 *
 * Used by:
 *   - apps/web/middleware.ts          (Edge Runtime — verifies bypass cookie)
 *   - apps/web/app/api/coming-soon-bypass/route.ts  (Edge Runtime — issues bypass cookie)
 *
 * Both consumers run in the Edge Runtime and therefore use the Web Crypto API
 * (crypto.subtle) rather than Node.js crypto. No Node APIs are used here.
 */

/** Cookie name used to store the HMAC bypass token. */
export const BYPASS_COOKIE = 'site-bypass';

/** The message signed when deriving the bypass token. */
export const HMAC_MESSAGE = 'mergenix-bypass-token';

/**
 * Derives a hex-encoded HMAC-SHA-256 token from `secret`.
 * The raw secret is never stored in the cookie — only this derived token is.
 * Both middleware and the route handler call this function so the expected
 * value can be recomputed on every request.
 */
export async function deriveBypassToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', keyMaterial, enc.encode(HMAC_MESSAGE));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time string comparison using Web Crypto.
 *
 * Signs both `a` and `b` with the same HMAC key derived from `secret` and
 * compares the resulting fixed-length MACs byte-by-byte. Because the MAC
 * length is constant (32 bytes for SHA-256) regardless of the input length,
 * this prevents timing side-channels when comparing password/token values.
 */
export async function timingSafeEqual(a: string, b: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', keyMaterial, enc.encode(a)),
    crypto.subtle.sign('HMAC', keyMaterial, enc.encode(b)),
  ]);
  const ua = new Uint8Array(sigA);
  const ub = new Uint8Array(sigB);
  if (ua.length !== ub.length) return false;
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i]! ^ ub[i]!;
  return diff === 0;
}
