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
        const delay = `${i * 0.4}s`;
        const duration = `${2.2 + i * 0.15}s`;
        const horizontalOffset = `${(i / (dotCount - 1 || 1)) * 100}%`;

        return (
          <span
            key={i}
            className={cn(
              "absolute h-2 w-2 rounded-full",
              isEven
                ? "bg-gradient-to-br from-[#06d6a0] to-[#059669] shadow-[0_0_12px_rgba(6,214,160,0.5)]"
                : "bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] shadow-[0_0_12px_rgba(139,92,246,0.5)]",
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
