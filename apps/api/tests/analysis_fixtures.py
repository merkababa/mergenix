"""
Shared test data for analysis endpoint tests.

Used by test_analysis.py and test_audit_analysis.py to avoid
duplicating the EncryptedEnvelope, summary, and payload builder.
"""

from __future__ import annotations

# A valid EncryptedEnvelope dict matching schemas/encryption.py
VALID_ENCRYPTED_ENVELOPE: dict = {
    "iv": "aabbccddeeff00112233aabb",  # 24 hex chars = 12 bytes
    "ciphertext": "deadbeefcafe1234567890abcdef0123456789abcdef",  # valid hex, even length
    "salt": "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",  # 64 hex = 32 bytes
    "kdf_params": {
        "algorithm": "argon2id",
        "memory_cost": 65536,
        "time_cost": 3,
        "parallelism": 1,
        "salt_length": 32,
        "key_length": 32,
    },
    "version": "v1:argon2id:aes-gcm",
}

SAMPLE_SUMMARY: dict = {
    "trait_count": 1,
    "carrier_count": 1,
    "has_results": True,
    "total_variants_analyzed": 500000,
}


def _save_payload(
    label: str = "Our First Analysis",
    parent1: str = "parent1.vcf",
    parent2: str = "parent2.vcf",
    result_data: dict | None = None,
    summary: dict | None = None,
    consent_given: bool = True,
    data_version: str | None = None,
    password_reset_warning_acknowledged: bool = True,
) -> dict:
    """Build a save-analysis request payload with an EncryptedEnvelope."""
    return {
        "label": label,
        "parent1_filename": parent1,
        "parent2_filename": parent2,
        "result_data": result_data or VALID_ENCRYPTED_ENVELOPE,
        "summary": summary or SAMPLE_SUMMARY,
        "consent_given": consent_given,
        "data_version": data_version,
        "password_reset_warning_acknowledged": password_reset_warning_acknowledged,
    }
