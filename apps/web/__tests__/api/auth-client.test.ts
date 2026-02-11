import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock the base HTTP client ─────────────────────────────────────────────
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDel = vi.fn();

vi.mock('@/lib/api/client', () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
      public code = 'UNKNOWN',
      public fieldErrors: any[] = [],
      public challengeToken?: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  }
  return {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
    del: (...args: any[]) => mockDel(...args),
    ApiError,
  };
});

import { ApiError } from '@/lib/api/client';
import {
  register,
  login,
  login2FA,
  refreshTokens,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  setup2FA,
  verify2FA,
  disable2FA,
  getGoogleOAuthUrl,
  googleCallback,
  getSessions,
  revokeSession,
  revokeAllSessions,
  deleteAccount,
} from '@/lib/api/auth-client';

describe('auth-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── register ──────────────────────────────────────────────────────────

  describe('register', () => {
    it('posts to /auth/register with skipAuth and returns message', async () => {
      mockPost.mockResolvedValue({ message: 'Verification email sent' });

      const result = await register('John', 'john@example.com', 'Password123!');

      expect(mockPost).toHaveBeenCalledWith(
        '/auth/register',
        { name: 'John', email: 'john@example.com', password: 'Password123!' },
        { skipAuth: true },
      );
      expect(result).toBe('Verification email sent');
    });
  });

  // ── login ─────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns success with tokens on successful login', async () => {
      mockPost.mockResolvedValue({
        access_token: 'at-1',
        refresh_token: 'rt-1',
        token_type: 'bearer',
        expires_in: 3600,
      });

      const result = await login('test@example.com', 'password');

      expect(mockPost).toHaveBeenCalledWith(
        '/auth/login',
        { email: 'test@example.com', password: 'password' },
        { skipAuth: true },
      );
      expect(result).toEqual({
        success: true,
        tokens: { accessToken: 'at-1', expiresIn: 3600 },
      });
    });

    it('returns 2FA challenge when 2FA_REQUIRED error is thrown', async () => {
      mockPost.mockRejectedValue(
        new ApiError(403, '2FA required', '2FA_REQUIRED', [], 'challenge-tok-1'),
      );

      const result = await login('test@example.com', 'password');

      expect(result).toEqual({
        success: false,
        requires2FA: true,
        challengeToken: 'challenge-tok-1',
      });
    });

    it('rethrows non-2FA errors', async () => {
      mockPost.mockRejectedValue(new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS'));

      await expect(login('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  // ── login2FA ──────────────────────────────────────────────────────────

  describe('login2FA', () => {
    it('posts snake_case fields and returns tokens', async () => {
      mockPost.mockResolvedValue({
        access_token: 'at-2fa',
        refresh_token: 'rt-2fa',
        token_type: 'bearer',
        expires_in: 3600,
      });

      const result = await login2FA('challenge-abc', '123456');

      expect(mockPost).toHaveBeenCalledWith(
        '/auth/2fa/login',
        { challenge_token: 'challenge-abc', totp_code: '123456' },
        { skipAuth: true },
      );
      expect(result).toEqual({ accessToken: 'at-2fa', expiresIn: 3600 });
    });
  });

  // ── refreshTokens ─────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('posts to /auth/refresh with skipAuth', async () => {
      mockPost.mockResolvedValue({
        access_token: 'new-at',
        refresh_token: 'new-rt',
        token_type: 'bearer',
        expires_in: 7200,
      });

      const result = await refreshTokens();

      expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {}, { skipAuth: true });
      expect(result).toEqual({ accessToken: 'new-at', expiresIn: 7200 });
    });
  });

  // ── logout ────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('posts to /auth/logout', async () => {
      mockPost.mockResolvedValue({ message: 'Logged out' });

      await logout();

      expect(mockPost).toHaveBeenCalledWith('/auth/logout', {});
    });
  });

  // ── getProfile ────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('GETs /auth/me and converts snake_case to camelCase', async () => {
      mockGet.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        tier: 'free',
        email_verified: true,
        totp_enabled: false,
        created_at: '2024-01-01',
      });

      const profile = await getProfile();

      expect(mockGet).toHaveBeenCalledWith('/auth/me');
      expect(profile).toEqual({
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        tier: 'free',
        emailVerified: true,
        totpEnabled: false,
        createdAt: '2024-01-01',
      });
    });
  });

  // ── updateProfile ─────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('PUTs to /auth/me and returns profile', async () => {
      mockPut.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        name: 'New Name',
        tier: 'free',
        email_verified: true,
        totp_enabled: false,
        created_at: '2024-01-01',
      });

      const profile = await updateProfile({ name: 'New Name' });

      expect(mockPut).toHaveBeenCalledWith('/auth/me', { name: 'New Name' });
      expect(profile.name).toBe('New Name');
    });
  });

  // ── changePassword ────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('posts with snake_case conversion', async () => {
      mockPost.mockResolvedValue({ message: 'Password changed' });

      await changePassword('old-pass', 'NewPass123!');

      expect(mockPost).toHaveBeenCalledWith('/auth/change-password', {
        old_password: 'old-pass',
        new_password: 'NewPass123!',
      });
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('posts to /auth/forgot-password with skipAuth', async () => {
      mockPost.mockResolvedValue({ message: 'Reset email sent' });

      await forgotPassword('user@example.com');

      expect(mockPost).toHaveBeenCalledWith(
        '/auth/forgot-password',
        { email: 'user@example.com' },
        { skipAuth: true },
      );
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('posts with token and snake_case new_password, skipAuth', async () => {
      mockPost.mockResolvedValue({ message: 'Password reset' });

      await resetPassword('reset-tok', 'NewPassword123!');

      expect(mockPost).toHaveBeenCalledWith(
        '/auth/reset-password',
        { token: 'reset-tok', new_password: 'NewPassword123!' },
        { skipAuth: true },
      );
    });
  });

  // ── verifyEmail ───────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('posts to /auth/verify-email with skipAuth', async () => {
      mockPost.mockResolvedValue({ message: 'Email verified' });

      await verifyEmail('verify-tok');

      expect(mockPost).toHaveBeenCalledWith(
        '/auth/verify-email',
        { token: 'verify-tok' },
        { skipAuth: true },
      );
    });
  });

  // ── resendVerification ────────────────────────────────────────────────

  describe('resendVerification', () => {
    it('posts to /auth/resend-verification with skipAuth', async () => {
      mockPost.mockResolvedValue({ message: 'Sent' });

      await resendVerification('user@example.com');

      expect(mockPost).toHaveBeenCalledWith(
        '/auth/resend-verification',
        { email: 'user@example.com' },
        { skipAuth: true },
      );
    });
  });

  // ── setup2FA ──────────────────────────────────────────────────────────

  describe('setup2FA', () => {
    it('posts and returns {secret, qrUri} from snake_case response', async () => {
      mockPost.mockResolvedValue({
        secret: 'TOTP_SECRET',
        qr_code_uri: 'otpauth://totp/Mergenix?secret=TOTP_SECRET',
        backup_codes: ['b1', 'b2'],
      });

      const result = await setup2FA();

      expect(mockPost).toHaveBeenCalledWith('/auth/2fa/setup');
      expect(result).toEqual({
        secret: 'TOTP_SECRET',
        qrUri: 'otpauth://totp/Mergenix?secret=TOTP_SECRET',
      });
    });
  });

  // ── verify2FA ─────────────────────────────────────────────────────────

  describe('verify2FA', () => {
    it('posts code and returns {backupCodes} from snake_case response', async () => {
      mockPost.mockResolvedValue({
        message: '2FA enabled',
        backup_codes: ['bc1', 'bc2', 'bc3'],
      });

      const result = await verify2FA('123456');

      expect(mockPost).toHaveBeenCalledWith('/auth/2fa/verify', { code: '123456' });
      expect(result).toEqual({ backupCodes: ['bc1', 'bc2', 'bc3'] });
    });
  });

  // ── disable2FA ────────────────────────────────────────────────────────

  describe('disable2FA', () => {
    it('posts code to /auth/2fa/disable', async () => {
      mockPost.mockResolvedValue({ message: '2FA disabled' });

      await disable2FA('654321');

      expect(mockPost).toHaveBeenCalledWith('/auth/2fa/disable', { code: '654321' });
    });
  });

  // ── getGoogleOAuthUrl ─────────────────────────────────────────────────

  describe('getGoogleOAuthUrl', () => {
    it('GETs and returns authorizationUrl + state', async () => {
      mockGet.mockResolvedValue({
        authorization_url: 'https://accounts.google.com/...',
        state: 'rand-state',
      });

      const result = await getGoogleOAuthUrl();

      expect(mockGet).toHaveBeenCalledWith('/auth/oauth/google', { skipAuth: true });
      expect(result).toEqual({
        authorizationUrl: 'https://accounts.google.com/...',
        state: 'rand-state',
      });
    });
  });

  // ── googleCallback ────────────────────────────────────────────────────

  describe('googleCallback', () => {
    it('GETs with encoded params and returns tokens', async () => {
      mockGet.mockResolvedValue({
        access_token: 'google-at',
        refresh_token: 'google-rt',
        token_type: 'bearer',
        expires_in: 3600,
      });

      const result = await googleCallback('auth-code', 'state-val');

      expect(mockGet).toHaveBeenCalledWith(
        '/auth/oauth/google/callback?code=auth-code&state=state-val',
        { skipAuth: true },
      );
      expect(result).toEqual({ accessToken: 'google-at', expiresIn: 3600 });
    });

    it('encodes special characters in code and state', async () => {
      mockGet.mockResolvedValue({
        access_token: 'at',
        refresh_token: 'rt',
        token_type: 'bearer',
        expires_in: 3600,
      });

      await googleCallback('code with spaces', 'state&special');

      expect(mockGet).toHaveBeenCalledWith(
        '/auth/oauth/google/callback?code=code+with+spaces&state=state%26special',
        { skipAuth: true },
      );
    });
  });

  // ── getSessions ───────────────────────────────────────────────────────

  describe('getSessions', () => {
    it('GETs /auth/sessions and maps snake_case to camelCase', async () => {
      mockGet.mockResolvedValue([
        {
          id: 's1',
          device: 'Chrome',
          ip: '1.2.3.4',
          location: 'US',
          last_active: '2024-01-01T00:00:00Z',
          is_current: true,
        },
        {
          id: 's2',
          device: 'Firefox',
          ip: '5.6.7.8',
          location: 'UK',
          last_active: '2024-01-02T00:00:00Z',
          is_current: false,
        },
      ]);

      const sessions = await getSessions();

      expect(mockGet).toHaveBeenCalledWith('/auth/sessions');
      expect(sessions).toEqual([
        { id: 's1', device: 'Chrome', ip: '1.2.3.4', location: 'US', lastActive: '2024-01-01T00:00:00Z', isCurrent: true },
        { id: 's2', device: 'Firefox', ip: '5.6.7.8', location: 'UK', lastActive: '2024-01-02T00:00:00Z', isCurrent: false },
      ]);
    });
  });

  // ── revokeSession ─────────────────────────────────────────────────────

  describe('revokeSession', () => {
    it('DELETEs /auth/sessions/:id', async () => {
      mockDel.mockResolvedValue({ message: 'Session revoked' });

      await revokeSession('sess-42');

      expect(mockDel).toHaveBeenCalledWith('/auth/sessions/sess-42');
    });
  });

  // ── revokeAllSessions ─────────────────────────────────────────────────

  describe('revokeAllSessions', () => {
    it('DELETEs /auth/sessions', async () => {
      mockDel.mockResolvedValue({ message: 'All sessions revoked' });

      await revokeAllSessions();

      expect(mockDel).toHaveBeenCalledWith('/auth/sessions');
    });
  });

  // ── deleteAccount ─────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('posts to /auth/delete-account with password', async () => {
      mockPost.mockResolvedValue({ message: 'Account deleted' });

      await deleteAccount('my-password');

      expect(mockPost).toHaveBeenCalledWith('/auth/delete-account', { password: 'my-password' });
    });
  });
});
