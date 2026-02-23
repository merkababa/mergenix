import { NextResponse, type NextRequest } from "next/server";
import {
  deriveBypassToken,
  timingSafeEqual,
  BYPASS_COOKIE,
} from "@/lib/coming-soon-crypto";

// ── In-memory rate limiter ─────────────────────────────────────────────────
// Simple Map-based limiter — acceptable for Edge single-instance / cold-start
// environments where the coming-soon page is a low-traffic holding page.
// 5 attempts per 15 minutes per IP.

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateEntry>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Lazy eviction: when the map exceeds 1000 entries, sweep stale ones.
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap) {
      if (val.resetAt <= now) rateLimitMap.delete(key);
    }
  }

  // Only inspect and expire the current IP's entry — no full-map iteration.
  // This keeps the per-request cost O(1). The map may accumulate stale entries
  // from other IPs over time, but on a low-traffic coming-soon holding page the
  // map stays small (one entry per unique visitor IP within a 15-minute window).
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    // No entry yet, or the window has expired — start a fresh window.
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true; // allowed
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false; // blocked
  }
  entry.count += 1;
  return true; // allowed
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Return the first 16 hex chars of the SHA-256 hash of an IP address.
 * Used exclusively in log messages so that raw IPs are never written to logs.
 */
async function hashIp(ip: string): Promise<string> {
  const encoded = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── CSRF: validate Origin matches the expected host ──────────────────────
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    const ipHash = await hashIp(ip);
    console.warn(
      `[coming-soon-bypass] Rate limit exceeded from IP hash: ${ipHash} at ${new Date().toISOString()}`,
    );
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("password" in body) ||
    typeof (body as Record<string, unknown>).password !== "string"
  ) {
    return NextResponse.json({ error: "Missing password field" }, { status: 400 });
  }

  const submitted = (body as { password: string }).password;

  if (submitted.length > 256) {
    return NextResponse.json({ error: "Invalid password" }, { status: 400 });
  }

  const secret = process.env.SITE_BYPASS_SECRET ?? "";

  // ── Validate password (constant-time) ─────────────────────────────────────
  if (!secret || !(await timingSafeEqual(submitted, secret, secret))) {
    const ipHash = await hashIp(ip);
    console.warn(
      `[coming-soon-bypass] Failed attempt from IP hash: ${ipHash} at ${new Date().toISOString()}`,
    );
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // ── Derive HMAC token — raw secret never touches the cookie ──────────────
  const token = await deriveBypassToken(secret);

  // ── Build Set-Cookie header manually to add Secure in production ─────────
  const isProduction = process.env.NODE_ENV === "production";
  const cookieValue = `${BYPASS_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${isProduction ? "; Secure" : ""}`;

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.headers.set("Set-Cookie", cookieValue);
  return response;
}
