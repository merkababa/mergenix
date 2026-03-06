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
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-teal)",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-linear-to-r from-accent-teal to-day-accent-teal text-bio-deep",
          "shadow-[0_4px_24px_rgba(6,214,160,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:shadow-[0_8px_40px_rgba(6,214,160,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:-translate-y-0.5 active:translate-y-0",
        ],
        secondary: [
          "border border-(--border-subtle) bg-(--bg-elevated) text-(--text-primary)",
          "hover:border-[rgba(6,214,160,0.25)] hover:bg-[rgba(6,214,160,0.06)]",
          "hover:shadow-[0_0_15px_rgba(6,214,160,0.08)]",
        ],
        ghost: [
          "text-(--text-muted)",
          "hover:bg-[rgba(6,214,160,0.06)] hover:text-(--accent-teal)",
        ],
        destructive: [
          "bg-linear-to-r from-accent-rose to-day-accent-rose text-white",
          "shadow-[0_4px_24px_rgba(244,63,94,0.3)]",
          "hover:shadow-[0_8px_40px_rgba(244,63,94,0.5)]",
          "hover:-translate-y-0.5",
        ],
        outline: [
          "border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.08)] text-(--accent-teal)",
          "hover:border-[rgba(6,214,160,0.4)] hover:bg-[rgba(6,214,160,0.15)]",
          "hover:shadow-[0_0_15px_rgba(6,214,160,0.1)]",
        ],
        violet: [
          "bg-linear-to-r from-accent-violet to-[#a78bfa] text-white",
          "shadow-[0_4px_24px_rgba(139,92,246,0.3)]",
          "hover:shadow-[0_8px_40px_rgba(139,92,246,0.5)]",
          "hover:-translate-y-0.5",
        ],
      },
      size: {
        sm: "h-8 rounded-[10px] px-3 text-xs",
        md: "h-10 rounded-btn px-5 text-sm",
        lg: "h-12 rounded-btn px-7 text-base",
        xl: "h-14 rounded-card px-9 text-lg",
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
