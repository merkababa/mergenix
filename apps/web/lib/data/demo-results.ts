/**
 * Static demo results fixture for the analysis page.
 *
 * Contains a realistic FullAnalysisResult at the Pro tier so users can
 * explore every tab of the results dashboard without uploading files.
 * All rsIDs, gene symbols, and inheritance patterns are scientifically
 * accurate and match real-world genetics literature.
 */

import type { FullAnalysisResult } from '@mergenix/shared-types';

export const DEMO_RESULTS: FullAnalysisResult = {
  // ─── Carrier Results ─────────────────────────────────────────────────────
  carrier: [
    // ── 3 Autosomal Recessive — High Risk (both parents carrier) ──────────
    {
      condition: 'Cystic Fibrosis (F508del)',
      gene: 'CFTR',
      severity: 'high',
      description:
        'Cystic fibrosis is a progressive genetic disorder that causes persistent lung infections and limits the ability to breathe over time. The F508del variant in CFTR is the most common CF-causing mutation worldwide.',
      parentAStatus: 'carrier',
      parentBStatus: 'carrier',
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: 'high_risk',
      rsid: 'rs113993960',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Tay-Sachs Disease',
      gene: 'HEXA',
      severity: 'high',
      description:
        'Tay-Sachs disease is a fatal genetic disorder that progressively destroys nerve cells in the brain and spinal cord. It is most common in Ashkenazi Jewish, French-Canadian, and Cajun populations.',
      parentAStatus: 'carrier',
      parentBStatus: 'carrier',
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: 'high_risk',
      rsid: 'rs387906309',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Sickle Cell Disease',
      gene: 'HBB',
      severity: 'high',
      description:
        'Sickle cell disease is a group of blood disorders causing red blood cells to become misshapen and break down. The HbS variant (rs334) in the HBB gene is the causative mutation.',
      parentAStatus: 'carrier',
      parentBStatus: 'carrier',
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: 'high_risk',
      rsid: 'rs334',
      inheritance: 'autosomal_recessive',
    },

    // ── 2 Autosomal Dominant — High Risk (one parent affected) ────────────
    {
      condition: 'Familial Hypercholesterolemia',
      gene: 'LDLR',
      severity: 'high',
      description:
        'Familial hypercholesterolemia is an autosomal dominant disorder causing severely elevated LDL cholesterol from birth, leading to early-onset cardiovascular disease. LDLR mutations impair clearance of LDL particles from the bloodstream.',
      parentAStatus: 'affected',
      parentBStatus: 'normal',
      offspringRisk: { affected: 50, carrier: 0, normal: 50 },
      riskLevel: 'high_risk',
      rsid: 'rs28942078',
      inheritance: 'autosomal_dominant',
    },
    {
      condition: 'Marfan Syndrome',
      gene: 'FBN1',
      severity: 'high',
      description:
        'Marfan syndrome is a connective tissue disorder affecting the heart, eyes, blood vessels, and skeleton. Mutations in the FBN1 gene disrupt fibrillin-1, a key structural protein.',
      parentAStatus: 'normal',
      parentBStatus: 'affected',
      offspringRisk: { affected: 50, carrier: 0, normal: 50 },
      riskLevel: 'high_risk',
      rsid: 'rs137854473',
      inheritance: 'autosomal_dominant',
    },

    // ── 2 X-Linked — High Risk (carrier mother) ──────────────────────────
    {
      condition: 'G6PD Deficiency (A- variant)',
      gene: 'G6PD',
      severity: 'moderate',
      description:
        'Glucose-6-phosphate dehydrogenase deficiency is the most common enzyme deficiency worldwide, affecting over 400 million people. The A- variant (rs1050828) is common in populations of African descent and can cause hemolytic anemia triggered by certain medications, foods, or infections.',
      parentAStatus: 'carrier',
      parentBStatus: 'normal',
      offspringRisk: {
        affected: 25,
        carrier: 25,
        normal: 50,
        sons: { affected: 50, carrier: 0, normal: 50 },
        daughters: { affected: 0, carrier: 50, normal: 50 },
      },
      riskLevel: 'high_risk',
      rsid: 'rs1050828',
      inheritance: 'X-linked',
    },
    {
      condition: 'Hemophilia A',
      gene: 'F8',
      severity: 'high',
      description:
        'Hemophilia A is a bleeding disorder caused by deficiency of clotting factor VIII. It is the most common severe bleeding disorder, affecting approximately 1 in 5,000 males.',
      parentAStatus: 'carrier',
      parentBStatus: 'normal',
      offspringRisk: {
        affected: 25,
        carrier: 25,
        normal: 50,
        sons: { affected: 50, carrier: 0, normal: 50 },
        daughters: { affected: 0, carrier: 50, normal: 50 },
      },
      riskLevel: 'high_risk',
      rsid: 'rs137852339',
      inheritance: 'X-linked',
    },

    // ── 6 Low-Risk Conditions ──────────────────────────────────────────────
    {
      condition: 'Phenylketonuria (PKU)',
      gene: 'PAH',
      severity: 'moderate',
      description:
        'Phenylketonuria is a metabolic disorder where the body cannot properly break down the amino acid phenylalanine. Early dietary treatment prevents intellectual disability.',
      parentAStatus: 'carrier',
      parentBStatus: 'normal',
      offspringRisk: { affected: 0, carrier: 50, normal: 50 },
      riskLevel: 'carrier_detected',
      rsid: 'rs5030858',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Gaucher Disease Type 1',
      gene: 'GBA1',
      severity: 'moderate',
      description:
        'Gaucher disease is a lysosomal storage disorder caused by deficiency of the enzyme glucocerebrosidase. Type 1 is the most common form and does not affect the brain.',
      parentAStatus: 'normal',
      parentBStatus: 'carrier',
      offspringRisk: { affected: 0, carrier: 50, normal: 50 },
      riskLevel: 'carrier_detected',
      rsid: 'rs76763715',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Canavan Disease',
      gene: 'ASPA',
      severity: 'high',
      description:
        'Canavan disease is a progressive neurological disorder caused by deficiency of the enzyme aspartoacylase. It leads to spongy degeneration of white matter in the brain.',
      parentAStatus: 'normal',
      parentBStatus: 'normal',
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: 'low_risk',
      rsid: 'rs28940893',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Bloom Syndrome',
      gene: 'BLM',
      severity: 'moderate',
      description:
        'Bloom syndrome is a rare autosomal recessive disorder characterized by short stature, sun sensitivity, and increased cancer risk. It is caused by mutations in the BLM helicase gene.',
      parentAStatus: 'normal',
      parentBStatus: 'normal',
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: 'low_risk',
      rsid: 'rs113993962',
      inheritance: 'autosomal_recessive',
    },
    {
      condition: 'Familial Dysautonomia',
      gene: 'ELP1',
      severity: 'high',
      description:
        'Familial dysautonomia is an inherited disorder affecting the autonomic and sensory nervous systems. It is most prevalent in the Ashkenazi Jewish population.',
      parentAStatus: 'normal',
      parentBStatus: 'normal',
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: 'low_risk',
      rsid: 'rs104942698',
      inheritance: 'autosomal_recessive',
    },
  ],

  // ─── Trait Results ───────────────────────────────────────────────────────
  traits: [
    {
      trait: 'Eye Color',
      gene: 'HERC2/OCA2',
      rsid: 'rs12913832',
      chromosome: '15',
      description:
        'The HERC2/OCA2 locus is the primary determinant of human iris color variation. The rs12913832 SNP explains most of the blue vs. brown eye color difference.',
      confidence: 'high',
      inheritance: 'codominant',
      status: 'success',
      parentAGenotype: 'AG',
      parentBGenotype: 'AG',
      offspringProbabilities: {
        Blue: 25,
        'Green/Hazel': 50,
        Brown: 25,
      },
    },
    {
      trait: 'Hair Color',
      gene: 'MC1R',
      rsid: 'rs1805007',
      chromosome: '16',
      description:
        'MC1R is the major gene controlling red hair and fair skin pigmentation. Variants in this gene reduce eumelanin production and increase pheomelanin.',
      confidence: 'medium',
      inheritance: 'recessive',
      status: 'success',
      parentAGenotype: 'CT',
      parentBGenotype: 'CC',
      offspringProbabilities: {
        'Dark (non-red)': 50,
        'Light Brown (carrier)': 50,
        'Red/Auburn': 0,
      },
    },
    {
      trait: 'Earwax Type',
      gene: 'ABCC11',
      rsid: 'rs17822931',
      chromosome: '16',
      description:
        'The ABCC11 gene determines earwax type (wet vs. dry). The dry type is dominant in East Asian populations, while wet earwax is common in European and African populations.',
      confidence: 'high',
      inheritance: 'recessive',
      status: 'success',
      parentAGenotype: 'CC',
      parentBGenotype: 'CT',
      offspringProbabilities: {
        Wet: 100,
        Dry: 0,
      },
    },
    {
      trait: 'Freckling',
      gene: 'MC1R/IRF4',
      rsid: 'rs12203592',
      chromosome: '6',
      description:
        'Freckling propensity is influenced by variants in the IRF4 gene and MC1R. The rs12203592 variant in IRF4 is strongly associated with skin pigmentation and freckling.',
      confidence: 'medium',
      inheritance: 'additive',
      status: 'success',
      parentAGenotype: 'CT',
      parentBGenotype: 'CC',
      offspringProbabilities: {
        'Some freckling': 50,
        'Minimal freckling': 50,
      },
    },
    {
      trait: 'Lactose Tolerance',
      gene: 'MCM6/LCT',
      rsid: 'rs4988235',
      chromosome: '2',
      description:
        'Lactase persistence into adulthood is controlled by a regulatory variant upstream of the LCT gene. The T allele at rs4988235 confers lactose tolerance, common in Northern European populations.',
      confidence: 'high',
      inheritance: 'dominant',
      status: 'success',
      parentAGenotype: 'CT',
      parentBGenotype: 'TT',
      offspringProbabilities: {
        'Lactose tolerant': 100,
        'Lactose intolerant': 0,
      },
    },
    {
      trait: 'Bitter Taste Perception (PTC)',
      gene: 'TAS2R38',
      rsid: 'rs713598',
      chromosome: '7',
      description:
        'TAS2R38 determines the ability to taste bitter compounds such as PTC and PROP. Tasters carry the PAV haplotype, while non-tasters carry AVI.',
      confidence: 'high',
      inheritance: 'codominant',
      status: 'success',
      parentAGenotype: 'GC',
      parentBGenotype: 'GG',
      offspringProbabilities: {
        'Strong taster': 50,
        'Moderate taster': 50,
        'Non-taster': 0,
      },
    },
    {
      trait: 'Asparagus Metabolite Detection',
      gene: 'OR2M7',
      rsid: 'rs4481887',
      chromosome: '1',
      description:
        'The ability to smell asparagus metabolites in urine is influenced by olfactory receptor variants near OR2M7. Approximately 40% of people cannot detect this odor.',
      confidence: 'medium',
      inheritance: 'additive',
      status: 'success',
      parentAGenotype: 'GA',
      parentBGenotype: 'GG',
      offspringProbabilities: {
        'Can smell': 75,
        'Cannot smell': 25,
      },
    },
    {
      trait: 'Cilantro Preference',
      gene: 'OR6A2',
      rsid: 'rs72921001',
      chromosome: '11',
      description:
        "The OR6A2 olfactory receptor gene is linked to the perception of cilantro as soapy or pleasant. A variant at this locus alters the receptor's sensitivity to aldehyde compounds in cilantro.",
      confidence: 'medium',
      inheritance: 'additive',
      status: 'success',
      parentAGenotype: 'CT',
      parentBGenotype: 'CC',
      offspringProbabilities: {
        'Enjoys cilantro': 65,
        'Soapy taste': 35,
      },
    },
    {
      trait: 'Muscle Composition',
      gene: 'ACTN3',
      rsid: 'rs1815739',
      chromosome: '11',
      description:
        'ACTN3 encodes alpha-actinin-3, expressed in fast-twitch muscle fibers. The R577X variant (rs1815739) is associated with sprint/power performance. The XX genotype results in complete deficiency of alpha-actinin-3.',
      confidence: 'high',
      inheritance: 'codominant',
      status: 'missing',
      parentAGenotype: '--',
      parentBGenotype: 'CT',
      offspringProbabilities: {},
      note: 'Parent A genotype unavailable at this locus.',
    },
    {
      trait: 'Caffeine Metabolism',
      gene: 'CYP1A2',
      rsid: 'rs762551',
      chromosome: '15',
      description:
        'CYP1A2 is the primary enzyme responsible for caffeine metabolism. The rs762551 variant determines whether an individual is a fast or slow caffeine metabolizer.',
      confidence: 'high',
      inheritance: 'codominant',
      status: 'missing',
      parentAGenotype: 'AA',
      parentBGenotype: '--',
      offspringProbabilities: {},
      note: 'Parent B genotype unavailable at this locus.',
    },
  ],

  // ─── PGx Results ─────────────────────────────────────────────────────────
  pgx: {
    genesAnalyzed: 5,
    tier: 'pro',
    isLimited: false,
    upgradeMessage: null,
    disclaimer:
      'Pharmacogenomic results are based on direct-to-consumer (DTC) genotyping data and should not be used to make medication changes without consulting a healthcare provider. DTC tests interrogate a limited set of star alleles; rare or novel variants may not be detected. Always confirm results with clinical-grade pharmacogenomic testing before altering any drug regimen.',
    results: {
      CYP2D6: {
        gene: 'CYP2D6',
        description:
          'Cytochrome P450 2D6 metabolizes approximately 25% of commonly prescribed drugs including opioids, antidepressants, and antipsychotics.',
        chromosome: '22',
        parentA: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal enzyme activity; standard drug metabolism expected.',
          },
          drugRecommendations: [
            {
              drug: 'Codeine',
              recommendation: 'Use label-recommended dosage.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Pain',
            },
            {
              drug: 'Tramadol',
              recommendation: 'Use label-recommended dosage.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Pain',
            },
          ],
        },
        parentB: {
          diplotype: '*1/*2',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal enzyme activity; standard drug metabolism expected.',
          },
          drugRecommendations: [
            {
              drug: 'Codeine',
              recommendation: 'Use label-recommended dosage.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Pain',
            },
          ],
        },
        offspringPredictions: [
          {
            diplotype: '*1/*1',
            probability: 0.5,
            metabolizerStatus: {
              status: 'normal_metabolizer',
              activityScore: 2.0,
              description: 'Normal enzyme activity.',
            },
            drugRecommendations: [],
          },
          {
            diplotype: '*1/*2',
            probability: 0.5,
            metabolizerStatus: {
              status: 'normal_metabolizer',
              activityScore: 2.0,
              description: 'Normal enzyme activity.',
            },
            drugRecommendations: [],
          },
        ],
      },
      CYP2C19: {
        gene: 'CYP2C19',
        description:
          'Cytochrome P450 2C19 metabolizes proton pump inhibitors, clopidogrel, certain antidepressants, and benzodiazepines.',
        chromosome: '10',
        parentA: {
          diplotype: '*1/*2',
          metabolizerStatus: {
            status: 'intermediate_metabolizer',
            activityScore: 1.0,
            description:
              'Reduced enzyme activity; may require dose adjustments for sensitive substrates.',
          },
          drugRecommendations: [
            {
              drug: 'Clopidogrel',
              recommendation:
                'Consider alternative antiplatelet therapy (e.g., prasugrel or ticagrelor). Reduced CYP2C19 function decreases conversion to active metabolite.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Cardiovascular',
            },
            {
              drug: 'Omeprazole',
              recommendation: 'Standard dose likely sufficient; monitor for increased effect.',
              strength: 'moderate',
              source: 'CPIC',
              category: 'Gastrointestinal',
            },
            {
              drug: 'Sertraline',
              recommendation:
                'Consider dose reduction or alternative SSRI. Metabolism may be reduced.',
              strength: 'moderate',
              source: 'DPWG',
              category: 'Psychiatry',
            },
          ],
        },
        parentB: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal enzyme activity; standard drug metabolism expected.',
          },
          drugRecommendations: [
            {
              drug: 'Clopidogrel',
              recommendation: 'Use label-recommended dosage.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Cardiovascular',
            },
          ],
        },
        offspringPredictions: [
          {
            diplotype: '*1/*1',
            probability: 0.5,
            metabolizerStatus: {
              status: 'normal_metabolizer',
              activityScore: 2.0,
              description: 'Normal enzyme activity.',
            },
            drugRecommendations: [],
          },
          {
            diplotype: '*1/*2',
            probability: 0.5,
            metabolizerStatus: {
              status: 'intermediate_metabolizer',
              activityScore: 1.0,
              description: 'Reduced enzyme activity.',
            },
            drugRecommendations: [
              {
                drug: 'Clopidogrel',
                recommendation: 'Consider alternative antiplatelet therapy.',
                strength: 'strong',
                source: 'CPIC',
                category: 'Cardiovascular',
              },
            ],
          },
        ],
      },
      CYP2C9: {
        gene: 'CYP2C9',
        description:
          'Cytochrome P450 2C9 metabolizes warfarin, NSAIDs, and certain oral hypoglycemics. Variants affect dosing of narrow-therapeutic-index drugs.',
        chromosome: '10',
        parentA: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal enzyme activity; standard drug metabolism expected.',
          },
          drugRecommendations: [
            {
              drug: 'Warfarin',
              recommendation: 'Use standard dosing algorithm. No CYP2C9-based adjustment needed.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Cardiovascular',
            },
          ],
        },
        parentB: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal enzyme activity; standard drug metabolism expected.',
          },
          drugRecommendations: [
            {
              drug: 'Warfarin',
              recommendation: 'Use standard dosing algorithm.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Cardiovascular',
            },
          ],
        },
        offspringPredictions: [
          {
            diplotype: '*1/*1',
            probability: 1.0,
            metabolizerStatus: {
              status: 'normal_metabolizer',
              activityScore: 2.0,
              description: 'Normal enzyme activity.',
            },
            drugRecommendations: [],
          },
        ],
      },
      DPYD: {
        gene: 'DPYD',
        description:
          'Dihydropyrimidine dehydrogenase is the rate-limiting enzyme in fluoropyrimidine catabolism. DPYD variants can cause severe, life-threatening toxicity with 5-FU and capecitabine.',
        chromosome: '1',
        parentA: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal DPD activity; standard fluoropyrimidine dosing appropriate.',
          },
          drugRecommendations: [
            {
              drug: '5-Fluorouracil',
              recommendation: 'Use label-recommended dosage.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Oncology',
            },
            {
              drug: 'Capecitabine',
              recommendation: 'Use label-recommended dosage.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Oncology',
            },
          ],
        },
        parentB: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal DPD activity; standard fluoropyrimidine dosing appropriate.',
          },
          drugRecommendations: [
            {
              drug: '5-Fluorouracil',
              recommendation: 'Use label-recommended dosage.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Oncology',
            },
          ],
        },
        offspringPredictions: [
          {
            diplotype: '*1/*1',
            probability: 1.0,
            metabolizerStatus: {
              status: 'normal_metabolizer',
              activityScore: 2.0,
              description: 'Normal DPD activity.',
            },
            drugRecommendations: [],
          },
        ],
      },
      TPMT: {
        gene: 'TPMT',
        description:
          'Thiopurine methyltransferase inactivates thiopurine drugs (azathioprine, mercaptopurine, thioguanine). Reduced TPMT activity increases risk of myelosuppression.',
        chromosome: '6',
        parentA: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal TPMT activity; standard thiopurine dosing appropriate.',
          },
          drugRecommendations: [
            {
              drug: 'Azathioprine',
              recommendation: 'Use label-recommended starting dose.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Immunology',
            },
            {
              drug: 'Mercaptopurine',
              recommendation: 'Use label-recommended starting dose.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Oncology',
            },
          ],
        },
        parentB: {
          diplotype: '*1/*1',
          metabolizerStatus: {
            status: 'normal_metabolizer',
            activityScore: 2.0,
            description: 'Normal TPMT activity; standard thiopurine dosing appropriate.',
          },
          drugRecommendations: [
            {
              drug: 'Azathioprine',
              recommendation: 'Use label-recommended starting dose.',
              strength: 'strong',
              source: 'CPIC',
              category: 'Immunology',
            },
          ],
        },
        offspringPredictions: [
          {
            diplotype: '*1/*1',
            probability: 1.0,
            metabolizerStatus: {
              status: 'normal_metabolizer',
              activityScore: 2.0,
              description: 'Normal TPMT activity.',
            },
            drugRecommendations: [],
          },
        ],
      },
    },
  },

  // ─── PRS Results ─────────────────────────────────────────────────────────
  prs: {
    conditions: {
      coronary_artery_disease: {
        name: 'Coronary Artery Disease',
        parentA: {
          rawScore: 1.42,
          zScore: 0.87,
          percentile: 81,
          riskCategory: 'elevated',
          snpsFound: 287,
          snpsTotal: 310,
          coveragePct: 92.6,
        },
        parentB: {
          rawScore: 0.35,
          zScore: -0.21,
          percentile: 42,
          riskCategory: 'average',
          snpsFound: 295,
          snpsTotal: 310,
          coveragePct: 95.2,
        },
        offspring: {
          expectedPercentile: 65,
          rangeLow: 48,
          rangeHigh: 79,
          confidence: 'Moderate confidence based on 92-95% SNP coverage from both parents.',
        },
        ancestryNote:
          'PRS weights derived primarily from European-ancestry GWAS. Predictive accuracy may be reduced in non-European populations.',
        reference: 'Khera AV et al. Nat Genet. 2018;50(9):1219-1224.',
      },
      type_2_diabetes: {
        name: 'Type 2 Diabetes',
        parentA: {
          rawScore: 0.78,
          zScore: 0.34,
          percentile: 63,
          riskCategory: 'above_average',
          snpsFound: 198,
          snpsTotal: 220,
          coveragePct: 90.0,
        },
        parentB: {
          rawScore: 1.65,
          zScore: 1.12,
          percentile: 87,
          riskCategory: 'elevated',
          snpsFound: 205,
          snpsTotal: 220,
          coveragePct: 93.2,
        },
        offspring: {
          expectedPercentile: 76,
          rangeLow: 58,
          rangeHigh: 88,
          confidence: 'Moderate confidence based on 90-93% SNP coverage from both parents.',
        },
        ancestryNote:
          'PRS weights derived primarily from European-ancestry GWAS. Predictive accuracy may be reduced in non-European populations.',
        reference: 'Mahajan A et al. Nat Genet. 2018;50(11):1505-1513.',
      },
      breast_cancer: {
        name: 'Breast Cancer',
        parentA: {
          rawScore: 2.14,
          zScore: 1.73,
          percentile: 96,
          riskCategory: 'high',
          snpsFound: 303,
          snpsTotal: 313,
          coveragePct: 96.8,
        },
        parentB: {
          rawScore: -0.42,
          zScore: -0.58,
          percentile: 28,
          riskCategory: 'below_average',
          snpsFound: 298,
          snpsTotal: 313,
          coveragePct: 95.2,
        },
        offspring: {
          expectedPercentile: 72,
          rangeLow: 50,
          rangeHigh: 89,
          confidence: 'High confidence based on >95% SNP coverage from both parents.',
        },
        ancestryNote:
          'PRS weights derived primarily from European-ancestry GWAS. Predictive accuracy may be reduced in non-European populations.',
        reference: 'Mavaddat N et al. Am J Hum Genet. 2019;104(1):21-34.',
      },
      alzheimers_disease: {
        name: "Alzheimer's Disease",
        parentA: {
          rawScore: 0.15,
          zScore: -0.05,
          percentile: 48,
          riskCategory: 'average',
          snpsFound: 82,
          snpsTotal: 95,
          coveragePct: 86.3,
        },
        parentB: {
          rawScore: 0.28,
          zScore: 0.11,
          percentile: 54,
          riskCategory: 'average',
          snpsFound: 85,
          snpsTotal: 95,
          coveragePct: 89.5,
        },
        offspring: {
          expectedPercentile: 51,
          rangeLow: 32,
          rangeHigh: 68,
          confidence:
            "Low-moderate confidence based on 86-90% SNP coverage. Alzheimer's PRS has limited predictive power.",
        },
        ancestryNote:
          "APOE status is the strongest single-gene risk factor for late-onset Alzheimer's and is reported separately. PRS captures additional polygenic risk.",
        reference: 'Jansen IE et al. Nat Genet. 2019;51(3):404-413.',
      },
      asthma: {
        name: 'Asthma',
        parentA: {
          rawScore: 0.52,
          zScore: 0.19,
          percentile: 58,
          riskCategory: 'average',
          snpsFound: 145,
          snpsTotal: 165,
          coveragePct: 87.9,
        },
        parentB: {
          rawScore: 0.68,
          zScore: 0.42,
          percentile: 66,
          riskCategory: 'above_average',
          snpsFound: 152,
          snpsTotal: 165,
          coveragePct: 92.1,
        },
        offspring: {
          expectedPercentile: 62,
          rangeLow: 44,
          rangeHigh: 76,
          confidence: 'Moderate confidence based on 88-92% SNP coverage from both parents.',
        },
        ancestryNote:
          'PRS weights derived primarily from European-ancestry GWAS. Environmental factors (allergens, pollution) play a substantial role in asthma risk beyond genetics.',
        reference: 'Demenais F et al. Nat Genet. 2018;50(1):42-53.',
      },
    },
    metadata: {
      source: 'PGS Catalog + published GWAS summary statistics',
      version: '3.0.0',
      conditionsCovered: 5,
      lastUpdated: '2025-01-15',
      disclaimer:
        'Polygenic risk scores are calculated from population-level statistics and represent relative risk compared to a reference population. They are not diagnostic and should be interpreted by a qualified healthcare professional. Environmental, lifestyle, and additional genetic factors not captured by PRS significantly influence disease risk.',
    },
    tier: 'pro',
    conditionsAvailable: 5,
    conditionsTotal: 5,
    disclaimer:
      'PRS are calculated from population statistics and represent relative genetic predisposition, not absolute risk. Environmental factors, family history, and lifestyle choices all contribute to actual disease risk. These scores are intended for educational purposes and should not be used as the basis for medical decisions.',
    isLimited: false,
    upgradeMessage: null,
  },

  // ─── Counseling Result ───────────────────────────────────────────────────
  counseling: {
    recommend: true,
    urgency: 'high',
    reasons: [
      'Both parents are carriers for 3 autosomal recessive conditions (Cystic Fibrosis, Tay-Sachs Disease, Sickle Cell Disease), each with a 25% chance of an affected child.',
      'One parent carries autosomal dominant variants for Familial Hypercholesterolemia and Marfan Syndrome, conferring a 50% transmission risk for each condition.',
      'Breast cancer polygenic risk score for Parent A is at the 96th percentile (high risk category), which warrants discussion of enhanced screening protocols.',
    ],
    nsgcUrl: 'https://www.nsgc.org/findageneticcounselor',
    summaryText:
      'Your combined genetic analysis identified several findings that merit professional genetic counseling. Three autosomal recessive carrier matches (Cystic Fibrosis, Tay-Sachs Disease, and Sickle Cell Disease) indicate a 25% probability of an affected child for each condition if both parents are carriers. Additionally, autosomal dominant variants for Familial Hypercholesterolemia and Marfan Syndrome were detected in one parent, each carrying a 50% transmission risk. Two X-linked conditions (G6PD Deficiency and Hemophilia A) were identified with carrier mother status, presenting a 50% risk for affected sons. Polygenic risk scores indicate elevated risk for Coronary Artery Disease and a high-risk score for Breast Cancer. A genetic counselor can help you understand reproductive options, testing strategies, and management approaches tailored to your specific results.',
    keyFindings: [
      {
        condition: 'Cystic Fibrosis (F508del)',
        gene: 'CFTR',
        riskLevel: 'high_risk',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        inheritance: 'autosomal_recessive',
      },
      {
        condition: 'Tay-Sachs Disease',
        gene: 'HEXA',
        riskLevel: 'high_risk',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        inheritance: 'autosomal_recessive',
      },
      {
        condition: 'Sickle Cell Disease',
        gene: 'HBB',
        riskLevel: 'high_risk',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        inheritance: 'autosomal_recessive',
      },
      {
        condition: 'Familial Hypercholesterolemia',
        gene: 'LDLR',
        riskLevel: 'high_risk',
        parentAStatus: 'affected',
        parentBStatus: 'normal',
        inheritance: 'autosomal_dominant',
      },
    ],
    recommendedSpecialties: ['prenatal', 'carrier_screening', 'cancer'],
    referralLetter: `To Whom It May Concern,

I am writing to refer this couple for genetic counseling based on the results of a comprehensive preconception genetic screening analysis performed via the Mergenix platform (v3.0.0).

Key findings include:
- Both parents are carriers for Cystic Fibrosis (CFTR F508del, rs113993960), Tay-Sachs Disease (HEXA, rs387906309), and Sickle Cell Disease (HBB HbS, rs334), each conferring a 25% risk of an affected child per pregnancy.
- One parent carries autosomal dominant variants associated with Familial Hypercholesterolemia (LDLR, rs28942078) and Marfan Syndrome (FBN1, rs137854473), each with 50% transmission risk.
- The mother is a carrier for two X-linked conditions: G6PD Deficiency (G6PD, rs1050828) and Hemophilia A (F8, rs137852339), presenting a 50% risk for affected male offspring per pregnancy.
- Polygenic risk scoring identified a Breast Cancer PRS at the 96th percentile (high risk) for Parent A.

This couple would benefit from a comprehensive preconception counseling session to discuss reproductive options, confirmatory diagnostic testing, and personalized risk management strategies.

Thank you for your attention to this referral.

Sincerely,
Mergenix Automated Referral System
(This referral letter was generated from DTC genotyping data and requires clinical confirmation.)`,
    upgradeMessage: null,
  },

  // ─── Metadata ────────────────────────────────────────────────────────────
  metadata: {
    parent1Format: '23andme',
    parent2Format: 'ancestrydna',
    parent1SnpCount: 610000,
    parent2SnpCount: 680000,
    analysisTimestamp: '2025-01-20T14:30:00.000Z',
    engineVersion: '3.0.0',
    tier: 'pro',
  },

  // ─── Coverage & Chip Detection ──────────────────────────────────────────
  coupleMode: true,
  coverageMetrics: { totalDiseases: 0, diseasesWithCoverage: 0, perDisease: {} },
  chipVersion: null,
  genomeBuild: 'GRCh37',
};
