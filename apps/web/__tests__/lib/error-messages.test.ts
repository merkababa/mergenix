import { describe, it, expect } from 'vitest';
import { ERROR_MESSAGES, getErrorMessage } from '../../lib/constants/error-messages';

describe('error-messages', () => {
  it('returns correct message for FILE_TOO_LARGE', () => {
    const msg = getErrorMessage('FILE_TOO_LARGE');
    expect(msg.title).toBe('File Too Large');
    expect(msg.message).toContain('200MB');
    expect(msg.action).toContain('compressing');
  });

  it('returns correct message for INVALID_FORMAT', () => {
    const msg = getErrorMessage('INVALID_FORMAT');
    expect(msg.title).toBe('Unsupported File Format');
    expect(msg.action).toContain('23andMe');
  });

  it('returns correct message for PARSE_ERROR', () => {
    const msg = getErrorMessage('PARSE_ERROR');
    expect(msg.title).toBe('File Reading Error');
  });

  it('returns correct message for NETWORK_ERROR', () => {
    const msg = getErrorMessage('NETWORK_ERROR');
    expect(msg.title).toBe('Connection Issue');
    expect(msg.action).toContain('internet connection');
  });

  it('returns correct message for ANALYSIS_TIMEOUT', () => {
    const msg = getErrorMessage('ANALYSIS_TIMEOUT');
    expect(msg.title).toBe('Analysis Timeout');
  });

  it('returns correct message for INSUFFICIENT_DATA', () => {
    const msg = getErrorMessage('INSUFFICIENT_DATA');
    expect(msg.title).toBe('Not Enough Data');
  });

  it('returns correct message for TIER_RESTRICTED', () => {
    const msg = getErrorMessage('TIER_RESTRICTED');
    expect(msg.title).toBe('Feature Locked');
    expect(msg.action).toContain('Upgrade');
  });

  it('returns UNKNOWN_ERROR for unrecognized codes', () => {
    const msg = getErrorMessage('NONSENSE_CODE_XYZ');
    expect(msg.title).toBe('Something Went Wrong');
    expect(msg.message).toBe('An unexpected error occurred.');
  });

  it('returns UNKNOWN_ERROR for empty string code', () => {
    const msg = getErrorMessage('');
    expect(msg.title).toBe('Something Went Wrong');
  });

  it('has all expected error codes defined', () => {
    const expectedCodes = [
      'FILE_TOO_LARGE',
      'INVALID_FORMAT',
      'PARSE_ERROR',
      'NETWORK_ERROR',
      'ANALYSIS_TIMEOUT',
      'INSUFFICIENT_DATA',
      'TIER_RESTRICTED',
      'UNKNOWN_ERROR',
    ];
    for (const code of expectedCodes) {
      expect(ERROR_MESSAGES[code]).toBeDefined();
      expect(ERROR_MESSAGES[code].title).toBeTruthy();
      expect(ERROR_MESSAGES[code].message).toBeTruthy();
      expect(ERROR_MESSAGES[code].action).toBeTruthy();
    }
  });

  it('every entry has non-empty title, message, and action', () => {
    for (const [, entry] of Object.entries(ERROR_MESSAGES)) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.message.length).toBeGreaterThan(0);
      expect(entry.action.length).toBeGreaterThan(0);
    }
  });
});
