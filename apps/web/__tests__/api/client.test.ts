import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// We need to reset the module state between tests, so we use dynamic imports
// and resetModules. But first, set up the fetch mock globally.

const mockFetch = vi.fn();

describe('HTTP client', () => {
  let clientModule: typeof import('@/lib/api/client');

  beforeEach(async () => {
    vi.resetModules();
    mockFetch.mockReset();
    globalThis.fetch = mockFetch;

    // Fresh import for each test to reset module-level state
    clientModule = await import('@/lib/api/client');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Helper to create mock Response ──────────────────────────────────

  function mockResponse(body: unknown, status = 200, statusText = 'OK'): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText,
      json: () => Promise.resolve(body),
      headers: new Headers(),
    } as Response;
  }

  // ── GET request ─────────────────────────────────────────────────────

  describe('get', () => {
    it('sends GET request with correct URL and headers', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: 'test' }));

      const result = await clientModule.get('/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:8000/api/test');
      expect(options.method).toBe('GET');
      expect(options.headers.Accept).toBe('application/json');
      expect(options.credentials).toBe('include');
      expect(result).toEqual({ data: 'test' });
    });

    it('does not include Content-Type for GET requests', async () => {
      mockFetch.mockResolvedValue(mockResponse({}));

      await clientModule.get('/test');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Content-Type']).toBeUndefined();
    });
  });

  // ── POST request ────────────────────────────────────────────────────

  describe('post', () => {
    it('sends POST request with Content-Type and stringified body', async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: 1 }));

      const result = await clientModule.post('/api/items', { name: 'test' });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:8000/api/items');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.body).toBe(JSON.stringify({ name: 'test' }));
      expect(result).toEqual({ id: 1 });
    });
  });

  // ── Auth header injection ───────────────────────────────────────────

  describe('auth header injection', () => {
    it('includes Bearer token when tokenAccessor is set', async () => {
      clientModule.setTokenAccessor(() => 'my-access-token');
      mockFetch.mockResolvedValue(mockResponse({}));

      await clientModule.get('/protected');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer my-access-token');
    });

    it('does not include auth header when token is null', async () => {
      clientModule.setTokenAccessor(() => null);
      mockFetch.mockResolvedValue(mockResponse({}));

      await clientModule.get('/protected');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBeUndefined();
    });
  });

  // ── skipAuth ────────────────────────────────────────────────────────

  describe('skipAuth', () => {
    it('does not include Authorization header when skipAuth is true', async () => {
      clientModule.setTokenAccessor(() => 'token');
      mockFetch.mockResolvedValue(mockResponse({}));

      await clientModule.post('/auth/login', { email: 'a' }, { skipAuth: true });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBeUndefined();
    });
  });

  // ── 204 No Content ──────────────────────────────────────────────────

  describe('204 response', () => {
    it('returns undefined for 204 No Content', async () => {
      mockFetch.mockResolvedValue(mockResponse(null, 204));

      const result = await clientModule.del('/items/1');

      expect(result).toBeUndefined();
    });
  });

  // ── 401 auto-retry ──────────────────────────────────────────────────

  describe('401 auto-retry', () => {
    it('triggers onUnauthorized and retries on 401', async () => {
      clientModule.setTokenAccessor(() => 'old-token');
      clientModule.setUnauthorizedHandler(async () => {
        clientModule.setTokenAccessor(() => 'new-token');
        return true;
      });

      mockFetch
        .mockResolvedValueOnce(mockResponse({ detail: { error: 'Unauthorized', code: 'UNAUTHORIZED' } }, 401, 'Unauthorized'))
        .mockResolvedValueOnce(mockResponse({ data: 'success' }));

      const result = await clientModule.get('/protected');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: 'success' });
    });

    it('throws original error if refresh fails', async () => {
      clientModule.setTokenAccessor(() => 'old-token');
      clientModule.setUnauthorizedHandler(async () => false);

      mockFetch.mockResolvedValue(
        mockResponse({ detail: { error: 'Unauthorized', code: 'UNAUTHORIZED' } }, 401, 'Unauthorized'),
      );

      await expect(clientModule.get('/protected')).rejects.toThrow();
    });

    it('does not retry 401 when skipAuth is true', async () => {
      clientModule.setUnauthorizedHandler(async () => true);

      mockFetch.mockResolvedValue(
        mockResponse({ detail: { error: 'Unauthorized', code: 'UNAUTHORIZED' } }, 401, 'Unauthorized'),
      );

      await expect(
        clientModule.post('/auth/login', {}, { skipAuth: true }),
      ).rejects.toThrow();

      // Should only call fetch once (no retry)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ── Timeout ─────────────────────────────────────────────────────────

  describe('timeout', () => {
    it('passes an AbortSignal to fetch', async () => {
      mockFetch.mockResolvedValue(mockResponse({}));

      await clientModule.get('/test');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.signal).toBeDefined();
    });
  });

  // ── Error parsing ───────────────────────────────────────────────────

  describe('error parsing', () => {
    it('parses validation errors (array body)', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(
          {
            detail: [
              { loc: ['body', 'email'], msg: 'Invalid email', type: 'value_error' },
              { loc: ['body', 'password'], msg: 'Too short', type: 'value_error' },
            ],
          },
          422,
        ),
      );

      try {
        await clientModule.post('/auth/register', {});
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(clientModule.ApiError);
        expect(e.status).toBe(422);
        expect(e.code).toBe('VALIDATION_ERROR');
        expect(e.fieldErrors).toHaveLength(2);
        expect(e.fieldErrors[0]).toEqual({ field: 'email', message: 'Invalid email' });
        expect(e.fieldErrors[1]).toEqual({ field: 'password', message: 'Too short' });
      }
    });

    it('parses structured error object', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(
          { detail: { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } },
          401,
        ),
      );

      try {
        await clientModule.post('/auth/login', {});
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(clientModule.ApiError);
        expect(e.status).toBe(401);
        expect(e.message).toBe('Invalid credentials');
        expect(e.code).toBe('INVALID_CREDENTIALS');
      }
    });

    it('parses structured error with challenge_token', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(
          { detail: { error: '2FA required', code: '2FA_REQUIRED', challenge_token: 'ch-1' } },
          403,
        ),
      );

      try {
        await clientModule.post('/auth/login', {});
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(clientModule.ApiError);
        expect(e.code).toBe('2FA_REQUIRED');
        expect(e.challengeToken).toBe('ch-1');
      }
    });

    it('parses plain string detail', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ detail: 'Not found' }, 404),
      );

      try {
        await clientModule.get('/missing');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(clientModule.ApiError);
        expect(e.status).toBe(404);
        expect(e.message).toBe('Not found');
      }
    });

    it('falls back to statusText for non-JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
        headers: new Headers(),
      } as Response);

      try {
        await clientModule.get('/broken');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(clientModule.ApiError);
        expect(e.status).toBe(500);
        expect(e.message).toBe('Internal Server Error');
      }
    });
  });

  // ── ApiError class ──────────────────────────────────────────────────

  describe('ApiError', () => {
    it('has correct properties', () => {
      const err = new clientModule.ApiError(
        403,
        'Forbidden',
        '2FA_REQUIRED',
        [{ field: 'code', message: 'Missing' }],
        'challenge-tok',
      );

      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('ApiError');
      expect(err.status).toBe(403);
      expect(err.message).toBe('Forbidden');
      expect(err.code).toBe('2FA_REQUIRED');
      expect(err.fieldErrors).toHaveLength(1);
      expect(err.challengeToken).toBe('challenge-tok');
    });

    it('defaults code to UNKNOWN', () => {
      const err = new clientModule.ApiError(500, 'Server error');

      expect(err.code).toBe('UNKNOWN');
      expect(err.fieldErrors).toEqual([]);
    });
  });

  // ── PUT and DELETE methods ──────────────────────────────────────────

  describe('put', () => {
    it('sends PUT request with body', async () => {
      mockFetch.mockResolvedValue(mockResponse({ updated: true }));

      await clientModule.put('/items/1', { name: 'updated' });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('PUT');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.body).toBe(JSON.stringify({ name: 'updated' }));
    });
  });

  describe('del', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValue(mockResponse({ message: 'deleted' }));

      await clientModule.del('/items/1');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('DELETE');
    });
  });

  // ── PATCH method ────────────────────────────────────────────────────

  describe('patch', () => {
    it('sends PATCH request with body', async () => {
      mockFetch.mockResolvedValue(mockResponse({ patched: true }));

      await clientModule.patch('/items/1', { field: 'value' });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:8000/items/1');
      expect(options.method).toBe('PATCH');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.body).toBe(JSON.stringify({ field: 'value' }));
    });
  });

  // ── withTransientRetry ───────────────────────────────────────────────

  describe('withTransientRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('retries on 503 twice then succeeds on 200', async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(null, 503))
        .mockResolvedValueOnce(mockResponse(null, 503))
        .mockResolvedValueOnce(mockResponse({ ok: true }, 200));

      const promise = clientModule.withTransientRetry(() => mockFetch('/test'));

      // Advance through the two retry delays (1s + 2s)
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      const response = await promise;
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('respects Retry-After header on 429', async () => {
      const retryAfterResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({}),
        headers: new Headers({ 'Retry-After': '5' }),
      } as Response;

      mockFetch
        .mockResolvedValueOnce(retryAfterResponse)
        .mockResolvedValueOnce(mockResponse({ ok: true }, 200));

      const promise = clientModule.withTransientRetry(() => mockFetch('/test'));

      // Retry-After: 5 → delay should be 5000ms
      await vi.advanceTimersByTimeAsync(5000);

      const response = await promise;
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('exhausts retries after 4 attempts (1 original + 3 retries) on persistent 503', async () => {
      mockFetch.mockResolvedValue(mockResponse(null, 503));

      const promise = clientModule.withTransientRetry(() => mockFetch('/test'));

      // Advance through all 3 retry delays (1s + 2s + 4s)
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      const response = await promise;
      // Returns the final 503 response (doesn't throw for non-network errors)
      expect(response.status).toBe(503);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('does not retry non-retryable 404', async () => {
      mockFetch.mockResolvedValue(mockResponse({ detail: 'Not found' }, 404));

      const response = await clientModule.withTransientRetry(() => mockFetch('/test'));

      expect(response.status).toBe(404);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ── Concurrent 401 refresh deduplication ────────────────────────────

  describe('concurrent 401 refresh deduplication', () => {
    it('calls _onUnauthorized exactly once when 3 concurrent requests all receive 401', async () => {
      const refreshHandler = vi.fn(async () => {
        clientModule.setTokenAccessor(() => 'new-token');
        return true;
      });

      clientModule.setTokenAccessor(() => 'old-token');
      clientModule.setUnauthorizedHandler(refreshHandler);

      // Each of the 3 requests gets a 401, then a successful retry
      // mockFetch call sequence:
      //   calls 0,1,2 → 401 (first attempts for each concurrent request)
      //   calls 3,4,5 → 200 (retried attempts after refresh)
      mockFetch
        .mockResolvedValueOnce(
          mockResponse({ detail: { error: 'Unauthorized', code: 'UNAUTHORIZED' } }, 401, 'Unauthorized'),
        )
        .mockResolvedValueOnce(
          mockResponse({ detail: { error: 'Unauthorized', code: 'UNAUTHORIZED' } }, 401, 'Unauthorized'),
        )
        .mockResolvedValueOnce(
          mockResponse({ detail: { error: 'Unauthorized', code: 'UNAUTHORIZED' } }, 401, 'Unauthorized'),
        )
        .mockResolvedValueOnce(mockResponse({ data: 'result-1' }))
        .mockResolvedValueOnce(mockResponse({ data: 'result-2' }))
        .mockResolvedValueOnce(mockResponse({ data: 'result-3' }));

      // Fire 3 concurrent requests
      const [r1, r2, r3] = await Promise.all([
        clientModule.get('/protected/1'),
        clientModule.get('/protected/2'),
        clientModule.get('/protected/3'),
      ]);

      // The refresh handler should have been invoked exactly once (deduplicated)
      expect(refreshHandler).toHaveBeenCalledTimes(1);

      // All 3 requests should have succeeded after the shared refresh
      expect(r1).toEqual({ data: 'result-1' });
      expect(r2).toEqual({ data: 'result-2' });
      expect(r3).toEqual({ data: 'result-3' });

      // Total fetch calls: 3 initial (all 401) + 3 retries = 6
      expect(mockFetch).toHaveBeenCalledTimes(6);
    });
  });
});
