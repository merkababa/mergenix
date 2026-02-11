/**
 * Authentication types shared between frontend and API.
 *
 * These types mirror the auth system defined in Source/auth/ of the
 * legacy Streamlit application, adapted for the Next.js rewrite.
 */

import type { Tier } from './genetics';

/**
 * Authenticated user profile.
 *
 * Represents the user object stored in session / JWT payload.
 */
export interface User {
  /** Unique user identifier (UUID v4). */
  id: string;
  /** User's email address (verified or unverified). */
  email: string;
  /** Display name. */
  name: string;
  /** Current subscription tier. */
  tier: Tier;
  /** Whether the email address has been verified. */
  emailVerified: boolean;
  /** Whether TOTP two-factor authentication is enabled. */
  totpEnabled: boolean;
  /** ISO 8601 timestamp of account creation. */
  createdAt: string;
}

/**
 * JWT token pair returned after successful authentication.
 */
export interface AuthTokens {
  /** Short-lived access token (e.g., 15 minutes). */
  accessToken: string;
  /** Long-lived refresh token (e.g., 7 days). */
  refreshToken: string;
  /** Access token expiry in seconds from issuance. */
  expiresIn: number;
}

/**
 * Credentials for email/password login.
 */
export interface LoginCredentials {
  /** Email address. */
  email: string;
  /** Plaintext password (transmitted over HTTPS, hashed server-side). */
  password: string;
  /** Optional TOTP code for two-factor authentication. */
  twoFactorCode?: string;
}

/**
 * Data required to register a new account.
 */
export interface RegisterData {
  /** Display name. */
  name: string;
  /** Email address. */
  email: string;
  /** Plaintext password (minimum 8 characters, validated server-side). */
  password: string;
}

/**
 * OAuth provider identifiers.
 */
export type OAuthProvider = 'google' | 'github';

/**
 * Request to initiate OAuth flow.
 */
export interface OAuthLoginRequest {
  /** OAuth provider to authenticate with. */
  provider: OAuthProvider;
  /** URL to redirect back to after OAuth flow completes. */
  redirectUri: string;
}

/**
 * Response from completing an OAuth flow.
 */
export interface OAuthCallbackData {
  /** Authorization code from the OAuth provider. */
  code: string;
  /** State parameter for CSRF verification. */
  state: string;
}

/**
 * Password reset request.
 */
export interface PasswordResetRequest {
  /** Email address to send reset link to. */
  email: string;
}

/**
 * Password reset confirmation.
 */
export interface PasswordResetConfirmation {
  /** Reset token from the email link. */
  token: string;
  /** New password. */
  newPassword: string;
}
