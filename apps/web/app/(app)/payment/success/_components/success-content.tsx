'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';

/** WCAG 2.2.1: 20 seconds minimum so users have time to read. */
const REDIRECT_DELAY_SECONDS = 20;

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const user = useAuthStore((s) => s.user);

  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS);
  const [isVerifying, setIsVerifying] = useState(!!sessionId);

  /** Only announce at key moments to avoid chatty screen-reader output. */
  const countdownAnnouncement = useMemo(() => {
    if (countdown === REDIRECT_DELAY_SECONDS)
      return `Redirecting in ${REDIRECT_DELAY_SECONDS} seconds`;
    if (countdown === 10) return 'Redirecting in 10 seconds';
    if (countdown === 5) return 'Redirecting in 5 seconds';
    if (countdown <= 0) return 'Redirecting now';
    return '';
  }, [countdown]);

  const redirectToSubscription = useCallback(() => {
    router.push('/subscription');
  }, [router]);

  // Refresh user profile to pick up the updated tier from the webhook
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function refreshProfile() {
      try {
        await fetchProfile();
      } catch {
        // If fetchProfile fails, still show success — the webhook processed it
      } finally {
        if (!cancelled) {
          setIsVerifying(false);
        }
      }
    }

    refreshProfile();

    return () => {
      cancelled = true;
    };
  }, [sessionId, fetchProfile]);

  // Countdown timer — only starts after verification completes
  useEffect(() => {
    if (isVerifying) return;
    if (countdown <= 0) {
      redirectToSubscription();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, redirectToSubscription, isVerifying]);

  if (isVerifying) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <GlassCard variant="medium" hover="none" className="p-8">
          <div role="status" aria-live="polite">
            <Loader2
              className="mx-auto h-16 w-16 animate-spin text-(--accent-teal)"
              aria-hidden="true"
            />
            <h1 className="gradient-text font-heading mt-6 text-3xl font-extrabold">
              Verifying your purchase...
            </h1>
            <p className="mt-3 text-(--text-muted)">Please wait while we confirm your payment.</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg text-center">
      <GlassCard variant="medium" hover="none" className="p-8">
        <div role="status" aria-live="polite">
          <CheckCircle2 className="text-accent-teal mx-auto h-16 w-16" aria-hidden="true" />

          <h1 className="gradient-text font-heading mt-6 text-3xl font-extrabold">
            Payment Successful!
          </h1>

          <p className="mt-3 text-(--text-muted)">
            Your account has been upgraded
            {user?.tier && user.tier !== 'free'
              ? ` to ${user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}`
              : ''}
            . Thank you for your purchase!
          </p>

          {sessionId && <p className="mt-2 text-xs text-(--text-dim)">Session: {sessionId}</p>}
        </div>

        <p className="mt-6 text-sm text-(--text-muted)">
          Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
        </p>

        {/* Screen-reader announcement — only updates at key moments */}
        <p className="sr-only" aria-live="polite" role="status">
          {countdownAnnouncement}
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/subscription"
            className={cn(buttonVariants({ variant: 'primary', size: 'lg' }))}
          >
            Go to My Plan
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>

          <Link href="/products" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }))}>
            View Products
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}

export function SuccessContent() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg text-center">
          <GlassCard variant="medium" hover="none" className="p-8">
            <div className="animate-pulse">
              <div className="mx-auto h-16 w-16 rounded-full bg-(--bg-elevated)" />
              <div className="mx-auto mt-6 h-8 w-48 rounded-sm bg-(--bg-elevated)" />
              <div className="mx-auto mt-3 h-4 w-64 rounded-sm bg-(--bg-elevated)" />
            </div>
          </GlassCard>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
