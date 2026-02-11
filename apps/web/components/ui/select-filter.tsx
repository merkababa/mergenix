"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectFilterOption {
  value: string;
  label: string;
}

interface SelectFilterProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SelectFilterOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}

/**
 * Styled select dropdown matching the Mergenix design system.
 * Consistent with the Input component: rounded-xl, border-subtle,
 * teal focus ring, and glass-elevated background.
 */
const SelectFilter = forwardRef<HTMLSelectElement, SelectFilterProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder,
      ariaLabel,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div className={cn("relative w-full", className)}>
        <select
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          className={cn(
            "w-full appearance-none rounded-xl border bg-[var(--bg-elevated)] px-4 py-2.5 pr-10 font-body text-sm text-[var(--text-primary)]",
            "border-[var(--border-subtle)]",
            "transition-all duration-200",
            "focus-visible:border-[rgba(6,214,160,0.4)] focus-visible:shadow-[0_0_0_3px_rgba(6,214,160,0.1)] focus-visible:outline-none focus:outline-none",
            "cursor-pointer",
            /* Style the default/placeholder option as muted */
            !value && "text-[var(--text-dim)]",
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Custom chevron icon */}
        <div
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
          aria-hidden="true"
        >
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    );
  },
);

SelectFilter.displayName = "SelectFilter";

export { SelectFilter };
