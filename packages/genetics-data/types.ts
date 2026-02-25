/**
 * Type definitions for all Mergenix reference data files.
 *
 * Each interface precisely mirrors the JSON structure of the corresponding
 * data file in the legacy data/ directory. Field names, types, and
 * optionality are derived from actual inspection of the JSON data.
 */

// ─── carrier_panel.json ─────────────────────────────────────────────────────

/**
 * A single entry in the carrier disease panel (carrier_panel.json).
 *
 * Each entry represents one rsID + condition pair. The panel covers
 * diseases across multiple categories (count derived from CARRIER_PANEL_COUNT).
 *
 * Field sources verified from data/carrier_panel.json first entry:
 * ```json
 * {
 *   "rsid": "rs75030207",
 *   "gene": "CFTR",
 *   "condition": "Cystic Fibrosis (F508del)",
 *   "inheritance": "autosomal_recessive",
 *   "carrier_frequency": "1 in 25",
 *   "pathogenic_allele": "T",
 *   "reference_allele": "C",
 *   "description": "Progressive disorder...",
 *   "severity": "high",
 *   "prevalence": "1 in 3,500",
 *   "omim_id": "219700",
 *   "category": "Pulmonary",
 *   "sources": [...],
 *   "confidence": "high",
 *   "notes": "..."
 * }
 * ```
 */
export interface CarrierPanelEntry {
  /** SNP identifier (e.g., "rs75030207"). */
  rsid: string;
  /** Gene symbol (e.g., "CFTR"). */
  gene: string;
  /** Disease or condition name (e.g., "Cystic Fibrosis (F508del)"). */
  condition: string;
  /** Inheritance pattern: "autosomal_recessive", "autosomal_dominant", or "X-linked". */
  inheritance: 'autosomal_recessive' | 'autosomal_dominant' | 'X-linked';
  /** Human-readable carrier frequency (e.g., "1 in 25"). */
  carrier_frequency: string;
  /** Disease-causing allele (e.g., "T"). */
  pathogenic_allele: string;
  /** Normal/reference allele (e.g., "C"). */
  reference_allele: string;
  /** Human-readable condition description. */
  description: string;
  /** Severity rating: "high", "moderate", or "low". */
  severity: 'high' | 'moderate' | 'low';
  /** Disease prevalence (e.g., "1 in 3,500"). */
  prevalence: string;
  /** OMIM database identifier (e.g., "219700"). */
  omim_id: string;
  /** Disease category (e.g., "Pulmonary", "Hematologic", "Neurological"). */
  category: string;
  /** Data provenance: array of source references. */
  sources: DataSource[];
  /** Confidence level: "high", "medium", or "low". */
  confidence: 'high' | 'medium' | 'low';
  /** Clinical notes and additional information. */
  notes: string;
  /** Optional disclaimer for partially-testable genes (e.g., CNV limitations). */
  disclaimer?: string;
  /**
   * Coverage tier indicating how well our rsID-based panel covers this gene's
   * known pathogenic variants.
   *
   * - "good": Key pathogenic variants are well-covered by our rsIDs.
   * - "partial": Some key variants covered, but many are missed.
   * - "minimal": Less than 5% of known pathogenic variants are covered.
   * - "untestable": Requires methods beyond SNP genotyping (e.g., repeat expansions, CNV).
   */
  coverage_tier?: 'good' | 'partial' | 'minimal' | 'untestable';
}

/**
 * Metadata for the carrier panel data file.
 */
export interface CarrierPanelMetadata {
  /** Semantic version of the carrier panel data schema. */
  version: string;
  /** ISO 8601 date of the last update (e.g., "2026-02-13"). */
  lastUpdated: string;
  /** Total number of entries in the panel. */
  totalEntries: number;
  /** Data provenance description (e.g., "ClinVar + OMIM + gnomAD"). */
  source: string;
  /** Human-readable description of what this panel covers. */
  description: string;
}

/**
 * Root structure of carrier-panel.json (wrapped format with metadata).
 */
export interface CarrierPanelData {
  /** Panel metadata (version, source, counts). */
  metadata: CarrierPanelMetadata;
  /** Array of carrier panel entries. */
  entries: CarrierPanelEntry[];
}

/**
 * A data source reference (used in carrier_panel.json and trait_snps.json).
 */
export interface DataSource {
  /** Source name or citation. */
  name: string;
  /** URL to the source. */
  url: string;
  /** PubMed ID (only present for literature sources). */
  pmid?: string;
}

// ─── trait_snps.json ────────────────────────────────────────────────────────

/**
 * Allele definitions for a trait SNP.
 */
export interface TraitAlleles {
  /** Reference allele. */
  ref: string;
  /** Alternate allele. */
  alt: string;
}

