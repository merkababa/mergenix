'use client';

import { useState, useCallback } from 'react';
import { DnaHelix3DDynamic } from '@/components/marketing/dna-helix-3d-dynamic';

export default function ComingSoonPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  const handleShakeEnd = useCallback(() => setShake(false), []);

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      if (error) setError('');
    },
    [error],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading || isSuccess) return;

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/coming-soon-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          // Full reload to pick up bypass cookie in middleware
          window.location.href = '/';
        }, 500);
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Invalid access code');
        // Trigger shake animation — reset is handled via onAnimationEnd
        setShake(true);
      }
    } catch {
      setError('Network error — please try again');
      setShake(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <main
        className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16${isSuccess ? 'page-fade-out' : ''}`}
        aria-label="Coming soon page"
      >
        {/* Background layer: 3D Helix + glow orbs */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.25]"
          style={{ filter: 'blur(3px)' }}
          aria-hidden="true"
        >
          {/* Teal glow orb — top-left area */}
          <div className="absolute -top-32 -left-32 h-[500px] w-[500px] bg-[radial-gradient(circle,rgba(6,214,160,0.12)_0%,transparent_70%)]" />
          {/* Violet glow orb — bottom-right area */}
          <div className="absolute -right-24 -bottom-24 h-[400px] w-[400px] bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,transparent_70%)]" />
          {/* 3D DNA Helix — fills entire background */}
          <DnaHelix3DDynamic className="h-full w-full" />
        </div>

        {/* Content layer */}
        <div className="relative z-10 flex w-full max-w-md flex-col items-center">
          {/* Mergenix wordmark — delay 0s */}
          <div className="fade-slide-up mb-4 text-center" style={{ animationDelay: '0s' }}>
            <span
              className="brand-text font-heading text-5xl font-extrabold tracking-tight sm:text-7xl"
              style={{ fontFamily: 'var(--font-sora), sans-serif' }}
            >
              Mergenix
            </span>
          </div>

          {/* "Coming Soon" headline — delay 0.15s */}
          <div className="fade-slide-up mb-3 text-center" style={{ animationDelay: '0.15s' }}>
            <h1
              className="headline-gradient text-3xl font-bold sm:text-4xl"
              style={{ fontFamily: 'var(--font-sora), sans-serif' }}
            >
              Coming Soon
            </h1>
          </div>

          {/* Tagline — delay 0.3s */}
          <div className="fade-slide-up mb-8 text-center" style={{ animationDelay: '0.3s' }}>
            <p
              className="text-lg text-slate-600 sm:text-xl dark:text-white/50"
              style={{ fontFamily: 'var(--font-lexend), sans-serif' }}
            >
              Explore Your Genetic Potential
            </p>
          </div>

          {/* Glassmorphism card with form — delay 0.5s */}
          <div className="fade-slide-up w-full" style={{ animationDelay: '0.5s' }}>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-6 backdrop-blur-md sm:p-8 dark:border-white/10 dark:bg-white/5">
              <p className="mb-4 text-center text-sm text-slate-700 dark:text-white/40">
                Have an access code? Enter it below to get early access.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                {/* Input container */}
                <div
                  className={`flex items-center rounded-xl border border-slate-300 bg-slate-50 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]${shake ? 'shake' : ''}`}
                  onAnimationEnd={handleShakeEnd}
                >
                  {/* Lock icon */}
                  <span className="flex shrink-0 items-center pr-2 pl-4" aria-hidden="true">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 text-slate-400 dark:text-white/35"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>

                  {/* Password field */}
                  <input
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Enter access code..."
                    autoComplete="current-password"
                    className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-slate-900 outline-hidden placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/30"
                    aria-label="Access code for team members"
                    aria-describedby={error ? 'password-error password-hint' : 'password-hint'}
                    aria-invalid={!!error}
                    disabled={isLoading || isSuccess}
                  />

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isLoading || isSuccess || !password}
                    className="submit-btn bg-accent-teal text-bio-deep m-1 flex shrink-0 items-center justify-center rounded-lg px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Submit access code"
                  >
                    {isLoading ? (
                      /* Spinner */
                      <svg
                        className="spinner h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      /* Arrow icon */
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Error message */}
                {error && (
                  <p
                    id="password-error"
                    className="mt-2.5 text-center text-xs text-rose-600 dark:text-rose-400"
                    role="alert"
                    aria-live="assertive"
                  >
                    {error}
                  </p>
                )}

                {/* Helper text */}
                <p
                  id="password-hint"
                  className="mt-2 text-center text-xs text-slate-500 dark:text-white/50"
                >
                  Team members only
                </p>
              </form>

              {/* Screen reader live region for status announcements */}
              <div aria-live="polite" className="sr-only">
                {isLoading && 'Verifying access code...'}
                {isSuccess && 'Access granted. Redirecting...'}
              </div>
            </div>
          </div>

          {/* Contact link — delay 0.7s */}
          <div className="fade-slide-up mt-6 text-center" style={{ animationDelay: '0.7s' }}>
            <p className="text-sm text-slate-600 dark:text-white/40">
              Need to get in touch?{' '}
              <a
                href="mailto:contact@mergenix.com"
                className="text-[var(--accent-teal)] transition-colors hover:opacity-75"
              >
                Contact Us
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="absolute right-0 bottom-0 left-0 pb-6">
          <div className="flex items-center justify-center gap-4 text-center">
            <p className="text-xs text-slate-500 dark:text-white/50">
              &copy; {new Date().getFullYear()} Mergenix
            </p>
            <span className="text-xs text-slate-500 dark:text-white/50" aria-hidden="true">
              |
            </span>
            <a
              href="/privacy"
              className="text-xs text-slate-500 underline hover:text-slate-700 dark:text-white/50 dark:hover:text-white/75"
            >
              Privacy Policy
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
