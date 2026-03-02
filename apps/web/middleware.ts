/**
 * Next.js Edge Middleware — route protection based on auth indicator cookie.
 *
 * Runs in Edge Runtime, so it cannot use Node.js APIs or decode JWTs.
 * It checks for a lightweight "logged in" indicator cookie (not the
 * actual refresh token, which is httpOnly and not accessible from JS).
 *
 * Route classification:
 * - Protected: /account, /analysis, /counseling, /subscription
 *   -> Redirect to /login if no auth cookie
 * - Auth pages: /login, /register, /forgot-password
 *   -> Redirect to /account if auth cookie exists
 * - Public: everything else (/, /about, /diseases, /glossary, /legal,
 *   /products, /verify-email, /reset-password)
 *   -> No auth check
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  deriveBypassToken,
  timingSafeEqual,
  BYPASS_COOKIE,
} from "@/lib/coming-soon-crypto";

const INDICATOR_COOKIE = "mergenix_logged_in";

/** Routes that require authentication. */
const PROTECTED_PREFIXES = [
  "/account",
  "/analysis",
  "/counseling",
  "/subscription",
];

/** Auth pages that should redirect to /account if already logged in. */
const AUTH_PREFIXES = ["/login", "/register", "/forgot-password"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const COMING_SOON_PATH = "/coming-soon";

/**
 * Paths that are always allowed through when SITE_COMING_SOON=true.
 * Each entry is checked with exact match OR exact-prefix match (e.g. /foo/bar
 * is allowed if /foo is in the list, but /foobar is not).
 */
const COMING_SOON_ALLOWED_PATHS = [
  COMING_SOON_PATH,
  "/privacy",
  "/api/coming-soon-bypass",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Coming-soon site lock ───────────────────────────────────────────────────
  // Check this FIRST, before any auth logic, so locked-out visitors never hit
  // protected-route redirects that reveal internal route structure.
  if (process.env.SITE_COMING_SOON === "true") {
    const bypassSecret = process.env.SITE_BYPASS_SECRET ?? "";

    // Step 1: Always allow through specific whitelisted paths.
    // matchesPrefix uses exact match OR <path>/<subpath> — never bare startsWith
    // which would allow /api/coming-soon-bypass-ANYTHING through.
    if (matchesPrefix(pathname, COMING_SOON_ALLOWED_PATHS)) {
      return NextResponse.next();
    }

    // Step 2: Allow requests that carry a valid bypass cookie through.
    if (bypassSecret) {
      const cookieBypass = request.cookies.get(BYPASS_COOKIE)?.value ?? "";
      // Derive the expected HMAC token and compare constant-time.
      const expectedToken = await deriveBypassToken(bypassSecret);
      const valid = cookieBypass.length > 0 &&
        await timingSafeEqual(cookieBypass, expectedToken, bypassSecret);
      if (valid) {
        // Valid bypass cookie — fall through to normal auth logic below.
        // (intentional — do not return here)
      } else {
        return NextResponse.redirect(new URL(COMING_SOON_PATH, request.url));
      }
    } else {
      // No secret configured — redirect everyone to the coming-soon page.
      return NextResponse.redirect(new URL(COMING_SOON_PATH, request.url));
    }
  }
  // ── End coming-soon site lock ───────────────────────────────────────────────

  const hasAuthCookie = request.cookies.has(INDICATOR_COOKIE);

  // Protected routes: redirect to login if not authenticated
  if (matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    if (!hasAuthCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Auth pages: redirect to account if already authenticated
  if (matchesPrefix(pathname, AUTH_PREFIXES)) {
    if (hasAuthCookie) {
      return NextResponse.redirect(new URL("/account", request.url));
    }
    return NextResponse.next();
  }

  // All other routes: pass through
  return NextResponse.next();
}

/**
 * Matcher config — only run middleware on pages, not on static assets,
 * API routes, or Next.js internals.
 *
 * API routes are excluded because they handle their own authentication
 * (e.g., the coming-soon bypass route validates its own credentials).
 * Running auth middleware on API routes is unnecessary overhead and can
 * interfere with routes that intentionally accept unauthenticated requests.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/ (API routes handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - Public asset folders
     */
    "/((?!api/|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
