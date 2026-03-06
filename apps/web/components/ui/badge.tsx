import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[10px] px-3 py-1 font-heading text-xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        /* Severity levels */
        critical: "border border-[rgba(220,38,38,0.5)] bg-[rgba(220,38,38,0.20)] text-[#ef4444] in-data-[theme='light']:text-[#b91c1c] font-bold",
        high: "border border-[rgba(244,63,94,0.4)] bg-[rgba(244,63,94,0.15)] text-accent-rose in-data-[theme='light']:text-[#be123c]",
        moderate: "border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.15)] text-accent-amber in-data-[theme='light']:text-[#b45309]",
        low: "border border-[rgba(6,214,160,0.4)] bg-[rgba(6,214,160,0.15)] text-accent-teal in-data-[theme='light']:text-[#047857]",

        /* Confidence levels */
        "confidence-high": "border border-[rgba(6,214,160,0.35)] bg-[rgba(6,214,160,0.12)] text-accent-teal in-data-[theme='light']:text-[#047857]",
        "confidence-medium": "border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] text-accent-amber in-data-[theme='light']:text-[#b45309]",
        "confidence-low": "border border-[rgba(244,63,94,0.35)] bg-[rgba(244,63,94,0.12)] text-accent-rose in-data-[theme='light']:text-[#be123c]",

        /* Tier badges */
        free: "border border-[rgba(148,163,184,0.3)] bg-[rgba(148,163,184,0.12)] text-text-dark-muted in-data-[theme='light']:text-[#475569]",
        premium: "border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.12)] text-accent-violet in-data-[theme='light']:text-[#7e22ce]",
        pro: "border border-[rgba(6,214,160,0.3)] bg-[rgba(6,214,160,0.12)] text-accent-teal in-data-[theme='light']:text-[#047857]",

        /* Carrier status */
        carrier: "border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] text-accent-amber in-data-[theme='light']:text-[#b45309]",
        affected: "border border-[rgba(244,63,94,0.35)] bg-[rgba(244,63,94,0.12)] text-accent-rose in-data-[theme='light']:text-[#be123c]",
        normal: "border border-[rgba(6,214,160,0.35)] bg-[rgba(6,214,160,0.12)] text-accent-teal in-data-[theme='light']:text-[#047857]",

        /* Inheritance model */
        "autosomal-recessive": "border border-[rgba(6,182,212,0.35)] bg-[rgba(6,182,212,0.12)] text-accent-cyan in-data-[theme='light']:text-[#0e7490]",
        "autosomal-dominant": "border border-[rgba(139,92,246,0.35)] bg-[rgba(139,92,246,0.12)] text-accent-violet in-data-[theme='light']:text-[#7e22ce]",
        "x-linked": "border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] text-accent-amber in-data-[theme='light']:text-[#b45309]",
        "complex": "border border-[rgba(168,85,247,0.35)] bg-[rgba(168,85,247,0.12)] text-[#a855f7] in-data-[theme='light']:text-[#7e22ce]",

        /* Neutral */
        default: "border border-(--glass-border) bg-[rgba(148,163,184,0.06)] text-(--text-body)",
        outline: "border border-(--glass-border) bg-transparent text-(--text-body)",
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
