/**
 * Q9 — Client-Side Performance Benchmarks
 *
 * Defines and enforces maximum memory/time thresholds for the core genetics
 * engine operations. Each test measures wall-clock time via performance.now()
 * and verifies execution stays within the declared budget.
 *
 * Budgets:
 * - Standard parse (50K variants):         < 2 seconds
 * - Large parse (500K variants):           < 10 seconds
 * - Carrier analysis (full panel):         < 3 seconds
 * - Coverage calculation (full panel):     < 1 second
 * - No single operation freezes > 100ms    (measured wall clock)
 *
 * Heavy tests use an explicit timeout (3rd arg to `it`) to avoid Vitest's
 * default 5-second timeout killing long-running benchmark scenarios.
 */

import { describe, it, expect } from 'vitest';
import { generateSyntheticGenome } from '../src/test-utils/synthetic-factory';
import { parseGeneticFile, detectFormat } from '../src/parser';
import { analyzeCarrierRisk } from '../src/carrier';
import { calculateCoverageMetrics } from '../src/coverage';
import { carrierPanel } from '@mergenix/genetics-data';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Number of conditions in the full carrier panel (2,697 as of current data). */
const FULL_PANEL_SIZE = carrierPanel.length;

/** Budget for standard parse (50K variants), in milliseconds. */
const STANDARD_PARSE_BUDGET_MS = 2_000;

/** Budget for large parse (500K variants), in milliseconds. */
const LARGE_PARSE_BUDGET_MS = 10_000;

/** Budget for full carrier analysis (all ~2,697 conditions), in milliseconds. */
const CARRIER_ANALYSIS_BUDGET_MS = 3_000;

/** Budget for coverage calculation (full panel), in milliseconds. */
const COVERAGE_BUDGET_MS = 1_000;

/** Maximum allowed wall-clock time for any single operation, in milliseconds. */
const MAX_SINGLE_OPERATION_FREEZE_MS = 100;

/**
 * Test timeout: give each benchmark test 3x its budget as the Vitest timeout,
 * so flaky machines don't cause spurious framework timeouts before the budget
 * assertion fires.
 */
const BENCHMARK_TIMEOUT_MS = 30_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a genotype map with valid calls for all rsIDs in the carrier panel.
 * Uses a deterministic pattern — every rsID gets 'CC' (homozygous reference).
 */
function buildFullCoverageGenotypes(): Record<string, string> {
  const genotypes: Record<string, string> = {};
  for (const entry of carrierPanel) {
    genotypes[entry.rsid] = 'CC';
  }
  return genotypes;
}

// ─── Parse Benchmarks ─────────────────────────────────────────────────────────

