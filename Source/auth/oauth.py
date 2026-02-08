"""
Google OAuth integration for Mergenix authentication.
Handles OAuth flow, token exchange, and user creation/linking.
"""

import secrets
from urllib.parse import urlencode

import requests
from Source.config import settings


class GoogleOAuthHandler:
    """Handles Google OAuth 2.0 authentication flow."""

    # Google OAuth 2.0 endpoints
    AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
    USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo"

    # OAuth scopes
    SCOPES = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile"
    ]

    def __init__(
        self,
        client_id: str | None = None,
        client_secret: str | None = None,
        redirect_uri: str | None = None
    ):
        """
        Initialize Google OAuth handler.

        Args:
            client_id: Google OAuth client ID (defaults to settings)
            client_secret: Google OAuth client secret (defaults to settings)
            redirect_uri: OAuth callback URL (defaults to settings)
        """
        self.client_id = client_id or settings.google_client_id
        self.client_secret = client_secret or settings.google_client_secret
        self.redirect_uri = redirect_uri or settings.google_redirect_uri

    def is_configured(self) -> bool:
        """Check if OAuth credentials are configured."""
        return bool(self.client_id and self.client_secret)

    def generate_state_token(self) -> str:
        """Generate a cryptographically secure state token for CSRF protection."""
        return secrets.token_urlsafe(32)

    def get_authorization_url(self, state: str | None = None) -> str:
        """
        Generate Google OAuth authorization URL.

        Args:
            state: CSRF protection state token (generated if not provided)

        Returns:
            Authorization URL to redirect user to
        """
        if not self.is_configured():
            raise ValueError("Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")

        if state is None:
            state = self.generate_state_token()

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.SCOPES),
            "state": state,
            "access_type": "offline",  # Request refresh token
            "prompt": "select_account"  # Always show account selector
        }

        return f"{self.AUTHORIZATION_ENDPOINT}?{urlencode(params)}"

    def exchange_code_for_tokens(self, code: str) -> dict[str, any]:
        """
        Exchange authorization code for access and refresh tokens.

        Args:
            code: Authorization code from OAuth callback

        Returns:
            Dict containing tokens: {
                'access_token': str,
                'id_token': str,
                'refresh_token': str (optional),
                'expires_in': int,
                'token_type': str
            }

        Raises:
            requests.HTTPError: If token exchange fails
        """
        if not self.is_configured():
            raise ValueError("Google OAuth not configured.")

        data = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code"
        }

        response = requests.post(
            self.TOKEN_ENDPOINT,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
        response.raise_for_status()

        return response.json()

    def get_user_info(self, access_token: str) -> dict[str, str]:
        """
        Fetch user information from Google.

        Args:
            access_token: OAuth access token

        Returns:
            Dict containing user info: {
                'email': str,
                'name': str,
                'picture': str (profile picture URL),
                'google_id': str (sub claim),
                'email_verified': bool
            }

        Raises:
            requests.HTTPError: If user info fetch fails
        """
        response = requests.get(
            self.USERINFO_ENDPOINT,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        response.raise_for_status()

        data = response.json()

        return {
            "email": data.get("email", "").lower(),
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "google_id": data.get("sub", ""),
            "email_verified": data.get("email_verified", False)
        }

    def authenticate_or_create_user(
        self,
        user_info: dict[str, str],
        auth_manager
    ) -> tuple[bool, dict | None, str]:
        """
        Authenticate or create user with Google OAuth.

        Args:
            user_info: User info from Google
            auth_manager: AuthManager instance

        Returns:
            Tuple of (success: bool, user_data: dict or None, message: str)
        """
        email = user_info.get("email", "").strip().lower()
        google_id = user_info.get("google_id", "")
        name = user_info.get("name", "")
        picture = user_info.get("picture", "")
        email_verified = user_info.get("email_verified", False)

        # Validate required fields
        if not email or not google_id:
            return False, None, "Invalid user information from Google"

        # Security: Verify email is verified by Google
        if not email_verified:
            return False, None, "Email not verified by Google. Please verify your email first."

        # Check if user exists by OAuth ID
        existing_user = auth_manager.get_user_by_oauth("google", google_id)
        if existing_user:
            # User already linked with Google
            auth_manager.update_last_login(email)
            return True, existing_user, "Login successful"

        # Check if user exists by email
        existing_user = auth_manager.get_user(email)
        if existing_user:
            # Link Google account to existing user
            success = auth_manager.link_oauth_account(email, "google", google_id, picture)
            if success:
                user_data = auth_manager.get_user(email)
                auth_manager.update_last_login(email)
                return True, user_data, "Google account linked successfully"
            else:
                return False, None, "Failed to link Google account"

        # Create new user with Google OAuth
        success, message = auth_manager.create_oauth_user(
            email=email,
            name=name,
            provider="google",
            oauth_id=google_id,
            profile_picture=picture
        )

        if success:
            user_data = auth_manager.get_user(email)
            return True, user_data, "Account created successfully"
        else:
            return False, None, message

    def validate_state_token(self, received_state: str, expected_state: str) -> bool:
        """
        Validate state token to prevent CSRF attacks.

        Args:
            received_state: State token from OAuth callback
            expected_state: State token stored in session

        Returns:
            True if tokens match, False otherwise
        """
        if not received_state or not expected_state:
            return False

        # Use constant-time comparison to prevent timing attacks
        return secrets.compare_digest(received_state, expected_state)