/**
 * Rich phenotype map value with extended information.
 *
 * This is the format used in the current trait_snps.json:
 * ```json
 * {
 *   "phenotype": "Brown Eyes",
 *   "description": "Very high likelihood of brown eyes (>95%)",
 *   "probability": "high"
 * }
 * ```
 */
export interface PhenotypeMapValue {
  /** Phenotype name (e.g., "Brown Eyes"). */
  phenotype: string;
  /** Human-readable description of this outcome. */
  description: string;
  /** Qualitative probability: "high", "medium", or "low". */
  probability: string;
}

/**
 * A single entry in the trait SNP database (trait_snps.json).
 *
 * Each entry represents one rsID + trait combination. The database
 * contains 412+ trait SNPs with rich phenotype mappings.
 *
 * Field sources verified from data/trait_snps.json first entry:
 * ```json
 * {
 *   "rsid": "rs12913832",
 *   "trait": "Eye Color",
 *   "gene": "HERC2/OCA2",
 *   "chromosome": "15",
 *   "inheritance": "codominant",
 *   "alleles": { "ref": "G", "alt": "A" },
 *   "phenotype_map": { "GG": { "phenotype": "Brown Eyes", ... }, ... },
 *   "description": "Primary determinant...",
 *   "confidence": "high",
 *   "sources": [...],
 *   "notes": "..."
 * }
 * ```
 */
export interface TraitSnpEntry {
  /** SNP identifier (e.g., "rs12913832"). */
  rsid: string;
  /** Trait name (e.g., "Eye Color"). */
  trait: string;
  /** Trait category (e.g., "Physical Appearance", "Behavioral/Personality"). */
  category?: string;
  /** Gene symbol (e.g., "HERC2/OCA2"). */
  gene: string;
  /** Chromosome location (e.g., "15"). */
  chromosome: string;
  /** Inheritance mode (e.g., "codominant", "additive", "dominant", "recessive"). */
  inheritance: string;
  /** Reference and alternate allele definitions. */
  alleles: TraitAlleles;
  /** Mapping of genotype to phenotype outcome (rich format with descriptions). */
  phenotype_map: Record<string, PhenotypeMapValue>;
  /** Human-readable trait description. */
  description: string;
  /** Confidence level: "high", "medium", or "low". */
  confidence: 'high' | 'medium' | 'low';
  /** Data provenance: array of source references. */
  sources: DataSource[];
  /** Clinical notes and additional information. */
  notes: string;
}

// ─── pgx_panel.json ─────────────────────────────────────────────────────────

/**
 * A defining variant for a star allele.
 */
export interface PgxDefiningVariant {
  /** SNP identifier (e.g., "rs3892097"). */
  rsid: string;
  /** Expected genotype for this variant (e.g., "AA", "AG"). */
  genotype: string;
}

/**
 * A star allele definition.
 */
export interface PgxStarAllele {
  /**
   * Variants that define this allele. Empty array for the reference allele (*1).
   * Non-reference alleles have one or more defining variants.
   */
  defining_variants: PgxDefiningVariant[];
  /** Functional classification (e.g., "normal", "no_function", "decreased"). */
  function: string;
  /** CPIC activity score for this allele (0.0 = no function, 1.0 = normal). */
  activity_score: number;
}

/**
 * Metabolizer status definition with activity score range.
 */
export interface PgxMetabolizerDef {
  /** Activity score range [min, max] for this metabolizer status. */
  activity_score_range: [number, number];
  /** Human-readable description of the metabolizer phenotype. */
  description: string;
}

/**
 * Drug-specific information with recommendations by metabolizer status.
 */
export interface PgxDrug {
  /** Drug name (e.g., "Codeine"). */
  name: string;
  /** Drug category (e.g., "Pain", "Psychiatry", "Oncology"). */
  category: string;
  /**
   * Recommendations keyed by metabolizer status.
   * Not all statuses may have recommendations.
   * Example keys: "poor_metabolizer", "ultra_rapid_metabolizer"
   */
  recommendation_by_status: Record<string, string>;
  /** Evidence strength: "strong" or "moderate". */
  strength: 'strong' | 'moderate';
  /** Guideline source: "CPIC" or "DPWG". */
  source: string;
}

/**
 * A pharmacogene definition in the PGx panel.
 */
export interface PgxGeneDefinition {
  /** Gene symbol (e.g., "CYP2D6"). */
  name: string;
  /** Chromosome location (e.g., "22"). */
  chromosome: string;
  /** Gene description. */
  description: string;
  /** List of defining SNP rsIDs for this gene. */
  defining_snps: string[];
  /** Star allele definitions keyed by allele name (e.g., "*1", "*4"). */
  star_alleles: Record<string, PgxStarAllele>;
  /** Metabolizer status definitions keyed by status name. */
  metabolizer_status: Record<string, PgxMetabolizerDef>;
  /** Drugs affected by this gene with recommendations. */
  drugs: PgxDrug[];
}

