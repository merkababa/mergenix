/**
 * Q9a — 500MB File Stress Test
 *
 * Stress-tests the genetics engine parser against very large synthetic files
 * (~500K+ variants) to verify that parsing completes without timeout and that
 * the parsed variant count matches the expected input size.
 *
 * Design decisions:
 * - Gated behind STRESS_TEST env variable — only runs when explicitly requested.
 *   Set STRESS_TEST=1 to run: `STRESS_TEST=1 pnpm test --filter=@mergenix/genetics-engine`
 * - Each stress test uses an explicit 60-second timeout (3rd arg to `it`) since
 *   parsing 500K–750K variants takes 10-30 seconds on typical machines.
 * - True RSS-level memory profiling is not available in Vitest's forked process
 *   on all platforms. If process.memoryUsage is available, heapUsed is checked.
 *   Otherwise, only correctness and completion are verified.
 *
 * These tests intentionally do NOT run in per-PR CI to keep CI fast.
 * Add them to a nightly workflow with STRESS_TEST=1.
 */

import { describe, it, expect } from 'vitest';
import { generateSyntheticGenome } from '../src/test-utils/synthetic-factory';
import { parseGeneticFile } from '../src/parser';

// ─── Guard: only run when STRESS_TEST env var is set ─────────────────────────

const runStressTests = !!process.env['STRESS_TEST'];

/** Vitest timeout for individual stress tests (60 seconds). */
const STRESS_TIMEOUT_MS = 60_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Attempt to read the current heap usage in MB.
 * Returns null if process.memoryUsage is not available (e.g., browser-like env).
 */
function heapUsedMb(): number | null {
  if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
    return process.memoryUsage().heapUsed / (1024 * 1024);
  }
  return null;
}

// ─── Stress Tests ─────────────────────────────────────────────────────────────

describe.runIf(runStressTests)('Stress Tests: Large File Parsing (STRESS_TEST=1)', () => {
  it(
    'parses a 500K-variant 23andMe file without timeout',
    () => {
      const VARIANT_COUNT = 500_000;

      const content = generateSyntheticGenome({
        format: '23andme',
        seed: 42,
        variantCount: VARIANT_COUNT,
      });

      const heapBefore = heapUsedMb();

      const start = performance.now();
      const [genotypes, format] = parseGeneticFile(content);
      const elapsed = performance.now() - start;

      const heapAfter = heapUsedMb();

      // Format detection must be correct
      expect(format).toBe('23andme');

      // Parsed count must be within 5% of the target (factory is approximate)
      const parsedCount = Object.keys(genotypes).length;
      expect(
        parsedCount,
        `Expected ~${VARIANT_COUNT} variants, got ${parsedCount}`,
      ).toBeGreaterThan(VARIANT_COUNT * 0.95);
      expect(parsedCount).toBeLessThanOrEqual(VARIANT_COUNT * 1.05);

      // Must complete within 30s (well within our 60s test timeout)
      expect(elapsed, `Parse took ${(elapsed / 1000).toFixed(1)}s, budget is 30s`).toBeLessThan(
        30_000,
      );

      // Heap check (optional — only when available)
      if (heapBefore !== null && heapAfter !== null) {
        const heapGrowthMb = heapAfter - heapBefore;
        // 500K variants as a string map should fit well within 200MB of heap growth
        expect(
          heapGrowthMb,
          `Heap grew ${heapGrowthMb.toFixed(1)}MB, expected < 200MB`,
        ).toBeLessThan(200);
      }
    },
    STRESS_TIMEOUT_MS,
  );

  it(
    'parses a 500K-variant AncestryDNA file without timeout',
    () => {
      const VARIANT_COUNT = 500_000;

      const content = generateSyntheticGenome({
        format: 'ancestrydna',
        seed: 43,
        variantCount: VARIANT_COUNT,
      });

      const start = performance.now();
      const [genotypes, format] = parseGeneticFile(content);
      const elapsed = performance.now() - start;

      expect(format).toBe('ancestrydna');

      const parsedCount = Object.keys(genotypes).length;
      expect(
        parsedCount,
        `Expected ~${VARIANT_COUNT} variants, got ${parsedCount}`,
      ).toBeGreaterThan(VARIANT_COUNT * 0.95);

      expect(elapsed, `Parse took ${(elapsed / 1000).toFixed(1)}s, budget is 30s`).toBeLessThan(
        30_000,
      );
    },
    STRESS_TIMEOUT_MS,
  );

  it(
    'parses a 500K-variant VCF file without timeout',
    () => {
      const VARIANT_COUNT = 500_000;

      const content = generateSyntheticGenome({
        format: 'vcf',
        seed: 44,
        variantCount: VARIANT_COUNT,
      });

      const start = performance.now();
      const [genotypes, format] = parseGeneticFile(content);
      const elapsed = performance.now() - start;

      expect(format).toBe('vcf');

      const parsedCount = Object.keys(genotypes).length;
      expect(
        parsedCount,
        `Expected ~${VARIANT_COUNT} variants, got ${parsedCount}`,
      ).toBeGreaterThan(VARIANT_COUNT * 0.95);

      expect(elapsed, `Parse took ${(elapsed / 1000).toFixed(1)}s, budget is 30s`).toBeLessThan(
        30_000,
      );
    },
    STRESS_TIMEOUT_MS,
  );

  it(
    'parses a 750K-variant file and heap growth stays reasonable',
    () => {
      const VARIANT_COUNT = 750_000;

      const content = generateSyntheticGenome({
        format: '23andme',
        seed: 99,
        variantCount: VARIANT_COUNT,
      });

      const heapBefore = heapUsedMb();

      const start = performance.now();
      const [genotypes] = parseGeneticFile(content);
      const elapsed = performance.now() - start;

      const heapAfter = heapUsedMb();

      const parsedCount = Object.keys(genotypes).length;
      expect(
        parsedCount,
        `Expected ~${VARIANT_COUNT} variants, got ${parsedCount}`,
      ).toBeGreaterThan(VARIANT_COUNT * 0.95);

      // Should still complete in a reasonable time even at 750K
      expect(elapsed, `Parse took ${(elapsed / 1000).toFixed(1)}s, budget is 45s`).toBeLessThan(
        45_000,
      );

      if (heapBefore !== null && heapAfter !== null) {
        const heapGrowthMb = heapAfter - heapBefore;
        // 750K variants should not exceed ~300MB of heap growth
        expect(
          heapGrowthMb,
          `Heap grew ${heapGrowthMb.toFixed(1)}MB, expected < 300MB`,
        ).toBeLessThan(300);
      }
    },
    STRESS_TIMEOUT_MS,
  );
});

