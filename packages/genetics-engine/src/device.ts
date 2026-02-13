/**
 * Device detection and memory management for Web Workers.
 *
 * This module detects device capabilities and provides memory governance
 * for the genetics processing pipeline. All functions are designed to run
 * inside a Web Worker context (no `window`, `document`, or `screen` access).
 *
 * Mobile devices get conservative limits to prevent OOM crashes:
 * - 50 MB processing memory cap
 * - Single-worker sequential processing
 * - Reduced Argon2id parameters (OWASP minimum)
 *
 * Desktop devices get higher limits:
 * - 500 MB processing memory cap
 * - Up to 3 concurrent workers
 * - Full Argon2id parameters
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Device capability profile. */
export interface DeviceProfile {
  /** Estimated device memory in GB (from navigator.deviceMemory or heuristic). */
  deviceMemory: number;
  /** Number of logical CPU cores. */
  hardwareConcurrency: number;
  /** Whether the device is classified as mobile. */
  isMobile: boolean;
  /** Maximum memory allowed for genetics processing (bytes). */
  maxProcessingMemory: number;
  /** Maximum concurrent workers allowed. */
  maxConcurrentWorkers: number;
  /** Whether to process files sequentially. */
  sequential: boolean;
}

/** Argon2id parameters adjusted for device capability. */
export interface Argon2Params {
  /** Memory cost in KB. */
  memory: number;
  /** Number of iterations (time cost). */
  iterations: number;
  /** Degree of parallelism. */
  parallelism: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Mobile processing memory cap: 50 MB. */
const MOBILE_MAX_MEMORY = 50 * 1024 * 1024;

/** Desktop processing memory cap: 500 MB. */
const DESKTOP_MAX_MEMORY = 500 * 1024 * 1024;

/** Device memory threshold (GB) below which device is classified as mobile. */
const MOBILE_MEMORY_THRESHOLD_GB = 4;

/** Hardware concurrency threshold at or below which device is classified as mobile. */
const MOBILE_CONCURRENCY_THRESHOLD = 4;

/** Maximum concurrent workers on desktop. */
const DESKTOP_MAX_WORKERS = 3;

/** Mobile Argon2id: 19 MB memory (OWASP minimum for Argon2id). */
const MOBILE_ARGON2_MEMORY_KB = 19 * 1024;

/** Desktop Argon2id: 64 MB memory. */
const DESKTOP_ARGON2_MEMORY_KB = 64 * 1024;

/** Memory pressure threshold (80%). */
const PRESSURE_THRESHOLD = 0.8;

// ─── Augmented Navigator Type ─────────────────────────────────────────────────

/**
 * Extended WorkerNavigator interface that includes the deviceMemory property.
 * navigator.deviceMemory is a Chrome/Edge-only API (not in standard TS lib defs).
 * In a Web Worker context, the navigator type is WorkerNavigator, not Navigator.
 */
interface NavigatorWithDeviceMemory extends WorkerNavigator {
  deviceMemory?: number;
}

// ─── Device Detection ─────────────────────────────────────────────────────────

/**
 * Detect device capabilities.
 *
 * Mobile detection heuristics (runs in a Web Worker, no DOM access):
 * - `navigator.deviceMemory < 4` (Chrome-only API, in GB)
 * - `navigator.hardwareConcurrency <= 4`
 *
 * If `navigator.deviceMemory` is unavailable (non-Chrome browsers),
 * classification falls back to the hardwareConcurrency threshold alone.
 *
 * @returns DeviceProfile with memory limits and concurrency settings.
 */
export function detectDevice(): DeviceProfile {
  const nav = navigator as NavigatorWithDeviceMemory;

  // navigator.deviceMemory: Chrome/Edge only, returns GB (0.25, 0.5, 1, 2, 4, 8)
  // Falls back to a heuristic based on hardwareConcurrency.
  const deviceMemory: number = typeof nav.deviceMemory === 'number'
    ? nav.deviceMemory
    : estimateMemoryFromCores(nav.hardwareConcurrency);

  const hardwareConcurrency: number =
    typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0
      ? nav.hardwareConcurrency
      : 2; // Conservative fallback

  // Mobile classification: low memory OR low core count
  const isMobile: boolean =
    deviceMemory < MOBILE_MEMORY_THRESHOLD_GB ||
    hardwareConcurrency <= MOBILE_CONCURRENCY_THRESHOLD;

  const maxProcessingMemory = isMobile ? MOBILE_MAX_MEMORY : DESKTOP_MAX_MEMORY;

  // Workers: mobile gets 1 (sequential), desktop gets min(cores - 1, 3)
  const maxConcurrentWorkers = isMobile
    ? 1
    : Math.min(Math.max(hardwareConcurrency - 1, 1), DESKTOP_MAX_WORKERS);

  const sequential = isMobile;

  return {
    deviceMemory,
    hardwareConcurrency,
    isMobile,
    maxProcessingMemory,
    maxConcurrentWorkers,
    sequential,
  };
}

/**
 * Estimate device memory (GB) from hardware concurrency.
 *
 * This is a rough heuristic used when `navigator.deviceMemory` is unavailable.
 * Based on common hardware configurations:
 * - 1-2 cores: likely 2 GB (low-end mobile / old device)
 * - 3-4 cores: likely 4 GB (mid-range mobile / budget laptop)
 * - 5-8 cores: likely 8 GB (desktop / higher-end laptop)
 * - 9+ cores: likely 16 GB (high-end desktop / workstation)
 *
 * @param cores - Number of logical CPU cores
 * @returns Estimated device memory in GB
 */
function estimateMemoryFromCores(cores: number): number {
  if (cores <= 2) return 2;
  if (cores <= 4) return 4;
  if (cores <= 8) return 8;
  return 16;
}

// ─── Argon2id Parameters ──────────────────────────────────────────────────────

/**
 * Get Argon2id parameters appropriate for the device.
 *
 * Mobile devices get OWASP minimum parameters to avoid excessive
 * memory usage and processing time:
 * - 19 MB memory, 1 parallelism, 4 iterations
 *
 * Desktop devices get stronger parameters:
 * - 64 MB memory, 4 parallelism, 3 iterations
 *
 * References:
 * - OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 * - RFC 9106 (Argon2): https://www.rfc-editor.org/rfc/rfc9106
 *
 * @param profile - Device capability profile from detectDevice()
 * @returns Argon2id parameters tuned for the device
 */
export function getArgon2Params(profile: DeviceProfile): Argon2Params {
  if (profile.isMobile) {
    return {
      memory: MOBILE_ARGON2_MEMORY_KB,
      iterations: 4,
      parallelism: 1,
    };
  }

  return {
    memory: DESKTOP_ARGON2_MEMORY_KB,
    iterations: 3,
    parallelism: 4,
  };
}

// ─── Memory Governor ──────────────────────────────────────────────────────────

/**
 * Memory governor — tracks current memory usage and enforces limits.
 *
 * Used by the genetics processing pipeline to prevent out-of-memory
 * crashes on constrained devices. Call `canAllocate()` before allocating
 * large buffers (e.g., parsing a genetic data file).
 *
 * Usage:
 * ```typescript
 * const profile = detectDevice();
 * const governor = new MemoryGovernor(profile.maxProcessingMemory);
 *
 * if (governor.canAllocate(fileSize)) {
 *   governor.recordAllocation(fileSize);
 *   // ... process file ...
 *   governor.recordRelease(fileSize);
 * } else {
 *   // Queue for sequential processing or reject
 * }
 * ```
 */
export class MemoryGovernor {
  private currentUsage: number = 0;
  private readonly maxMemory: number;

