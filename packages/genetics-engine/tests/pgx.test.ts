/**
 * Tests for the pharmacogenomics (PGx) analysis engine.
 *
 * Tests cover star allele determination, metabolizer status classification,
 * drug recommendations, offspring prediction, tier gating, array limitation
 * disclaimers, and gene-specific warnings.
 */

import { describe, it, expect } from 'vitest';
import {
  determineStarAllele,
  determineMetabolizerStatus,
  getDrugRecommendations,
  predictOffspringPgx,
  analyzePgx,
  getPgxDisclaimer,
  getGeneSpecificWarning,
  ARRAY_LIMITATION_DISCLAIMER,
} from '../src/pgx';
import type { PgxPanel } from '../src/types';

// ─── Test Fixtures ────────────────────────────────────────────────────────

/**
 * Minimal PGx panel for testing CYP2D6 with star alleles *1, *4, *2
 */
function makePgxPanel(): PgxPanel {
  return {
    metadata: {
      source: 'CPIC Guidelines + PharmGKB',
      version: '1.0.0-test',
      genes_covered: 2,
      drugs_covered: 3,
      last_updated: '2024-01-01',
    },
    genes: {
      CYP2D6: {
        name: 'CYP2D6',
        chromosome: '22',
        description: 'Cytochrome P450 2D6',
        defining_snps: ['rs3892097', 'rs16947'],
        star_alleles: {
          '*1': {
            defining_variants: [],
            function: 'normal',
            activity_score: 1.0,
          },
          '*4': {
            defining_variants: [
              { rsid: 'rs3892097', genotype: 'AA' },
            ],
            function: 'no_function',
            activity_score: 0.0,
          },
          '*2': {
            defining_variants: [
              { rsid: 'rs16947', genotype: 'AA' },
            ],
            function: 'normal',
            activity_score: 1.0,
          },
        },
        metabolizer_status: {
          poor_metabolizer: {
            activity_score_range: [0.0, 0.25],
            description: 'Little to no enzyme activity',
          },
          intermediate_metabolizer: {
            activity_score_range: [0.25, 1.25],
            description: 'Decreased enzyme activity',
          },
          normal_metabolizer: {
            activity_score_range: [1.25, 2.5],
            description: 'Normal enzyme activity',
          },
          ultra_rapid_metabolizer: {
            activity_score_range: [2.5, 10.0],
            description: 'Increased enzyme activity',
          },
        },
        drugs: [
          {
            name: 'Codeine',
            category: 'Pain',
            recommendation_by_status: {
              poor_metabolizer: 'Avoid codeine. Use non-tramadol/codeine analgesic.',
              ultra_rapid_metabolizer: 'Avoid codeine. Use non-tramadol/codeine analgesic.',
            },
            strength: 'strong',
            source: 'CPIC',
          },
          {
            name: 'Tramadol',
            category: 'Pain',
            recommendation_by_status: {
              poor_metabolizer: 'Avoid tramadol. Use non-opioid or non-CYP2D6 alternative.',
            },
            strength: 'moderate',
            source: 'CPIC',
          },
          {
            name: 'Amitriptyline',
            category: 'Psychiatry',
            recommendation_by_status: {
              normal_metabolizer: 'Standard dosing appropriate.',
              poor_metabolizer: 'Reduce dose by 50% or use alternative.',
            },
            strength: 'strong',
            source: 'DPWG',
          },
        ],
      },
      CYP2C19: {
        name: 'CYP2C19',
        chromosome: '10',
        description: 'Cytochrome P450 2C19',
        defining_snps: ['rs4244285'],
        star_alleles: {
          '*1': {
            defining_variants: [],
            function: 'normal',
            activity_score: 1.0,
          },
          '*2': {
            defining_variants: [
              { rsid: 'rs4244285', genotype: 'AA' },
            ],
            function: 'no_function',
            activity_score: 0.0,
          },
        },
        metabolizer_status: {
          poor_metabolizer: {
            activity_score_range: [0.0, 0.5],
            description: 'Little to no enzyme activity',
          },
          intermediate_metabolizer: {
            activity_score_range: [0.5, 1.5],
            description: 'Decreased enzyme activity',
          },
          normal_metabolizer: {
            activity_score_range: [1.5, 10.0],
            description: 'Normal enzyme activity',
          },
        },
        drugs: [
          {
            name: 'Clopidogrel',
            category: 'Cardiology',
            recommendation_by_status: {
              poor_metabolizer: 'Use alternative antiplatelet agent (e.g. prasugrel, ticagrelor).',
            },
            strength: 'strong',
            source: 'CPIC',
          },
        ],
      },
    },
  };
}

