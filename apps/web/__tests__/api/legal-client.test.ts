import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mock the base HTTP client ─────────────────────────────────────────────
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/lib/api/client', () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: (...args: unknown[]) => mockPost(...args),
}));

import {
  recordConsent,
  listConsents,
  updateCookiePreferences,
  getCookiePreferences,
  exportData,
} from '@/lib/api/legal-client';

describe('legal-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── recordConsent ───────────────────────────────────────────────────────

  describe('recordConsent', () => {
    it('should call POST /legal/consent with snake_case body and return camelCase', async () => {
      mockPost.mockResolvedValue({
        id: 'uuid-consent-1',
        consent_type: 'terms',
        version: '1.0',
        accepted_at: '2026-02-10T12:00:00Z',
      });

      const result = await recordConsent('terms', '1.0');

      expect(mockPost).toHaveBeenCalledWith('/legal/consent', {
        consent_type: 'terms',
        version: '1.0',
      });
      expect(result).toEqual({
        id: 'uuid-consent-1',
        consentType: 'terms',
        version: '1.0',
        acceptedAt: '2026-02-10T12:00:00Z',
      });
    });

    it('should propagate errors from API client', async () => {
      mockPost.mockRejectedValue(new Error('Unauthorized'));

      await expect(recordConsent('terms', '1.0')).rejects.toThrow('Unauthorized');
    });
  });

  // ── listConsents ──────────────────────────────────────────────────────

  describe('listConsents', () => {
    it('should call GET /legal/consent and transform to camelCase array', async () => {
      mockGet.mockResolvedValue([
        {
          id: 'uuid-1',
          consent_type: 'terms',
          version: '1.0',
          accepted_at: '2026-02-01T00:00:00Z',
        },
        {
          id: 'uuid-2',
          consent_type: 'privacy',
          version: '2.0',
          accepted_at: '2026-02-02T00:00:00Z',
        },
      ]);

      const result = await listConsents();

      expect(mockGet).toHaveBeenCalledWith('/legal/consent');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'uuid-1',
        consentType: 'terms',
        version: '1.0',
        acceptedAt: '2026-02-01T00:00:00Z',
      });
      expect(result[1]).toEqual({
        id: 'uuid-2',
        consentType: 'privacy',
        version: '2.0',
        acceptedAt: '2026-02-02T00:00:00Z',
      });
    });

    it('should return empty array when no consents exist', async () => {
      mockGet.mockResolvedValue([]);

      const result = await listConsents();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  // ── updateCookiePreferences ────────────────────────────────────────────

  describe('updateCookiePreferences', () => {
    it('should call POST /legal/cookies with analytics=true', async () => {
      mockPost.mockResolvedValue({
        essential: true,
        analytics: true,
      });

      const result = await updateCookiePreferences(true);

      expect(mockPost).toHaveBeenCalledWith('/legal/cookies', {
        analytics: true,
      });
      expect(result).toEqual({
        essential: true,
        analytics: true,
      });
    });

    it('should call POST /legal/cookies with analytics=false', async () => {
      mockPost.mockResolvedValue({
        essential: true,
        analytics: false,
      });

      const result = await updateCookiePreferences(false);

      expect(mockPost).toHaveBeenCalledWith('/legal/cookies', {
        analytics: false,
      });
      expect(result).toEqual({
        essential: true,
        analytics: false,
      });
    });
  });

  // ── getCookiePreferences ──────────────────────────────────────────────

  describe('getCookiePreferences', () => {
    it('should call GET /legal/cookies and transform response', async () => {
      mockGet.mockResolvedValue({
        essential: true,
        analytics: true,
      });

      const result = await getCookiePreferences();

      expect(mockGet).toHaveBeenCalledWith('/legal/cookies');
      expect(result).toEqual({
        essential: true,
        analytics: true,
      });
    });

    it('should handle default (analytics=false) response', async () => {
      mockGet.mockResolvedValue({
        essential: true,
        analytics: false,
      });

      const result = await getCookiePreferences();

      expect(result).toEqual({
        essential: true,
        analytics: false,
      });
    });
  });

  // ── exportData ────────────────────────────────────────────────────────

  describe('exportData', () => {
    it('should call GET /legal/export-data and return a Blob', async () => {
      mockGet.mockResolvedValue({
        user_id: 'uuid-user',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        created_at: '2026-01-01T00:00:00Z',
        consents: [],
        payments: [],
        cookie_preferences: null,
        analysis_count: 0,
        exported_at: '2026-02-10T12:00:00Z',
      });

      const result = await exportData();

      expect(mockGet).toHaveBeenCalledWith('/legal/export-data');
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/json');

      // Verify blob content
      const text = await result.text();
      const parsed = JSON.parse(text);
      expect(parsed.user_id).toBe('uuid-user');
      expect(parsed.email).toBe('test@example.com');
    });

    it('should propagate errors from API client', async () => {
      mockGet.mockRejectedValue(new Error('Rate limited'));

      await expect(exportData()).rejects.toThrow('Rate limited');
    });
  });
});
