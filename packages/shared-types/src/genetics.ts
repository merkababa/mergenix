/**
 * Genetics-related types shared between the frontend and genetics engine.
 *
 * These types define the public API surface that the frontend consumes from
 * the genetics engine. The genetics-engine package re-exports these and adds
 * internal-only types for computation.
 */

// ─── File Format Types ──────────────────────────────────────────────────────

/** Supported genetic data file formats. */
export type FileFormat = '23andme' | 'ancestrydna' | 'myheritage' | 'vcf' | 'unknown';

// ─── Tier Types ─────────────────────────────────────────────────────────────

/** Pricing tier levels. */
export type Tier = 'free' | 'premium' | 'pro';

// ─── Inheritance Pattern Types ──────────────────────────────────────────────

/**
 * Mendelian inheritance patterns.
 *
 * These match the `inheritance` field in carrier_panel.json:
 * - "autosomal_recessive": Both parents must carry the variant for offspring risk
 * - "autosomal_dominant": Single copy of the variant causes disease
 * - "X-linked": Variant on X chromosome; males hemizygous, females can be carriers
 */
export type InheritancePattern = 'autosomal_recessive' | 'autosomal_dominant' | 'X-linked';

// ─── Carrier Analysis Types ─────────────────────────────────────────────────

/**
 * Carrier status for a single individual at a single locus.
 *
 * Maps to the Python `determine_carrier_status()` return values:
 * - "normal": Homozygous reference (no pathogenic alleles)
 * - "carrier": Heterozygous (one pathogenic allele)
 * - "affected": Homozygous pathogenic (two pathogenic alleles)
 * - "unknown": Missing or invalid genotype data
 */
export type CarrierStatus = 'normal' | 'carrier' | 'affected' | 'unknown';

/**
 * Risk level classification for offspring genetic conditions.
 *
 * - "high_risk": Non-zero chance of affected offspring
 * - "carrier_detected": At least one parent is a carrier but no affected offspring risk
 * - "low_risk": Neither parent carries the variant
 * - "not_tested": Variant rsID not present in genotype file (chip does not cover it)
 * - "potential_risk": Partial coverage — cannot confidently rule out carrier status
 * - "coverage_insufficient": Too few variants genotyped for meaningful analysis
 * - "unknown": Insufficient or invalid data for classification
 */
export type RiskLevel = 'high_risk' | 'carrier_detected' | 'low_risk' | 'not_tested' | 'potential_risk' | 'coverage_insufficient' | 'unknown';

/** Offspring risk percentages for autosomal inheritance patterns. */
export interface OffspringRisk {
  /** Percentage chance offspring is affected (0-100). */
  affected: number;
  /** Percentage chance offspring is a carrier (0-100). */
  carrier: number;
  /** Percentage chance offspring is unaffected (0-100). */
  normal: number;
}

/** Sex-stratified offspring risk for X-linked inheritance. */
export interface XLinkedOffspringRisk extends OffspringRisk {
  /** Risk percentages for male offspring. */
  sons: OffspringRisk;
  /** Risk percentages for female offspring. */
  daughters: OffspringRisk;
}

/**
 * Result for a single disease from carrier analysis.
 *
 * Mirrors the dict returned by `analyze_carrier_risk()` in carrier_analysis.py.
 */
export interface CarrierResult {
  /** Disease or condition name (e.g., "Cystic Fibrosis (F508del)"). */
  condition: string;
  /** Gene symbol (e.g., "CFTR"). */
  gene: string;
  /** Severity rating: "high", "moderate", or "low". */
  severity: 'high' | 'moderate' | 'low';
  /** Human-readable condition description. */
  description: string;
  /** Carrier status of parent A. */
  parentAStatus: CarrierStatus;
  /** Carrier status of parent B. */
  parentBStatus: CarrierStatus;
  /** Raw genotype of parent A (e.g., "CT"). Optional for backward compatibility. */
  parentAGenotype?: string;
  /** Raw genotype of parent B (e.g., "CC"). Optional for backward compatibility. */
  parentBGenotype?: string;
  /** Offspring risk percentages. For X-linked, includes sons/daughters sub-objects. */
  offspringRisk: OffspringRisk | XLinkedOffspringRisk;
  /** Overall risk classification. */
  riskLevel: RiskLevel;
  /** SNP identifier (e.g., "rs75030207"). */
  rsid: string;
  /** Inheritance pattern. */
  inheritance: InheritancePattern;
}

