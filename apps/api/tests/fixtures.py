"""
Shared test fixture data for the Mergenix API test suite.

Contains a valid FullAnalysisResult-shaped dict that conforms to the
strict schema in app/schemas/analysis_types.py.  Reused across test
modules that build SaveAnalysisRequest payloads.

Uses snake_case field names (populate_by_name=True in BaseSchema).
"""

from __future__ import annotations

VALID_FULL_ANALYSIS_RESULT: dict = {
    "carrier": [
        {
            "condition": "Cystic Fibrosis",
            "gene": "CFTR",
            "severity": "high",
            "description": "Autosomal recessive condition affecting the lungs.",
            "parent_a_status": "carrier",
            "parent_b_status": "normal",
            "offspring_risk": {
                "affected": 0.0,
                "carrier": 50.0,
                "normal": 50.0,
            },
            "risk_level": "carrier_detected",
            "rsid": "rs75030207",
            "inheritance": "autosomal_recessive",
        }
    ],
    "traits": [
        {
            "trait": "Eye Color",
            "gene": "HERC2/OCA2",
            "rsid": "rs12913832",
            "chromosome": "15",
            "description": "Determines eye pigmentation.",
            "confidence": "high",
            "inheritance": "codominant",
            "status": "success",
            "parent_a_genotype": "AG",
            "parent_b_genotype": "GG",
            "offspring_probabilities": {"brown": 0.75, "blue": 0.25},
            "phenotype_details": None,
            "note": None,
        }
    ],
    "pgx": {
        "genes_analyzed": 1,
        "tier": "free",
        "is_limited": True,
        "results": {
            "CYP2D6": {
                "gene": "CYP2D6",
                "description": "Metabolizes ~25% of prescription drugs.",
                "chromosome": "22",
                "parent_a": {
                    "diplotype": "*1/*1",
                    "metabolizer_status": {
                        "status": "normal_metabolizer",
                        "activity_score": 2.0,
                        "description": "Normal metabolizer.",
                    },
                    "drug_recommendations": [
                        {
                            "drug": "Codeine",
                            "recommendation": "Use label-recommended dose.",
                            "strength": "strong",
                            "source": "CPIC",
                            "category": "analgesic",
                        }
                    ],
                },
                "parent_b": {
                    "diplotype": "*1/*2",
                    "metabolizer_status": {
                        "status": "normal_metabolizer",
                        "activity_score": 2.0,
                        "description": "Normal metabolizer.",
                    },
                    "drug_recommendations": [],
                },
                "offspring_predictions": [
                    {
                        "diplotype": "*1/*1",
                        "probability": 50.0,
                        "metabolizer_status": {
                            "status": "normal_metabolizer",
                            "activity_score": 2.0,
                            "description": "Normal metabolizer.",
                        },
                        "drug_recommendations": [],
                    }
                ],
            }
        },
        "upgrade_message": None,
        "disclaimer": "For informational purposes only.",
    },
    "prs": {
        "conditions": {
            "type_2_diabetes": {
                "name": "Type 2 Diabetes",
                "parent_a": {
                    "raw_score": 0.5,
                    "z_score": 0.1,
                    "percentile": 55.0,
                    "risk_category": "average",
                    "snps_found": 50,
                    "snps_total": 100,
                    "coverage_pct": 50.0,
                },
                "parent_b": {
                    "raw_score": 0.3,
                    "z_score": -0.2,
                    "percentile": 45.0,
                    "risk_category": "average",
                    "snps_found": 48,
                    "snps_total": 100,
                    "coverage_pct": 48.0,
                },
                "offspring": {
                    "expected_percentile": 50.0,
                    "range_low": 30.0,
                    "range_high": 70.0,
                    "confidence": "moderate",
                },
                "ancestry_note": "Based on European reference panel.",
                "reference": "PGS000014",
            }
        },
        "metadata": {
            "source": "PGS Catalog",
            "version": "2024-01",
            "conditions_covered": 1,
            "last_updated": "2024-01-15",
            "disclaimer": "For research purposes only.",
        },
        "tier": "free",
        "conditions_available": 1,
        "conditions_total": 10,
        "disclaimer": "Not a medical diagnosis.",
        "is_limited": True,
        "upgrade_message": None,
    },
    "counseling": {
        "recommend": False,
        "urgency": "informational",
        "reasons": ["No high-risk conditions detected."],
        "nsgc_url": "https://findageneticcounselor.nsgc.org",
        "summary_text": None,
        "key_findings": None,
        "recommended_specialties": None,
        "referral_letter": None,
        "upgrade_message": None,
    },
    "metadata": {
        "parent1_format": "vcf",
        "parent2_format": "vcf",
        "parent1_snp_count": 500000,
        "parent2_snp_count": 480000,
        "analysis_timestamp": "2026-01-15T12:00:00Z",
        "engine_version": "1.0.0",
        "tier": "free",
        "data_version": None,
    },
    "couple_mode": True,
    "coverage_metrics": {
        "total_diseases": 5,
        "diseases_with_coverage": 3,
        "per_disease": {
            "cystic_fibrosis": {
                "variants_tested": 10,
                "variants_total": 50,
                "coverage_pct": 20.0,
                "is_sufficient": True,
                "total_known_variants": None,
                "confidence_level": None,
            }
        },
    },
    "chip_version": None,
    "genome_build": "GRCh37",
    "couple_analysis": None,
    "file_metadata": None,
}
