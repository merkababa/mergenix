/**
 * Expected test data constants for E2E assertions.
 *
 * Values are derived from the actual demo-results.ts fixture
 * (apps/web/lib/data/demo-results.ts) and the tier configuration.
 * Tests should import these constants rather than hard-coding expected
 * values, so a single update here propagates to all specs.
 */

// ── Demo Analysis Expected Values ─────────────────────────────────────
// These mirror the DEMO_RESULTS from lib/data/demo-results.ts.

export const DEMO_EXPECTED = {
  /** Expected carrier risk conditions (all 13 from demo-results) */
  carrier: {
    /** Total number of carrier conditions in the demo data */
    totalCount: 13,

    /** High-risk conditions where both parents are carriers (autosomal recessive) */
    highRiskAutosomalRecessive: [
      {
        condition: 'Cystic Fibrosis (F508del)',
        gene: 'CFTR',
        rsid: 'rs113993960',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      },
      {
        condition: 'Tay-Sachs Disease',
        gene: 'HEXA',
        rsid: 'rs387906309',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      },
      {
        condition: 'Sickle Cell Disease',
        gene: 'HBB',
        rsid: 'rs334',
        parentAStatus: 'carrier',
        parentBStatus: 'carrier',
        offspringRisk: { affected: 25, carrier: 50, normal: 25 },
      },
    ],

    /** High-risk autosomal dominant conditions */
    highRiskAutosomalDominant: [
      {
        condition: 'Familial Hypercholesterolemia',
        gene: 'LDLR',
        rsid: 'rs28942078',
        parentAStatus: 'affected',
        parentBStatus: 'normal',
      },
      {
        condition: 'Marfan Syndrome',
        gene: 'FBN1',
        rsid: 'rs137854473',
        parentAStatus: 'normal',
        parentBStatus: 'affected',
      },
    ],

    /** X-linked conditions */
    xLinked: [
      {
        condition: 'G6PD Deficiency (A- variant)',
        gene: 'G6PD',
        rsid: 'rs1050828',
      },
      {
        condition: 'Hemophilia A',
        gene: 'F8',
        rsid: 'rs137852339',
      },
    ],

    /** All condition names for quick text-content checks */
    allConditionNames: [
      'Cystic Fibrosis (F508del)',
      'Tay-Sachs Disease',
      'Sickle Cell Disease',
      'Familial Hypercholesterolemia',
      'Marfan Syndrome',
      'G6PD Deficiency (A- variant)',
      'Hemophilia A',
      'Phenylketonuria (PKU)',
      'Gaucher Disease Type 1',
      'Spinal Muscular Atrophy',
      'Canavan Disease',
      'Bloom Syndrome',
      'Familial Dysautonomia',
    ],
  },

  /** Expected trait predictions */
  traits: {
    /** Total traits in the demo data */
    totalCount: 10,

    /** Key traits for spot-check assertions */
    spotChecks: {
      eyeColor: {
        trait: 'Eye Color',
        gene: 'HERC2/OCA2',
        rsid: 'rs12913832',
        parentAGenotype: 'AG',
        parentBGenotype: 'AG',
        offspringProbabilities: {
          Blue: 25,
          'Green/Hazel': 50,
          Brown: 25,
        },
      },
      earwax: {
        trait: 'Earwax Type',
        gene: 'ABCC11',
        rsid: 'rs17822931',
        parentAGenotype: 'CC',
        parentBGenotype: 'CT',
        offspringProbabilities: {
          Wet: 100,
          Dry: 0,
        },
      },
      hairColor: {
        trait: 'Hair Color',
        gene: 'MC1R',
        rsid: 'rs1805007',
        parentAGenotype: 'CT',
        parentBGenotype: 'CC',
      },
      lactose: {
        trait: 'Lactose Tolerance',
        gene: 'MCM6/LCT',
        rsid: 'rs4988235',
        parentAGenotype: 'CT',
        parentBGenotype: 'TT',
        offspringProbabilities: {
          'Lactose tolerant': 100,
          'Lactose intolerant': 0,
        },
      },
    },

    /** Traits with "missing" status (parentGenotype is "--") */
    missingTraits: ['Muscle Composition', 'Caffeine Metabolism'],

    /** All trait names */
    allTraitNames: [
      'Eye Color',
      'Hair Color',
      'Earwax Type',
      'Freckling',
      'Lactose Tolerance',
      'Bitter Taste Perception (PTC)',
      'Asparagus Metabolite Detection',
      'Cilantro Preference',
      'Muscle Composition',
      'Caffeine Metabolism',
    ],
  },

  /** Expected PGx (pharmacogenomic) results */
  pgx: {
    /** Number of genes analyzed */
    genesAnalyzed: 5,

    /** Gene names in the demo PGx results */
    geneNames: ['CYP2D6', 'CYP2C19', 'CYP2C9', 'DPYD', 'TPMT'],

    /** Key PGx spot-checks */
    spotChecks: {
      CYP2C19: {
        gene: 'CYP2C19',
        parentADiplotype: '*1/*2',
        parentAStatus: 'intermediate_metabolizer',
        parentBDiplotype: '*1/*1',
        parentBStatus: 'normal_metabolizer',
      },
      CYP2D6: {
        gene: 'CYP2D6',
        parentADiplotype: '*1/*1',
        parentAStatus: 'normal_metabolizer',
        parentBDiplotype: '*1/*2',
        parentBStatus: 'normal_metabolizer',
      },
      CYP2C9: {
        gene: 'CYP2C9',
        parentADiplotype: '*1/*1',
        parentAStatus: 'normal_metabolizer',
        parentBDiplotype: '*1/*1',
        parentBStatus: 'normal_metabolizer',
      },
    },

    /** CYP2C19 drug recommendations (for content verification) */
    cyp2c19Drugs: ['Clopidogrel', 'Omeprazole', 'Sertraline'],
  },

  /** Expected PRS (polygenic risk score) results */
  prs: {
    /** Number of conditions covered */
    conditionsCovered: 5,

    /** Condition keys */
    conditionKeys: [
      'coronary_artery_disease',
      'type_2_diabetes',
      'breast_cancer',
      'alzheimers_disease',
      'asthma',
    ],

    /** Key PRS spot-checks */
    spotChecks: {
      coronaryArteryDisease: {
        name: 'Coronary Artery Disease',
        parentAPercentile: 81,
        parentARiskCategory: 'elevated',
        parentBPercentile: 42,
        parentBRiskCategory: 'average',
        offspringExpectedPercentile: 65,
      },
      type2Diabetes: {
        name: 'Type 2 Diabetes',
        parentAPercentile: 63,
        parentARiskCategory: 'above_average',
        parentBPercentile: 87,
        parentBRiskCategory: 'elevated',
        offspringExpectedPercentile: 76,
      },
      breastCancer: {
        name: 'Breast Cancer',
        parentAPercentile: 96,
        parentARiskCategory: 'high',
        parentBPercentile: 28,
        parentBRiskCategory: 'below_average',
        offspringExpectedPercentile: 72,
      },
    },
  },

  /** Expected counseling result */
  counseling: {
    recommend: true,
    urgency: 'high',
    /** Number of reasons listed */
    reasonCount: 3,
    /** Key findings count */
    keyFindingsCount: 4,
    /** Expected recommended specialties */
    recommendedSpecialties: ['prenatal', 'carrier_screening', 'cancer'],
    /** The NSGC URL displayed for finding a genetic counselor */
    nsgcUrl: 'https://www.nsgc.org/findageneticcounselor',
  },

  /** Demo metadata */
  metadata: {
    parent1Format: '23andme',
    parent2Format: 'ancestrydna',
    tier: 'pro',
  },
} as const;

