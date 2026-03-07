import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const stepCircleVariants = cva(
  [
    'inline-flex items-center justify-center rounded-full',
    'bg-linear-to-br from-accent-teal to-day-accent-teal',
    'font-heading font-bold text-bio-deep',
    'shadow-[0_0_20px_rgba(6,214,160,0.35)]',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-sm',
        md: 'h-10 w-10 text-base',
        lg: 'h-14 w-14 text-xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

interface StepCircleProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof stepCircleVariants> {
  step: number;
}

/**
 * A numbered step indicator circle with a teal-to-emerald gradient
 * and glow shadow. Used in "How it works" sections.
 */
export function StepCircle({ step, size, className, ...props }: StepCircleProps) {
  return (
    <div className={cn(stepCircleVariants({ size }), className)} aria-hidden="true" {...props}>
      {step}
    </div>
  );
}
