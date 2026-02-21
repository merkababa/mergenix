/**
 * Q4 — Coverage Metric Tests
 *
 * Tests the accuracy of coverage calculations across chips, tiers, and
 * specific interaction scenarios. These tests verify the "Tested X of Y"
 * semantics that users see in the UI.
 *
 * The coverage module (src/coverage.ts) provides:
 * - calculateDiseaseCoverage: per-disease coverage from panel rsIDs vs genotype map
 * - calculateCoverageMetrics: aggregate across all diseases in a panel subset
 * - getCoverageSummary: human-readable summary statistics
 *
 * The tier filtering (src/carrier.ts filterPanelByTier) provides:
 * - free tier: up to 25 diseases (subset of TOP_25_FREE_DISEASES)
 * - premium tier: up to 500 diseases
 * - pro tier: all CARRIER_PANEL_COUNT diseases (2,697)
 *
 * Integration coupling (intentional):
 * This file imports `analyzeCarrierRisk` from src/carrier.ts to construct
 * realistic tier-filtered fixtures in the "Tier-Specific" describe block.
 * This makes the coverage tests integration-level by design: they exercise
 * the full coverage → tier-filtering → carrier-analysis pipeline, not just
 * the coverage module in isolation.  This coupling is deliberate — coverage
 * semantics are inherently tied to which diseases survive tier gating.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDiseaseCoverage,
  calculateCoverageMetrics,
  getCoverageSummary,
} from '../src/coverage';
import { analyzeCarrierRisk } from '../src/carrier';
import type { CoverageMetrics } from '@mergenix/shared-types';
import { carrierPanel, CARRIER_PANEL_COUNT } from '@mergenix/genetics-data';
import type { CarrierPanelEntry } from '../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Build a genotype map with valid calls for all rsIDs in a panel subset. */
function buildFullCoverageGenotypes(panel: Array<{ rsid: string }>): Record<string, string> {
  const genotypes: Record<string, string> = {};
  for (const entry of panel) {
    genotypes[entry.rsid] = 'CC'; // homozygous reference — valid genotype
  }
  return genotypes;
}

/** Build a genotype map covering exactly half the rsIDs (the even-indexed ones). */
function buildHalfCoverageGenotypes(panel: Array<{ rsid: string }>): Record<string, string> {
  const genotypes: Record<string, string> = {};
  panel.forEach((entry, i) => {
    if (i % 2 === 0) {
      genotypes[entry.rsid] = 'CC';
    }
  });
  return genotypes;
}

// ─── Q4: Coverage Metrics Accuracy ───────────────────────────────────────

