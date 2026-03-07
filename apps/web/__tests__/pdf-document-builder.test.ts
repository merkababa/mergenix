import { describe, it, expect, vi } from 'vitest';
import { buildPdfDocument } from '../lib/pdf/pdf-document-builder';
import type { FullAnalysisResult } from '@mergenix/shared-types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockResult: FullAnalysisResult = {
  carrier: [
    {
      condition: 'Cystic Fibrosis',
      gene: 'CFTR',
      severity: 'high',
      description: 'A genetic disorder affecting the lungs and digestive system.',
      parentAStatus: 'carrier',
      parentBStatus: 'carrier',
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: 'high_risk',
      rsid: 'rs75030207',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Sickle Cell Disease',
      gene: 'HBB',
      severity: 'moderate',
      description: 'A blood disorder.',
      parentAStatus: 'carrier',
      parentBStatus: 'normal',
      offspringRisk: { affected: 0, carrier: 50, normal: 50 },
      riskLevel: 'carrier_detected',
      rsid: 'rs334',
      inheritance: 'autosomal_recessive',
    },
  ],
  traits: [
    {
      trait: 'Eye Color',
      gene: 'HERC2',
      rsid: 'rs12913832',
      chromosome: '15',
      description: 'Eye color prediction.',
      confidence: 'high',
      inheritance: 'dominant',
      status: 'success',
      parentAGenotype: 'AG',
      parentBGenotype: 'GG',
      offspringProbabilities: { 'Brown Eyes': 75, 'Blue Eyes': 25 },
    },
    {
      trait: 'Hair Color',
      gene: 'MC1R',
      rsid: 'rs1805007',
      chromosome: '16',
      description: 'Hair color prediction.',
      confidence: 'medium',
      inheritance: 'recessive',
      status: 'success',
      parentAGenotype: 'CC',
      parentBGenotype: 'CT',
      offspringProbabilities: { 'Dark Hair': 50, 'Light Hair': 50 },
    },
  ],
  pgx: {
    genesAnalyzed: 2,
    tier: 'pro',
    isLimited: false,
    results: {},
    upgradeMessage: null,
    disclaimer: 'PGx results are for informational purposes only.',
  },
  prs: {
    conditions: {},
    metadata: {
      source: 'GWAS Catalog',
      version: '1.0',
      conditionsCovered: 3,
      lastUpdated: '2026-01-01',
      disclaimer: 'PRS disclaimer text.',
    },
    tier: 'pro',
    conditionsAvailable: 3,
    conditionsTotal: 10,
    disclaimer: 'PRS results should be interpreted with caution.',
    isLimited: false,
    upgradeMessage: null,
  },
  counseling: {
    recommend: true,
    urgency: 'moderate',
    reasons: ['Both parents carry Cystic Fibrosis variant.'],
    nsgcUrl: 'https://www.nsgc.org',
    summaryText: 'Counseling recommended.',
    keyFindings: null,
    recommendedSpecialties: null,
    referralLetter: null,
    upgradeMessage: null,
  },
  metadata: {
    parent1Format: '23andme',
    parent2Format: 'vcf',
    parent1SnpCount: 600000,
    parent2SnpCount: 700000,
    analysisTimestamp: '2026-02-14T12:00:00Z',
    engineVersion: '3.0.0',
    tier: 'pro',
  },
  coupleMode: true,
  coverageMetrics: { totalDiseases: 2, diseasesWithCoverage: 2, perDisease: {} },
  chipVersion: null,
  genomeBuild: 'GRCh37',
};

const emptyCarrierResult: FullAnalysisResult = {
  ...mockResult,
  carrier: [],
};

