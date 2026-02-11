/**
 * @mergenix/genetics-data
 *
 * Type-safe exports of Mergenix reference data files.
 *
 * This package provides TypeScript-typed access to the genetic reference
 * data (carrier panel, trait SNPs, PGx panel, PRS weights, ethnicity
 * frequencies, glossary, and counseling providers).
 *
 * IMPORTANT: The JSON files in this package are placeholders. Run
 * `pnpm copy-data` (or `bash copy-data.sh`) to copy the actual data
 * from the legacy `data/` directory before building.
 */

// Re-export all data types
export type {
  CarrierPanelEntry,
  DataSource,
  TraitAlleles,
  PhenotypeMapValue,
  TraitSnpEntry,
  PgxDefiningVariant,
  PgxStarAllele,
  PgxMetabolizerDef,
  PgxDrug,
  PgxGeneDefinition,
  PgxPanelMetadata,
  PgxPanel,
  PrsSnpWeight,
  PrsConditionDefinition,
  PrsWeightsMetadata,
  PrsWeightsData,
  EthnicityVariantFrequencies,
  EthnicityFrequenciesMetadata,
  EthnicityFrequenciesData,
  GlossaryEntry,
  CounselingProviderEntry,
} from './types';

// ─── Data Imports ───────────────────────────────────────────────────────────
// Import JSON data files with proper typing.
// TypeScript resolveJsonModule is enabled in tsconfig.json.

import type {
  CarrierPanelEntry,
  TraitSnpEntry,
  PgxPanel,
  PrsWeightsData,
  EthnicityFrequenciesData,
  GlossaryEntry,
  CounselingProviderEntry,
} from './types';

import carrierPanelRaw from './carrier-panel.json';
import traitSnpsRaw from './trait-snps.json';
import pgxPanelRaw from './pgx-panel.json';
import prsWeightsRaw from './prs-weights.json';
import ethnicityFrequenciesRaw from './ethnicity-frequencies.json';
import glossaryRaw from './glossary.json';
import counselingProvidersRaw from './counseling-providers.json';

// ─── Typed Data Exports ─────────────────────────────────────────────────────

/**
 * Carrier disease panel (2,715 entries).
 * Source: data/carrier_panel.json
 */
export const carrierPanel: CarrierPanelEntry[] = carrierPanelRaw as unknown as CarrierPanelEntry[];

/**
 * Trait SNP database (79 traits).
 * Source: data/trait_snps.json
 */
export const traitSnps: TraitSnpEntry[] = traitSnpsRaw as unknown as TraitSnpEntry[];

/**
 * Pharmacogenomics panel (12 genes, ~100 drugs).
 * Source: data/pgx_panel.json
 */
export const pgxPanel: PgxPanel = pgxPanelRaw as unknown as PgxPanel;

/**
 * Polygenic risk score weights (10 conditions).
 * Source: data/prs_weights.json
 */
export const prsWeights: PrsWeightsData = prsWeightsRaw as unknown as PrsWeightsData;

/**
 * Ethnicity-adjusted carrier frequencies (gnomAD v4.1, 153 variants).
 * Source: data/ethnicity_frequencies.json
 */
export const ethnicityFrequencies: EthnicityFrequenciesData =
  ethnicityFrequenciesRaw as unknown as EthnicityFrequenciesData;

/**
 * Genetics glossary (23 terms).
 * Source: data/glossary.json
 */
export const glossary: GlossaryEntry[] = glossaryRaw as unknown as GlossaryEntry[];

/**
 * Genetic counseling providers directory.
 * Source: data/counseling_providers.json
 */
export const counselingProviders: CounselingProviderEntry[] =
  counselingProvidersRaw as unknown as CounselingProviderEntry[];

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Top 25 diseases available in the free tier.
 * Sourced from Source/tier_config.py TOP_25_FREE_DISEASES.
 */
export const TOP_25_FREE_DISEASES: string[] = [
  'Cystic Fibrosis',
  'Sickle Cell Disease',
  'Tay-Sachs Disease',
  'Spinal Muscular Atrophy',
  'Phenylketonuria',
  'Beta Thalassemia',
  'Fragile X Syndrome',
  'Duchenne Muscular Dystrophy',
  'Canavan Disease',
  'Gaucher Disease',
  'Familial Dysautonomia',
  'Fanconi Anemia',
  'Bloom Syndrome',
  'MCAD Deficiency',
  'Galactosemia',
  'Maple Syrup Urine Disease',
  'Glycogen Storage Disease Type 1a',
  'Congenital Adrenal Hyperplasia',
  'G6PD Deficiency',
  'Alpha-1 Antitrypsin Deficiency',
  'Hereditary Hemochromatosis',
  'Niemann-Pick Disease',
  'Biotinidase Deficiency',
  'Hemophilia A',
  "Huntington's Disease",
];

/**
 * Top 10 traits available in the free tier.
 * Sourced from Source/tier_config.py TOP_10_FREE_TRAITS.
 */
export const TOP_10_FREE_TRAITS: string[] = [
  'Eye Color',
  'Hair Color',
  'Lactose Intolerance',
  'Bitter Taste Perception',
  'Earwax Type',
  'Freckling',
  'Cleft Chin',
  "Widow's Peak",
  'Caffeine Metabolism',
  'Asparagus Smell Detection',
];

/**
 * Supported pharmacogenes (ordered by clinical relevance).
 * Sourced from Source/pharmacogenomics.py PGX_GENES.
 */
export const PGX_GENES: string[] = [
  'CYP2D6',
  'CYP2C19',
  'CYP2C9',
  'CYP3A5',
  'CYP1A2',
  'DPYD',
  'TPMT',
  'NUDT15',
  'SLCO1B1',
  'VKORC1',
  'HLA-B',
  'UGT1A1',
];

/**
 * Premium tier PGx genes (first 5 most clinically impactful).
 * Sourced from Source/pharmacogenomics.py _PREMIUM_GENES.
 */
export const PREMIUM_PGX_GENES: string[] = [
  'CYP2D6',
  'CYP2C19',
  'CYP2C9',
  'DPYD',
  'TPMT',
];

/**
 * Supported PRS conditions (ordered by clinical relevance).
 * Sourced from Source/prs.py PRS_CONDITIONS.
 */
export const PRS_CONDITIONS: string[] = [
  'coronary_artery_disease',
  'type_2_diabetes',
  'breast_cancer',
  'prostate_cancer',
  'alzheimers_disease',
  'atrial_fibrillation',
  'inflammatory_bowel_disease',
  'schizophrenia',
  'asthma',
  'obesity_bmi',
];

/**
 * Supported populations for ethnicity adjustment.
 * Sourced from Source/ethnicity.py POPULATIONS.
 */
export const POPULATIONS: string[] = [
  'African/African American',
  'East Asian',
  'South Asian',
  'European (Non-Finnish)',
  'Finnish',
  'Latino/Admixed American',
  'Ashkenazi Jewish',
  'Middle Eastern',
  'Global',
];

/**
 * Recognized genetic counseling specialties.
 * Sourced from Source/counseling.py COUNSELING_SPECIALTIES.
 */
export const COUNSELING_SPECIALTIES: string[] = [
  'prenatal',
  'carrier_screening',
  'cancer',
  'cardiovascular',
  'pediatric',
  'neurogenetics',
  'pharmacogenomics',
  'general',
];
