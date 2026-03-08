'use client';

import { useState, useCallback, useRef, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { Mail, User, CheckCircle2 } from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { DnaDots } from '@/components/auth/dna-dots';
import { OAuthButton } from '@/components/auth/oauth-button';
import { TrustSignals } from '@/components/auth/trust-signals';
import { PasswordInput } from '@/components/auth/password-input';
import { PasswordStrengthDisplay } from '@/components/auth/password-strength-display';
import { AgeVerificationModal } from '@/components/legal/age-verification-modal';
import { useAuthStore } from '@/lib/stores/auth-store';
import { fadeUp } from '@/lib/animation-variants';
import { validatePassword as validatePasswordUtil } from '@/lib/password-utils';

// ── Validation ──────────────────────────────────────────────────────────

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  terms?: string;
}

function validateName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required';
  if (trimmed.length < 2) return 'Name must be at least 2 characters';
  if (trimmed.length > 100) return 'Name must be 100 characters or fewer';
  return undefined;
}

function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Please enter a valid email address';
  }
  return undefined;
}

function validatePassword(password: string): string | undefined {
  const result = validatePasswordUtil(password);
  return result.valid ? undefined : result.errors[0];
}

// ── Animation variants ──────────────────────────────────────────────────

const formVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: { duration: 0.3, ease: 'easeIn' as const },
  },
};

const successVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const, delay: 0.15 },
  },
};

const envelopeVariants = {
  hidden: { scale: 0, rotate: -15 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20, delay: 0.2 },
  },
};

// ── Component ───────────────────────────────────────────────────────────

