import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const glassCardVariants = cva(
  [
    "relative overflow-hidden rounded-[20px] border transition-all duration-300",
    "shadow-[0_4px_30px_var(--shadow-ambient),inset_0_1px_0_var(--inset-highlight)]",
  ],
  {
    variants: {
      variant: {
        subtle: [
          "border-[rgba(148,163,184,0.05)] bg-[rgba(12,18,32,0.35)]",
          "[backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)]",
          "[[data-theme='light']_&]:bg-[rgba(255,255,255,0.4)]",
          "[[data-theme='light']_&]:border-[rgba(15,23,42,0.04)]",
        ],
        medium: [
          "border-[var(--glass-border)] bg-[var(--bg-glass)]",
          "[backdrop-filter:blur(var(--glass-blur))] [-webkit-backdrop-filter:blur(var(--glass-blur))]",
        ],
        strong: [
          "border-[rgba(148,163,184,0.12)] bg-[rgba(12,18,32,0.85)]",
          "[backdrop-filter:blur(24px)] [-webkit-backdrop-filter:blur(24px)]",
          "[[data-theme='light']_&]:bg-[rgba(255,255,255,0.9)]",
          "[[data-theme='light']_&]:border-[rgba(15,23,42,0.08)]",
        ],
      },
      hover: {
        none: "",
        glow: "hover:-translate-y-1 hover:shadow-[0_12px_40px_var(--shadow-elevated),0_0_30px_var(--glow-teal)] hover:border-[rgba(6,214,160,0.2)]",
        lift: "hover:-translate-y-1.5 hover:shadow-[0_16px_50px_var(--shadow-elevated)]",
      },
      rainbow: {
        true: "rainbow-bar",
        false: "",
      },
    },
    defaultVariants: {
      variant: "medium",
      hover: "glow",
      rainbow: false,
    },
  },
);

interface GlassCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

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
      className={cn(glassCardVariants({ variant, hover, rainbow }), className)}
      {...props}
    >
      {children}
    </div>
  );
}
