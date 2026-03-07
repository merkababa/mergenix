/**
 * Tests for the couple/offspring combiner module.
 *
 * Tests cover:
 * - Autosomal recessive (AR) offspring risk calculation
 * - Autosomal dominant (AD) offspring risk calculation
 * - X-linked offspring risk calculation with sex-stratified results
 * - Single condition combiner (combineForCondition)
 * - Batch combiner (combineAllConditions) with matching, sorting, and metadata
 * - Edge cases: unknown status, empty inputs, parent sex swapping
 */

import { describe, it, expect } from 'vitest';
import {
  calculateARRisk,
  calculateADRisk,
  calculateXLinkedRisk,
  combineForCondition,
  combineAllConditions,
} from '../src/combiner';
import type { OffspringPrediction, ParentConditionInput } from '../src/combiner';
import type { XLinkedOffspringRisk } from '@mergenix/shared-types';

// ─── Autosomal Recessive Risk ─────────────────────────────────────────────────

describe('calculateARRisk', () => {
  it('should return 0/0/100 for normal x normal', () => {
    expect(calculateARRisk('normal', 'normal')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 100,
    });
  });

  it('should return 0/50/50 for normal x carrier', () => {
    expect(calculateARRisk('normal', 'carrier')).toEqual({
      affected: 0,
      carrier: 50,
      normal: 50,
    });
  });

  it('should return 25/50/25 for carrier x carrier', () => {
    expect(calculateARRisk('carrier', 'carrier')).toEqual({
      affected: 25,
      carrier: 50,
      normal: 25,
    });
  });

  it('should return 0/100/0 for normal x affected', () => {
    expect(calculateARRisk('normal', 'affected')).toEqual({
      affected: 0,
      carrier: 100,
      normal: 0,
    });
  });

  it('should return 50/50/0 for carrier x affected', () => {
    expect(calculateARRisk('carrier', 'affected')).toEqual({
      affected: 50,
      carrier: 50,
      normal: 0,
    });
  });

  it('should return 100/0/0 for affected x affected', () => {
    expect(calculateARRisk('affected', 'affected')).toEqual({
      affected: 100,
      carrier: 0,
      normal: 0,
    });
  });

  it('should be symmetric (order of parents does not matter)', () => {
    expect(calculateARRisk('normal', 'carrier')).toEqual(calculateARRisk('carrier', 'normal'));
    expect(calculateARRisk('carrier', 'affected')).toEqual(calculateARRisk('affected', 'carrier'));
    expect(calculateARRisk('normal', 'affected')).toEqual(calculateARRisk('affected', 'normal'));
  });

  it('should return zeroes when parent1 is unknown', () => {
    expect(calculateARRisk('unknown', 'carrier')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
  });

  it('should return zeroes when parent2 is unknown', () => {
    expect(calculateARRisk('carrier', 'unknown')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
  });

  it('should return zeroes when both parents are unknown', () => {
    expect(calculateARRisk('unknown', 'unknown')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
  });

  it('should always sum to 100% for non-unknown combinations', () => {
    const statuses = ['normal', 'carrier', 'affected'] as const;
    for (const s1 of statuses) {
      for (const s2 of statuses) {
        const risk = calculateARRisk(s1, s2);
        expect(risk.affected + risk.carrier + risk.normal).toBe(100);
      }
    }
  });
});

// ─── Autosomal Dominant Risk ──────────────────────────────────────────────────

describe('calculateADRisk', () => {
  it('should return 0% affected for normal x normal', () => {
    expect(calculateADRisk('normal', 'normal')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 100,
    });
  });

  it('should return 50% affected for carrier x normal', () => {
    expect(calculateADRisk('carrier', 'normal')).toEqual({
      affected: 50,
      carrier: 0,
      normal: 50,
    });
  });

  it('should return 50% affected for affected x normal', () => {
    expect(calculateADRisk('affected', 'normal')).toEqual({
      affected: 50,
      carrier: 0,
      normal: 50,
    });
  });

  it('should return 75% affected for carrier x carrier (both mapped to affected)', () => {
    expect(calculateADRisk('carrier', 'carrier')).toEqual({
      affected: 75,
      carrier: 0,
      normal: 25,
    });
  });

  it('should return 75% affected for affected x affected (het x het)', () => {
    expect(calculateADRisk('affected', 'affected')).toEqual({
      affected: 75,
      carrier: 0,
      normal: 25,
    });
  });

  it('should map carrier to affected (carrier x normal = affected x normal)', () => {
    expect(calculateADRisk('carrier', 'normal')).toEqual(calculateADRisk('affected', 'normal'));
  });

  it('should always have 0% carrier column for AD', () => {
    expect(calculateADRisk('normal', 'normal').carrier).toBe(0);
    expect(calculateADRisk('carrier', 'normal').carrier).toBe(0);
    expect(calculateADRisk('affected', 'normal').carrier).toBe(0);
    expect(calculateADRisk('affected', 'affected').carrier).toBe(0);
    expect(calculateADRisk('carrier', 'carrier').carrier).toBe(0);
  });

  it('should return zeroes for unknown parents', () => {
    expect(calculateADRisk('unknown', 'carrier')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
    expect(calculateADRisk('normal', 'unknown')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
  });

  it('should sum to 100% for non-unknown combinations', () => {
    const statuses = ['normal', 'carrier', 'affected'] as const;
    for (const s1 of statuses) {
      for (const s2 of statuses) {
        const risk = calculateADRisk(s1, s2);
        expect(risk.affected + risk.carrier + risk.normal).toBe(100);
      }
    }
  });
});

// ─── X-Linked Risk ────────────────────────────────────────────────────────────

describe('calculateXLinkedRisk', () => {
  it('should produce sex-stratified results with sons and daughters', () => {
    const risk = calculateXLinkedRisk('carrier', 'normal');
    expect(risk).toHaveProperty('sons');
    expect(risk).toHaveProperty('daughters');
    expect(risk.sons).toHaveProperty('affected');
    expect(risk.daughters).toHaveProperty('affected');
  });

  it('should return all normal for normal mother x normal father', () => {
    const risk = calculateXLinkedRisk('normal', 'normal');
    expect(risk.sons).toEqual({ affected: 0, carrier: 0, normal: 100 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 0, normal: 100 });
  });

  it('should show 50% sons affected for carrier mother x normal father', () => {
    const risk = calculateXLinkedRisk('carrier', 'normal');
    expect(risk.sons).toEqual({ affected: 50, carrier: 0, normal: 50 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 50, normal: 50 });
  });

  it('should show 0% sons affected, 100% daughters carriers for affected father x normal mother', () => {
    // parent1IsFemale=true: parent1=mother(normal), parent2=father(affected)
    const risk = calculateXLinkedRisk('normal', 'affected', true);
    expect(risk.sons).toEqual({ affected: 0, carrier: 0, normal: 100 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 100, normal: 0 });
  });

  it('should show 50% sons affected, 50% daughters affected for carrier mother x affected father', () => {
    const risk = calculateXLinkedRisk('carrier', 'affected');
    expect(risk.sons).toEqual({ affected: 50, carrier: 0, normal: 50 });
    expect(risk.daughters).toEqual({ affected: 50, carrier: 50, normal: 0 });
  });

  it('should show 100% sons affected for affected mother x normal father', () => {
    const risk = calculateXLinkedRisk('affected', 'normal');
    expect(risk.sons).toEqual({ affected: 100, carrier: 0, normal: 0 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 100, normal: 0 });
  });

  it('should show all children affected for affected mother x affected father', () => {
    const risk = calculateXLinkedRisk('affected', 'affected');
    expect(risk.sons).toEqual({ affected: 100, carrier: 0, normal: 0 });
    expect(risk.daughters).toEqual({ affected: 100, carrier: 0, normal: 0 });
  });

  it('should map male carrier to affected (hemizygous)', () => {
    // Father "carrier" = "affected" for X-linked
    const riskWithCarrier = calculateXLinkedRisk('normal', 'carrier');
    const riskWithAffected = calculateXLinkedRisk('normal', 'affected');
    expect(riskWithCarrier.sons).toEqual(riskWithAffected.sons);
    expect(riskWithCarrier.daughters).toEqual(riskWithAffected.daughters);
  });

  it('should calculate overall averages assuming 50/50 sex ratio', () => {
    const risk = calculateXLinkedRisk('carrier', 'normal');
    // Sons: 50% affected, 0% carrier, 50% normal
    // Daughters: 0% affected, 50% carrier, 50% normal
    expect(risk.affected).toBe(25);
    expect(risk.carrier).toBe(25);
    expect(risk.normal).toBe(50);
  });

  it('should return zeroes for unknown parents', () => {
    const risk = calculateXLinkedRisk('unknown', 'carrier');
    expect(risk.sons).toEqual({ affected: 0, carrier: 0, normal: 0 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 0, normal: 0 });
    expect(risk.affected).toBe(0);
    expect(risk.carrier).toBe(0);
    expect(risk.normal).toBe(0);
  });

  it('should return zeroes when father is unknown', () => {
    const risk = calculateXLinkedRisk('carrier', 'unknown');
    expect(risk.sons).toEqual({ affected: 0, carrier: 0, normal: 0 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 0, normal: 0 });
  });

  it('should swap mother/father when parent1IsFemale is false', () => {
    // parent1=father(affected), parent2=mother(carrier), parent1IsFemale=false
    // So mother=carrier, father=affected
    const risk = calculateXLinkedRisk('affected', 'carrier', false);
    // Mother=carrier(parent2), Father=affected(parent1)
    // Sons: 50% affected (from carrier mother)
    expect(risk.sons).toEqual({ affected: 50, carrier: 0, normal: 50 });
    // Daughters: 50% affected, 50% carrier (carrier mother x affected father)
    expect(risk.daughters).toEqual({ affected: 50, carrier: 50, normal: 0 });
  });

  it('should handle normal x normal with parent1IsFemale=false', () => {
    const risk = calculateXLinkedRisk('normal', 'normal', false);
    expect(risk.sons).toEqual({ affected: 0, carrier: 0, normal: 100 });
    expect(risk.daughters).toEqual({ affected: 0, carrier: 0, normal: 100 });
  });
});

// ─── combineForCondition ──────────────────────────────────────────────────────

describe('combineForCondition', () => {
  it('should dispatch to AR calculator for autosomal_recessive', () => {
    const prediction = combineForCondition(
      'Cystic Fibrosis',
      'CFTR',
      'autosomal_recessive',
      'carrier',
      'carrier',
    );
    expect(prediction.offspringRisk).toEqual({ affected: 25, carrier: 50, normal: 25 });
    expect(prediction.isSexLinked).toBe(false);
    expect(prediction.inheritance).toBe('autosomal_recessive');
  });

  it('should dispatch to AD calculator for autosomal_dominant', () => {
    const prediction = combineForCondition(
      'Huntington Disease',
      'HTT',
      'autosomal_dominant',
      'carrier',
      'normal',
    );
    expect(prediction.offspringRisk).toEqual({ affected: 50, carrier: 0, normal: 50 });
    expect(prediction.isSexLinked).toBe(false);
    expect(prediction.inheritance).toBe('autosomal_dominant');
  });

  it('should dispatch to X-linked calculator for X-linked', () => {
    const prediction = combineForCondition('Hemophilia A', 'F8', 'X-linked', 'carrier', 'normal');
    expect(prediction.isSexLinked).toBe(true);
    expect(prediction.inheritance).toBe('X-linked');
    expect('sons' in prediction.offspringRisk).toBe(true);
    const risk = prediction.offspringRisk as XLinkedOffspringRisk;
    expect(risk.sons.affected).toBe(50);
    expect(risk.daughters.carrier).toBe(50);
  });

  it('should include counseling URL for AD conditions', () => {
    const prediction = combineForCondition(
      'Huntington Disease',
      'HTT',
      'autosomal_dominant',
      'carrier',
      'normal',
    );
    expect(prediction.counselingUrl).toBe('https://findageneticcounselor.nsgc.org/');
  });

  it('should not include counseling URL for AR conditions', () => {
    const prediction = combineForCondition(
      'Cystic Fibrosis',
      'CFTR',
      'autosomal_recessive',
      'carrier',
      'carrier',
    );
    expect(prediction.counselingUrl).toBeUndefined();
  });

  it('should not include counseling URL for X-linked conditions', () => {
    const prediction = combineForCondition('Hemophilia A', 'F8', 'X-linked', 'carrier', 'normal');
    expect(prediction.counselingUrl).toBeUndefined();
  });

  it('should preserve condition and gene metadata', () => {
    const prediction = combineForCondition(
      'Sickle Cell Disease',
      'HBB',
      'autosomal_recessive',
      'normal',
      'carrier',
    );
    expect(prediction.condition).toBe('Sickle Cell Disease');
    expect(prediction.gene).toBe('HBB');
    expect(prediction.parent1Status).toBe('normal');
    expect(prediction.parent2Status).toBe('carrier');
  });

  it('should handle unknown parent status gracefully', () => {
    const prediction = combineForCondition(
      'Test Disease',
      'TEST',
      'autosomal_recessive',
      'unknown',
      'carrier',
    );
    expect(prediction.offspringRisk).toEqual({ affected: 0, carrier: 0, normal: 0 });
  });

  it('should accept parent1IsFemale parameter for X-linked', () => {
    // parent1=father(affected), parent2=mother(normal), parent1IsFemale=false
    const prediction = combineForCondition(
      'Hemophilia A',
      'F8',
      'X-linked',
      'affected',
      'normal',
      false,
    );
    const risk = prediction.offspringRisk as XLinkedOffspringRisk;
    // Mother=normal(parent2), Father=affected(parent1)
    // Sons: 0% affected (mother is normal, sons get X from mother)
    expect(risk.sons.affected).toBe(0);
    // Daughters: 100% carriers (father passes pathogenic X to all daughters)
    expect(risk.daughters.carrier).toBe(100);
  });
});

// ─── combineAllConditions ─────────────────────────────────────────────────────

describe('combineAllConditions', () => {
  it('should match conditions between parents by name', () => {
    const parent1: ParentConditionInput[] = [
      {
        condition: 'Disease A',
        gene: 'GENE_A',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
      {
        condition: 'Disease B',
        gene: 'GENE_B',
        inheritance: 'autosomal_dominant',
        status: 'normal',
      },
    ];
    const parent2: ParentConditionInput[] = [
      {
        condition: 'Disease A',
        gene: 'GENE_A',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
      {
        condition: 'Disease B',
        gene: 'GENE_B',
        inheritance: 'autosomal_dominant',
        status: 'carrier',
      },
    ];

    const results = combineAllConditions(parent1, parent2);
    expect(results).toHaveLength(2);

    const conditions = results.map((r) => r.condition);
    expect(conditions).toContain('Disease A');
    expect(conditions).toContain('Disease B');
  });

  it('should only include conditions present in both parents', () => {
    const parent1: ParentConditionInput[] = [
      {
        condition: 'Shared Disease',
        gene: 'SHARED',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
      {
        condition: 'Parent1 Only',
        gene: 'P1',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
    ];
    const parent2: ParentConditionInput[] = [
      {
        condition: 'Shared Disease',
        gene: 'SHARED',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
      {
        condition: 'Parent2 Only',
        gene: 'P2',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
    ];

    const results = combineAllConditions(parent1, parent2);
    expect(results).toHaveLength(1);
    expect(results[0]!.condition).toBe('Shared Disease');
  });

  it('should return empty array when no conditions match', () => {
    const parent1: ParentConditionInput[] = [
      { condition: 'Disease A', gene: 'A', inheritance: 'autosomal_recessive', status: 'carrier' },
    ];
    const parent2: ParentConditionInput[] = [
      { condition: 'Disease B', gene: 'B', inheritance: 'autosomal_recessive', status: 'carrier' },
    ];

    const results = combineAllConditions(parent1, parent2);
    expect(results).toHaveLength(0);
  });

  it('should return empty array for empty inputs', () => {
    expect(combineAllConditions([], [])).toHaveLength(0);
    expect(
      combineAllConditions(
        [],
        [{ condition: 'A', gene: 'A', inheritance: 'autosomal_recessive', status: 'carrier' }],
      ),
    ).toHaveLength(0);
    expect(
      combineAllConditions(
        [{ condition: 'A', gene: 'A', inheritance: 'autosomal_recessive', status: 'carrier' }],
        [],
      ),
    ).toHaveLength(0);
  });

  it('should sort by risk level (highest risk first)', () => {
    const parent1: ParentConditionInput[] = [
      { condition: 'Low Risk', gene: 'G1', inheritance: 'autosomal_recessive', status: 'normal' },
      { condition: 'High Risk', gene: 'G2', inheritance: 'autosomal_recessive', status: 'carrier' },
      {
        condition: 'Medium Risk',
        gene: 'G3',
        inheritance: 'autosomal_recessive',
        status: 'normal',
      },
    ];
    const parent2: ParentConditionInput[] = [
      { condition: 'Low Risk', gene: 'G1', inheritance: 'autosomal_recessive', status: 'normal' },
      {
        condition: 'High Risk',
        gene: 'G2',
        inheritance: 'autosomal_recessive',
        status: 'affected',
      },
      {
        condition: 'Medium Risk',
        gene: 'G3',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
    ];

    const results = combineAllConditions(parent1, parent2);
    expect(results).toHaveLength(3);

    // carrier x affected = 50% affected (highest)
    expect(results[0]!.condition).toBe('High Risk');
    expect(results[0]!.offspringRisk.affected).toBe(50);

    // normal x carrier = 0% affected, 50% carrier (medium)
    expect(results[1]!.condition).toBe('Medium Risk');
    expect(results[1]!.offspringRisk.carrier).toBe(50);

    // normal x normal = 0% everything (lowest)
    expect(results[2]!.condition).toBe('Low Risk');
    expect(results[2]!.offspringRisk.affected).toBe(0);
    expect(results[2]!.offspringRisk.carrier).toBe(0);
  });

  it('should sort alphabetically as tie-breaker when risk scores are equal', () => {
    const parent1: ParentConditionInput[] = [
      {
        condition: 'Zebra Disease',
        gene: 'Z',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
      {
        condition: 'Alpha Disease',
        gene: 'A',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
    ];
    const parent2: ParentConditionInput[] = [
      {
        condition: 'Zebra Disease',
        gene: 'Z',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
      {
        condition: 'Alpha Disease',
        gene: 'A',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
    ];

    const results = combineAllConditions(parent1, parent2);
    expect(results).toHaveLength(2);
    // Same risk (carrier x carrier = 25% affected, 50% carrier) -> alphabetical
    expect(results[0]!.condition).toBe('Alpha Disease');
    expect(results[1]!.condition).toBe('Zebra Disease');
  });

  it('should include counseling URL for AD conditions in batch', () => {
    const parent1: ParentConditionInput[] = [
      {
        condition: 'AD Condition',
        gene: 'AD1',
        inheritance: 'autosomal_dominant',
        status: 'carrier',
      },
      {
        condition: 'AR Condition',
        gene: 'AR1',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
    ];
    const parent2: ParentConditionInput[] = [
      {
        condition: 'AD Condition',
        gene: 'AD1',
        inheritance: 'autosomal_dominant',
        status: 'normal',
      },
      {
        condition: 'AR Condition',
        gene: 'AR1',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
    ];

    const results = combineAllConditions(parent1, parent2);
    const adResult = results.find((r) => r.condition === 'AD Condition')!;
    const arResult = results.find((r) => r.condition === 'AR Condition')!;

    expect(adResult.counselingUrl).toBe('https://findageneticcounselor.nsgc.org/');
    expect(arResult.counselingUrl).toBeUndefined();
  });

  it('should correctly handle X-linked conditions in batch', () => {
    const parent1: ParentConditionInput[] = [
      { condition: 'Hemophilia', gene: 'F8', inheritance: 'X-linked', status: 'carrier' },
    ];
    const parent2: ParentConditionInput[] = [
      { condition: 'Hemophilia', gene: 'F8', inheritance: 'X-linked', status: 'normal' },
    ];

    const results = combineAllConditions(parent1, parent2);
    expect(results).toHaveLength(1);
    expect(results[0]!.isSexLinked).toBe(true);
    expect('sons' in results[0]!.offspringRisk).toBe(true);

    const risk = results[0]!.offspringRisk as XLinkedOffspringRisk;
    expect(risk.sons.affected).toBe(50);
    expect(risk.daughters.carrier).toBe(50);
  });

  it('should handle mixed inheritance patterns correctly', () => {
    const parent1: ParentConditionInput[] = [
      {
        condition: 'AR Disease',
        gene: 'AR',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
      { condition: 'AD Disease', gene: 'AD', inheritance: 'autosomal_dominant', status: 'carrier' },
      { condition: 'XL Disease', gene: 'XL', inheritance: 'X-linked', status: 'carrier' },
    ];
    const parent2: ParentConditionInput[] = [
      {
        condition: 'AR Disease',
        gene: 'AR',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
      { condition: 'AD Disease', gene: 'AD', inheritance: 'autosomal_dominant', status: 'normal' },
      { condition: 'XL Disease', gene: 'XL', inheritance: 'X-linked', status: 'normal' },
    ];

    const results = combineAllConditions(parent1, parent2);
    expect(results).toHaveLength(3);

    const arResult = results.find((r) => r.condition === 'AR Disease')!;
    const adResult = results.find((r) => r.condition === 'AD Disease')!;
    const xlResult = results.find((r) => r.condition === 'XL Disease')!;

    // AR: carrier x carrier = 25/50/25
    expect(arResult.offspringRisk.affected).toBe(25);
    expect(arResult.isSexLinked).toBe(false);

    // AD: carrier x normal = 50/0/50
    expect(adResult.offspringRisk.affected).toBe(50);
    expect(adResult.isSexLinked).toBe(false);
    expect(adResult.counselingUrl).toBeDefined();

    // XL: carrier mother x normal father = sex-stratified
    expect(xlResult.isSexLinked).toBe(true);
  });

  it('should accept parent1IsFemale parameter', () => {
    const parent1: ParentConditionInput[] = [
      { condition: 'Hemophilia', gene: 'F8', inheritance: 'X-linked', status: 'affected' },
    ];
    const parent2: ParentConditionInput[] = [
      { condition: 'Hemophilia', gene: 'F8', inheritance: 'X-linked', status: 'normal' },
    ];

    // parent1=father(affected), parent2=mother(normal), parent1IsFemale=false
    const results = combineAllConditions(parent1, parent2, false);
    expect(results).toHaveLength(1);

    const risk = results[0]!.offspringRisk as XLinkedOffspringRisk;
    // Mother=normal(parent2), Father=affected(parent1)
    // Sons: all normal (mother is normal, sons get X from mother)
    expect(risk.sons.affected).toBe(0);
    // Daughters: all carriers (father passes pathogenic X)
    expect(risk.daughters.carrier).toBe(100);
  });

  it('should handle large batches efficiently', () => {
    const conditions: ParentConditionInput[] = [];
    for (let i = 0; i < 1000; i++) {
      conditions.push({
        condition: `Disease ${i}`,
        gene: `GENE${i}`,
        inheritance: 'autosomal_recessive',
        status: i % 3 === 0 ? 'carrier' : i % 3 === 1 ? 'affected' : 'normal',
      });
    }

    const parent2Conditions: ParentConditionInput[] = conditions.map((c) => ({
      ...c,
      status: c.status === 'carrier' ? 'carrier' : 'normal',
    }));

    const results = combineAllConditions(conditions, parent2Conditions);
    expect(results).toHaveLength(1000);

    // Verify sorting: first result should have highest affected %
    const firstAffected = results[0]!.offspringRisk.affected;
    const lastAffected = results[results.length - 1]!.offspringRisk.affected;
    expect(firstAffected).toBeGreaterThanOrEqual(lastAffected);
  });
});