// ── Golden Carrier Expected Values ────────────────────────────────────
// Expected values for the golden carrier test files.
// These are used when testing real file uploads (not demo mode).

export const GOLDEN_EXPECTED = {
  /**
   * Conditions that should be detected as carrier matches when both
   * golden-carrier-parentA.txt and golden-carrier-parentB.txt are uploaded.
   * Both parents are heterozygous carriers for these conditions.
   */
  carrierMatches: [
    { condition: 'Cystic Fibrosis', gene: 'CFTR', rsid: 'rs113993960' },
    { condition: 'Sickle Cell Disease', gene: 'HBB', rsid: 'rs334' },
  ],

  /**
   * Traits that should be detectable from the golden carrier files.
   * These use the same rsIDs as the demo data for cross-validation.
   */
  detectableTraits: [
    { trait: 'Eye Color', rsid: 'rs12913832' },
    { trait: 'Earwax Type', rsid: 'rs17822931' },
  ],

  /** The files are in 23andMe format */
  fileFormat: '23andme',
} as const;

// ── Tier Limits ──────────────────────────────────────────────────────
// Feature limits per subscription tier, used for tier-gating assertions.

export const TIER_LIMITS = {
  free: {
    /** Max disease catalog entries visible to free users */
    diseases: 25,
    /** Max trait predictions visible to free users */
    traits: 10,
    /** PGx is not available on free tier */
    pgxAvailable: false,
    /** PRS is not available on free tier */
    prsAvailable: false,
    /** Population selector is disabled on free tier */
    populationSelectorEnabled: false,
    /** Save results is not available on free tier */
    saveResultsAvailable: false,
  },
  premium: {
    /** Max disease catalog entries visible to premium users */
    diseases: 500,
    /** Max trait predictions visible to premium users */
    traits: 79,
    /** PGx is available on premium tier */
    pgxAvailable: true,
    /** PRS is available on premium tier */
    prsAvailable: true,
    /** Population selector is enabled on premium tier */
    populationSelectorEnabled: true,
    /** Save results is available on premium tier */
    saveResultsAvailable: true,
  },
  pro: {
    /** All diseases visible on pro tier */
    diseases: Infinity,
    /** All traits visible on pro tier */
    traits: Infinity,
    /** PGx is available on pro tier */
    pgxAvailable: true,
    /** PRS is available on pro tier */
    prsAvailable: true,
    /** Population selector is enabled on pro tier */
    populationSelectorEnabled: true,
    /** Save results is available on pro tier */
    saveResultsAvailable: true,
  },
} as const;

// ── Route Constants ──────────────────────────────────────────────────
// Application routes used in E2E navigation and assertion helpers.

export const ROUTES = {
  // Auth routes
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  callback: '/callback',

  // App routes (require authentication)
  analysis: '/analysis',
  account: '/account',
  subscription: '/subscription',
  counseling: '/counseling',
  paymentSuccess: '/payment/success',
  paymentCancel: '/payment/cancel',

  // Marketing routes (public)
  home: '/',
  about: '/about',
  diseases: '/diseases',
  glossary: '/glossary',
  legal: '/legal',
  products: '/products',
} as const;

// ── Tab Names ────────────────────────────────────────────────────────
// Analysis result tab labels for use in assertions.

export const RESULT_TAB_NAMES = [
  'Overview',
  'Carrier Risk',
  'Traits',
  'PGx',
  'PRS',
  'Counseling',
] as const;

// ── Navbar Link Labels ───────────────────────────────────────────────
// Expected navigation link labels in the desktop navbar.

export const NAV_LINK_LABELS = [
  'Home',
  'Analysis',
  'Disease Catalog',
  'Pricing',
  'About',
] as const;
