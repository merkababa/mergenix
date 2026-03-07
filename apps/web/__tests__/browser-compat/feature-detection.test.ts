/**
 * Q20 — Browser Compatibility Matrix: Feature Detection Tests
 *
 * Unit tests verifying that the feature-detection utility in
 * `apps/web/lib/utils/feature-detection.ts` correctly detects (or simulates
 * the absence of) required browser APIs.
 *
 * Tested APIs:
 *  - Web Worker support            (detectWebWorker)
 *  - Transferable ArrayBuffer      (detectTransferableArrayBuffer)
 *  - TextDecoder / TextEncoder     (detectTextDecoder / detectTextEncoder)
 *  - DecompressionStream           (detectDecompressionStream)
 *  - crypto.subtle                 (detectCryptoSubtle)
 *  - IndexedDB                     (detectIndexedDB)
 *
 * For each API we test:
 *  1. Returns true when the API is available (jsdom already polyfills most of
 *     these, or we add them to globalThis in beforeEach).
 *  2. Returns false when the API is absent (we delete/undefined the global).
 *  3. Returns a boolean (never throws, never returns undefined/null).
 *
 * Tests that CANNOT be exercised in jsdom (e.g. actual worker postMessage
 * with ArrayBuffer transfer, DecompressionStream streaming, real crypto ops)
 * are marked `it.todo()` with a note explaining why and what test harness
 * would be needed.
 *
 * Design note on jsdom limitations:
 *   jsdom does not implement DecompressionStream — detectDecompressionStream()
 *   will return false in this environment.  That is the expected jsdom result.
 *   The "present" case for DecompressionStream uses a mock.
 */

import { describe, it, expect, vi } from 'vitest';

import {
  detectWebWorker,
  detectTransferableArrayBuffer,
  detectTextDecoder,
  detectTextEncoder,
  detectDecompressionStream,
  detectCryptoSubtle,
  detectIndexedDB,
  detectFeatures,
  getMissingFeatureMessages,
  MISSING_FEATURE_MESSAGES,
} from '../../lib/utils/feature-detection';
import type { FeatureDetectionResult } from '../../lib/utils/feature-detection';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type GlobalKey = keyof typeof globalThis;

/**
 * Temporarily remove a property from globalThis and restore it after the test.
 * Returns a cleanup function.
 */
function withoutGlobal(key: GlobalKey, fn: () => void): void {
  const original = globalThis[key];
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);

  try {
    // Overwrite with undefined (can't delete non-configurable in strict mode)
    Object.defineProperty(globalThis, key, {
      value: undefined,
      writable: true,
      configurable: true,
    });
    fn();
  } finally {
    // Restore the original
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      // @ts-expect-error — restoring the original value
      globalThis[key] = original;
    }
  }
}

// ─── detectWebWorker ─────────────────────────────────────────────────────────

describe('detectWebWorker', () => {
  it('returns true when Worker is defined (vitest.setup.ts registers a MockWorker)', () => {
    // The vitest.setup.ts registers a MockWorker on globalThis.Worker
    expect(typeof globalThis.Worker).toBe('function');
    expect(detectWebWorker()).toBe(true);
  });

  it('returns false when Worker is undefined', () => {
    withoutGlobal('Worker', () => {
      expect(detectWebWorker()).toBe(false);
    });
  });

  it('always returns a boolean', () => {
    const result = detectWebWorker();
    expect(typeof result).toBe('boolean');
  });

  it('does not throw when Worker is undefined', () => {
    withoutGlobal('Worker', () => {
      expect(() => detectWebWorker()).not.toThrow();
    });
  });
});

// ─── detectTransferableArrayBuffer ───────────────────────────────────────────

