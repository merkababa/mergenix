/**
 * Tests for the genetic counseling referral system.
 *
 * Tests cover counseling recommendation logic, tier-gated referral summaries,
 * provider search, and the referral letter generation.
 */

import { describe, it, expect } from 'vitest';
import {
  shouldRecommendCounseling,
  generateReferralSummary,
  findProvidersBySpecialty,
} from '../src/counseling';
import type { CarrierResult, CounselingProviderEntry } from '../src/types';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

/**
 * Create a minimal CarrierResult for testing.
 */
function makeCarrierResult(overrides: Partial<CarrierResult> = {}): CarrierResult {
  return {
    condition: 'Test Disease',
    gene: 'TEST1',
    severity: 'high',
    description: 'Test disease description',
    parentAStatus: 'normal',
    parentBStatus: 'normal',
    offspringRisk: { affected: 0, carrier: 0, normal: 100 },
    riskLevel: 'low_risk',
    rsid: 'rs000001',
    inheritance: 'autosomal_recessive',
    ...overrides,
  };
}

/**
 * Create a minimal CounselingProviderEntry for testing.
 */
function makeProvider(
  overrides: Partial<CounselingProviderEntry> = {},
): CounselingProviderEntry {
  return {
    name: 'Dr. Jane Smith',
    credentials: 'MS, CGC',
    specialty: ['general'],
    organization: 'Test Genetics Center',
    state: 'CA',
    ...overrides,
  };
}

// ─── Counseling Recommendation ──────────────────────────────────────────────

describe('shouldRecommendCounseling', () => {
  it('should recommend when both parents are carriers', () => {
    const results = [
      makeCarrierResult({
        condition: 'Cystic Fibrosis',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        riskLevel: 'high_risk',
        offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      }),
    ];
    const [recommend, reasons] = shouldRecommendCounseling(results);
    expect(recommend).toBe(true);
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.some((r) => r.includes('Both parents are carriers'))).toBe(true);
    expect(reasons.some((r) => r.includes('Cystic Fibrosis'))).toBe(true);
    expect(reasons.some((r) => r.includes('25%'))).toBe(true);
  });

  it('should recommend for high-risk results', () => {
    const results = [
      makeCarrierResult({
        condition: 'Sickle Cell Disease',
        riskLevel: 'high_risk',
      }),
    ];
    const [recommend, reasons] = shouldRecommendCounseling(results);
    expect(recommend).toBe(true);
    expect(reasons.some((r) => r.includes('High-risk result detected'))).toBe(true);
    expect(reasons.some((r) => r.includes('Sickle Cell Disease'))).toBe(true);
  });

  it('should recommend for high PRS percentile (>90th)', () => {
    const results = [makeCarrierResult()]; // low risk carrier
    const prsResults = [
      { percentile: 95, trait: 'Coronary Artery Disease' },
    ];
    const [recommend, reasons] = shouldRecommendCounseling(results, prsResults);
    expect(recommend).toBe(true);
    expect(reasons.some((r) => r.includes('Polygenic risk score'))).toBe(true);
    expect(reasons.some((r) => r.includes('Coronary Artery Disease'))).toBe(true);
    expect(reasons.some((r) => r.includes('95th percentile'))).toBe(true);
  });

  it('should NOT recommend for PRS percentile exactly at 90 (not >90)', () => {
    const results = [makeCarrierResult()];
    const prsResults = [{ percentile: 90, trait: 'Test' }];
    const [recommend, reasons] = shouldRecommendCounseling(results, prsResults);
    // No carrier triggers, no PRS >90 trigger
    expect(recommend).toBe(false);
    expect(reasons).toHaveLength(0);
  });

  it('should recommend for actionable PGx findings', () => {
    const results = [makeCarrierResult()];
    const pgxResults = [{ actionable: true, drug: 'Codeine' }];
    const [recommend, reasons] = shouldRecommendCounseling(
      results,
      undefined,
      pgxResults,
    );
    expect(recommend).toBe(true);
    expect(reasons.some((r) => r.includes('Actionable pharmacogenomic finding'))).toBe(true);
    expect(reasons.some((r) => r.includes('Codeine'))).toBe(true);
  });

  it('should NOT recommend for non-actionable PGx findings', () => {
    const results = [makeCarrierResult()];
    const pgxResults = [{ actionable: false, drug: 'Acetaminophen' }];
    const [recommend, reasons] = shouldRecommendCounseling(
      results,
      undefined,
      pgxResults,
    );
    expect(recommend).toBe(false);
    expect(reasons).toHaveLength(0);
  });

  it('should not recommend when all results are low risk', () => {
    const results = [
      makeCarrierResult({ riskLevel: 'low_risk' }),
      makeCarrierResult({ riskLevel: 'low_risk', condition: 'Disease 2' }),
    ];
    const [recommend, reasons] = shouldRecommendCounseling(results);
    expect(recommend).toBe(false);
    expect(reasons).toHaveLength(0);
  });

  it('should accumulate multiple reasons', () => {
    const results = [
      makeCarrierResult({
        condition: 'Disease A',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        riskLevel: 'high_risk',
      }),
      makeCarrierResult({
        condition: 'Disease B',
        riskLevel: 'high_risk',
      }),
    ];
    const prsResults = [{ percentile: 96, trait: 'Heart Disease' }];
    const pgxResults = [{ actionable: true, drug: 'Warfarin' }];

    const [recommend, reasons] = shouldRecommendCounseling(
      results,
      prsResults,
      pgxResults,
    );
    expect(recommend).toBe(true);
    // Should have: carrier+carrier reason, high_risk for A, high_risk for B, PRS, PGx
    expect(reasons.length).toBeGreaterThanOrEqual(4);
  });

  it('should not duplicate high_risk reason for same condition', () => {
    // When a result has both carrier+carrier AND high_risk, the high_risk check
    // deduplicates via includes() check
    const results = [
      makeCarrierResult({
        condition: 'Cystic Fibrosis',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        riskLevel: 'high_risk',
      }),
    ];
    const [, reasons] = shouldRecommendCounseling(results);
    // Count how many times "High-risk result detected for Cystic Fibrosis" appears
    const highRiskMsgs = reasons.filter((r) =>
      r.includes('High-risk result detected for Cystic Fibrosis'),
    );
    expect(highRiskMsgs).toHaveLength(1);
  });

  it('should handle empty carrier results', () => {
    const [recommend, reasons] = shouldRecommendCounseling([]);
    expect(recommend).toBe(false);
    expect(reasons).toHaveLength(0);
  });

  it('should handle undefined optional parameters', () => {
    const results = [makeCarrierResult()];
    const [recommend, reasons] = shouldRecommendCounseling(results);
    expect(recommend).toBe(false);
    expect(reasons).toHaveLength(0);
  });
});