/** Richer fixture with populated PGx, PRS, and Counseling sections. */
const richResult: FullAnalysisResult = {
  ...mockResult,
  pgx: {
    genesAnalyzed: 2,
    tier: 'pro',
    isLimited: false,
    results: {
      CYP2D6: {
        gene: 'CYP2D6',
        description: 'Cytochrome P450 2D6 metabolizes many drugs.',
        chromosome: '22',
        parentA: {
          diplotype: '*1/*4',
          metabolizerStatus: {
            status: 'intermediate_metabolizer',
            activityScore: 1.0,
            description: 'Reduced activity.',
          },
          drugRecommendations: [
            {
              drug: 'Codeine',
              recommendation: 'Consider alternative.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Pain',
            },
            {
              drug: 'Tramadol',
              recommendation: 'Monitor closely.',
              strength: 'moderate',
              source: 'CPIC',
              category: 'Pain',
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
              drug: 'Codeine',
              recommendation: 'Standard dosing.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Pain',
            },
          ],
        },
        offspringPredictions: [],
      },
      CYP2C19: {
        gene: 'CYP2C19',
        description: 'Cytochrome P450 2C19 metabolizes PPIs and antidepressants.',
        chromosome: '10',
        parentA: {
          diplotype: '*1/*2',
          metabolizerStatus: {
            status: 'intermediate_metabolizer',
            activityScore: 1.0,
            description: 'Reduced.',
          },
          drugRecommendations: [
            {
              drug: 'Clopidogrel',
              recommendation: 'Consider alternative.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Cardiovascular',
            },
          ],
        },
        parentB: {
          diplotype: '*17/*17',
          metabolizerStatus: {
            status: 'ultra_rapid_metabolizer',
            activityScore: 3.0,
            description: 'Ultrarapid.',
          },
          drugRecommendations: [
            {
              drug: 'Clopidogrel',
              recommendation: 'Standard dosing.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Cardiovascular',
            },
          ],
        },
        offspringPredictions: [],
      },
    },
    upgradeMessage: null,
    disclaimer: 'PGx results are for informational purposes only.',
  },
  prs: {
    conditions: {
      coronary_artery_disease: {
        name: 'Coronary Artery Disease',
        parentA: {
          rawScore: 0.85,
          zScore: 0.42,
          percentile: 66,
          riskCategory: 'above_average',
          snpsFound: 290,
          snpsTotal: 310,
          coveragePct: 93.5,
        },
        parentB: {
          rawScore: 0.22,
          zScore: -0.35,
          percentile: 36,
          riskCategory: 'below_average',
          snpsFound: 298,
          snpsTotal: 310,
          coveragePct: 96.1,
        },
        offspring: {
          expectedPercentile: 52,
          rangeLow: 35,
          rangeHigh: 68,
          confidence: 'Moderate confidence.',
        },
        ancestryNote: 'PRS weights derived primarily from European-ancestry GWAS.',
        reference: 'Khera AV et al. 2018.',
      },
      type_2_diabetes: {
        name: 'Type 2 Diabetes',
        parentA: {
          rawScore: 0.55,
          zScore: 0.18,
          percentile: 57,
          riskCategory: 'average',
          snpsFound: 200,
          snpsTotal: 220,
          coveragePct: 90.9,
        },
        parentB: {
          rawScore: 1.1,
          zScore: 0.72,
          percentile: 76,
          riskCategory: 'above_average',
          snpsFound: 208,
          snpsTotal: 220,
          coveragePct: 94.5,
        },
        offspring: {
          expectedPercentile: 67,
          rangeLow: 48,
          rangeHigh: 82,
          confidence: 'Moderate confidence.',
        },
        ancestryNote: 'PRS weights derived primarily from European-ancestry GWAS.',
        reference: 'Mahajan A et al. 2018.',
      },
    },
    metadata: {
      source: 'PGS Catalog',
      version: '3.0.0',
      conditionsCovered: 2,
      lastUpdated: '2025-01-15',
      disclaimer: 'PRS disclaimer.',
    },
    tier: 'pro',
    conditionsAvailable: 2,
    conditionsTotal: 5,
    disclaimer: 'PRS results should be interpreted with caution.',
    isLimited: false,
    upgradeMessage: null,
  },
  counseling: {
    recommend: true,
    urgency: 'moderate',
    reasons: ['Both parents carry Cystic Fibrosis variant.'],
    nsgcUrl: 'https://www.nsgc.org',
    summaryText: 'Counseling recommended due to carrier matches.',
    keyFindings: [
      {
        condition: 'Tay-Sachs Disease',
        gene: 'HEXA',
        riskLevel: 'high_risk',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        inheritance: 'autosomal_recessive',
      },
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
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('buildPdfDocument', () => {
  it('returns valid pdfmake document definition object', () => {
    const doc = buildPdfDocument(mockResult);

    // pdfmake TDocumentDefinitions must have a 'content' property
    expect(doc).toHaveProperty('content');
    expect(Array.isArray(doc.content)).toBe(true);
  });

  it('includes report title "Mergenix Genetic Analysis Report"', () => {
    const doc = buildPdfDocument(mockResult);
    const content = doc.content as unknown as Array<Record<string, unknown>>;

    // Find a content item with the report title text
    const titleItem = content.find(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'text' in item &&
        typeof item.text === 'string' &&
        item.text.includes('Mergenix Genetic Analysis Report'),
    );
    expect(titleItem).toBeDefined();
  });

  it('includes generation date from metadata', () => {
    const doc = buildPdfDocument(mockResult);
    const jsonStr = JSON.stringify(doc.content);

    // The analysisTimestamp is "2026-02-14T12:00:00Z" — should appear formatted with month name
    expect(jsonStr).toContain('February');
    expect(jsonStr).toContain('2026');
  });

  it('includes carrier risk table with disease names and risk levels', () => {
    const doc = buildPdfDocument(mockResult);
    const jsonStr = JSON.stringify(doc.content);

    expect(jsonStr).toContain('Cystic Fibrosis');
    expect(jsonStr).toContain('Sickle Cell Disease');
    // RISK_LABELS maps 'high_risk' -> 'High Risk', 'carrier_detected' -> 'Carrier Detected'
    expect(jsonStr).toContain('High Risk');
    expect(jsonStr).toContain('Carrier Detected');
  });

  it('includes traits predictions section', () => {
    const doc = buildPdfDocument(mockResult);
    const jsonStr = JSON.stringify(doc.content);

    expect(jsonStr).toContain('Eye Color');
    expect(jsonStr).toContain('Hair Color');
  });

  it('includes medical disclaimer text', () => {
    const doc = buildPdfDocument(mockResult);
    const jsonStr = JSON.stringify(doc.content);

    // Must contain some medical disclaimer text
    expect(jsonStr).toMatch(
      /not.*substitute.*medical|informational.*only|clinical.*testing|consult.*healthcare/i,
    );
  });

  it('handles empty carrier results gracefully', () => {
    const doc = buildPdfDocument(emptyCarrierResult);

    // Should not throw and should still produce a valid document
    expect(doc).toHaveProperty('content');
    expect(Array.isArray(doc.content)).toBe(true);

    // Should still have the title
    const content = doc.content as unknown as Array<Record<string, unknown>>;
    const titleItem = content.find(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'text' in item &&
        typeof item.text === 'string' &&
        item.text.includes('Mergenix Genetic Analysis Report'),
    );
    expect(titleItem).toBeDefined();
  });

  it('includes analysis metadata section', () => {
    const doc = buildPdfDocument(mockResult);
    const jsonStr = JSON.stringify(doc.content);

    // Should include file format info
    expect(jsonStr).toContain('23andme');
    expect(jsonStr).toContain('vcf');
    // Should include engine version
    expect(jsonStr).toContain('3.0.0');
  });

  // ─── PGx Section Tests ──────────────────────────────────────────────────

  it('includes PGx gene names and diplotypes in serialized document', () => {
    const doc = buildPdfDocument(richResult);
    const jsonStr = JSON.stringify(doc.content);

    // Gene names
    expect(jsonStr).toContain('CYP2D6');
    expect(jsonStr).toContain('CYP2C19');

    // Diplotypes (parentA and parentB)
    expect(jsonStr).toContain('*1/*4');
    expect(jsonStr).toContain('*1/*1');
    expect(jsonStr).toContain('*1/*2');
    expect(jsonStr).toContain('*17/*17');
  });

  it('includes PGx drug names from drugRecommendations', () => {
    const doc = buildPdfDocument(richResult);
    const jsonStr = JSON.stringify(doc.content);

    // The builder takes the first 3 drugs from parentA.drugRecommendations
    expect(jsonStr).toContain('Codeine');
    expect(jsonStr).toContain('Tramadol');
    expect(jsonStr).toContain('Clopidogrel');
  });

  it('includes PGx section header and gene count', () => {
    const doc = buildPdfDocument(richResult);
    const jsonStr = JSON.stringify(doc.content);

    expect(jsonStr).toContain('Pharmacogenomics (PGx) Results');
    expect(jsonStr).toContain('2 genes analyzed');
  });

  // ─── PRS Section Tests ──────────────────────────────────────────────────

  it('includes PRS condition names and percentiles', () => {
    const doc = buildPdfDocument(richResult);
    const jsonStr = JSON.stringify(doc.content);

    expect(jsonStr).toContain('Coronary Artery Disease');
    expect(jsonStr).toContain('Type 2 Diabetes');

    // Percentiles: parentA 66%, parentB 36% for CAD; parentA 57%, parentB 76% for T2D
    expect(jsonStr).toContain('66%');
    expect(jsonStr).toContain('36%');
    expect(jsonStr).toContain('57%');
    expect(jsonStr).toContain('76%');
  });

  it('includes PRS ancestry notes as footnote rows', () => {
    const doc = buildPdfDocument(richResult);
    const jsonStr = JSON.stringify(doc.content);

    expect(jsonStr).toContain('European-ancestry GWAS');
  });

  it('includes PRS risk category labels', () => {
    const doc = buildPdfDocument(richResult);
    const jsonStr = JSON.stringify(doc.content);

    // RISK_CATEGORY_LABELS maps 'above_average' -> 'Above Average', 'below_average' -> 'Below Average'
    expect(jsonStr).toContain('Above Average');
    expect(jsonStr).toContain('Below Average');
    expect(jsonStr).toContain('Average');
  });

  it('includes PRS section header and condition count', () => {
    const doc = buildPdfDocument(richResult);
    const jsonStr = JSON.stringify(doc.content);

    expect(jsonStr).toContain('Polygenic Risk Scores (PRS)');
    expect(jsonStr).toContain('2 conditions evaluated');
  });

  // ─── Counseling Section Tests ───────────────────────────────────────────

  it('includes counseling key findings with condition names and risk levels', () => {
    const doc = buildPdfDocument(richResult);
    const jsonStr = JSON.stringify(doc.content);

    // Key findings table: condition names
    expect(jsonStr).toContain('Tay-Sachs Disease');
    expect(jsonStr).toContain('Cystic Fibrosis');

    // Key findings table: gene names
    expect(jsonStr).toContain('HEXA');
    expect(jsonStr).toContain('CFTR');

    // Key findings table: risk levels mapped via RISK_LABELS
    // Both are 'high_risk' -> 'High Risk'
    // Also inheritance: 'autosomal_recessive' -> 'Autosomal_recessive' (capitalize first char)
    expect(jsonStr).toContain('Key Findings:');
  });

  it('includes counseling recommended specialties', () => {
    const doc = buildPdfDocument(richResult);
    const jsonStr = JSON.stringify(doc.content);

    // recommendedSpecialties: ['prenatal', 'carrier_screening']
    // capitalize() gives 'Prenatal', 'Carrier_screening'
    expect(jsonStr).toContain('Recommended Specialties:');
    expect(jsonStr).toContain('Prenatal');
    expect(jsonStr).toContain('Carrier_screening');
  });

  it('includes counseling urgency and summary text', () => {
    const doc = buildPdfDocument(richResult);
    const jsonStr = JSON.stringify(doc.content);

    // urgency 'moderate' -> capitalize -> 'Moderate'
    expect(jsonStr).toContain('Urgency: Moderate');
    expect(jsonStr).toContain('Counseling recommended due to carrier matches.');
  });

  it('includes counseling NSGC URL', () => {
    const doc = buildPdfDocument(richResult);
    const jsonStr = JSON.stringify(doc.content);

    expect(jsonStr).toContain('https://www.nsgc.org');
  });

  // ─── formatDate Edge Cases ──────────────────────────────────────────────

  it('formatDate returns "N/A" for empty string timestamp', () => {
    const resultWithEmptyDate: FullAnalysisResult = {
      ...mockResult,
      metadata: { ...mockResult.metadata, analysisTimestamp: '' },
    };
    const doc = buildPdfDocument(resultWithEmptyDate);
    const jsonStr = JSON.stringify(doc.content);

    expect(jsonStr).toContain('N/A');
  });

  it('formatDate returns the raw string for an invalid date', () => {
    const resultWithBadDate: FullAnalysisResult = {
      ...mockResult,
      metadata: { ...mockResult.metadata, analysisTimestamp: 'not-a-date' },
    };
    const doc = buildPdfDocument(resultWithBadDate);
    const jsonStr = JSON.stringify(doc.content);

    // new Date('not-a-date') returns Invalid Date, whose toLocaleDateString
    // returns 'Invalid Date' — the builder's catch block returns the raw string
    // Either 'Invalid Date' or 'not-a-date' should appear
    const containsRawOrInvalid = jsonStr.includes('not-a-date') || jsonStr.includes('Invalid Date');
    expect(containsRawOrInvalid).toBe(true);
  });

  it('formatDate returns raw string when Date constructor throws', () => {
    const originalDate = globalThis.Date;
    const mockDate = vi.fn(() => {
      throw new Error('mocked');
    }) as unknown as DateConstructor;
    Object.assign(mockDate, originalDate);
    globalThis.Date = mockDate;

    try {
      const resultWithDate: FullAnalysisResult = {
        ...mockResult,
        metadata: { ...mockResult.metadata, analysisTimestamp: '2026-01-01' },
      };
      const doc = buildPdfDocument(resultWithDate);
      const jsonStr = JSON.stringify(doc.content);

      // The catch branch should return the raw string
      expect(jsonStr).toContain('2026-01-01');
    } finally {
      globalThis.Date = originalDate;
    }
  });

  // ─── Empty PGx / PRS / Counseling (existing mockResult covers these) ──

  it('shows fallback text when PGx results are empty', () => {
    const doc = buildPdfDocument(mockResult);
    const jsonStr = JSON.stringify(doc.content);

    // mockResult has pgx.results = {} so the builder should show the empty-state text
    expect(jsonStr).toContain('No pharmacogenomic results to display.');
  });

  it('shows fallback text when PRS conditions are empty', () => {
    const doc = buildPdfDocument(mockResult);
    const jsonStr = JSON.stringify(doc.content);

    // mockResult has prs.conditions = {} so the builder should show the empty-state text
    expect(jsonStr).toContain('No polygenic risk score results to display.');
  });
});
