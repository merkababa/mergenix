/**
 * Auth-specific API client — wraps all FastAPI /auth/* endpoints.
 *
 * Each function maps 1:1 to a backend endpoint. The backend uses
 * snake_case in JSON; we convert to camelCase for the frontend.
 *
 * All functions throw ApiError on failure. The caller (auth store)
 * is responsible for catching and surfacing errors to the UI.
 */

import { get, post, put, del } from './client';
import type { ApiError } from './client';
import type { Tier } from '@mergenix/shared-types';

// ── API Response Types (snake_case from backend) ────────────────────────

/** Raw token response from POST /auth/login, /auth/refresh, /auth/2fa/login */
interface RawTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/** Raw user profile from GET /auth/me */
interface RawUserProfile {
  id: string;
  email: string;
  name: string;
  tier: Tier;
  email_verified: boolean;
  totp_enabled: boolean;
  created_at: string;
}

/** Raw 2FA setup response from POST /auth/2fa/setup */
interface RawTwoFactorSetupResponse {
  secret: string;
  qr_code_uri: string;
  backup_codes: string[];
}

/** Raw 2FA enabled response from POST /auth/2fa/verify */
interface RawTwoFactorEnabledResponse {
  message: string;
  backup_codes: string[];
}

/** Raw message response from various endpoints */
interface RawMessageResponse {
  message: string;
}

/** Raw Google OAuth URL response */
interface RawGoogleOAuthResponse {
  authorization_url: string;
  state: string;
}

/** Raw session from GET /auth/sessions */
interface RawSession {
  id: string;
  device: string;
  ip: string;
  location: string;
  last_active: string;
  is_current: boolean;
}

// ── Frontend Types (camelCase) ──────────────────────────────────────────

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  tier: Tier;
  emailVerified: boolean;
  totpEnabled: boolean;
  createdAt: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrUri: string;
}

export interface TwoFactorEnabledResponse {
  backupCodes: string[];
}

export interface Session {
  id: string;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

// ── Result type for login (success or 2FA required) ─────────────────────

export type LoginResult =
  | { success: true; tokens: TokenResponse }
  | { success: false; requires2FA: true; challengeToken: string };

// ── Transformers ────────────────────────────────────────────────────────

function toTokenResponse(raw: RawTokenResponse): TokenResponse {
  return {
    accessToken: raw.access_token,
    expiresIn: raw.expires_in,
  };
}

function toSession(raw: RawSession): Session {
  return {
    id: raw.id,
    device: raw.device,
    ip: raw.ip,
    location: raw.location,
    lastActive: raw.last_active,
    isCurrent: raw.is_current,
  };
}

function toUserProfile(raw: RawUserProfile): UserProfile {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name,
    tier: raw.tier,
    emailVerified: raw.email_verified,
    totpEnabled: raw.totp_enabled,
    createdAt: raw.created_at,
  };
}

// ── Auth API Functions ──────────────────────────────────────────────────

/**
 * Register a new account. Returns a success message.
 * The user must verify their email before they can log in.
 */
export async function register(name: string, email: string, password: string): Promise<string> {
  const res = await post<RawMessageResponse>(
    '/auth/register',
    { name, email, password },
    { skipAuth: true },
  );
  return res.message;
}

/**
 * Log in with email and password.
 *
 * Returns either tokens (success) or a 2FA challenge if TOTP is enabled.
 * The 2FA case is detected by catching the 403 response with code "2FA_REQUIRED".
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const raw = await post<RawTokenResponse>(
      '/auth/login',
      { email, password },
      { skipAuth: true },
    );
    return { success: true, tokens: toTokenResponse(raw) };
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === '2FA_REQUIRED' && apiError.challengeToken) {
      return {
        success: false,
        requires2FA: true,
        challengeToken: apiError.challengeToken,
      };
    }
    throw error;
  }
}

/**
 * Complete 2FA login with challenge token and TOTP code.
 */
export async function login2FA(challengeToken: string, totpCode: string): Promise<TokenResponse> {
  const raw = await post<RawTokenResponse>(
    '/auth/2fa/login',
    { challenge_token: challengeToken, code: totpCode },
    { skipAuth: true },
  );
  return toTokenResponse(raw);
}

/**
 * Refresh the access token. The refresh token is sent automatically
 * as an httpOnly cookie via credentials: "include".
 */
