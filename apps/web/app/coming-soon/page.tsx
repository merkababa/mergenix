'use client';

import { useState } from 'react';

export default function ComingSoonPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);

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
      {/* Full-viewport layout — no card, elements float in the gradient */}
      <main
        className={`relative flex min-h-screen flex-col items-center justify-center px-4 py-16${isSuccess ? 'page-fade-out' : ''}`}
        aria-label="Coming soon page"
      >
        {/* DNA helix — delay 0s */}
        <div className="fade-slide-up mb-8 flex justify-center" style={{ animationDelay: '0s' }}>
          <div className="relative flex items-center justify-center">
            {/* Teal halo */}
            <div
              className="bg-accent-teal absolute rounded-full opacity-20"
              style={{ width: '11rem', height: '11rem', filter: 'blur(32px)' }}
              aria-hidden="true"
            />
            {/* DNA SVG — big, rotating, glowing */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#06d6a0"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dna-spin relative h-28 w-28 sm:h-32 sm:w-32"
              aria-label="Mergenix DNA helix logo"
              role="img"
            >
              <path d="m10 16 1.5 1.5" />
              <path d="m14 8-1.5-1.5" />
              <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
              <path d="m16.5 10.5 1 1" />
              <path d="m17 6-2.891-2.891" />
              <path d="M2 15c6.667-6 13.333 0 20-6" />
              <path d="m20 9 .891.891" />
              <path d="M3.109 14.109 4 15" />
              <path d="m6.5 12.5 1 1" />
              <path d="m7 18 2.891 2.891" />
              <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
            </svg>
          </div>
        </div>

        {/* Mergenix wordmark — delay 0.15s */}
        <div className="fade-slide-up mb-6 text-center" style={{ animationDelay: '0.15s' }}>
          <span
            className="brand-text font-heading text-5xl font-extrabold tracking-tight sm:text-7xl"
            style={{ fontFamily: 'var(--font-sora), sans-serif' }}
          >
            Mergenix
          </span>
        </div>

        {/* "Coming Soon" headline — delay 0.3s */}
        <div className="fade-slide-up mb-4 text-center" style={{ animationDelay: '0.3s' }}>
          <h1
            className="headline-gradient text-3xl font-bold sm:text-4xl"
            style={{ fontFamily: 'var(--font-sora), sans-serif' }}
          >
            Coming Soon
          </h1>
        </div>

        {/* Tagline — delay 0.4s */}
        <div className="fade-slide-up mb-10 text-center" style={{ animationDelay: '0.4s' }}>
          <p
            className="text-lg text-white/50 sm:text-xl"
            style={{ fontFamily: 'var(--font-lexend), sans-serif' }}
          >
            Explore Your Genetic Potential
          </p>
        </div>

        {/* Password input — delay 0.6s */}
        <div className="fade-slide-up w-full max-w-sm" style={{ animationDelay: '0.6s' }}>
          <form onSubmit={handleSubmit} noValidate>
            {/* Input container */}
            <div
              className={`input-wrapper bg-white/6 flex items-center rounded-xl border border-white/10 backdrop-blur-xl${shake ? 'shake' : ''}`}
              onAnimationEnd={() => setShake(false)}
            >
              {/* Lock icon */}
              <span className="flex shrink-0 items-center pl-4 pr-2" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>

              {/* Password field */}
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter access code..."
                autoComplete="current-password"
                className="outline-hidden min-w-0 flex-1 bg-transparent py-3.5 text-sm text-white placeholder:text-white/30"
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
                className="mt-2.5 text-center text-xs text-rose-400"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            )}

            {/* Helper text */}
            <p id="password-hint" className="mt-2 text-center text-xs text-white/50">
              Team members only
            </p>
          </form>

          {/* Screen reader live region for status announcements */}
          <div aria-live="polite" className="sr-only">
            {isLoading && 'Verifying access code...'}
            {isSuccess && 'Access granted. Redirecting...'}
          </div>
        </div>

        {/* Contact link — delay 0.8s */}
        <div className="fade-slide-up mt-6 text-center" style={{ animationDelay: '0.8s' }}>
          <p className="text-sm text-white/40">
            Need to get in touch?{' '}
            <a
              href="mailto:contact@mergenix.com"
              className="text-accent-teal hover:text-accent-teal/75 transition-colors"
            >
              Contact Us
            </a>
          </p>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-0 left-0 right-0 pb-6">
          <div className="flex items-center justify-center gap-4 text-center">
            <p className="text-xs text-white/50">&copy; {new Date().getFullYear()} Mergenix</p>
            <span className="text-xs text-white/50" aria-hidden="true">
              |
            </span>
            <a href="/privacy" className="text-xs text-white/50 underline hover:text-white/75">
              Privacy Policy
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