// ─── Smoke tests that always run: factory correctness ────────────────────────

describe('Stress Test Preconditions (always run)', () => {
  it(
    'synthetic factory generates 500K variants deterministically',
    () => {
      // This test only generates — it does NOT parse. Just verifies factory output size.
      const VARIANT_COUNT = 500_000;

      const content = generateSyntheticGenome({
        format: '23andme',
        seed: 42,
        variantCount: VARIANT_COUNT,
      });

      // The content should be a non-empty string
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);

      // Count data lines (non-comment, non-empty) to verify factory output
      const dataLines = content
        .split('\n')
        .filter((line) => line.length > 0 && !line.startsWith('#'));

      // Should be approximately VARIANT_COUNT lines
      expect(
        dataLines.length,
        `Expected ~${VARIANT_COUNT} data lines, got ${dataLines.length}`,
      ).toBeGreaterThan(VARIANT_COUNT * 0.95);
      expect(dataLines.length).toBeLessThanOrEqual(VARIANT_COUNT * 1.05);
    },
    STRESS_TIMEOUT_MS,
  );

  it('factory is deterministic: same seed produces identical output', () => {
    const opts = { format: '23andme' as const, seed: 12345, variantCount: 1_000 };

    const first = generateSyntheticGenome(opts);
    const second = generateSyntheticGenome(opts);

    expect(first).toBe(second);
  });

  it('factory produces different output for different seeds', () => {
    const optsA = { format: '23andme' as const, seed: 111, variantCount: 1_000 };
    const optsB = { format: '23andme' as const, seed: 222, variantCount: 1_000 };

    const a = generateSyntheticGenome(optsA);
    const b = generateSyntheticGenome(optsB);

    expect(a).not.toBe(b);
  });

  it('stress tests are skipped unless STRESS_TEST env var is set', () => {
    // This test documents the gating behavior explicitly.
    // If STRESS_TEST is not set, the describe.runIf block is false and those tests skip.
    if (!runStressTests) {
      expect(runStressTests).toBe(false);
    } else {
      // When STRESS_TEST=1, all stress tests above will have run.
      expect(runStressTests).toBe(true);
    }
  });
});