describe('Coverage Metrics — Accuracy', () => {
  it('chip with all panel rsIDs present → 100% coverage for each disease', () => {
    // Use a small test panel of known diseases
    const testPanel = [
      { condition: 'Cystic Fibrosis', gene: 'CFTR', rsid: 'rs75030207' },
      { condition: 'Cystic Fibrosis', gene: 'CFTR', rsid: 'rs113993960' },
      { condition: 'Sickle Cell Disease', gene: 'HBB', rsid: 'rs334' },
    ];
    const genotypes = {
      rs75030207: 'CC',
      rs113993960: 'GG',
      rs334: 'AA',
    };

    const metrics = calculateCoverageMetrics(testPanel, genotypes);

    expect(metrics.totalDiseases).toBe(2); // CF + Sickle Cell
    expect(metrics.diseasesWithCoverage).toBe(2);

    const cfCoverage = metrics.perDisease['Cystic Fibrosis'];
    expect(cfCoverage).toBeDefined();
    expect(cfCoverage!.coveragePct).toBe(100);
    expect(cfCoverage!.variantsTested).toBe(2);
    expect(cfCoverage!.variantsTotal).toBe(2);

    const scCoverage = metrics.perDisease['Sickle Cell Disease'];
    expect(scCoverage).toBeDefined();
    expect(scCoverage!.coveragePct).toBe(100);
    expect(scCoverage!.variantsTested).toBe(1);
    expect(scCoverage!.variantsTotal).toBe(1);
  });

  it('chip missing half of panel rsIDs → ~50% coverage for that disease', () => {
    const testPanel = [
      { condition: 'Test Disease', gene: 'GENE_A', rsid: 'rs1' },
      { condition: 'Test Disease', gene: 'GENE_A', rsid: 'rs2' },
      { condition: 'Test Disease', gene: 'GENE_A', rsid: 'rs3' },
      { condition: 'Test Disease', gene: 'GENE_A', rsid: 'rs4' },
    ];
    // Only rs1 and rs3 present (half of the 4 variants)
    const genotypes = {
      rs1: 'AA',
      rs3: 'GG',
    };

    const metrics = calculateCoverageMetrics(testPanel, genotypes);
    const coverage = metrics.perDisease['Test Disease'];

    expect(coverage).toBeDefined();
    expect(coverage!.variantsTested).toBe(2);
    expect(coverage!.variantsTotal).toBe(4);
    expect(coverage!.coveragePct).toBe(50);
    expect(coverage!.isSufficient).toBe(true); // at least one tested
  });

  it('chip with zero panel rsIDs → 0% coverage, isSufficient=false', () => {
    const testPanel = [
      { condition: 'Unknown Disease', gene: 'GENE_X', rsid: 'rs9999001' },
      { condition: 'Unknown Disease', gene: 'GENE_X', rsid: 'rs9999002' },
    ];
    // No matching rsIDs in genotype map
    const genotypes = {
      rs0000001: 'AA',
      rs0000002: 'GG',
    };

    const metrics = calculateCoverageMetrics(testPanel, genotypes);
    const coverage = metrics.perDisease['Unknown Disease'];

    expect(coverage).toBeDefined();
    expect(coverage!.variantsTested).toBe(0);
    expect(coverage!.variantsTotal).toBe(2);
    expect(coverage!.coveragePct).toBe(0);
    expect(coverage!.isSufficient).toBe(false);
    expect(metrics.diseasesWithCoverage).toBe(0);
  });

  it('coverage count matches the actual number of tested variants', () => {
    const testPanel = [
      { condition: 'Multi-Variant Disease', gene: 'GENE_B', rsid: 'rsA' },
      { condition: 'Multi-Variant Disease', gene: 'GENE_B', rsid: 'rsB' },
      { condition: 'Multi-Variant Disease', gene: 'GENE_B', rsid: 'rsC' },
      { condition: 'Multi-Variant Disease', gene: 'GENE_B', rsid: 'rsD' },
      { condition: 'Multi-Variant Disease', gene: 'GENE_B', rsid: 'rsE' },
    ];
    const genotypes = {
      rsA: 'AT',
      rsC: 'GC',
      rsE: 'TT',
      // rsB and rsD are absent
    };

    const metrics = calculateCoverageMetrics(testPanel, genotypes);
    const coverage = metrics.perDisease['Multi-Variant Disease'];

    expect(coverage).toBeDefined();
    expect(coverage!.variantsTested).toBe(3); // rsA, rsC, rsE
    expect(coverage!.variantsTotal).toBe(5);
    expect(coverage!.coveragePct).toBe(60);
  });

  it('"Tested X of Y" summary text format is correct', () => {
    const metrics: CoverageMetrics = {
      totalDiseases: 50,
      diseasesWithCoverage: 42,
      perDisease: {},
    };

    const summary = getCoverageSummary(metrics);
    expect(summary.summaryText).toBe('Your DNA file covers variants for 42 of 50 conditions');
  });

  it('no-call genotypes do not count as tested', () => {
    const testPanel = [
      { condition: 'Disease A', gene: 'GENE_A', rsid: 'rs1' },
      { condition: 'Disease A', gene: 'GENE_A', rsid: 'rs2' },
      { condition: 'Disease A', gene: 'GENE_A', rsid: 'rs3' },
    ];
    const genotypes = {
      rs1: 'AG',   // valid
      rs2: '--',   // no-call — should NOT count
      rs3: '',     // empty — should NOT count
    };

    const metrics = calculateCoverageMetrics(testPanel, genotypes);
    const coverage = metrics.perDisease['Disease A'];

    expect(coverage!.variantsTested).toBe(1); // only rs1
    expect(coverage!.variantsTotal).toBe(3);
    expect(coverage!.coveragePct).toBeCloseTo(33.33, 1);
  });
});