describe('detectTransferableArrayBuffer', () => {
  it('returns true when ArrayBuffer is defined', () => {
    expect(typeof ArrayBuffer).toBe('function');
    expect(detectTransferableArrayBuffer()).toBe(true);
  });

  it('returns false when ArrayBuffer is undefined', () => {
    withoutGlobal('ArrayBuffer' as GlobalKey, () => {
      expect(detectTransferableArrayBuffer()).toBe(false);
    });
  });

  it('always returns a boolean', () => {
    const result = detectTransferableArrayBuffer();
    expect(typeof result).toBe('boolean');
  });

  it('does not throw when ArrayBuffer is undefined', () => {
    withoutGlobal('ArrayBuffer' as GlobalKey, () => {
      expect(() => detectTransferableArrayBuffer()).not.toThrow();
    });
  });

  it('returns true when ArrayBuffer exists but ArrayBuffer.prototype.transfer is undefined (older browser partial support)', () => {
    // Scenario: browsers like Firefox < 122 and Safari < 17.4 have ArrayBuffer
    // and fully support Transferable semantics via postMessage, but do NOT
    // expose the newer standalone ArrayBuffer.prototype.transfer() method.
    //
    // After the operator-precedence fix, detectTransferableArrayBuffer() only
    // checks `typeof ArrayBuffer !== "undefined"`, so it correctly returns
    // true for these browsers — the postMessage transfer mechanism works
    // without ArrayBuffer.prototype.transfer.
    const originalTransfer = (ArrayBuffer.prototype as unknown as Record<string, unknown>)[
      'transfer'
    ];
    try {
      // Remove the .transfer method from the prototype (simulate older browser)
      Object.defineProperty(ArrayBuffer.prototype, 'transfer', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // ArrayBuffer still exists, so postMessage transfers work — must be true
      expect(detectTransferableArrayBuffer()).toBe(true);
    } finally {
      // Restore the original descriptor
      if (originalTransfer !== undefined) {
        Object.defineProperty(ArrayBuffer.prototype, 'transfer', {
          value: originalTransfer,
          writable: true,
          configurable: true,
        });
      } else {
        // If .transfer was never present in this environment, delete the stub
        try {
          delete (ArrayBuffer.prototype as unknown as Record<string, unknown>)['transfer'];
        } catch {
          // Non-configurable in strict environments — leave as undefined
        }
      }
    }
  });

  it.todo(
    'detectTransferableArrayBuffer: actual zero-copy transfer via Worker.postMessage requires a real browser — jsdom does not support Transferable semantics',
  );
});

// ─── detectTextDecoder ───────────────────────────────────────────────────────

describe('detectTextDecoder', () => {
  it('returns true when TextDecoder is defined (jsdom polyfills it)', () => {
    expect(typeof TextDecoder).toBe('function');
    expect(detectTextDecoder()).toBe(true);
  });

  it('returns false when TextDecoder is undefined', () => {
    withoutGlobal('TextDecoder' as GlobalKey, () => {
      expect(detectTextDecoder()).toBe(false);
    });
  });

  it('always returns a boolean', () => {
    expect(typeof detectTextDecoder()).toBe('boolean');
  });

  it('does not throw when TextDecoder is undefined', () => {
    withoutGlobal('TextDecoder' as GlobalKey, () => {
      expect(() => detectTextDecoder()).not.toThrow();
    });
  });

  it.todo(
    'detectTextDecoder: actual UTF-8 decoding of a DNA file ArrayBuffer requires a real browser environment with a file-system — jsdom covers the API detection only',
  );
});

// ─── detectTextEncoder ───────────────────────────────────────────────────────

describe('detectTextEncoder', () => {
  it('returns true when TextEncoder is defined (jsdom polyfills it)', () => {
    expect(typeof TextEncoder).toBe('function');
    expect(detectTextEncoder()).toBe(true);
  });

  it('returns false when TextEncoder is undefined', () => {
    withoutGlobal('TextEncoder' as GlobalKey, () => {
      expect(detectTextEncoder()).toBe(false);
    });
  });

  it('always returns a boolean', () => {
    expect(typeof detectTextEncoder()).toBe('boolean');
  });

  it('does not throw when TextEncoder is undefined', () => {
    withoutGlobal('TextEncoder' as GlobalKey, () => {
      expect(() => detectTextEncoder()).not.toThrow();
    });
  });
});

// ─── detectDecompressionStream ───────────────────────────────────────────────

describe('detectDecompressionStream', () => {
  it('returns true when DecompressionStream is defined on globalThis', () => {
    // Either jsdom already provides DecompressionStream (Vitest 3 jsdom does),
    // or we mock it. Either way, when the global exists the function returns true.
    const originalValue = (globalThis as Record<string, unknown>)['DecompressionStream'];
    try {
      Object.defineProperty(globalThis, 'DecompressionStream', {
        value: class MockDecompressionStream {},
        writable: true,
        configurable: true,
      });
      expect(detectDecompressionStream()).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'DecompressionStream', {
        value: originalValue,
        writable: true,
        configurable: true,
      });
    }
  });

  it('returns false when DecompressionStream is removed from globalThis', () => {
    // Simulate a browser (or test environment) that lacks DecompressionStream.
    const originalValue = (globalThis as Record<string, unknown>)['DecompressionStream'];
    try {
      Object.defineProperty(globalThis, 'DecompressionStream', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(detectDecompressionStream()).toBe(false);
    } finally {
      Object.defineProperty(globalThis, 'DecompressionStream', {
        value: originalValue,
        writable: true,
        configurable: true,
      });
    }
  });

  it('always returns a boolean (never throws)', () => {
    expect(typeof detectDecompressionStream()).toBe('boolean');
    expect(() => detectDecompressionStream()).not.toThrow();
  });

  it.todo(
    'detectDecompressionStream: actual gzip decompression of a .gz DNA file requires a real browser with DecompressionStream — use a Playwright test for end-to-end verification',
  );
});

// ─── detectCryptoSubtle ──────────────────────────────────────────────────────

describe('detectCryptoSubtle', () => {
  it('returns true when crypto.subtle is defined', () => {
    // jsdom provides a Web Crypto API mock
    // Verify the mock is there before testing our detection
    if (typeof globalThis.crypto?.subtle !== 'undefined') {
      expect(detectCryptoSubtle()).toBe(true);
    } else {
      // If jsdom doesn't provide it, mock it for this test
      const originalCrypto = globalThis.crypto;
      Object.defineProperty(globalThis, 'crypto', {
        value: { subtle: {} },
        writable: true,
        configurable: true,
      });
      try {
        expect(detectCryptoSubtle()).toBe(true);
      } finally {
        Object.defineProperty(globalThis, 'crypto', {
          value: originalCrypto,
          writable: true,
          configurable: true,
        });
      }
    }
  });

  it('returns false when crypto.subtle is undefined', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: { subtle: undefined },
      writable: true,
      configurable: true,
    });

    try {
      expect(detectCryptoSubtle()).toBe(false);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true,
      });
    }
  });

  it('returns false when crypto itself is undefined', () => {
    withoutGlobal('crypto' as GlobalKey, () => {
      expect(detectCryptoSubtle()).toBe(false);
    });
  });

  it('always returns a boolean', () => {
    expect(typeof detectCryptoSubtle()).toBe('boolean');
  });

  it('does not throw when crypto is undefined', () => {
    withoutGlobal('crypto' as GlobalKey, () => {
      expect(() => detectCryptoSubtle()).not.toThrow();
    });
  });

  it.todo(
    'detectCryptoSubtle: real AES-256-GCM encryption/decryption operations require a real browser with HTTPS — jsdom only detects the API presence, not functional correctness',
  );
});