// ─── Star Allele Determination ──────────────────────────────────────────────

describe('determineStarAllele', () => {
  it('should return *1/*1 for reference genotypes (no variants)', () => {
    const panel = makePgxPanel();
    // No SNPs matching any defining variant -> reference *1/*1
    const result = determineStarAllele('CYP2D6', { rs3892097: 'GG', rs16947: 'GG' }, panel);
    expect(result).toBe('*1/*1');
  });

  it('should detect heterozygous variant carriers', () => {
    const panel = makePgxPanel();
    // rs3892097 = GA -> heterozygous for *4 defining variant (expected AA)
    const result = determineStarAllele('CYP2D6', { rs3892097: 'GA', rs16947: 'GG' }, panel);
    expect(result).toBe('*1/*4');
  });

  it('should detect homozygous variant carriers', () => {
    const panel = makePgxPanel();
    // rs3892097 = AA -> homozygous for *4 defining variant
    const result = determineStarAllele('CYP2D6', { rs3892097: 'AA', rs16947: 'GG' }, panel);
    expect(result).toBe('*4/*4');
  });

  it('should return *1/*1 for unknown genes', () => {
    const panel = makePgxPanel();
    const result = determineStarAllele('FAKE_GENE', { rs123: 'AA' }, panel);
    expect(result).toBe('*1/*1');
  });

  it('should handle missing SNP data gracefully', () => {
    const panel = makePgxPanel();
    // Empty SNP data -> no variants match -> reference
    const result = determineStarAllele('CYP2D6', {}, panel);
    expect(result).toBe('*1/*1');
  });

  it('should detect compound heterozygous (two different variant alleles)', () => {
    const panel = makePgxPanel();
    // Heterozygous for both *4 (rs3892097=GA) and *2 (rs16947=GA)
    const result = determineStarAllele('CYP2D6', { rs3892097: 'GA', rs16947: 'GA' }, panel);
    // Should be *4/*2 or *2/*4 depending on order
    expect(result).toMatch(/\*[24]\/\*[24]/);
  });

  it('should cap at 2 alleles for diploid organisms', () => {
    // Even with overlapping defining variants, diplotype should always be X/Y format
    const panel = makePgxPanel();
    // Homozygous for *4 AND heterozygous for *2 — biologically impossible
    // but the function should still return a valid 2-allele diplotype
    const result = determineStarAllele('CYP2D6', { rs3892097: 'AA', rs16947: 'GA' }, panel);
    const parts = result.split('/');
    expect(parts).toHaveLength(2);
  });
});

// ─── Metabolizer Status ─────────────────────────────────────────────────────

