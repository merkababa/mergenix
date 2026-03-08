"""
Tests for JWT secret rotation infrastructure.

These tests verify:
- JWT tokens include a `kid` (key ID) in the header
- Tokens signed with the previous key are accepted during rotation window
- Tokens signed with an unknown/expired key are rejected
- get_jwt_secrets() returns current + previous secrets
- Single-secret backward compatibility
- Key age threshold detection
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import jwt
import pytest
from app.config import Settings
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_jwt_secrets,
)
from jwt.exceptions import InvalidTokenError as JWTError

# ── Helpers ──────────────────────────────────────────────────────────────


def _make_settings(**overrides) -> Settings:
    """Create a Settings instance with test defaults and optional overrides."""
    defaults = {
        "jwt_secret": "current-secret-key-for-testing",
        "jwt_algorithm": "HS256",
        "access_token_expire_minutes": 30,
        "refresh_token_expire_days": 7,
        "jwt_secret_previous": "",
        "jwt_key_id": "v1",
        "jwt_key_id_previous": "",
        "secret_rotation_max_age_days": 90,
    }
    defaults.update(overrides)
    return Settings(**defaults)


# ── 1. JWT created with current key includes `kid` in header ─────────────


class TestJWTKeyIdInHeader:
    """JWT tokens must include a `kid` (key ID) claim in the header."""

    def test_access_token_has_kid_header(self) -> None:
        """create_access_token() should produce a JWT with kid in header."""
        settings = _make_settings(jwt_key_id="v2")
        with patch("app.services.auth_service.settings", settings):
            token = create_access_token(uuid.uuid4())

        header = jwt.get_unverified_header(token)
        assert "kid" in header, "JWT header must include a 'kid' claim"
        assert header["kid"] == "v2"

    def test_refresh_token_has_kid_header(self) -> None:
        """create_refresh_token() should produce a JWT with kid in header."""
        settings = _make_settings(jwt_key_id="v3")
        with patch("app.services.auth_service.settings", settings):
            token = create_refresh_token(uuid.uuid4())

        header = jwt.get_unverified_header(token)
        assert "kid" in header, "JWT header must include a 'kid' claim"
        assert header["kid"] == "v3"

    def test_kid_matches_configured_key_id(self) -> None:
        """The kid in the JWT header must match the configured jwt_key_id."""
        settings = _make_settings(jwt_key_id="rotation-2026-02")
        with patch("app.services.auth_service.settings", settings):
            token = create_access_token(uuid.uuid4())

        header = jwt.get_unverified_header(token)
        assert header["kid"] == "rotation-2026-02"


# ── 2. JWT signed with previous key is valid during rotation window ──────


class TestDualKeyVerification:
    """During secret rotation, tokens signed with the previous key must
    still be accepted."""

    def test_token_signed_with_current_key_is_valid(self) -> None:
        """A token signed with the current secret should decode successfully."""
        settings = _make_settings(
            jwt_secret="current-secret",
            jwt_key_id="v2",
            jwt_secret_previous="old-secret",
            jwt_key_id_previous="v1",
        )
        with patch("app.services.auth_service.settings", settings):
            user_id = uuid.uuid4()
            token = create_access_token(user_id)
            payload = decode_token(token)

        assert payload["sub"] == str(user_id)
        assert payload["type"] == "access"

    def test_token_signed_with_previous_key_is_valid(self) -> None:
        """A token signed with the previous secret should still decode
        successfully during rotation window."""
        current_secret = "new-secret-v2"
        previous_secret = "old-secret-v1"

        # Create a token signed with the OLD key (simulating a token issued
        # before rotation)
        user_id = uuid.uuid4()
        now = datetime.now(UTC)
        payload = {
            "sub": str(user_id),
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=30),
        }
        old_token = jwt.encode(
            payload,
            previous_secret,
            algorithm="HS256",
            headers={"kid": "v1"},
        )

        # Now configure the service with the NEW key as current, OLD as previous
        settings = _make_settings(
            jwt_secret=current_secret,
            jwt_key_id="v2",
            jwt_secret_previous=previous_secret,
            jwt_key_id_previous="v1",
        )
        with patch("app.services.auth_service.settings", settings):
            decoded = decode_token(old_token)

        assert decoded["sub"] == str(user_id)

    def test_refresh_token_signed_with_previous_key_is_valid(self) -> None:
        """Refresh tokens signed with the previous secret should also be
        accepted during rotation."""
        current_secret = "new-secret-v2"
        previous_secret = "old-secret-v1"

        user_id = uuid.uuid4()
        now = datetime.now(UTC)
        payload = {
            "sub": str(user_id),
            "type": "refresh",
            "jti": str(uuid.uuid4()),
            "iat": now,
            "exp": now + timedelta(days=7),
        }
        old_token = jwt.encode(
            payload,
            previous_secret,
            algorithm="HS256",
            headers={"kid": "v1"},
        )

        settings = _make_settings(
            jwt_secret=current_secret,
            jwt_key_id="v2",
            jwt_secret_previous=previous_secret,
            jwt_key_id_previous="v1",
        )
        with patch("app.services.auth_service.settings", settings):
            decoded = decode_token(old_token)

        assert decoded["sub"] == str(user_id)
        assert decoded["type"] == "refresh"


# ── 3. JWT signed with unknown/expired key is rejected ───────────────────


class TestUnknownKeyRejection:
    """Tokens signed with an unknown or expired key must be rejected."""

    def test_token_with_unknown_kid_is_rejected(self) -> None:
        """A token whose kid matches neither current nor previous should
        raise JWTError."""

        unknown_secret = "completely-unknown-secret"
        user_id = uuid.uuid4()
        now = datetime.now(UTC)
        payload = {
            "sub": str(user_id),
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=30),
        }
        rogue_token = jwt.encode(
            payload,
            unknown_secret,
            algorithm="HS256",
            headers={"kid": "v99-unknown"},
        )

        settings = _make_settings(
            jwt_secret="current-secret",
            jwt_key_id="v2",
            jwt_secret_previous="old-secret",
            jwt_key_id_previous="v1",
        )
        with patch("app.services.auth_service.settings", settings):
            with pytest.raises(JWTError):
                decode_token(rogue_token)

    def test_token_with_wrong_signature_is_rejected(self) -> None:
        """A token signed with an incorrect secret (even if kid matches)
        should be rejected."""

        user_id = uuid.uuid4()
        now = datetime.now(UTC)
        payload = {
            "sub": str(user_id),
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=30),
        }
        # Token has kid=v2 but signed with a wrong secret
        bad_token = jwt.encode(
            payload,
            "wrong-secret-impersonating-v2",
            algorithm="HS256",
            headers={"kid": "v2"},
        )

        settings = _make_settings(
            jwt_secret="current-secret",
            jwt_key_id="v2",
            jwt_secret_previous="old-secret",
            jwt_key_id_previous="v1",
        )
        with patch("app.services.auth_service.settings", settings):
            with pytest.raises(JWTError):
                decode_token(bad_token)

    def test_token_with_no_previous_configured_and_unknown_kid_is_rejected(self) -> None:
        """When no previous key is configured, a token with an unknown kid
        should be rejected."""

        user_id = uuid.uuid4()
        now = datetime.now(UTC)
        payload = {
            "sub": str(user_id),
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=30),
        }
        rogue_token = jwt.encode(
            payload,
            "some-other-secret",
            algorithm="HS256",
            headers={"kid": "v-old"},
        )

        settings = _make_settings(
            jwt_secret="current-secret",
            jwt_key_id="v1",
            jwt_secret_previous="",
            jwt_key_id_previous="",
        )
        with patch("app.services.auth_service.settings", settings):
            with pytest.raises(JWTError):
                decode_token(rogue_token)


# ── 4. get_jwt_secrets() returns current + previous secrets ──────────────


class TestGetJWTSecrets:
    """get_jwt_secrets() should return a list of (kid, secret) tuples."""

    def test_returns_both_keys_when_previous_configured(self) -> None:
        """When both current and previous secrets are set, both should be
        returned."""
        settings = _make_settings(
            jwt_secret="new-secret",
            jwt_key_id="v2",
            jwt_secret_previous="old-secret",
            jwt_key_id_previous="v1",
        )
        with patch("app.services.auth_service.settings", settings):
            secrets = get_jwt_secrets()

        assert len(secrets) == 2
        # Current key should be first
        assert secrets[0] == ("v2", "new-secret")
        assert secrets[1] == ("v1", "old-secret")

    def test_returns_only_current_when_no_previous(self) -> None:
        """When no previous secret is configured, only the current should
        be returned."""
        settings = _make_settings(
            jwt_secret="only-secret",
            jwt_key_id="v1",
            jwt_secret_previous="",
            jwt_key_id_previous="",
        )
        with patch("app.services.auth_service.settings", settings):
            secrets = get_jwt_secrets()

        assert len(secrets) == 1
        assert secrets[0] == ("v1", "only-secret")

    def test_current_key_is_always_first(self) -> None:
        """The current key should always be the first element."""
        settings = _make_settings(
            jwt_secret="current",
            jwt_key_id="v5",
            jwt_secret_previous="previous",
            jwt_key_id_previous="v4",
        )
        with patch("app.services.auth_service.settings", settings):
            secrets = get_jwt_secrets()

        assert secrets[0][0] == "v5", "Current key ID should be first"


# ── 5. Single-secret backward compatibility ──────────────────────────────


class TestBackwardCompatibility:
    """When only one secret is configured (pre-rotation), everything should
    work normally."""

    def test_single_secret_create_and_verify(self) -> None:
        """With only jwt_secret set (no previous), tokens should round-trip."""
        settings = _make_settings(
            jwt_secret="the-one-and-only-secret",
            jwt_key_id="v1",
            jwt_secret_previous="",
            jwt_key_id_previous="",
        )
        with patch("app.services.auth_service.settings", settings):
            user_id = uuid.uuid4()
            token = create_access_token(user_id)
            payload = decode_token(token)

        assert payload["sub"] == str(user_id)
        assert payload["type"] == "access"

    def test_legacy_token_without_kid_is_accepted(self) -> None:
        """Tokens created before the kid feature (no kid header) should
        still be accepted by trying the current secret."""
        secret = "shared-secret"
        user_id = uuid.uuid4()
        now = datetime.now(UTC)
        payload = {
            "sub": str(user_id),
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=30),
        }
        # Encode WITHOUT kid header (legacy behavior)
        legacy_token = jwt.encode(payload, secret, algorithm="HS256")

        # Verify the token has no kid header
        header = jwt.get_unverified_header(legacy_token)
        assert "kid" not in header

        settings = _make_settings(
            jwt_secret=secret,
            jwt_key_id="v1",
            jwt_secret_previous="",
            jwt_key_id_previous="",
        )
        with patch("app.services.auth_service.settings", settings):
            decoded = decode_token(legacy_token)

        assert decoded["sub"] == str(user_id)

    def test_legacy_token_without_kid_tries_previous_on_current_failure(self) -> None:
        """If a legacy token (no kid) fails with the current secret, it
        should try the previous secret."""
        old_secret = "old-secret-used-before-rotation"
        new_secret = "new-secret-after-rotation"

        user_id = uuid.uuid4()
        now = datetime.now(UTC)
        payload = {
            "sub": str(user_id),
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=30),
        }
        # Token signed with old secret, no kid
        legacy_token = jwt.encode(payload, old_secret, algorithm="HS256")

        settings = _make_settings(
            jwt_secret=new_secret,
            jwt_key_id="v2",
            jwt_secret_previous=old_secret,
            jwt_key_id_previous="v1",
        )
        with patch("app.services.auth_service.settings", settings):
            decoded = decode_token(legacy_token)

        assert decoded["sub"] == str(user_id)

    def test_legacy_token_without_kid_rejected_if_no_secret_matches(self) -> None:
        """If a legacy token (no kid) fails with both current and previous
        secrets, it should be rejected."""

        user_id = uuid.uuid4()
        now = datetime.now(UTC)
        payload = {
            "sub": str(user_id),
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=30),
        }
        legacy_token = jwt.encode(payload, "totally-unknown-secret", algorithm="HS256")

        settings = _make_settings(
            jwt_secret="current-secret",
            jwt_key_id="v2",
            jwt_secret_previous="previous-secret",
            jwt_key_id_previous="v1",
        )
        with patch("app.services.auth_service.settings", settings):
            with pytest.raises(JWTError):
                decode_token(legacy_token)


# ── 6. Key age checking ─────────────────────────────────────────────────


class TestKeyAgeChecking:
    """Utility to detect when a key is older than the configured threshold."""

    def test_key_within_threshold_is_not_stale(self) -> None:
        """A key created within the max age threshold should not be flagged."""
        from app.services.auth_service import is_key_rotation_recommended

        # Key created 30 days ago, threshold is 90 days
        key_created = datetime.now(UTC) - timedelta(days=30)
        settings = _make_settings(secret_rotation_max_age_days=90)
        with patch("app.services.auth_service.settings", settings):
            assert is_key_rotation_recommended(key_created) is False

    def test_key_beyond_threshold_is_stale(self) -> None:
        """A key older than the max age threshold should be flagged for
        rotation."""
        from app.services.auth_service import is_key_rotation_recommended

        # Key created 100 days ago, threshold is 90 days
        key_created = datetime.now(UTC) - timedelta(days=100)
        settings = _make_settings(secret_rotation_max_age_days=90)
        with patch("app.services.auth_service.settings", settings):
            assert is_key_rotation_recommended(key_created) is True

    def test_key_exactly_at_threshold_is_stale(self) -> None:
        """A key at exactly the max age threshold should be flagged for
        rotation (>= threshold)."""
        from app.services.auth_service import is_key_rotation_recommended

        key_created = datetime.now(UTC) - timedelta(days=90)
        settings = _make_settings(secret_rotation_max_age_days=90)
        with patch("app.services.auth_service.settings", settings):
            assert is_key_rotation_recommended(key_created) is True

    def test_custom_threshold(self) -> None:
        """The threshold should be configurable via settings."""
        from app.services.auth_service import is_key_rotation_recommended

        key_created = datetime.now(UTC) - timedelta(days=45)
        # With 30-day threshold, 45 days is stale
        settings = _make_settings(secret_rotation_max_age_days=30)
        with patch("app.services.auth_service.settings", settings):
            assert is_key_rotation_recommended(key_created) is True

        # With 60-day threshold, 45 days is not stale
        settings = _make_settings(secret_rotation_max_age_days=60)
        with patch("app.services.auth_service.settings", settings):
            assert is_key_rotation_recommended(key_created) is False


# ── 7. Expired JWT rejection ──────────────────────────────────────────────


class TestExpiredJWTRejection:
    """Tokens that have expired (exp in the past) must be rejected."""

    def test_expired_token_raises_jwt_error(self) -> None:
        """A token with exp in the past should raise JWTError on decode."""

        secret = "current-secret-key-for-testing"
        user_id = uuid.uuid4()
        now = datetime.now(UTC)
        payload = {
            "sub": str(user_id),
            "type": "access",
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),  # Expired 1 hour ago
        }
        expired_token = jwt.encode(
            payload,
            secret,
            algorithm="HS256",
            headers={"kid": "v1"},
        )

        settings = _make_settings(
            jwt_secret=secret,
            jwt_key_id="v1",
        )
        with patch("app.services.auth_service.settings", settings):
            with pytest.raises(JWTError):
                decode_token(expired_token)


# ── 8. _resolve_secret_for_kid direct tests ───────────────────────────────


class TestResolveSecretForKid:
    """Direct unit tests for _resolve_secret_for_kid."""

    def test_known_kid_returns_correct_secret(self) -> None:
        """A known kid should return its corresponding secret."""
        from app.services.auth_service import _resolve_secret_for_kid

        settings = _make_settings(
            jwt_secret="current-secret",
            jwt_key_id="v2",
            jwt_secret_previous="old-secret",
            jwt_key_id_previous="v1",
        )
        with patch("app.services.auth_service.settings", settings):
            assert _resolve_secret_for_kid("v2") == "current-secret"
            assert _resolve_secret_for_kid("v1") == "old-secret"

    def test_unknown_kid_returns_none(self) -> None:
        """An unknown kid should return None."""
        from app.services.auth_service import _resolve_secret_for_kid

        settings = _make_settings(
            jwt_secret="current-secret",
            jwt_key_id="v2",
            jwt_secret_previous="old-secret",
            jwt_key_id_previous="v1",
        )
        with patch("app.services.auth_service.settings", settings):
            assert _resolve_secret_for_kid("v99-nonexistent") is None

    def test_none_kid_returns_none(self) -> None:
        """None as kid should return None (no kid matches None)."""
        from app.services.auth_service import _resolve_secret_for_kid

        settings = _make_settings(
            jwt_secret="current-secret",
            jwt_key_id="v2",
        )
        with patch("app.services.auth_service.settings", settings):
            assert _resolve_secret_for_kid(None) is None
