import { cva, type VariantProps } from "class-variance-authority";

/**
 * Button style variants using class-variance-authority.
 *
 * Extracted into a separate module (without "use client") so that both
 * server components and client components can call `buttonVariants()`.
 *
 * The `Button` component in `./button.tsx` re-exports this for convenience.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 font-heading font-semibold",
    "transition-all duration-200 ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)]",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-gradient-to-r from-[#06d6a0] to-[#059669] text-[#050810]",
          "shadow-[0_4px_24px_rgba(6,214,160,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:shadow-[0_8px_40px_rgba(6,214,160,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:-translate-y-0.5 active:translate-y-0",
        ],
        secondary: [
          "border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)]",
          "hover:border-[rgba(6,214,160,0.25)] hover:bg-[rgba(6,214,160,0.06)]",
          "hover:shadow-[0_0_15px_rgba(6,214,160,0.08)]",
        ],
        ghost: [
          "text-[var(--text-muted)]",
          "hover:bg-[rgba(6,214,160,0.06)] hover:text-[var(--accent-teal)]",
        ],
        destructive: [
          "bg-gradient-to-r from-[#f43f5e] to-[#e11d48] text-white",
          "shadow-[0_4px_24px_rgba(244,63,94,0.3)]",
          "hover:shadow-[0_8px_40px_rgba(244,63,94,0.5)]",
          "hover:-translate-y-0.5",
        ],
        outline: [
          "border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.08)] text-[var(--accent-teal)]",
          "hover:border-[rgba(6,214,160,0.4)] hover:bg-[rgba(6,214,160,0.15)]",
          "hover:shadow-[0_0_15px_rgba(6,214,160,0.1)]",
        ],
        violet: [
          "bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] text-white",
          "shadow-[0_4px_24px_rgba(139,92,246,0.3)]",
          "hover:shadow-[0_8px_40px_rgba(139,92,246,0.5)]",
          "hover:-translate-y-0.5",
        ],
      },
      size: {
        sm: "h-8 rounded-[10px] px-3 text-xs",
        md: "h-10 rounded-btn px-5 text-sm",
        lg: "h-12 rounded-btn px-7 text-base",
        xl: "h-14 rounded-[18px] px-9 text-lg",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export { buttonVariants, type ButtonVariantProps };