// ─── detectIndexedDB ─────────────────────────────────────────────────────────

describe('detectIndexedDB', () => {
  it('returns true when indexedDB is defined (fake-indexeddb polyfills it via vitest-environment)', () => {
    // jsdom environment with fake-indexeddb should have globalThis.indexedDB
    // If it's not there, we verify the function still works
    const result = detectIndexedDB();
    expect(typeof result).toBe('boolean');

    if (typeof globalThis.indexedDB !== 'undefined') {
      expect(result).toBe(true);
    }
    // If indexedDB is not present in the test environment, we skip the positive assertion
    // (the negative and type tests still validate the function)
  });

  it('returns true when indexedDB is mocked on globalThis', () => {
    const originalIDB = (globalThis as Record<string, unknown>)['indexedDB'];
    try {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: {} as IDBFactory,
        writable: true,
        configurable: true,
      });

      expect(detectIndexedDB()).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: originalIDB,
        writable: true,
        configurable: true,
      });
    }
  });

  it('returns false when indexedDB is undefined (and no vendor prefix)', () => {
    const originalIDB = (globalThis as Record<string, unknown>)['indexedDB'];
    const originalWebkit = (globalThis as Record<string, unknown>)['webkitIndexedDB'];
    const originalMoz = (globalThis as Record<string, unknown>)['mozIndexedDB'];

    try {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      // Also remove vendor prefixed versions
      try {
        Object.defineProperty(globalThis, 'webkitIndexedDB', {
          value: undefined,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'mozIndexedDB', {
          value: undefined,
          writable: true,
          configurable: true,
        });
      } catch {
        // Vendor-prefixed properties may not exist in this environment
      }

      expect(detectIndexedDB()).toBe(false);
    } finally {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: originalIDB,
        writable: true,
        configurable: true,
      });
      if (originalWebkit !== undefined) {
        try {
          Object.defineProperty(globalThis, 'webkitIndexedDB', {
            value: originalWebkit,
            writable: true,
            configurable: true,
          });
        } catch {
          /* ignore */
        }
      }
      if (originalMoz !== undefined) {
        try {
          Object.defineProperty(globalThis, 'mozIndexedDB', {
            value: originalMoz,
            writable: true,
            configurable: true,
          });
        } catch {
          /* ignore */
        }
      }
    }
  });

  it('always returns a boolean', () => {
    expect(typeof detectIndexedDB()).toBe('boolean');
  });

  it('does not throw when indexedDB is undefined', () => {
    withoutGlobal('indexedDB' as GlobalKey, () => {
      expect(() => detectIndexedDB()).not.toThrow();
    });
  });
});

