from typing import Any

import pytest
from app.schemas.analysis_types import (
    CarrierResult,
    FullAnalysisResult,
    TraitResult,
)
from pydantic import ValidationError


@pytest.fixture
def valid_full_analysis_result_data() -> dict[str, Any]:
    return {
        "carrier": [
            {
                "condition": "Cystic Fibrosis",
                "gene": "CFTR",
                "severity": "high",
                "description": "A genetic disorder that affects the lungs.",
                "parentAStatus": "carrier",
                "parentBStatus": "normal",
                "offspringRisk": {"affected": 0, "carrier": 50, "normal": 50},
                "riskLevel": "carrier_detected",
                "rsid": "rs113993960",
                "inheritance": "autosomal_recessive",
            }
        ],
        "traits": [
            {
                "trait": "Eye Color",
                "gene": "HERC2/OCA2",
                "rsid": "rs12913832",
                "chromosome": "15",
                "description": "Likely Blue Eyes",
                "confidence": "high",
                "inheritance": "codominant",
                "status": "success",
                "parentAGenotype": "GG",
                "parentBGenotype": "AG",
                "offspringProbabilities": {"Blue": 50, "Brown": 50},
            }
        ],
        "pgx": {
            "genesAnalyzed": 10,
            "tier": "pro",
            "isLimited": False,
            "results": {
                "CYP2D6": {
                    "gene": "CYP2D6",
                    "description": "Metabolizes many drugs",
                    "chromosome": "22",
                    "parentA": {
                        "diplotype": "*1/*1",
                        "metabolizerStatus": {
                            "status": "normal_metabolizer",
                            "activityScore": 2.0,
                            "description": "Normal metabolizer",
                        },
                        "drugRecommendations": [],
                    },
                    "parentB": {
                        "diplotype": "*4/*4",
                        "metabolizerStatus": {
                            "status": "poor_metabolizer",
                            "activityScore": 0.0,
                            "description": "Poor metabolizer",
                        },
                        "drugRecommendations": [
                            {
                                "drug": "Codeine",
                                "recommendation": "Avoid",
                                "strength": "strong",
                                "source": "CPIC",
                                "category": "Pain",
                            }
                        ],
                    },
                    "offspringPredictions": [
                        {
                            "diplotype": "*1/*4",
                            "probability": 100,
                            "metabolizerStatus": {
                                "status": "intermediate_metabolizer",
                                "activityScore": 1.0,
                                "description": "Intermediate metabolizer",
                            },
                            "drugRecommendations": [],
                        }
                    ],
                }
            },
            "upgradeMessage": None,
            "disclaimer": "Standard disclaimer",
        },
        "prs": {
            "conditions": {
                "t2d": {
                    "name": "Type 2 Diabetes",
                    "parentA": {
                        "rawScore": 1.2,
                        "zScore": 0.5,
                        "percentile": 60,
                        "riskCategory": "average",
                        "snpsFound": 100,
                        "snpsTotal": 120,
                        "coveragePct": 83.3,
                    },
                    "parentB": {
                        "rawScore": 0.8,
                        "zScore": -0.2,
                        "percentile": 40,
                        "riskCategory": "average",
                        "snpsFound": 98,
                        "snpsTotal": 120,
                        "coveragePct": 81.6,
                    },
                    "offspring": {"expectedPercentile": 50, "rangeLow": 30, "rangeHigh": 70, "confidence": "moderate"},
                    "ancestryNote": "Based on European data",
                    "reference": "Nature 2020",
                }
            },
            "metadata": {
                "source": "PGS Catalog",
                "version": "1.0",
                "conditionsCovered": 5,
                "lastUpdated": "2023-01-01",
                "disclaimer": "Standard PRS disclaimer",
            },
            "tier": "pro",
            "conditionsAvailable": 5,
            "conditionsTotal": 10,
            "disclaimer": "PRS disclaimer",
            "isLimited": False,
            "upgradeMessage": None,
        },
        "counseling": {
            "recommend": True,
            "urgency": "moderate",
            "reasons": ["Carrier detected"],
            "nsgcUrl": "https://www.nsgc.org",
            "summaryText": "Consult a counselor",
            "keyFindings": [
                {
                    "condition": "Cystic Fibrosis",
                    "gene": "CFTR",
                    "riskLevel": "carrier_detected",
                    "parentAStatus": "carrier",
                    "parentBStatus": "normal",
                    "inheritance": "autosomal_recessive",
                }
            ],
            "recommendedSpecialties": ["carrier_screening"],
            "referralLetter": "To whom it may concern...",
            "upgradeMessage": None,
        },
        "metadata": {
            "parent1Format": "23andme",
            "parent2Format": "ancestrydna",
            "parent1SnpCount": 600000,
            "parent2SnpCount": 650000,
            "analysisTimestamp": "2023-10-27T10:00:00Z",
            "engineVersion": "1.0.0",
            "tier": "pro",
            "dataVersion": "2023.10",
        },
        "coupleMode": True,
        "coverageMetrics": {
            "totalDiseases": 100,
            "diseasesWithCoverage": 95,
            "perDisease": {
                "Cystic Fibrosis": {
                    "variantsTested": 50,
                    "variantsTotal": 60,
                    "coveragePct": 83.3,
                    "isSufficient": True,
                    "confidenceLevel": "high",
                }
            },
        },
        "chipVersion": {"provider": "23andMe", "version": "v5", "snpCount": 640000, "confidence": 0.99},
        "genomeBuild": "GRCh37",
        "coupleAnalysis": {
            "parentA": {"fileFormat": "23andme", "snpCount": 600000, "genomeBuild": "GRCh37"},
            "parentB": {"fileFormat": "ancestrydna", "snpCount": 650000, "genomeBuild": "GRCh37"},
            "offspringSummary": {"highRiskConditions": 0, "carrierRiskConditions": 1, "totalConditionsAnalyzed": 100},
        },
        "fileMetadata": {
            "provider": "23andMe",
            "chipVersion": {"provider": "23andMe", "version": "v5", "snpCount": 640000, "confidence": 0.99},
            "genomeBuild": "GRCh37",
            "snpCount": 600000,
            "detectedAncestry": "European (Non-Finnish)",
        },
    }


