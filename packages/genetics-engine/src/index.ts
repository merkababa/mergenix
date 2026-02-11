/**
 * @mergenix/genetics-engine
 *
 * Client-side genetics analysis engine for the Mergenix platform.
 *
 * This package provides all the computational logic for:
 * - Parsing genetic data files (23andMe, AncestryDNA, MyHeritage, VCF)
 * - Carrier risk analysis (Mendelian inheritance)
 * - Trait prediction (Punnett square)
 * - Pharmacogenomics (star alleles, metabolizer status, drug recs)
 * - Polygenic risk scores (PRS)
 * - Ethnicity-adjusted carrier frequencies
 * - Genetic counseling triage
 *
 * All functions are designed to run in a Web Worker for non-blocking
 * computation in the browser.
 */

// ─── Type Re-exports ────────────────────────────────────────────────────────
// Re-export all shared types so consumers only need to import from one place.
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

// Re-export the primary engine data structure for consumers.
export type { GenotypeMap } from './types';

// ─── Engine Module Exports ──────────────────────────────────────────────────

export {
  detectFormat,
  parse23andMe,
  parseAncestryDNA,
  parseMyHeritage,
  parseVcf,
  parseGeneticFile,
  validate23andMe,
  validateAncestryDNA,
  validateMyHeritage,
  validateVcf,
  validateGeneticFile,
  getGenotypeStats,
  buildParseResultSummary,
} from './parser';

export {
  determineCarrierStatus,
  calculateOffspringRiskAR,
  calculateOffspringRiskAD,
  calculateOffspringRiskXLinked,
  determineRiskLevel,
  analyzeCarrierRisk,
  getAnalysisSummary,
  getCarrierDisclaimer,
} from './carrier';

export {
  getParentAlleles,
  punnettSquare,
  predictOffspringGenotypes,
  normalizeGenotype,
  mapGenotypeToPhenotype,
  predictTrait,
  predictAllTraits,
} from './traits';

export {
  determineStarAllele,
  determineMetabolizerStatus,
  getDrugRecommendations,
  predictOffspringPgx,
  analyzePgx,
  getPgxDisclaimer,
} from './pgx';

export {
  normalCdf,
  zScoreToPercentile,
  calculateRawPrs,
  normalizePrs,
  getRiskCategory,
  predictOffspringPrsRange,
  analyzePrs,
  getPrsDisclaimer,
} from './prs';

export {
  getPopulationFrequency,
  adjustCarrierRisk,
  calculateBayesianPosterior,
  getEthnicitySummary,
  formatFrequencyComparison,
} from './ethnicity';

export {
  shouldRecommendCounseling,
  generateReferralSummary,
  findProvidersBySpecialty,
} from './counseling';

export {
  normalizeGenotypeAlleles,
  isValidRsid,
  complementAllele,
  isHomozygous,
  isHeterozygous,
  clamp,
} from './utils';

// ─── Tier Gating Config ──────────────────────────────────────────────────────
// Re-export tier gating constants for frontend tier-gating UI.
export { TIER_GATING } from './types';
export type { TierGating } from './types';