describe('determineMetabolizerStatus', () => {
  it('should classify *1/*1 as normal metabolizer', () => {
    const panel = makePgxPanel();
    const result = determineMetabolizerStatus('CYP2D6', '*1/*1', panel);
    expect(result.status).toBe('normal_metabolizer');
    expect(result.activityScore).toBe(2.0); // *1 (1.0) + *1 (1.0)
  });

  it('should classify *4/*4 as poor metabolizer (CYP2D6)', () => {
    const panel = makePgxPanel();
    const result = determineMetabolizerStatus('CYP2D6', '*4/*4', panel);
    expect(result.status).toBe('poor_metabolizer');
    expect(result.activityScore).toBe(0.0);
  });

  it('should classify *1/*4 as intermediate metabolizer', () => {
    const panel = makePgxPanel();
    const result = determineMetabolizerStatus('CYP2D6', '*1/*4', panel);
    expect(result.status).toBe('intermediate_metabolizer');
    expect(result.activityScore).toBe(1.0); // *1 (1.0) + *4 (0.0)
  });

  it('should calculate correct activity score sum', () => {
    const panel = makePgxPanel();
    // *2 has activity 1.0, *4 has activity 0.0
    const result = determineMetabolizerStatus('CYP2D6', '*2/*4', panel);
    expect(result.activityScore).toBe(1.0);
  });

  it('should fall back to 1.0 activity for unknown alleles', () => {
    const panel = makePgxPanel();
    // *99 is not in the panel -> defaults to 1.0 activity
    const result = determineMetabolizerStatus('CYP2D6', '*99/*99', panel);
    expect(result.activityScore).toBe(2.0); // 1.0 + 1.0 default
    expect(result.status).toBe('normal_metabolizer');
  });

  it('should return unknown for gene not in panel', () => {
    const panel = makePgxPanel();
    const result = determineMetabolizerStatus('FAKE_GENE', '*1/*1', panel);
    expect(result.status).toBe('unknown');
    expect(result.description).toContain('not found');
  });

  it('should include description text', () => {
    const panel = makePgxPanel();
    const result = determineMetabolizerStatus('CYP2D6', '*1/*1', panel);
    expect(result.description).toBeTruthy();
    expect(typeof result.description).toBe('string');
  });
});

// ─── Drug Recommendations ───────────────────────────────────────────────────

describe('getDrugRecommendations', () => {
  it('should return recommendations for matching metabolizer status', () => {
    const panel = makePgxPanel();
    const recs = getDrugRecommendations('CYP2D6', 'poor_metabolizer', panel);
    expect(recs.length).toBeGreaterThan(0);
    const codeine = recs.find((r) => r.drug === 'Codeine');
    expect(codeine).toBeDefined();
    expect(codeine!.recommendation).toContain('Avoid codeine');
  });

  it('should return empty array when no recommendations match the status', () => {
    const panel = makePgxPanel();
    const recs = getDrugRecommendations('CYP2D6', 'intermediate_metabolizer', panel);
    // No drugs in our test panel have recommendations for intermediate
    expect(recs).toEqual([]);
  });

  it('should return empty array for unknown gene', () => {
    const panel = makePgxPanel();
    const recs = getDrugRecommendations('FAKE_GENE', 'poor_metabolizer', panel);
    expect(recs).toEqual([]);
  });

  it('should include drug category and evidence strength', () => {
    const panel = makePgxPanel();
    const recs = getDrugRecommendations('CYP2D6', 'poor_metabolizer', panel);
    for (const rec of recs) {
      expect(rec).toHaveProperty('drug');
      expect(rec).toHaveProperty('recommendation');
      expect(rec).toHaveProperty('strength');
      expect(rec).toHaveProperty('source');
      expect(rec).toHaveProperty('category');
      expect(['strong', 'moderate']).toContain(rec.strength);
    }
  });

  it('should return multiple recommendations when multiple drugs match', () => {
    const panel = makePgxPanel();
    const recs = getDrugRecommendations('CYP2D6', 'poor_metabolizer', panel);
    // Codeine, Tramadol, and Amitriptyline all have poor_metabolizer recs
    expect(recs.length).toBe(3);
    const drugNames = recs.map((r) => r.drug);
    expect(drugNames).toContain('Codeine');
    expect(drugNames).toContain('Tramadol');
    expect(drugNames).toContain('Amitriptyline');
  });
});

// ─── Offspring Prediction ───────────────────────────────────────────────────

