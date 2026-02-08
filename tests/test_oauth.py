"""
Unit tests for Google OAuth integration.
"""

from unittest.mock import Mock, patch

import pytest
from Source.auth.oauth import GoogleOAuthHandler


class TestGoogleOAuthHandler:
    """Test suite for GoogleOAuthHandler class."""

    def test_init_with_settings(self):
        """Test initialization with unified config settings."""
        with patch("Source.auth.oauth.settings") as mock_settings:
            mock_settings.google_client_id = "test_client_id"
            mock_settings.google_client_secret = "test_secret"
            mock_settings.google_redirect_uri = "http://localhost:8501/callback"
            handler = GoogleOAuthHandler()
            assert handler.client_id == "test_client_id"
            assert handler.client_secret == "test_secret"
            assert handler.redirect_uri == "http://localhost:8501/callback"

    def test_init_with_explicit_params(self):
        """Test initialization with explicit parameters."""
        handler = GoogleOAuthHandler(
            client_id='my_client_id',
            client_secret='my_secret',
            redirect_uri='http://example.com/callback'
        )
        assert handler.client_id == 'my_client_id'
        assert handler.client_secret == 'my_secret'
        assert handler.redirect_uri == 'http://example.com/callback'

    def test_is_configured_true(self):
        """Test is_configured returns True when credentials are set."""
        handler = GoogleOAuthHandler(
            client_id='test_id',
            client_secret='test_secret'
        )
        assert handler.is_configured() is True

    def test_is_configured_false(self):
        """Test is_configured returns False when credentials are missing."""
        handler = GoogleOAuthHandler()
        assert handler.is_configured() is False

    def test_generate_state_token(self):
        """Test state token generation."""
        handler = GoogleOAuthHandler()
        token1 = handler.generate_state_token()
        token2 = handler.generate_state_token()

        # Tokens should be different
        assert token1 != token2

        # Tokens should be non-empty strings
        assert isinstance(token1, str)
        assert len(token1) > 0

    def test_get_authorization_url(self):
        """Test authorization URL generation."""
        handler = GoogleOAuthHandler(
            client_id='test_client_id',
            client_secret='test_secret',
            redirect_uri='http://localhost:8501/callback'
        )

        state = 'test_state_token'
        auth_url = handler.get_authorization_url(state)

        # Check URL contains required parameters
        assert 'accounts.google.com/o/oauth2/v2/auth' in auth_url
        assert 'client_id=test_client_id' in auth_url
        assert 'redirect_uri=http%3A%2F%2Flocalhost%3A8501%2Fcallback' in auth_url
        assert 'state=test_state_token' in auth_url
        assert 'response_type=code' in auth_url
        assert 'scope=' in auth_url

    def test_get_authorization_url_not_configured(self):
        """Test authorization URL generation fails when not configured."""
        handler = GoogleOAuthHandler()

        with pytest.raises(ValueError, match='Google OAuth not configured'):
            handler.get_authorization_url('test_state')

    @patch('requests.post')
    def test_exchange_code_for_tokens_success(self, mock_post):
        """Test successful token exchange."""
        handler = GoogleOAuthHandler(
            client_id='test_client_id',
            client_secret='test_secret',
            redirect_uri='http://localhost:8501/callback'
        )

        # Mock successful response
        mock_response = Mock()
        mock_response.json.return_value = {
            'access_token': 'test_access_token',
            'id_token': 'test_id_token',
            'refresh_token': 'test_refresh_token',
            'expires_in': 3600,
            'token_type': 'Bearer'
        }
        mock_post.return_value = mock_response

        tokens = handler.exchange_code_for_tokens('test_code')

        assert tokens['access_token'] == 'test_access_token'
        assert tokens['id_token'] == 'test_id_token'
        assert tokens['refresh_token'] == 'test_refresh_token'
        assert tokens['expires_in'] == 3600

    @patch('requests.get')
    def test_get_user_info_success(self, mock_get):
        """Test successful user info retrieval."""
        handler = GoogleOAuthHandler()

        # Mock successful response
        mock_response = Mock()
        mock_response.json.return_value = {
            'email': 'test@example.com',
            'name': 'Test User',
            'picture': 'https://example.com/photo.jpg',
            'sub': 'google_user_123',
            'email_verified': True
        }
        mock_get.return_value = mock_response

        user_info = handler.get_user_info('test_access_token')

        assert user_info['email'] == 'test@example.com'
        assert user_info['name'] == 'Test User'
        assert user_info['picture'] == 'https://example.com/photo.jpg'
        assert user_info['google_id'] == 'google_user_123'
        assert user_info['email_verified'] is True

    def test_validate_state_token_success(self):
        """Test successful state token validation."""
        handler = GoogleOAuthHandler()

        state = 'test_state_token'
        assert handler.validate_state_token(state, state) is True

    def test_validate_state_token_failure(self):
        """Test failed state token validation."""
        handler = GoogleOAuthHandler()

        assert handler.validate_state_token('token1', 'token2') is False
        assert handler.validate_state_token('', 'token') is False
        assert handler.validate_state_token('token', '') is False

    def test_authenticate_or_create_user_new_user(self):
        """Test creating a new OAuth user."""
        handler = GoogleOAuthHandler()

        user_info = {
            'email': 'newuser@example.com',
            'name': 'New User',
            'picture': 'https://example.com/photo.jpg',
            'google_id': 'google_123',
            'email_verified': True
        }

        # Mock AuthManager
        mock_auth_manager = Mock()
        mock_auth_manager.get_user_by_oauth.return_value = None
        mock_auth_manager.get_user.return_value = None
        mock_auth_manager.create_oauth_user.return_value = (True, "Account created")
        mock_auth_manager.get_user.return_value = {
            'email': 'newuser@example.com',
            'name': 'New User',
            'tier': 'free'
        }

        success, user_data, message = handler.authenticate_or_create_user(
            user_info, mock_auth_manager
        )

        assert success is True
        assert user_data['email'] == 'newuser@example.com'
        assert 'created' in message.lower() or 'linked' in message.lower()

    def test_authenticate_or_create_user_existing_oauth(self):
        """Test login with existing OAuth account."""
        handler = GoogleOAuthHandler()

        user_info = {
            'email': 'existing@example.com',
            'name': 'Existing User',
            'google_id': 'google_123',
            'email_verified': True
        }

        # Mock AuthManager - user exists with OAuth
        mock_auth_manager = Mock()
        mock_auth_manager.get_user_by_oauth.return_value = {
            'email': 'existing@example.com',
            'name': 'Existing User',
            'tier': 'premium'
        }

        success, user_data, message = handler.authenticate_or_create_user(
            user_info, mock_auth_manager
        )

        assert success is True
        assert user_data['email'] == 'existing@example.com'
        assert 'Login successful' in message

    def test_authenticate_or_create_user_unverified_email(self):
        """Test rejection of unverified email."""
        handler = GoogleOAuthHandler()

        user_info = {
            'email': 'unverified@example.com',
            'name': 'Unverified User',
            'google_id': 'google_123',
            'email_verified': False
        }

        mock_auth_manager = Mock()

        success, user_data, message = handler.authenticate_or_create_user(
            user_info, mock_auth_manager
        )

        assert success is False
        assert user_data is None
        assert 'not verified' in message.lower()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
