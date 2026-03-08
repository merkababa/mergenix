import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
}

export function Skeleton({ className, variant = 'text', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-shimmer bg-size-[200%_100%]',
        'bg-linear-to-r from-(--bg-elevated) via-(--border-subtle) to-(--bg-elevated)',
        {
          'h-4 w-full rounded-lg': variant === 'text',
          'h-10 w-10 rounded-full': variant === 'circular',
          'h-32 w-full rounded-2xl': variant === 'rectangular',
          'rounded-glass h-48 w-full border border-(--border-subtle)': variant === 'card',
        },
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Multi-line skeleton card matching the disease card layout */
export function SkeletonCard() {
  return (
    <div className="rounded-glass overflow-hidden border border-(--border-subtle) bg-(--bg-glass) p-5">
      <Skeleton className="mb-3 h-5 w-3/5" />
      <Skeleton className="mb-2 h-3 w-full" />
      <Skeleton className="mb-4 h-3 w-2/5" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-[10px]" />
        <Skeleton className="h-6 w-24 rounded-[10px]" />
      </div>
    </div>
  );
}