export async function refreshTokens(): Promise<TokenResponse> {
  const raw = await post<RawTokenResponse>('/auth/refresh', {}, { skipAuth: true });
  return toTokenResponse(raw);
}

/**
 * Log out by revoking the refresh token. The backend reads the
 * refresh token from the httpOnly cookie.
 */
export async function logout(): Promise<void> {
  await post<RawMessageResponse>('/auth/logout', {});
}

/**
 * Fetch the current user's profile.
 */
export async function getProfile(): Promise<UserProfile> {
  const raw = await get<RawUserProfile>('/auth/me');
  return toUserProfile(raw);
}

/**
 * Update the current user's profile.
 */
export async function updateProfile(data: { name?: string }): Promise<UserProfile> {
  const raw = await put<RawUserProfile>('/auth/me', data);
  return toUserProfile(raw);
}

/**
 * Change password (requires current password).
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await post<RawMessageResponse>('/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  });
}

/**
 * Request a password reset email.
 */
export async function forgotPassword(email: string): Promise<void> {
  await post<RawMessageResponse>('/auth/forgot-password', { email }, { skipAuth: true });
}

/**
 * Complete a password reset with the token from the email.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await post<RawMessageResponse>(
    '/auth/reset-password',
    { token, new_password: newPassword },
    { skipAuth: true },
  );
}

/**
 * Verify email address with the token from the verification email.
 */
export async function verifyEmail(token: string): Promise<void> {
  await post<RawMessageResponse>('/auth/verify-email', { token }, { skipAuth: true });
}

/** Resend verification email. */
export async function resendVerification(email: string): Promise<void> {
  await post('/auth/resend-verification', { email }, { skipAuth: true });
}

/**
 * Start TOTP 2FA setup. Returns the secret and QR code URI.
 */
export async function setup2FA(): Promise<TwoFactorSetupResponse> {
  const raw = await post<RawTwoFactorSetupResponse>('/auth/2fa/setup');
  return {
    secret: raw.secret,
    qrUri: raw.qr_code_uri,
  };
}

/**
 * Verify a TOTP code to finalize 2FA enrollment.
 * Returns one-time backup codes.
 */
export async function verify2FA(code: string): Promise<TwoFactorEnabledResponse> {
  const raw = await post<RawTwoFactorEnabledResponse>('/auth/2fa/verify', {
    code,
  });
  return { backupCodes: raw.backup_codes };
}

/**
 * Disable 2FA. Requires a valid TOTP code for identity confirmation.
 */
export async function disable2FA(code: string): Promise<void> {
  await post<RawMessageResponse>('/auth/2fa/disable', { code });
}

/** Response from getGoogleOAuthUrl — URL + state for CSRF protection. */
export interface GoogleOAuthUrlResponse {
  authorizationUrl: string;
  state: string;
}

/**
 * Get the Google OAuth authorization URL and state parameter.
 * The state must be persisted and verified in the callback for CSRF protection.
 */
export async function getGoogleOAuthUrl(): Promise<GoogleOAuthUrlResponse> {
  const raw = await get<RawGoogleOAuthResponse>('/auth/oauth/google', {
    skipAuth: true,
  });
  return { authorizationUrl: raw.authorization_url, state: raw.state };
}

/**
 * Complete Google OAuth flow with the authorization code.
 */
export async function googleCallback(code: string, state: string): Promise<TokenResponse> {
  const params = new URLSearchParams({ code, state });
  const raw = await get<RawTokenResponse>(`/auth/oauth/google/callback?${params.toString()}`, {
    skipAuth: true,
  });
  return toTokenResponse(raw);
}

/** Get all active sessions for the current user. */
export async function getSessions(): Promise<Session[]> {
  const raw = await get<RawSession[]>('/auth/sessions');
  return raw.map(toSession);
}

/** Revoke a specific session by ID. */
export async function revokeSession(id: string): Promise<void> {
  await del<RawMessageResponse>(`/auth/sessions/${encodeURIComponent(id)}`);
}

/** Revoke all sessions except the current one. */
export async function revokeAllSessions(): Promise<void> {
  await del<RawMessageResponse>('/auth/sessions');
}

/** Delete the user's account permanently. Requires password confirmation. */
export async function deleteAccount(password: string): Promise<void> {
  await post<RawMessageResponse>('/auth/delete-account', { password });
}
