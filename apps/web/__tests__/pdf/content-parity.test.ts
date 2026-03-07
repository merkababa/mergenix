/**
 * PDF Content Parity Verification — Q10 (Stream Q Sprint 3)
 *
 * Verifies that the generated PDF document definition contains the same data
 * as the JSON analysis result it was built from.
 *
 * This tests the PDF *template* (buildPdfDocument), not the PDF *rendering*
 * (that is pdfmake's responsibility). The approach:
 *
 *  1. Create a mock FullAnalysisResult with known, deterministic data values
 *  2. Call buildPdfDocument() to produce a TDocumentDefinitions object
 *  3. Serialize the document definition to JSON string
 *  4. Assert that every key data point from the JSON result appears in the PDF
 *
 * Coverage:
 *  - Carrier conditions: condition names, gene names, risk levels, parent statuses,
 *    offspring risk percentages
 *  - Trait predictions: trait names, gene names, confidence, phenotype:percentage pairs
 *  - Summary statistics: SNP counts, engine version, genome build, tier, timestamps
 *  - PGx results: gene names, diplotypes, metabolizer statuses, drug names
 *  - PRS results: condition names, parent percentiles, risk categories, offspring percentile
 *  - Counseling: urgency, summary text, reasons, NSGC URL, key findings, specialties
 *  - Edge cases: empty sections, missing optional fields
 */

import { describe, it, expect } from 'vitest';
import { buildPdfDocument } from '../../lib/pdf/pdf-document-builder';
import type { FullAnalysisResult } from '@mergenix/shared-types';

// ─── Deterministic Mock Analysis Result ──────────────────────────────────────
//
// All values are chosen to be highly specific and easily searchable in the
// serialized PDF document definition. Avoid generic strings like "test" that
// might appear incidentally.

