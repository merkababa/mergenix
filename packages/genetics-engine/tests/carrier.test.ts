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
  // E4: Gene-level grouping
  groupVariantsByGene,
  analyzeGeneCarrierStatus,
  // E5: Compound het detection
  detectCompoundHet,
  // E6: Testing status
  getTestingStatus,
  determineExtendedCarrierStatus,
} from '../src/carrier';
import type {
  ExtendedCarrierResult,
  CompoundHetResult,
  GeneVariantGroup,
  GeneCarrierResult,
} from '../src/carrier';
import type { CarrierPanelEntry } from '../src/types';
import { CARRIER_PANEL_COUNT } from '@mergenix/genetics-data';

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

  it('should report totalDiseases as CARRIER_PANEL_COUNT regardless of tier', () => {
    const carrierResults = analyzeCarrierRisk({}, {}, [makePanelEntry()]);
    for (const tier of ['free', 'premium', 'pro'] as const) {
      const summary = getAnalysisSummary(carrierResults, tier);
      expect(summary.totalDiseases).toBe(CARRIER_PANEL_COUNT);
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

// ═══════════════════════════════════════════════════════════════════════════
// E6: Testing Status — "Not Tested" vs "Variant Not Detected"
// ═══════════════════════════════════════════════════════════════════════════

describe('getTestingStatus', () => {
  it('should return "not_tested" when rsID is not in the genotype map', () => {
    const genotypes = { rs111: 'CC', rs222: 'AG' };
    expect(getTestingStatus('rs999', genotypes)).toBe('not_tested');
  });

  it('should return "tested" when rsID has a valid genotype call', () => {
    const genotypes = { rs111: 'CC', rs222: 'AG' };
    expect(getTestingStatus('rs111', genotypes)).toBe('tested');
    expect(getTestingStatus('rs222', genotypes)).toBe('tested');
  });

  it('should return "no_call" when rsID has "--" genotype', () => {
    const genotypes = { rs111: '--' };
    expect(getTestingStatus('rs111', genotypes)).toBe('no_call');
  });

  it('should return "no_call" when rsID has "00" genotype', () => {
    const genotypes = { rs111: '00' };
    expect(getTestingStatus('rs111', genotypes)).toBe('no_call');
  });

  it('should return "no_call" when rsID has empty string genotype', () => {
    const genotypes = { rs111: '' };
    expect(getTestingStatus('rs111', genotypes)).toBe('no_call');
  });

  it('should return "tested" for a valid single-letter genotype that is not a no-call pattern', () => {
    // Note: "A" is not in the no-call set, so it counts as tested even if
    // determineCarrierStatus would return unknown for length != 2
    const genotypes = { rs111: 'A' };
    expect(getTestingStatus('rs111', genotypes)).toBe('tested');
  });
});

describe('determineExtendedCarrierStatus', () => {
  it('should return "not_tested" when rsID is not in genotype map', () => {
    const genotypes = { rs222: 'CC' };
    expect(determineExtendedCarrierStatus('rs111', genotypes, 'T', 'C')).toBe('not_tested');
  });

  it('should return "unknown" when rsID has a no-call genotype', () => {
    expect(determineExtendedCarrierStatus('rs111', { rs111: '--' }, 'T', 'C')).toBe('unknown');
    expect(determineExtendedCarrierStatus('rs111', { rs111: '00' }, 'T', 'C')).toBe('unknown');
    expect(determineExtendedCarrierStatus('rs111', { rs111: '' }, 'T', 'C')).toBe('unknown');
  });

  it('should return "normal" for tested reference genotype', () => {
    expect(determineExtendedCarrierStatus('rs111', { rs111: 'CC' }, 'T', 'C')).toBe('normal');
  });

  it('should return "carrier" for tested heterozygous genotype', () => {
    expect(determineExtendedCarrierStatus('rs111', { rs111: 'CT' }, 'T', 'C')).toBe('carrier');
  });

  it('should return "affected" for tested homozygous pathogenic genotype', () => {
    expect(determineExtendedCarrierStatus('rs111', { rs111: 'TT' }, 'T', 'C')).toBe('affected');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// E4: Gene-Level Carrier Analysis
// ═══════════════════════════════════════════════════════════════════════════

describe('groupVariantsByGene', () => {
  it('should group entries by gene symbol', () => {
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'CFTR', condition: 'CF F508del' }),
      makePanelEntry({ rsid: 'rs2', gene: 'CFTR', condition: 'CF G542X' }),
      makePanelEntry({ rsid: 'rs3', gene: 'HBB', condition: 'Sickle Cell' }),
      makePanelEntry({ rsid: 'rs4', gene: 'CFTR', condition: 'CF N1303K' }),
    ];

    const groups = groupVariantsByGene(panel);

    expect(groups).toHaveLength(2);

    const cftrGroup = groups.find((g) => g.gene === 'CFTR');
    const hbbGroup = groups.find((g) => g.gene === 'HBB');

    expect(cftrGroup).toBeDefined();
    expect(cftrGroup!.entries).toHaveLength(3);
    expect(cftrGroup!.entries.map((e) => e.rsid)).toEqual(['rs1', 'rs2', 'rs4']);

    expect(hbbGroup).toBeDefined();
    expect(hbbGroup!.entries).toHaveLength(1);
    expect(hbbGroup!.entries[0]!.rsid).toBe('rs3');
  });

  it('should return empty array for empty panel', () => {
    expect(groupVariantsByGene([])).toEqual([]);
  });

  it('should handle single-variant genes correctly', () => {
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'GENE_A', condition: 'Disease A' }),
      makePanelEntry({ rsid: 'rs2', gene: 'GENE_B', condition: 'Disease B' }),
      makePanelEntry({ rsid: 'rs3', gene: 'GENE_C', condition: 'Disease C' }),
    ];

    const groups = groupVariantsByGene(panel);
    expect(groups).toHaveLength(3);
    groups.forEach((g) => {
      expect(g.entries).toHaveLength(1);
    });
  });
});

describe('analyzeGeneCarrierStatus', () => {
  it('should return worst-case status across multiple variants in a gene', () => {
    const entries: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'CFTR', pathogenic_allele: 'T', reference_allele: 'C' }),
      makePanelEntry({ rsid: 'rs2', gene: 'CFTR', pathogenic_allele: 'A', reference_allele: 'G' }),
    ];

    // rs1: carrier (CT), rs2: normal (GG) -> gene-level: carrier
    const genotypes = { rs1: 'CT', rs2: 'GG' };
    const result = analyzeGeneCarrierStatus('CFTR', entries, genotypes);

    expect(result.gene).toBe('CFTR');
    expect(result.geneStatus).toBe('carrier');
    expect(result.variantDetails).toHaveLength(2);
    expect(result.variantDetails[0]!.status).toBe('carrier');
    expect(result.variantDetails[1]!.status).toBe('normal');
  });

  it('should return "affected" as worst case when one variant is affected', () => {
    const entries: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'HBB', pathogenic_allele: 'T', reference_allele: 'C' }),
      makePanelEntry({ rsid: 'rs2', gene: 'HBB', pathogenic_allele: 'A', reference_allele: 'G' }),
    ];

    // rs1: normal (CC), rs2: affected (AA) -> gene-level: affected
    const genotypes = { rs1: 'CC', rs2: 'AA' };
    const result = analyzeGeneCarrierStatus('HBB', entries, genotypes);

    expect(result.geneStatus).toBe('affected');
  });

  it('should return "not_tested" when all variants are missing from genotype map', () => {
    const entries: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'GENE_X' }),
      makePanelEntry({ rsid: 'rs2', gene: 'GENE_X' }),
    ];

    const genotypes = { rs999: 'CC' }; // Neither rs1 nor rs2 present
    const result = analyzeGeneCarrierStatus('GENE_X', entries, genotypes);

    expect(result.geneStatus).toBe('not_tested');
    expect(result.variantDetails[0]!.status).toBe('not_tested');
    expect(result.variantDetails[1]!.status).toBe('not_tested');
  });

  it('should prefer "normal" over "not_tested" for gene-level status', () => {
    const entries: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'GENE_Y', pathogenic_allele: 'T', reference_allele: 'C' }),
      makePanelEntry({ rsid: 'rs2', gene: 'GENE_Y', pathogenic_allele: 'A', reference_allele: 'G' }),
    ];

    // rs1: normal (CC), rs2: not in map -> gene-level: normal (worse than not_tested)
    const genotypes = { rs1: 'CC' };
    const result = analyzeGeneCarrierStatus('GENE_Y', entries, genotypes);

    expect(result.geneStatus).toBe('normal');
    expect(result.variantDetails[0]!.status).toBe('normal');
    expect(result.variantDetails[1]!.status).toBe('not_tested');
  });

  it('should not flag compound het when only one variant is carrier', () => {
    const entries: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'CFTR', pathogenic_allele: 'T', reference_allele: 'C' }),
      makePanelEntry({ rsid: 'rs2', gene: 'CFTR', pathogenic_allele: 'A', reference_allele: 'G' }),
    ];

    const genotypes = { rs1: 'CT', rs2: 'GG' }; // Only rs1 is carrier
    const result = analyzeGeneCarrierStatus('CFTR', entries, genotypes);

    expect(result.compoundHet).toBeNull();
  });

  it('should flag compound het when 2+ variants are carrier in the same gene', () => {
    const entries: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'CFTR', pathogenic_allele: 'T', reference_allele: 'C' }),
      makePanelEntry({ rsid: 'rs2', gene: 'CFTR', pathogenic_allele: 'A', reference_allele: 'G' }),
      makePanelEntry({ rsid: 'rs3', gene: 'CFTR', pathogenic_allele: 'T', reference_allele: 'G' }),
    ];

    // rs1: carrier (CT), rs2: carrier (GA), rs3: normal (GG)
    const genotypes = { rs1: 'CT', rs2: 'GA', rs3: 'GG' };
    const result = analyzeGeneCarrierStatus('CFTR', entries, genotypes);

    expect(result.compoundHet).not.toBeNull();
    expect(result.compoundHet!.isCompoundHet).toBe(true);
    expect(result.compoundHet!.variants).toEqual(['rs1', 'rs2']);
    expect(result.compoundHet!.label).toBe('Potential Risk - Phasing Unknown');
  });

  it('should include testing status in variant details', () => {
    const entries: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'TEST', pathogenic_allele: 'T', reference_allele: 'C' }),
      makePanelEntry({ rsid: 'rs2', gene: 'TEST', pathogenic_allele: 'A', reference_allele: 'G' }),
      makePanelEntry({ rsid: 'rs3', gene: 'TEST', pathogenic_allele: 'T', reference_allele: 'C' }),
    ];

    const genotypes = { rs1: 'CC', rs2: '--' }; // rs1 tested, rs2 no-call, rs3 not in map
    const result = analyzeGeneCarrierStatus('TEST', entries, genotypes);

    expect(result.variantDetails[0]!.testingStatus).toBe('tested');
    expect(result.variantDetails[1]!.testingStatus).toBe('no_call');
    expect(result.variantDetails[2]!.testingStatus).toBe('not_tested');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// E5: Compound Heterozygote Detection