// ─── detectFeatures (aggregate) ──────────────────────────────────────────────

describe('detectFeatures', () => {
  it('returns an object with all expected keys', () => {
    const features = detectFeatures();

    expect(features).toHaveProperty('webWorker');
    expect(features).toHaveProperty('transferableArrayBuffer');
    expect(features).toHaveProperty('textDecoder');
    expect(features).toHaveProperty('textEncoder');
    expect(features).toHaveProperty('decompressionStream');
    expect(features).toHaveProperty('cryptoSubtle');
    expect(features).toHaveProperty('indexedDB');
    expect(features).toHaveProperty('allRequiredFeaturesPresent');
  });

  it('every value in the returned object is a boolean', () => {
    const features = detectFeatures();

    for (const [key, value] of Object.entries(features)) {
      expect(typeof value, `features.${key} must be a boolean`).toBe('boolean');
    }
  });

  it('allRequiredFeaturesPresent is true when all required APIs are mocked as present', () => {
    // In vitest/jsdom, Worker, ArrayBuffer, TextDecoder, TextEncoder are all present.
    // We also need crypto.subtle and indexedDB.
    const originalCrypto = globalThis.crypto;
    const originalIDB = (globalThis as Record<string, unknown>)['indexedDB'];

    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: { subtle: { encrypt: vi.fn(), decrypt: vi.fn() } },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'indexedDB', {
        value: {} as IDBFactory,
        writable: true,
        configurable: true,
      });

      const features = detectFeatures();

      expect(features.webWorker).toBe(true);
      expect(features.transferableArrayBuffer).toBe(true);
      expect(features.textDecoder).toBe(true);
      expect(features.textEncoder).toBe(true);
      expect(features.cryptoSubtle).toBe(true);
      expect(features.indexedDB).toBe(true);
      expect(features.allRequiredFeaturesPresent).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'indexedDB', {
        value: originalIDB,
        writable: true,
        configurable: true,
      });
    }
  });

  it('allRequiredFeaturesPresent is false when Worker is missing', () => {
    withoutGlobal('Worker', () => {
      const features = detectFeatures();
      expect(features.webWorker).toBe(false);
      expect(features.allRequiredFeaturesPresent).toBe(false);
    });
  });

  it('allRequiredFeaturesPresent is false when TextDecoder is missing', () => {
    withoutGlobal('TextDecoder' as GlobalKey, () => {
      const features = detectFeatures();
      expect(features.textDecoder).toBe(false);
      expect(features.allRequiredFeaturesPresent).toBe(false);
    });
  });

  it('allRequiredFeaturesPresent is false when TextEncoder is missing', () => {
    withoutGlobal('TextEncoder' as GlobalKey, () => {
      const features = detectFeatures();
      expect(features.textEncoder).toBe(false);
      expect(features.allRequiredFeaturesPresent).toBe(false);
    });
  });

  it('allRequiredFeaturesPresent is false when crypto.subtle is missing', () => {
    const originalCrypto = globalThis.crypto;
    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: { subtle: undefined },
        writable: true,
        configurable: true,
      });
      const features = detectFeatures();
      expect(features.cryptoSubtle).toBe(false);
      expect(features.allRequiredFeaturesPresent).toBe(false);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true,
      });
    }
  });

  it('allRequiredFeaturesPresent is false when indexedDB is missing', () => {
    withoutGlobal('indexedDB' as GlobalKey, () => {
      const features = detectFeatures();
      expect(features.indexedDB).toBe(false);
      expect(features.allRequiredFeaturesPresent).toBe(false);
    });
  });

  it('decompressionStream absence does NOT affect allRequiredFeaturesPresent', () => {
    // decompressionStream is optional — the app has a WASM fallback.
    // allRequiredFeaturesPresent must be computable independently of it.
    const originalCrypto = globalThis.crypto;
    const originalIDB = (globalThis as Record<string, unknown>)['indexedDB'];

    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: { subtle: {} },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'indexedDB', {
        value: {} as IDBFactory,
        writable: true,
        configurable: true,
      });

      const features = detectFeatures();
      // decompressionStream may be false (jsdom doesn't have it)
      // allRequiredFeaturesPresent must still be true if other features are present
      if (
        features.webWorker &&
        features.transferableArrayBuffer &&
        features.textDecoder &&
        features.textEncoder &&
        features.cryptoSubtle &&
        features.indexedDB
      ) {
        expect(features.allRequiredFeaturesPresent).toBe(true);
        // Even if decompressionStream is false, allRequired is still true
        // because decompressionStream is NOT a required feature
      }
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'indexedDB', {
        value: originalIDB,
        writable: true,
        configurable: true,
      });
    }
  });

  it('does not throw when called in a minimal environment', () => {
    expect(() => detectFeatures()).not.toThrow();
  });
});