const MOCK_RESULT: FullAnalysisResult = {
  carrier: [
    {
      condition: 'Cystic Fibrosis',
      gene: 'CFTR',
      severity: 'high',
      description: 'Autosomal recessive lung and digestive disorder.',
      parentAStatus: 'carrier',
      parentBStatus: 'carrier',
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: 'high_risk',
      rsid: 'rs75030207',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Spinal Muscular Atrophy',
      gene: 'SMN1',
      severity: 'moderate',
      description: 'Motor neuron disorder causing muscle weakness.',
      parentAStatus: 'carrier',
      parentBStatus: 'normal',
      offspringRisk: { affected: 0, carrier: 50, normal: 50 },
      riskLevel: 'carrier_detected',
      rsid: 'rs9916169',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Tay-Sachs Disease',
      gene: 'HEXA',
      severity: 'high',
      description: 'Progressive neurological disorder.',
      parentAStatus: 'normal',
      parentBStatus: 'normal',
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: 'low_risk',
      rsid: 'rs80338903',
      inheritance: 'autosomal_recessive',
    },
  ],
  traits: [
    {
      trait: 'Eye Color',
      gene: 'HERC2',
      rsid: 'rs12913832',
      chromosome: '15',
      description: 'Iris pigmentation prediction based on rs12913832.',
      confidence: 'high',
      inheritance: 'dominant',
      status: 'success',
      parentAGenotype: 'AG',
      parentBGenotype: 'GG',
      offspringProbabilities: { 'Brown Eyes': 75, 'Blue Eyes': 25 },
    },
    {
      trait: 'Lactase Persistence',
      gene: 'LCT',
      rsid: 'rs4988235',
      chromosome: '2',
      description: 'Ability to digest lactose into adulthood.',
      confidence: 'medium',
      inheritance: 'dominant',
      status: 'success',
      parentAGenotype: 'CT',
      parentBGenotype: 'TT',
      offspringProbabilities: { Persistent: 50, 'Non-persistent': 50 },
    },
  ],
  pgx: {
    genesAnalyzed: 3,
    tier: 'pro',
    isLimited: false,
    results: {
      CYP2D6: {
        gene: 'CYP2D6',
        description: 'Cytochrome P450 2D6 — metabolizes codeine, tramadol.',
        chromosome: '22',
        parentA: {
          diplotype: '*1/*4',
          metabolizerStatus: {
            status: 'intermediate_metabolizer',
            activityScore: 1.0,
            description: 'Reduced metabolic activity.',
          },
          drugRecommendations: [
            {
              drug: 'Codeine',
              recommendation: 'Consider alternative opioids.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Pain',
            },
            {
              drug: 'Tramadol',
              recommendation: 'Monitor for reduced efficacy.',
              strength: 'moderate',
              source: 'CPIC',
              category: 'Pain',
            },
            {
              drug: 'Nortriptyline',
              recommendation: 'Reduce starting dose.',
              strength: 'moderate',
              source: 'CPIC',
              category: 'Antidepressant',
            },
          ],
        },
        parentB: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal metabolic activity.',
          },
          drugRecommendations: [
            {
              drug: 'Codeine',
              recommendation: 'Standard dosing applies.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Pain',
            },
          ],
        },
        offspringPredictions: [],
      },
      DPYD: {
        gene: 'DPYD',
        description: 'Dihydropyrimidine dehydrogenase — metabolizes fluorouracil.',
        chromosome: '1',
        parentA: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal activity.',
          },
          drugRecommendations: [
            {
              drug: 'Fluorouracil',
              recommendation: 'Standard dosing.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Oncology',
            },
          ],
        },
        parentB: {
          diplotype: '*1/*2A',
          metabolizerStatus: {
            status: 'poor_metabolizer',
            activityScore: 0.0,
            description: 'Severely reduced activity — fluorouracil toxicity risk.',
          },
          drugRecommendations: [
            {
              drug: 'Fluorouracil',
              recommendation: 'Avoid or reduce dose by 50%.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Oncology',
            },
          ],
        },
        offspringPredictions: [],
      },
      TPMT: {
        gene: 'TPMT',
        description: 'Thiopurine methyltransferase — metabolizes thiopurines.',
        chromosome: '6',
        parentA: {
          diplotype: '*1/*3A',
          metabolizerStatus: {
            status: 'intermediate_metabolizer',
            activityScore: 1.0,
            description: 'Reduced activity.',
          },
          drugRecommendations: [
            {
              drug: 'Azathioprine',
              recommendation: 'Start at 30-70% of standard dose.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Immunosuppressant',
            },
          ],
        },
        parentB: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal activity.',
          },
          drugRecommendations: [
            {
              drug: 'Azathioprine',
              recommendation: 'Standard dosing.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Immunosuppressant',
            },
          ],
        },
        offspringPredictions: [],
      },
    },
    upgradeMessage: null,
    disclaimer:
      'PGx results are for informational purposes only and not a substitute for clinical testing.',
  },
  prs: {
    conditions: {
      coronary_artery_disease: {
        name: 'Coronary Artery Disease',
        parentA: {
          rawScore: 0.87,
          zScore: 0.44,
          percentile: 67,
          riskCategory: 'above_average',
          snpsFound: 290,
          snpsTotal: 310,
          coveragePct: 93.5,
        },
        parentB: {
          rawScore: 0.21,
          zScore: -0.38,
          percentile: 35,
          riskCategory: 'below_average',
          snpsFound: 298,
          snpsTotal: 310,
          coveragePct: 96.1,
        },
        offspring: {
          expectedPercentile: 52,
          rangeLow: 34,
          rangeHigh: 69,
          confidence: 'Moderate confidence based on parental scores.',
        },
        ancestryNote: 'PRS calibrated primarily on European-ancestry GWAS populations.',
        reference: 'Khera AV et al. 2018. Nature Genetics.',
      },
      breast_cancer: {
        name: 'Breast Cancer',
        parentA: {
          rawScore: 0.42,
          zScore: 0.09,
          percentile: 54,
          riskCategory: 'average',
          snpsFound: 300,
          snpsTotal: 313,
          coveragePct: 95.8,
        },
        parentB: {
          rawScore: 1.15,
          zScore: 0.78,
          percentile: 78,
          riskCategory: 'above_average',
          snpsFound: 307,
          snpsTotal: 313,
          coveragePct: 98.1,
        },
        offspring: {
          expectedPercentile: 66,
          rangeLow: 47,
          rangeHigh: 80,
          confidence: 'Moderate confidence.',
        },
        ancestryNote: 'BRCA1/BRCA2 pathogenic variants require clinical testing.',
        reference: 'Mavaddat N et al. 2019. Am J Hum Genet.',
      },
    },
    metadata: {
      source: 'PGS Catalog',
      version: '3.2.0',
      conditionsCovered: 2,
      lastUpdated: '2025-06-15',
      disclaimer: 'PRS results should be interpreted in the context of family history.',
    },
    tier: 'pro',
    conditionsAvailable: 2,
    conditionsTotal: 7,
    disclaimer: 'Polygenic risk scores are statistical estimates, not diagnoses.',
    isLimited: false,
    upgradeMessage: null,
  },
  counseling: {
    recommend: true,
    urgency: 'high',
    reasons: [
      'Both parents are carriers of Cystic Fibrosis (CFTR).',
      'Parent B has poor DPYD metabolizer status — fluorouracil toxicity risk.',
    ],
    nsgcUrl: 'https://www.nsgc.org/find-a-genetic-counselor',
    summaryText: 'Genetic counseling is strongly recommended prior to conception.',
    keyFindings: [
      {
        condition: 'Cystic Fibrosis',
        gene: 'CFTR',
        riskLevel: 'high_risk',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        inheritance: 'autosomal_recessive',
      },
    ],
    recommendedSpecialties: ['prenatal', 'carrier_screening'],
    referralLetter: null,
    upgradeMessage: null,
  },
  metadata: {
    parent1Format: '23andme',
    parent2Format: 'ancestrydna',
    parent1SnpCount: 638_000,
    parent2SnpCount: 712_000,
    analysisTimestamp: '2026-02-20T09:30:00Z',
    engineVersion: '3.2.1',
    tier: 'pro',
  },
  coupleMode: true,
  coverageMetrics: {
    totalDiseases: 3,
    diseasesWithCoverage: 3,
    perDisease: {},
  },
  chipVersion: null,
  genomeBuild: 'GRCh38',
};

