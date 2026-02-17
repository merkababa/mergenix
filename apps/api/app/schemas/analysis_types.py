from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

# ─── Configuration ───────────────────────────────────────────────────────────

def to_camel_case(string: str) -> str:
    """
    Convert snake_case to camelCase.
    """
    return to_camel(string)

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel_case,
        populate_by_name=True,
        from_attributes=True,
        use_enum_values=True
    )


# ─── File Format Types ──────────────────────────────────────────────────────

FileFormat = Literal['23andme', 'ancestrydna', 'myheritage', 'vcf', 'unknown']


# ─── Tier Types ─────────────────────────────────────────────────────────────
# Canonical tier values live in app.constants.tiers (Tier IntEnum,
# TIER_FREE/TIER_PREMIUM/TIER_PRO string constants). This Literal alias is
# kept for Pydantic schema validation where typing.Literal is required.

Tier = Literal['free', 'premium', 'pro']


# ─── Inheritance Pattern Types ──────────────────────────────────────────────

# NOTE: 'y_linked' and 'mitochondrial' are reserved for future implementation.
# They are NOT currently supported by the frontend genetics engine.
InheritancePattern = Literal[
    'autosomal_recessive',
    'autosomal_dominant',
    'X-linked',
    'y_linked',
    'mitochondrial',
]


# ─── Carrier Analysis Types ─────────────────────────────────────────────────

CarrierStatus = Literal['normal', 'carrier', 'affected', 'unknown']

RiskLevel = Literal[
    'high_risk',
    'carrier_detected',
    'low_risk',
    'not_tested',
    'potential_risk',
    'coverage_insufficient',
    'unknown'
]

class OffspringRisk(BaseSchema):
    affected: float
    carrier: float
    normal: float

    @model_validator(mode='after')
    def probabilities_must_sum_to_100(self) -> OffspringRisk:
        """Validate that affected + carrier + normal sum to ~100%.

        Allows floating-point tolerance of +/- 0.5 (range 99.5 to 100.5).
        Skips validation if any probability is None.
        """
        probs = [self.affected, self.carrier, self.normal]
        # Defensive: all three fields are required floats, but guard against
        # future schema changes that might make them optional.
        if any(p is None for p in probs):
            return self
        total = sum(probs)
        if not (99.5 <= total <= 100.5):
            raise ValueError(
                f"Offspring risk probabilities must sum to ~100% "
                f"(allowed range: 99.5–100.5), but got "
                f"affected ({self.affected}) + carrier ({self.carrier}) + "
                f"normal ({self.normal}) = {total}"
            )
        return self

class XLinkedOffspringRisk(OffspringRisk):
    sons: OffspringRisk
    daughters: OffspringRisk

class CarrierResult(BaseSchema):
    condition: str
    gene: str
    severity: Literal['high', 'moderate', 'low']
    description: str
    parent_a_status: CarrierStatus = Field(alias="parentAStatus")
    parent_b_status: CarrierStatus = Field(alias="parentBStatus")
    offspring_risk: XLinkedOffspringRisk | OffspringRisk
    risk_level: RiskLevel
    rsid: str
    inheritance: InheritancePattern


# ─── Trait Prediction Types ─────────────────────────────────────────────────

class PunnettOutcome(BaseSchema):
    genotype: str
    phenotype: str
    probability: float

class TraitResult(BaseSchema):
    trait: str
    gene: str
    rsid: str
    chromosome: str
    description: str
    confidence: Literal['high', 'medium', 'low']
    inheritance: Literal['codominant', 'additive', 'dominant', 'recessive']
    status: Literal['success', 'missing', 'error']
    parent_a_genotype: str = Field(alias="parentAGenotype")
    parent_b_genotype: str = Field(alias="parentBGenotype")
    offspring_probabilities: dict[str, float]
    # phenotypeDetails is nested: Record<string, { description: string; probability: string; }>
    phenotype_details: dict[str, dict[str, str]] | None = None
    note: str | None = None


# ─── Pharmacogenomics Types ─────────────────────────────────────────────────

MetabolizerStatus = Literal[
    'poor_metabolizer',
    'intermediate_metabolizer',
    'normal_metabolizer',
    'rapid_metabolizer',
    'ultra_rapid_metabolizer',
    'unknown'
]

class DrugRecommendation(BaseSchema):
    drug: str
    recommendation: str
    strength: Literal['strong', 'moderate']
    source: str
    category: str

class MetabolizerResult(BaseSchema):
    status: MetabolizerStatus
    activity_score: float
    description: str

class ParentPgxAnalysis(BaseSchema):
    diplotype: str
    metabolizer_status: MetabolizerResult
    drug_recommendations: list[DrugRecommendation]

class OffspringPgxPrediction(BaseSchema):
    diplotype: str
    probability: float
    metabolizer_status: MetabolizerResult
    drug_recommendations: list[DrugRecommendation]

class PgxGeneResult(BaseSchema):
    gene: str
    description: str
    chromosome: str
    parent_a: ParentPgxAnalysis = Field(alias="parentA")
    parent_b: ParentPgxAnalysis = Field(alias="parentB")
    offspring_predictions: list[OffspringPgxPrediction]

class PgxAnalysisResult(BaseSchema):
    genes_analyzed: int
    tier: Tier
    is_limited: bool
    results: dict[str, PgxGeneResult]
    upgrade_message: str | None
    disclaimer: str