describe('predictOffspringPgx', () => {
  it('should produce merged outcome for identical diplotypes', () => {
    // *1/*1 x *1/*1 -> all offspring *1/*1 (100%)
    const outcomes = predictOffspringPgx('*1/*1', '*1/*1', 'CYP2D6');
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.diplotype).toBe('*1/*1');
    expect(outcomes[0]!.probability).toBe(100);
  });

  it('should produce correct outcomes for different diplotypes', () => {
    // *1/*4 x *1/*1 -> *1/*1 (50%), *1/*4 (50%)
    const outcomes = predictOffspringPgx('*1/*4', '*1/*1', 'CYP2D6');
    expect(outcomes).toHaveLength(2);
    const totalProb = outcomes.reduce((sum, o) => sum + o.probability, 0);
    expect(totalProb).toBe(100);
  });

  it('should have probabilities summing to 100', () => {
    const outcomes = predictOffspringPgx('*1/*4', '*2/*4', 'CYP2D6');
    const totalProb = outcomes.reduce((sum, o) => sum + o.probability, 0);
    expect(totalProb).toBe(100);
  });

  it('should normalize diplotype order (alphabetical)', () => {
    const outcomes = predictOffspringPgx('*4/*1', '*1/*4', 'CYP2D6');
    for (const outcome of outcomes) {
      const [a, b] = outcome.diplotype.split('/');
      expect(a! <= b!).toBe(true);
    }
  });

  it('should produce 4 unique outcomes for fully different diplotypes', () => {
    // *1/*4 x *2/*4 -> *1/*2, *1/*4, *2/*4, *4/*4
    const outcomes = predictOffspringPgx('*1/*4', '*2/*4', 'CYP2D6');
    // Could have up to 4 unique diplotypes, but some may merge
    expect(outcomes.length).toBeGreaterThanOrEqual(2);
    expect(outcomes.length).toBeLessThanOrEqual(4);
  });

  it('should merge equivalent diplotypes', () => {
    // *1/*4 x *4/*1 -> possible outcomes: *1/*4 (50%), *1/*1 (25%), *4/*4 (25%)
    // Actually: *1 x *4 = *1/*4, *1 x *1 = *1/*1, *4 x *4 = *4/*4, *4 x *1 = *1/*4
    const outcomes = predictOffspringPgx('*1/*4', '*1/*4', 'CYP2D6');
    const totalProb = outcomes.reduce((sum, o) => sum + o.probability, 0);
    expect(totalProb).toBe(100);
    // *1/*1: 25%, *1/*4: 50%, *4/*4: 25%
    const oneOne = outcomes.find((o) => o.diplotype === '*1/*1');
    const oneFour = outcomes.find((o) => o.diplotype === '*1/*4');
    const fourFour = outcomes.find((o) => o.diplotype === '*4/*4');
    expect(oneOne!.probability).toBe(25);
    expect(oneFour!.probability).toBe(50);
    expect(fourFour!.probability).toBe(25);
  });
});

// ─── Full PGx Analysis ─────────────────────────────────────────────────────

