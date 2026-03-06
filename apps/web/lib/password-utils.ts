/**
 * Shared password validation and strength utilities.
 * Used by register-content, reset-password-content, and password-input.
 */

// ── Password requirements checklist ────────────────────────────────────

export const PASSWORD_REQUIREMENTS = [
  { check: (pw: string) => pw.length >= 12, text: "At least 12 characters" },
  {
    check: (pw: string) => /[A-Z]/.test(pw) && /[a-z]/.test(pw),
    text: "Upper and lowercase letters",
  },
  { check: (pw: string) => /[0-9]/.test(pw), text: "At least one number" },
  {
    check: (pw: string) => /[^A-Za-z0-9]/.test(pw),
    text: "At least one special character",
  },
] as const;

// ── Password validation ────────────────────────────────────────────────

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  if (!password) {
    return { valid: false, errors: ["Password is required"] };
  }
  if (password.length < 12) errors.push("Password must be at least 12 characters");
  if (!/[A-Z]/.test(password)) errors.push("Must include an uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Must include a lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Must include a digit");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Must include a special character");
  return { valid: errors.length === 0, errors };
}

// ── Password strength meter ────────────────────────────────────────────

export type StrengthLevel = "weak" | "fair" | "good" | "strong";

export interface PasswordStrength {
  level: StrengthLevel;
  widthPercent: number;
  color: string;
  label: string;
}

export const STRENGTH_TEXT_COLORS: Record<StrengthLevel, string> = {
  weak: "text-(--accent-rose)",
  fair: "text-(--accent-amber)",
  good: "text-(--accent-teal)",
  strong: "text-(--accent-teal)",
};

export const STRENGTH_BAR_COLORS: Record<StrengthLevel, string> = {
  weak: "bg-(--accent-rose)",
  fair: "bg-(--accent-amber)",
  good: "bg-(--accent-teal)",
  strong: "bg-(--accent-teal)",
};

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { level: "weak", widthPercent: 0, color: "transparent", label: "" };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    return {
      level: "weak",
      widthPercent: 25,
      color: "var(--accent-rose)",
      label: "Weak",
    };
  }
  if (score <= 4) {
    return {
      level: "fair",
      widthPercent: 50,
      color: "var(--accent-amber)",
      label: "Fair",
    };
  }
  if (score <= 5) {
    return {
      level: "good",
      widthPercent: 75,
      color: "var(--accent-teal)",
      label: "Good",
    };
  }
  return {
    level: "strong",
    widthPercent: 100,
    color: "var(--accent-teal)",
    label: "Strong",
  };
}
