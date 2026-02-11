/**
 * Tests for the ethnicity-adjusted carrier frequency engine.
 *
 * Tests cover population frequency lookup, risk adjustment, Bayesian
 * posterior calculation, ethnicity summary generation, and frequency comparison formatting.
 */

import { describe, it, expect } from 'vitest';
import {
  getPopulationFrequency,
  adjustCarrierRisk,
  calculateBayesianPosterior,
  getEthnicitySummary,
  formatFrequencyComparison,
} from '../src/ethnicity';
import type { EthnicityFrequenciesData, Population } from '../src/types';

// ─── Test Fixtures ────────────────────────────────────────────────────────

function makeEthnicityData(
  overrides: Partial<EthnicityFrequenciesData> = {},
): EthnicityFrequenciesData {
  return {
    metadata: {
      source: 'gnomAD v4.1',
      populations: ['African/African American', 'East Asian', 'Global'],
      last_updated: '2024-01-01',
      total_variants: 2,
      notes: 'Test data',
    },
    frequencies: {
      rs334: {
        gene: 'HBB',
        condition: 'Sickle Cell Disease',
        Global: 0.03,
        'African/African American': 0.083,
        'East Asian': 0.001,
        'South Asian': 0.01,
        'European (Non-Finnish)': 0.005,
        Finnish: 0.002,
        'Latino/Admixed American': 0.02,
        'Ashkenazi Jewish': 0.003,
        'Middle Eastern': 0.015,
      },
      rs1805007: {
        gene: 'MC1R',
        condition: 'Red Hair Trait',
        Global: 0.02,
        'African/African American': 0.001,
        'East Asian': 0.0005,
        'South Asian': 0.005,
        'European (Non-Finnish)': 0.06,
        Finnish: 0.04,
        'Latino/Admixed American': 0.01,
        'Ashkenazi Jewish': 0.03,
        'Middle Eastern': 0.008,
      },
    },
    ...overrides,
  };
}

// ─── Population Frequency Lookup ────────────────────────────────────────────

describe('getPopulationFrequency', () => {
  it('should return the frequency for a known rsID and population', () => {
    const data = makeEthnicityData();
    const freq = getPopulationFrequency('rs334', 'African/African American', data);
    expect(freq).toBe(0.083);
  });

  it('should return frequency for different populations', () => {
    const data = makeEthnicityData();
    expect(getPopulationFrequency('rs334', 'East Asian', data)).toBe(0.001);
    expect(getPopulationFrequency('rs334', 'Global', data)).toBe(0.03);
  });

  it('should fall back to Global frequency when population not available', () => {
    // Create data where a specific population is missing for a variant
    const data: EthnicityFrequenciesData = {
      metadata: {
        source: 'test',
        populations: [],
        last_updated: '2024-01-01',
        total_variants: 1,
        notes: '',
      },
      frequencies: {
        rs99999: {
          gene: 'TEST',
          condition: 'Test',
          Global: 0.05,
          'African/African American': 0.0,
          'East Asian': 0.0,
          'South Asian': 0.0,
          'European (Non-Finnish)': 0.0,
          Finnish: 0.0,
          'Latino/Admixed American': 0.0,
          'Ashkenazi Jewish': 0.0,
          'Middle Eastern': 0.0,
        },
      },
    };
    // The variant has a 0 value for East Asian, not undefined
    // The fallback only triggers when the population key is literally undefined
    // Since 0 is a valid number, it returns 0 (not fallback to Global)
    // The fallback behavior is: if freq is undefined -> use Global
    // In our typed data all populations exist, so let's test with a proper scenario
    // by using a cast to remove a population
    const partialData: EthnicityFrequenciesData = {
      metadata: data.metadata,
      frequencies: {
        rs99999: {
          gene: 'TEST',
          condition: 'Test',
          Global: 0.05,
        } as any,
      },
    };
    const freq = getPopulationFrequency('rs99999', 'East Asian', partialData);
    expect(freq).toBe(0.05); // Falls back to Global
  });

  it('should return null for unknown rsIDs', () => {
    const data = makeEthnicityData();
    const freq = getPopulationFrequency('rs000000', 'African/African American', data);
    expect(freq).toBeNull();
  });
});

// ─── Risk Adjustment ────────────────────────────────────────────────────────

