"""Tests for TOTP secret encryption utility."""

import pytest
from app.utils.encryption import decrypt_totp_secret, encrypt_totp_secret
from cryptography.fernet import InvalidToken


class TestEncryption:
    """Tests for encrypt/decrypt round-trip and error handling."""

    def test_round_trip_preserves_secret(self):
        """Encrypt then decrypt returns the original plaintext."""
        secret = "JBSWY3DPEHPK3PXP"  # typical TOTP base32 secret
        encrypted = encrypt_totp_secret(secret)
        assert encrypted != secret  # must not be plaintext
        assert decrypt_totp_secret(encrypted) == secret

    def test_encrypted_output_is_fernet_token(self):
        """Encrypted output starts with Fernet token prefix."""
        encrypted = encrypt_totp_secret("test_secret")
        assert encrypted.startswith("gAAAAA")  # Fernet v1 prefix

    def test_different_encryptions_produce_different_ciphertext(self):
        """Same plaintext encrypted twice produces different ciphertext (Fernet uses random IV)."""
        secret = "JBSWY3DPEHPK3PXP"
        enc1 = encrypt_totp_secret(secret)
        enc2 = encrypt_totp_secret(secret)
        assert enc1 != enc2  # different IVs

    def test_decrypt_corrupt_ciphertext_raises(self):
        """Decrypting corrupted ciphertext raises an exception."""
        with pytest.raises(InvalidToken):
            decrypt_totp_secret("not-a-valid-fernet-token")

    def test_empty_string_round_trip(self):
        """Empty string encrypts and decrypts correctly."""
        encrypted = encrypt_totp_secret("")
        assert decrypt_totp_secret(encrypted) == ""

    def test_missing_key_raises_runtime_error(self, monkeypatch):
        """Missing TOTP_ENCRYPTION_KEY raises RuntimeError."""
        # Clear the lru_cache and env var
        from app.utils.encryption import _get_fernet

        _get_fernet.cache_clear()
        monkeypatch.delenv("TOTP_ENCRYPTION_KEY", raising=False)

        with pytest.raises(RuntimeError, match="TOTP_ENCRYPTION_KEY"):
            encrypt_totp_secret("test")

        # Restore for other tests
        monkeypatch.setenv("TOTP_ENCRYPTION_KEY", "ZmDfcTF7_60GrrY167zsiPd67pEvs0aGOv2oasOM1Pg=")
        _get_fernet.cache_clear()
