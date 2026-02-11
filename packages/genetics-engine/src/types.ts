/**
 * Internal types used by the genetics engine.
 *
 * These types supplement the shared types from @mergenix/shared-types
 * and are not exposed to consumers of the engine.
 */

// Import Tier locally so it can be used in the TIER_GATING const declaration.
// The re-export below makes it available to consumers.
import type { Tier } from '@mergenix/shared-types';

// Re-export all shared types for internal convenience
export type {
  FileFormat,
  Tier,
  InheritancePattern,
  CarrierStatus,
  RiskLevel,
  OffspringRisk,
  XLinkedOffspringRisk,
  CarrierResult,
  TraitResult,
  MetabolizerStatus,
  DrugRecommendation,
  MetabolizerResult,
  PgxGeneResult,
  PgxAnalysisResult,
  RiskCategory,
  PrsParentResult,
  PrsOffspringPrediction,
  PrsConditionResult,
  PrsAnalysisResult,
  PrsMetadata,
  Population,
  EthnicityAdjustment,
  EthnicitySummary,
  CounselingUrgency,
  CounselorSpecialty,
  CounselingKeyFinding,
  CounselingResult,
  FullAnalysisResult,
  ParseResultSummary,
  WorkerRequest,
  WorkerResponse,
  AnalysisStage,
} from '@mergenix/shared-types';

// Re-export data types for internal use
export type {
  CarrierPanelEntry,
  TraitSnpEntry,
  PgxPanel,
  PgxGeneDefinition,
  PgxStarAllele,
  PgxDrug,
  PrsWeightsData,
  PrsConditionDefinition,
  PrsSnpWeight,
  EthnicityFrequenciesData,
  EthnicityVariantFrequencies,
  GlossaryEntry,
  CounselingProviderEntry,
  PhenotypeMapValue,
} from '@mergenix/genetics-data';

// ─── Internal Engine Types ──────────────────────────────────────────────────

/**
 * Genotype map: rsID -> genotype string.
 *
 * This is the primary data structure output by the parser.
 * Uses a plain Record (object) for serialization compatibility with
 * Web Workers (Map is not structured-cloneable).
 */
export type GenotypeMap = Record<string, string>;

/**
 * Tier-specific configuration for analysis gating.
 */
export interface TierGating {
  /** Maximum diseases to analyze. null = unlimited. */
  diseaseLimit: number | null;
  /** Maximum traits to analyze. */
  traitLimit: number;
  /** Number of PGx genes accessible. */
  pgxGeneLimit: number;
  /** Number of PRS conditions accessible. */
  prsConditionLimit: number;
  /** Counseling feature level. */
  counselingLevel: 'basic' | 'full' | 'full_plus_letter';
  /** Whether ethnicity adjustment is available. */
  ethnicityAccess: boolean;
}

/**
 * Tier gating configuration map.
 * Sourced from Source/tier_config.py TIER_CONFIGS.
 */
export const TIER_GATING: Record<Tier, TierGating> = {
  free: {
    diseaseLimit: 25,
    traitLimit: 10,
    pgxGeneLimit: 0,
    prsConditionLimit: 0,
    counselingLevel: 'basic',
    ethnicityAccess: false,
  },
  premium: {
    diseaseLimit: 500,
    traitLimit: 79,
    pgxGeneLimit: 5,
    prsConditionLimit: 3,
    counselingLevel: 'full',
    ethnicityAccess: true,
  },
  pro: {
    diseaseLimit: 2715,
    traitLimit: 79,
    pgxGeneLimit: 12,
    prsConditionLimit: 10,
    counselingLevel: 'full_plus_letter',
    ethnicityAccess: true,
  },
};

// AnalysisStage is re-exported from @mergenix/shared-types above.
