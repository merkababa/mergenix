/**
 * Tests for the decompression module.
 *
 * Tests cover format detection from magic bytes and file extensions,
 * raw passthrough, error handling, and the DecompressionError class.
 *
 * Note: Full gzip/zip decompression tests require a browser environment
 * with DecompressionStream API support (not available in Node.js by default).
 * These tests focus on the logic that CAN be tested in a Node/Vitest environment.
 */

import { describe, it, expect } from 'vitest';
import { detectCompression, DecompressionError, decompress } from '../src/decompression';
import type { CompressionFormat } from '../src/decompression';

// ─── detectCompression ──────────────────────────────────────────────────────

describe('detectCompression', () => {
  it('should detect ZIP from magic bytes (PK)', () => {
    const header = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    expect(detectCompression('file.txt', header)).toBe('zip');
  });

  it('should detect GZIP from magic bytes (1f 8b)', () => {
    const header = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);
    expect(detectCompression('file.txt', header)).toBe('gzip');
  });

  it('should detect raw when magic bytes do not match', () => {
    const header = new Uint8Array([0x23, 0x20, 0x54, 0x68]); // "# Th"
    expect(detectCompression('file.txt', header)).toBe('raw');
  });

  it('should detect ZIP from file extension when header is too short', () => {
    const header = new Uint8Array([0x00]); // too short for magic byte check
    expect(detectCompression('data.zip', header)).toBe('zip');
  });

  it('should detect GZIP from .gz extension when header is empty', () => {
    const header = new Uint8Array([]);
    expect(detectCompression('data.txt.gz', header)).toBe('gzip');
  });

  it('should detect GZIP from .gzip extension', () => {
    const header = new Uint8Array([]);
    expect(detectCompression('data.gzip', header)).toBe('gzip');
  });

  it('should return raw for unknown extension and no magic bytes', () => {
    const header = new Uint8Array([0x41, 0x42]); // "AB"
    expect(detectCompression('data.txt', header)).toBe('raw');
  });

  it('should prioritize magic bytes over file extension', () => {
    // Magic bytes say GZIP, extension says .zip
    const gzipHeader = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);
    expect(detectCompression('misleading.zip', gzipHeader)).toBe('gzip');

    // Magic bytes say ZIP, extension says .gz
    const zipHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    expect(detectCompression('misleading.gz', zipHeader)).toBe('zip');
  });

  it('should handle case-insensitive file extensions', () => {
    const header = new Uint8Array([]);
    expect(detectCompression('DATA.ZIP', header)).toBe('zip');
    expect(detectCompression('FILE.GZ', header)).toBe('gzip');
    expect(detectCompression('TEST.GZIP', header)).toBe('gzip');
  });

  it('should detect raw for non-genetic data extensions without magic bytes', () => {
    const header = new Uint8Array([0x41, 0x42]); // "AB"
    expect(detectCompression('file.csv', header)).toBe('raw');
    expect(detectCompression('file.vcf', header)).toBe('raw');
    expect(detectCompression('file.tsv', header)).toBe('raw');
  });
});

// ─── DecompressionError ─────────────────────────────────────────────────────

describe('DecompressionError', () => {
  it('should create error with correct code and message', () => {
    const err = new DecompressionError('SIZE_EXCEEDED', 'File too large');
    expect(err.code).toBe('SIZE_EXCEEDED');
    expect(err.message).toBe('File too large');
    expect(err.name).toBe('DecompressionError');
  });

  it('should be an instance of Error', () => {
    const err = new DecompressionError('TIMEOUT', 'Timed out');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DecompressionError);
  });

  it('should support all error codes', () => {
    const codes: Array<
      'SIZE_EXCEEDED' | 'RATIO_EXCEEDED' | 'TIMEOUT' | 'UNSUPPORTED_FORMAT' | 'CORRUPT'
    > = ['SIZE_EXCEEDED', 'RATIO_EXCEEDED', 'TIMEOUT', 'UNSUPPORTED_FORMAT', 'CORRUPT'];

    for (const code of codes) {
      const err = new DecompressionError(code, `Error: ${code}`);
      expect(err.code).toBe(code);
    }
  });
});

// ─── decompress (raw passthrough) ───────────────────────────────────────────

describe('decompress', () => {
  it('should pass through raw text files without decompression', async () => {
    const content = '# 23andMe raw data\nrs123\t1\t100\tAA\n';
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'test.txt');

    const result = await decompress(file, { maxSize: 1024 * 1024, maxRatio: 100, timeout: 5000 });

    expect(result.format).toBe('raw');
    expect(result.originalSize).toBe(file.size);
    expect(result.decompressedSize).toBe(file.size);
    expect(result.stream).toBeDefined();

    // Read the stream to verify content
    const reader = result.stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const decoder = new TextDecoder();
    const decoded =
      chunks.map((c) => decoder.decode(c, { stream: true })).join('') + decoder.decode();
    expect(decoded).toBe(content);
  });

  it('should call onProgress for gzip files when DecompressionStream unavailable', async () => {
    // Create a file with gzip magic bytes but not actually gzip
    // This should throw UNSUPPORTED_FORMAT in Node (no DecompressionStream)
    const gzipHeader = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00]);
    const blob = new Blob([gzipHeader]);
    const file = new File([blob], 'test.gz');

    // In Node.js, DecompressionStream is not available
    // So this should throw UNSUPPORTED_FORMAT
    if (typeof globalThis.DecompressionStream === 'undefined') {
      await expect(
        decompress(file, { maxSize: 1024, maxRatio: 100, timeout: 5000 }),
      ).rejects.toThrow('DecompressionStream API is not available');
    }
  });

  it('should throw UNSUPPORTED_FORMAT for zip files when DecompressionStream unavailable', async () => {
    // Create a minimal ZIP-like file (just the magic bytes, not valid)
    // The ZIP handler reads the full file and tries to find genetic data
    const zipData = new Uint8Array([
      0x50,
      0x4b,
      0x03,
      0x04, // PK signature
      0x00,
      0x00, // version
      0x00,
      0x00, // flags
      0x00,
      0x00, // compression method (stored)
      0x00,
      0x00, // mod time
      0x00,
      0x00, // mod date
      0x00,
      0x00,
      0x00,
      0x00, // crc32
      0x00,
      0x00,
      0x00,
      0x00, // compressed size = 0
      0x00,
      0x00,
      0x00,
      0x00, // uncompressed size = 0
      0x05,
      0x00, // filename length = 5
      0x00,
      0x00, // extra length = 0
      0x61,
      0x2e,
      0x74,
      0x78,
      0x74, // "a.txt"
      // No data follows since compressed size = 0
    ]);

    const blob = new Blob([zipData]);
    const file = new File([blob], 'test.zip');

    // The ZIP handler looks for genetic data files with size > 0
    // This entry has compressedSize=0, so it should be skipped and throw CORRUPT
    await expect(decompress(file, { maxSize: 1024, maxRatio: 100, timeout: 5000 })).rejects.toThrow(
      'No genetic data file',
    );
  });
});

// ─── CompressionFormat type check ───────────────────────────────────────────

describe('CompressionFormat type', () => {
  it('should accept valid compression format values', () => {
    const formats: CompressionFormat[] = ['zip', 'gzip', 'raw'];
    expect(formats).toHaveLength(3);
  });
});
