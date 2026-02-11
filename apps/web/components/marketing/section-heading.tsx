import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const headingGradientVariants = cva("", {
  variants: {
    gradient: {
      default: "gradient-text",
      teal: "gradient-text-teal",
    },
  },
  defaultVariants: {
    gradient: "default",
  },
});

interface SectionHeadingProps
  extends VariantProps<typeof headingGradientVariants> {
  title: string;
  subtitle?: string;
  className?: string;
  /** Optional id for the h2 element (useful for aria-labelledby) */
  id?: string;
}

/**
 * Consistent section heading with optional gradient text
 * and subtitle. Centered by default with standardized spacing.
 */
export function SectionHeading({
  title,
  subtitle,
  gradient,
  className,
  id,
}: SectionHeadingProps) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      <h2
        id={id}
        className={cn(
          "font-heading text-3xl font-bold tracking-tight sm:text-4xl",
          headingGradientVariants({ gradient }),
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-[var(--text-body)] sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );
}
