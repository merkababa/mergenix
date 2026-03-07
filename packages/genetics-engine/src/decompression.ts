/**
 * Client-Side Streaming Decompression
 *
 * Decompress genetic data files in the Web Worker with three code paths:
 *
 * 1. **ZIP container**: Locate the first matching genetic data file
 *    (.txt, .csv, .tsv, .vcf) within the archive and decompress it.
 * 2. **GZIP stream**: Pipe through the native `DecompressionStream` API
 *    (available in modern browsers). Falls back to error if not supported.
 * 3. **Raw text**: Pass through without decompression.
 *
 * Security limits enforced on every decompression path:
 * - Maximum uncompressed size (configurable; 500 MB desktop / 50 MB mobile)
 * - Maximum compression ratio (default 100:1 to block zip bombs)
 * - Decompression timeout (default 30 seconds)
 */

// ─── Types ──────────────────────────────────────────────────────────────────

/** Detected compression format. */
export type CompressionFormat = 'zip' | 'gzip' | 'raw';

/** Result of a decompression operation. */
export interface DecompressionResult {
  /** Detected/used compression format. */
  format: CompressionFormat;
  /** Original compressed size in bytes. */
  originalSize: number;
  /** Decompressed size in bytes (tracked during streaming). */
  decompressedSize: number;
  /** The decompressed content as a ReadableStream for streaming consumption. */
  stream: ReadableStream<Uint8Array>;
}

/** Options controlling decompression security limits. */
export interface DecompressionOptions {
  /** Maximum uncompressed bytes allowed. */
  maxSize: number;
  /** Maximum compression ratio before aborting (default: 100). */
  maxRatio: number;
  /** Timeout in milliseconds (default: 30000). */
  timeout: number;
}

// ─── Error Class ────────────────────────────────────────────────────────────

/** Error codes for decompression security violations and failures. */
export type DecompressionErrorCode =
  | 'SIZE_EXCEEDED'
  | 'RATIO_EXCEEDED'
  | 'TIMEOUT'
  | 'UNSUPPORTED_FORMAT'
  | 'CORRUPT';

/**
 * Error thrown when decompression encounters a security violation or failure.
 */
export class DecompressionError extends Error {
  /** Machine-readable error code. */
  public readonly code: DecompressionErrorCode;

  constructor(code: DecompressionErrorCode, message: string) {
    super(message);
    this.name = 'DecompressionError';
    this.code = code;
  }
}

// ─── Magic Byte Constants ───────────────────────────────────────────────────

/** ZIP magic bytes: PK (0x50 0x4B) */
const ZIP_MAGIC_0 = 0x50;
const ZIP_MAGIC_1 = 0x4b;

/** GZIP magic bytes: 0x1F 0x8B */
const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;

/** File extensions considered genetic data within ZIP archives. */
const GENETIC_DATA_EXTENSIONS = new Set(['.txt', '.csv', '.tsv', '.vcf']);

// ─── ZIP Local File Header Constants ────────────────────────────────────────

/** Minimum size of a ZIP local file header (30 bytes). */
const ZIP_LOCAL_HEADER_SIZE = 30;

/** ZIP local file header signature (PK\x03\x04). */
const ZIP_LOCAL_HEADER_SIG = 0x04034b50;

/** Deflate compression method. */
const ZIP_METHOD_DEFLATE = 8;

/** Stored (no compression) method. */
const ZIP_METHOD_STORED = 0;

// ─── Format Detection ───────────────────────────────────────────────────────

/**
 * Detect compression format from file name and magic bytes.
 *
 * Detection priority:
 * 1. Magic bytes (most reliable)
 * 2. File extension (fallback)
 *
 * @param fileName - Original file name (used for extension heuristic)
 * @param header - First bytes of the file (at least 2 bytes needed)
 * @returns Detected compression format
 */
export function detectCompression(fileName: string, header: Uint8Array): CompressionFormat {
  // Check magic bytes first (most reliable)
  if (header.length >= 2) {
    if (header[0] === ZIP_MAGIC_0 && header[1] === ZIP_MAGIC_1) {
      return 'zip';
    }
    if (header[0] === GZIP_MAGIC_0 && header[1] === GZIP_MAGIC_1) {
      return 'gzip';
    }
  }

  // Fall back to file extension
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.zip')) {
    return 'zip';
  }
  if (lower.endsWith('.gz') || lower.endsWith('.gzip')) {
    return 'gzip';
  }

  return 'raw';
}

// ─── ZIP Helpers ────────────────────────────────────────────────────────────

/**
 * Read a little-endian uint16 from a Uint8Array at the given offset.
 */
function readUint16LE(data: Uint8Array, offset: number): number {
  return (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8);
}

/**
 * Read a little-endian uint32 from a Uint8Array at the given offset.
 */