// ─── Trait Prediction Types ─────────────────────────────────────────────────

/**
 * A single Punnett square outcome: one possible offspring genotype.
 */
export interface PunnettOutcome {
  /** Offspring genotype (e.g., "AG"). */
  genotype: string;
  /** Predicted phenotype (e.g., "Brown Eyes"). */
  phenotype: string;
  /** Probability as a fraction (0-1). */
  probability: number;
}

/**
 * Prediction result for a single trait.
 *
 * Mirrors the dict returned by `predict_trait()` in trait_prediction.py.
 */
export interface TraitResult {
  /** Trait name (e.g., "Eye Color"). */
  trait: string;
  /** Trait category (e.g., "Physical Appearance", "Behavioral/Personality"). */
  category?: string;
  /** Whether the trait SNP is covered by the user's genotyping chip. */
  chipCoverage?: boolean;
  /** Gene symbol (e.g., "HERC2/OCA2"). */
  gene: string;
  /** SNP identifier. */
  rsid: string;
  /** Chromosome location. */
  chromosome: string;
  /** Human-readable trait description. */
  description: string;
  /** Confidence level: "high", "medium", or "low". */
  confidence: 'high' | 'medium' | 'low';
  /** Inheritance mode (e.g., "codominant", "additive"). */
  inheritance: 'codominant' | 'additive' | 'dominant' | 'recessive';
  /** Status of the prediction. */
  status: 'success' | 'missing' | 'error';
  /** Parent A's genotype at this locus. */
  parentAGenotype: string;
  /** Parent B's genotype at this locus. */
  parentBGenotype: string;
  /**
   * Mapping of phenotype description to probability percentage (0-100).
   * Only present when status is "success".
   */
  offspringProbabilities: Record<string, number>;
  /** Detailed phenotype information (from rich phenotype_map format). */
  phenotypeDetails?: Record<string, {
    description: string;
    probability: string;
  }>;
  /** Notes about unmapped genotypes or issues. */
  note?: string;
}

// ─── Pharmacogenomics Types ─────────────────────────────────────────────────

/**
 * Metabolizer phenotype classification.
 *
 * Maps to metabolizer_status keys in pgx_panel.json.
 */
export type MetabolizerStatus =
  | 'poor_metabolizer'
  | 'intermediate_metabolizer'
  | 'normal_metabolizer'
  | 'rapid_metabolizer'
  | 'ultra_rapid_metabolizer'
  | 'unknown';

/**
 * A single drug recommendation based on metabolizer status.
 *
 * Mirrors entries from `get_drug_recommendations()` in pharmacogenomics.py.
 */
export interface DrugRecommendation {
  /** Drug name (e.g., "Codeine"). */
  drug: string;
  /** Clinical recommendation text. */
  recommendation: string;
  /** Evidence strength: "strong" or "moderate". */
  strength: 'strong' | 'moderate';
  /** Guideline source (e.g., "CPIC" or "DPWG"). */
  source: string;
  /** Drug category (e.g., "Pain", "Psychiatry", "Oncology"). */
  category: string;
}

/**
 * Metabolizer status result for a single gene.
 */
export interface MetabolizerResult {
  /** Metabolizer phenotype classification. */
  status: MetabolizerStatus;
  /** CPIC activity score (sum of allele scores). */
  activityScore: number;
  /** Human-readable description of metabolizer status. */
  description: string;
}

/**
 * PGx analysis result for a single gene, including offspring predictions.
 *
 * Mirrors the per-gene dict from `analyze_pgx()` in pharmacogenomics.py.
 */
export interface PgxGeneResult {
  /** Gene symbol (e.g., "CYP2D6"). */
  gene: string;
  /** Gene description. */
  description: string;
  /** Chromosome location. */
  chromosome: string;
  /** Parent A's analysis. */
  parentA: {
    diplotype: string;
    metabolizerStatus: MetabolizerResult;
    drugRecommendations: DrugRecommendation[];
  };
  /** Parent B's analysis. */
  parentB: {
    diplotype: string;
    metabolizerStatus: MetabolizerResult;
    drugRecommendations: DrugRecommendation[];
  };
  /** Predicted offspring diplotypes with metabolizer status and drug recs. */
  offspringPredictions: Array<{
    diplotype: string;
    probability: number;
    metabolizerStatus: MetabolizerResult;
    drugRecommendations: DrugRecommendation[];
  }>;
}

