"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, type = "text", ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block font-heading text-sm font-medium text-[var(--text-primary)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              "w-full rounded-xl border bg-[var(--bg-elevated)] px-4 py-2.5 font-body text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)]",
              "border-[var(--border-subtle)]",
              "transition-all duration-200",
              "focus:border-[rgba(6,214,160,0.4)] focus:shadow-[0_0_0_3px_rgba(6,214,160,0.1)] focus:outline-none",
              error &&
                "border-[rgba(244,63,94,0.4)] focus:border-[rgba(244,63,94,0.5)] focus:shadow-[0_0_0_3px_rgba(244,63,94,0.1)]",
              icon && "pl-10",
              className,
            )}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-xs text-[var(--accent-rose)]"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