// ─── Helper: Serialize PDF Content to String ─────────────────────────────────

function serializePdfContent(result: FullAnalysisResult): string {
  const doc = buildPdfDocument(result);
  return JSON.stringify(doc.content);
}

// ─── 1. Carrier Conditions Parity ────────────────────────────────────────────

describe('PDF Content Parity — Carrier Conditions', () => {
  it('all carrier condition names appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    expect(pdf).toContain('Cystic Fibrosis');
    expect(pdf).toContain('Spinal Muscular Atrophy');
    expect(pdf).toContain('Tay-Sachs Disease');
  });

  it('all carrier gene names appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    expect(pdf).toContain('CFTR');
    expect(pdf).toContain('SMN1');
    expect(pdf).toContain('HEXA');
  });

  it('carrier risk level labels appear correctly translated in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    // RISK_LABELS maps: high_risk → 'High Risk', carrier_detected → 'Carrier Detected',
    // low_risk → 'Low Risk'
    expect(pdf).toContain('High Risk');
    expect(pdf).toContain('Carrier Detected');
    expect(pdf).toContain('Low Risk');
  });

  it('parent carrier statuses appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    // capitalize() applied to statuses: 'carrier' → 'Carrier', 'normal' → 'Normal'
    expect(pdf).toContain('Carrier');
    expect(pdf).toContain('Normal');
  });

  it('offspring risk percentage (25%) appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    // Cystic Fibrosis: offspringRisk.affected = 25 → rendered as '25%'
    expect(pdf).toContain('25%');
  });

  it('carrier section header appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('Carrier Screening Results');
  });

  it('carrier count text matches JSON carrier array length', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    const expectedCount = MOCK_RESULT.carrier.length; // 3
    expect(pdf).toContain(`${expectedCount} conditions analyzed`);
  });
});

// ─── 2. Trait Predictions Parity ─────────────────────────────────────────────

