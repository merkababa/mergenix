import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock next/server ─────────────────────────────────────────────────────────

const mockRedirect = vi.fn((url: URL) => ({ type: 'redirect' as const, url }));
const mockNext = vi.fn(() => ({ type: 'next' as const }));

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL) => mockRedirect(url),
    next: () => mockNext(),
  },
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { middleware } from '../middleware';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createMockRequest(pathname: string, hasCookie = false) {
  const url = new URL(pathname, 'http://localhost:3000');
  return {
    nextUrl: url,
    url: url.toString(),
    cookies: {
      has: (name: string) => hasCookie && name === 'mergenix_logged_in',
    },
  } as any;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('/account without cookie redirects to /login?returnUrl=/account', async () => {
    const req = createMockRequest('/account');
    await middleware(req);

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const redirectUrl: URL = mockRedirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('returnUrl')).toBe('/account');
  });

  it('/account with cookie passes through', async () => {
    const req = createMockRequest('/account', true);
    await middleware(req);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('/analysis without cookie redirects to /login?returnUrl=/analysis', async () => {
    const req = createMockRequest('/analysis');
    await middleware(req);

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const redirectUrl: URL = mockRedirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('returnUrl')).toBe('/analysis');
  });

  it('/login without cookie passes through', async () => {
    const req = createMockRequest('/login');
    await middleware(req);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('/login with cookie redirects to /account', async () => {
    const req = createMockRequest('/login', true);
    await middleware(req);

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const redirectUrl: URL = mockRedirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe('/account');
  });

  it('/register with cookie redirects to /account', async () => {
    const req = createMockRequest('/register', true);
    await middleware(req);

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const redirectUrl: URL = mockRedirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe('/account');
  });

  it('/ (public) without cookie passes through', async () => {
    const req = createMockRequest('/');
    await middleware(req);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('/ (public) with cookie passes through', async () => {
    const req = createMockRequest('/', true);
    await middleware(req);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('/forgot-password without cookie passes through', async () => {
    const req = createMockRequest('/forgot-password');
    await middleware(req);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('returnUrl preserved in login redirect', async () => {
    const req = createMockRequest('/subscription/manage');
    await middleware(req);

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const redirectUrl: URL = mockRedirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('returnUrl')).toBe('/subscription/manage');
  });
});
