import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[10px] px-3 py-1 font-heading text-xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        /* Severity levels */
        critical: "border border-[rgba(244,63,94,0.4)] bg-[rgba(244,63,94,0.15)] text-[#f43f5e] [[data-theme='light']_&]:text-[#be123c]",
        high: "border border-[rgba(244,63,94,0.4)] bg-[rgba(244,63,94,0.15)] text-[#f43f5e] [[data-theme='light']_&]:text-[#be123c]",
        moderate: "border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.15)] text-[#f59e0b] [[data-theme='light']_&]:text-[#b45309]",
        low: "border border-[rgba(6,214,160,0.4)] bg-[rgba(6,214,160,0.15)] text-[#06d6a0] [[data-theme='light']_&]:text-[#047857]",

        /* Confidence levels */
        "confidence-high": "border border-[rgba(6,214,160,0.35)] bg-[rgba(6,214,160,0.12)] text-[#06d6a0] [[data-theme='light']_&]:text-[#047857]",
        "confidence-medium": "border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] text-[#f59e0b] [[data-theme='light']_&]:text-[#b45309]",
        "confidence-low": "border border-[rgba(244,63,94,0.35)] bg-[rgba(244,63,94,0.12)] text-[#f43f5e] [[data-theme='light']_&]:text-[#be123c]",

        /* Tier badges */
        free: "border border-[rgba(148,163,184,0.3)] bg-[rgba(148,163,184,0.12)] text-[#94a3b8]",
        premium: "border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.12)] text-[#8b5cf6] [[data-theme='light']_&]:text-[#7e22ce]",
        pro: "border border-[rgba(6,214,160,0.3)] bg-[rgba(6,214,160,0.12)] text-[#06d6a0] [[data-theme='light']_&]:text-[#047857]",

        /* Carrier status */
        carrier: "border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] text-[#f59e0b] [[data-theme='light']_&]:text-[#b45309]",
        affected: "border border-[rgba(244,63,94,0.35)] bg-[rgba(244,63,94,0.12)] text-[#f43f5e] [[data-theme='light']_&]:text-[#be123c]",
        normal: "border border-[rgba(6,214,160,0.35)] bg-[rgba(6,214,160,0.12)] text-[#06d6a0] [[data-theme='light']_&]:text-[#047857]",

        /* Inheritance model */
        "autosomal-recessive": "border border-[rgba(6,182,212,0.35)] bg-[rgba(6,182,212,0.12)] text-[#06b6d4] [[data-theme='light']_&]:text-[#0e7490]",
        "autosomal-dominant": "border border-[rgba(139,92,246,0.35)] bg-[rgba(139,92,246,0.12)] text-[#8b5cf6] [[data-theme='light']_&]:text-[#7e22ce]",
        "x-linked": "border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] text-[#f59e0b] [[data-theme='light']_&]:text-[#b45309]",
        "complex": "border border-[rgba(168,85,247,0.35)] bg-[rgba(168,85,247,0.12)] text-[#a855f7] [[data-theme='light']_&]:text-[#7e22ce]",

        /* Neutral */
        default: "border border-[var(--glass-border)] bg-[rgba(148,163,184,0.06)] text-[var(--text-body)]",
        outline: "border border-[var(--glass-border)] bg-transparent text-[var(--text-body)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}
