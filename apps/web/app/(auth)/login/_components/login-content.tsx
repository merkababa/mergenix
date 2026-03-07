'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Variants } from 'motion/react';
import { AnimatePresence, m } from 'motion/react';
import { Mail, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DnaDots } from '@/components/auth/dna-dots';
import { OAuthButton } from '@/components/auth/oauth-button';
import { TrustSignals } from '@/components/auth/trust-signals';
import { useAuthStore } from '@/lib/stores/auth-store';
import { fadeUp } from '@/lib/animation-variants';
import { PasswordInput } from '@/components/auth/password-input';

// ── Animation variants ──────────────────────────────────────────────────

const errorBannerVariants: Variants = {
  hidden: { opacity: 0, y: -8, height: 0 },
  visible: {
    opacity: 1,
    y: 0,
    height: 'auto',
    transition: { duration: 0.25, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    height: 0,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
};

// ── Component ───────────────────────────────────────────────────────────

export function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnUrl = searchParams.get('returnUrl');
  const returnUrl =
    rawReturnUrl && rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//')
      ? rawReturnUrl
      : '/analysis';

  // Auth store — individual selectors (#17)
  const login = useAuthStore((s) => s.login);
  const login2FA = useAuthStore((s) => s.login2FA);
  const getGoogleOAuthUrl = useAuthStore((s) => s.getGoogleOAuthUrl);
  const isLoading = useAuthStore((s) => s.isLoading);
  const requires2FA = useAuthStore((s) => s.requires2FA);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');

  // Field-level validation
  const [emailTouched, setEmailTouched] = useState(false);
  const [, setPasswordTouched] = useState(false);

  // Refs
  const emailRef = useRef<HTMLInputElement>(null);
  const twoFARef = useRef<HTMLInputElement>(null);

  // Autofocus email on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Autofocus 2FA input when it appears
  useEffect(() => {
    if (requires2FA) {
      const timer = setTimeout(() => twoFARef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [requires2FA]);

  // Field validation
  const emailError =
    emailTouched && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? 'Please enter a valid email address'
      : undefined;

  // No client-side password validation on login — the backend rejects invalid credentials
  const passwordError = undefined;

  // ── Handlers ────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearError();

      if (requires2FA) {
        if (twoFACode.length !== 6) return;
        try {
          await login2FA(twoFACode);
          router.push(returnUrl);
        } catch {
          setTwoFACode('');
        }
        return;
      }

      setEmailTouched(true);
      setPasswordTouched(true);
      if (!email || !password || emailError || passwordError) return;

      try {
        const result = await login(email, password, rememberMe);
        if (result.success) {
          router.push(returnUrl);
        }
      } catch {
        // Error is set in the store
      }
    },
    [
      email,
      password,
      emailError,
      passwordError,
      requires2FA,
      twoFACode,
      returnUrl,
      rememberMe,
      login,
      login2FA,
      clearError,
      router,
    ],
  );

  const handleGoogleOAuth = useCallback(async () => {
    clearError();
    try {
      const { authorizationUrl, state } = await getGoogleOAuthUrl();
      // Validate URL before redirect — must be a real Google OAuth endpoint
      if (!authorizationUrl.startsWith('https://accounts.google.com/')) {
        useAuthStore.setState({ error: 'Invalid OAuth provider URL. Please try again.' });
        return;
      }
      sessionStorage.setItem('oauth_state', state);
      window.location.href = authorizationUrl;
    } catch {
      // Error is set in the store
    }
  }, [getGoogleOAuthUrl, clearError]);

  // Auto-submit 2FA when 6 digits are entered
  const handleTwoFAChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setTwoFACode(value);
    if (value.length === 6) {
      setTimeout(() => {
        const form = e.target.closest('form');
        form?.requestSubmit();
      }, 0);
    }
  }, []);

  return (
    <>
      {/* Login Card */}
      <m.div variants={fadeUp} initial="hidden" animate="visible">
        <GlassCard variant="strong" hover="none" className="glow-pulse p-8 md:p-10">
          {/* DNA dots — reusable component (#1) */}
          <DnaDots />

          {/* Title */}
          <h1 className="gradient-text font-heading mb-1 text-center text-3xl font-extrabold">
            Welcome Back
          </h1>
          <p className="font-body text-(--text-muted) mb-8 text-center text-sm">
            {requires2FA
              ? 'Enter the code from your authenticator app'
              : 'Sign in to access your genetic analysis'}
          </p>

          {/* Error banner */}
          <AnimatePresence mode="wait">
            {error && (
              <m.div
                key="error-banner"
                variants={errorBannerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mb-4 flex items-center gap-2 rounded-xl border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] p-3"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="text-(--accent-rose) h-4 w-4 shrink-0" />
                <p className="text-(--accent-rose) text-sm">{error}</p>
              </m.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!requires2FA ? (
              <m.div
                key="login-step"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Google OAuth — reusable component (#2) */}
                <OAuthButton
                  text="Sign in with Google"
                  onClick={handleGoogleOAuth}
                  isLoading={isLoading}
                />

                {/* Google data scope note (#13) */}
                <p className="text-(--text-dim) mt-2 text-center text-xs">
                  Google provides only your name and email. We never access your Google data.
                </p>

                {/* Divider */}
                <div className="my-6 flex items-center gap-3">
                  <div className="bg-(--border-subtle) h-px flex-1" />
                  <span className="font-body text-(--text-dim) text-xs">or sign in with email</span>
                  <div className="bg-(--border-subtle) h-px flex-1" />
                </div>

                {/* Form */}
                <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                  <Input
                    ref={emailRef}
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    icon={<Mail className="h-4 w-4" />}
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    error={emailError}
                    disabled={isLoading}
                    aria-required="true"
                  />

                  {/* Password with PasswordInput for proper eye toggle (#15) */}
                  <PasswordInput
                    label="Password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    error={passwordError}
                    disabled={isLoading}
                    aria-required="true"
                  />

                  <div className="flex items-center justify-between">
                    <label className="text-(--text-muted) flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="border-(--border-subtle) bg-(--bg-elevated) h-4 w-4 rounded-sm"
                        style={{ accentColor: 'var(--accent-teal)' }}
                      />
                      Remember me
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-(--accent-teal) hover:text-(--accent-cyan) text-xs transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </m.div>
            ) : (
              <m.div
                key="2fa-step"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* 2FA form */}
                <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                  <Input
                    ref={twoFARef}
                    label="Verification Code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="000000"
                    maxLength={6}
                    autoComplete="one-time-code"
                    className="text-center font-mono text-lg tracking-[0.3em]"
                    value={twoFACode}
                    onChange={handleTwoFAChange}
                    disabled={isLoading}
                    aria-required="true"
                    aria-label="Enter 6-digit verification code"
                  />

                  <p className="text-(--text-dim) text-center text-xs">
                    Enter the 6-digit code from your authenticator app.
                    <br />
                    It will auto-submit when complete.
                  </p>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                    disabled={isLoading || twoFACode.length !== 6}
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      // Proper state reset — clear 2FA challenge + form instead of full page reload
                      useAuthStore.setState({
                        requires2FA: false,
                        challengeToken: null,
                        error: null,
                      });
                      setTwoFACode('');
                      setEmail('');
                      setPassword('');
                      setEmailTouched(false);
                      setPasswordTouched(false);
                    }}
                    className="text-(--text-dim) hover:text-(--text-muted) w-full text-center text-xs transition-colors"
                  >
                    Use a different account
                  </button>
                </form>
              </m.div>
            )}
          </AnimatePresence>

          {/* Register link */}
          <p className="text-(--text-muted) mt-6 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-(--accent-teal) hover:text-(--accent-cyan) font-semibold transition-colors"
            >
              Create one free
            </Link>
          </p>
        </GlassCard>
      </m.div>

      {/* Trust footer — reusable component (#3, #5, #12) */}
      <m.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.15 }}>
        <TrustSignals
          lines={[
            'Your DNA never leaves your device',
            'Encrypted in transit. HIPAA-conscious design.',
            'Free tier — no credit card required.',
          ]}
        />
      </m.div>
    </>
  );
}