describe('Performance Benchmarks: Parsing', () => {
  it('standard parse (50K variants) completes within 2 seconds', () => {
    const content = generateSyntheticGenome({
      format: '23andme',
      seed: 1001,
      variantCount: 50_000,
    });

    const start = performance.now();
    const [genotypes] = parseGeneticFile(content);
    const elapsed = performance.now() - start;

    // Correctness: parsed output must be present
    expect(Object.keys(genotypes).length).toBeGreaterThan(40_000);

    // Budget: must complete within 2 seconds
    expect(elapsed, `Parse took ${elapsed.toFixed(0)}ms, budget is ${STANDARD_PARSE_BUDGET_MS}ms`).toBeLessThan(STANDARD_PARSE_BUDGET_MS);
  }, BENCHMARK_TIMEOUT_MS);

  it('large parse (500K variants) completes within 10 seconds', () => {
    const content = generateSyntheticGenome({
      format: '23andme',
      seed: 2002,
      variantCount: 500_000,
    });

    const start = performance.now();
    const [genotypes] = parseGeneticFile(content);
    const elapsed = performance.now() - start;

    // Correctness: parsed output must be present
    expect(Object.keys(genotypes).length).toBeGreaterThan(400_000);

    // Budget: must complete within 10 seconds
    expect(elapsed, `Parse took ${elapsed.toFixed(0)}ms, budget is ${LARGE_PARSE_BUDGET_MS}ms`).toBeLessThan(LARGE_PARSE_BUDGET_MS);
  }, BENCHMARK_TIMEOUT_MS);

  it('AncestryDNA parse (50K variants) completes within 2 seconds', () => {
    const content = generateSyntheticGenome({
      format: 'ancestrydna',
      seed: 3003,
      variantCount: 50_000,
    });

    const start = performance.now();
    const [genotypes] = parseGeneticFile(content);
    const elapsed = performance.now() - start;

    expect(Object.keys(genotypes).length).toBeGreaterThan(40_000);
    expect(elapsed, `Parse took ${elapsed.toFixed(0)}ms, budget is ${STANDARD_PARSE_BUDGET_MS}ms`).toBeLessThan(STANDARD_PARSE_BUDGET_MS);
  }, BENCHMARK_TIMEOUT_MS);

  it('MyHeritage CSV parse (50K variants) completes within 2 seconds', () => {
    const content = generateSyntheticGenome({
      format: 'myheritage',
      seed: 4004,
      variantCount: 50_000,
    });

    const start = performance.now();
    const [genotypes] = parseGeneticFile(content);
    const elapsed = performance.now() - start;

    expect(Object.keys(genotypes).length).toBeGreaterThan(40_000);
    expect(elapsed, `Parse took ${elapsed.toFixed(0)}ms, budget is ${STANDARD_PARSE_BUDGET_MS}ms`).toBeLessThan(STANDARD_PARSE_BUDGET_MS);
  }, BENCHMARK_TIMEOUT_MS);

  it('VCF parse (50K variants) completes within 2 seconds', () => {
    const content = generateSyntheticGenome({
      format: 'vcf',
      seed: 5005,
      variantCount: 50_000,
    });

    const start = performance.now();
    const [genotypes] = parseGeneticFile(content);
    const elapsed = performance.now() - start;

    expect(Object.keys(genotypes).length).toBeGreaterThan(40_000);
    expect(elapsed, `Parse took ${elapsed.toFixed(0)}ms, budget is ${STANDARD_PARSE_BUDGET_MS}ms`).toBeLessThan(STANDARD_PARSE_BUDGET_MS);
  }, BENCHMARK_TIMEOUT_MS);
});

// ─── Carrier Analysis Benchmark ───────────────────────────────────────────────

describe('Performance Benchmarks: Carrier Analysis', () => {
  it(`carrier analysis (${FULL_PANEL_SIZE} conditions) completes within 3 seconds`, () => {
    // Generate a realistic genotype file covering all panel rsIDs
    const genotypes = buildFullCoverageGenotypes();

    const start = performance.now();
    const results = analyzeCarrierRisk(genotypes, genotypes, carrierPanel);
    const elapsed = performance.now() - start;

    // Correctness: should produce results for every panel entry
    expect(results.length).toBe(FULL_PANEL_SIZE);

    // Budget: must complete within 3 seconds
    expect(elapsed, `Carrier analysis took ${elapsed.toFixed(0)}ms, budget is ${CARRIER_ANALYSIS_BUDGET_MS}ms`).toBeLessThan(CARRIER_ANALYSIS_BUDGET_MS);
  }, BENCHMARK_TIMEOUT_MS);

  it('carrier analysis of two distinct parents (50K variants each) completes within 3 seconds', () => {
    // Generate two parents with distinct random genotypes
    const contentA = generateSyntheticGenome({
      format: '23andme',
      seed: 6006,
      variantCount: 50_000,
    });
    const contentB = generateSyntheticGenome({
      format: '23andme',
      seed: 7007,
      variantCount: 50_000,
    });

    const [parentAGenotypes] = parseGeneticFile(contentA);
    const [parentBGenotypes] = parseGeneticFile(contentB);

    const start = performance.now();
    const results = analyzeCarrierRisk(parentAGenotypes, parentBGenotypes, carrierPanel);
    const elapsed = performance.now() - start;

    expect(results.length).toBe(FULL_PANEL_SIZE);
    expect(elapsed, `Carrier analysis took ${elapsed.toFixed(0)}ms, budget is ${CARRIER_ANALYSIS_BUDGET_MS}ms`).toBeLessThan(CARRIER_ANALYSIS_BUDGET_MS);
  }, BENCHMARK_TIMEOUT_MS);
});

// ─── Coverage Calculation Benchmark ───────────────────────────────────────────

