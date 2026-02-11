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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - Public asset folders
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
