import { describe, it, expect, beforeEach } from 'vitest';
import { auditLocalStorageForSensitiveData } from '../../lib/storage/storage-audit';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('auditLocalStorageForSensitiveData', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  // ── Clean localStorage ─────────────────────────────────────────────────

  it('returns clean=true when localStorage is empty', () => {
    const result = auditLocalStorageForSensitiveData();
    expect(result.clean).toBe(true);
    expect(result.flaggedKeys).toEqual([]);
  });

  it('returns clean=true for non-sensitive keys', () => {
    localStorage.setItem('cookie_consent', 'accepted_all');
    localStorage.setItem('age_verified', 'true');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('high-contrast', 'false');
    localStorage.setItem('chip_limitation_ack', 'true');

    const result = auditLocalStorageForSensitiveData();
    expect(result.clean).toBe(true);
    expect(result.flaggedKeys).toEqual([]);
  });

  // ── Sensitive key names ────────────────────────────────────────────────

  it("flags keys containing rsID patterns (e.g., 'rs12345')", () => {
    localStorage.setItem('rs12345', 'AG');
    localStorage.setItem('rs9876543', 'TT');

    const result = auditLocalStorageForSensitiveData();
    expect(result.clean).toBe(false);
    expect(result.flaggedKeys).toContain('rs12345');
    expect(result.flaggedKeys).toContain('rs9876543');
  });

  it("flags keys containing 'genotype'", () => {
    localStorage.setItem('user_genotype_data', '{"rs1234":"AG"}');

    const result = auditLocalStorageForSensitiveData();
    expect(result.clean).toBe(false);
    expect(result.flaggedKeys).toContain('user_genotype_data');
  });

  it("flags keys containing 'carrier' (health context)", () => {
    localStorage.setItem('carrier_status', 'positive');

    const result = auditLocalStorageForSensitiveData();
    expect(result.clean).toBe(false);
    expect(result.flaggedKeys).toContain('carrier_status');
  });

  it("flags keys containing 'genetic'", () => {
    localStorage.setItem('genetic_results', '{"foo":"bar"}');

    const result = auditLocalStorageForSensitiveData();
    expect(result.clean).toBe(false);
    expect(result.flaggedKeys).toContain('genetic_results');
  });

  it("flags keys containing 'health_data'", () => {
    localStorage.setItem('health_data_cache', 'encrypted-blob');

    const result = auditLocalStorageForSensitiveData();
    expect(result.clean).toBe(false);
    expect(result.flaggedKeys).toContain('health_data_cache');
  });

  // ── Sensitive values ───────────────────────────────────────────────────

  it('flags keys whose values contain rsID patterns', () => {
    localStorage.setItem('cached_data', '{"variant":"rs12345","genotype":"AG"}');

    const result = auditLocalStorageForSensitiveData();
    expect(result.clean).toBe(false);
    expect(result.flaggedKeys).toContain('cached_data');
  });

  it('flags keys whose values contain genotype allele patterns (e.g., A/G, CT)', () => {
    localStorage.setItem('analysis_cache', JSON.stringify({ snp: 'rs1234', alleles: 'A/G' }));

    const result = auditLocalStorageForSensitiveData();
    expect(result.clean).toBe(false);
    expect(result.flaggedKeys).toContain('analysis_cache');
  });

  it('flags keys whose values mention carrier status', () => {
    localStorage.setItem(
      'results_snapshot',
      JSON.stringify({ condition: 'Cystic Fibrosis', status: 'carrier' }),
    );

    const result = auditLocalStorageForSensitiveData();
    expect(result.clean).toBe(false);
    expect(result.flaggedKeys).toContain('results_snapshot');
  });

  // ── Mixed sensitive and non-sensitive ──────────────────────────────────

  it('only flags sensitive keys, not non-sensitive ones', () => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('age_verified', 'true');
    localStorage.setItem('genetic_results', '{"data":"encrypted"}');
    localStorage.setItem('cookie_consent', 'accepted_all');
    localStorage.setItem('rs55555', 'CC');

    const result = auditLocalStorageForSensitiveData();
    expect(result.clean).toBe(false);
    expect(result.flaggedKeys).toContain('genetic_results');
    expect(result.flaggedKeys).toContain('rs55555');
    expect(result.flaggedKeys).not.toContain('theme');
    expect(result.flaggedKeys).not.toContain('age_verified');
    expect(result.flaggedKeys).not.toContain('cookie_consent');
  });

  // ── Case insensitivity ─────────────────────────────────────────────────

  it('detects sensitive patterns regardless of case', () => {
    localStorage.setItem('GENOTYPE_DATA', 'sensitive');
    localStorage.setItem('Carrier_Info', 'sensitive');

    const result = auditLocalStorageForSensitiveData();
    expect(result.clean).toBe(false);
    expect(result.flaggedKeys).toContain('GENOTYPE_DATA');
    expect(result.flaggedKeys).toContain('Carrier_Info');
  });
});
