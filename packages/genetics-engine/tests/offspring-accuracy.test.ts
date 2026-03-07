/**
 * Offspring Accuracy Tests (Q7 / Q7a)
 *
 * Verifies that Mendelian inheritance calculations produce the exact expected
 * probabilities for known parent genotype combinations, and that the CLT-based
 * offspring PRS distribution has the correct statistical properties.
 *
 * These tests complement the existing combiner.test.ts (which tests function
 * dispatch and metadata) by focusing purely on numerical correctness and
 * boundary invariants.
 *
 * Q7  — Couple/Offspring Logic: AR, AD, X-linked, edge cases
 * Q7a — Offspring PRS Distribution: mean, variance, regression to mean
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
import { predictOffspringPrsClt, predictOffspringPrsRange, normalCdf } from '../src/prs';

// ─── Q7: Offspring Risk — Autosomal Recessive ────────────────────────────────

describe('Offspring Risk — Autosomal Recessive', () => {
  /**
   * Classic Punnett-square result: carrier × carrier.
   * Mendel's first law: 1/4 affected, 1/2 carrier, 1/4 normal.
   */
  it('both carriers → 25% affected, 50% carrier, 25% normal', () => {
    const risk = calculateARRisk('carrier', 'carrier');
    expect(risk.affected).toBe(25);
    expect(risk.carrier).toBe(50);
    expect(risk.normal).toBe(25);
  });

  /**
   * One carrier + one normal: offspring cannot be affected.
   * Only transmission of the pathogenic allele gives 50% carrier probability.
   */
  it('one carrier, one normal → 0% affected, 50% carrier, 50% normal', () => {
    const risk = calculateARRisk('carrier', 'normal');
    expect(risk.affected).toBe(0);
    expect(risk.carrier).toBe(50);
    expect(risk.normal).toBe(50);
  });

  /**
   * Same combination, reversed parent order — must be symmetric.
   */
  it('one normal, one carrier (reversed order) → 0% affected, 50% carrier, 50% normal', () => {
    const risk = calculateARRisk('normal', 'carrier');
    expect(risk.affected).toBe(0);
    expect(risk.carrier).toBe(50);
    expect(risk.normal).toBe(50);
  });

  /**
   * One affected (homozygous) × one carrier: all offspring get at least one
   * pathogenic allele. Half get both → 50% affected, 50% carrier.
   */
  it('one affected, one carrier → 50% affected, 50% carrier, 0% normal', () => {
    const risk = calculateARRisk('affected', 'carrier');
    expect(risk.affected).toBe(50);
    expect(risk.carrier).toBe(50);
    expect(risk.normal).toBe(0);
  });

  /**
   * Both affected (homozygous): every offspring receives two pathogenic alleles.
   */
  it('both affected → 100% affected', () => {
    const risk = calculateARRisk('affected', 'affected');
    expect(risk.affected).toBe(100);
    expect(risk.carrier).toBe(0);
    expect(risk.normal).toBe(0);
  });

  /**
   * Both normal: no pathogenic alleles in either parent — no risk at all.
   */
  it('both normal → 0% risk across all categories', () => {
    const risk = calculateARRisk('normal', 'normal');
    expect(risk.affected).toBe(0);
    expect(risk.carrier).toBe(0);
    expect(risk.normal).toBe(100);
  });

  /**
   * One normal + one affected: all offspring are carriers (each gets one
   * pathogenic allele from the affected parent, one normal from the other).
   */
  it('one normal, one affected → 0% affected, 100% carrier, 0% normal', () => {
    const risk = calculateARRisk('normal', 'affected');
    expect(risk.affected).toBe(0);
    expect(risk.carrier).toBe(100);
    expect(risk.normal).toBe(0);
  });

  /**
   * Invariant: for all valid (non-unknown) parent combinations, the three
   * outcome percentages must sum to exactly 100%.
   */
  it('probabilities always sum to 100% for all valid parent combinations', () => {
    const statuses = ['normal', 'carrier', 'affected'] as const;
    for (const s1 of statuses) {
      for (const s2 of statuses) {
        const risk = calculateARRisk(s1, s2);
        expect(risk.affected + risk.carrier + risk.normal).toBe(100);
      }
    }
  });

  /**
   * Invariant: no probability is negative or exceeds 100.
   */
  it('all risk values are within [0, 100] for all valid parent combinations', () => {
    const statuses = ['normal', 'carrier', 'affected'] as const;
    for (const s1 of statuses) {
      for (const s2 of statuses) {
        const risk = calculateARRisk(s1, s2);
        expect(risk.affected).toBeGreaterThanOrEqual(0);
        expect(risk.affected).toBeLessThanOrEqual(100);
        expect(risk.carrier).toBeGreaterThanOrEqual(0);
        expect(risk.carrier).toBeLessThanOrEqual(100);
        expect(risk.normal).toBeGreaterThanOrEqual(0);
        expect(risk.normal).toBeLessThanOrEqual(100);
      }
    }
  });

  /**
   * Invariant: the AR table is symmetric — swapping parents does not change
   * offspring risk.
   */
  it('is symmetric — swapping parent order does not change risk', () => {
    const pairs: Array<['normal' | 'carrier' | 'affected', 'normal' | 'carrier' | 'affected']> = [
      ['normal', 'carrier'],
      ['carrier', 'affected'],
      ['normal', 'affected'],
    ];
    for (const [s1, s2] of pairs) {
      expect(calculateARRisk(s1, s2)).toEqual(calculateARRisk(s2, s1));
    }
  });

  /**
   * Unknown parent status means risk cannot be calculated — returns zeroes.
   * This is a safe default to avoid displaying false risk.
   */
  it('unknown parent → returns zero risk (safe default)', () => {
    const zeroRisk = { affected: 0, carrier: 0, normal: 0 };
    expect(calculateARRisk('unknown', 'carrier')).toEqual(zeroRisk);
    expect(calculateARRisk('carrier', 'unknown')).toEqual(zeroRisk);
    expect(calculateARRisk('unknown', 'unknown')).toEqual(zeroRisk);
  });

  /**
   * Real-world example: Cystic Fibrosis via combineForCondition.
   * Both parents CFTR carriers → 25% affected.
   */
  it('real-world CF example: both CFTR carriers → 25% affected offspring', () => {
    const prediction = combineForCondition(
      'Cystic Fibrosis',
      'CFTR',
      'autosomal_recessive',
      'carrier',
      'carrier',
    );
    expect(prediction.offspringRisk.affected).toBe(25);
    expect(prediction.offspringRisk.carrier).toBe(50);
    expect(prediction.offspringRisk.normal).toBe(25);
    expect(prediction.isSexLinked).toBe(false);
  });

  /**
   * Real-world example: Sickle Cell Disease.
   * One carrier, one normal parent → no affected offspring.
   */
  it('real-world Sickle Cell example: one carrier + one normal → 0% affected', () => {
    const prediction = combineForCondition(
      'Sickle Cell Disease',
      'HBB',
      'autosomal_recessive',
      'carrier',
      'normal',
    );
    expect(prediction.offspringRisk.affected).toBe(0);
    expect(prediction.offspringRisk.carrier).toBe(50);
    expect(prediction.offspringRisk.normal).toBe(50);
  });
});