def test_full_analysis_result_validation(valid_full_analysis_result_data):
    """Test that a valid dictionary parses into FullAnalysisResult."""
    model = FullAnalysisResult(**valid_full_analysis_result_data)
    # Check boolean field alias
    assert model.couple_mode is True
    # Check nested model access via snake_case
    assert model.metadata.tier == "pro"
    assert len(model.carrier) == 1
    assert model.carrier[0].condition == "Cystic Fibrosis"
    # Check camelCase aliasing worked for parsing
    assert model.carrier[0].risk_level == "carrier_detected"


def test_enum_validation():
    """Test that invalid enum values raise ValidationError."""
    # Test invalid CarrierStatus
    data = {
        "condition": "Cystic Fibrosis",
        "gene": "CFTR",
        "severity": "high",
        "description": "desc",
        "parentAStatus": "INVALID_STATUS",  # Invalid
        "parentBStatus": "normal",
        "offspringRisk": {"affected": 0, "carrier": 0, "normal": 100},
        "riskLevel": "low_risk",
        "rsid": "rs1",
        "inheritance": "autosomal_recessive",
    }
    with pytest.raises(ValidationError) as excinfo:
        CarrierResult(**data)
    assert "Input should be 'normal', 'carrier', 'affected' or 'unknown'" in str(excinfo.value)


def test_camel_case_alias(valid_full_analysis_result_data):
    """Test that field aliases work (input is camelCase, model has snake_case fields but aliases match)."""
    model = FullAnalysisResult(**valid_full_analysis_result_data)

    # Access via snake_case attribute
    assert model.couple_mode is True
    assert model.chip_version.provider == "23andMe"

    # Verify serialization back to camelCase
    json_output = model.model_dump(by_alias=True)
    assert "coupleMode" in json_output
    assert "chipVersion" in json_output
    assert "offspringRisk" in json_output["carrier"][0]


def test_missing_required_field(valid_full_analysis_result_data):
    del valid_full_analysis_result_data["carrier"]
    with pytest.raises(ValidationError):
        FullAnalysisResult(**valid_full_analysis_result_data)


def test_optional_fields():
    """Test that optional fields can be None or omitted."""
    data = {
        "trait": "Test",
        "gene": "G",
        "rsid": "rs1",
        "chromosome": "1",
        "description": "D",
        "confidence": "high",
        "inheritance": "dominant",
        "status": "success",
        "parentAGenotype": "AA",
        "parentBGenotype": "AB",
        "offspringProbabilities": {"A": 100},
        # phenotypeDetails and note are missing
    }
    model = TraitResult(**data)
    assert model.phenotype_details is None
    assert model.note is None


# ── OffspringRisk Probability Validator Boundary Tests ────────────────────


def test_offspring_risk_valid_sum():
    """Probabilities summing to exactly 100 should pass."""
    from app.schemas.analysis_types import OffspringRisk

    risk = OffspringRisk(affected=25, carrier=50, normal=25)
    assert risk.affected == 25


def test_offspring_risk_rejects_low_sum():
    """Probabilities summing below tolerance should be rejected."""
    from app.schemas.analysis_types import OffspringRisk

    with pytest.raises(ValidationError):
        OffspringRisk(affected=25, carrier=50, normal=23)  # sum=98


def test_offspring_risk_rejects_high_sum():
    """Probabilities summing above tolerance should be rejected."""
    from app.schemas.analysis_types import OffspringRisk

    with pytest.raises(ValidationError):
        OffspringRisk(affected=25, carrier=50, normal=27)  # sum=102


def test_offspring_risk_requires_all_fields():
    """All three probability fields (affected, carrier, normal) are required.

    The model_validator contains a defensive None guard for future
    optionality, but the current schema enforces all fields as required
    floats.  Omitting any field should raise a ValidationError.
    """
    from app.schemas.analysis_types import OffspringRisk

    with pytest.raises(ValidationError, match="normal"):
        OffspringRisk(affected=25, carrier=50)  # missing normal


# ── XLinkedOffspringRisk Nested Validation Tests ─────────────────────────


def test_x_linked_offspring_risk_nested_validation():
    """XLinkedOffspringRisk should validate nested sons/daughters probabilities."""
    from app.schemas.analysis_types import OffspringRisk, XLinkedOffspringRisk

    # Valid: all sums = 100
    risk = XLinkedOffspringRisk(
        affected=25,
        carrier=50,
        normal=25,
        sons=OffspringRisk(affected=50, carrier=0, normal=50),
        daughters=OffspringRisk(affected=0, carrier=100, normal=0),
    )
    assert risk.sons.affected == 50


def test_x_linked_offspring_risk_nested_invalid_sum():
    """XLinkedOffspringRisk should reject nested risks with invalid sums."""
    from app.schemas.analysis_types import OffspringRisk, XLinkedOffspringRisk

    with pytest.raises(ValidationError):
        XLinkedOffspringRisk(
            affected=25,
            carrier=50,
            normal=25,
            sons=OffspringRisk(affected=50, carrier=0, normal=60),  # sum=110
            daughters=OffspringRisk(affected=0, carrier=100, normal=0),
        )
