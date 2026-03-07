import { cn } from '@/lib/utils';

// ── Constants — hoisted outside component body ────────────────────────────────

/** Default number of dots in the fallback helix animation. */
const DEFAULT_DOT_COUNT = 5;

// ── Component ─────────────────────────────────────────────────────────────────

interface HelixFallbackProps {
  /** Number of animated dots. Default: 5 */
  dotCount?: number;
  /** Optional Tailwind / CSS class for the container */
  className?: string;
}

/**
 * CSS-only fallback for the 3D DNA helix.
 * Shown while the Three.js canvas loads or when JS is unavailable.
 * Purely decorative — hidden from assistive technologies.
 */
export function HelixFallback({ dotCount = DEFAULT_DOT_COUNT, className }: HelixFallbackProps) {
  return (
    <div className={cn('relative h-full w-full', className)} aria-hidden="true">
      {Array.from({ length: dotCount }, (_, i) => {
        const isEven = i % 2 === 0;
        const delay = `${i * 0.4}s`;
        const duration = `${2.2 + i * 0.15}s`;
        const horizontalOffset = `${(i / (dotCount - 1 || 1)) * 100}%`;

        return (
          <span
            key={i}
            className={cn(
              'absolute h-1.5 w-1.5 rounded-full',
              // Muted medical palette: sky blue + slate gray
              isEven
                ? 'bg-[#0EA5E9] shadow-[0_0_8px_rgba(14,165,233,0.3)]'
                : 'bg-[#94A3B8] shadow-[0_0_8px_rgba(148,163,184,0.3)]',
            )}
            style={{
              left: horizontalOffset,
              top: '50%',
              transform: 'translateY(-50%)',
              animation: `helixFloat ${duration} ease-in-out ${delay} infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