// ─── Referral Summary ───────────────────────────────────────────────────────

describe('generateReferralSummary', () => {
  it('should return only recommendation and NSGC URL for free tier', () => {
    const results = [
      makeCarrierResult({
        condition: 'Cystic Fibrosis',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        riskLevel: 'high_risk',
      }),
    ];
    const summary = generateReferralSummary(results, 'free');
    expect(summary.recommend).toBe(true);
    expect(summary.reasons.length).toBeGreaterThan(0);
    expect(summary.nsgcUrl).toContain('nsgc.org');
    // Free tier: these should be null
    expect(summary.summaryText).toBeNull();
    expect(summary.keyFindings).toBeNull();
    expect(summary.recommendedSpecialties).toBeNull();
    expect(summary.referralLetter).toBeNull();
  });

  it('should include summary text and key findings for premium tier', () => {
    const results = [
      makeCarrierResult({
        condition: 'Cystic Fibrosis',
        gene: 'CFTR',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        riskLevel: 'high_risk',
      }),
    ];
    const summary = generateReferralSummary(results, 'premium');
    expect(summary.summaryText).not.toBeNull();
    expect(summary.summaryText).toContain('Mergenix Genetic Counseling Summary');
    expect(summary.summaryText).toContain('Diseases analyzed: 1');
    expect(summary.summaryText).toContain('High-risk findings: 1');
    expect(summary.keyFindings).not.toBeNull();
    expect(summary.keyFindings!.length).toBeGreaterThan(0);
    expect(summary.keyFindings![0]!.condition).toBe('Cystic Fibrosis');
    expect(summary.keyFindings![0]!.gene).toBe('CFTR');
    // Premium does NOT get referral letter
    expect(summary.referralLetter).toBeNull();
  });

  it('should include referral letter for pro tier', () => {
    const results = [
      makeCarrierResult({
        condition: 'Cystic Fibrosis',
        gene: 'CFTR',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        riskLevel: 'high_risk',
      }),
    ];
    const summary = generateReferralSummary(results, 'pro', 'John Doe');
    expect(summary.summaryText).not.toBeNull();
    expect(summary.keyFindings).not.toBeNull();
    expect(summary.recommendedSpecialties).not.toBeNull();
    expect(summary.referralLetter).not.toBeNull();
    expect(summary.referralLetter).toContain('GENETIC COUNSELING REFERRAL');
    expect(summary.referralLetter).toContain('Patient: John Doe');
    expect(summary.referralLetter).toContain('Dear Genetic Counselor');
    expect(summary.referralLetter).toContain('nsgc.org');
  });

  it('should always include NSGC URL', () => {
    const results = [makeCarrierResult()];
    for (const tier of ['free', 'premium', 'pro'] as const) {
      const summary = generateReferralSummary(results, tier);
      expect(summary.nsgcUrl).toContain('nsgc.org/findageneticcounselor');
    }
  });

  it('should include recommended specialties for premium/pro', () => {
    const results = [
      makeCarrierResult({
        condition: 'Hereditary Breast Cancer',
        description: 'Cancer predisposition syndrome',
        riskLevel: 'high_risk',
      }),
    ];
    const premSummary = generateReferralSummary(results, 'premium');
    expect(premSummary.recommendedSpecialties).not.toBeNull();
    expect(premSummary.recommendedSpecialties!.length).toBeGreaterThan(0);
    // Cancer keyword in condition/description should infer "cancer" specialty
    expect(premSummary.recommendedSpecialties).toContain('cancer');
    // High risk -> prenatal
    expect(premSummary.recommendedSpecialties).toContain('prenatal');
    // Always includes general when there are findings
    expect(premSummary.recommendedSpecialties).toContain('general');
  });

  it('should extract only high_risk and carrier_detected as key findings', () => {
    const results = [
      makeCarrierResult({ condition: 'Disease A', riskLevel: 'high_risk' }),
      makeCarrierResult({ condition: 'Disease B', riskLevel: 'carrier_detected' }),
      makeCarrierResult({ condition: 'Disease C', riskLevel: 'low_risk' }),
      makeCarrierResult({ condition: 'Disease D', riskLevel: 'unknown' }),
    ];
    const summary = generateReferralSummary(results, 'premium');
    expect(summary.keyFindings).not.toBeNull();
    expect(summary.keyFindings).toHaveLength(2);
    const conditions = summary.keyFindings!.map((f) => f.condition);
    expect(conditions).toContain('Disease A');
    expect(conditions).toContain('Disease B');
    expect(conditions).not.toContain('Disease C');
    expect(conditions).not.toContain('Disease D');
  });

  it('should infer cardiovascular specialty from condition keywords', () => {
    const results = [
      makeCarrierResult({
        condition: 'Cardiac Arrhythmia',
        description: 'Cardiovascular condition',
        riskLevel: 'carrier_detected',
        parentAStatus: 'carrier',
      }),
    ];
    const summary = generateReferralSummary(results, 'premium');
    expect(summary.recommendedSpecialties).toContain('cardiovascular');
  });

  it('should infer neurogenetics specialty from condition keywords', () => {
    const results = [
      makeCarrierResult({
        condition: 'Neurological Disorder',
        description: 'Brain degeneration syndrome',
        riskLevel: 'high_risk',
      }),
    ];
    const summary = generateReferralSummary(results, 'premium');
    expect(summary.recommendedSpecialties).toContain('neurogenetics');
  });

  it('should infer pediatric specialty from condition keywords', () => {
    const results = [
      makeCarrierResult({
        condition: 'Pediatric Onset Disease',
        description: 'Pediatric metabolic disorder',
        riskLevel: 'carrier_detected',
        parentAStatus: 'carrier',
      }),
    ];
    const summary = generateReferralSummary(results, 'premium');
    expect(summary.recommendedSpecialties).toContain('pediatric');
  });

  it('should infer carrier_screening specialty for carrier_detected results', () => {
    const results = [
      makeCarrierResult({
        condition: 'Test Disease',
        riskLevel: 'carrier_detected',
        parentAStatus: 'carrier',
      }),
    ];
    const summary = generateReferralSummary(results, 'premium');
    expect(summary.recommendedSpecialties).toContain('carrier_screening');
  });

  it('should return sorted specialties', () => {
    const results = [
      makeCarrierResult({
        condition: 'Brain Cancer',
        description: 'Oncological neurogenetics disorder',
        riskLevel: 'high_risk',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
      }),
    ];
    const summary = generateReferralSummary(results, 'premium');
    const specs = summary.recommendedSpecialties!;
    const sorted = [...specs].sort();
    expect(specs).toEqual(sorted);
  });

  it('should show "No urgent findings" when recommend is false', () => {
    const results = [makeCarrierResult({ riskLevel: 'low_risk' })];
    const summary = generateReferralSummary(results, 'premium');
    expect(summary.recommend).toBe(false);
    expect(summary.summaryText).toContain('No urgent findings');
  });

  it('should list reasons in summary text when recommend is true', () => {
    const results = [
      makeCarrierResult({
        condition: 'Cystic Fibrosis',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        riskLevel: 'high_risk',
      }),
    ];
    const summary = generateReferralSummary(results, 'premium');
    expect(summary.summaryText).toContain('Genetic counseling is advised');
    // Reasons are numbered in the summary
    expect(summary.summaryText).toContain('1.');
  });

  it('should handle pro tier without userName (empty string default)', () => {
    const results = [
      makeCarrierResult({
        condition: 'Test',
        riskLevel: 'high_risk',
      }),
    ];
    const summary = generateReferralSummary(results, 'pro');
    expect(summary.referralLetter).not.toBeNull();
    // No "Patient:" line when name is empty
    expect(summary.referralLetter).not.toContain('Patient: \n');
  });

  it('should include key findings details in referral letter', () => {
    const results = [
      makeCarrierResult({
        condition: 'Cystic Fibrosis',
        gene: 'CFTR',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        riskLevel: 'high_risk',
        inheritance: 'autosomal_recessive',
      }),
    ];
    const summary = generateReferralSummary(results, 'pro', 'Test Patient');
    expect(summary.referralLetter).toContain('Cystic Fibrosis (CFTR)');
    expect(summary.referralLetter).toContain('Parent A=carrier');
    expect(summary.referralLetter).toContain('Parent B=carrier');
    expect(summary.referralLetter).toContain('[autosomal_recessive]');
  });

  it('should include specialties in referral letter', () => {
    const results = [
      makeCarrierResult({
        condition: 'Cystic Fibrosis',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        riskLevel: 'high_risk',
      }),
    ];
    const summary = generateReferralSummary(results, 'pro');
    expect(summary.referralLetter).toContain('Recommended specialties:');
  });
});