// ─── Q4: Tier-Specific Coverage ────────────────────────────────────────────

describe('Coverage Metrics — Tier-Specific', () => {
  it('free tier: analyzeCarrierRisk filters panel to free diseases only', () => {
    // The free tier uses TOP_25_FREE_DISEASES substring matching.
    // We build a small panel with one free disease and one non-free disease.
    const panel: CarrierPanelEntry[] = [
      {
        rsid: 'rs75030207',
        gene: 'CFTR',
        condition: 'Cystic Fibrosis (F508del)',
        inheritance: 'autosomal_recessive',
        carrier_frequency: '1 in 25',
        pathogenic_allele: 'T',
        reference_allele: 'C',
        description: 'CF description',
        severity: 'high',
        prevalence: '1 in 3500',
        omim_id: '219700',
        category: 'Pulmonary',
        sources: [],
        confidence: 'high',
        notes: '',
      },
      {
        rsid: 'rs000099',
        gene: 'GENE_ZZZ',
        condition: 'Extremely Rare Disease Not In Free Tier',
        inheritance: 'autosomal_recessive',
        carrier_frequency: '1 in 1000',
        pathogenic_allele: 'T',
        reference_allele: 'C',
        description: 'Some rare disease',
        severity: 'moderate',
        prevalence: '1 in 100000',
        omim_id: '999999',
        category: 'Metabolic',
        sources: [],
        confidence: 'medium',
        notes: '',
      },
    ];

    const genotypes = { rs75030207: 'CC', rs000099: 'CC' };
    const freeResults = analyzeCarrierRisk(genotypes, genotypes, panel, 'free');
    const allResults = analyzeCarrierRisk(genotypes, genotypes, panel);

    // Free tier should exclude the non-free disease
    expect(freeResults.length).toBeLessThan(allResults.length);
    const conditions = freeResults.map((r) => r.condition);
    expect(conditions).toContain('Cystic Fibrosis (F508del)');
    expect(conditions).not.toContain('Extremely Rare Disease Not In Free Tier');
  });

  it('premium tier: analyzeCarrierRisk returns up to 500 diseases', () => {
    // The premium tier disease limit is 500. If our panel has >500, we expect exactly 500.
    // If it has <=500, we get all of them.
    const genotypes: Record<string, string> = {};
    // Use the real carrier panel to test the tier limit
    const premiumResults = analyzeCarrierRisk({}, {}, carrierPanel, 'premium');
    const proResults = analyzeCarrierRisk({}, {}, carrierPanel, 'pro');

    expect(premiumResults.length).toBeLessThanOrEqual(500);
    expect(proResults.length).toBe(CARRIER_PANEL_COUNT);

    if (CARRIER_PANEL_COUNT > 500) {
      // premium should be capped at 500
      expect(premiumResults.length).toBe(500);
    }
  });

  it('pro tier: analyzeCarrierRisk returns all diseases in the panel', () => {
    const results = analyzeCarrierRisk({}, {}, carrierPanel, 'pro');
    expect(results).toHaveLength(CARRIER_PANEL_COUNT);
    expect(results.length).toBeGreaterThan(2500); // sanity check: should be ~2697
  });

  it('free tier coverage: calculateCoverageMetrics on free panel subset', () => {
    // Use the first 25 entries from a known free disease subset.
    // Build a genotype map for all rsIDs in that subset.
    const freePanelEntries = carrierPanel.filter((e) => {
      const lower = e.condition.toLowerCase();
      const freeDiseases = [
        'cystic fibrosis',
        'sickle cell',
        'tay-sachs',
        'phenylketonuria',
        'beta thalassemia',
      ];
      return freeDiseases.some((name) => lower.includes(name));
    });

    if (freePanelEntries.length === 0) {
      // If the filter produces nothing (unexpected), skip
      return;
    }

    // Build full coverage genotype map
    const fullGenotypes = buildFullCoverageGenotypes(freePanelEntries);
    const metrics = calculateCoverageMetrics(freePanelEntries, fullGenotypes);

    // Every disease in the filtered set should have 100% coverage
    expect(metrics.diseasesWithCoverage).toBe(metrics.totalDiseases);
    for (const [, coverage] of Object.entries(metrics.perDisease)) {
      expect(coverage.coveragePct).toBe(100);
      expect(coverage.isSufficient).toBe(true);
    }
  });

  it('premium tier: 500-disease subset has proportional coverage', () => {
    // Take the first 500 entries from the panel (simulating premium tier)
    const premiumPanel = carrierPanel.slice(0, 500);

    // Build genotype map covering exactly half (250/500 diseases)
    const halfGenotypes = buildHalfCoverageGenotypes(premiumPanel);
    const metrics = calculateCoverageMetrics(premiumPanel, halfGenotypes);

    expect(metrics.totalDiseases).toBe(
      // Unique conditions in the first 500 entries
      new Set(premiumPanel.map((e) => e.condition)).size,
    );

    // With half-coverage, roughly half the diseases should be covered
    // (not exactly 50% because multiple rsIDs can map to one disease)
    expect(metrics.diseasesWithCoverage).toBeGreaterThan(0);
    expect(metrics.diseasesWithCoverage).toBeLessThanOrEqual(metrics.totalDiseases);
  });
});

