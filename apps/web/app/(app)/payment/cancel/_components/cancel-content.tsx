'use client';

import Link from 'next/link';
import { XCircle, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CancelContent() {
  return (
    <div className="mx-auto max-w-lg text-center">
      <GlassCard variant="medium" hover="none" className="p-8">
        <div role="status">
          <XCircle className="mx-auto h-16 w-16 text-[#ef4444]" aria-hidden="true" />

          <h1 className="gradient-text font-heading mt-6 text-3xl font-extrabold">
            Payment Cancelled
          </h1>

          <p className="text-(--text-muted) mt-3">
            Your payment was not completed. No charges were made.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link href="/products" className={cn(buttonVariants({ variant: 'primary', size: 'lg' }))}>
            Try Again
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>

          <Link href="/analysis" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }))}>
            Go to Dashboard
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
