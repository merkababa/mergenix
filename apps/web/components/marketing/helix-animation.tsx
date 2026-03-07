import { cn } from "@/lib/utils";

interface HelixAnimationProps {
  dotCount?: number;
  className?: string;
}

/**
 * Decorative DNA helix floating dots animation.
 * Uses the `helixFloat` keyframe animation defined in globals.css.
 * Purely decorative — hidden from assistive technologies.
 */
export function HelixAnimation({
  dotCount = 5,
  className,
}: HelixAnimationProps) {
  return (
    <div className={cn("relative", className)} aria-hidden="true">
      {Array.from({ length: dotCount }, (_, i) => {
        const isEven = i % 2 === 0;
        const delay = `${i * 0.6}s`;
        const duration = `${3.5 + i * 0.2}s`;
        const horizontalOffset = `${(i / (dotCount - 1 || 1)) * 100}%`;

        return (
          <span
            key={i}
            className={cn(
              "absolute h-1.5 w-1.5 rounded-full",
              isEven
                ? "bg-[#0EA5E9] shadow-[0_0_8px_rgba(14,165,233,0.3)]"
                : "bg-[#94A3B8] shadow-[0_0_8px_rgba(148,163,184,0.3)]",
            )}
            style={{
              left: horizontalOffset,
              top: "50%",
              transform: "translateY(-50%)",
              animation: `helixFloat ${duration} ease-in-out ${delay} infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