describe('adjustCarrierRisk', () => {
  it('should increase risk when population frequency exceeds global', () => {
    // African/African American (0.083) vs Global (0.03) -> factor ~2.77
    const result = adjustCarrierRisk(0.25, 0.083, 0.03);
    expect(result.adjustmentFactor).toBeCloseTo(0.083 / 0.03, 2);
    expect(result.adjustedRisk).toBeGreaterThan(result.baseRisk);
    expect(result.baseRisk).toBe(0.25);
  });

  it('should decrease risk when population frequency is below global', () => {
    // East Asian (0.001) vs Global (0.03) -> factor ~0.033
    const result = adjustCarrierRisk(0.25, 0.001, 0.03);
    expect(result.adjustmentFactor).toBeCloseTo(0.001 / 0.03, 3);
    expect(result.adjustedRisk).toBeLessThan(result.baseRisk);
  });

  it('should clamp adjusted risk to [0, 1]', () => {
    // Very high adjustment factor with high base risk
    const result = adjustCarrierRisk(0.8, 10.0, 1.0);
    expect(result.adjustedRisk).toBeLessThanOrEqual(1.0);
    expect(result.adjustedRisk).toBeGreaterThanOrEqual(0.0);
  });

  it('should return unchanged risk when global frequency is zero', () => {
    const result = adjustCarrierRisk(0.25, 0.08, 0);
    expect(result.adjustedRisk).toBe(0.25);
    expect(result.adjustmentFactor).toBe(1.0);
  });

  it('should return unchanged risk when global frequency is negative', () => {
    const result = adjustCarrierRisk(0.25, 0.08, -0.01);
    expect(result.adjustedRisk).toBe(0.25);
    expect(result.adjustmentFactor).toBe(1.0);
  });

  it('should return all expected fields', () => {
    const result = adjustCarrierRisk(0.25, 0.083, 0.03);
    expect(result).toHaveProperty('baseRisk');
    expect(result).toHaveProperty('adjustedRisk');
    expect(result).toHaveProperty('adjustmentFactor');
    expect(result).toHaveProperty('populationFrequency');
    expect(result).toHaveProperty('globalFrequency');
    expect(result.populationFrequency).toBe(0.083);
    expect(result.globalFrequency).toBe(0.03);
  });
});

// ─── Bayesian Posterior ─────────────────────────────────────────────────────

describe('calculateBayesianPosterior', () => {
  it('should increase posterior when genotype confirms carrier status', () => {
    // Carrier genotype with low prior -> posterior should be much higher
    const posterior = calculateBayesianPosterior(0.04, 'carrier', 'Global');
    expect(posterior).toBeGreaterThan(0.04);
    // With P(gt|carrier)=0.99 and fixed error rate 0.005, posterior should be high
    expect(posterior).toBeGreaterThan(0.85);
  });

  it('should decrease posterior when genotype suggests normal', () => {
    // Normal genotype with moderate prior -> posterior should decrease
    const posterior = calculateBayesianPosterior(0.5, 'normal', 'Global');
    expect(posterior).toBeLessThan(0.5);
  });

  it('should return 1.0 for affected individuals (beyond carrier)', () => {
    // Affected individuals (homozygous pathogenic) have two copies and will
    // always pass at least one pathogenic allele. Bayesian carrier probability
    // is meaningless — they are definitionally beyond carrier status.
    const posterior = calculateBayesianPosterior(0.04, 'affected', 'Global');
    expect(posterior).toBe(1.0);
  });

  it('should return 1.0 for affected regardless of prior frequency', () => {
    // Even with very low or very high priors, affected always returns 1.0
    expect(calculateBayesianPosterior(0.001, 'affected', 'Global')).toBe(1.0);
    expect(calculateBayesianPosterior(0.5, 'affected', 'Global')).toBe(1.0);
    expect(calculateBayesianPosterior(1.0, 'affected', 'Global')).toBe(1.0);
  });

  it('should return prior unchanged for unknown genotype', () => {
    const prior = 0.04;
    const posterior = calculateBayesianPosterior(prior, 'unknown', 'Global');
    expect(posterior).toBe(prior);
  });

  it('should handle zero prior frequency', () => {
    const posterior = calculateBayesianPosterior(0, 'carrier', 'Global');
    // Prior = 0 -> numerator = 0.99 * 0 = 0
    // Should return 0
    expect(posterior).toBe(0);
  });

  it('should handle prior frequency > 1 by clamping', () => {
    const posterior = calculateBayesianPosterior(1.5, 'unknown', 'Global');
    // Prior clamped to 1.0, unknown returns prior
    expect(posterior).toBe(1.0);
  });

  it('should handle negative prior frequency', () => {
    const posterior = calculateBayesianPosterior(-0.5, 'carrier', 'Global');
    expect(posterior).toBe(0.0);
  });

  it('should clamp posterior to [0, 1]', () => {
    const posterior = calculateBayesianPosterior(0.5, 'carrier', 'Global');
    expect(posterior).toBeGreaterThanOrEqual(0.0);
    expect(posterior).toBeLessThanOrEqual(1.0);
  });
});