describe('PDF Content Parity — Trait Predictions', () => {
  it('all trait names appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    expect(pdf).toContain('Eye Color');
    expect(pdf).toContain('Lactase Persistence');
  });

  it('all trait gene names appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    expect(pdf).toContain('HERC2');
    expect(pdf).toContain('LCT');
  });

  it('trait confidence levels appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    // capitalize(): 'high' → 'High', 'medium' → 'Medium'
    expect(pdf).toContain('High');
    expect(pdf).toContain('Medium');
  });

  it('trait offspring probabilities appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    // Eye Color: { 'Brown Eyes': 75, 'Blue Eyes': 25 }
    // Rendered as "Brown Eyes: 75%, Blue Eyes: 25%"
    expect(pdf).toContain('Brown Eyes');
    expect(pdf).toContain('Blue Eyes');
    // Lactase Persistence: { 'Persistent': 50, 'Non-persistent': 50 }
    expect(pdf).toContain('Persistent');
  });

  it('trait section header appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('Trait Predictions');
  });
});

// ─── 3. Summary Statistics (Metadata) Parity ─────────────────────────────────

describe('PDF Content Parity — Summary Statistics', () => {
  it('parent 1 file format appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('23andme');
  });

  it('parent 2 file format appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('ancestrydna');
  });

  it('parent 1 SNP count (638,000) appears formatted in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    // toLocaleString() produces "638,000" in US locale
    const formatted = MOCK_RESULT.metadata.parent1SnpCount.toLocaleString();
    expect(pdf).toContain(formatted);
  });

  it('parent 2 SNP count (712,000) appears formatted in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    const formatted = MOCK_RESULT.metadata.parent2SnpCount.toLocaleString();
    expect(pdf).toContain(formatted);
  });

  it('engine version appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('3.2.1');
  });

  it('genome build appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('GRCh38');
  });

  it('analysis tier appears capitalized in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    // capitalize('pro') → 'Pro'
    expect(pdf).toContain('Pro');
  });

  it('analysis timestamp year (2026) appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('2026');
  });

  it('analysis timestamp month (February) appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    // '2026-02-20T09:30:00Z' → 'February 20, 2026, ...'
    expect(pdf).toContain('February');
  });

  it('metadata section header appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('Report Details');
  });
});

// ─── 4. PGx Results Parity ────────────────────────────────────────────────────

describe('PDF Content Parity — PGx Results', () => {
  it('all PGx gene names appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    expect(pdf).toContain('CYP2D6');
    expect(pdf).toContain('DPYD');
    expect(pdf).toContain('TPMT');
  });

  it('diplotypes for all genes appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    // CYP2D6 parentA: *1/*4, parentB: *1/*1
    expect(pdf).toContain('*1/*4');
    expect(pdf).toContain('*1/*1');
    // DPYD parentB: *1/*2A
    expect(pdf).toContain('*1/*2A');
    // TPMT parentA: *1/*3A
    expect(pdf).toContain('*1/*3A');
  });

  it('metabolizer status labels appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    // capitalize('intermediate_metabolizer') → 'Intermediate_metabolizer'
    // capitalize('normal_metabolizer') → 'Normal_metabolizer'
    // capitalize('poor_metabolizer') → 'Poor_metabolizer'
    expect(pdf).toContain('Intermediate_metabolizer');
    expect(pdf).toContain('Normal_metabolizer');
    expect(pdf).toContain('Poor_metabolizer');
  });

  it('drug names (first 3 from parentA drugRecommendations) appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    // CYP2D6 parentA drugs (first 3): Codeine, Tramadol, Nortriptyline
    expect(pdf).toContain('Codeine');
    expect(pdf).toContain('Tramadol');
    expect(pdf).toContain('Nortriptyline');

    // DPYD parentA drug: Fluorouracil
    expect(pdf).toContain('Fluorouracil');

    // TPMT parentA drug: Azathioprine
    expect(pdf).toContain('Azathioprine');
  });

  it('PGx gene count matches JSON genesAnalyzed', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    const count = MOCK_RESULT.pgx.genesAnalyzed; // 3
    expect(pdf).toContain(`${count} genes analyzed`);
  });

  it('PGx section header appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('Pharmacogenomics (PGx) Results');
  });
});

// ─── 5. PRS Results Parity ────────────────────────────────────────────────────