// ─── getMissingFeatureMessages ────────────────────────────────────────────────

describe('getMissingFeatureMessages', () => {
  it('returns an empty array when all required features are present', () => {
    const allPresent: FeatureDetectionResult = {
      webWorker: true,
      transferableArrayBuffer: true,
      textDecoder: true,
      textEncoder: true,
      decompressionStream: false, // optional — does not affect messages
      cryptoSubtle: true,
      indexedDB: true,
      allRequiredFeaturesPresent: true,
    };

    const messages = getMissingFeatureMessages(allPresent);
    expect(messages).toEqual([]);
  });

  it('returns a message for missing webWorker', () => {
    const features: FeatureDetectionResult = {
      webWorker: false,
      transferableArrayBuffer: true,
      textDecoder: true,
      textEncoder: true,
      decompressionStream: false,
      cryptoSubtle: true,
      indexedDB: true,
      allRequiredFeaturesPresent: false,
    };

    const messages = getMissingFeatureMessages(features);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.some((m) => /web worker|worker/i.test(m))).toBe(true);
  });

  it('returns a message for missing TextDecoder', () => {
    const features: FeatureDetectionResult = {
      webWorker: true,
      transferableArrayBuffer: true,
      textDecoder: false,
      textEncoder: true,
      decompressionStream: false,
      cryptoSubtle: true,
      indexedDB: true,
      allRequiredFeaturesPresent: false,
    };

    const messages = getMissingFeatureMessages(features);
    expect(messages.some((m) => /TextDecoder/i.test(m))).toBe(true);
  });

  it('returns a message for missing TextEncoder', () => {
    const features: FeatureDetectionResult = {
      webWorker: true,
      transferableArrayBuffer: true,
      textDecoder: true,
      textEncoder: false,
      decompressionStream: false,
      cryptoSubtle: true,
      indexedDB: true,
      allRequiredFeaturesPresent: false,
    };

    const messages = getMissingFeatureMessages(features);
    expect(messages.some((m) => /TextEncoder/i.test(m))).toBe(true);
  });

  it('returns a message for missing cryptoSubtle', () => {
    const features: FeatureDetectionResult = {
      webWorker: true,
      transferableArrayBuffer: true,
      textDecoder: true,
      textEncoder: true,
      decompressionStream: false,
      cryptoSubtle: false,
      indexedDB: true,
      allRequiredFeaturesPresent: false,
    };

    const messages = getMissingFeatureMessages(features);
    expect(messages.some((m) => /Web Crypto|crypto/i.test(m))).toBe(true);
  });

  it('returns a message for missing indexedDB', () => {
    const features: FeatureDetectionResult = {
      webWorker: true,
      transferableArrayBuffer: true,
      textDecoder: true,
      textEncoder: true,
      decompressionStream: false,
      cryptoSubtle: true,
      indexedDB: false,
      allRequiredFeaturesPresent: false,
    };

    const messages = getMissingFeatureMessages(features);
    expect(messages.some((m) => /IndexedDB/i.test(m))).toBe(true);
  });

  it('returns multiple messages when multiple features are absent', () => {
    const features: FeatureDetectionResult = {
      webWorker: false,
      transferableArrayBuffer: false,
      textDecoder: false,
      textEncoder: false,
      decompressionStream: false,
      cryptoSubtle: false,
      indexedDB: false,
      allRequiredFeaturesPresent: false,
    };

    const messages = getMissingFeatureMessages(features);
    // Should have one message per missing required feature (6 required: webWorker,
    // transferableArrayBuffer, textDecoder, textEncoder, cryptoSubtle, indexedDB)
    expect(messages.length).toBe(6);
  });

  it('absence of decompressionStream does NOT produce a message (it is optional)', () => {
    const features: FeatureDetectionResult = {
      webWorker: true,
      transferableArrayBuffer: true,
      textDecoder: true,
      textEncoder: true,
      decompressionStream: false, // optional — absent, but should NOT produce a message
      cryptoSubtle: true,
      indexedDB: true,
      allRequiredFeaturesPresent: true,
    };

    const messages = getMissingFeatureMessages(features);
    // decompressionStream is NOT in MISSING_FEATURE_MESSAGES, so no message for it
    expect(messages.some((m) => /DecompressionStream/i.test(m))).toBe(false);
    expect(messages).toEqual([]);
  });

  it('all messages are non-empty strings', () => {
    const features: FeatureDetectionResult = {
      webWorker: false,
      transferableArrayBuffer: false,
      textDecoder: false,
      textEncoder: false,
      decompressionStream: false,
      cryptoSubtle: false,
      indexedDB: false,
      allRequiredFeaturesPresent: false,
    };

    const messages = getMissingFeatureMessages(features);
    for (const msg of messages) {
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    }
  });
});