// ─── Q7: Offspring Risk — Autosomal Dominant ─────────────────────────────────

describe('Offspring Risk — Autosomal Dominant', () => {
  /**
   * In AD conditions, a single pathogenic copy causes disease.
   * One heterozygous affected parent × normal: 50% offspring affected.
   */
  it('one heterozygous affected × normal → 50% affected', () => {
    const risk = calculateADRisk('affected', 'normal');
    expect(risk.affected).toBe(50);
    expect(risk.carrier).toBe(0);
    expect(risk.normal).toBe(50);
  });

  /**
   * AD: "carrier" is clinically equivalent to "affected" — one copy = disease.
   * Carrier × normal must equal affected × normal.
   */
  it('one carrier × normal → 50% affected (carrier mapped to affected in AD)', () => {
    const risk = calculateADRisk('carrier', 'normal');
    expect(risk.affected).toBe(50);
    expect(risk.carrier).toBe(0);
    expect(risk.normal).toBe(50);
  });

  /**
   * Both heterozygous: Aa × Aa yields 25% AA + 50% Aa + 25% aa.
   * Since one copy = affected, 75% are affected (AA + Aa).
   */
  it('both heterozygous (het × het) → 75% affected', () => {
    const risk = calculateADRisk('affected', 'affected');
    expect(risk.affected).toBe(75);
    expect(risk.carrier).toBe(0);
    expect(risk.normal).toBe(25);
  });

  /**
   * carrier × carrier is modeled identically to het × het in AD.
   */
  it('both carriers → 75% affected (same as het × het)', () => {
    const risk = calculateADRisk('carrier', 'carrier');
    expect(risk.affected).toBe(75);
    expect(risk.carrier).toBe(0);
    expect(risk.normal).toBe(25);
  });

  /**
   * Both normal: no pathogenic alleles in either parent — no offspring risk.
   */
  it('both normal → 0% affected', () => {
    const risk = calculateADRisk('normal', 'normal');
    expect(risk.affected).toBe(0);
    expect(risk.carrier).toBe(0);
    expect(risk.normal).toBe(100);
  });

  /**
   * AD invariant: "carrier" column is always 0 (one copy = affected, not carrier).
   */
  it('carrier column is always 0 for AD (no "carrier" state in dominant disease)', () => {
    const statuses = ['normal', 'carrier', 'affected'] as const;
    for (const s1 of statuses) {
      for (const s2 of statuses) {
        const risk = calculateADRisk(s1, s2);
        expect(risk.carrier).toBe(0);
      }
    }
  });

  /**
   * AD invariant: probabilities sum to 100%.
   */
  it('probabilities sum to 100% for all valid parent combinations', () => {
    const statuses = ['normal', 'carrier', 'affected'] as const;
    for (const s1 of statuses) {
      for (const s2 of statuses) {
        const risk = calculateADRisk(s1, s2);
        expect(risk.affected + risk.carrier + risk.normal).toBe(100);
      }
    }
  });

  /**
   * AD invariant: all values in [0, 100].
   */
  it('all risk values are within [0, 100]', () => {
    const statuses = ['normal', 'carrier', 'affected'] as const;
    for (const s1 of statuses) {
      for (const s2 of statuses) {
        const risk = calculateADRisk(s1, s2);
        expect(risk.affected).toBeGreaterThanOrEqual(0);
        expect(risk.affected).toBeLessThanOrEqual(100);
        expect(risk.normal).toBeGreaterThanOrEqual(0);
        expect(risk.normal).toBeLessThanOrEqual(100);
      }
    }
  });

  /**
   * Unknown parent returns zero risk.
   */
  it('unknown parent → returns zero risk', () => {
    const zeroRisk = { affected: 0, carrier: 0, normal: 0 };
    expect(calculateADRisk('unknown', 'normal')).toEqual(zeroRisk);
    expect(calculateADRisk('normal', 'unknown')).toEqual(zeroRisk);
  });

  /**
   * Real-world example: Huntington Disease.
   * One carrier (het) × normal → 50% offspring affected.
   * combineForCondition also attaches a counseling URL for AD conditions.
   */
  it('real-world Huntington example: one het carrier × normal → 50% affected + counseling URL', () => {
    const prediction = combineForCondition(
      'Huntington Disease',
      'HTT',
      'autosomal_dominant',
      'carrier',
      'normal',
    );
    expect(prediction.offspringRisk.affected).toBe(50);
    expect(prediction.offspringRisk.carrier).toBe(0);
    expect(prediction.offspringRisk.normal).toBe(50);
    expect(prediction.counselingUrl).toBe('https://findageneticcounselor.nsgc.org/');
  });
});

