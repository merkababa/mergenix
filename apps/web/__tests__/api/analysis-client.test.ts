import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mock the base HTTP client ─────────────────────────────────────────────
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDel = vi.fn();

vi.mock('@/lib/api/client', () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: (...args: unknown[]) => mockPost(...args),
  del: (...args: unknown[]) => mockDel(...args),
}));

import {
  saveResult,
  listResults,
  getResult,
  deleteResult,
} from '@/lib/api/analysis-client';
import type {
  SaveAnalysisResponse,
  AnalysisListItem,
  AnalysisDetailResponse,
} from '@/lib/api/analysis-client';

describe('analysis-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── saveResult ──────────────────────────────────────────────────────────

  describe('saveResult', () => {
    it('should call POST /analysis/results with snake_case body', async () => {
      mockPost.mockResolvedValue({
        id: 'uuid-1',
        label: 'Test Analysis',
        created_at: '2026-01-15T10:00:00Z',
      });

      await saveResult(
        'Test Analysis',
        'parent1.vcf',
        'parent2.vcf',
        { traits: {} },
        { trait_count: 5 },
        true,
      );

      expect(mockPost).toHaveBeenCalledWith('/analysis/results', {
        label: 'Test Analysis',
        parent1_filename: 'parent1.vcf',
        parent2_filename: 'parent2.vcf',
        result_data: { traits: {} },
        summary: { trait_count: 5 },
        consent_given: true,
      });
    });

    it('should transform snake_case response to camelCase', async () => {
      mockPost.mockResolvedValue({
        id: 'uuid-1',
        label: 'Test Analysis',
        created_at: '2026-01-15T10:00:00Z',
      });

      const result = await saveResult(
        'Test Analysis',
        'parent1.vcf',
        'parent2.vcf',
        { traits: {} },
        { trait_count: 5 },
        true,
      );

      expect(result).toEqual({
        id: 'uuid-1',
        label: 'Test Analysis',
        createdAt: '2026-01-15T10:00:00Z',
      });
    });

    it('should return correctly typed SaveAnalysisResponse', async () => {
      mockPost.mockResolvedValue({
        id: 'uuid-typed',
        label: 'Typed',
        created_at: '2026-02-01T00:00:00Z',
      });

      const result: SaveAnalysisResponse = await saveResult(
        'Typed',
        'a.vcf',
        'b.vcf',
        {},
        {},
        true,
      );

      expect(typeof result.id).toBe('string');
      expect(typeof result.label).toBe('string');
      expect(typeof result.createdAt).toBe('string');
      // Verify snake_case keys do NOT exist
      expect((result as unknown as Record<string, unknown>)['created_at']).toBeUndefined();
    });

    it('should propagate errors from API client', async () => {
      mockPost.mockRejectedValue(new Error('TIER_LIMIT_REACHED'));

      await expect(
        saveResult('Label', 'a.vcf', 'b.vcf', {}, {}, true),
      ).rejects.toThrow('TIER_LIMIT_REACHED');
    });

    it('should pass consentGiven=false when explicitly set', async () => {
      mockPost.mockResolvedValue({
        id: 'uuid-1',
        label: 'Test',
        created_at: '2026-01-15T10:00:00Z',
      });

      await saveResult(
        'Test',
        'a.vcf',
        'b.vcf',
        {},
        {},
        false,
      );

      expect(mockPost).toHaveBeenCalledWith('/analysis/results', expect.objectContaining({
        consent_given: false,
      }));
    });
  });

  // ── listResults ─────────────────────────────────────────────────────────

  describe('listResults', () => {
    it('should call GET /analysis/results', async () => {
      mockGet.mockResolvedValue([]);

      await listResults();

      expect(mockGet).toHaveBeenCalledWith('/analysis/results');
    });

    it('should transform each item snake_case to camelCase', async () => {
      mockGet.mockResolvedValue([
        {
          id: 'uuid-1',
          label: 'First Analysis',
          parent1_filename: 'mom.vcf',
          parent2_filename: 'dad.vcf',
          tier_at_time: 'free',
          summary: { trait_count: 3 },
          created_at: '2026-01-10T08:00:00Z',
        },
      ]);

      const result = await listResults();

      expect(result).toEqual([
        {
          id: 'uuid-1',
          label: 'First Analysis',
          parent1Filename: 'mom.vcf',
          parent2Filename: 'dad.vcf',
          tierAtTime: 'free',
          summary: { trait_count: 3 },
          createdAt: '2026-01-10T08:00:00Z',
        },
      ]);
    });

    it('should return empty array when no results', async () => {
      mockGet.mockResolvedValue([]);

      const result = await listResults();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle multiple items', async () => {
      mockGet.mockResolvedValue([
        {
          id: 'uuid-1',
          label: 'First',
          parent1_filename: 'a.vcf',
          parent2_filename: 'b.vcf',
          tier_at_time: 'free',
          summary: null,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'uuid-2',
          label: 'Second',
          parent1_filename: 'c.vcf',
          parent2_filename: 'd.vcf',
          tier_at_time: 'premium',
          summary: { trait_count: 10 },
          created_at: '2026-01-02T00:00:00Z',
        },
      ]);

      const result = await listResults();

      expect(result).toHaveLength(2);
      expect(result[0].parent1Filename).toBe('a.vcf');
      expect(result[1].tierAtTime).toBe('premium');
    });

    it('should handle null summary', async () => {
      mockGet.mockResolvedValue([
        {
          id: 'uuid-1',
          label: 'No Summary',
          parent1_filename: 'a.vcf',
          parent2_filename: 'b.vcf',
          tier_at_time: 'free',
          summary: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      ]);

      const result = await listResults();
      expect(result[0].summary).toBeNull();
    });

    it('should return correctly typed AnalysisListItem', async () => {
      mockGet.mockResolvedValue([
        {
          id: 'uuid-typed',
          label: 'Typed List',
          parent1_filename: 'x.vcf',
          parent2_filename: 'y.vcf',
          tier_at_time: 'pro',
          summary: {},
          created_at: '2026-02-01T00:00:00Z',
        },
      ]);

      const result: AnalysisListItem[] = await listResults();
      const item = result[0];

      expect(typeof item.id).toBe('string');
      expect(typeof item.parent1Filename).toBe('string');
      expect(typeof item.parent2Filename).toBe('string');
      expect(['free', 'premium', 'pro']).toContain(item.tierAtTime);
      // Verify snake_case keys do NOT exist
      expect((item as unknown as Record<string, unknown>)['parent1_filename']).toBeUndefined();
      expect((item as unknown as Record<string, unknown>)['parent2_filename']).toBeUndefined();
      expect((item as unknown as Record<string, unknown>)['tier_at_time']).toBeUndefined();
      expect((item as unknown as Record<string, unknown>)['created_at']).toBeUndefined();
    });

    it('should propagate errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(listResults()).rejects.toThrow('Network error');
    });
  });

  describe('listResults error handling', () => {
    it('should propagate errors from API client', async () => {
      mockGet.mockRejectedValue(new Error('Unauthorized'));
      await expect(listResults()).rejects.toThrow('Unauthorized');
    });
  });

  // ── getResult ───────────────────────────────────────────────────────────

  describe('getResult', () => {
    it('should call GET /analysis/results/{id} with encoded ID', async () => {
      mockGet.mockResolvedValue({
        id: 'uuid-1',
        label: 'Test',
        parent1_filename: 'a.vcf',
        parent2_filename: 'b.vcf',
        tier_at_time: 'free',
        result_data: { traits: { eye_color: 'blue' } },
        summary: { trait_count: 1 },
        created_at: '2026-01-01T00:00:00Z',
      });

      await getResult('uuid-1');

      expect(mockGet).toHaveBeenCalledWith('/analysis/results/uuid-1');
    });

    it('should transform snake_case response to camelCase', async () => {
      mockGet.mockResolvedValue({
        id: 'uuid-1',
        label: 'Full Detail',
        parent1_filename: 'mom.23andme',
        parent2_filename: 'dad.vcf',
        tier_at_time: 'premium',
        result_data: { carrier: [], traits: [] },
        summary: { carrier_count: 0, trait_count: 0 },
        created_at: '2026-01-15T12:00:00Z',
      });

      const result = await getResult('uuid-1');

      expect(result).toEqual({
        id: 'uuid-1',
        label: 'Full Detail',
        parent1Filename: 'mom.23andme',
        parent2Filename: 'dad.vcf',
        tierAtTime: 'premium',
        resultData: { carrier: [], traits: [] },
        summary: { carrier_count: 0, trait_count: 0 },
        createdAt: '2026-01-15T12:00:00Z',
      });
    });

    it('should return correctly typed AnalysisDetailResponse', async () => {
      mockGet.mockResolvedValue({
        id: 'uuid-typed',
        label: 'Typed Detail',
        parent1_filename: 'x.vcf',
        parent2_filename: 'y.vcf',
        tier_at_time: 'pro',
        result_data: { data: 'encrypted_then_decrypted' },
        summary: {},
        created_at: '2026-02-01T00:00:00Z',
      });

      const result: AnalysisDetailResponse = await getResult('uuid-typed');

      expect(typeof result.resultData).toBe('object');
      // Verify snake_case keys do NOT exist
      expect((result as unknown as Record<string, unknown>)['result_data']).toBeUndefined();
      expect((result as unknown as Record<string, unknown>)['parent1_filename']).toBeUndefined();
      expect((result as unknown as Record<string, unknown>)['tier_at_time']).toBeUndefined();
    });

    it('should encode special characters in ID', async () => {
      mockGet.mockResolvedValue({
        id: 'uuid/special',
        label: 'Test',
        parent1_filename: 'a.vcf',
        parent2_filename: 'b.vcf',
        tier_at_time: 'free',
        result_data: {},
        summary: null,
        created_at: '2026-01-01T00:00:00Z',
      });

      await getResult('uuid/special');

      expect(mockGet).toHaveBeenCalledWith('/analysis/results/uuid%2Fspecial');
    });

    it('should propagate errors', async () => {
      mockGet.mockRejectedValue(new Error('RESULT_NOT_FOUND'));

      await expect(getResult('nonexistent')).rejects.toThrow('RESULT_NOT_FOUND');
    });
  });

  describe('getResult error handling', () => {
    it('should propagate 404 errors', async () => {
      mockGet.mockRejectedValue(new Error('RESULT_NOT_FOUND'));
      await expect(getResult('nonexistent-id')).rejects.toThrow('RESULT_NOT_FOUND');
    });

    it('should propagate 500 errors', async () => {
      mockGet.mockRejectedValue(new Error('DECRYPTION_FAILED'));
      await expect(getResult('some-id')).rejects.toThrow('DECRYPTION_FAILED');
    });
  });

  // ── deleteResult ────────────────────────────────────────────────────────

  describe('deleteResult', () => {
    it('should call DELETE /analysis/results/{id} with encoded ID', async () => {
      mockDel.mockResolvedValue({ message: 'Analysis result deleted successfully.' });

      await deleteResult('uuid-1');

      expect(mockDel).toHaveBeenCalledWith('/analysis/results/uuid-1');
    });

    it('should return void (no value)', async () => {
      mockDel.mockResolvedValue({ message: 'Deleted' });

      const result = await deleteResult('uuid-1');

      expect(result).toBeUndefined();
    });

    it('should encode special characters in ID', async () => {
      mockDel.mockResolvedValue({ message: 'Deleted' });

      await deleteResult('uuid/special');

      expect(mockDel).toHaveBeenCalledWith('/analysis/results/uuid%2Fspecial');
    });

    it('should propagate errors', async () => {
      mockDel.mockRejectedValue(new Error('RESULT_NOT_FOUND'));

      await expect(deleteResult('nonexistent')).rejects.toThrow('RESULT_NOT_FOUND');
    });
  });

  describe('deleteResult error handling', () => {
    it('should propagate 404 errors', async () => {
      mockDel.mockRejectedValue(new Error('RESULT_NOT_FOUND'));
      await expect(deleteResult('nonexistent-id')).rejects.toThrow('RESULT_NOT_FOUND');
    });
  });
});
