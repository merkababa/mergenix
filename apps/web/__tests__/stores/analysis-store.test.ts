import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { FullAnalysisResult } from '@mergenix/shared-types';

// ── Mock the analysis API client ──────────────────────────────────────────
const mockSaveResult = vi.fn();
const mockListResults = vi.fn();
const mockGetResult = vi.fn();
const mockDeleteResult = vi.fn();

vi.mock('@/lib/api/analysis-client', () => ({
  saveResult: (...args: unknown[]) => mockSaveResult(...args),
  listResults: (...args: unknown[]) => mockListResults(...args),
  getResult: (...args: unknown[]) => mockGetResult(...args),
  deleteResult: (...args: unknown[]) => mockDeleteResult(...args),
}));

import { useAnalysisStore } from '../../lib/stores/analysis-store';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockResults: FullAnalysisResult = {
  carrier: [
    {
      condition: 'Cystic Fibrosis',
      gene: 'CFTR',
      severity: 'high',
      description: '',
      parentAStatus: 'carrier',
      parentBStatus: 'carrier',
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: 'high_risk',
      rsid: 'rs1',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Sickle Cell',
      gene: 'HBB',
      severity: 'high',
      description: '',
      parentAStatus: 'carrier',
      parentBStatus: 'carrier',
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: 'high_risk',
      rsid: 'rs2',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Low Risk Disease',
      gene: 'G3',
      severity: 'low',
      description: '',
      parentAStatus: 'normal',
      parentBStatus: 'normal',
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: 'low_risk',
      rsid: 'rs3',
      inheritance: 'autosomal_recessive',
    },
  ],
  traits: [],
  pgx: {
    genesAnalyzed: 0,
    tier: 'free',
    isLimited: true,
    results: {},
    upgradeMessage: null,
    disclaimer: '',
  },
  prs: {
    conditions: {},
    metadata: {
      source: '',
      version: '',
      conditionsCovered: 0,
      lastUpdated: '',
      disclaimer: '',
    },
    tier: 'free',
    conditionsAvailable: 0,
    conditionsTotal: 0,
    disclaimer: '',
    isLimited: true,
    upgradeMessage: null,
  },
  counseling: {
    recommend: false,
    urgency: 'informational',
    reasons: [],
    nsgcUrl: '',
    summaryText: null,
    keyFindings: null,
    recommendedSpecialties: null,
    referralLetter: null,
    upgradeMessage: null,
  },
  metadata: {
    parent1Format: '23andme',
    parent2Format: 'vcf',
    parent1SnpCount: 100,
    parent2SnpCount: 200,
    analysisTimestamp: '',
    engineVersion: '3.0.0',
    tier: 'free',
  },
  coupleMode: false,
  coverageMetrics: { totalDiseases: 0, diseasesWithCoverage: 0, perDisease: {} },
  chipVersion: null,
  genomeBuild: 'GRCh37',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAnalysisStore', () => {
  beforeEach(() => {
    // Reset to initial state before every test
    useAnalysisStore.getState().reset();
    vi.clearAllMocks();
  });

  it('has correct initial state', () => {
    const state = useAnalysisStore.getState();
    expect(state.parentA).toBeNull();
    expect(state.parentB).toBeNull();
    expect(state.parentAFile).toBeNull();
    expect(state.parentBFile).toBeNull();
    expect(state.currentStep).toBe('idle');
    expect(state.stepIndex).toBe(0);
    expect(state.errorMessage).toBeNull();
    expect(state.fullResults).toBeNull();
    expect(state.parseResults).toBeNull();
    expect(state.parseProgress).toBeNull();
    expect(state.analysisProgress).toBeNull();
    expect(state.isDemo).toBe(false);
    expect(state.activeTab).toBe('overview');
    expect(state.selectedPopulation).toBeNull();
    expect(state.highRiskCount).toBe(0);
    // Persistence state
    expect(state.savedResults).toEqual([]);
    expect(state.isSaving).toBe(false);
    expect(state.saveError).toBeNull();
  });

  it('setParentA stores metadata', () => {
    const meta = { name: 'file.txt', format: '23andme' as const, size: 1024, snpCount: 500 };
    useAnalysisStore.getState().setParentA(meta);
    expect(useAnalysisStore.getState().parentA).toEqual(meta);
  });

  it('setParentB stores metadata', () => {
    const meta = { name: 'other.vcf', format: 'vcf' as const, size: 2048, snpCount: null };
    useAnalysisStore.getState().setParentB(meta);
    expect(useAnalysisStore.getState().parentB).toEqual(meta);
  });

  it('setParentAFile stores a File object', () => {
    const file = new File(['content'], 'a.txt');
    useAnalysisStore.getState().setParentAFile(file);
    expect(useAnalysisStore.getState().parentAFile).toBe(file);
  });

  it('setParentBFile stores a File object', () => {
    const file = new File(['content'], 'b.txt');
    useAnalysisStore.getState().setParentBFile(file);
    expect(useAnalysisStore.getState().parentBFile).toBe(file);
  });

  it('setStep updates currentStep and stepIndex correctly', () => {
    const steps = [
      { step: 'idle', index: 0 },
      { step: 'parsing', index: 1 },
      { step: 'carrier_analysis', index: 2 },
      { step: 'trait_prediction', index: 3 },
      { step: 'pharmacogenomics', index: 4 },
      { step: 'polygenic_risk', index: 5 },
      { step: 'ethnicity_adjustment', index: 6 },
      { step: 'counseling_triage', index: 7 },
      { step: 'complete', index: 8 },
    ] as const;

    for (const { step, index } of steps) {
      useAnalysisStore.getState().setStep(step);
      const state = useAnalysisStore.getState();
      expect(state.currentStep).toBe(step);
      expect(state.stepIndex).toBe(index);
    }
  });

  it('setStep does NOT clear errorMessage', () => {
    useAnalysisStore.getState().setError('some error');
    useAnalysisStore.getState().setStep('parsing');
    expect(useAnalysisStore.getState().errorMessage).toBe('some error');
  });

  it('setError sets and clears errorMessage', () => {
    useAnalysisStore.getState().setError('something went wrong');
    expect(useAnalysisStore.getState().errorMessage).toBe('something went wrong');

    useAnalysisStore.getState().setError(null);
    expect(useAnalysisStore.getState().errorMessage).toBeNull();
  });

  it('setFullResults stores results and computes highRiskCount', () => {
    useAnalysisStore.getState().setFullResults(mockResults);
    const state = useAnalysisStore.getState();
    expect(state.fullResults).toBe(mockResults);
    expect(state.highRiskCount).toBe(2);
  });

  it('setParseResults stores parse summaries', () => {
    const summaries = [
      { format: '23andme' as const, totalSnps: 600000, validSnps: 580000, skippedLines: 20, metadata: {} },
    ];
    useAnalysisStore.getState().setParseResults(summaries);
    expect(useAnalysisStore.getState().parseResults).toEqual(summaries);
  });

  it('setParseProgress stores fileIndex and progress', () => {
    useAnalysisStore.getState().setParseProgress(1, 75);
    expect(useAnalysisStore.getState().parseProgress).toEqual({ fileIndex: 1, progress: 75 });
  });

  it('setAnalysisProgress stores stage and progress', () => {
    useAnalysisStore.getState().setAnalysisProgress('carrier_analysis', 50);
    expect(useAnalysisStore.getState().analysisProgress).toEqual({
      stage: 'carrier_analysis',
      progress: 50,
    });
  });

  it('setDemoResults sets fullResults, isDemo, step=complete, stepIndex=8', () => {
    useAnalysisStore.getState().setDemoResults(mockResults);
    const state = useAnalysisStore.getState();
    expect(state.fullResults).toBe(mockResults);
    expect(state.isDemo).toBe(true);
    expect(state.currentStep).toBe('complete');
    expect(state.stepIndex).toBe(8);
    expect(state.highRiskCount).toBe(2);
  });

  it('setPopulation stores population value', () => {
    useAnalysisStore.getState().setPopulation('Ashkenazi Jewish');
    expect(useAnalysisStore.getState().selectedPopulation).toBe('Ashkenazi Jewish');

    useAnalysisStore.getState().setPopulation(null);
    expect(useAnalysisStore.getState().selectedPopulation).toBeNull();
  });

  it('setActiveTab changes active tab', () => {
    useAnalysisStore.getState().setActiveTab('carrier');
    expect(useAnalysisStore.getState().activeTab).toBe('carrier');

    useAnalysisStore.getState().setActiveTab('pgx');
    expect(useAnalysisStore.getState().activeTab).toBe('pgx');
  });

  it('clearFiles clears parent metadata and files', () => {
    useAnalysisStore.getState().setParentA({ name: 'a.txt', format: '23andme', size: 100, snpCount: 50 });
    useAnalysisStore.getState().setParentB({ name: 'b.txt', format: 'vcf', size: 200, snpCount: 100 });
    useAnalysisStore.getState().setParentAFile(new File([''], 'a.txt'));
    useAnalysisStore.getState().setParentBFile(new File([''], 'b.txt'));

    useAnalysisStore.getState().clearFiles();
    const state = useAnalysisStore.getState();
    expect(state.parentA).toBeNull();
    expect(state.parentB).toBeNull();
    expect(state.parentAFile).toBeNull();
    expect(state.parentBFile).toBeNull();
  });

  it('reset returns all state to initial values', () => {
    // Mutate several fields first
    useAnalysisStore.getState().setParentA({ name: 'a.txt', format: '23andme', size: 100, snpCount: 50 });
    useAnalysisStore.getState().setStep('complete');
    useAnalysisStore.getState().setError('err');
    useAnalysisStore.getState().setFullResults(mockResults);
    useAnalysisStore.getState().setActiveTab('carrier');
    useAnalysisStore.getState().setPopulation('Finnish');
    useAnalysisStore.setState({ isDemo: true, isSaving: true, saveError: 'old error' });

    useAnalysisStore.getState().reset();

    const state = useAnalysisStore.getState();
    expect(state.parentA).toBeNull();
    expect(state.parentB).toBeNull();
    expect(state.parentAFile).toBeNull();
    expect(state.parentBFile).toBeNull();
    expect(state.currentStep).toBe('idle');
    expect(state.stepIndex).toBe(0);
    expect(state.errorMessage).toBeNull();
    expect(state.fullResults).toBeNull();
    expect(state.parseResults).toBeNull();
    expect(state.parseProgress).toBeNull();
    expect(state.analysisProgress).toBeNull();
    expect(state.isDemo).toBe(false);
    expect(state.activeTab).toBe('overview');
    expect(state.selectedPopulation).toBeNull();
    expect(state.highRiskCount).toBe(0);
    // Persistence state resets too
    expect(state.savedResults).toEqual([]);
    expect(state.isSaving).toBe(false);
    expect(state.saveError).toBeNull();
  });

  // ── Persistence Actions ─────────────────────────────────────────────────

  describe('saveCurrentResult', () => {
    it('sets saveError when no results to save', async () => {
      await useAnalysisStore.getState().saveCurrentResult('Test');
      expect(useAnalysisStore.getState().saveError).toBe('No analysis results to save');
      expect(mockSaveResult).not.toHaveBeenCalled();
    });

    it('saves current results and refreshes list', async () => {
      // Setup: set results and parent files
      useAnalysisStore.getState().setFullResults(mockResults);
      useAnalysisStore.getState().setParentA({
        name: 'mom.vcf',
        format: 'vcf',
        size: 1024,
        snpCount: 100,
      });
      useAnalysisStore.getState().setParentB({
        name: 'dad.23andme',
        format: '23andme',
        size: 2048,
        snpCount: 200,
      });

      mockSaveResult.mockResolvedValue({
        id: 'new-id',
        label: 'Test Label',
        createdAt: '2026-01-01T00:00:00Z',
      });
      mockListResults.mockResolvedValue([
        {
          id: 'new-id',
          label: 'Test Label',
          parent1Filename: 'mom.vcf',
          parent2Filename: 'dad.23andme',
          tierAtTime: 'free' as const,
          summary: { trait_count: 0 },
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]);

      await useAnalysisStore.getState().saveCurrentResult('Test Label');

      expect(mockSaveResult).toHaveBeenCalledWith(
        'Test Label',
        'mom.vcf',
        'dad.23andme',
        expect.any(Object),
        expect.objectContaining({ trait_count: 0, carrier_count: 3, high_risk_count: 2 }),
        true,
      );
      expect(mockListResults).toHaveBeenCalled();
      expect(useAnalysisStore.getState().savedResults).toHaveLength(1);
      expect(useAnalysisStore.getState().isSaving).toBe(false);
    });

    it('sets isSaving to true during save', async () => {
      useAnalysisStore.getState().setFullResults(mockResults);
      let capturedisSaving = false;
      mockSaveResult.mockImplementation(() => {
        capturedisSaving = useAnalysisStore.getState().isSaving;
        return Promise.resolve({ id: '1', label: 'x', createdAt: '' });
      });
      mockListResults.mockResolvedValue([]);

      await useAnalysisStore.getState().saveCurrentResult('Test');
      expect(capturedisSaving).toBe(true);
    });

    it('sets saveError on failure and throws', async () => {
      useAnalysisStore.getState().setFullResults(mockResults);
      mockSaveResult.mockRejectedValue(new Error('TIER_LIMIT_REACHED'));

      await expect(
        useAnalysisStore.getState().saveCurrentResult('Test'),
      ).rejects.toThrow('TIER_LIMIT_REACHED');

      expect(useAnalysisStore.getState().saveError).toBe('TIER_LIMIT_REACHED');
      expect(useAnalysisStore.getState().isSaving).toBe(false);
    });

    it('resets isSaving to false after success', async () => {
      useAnalysisStore.getState().setFullResults(mockResults);
      useAnalysisStore.getState().setParentA({
        name: 'a.vcf',
        format: 'vcf',
        size: 1024,
        snpCount: 100,
      });
      useAnalysisStore.getState().setParentB({
        name: 'b.vcf',
        format: 'vcf',
        size: 2048,
        snpCount: 200,
      });

      mockSaveResult.mockResolvedValue({
        id: 'id-1',
        label: 'Test',
        createdAt: '2026-01-01T00:00:00Z',
      });
      mockListResults.mockResolvedValue([]);

      await useAnalysisStore.getState().saveCurrentResult('Test');
      expect(useAnalysisStore.getState().isSaving).toBe(false);
    });

    it('uses "unknown" for parent filenames when parents are null', async () => {
      useAnalysisStore.getState().setFullResults(mockResults);
      // Don't set parentA/parentB — they remain null
      mockSaveResult.mockResolvedValue({ id: '1', label: 'x', createdAt: '' });
      mockListResults.mockResolvedValue([]);

      await useAnalysisStore.getState().saveCurrentResult('Test');

      expect(mockSaveResult).toHaveBeenCalledWith(
        'Test',
        'unknown',
        'unknown',
        expect.any(Object),
        expect.any(Object),
        true,
      );
    });
  });

  describe('loadSavedResults', () => {
    it('loads and sets saved results', async () => {
      const items = [
        {
          id: 'id-1',
          label: 'Analysis 1',
          parent1Filename: 'a.vcf',
          parent2Filename: 'b.vcf',
          tierAtTime: 'free' as const,
          summary: null,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ];
      mockListResults.mockResolvedValue(items);

      await useAnalysisStore.getState().loadSavedResults();

      expect(useAnalysisStore.getState().savedResults).toEqual(items);
    });

    it('sets saveError on failure and throws', async () => {
      mockListResults.mockRejectedValue(new Error('Network error'));

      await expect(
        useAnalysisStore.getState().loadSavedResults(),
      ).rejects.toThrow('Network error');

      expect(useAnalysisStore.getState().saveError).toBe('Network error');
    });
  });

  describe('loadSavedResult', () => {
    it('loads a result and sets it as current with complete step', async () => {
      const detail = {
        id: 'id-1',
        label: 'Loaded',
        parent1Filename: 'a.vcf',
        parent2Filename: 'b.vcf',
        tierAtTime: 'free' as const,
        resultData: mockResults,
        summary: null,
        createdAt: '2026-01-01T00:00:00Z',
      };
      mockGetResult.mockResolvedValue(detail);

      await useAnalysisStore.getState().loadSavedResult('id-1');

      const state = useAnalysisStore.getState();
      expect(state.fullResults).toBe(mockResults);
      expect(state.currentStep).toBe('complete');
      expect(state.stepIndex).toBe(8);
      expect(state.highRiskCount).toBe(2);
      expect(state.isDemo).toBe(false);
      expect(state.isSaving).toBe(false);
      expect(state.activeTab).toBe('overview');
      expect(mockGetResult).toHaveBeenCalledWith('id-1');
    });

    it('sets isLoadingResult while loading', async () => {
      let capturedIsLoadingResult = false;
      mockGetResult.mockImplementation(() => {
        capturedIsLoadingResult = useAnalysisStore.getState().isLoadingResult;
        return Promise.resolve({
          id: '1',
          label: 'x',
          parent1Filename: 'a',
          parent2Filename: 'b',
          tierAtTime: 'free',
          resultData: mockResults,
          summary: null,
          createdAt: '',
        });
      });

      await useAnalysisStore.getState().loadSavedResult('1');
      expect(capturedIsLoadingResult).toBe(true);
    });

    it('sets saveError on failure and throws', async () => {
      mockGetResult.mockRejectedValue(new Error('RESULT_NOT_FOUND'));

      await expect(
        useAnalysisStore.getState().loadSavedResult('nonexistent'),
      ).rejects.toThrow('RESULT_NOT_FOUND');

      expect(useAnalysisStore.getState().saveError).toBe('RESULT_NOT_FOUND');
      expect(useAnalysisStore.getState().isSaving).toBe(false);
    });

    it('resets isLoadingResult to false after success', async () => {
      mockGetResult.mockResolvedValue({
        id: '1',
        label: 'x',
        parent1Filename: 'a',
        parent2Filename: 'b',
        tierAtTime: 'free',
        resultData: mockResults,
        summary: null,
        createdAt: '',
      });

      await useAnalysisStore.getState().loadSavedResult('1');
      expect(useAnalysisStore.getState().isLoadingResult).toBe(false);
    });

    it('resets isLoadingResult to false on error', async () => {
      mockGetResult.mockRejectedValue(new Error('LOAD_FAILED'));

      await expect(
        useAnalysisStore.getState().loadSavedResult('bad-id'),
      ).rejects.toThrow('LOAD_FAILED');

      expect(useAnalysisStore.getState().isLoadingResult).toBe(false);
    });
  });

  describe('deleteSavedResult', () => {
    it('deletes from API and removes from local list', async () => {
      // Pre-populate saved results
      useAnalysisStore.setState({
        savedResults: [
          {
            id: 'id-1',
            label: 'First',
            parent1Filename: 'a.vcf',
            parent2Filename: 'b.vcf',
            tierAtTime: 'free' as const,
            summary: null,
            createdAt: '2026-01-01T00:00:00Z',
          },
          {
            id: 'id-2',
            label: 'Second',
            parent1Filename: 'c.vcf',
            parent2Filename: 'd.vcf',
            tierAtTime: 'premium' as const,
            summary: null,
            createdAt: '2026-01-02T00:00:00Z',
          },
        ],
      });

      mockDeleteResult.mockResolvedValue(undefined);

      await useAnalysisStore.getState().deleteSavedResult('id-1');

      expect(mockDeleteResult).toHaveBeenCalledWith('id-1');
      const remaining = useAnalysisStore.getState().savedResults;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('id-2');
    });

    it('sets saveError on failure and throws', async () => {
      mockDeleteResult.mockRejectedValue(new Error('RESULT_NOT_FOUND'));

      await expect(
        useAnalysisStore.getState().deleteSavedResult('bad-id'),
      ).rejects.toThrow('RESULT_NOT_FOUND');

      expect(useAnalysisStore.getState().saveError).toBe('RESULT_NOT_FOUND');
    });
  });

  describe('setFullResults edge cases', () => {
    it('with zero high-risk carriers sets highRiskCount to 0', () => {
      const noHighRiskResults: FullAnalysisResult = {
        ...mockResults,
        carrier: [
          {
            condition: 'Low Risk Disease',
            gene: 'G1',
            severity: 'low',
            description: '',
            parentAStatus: 'normal',
            parentBStatus: 'normal',
            offspringRisk: { affected: 0, carrier: 0, normal: 100 },
            riskLevel: 'low_risk',
            rsid: 'rs1',
            inheritance: 'autosomal_recessive',
          },
          {
            condition: 'Medium Risk Disease',
            gene: 'G2',
            severity: 'moderate',
            description: '',
            parentAStatus: 'carrier',
            parentBStatus: 'normal',
            offspringRisk: { affected: 0, carrier: 50, normal: 50 },
            riskLevel: 'carrier_detected',
            rsid: 'rs2',
            inheritance: 'autosomal_recessive',
          },
        ],
      };

      useAnalysisStore.getState().setFullResults(noHighRiskResults);
      expect(useAnalysisStore.getState().highRiskCount).toBe(0);
    });

    it('with empty carrier array sets highRiskCount to 0', () => {
      const emptyCarrierResults: FullAnalysisResult = {
        ...mockResults,
        carrier: [],
      };

      useAnalysisStore.getState().setFullResults(emptyCarrierResults);
      expect(useAnalysisStore.getState().highRiskCount).toBe(0);
    });
  });

  describe('clearSaveError', () => {
    it('clears the saveError', () => {
      useAnalysisStore.setState({ saveError: 'some error' });
      useAnalysisStore.getState().clearSaveError();
      expect(useAnalysisStore.getState().saveError).toBeNull();
    });
  });
});
