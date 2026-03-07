'use client';

import { useMemo } from 'react';
import { m } from 'motion/react';
import { Check, X } from 'lucide-react';
import {
  getPasswordStrength,
  PASSWORD_REQUIREMENTS,
  STRENGTH_TEXT_COLORS,
  STRENGTH_BAR_COLORS,
  type StrengthLevel,
} from '@/lib/password-utils';

interface PasswordStrengthDisplayProps {
  password: string;
}

const STRENGTH_WIDTHS: Record<StrengthLevel, string> = {
  weak: '25%',
  fair: '50%',
  good: '75%',
  strong: '100%',
};

const STRENGTH_VALUES: Record<StrengthLevel, number> = {
  weak: 25,
  fair: 50,
  good: 75,
  strong: 100,
};

const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

export function PasswordStrengthDisplay({ password }: PasswordStrengthDisplayProps) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-3">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div
          className="bg-(--bg-elevated) h-1.5 w-full overflow-hidden rounded-full"
          role="meter"
          aria-valuenow={STRENGTH_VALUES[strength.level]}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Password strength"
        >
          <m.div
            className={`h-full rounded-full ${STRENGTH_BAR_COLORS[strength.level]}`}
            initial={{ width: 0 }}
            animate={{ width: STRENGTH_WIDTHS[strength.level] }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className={`text-xs font-medium ${STRENGTH_TEXT_COLORS[strength.level]}`}>
          {STRENGTH_LABELS[strength.level]}
        </p>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1" role="list" aria-label="Password requirements">
        {PASSWORD_REQUIREMENTS.map((req) => {
          const met = req.check(password);
          return (
            <m.div
              key={req.text}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-xs"
              role="listitem"
            >
              {met ? (
                <Check className="text-(--accent-teal) h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <X className="text-(--text-dim) h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className={met ? 'text-(--accent-teal)' : 'text-(--text-dim)'}>{req.text}</span>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