/**
 * Full PGx analysis result across all genes.
 */
export interface PgxAnalysisResult {
  /** Number of genes analyzed. */
  genesAnalyzed: number;
  /** Active pricing tier. */
  tier: Tier;
  /** Whether the analysis is limited by tier. */
  isLimited: boolean;
  /** Per-gene results. */
  results: Record<string, PgxGeneResult>;
  /** Upgrade message for limited tiers (null for pro). */
  upgradeMessage: string | null;
  /** DTC limitations disclaimer text. */
  disclaimer: string;
}

// ─── Polygenic Risk Score Types ─────────────────────────────────────────────

/**
 * Risk category labels based on percentile thresholds.
 *
 * Maps to `_RISK_THRESHOLDS` in prs.py:
 * - "low": < 20th percentile
 * - "below_average": 20th-40th percentile
 * - "average": 40th-60th percentile
 * - "above_average": 60th-80th percentile
 * - "elevated": 80th-95th percentile
 * - "high": > 95th percentile
 */
export type RiskCategory = 'low' | 'below_average' | 'average' | 'above_average' | 'elevated' | 'high';

/**
 * PRS result for a single parent and condition.
 *
 * Mirrors `_calculate_single_parent_prs()` return in prs.py.
 */
export interface PrsParentResult {
  /** Raw weighted sum of effect allele dosages. */
  rawScore: number;
  /** Standardized z-score (mean=0, std=1). */
  zScore: number;
  /** Population percentile (0-100). */
  percentile: number;
  /** Risk category label. */
  riskCategory: RiskCategory;
  /** Number of SNPs found in user data. */
  snpsFound: number;
  /** Total number of SNPs in the PRS model. */
  snpsTotal: number;
  /** Percentage of SNPs found (0-100). */
  coveragePct: number;
}

/**
 * Predicted offspring PRS range.
 *
 * Mirrors `predict_offspring_prs_range()` return in prs.py.
 */
export interface PrsOffspringPrediction {
  /** Predicted offspring percentile. */
  expectedPercentile: number;
  /** Lower bound percentile (approx -1 SD). */
  rangeLow: number;
  /** Upper bound percentile (approx +1 SD). */
  rangeHigh: number;
  /** Confidence level description. */
  confidence: string;
}

/**
 * PRS result for a single condition, including both parents and offspring.
 */
export interface PrsConditionResult {
  /** Human-readable condition name (e.g., "Coronary Artery Disease"). */
  name: string;
  /** Parent A PRS result. */
  parentA: PrsParentResult;
  /** Parent B PRS result. */
  parentB: PrsParentResult;
  /** Predicted offspring PRS range. */
  offspring: PrsOffspringPrediction;
  /** Note about ancestry bias (from prs_weights.json). */
  ancestryNote: string;
  /** Literature reference. */
  reference: string;
  /**
   * Whether this condition should be hidden for the inferred ancestry group.
   * Set to true when ui_recommendation === "hide" in ancestry_transferability.
   * Only present when inferredAncestry was provided to analyzePrs().
   */
  hidden?: boolean;
  /**
   * Human-readable explanation of why this condition is hidden.
   * Populated from the ancestry_transferability note when hidden === true.
   */
  hiddenReason?: string;
  /**
   * Amber caution note for this condition for the inferred ancestry group.
   * Populated from the ancestry_transferability note when ui_recommendation === "caution".
   */
  cautionNote?: string;
}

/**
 * Full PRS analysis result across all conditions.
 */
export interface PrsAnalysisResult {
  /** Per-condition results keyed by condition ID (e.g., "coronary_artery_disease"). */
  conditions: Record<string, PrsConditionResult>;
  /** Source metadata from prs_weights.json. */
  metadata: PrsMetadata;
  /** Active pricing tier. */
  tier: Tier;
  /** Number of conditions accessible at this tier. */
  conditionsAvailable: number;
  /** Total conditions in the database. */
  conditionsTotal: number;
  /** PRS limitations disclaimer text. */
  disclaimer: string;
  /** Whether this tier has limited PRS access. */
  isLimited: boolean;
  /** Upgrade prompt for limited tiers (null for pro). */
  upgradeMessage: string | null;
}