/**
 * Metadata for the PGx panel.
 */
export interface PgxPanelMetadata {
  /** Data source (e.g., "CPIC Guidelines + PharmGKB"). */
  source: string;
  /** Panel version. */
  version: string;
  /** Number of genes covered. */
  genes_covered: number;
  /** Number of drugs covered. */
  drugs_covered: number;
  /** ISO 8601 date of last update. */
  last_updated: string;
}

/**
 * Root structure of pgx_panel.json.
 */
export interface PgxPanel {
  /** Panel metadata. */
  metadata: PgxPanelMetadata;
  /** Gene definitions keyed by gene symbol. */
  genes: Record<string, PgxGeneDefinition>;
}

// ─── prs_weights.json ───────────────────────────────────────────────────────

/** PRS transferability rating for a specific ancestry. */
export type PrsTransferability = 'validated' | 'moderate' | 'poor' | 'harmful';

/** UI display recommendation based on ancestry transferability. */
export type PrsUiRecommendation = 'standard' | 'caution' | 'warning' | 'hide';

/** Ancestry-specific PRS metadata for a condition. */
export interface PrsAncestryMeta {
  /** Transferability quality of the PRS in this ancestry group. */
  transferability: PrsTransferability;
  /** Recommended UI treatment for displaying PRS results to users of this ancestry. */
  ui_recommendation: PrsUiRecommendation;
  /** Human-readable note explaining the transferability assessment. */
  note: string;
}

/**
 * A single SNP weight in a PRS model.
 */
export interface PrsSnpWeight {
  /** SNP identifier (e.g., "rs10455872"). */
  rsid: string;
  /** Effect allele whose dosage contributes to the score. */
  effect_allele: string;
  /** Effect weight (log odds ratio or beta coefficient). */
  effect_weight: number;
  /** Chromosome location (e.g., "6"). */
  chromosome: string;
  /** Gene region or nearest gene (e.g., "LPA"). */
  gene_region: string;
}

/**
 * PRS model definition for a single condition.
 */
export interface PrsConditionDefinition {
  /** Human-readable condition name (e.g., "Coronary Artery Disease"). */
  name: string;
  /** PGS Catalog identifier (e.g., "PGS000018"). */
  pgs_id: string;
  /** Condition description. */
  description: string;
  /** Population mean for z-score normalization. */
  population_mean: number;
  /** Population standard deviation for z-score normalization. */
  population_std: number;
  /** Note about ancestry bias and applicability. */
  ancestry_note: string;
  /** Literature reference. */
  reference: string;
  /** SNP weights for this condition. */
  snps: PrsSnpWeight[];
  /**
   * Ancestry-specific PRS transferability metadata.
   * Keys are ancestry codes: 'EUR', 'AFR', 'EAS', 'SAS', 'AMR'.
   * Based on R5 research into cross-population PRS performance.
   */
  ancestry_transferability?: Record<string, PrsAncestryMeta>;
}

/**
 * Metadata for the PRS weights database.
 */
export interface PrsWeightsMetadata {
  /** Data source description. */
  source: string;
  /** Database version. */
  version: string;
  /** Number of conditions covered. */
  conditions_covered: number;
  /** ISO 8601 date of last update. */
  last_updated: string;
  /** Usage disclaimer. */
  disclaimer: string;
}

/**
 * Root structure of prs_weights.json.
 */
export interface PrsWeightsData {
  /** Database metadata. */
  metadata: PrsWeightsMetadata;
  /** Condition definitions keyed by condition ID (e.g., "coronary_artery_disease"). */
  conditions: Record<string, PrsConditionDefinition>;
}

// ─── ethnicity_frequencies.json ─────────────────────────────────────────────

/**
 * Ethnicity frequency data for a single variant.
 *
 * Each variant has a gene, condition, and population-specific frequencies.
 * The population keys match the gnomAD v4.1 population labels.
 */
export interface EthnicityVariantFrequencies {
  /** Gene symbol (e.g., "CFTR"). */
  gene: string;
  /** Condition name (e.g., "Cystic Fibrosis (F508del)"). */
  condition: string;
  /** Global carrier frequency. */
  Global: number;
  /** African/African American carrier frequency. */
  'African/African American': number;
  /** East Asian carrier frequency. */
  'East Asian': number;
  /** South Asian carrier frequency. */
  'South Asian': number;
  /** European (Non-Finnish) carrier frequency. */
  'European (Non-Finnish)': number;
  /** Finnish carrier frequency. */
  Finnish: number;
  /** Latino/Admixed American carrier frequency. */
  'Latino/Admixed American': number;
  /** Ashkenazi Jewish carrier frequency. */
  'Ashkenazi Jewish': number;
  /** Middle Eastern carrier frequency. */
  'Middle Eastern': number;
}

