// ─── Error Code → User-Friendly Message Map ─────────────────────────────────

export interface ErrorMessageEntry {
  title: string;
  message: string;
  action: string;
}

export const ERROR_MESSAGES: Record<string, ErrorMessageEntry> = {
  FILE_TOO_LARGE: {
    title: 'File Too Large',
    message: 'Your DNA file exceeds the 200MB limit.',
    action: 'Try compressing the file or using a smaller export.',
  },
  INVALID_FORMAT: {
    title: 'Unsupported File Format',
    message: "We couldn't recognize this file format.",
    action: 'Please upload a 23andMe, AncestryDNA, MyHeritage, or VCF file.',
  },
  PARSE_ERROR: {
    title: 'File Reading Error',
    message: 'There was a problem reading your genetic data.',
    action: "Please ensure the file isn't corrupted and try again.",
  },
  NETWORK_ERROR: {
    title: 'Connection Issue',
    message: "We couldn't connect to our servers.",
    action: 'Check your internet connection and try again.',
  },
  ANALYSIS_TIMEOUT: {
    title: 'Analysis Timeout',
    message: 'The analysis took longer than expected.',
    action: 'Try with a smaller file or refresh the page.',
  },
  INSUFFICIENT_DATA: {
    title: 'Not Enough Data',
    message: "Your file doesn't contain enough genetic markers for analysis.",
    action: 'Try uploading a file from a different testing service.',
  },
  TIER_RESTRICTED: {
    title: 'Feature Locked',
    message: 'This feature requires a higher plan.',
    action: 'Upgrade to access this analysis.',
  },
  UNKNOWN_ERROR: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    action: 'Try refreshing the page. If the problem persists, contact support.',
  },
};

/**
 * Look up a user-friendly error message by code.
 * Falls back to `UNKNOWN_ERROR` when the code is not recognized.
 */
export function getErrorMessage(code: string): ErrorMessageEntry {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN_ERROR;
}