/** Metadata from prs_weights.json. */
export interface PrsMetadata {
  source: string;
  version: string;
  conditionsCovered: number;
  lastUpdated: string;
  disclaimer: string;
}

// ─── Ethnicity Types ────────────────────────────────────────────────────────

/**
 * Supported population labels.
 *
 * These match the population keys in ethnicity_frequencies.json,
 * which are sourced from gnomAD v4.1.
 */
export type Population =
  | 'African/African American'
  | 'East Asian'
  | 'South Asian'
  | 'European (Non-Finnish)'
  | 'Finnish'
  | 'Latino/Admixed American'
  | 'Ashkenazi Jewish'
  | 'Middle Eastern'
  | 'Global';

/**
 * Result of adjusting a carrier risk for a specific population.
 *
 * Mirrors `adjust_carrier_risk()` return in ethnicity.py.
 */
export interface EthnicityAdjustment {
  /** Original carrier risk (0-1 scale). */
  baseRisk: number;
  /** Risk after population adjustment (0-1 scale, clamped). */
  adjustedRisk: number;
  /** Ratio of population to global frequency. */
  adjustmentFactor: number;
  /** Carrier frequency in the target population. */
  populationFrequency: number;
  /** Global carrier frequency. */
  globalFrequency: number;
}

/**
 * Frequency comparison across all populations for a variant.
 *
 * Mirrors `get_ethnicity_summary()` return in ethnicity.py.
 */
export interface EthnicitySummary {
  /** SNP identifier. */
  rsid: string;
  /** Gene symbol (if present). */
  gene: string | null;
  /** Condition name (if present). */
  condition: string | null;
  /** Mapping of population to carrier frequency (null if not available). */
  frequencies: Record<Population, number | null>;
  /** Global carrier frequency (or null). */
  global: number | null;
  /** Whether the rsID was found in the ethnicity data. */
  found: boolean;
}

// ─── Counseling Types ───────────────────────────────────────────────────────

/**
 * Counseling urgency level.
 *
 * Derived from the counseling recommendation logic in counseling.py.
 */
export type CounselingUrgency = 'high' | 'moderate' | 'informational';

/**
 * Recognized genetic counseling specialties.
 *
 * Matches `COUNSELING_SPECIALTIES` in counseling.py.
 */
export type CounselorSpecialty =
  | 'prenatal'
  | 'carrier_screening'
  | 'cancer'
  | 'cardiovascular'
  | 'pediatric'
  | 'neurogenetics'
  | 'pharmacogenomics'
  | 'general';

/**
 * Key finding extracted from carrier results for the counseling summary.
 */
export interface CounselingKeyFinding {
  condition: string;
  gene: string;
  riskLevel: RiskLevel;
  parentAStatus: CarrierStatus;
  parentBStatus: CarrierStatus;
  inheritance: InheritancePattern;
}

/**
 * Counseling referral result.
 *
 * Mirrors `generate_referral_summary()` return in counseling.py.
 */
export interface CounselingResult {
  /** Whether counseling is recommended. */
  recommend: boolean;
  /** Urgency level derived from the severity of findings. */
  urgency: CounselingUrgency;
  /** Human-readable reasons for the recommendation. */
  reasons: string[];
  /** NSGC counselor finder URL. */
  nsgcUrl: string;
  /** Summary text (null for free tier). */
  summaryText: string | null;
  /** Key findings (null for free tier). */
  keyFindings: CounselingKeyFinding[] | null;
  /** Recommended counseling specialties (null for free tier). */
  recommendedSpecialties: CounselorSpecialty[] | null;
  /** Referral letter text (only for pro tier). */
  referralLetter: string | null;
  /** Upgrade prompt for limited tiers (null for premium/pro). */
  upgradeMessage: string | null;
}

// ─── Coverage & Chip Detection Types ────────────────────────────────────────

/**
 * Per-disease coverage detail — how many target variants were genotyped for one disease.
 */