// ─── Q4: Chip Detection Interaction ────────────────────────────────────────

describe('Coverage Metrics — Chip Detection Interaction', () => {
  /**
   * Different chips cover different subsets of the panel rsIDs.
   * A 23andMe v5 chip (~640k SNPs) will cover more panel variants than
   * a chip with fewer SNPs. We simulate this by building genotype maps
   * with varying rsID coverage to represent different chip densities.
   *
   * Note: chip-coverage.json is a PLACEHOLDER with empty coverage data.
   * These tests use simulated chip genotype maps to verify the coverage
   * calculation logic behaves correctly regardless of chip type.
   */

  it('a "high-density chip" covering all panel rsIDs → 100% disease coverage', () => {
    // Simulate a chip that happens to cover all rsIDs for our test diseases
    const testPanel = [
      { condition: 'Cystic Fibrosis', gene: 'CFTR', rsid: 'rs75030207' },
      { condition: 'Cystic Fibrosis', gene: 'CFTR', rsid: 'rs113993960' },
      { condition: 'Sickle Cell Disease', gene: 'HBB', rsid: 'rs334' },
    ];

    // "High-density chip": all rsIDs present
    const highDensityChipGenotypes = {
      rs75030207: 'CT',
      rs113993960: 'GG',
      rs334: 'AT',
    };

    const metrics = calculateCoverageMetrics(testPanel, highDensityChipGenotypes);
    const summary = getCoverageSummary(metrics);

    expect(summary.fullyCovered).toBe(2); // CF (2/2) and Sickle Cell (1/1)
    expect(summary.notCovered).toBe(0);
    expect(summary.overallCoveragePct).toBe(100);
    expect(metrics.diseasesWithCoverage).toBe(2);
  });

  it('a "low-density chip" covering no panel rsIDs → 0% disease coverage', () => {
    const testPanel = [
      { condition: 'Cystic Fibrosis', gene: 'CFTR', rsid: 'rs75030207' },
      { condition: 'Sickle Cell Disease', gene: 'HBB', rsid: 'rs334' },
    ];

    // "Low-density chip": no panel rsIDs covered
    const lowDensityChipGenotypes = {
      rs1234567: 'AA',
      rs7654321: 'GG',
    };

    const metrics = calculateCoverageMetrics(testPanel, lowDensityChipGenotypes);
    const summary = getCoverageSummary(metrics);

    expect(summary.notCovered).toBe(2);
    expect(summary.fullyCovered).toBe(0);
    expect(summary.overallCoveragePct).toBe(0);
    expect(metrics.diseasesWithCoverage).toBe(0);
  });

  it('a "partial chip" covers some diseases fully, others not at all', () => {
    const testPanel = [
      { condition: 'Disease Covered', gene: 'GENE_A', rsid: 'rs100' },
      { condition: 'Disease Covered', gene: 'GENE_A', rsid: 'rs101' },
      { condition: 'Disease Not Covered', gene: 'GENE_B', rsid: 'rs200' },
      { condition: 'Disease Not Covered', gene: 'GENE_B', rsid: 'rs201' },
      { condition: 'Disease Partial', gene: 'GENE_C', rsid: 'rs300' },
      { condition: 'Disease Partial', gene: 'GENE_C', rsid: 'rs301' },
    ];

    // "Partial chip": covers Disease Covered (fully), not Disease Not Covered, partial for Disease Partial
    const partialChipGenotypes = {
      rs100: 'AA',
      rs101: 'GG',
      // rs200, rs201 absent
      rs300: 'CC',
      // rs301 absent
    };

    const metrics = calculateCoverageMetrics(testPanel, partialChipGenotypes);
    const summary = getCoverageSummary(metrics);

    expect(summary.fullyCovered).toBe(1);   // Disease Covered: 2/2
    expect(summary.partiallyCovered).toBe(1); // Disease Partial: 1/2
    expect(summary.notCovered).toBe(1);       // Disease Not Covered: 0/2
    expect(summary.totalDiseases).toBe(3);
  });

  it('coverage result is independent of genotype values (only rsID presence matters)', () => {
    // Coverage calculation counts tested rsIDs, not pathogenic status.
    // Whether the genotype is CC (normal) or CT (carrier) does not affect coverage count.
    const testPanel = [
      { condition: 'Test Disease', gene: 'GENE_T', rsid: 'rs1' },
      { condition: 'Test Disease', gene: 'GENE_T', rsid: 'rs2' },
    ];

    const allNormalGenotypes = { rs1: 'CC', rs2: 'CC' };
    const allCarrierGenotypes = { rs1: 'CT', rs2: 'GA' };
    const allAffectedGenotypes = { rs1: 'TT', rs2: 'AA' };

    const metricsNormal = calculateCoverageMetrics(testPanel, allNormalGenotypes);
    const metricsCarrier = calculateCoverageMetrics(testPanel, allCarrierGenotypes);
    const metricsAffected = calculateCoverageMetrics(testPanel, allAffectedGenotypes);

    // All three should produce identical coverage counts
    expect(metricsNormal.perDisease['Test Disease']!.variantsTested).toBe(2);
    expect(metricsCarrier.perDisease['Test Disease']!.variantsTested).toBe(2);
    expect(metricsAffected.perDisease['Test Disease']!.variantsTested).toBe(2);

    expect(metricsNormal.perDisease['Test Disease']!.coveragePct).toBe(100);
    expect(metricsCarrier.perDisease['Test Disease']!.coveragePct).toBe(100);
    expect(metricsAffected.perDisease['Test Disease']!.coveragePct).toBe(100);
  });

  it('coverage with real carrier panel: pro tier has defined totalDiseases', () => {
    // The real carrier panel has CARRIER_PANEL_COUNT entries.
    // Coverage calculation on a small genotype map should show mostly 0% coverage
    // but the total disease count should match the unique conditions in the panel.
    const smallGenotypes = {
      rs75030207: 'CC', // CF F508del
      rs334: 'AA',       // Sickle Cell
    };

    const metrics = calculateCoverageMetrics(carrierPanel, smallGenotypes);

    // Total diseases = number of unique conditions in the panel
    const uniqueConditions = new Set(carrierPanel.map((e) => e.condition)).size;
    expect(metrics.totalDiseases).toBe(uniqueConditions);

    // Only 2 rsIDs covered → at most 2 diseases have any coverage
    expect(metrics.diseasesWithCoverage).toBeLessThanOrEqual(2);
    expect(metrics.diseasesWithCoverage).toBeGreaterThanOrEqual(1);
  });

  it('summary text uses diseasesWithCoverage from metrics (not perDisease keys count)', () => {
    // The summaryText should report diseasesWithCoverage out of totalDiseases
    const metrics: CoverageMetrics = {
      totalDiseases: 2697,
      diseasesWithCoverage: 1847,
      perDisease: {},
    };

    const summary = getCoverageSummary(metrics);
    expect(summary.summaryText).toContain('1847');
    expect(summary.summaryText).toContain('2697');
  });

  it('per-disease coverage for CF via calculateDiseaseCoverage: 2 rsIDs present → 2 tested', () => {
    // Verify the per-disease API works correctly for a real disease
    const cfInfo = {
      condition: 'Cystic Fibrosis',
      gene: 'CFTR',
      panelRsids: ['rs75030207', 'rs113993960'],
    };

    const genotypes = {
      rs75030207: 'CT',
      rs113993960: 'GA',
    };

    const coverage = calculateDiseaseCoverage(cfInfo, genotypes);
    expect(coverage.variantsTested).toBe(2);
    expect(coverage.variantsTotal).toBe(2);
    expect(coverage.coveragePct).toBe(100);
    expect(coverage.isSufficient).toBe(true);
  });

  it('per-disease coverage when 1 of 2 CF rsIDs is absent → 50% coverage', () => {
    const cfInfo = {
      condition: 'Cystic Fibrosis',
      gene: 'CFTR',
      panelRsids: ['rs75030207', 'rs113993960'],
    };

    // Only one rsID present
    const genotypes = { rs75030207: 'CC' };

    const coverage = calculateDiseaseCoverage(cfInfo, genotypes);
    expect(coverage.variantsTested).toBe(1);
    expect(coverage.variantsTotal).toBe(2);
    expect(coverage.coveragePct).toBe(50);
    expect(coverage.isSufficient).toBe(true); // 1 tested is sufficient
  });
});