// ═══════════════════════════════════════════════════════════════════════════

describe('detectCompoundHet', () => {
  it('should return isCompoundHet=false for zero carrier variants', () => {
    const result = detectCompoundHet(
      [{ rsid: 'rs1', status: 'normal' }, { rsid: 'rs2', status: 'affected' }],
      'CFTR',
    );
    expect(result.isCompoundHet).toBe(false);
    expect(result.variants).toEqual([]);
    expect(result.label).toBe('Not Compound Het');
  });

  it('should return isCompoundHet=false for a single carrier variant', () => {
    const result = detectCompoundHet(
      [{ rsid: 'rs1', status: 'carrier' }, { rsid: 'rs2', status: 'normal' }],
      'CFTR',
    );
    expect(result.isCompoundHet).toBe(false);
    expect(result.variants).toEqual([]);
    expect(result.label).toBe('Not Compound Het');
  });

  it('should detect compound het when 2 carrier variants present', () => {
    const result = detectCompoundHet(
      [{ rsid: 'rs1', status: 'carrier' }, { rsid: 'rs2', status: 'carrier' }],
      'CFTR',
    );
    expect(result.isCompoundHet).toBe(true);
    expect(result.variants).toEqual(['rs1', 'rs2']);
    expect(result.label).toBe('Potential Risk - Phasing Unknown');
    expect(result.explanation).toContain('unphased');
    expect(result.explanation).toContain('CFTR');
  });

  it('should detect compound het when 3+ carrier variants present', () => {
    const result = detectCompoundHet(
      [
        { rsid: 'rs1', status: 'carrier' },
        { rsid: 'rs2', status: 'carrier' },
        { rsid: 'rs3', status: 'carrier' },
      ],
      'HBB',
    );
    expect(result.isCompoundHet).toBe(true);
    expect(result.variants).toEqual(['rs1', 'rs2', 'rs3']);
    expect(result.explanation).toContain('3 different heterozygous');
    expect(result.explanation).toContain('HBB');
  });

  it('should never label as "Affected" — always "Potential Risk"', () => {
    const result = detectCompoundHet(
      [{ rsid: 'rs1', status: 'carrier' }, { rsid: 'rs2', status: 'carrier' }],
      'CFTR',
    );
    // The label must NEVER say "Affected" — DTC data is unphased
    expect(result.label).not.toContain('Affected');
    expect(result.label).toBe('Potential Risk - Phasing Unknown');
  });

  it('should include phasing explanation in the result', () => {
    const result = detectCompoundHet(
      [{ rsid: 'rs1', status: 'carrier' }, { rsid: 'rs2', status: 'carrier' }],
      'TEST_GENE',
    );
    expect(result.explanation).toContain('phased sequencing');
    expect(result.explanation).toContain('cis');
    expect(result.explanation).toContain('trans');
    expect(result.explanation).toContain('TEST_GENE');
  });

  it('should filter out non-carrier variants and only count carriers', () => {
    const result = detectCompoundHet(
      [
        { rsid: 'rs1', status: 'carrier' },
        { rsid: 'rs2', status: 'affected' },
        { rsid: 'rs3', status: 'carrier' },
        { rsid: 'rs4', status: 'normal' },
      ],
      'GENE_X',
    );
    // Only rs1 and rs3 are carriers
    expect(result.isCompoundHet).toBe(true);
    expect(result.variants).toEqual(['rs1', 'rs3']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Integration: Extended fields in analyzeCarrierRisk results
// ═══════════════════════════════════════════════════════════════════════════

describe('analyzeCarrierRisk — extended fields (E4/E5/E6)', () => {
  it('should include extended status fields in results', () => {
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'TEST1', pathogenic_allele: 'T', reference_allele: 'C' }),
    ];

    const parentA = { rs1: 'CT' }; // carrier
    const parentB = { rs1: 'CC' }; // normal

    const results = analyzeCarrierRisk(parentA, parentB, panel);
    const result = results[0] as ExtendedCarrierResult;

    expect(result.parentAExtendedStatus).toBe('carrier');
    expect(result.parentBExtendedStatus).toBe('normal');
    expect(result.parentATestingStatus).toBe('tested');
    expect(result.parentBTestingStatus).toBe('tested');
  });

  it('should set parentAExtendedStatus to "not_tested" when rsID not in parent A map', () => {
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'TEST1', pathogenic_allele: 'T', reference_allele: 'C' }),
    ];

    const parentA = {}; // rs1 not present — not tested
    const parentB = { rs1: 'CC' };

    const results = analyzeCarrierRisk(parentA, parentB, panel);
    const result = results[0] as ExtendedCarrierResult;

    // Standard status falls back to 'unknown' (empty genotype)
    expect(result.parentAStatus).toBe('unknown');
    // Extended status distinguishes "not tested"
    expect(result.parentAExtendedStatus).toBe('not_tested');
    expect(result.parentATestingStatus).toBe('not_tested');
  });

  it('should set extended status to "unknown" for no-call genotype (not "not_tested")', () => {
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'TEST1', pathogenic_allele: 'T', reference_allele: 'C' }),
    ];

    const parentA = { rs1: '--' }; // no-call
    const parentB = { rs1: 'CC' };

    const results = analyzeCarrierRisk(parentA, parentB, panel);
    const result = results[0] as ExtendedCarrierResult;

    // NOTE: The standard determineCarrierStatus treats '--' as a valid 2-char genotype
    // where neither '-' matches 'T', so it returns 'normal'. The EXTENDED status
    // correctly catches '--' as a no-call and returns 'unknown'. This is the key
    // improvement from E6 — the extended status is more semantically correct.
    expect(result.parentAStatus).toBe('normal'); // standard logic: 2 chars, 0 pathogenic = normal
    expect(result.parentAExtendedStatus).toBe('unknown'); // extended: catches '--' as no-call
    expect(result.parentATestingStatus).toBe('no_call');
  });

  it('should include gene-level analysis in results', () => {
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'CFTR', condition: 'CF-1', pathogenic_allele: 'T', reference_allele: 'C' }),
      makePanelEntry({ rsid: 'rs2', gene: 'CFTR', condition: 'CF-2', pathogenic_allele: 'A', reference_allele: 'G' }),
    ];

    const parentA = { rs1: 'CT', rs2: 'GG' }; // carrier at rs1, normal at rs2
    const parentB = { rs1: 'CC', rs2: 'CC' }; // normal at both

    const results = analyzeCarrierRisk(parentA, parentB, panel);

    // Both results share the same gene, so geneAnalysis should be the same object
    const result1 = results.find((r) => r.rsid === 'rs1') as ExtendedCarrierResult;
    const result2 = results.find((r) => r.rsid === 'rs2') as ExtendedCarrierResult;

    expect(result1.geneAnalysisParentA).not.toBeNull();
    expect(result1.geneAnalysisParentA!.gene).toBe('CFTR');
    expect(result1.geneAnalysisParentA!.geneStatus).toBe('carrier');
    expect(result1.geneAnalysisParentA!.variantDetails).toHaveLength(2);

    // Same gene analysis for both results from same gene
    expect(result2.geneAnalysisParentA).toBe(result1.geneAnalysisParentA);
  });

  it('should detect compound het in gene-level analysis when parent has 2+ carrier variants', () => {
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'CFTR', condition: 'CF-1', pathogenic_allele: 'T', reference_allele: 'C' }),
      makePanelEntry({ rsid: 'rs2', gene: 'CFTR', condition: 'CF-2', pathogenic_allele: 'A', reference_allele: 'G' }),
    ];

    // Parent A is carrier at BOTH CFTR variants -> compound het flag
    const parentA = { rs1: 'CT', rs2: 'GA' };
    const parentB = { rs1: 'CC', rs2: 'GG' };

    const results = analyzeCarrierRisk(parentA, parentB, panel);
    const result = results[0] as ExtendedCarrierResult;

    expect(result.geneAnalysisParentA).not.toBeNull();
    expect(result.geneAnalysisParentA!.compoundHet).not.toBeNull();
    expect(result.geneAnalysisParentA!.compoundHet!.isCompoundHet).toBe(true);
    expect(result.geneAnalysisParentA!.compoundHet!.variants).toContain('rs1');
    expect(result.geneAnalysisParentA!.compoundHet!.variants).toContain('rs2');

    // Parent B has no carrier variants -> no compound het
    expect(result.geneAnalysisParentB).not.toBeNull();
    expect(result.geneAnalysisParentB!.compoundHet).toBeNull();
  });

  it('should remain backward-compatible with CarrierResult type', () => {
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'TEST1', pathogenic_allele: 'T', reference_allele: 'C' }),
    ];
    const parentA = { rs1: 'CT' };
    const parentB = { rs1: 'CC' };

    const results = analyzeCarrierRisk(parentA, parentB, panel);
    const result = results[0]!;

    // All original CarrierResult fields must be present
    expect(result.condition).toBe('Test Disease');
    expect(result.gene).toBe('TEST1');
    expect(result.severity).toBe('high');
    expect(result.description).toBe('A test disease');
    expect(result.parentAStatus).toBe('carrier');
    expect(result.parentBStatus).toBe('normal');
    expect(result.offspringRisk).toBeDefined();
    expect(result.riskLevel).toBe('carrier_detected');
    expect(result.rsid).toBe('rs1');
    expect(result.inheritance).toBe('autosomal_recessive');
  });

  it('should handle "00" no-call genotype correctly in extended status', () => {
    const panel: CarrierPanelEntry[] = [
      makePanelEntry({ rsid: 'rs1', gene: 'TEST1', pathogenic_allele: 'T', reference_allele: 'C' }),
    ];

    const parentA = { rs1: '00' }; // no-call
    const parentB = { rs1: 'CT' };

    const results = analyzeCarrierRisk(parentA, parentB, panel);
    const result = results[0] as ExtendedCarrierResult;

    expect(result.parentAExtendedStatus).toBe('unknown');
    expect(result.parentATestingStatus).toBe('no_call');
    expect(result.parentBExtendedStatus).toBe('carrier');
    expect(result.parentBTestingStatus).toBe('tested');
  });
});
