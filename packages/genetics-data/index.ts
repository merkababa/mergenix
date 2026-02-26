/**
 * @mergenix/genetics-data
 *
 * Type-safe exports of Mergenix reference data files.
 *
 * This package provides TypeScript-typed access to the genetic reference
 * data (carrier panel, trait SNPs, PGx panel, PRS weights, ethnicity
 * frequencies, glossary, and counseling providers).
 *
 * NOTE: carrier-panel.json uses a wrapped format { metadata, entries[] }
 * since v2.0.0. The legacy `data/` directory contains the old flat-array
 * format — do NOT overwrite these files with legacy data.
 */

// Re-export all data types
export type {
  CarrierPanelEntry,
  CarrierPanelMetadata,
  CarrierPanelData,
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
  PrsTransferability,
  PrsUiRecommendation,
  PrsAncestryMeta,
  PrsSnpWeight,
  PrsConditionDefinition,
  PrsWeightsMetadata,
  PrsWeightsData,
  EthnicityVariantFrequencies,
  EthnicityFrequenciesMetadata,
  EthnicityFrequenciesData,
  GlossaryEntry,
  CounselingProviderEntry,
  ChipDefinition,
  ChipCoverageMap,
  GenomicCoordinate,
  LiftoverEntry,
  LiftoverTable,
} from './types';

// ─── Data Imports ───────────────────────────────────────────────────────────
// Import JSON data files with proper typing.
// TypeScript resolveJsonModule is enabled in tsconfig.json.

import type {
  CarrierPanelData,
  CarrierPanelEntry,
  TraitSnpEntry,
  PgxPanel,
  PrsWeightsData,
  EthnicityFrequenciesData,
  GlossaryEntry,
  CounselingProviderEntry,
  ChipCoverageMap,
  LiftoverTable,
} from './types';

import carrierPanelRaw from './carrier-panel.json';
import traitSnpsRaw from './trait-snps.json';
import pgxPanelRaw from './pgx-panel.json';
import prsWeightsRaw from './prs-weights.json';
import ethnicityFrequenciesRaw from './ethnicity-frequencies.json';
import glossaryRaw from './glossary.json';
import counselingProvidersRaw from './counseling-providers.json';
import chipCoverageRaw from './chip-coverage.json';
import liftoverCoordinatesRaw from './liftover-coordinates.json';

// ─── Typed Data Exports ─────────────────────────────────────────────────────

/**
 * Full carrier panel data including metadata wrapper.
 * Source: data/carrier_panel.json (wrapped format since v2.0.0)
 */
export const CARRIER_PANEL_DATA: CarrierPanelData = carrierPanelRaw as unknown as CarrierPanelData;

/**
 * Carrier disease panel entries array.
 * Backward-compatible export — consumers that imported `carrierPanel` continue to work.
 * Source: data/carrier_panel.json → entries[]
 */
export const carrierPanel: CarrierPanelEntry[] = CARRIER_PANEL_DATA.entries;

/** Total number of diseases in the carrier panel. Derived from actual data. */
export const CARRIER_PANEL_COUNT: number = carrierPanel.length;

/** Formatted disease count for display (e.g., "2,697"). */
export const CARRIER_PANEL_COUNT_DISPLAY: string = CARRIER_PANEL_COUNT.toLocaleString('en-US');

/** Data version for the carrier panel (tracks schema changes). */
export const CARRIER_PANEL_VERSION = CARRIER_PANEL_DATA.metadata.version;

/**
 * Trait SNP database (476+ traits).
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

/**
 * Chip coverage mapping (D4).
 * Maps rsIDs to which DTC genotyping chips include them.
 * PLACEHOLDER — to be populated from actual chip manifests.
 */
export const chipCoverage: ChipCoverageMap = chipCoverageRaw as unknown as ChipCoverageMap;

/**
 * Liftover coordinate table (D5).
 * Maps rsIDs to genomic coordinates in both GRCh37 (hg19) and GRCh38 (hg38).
 * PLACEHOLDER — to be populated via Ensembl batch query.
 */
export const liftoverCoordinates: LiftoverTable = liftoverCoordinatesRaw as unknown as LiftoverTable;

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Top 21 diseases available in the free tier.
 * Sourced from Source/tier_config.py TOP_25_FREE_DISEASES (renamed TOP_21_FREE_DISEASES to match actual count of 21).
 */
export const TOP_21_FREE_DISEASES: string[] = [
  'Cystic Fibrosis',
  'Sickle Cell Disease',
  'Tay-Sachs Disease',
  'Phenylketonuria',
  'Beta Thalassemia',
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

/** 15 trait categories for the expanded trait catalog */
export const TRAIT_CATEGORIES = [
  'Physical Appearance',
  'Behavioral/Personality',
  'Athletic/Fitness',
  'Nutrition/Metabolism',
  'Sensory/Perception/Immune',
  'Reproductive/Hormonal',
  'Unusual/Quirky/Fun',
  'Skin/Aging/Longevity',
  'Pharmacogenomic',
  'Cardiovascular/Metabolic',
  'Neurological/Brain',
  'Cancer Risk',
  'Musculoskeletal/Bone',
  'Eye/Vision/Dental',
  'Longevity/Aging/Immunity',
] as const;

export type TraitCategory = (typeof TRAIT_CATEGORIES)[number];

/** Current number of traits in the database */
export const TRAIT_COUNT = traitSnps.length;

/** Display-friendly trait count string */
export const TRAIT_COUNT_DISPLAY = TRAIT_COUNT.toLocaleString('en-US');
