"""
Tests for the EncryptedEnvelope and KdfParams Pydantic schemas.

These schemas define the contract for Zero-Knowledge Encryption blob storage.
The client encrypts genetic data with AES-256-GCM using a key derived from
the user's password via Argon2id. The server stores these opaque blobs
without ever seeing plaintext.
"""

from __future__ import annotations

import pytest
from app.schemas.encryption import EncryptedEnvelope, KdfParams
from pydantic import ValidationError

# ── Helpers ──────────────────────────────────────────────────────────────


def _valid_kdf_params() -> dict:
    """Return a minimal valid KdfParams dict."""
    return {
        "algorithm": "argon2id",
        "memory_cost": 65536,
        "time_cost": 3,
        "parallelism": 1,
        "salt_length": 16,
        "key_length": 32,
    }


def _valid_envelope() -> dict:
    """Return a minimal valid EncryptedEnvelope dict."""
    return {
        "iv": "aabbccdd11223344aabbccdd",  # 24 hex chars = 12 bytes
        "ciphertext": "deadbeef" * 4,  # 32 hex chars
        "salt": "aa" * 16,  # 32 hex chars = 16 bytes
        "kdf_params": _valid_kdf_params(),
        "version": "v1:argon2id:aes-gcm",
    }


# ── KdfParams tests ─────────────────────────────────────────────────────


class TestKdfParams:
    """Tests for the KdfParams model."""

    def test_valid_kdf_params(self) -> None:
        """A correctly populated KdfParams should parse without error."""
        params = KdfParams(**_valid_kdf_params())
        assert params.algorithm == "argon2id"
        assert params.memory_cost == 65536
        assert params.time_cost == 3
        assert params.parallelism == 1
        assert params.salt_length == 16
        assert params.key_length == 32

    def test_memory_cost_too_low(self) -> None:
        """memory_cost below 65536 (64 MiB) must be rejected."""
        data = _valid_kdf_params()
        data["memory_cost"] = 65535
        with pytest.raises(ValidationError) as exc_info:
            KdfParams(**data)
        errors = exc_info.value.errors()
        assert any("memory_cost" in str(e) for e in errors)

    def test_memory_cost_at_minimum(self) -> None:
        """memory_cost exactly at 65536 should be accepted."""
        data = _valid_kdf_params()
        data["memory_cost"] = 65536
        params = KdfParams(**data)
        assert params.memory_cost == 65536

    def test_time_cost_too_low(self) -> None:
        """time_cost below 3 must be rejected."""
        data = _valid_kdf_params()
        data["time_cost"] = 2
        with pytest.raises(ValidationError) as exc_info:
            KdfParams(**data)
        errors = exc_info.value.errors()
        assert any("time_cost" in str(e) for e in errors)

    def test_time_cost_at_minimum(self) -> None:
        """time_cost exactly at 3 should be accepted."""
        data = _valid_kdf_params()
        data["time_cost"] = 3
        params = KdfParams(**data)
        assert params.time_cost == 3

    def test_parallelism_too_low(self) -> None:
        """parallelism below 1 must be rejected."""
        data = _valid_kdf_params()
        data["parallelism"] = 0
        with pytest.raises(ValidationError) as exc_info:
            KdfParams(**data)
        errors = exc_info.value.errors()
        assert any("parallelism" in str(e) for e in errors)

    def test_parallelism_at_minimum(self) -> None:
        """parallelism exactly at 1 should be accepted."""
        data = _valid_kdf_params()
        data["parallelism"] = 1
        params = KdfParams(**data)
        assert params.parallelism == 1

    def test_key_length_not_32(self) -> None:
        """key_length must be exactly 32 (AES-256)."""
        for bad_length in [16, 24, 64, 0, 31, 33]:
            data = _valid_kdf_params()
            data["key_length"] = bad_length
            with pytest.raises(ValidationError) as exc_info:
                KdfParams(**data)
            errors = exc_info.value.errors()
            assert any("key_length" in str(e) for e in errors), (
                f"key_length={bad_length} should have been rejected"
            )

    def test_key_length_exactly_32(self) -> None:
        """key_length of exactly 32 should be accepted."""
        data = _valid_kdf_params()
        data["key_length"] = 32
        params = KdfParams(**data)
        assert params.key_length == 32