export interface DiseaseCoverage {
  /** How many of the disease's target variants were found in the file. */
  variantsTested: number;
  /** Total target variants for this disease. */
  variantsTotal: number;
  /** Coverage percentage (0-100). */
  coveragePct: number;
  /** Whether coverage is sufficient for meaningful analysis. */
  isSufficient: boolean;
  /** Total pathogenic variants in ClinVar for this disease. */
  totalKnownVariants?: number;
  /** Confidence level based on coverage percentage. */
  confidenceLevel?: 'high' | 'moderate' | 'low' | 'insufficient';
}

/**
 * Per-disease coverage metrics — how many target variants were actually genotyped.
 */
export interface CoverageMetrics {
  /** Total diseases in panel. */
  totalDiseases: number;
  /** Diseases with at least one variant genotyped. */
  diseasesWithCoverage: number;
  /** Per-disease detail (keyed by disease condition name). */
  perDisease: Record<string, DiseaseCoverage>;
}

/**
 * Detected chip/array information.
 */
export interface ChipVersion {
  /** Provider name (e.g., "23andMe", "AncestryDNA"). */
  provider: string;
  /** Version string (e.g., "v5", "GSA v3"). */
  version: string;
  /** Total SNP count on the chip. */
  snpCount: number;
  /** Confidence of detection (0-1). */
  confidence: number;
}

/** Genome build/assembly. */
export type GenomeBuild = 'GRCh37' | 'GRCh38' | 'unknown';

/**
 * Metadata extracted from a parsed genetic data file.
 *
 * Summarizes provider, chip, build, SNP count, and detected ancestry
 * for a single file after parsing and detection.
 */
export interface FileMetadata {
  /** Provider name (e.g., "23andMe", "AncestryDNA"), or null if unknown. */
  provider: string | null;
  /** Detected chip/array version, or null if undetected. */
  chipVersion: ChipVersion | null;
  /** Detected or assumed genome build. */
  genomeBuild: GenomeBuild;
  /** Total number of valid SNPs extracted. */
  snpCount: number;
  /** Detected population/ancestry, or null if not determined. */
  detectedAncestry: Population | null;
}

// ─── Couple Analysis Types ───────────────────────────────────────────────────

/**
 * Summary of a couple-mode analysis, grouping both parents' file info
 * and high-level offspring risk statistics.
 */
export interface CoupleAnalysis {
  /** Parent A file metadata. */
  parentA: { fileFormat: FileFormat; snpCount: number; genomeBuild: GenomeBuild };
  /** Parent B file metadata. */
  parentB: { fileFormat: FileFormat; snpCount: number; genomeBuild: GenomeBuild };
  /** High-level offspring risk summary. */
  offspringSummary: {
    /** Number of conditions classified as high risk. */
    highRiskConditions: number;
    /** Number of conditions where at least one parent is a carrier. */
    carrierRiskConditions: number;
    /** Total number of conditions evaluated. */
    totalConditionsAnalyzed: number;
  };
}

// ─── Full Analysis Result ───────────────────────────────────────────────────

/**
 * Complete analysis result combining all modules.
 *
 * This is the top-level result object that the frontend receives
 * after a full parent pair analysis.
 */
export interface FullAnalysisResult {
  /** Carrier analysis results, sorted by risk (highest first). */
  carrier: CarrierResult[];
  /** Trait prediction results. */
  traits: TraitResult[];
  /** Pharmacogenomics results. */
  pgx: PgxAnalysisResult;
  /** Polygenic risk scores. */
  prs: PrsAnalysisResult;
  /** Counseling recommendation. */
  counseling: CounselingResult;
  /** Analysis metadata. */
  metadata: {
    parent1Format: FileFormat;
    parent2Format: FileFormat;
    parent1SnpCount: number;
    parent2SnpCount: number;
    analysisTimestamp: string;
    engineVersion: string;
    tier: Tier;
    /** Data version for stale-results detection. Optional for backwards compat. */
    dataVersion?: string;
  };
  /** True if analyzing two parents, false for single-parent mode. */
  coupleMode: boolean;
  /** Per-disease coverage statistics. */
  coverageMetrics: CoverageMetrics;
  /** Detected chip/array info, or null if undetected. */
  chipVersion: ChipVersion | null;
  /** Detected or assumed genome build. */
  genomeBuild: GenomeBuild;
  /** Couple-mode analysis summary (only present when coupleMode is true). */
  coupleAnalysis?: CoupleAnalysis;
  /** Parsed file metadata for the primary input file. */
  fileMetadata?: FileMetadata;
}

