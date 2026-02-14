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
  PRS_CONTEXT_DISCLAIMER,
  PRS_OFFSPRING_DISCLAIMER,
  ANCESTRY_CONFIDENCE_NOTE,
  CYP2D6_ARRAY_LIMITATION,
  CLINICAL_TESTING_DISCLAIMER,
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

  it('PRS_CONTEXT_DISCLAIMER is a non-empty string containing "environment"', () => {
    expect(typeof PRS_CONTEXT_DISCLAIMER).toBe('string');
    expect(PRS_CONTEXT_DISCLAIMER.length).toBeGreaterThan(0);
    expect(PRS_CONTEXT_DISCLAIMER.toLowerCase()).toContain('environment');
  });

  it('PRS_OFFSPRING_DISCLAIMER is a non-empty string containing "offspring"', () => {
    expect(typeof PRS_OFFSPRING_DISCLAIMER).toBe('string');
    expect(PRS_OFFSPRING_DISCLAIMER.length).toBeGreaterThan(0);
    expect(PRS_OFFSPRING_DISCLAIMER.toLowerCase()).toContain('offspring');
  });

  it('ANCESTRY_CONFIDENCE_NOTE is a non-empty string containing "population"', () => {
    expect(typeof ANCESTRY_CONFIDENCE_NOTE).toBe('string');
    expect(ANCESTRY_CONFIDENCE_NOTE.length).toBeGreaterThan(0);
    expect(ANCESTRY_CONFIDENCE_NOTE.toLowerCase()).toContain('population');
  });

  it('CYP2D6_ARRAY_LIMITATION is a non-empty string containing "array" and "CYP2D6"', () => {
    expect(typeof CYP2D6_ARRAY_LIMITATION).toBe('string');
    expect(CYP2D6_ARRAY_LIMITATION.length).toBeGreaterThan(0);
    expect(CYP2D6_ARRAY_LIMITATION.toLowerCase()).toContain('array');
    expect(CYP2D6_ARRAY_LIMITATION).toContain('CYP2D6');
  });

  it('CLINICAL_TESTING_DISCLAIMER is a non-empty string containing "clinical"', () => {
    expect(typeof CLINICAL_TESTING_DISCLAIMER).toBe('string');
    expect(CLINICAL_TESTING_DISCLAIMER.length).toBeGreaterThan(0);
    expect(CLINICAL_TESTING_DISCLAIMER.toLowerCase()).toContain('clinical');
  });
});