# ── EncryptedEnvelope tests ──────────────────────────────────────────────


class TestEncryptedEnvelope:
    """Tests for the EncryptedEnvelope model."""

    def test_valid_envelope(self) -> None:
        """A correctly populated EncryptedEnvelope should parse without error."""
        envelope = EncryptedEnvelope(**_valid_envelope())
        assert envelope.iv == "aabbccdd11223344aabbccdd"
        assert envelope.version == "v1:argon2id:aes-gcm"
        assert envelope.kdf_params.algorithm == "argon2id"

    # ── IV validation ────────────────────────────────────────────────────

    def test_iv_valid_24_hex_chars(self) -> None:
        """24 hex chars (12 bytes) is the minimum valid IV length."""
        data = _valid_envelope()
        data["iv"] = "aa" * 12  # 24 hex chars
        envelope = EncryptedEnvelope(**data)
        assert len(envelope.iv) == 24

    def test_iv_valid_32_hex_chars(self) -> None:
        """32 hex chars (16 bytes) is the maximum valid IV length."""
        data = _valid_envelope()
        data["iv"] = "bb" * 16  # 32 hex chars
        envelope = EncryptedEnvelope(**data)
        assert len(envelope.iv) == 32

    def test_iv_too_short(self) -> None:
        """IV shorter than 24 hex chars must be rejected."""
        data = _valid_envelope()
        data["iv"] = "aa" * 11  # 22 hex chars
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any("iv" in str(e).lower() for e in errors)

    def test_iv_too_long(self) -> None:
        """IV longer than 32 hex chars must be rejected."""
        data = _valid_envelope()
        data["iv"] = "aa" * 17  # 34 hex chars
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any("iv" in str(e).lower() for e in errors)

    def test_iv_non_hex_chars(self) -> None:
        """IV with non-hex characters must be rejected."""
        data = _valid_envelope()
        data["iv"] = "gghhiijjkkllmmnnooppqqrr"  # 24 chars, but 'g'-'r' aren't hex
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any("iv" in str(e).lower() or "hex" in str(e).lower() for e in errors)

    def test_iv_odd_length(self) -> None:
        """IV with odd number of hex chars must be rejected (not valid bytes)."""
        data = _valid_envelope()
        data["iv"] = "a" * 25  # 25 hex chars — odd, so invalid byte boundary
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert len(errors) > 0

    # ── Ciphertext validation ────────────────────────────────────────────

    def test_ciphertext_valid(self) -> None:
        """A normal-size hex-encoded ciphertext should be accepted."""
        data = _valid_envelope()
        data["ciphertext"] = "abcdef0123456789" * 10  # 160 hex chars
        envelope = EncryptedEnvelope(**data)
        assert envelope.ciphertext == "abcdef0123456789" * 10

    def test_ciphertext_empty(self) -> None:
        """Empty ciphertext must be rejected."""
        data = _valid_envelope()
        data["ciphertext"] = ""
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any("ciphertext" in str(e).lower() for e in errors)

    def test_ciphertext_non_hex(self) -> None:
        """Ciphertext with non-hex characters must be rejected."""
        data = _valid_envelope()
        data["ciphertext"] = "xyz123notvalidhex!!@@##$$"
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any(
            "ciphertext" in str(e).lower() or "hex" in str(e).lower()
            for e in errors
        )

    def test_ciphertext_too_large(self) -> None:
        """Ciphertext exceeding 40MB (hex) must be rejected (~20MB binary)."""
        data = _valid_envelope()
        # 40_000_001 hex chars (just over 40MB)
        data["ciphertext"] = "aa" * 20_000_001  # 40_000_002 hex chars
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any("ciphertext" in str(e).lower() for e in errors)

    def test_ciphertext_at_max_size(self) -> None:
        """Ciphertext at exactly 40MB hex (40_000_000 chars) should be accepted."""
        data = _valid_envelope()
        data["ciphertext"] = "aa" * 20_000_000  # 40_000_000 hex chars
        envelope = EncryptedEnvelope(**data)
        assert len(envelope.ciphertext) == 40_000_000

    # ── Salt validation ──────────────────────────────────────────────────

    def test_salt_valid_32_hex_chars(self) -> None:
        """32 hex chars (16 bytes) is the minimum valid salt length."""
        data = _valid_envelope()
        data["salt"] = "cc" * 16  # 32 hex chars
        envelope = EncryptedEnvelope(**data)
        assert len(envelope.salt) == 32

    def test_salt_valid_64_hex_chars(self) -> None:
        """64 hex chars (32 bytes) is the maximum valid salt length."""
        data = _valid_envelope()
        data["salt"] = "dd" * 32  # 64 hex chars
        envelope = EncryptedEnvelope(**data)
        assert len(envelope.salt) == 64

    def test_salt_too_short(self) -> None:
        """Salt shorter than 32 hex chars must be rejected."""
        data = _valid_envelope()
        data["salt"] = "ee" * 15  # 30 hex chars
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any("salt" in str(e).lower() for e in errors)

    def test_salt_too_long(self) -> None:
        """Salt longer than 64 hex chars must be rejected."""
        data = _valid_envelope()
        data["salt"] = "ff" * 33  # 66 hex chars
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any("salt" in str(e).lower() for e in errors)

    def test_salt_non_hex(self) -> None:
        """Salt with non-hex characters must be rejected."""
        data = _valid_envelope()
        data["salt"] = "zz" * 16  # 32 chars, but 'z' isn't hex
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any("salt" in str(e).lower() or "hex" in str(e).lower() for e in errors)

    # ── Version validation ───────────────────────────────────────────────

    def test_version_valid_v1(self) -> None:
        """Standard v1 version string should be accepted."""
        data = _valid_envelope()
        data["version"] = "v1:argon2id:aes-gcm"
        # Note: aes-gcm has a hyphen. The pattern allows word chars (\w = [a-zA-Z0-9_])
        # but the task spec says pattern v\d+:\w+:\w+. We need to handle hyphens too
        # since "aes-gcm" is the canonical version string.
        # Let's test what the implementation accepts.
        envelope = EncryptedEnvelope(**data)
        assert envelope.version == "v1:argon2id:aes-gcm"

    def test_version_valid_v2(self) -> None:
        """Future version strings like v2 should be accepted."""
        data = _valid_envelope()
        data["version"] = "v2:scrypt:chacha20"
        envelope = EncryptedEnvelope(**data)
        assert envelope.version == "v2:scrypt:chacha20"

    def test_version_missing_v_prefix(self) -> None:
        """Version without 'v' prefix must be rejected."""
        data = _valid_envelope()
        data["version"] = "1:argon2id:aes-gcm"
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any("version" in str(e).lower() for e in errors)

    def test_version_missing_segments(self) -> None:
        """Version with fewer than 3 colon-separated segments must be rejected."""
        data = _valid_envelope()
        data["version"] = "v1:argon2id"
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any("version" in str(e).lower() for e in errors)

    def test_version_empty_string(self) -> None:
        """Empty version string must be rejected."""
        data = _valid_envelope()
        data["version"] = ""
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert len(errors) > 0

    def test_version_extra_segments(self) -> None:
        """Version with extra colon-separated segments must be rejected."""
        data = _valid_envelope()
        data["version"] = "v1:argon2id:aes:gcm"
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any("version" in str(e).lower() for e in errors)

    def test_version_no_digit_after_v(self) -> None:
        """Version 'v' without a digit must be rejected."""
        data = _valid_envelope()
        data["version"] = "v:argon2id:aes-gcm"
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope(**data)
        errors = exc_info.value.errors()
        assert any("version" in str(e).lower() for e in errors)

    # ── Serialization round-trip ─────────────────────────────────────────

    def test_serialization_round_trip(self) -> None:
        """An envelope serialized to dict and back should be identical."""
        original = EncryptedEnvelope(**_valid_envelope())
        as_dict = original.model_dump()
        restored = EncryptedEnvelope(**as_dict)
        assert original == restored

    def test_json_round_trip(self) -> None:
        """An envelope serialized to JSON and back should be identical."""
        original = EncryptedEnvelope(**_valid_envelope())
        as_json = original.model_dump_json()
        restored = EncryptedEnvelope.model_validate_json(as_json)
        assert original == restored

    # ── JSON Schema generation ───────────────────────────────────────────

    def test_json_schema_is_valid(self) -> None:
        """model_json_schema() should return a valid JSON Schema dict."""
        schema = EncryptedEnvelope.model_json_schema()
        assert isinstance(schema, dict)
        assert "properties" in schema
        assert "iv" in schema["properties"]
        assert "ciphertext" in schema["properties"]
        assert "salt" in schema["properties"]
        assert "kdf_params" in schema["properties"]
        assert "version" in schema["properties"]

    def test_kdf_params_json_schema(self) -> None:
        """KdfParams should also produce a valid JSON Schema."""
        schema = KdfParams.model_json_schema()
        assert isinstance(schema, dict)
        assert "properties" in schema
        assert "algorithm" in schema["properties"]
        assert "memory_cost" in schema["properties"]

    # ── Edge cases ───────────────────────────────────────────────────────

    def test_iv_uppercase_hex_accepted(self) -> None:
        """Uppercase hex in IV should be accepted (hex is case-insensitive)."""
        data = _valid_envelope()
        data["iv"] = "AABBCCDD11223344AABBCCDD"
        envelope = EncryptedEnvelope(**data)
        assert envelope.iv == "AABBCCDD11223344AABBCCDD"

    def test_salt_mixed_case_hex_accepted(self) -> None:
        """Mixed-case hex in salt should be accepted."""
        data = _valid_envelope()
        data["salt"] = "AaBbCcDd" * 4  # 32 hex chars
        envelope = EncryptedEnvelope(**data)
        assert len(envelope.salt) == 32

    def test_all_required_fields_missing(self) -> None:
        """Omitting all fields should produce validation errors."""
        with pytest.raises(ValidationError) as exc_info:
            EncryptedEnvelope()  # type: ignore[call-arg]
        errors = exc_info.value.errors()
        # Should have errors for iv, ciphertext, salt, kdf_params, version
        assert len(errors) >= 5

    def test_kdf_params_all_required_fields_missing(self) -> None:
        """Omitting all KdfParams fields should produce validation errors."""
        with pytest.raises(ValidationError) as exc_info:
            KdfParams()  # type: ignore[call-arg]
        errors = exc_info.value.errors()
        # Should have errors for all 6 fields
        assert len(errors) >= 6

    def test_kdf_params_high_memory_cost(self) -> None:
        """Very high memory_cost values should be accepted (no upper cap)."""
        data = _valid_kdf_params()
        data["memory_cost"] = 4_194_304  # 4 GiB
        params = KdfParams(**data)
        assert params.memory_cost == 4_194_304

    def test_kdf_params_high_time_cost(self) -> None:
        """High time_cost values should be accepted."""
        data = _valid_kdf_params()
        data["time_cost"] = 100
        params = KdfParams(**data)
        assert params.time_cost == 100

    def test_kdf_params_high_parallelism(self) -> None:
        """High parallelism values should be accepted."""
        data = _valid_kdf_params()
        data["parallelism"] = 16
        params = KdfParams(**data)
        assert params.parallelism == 16
