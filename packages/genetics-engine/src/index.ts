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
  getGeneSpecificWarning,
  ARRAY_LIMITATION_DISCLAIMER,
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

// ─── Device Detection & Memory Management ──────────────────────────────────
export { detectDevice, getArgon2Params, MemoryGovernor } from './device';
export type { DeviceProfile, Argon2Params } from './device';

// ─── Lazy Data Loading ──────────────────────────────────────────────────────
export {
  fetchWithRetry,
  loadAllData,
  getCachedVersions,
  clearReferenceCache,
  DataLoadError,
  DEFAULT_MANIFEST,
} from './data-loader';
export type { DataManifest, GeneticsData } from './data-loader';

// ─── Decompression ──────────────────────────────────────────────────────────
export { detectCompression, decompress, DecompressionError } from './decompression';
export type {
  CompressionFormat,
  DecompressionResult,
  DecompressionOptions,
  DecompressionErrorCode,
} from './decompression';

// ─── Progress Reporter ──────────────────────────────────────────────────────
export { ProgressReporter, STAGE_DISPLAY_NAMES, getStageDisplayName } from './progress';
export type { ProgressEvent } from './progress';

// ─── Tier Gating Config ──────────────────────────────────────────────────────
// Re-export tier gating constants for frontend tier-gating UI.
export { TIER_GATING } from './types';
export type { TierGating } from './types';

// ─── Build Detection ────────────────────────────────────────────────────────
export {
  detectBuildFromHeaders,
  detectBuildFromSentinels,
  detectGenomeBuild,
} from './build-detection';
export type { BuildDetectionResult, SentinelSnp } from './build-detection';

// ─── Liftover ───────────────────────────────────────────────────────────────
export { LiftoverTable, createLiftoverTable } from './liftover';
export type { LiftoverEntry, LiftoverResult, LiftoverSummary } from './liftover';

// ─── Strand Harmonization ───────────────────────────────────────────────────
export {
  isPalindromicPair,
  analyzeStrand,
  flipStrand,
  harmonizeStrand,
  STRAND_REFERENCE_SNPS,
} from './strand';
export type { StrandAnalysisResult, ReferenceAllele } from './strand';

// ─── Coverage Calculator ───────────────────────────────────────────────────
export { calculateDiseaseCoverage, calculateCoverageMetrics, getCoverageSummary } from './coverage';

// ─── Offspring Risk (Punnett-Square Arithmetic) ────────────────────────────
// Direct exports from the extracted offspring-risk.ts module.
// The same functions are also re-exported from combiner.ts for backward compat.
export { calculateARRisk, calculateADRisk, calculateXLinkedRisk } from './offspring-risk';

// ─── Couple/Offspring Combiner ─────────────────────────────────────────────
export { combineForCondition, combineAllConditions } from './combiner';
export type { ParentConditionInput, OffspringPrediction } from './combiner';

// ─── Residual Risk Calculator ───────────────────────────────────────────────
export {
  COMMON_DETECTION_RATES,
  calculateResidualRisk,
  getResidualRisk,
  formatResidualRisk,
} from './residual-risk';
export type { DetectionRateEntry, ResidualRiskResult } from './residual-risk';

// ─── Chip Version Detection ──────────────────────────────────────────────────
export {
  detectChipVersion as detectChipVersionFromProfile,
  getChipNotes,
  ENGINE_VERSION,
} from './chip-detection';

// ─── Data Version ────────────────────────────────────────────────────────────
/** Current data version for stale-results detection. */
export const CURRENT_DATA_VERSION = '2.0.0';