// ─── Ethnicity Summary ──────────────────────────────────────────────────────

describe('getEthnicitySummary', () => {
  it('should return found=true for known variants', () => {
    const data = makeEthnicityData();
    const summary = getEthnicitySummary('rs334', data);
    expect(summary.found).toBe(true);
    expect(summary.rsid).toBe('rs334');
  });

  it('should return found=false for unknown variants', () => {
    const data = makeEthnicityData();
    const summary = getEthnicitySummary('rs000000', data);
    expect(summary.found).toBe(false);
    expect(summary.rsid).toBe('rs000000');
    expect(summary.gene).toBeNull();
    expect(summary.condition).toBeNull();
    expect(summary.global).toBeNull();
  });

  it('should include gene and condition from the data', () => {
    const data = makeEthnicityData();
    const summary = getEthnicitySummary('rs334', data);
    expect(summary.gene).toBe('HBB');
    expect(summary.condition).toBe('Sickle Cell Disease');
  });

  it('should include global frequency', () => {
    const data = makeEthnicityData();
    const summary = getEthnicitySummary('rs334', data);
    expect(summary.global).toBe(0.03);
  });

  it('should include per-population frequencies', () => {
    const data = makeEthnicityData();
    const summary = getEthnicitySummary('rs334', data);
    expect(summary.frequencies['African/African American']).toBe(0.083);
    expect(summary.frequencies['East Asian']).toBe(0.001);
  });

  it('should return null frequencies for all populations when variant not found', () => {
    const data = makeEthnicityData();
    const summary = getEthnicitySummary('rs000000', data);
    for (const [, freq] of Object.entries(summary.frequencies)) {
      expect(freq).toBeNull();
    }
  });
});

// ─── Frequency Comparison Formatting ────────────────────────────────────────

describe('formatFrequencyComparison', () => {
  it('should report "higher than global average" for ratio > 1', () => {
    const result = formatFrequencyComparison(0.08, 0.03);
    expect(result).toContain('higher than global average');
    // 0.08/0.03 = 2.666... -> "2.7x higher"
    expect(result).toContain('2.7x');
  });

  it('should report "lower than global average" for ratio < 1', () => {
    const result = formatFrequencyComparison(0.001, 0.03);
    expect(result).toContain('lower than global average');
  });

  it('should report "Equal to global average" for ratio approximately 1', () => {
    expect(formatFrequencyComparison(0.03, 0.03)).toBe('Equal to global average');
    // Within 5% tolerance
    expect(formatFrequencyComparison(0.031, 0.03)).toBe('Equal to global average');
  });

  it('should handle null population frequency', () => {
    const result = formatFrequencyComparison(null, 0.03);
    expect(result).toBe('No population data available');
  });

  it('should handle null global frequency', () => {
    const result = formatFrequencyComparison(0.03, null);
    // populationFreq > 0 but globalFreq is null
    expect(result).toBe('No global data for comparison');
  });

  it('should handle both null', () => {
    const result = formatFrequencyComparison(null, null);
    expect(result).toBe('No data available');
  });

  it('should handle zero global frequency with positive population frequency', () => {
    const result = formatFrequencyComparison(0.05, 0);
    expect(result).toBe('No global data for comparison');
  });

  it('should handle zero global frequency with zero population frequency', () => {
    const result = formatFrequencyComparison(0, 0);
    expect(result).toBe('No data available');
  });

  it('should handle zero population frequency with positive global', () => {
    const result = formatFrequencyComparison(0, 0.03);
    // ratio = 0/0.03 = 0 -> "0.0x lower than global average"
    expect(result).toContain('lower than global average');
  });
});