function readUint32LE(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] ?? 0) |
      ((data[offset + 1] ?? 0) << 8) |
      ((data[offset + 2] ?? 0) << 16) |
      ((data[offset + 3] ?? 0) << 24)) >>>
    0
  ); // >>> 0 ensures unsigned
}

/**
 * Check if a filename (from within a ZIP) matches a genetic data extension.
 */
function isGeneticDataFile(name: string): boolean {
  const lower = name.toLowerCase();
  for (const ext of GENETIC_DATA_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return true;
    }
  }
  return false;
}

/**
 * Find and extract the first genetic data file from a ZIP buffer.
 *
 * Walks local file headers sequentially looking for a file with a
 * genetic data extension (.txt, .csv, .tsv, .vcf).
 *
 * @returns ReadableStream of the decompressed file content, plus its uncompressed size
 * @throws DecompressionError if no suitable file found or format issues
 */
function extractFirstGeneticFileFromZip(data: Uint8Array): {
  stream: ReadableStream<Uint8Array>;
  uncompressedSize: number;
  fileName: string;
} {
  let offset = 0;

  while (offset + ZIP_LOCAL_HEADER_SIZE <= data.length) {
    const sig = readUint32LE(data, offset);
    if (sig !== ZIP_LOCAL_HEADER_SIG) {
      // Not a local file header; we've reached end of local headers
      break;
    }

    const method = readUint16LE(data, offset + 8);
    const compressedSize = readUint32LE(data, offset + 18);
    const uncompressedSize = readUint32LE(data, offset + 22);
    const fileNameLen = readUint16LE(data, offset + 26);
    const extraLen = readUint16LE(data, offset + 28);

    const fileNameBytes = data.slice(offset + 30, offset + 30 + fileNameLen);
    const fileName = new TextDecoder().decode(fileNameBytes);

    const dataStart = offset + ZIP_LOCAL_HEADER_SIZE + fileNameLen + extraLen;
    const dataEnd = dataStart + compressedSize;

    if (isGeneticDataFile(fileName) && compressedSize > 0) {
      const compressedData = data.slice(dataStart, dataEnd);

      if (method === ZIP_METHOD_STORED) {
        // No compression — return as-is
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(compressedData);
            controller.close();
          },
        });
        return { stream, uncompressedSize, fileName };
      }

      if (method === ZIP_METHOD_DEFLATE) {
        // Deflate — use DecompressionStream('deflate-raw')
        if (typeof DecompressionStream === 'undefined') {
          throw new DecompressionError(
            'UNSUPPORTED_FORMAT',
            'DecompressionStream API is not available in this browser. Cannot decompress ZIP files.',
          );
        }

        const sourceStream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(compressedData);
            controller.close();
          },
        });

        // Type assertion needed: DecompressionStream writable accepts BufferSource,
        // but pipeThrough expects exact Uint8Array match. Safe at runtime.
        const decompressed = sourceStream.pipeThrough(
          new DecompressionStream('deflate-raw') as unknown as TransformStream<
            Uint8Array,
            Uint8Array
          >,
        );
        return { stream: decompressed, uncompressedSize, fileName };
      }

      // Unsupported compression method
      throw new DecompressionError(
        'UNSUPPORTED_FORMAT',
        `ZIP entry "${fileName}" uses unsupported compression method ${String(method)}.`,
      );
    }

    // Advance to next local file header
    offset = dataEnd;
  }

  throw new DecompressionError(
    'CORRUPT',
    'No genetic data file (.txt, .csv, .tsv, .vcf) found inside the ZIP archive.',
  );
}

// ─── Main Decompress Function ───────────────────────────────────────────────

/**
 * Decompress a file and return a ReadableStream of the decompressed content.
 *
 * Enforces security limits:
 * - **Size limit**: Aborts if decompressed output exceeds `options.maxSize`
 * - **Ratio limit**: Aborts if compression ratio exceeds `options.maxRatio`
 * - **Timeout**: Aborts if decompression takes longer than `options.timeout` ms
 *
 * @param file - The File object to decompress
 * @param options - Security limits (maxSize, maxRatio, timeout)
 * @param onProgress - Optional callback for progress reporting (bytesIn, bytesOut, ratio)
 * @returns DecompressionResult with format info and a ReadableStream of decompressed bytes
 * @throws DecompressionError on security violations or unsupported formats
 */
