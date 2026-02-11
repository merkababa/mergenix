import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  getPasswordStrength,
  PASSWORD_REQUIREMENTS,
} from '@/lib/password-utils';

describe('password-utils', () => {
  // ── validatePassword ──────────────────────────────────────────────────

  describe('validatePassword', () => {
    it('returns invalid with error for empty password', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Password is required']);
    });

    it('returns error for short password', () => {
      const result = validatePassword('Abc1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('returns valid for a fully compliant password', () => {
      const result = validatePassword('Abcdefghijkl1!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error when missing uppercase', () => {
      const result = validatePassword('abcdefghijkl1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must include an uppercase letter');
    });

    it('returns error when missing lowercase', () => {
      const result = validatePassword('ABCDEFGHIJKL1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must include a lowercase letter');
    });

    it('returns error when missing digit', () => {
      const result = validatePassword('Abcdefghijklm!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must include a digit');
    });

    it('returns error when missing special character', () => {
      const result = validatePassword('Abcdefghijkl1m');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must include a special character');
    });

    it('returns multiple errors for password failing several rules', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── getPasswordStrength ───────────────────────────────────────────────

  describe('getPasswordStrength', () => {
    it('returns weak with 0% for empty password', () => {
      const result = getPasswordStrength('');
      expect(result.level).toBe('weak');
      expect(result.widthPercent).toBe(0);
      expect(result.label).toBe('');
    });

    it('returns weak/25% for very short password', () => {
      const result = getPasswordStrength('abc');
      expect(result.level).toBe('weak');
      expect(result.widthPercent).toBe(25);
      expect(result.label).toBe('Weak');
    });

    it('returns fair/50% for medium-strength password', () => {
      // "Abcdef123" = length>=8 (1) + uppercase (1) + lowercase (1) + digit (1) = score 4
      const result = getPasswordStrength('Abcdef123');
      expect(result.level).toBe('fair');
      expect(result.widthPercent).toBe(50);
      expect(result.label).toBe('Fair');
    });

    it('returns good/75% for good password', () => {
      // "Abcdef123456" = >=8 (1) + >=12 (1) + upper (1) + lower (1) + digit (1) = score 5
      const result = getPasswordStrength('Abcdef123456');
      expect(result.level).toBe('good');
      expect(result.widthPercent).toBe(75);
      expect(result.label).toBe('Good');
    });

    it('returns strong/100% for strong password', () => {
      // "Abcdef123456!" = >=8 (1) + >=12 (1) + upper (1) + lower (1) + digit (1) + special (1) = score 6
      const result = getPasswordStrength('Abcdef123456!');
      expect(result.level).toBe('strong');
      expect(result.widthPercent).toBe(100);
      expect(result.label).toBe('Strong');
    });

    it('returns strong for very long complex password', () => {
      // "Abcdefghijklmnop1!" = >=8 + >=12 + >=16 + upper + lower + digit + special = 7
      const result = getPasswordStrength('Abcdefghijklmnop1!');
      expect(result.level).toBe('strong');
      expect(result.widthPercent).toBe(100);
    });
  });

  // ── PASSWORD_REQUIREMENTS ─────────────────────────────────────────────

  describe('PASSWORD_REQUIREMENTS', () => {
    it('has 4 requirements', () => {
      expect(PASSWORD_REQUIREMENTS).toHaveLength(4);
    });

    it('each requirement has a check function and text', () => {
      for (const req of PASSWORD_REQUIREMENTS) {
        expect(typeof req.check).toBe('function');
        expect(typeof req.text).toBe('string');
        expect(req.text.length).toBeGreaterThan(0);
      }
    });

    it('length requirement passes for 12+ chars', () => {
      expect(PASSWORD_REQUIREMENTS[0].check('123456789012')).toBe(true);
      expect(PASSWORD_REQUIREMENTS[0].check('12345')).toBe(false);
    });

    it('case requirement passes for mixed case', () => {
      expect(PASSWORD_REQUIREMENTS[1].check('aA')).toBe(true);
      expect(PASSWORD_REQUIREMENTS[1].check('aa')).toBe(false);
      expect(PASSWORD_REQUIREMENTS[1].check('AA')).toBe(false);
    });

    it('digit requirement passes when digit present', () => {
      expect(PASSWORD_REQUIREMENTS[2].check('abc1')).toBe(true);
      expect(PASSWORD_REQUIREMENTS[2].check('abcd')).toBe(false);
    });

    it('special char requirement passes when special present', () => {
      expect(PASSWORD_REQUIREMENTS[3].check('abc!')).toBe(true);
      expect(PASSWORD_REQUIREMENTS[3].check('abc1')).toBe(false);
    });
  });
});