// ─── Q7: Offspring Risk — X-Linked ────────────────────────────────────────────

describe('Offspring Risk — X-Linked', () => {
  /**
   * Carrier mother × normal father: sons inherit X from mother (50% chance
   * of pathogenic X = 50% affected), daughters inherit normal X from father
   * + 50% chance of pathogenic X from mother (50% carriers).
   *
   * Classic X-linked recessive result: 25% of all children affected
   * (= 50% of sons), 25% carrier daughters.
   */
  it('carrier mother × normal father → 50% of sons affected, 50% of daughters carriers', () => {
    const risk = calculateXLinkedRisk('carrier', 'normal');
    expect(risk.sons.affected).toBe(50);
    expect(risk.sons.carrier).toBe(0);
    expect(risk.sons.normal).toBe(50);
    expect(risk.daughters.affected).toBe(0);
    expect(risk.daughters.carrier).toBe(50);
    expect(risk.daughters.normal).toBe(50);
  });

  /**
   * Affected mother (homozygous xx) × normal father: all sons receive the
   * pathogenic X from mother → 100% sons affected. All daughters receive the
   * normal X from father plus pathogenic X from mother → 100% carriers.
   */
  it('affected mother × normal father → 100% sons affected, 100% daughters carriers', () => {
    const risk = calculateXLinkedRisk('affected', 'normal');
    expect(risk.sons.affected).toBe(100);
    expect(risk.sons.carrier).toBe(0);
    expect(risk.sons.normal).toBe(0);
    expect(risk.daughters.affected).toBe(0);
    expect(risk.daughters.carrier).toBe(100);
    expect(risk.daughters.normal).toBe(0);
  });

  /**
   * Normal mother × affected father: sons receive X from normal mother → all
   * normal. Daughters receive pathogenic X from father → all obligate carriers.
   * No offspring are affected.
   */
  it('normal mother × affected father → 0% affected sons, 100% carrier daughters', () => {
    // parent1IsFemale=true (default): parent1=mother, parent2=father
    const risk = calculateXLinkedRisk('normal', 'affected', true);
    expect(risk.sons.affected).toBe(0);
    expect(risk.sons.carrier).toBe(0);
    expect(risk.sons.normal).toBe(100);
    expect(risk.daughters.affected).toBe(0);
    expect(risk.daughters.carrier).toBe(100);
    expect(risk.daughters.normal).toBe(0);
  });

  /**
   * Both parents normal: no pathogenic X in either parent — all offspring normal.
   */
  it('normal mother × normal father → all offspring normal', () => {
    const risk = calculateXLinkedRisk('normal', 'normal');
    expect(risk.sons.affected).toBe(0);
    expect(risk.sons.carrier).toBe(0);
    expect(risk.sons.normal).toBe(100);
    expect(risk.daughters.affected).toBe(0);
    expect(risk.daughters.carrier).toBe(0);
    expect(risk.daughters.normal).toBe(100);
  });

  /**
   * Affected mother × affected father: all offspring affected
   * (sons hemizygous pathogenic, daughters homozygous pathogenic).
   */
  it('affected mother × affected father → 100% all offspring affected', () => {
    const risk = calculateXLinkedRisk('affected', 'affected');
    expect(risk.sons.affected).toBe(100);
    expect(risk.daughters.affected).toBe(100);
  });

  /**
   * Carrier mother × affected father: sons still get X only from mother
   * (50% affected), daughters get pathogenic X from father + 50% chance
   * pathogenic X from mother → 50% affected daughters, 50% carrier daughters.
   */
  it('carrier mother × affected father → 50% sons affected, 50% daughters affected + 50% daughters carriers', () => {
    const risk = calculateXLinkedRisk('carrier', 'affected');
    expect(risk.sons.affected).toBe(50);
    expect(risk.sons.normal).toBe(50);
    expect(risk.daughters.affected).toBe(50);
    expect(risk.daughters.carrier).toBe(50);
    expect(risk.daughters.normal).toBe(0);
  });

  /**
   * For males, "carrier" status is meaningless (they are hemizygous).
   * The engine maps male "carrier" → "affected". Verify this mapping.
   */
  it('male "carrier" status is treated as affected (hemizygous X-linked)', () => {
    const withCarrierFather = calculateXLinkedRisk('normal', 'carrier');
    const withAffectedFather = calculateXLinkedRisk('normal', 'affected');
    // Sons: same in both cases (father's X not inherited by sons)
    expect(withCarrierFather.sons).toEqual(withAffectedFather.sons);
    // Daughters: carrier father vs affected father → daughters become carriers in both
    expect(withCarrierFather.daughters).toEqual(withAffectedFather.daughters);
  });

  /**
   * Overall averages (assuming 50/50 sex ratio) must equal
   * (sons_value + daughters_value) / 2 for affected, carrier, and normal.
   */
  it('overall averages reflect 50/50 sex ratio average of sons + daughters', () => {
    const risk = calculateXLinkedRisk('carrier', 'normal');
    // Sons: 50% affected, Daughters: 0% affected → average = 25%
    expect(risk.affected).toBe((risk.sons.affected + risk.daughters.affected) / 2);
    expect(risk.carrier).toBe((risk.sons.carrier + risk.daughters.carrier) / 2);
    expect(risk.normal).toBe((risk.sons.normal + risk.daughters.normal) / 2);
  });

  /**
   * Verify overall averages across multiple parent combinations.
   */
  it('sons and daughters sub-risks each sum to 100% for valid parent combos', () => {
    const combos: Array<['normal' | 'carrier' | 'affected', 'normal' | 'carrier' | 'affected']> = [
      ['normal', 'normal'],
      ['carrier', 'normal'],
      ['affected', 'normal'],
      ['normal', 'affected'],
      ['carrier', 'affected'],
      ['affected', 'affected'],
    ];
    for (const [mom, dad] of combos) {
      const risk = calculateXLinkedRisk(mom, dad);
      const sonsSum = risk.sons.affected + risk.sons.carrier + risk.sons.normal;
      const daughtersSum = risk.daughters.affected + risk.daughters.carrier + risk.daughters.normal;
      expect(sonsSum).toBe(100);
      expect(daughtersSum).toBe(100);
    }
  });

  /**
   * parent1IsFemale=false swaps the parent roles. Verify the swap yields
   * the same result as passing arguments in the correct sex order.
   */
  it('parent1IsFemale=false correctly swaps mother/father roles', () => {
    // Scenario: father is affected, mother is normal
    // Call with parent1=father(affected), parent2=mother(normal), parent1IsFemale=false
    const swapped = calculateXLinkedRisk('affected', 'normal', false);
    // Equivalent to: mother=normal(parent2), father=affected(parent1)
    // Which is: calculateXLinkedRisk('normal', 'affected', true)
    const direct = calculateXLinkedRisk('normal', 'affected', true);
    expect(swapped.sons).toEqual(direct.sons);
    expect(swapped.daughters).toEqual(direct.daughters);
  });

  /**
   * Unknown parent returns zeroes for all categories.
   */
  it('unknown parent → all zeros (cannot calculate X-linked risk)', () => {
    const zeroResult = {
      sons: { affected: 0, carrier: 0, normal: 0 },
      daughters: { affected: 0, carrier: 0, normal: 0 },
      affected: 0,
      carrier: 0,
      normal: 0,
    };
    const riskA = calculateXLinkedRisk('unknown', 'normal');
    expect(riskA.sons).toEqual(zeroResult.sons);
    expect(riskA.daughters).toEqual(zeroResult.daughters);
    expect(riskA.affected).toBe(0);

    const riskB = calculateXLinkedRisk('carrier', 'unknown');
    expect(riskB.sons).toEqual(zeroResult.sons);
    expect(riskB.daughters).toEqual(zeroResult.daughters);
  });

  /**
   * Real-world example: Hemophilia A (F8 gene, X-linked).
   * Carrier mother × normal father via combineForCondition.
   */
  it('real-world Hemophilia A: carrier mother × normal father via combineForCondition', () => {
    const prediction = combineForCondition('Hemophilia A', 'F8', 'X-linked', 'carrier', 'normal');
    const risk = prediction.offspringRisk as XLinkedOffspringRisk;
    expect(prediction.isSexLinked).toBe(true);
    expect(risk.sons.affected).toBe(50);
    expect(risk.daughters.carrier).toBe(50);
    // No counseling URL for X-linked conditions
    expect(prediction.counselingUrl).toBeUndefined();
  });
});

