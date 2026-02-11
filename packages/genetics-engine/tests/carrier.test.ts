/**
 * Tests for the carrier risk analysis engine.
 *
 * Tests cover carrier status determination, offspring risk calculation for all
 * three inheritance patterns, risk level classification, and the full analysis pipeline.
 */

import { describe, it, expect } from 'vitest';
import {
  determineCarrierStatus,
  calculateOffspringRiskAR,
  calculateOffspringRiskAD,
  calculateOffspringRiskXLinked,
  determineRiskLevel,
  analyzeCarrierRisk,
  getAnalysisSummary,
  getCarrierDisclaimer,
} from '../src/carrier';
import type { CarrierPanelEntry } from '../src/types';

// ─── Test Fixtures ────────────────────────────────────────────────────────

function makePanelEntry(overrides: Partial<CarrierPanelEntry> = {}): CarrierPanelEntry {
  return {
    rsid: 'rs000001',
    gene: 'TEST1',
    condition: 'Test Disease',
    inheritance: 'autosomal_recessive',
    carrier_frequency: '1 in 25',
    pathogenic_allele: 'T',
    reference_allele: 'C',
    description: 'A test disease',
    severity: 'high',
    prevalence: '1 in 3500',
    omim_id: '000000',
    category: 'Test',
    sources: [],
    confidence: 'high',
    notes: '',
    ...overrides,
  };
}

// ─── Carrier Status Determination ───────────────────────────────────────────

describe('determineCarrierStatus', () => {
  it('should return "normal" when no pathogenic alleles present', () => {
    expect(determineCarrierStatus('CC', 'T', 'C')).toBe('normal');
    expect(determineCarrierStatus('AA', 'T', 'A')).toBe('normal');
  });

  it('should return "carrier" when one pathogenic allele present', () => {
    expect(determineCarrierStatus('CT', 'T', 'C')).toBe('carrier');
    expect(determineCarrierStatus('TC', 'T', 'C')).toBe('carrier');
  });

  it('should return "affected" when two pathogenic alleles present', () => {
    expect(determineCarrierStatus('TT', 'T', 'C')).toBe('affected');
    expect(determineCarrierStatus('AA', 'A', 'G')).toBe('affected');
  });

  it('should return "unknown" for empty genotype', () => {
    expect(determineCarrierStatus('', 'T', 'C')).toBe('unknown');
  });

  it('should return "unknown" for single-character genotype', () => {
    expect(determineCarrierStatus('A', 'T', 'C')).toBe('unknown');
  });

  it('should return "unknown" for three-character genotype', () => {
    expect(determineCarrierStatus('AAA', 'T', 'C')).toBe('unknown');
  });

  it('should be case-insensitive', () => {
    expect(determineCarrierStatus('ct', 'T', 'C')).toBe('carrier');
    expect(determineCarrierStatus('CT', 't', 'c')).toBe('carrier');
    expect(determineCarrierStatus('tt', 't', 'c')).toBe('affected');
    expect(determineCarrierStatus('cc', 'T', 'C')).toBe('normal');
  });
});

// ─── Autosomal Recessive Risk ───────────────────────────────────────────────