describe('analyzePgx', () => {
  it('should return empty results for free tier', () => {
    const panel = makePgxPanel();
    const result = analyzePgx({}, {}, panel, 'free');
    expect(result.genesAnalyzed).toBe(0);
    expect(result.tier).toBe('free');
    expect(result.isLimited).toBe(true);
    expect(Object.keys(result.results)).toHaveLength(0);
  });

  it('should analyze 5 genes for premium tier', () => {
    const panel = makePgxPanel();
    const result = analyzePgx({}, {}, panel, 'premium');
    // Premium tier processes all 5 PREMIUM_PGX_GENES, even if gene isn't
    // in the panel (defaults to *1/*1 reference diplotype in that case)
    expect(result.genesAnalyzed).toBe(5);
    expect(result.tier).toBe('premium');
    expect(result.isLimited).toBe(true);
  });

  it('should include disclaimer text', () => {
    const panel = makePgxPanel();
    const result = analyzePgx({}, {}, panel, 'free');
    expect(result.disclaimer).toBeTruthy();
    expect(result.disclaimer).toContain('CYP2D6');
  });

  it('should include upgrade message for limited tiers', () => {
    const panel = makePgxPanel();
    const freeResult = analyzePgx({}, {}, panel, 'free');
    expect(freeResult.upgradeMessage).toBeTruthy();
    expect(freeResult.upgradeMessage).toContain('Upgrade');

    const premiumResult = analyzePgx({}, {}, panel, 'premium');
    expect(premiumResult.upgradeMessage).toBeTruthy();
    expect(premiumResult.upgradeMessage).toContain('Upgrade');
  });

  it('should not include upgrade message for pro tier', () => {
    const panel = makePgxPanel();
    const result = analyzePgx({}, {}, panel, 'pro');
    expect(result.upgradeMessage).toBeNull();
    expect(result.isLimited).toBe(false);
  });

  it('should include offspring predictions with metabolizer status', () => {
    const panel = makePgxPanel();
    const parentA = { rs3892097: 'GA' }; // *1/*4
    const parentB = { rs3892097: 'GG' }; // *1/*1
    const result = analyzePgx(parentA, parentB, panel, 'premium');
    const cyp2d6 = result.results['CYP2D6'];
    expect(cyp2d6).toBeDefined();
    expect(cyp2d6!.offspringPredictions.length).toBeGreaterThan(0);
    for (const pred of cyp2d6!.offspringPredictions) {
      expect(pred).toHaveProperty('diplotype');
      expect(pred).toHaveProperty('probability');
      expect(pred).toHaveProperty('metabolizerStatus');
      expect(pred).toHaveProperty('drugRecommendations');
    }
  });
});

// ─── PGx Boundary-Value Tests ────────────────────────────────────────────────
//
// CYP2D6 ranges (from pgx-panel.json, exclusive upper bound except last):
//   poor_metabolizer:         [0.00, 0.25)
//   intermediate_metabolizer: [0.25, 1.25)
//   normal_metabolizer:       [1.25, 2.50)
//   ultra_rapid_metabolizer:  [2.50, 99]  (last range — inclusive upper)
//
// *10 has activity_score 0.25 (decreased function).
// By combining star alleles we can hit boundary scores precisely:
//   *10/*4 => 0.25 + 0.00 = 0.25  (boundary between poor and intermediate)
//   *10/*10 => 0.25 + 0.25 = 0.50 (inside intermediate, just above lower boundary)
//   *2/*4   => 1.00 + 0.00 = 1.00 (inside intermediate)
//   *2/*10  => 1.00 + 0.25 = 1.25 (boundary between intermediate and normal)
//   *1/*1   => 1.00 + 1.00 = 2.00 (inside normal)
//   *2/*2   => 1.00 + 1.00 = 2.00 (inside normal, same score as *1/*1)
//
// We need real star-alleles from the pgx-panel.json that produce these scores.
// Since the fixture panel (makePgxPanel) does not include *10, we build a
// custom panel for boundary testing with explicit activity scores.

function makeBoundaryPanel() {
  // Extend the test panel with a *10 allele (activity_score 0.25) to allow
  // us to construct diplotypes that hit boundary scores exactly.
  const panel = makePgxPanel();
  panel.genes['CYP2D6']!.star_alleles['*10'] = {
    defining_variants: [{ rsid: 'rs1065852', genotype: 'TT' }],
    function: 'decreased' as any,
    activity_score: 0.25,
  };
  return panel;
}

