import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from '../../lib/utils/extract-error';

describe('extractErrorMessage', () => {
  it('returns the error message when given an Error instance', () => {
    const err = new Error('something went wrong');
    expect(extractErrorMessage(err, 'fallback')).toBe('something went wrong');
  });

  it('returns the fallback when given a string throw', () => {
    // A thrown string is not an Error instance — the function returns the fallback
    expect(extractErrorMessage('a raw string error', 'fallback')).toBe('fallback');
  });

  it('returns the fallback when given undefined', () => {
    expect(extractErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('returns the fallback when given null', () => {
    expect(extractErrorMessage(null, 'fallback')).toBe('fallback');
  });

  it('returns the fallback when given a plain object', () => {
    expect(extractErrorMessage({ code: 404 }, 'fallback')).toBe('fallback');
  });

  it('uses the provided fallback parameter when no Error instance', () => {
    expect(extractErrorMessage(42, 'custom fallback message')).toBe('custom fallback message');
  });

  it('returns an empty message string for an Error with empty message', () => {
    const err = new Error('');
    expect(extractErrorMessage(err, 'fallback')).toBe('');
  });

  it('returns the Error message regardless of what the fallback says', () => {
    const err = new Error('real message');
    expect(extractErrorMessage(err, 'this fallback should not be used')).toBe('real message');
  });
});
