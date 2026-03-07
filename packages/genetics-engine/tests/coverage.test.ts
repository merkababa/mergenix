/**
 * Tests for the coverage calculator module.
 *
 * Tests cover per-disease coverage calculation, aggregate coverage metrics,
 * coverage summary generation, and edge cases (empty inputs, no-call genotypes,
 * single-variant diseases, duplicate rsIDs).
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDiseaseCoverage,
  calculateCoverageMetrics,
  getCoverageSummary,
} from '../src/coverage';
import type { CoverageMetrics } from '@mergenix/shared-types';

// ─── calculateDiseaseCoverage ───────────────────────────────────────────────

describe('calculateDiseaseCoverage', () => {
  it('should report all variants tested when all rsIDs are present with valid genotypes', () => {
    const diseaseInfo = {
      condition: 'Cystic Fibrosis',
      gene: 'CFTR',
      panelRsids: ['rs75030207', 'rs113993960', 'rs78655421'],
    };
    const genotypes: Record<string, string> = {
      rs75030207: 'AG',
      rs113993960: 'CT',
      rs78655421: 'GG',
    };

    const result = calculateDiseaseCoverage(diseaseInfo, genotypes);

    expect(result.variantsTested).toBe(3);
    expect(result.variantsTotal).toBe(3);
    expect(result.coveragePct).toBe(100);
    expect(result.isSufficient).toBe(true);
  });

  it('should report partial coverage when some rsIDs are present', () => {
    const diseaseInfo = {
      condition: 'Cystic Fibrosis',
      gene: 'CFTR',
      panelRsids: ['rs75030207', 'rs113993960', 'rs78655421'],
    };
    const genotypes: Record<string, string> = {
      rs75030207: 'AG',
      // rs113993960 is missing
      // rs78655421 is missing
    };

    const result = calculateDiseaseCoverage(diseaseInfo, genotypes);

    expect(result.variantsTested).toBe(1);
    expect(result.variantsTotal).toBe(3);
    expect(result.coveragePct).toBeCloseTo(33.333, 2);
    expect(result.isSufficient).toBe(true);
  });

  it('should report zero coverage when no rsIDs are present in genotypes', () => {
    const diseaseInfo = {
      condition: 'Tay-Sachs',
      gene: 'HEXA',
      panelRsids: ['rs76763715', 'rs121907954'],
    };
    const genotypes: Record<string, string> = {
      rs12345: 'AA', // unrelated rsID
    };

    const result = calculateDiseaseCoverage(diseaseInfo, genotypes);

    expect(result.variantsTested).toBe(0);
    expect(result.variantsTotal).toBe(2);
    expect(result.coveragePct).toBe(0);
    expect(result.isSufficient).toBe(false);
  });

  it('should skip no-call genotypes ("--")', () => {
    const diseaseInfo = {
      condition: 'Sickle Cell',
      gene: 'HBB',
      panelRsids: ['rs334', 'rs33930165'],
    };
    const genotypes: Record<string, string> = {
      rs334: 'AT',
      rs33930165: '--', // no-call
    };

    const result = calculateDiseaseCoverage(diseaseInfo, genotypes);

    expect(result.variantsTested).toBe(1);
    expect(result.variantsTotal).toBe(2);
    expect(result.coveragePct).toBe(50);
    expect(result.isSufficient).toBe(true);
  });

  it('should skip empty string genotypes', () => {
    const diseaseInfo = {
      condition: 'PKU',
      gene: 'PAH',
      panelRsids: ['rs5030858', 'rs5030861'],
    };
    const genotypes: Record<string, string> = {
      rs5030858: '',
      rs5030861: 'AG',
    };

    const result = calculateDiseaseCoverage(diseaseInfo, genotypes);

    expect(result.variantsTested).toBe(1);
    expect(result.variantsTotal).toBe(2);
    expect(result.coveragePct).toBe(50);
    expect(result.isSufficient).toBe(true);
  });

  it('should skip genotypes that are only dashes (e.g., "---")', () => {
    const diseaseInfo = {
      condition: 'Test Disease',
      gene: 'TEST',
      panelRsids: ['rs100', 'rs200'],
    };
    const genotypes: Record<string, string> = {
      rs100: '---',
      rs200: 'CC',
    };

    const result = calculateDiseaseCoverage(diseaseInfo, genotypes);

    expect(result.variantsTested).toBe(1);
    expect(result.variantsTotal).toBe(2);
    expect(result.coveragePct).toBe(50);
  });

  it('should skip genotypes that are only whitespace', () => {
    const diseaseInfo = {
      condition: 'Test Disease',
      gene: 'TEST',
      panelRsids: ['rs100'],
    };
    const genotypes: Record<string, string> = {
      rs100: '   ',
    };

    const result = calculateDiseaseCoverage(diseaseInfo, genotypes);

    expect(result.variantsTested).toBe(0);
    expect(result.variantsTotal).toBe(1);
    expect(result.isSufficient).toBe(false);
  });

  it('should handle empty genotype map', () => {
    const diseaseInfo = {
      condition: 'Cystic Fibrosis',
      gene: 'CFTR',
      panelRsids: ['rs75030207', 'rs113993960'],
    };

    const result = calculateDiseaseCoverage(diseaseInfo, {});

    expect(result.variantsTested).toBe(0);
    expect(result.variantsTotal).toBe(2);
    expect(result.coveragePct).toBe(0);
    expect(result.isSufficient).toBe(false);
  });

  it('should handle empty panel rsIDs array', () => {
    const diseaseInfo = {
      condition: 'Unknown Disease',
      gene: 'UNKNOWN',
      panelRsids: [],
    };
    const genotypes: Record<string, string> = {
      rs12345: 'AA',
    };

    const result = calculateDiseaseCoverage(diseaseInfo, genotypes);

    expect(result.variantsTested).toBe(0);
    expect(result.variantsTotal).toBe(0);
    expect(result.coveragePct).toBe(0);
    expect(result.isSufficient).toBe(false);
  });

  it('should handle single-variant disease with the variant present', () => {
    const diseaseInfo = {
      condition: 'Single Variant Disease',
      gene: 'GENE1',
      panelRsids: ['rs999'],
    };
    const genotypes: Record<string, string> = {
      rs999: 'AT',
    };

    const result = calculateDiseaseCoverage(diseaseInfo, genotypes);

    expect(result.variantsTested).toBe(1);
    expect(result.variantsTotal).toBe(1);
    expect(result.coveragePct).toBe(100);
    expect(result.isSufficient).toBe(true);
  });

  it('should handle single-variant disease with the variant absent', () => {
    const diseaseInfo = {
      condition: 'Single Variant Disease',
      gene: 'GENE1',
      panelRsids: ['rs999'],
    };
    const genotypes: Record<string, string> = {};

    const result = calculateDiseaseCoverage(diseaseInfo, genotypes);

    expect(result.variantsTested).toBe(0);
    expect(result.variantsTotal).toBe(1);
    expect(result.coveragePct).toBe(0);
    expect(result.isSufficient).toBe(false);
  });

  it('should accept optional knownPathogenicCount without affecting coverage calculation', () => {
    const diseaseInfo = {
      condition: 'Cystic Fibrosis',
      gene: 'CFTR',
      panelRsids: ['rs75030207'],
      knownPathogenicCount: 2100,
    };
    const genotypes: Record<string, string> = {
      rs75030207: 'AG',
    };

    const result = calculateDiseaseCoverage(diseaseInfo, genotypes);

    // knownPathogenicCount is informational only; coverage is based on panelRsids
    expect(result.variantsTested).toBe(1);
    expect(result.variantsTotal).toBe(1);
    expect(result.coveragePct).toBe(100);
  });
});

// ─── calculateCoverageMetrics ───────────────────────────────────────────────

describe('calculateCoverageMetrics', () => {
  it('should group panel entries by condition and calculate per-disease coverage', () => {
    const panel = [
      { condition: 'Cystic Fibrosis', gene: 'CFTR', rsid: 'rs75030207' },
      { condition: 'Cystic Fibrosis', gene: 'CFTR', rsid: 'rs113993960' },
      { condition: 'Sickle Cell', gene: 'HBB', rsid: 'rs334' },
    ];
    const genotypes: Record<string, string> = {
      rs75030207: 'AG',
      rs113993960: 'CT',
      rs334: 'AT',
    };

    const metrics = calculateCoverageMetrics(panel, genotypes);

    expect(metrics.totalDiseases).toBe(2);
    expect(metrics.diseasesWithCoverage).toBe(2);

    // Cystic Fibrosis: 2 of 2 tested
    const cfCoverage = metrics.perDisease['Cystic Fibrosis'];
    expect(cfCoverage).toBeDefined();
    expect(cfCoverage!.variantsTested).toBe(2);
    expect(cfCoverage!.variantsTotal).toBe(2);
    expect(cfCoverage!.coveragePct).toBe(100);
    expect(cfCoverage!.isSufficient).toBe(true);

    // Sickle Cell: 1 of 1 tested
    const scCoverage = metrics.perDisease['Sickle Cell'];
    expect(scCoverage).toBeDefined();
    expect(scCoverage!.variantsTested).toBe(1);
    expect(scCoverage!.variantsTotal).toBe(1);
    expect(scCoverage!.coveragePct).toBe(100);
    expect(scCoverage!.isSufficient).toBe(true);
  });

  it('should correctly count diseases with zero coverage', () => {
    const panel = [
      { condition: 'Disease A', gene: 'GENE_A', rsid: 'rs100' },
      { condition: 'Disease B', gene: 'GENE_B', rsid: 'rs200' },
    ];
    const genotypes: Record<string, string> = {
      rs100: 'AA',
      // rs200 missing
    };

    const metrics = calculateCoverageMetrics(panel, genotypes);

    expect(metrics.totalDiseases).toBe(2);
    expect(metrics.diseasesWithCoverage).toBe(1);

    expect(metrics.perDisease['Disease A']!.isSufficient).toBe(true);
    expect(metrics.perDisease['Disease B']!.isSufficient).toBe(false);
    expect(metrics.perDisease['Disease B']!.variantsTested).toBe(0);
  });

  it('should handle multiple rsIDs per disease with partial coverage', () => {
    const panel = [
      { condition: 'Complex Disease', gene: 'GENE_X', rsid: 'rs1' },
      { condition: 'Complex Disease', gene: 'GENE_X', rsid: 'rs2' },
      { condition: 'Complex Disease', gene: 'GENE_X', rsid: 'rs3' },
      { condition: 'Complex Disease', gene: 'GENE_X', rsid: 'rs4' },
    ];
    const genotypes: Record<string, string> = {
      rs1: 'AG',
      rs3: 'CT',
      // rs2 and rs4 missing
    };

    const metrics = calculateCoverageMetrics(panel, genotypes);

    expect(metrics.totalDiseases).toBe(1);
    expect(metrics.diseasesWithCoverage).toBe(1);

    const coverage = metrics.perDisease['Complex Disease'];
    expect(coverage).toBeDefined();
    expect(coverage!.variantsTested).toBe(2);
    expect(coverage!.variantsTotal).toBe(4);
    expect(coverage!.coveragePct).toBe(50);
    expect(coverage!.isSufficient).toBe(true);
  });

  it('should handle empty carrier panel', () => {
    const metrics = calculateCoverageMetrics([], { rs1: 'AA' });

    expect(metrics.totalDiseases).toBe(0);
    expect(metrics.diseasesWithCoverage).toBe(0);
    expect(Object.keys(metrics.perDisease)).toHaveLength(0);
  });

  it('should handle empty genotype map', () => {
    const panel = [
      { condition: 'Disease A', gene: 'GENE_A', rsid: 'rs1' },
      { condition: 'Disease B', gene: 'GENE_B', rsid: 'rs2' },
    ];

    const metrics = calculateCoverageMetrics(panel, {});

    expect(metrics.totalDiseases).toBe(2);
    expect(metrics.diseasesWithCoverage).toBe(0);
    expect(metrics.perDisease['Disease A']!.variantsTested).toBe(0);
    expect(metrics.perDisease['Disease B']!.variantsTested).toBe(0);
  });

  it('should handle both empty panel and empty genotypes', () => {
    const metrics = calculateCoverageMetrics([], {});

    expect(metrics.totalDiseases).toBe(0);
    expect(metrics.diseasesWithCoverage).toBe(0);
    expect(Object.keys(metrics.perDisease)).toHaveLength(0);
  });

  it('should deduplicate rsIDs within the same condition', () => {
    const panel = [
      { condition: 'Disease A', gene: 'GENE_A', rsid: 'rs100' },
      { condition: 'Disease A', gene: 'GENE_A', rsid: 'rs100' }, // duplicate
      { condition: 'Disease A', gene: 'GENE_A', rsid: 'rs200' },
    ];
    const genotypes: Record<string, string> = {
      rs100: 'AG',
      rs200: 'CT',
    };

    const metrics = calculateCoverageMetrics(panel, genotypes);

    // Should have 2 unique rsIDs, not 3
    expect(metrics.perDisease['Disease A']!.variantsTotal).toBe(2);
    expect(metrics.perDisease['Disease A']!.variantsTested).toBe(2);
    expect(metrics.perDisease['Disease A']!.coveragePct).toBe(100);
  });

  it('should handle no-call genotypes in aggregate metrics', () => {
    const panel = [
      { condition: 'Disease A', gene: 'GENE_A', rsid: 'rs1' },
      { condition: 'Disease A', gene: 'GENE_A', rsid: 'rs2' },
    ];
    const genotypes: Record<string, string> = {
      rs1: 'AG',
      rs2: '--',
    };

    const metrics = calculateCoverageMetrics(panel, genotypes);

    expect(metrics.perDisease['Disease A']!.variantsTested).toBe(1);
    expect(metrics.perDisease['Disease A']!.variantsTotal).toBe(2);
    expect(metrics.perDisease['Disease A']!.coveragePct).toBe(50);
    expect(metrics.diseasesWithCoverage).toBe(1);
  });

  it('should handle many diseases in the panel', () => {
    // Simulate a large panel with 100 diseases, each with 1 rsid
    const panel: Array<{ condition: string; gene: string; rsid: string }> = [];
    const genotypes: Record<string, string> = {};

    for (let i = 0; i < 100; i++) {
      panel.push({
        condition: `Disease_${i}`,
        gene: `GENE_${i}`,
        rsid: `rs${i}`,
      });
      // Only provide genotypes for even-numbered diseases
      if (i % 2 === 0) {
        genotypes[`rs${i}`] = 'AG';
      }
    }

    const metrics = calculateCoverageMetrics(panel, genotypes);

    expect(metrics.totalDiseases).toBe(100);
    expect(metrics.diseasesWithCoverage).toBe(50);
  });
});

// ─── getCoverageSummary ─────────────────────────────────────────────────────

describe('getCoverageSummary', () => {
  it('should count fully covered diseases (100% coverage)', () => {
    const metrics: CoverageMetrics = {
      totalDiseases: 3,
      diseasesWithCoverage: 3,
      perDisease: {
        'Disease A': { variantsTested: 2, variantsTotal: 2, coveragePct: 100, isSufficient: true },
        'Disease B': { variantsTested: 1, variantsTotal: 1, coveragePct: 100, isSufficient: true },
        'Disease C': { variantsTested: 3, variantsTotal: 3, coveragePct: 100, isSufficient: true },
      },
    };

    const summary = getCoverageSummary(metrics);

    expect(summary.fullyCovered).toBe(3);
    expect(summary.partiallyCovered).toBe(0);
    expect(summary.notCovered).toBe(0);
    expect(summary.overallCoveragePct).toBe(100);
  });

  it('should count partially covered diseases (>0% but <100%)', () => {
    const metrics: CoverageMetrics = {
      totalDiseases: 2,
      diseasesWithCoverage: 2,
      perDisease: {
        'Disease A': {
          variantsTested: 1,
          variantsTotal: 3,
          coveragePct: 33.333,
          isSufficient: true,
        },
        'Disease B': { variantsTested: 2, variantsTotal: 4, coveragePct: 50, isSufficient: true },
      },
    };

    const summary = getCoverageSummary(metrics);

    expect(summary.fullyCovered).toBe(0);
    expect(summary.partiallyCovered).toBe(2);
    expect(summary.notCovered).toBe(0);
  });

  it('should count not covered diseases (0% coverage)', () => {
    const metrics: CoverageMetrics = {
      totalDiseases: 2,
      diseasesWithCoverage: 0,
      perDisease: {
        'Disease A': { variantsTested: 0, variantsTotal: 2, coveragePct: 0, isSufficient: false },
        'Disease B': { variantsTested: 0, variantsTotal: 3, coveragePct: 0, isSufficient: false },
      },
    };

    const summary = getCoverageSummary(metrics);

    expect(summary.fullyCovered).toBe(0);
    expect(summary.partiallyCovered).toBe(0);
    expect(summary.notCovered).toBe(2);
    expect(summary.overallCoveragePct).toBe(0);
  });

  it('should correctly mix fully covered, partially covered, and not covered', () => {
    const metrics: CoverageMetrics = {
      totalDiseases: 4,
      diseasesWithCoverage: 3,
      perDisease: {
        Full: { variantsTested: 2, variantsTotal: 2, coveragePct: 100, isSufficient: true },
        'Partial 1': { variantsTested: 1, variantsTotal: 4, coveragePct: 25, isSufficient: true },
        'Partial 2': { variantsTested: 3, variantsTotal: 5, coveragePct: 60, isSufficient: true },
        None: { variantsTested: 0, variantsTotal: 3, coveragePct: 0, isSufficient: false },
      },
    };

    const summary = getCoverageSummary(metrics);

    expect(summary.totalDiseases).toBe(4);
    expect(summary.fullyCovered).toBe(1);
    expect(summary.partiallyCovered).toBe(2);
    expect(summary.notCovered).toBe(1);
  });

  it('should calculate overall coverage percentage as the average across diseases', () => {
    const metrics: CoverageMetrics = {
      totalDiseases: 3,
      diseasesWithCoverage: 2,
      perDisease: {
        'Disease A': { variantsTested: 2, variantsTotal: 2, coveragePct: 100, isSufficient: true },
        'Disease B': { variantsTested: 1, variantsTotal: 2, coveragePct: 50, isSufficient: true },
        'Disease C': { variantsTested: 0, variantsTotal: 2, coveragePct: 0, isSufficient: false },
      },
    };

    const summary = getCoverageSummary(metrics);

    // Average: (100 + 50 + 0) / 3 = 50.0
    expect(summary.overallCoveragePct).toBe(50);
  });

  it('should round overall coverage to one decimal place', () => {
    const metrics: CoverageMetrics = {
      totalDiseases: 3,
      diseasesWithCoverage: 3,
      perDisease: {
        'Disease A': {
          variantsTested: 1,
          variantsTotal: 3,
          coveragePct: 33.333,
          isSufficient: true,
        },
        'Disease B': {
          variantsTested: 1,
          variantsTotal: 3,
          coveragePct: 33.333,
          isSufficient: true,
        },
        'Disease C': {
          variantsTested: 1,
          variantsTotal: 3,
          coveragePct: 33.333,
          isSufficient: true,
        },
      },
    };

    const summary = getCoverageSummary(metrics);

    // Average: 33.333 -> rounded to 33.3
    expect(summary.overallCoveragePct).toBe(33.3);
  });

  it('should generate correct summary text', () => {
    const metrics: CoverageMetrics = {
      totalDiseases: 2697,
      diseasesWithCoverage: 1847,
      perDisease: {},
    };

    const summary = getCoverageSummary(metrics);

    expect(summary.summaryText).toBe('Your DNA file covers variants for 1847 of 2697 conditions');
  });

  it('should handle empty perDisease (no diseases in panel)', () => {
    const metrics: CoverageMetrics = {
      totalDiseases: 0,
      diseasesWithCoverage: 0,
      perDisease: {},
    };

    const summary = getCoverageSummary(metrics);

    expect(summary.totalDiseases).toBe(0);
    expect(summary.fullyCovered).toBe(0);
    expect(summary.partiallyCovered).toBe(0);
    expect(summary.notCovered).toBe(0);
    expect(summary.overallCoveragePct).toBe(0);
    expect(summary.summaryText).toBe('Your DNA file covers variants for 0 of 0 conditions');
  });

  it('should use totalDiseases from metrics, not from perDisease keys count', () => {
    // This tests that totalDiseases comes from the metrics object directly
    const metrics: CoverageMetrics = {
      totalDiseases: 500, // could be more than perDisease keys
      diseasesWithCoverage: 100,
      perDisease: {
        'Disease A': { variantsTested: 1, variantsTotal: 1, coveragePct: 100, isSufficient: true },
      },
    };

    const summary = getCoverageSummary(metrics);

    // totalDiseases should reflect the metrics value
    expect(summary.totalDiseases).toBe(500);
    // But counts are based on perDisease entries
    expect(summary.fullyCovered).toBe(1);
    expect(summary.summaryText).toContain('100 of 500');
  });
});

// ─── Integration: calculateCoverageMetrics → getCoverageSummary ─────────────

describe('coverage integration', () => {
  it('should produce consistent results through the full pipeline', () => {
    const panel = [
      { condition: 'Disease A', gene: 'GENE_A', rsid: 'rs1' },
      { condition: 'Disease A', gene: 'GENE_A', rsid: 'rs2' },
      { condition: 'Disease B', gene: 'GENE_B', rsid: 'rs3' },
      { condition: 'Disease C', gene: 'GENE_C', rsid: 'rs4' },
      { condition: 'Disease C', gene: 'GENE_C', rsid: 'rs5' },
      { condition: 'Disease C', gene: 'GENE_C', rsid: 'rs6' },
    ];
    const genotypes: Record<string, string> = {
      rs1: 'AG',
      rs2: 'CT',
      // rs3 missing -> Disease B not covered
      rs4: 'GG',
      // rs5 and rs6 missing -> Disease C partially covered
    };

    const metrics = calculateCoverageMetrics(panel, genotypes);
    const summary = getCoverageSummary(metrics);

    // Disease A: 2/2 = 100% (fully covered)
    // Disease B: 0/1 = 0% (not covered)
    // Disease C: 1/3 = 33.3% (partially covered)
    expect(summary.fullyCovered).toBe(1);
    expect(summary.partiallyCovered).toBe(1);
    expect(summary.notCovered).toBe(1);
    expect(summary.totalDiseases).toBe(3);

    // Average: (100 + 0 + 33.333) / 3 = 44.4 (rounded to 1 decimal)
    expect(summary.overallCoveragePct).toBeCloseTo(44.4, 1);

    // Summary text reflects diseasesWithCoverage from metrics
    expect(summary.summaryText).toBe('Your DNA file covers variants for 2 of 3 conditions');
  });
});