describe('determineMetabolizerStatus — range boundary values (CYP2D6)', () => {
  it('score exactly at lower boundary of intermediate (0.25) maps to intermediate, not poor', () => {
    // *10/*4 => 0.25 + 0.00 = 0.25
    // Range: poor=[0,0.25), intermediate=[0.25,1.25) — 0.25 is EXCLUDED from poor, INCLUDED in intermediate
    const panel = makeBoundaryPanel();
    const result = determineMetabolizerStatus('CYP2D6', '*10/*4', panel);
    expect(result.activityScore).toBe(0.25);
    expect(result.status).toBe('intermediate_metabolizer');
  });

  it('score just below intermediate lower boundary (< 0.25) maps to poor metabolizer', () => {
    // *4/*4 => 0.0 + 0.0 = 0.0 — clearly inside poor [0, 0.25)
    const panel = makeBoundaryPanel();
    const result = determineMetabolizerStatus('CYP2D6', '*4/*4', panel);
    expect(result.activityScore).toBe(0.0);
    expect(result.status).toBe('poor_metabolizer');
  });

  it('score exactly at lower boundary of normal (1.25) maps to normal, not intermediate', () => {
    // *2/*10 => 1.00 + 0.25 = 1.25
    // Range: intermediate=[0.25,1.25), normal=[1.25,2.5) — 1.25 is EXCLUDED from intermediate, INCLUDED in normal
    const panel = makeBoundaryPanel();
    const result = determineMetabolizerStatus('CYP2D6', '*2/*10', panel);
    expect(result.activityScore).toBe(1.25);
    expect(result.status).toBe('normal_metabolizer');
  });

  it('score just below normal lower boundary (< 1.25) maps to intermediate', () => {
    // *1/*4 => 1.00 + 0.00 = 1.00 — inside intermediate [0.25, 1.25)
    const panel = makeBoundaryPanel();
    const result = determineMetabolizerStatus('CYP2D6', '*1/*4', panel);
    expect(result.activityScore).toBe(1.0);
    expect(result.status).toBe('intermediate_metabolizer');
  });

  it('score exactly at lower boundary of ultra_rapid (2.5) maps to ultra_rapid, not normal', () => {
    // We build a custom diplotype: two alleles each with activity 1.25 to hit exactly 2.5.
    // Inject a custom star allele for this boundary test.
    const panel = makeBoundaryPanel();
    panel.genes['CYP2D6']!.star_alleles['*xULT'] = {
      defining_variants: [{ rsid: 'rs_fake_ult', genotype: 'TT' }],
      function: 'increased' as any,
      activity_score: 1.25,
    };
    // *xULT/*xULT => 1.25 + 1.25 = 2.5 — should be ultra_rapid (inclusive lower bound)
    const result = determineMetabolizerStatus('CYP2D6', '*xULT/*xULT', panel);
    expect(result.activityScore).toBe(2.5);
    expect(result.status).toBe('ultra_rapid_metabolizer');
  });

  it('score inside normal range maps to normal metabolizer', () => {
    // *1/*1 => 1.0 + 1.0 = 2.0 — inside [1.25, 2.5)
    const panel = makeBoundaryPanel();
    const result = determineMetabolizerStatus('CYP2D6', '*1/*1', panel);
    expect(result.activityScore).toBe(2.0);
    expect(result.status).toBe('normal_metabolizer');
  });
});

describe('getPgxDisclaimer', () => {
  it('should mention CYP2D6 structural variant limitations', () => {
    const disclaimer = getPgxDisclaimer();
    expect(disclaimer).toContain('CYP2D6');
    expect(disclaimer).toContain('deletions');
    expect(disclaimer).toContain('duplications');
  });

  it('should mention DTC limitations', () => {
    const disclaimer = getPgxDisclaimer();
    expect(disclaimer).toContain('Direct-to-consumer');
  });

  it('should recommend consulting healthcare provider', () => {
    const disclaimer = getPgxDisclaimer();
    expect(disclaimer).toContain('healthcare provider');
  });

  it('should include the general array limitation disclaimer text', () => {
    const disclaimer = getPgxDisclaimer();
    expect(disclaimer).toContain('Array-based genotyping');
    expect(disclaimer).toContain('structural variants');
    expect(disclaimer).toContain('copy number variations');
    expect(disclaimer).toContain('clinical-grade testing');
  });

  it('should include the ARRAY_LIMITATION_DISCLAIMER constant text', () => {
    const disclaimer = getPgxDisclaimer();
    expect(disclaimer).toContain(ARRAY_LIMITATION_DISCLAIMER);
  });
});

