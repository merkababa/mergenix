"use client";

import { forwardRef, useState, type InputHTMLAttributes, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPasswordStrength,
  STRENGTH_TEXT_COLORS,
  STRENGTH_BAR_COLORS,
} from "@/lib/password-utils";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  strengthMeter?: boolean;
}

/**
 * Password input with show/hide toggle and optional strength meter.
 * Uses shared getPasswordStrength from password-utils.
 */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, strengthMeter, id, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [internalValue, setInternalValue] = useState("");

    const currentValue = (value as string) ?? internalValue;
    const strength = useMemo(
      () => (strengthMeter ? getPasswordStrength(currentValue) : null),
      [strengthMeter, currentValue],
    );

    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e);
      } else {
        setInternalValue(e.target.value);
      }
    };

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
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={handleChange}
            className={cn(
              "w-full rounded-xl border bg-[var(--bg-elevated)] px-4 py-2.5 pr-11 font-body text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)]",
              "border-[var(--border-subtle)]",
              "transition-all duration-200",
              "focus:border-[rgba(6,214,160,0.4)] focus:shadow-[0_0_0_3px_rgba(6,214,160,0.1)] focus:outline-none",
              error &&
                "border-[rgba(244,63,94,0.4)] focus:border-[rgba(244,63,94,0.5)] focus:shadow-[0_0_0_3px_rgba(244,63,94,0.1)]",
              className,
            )}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={
              [
                error ? `${inputId}-error` : null,
                strength ? `${inputId}-strength` : null,
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
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
        {strength && currentValue.length > 0 && (
          <div className="mt-2" id={`${inputId}-strength`}>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    level <= Math.ceil(strength.widthPercent / 20)
                      ? STRENGTH_BAR_COLORS[strength.level]
                      : "bg-[var(--border-subtle)]",
                  )}
                />
              ))}
            </div>
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                STRENGTH_TEXT_COLORS[strength.level],
              )}
            >
              {strength.label}
            </p>
          </div>
        )}
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