/**
 * Metadata for the ethnicity frequency database.
 */
export interface EthnicityFrequenciesMetadata {
  /** Data source (e.g., "gnomAD v4.1"). */
  source: string;
  /** List of population labels. */
  populations: string[];
  /** ISO 8601 date of last update. */
  last_updated: string;
  /** Total number of variants in the database. */
  total_variants: number;
  /** Usage notes. */
  notes: string;
}

/**
 * Root structure of ethnicity_frequencies.json.
 */
export interface EthnicityFrequenciesData {
  /** Database metadata. */
  metadata: EthnicityFrequenciesMetadata;
  /** Variant frequencies keyed by rsID. */
  frequencies: Record<string, EthnicityVariantFrequencies>;
}

// ─── glossary.json ──────────────────────────────────────────────────────────

/**
 * A single glossary entry (glossary.json).
 *
 * Field sources verified from data/glossary.json:
 * ```json
 * {
 *   "term": "Allele",
 *   "definition": "One of the possible versions of a gene...",
 *   "category": "basics",
 *   "related_terms": ["gene", "genotype", "heterozygous", "homozygous"],
 *   "learn_more_url": "https://medlineplus.gov/..."
 * }
 * ```
 */
export interface GlossaryEntry {
  /** Term being defined (e.g., "Allele"). */
  term: string;
  /** Human-readable definition. */
  definition: string;
  /** Category: "basics", "inheritance", "clinical", etc. */
  category: string;
  /** Related glossary terms. */
  related_terms: string[];
  /** URL for further reading. */
  learn_more_url: string;
}

// ─── counseling_providers.json ──────────────────────────────────────────────

/**
 * A genetic counseling provider entry (counseling_providers.json).
 *
 * Field sources verified from data/counseling_providers.json:
 * ```json
 * {
 *   "name": "Dr. Sarah Chen",
 *   "credentials": "MS, CGC",
 *   "specialty": ["prenatal", "carrier_screening"],
 *   "organization": "Bay Area Genetics Center",
 *   "state": "CA",
 *   "city": "San Francisco",
 *   "accepts_telehealth": true,
 *   "nsgc_profile": "https://www.nsgc.org/findageneticcounselor",
 *   "phone": "555-0100",
 *   "notes": "Specializes in reproductive genetics..."
 * }
 * ```
 */
export interface CounselingProviderEntry {
  /** Provider name. */
  name: string;
  /** Professional credentials (e.g., "MS, CGC"). */
  credentials: string;
  /** List of specialties (e.g., ["prenatal", "carrier_screening"]). */
  specialty: string[];
  /** Organization or practice name. */
  organization: string;
  /** US state code (e.g., "CA", "NY"). */
  state: string;
  /** City name. */
  city: string;
  /** Whether the provider offers telehealth. */
  accepts_telehealth: boolean;
  /** NSGC profile URL. */
  nsgc_profile: string;
  /** Phone number. */
  phone: string;
  /** Additional notes about the provider. */
  notes: string;
}

// ─── chip_coverage.json ─────────────────────────────────────────────────────

/** Chip/array provider and version identifier. */
export interface ChipDefinition {
  /** DTC provider name (e.g., "23andMe", "AncestryDNA", "MyHeritage", "FTDNA"). */
  provider: string;
  /** Chip version identifier (e.g., "v3", "v4", "v5"). */
  version: string;
  /** Approximate total SNPs on this chip array. */
  totalSnps: number;
  /** Genome build used by this chip. */
  genomeBuild: 'GRCh37' | 'GRCh38';
  /** Year the chip version was released. */
  releaseYear: number;
}

/** Maps each rsID to which chips include it */
export interface ChipCoverageMap {
  metadata: {
    version: string;
    lastUpdated: string;
    chips: ChipDefinition[];
    description: string;
  };
  /** Key: rsID, Value: array of chip indices (referencing metadata.chips) */
  coverage: Record<string, number[]>;
}

// ─── liftover_coordinates.json ──────────────────────────────────────────────

/** Genomic coordinate for a single build. */
export interface GenomicCoordinate {
  /** Chromosome identifier (e.g., "1", "X", "MT"). */
  chr: string;
  /** 1-based genomic position. */
  pos: number;
  /** Reference allele at this position. */
  ref: string;
  /** Alternate (variant) allele. */
  alt: string;
}

/** Liftover coordinates for a single variant */
export interface LiftoverEntry {
  hg19?: GenomicCoordinate;
  hg38?: GenomicCoordinate;
}

/** Full liftover lookup table */
export interface LiftoverTable {
  metadata: {
    version: string;
    lastUpdated: string;
    source: string;
    totalVariants: number;
    description: string;
  };
  /** Key: rsID, Value: coordinates in both builds */
  snps: Record<string, LiftoverEntry>;
}
