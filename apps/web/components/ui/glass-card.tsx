import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

// ---------------------------------------------------------------------------
// CVA variant definitions
// ---------------------------------------------------------------------------
const glassCardVariants = cva(
  [
    "relative overflow-hidden rounded-card border border-(--border-subtle) transition-all duration-300",
    "shadow-sm",
    "in-data-[theme='light']:bg-[rgba(255,255,255,0.98)]",
    "in-data-[theme='light']:border-[rgba(0,0,0,0.08)]",
    "in-data-[theme='light']:shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
  ],
  {
    variants: {
      variant: {
        subtle: [
          "border-[rgba(148,163,184,0.05)] bg-[rgba(12,18,32,0.35)]",
          "[backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)]",
          "in-data-[theme='light']:bg-[rgba(255,255,255,0.4)]",
          "in-data-[theme='light']:border-[rgba(15,23,42,0.04)]",
        ],
        medium: [
          "border-(--glass-border) bg-white dark:bg-(--bg-glass)",
          "[backdrop-filter:blur(var(--glass-blur))] [-webkit-backdrop-filter:blur(var(--glass-blur))]",
        ],
        strong: [
          "border-[rgba(148,163,184,0.12)] bg-[rgba(12,18,32,0.85)]",
          "[backdrop-filter:blur(24px)] [-webkit-backdrop-filter:blur(24px)]",
          "in-data-[theme='light']:bg-[rgba(255,255,255,0.9)]",
          "in-data-[theme='light']:border-[rgba(15,23,42,0.08)]",
        ],
      },
      hover: {
        none: "",
        glow: "hover:-translate-y-1.5 hover:shadow-md",
        lift: "hover:-translate-y-1.5 hover:shadow-md",
        border: "hover:border-(--accent-teal)",
      },
      rainbow: {
        true: "rainbow-bar",
        false: "",
      },
    },
    defaultVariants: {
      variant: "medium",
      hover: "lift",
      rainbow: false,
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface GlassCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

// ---------------------------------------------------------------------------
// GlassCard
// ---------------------------------------------------------------------------
export function GlassCard({
  className,
  variant,
  hover,
  rainbow,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        glassCardVariants({ variant, hover, rainbow }),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