describe('PDF Content Parity — PRS Results', () => {
  it('all PRS condition names appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    expect(pdf).toContain('Coronary Artery Disease');
    expect(pdf).toContain('Breast Cancer');
  });

  it('parent A percentiles appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    // CAD parentA: percentile 67 → '67%'
    expect(pdf).toContain('67%');
    // Breast Cancer parentA: percentile 54 → '54%'
    expect(pdf).toContain('54%');
  });

  it('parent B percentiles appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    // CAD parentB: percentile 35 → '35%'
    expect(pdf).toContain('35%');
    // Breast Cancer parentB: percentile 78 → '78%'
    expect(pdf).toContain('78%');
  });

  it('offspring expected percentiles appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    // CAD offspring: expectedPercentile 52 → '52%'
    expect(pdf).toContain('52%');
    // Breast Cancer offspring: expectedPercentile 66 → '66%'
    expect(pdf).toContain('66%');
  });

  it('risk category labels appear correctly translated in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    // RISK_CATEGORY_LABELS: above_average → 'Above Average', below_average → 'Below Average'
    expect(pdf).toContain('Above Average');
    expect(pdf).toContain('Below Average');
    // average → 'Average'
    expect(pdf).toContain('Average');
  });

  it('ancestry notes appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);

    expect(pdf).toContain('European-ancestry GWAS');
    expect(pdf).toContain('BRCA1/BRCA2');
  });

  it('PRS condition count matches JSON conditions object size', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    const count = Object.keys(MOCK_RESULT.prs.conditions).length; // 2
    expect(pdf).toContain(`${count} conditions evaluated`);
  });

  it('PRS section header appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('Polygenic Risk Scores (PRS)');
  });
});

// ─── 6. Counseling Section Parity ────────────────────────────────────────────

describe('PDF Content Parity — Genetic Counseling', () => {
  it('counseling urgency appears capitalized in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    // urgency: 'high' → capitalize → 'High' → "Urgency: High"
    expect(pdf).toContain('Urgency: High');
  });

  it('counseling summary text appears verbatim in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('Genetic counseling is strongly recommended prior to conception.');
  });

  it('counseling reasons appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('Both parents are carriers of Cystic Fibrosis (CFTR).');
    expect(pdf).toContain('Parent B has poor DPYD metabolizer status');
  });

  it('NSGC URL appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('https://www.nsgc.org/find-a-genetic-counselor');
  });

  it('key finding condition names appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    // keyFindings[0].condition = 'Cystic Fibrosis'
    expect(pdf).toContain('Key Findings:');
    expect(pdf).toContain('CFTR');
  });

  it('recommended specialties appear in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    // capitalize(): 'prenatal' → 'Prenatal', 'carrier_screening' → 'Carrier_screening'
    expect(pdf).toContain('Recommended Specialties:');
    expect(pdf).toContain('Prenatal');
    expect(pdf).toContain('Carrier_screening');
  });

  it('counseling section header appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('Genetic Counseling Recommendations');
  });
});

// ─── 7. Report Structure Invariants ──────────────────────────────────────────

describe('PDF Content Parity — Document Structure', () => {
  it('buildPdfDocument returns a valid TDocumentDefinitions object', () => {
    const doc = buildPdfDocument(MOCK_RESULT);
    expect(doc).toHaveProperty('content');
    expect(Array.isArray(doc.content)).toBe(true);
    const contentArray = doc.content as unknown[];
    expect(contentArray.length).toBeGreaterThan(0);
  });

  it('document definition has styles object', () => {
    const doc = buildPdfDocument(MOCK_RESULT);
    expect(doc).toHaveProperty('styles');
    expect(typeof doc.styles).toBe('object');
  });

  it('document definition has pageMargins', () => {
    const doc = buildPdfDocument(MOCK_RESULT);
    expect(doc).toHaveProperty('pageMargins');
    expect(Array.isArray(doc.pageMargins)).toBe(true);
  });

  it('document definition has a footer function', () => {
    const doc = buildPdfDocument(MOCK_RESULT);
    expect(typeof doc.footer).toBe('function');
  });

  it('report title "Mergenix Genetic Analysis Report" appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('Mergenix Genetic Analysis Report');
  });

  it('medical disclaimer text appears in PDF', () => {
    const pdf = serializePdfContent(MOCK_RESULT);
    expect(pdf).toContain('Medical Disclaimer');
    expect(pdf).toMatch(/not.*substitute.*medical|informational.*only|consult.*healthcare/i);
  });
});