// ─── Q7: Offspring Risk — Edge Cases ─────────────────────────────────────────

describe('Offspring Risk — Edge Cases', () => {
  /**
   * When one parent has unknown status, risk cannot be computed — the engine
   * returns zero risk as a safe default rather than a misleading estimate.
   *
   * This is important: displaying 0% risk when truly unknown is safer than
   * displaying a false risk number. Users should be told the parent was
   * not tested rather than shown a zero.
   */
  it('unknown parent status returns zero risk for AR', () => {
    expect(calculateARRisk('unknown', 'carrier')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
  });

  it('unknown parent status returns zero risk for AD', () => {
    expect(calculateADRisk('unknown', 'normal')).toEqual({
      affected: 0,
      carrier: 0,
      normal: 0,
    });
  });

  it('unknown parent status returns zero risk for X-linked', () => {
    const risk = calculateXLinkedRisk('unknown', 'carrier');
    expect(risk.sons.affected).toBe(0);
    expect(risk.daughters.affected).toBe(0);
    expect(risk.affected).toBe(0);
  });

  /**
   * combineForCondition correctly propagates unknown status via the AR calculator.
   */
  it('combineForCondition with unknown parent returns zero risk AR', () => {
    const prediction = combineForCondition(
      'Test Disease',
      'GENE1',
      'autosomal_recessive',
      'unknown',
      'carrier',
    );
    expect(prediction.offspringRisk.affected).toBe(0);
    expect(prediction.offspringRisk.carrier).toBe(0);
    expect(prediction.offspringRisk.normal).toBe(0);
  });

  /**
   * combineForCondition with unknown parent for AD.
   */
  it('combineForCondition with unknown parent returns zero risk AD', () => {
    const prediction = combineForCondition(
      'Dominant Disease',
      'GENE2',
      'autosomal_dominant',
      'carrier',
      'unknown',
    );
    expect(prediction.offspringRisk.affected).toBe(0);
    expect(prediction.offspringRisk.normal).toBe(0);
  });

  /**
   * combineForCondition with unknown parent for X-linked.
   */
  it('combineForCondition with unknown parent returns zero risk X-linked', () => {
    const prediction = combineForCondition(
      'X-linked Disease',
      'GENEX',
      'X-linked',
      'unknown',
      'normal',
    );
    const risk = prediction.offspringRisk as XLinkedOffspringRisk;
    expect(risk.sons.affected).toBe(0);
    expect(risk.daughters.affected).toBe(0);
  });

  /**
   * Risk percentages are expressed as 0-100 (not as fractions 0-1).
   * Verify this representation invariant for AR.
   */
  it('AR risk percentages are expressed in 0-100 range (not fractions)', () => {
    // carrier × carrier is the strongest test: produces 25/50/25
    const risk = calculateARRisk('carrier', 'carrier');
    expect(risk.affected).toBe(25); // not 0.25
    expect(risk.carrier).toBe(50); // not 0.50
    expect(risk.normal).toBe(25); // not 0.25
    // All values should be >= 1 when there is any risk (not fractional)
    expect(risk.affected).toBeGreaterThanOrEqual(1);
  });

  /**
   * Risk percentages are 0-100 for AD as well.
   */
  it('AD risk percentages are expressed in 0-100 range (not fractions)', () => {
    const risk = calculateADRisk('carrier', 'normal');
    expect(risk.affected).toBe(50); // not 0.50
    expect(risk.normal).toBe(50); // not 0.50
  });

  /**
   * X-linked risk percentages are 0-100 for both sons and daughters.
   */
  it('X-linked risk percentages are expressed in 0-100 range (not fractions)', () => {
    const risk = calculateXLinkedRisk('carrier', 'normal');
    expect(risk.sons.affected).toBe(50); // not 0.50
    expect(risk.daughters.carrier).toBe(50); // not 0.50
  });

  /**
   * combineAllConditions skips a condition if it only appears in one parent's
   * results, because offspring risk requires both parents' data.
   */
  it('combineAllConditions omits conditions not present in both parents', () => {
    const parent1: ParentConditionInput[] = [
      {
        condition: 'Common Disease',
        gene: 'GENE_C',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
      {
        condition: 'Only In Parent1',
        gene: 'GENE_P1',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
    ];
    const parent2: ParentConditionInput[] = [
      {
        condition: 'Common Disease',
        gene: 'GENE_C',
        inheritance: 'autosomal_recessive',
        status: 'normal',
      },
      {
        condition: 'Only In Parent2',
        gene: 'GENE_P2',
        inheritance: 'autosomal_recessive',
        status: 'carrier',
      },
    ];

    const results = combineAllConditions(parent1, parent2);
    expect(results).toHaveLength(1);
    expect(results[0]!.condition).toBe('Common Disease');
  });

  /**
   * combineAllConditions with both parents unknown for a disease returns zero
   * risk for that disease.
   */
  it('combineAllConditions with both parents unknown → zero risk for that condition', () => {
    const parent1: ParentConditionInput[] = [
      {
        condition: 'Mystery Disease',
        gene: 'MYSTERY',
        inheritance: 'autosomal_recessive',
        status: 'unknown',
      },
    ];
    const parent2: ParentConditionInput[] = [
      {
        condition: 'Mystery Disease',
        gene: 'MYSTERY',
        inheritance: 'autosomal_recessive',
        status: 'unknown',
      },
    ];

    const results = combineAllConditions(parent1, parent2);
    expect(results).toHaveLength(1);
    expect(results[0]!.offspringRisk.affected).toBe(0);
    expect(results[0]!.offspringRisk.carrier).toBe(0);
    expect(results[0]!.offspringRisk.normal).toBe(0);
  });

  /**
   * A batch where all parents are normal should produce zero affected risk
   * across all diseases.
   */
  it('all normal parents in batch → zero affected risk for all AR diseases', () => {
    const parent1: ParentConditionInput[] = [
      { condition: 'Disease A', gene: 'GA', inheritance: 'autosomal_recessive', status: 'normal' },
      { condition: 'Disease B', gene: 'GB', inheritance: 'autosomal_recessive', status: 'normal' },
      { condition: 'Disease C', gene: 'GC', inheritance: 'autosomal_recessive', status: 'normal' },
    ];
    const parent2: ParentConditionInput[] = [
      { condition: 'Disease A', gene: 'GA', inheritance: 'autosomal_recessive', status: 'normal' },
      { condition: 'Disease B', gene: 'GB', inheritance: 'autosomal_recessive', status: 'normal' },
      { condition: 'Disease C', gene: 'GC', inheritance: 'autosomal_recessive', status: 'normal' },
    ];

    const results = combineAllConditions(parent1, parent2);
    for (const result of results) {
      expect(result.offspringRisk.affected).toBe(0);
    }
  });
});

// ─── Q7a: Offspring PRS — Statistical Properties ─────────────────────────────

describe('Offspring PRS — Statistical Properties', () => {
  /**
   * The mean offspring PRS (raw PRS) equals the average of both parents' PRS.
   * This is the fundamental mid-parent regression property.
   *
   * predictOffspringPrsClt returns meanPrs = (parentAPrs + parentBPrs) / 2
   */
  it('offspring mean PRS = (parent1_PRS + parent2_PRS) / 2', () => {
    const parent1Prs = 0.8;
    const parent2Prs = 0.4;
    const result = predictOffspringPrsClt(parent1Prs, parent2Prs, 1.5, 0.5, 0.2);
    expect(result.meanPrs).toBeCloseTo((parent1Prs + parent2Prs) / 2, 5);
  });

  /**
   * Verify mean PRS property for symmetric parents.
   */
  it('offspring mean PRS matches arithmetic average for symmetric inputs', () => {
    const parent1Prs = 0.6;
    const parent2Prs = 0.6;
    const result = predictOffspringPrsClt(parent1Prs, parent2Prs, 1.0, 1.0, 0.2);
    expect(result.meanPrs).toBeCloseTo(0.6, 5);
  });

  /**
   * Verify mean PRS for low parents.
   */
  it('offspring mean PRS = average for low-PRS parents', () => {
    const parent1Prs = 0.1;
    const parent2Prs = 0.3;
    const result = predictOffspringPrsClt(parent1Prs, parent2Prs, -1.5, -0.5, 0.2);
    expect(result.meanPrs).toBeCloseTo((parent1Prs + parent2Prs) / 2, 5);
  });

  /**
   * Offspring variance is less than parent variance due to regression to mean.
   * The engine implements this via heritabilityFactor = 0.5.
   *
   * Both parents at z = +3 (very high, ~99.9th percentile).
   * Expected offspring z = 3 * 0.5 = 1.5 (~93rd percentile), not 99.9th.
   * This demonstrates regression toward the mean.
   */
  it('both high-PRS parents → offspring expected percentile is high but less extreme than parents', () => {
    // Both parents at z = +3 → expected offspring z = 3 * 0.5 = 1.5
    const parentPercentile = normalCdf(3.0) * 100; // ~99.87
    const result = predictOffspringPrsClt(0.9, 0.9, 3.0, 3.0, 0.2);
    expect(result.expectedPercentile).toBeLessThan(parentPercentile);
    // But still substantially above 50th
    expect(result.expectedPercentile).toBeGreaterThan(80);
  });

  /**
   * Both low-PRS parents → offspring is below average but less extreme.
   */
  it('both low-PRS parents → offspring expected percentile is below average but less extreme than parents', () => {
    // Both parents at z = -3 → expected offspring z = -3 * 0.5 = -1.5 (~6.7th percentile)
    const parentPercentile = normalCdf(-3.0) * 100; // ~0.13
    const result = predictOffspringPrsClt(0.1, 0.1, -3.0, -3.0, 0.2);
    expect(result.expectedPercentile).toBeGreaterThan(parentPercentile);
    // But still substantially below 50th
    expect(result.expectedPercentile).toBeLessThan(20);
  });

  /**
   * One high-PRS + one low-PRS parent → expected offspring near population average.
   * Mid-parent z = (3 + (-3)) / 2 = 0; after heritability factor: 0 * 0.5 = 0.
   * Expected offspring ≈ 50th percentile.
   */
  it('one high + one low PRS parent → offspring expected near 50th percentile', () => {
    const result = predictOffspringPrsClt(0.9, 0.1, 3.0, -3.0, 0.2);
    expect(result.expectedPercentile).toBeCloseTo(50, 1);
  });

  /**
   * For average parents (z = 0), expected offspring is also at 50th percentile.
   */
  it('both average parents (z=0) → offspring expected at 50th percentile', () => {
    const result = predictOffspringPrsClt(0.5, 0.5, 0.0, 0.0, 0.2);
    expect(result.expectedPercentile).toBeCloseTo(50, 0);
  });

  /**
   * The 25th and 75th percentile bracket forms a valid IQR:
   * percentile25 < expectedPercentile < percentile75.
   */
  it('IQR is ordered: percentile25 < expected < percentile75', () => {
    const testCases = [
      [0.5, 0.5, 0.0, 0.0],
      [0.9, 0.9, 2.0, 2.0],
      [0.1, 0.1, -2.0, -2.0],
      [0.9, 0.1, 2.0, -1.0],
    ];
    for (const [pA, pB, zA, zB] of testCases) {
      const result = predictOffspringPrsClt(pA!, pB!, zA!, zB!, 0.2);
      expect(result.percentile25).toBeLessThan(result.expectedPercentile);
      expect(result.percentile75).toBeGreaterThan(result.expectedPercentile);
    }
  });

  /**
   * The 25th percentile is the lower bound of the IQR — must be less than
   * the 75th percentile (IQR has positive width).
   */
  it('IQR has positive width: percentile25 < percentile75', () => {
    const result = predictOffspringPrsClt(0.7, 0.3, 1.0, -0.5, 0.2);
    expect(result.percentile25).toBeLessThan(result.percentile75);
  });

  /**
   * The IQR (25th-75th) is narrower than the full range (rangeLow-rangeHigh).
   * This is a fundamental statistical property: IQR covers 50% of the
   * distribution, while the range covers more.
   */
  it('IQR width is narrower than full prediction range width', () => {
    const result = predictOffspringPrsClt(0.7, 0.3, 1.0, 0.5, 0.2);
    const iqrWidth = result.percentile75 - result.percentile25;
    const rangeWidth = result.rangeHigh - result.rangeLow;
    expect(iqrWidth).toBeLessThan(rangeWidth);
  });

  /**
   * Confidence level is always 'moderate' — this reflects the real-world
   * limitation that PRS predictions are inherently uncertain.
   */
  it('confidence level is "moderate" for CLT predictions', () => {
    const result = predictOffspringPrsClt(0.5, 0.5, 0.0, 0.0, 0.2);
    expect(result.confidence).toBe('moderate');
  });

  /**
   * The prediction disclaimer is present and mentions statistical modeling.
   */
  it('prediction disclaimer is included and mentions statistical modeling', () => {
    const result = predictOffspringPrsClt(0.5, 0.5, 0.0, 0.0, 0.2);
    expect(result.predictionDisclaimer).toBeDefined();
    expect(result.predictionDisclaimer.length).toBeGreaterThan(0);
    expect(result.predictionDisclaimer).toContain('statistical modeling');
  });

  /**
   * predictOffspringPrsRange (the legacy function) also exhibits regression
   * to the mean. Both parents at z=4 yields offspring at ~97th percentile
   * (z=2), not at ~99.997th (z=4).
   */
  it('legacy predictOffspringPrsRange: extreme parents regress toward mean', () => {
    const parentZScore = 4.0;
    const parentPercentile = normalCdf(parentZScore) * 100;
    const result = predictOffspringPrsRange(parentZScore, parentZScore);
    expect(result.expectedPercentile).toBeLessThan(parentPercentile);
    expect(result.expectedPercentile).toBeGreaterThan(50);
  });

  /**
   * predictOffspringPrsRange: asymmetric parents (one high, one average)
   * yields offspring below the high parent's level.
   */
  it('legacy predictOffspringPrsRange: asymmetric parents pull offspring toward mid-point', () => {
    // Parent A z=2 (~97.7th), Parent B z=0 (50th)
    // Expected: midParent=1, offspring=0.5 → ~69th percentile
    const result = predictOffspringPrsRange(2.0, 0.0);
    expect(result.expectedPercentile).toBeGreaterThan(50);
    // Offspring should be below parent A's percentile (97.7th)
    const parentAPercentile = normalCdf(2.0) * 100;
    expect(result.expectedPercentile).toBeLessThan(parentAPercentile);
  });

  /**
   * All percentile values in the CLT result are within [0, 100].
   */
  it('all offspring percentile values are in [0, 100]', () => {
    const testCases: Array<[number, number, number, number]> = [
      [0.5, 0.5, 0.0, 0.0],
      [0.9, 0.1, 3.0, -2.5],
      [0.1, 0.9, -3.0, 2.5],
      [1.0, 1.0, 4.0, 4.0],
      [0.0, 0.0, -4.0, -4.0],
    ];
    for (const [pA, pB, zA, zB] of testCases) {
      const result = predictOffspringPrsClt(pA, pB, zA, zB, 0.2);
      expect(result.expectedPercentile).toBeGreaterThanOrEqual(0);
      expect(result.expectedPercentile).toBeLessThanOrEqual(100);
      expect(result.percentile25).toBeGreaterThanOrEqual(0);
      expect(result.percentile25).toBeLessThanOrEqual(100);
      expect(result.percentile75).toBeGreaterThanOrEqual(0);
      expect(result.percentile75).toBeLessThanOrEqual(100);
      expect(result.rangeLow).toBeGreaterThanOrEqual(0);
      expect(result.rangeLow).toBeLessThanOrEqual(100);
      expect(result.rangeHigh).toBeGreaterThanOrEqual(0);
      expect(result.rangeHigh).toBeLessThanOrEqual(100);
    }
  });

  /**
   * Mean PRS is symmetric — swapping parent order does not change it.
   */
  it('mean PRS is symmetric: swapping parents gives same result', () => {
    const prsA = 0.7;
    const prsB = 0.3;
    const zA = 1.5;
    const zB = -0.5;
    const result1 = predictOffspringPrsClt(prsA, prsB, zA, zB, 0.2);
    const result2 = predictOffspringPrsClt(prsB, prsA, zB, zA, 0.2);
    expect(result1.meanPrs).toBeCloseTo(result2.meanPrs, 5);
    expect(result1.expectedPercentile).toBeCloseTo(result2.expectedPercentile, 3);
  });

  /**
   * Custom heritability (h² = 0.8, height-like trait) yields less regression
   * to the mean than the default h² = 0.5.
   *
   * When both parents are at z = +2 (~97.7th percentile):
   * - h² = 0.5 → expectedZ = 2 * 0.5 = 1.0 (~84th percentile)
   * - h² = 0.8 → expectedZ = 2 * 0.8 = 1.6 (~94th percentile)
   *
   * Higher heritability means the offspring stays closer to the parents'
   * elevated score, i.e., the offspring percentile is higher with h² = 0.8
   * than with h² = 0.5.
   */
  it('custom heritability h²=0.8 (height-like) results in less regression to mean than default h²=0.5', () => {
    // Both parents at z = +2 (97.7th percentile)
    const parentAPrs = 0.8;
    const parentBPrs = 0.8;
    const parentAZ = 2.0;
    const parentBZ = 2.0;
    const popStd = 0.2;

    const resultDefault = predictOffspringPrsClt(
      parentAPrs,
      parentBPrs,
      parentAZ,
      parentBZ,
      popStd,
    );
    const resultHeight = predictOffspringPrsClt(
      parentAPrs,
      parentBPrs,
      parentAZ,
      parentBZ,
      popStd,
      0.8,
    );

    // h²=0.8 offspring should be closer to parents (higher expected percentile)
    // than h²=0.5 offspring, because height has higher heritability
    expect(resultHeight.expectedPercentile).toBeGreaterThan(resultDefault.expectedPercentile);

    // Verify the numerical values match the h² formula:
    // h²=0.5 → expectedZ = 2.0 * 0.5 = 1.0 → ~84.1th percentile
    // h²=0.8 → expectedZ = 2.0 * 0.8 = 1.6 → ~94.5th percentile
    expect(resultDefault.expectedPercentile).toBeCloseTo(normalCdf(1.0) * 100, 1);
    expect(resultHeight.expectedPercentile).toBeCloseTo(normalCdf(1.6) * 100, 1);
  });

  /**
   * Custom heritability passed to predictOffspringPrsRange also reduces
   * regression to mean for high-heritability traits.
   *
   * Both parents at z = +2 with h² = 0.8 → offspring expectedZ = 1.6
   * Both parents at z = +2 with h² = 0.5 → offspring expectedZ = 1.0
   */
  it('predictOffspringPrsRange: h²=0.8 offspring expected percentile is higher than h²=0.5', () => {
    const parentZ = 2.0;
    const resultDefault = predictOffspringPrsRange(parentZ, parentZ); // h²=0.5
    const resultHeight = predictOffspringPrsRange(parentZ, parentZ, 0.8); // h²=0.8

    expect(resultHeight.expectedPercentile).toBeGreaterThan(resultDefault.expectedPercentile);

    // Spot-check percentile values
    expect(resultDefault.expectedPercentile).toBeCloseTo(normalCdf(1.0) * 100, 1); // z=1.0
    expect(resultHeight.expectedPercentile).toBeCloseTo(normalCdf(1.6) * 100, 1); // z=1.6
  });
});