describe('calculateOffspringRiskAR', () => {
  it('should return 0% affected for normal x normal', () => {
    const risk = calculateOffspringRiskAR('normal', 'normal');
    expect(risk).toEqual({ affected: 0, carrier: 0, normal: 100 });
  });

  it('should return 0% affected, 50% carrier for normal x carrier', () => {
    const risk = calculateOffspringRiskAR('normal', 'carrier');
    expect(risk).toEqual({ affected: 0, carrier: 50, normal: 50 });
  });

  it('should return 25% affected for carrier x carrier', () => {
    const risk = calculateOffspringRiskAR('carrier', 'carrier');
    expect(risk).toEqual({ affected: 25, carrier: 50, normal: 25 });
  });

  it('should return 50% affected for carrier x affected', () => {
    const risk = calculateOffspringRiskAR('carrier', 'affected');
    expect(risk).toEqual({ affected: 50, carrier: 50, normal: 0 });
  });

  it('should return 100% affected for affected x affected', () => {
    const risk = calculateOffspringRiskAR('affected', 'affected');
    expect(risk).toEqual({ affected: 100, carrier: 0, normal: 0 });
  });

  it('should return 100% carrier for normal x affected', () => {
    const risk = calculateOffspringRiskAR('normal', 'affected');
    expect(risk).toEqual({ affected: 0, carrier: 100, normal: 0 });
  });

  it('should be symmetric (order of parents does not matter)', () => {
    expect(calculateOffspringRiskAR('normal', 'carrier')).toEqual(
      calculateOffspringRiskAR('carrier', 'normal'),
    );
    expect(calculateOffspringRiskAR('carrier', 'affected')).toEqual(
      calculateOffspringRiskAR('affected', 'carrier'),
    );
    expect(calculateOffspringRiskAR('normal', 'affected')).toEqual(
      calculateOffspringRiskAR('affected', 'normal'),
    );
  });

  it('should return zeroes for unknown parents', () => {
    expect(calculateOffspringRiskAR('unknown', 'carrier')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
    expect(calculateOffspringRiskAR('carrier', 'unknown')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
    expect(calculateOffspringRiskAR('unknown', 'unknown')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
  });
});

// ─── Autosomal Dominant Risk ────────────────────────────────────────────────

describe('calculateOffspringRiskAD', () => {
  it('should return 0% affected for normal x normal', () => {
    const risk = calculateOffspringRiskAD('normal', 'normal');
    expect(risk).toEqual({ affected: 0, carrier: 0, normal: 100 });
  });

  it('should map carrier to affected (one copy = disease in AD)', () => {
    // carrier x normal should produce same as affected x normal
    const carrierResult = calculateOffspringRiskAD('carrier', 'normal');
    const affectedResult = calculateOffspringRiskAD('affected', 'normal');
    expect(carrierResult).toEqual(affectedResult);
    expect(carrierResult).toEqual({ affected: 50, carrier: 0, normal: 50 });
  });

  it('should return 50% affected for affected x normal', () => {
    const risk = calculateOffspringRiskAD('affected', 'normal');
    expect(risk).toEqual({ affected: 50, carrier: 0, normal: 50 });
  });

  it('should always have 0% carrier column for AD', () => {
    // Test all relevant combinations
    expect(calculateOffspringRiskAD('normal', 'normal').carrier).toBe(0);
    expect(calculateOffspringRiskAD('carrier', 'normal').carrier).toBe(0);
    expect(calculateOffspringRiskAD('affected', 'normal').carrier).toBe(0);
    expect(calculateOffspringRiskAD('affected', 'affected').carrier).toBe(0);
    expect(calculateOffspringRiskAD('carrier', 'carrier').carrier).toBe(0);
  });

  it('should return 75% affected for affected x affected (het x het)', () => {
    // Aa x Aa -> 25%AA + 50%Aa + 25%aa = 75% affected, 25% normal
    const risk = calculateOffspringRiskAD('affected', 'affected');
    expect(risk).toEqual({ affected: 75, carrier: 0, normal: 25 });
  });

  it('should return 75% affected for carrier x carrier (both mapped to affected)', () => {
    const risk = calculateOffspringRiskAD('carrier', 'carrier');
    expect(risk).toEqual({ affected: 75, carrier: 0, normal: 25 });
  });

  it('should return zeroes for unknown parents', () => {
    expect(calculateOffspringRiskAD('unknown', 'carrier')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
  });
});

// ─── X-Linked Risk ──────────────────────────────────────────────────────────

describe('calculateOffspringRiskXLinked', () => {
  it('should produce sex-stratified results with sons and daughters', () => {
    const risk = calculateOffspringRiskXLinked('carrier', 'normal');
    expect(risk).toHaveProperty('sons');
    expect(risk).toHaveProperty('daughters');
    expect(risk.sons).toHaveProperty('affected');
    expect(risk.daughters).toHaveProperty('affected');
  });

  it('should show 50% affected sons for carrier mother x normal father', () => {
    const risk = calculateOffspringRiskXLinked('carrier', 'normal');
    expect(risk.sons).toEqual({ affected: 50, carrier: 0, normal: 50 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 50, normal: 50 });
  });

  it('should map male carrier to affected (hemizygous)', () => {
    // Father is "carrier" -> treated as "affected" for X-linked
    const riskWithCarrier = calculateOffspringRiskXLinked('normal', 'carrier');
    const riskWithAffected = calculateOffspringRiskXLinked('normal', 'affected');
    // Both should produce same result since male carrier = affected
    expect(riskWithCarrier.sons).toEqual(riskWithAffected.sons);
    expect(riskWithCarrier.daughters).toEqual(riskWithAffected.daughters);
  });

  it('should show all sons affected for affected mother', () => {
    const risk = calculateOffspringRiskXLinked('affected', 'normal');
    expect(risk.sons).toEqual({ affected: 100, carrier: 0, normal: 0 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 100, normal: 0 });
  });

  it('should show all children normal for normal mother x normal father', () => {
    const risk = calculateOffspringRiskXLinked('normal', 'normal');
    expect(risk.sons).toEqual({ affected: 0, carrier: 0, normal: 100 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 0, normal: 100 });
  });

  it('should show all daughters carriers for normal mother x affected father', () => {
    const risk = calculateOffspringRiskXLinked('normal', 'affected');
    expect(risk.sons).toEqual({ affected: 0, carrier: 0, normal: 100 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 100, normal: 0 });
  });

  it('should show 50% daughters affected for carrier mother x affected father', () => {
    const risk = calculateOffspringRiskXLinked('carrier', 'affected');
    expect(risk.sons).toEqual({ affected: 50, carrier: 0, normal: 50 });
    expect(risk.daughters).toEqual({ affected: 50, carrier: 50, normal: 0 });
  });

  it('should show all children affected for affected mother x affected father', () => {
    const risk = calculateOffspringRiskXLinked('affected', 'affected');
    expect(risk.sons).toEqual({ affected: 100, carrier: 0, normal: 0 });
    expect(risk.daughters).toEqual({ affected: 100, carrier: 0, normal: 0 });
  });

  it('should calculate overall averages assuming 50/50 sex ratio', () => {
    const risk = calculateOffspringRiskXLinked('carrier', 'normal');
    // Sons: 50% affected, 0% carrier, 50% normal
    // Daughters: 0% affected, 50% carrier, 50% normal
    // Overall: (50+0)/2 = 25% affected, (0+50)/2 = 25% carrier, (50+50)/2 = 50% normal
    expect(risk.affected).toBe(25);
    expect(risk.carrier).toBe(25);
    expect(risk.normal).toBe(50);
  });

  it('should return zeroes for unknown parents', () => {
    const risk = calculateOffspringRiskXLinked('unknown', 'carrier');
    expect(risk.sons).toEqual({ affected: 0, carrier: 0, normal: 0 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 0, normal: 0 });
    expect(risk.affected).toBe(0);
  });
});

// ─── Risk Level Classification ──────────────────────────────────────────────

describe('determineRiskLevel', () => {
  it('should return "high_risk" when offspring affected > 0 for AR', () => {
    expect(
      determineRiskLevel('carrier', 'carrier', { affected: 25, carrier: 50, normal: 25 }, 'autosomal_recessive'),
    ).toBe('high_risk');
  });

  it('should return "carrier_detected" when parent is carrier but no affected risk (AR)', () => {
    expect(
      determineRiskLevel('normal', 'carrier', { affected: 0, carrier: 50, normal: 50 }, 'autosomal_recessive'),
    ).toBe('carrier_detected');
  });

  it('should return "low_risk" when neither parent is carrier (AR)', () => {
    expect(
      determineRiskLevel('normal', 'normal', { affected: 0, carrier: 0, normal: 100 }, 'autosomal_recessive'),
    ).toBe('low_risk');
  });

  it('should return "high_risk" for AD if either parent is carrier/affected', () => {
    expect(
      determineRiskLevel('carrier', 'normal', { affected: 50, carrier: 0, normal: 50 }, 'autosomal_dominant'),
    ).toBe('high_risk');
    expect(
      determineRiskLevel('normal', 'affected', { affected: 50, carrier: 0, normal: 50 }, 'autosomal_dominant'),
    ).toBe('high_risk');
  });

  it('should return "low_risk" for AD when both parents are normal', () => {
    expect(
      determineRiskLevel('normal', 'normal', { affected: 0, carrier: 0, normal: 100 }, 'autosomal_dominant'),
    ).toBe('low_risk');
  });

  it('should return "unknown" if either parent is unknown', () => {
    expect(
      determineRiskLevel('unknown', 'carrier', { affected: 0, carrier: 0, normal: 0 }, 'autosomal_recessive'),
    ).toBe('unknown');
    expect(
      determineRiskLevel('carrier', 'unknown', { affected: 0, carrier: 0, normal: 0 }, 'autosomal_dominant'),
    ).toBe('unknown');
  });

  it('should return "high_risk" for X-linked with affected sons', () => {
    const xLinkedRisk = {
      sons: { affected: 50, carrier: 0, normal: 50 },
      daughters: { affected: 0, carrier: 50, normal: 50 },
      affected: 25,
      carrier: 25,
      normal: 50,
    };
    expect(
      determineRiskLevel('carrier', 'normal', xLinkedRisk, 'X-linked'),
    ).toBe('high_risk');
  });

  it('should return "carrier_detected" for X-linked with carrier daughters but no affected offspring', () => {
    const xLinkedRisk = {
      sons: { affected: 0, carrier: 0, normal: 100 },
      daughters: { affected: 0, carrier: 100, normal: 0 },
      affected: 0,
      carrier: 50,
      normal: 50,
    };
    expect(
      determineRiskLevel('normal', 'affected', xLinkedRisk, 'X-linked'),
    ).toBe('carrier_detected');
  });
});

// ─── Full Analysis Pipeline ─────────────────────────────────────────────────

describe('analyzeCarrierRisk', () => {
  it('should return results sorted by risk level (highest first)', () => {
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', condition: 'Disease Low' }),
      makePanelEntry({ rsid: 'rs2', condition: 'Disease High' }),
      makePanelEntry({ rsid: 'rs3', condition: 'Disease Carrier' }),
    ];

    const parentA = { rs1: 'CC', rs2: 'CT', rs3: 'CT' };  // normal, carrier, carrier
    const parentB = { rs1: 'CC', rs2: 'TT', rs3: 'CC' };  // normal, affected, normal

    const results = analyzeCarrierRisk(parentA, parentB, panel);
    expect(results).toHaveLength(3);
    // rs2 (carrier x affected = high_risk) should be first
    expect(results[0]!.riskLevel).toBe('high_risk');
    // rs3 (carrier x normal = carrier_detected) should be second
    expect(results[1]!.riskLevel).toBe('carrier_detected');
    // rs1 (normal x normal = low_risk) should be last
    expect(results[2]!.riskLevel).toBe('low_risk');
  });

  it('should handle empty genotype maps gracefully', () => {
    const panel = [makePanelEntry()];
    const results = analyzeCarrierRisk({}, {}, panel);
    expect(results).toHaveLength(1);
    // Both parents have empty genotype -> unknown status
    expect(results[0]!.parentAStatus).toBe('unknown');
    expect(results[0]!.parentBStatus).toBe('unknown');
    expect(results[0]!.riskLevel).toBe('unknown');
  });

  it('should filter diseases by tier when specified', () => {
    // Create a panel with one free-tier disease and one non-free disease
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', condition: 'Cystic Fibrosis (F508del)' }),
      makePanelEntry({ rsid: 'rs2', condition: 'Non-Free Disease' }),
      makePanelEntry({ rsid: 'rs3', condition: 'Sickle Cell Disease' }),
    ];

    // Free tier: should only include diseases matching TOP_25_FREE_DISEASES
    const results = analyzeCarrierRisk({}, {}, panel, 'free');
    const conditions = results.map((r) => r.condition);
    expect(conditions).toContain('Cystic Fibrosis (F508del)');
    expect(conditions).toContain('Sickle Cell Disease');
    expect(conditions).not.toContain('Non-Free Disease');
  });

  it('should handle the three inheritance patterns correctly', () => {
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({
        rsid: 'rs1',
        condition: 'AR Disease',
        inheritance: 'autosomal_recessive',
      }),
      makePanelEntry({
        rsid: 'rs2',
        condition: 'AD Disease',
        inheritance: 'autosomal_dominant',
      }),
      makePanelEntry({
        rsid: 'rs3',
        condition: 'XL Disease',
        inheritance: 'X-linked',
      }),
    ];

    const parentA = { rs1: 'CT', rs2: 'CT', rs3: 'CT' };
    const parentB = { rs1: 'CT', rs2: 'CC', rs3: 'CC' };

    const results = analyzeCarrierRisk(parentA, parentB, panel);
    expect(results).toHaveLength(3);

    const arResult = results.find((r) => r.condition === 'AR Disease')!;
    const adResult = results.find((r) => r.condition === 'AD Disease')!;
    const xlResult = results.find((r) => r.condition === 'XL Disease')!;

    expect(arResult.inheritance).toBe('autosomal_recessive');
    expect(adResult.inheritance).toBe('autosomal_dominant');
    expect(xlResult.inheritance).toBe('X-linked');

    // AR carrier x carrier = 25% affected
    expect(arResult.offspringRisk.affected).toBe(25);
    // AD carrier x normal = high_risk 50% affected
    expect(adResult.offspringRisk.affected).toBe(50);
    // XL has sons/daughters sub-objects
    expect('sons' in xlResult.offspringRisk).toBe(true);
  });

  it('should sort secondary by affected percentage descending', () => {
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', condition: 'Disease A' }),
      makePanelEntry({ rsid: 'rs2', condition: 'Disease B' }),
    ];

    // rs1: carrier x carrier = 25% affected
    // rs2: carrier x affected = 50% affected
    // Both high_risk, but rs2 has higher affected %
    const parentA = { rs1: 'CT', rs2: 'CT' };
    const parentB = { rs1: 'CT', rs2: 'TT' };

    const results = analyzeCarrierRisk(parentA, parentB, panel);
    expect(results[0]!.condition).toBe('Disease B'); // 50% affected first
    expect(results[1]!.condition).toBe('Disease A'); // 25% affected second
  });
});