describe('Performance Benchmarks: Coverage Calculation', () => {
  it('coverage calculation (full panel) completes within 1 second', () => {
    const genotypes = buildFullCoverageGenotypes();

    // Build the compact panel form expected by calculateCoverageMetrics
    const panelForCoverage = carrierPanel.map((e) => ({
      condition: e.condition,
      gene: e.gene,
      rsid: e.rsid,
    }));

    const start = performance.now();
    const metrics = calculateCoverageMetrics(panelForCoverage, genotypes);
    const elapsed = performance.now() - start;

    // Correctness: all diseases should be counted
    expect(metrics.totalDiseases).toBeGreaterThan(0);
    expect(metrics.totalDiseases).toBeLessThanOrEqual(FULL_PANEL_SIZE);

    // Budget: must complete within 1 second
    expect(elapsed, `Coverage calc took ${elapsed.toFixed(0)}ms, budget is ${COVERAGE_BUDGET_MS}ms`).toBeLessThan(COVERAGE_BUDGET_MS);
  }, BENCHMARK_TIMEOUT_MS);

  it('coverage calculation with sparse genotypes (10% coverage) completes within 1 second', () => {
    // Only include every 10th rsID — simulates a chip with low panel overlap
    const sparseGenotypes: Record<string, string> = {};
    carrierPanel.forEach((entry, idx) => {
      if (idx % 10 === 0) {
        sparseGenotypes[entry.rsid] = 'CC';
      }
    });

    const panelForCoverage = carrierPanel.map((e) => ({
      condition: e.condition,
      gene: e.gene,
      rsid: e.rsid,
    }));

    const start = performance.now();
    const metrics = calculateCoverageMetrics(panelForCoverage, sparseGenotypes);
    const elapsed = performance.now() - start;

    expect(metrics.totalDiseases).toBeGreaterThan(0);
    expect(elapsed, `Coverage calc took ${elapsed.toFixed(0)}ms, budget is ${COVERAGE_BUDGET_MS}ms`).toBeLessThan(COVERAGE_BUDGET_MS);
  }, BENCHMARK_TIMEOUT_MS);
});

// ─── No-Freeze Benchmark (wall clock max per operation) ───────────────────────

describe('Performance Benchmarks: No Single Operation > 100ms Freeze', () => {
  it('parsing a small file (1K variants) takes well under 100ms', () => {
    const content = generateSyntheticGenome({
      format: '23andme',
      seed: 8008,
      variantCount: 1_000,
    });

    const start = performance.now();
    parseGeneticFile(content);
    const elapsed = performance.now() - start;

    // A 1K-variant parse should be dramatically under the 100ms freeze threshold
    expect(elapsed, `1K parse took ${elapsed.toFixed(1)}ms, freeze threshold is ${MAX_SINGLE_OPERATION_FREEZE_MS}ms`).toBeLessThan(MAX_SINGLE_OPERATION_FREEZE_MS);
  });

  it('parsing a moderate file (10K variants) takes under 100ms', () => {
    const content = generateSyntheticGenome({
      format: '23andme',
      seed: 9009,
      variantCount: 10_000,
    });

    const start = performance.now();
    parseGeneticFile(content);
    const elapsed = performance.now() - start;

    expect(elapsed, `10K parse took ${elapsed.toFixed(1)}ms, freeze threshold is ${MAX_SINGLE_OPERATION_FREEZE_MS}ms`).toBeLessThan(MAX_SINGLE_OPERATION_FREEZE_MS);
  });

  it('format detection alone is near-instant (< 5ms)', () => {
    // Generate a large file to simulate real content, then slice to the header
    // to measure only format detection — not the full parse.
    const content = generateSyntheticGenome({
      format: '23andme',
      seed: 1234,
      variantCount: 500_000,
    });

    // Slice to first 2KB — format detection only reads the header
    const headerSlice = content.slice(0, 2048);

    const start = performance.now();
    const fmt = detectFormat(headerSlice);
    const elapsed = performance.now() - start;

    expect(fmt).toBe('23andme');
    expect(elapsed, `detectFormat took ${elapsed.toFixed(2)}ms, expected < 5ms`).toBeLessThan(5);
  }, BENCHMARK_TIMEOUT_MS);
});
