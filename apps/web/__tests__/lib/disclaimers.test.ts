/**
 * Unit tests for disclaimer string constants.
 *
 * Verifies that each disclaimer is a non-empty string containing
 * expected keywords for regulatory/legal correctness.
 */
import { describe, it, expect } from 'vitest';
import {
  SIMULATION_DISCLAIMER,
  VIRTUAL_BABY_DISCLAIMER,
  PRS_ANCESTRY_WARNING,
} from '@/lib/constants/disclaimers';

describe('Disclaimer constants', () => {
  it('SIMULATION_DISCLAIMER is a non-empty string containing "probabili"', () => {
    expect(typeof SIMULATION_DISCLAIMER).toBe('string');
    expect(SIMULATION_DISCLAIMER.length).toBeGreaterThan(0);
    // Contains "probabilities" or "probabilistic"
    expect(SIMULATION_DISCLAIMER.toLowerCase()).toContain('probabili');
  });

  it('VIRTUAL_BABY_DISCLAIMER is a non-empty string containing "simulation"', () => {
    expect(typeof VIRTUAL_BABY_DISCLAIMER).toBe('string');
    expect(VIRTUAL_BABY_DISCLAIMER.length).toBeGreaterThan(0);
    expect(VIRTUAL_BABY_DISCLAIMER.toLowerCase()).toContain('simulation');
  });

  it('PRS_ANCESTRY_WARNING is a non-empty string containing "ancestry" or "population"', () => {
    expect(typeof PRS_ANCESTRY_WARNING).toBe('string');
    expect(PRS_ANCESTRY_WARNING.length).toBeGreaterThan(0);
    const lower = PRS_ANCESTRY_WARNING.toLowerCase();
    expect(lower.includes('ancestry') || lower.includes('population')).toBe(true);
  });
});