// ─── 8. Edge Cases — Empty Sections ──────────────────────────────────────────

describe('PDF Content Parity — Empty Sections', () => {
  const emptyResult: FullAnalysisResult = {
    ...MOCK_RESULT,
    carrier: [],
    traits: [],
    pgx: {
      genesAnalyzed: 0,
      tier: 'pro',
      isLimited: false,
      results: {},
      upgradeMessage: null,
      disclaimer: 'PGx disclaimer.',
    },
    prs: {
      ...MOCK_RESULT.prs,
      conditions: {},
    },
    counseling: {
      recommend: false,
      urgency: 'informational',
      reasons: [],
      nsgcUrl: 'https://www.nsgc.org',
      summaryText: null,
      keyFindings: null,
      recommendedSpecialties: null,
      referralLetter: null,
      upgradeMessage: null,
    },
  };

  it('empty carrier results → shows fallback text in PDF', () => {
    const pdf = serializePdfContent(emptyResult);
    expect(pdf).toContain('No carrier results to display.');
  });

  it('empty traits → shows fallback text in PDF', () => {
    const pdf = serializePdfContent(emptyResult);
    expect(pdf).toContain('No trait predictions to display.');
  });

  it('empty PGx results → shows fallback text in PDF', () => {
    const pdf = serializePdfContent(emptyResult);
    expect(pdf).toContain('No pharmacogenomic results to display.');
  });

  it('empty PRS conditions → shows fallback text in PDF', () => {
    const pdf = serializePdfContent(emptyResult);
    expect(pdf).toContain('No polygenic risk score results to display.');
  });

  it('counseling not recommended → shows "no counseling indicated" text in PDF', () => {
    const pdf = serializePdfContent(emptyResult);
    expect(pdf).toContain('No genetic counseling is indicated');
  });

  it('document is still valid with all empty sections', () => {
    const doc = buildPdfDocument(emptyResult);
    expect(doc).toHaveProperty('content');
    expect(Array.isArray(doc.content)).toBe(true);
  });

  it('report title still appears even when all data sections are empty', () => {
    const pdf = serializePdfContent(emptyResult);
    expect(pdf).toContain('Mergenix Genetic Analysis Report');
  });
});

// ─── 9. Data Integrity — No Cross-contamination ──────────────────────────────

describe('PDF Content Parity — Data Isolation', () => {
  it('two different results produce two different PDF serializations', () => {
    const pdf1 = serializePdfContent(MOCK_RESULT);

    const altResult: FullAnalysisResult = {
      ...MOCK_RESULT,
      metadata: {
        ...MOCK_RESULT.metadata,
        engineVersion: '9.9.9',
        parent1Format: 'vcf',
        parent2Format: 'vcf',
      },
      genomeBuild: 'GRCh37',
    };
    const pdf2 = serializePdfContent(altResult);

    expect(pdf1).not.toBe(pdf2);
    expect(pdf2).toContain('9.9.9');
    expect(pdf2).not.toContain('3.2.1');
    expect(pdf2).toContain('GRCh37');
    expect(pdf2).not.toContain('GRCh38');
  });

  it('SNP counts from result match PDF — not mixed up between parent 1 and parent 2', () => {
    // parent1SnpCount = 638,000, parent2SnpCount = 712,000
    const pdf = serializePdfContent(MOCK_RESULT);
    const p1Formatted = MOCK_RESULT.metadata.parent1SnpCount.toLocaleString();
    const p2Formatted = MOCK_RESULT.metadata.parent2SnpCount.toLocaleString();

    expect(pdf).toContain(p1Formatted);
    expect(pdf).toContain(p2Formatted);
    // They should be distinct values
    expect(p1Formatted).not.toBe(p2Formatted);
  });
});