  /**
   * Create a new MemoryGovernor.
   * @param maxMemory - Maximum allowed memory usage in bytes. Must be > 0.
   * @throws Error if maxMemory is not a positive number.
   */
  constructor(maxMemory: number) {
    if (maxMemory <= 0 || !Number.isFinite(maxMemory)) {
      throw new Error(
        `MemoryGovernor: maxMemory must be a positive finite number, got ${String(maxMemory)}`,
      );
    }
    this.maxMemory = maxMemory;
  }

  /**
   * Check if an allocation is safe (would not exceed the memory limit).
   * @param bytes - Number of bytes to allocate. Must be non-negative.
   * @returns true if the allocation would fit within the memory limit.
   */
  canAllocate(bytes: number): boolean {
    if (bytes < 0) return false;
    return this.currentUsage + bytes <= this.maxMemory;
  }

  /**
   * Record an allocation. Does NOT check limits — call canAllocate() first.
   * @param bytes - Number of bytes allocated. Must be non-negative.
   */
  recordAllocation(bytes: number): void {
    if (bytes < 0) return;
    this.currentUsage += bytes;
  }

  /**
   * Record a deallocation / buffer release.
   * Clamps to zero if released more than currently tracked.
   * @param bytes - Number of bytes released. Must be non-negative.
   */
  recordRelease(bytes: number): void {
    if (bytes < 0) return;
    this.currentUsage = Math.max(0, this.currentUsage - bytes);
  }

  /**
   * Get current usage statistics.
   * @returns Object with currentUsage, maxMemory, and usagePct (0-1 range).
   */
  getStats(): { currentUsage: number; maxMemory: number; usagePct: number } {
    return {
      currentUsage: this.currentUsage,
      maxMemory: this.maxMemory,
      usagePct: this.maxMemory > 0 ? this.currentUsage / this.maxMemory : 0,
    };
  }

  /**
   * Check if memory pressure is high (usage exceeds 80% of the limit).
   * @returns true if current usage is above 80% of maxMemory.
   */
  isUnderPressure(): boolean {
    return this.currentUsage / this.maxMemory > PRESSURE_THRESHOLD;
  }

  /**
   * Reset all tracking (e.g., after an analysis run completes).
   * Sets currentUsage back to zero.
   */
  reset(): void {
    this.currentUsage = 0;
  }
}