// ─── Analysis Summary ────────────────────────────────────────────────────

describe('getAnalysisSummary', () => {
  it('should report isLimited=true and upgrade message containing "Upgrade" for free tier', () => {
    const results = [
      makePanelEntry({ rsid: 'rs1', condition: 'Disease A' }),
      makePanelEntry({ rsid: 'rs2', condition: 'Disease B' }),
    ];
    // Create mock carrier results
    const carrierResults = analyzeCarrierRisk({}, {}, results);
    const summary = getAnalysisSummary(carrierResults, 'free');
    expect(summary.isLimited).toBe(true);
    expect(summary.tier).toBe('free');
    expect(summary.upgradeMessage).not.toBeNull();
    expect(summary.upgradeMessage!).toMatch(/upgrade/i);
    expect(summary.upgradeMessage!).toMatch(/premium/i);
  });

  it('should report isLimited=true and upgrade message mentioning Pro for premium tier', () => {
    const results = [makePanelEntry({ rsid: 'rs1', condition: 'Disease A' })];
    const carrierResults = analyzeCarrierRisk({}, {}, results);
    const summary = getAnalysisSummary(carrierResults, 'premium');
    expect(summary.isLimited).toBe(true);
    expect(summary.tier).toBe('premium');
    expect(summary.upgradeMessage).not.toBeNull();
    expect(summary.upgradeMessage!).toMatch(/upgrade/i);
    expect(summary.upgradeMessage!).toMatch(/pro/i);
  });

  it('should report isLimited=false and null upgradeMessage for pro tier', () => {
    const results = [makePanelEntry({ rsid: 'rs1', condition: 'Disease A' })];
    const carrierResults = analyzeCarrierRisk({}, {}, results);
    const summary = getAnalysisSummary(carrierResults, 'pro');
    expect(summary.isLimited).toBe(false);
    expect(summary.tier).toBe('pro');
    expect(summary.upgradeMessage).toBeNull();
  });

  it('should have diseasesAnalyzed matching results.length', () => {
    const panel = [
      makePanelEntry({ rsid: 'rs1', condition: 'Disease A' }),
      makePanelEntry({ rsid: 'rs2', condition: 'Disease B' }),
      makePanelEntry({ rsid: 'rs3', condition: 'Disease C' }),
    ];
    const carrierResults = analyzeCarrierRisk({}, {}, panel);
    const summary = getAnalysisSummary(carrierResults, 'pro');
    expect(summary.diseasesAnalyzed).toBe(carrierResults.length);
    expect(summary.diseasesAnalyzed).toBe(3);
  });

  it('should report totalDiseases as 2715 regardless of tier', () => {
    const carrierResults = analyzeCarrierRisk({}, {}, [makePanelEntry()]);
    for (const tier of ['free', 'premium', 'pro'] as const) {
      const summary = getAnalysisSummary(carrierResults, tier);
      expect(summary.totalDiseases).toBe(2715);
    }
  });
});

// ─── Carrier Disclaimer ─────────────────────────────────────────────────────

describe('getCarrierDisclaimer', () => {
  it('should contain IMPORTANT DISCLAIMER header', () => {
    const disclaimer = getCarrierDisclaimer();
    expect(disclaimer).toContain('IMPORTANT DISCLAIMER');
  });

  it('should mention DTC / direct-to-consumer limitations', () => {
    const disclaimer = getCarrierDisclaimer();
    expect(disclaimer).toMatch(/direct-to-consumer|DTC/i);
  });

  it('should recommend consulting a genetic counselor', () => {
    const disclaimer = getCarrierDisclaimer();
    expect(disclaimer).toMatch(/genetic counselor/i);
  });

  it('should clarify carrier status does not guarantee disease', () => {
    const disclaimer = getCarrierDisclaimer();
    expect(disclaimer).toMatch(/carrier status does not guarantee/i);
  });
});