// ─── Error Code Types ────────────────────────────────────────────────────────

/**
 * Standardized error codes for the genetics engine.
 *
 * Used in WorkerResponse error messages to allow programmatic error handling.
 */
export type GeneticsErrorCode =
  | 'MISSING_DATA'
  | 'PARSE_ERROR'
  | 'BUILD_MISMATCH'
  | 'UNSUPPORTED_FORMAT'
  | 'FILE_TOO_LARGE'
  | 'INVALID_GENOTYPE'
  | 'DECOMPRESSION_FAILED'
  | 'ANALYSIS_CANCELLED'
  | 'MEMORY_EXCEEDED'
  | 'UNKNOWN_ERROR'
  | 'ANALYSIS_ERROR'
  | 'PARSE_STREAM_ERROR'
  | 'DECOMPRESS_ERROR'
  | 'CANCELLED'
  | 'CANCEL_ACK'
  | 'UNKNOWN_REQUEST'
  | 'WORKER_BUSY';

// ─── Web Worker Messages ────────────────────────────────────────────────────

/**
 * Configuration for the genetics Web Worker.
 */
export interface WorkerConfig {
  /** Maximum memory usage in bytes (default: 500MB desktop, 50MB mobile). */
  maxMemory: number;
  /** Whether to process files sequentially (mobile) or in parallel (desktop). */
  sequential: boolean;
  /** Maximum decompression ratio before aborting (default: 100). */
  maxCompressionRatio: number;
  /** Decompression timeout in ms (default: 30000). */
  decompressionTimeout: number;
}

/**
 * Messages sent from the main thread to the genetics Web Worker.
 */
export type WorkerRequest =
  | { type: 'parse'; files: Array<{ name: string; content: string }> }
  | {
      type: 'analyze';
      parent1Genotypes: Record<string, string>;
      parent2Genotypes: Record<string, string>;
      tier: Tier;
      population?: Population;
    }
  | { type: 'cancel' }
  | { type: 'clear_memory' }
  | { type: 'parse_stream'; file: { name: string; handle: FileSystemFileHandle | File }; format?: FileFormat }
  | { type: 'decompress'; file: { name: string }; maxSize?: number }
  | { type: 'init'; config?: WorkerConfig };

/** Analysis progress stage names for worker progress reporting. */
export type AnalysisStage =
  | 'initializing'
  | 'decompressing'
  | 'parsing'
  | 'strand_harmonization'
  | 'build_detection'
  | 'liftover'
  | 'carrier_analysis'
  | 'trait_prediction'
  | 'pharmacogenomics'
  | 'polygenic_risk'
  | 'ethnicity_adjustment'
  | 'counseling_triage'
  | 'complete';

/**
 * Messages sent from the genetics Web Worker back to the main thread.
 */
export type WorkerResponse =
  | { type: 'parse_progress'; fileIndex: number; progress: number }
  | { type: 'parse_complete'; results: ParseResultSummary[] }
  | { type: 'analysis_progress'; stage: AnalysisStage; progress: number; displayName: string }
  | { type: 'analysis_complete'; results: FullAnalysisResult }
  | { type: 'error'; message: string; code: GeneticsErrorCode }
  | { type: 'stream_progress'; bytesRead: number; totalBytes: number; linesProcessed: number }
  | { type: 'decompress_progress'; bytesIn: number; bytesOut: number; ratio: number }
  | { type: 'decompress_complete'; format: 'zip' | 'gzip' | 'raw'; originalSize: number; decompressedSize: number }
  | { type: 'init_complete'; config: WorkerConfig; dataVersions: Record<string, string> }
  | { type: 'memory_warning'; currentUsage: number; maxAllowed: number; message: string }
  | { type: 'memory_cleared' };

/**
 * Summary of a parsed genetic file (returned from worker after parsing).
 */
export interface ParseResultSummary {
  /** Detected file format. */
  format: FileFormat;
  /** Total number of SNPs extracted. */
  totalSnps: number;
  /** Number of valid SNPs after filtering. */
  validSnps: number;
  /** Number of lines that were skipped. */
  skippedLines: number;
  /** File-format-specific metadata. */
  metadata: Record<string, string>;
}