# ─── Polygenic Risk Score Types ─────────────────────────────────────────────

RiskCategory = Literal['low', 'below_average', 'average', 'above_average', 'elevated', 'high']

class PrsParentResult(BaseSchema):
    raw_score: float
    z_score: float
    percentile: float
    risk_category: RiskCategory
    snps_found: int
    snps_total: int
    coverage_pct: float

class PrsOffspringPrediction(BaseSchema):
    expected_percentile: float
    range_low: float
    range_high: float
    confidence: str

class PrsConditionResult(BaseSchema):
    name: str
    parent_a: PrsParentResult = Field(alias="parentA")
    parent_b: PrsParentResult = Field(alias="parentB")
    offspring: PrsOffspringPrediction
    ancestry_note: str
    reference: str

class PrsMetadata(BaseSchema):
    source: str
    version: str
    conditions_covered: int
    last_updated: str
    disclaimer: str

class PrsAnalysisResult(BaseSchema):
    conditions: dict[str, PrsConditionResult]
    metadata: PrsMetadata
    tier: Tier
    conditions_available: int
    conditions_total: int
    disclaimer: str
    is_limited: bool
    upgrade_message: str | None


# ─── Ethnicity Types ────────────────────────────────────────────────────────

Population = Literal[
    'African/African American',
    'East Asian',
    'South Asian',
    'European (Non-Finnish)',
    'Finnish',
    'Latino/Admixed American',
    'Ashkenazi Jewish',
    'Middle Eastern',
    'Global'
]

class EthnicityAdjustment(BaseSchema):
    base_risk: float
    adjusted_risk: float
    adjustment_factor: float
    population_frequency: float
    global_frequency: float

class EthnicitySummary(BaseSchema):
    rsid: str
    gene: str | None = None
    condition: str | None = None
    frequencies: dict[Population, float | None]
    global_freq: float | None = Field(default=None, alias="global")
    found: bool


# ─── Counseling Types ───────────────────────────────────────────────────────

CounselingUrgency = Literal['high', 'moderate', 'informational']

CounselorSpecialty = Literal[
    'prenatal',
    'carrier_screening',
    'cancer',
    'cardiovascular',
    'pediatric',
    'neurogenetics',
    'pharmacogenomics',
    'general'
]

class CounselingKeyFinding(BaseSchema):
    condition: str
    gene: str
    risk_level: RiskLevel
    parent_a_status: CarrierStatus = Field(alias="parentAStatus")
    parent_b_status: CarrierStatus = Field(alias="parentBStatus")
    inheritance: InheritancePattern

class CounselingResult(BaseSchema):
    recommend: bool
    urgency: CounselingUrgency
    reasons: list[str]
    nsgc_url: str
    summary_text: str | None
    key_findings: list[CounselingKeyFinding] | None
    recommended_specialties: list[CounselorSpecialty] | None
    referral_letter: str | None
    upgrade_message: str | None


# ─── Coverage & Chip Detection Types ────────────────────────────────────────

class DiseaseCoverage(BaseSchema):
    variants_tested: int
    variants_total: int
    coverage_pct: float
    is_sufficient: bool
    total_known_variants: int | None = None
    confidence_level: Literal['high', 'moderate', 'low', 'insufficient'] | None = None

class CoverageMetrics(BaseSchema):
    total_diseases: int
    diseases_with_coverage: int
    per_disease: dict[str, DiseaseCoverage]

class ChipVersion(BaseSchema):
    provider: str
    version: str
    snp_count: int
    confidence: float

GenomeBuild = Literal['GRCh37', 'GRCh38', 'unknown']

class FileMetadata(BaseSchema):
    provider: str | None
    chip_version: ChipVersion | None
    genome_build: GenomeBuild
    snp_count: int
    detected_ancestry: Population | None


# ─── Couple Analysis Types ───────────────────────────────────────────────────

class ParentFileMetadata(BaseSchema):
    file_format: FileFormat
    snp_count: int
    genome_build: GenomeBuild

class OffspringSummary(BaseSchema):
    high_risk_conditions: int
    carrier_risk_conditions: int
    total_conditions_analyzed: int

class CoupleAnalysis(BaseSchema):
    parent_a: ParentFileMetadata = Field(alias="parentA")
    parent_b: ParentFileMetadata = Field(alias="parentB")
    offspring_summary: OffspringSummary


# ─── Full Analysis Result ───────────────────────────────────────────────────

class AnalysisMetadata(BaseSchema):
    parent1_format: FileFormat
    parent2_format: FileFormat
    parent1_snp_count: int
    parent2_snp_count: int
    analysis_timestamp: str
    engine_version: str
    tier: Tier
    data_version: str | None = None

class FullAnalysisResult(BaseSchema):
    carrier: list[CarrierResult]
    traits: list[TraitResult]
    pgx: PgxAnalysisResult
    prs: PrsAnalysisResult
    counseling: CounselingResult
    metadata: AnalysisMetadata
    couple_mode: bool
    coverage_metrics: CoverageMetrics
    chip_version: ChipVersion | None
    genome_build: GenomeBuild
    couple_analysis: CoupleAnalysis | None = None
    file_metadata: FileMetadata | None = None
