/**
 * Sample report data fixture for the public sample report page.
 *
 * Contains a complete FullAnalysisResult at the Pro tier with realistic
 * genetic data for the fictional couple "Sarah Cohen" and "David Nguyen".
 * Used to demonstrate all report sections without requiring real DNA files.
 */

import type { FullAnalysisResult } from "@mergenix/shared-types";

/** Names of the fictional couple used in the sample report. */
export const SAMPLE_COUPLE = {
  parentA: "Sarah Cohen",
  parentB: "David Nguyen",
} as const;

/** Complete analysis result fixture for the sample report page. */
export const SAMPLE_REPORT_DATA: FullAnalysisResult = {
  // ─── Carrier Results ─────────────────────────────────────────────────────
  carrier: [
    // Carrier matches (both parents carrier — high risk)
    {
      condition: "Tay-Sachs Disease",
      gene: "HEXA",
      severity: "high",
      description:
        "Tay-Sachs disease is a fatal genetic disorder that progressively destroys nerve cells in the brain and spinal cord. It is most common in Ashkenazi Jewish, French-Canadian, and Cajun populations.",
      parentAStatus: "carrier",
      parentBStatus: "carrier",
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: "high_risk",
      rsid: "rs76173977",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Cystic Fibrosis (F508del)",
      gene: "CFTR",
      severity: "high",
      description:
        "Cystic fibrosis is a progressive genetic disorder that causes persistent lung infections and limits the ability to breathe over time.",
      parentAStatus: "carrier",
      parentBStatus: "carrier",
      offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      riskLevel: "high_risk",
      rsid: "rs75030207",
      inheritance: "autosomal_recessive",
    },
    // Carrier detected (one parent carrier)
    {
      condition: "Sickle Cell Disease",
      gene: "HBB",
      severity: "high",
      description:
        "Sickle cell disease causes red blood cells to become misshapen and break down, leading to anemia and pain crises.",
      parentAStatus: "carrier",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 50, normal: 50 },
      riskLevel: "carrier_detected",
      rsid: "rs334",
      inheritance: "autosomal_recessive",
    },
    // Low-risk conditions
    {
      condition: "Phenylketonuria (PKU)",
      gene: "PAH",
      severity: "moderate",
      description:
        "Phenylketonuria is a metabolic disorder where the body cannot properly break down the amino acid phenylalanine.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs5030858",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Gaucher Disease Type 1",
      gene: "GBA",
      severity: "moderate",
      description:
        "Gaucher disease is a lysosomal storage disorder caused by deficiency of the enzyme glucocerebrosidase.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs76763715",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Canavan Disease",
      gene: "ASPA",
      severity: "high",
      description:
        "Canavan disease is a progressive neurological disorder caused by deficiency of aspartoacylase.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs28940279",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Bloom Syndrome",
      gene: "BLM",
      severity: "moderate",
      description:
        "Bloom syndrome is a rare autosomal recessive disorder characterized by short stature and increased cancer risk.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs28933981",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Familial Dysautonomia",
      gene: "ELP1",
      severity: "high",
      description:
        "Familial dysautonomia affects the autonomic and sensory nervous systems. It is most prevalent in the Ashkenazi Jewish population.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs1800499",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Niemann-Pick Disease Type A",
      gene: "SMPD1",
      severity: "high",
      description:
        "Niemann-Pick disease type A is a lysosomal storage disorder caused by deficiency of acid sphingomyelinase.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs121907950",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Fanconi Anemia Type C",
      gene: "FANCC",
      severity: "high",
      description:
        "Fanconi anemia type C is a bone marrow failure syndrome with increased cancer susceptibility.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs104894372",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Maple Syrup Urine Disease",
      gene: "BCKDHA",
      severity: "high",
      description:
        "Maple syrup urine disease is a metabolic disorder affecting branched-chain amino acid metabolism.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs28940871",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Glycogen Storage Disease Type 1a",
      gene: "G6PC",
      severity: "moderate",
      description:
        "Glycogen storage disease type 1a affects the body's ability to break down glycogen into glucose.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs121907990",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Mucolipidosis IV",
      gene: "MCOLN1",
      severity: "high",
      description:
        "Mucolipidosis IV is a lysosomal storage disorder causing progressive psychomotor delay and visual impairment.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs121918270",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Joubert Syndrome",
      gene: "CC2D2A",
      severity: "high",
      description:
        "Joubert syndrome is a rare brain malformation disorder characterized by absence of the cerebellar vermis.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs121908089",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Usher Syndrome Type 1F",
      gene: "PCDH15",
      severity: "high",
      description:
        "Usher syndrome type 1F causes congenital deafness and progressive vision loss due to retinitis pigmentosa.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs121908054",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Walker-Warburg Syndrome",
      gene: "POMT1",
      severity: "high",
      description:
        "Walker-Warburg syndrome is a severe congenital muscular dystrophy with brain and eye abnormalities.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs121918473",
      inheritance: "autosomal_recessive",
    },
    {
      condition: "Zellweger Spectrum Disorder",
      gene: "PEX1",
      severity: "high",
      description:
        "Zellweger spectrum disorder is a peroxisome biogenesis disorder affecting multiple organ systems.",
      parentAStatus: "normal",
      parentBStatus: "normal",
      offspringRisk: { affected: 0, carrier: 0, normal: 100 },
      riskLevel: "low_risk",
      rsid: "rs121434578",
      inheritance: "autosomal_recessive",
    },
  ],

  // ─── Trait Results ───────────────────────────────────────────────────────
  traits: [
    {
      trait: "Eye Color",
      gene: "HERC2/OCA2",
      rsid: "rs12913832",
      chromosome: "15",
      description:
        "The HERC2/OCA2 locus is the primary determinant of human iris color variation.",
      confidence: "high",
      inheritance: "codominant",
      status: "success",
      parentAGenotype: "AG",
      parentBGenotype: "GG",
      offspringProbabilities: {
        "Brown": 50,
        "Green/Hazel": 50,
      },
    },
    {
      trait: "Hair Color",
      gene: "MC1R",
      rsid: "rs1805007",
      chromosome: "16",
      description:
        "MC1R controls red hair and fair skin pigmentation.",
      confidence: "medium",
      inheritance: "recessive",
      status: "success",
      parentAGenotype: "CT",
      parentBGenotype: "CC",
      offspringProbabilities: {
        "Dark (non-red)": 50,
        "Light Brown (carrier)": 50,
      },
    },
    {
      trait: "Freckling",
      gene: "MC1R/IRF4",
      rsid: "rs12203592",
      chromosome: "6",
      description:
        "Freckling propensity is influenced by variants in IRF4 and MC1R.",
      confidence: "medium",
      inheritance: "additive",
      status: "success",
      parentAGenotype: "CT",
      parentBGenotype: "CC",
      offspringProbabilities: {
        "Some freckling": 50,
        "Minimal freckling": 50,
      },
    },
    {
      trait: "Lactose Tolerance",
      gene: "MCM6/LCT",
      rsid: "rs4988235",
      chromosome: "2",
      description:
        "Lactase persistence into adulthood is controlled by a regulatory variant upstream of the LCT gene.",
      confidence: "high",
      inheritance: "dominant",
      status: "success",
      parentAGenotype: "CT",
      parentBGenotype: "TT",
      offspringProbabilities: {
        "Lactose tolerant": 100,
        "Lactose intolerant": 0,
      },
    },
    {
      trait: "Bitter Taste Perception (PTC)",
      gene: "TAS2R38",
      rsid: "rs713598",
      chromosome: "7",
      description:
        "TAS2R38 determines the ability to taste bitter compounds such as PTC and PROP.",
      confidence: "high",
      inheritance: "dominant",
      status: "success",
      parentAGenotype: "GC",
      parentBGenotype: "GG",
      offspringProbabilities: {
        "Strong taster": 50,
        "Moderate taster": 50,
      },
    },
    {
      trait: "Earwax Type",
      gene: "ABCC11",
      rsid: "rs17822931",
      chromosome: "16",
      description:
        "The ABCC11 gene determines earwax type (wet vs. dry).",
      confidence: "high",
      inheritance: "recessive",
      status: "success",
      parentAGenotype: "CC",
      parentBGenotype: "CT",
      offspringProbabilities: {
        "Wet": 100,
        "Dry": 0,
      },
    },
    {
      trait: "Asparagus Metabolite Detection",
      gene: "OR2M7",
      rsid: "rs4481887",
      chromosome: "1",
      description:
        "The ability to smell asparagus metabolites in urine is influenced by olfactory receptor variants.",
      confidence: "medium",
      inheritance: "codominant",
      status: "success",
      parentAGenotype: "GA",
      parentBGenotype: "GG",
      offspringProbabilities: {
        "Can smell": 75,
        "Cannot smell": 25,
      },
    },
    {
      trait: "Cilantro Preference",
      gene: "OR6A2",
      rsid: "rs72921001",
      chromosome: "11",
      description:
        "The OR6A2 olfactory receptor gene is linked to the perception of cilantro as soapy or pleasant.",
      confidence: "medium",
      inheritance: "codominant",
      status: "success",
      parentAGenotype: "CT",
      parentBGenotype: "CC",
      offspringProbabilities: {
        "Enjoys cilantro": 65,
        "Soapy taste": 35,
      },
    },
    {
      trait: "Caffeine Metabolism",
      gene: "CYP1A2",
      rsid: "rs762551",
      chromosome: "15",
      description:
        "CYP1A2 is the primary enzyme responsible for caffeine metabolism.",
      confidence: "high",
      inheritance: "codominant",
      status: "success",
      parentAGenotype: "AA",
      parentBGenotype: "AC",
      offspringProbabilities: {
        "Fast metabolizer": 50,
        "Normal metabolizer": 50,
      },
    },
    {
      trait: "Dimples",
      gene: "ZBTB20",
      rsid: "rs823160",
      chromosome: "3",
      description:
        "Dimples are thought to be inherited in a dominant or codominant fashion, though the exact gene is unknown.",
      confidence: "low",
      inheritance: "codominant",
      status: "success",
      parentAGenotype: "AG",
      parentBGenotype: "GG",
      offspringProbabilities: {
        "Dimples": 50,
        "No dimples": 50,
      },
    },
    {
      trait: "Hair Thickness",
      gene: "EDAR",
      rsid: "rs3827760",
      chromosome: "2",
      description:
        "The EDAR gene influences hair follicle thickness and morphology. The derived allele is associated with thicker hair strands.",
      confidence: "high",
      inheritance: "dominant",
      status: "success",
      parentAGenotype: "AA",
      parentBGenotype: "AG",
      offspringProbabilities: {
        "Thick Hair": 50,
        "Intermediate Thickness": 50,
      },
    },
    {
      trait: "Widow's Peak",
      gene: "FRAS1",
      rsid: "rs2073963",
      chromosome: "4",
      description:
        "A V-shaped point in the hairline at the center of the forehead, thought to be dominantly inherited.",
      confidence: "low",
      inheritance: "codominant",
      status: "success",
      parentAGenotype: "CC",
      parentBGenotype: "CC",
      offspringProbabilities: {
        "Widow's peak": 0,
        "Straight hairline": 100,
      },
    },
    {
      trait: "Photic Sneeze Reflex",
      gene: "ZEB2",
      rsid: "rs10427255",
      chromosome: "2",
      description:
        "The photic sneeze reflex (ACHOO syndrome) is an autosomal dominant condition causing sneezing in response to bright light.",
      confidence: "low",
      inheritance: "codominant",
      status: "success",
      parentAGenotype: "CT",
      parentBGenotype: "CC",
      offspringProbabilities: {
        "Photic sneezer": 50,
        "Non-sneezer": 50,
      },
    },
    {
      trait: "Detached Earlobes",
      gene: "EDAR",
      rsid: "rs10195570",
      chromosome: "2",
      description:
        "Earlobe attachment is influenced by multiple genetic variants. Detached earlobes are generally considered dominant.",
      confidence: "low",
      inheritance: "codominant",
      status: "success",
      parentAGenotype: "AG",
      parentBGenotype: "AG",
      offspringProbabilities: {
        "Detached": 75,
        "Attached": 25,
      },
    },
  ],

  // ─── PGx Results ─────────────────────────────────────────────────────────
  pgx: {
    genesAnalyzed: 5,
    tier: "pro",
    isLimited: false,
    upgradeMessage: null,
    disclaimer:
      "Pharmacogenomic results are based on consumer-grade genotyping data and should not be used to make medication changes without consulting a healthcare provider.",
    results: {
      CYP2D6: {
        gene: "CYP2D6",
        description:
          "Cytochrome P450 2D6 metabolizes approximately 25% of commonly prescribed drugs.",
        chromosome: "22",
        parentA: {
          diplotype: "*1/*4",
          metabolizerStatus: {
            status: "intermediate_metabolizer",
            activityScore: 1.0,
            description: "Reduced enzyme activity; may require dose adjustments.",
          },
          drugRecommendations: [
            {
              drug: "Codeine",
              recommendation: "Consider alternative analgesic due to reduced activation.",
              strength: "strong",
              source: "CPIC",
              category: "Pain",
            },
          ],
        },
        parentB: {
          diplotype: "*1/*1",
          metabolizerStatus: {
            status: "normal_metabolizer",
            activityScore: 2.0,
            description: "Normal enzyme activity; standard drug metabolism expected.",
          },
          drugRecommendations: [
            {
              drug: "Codeine",
              recommendation: "Use label-recommended dosage.",
              strength: "strong",
              source: "CPIC",
              category: "Pain",
            },
          ],
        },
        offspringPredictions: [
          {
            diplotype: "*1/*1",
            probability: 0.5,
            metabolizerStatus: {
              status: "normal_metabolizer",
              activityScore: 2.0,
              description: "Normal enzyme activity.",
            },
            drugRecommendations: [],
          },
          {
            diplotype: "*1/*4",
            probability: 0.5,
            metabolizerStatus: {
              status: "intermediate_metabolizer",
              activityScore: 1.0,
              description: "Reduced enzyme activity.",
            },
            drugRecommendations: [],
          },
        ],
      },
      CYP2C19: {
        gene: "CYP2C19",
        description:
          "Cytochrome P450 2C19 metabolizes proton pump inhibitors, clopidogrel, and certain antidepressants.",
        chromosome: "10",
        parentA: {
          diplotype: "*1/*2",
          metabolizerStatus: {
            status: "intermediate_metabolizer",
            activityScore: 1.0,
            description: "Reduced enzyme activity for CYP2C19 substrates.",
          },
          drugRecommendations: [
            {
              drug: "Clopidogrel",
              recommendation: "Consider alternative antiplatelet therapy.",
              strength: "strong",
              source: "CPIC",
              category: "Cardiovascular",
            },
          ],
        },
        parentB: {
          diplotype: "*1/*1",
          metabolizerStatus: {
            status: "normal_metabolizer",
            activityScore: 2.0,
            description: "Normal enzyme activity; standard drug metabolism expected.",
          },
          drugRecommendations: [
            {
              drug: "Clopidogrel",
              recommendation: "Use label-recommended dosage.",
              strength: "strong",
              source: "CPIC",
              category: "Cardiovascular",
            },
          ],
        },
        offspringPredictions: [
          {
            diplotype: "*1/*1",
            probability: 0.5,
            metabolizerStatus: {
              status: "normal_metabolizer",
              activityScore: 2.0,
              description: "Normal enzyme activity.",
            },
            drugRecommendations: [],
          },
          {
            diplotype: "*1/*2",
            probability: 0.5,
            metabolizerStatus: {
              status: "intermediate_metabolizer",
              activityScore: 1.0,
              description: "Reduced enzyme activity.",
            },
            drugRecommendations: [],
          },
        ],
      },
      CYP2C9: {
        gene: "CYP2C9",
        description:
          "Cytochrome P450 2C9 metabolizes warfarin, NSAIDs, and certain oral hypoglycemics.",
        chromosome: "10",
        parentA: {
          diplotype: "*1/*1",
          metabolizerStatus: {
            status: "normal_metabolizer",
            activityScore: 2.0,
            description: "Normal enzyme activity.",
          },
          drugRecommendations: [
            {
              drug: "Warfarin",
              recommendation: "Use standard dosing algorithm.",
              strength: "strong",
              source: "CPIC",
              category: "Cardiovascular",
            },
          ],
        },
        parentB: {
          diplotype: "*1/*1",
          metabolizerStatus: {
            status: "normal_metabolizer",
            activityScore: 2.0,
            description: "Normal enzyme activity.",
          },
          drugRecommendations: [
            {
              drug: "Warfarin",
              recommendation: "Use standard dosing algorithm.",
              strength: "strong",
              source: "CPIC",
              category: "Cardiovascular",
            },
          ],
        },
        offspringPredictions: [
          {
            diplotype: "*1/*1",
            probability: 1.0,
            metabolizerStatus: {
              status: "normal_metabolizer",
              activityScore: 2.0,
              description: "Normal enzyme activity.",
            },
            drugRecommendations: [],
          },
        ],
      },
      DPYD: {
        gene: "DPYD",
        description:
          "Dihydropyrimidine dehydrogenase is the rate-limiting enzyme in fluoropyrimidine catabolism.",
        chromosome: "1",
        parentA: {
          diplotype: "*1/*1",
          metabolizerStatus: {
            status: "normal_metabolizer",
            activityScore: 2.0,
            description: "Normal DPD activity.",
          },
          drugRecommendations: [
            {
              drug: "5-Fluorouracil",
              recommendation: "Use label-recommended dosage.",
              strength: "strong",
              source: "CPIC",
              category: "Oncology",
            },
          ],
        },
        parentB: {
          diplotype: "*1/*1",
          metabolizerStatus: {
            status: "normal_metabolizer",
            activityScore: 2.0,
            description: "Normal DPD activity.",
          },
          drugRecommendations: [
            {
              drug: "5-Fluorouracil",
              recommendation: "Use label-recommended dosage.",
              strength: "strong",
              source: "CPIC",
              category: "Oncology",
            },
          ],
        },
        offspringPredictions: [
          {
            diplotype: "*1/*1",
            probability: 1.0,
            metabolizerStatus: {
              status: "normal_metabolizer",
              activityScore: 2.0,
              description: "Normal DPD activity.",
            },
            drugRecommendations: [],
          },
        ],
      },
      TPMT: {
        gene: "TPMT",
        description:
          "Thiopurine methyltransferase inactivates thiopurine drugs (azathioprine, mercaptopurine).",
        chromosome: "6",
        parentA: {
          diplotype: "*1/*1",
          metabolizerStatus: {
            status: "normal_metabolizer",
            activityScore: 2.0,
            description: "Normal TPMT activity.",
          },
          drugRecommendations: [
            {
              drug: "Azathioprine",
              recommendation: "Use label-recommended starting dose.",
              strength: "strong",
              source: "CPIC",
              category: "Immunology",
            },
          ],
        },
        parentB: {
          diplotype: "*1/*1",
          metabolizerStatus: {
            status: "normal_metabolizer",
            activityScore: 2.0,
            description: "Normal TPMT activity.",
          },
          drugRecommendations: [
            {
              drug: "Azathioprine",
              recommendation: "Use label-recommended starting dose.",
              strength: "strong",
              source: "CPIC",
              category: "Immunology",
            },
          ],
        },
        offspringPredictions: [
          {
            diplotype: "*1/*1",
            probability: 1.0,
            metabolizerStatus: {
              status: "normal_metabolizer",
              activityScore: 2.0,
              description: "Normal TPMT activity.",
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
        name: "Coronary Artery Disease",
        parentA: {
          rawScore: 0.85,
          zScore: 0.42,
          percentile: 66,
          riskCategory: "above_average",
          snpsFound: 290,
          snpsTotal: 310,
          coveragePct: 93.5,
        },
        parentB: {
          rawScore: 0.22,
          zScore: -0.35,
          percentile: 36,
          riskCategory: "below_average",
          snpsFound: 298,
          snpsTotal: 310,
          coveragePct: 96.1,
        },
        offspring: {
          expectedPercentile: 52,
          rangeLow: 35,
          rangeHigh: 68,
          confidence: "Moderate confidence based on 93-96% SNP coverage.",
        },
        ancestryNote:
          "PRS weights derived primarily from European-ancestry GWAS. Predictive accuracy may be reduced in non-European populations.",
        reference: "Khera AV et al. Nat Genet. 2018;50(9):1219-1224.",
      },
      type_2_diabetes: {
        name: "Type 2 Diabetes",
        parentA: {
          rawScore: 0.55,
          zScore: 0.18,
          percentile: 57,
          riskCategory: "average",
          snpsFound: 200,
          snpsTotal: 220,
          coveragePct: 90.9,
        },
        parentB: {
          rawScore: 1.1,
          zScore: 0.72,
          percentile: 76,
          riskCategory: "above_average",
          snpsFound: 208,
          snpsTotal: 220,
          coveragePct: 94.5,
        },
        offspring: {
          expectedPercentile: 67,
          rangeLow: 48,
          rangeHigh: 82,
          confidence: "Moderate confidence based on 91-95% SNP coverage.",
        },
        ancestryNote:
          "PRS weights derived primarily from European-ancestry GWAS.",
        reference: "Mahajan A et al. Nat Genet. 2018;50(11):1505-1513.",
      },
      breast_cancer: {
        name: "Breast Cancer",
        parentA: {
          rawScore: 0.38,
          zScore: 0.05,
          percentile: 52,
          riskCategory: "average",
          snpsFound: 300,
          snpsTotal: 313,
          coveragePct: 95.8,
        },
        parentB: {
          rawScore: -0.15,
          zScore: -0.32,
          percentile: 37,
          riskCategory: "below_average",
          snpsFound: 305,
          snpsTotal: 313,
          coveragePct: 97.4,
        },
        offspring: {
          expectedPercentile: 45,
          rangeLow: 28,
          rangeHigh: 62,
          confidence: "High confidence based on >95% SNP coverage.",
        },
        ancestryNote:
          "PRS weights derived primarily from European-ancestry GWAS.",
        reference: "Mavaddat N et al. Am J Hum Genet. 2019;104(1):21-34.",
      },
      alzheimers_disease: {
        name: "Alzheimer's Disease",
        parentA: {
          rawScore: 0.12,
          zScore: -0.08,
          percentile: 47,
          riskCategory: "average",
          snpsFound: 84,
          snpsTotal: 95,
          coveragePct: 88.4,
        },
        parentB: {
          rawScore: 0.35,
          zScore: 0.22,
          percentile: 59,
          riskCategory: "average",
          snpsFound: 87,
          snpsTotal: 95,
          coveragePct: 91.6,
        },
        offspring: {
          expectedPercentile: 53,
          rangeLow: 34,
          rangeHigh: 70,
          confidence: "Low-moderate confidence based on 88-92% SNP coverage.",
        },
        ancestryNote:
          "APOE status is the strongest single-gene risk factor for late-onset Alzheimer's.",
        reference: "Jansen IE et al. Nat Genet. 2019;51(3):404-413.",
      },
      asthma: {
        name: "Asthma",
        parentA: {
          rawScore: 0.42,
          zScore: 0.12,
          percentile: 55,
          riskCategory: "average",
          snpsFound: 148,
          snpsTotal: 165,
          coveragePct: 89.7,
        },
        parentB: {
          rawScore: 0.75,
          zScore: 0.48,
          percentile: 68,
          riskCategory: "above_average",
          snpsFound: 155,
          snpsTotal: 165,
          coveragePct: 93.9,
        },
        offspring: {
          expectedPercentile: 62,
          rangeLow: 44,
          rangeHigh: 76,
          confidence: "Moderate confidence based on 90-94% SNP coverage.",
        },
        ancestryNote:
          "Environmental factors play a substantial role in asthma risk beyond genetics.",
        reference: "Demenais F et al. Nat Genet. 2018;50(1):42-53.",
      },
    },
    metadata: {
      source: "PGS Catalog + published GWAS summary statistics",
      version: "3.0.0",
      conditionsCovered: 5,
      lastUpdated: "2025-01-15",
      disclaimer:
        "Polygenic risk scores are calculated from population-level statistics and represent relative risk.",
    },
    tier: "pro",
    conditionsAvailable: 5,
    conditionsTotal: 5,
    disclaimer:
      "PRS reflect statistical probabilities and are not diagnostic. Environmental factors, family history, and lifestyle all contribute to actual risk.",
    isLimited: false,
    upgradeMessage: null,
  },

  // ─── Counseling Result ───────────────────────────────────────────────────
  counseling: {
    recommend: true,
    urgency: "moderate",
    reasons: [
      "Both parents are carriers for Tay-Sachs Disease and Cystic Fibrosis, each with a 25% chance of an affected child.",
      "One parent is a carrier for Sickle Cell Disease.",
    ],
    nsgcUrl: "https://www.nsgc.org/findageneticcounselor",
    summaryText:
      "Your combined genetic analysis identified carrier matches for Tay-Sachs Disease and Cystic Fibrosis. A genetic counselor can help you understand reproductive options and testing strategies.",
    keyFindings: [
      {
        condition: "Tay-Sachs Disease",
        gene: "HEXA",
        riskLevel: "high_risk",
        parentAStatus: "carrier",
        parentBStatus: "carrier",
        inheritance: "autosomal_recessive",
      },
      {
        condition: "Cystic Fibrosis (F508del)",
        gene: "CFTR",
        riskLevel: "high_risk",
        parentAStatus: "carrier",
        parentBStatus: "carrier",
        inheritance: "autosomal_recessive",
      },
    ],
    recommendedSpecialties: ["prenatal", "carrier_screening"],
    referralLetter: null,
    upgradeMessage: null,
  },

  // ─── Metadata ────────────────────────────────────────────────────────────
  metadata: {
    parent1Format: "23andme",
    parent2Format: "ancestrydna",
    parent1SnpCount: 620000,
    parent2SnpCount: 690000,
    analysisTimestamp: "2025-06-15T10:30:00.000Z",
    engineVersion: "3.1.0",
    tier: "pro",
    dataVersion: "2.0.0",
  },

  // ─── Coverage & Chip Detection ──────────────────────────────────────────
  coupleMode: true,
  coverageMetrics: {
    totalDiseases: 17,
    diseasesWithCoverage: 17,
    perDisease: {},
  },
  chipVersion: {
    provider: "23andMe",
    version: "v5",
    snpCount: 620000,
    confidence: 0.95,
  },
  genomeBuild: "GRCh37",
};
