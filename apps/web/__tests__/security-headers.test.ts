import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SecurityHeadersConfig, CSPDirectives } from '@/config/security';

// ─── Tests for config/security.ts ────────────────────────────────────────────

describe('config/security', () => {
  let securityModule: typeof import('@/config/security');

  beforeEach(async () => {
    vi.resetModules();
    securityModule = await import('@/config/security');
  });

  // ── CSP Directives ──────────────────────────────────────────────────────

  describe('CSP_DIRECTIVES', () => {
    it('exports CSP_DIRECTIVES as a non-empty object', () => {
      expect(securityModule.CSP_DIRECTIVES).toBeDefined();
      expect(typeof securityModule.CSP_DIRECTIVES).toBe('object');
    });

    it('has default-src set to self', () => {
      expect(securityModule.CSP_DIRECTIVES['default-src']).toEqual(["'self'"]);
    });

    it('has script-src including self and unsafe-inline for Next.js hydration', () => {
      const scriptSrc = securityModule.CSP_DIRECTIVES['script-src'];
      expect(scriptSrc).toContain("'self'");
      expect(scriptSrc).toContain("'unsafe-inline'");
    });

    it('has style-src including self and unsafe-inline for Tailwind', () => {
      const styleSrc = securityModule.CSP_DIRECTIVES['style-src'];
      expect(styleSrc).toContain("'self'");
      expect(styleSrc).toContain("'unsafe-inline'");
    });

    it('has worker-src including self and blob: for Web Workers', () => {
      const workerSrc = securityModule.CSP_DIRECTIVES['worker-src'];
      expect(workerSrc).toContain("'self'");
      expect(workerSrc).toContain('blob:');
    });

    it('has connect-src including self', () => {
      const connectSrc = securityModule.CSP_DIRECTIVES['connect-src'];
      expect(connectSrc).toContain("'self'");
    });

    it('has img-src including self, data:, and blob:', () => {
      const imgSrc = securityModule.CSP_DIRECTIVES['img-src'];
      expect(imgSrc).toContain("'self'");
      expect(imgSrc).toContain('data:');
      expect(imgSrc).toContain('blob:');
    });

    it('has font-src including self', () => {
      const fontSrc = securityModule.CSP_DIRECTIVES['font-src'];
      expect(fontSrc).toContain("'self'");
    });

    it('has frame-ancestors set to none', () => {
      expect(securityModule.CSP_DIRECTIVES['frame-ancestors']).toEqual(["'none'"]);
    });

    it('has base-uri set to self', () => {
      expect(securityModule.CSP_DIRECTIVES['base-uri']).toEqual(["'self'"]);
    });

    it('has form-action set to self', () => {
      expect(securityModule.CSP_DIRECTIVES['form-action']).toEqual(["'self'"]);
    });

    it('has object-src set to none', () => {
      expect(securityModule.CSP_DIRECTIVES['object-src']).toEqual(["'none'"]);
    });

    it('has upgrade-insecure-requests as an empty-value directive', () => {
      expect(securityModule.CSP_DIRECTIVES['upgrade-insecure-requests']).toEqual([]);
    });
  });

  // ── buildCSPString ──────────────────────────────────────────────────────

  describe('buildCSPString', () => {
    it('exports buildCSPString as a function', () => {
      expect(typeof securityModule.buildCSPString).toBe('function');
    });

    it('returns a string containing all directive keys', () => {
      const csp = securityModule.buildCSPString(securityModule.CSP_DIRECTIVES);
      expect(csp).toContain('default-src');
      expect(csp).toContain('script-src');
      expect(csp).toContain('style-src');
      expect(csp).toContain('worker-src');
      expect(csp).toContain('connect-src');
      expect(csp).toContain('img-src');
      expect(csp).toContain('font-src');
      expect(csp).toContain('frame-ancestors');
      expect(csp).toContain('base-uri');
      expect(csp).toContain('form-action');
      expect(csp).toContain('object-src');
      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('separates directives with semicolons', () => {
      const csp = securityModule.buildCSPString(securityModule.CSP_DIRECTIVES);
      const parts = csp
        .split(';')
        .map((s: string) => s.trim())
        .filter(Boolean);
      // Should have at least 12 directives (11 original + upgrade-insecure-requests)
      expect(parts.length).toBeGreaterThanOrEqual(12);
    });

    it('formats each directive as "key value1 value2"', () => {
      const csp = securityModule.buildCSPString({
        'default-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'blob:'],
      });
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("img-src 'self' data: blob:");
    });

    it('returns empty string for empty directives', () => {
      expect(securityModule.buildCSPString({} as CSPDirectives)).toBe('');
    });

    it('renders empty-value directives as just the directive name', () => {
      const csp = securityModule.buildCSPString({
        'upgrade-insecure-requests': [],
      });
      expect(csp).toBe('upgrade-insecure-requests');
    });
  });

  // ── SECURITY_HEADERS ───────────────────────────────────────────────────

  describe('SECURITY_HEADERS', () => {
    it('exports SECURITY_HEADERS as a non-empty array', () => {
      expect(Array.isArray(securityModule.SECURITY_HEADERS)).toBe(true);
      expect(securityModule.SECURITY_HEADERS.length).toBeGreaterThanOrEqual(6);
    });

    it('each header has key and value as strings', () => {
      for (const header of securityModule.SECURITY_HEADERS) {
        expect(typeof header.key).toBe('string');
        expect(typeof header.value).toBe('string');
        expect(header.key.length).toBeGreaterThan(0);
        expect(header.value.length).toBeGreaterThan(0);
      }
    });

    it('includes Content-Security-Policy header', () => {
      const cspHeader = securityModule.SECURITY_HEADERS.find(
        (h: SecurityHeadersConfig) => h.key === 'Content-Security-Policy',
      );
      expect(cspHeader).toBeDefined();
      expect(cspHeader!.value).toContain("default-src 'self'");
      expect(cspHeader!.value).toContain("worker-src 'self' blob:");
    });

    it('includes Strict-Transport-Security header with correct value', () => {
      const stsHeader = securityModule.SECURITY_HEADERS.find(
        (h: SecurityHeadersConfig) => h.key === 'Strict-Transport-Security',
      );
      expect(stsHeader).toBeDefined();
      expect(stsHeader!.value).toBe('max-age=63072000; includeSubDomains; preload');
    });

    it('includes X-Content-Type-Options header set to nosniff', () => {
      const xctoHeader = securityModule.SECURITY_HEADERS.find(
        (h: SecurityHeadersConfig) => h.key === 'X-Content-Type-Options',
      );
      expect(xctoHeader).toBeDefined();
      expect(xctoHeader!.value).toBe('nosniff');
    });

    it('includes X-Frame-Options header set to DENY', () => {
      const xfoHeader = securityModule.SECURITY_HEADERS.find(
        (h: SecurityHeadersConfig) => h.key === 'X-Frame-Options',
      );
      expect(xfoHeader).toBeDefined();
      expect(xfoHeader!.value).toBe('DENY');
    });

    it('includes Referrer-Policy header', () => {
      const rpHeader = securityModule.SECURITY_HEADERS.find(
        (h: SecurityHeadersConfig) => h.key === 'Referrer-Policy',
      );
      expect(rpHeader).toBeDefined();
      expect(rpHeader!.value).toBe('strict-origin-when-cross-origin');
    });

    it('includes Permissions-Policy header disabling sensitive APIs', () => {
      const ppHeader = securityModule.SECURITY_HEADERS.find(
        (h: SecurityHeadersConfig) => h.key === 'Permissions-Policy',
      );
      expect(ppHeader).toBeDefined();
      expect(ppHeader!.value).toContain('camera=()');
      expect(ppHeader!.value).toContain('microphone=()');
      expect(ppHeader!.value).toContain('geolocation=()');
      expect(ppHeader!.value).toContain('interest-cohort=()');
      expect(ppHeader!.value).toContain('browsing-topics=()');
    });
  });

  // ── Development CSP ─────────────────────────────────────────────────────

  describe('getCSPDirectives (environment-aware)', () => {
    it('exports getCSPDirectives as a function', () => {
      expect(typeof securityModule.getCSPDirectives).toBe('function');
    });

    it('returns production directives when isDev is false', () => {
      const directives = securityModule.getCSPDirectives(false);
      const connectSrc = directives['connect-src'];
      // Production should NOT include localhost wildcards
      expect(connectSrc).not.toContain('http://localhost:*');
      expect(connectSrc).not.toContain('ws://localhost:*');
    });

    it('returns development directives when isDev is true', () => {
      const directives = securityModule.getCSPDirectives(true);
      const connectSrc = directives['connect-src'];
      // Development should include localhost for API and HMR
      expect(connectSrc).toContain('http://localhost:*');
      expect(connectSrc).toContain('ws://localhost:*');
    });

    it('development directives include unsafe-eval in script-src for Next.js dev', () => {
      const directives = securityModule.getCSPDirectives(true);
      const scriptSrc = directives['script-src'];
      expect(scriptSrc).toContain("'unsafe-eval'");
    });

    it('production directives do NOT include unsafe-eval in script-src', () => {
      const directives = securityModule.getCSPDirectives(false);
      const scriptSrc = directives['script-src'];
      expect(scriptSrc).not.toContain("'unsafe-eval'");
    });
  });

  // ── getApiOrigin (tested indirectly via CSP_DIRECTIVES) ────────────────

  describe('getApiOrigin edge cases (via CSP_DIRECTIVES)', () => {
    it('includes cross-origin API URL in connect-src when NEXT_PUBLIC_API_URL is set', async () => {
      vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.mergenix.com/v1');
      vi.resetModules();
      const mod = await import('@/config/security');
      const connectSrc = mod.CSP_DIRECTIVES['connect-src'];
      expect(connectSrc).toContain('https://api.mergenix.com');
      vi.unstubAllEnvs();
    });

    it('connect-src does not include an external origin when NEXT_PUBLIC_API_URL is an invalid URL', async () => {
      vi.stubEnv('NEXT_PUBLIC_API_URL', 'not-a-url');
      vi.resetModules();
      const mod = await import('@/config/security');
      const connectSrc = mod.CSP_DIRECTIVES['connect-src'];
      // Invalid URL should not add an external HTTPS origin to connect-src.
      // Note: In jsdom environments, URL may resolve relative to http://localhost,
      // so we verify no *external* HTTPS origin is included rather than asserting exact values.
      const externalOrigins = (connectSrc ?? []).filter(
        (v) => v !== "'self'" && v.startsWith('https://'),
      );
      expect(externalOrigins).toEqual([]);
      vi.unstubAllEnvs();
    });

    it('connect-src does not include an external origin when NEXT_PUBLIC_API_URL is a relative path', async () => {
      vi.stubEnv('NEXT_PUBLIC_API_URL', '/api');
      vi.resetModules();
      const mod = await import('@/config/security');
      const connectSrc = mod.CSP_DIRECTIVES['connect-src'];
      // Relative path should not add an external HTTPS origin to connect-src.
      // In jsdom, URL may resolve /api against http://localhost base.
      const externalOrigins = (connectSrc ?? []).filter(
        (v) => v !== "'self'" && v.startsWith('https://'),
      );
      expect(externalOrigins).toEqual([]);
      vi.unstubAllEnvs();
    });
  });

  // ── getSecurityHeaders ─────────────────────────────────────────────────

  describe('getSecurityHeaders', () => {
    it('exports getSecurityHeaders as a function', () => {
      expect(typeof securityModule.getSecurityHeaders).toBe('function');
    });

    it('returns headers array with CSP reflecting the environment', () => {
      const prodHeaders = securityModule.getSecurityHeaders(false);
      const devHeaders = securityModule.getSecurityHeaders(true);

      const prodCSP = prodHeaders.find(
        (h: SecurityHeadersConfig) => h.key === 'Content-Security-Policy',
      );
      const devCSP = devHeaders.find(
        (h: SecurityHeadersConfig) => h.key === 'Content-Security-Policy',
      );

      expect(prodCSP).toBeDefined();
      expect(devCSP).toBeDefined();

      // Dev CSP should have localhost, prod should not
      expect(devCSP!.value).toContain('http://localhost:*');
      expect(prodCSP!.value).not.toContain('http://localhost:*');
    });

    it('non-CSP headers are the same for both environments', () => {
      const prodHeaders = securityModule.getSecurityHeaders(false);
      const devHeaders = securityModule.getSecurityHeaders(true);

      const prodNonCSP = prodHeaders.filter(
        (h: SecurityHeadersConfig) => h.key !== 'Content-Security-Policy',
      );
      const devNonCSP = devHeaders.filter(
        (h: SecurityHeadersConfig) => h.key !== 'Content-Security-Policy',
      );

      expect(prodNonCSP).toEqual(devNonCSP);
    });
  });
});