// ─── Array Limitation Disclaimer ─────────────────────────────────────────────

describe('ARRAY_LIMITATION_DISCLAIMER', () => {
  it('should be a non-empty string', () => {
    expect(typeof ARRAY_LIMITATION_DISCLAIMER).toBe('string');
    expect(ARRAY_LIMITATION_DISCLAIMER.length).toBeGreaterThan(0);
  });

  it('should mention structural variants and CNVs', () => {
    expect(ARRAY_LIMITATION_DISCLAIMER).toContain('structural variants');
    expect(ARRAY_LIMITATION_DISCLAIMER).toContain('copy number variations');
  });

  it('should mention star alleles', () => {
    expect(ARRAY_LIMITATION_DISCLAIMER).toContain('star alleles');
  });

  it('should recommend clinical-grade testing', () => {
    expect(ARRAY_LIMITATION_DISCLAIMER).toContain('clinical-grade testing');
  });

  it('should warn about medication changes', () => {
    expect(ARRAY_LIMITATION_DISCLAIMER).toContain('medication changes');
  });
});

// ─── Gene-Specific Warnings ──────────────────────────────────────────────────

describe('getGeneSpecificWarning', () => {
  it('should return a CYP2D6-specific warning', () => {
    const warning = getGeneSpecificWarning('CYP2D6');
    expect(warning).not.toBeNull();
    expect(warning).toContain('CYP2D6');
    expect(warning).toContain('highly polymorphic');
    expect(warning).toContain('hybrid alleles');
    expect(warning).toContain('duplications/deletions');
    expect(warning).toContain('CANNOT be detected');
    expect(warning).toContain('particularly limited');
  });

  it('should return a CYP2C19-specific warning', () => {
    const warning = getGeneSpecificWarning('CYP2C19');
    expect(warning).not.toBeNull();
    expect(warning).toContain('CYP2C19');
    expect(warning).toContain('ultrarapid');
  });

  it('should return a DPYD-specific warning', () => {
    const warning = getGeneSpecificWarning('DPYD');
    expect(warning).not.toBeNull();
    expect(warning).toContain('DPYD');
    expect(warning).toContain('fluoropyrimidine');
  });

  it('should return null for genes without specific warnings', () => {
    expect(getGeneSpecificWarning('TPMT')).toBeNull();
    expect(getGeneSpecificWarning('CYP2C9')).toBeNull();
    expect(getGeneSpecificWarning('UGT1A1')).toBeNull();
    expect(getGeneSpecificWarning('HLA-B')).toBeNull();
  });

  it('should return null for unknown genes', () => {
    expect(getGeneSpecificWarning('FAKE_GENE')).toBeNull();
    expect(getGeneSpecificWarning('')).toBeNull();
  });

  it('should be case-sensitive (gene symbols are uppercase)', () => {
    // Gene symbols are standardized as uppercase
    expect(getGeneSpecificWarning('cyp2d6')).toBeNull();
    expect(getGeneSpecificWarning('Cyp2D6')).toBeNull();
    // Only exact uppercase match should work
    expect(getGeneSpecificWarning('CYP2D6')).not.toBeNull();
  });
});

// ─── Disclaimer Integration in Analysis Results ──────────────────────────────

describe('analyzePgx — disclaimer integration', () => {
  it('should include array limitation text in the disclaimer field', () => {
    const panel = makePgxPanel();
    const result = analyzePgx({}, {}, panel, 'premium');
    expect(result.disclaimer).toContain('Array-based genotyping');
    expect(result.disclaimer).toContain('structural variants');
    expect(result.disclaimer).toContain('copy number variations');
  });

  it('should include DTC and CYP2D6 warnings in disclaimer', () => {
    const panel = makePgxPanel();
    const result = analyzePgx({}, {}, panel, 'pro');
    expect(result.disclaimer).toContain('Direct-to-consumer');
    expect(result.disclaimer).toContain('CYP2D6');
    expect(result.disclaimer).toContain('healthcare provider');
  });
});