export function RegisterContent() {
  // ── Form state ──
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Resend cooldown (#9)
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSent, setResendSent] = useState(false);

  // ── Auth store — individual selectors (#17) ──
  const register = useAuthStore((s) => s.register);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const getGoogleOAuthUrl = useAuthStore((s) => s.getGoogleOAuthUrl);
  const isLoading = useAuthStore((s) => s.isLoading);
  const clearError = useAuthStore((s) => s.clearError);

  // ── Refs ──
  const nameRef = useRef<HTMLInputElement>(null);

  // ── Resend cooldown timer (#9) ──
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ── Field blur validation ──
  const handleBlur = useCallback(
    (field: keyof FieldErrors) => {
      setTouchedFields((prev) => new Set(prev).add(field));
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        switch (field) {
          case 'name':
            newErrors.name = validateName(name);
            break;
          case 'email':
            newErrors.email = validateEmail(email);
            break;
          case 'password':
            newErrors.password = validatePassword(password);
            break;
        }
        return newErrors;
      });
    },
    [name, email, password],
  );

  // ── Full form validation ──
  const validateAll = useCallback((): boolean => {
    const errors: FieldErrors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      terms: acceptedTerms ? undefined : 'You must accept the terms',
    };
    setFieldErrors(errors);
    setTouchedFields(new Set(['name', 'email', 'password', 'terms']));
    return !errors.name && !errors.email && !errors.password && !errors.terms;
  }, [name, email, password, acceptedTerms]);

  // ── Submit handler ──
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setGeneralError(null);
      clearError();

      if (!validateAll()) return;

      try {
        await register(name.trim(), email.trim(), password);
        setRegisteredEmail(email.trim());
        setRegistrationSuccess(true);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Registration failed. Please try again.';
        setGeneralError(message);
      }
    },
    [name, email, password, validateAll, register, clearError],
  );

  // ── Google OAuth handler ──
  const handleGoogleSignup = useCallback(async () => {
    setGeneralError(null);
    clearError();
    try {
      const { authorizationUrl, state } = await getGoogleOAuthUrl();
      if (!authorizationUrl.startsWith('https://accounts.google.com/')) {
        setGeneralError('Invalid OAuth provider URL. Please try again.');
        return;
      }
      sessionStorage.setItem('oauth_state', state);
      window.location.href = authorizationUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not initiate Google sign-up.';
      setGeneralError(message);
    }
  }, [getGoogleOAuthUrl, clearError]);

  // ── Resend verification email handler (#9) ──
  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    try {
      await resendVerification(registeredEmail);
      setResendSent(true);
      setResendCooldown(60);
    } catch {
      // Anti-enumeration: show success regardless
      setResendSent(true);
      setResendCooldown(60);
    }
  }, [resendCooldown, resendVerification, registeredEmail]);

  // ── Render ──
  return (
    <>
      {/* Age verification must be completed before registration */}
      <AgeVerificationModal />

      <AnimatePresence mode="wait">
        {!registrationSuccess ? (
          /* ────────────────── Registration Form ────────────────── */
          <m.div
            key="register-form"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <GlassCard variant="strong" hover="none" className="glow-pulse p-8 md:p-10">
              {/* DNA dots — reusable component (#1) */}
              <DnaDots />

              {/* Title */}
              <h1 className="gradient-text font-heading mb-1 text-center text-3xl font-extrabold">
                Create Account
              </h1>
              {/* Value proposition subtitle (#11) */}
              <p className="font-body mb-8 text-center text-sm text-(--text-muted)">
                Predict offspring health risks and traits.
                <br />
                100% private — your DNA never leaves your device.
              </p>

              {/* General error banner */}
              <AnimatePresence mode="wait">
                {generalError && (
                  <m.div
                    key="error"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-4 rounded-xl border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-sm text-(--accent-rose)"
                    role="alert"
                  >
                    {generalError}
                  </m.div>
                )}
              </AnimatePresence>

              {/* Google OAuth — reusable component (#2) */}
              <OAuthButton
                text="Sign up with Google"
                onClick={handleGoogleSignup}
                isLoading={isLoading}
              />

              {/* Google data scope note (#13) */}
              <p className="mt-2 text-center text-xs text-(--text-dim)">
                Google provides only your name and email. We never access your Google data.
              </p>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-(--border-subtle)" />
                <span className="font-body text-xs text-(--text-dim)">or create with email</span>
                <div className="h-px flex-1 bg-(--border-subtle)" />
              </div>

              {/* Form */}
              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                {/* Name field */}
                <Input
                  ref={nameRef}
                  label="Full Name"
                  type="text"
                  placeholder="John Doe"
                  icon={<User className="h-4 w-4" />}
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (touchedFields.has('name')) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        name: validateName(e.target.value),
                      }));
                    }
                  }}
                  onBlur={() => handleBlur('name')}
                  error={touchedFields.has('name') ? fieldErrors.name : undefined}
                  disabled={isLoading}
                  aria-required="true"
                />

                {/* Email field */}
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  icon={<Mail className="h-4 w-4" />}
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touchedFields.has('email')) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        email: validateEmail(e.target.value),
                      }));
                    }
                  }}
                  onBlur={() => handleBlur('email')}
                  error={touchedFields.has('email') ? fieldErrors.email : undefined}
                  disabled={isLoading}
                  aria-required="true"
                />

                {/* Password field — using PasswordInput (#15) */}
                <PasswordInput
                  label="Password"
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({
                      ...prev,
                      password: validatePassword(e.target.value),
                    }));
                  }}
                  onBlur={() => handleBlur('password')}
                  error={touchedFields.has('password') ? fieldErrors.password : undefined}
                  disabled={isLoading}
                  aria-required="true"
                />

                {/* Password strength + requirements — shared component (#4) */}
                <PasswordStrengthDisplay password={password} />

                {/* Terms checkbox */}
                <div>
                  <label className="flex items-start gap-2.5 text-sm text-(--text-muted)">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => {
                        setAcceptedTerms(e.target.checked);
                        if (touchedFields.has('terms')) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            terms: e.target.checked ? undefined : 'You must accept the terms',
                          }));
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded-sm border-(--border-subtle) bg-(--bg-elevated)"
                      aria-required="true"
                    />
                    <span>
                      I agree to the{' '}
                      <Link
                        href="/legal"
                        className="font-medium text-(--accent-teal) hover:text-(--accent-cyan)"
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/legal#privacy"
                        className="font-medium text-(--accent-teal) hover:text-(--accent-cyan)"
                      >
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {touchedFields.has('terms') && fieldErrors.terms && (
                    <p className="mt-1 ml-6.5 text-xs text-(--accent-rose)" role="alert">
                      {fieldErrors.terms}
                    </p>
                  )}
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!acceptedTerms}
                  isLoading={isLoading}
                >
                  Create Account
                </Button>
              </form>

              {/* Login link */}
              <p className="mt-6 text-center text-sm text-(--text-muted)">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-(--accent-teal) transition-colors hover:text-(--accent-cyan)"
                >
                  Sign in
                </Link>
              </p>
            </GlassCard>

            {/* Trust footer — reusable component (#3, #5) */}
            <m.div variants={fadeUp} initial="hidden" animate="visible">
              <TrustSignals
                lines={[
                  'Your DNA never leaves your device',
                  'No credit card required. Free tier available.',
                  'Encrypted in transit. HIPAA-conscious design.',
                ]}
              />
            </m.div>
          </m.div>
        ) : (
          /* ────────────────── Success Screen ────────────────── */
          <m.div
            key="register-success"
            variants={successVariants}
            initial="hidden"
            animate="visible"
          >
            <GlassCard variant="strong" hover="none" className="p-8 text-center md:p-10">
              {/* Animated envelope icon */}
              <m.div
                variants={envelopeVariants}
                initial="hidden"
                animate="visible"
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(6,214,160,0.1)] ring-1 ring-[rgba(6,214,160,0.2)]"
              >
                <Mail className="h-10 w-10 text-(--accent-teal)" />
              </m.div>

              {/* Animated checkmark */}
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring' as const,
                  stiffness: 260,
                  damping: 20,
                  delay: 0.4,
                }}
                className="mx-auto -mt-4 mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-(--accent-teal)"
              >
                <CheckCircle2 className="h-5 w-5 text-(--bg-deep)" aria-hidden="true" />
              </m.div>

              <h1 className="gradient-text font-heading mb-2 text-2xl font-extrabold">
                Check your email
              </h1>

              <p className="mb-2 text-sm text-(--text-primary)">
                Verification email sent to{' '}
                <strong className="text-(--accent-teal)">{registeredEmail}</strong>
              </p>

              <p className="mb-6 text-sm text-(--text-muted)">
                Check your inbox and click the link to verify your account. The link will expire in
                24 hours.
              </p>

              {/* Resend button with cooldown (#9) */}
              <Button
                variant="secondary"
                size="md"
                className="mb-3 w-full"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isLoading}
                isLoading={isLoading}
              >
                {resendCooldown > 0
                  ? `Resend Email (${resendCooldown}s)`
                  : resendSent
                    ? 'Email Resent'
                    : 'Resend Email'}
              </Button>

              {/* Resend / help text */}
              <p className="mb-6 text-xs text-(--text-dim)">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationSuccess(false);
                    setPassword('');
                    setGeneralError(null);
                  }}
                  className="font-medium text-(--accent-teal) underline decoration-(--accent-teal)/30 underline-offset-2 transition-colors hover:text-(--accent-cyan)"
                >
                  try again with a different email
                </button>
              </p>

              {/* Back to login — touch target padding (#16) */}
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'w-full')}
              >
                Back to Sign In
              </Link>
            </GlassCard>

            {/* Trust footer */}
            <m.div variants={fadeUp} initial="hidden" animate="visible">
              <TrustSignals
                lines={[
                  'Your DNA never leaves your device',
                  'Encrypted in transit. HIPAA-conscious design.',
                ]}
              />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
