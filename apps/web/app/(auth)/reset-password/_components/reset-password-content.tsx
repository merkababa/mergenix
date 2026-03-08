'use client';

import { useState, useMemo, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { m, AnimatePresence } from 'motion/react';
import { Lock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { PasswordInput } from '@/components/auth/password-input';
import { PasswordStrengthDisplay } from '@/components/auth/password-strength-display';
import { DnaDots } from '@/components/auth/dna-dots';
import { TrustSignals } from '@/components/auth/trust-signals';
import { useAuthStore } from '@/lib/stores/auth-store';
import { fadeUp } from '@/lib/animation-variants';
import { validatePassword, getPasswordStrength } from '@/lib/password-utils';

type PageState = 'form' | 'success' | 'error';

export function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pageState, setPageState] = useState<PageState>(token ? 'form' : 'error');
  const [errorMessage, setErrorMessage] = useState(
    token ? '' : 'No reset token found. Please request a new reset link.',
  );

  const resetPassword = useAuthStore((s) => s.resetPassword);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError(undefined);
    if (!token || password !== confirmPassword) return;

    // Validate password before calling API
    const validation = validatePassword(password);
    if (!validation.valid) {
      setPasswordError(validation.errors[0]);
      return;
    }

    try {
      await resetPassword(token, password);
      setPageState('success');
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Invalid or expired reset token. Please request a new link.',
      );
      setPageState('error');
    }
  }

  return (
    <>
      <m.div variants={fadeUp} initial="hidden" animate="visible">
        {/* GlassCard variant="strong" with glow-pulse (#6) */}
        <GlassCard variant="strong" hover="none" className="glow-pulse w-full max-w-md p-8">
          <AnimatePresence mode="wait">
            {pageState === 'form' && (
              <m.div
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                {/* DNA dots — reusable component */}
                <DnaDots />

                {/* Header */}
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(6,214,160,0.1)]">
                    <Lock className="h-7 w-7 text-(--accent-teal)" />
                  </div>
                  <h1 className="gradient-text font-heading text-2xl font-extrabold">
                    Reset Password
                  </h1>
                  <p className="mt-2 text-sm text-(--text-muted)">
                    Choose a new password for your account.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  {/* New password — using PasswordInput (#15) */}
                  <PasswordInput
                    label="New Password"
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(undefined);
                    }}
                    error={passwordError}
                    aria-required="true"
                  />

                  {/* Password strength + requirements — shared component (#4) */}
                  <PasswordStrengthDisplay password={password} />

                  {/* Confirm password — using PasswordInput (#15) */}
                  <PasswordInput
                    label="Confirm Password"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={passwordsMismatch ? 'Passwords do not match' : undefined}
                    aria-required="true"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                    disabled={!passwordsMatch || strength.level === 'weak'}
                  >
                    Reset Password
                  </Button>
                </form>

                {/* Back to Login — touch target padding (#16) */}
                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 py-2 text-sm text-(--text-muted) transition-colors hover:text-(--accent-teal)"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Login
                  </Link>
                </div>
              </m.div>
            )}

            {pageState === 'success' && (
              <m.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(6,214,160,0.1)]">
                  <CheckCircle className="h-7 w-7 text-(--accent-teal)" aria-hidden="true" />
                </div>
                <h1 className="gradient-text font-heading text-2xl font-extrabold">
                  Password Reset!
                </h1>
                <p className="mt-3 text-sm text-(--text-muted)">
                  Your password has been successfully reset. You can now sign in with your new
                  password.
                </p>
                <div className="mt-6">
                  <Link
                    href="/login"
                    className={buttonVariants({
                      variant: 'primary',
                      size: 'lg',
                      className: 'w-full',
                    })}
                  >
                    Sign In
                  </Link>
                </div>
              </m.div>
            )}

            {pageState === 'error' && (
              <m.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(244,63,94,0.1)]">
                  <XCircle className="h-7 w-7 text-(--accent-rose)" aria-hidden="true" />
                </div>
                <h1 className="font-heading text-2xl font-extrabold text-(--text-primary)">
                  Reset Failed
                </h1>
                <p className="mt-3 text-sm text-(--text-muted)">{errorMessage}</p>
                <div className="mt-6 space-y-3">
                  <Link
                    href="/forgot-password"
                    className={buttonVariants({
                      variant: 'primary',
                      size: 'lg',
                      className: 'w-full',
                    })}
                  >
                    Request New Link
                  </Link>
                  {/* Touch target padding (#16) */}
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 py-2 text-sm text-(--text-muted) transition-colors hover:text-(--accent-teal)"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Login
                  </Link>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </m.div>

      {/* Trust footer — reusable component */}
      <m.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.15 }}>
        <TrustSignals />
      </m.div>
    </>
  );
}