export async function decompress(
  file: File,
  options: DecompressionOptions,
  onProgress?: (bytesIn: number, bytesOut: number, ratio: number) => void,
): Promise<DecompressionResult> {
  const originalSize = file.size;

  // Read the first few bytes for magic byte detection
  const headerSlice = file.slice(0, 4);
  const headerBuffer = await headerSlice.arrayBuffer();
  const header = new Uint8Array(headerBuffer);

  const format = detectCompression(file.name, header);

  if (format === 'raw') {
    // Enforce size limit up-front — for raw files we know the exact size
    if (originalSize > options.maxSize) {
      throw new DecompressionError(
        'SIZE_EXCEEDED',
        `File size ${String(originalSize)} exceeds maximum allowed ${String(options.maxSize)} bytes.`,
      );
    }

    // No decompression needed — pass through
    const rawStream = file.stream();
    return {
      format: 'raw',
      originalSize,
      decompressedSize: originalSize,
      stream: rawStream,
    };
  }

  if (format === 'gzip') {
    if (typeof DecompressionStream === 'undefined') {
      throw new DecompressionError(
        'UNSUPPORTED_FORMAT',
        'DecompressionStream API is not available in this browser. Cannot decompress GZIP files.',
      );
    }

    const sourceStream = file.stream();
    // Type assertion needed: DecompressionStream writable accepts BufferSource,
    // but pipeThrough expects exact Uint8Array match. Safe at runtime.
    const decompressedStream = sourceStream.pipeThrough(
      new DecompressionStream('gzip') as unknown as TransformStream<Uint8Array, Uint8Array>,
    );

    // Wrap in a monitoring transform that enforces size/ratio/timeout limits
    const monitoredStream = createMonitoredStream(
      decompressedStream,
      originalSize,
      options,
      onProgress,
    );

    return {
      format: 'gzip',
      originalSize,
      decompressedSize: 0, // Updated as stream is consumed
      stream: monitoredStream,
    };
  }

  // ZIP path: read entire file to walk local headers
  const fullBuffer = await file.arrayBuffer();
  const fullData = new Uint8Array(fullBuffer);

  const {
    stream: extractedStream,
    uncompressedSize,
    fileName: _innerName,
  } = extractFirstGeneticFileFromZip(fullData);

  // Check declared uncompressed size against limits
  if (uncompressedSize > options.maxSize) {
    throw new DecompressionError(
      'SIZE_EXCEEDED',
      `ZIP entry declares uncompressed size ${String(uncompressedSize)} bytes, ` +
        `which exceeds the maximum allowed ${String(options.maxSize)} bytes.`,
    );
  }

  if (originalSize > 0 && uncompressedSize / originalSize > options.maxRatio) {
    throw new DecompressionError(
      'RATIO_EXCEEDED',
      `ZIP entry compression ratio (${String(Math.round(uncompressedSize / originalSize))}:1) ` +
        `exceeds the maximum allowed ${String(options.maxRatio)}:1.`,
    );
  }

  // Wrap in a monitoring transform
  const monitoredStream = createMonitoredStream(extractedStream, originalSize, options, onProgress);

  return {
    format: 'zip',
    originalSize,
    decompressedSize: uncompressedSize,
    stream: monitoredStream,
  };
}

// ─── Monitoring Stream ──────────────────────────────────────────────────────

/**
 * Create a TransformStream that monitors decompressed output for security violations.
 *
 * Tracks:
 * - Total bytes decompressed (enforces maxSize)
 * - Compression ratio (enforces maxRatio)
 * - Elapsed time (enforces timeout)
 *
 * Calls onProgress periodically to report decompression status.
 */
function createMonitoredStream(
  source: ReadableStream<Uint8Array>,
  originalSize: number,
  options: DecompressionOptions,
  onProgress?: (bytesIn: number, bytesOut: number, ratio: number) => void,
): ReadableStream<Uint8Array> {
  let totalBytesOut = 0;
  const startTime = Date.now();

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      totalBytesOut += chunk.byteLength;

      // Check size limit
      if (totalBytesOut > options.maxSize) {
        controller.error(
          new DecompressionError(
            'SIZE_EXCEEDED',
            `Decompressed size (${String(totalBytesOut)} bytes) exceeds maximum ` +
              `allowed (${String(options.maxSize)} bytes).`,
          ),
        );
        return;
      }

      // Check ratio limit
      if (originalSize > 0) {
        const ratio = totalBytesOut / originalSize;
        if (ratio > options.maxRatio) {
          controller.error(
            new DecompressionError(
              'RATIO_EXCEEDED',
              `Compression ratio (${String(Math.round(ratio))}:1) exceeds maximum ` +
                `allowed (${String(options.maxRatio)}:1).`,
            ),
          );
          return;
        }
      }

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > options.timeout) {
        controller.error(
          new DecompressionError(
            'TIMEOUT',
            `Decompression timed out after ${String(options.timeout)} ms.`,
          ),
        );
        return;
      }

      // Report progress
      if (onProgress) {
        const ratio = originalSize > 0 ? totalBytesOut / originalSize : 0;
        onProgress(originalSize, totalBytesOut, ratio);
      }

      controller.enqueue(chunk);
    },
  });

  return source.pipeThrough(transform);
}