// ─── MISSING_FEATURE_MESSAGES constant ───────────────────────────────────────

describe('MISSING_FEATURE_MESSAGES constant', () => {
  it('has an entry for webWorker', () => {
    expect(MISSING_FEATURE_MESSAGES.webWorker).toBeTruthy();
    expect(MISSING_FEATURE_MESSAGES.webWorker).toMatch(/browser/i);
  });

  it('has an entry for transferableArrayBuffer', () => {
    expect(MISSING_FEATURE_MESSAGES.transferableArrayBuffer).toBeTruthy();
    expect(MISSING_FEATURE_MESSAGES.transferableArrayBuffer).toMatch(/ArrayBuffer|browser/i);
  });

  it('has an entry for textDecoder', () => {
    expect(MISSING_FEATURE_MESSAGES.textDecoder).toBeTruthy();
  });

  it('has an entry for textEncoder', () => {
    expect(MISSING_FEATURE_MESSAGES.textEncoder).toBeTruthy();
  });

  it('has an entry for cryptoSubtle', () => {
    expect(MISSING_FEATURE_MESSAGES.cryptoSubtle).toBeTruthy();
    expect(MISSING_FEATURE_MESSAGES.cryptoSubtle).toMatch(/crypto|encrypt/i);
  });

  it('has an entry for indexedDB', () => {
    expect(MISSING_FEATURE_MESSAGES.indexedDB).toBeTruthy();
    expect(MISSING_FEATURE_MESSAGES.indexedDB).toMatch(/IndexedDB|storage/i);
  });

  it('does NOT have an entry for decompressionStream (it is optional)', () => {
    expect('decompressionStream' in MISSING_FEATURE_MESSAGES).toBe(false);
  });

  it('every message is a non-empty string mentioning a modern browser or action', () => {
    for (const [key, msg] of Object.entries(MISSING_FEATURE_MESSAGES)) {
      expect(msg.length, `MISSING_FEATURE_MESSAGES.${key} must be non-empty`).toBeGreaterThan(0);
      // Every message should guide the user toward a solution
      expect(msg, `MISSING_FEATURE_MESSAGES.${key} should mention browser or action`).toMatch(
        /browser|update|Chrome|Firefox|Safari|modern|HTTPS|storage/i,
      );
    }
  });
});

// ─── Real browser environment tests ──────────────────────────────────────────

// These tests are marked fixme because they require a real browser context
// that jsdom cannot faithfully emulate.

it.todo(
  'REAL BROWSER: Web Worker can be constructed, receives postMessage, and terminates cleanly — requires Playwright or browser-based test runner',
);

it.todo(
  'REAL BROWSER: ArrayBuffer transfer via Worker.postMessage detaches the buffer (byteLength becomes 0 on sender side) — requires real Worker implementation',
);

it.todo(
  'REAL BROWSER: DecompressionStream decompresses a real .gz DNA file chunk — requires native browser DecompressionStream implementation',
);

it.todo(
  'REAL BROWSER: crypto.subtle.generateKey + encrypt + decrypt round-trips correctly under HTTPS — jsdom crypto.subtle is a partial mock',
);

it.todo(
  "REAL BROWSER: IndexedDB survives a page reload (data persistence) — jsdom IndexedDB is in-memory only, does not persist across 'navigations'",
);

it.todo(
  'REAL BROWSER: navigator.storage.estimate() reports available quota — not implemented in jsdom',
);