// ─── Provider Search ────────────────────────────────────────────────────────

describe('findProvidersBySpecialty', () => {
  const providers: CounselingProviderEntry[] = [
    makeProvider({
      name: 'Dr. Alice',
      specialty: ['prenatal', 'carrier_screening'],
      state: 'CA',
    }),
    makeProvider({
      name: 'Dr. Bob',
      specialty: ['cancer', 'general'],
      state: 'NY',
    }),
    makeProvider({
      name: 'Dr. Carol',
      specialty: ['prenatal', 'cancer'],
      state: 'CA',
    }),
    makeProvider({
      name: 'Dr. David',
      specialty: ['cardiovascular'],
      state: 'TX',
    }),
  ];

  it('should filter by specialty (case-insensitive)', () => {
    const result = findProvidersBySpecialty(providers, 'prenatal');
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.name)).toContain('Dr. Alice');
    expect(result.map((p) => p.name)).toContain('Dr. Carol');
  });

  it('should filter by specialty case-insensitively', () => {
    const result = findProvidersBySpecialty(providers, 'PRENATAL');
    expect(result).toHaveLength(2);
  });

  it('should filter by state (case-insensitive)', () => {
    const result = findProvidersBySpecialty(providers, undefined, 'CA');
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.name)).toContain('Dr. Alice');
    expect(result.map((p) => p.name)).toContain('Dr. Carol');
  });

  it('should filter by state case-insensitively', () => {
    const result = findProvidersBySpecialty(providers, undefined, 'ca');
    expect(result).toHaveLength(2);
  });

  it('should support combined specialty + state filtering', () => {
    // Cancer AND CA -> only Dr. Carol
    const result = findProvidersBySpecialty(providers, 'cancer', 'CA');
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Dr. Carol');
  });

  it('should return all providers when no filters are applied', () => {
    const result = findProvidersBySpecialty(providers);
    expect(result).toHaveLength(4);
  });

  it('should return empty array when no providers match specialty', () => {
    const result = findProvidersBySpecialty(providers, 'neurogenetics');
    expect(result).toHaveLength(0);
  });

  it('should return empty array when no providers match state', () => {
    const result = findProvidersBySpecialty(providers, undefined, 'FL');
    expect(result).toHaveLength(0);
  });

  it('should return empty array for combined filter with no match', () => {
    // Cardiovascular AND CA -> no match (Dr. David is TX)
    const result = findProvidersBySpecialty(providers, 'cardiovascular', 'CA');
    expect(result).toHaveLength(0);
  });

  it('should handle empty providers array', () => {
    const result = findProvidersBySpecialty([], 'prenatal', 'CA');
    expect(result).toHaveLength(0);
  });
});