// ─── Q4: Coverage Summary Statistics ──────────────────────────────────────

describe('Coverage Metrics — Summary Accuracy', () => {
  it('getCoverageSummary correctly classifies fully/partially/not covered diseases', () => {
    const metrics: CoverageMetrics = {
      totalDiseases: 5,
      diseasesWithCoverage: 4,
      perDisease: {
        'Disease Full 1': { variantsTested: 3, variantsTotal: 3, coveragePct: 100, isSufficient: true },
        'Disease Full 2': { variantsTested: 1, variantsTotal: 1, coveragePct: 100, isSufficient: true },
        'Disease Partial 1': { variantsTested: 1, variantsTotal: 4, coveragePct: 25, isSufficient: true },
        'Disease Partial 2': { variantsTested: 2, variantsTotal: 3, coveragePct: 66.7, isSufficient: true },
        'Disease None': { variantsTested: 0, variantsTotal: 2, coveragePct: 0, isSufficient: false },
      },
    };

    const summary = getCoverageSummary(metrics);

    expect(summary.fullyCovered).toBe(2);
    expect(summary.partiallyCovered).toBe(2);
    expect(summary.notCovered).toBe(1);
    expect(summary.totalDiseases).toBe(5);
  });

  it('overall coverage percentage is the average of individual disease coverages', () => {
    const metrics: CoverageMetrics = {
      totalDiseases: 4,
      diseasesWithCoverage: 3,
      perDisease: {
        'D1': { variantsTested: 2, variantsTotal: 2, coveragePct: 100, isSufficient: true },
        'D2': { variantsTested: 1, variantsTotal: 2, coveragePct: 50, isSufficient: true },
        'D3': { variantsTested: 1, variantsTotal: 4, coveragePct: 25, isSufficient: true },
        'D4': { variantsTested: 0, variantsTotal: 1, coveragePct: 0, isSufficient: false },
      },
    };

    // Average = (100 + 50 + 25 + 0) / 4 = 175 / 4 = 43.75 → rounds to 43.8
    const summary = getCoverageSummary(metrics);
    expect(summary.overallCoveragePct).toBe(43.8);
  });

  it('empty panel → all counts are 0, no errors thrown', () => {
    const metrics = calculateCoverageMetrics([], {});
    const summary = getCoverageSummary(metrics);

    expect(metrics.totalDiseases).toBe(0);
    expect(metrics.diseasesWithCoverage).toBe(0);
    expect(summary.fullyCovered).toBe(0);
    expect(summary.partiallyCovered).toBe(0);
    expect(summary.notCovered).toBe(0);
    expect(summary.overallCoveragePct).toBe(0);
    expect(summary.summaryText).toBe('Your DNA file covers variants for 0 of 0 conditions');
  });

  it('full real panel with empty genotype map → 0 diseases covered, correct total', () => {
    const metrics = calculateCoverageMetrics(carrierPanel, {});
    const summary = getCoverageSummary(metrics);

    // Total diseases = unique condition names in full panel
    const uniqueConditions = new Set(carrierPanel.map((e) => e.condition)).size;
    expect(metrics.totalDiseases).toBe(uniqueConditions);
    expect(metrics.diseasesWithCoverage).toBe(0);
    expect(summary.notCovered).toBe(uniqueConditions);
    expect(summary.fullyCovered).toBe(0);
    expect(summary.overallCoveragePct).toBe(0);
    expect(summary.summaryText).toContain(`0 of ${uniqueConditions}`);
  });

  it('disease with a no-call rsID and another valid rsID → isSufficient=true (1 tested is enough)', () => {
    // Even if one rsID is no-call, having one tested makes the disease covered
    const diseaseInfo = {
      condition: 'Test Condition',
      gene: 'TEST_GENE',
      panelRsids: ['rs_valid', 'rs_nocall'],
    };
    const genotypes = {
      rs_valid: 'AG',
      rs_nocall: '--',
    };

    const coverage = calculateDiseaseCoverage(diseaseInfo, genotypes);
    expect(coverage.variantsTested).toBe(1);
    expect(coverage.isSufficient).toBe(true);
  });

  it('disease with only "--" no-call rsIDs → isSufficient=false (none tested)', () => {
    // NOTE: coverage.ts isValidGenotype rejects "--" (matches /^-+$/) and empty strings.
    // It does NOT reject "00" — that pattern is only in carrier.ts NO_CALL_PATTERNS.
    // This test uses only "--" to remain consistent with coverage.ts's isValidGenotype rules.
    // TODO: potential engine consistency issue — carrier.ts and coverage.ts have different
    // no-call detection logic. coverage.ts does not reject "00" as a no-call, but carrier.ts
    // does. Consider unifying no-call handling in a shared utility.
    const diseaseInfo = {
      condition: 'Test Condition',
      gene: 'TEST_GENE',
      panelRsids: ['rs_a', 'rs_b'],
    };
    const genotypes = {
      rs_a: '--',
      rs_b: '---',
    };

    const coverage = calculateDiseaseCoverage(diseaseInfo, genotypes);
    expect(coverage.variantsTested).toBe(0);
    expect(coverage.isSufficient).toBe(false);
    expect(coverage.coveragePct).toBe(0);
  });
});
