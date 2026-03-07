/**
 * Tests for device detection and memory management.
 *
 * Tests cover:
 * - Mobile vs desktop device classification
 * - Navigator property mocking (deviceMemory, hardwareConcurrency)
 * - Memory governor allocation limits, release, pressure, and reset
 * - Argon2id parameter selection per device profile
 * - Edge cases (missing navigator properties, boundary values)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectDevice, getArgon2Params, MemoryGovernor } from '../src/device';
import type { DeviceProfile } from '../src/device';

// ─── Navigator Mocking Utilities ──────────────────────────────────────────────

/**
 * Mock navigator properties for device detection tests.
 * Returns a cleanup function to restore originals.
 */
function mockNavigator(overrides: {
  deviceMemory?: number | undefined;
  hardwareConcurrency?: number;
}): () => void {
  const originalDescriptors: Record<string, PropertyDescriptor | undefined> = {};

  if ('deviceMemory' in overrides) {
    originalDescriptors['deviceMemory'] = Object.getOwnPropertyDescriptor(
      navigator,
      'deviceMemory',
    );
    if (overrides.deviceMemory === undefined) {
      // Simulate browsers that don't support deviceMemory
      Object.defineProperty(navigator, 'deviceMemory', {
        value: undefined,
        configurable: true,
        writable: true,
      });
    } else {
      Object.defineProperty(navigator, 'deviceMemory', {
        value: overrides.deviceMemory,
        configurable: true,
        writable: true,
      });
    }
  }

  if ('hardwareConcurrency' in overrides) {
    originalDescriptors['hardwareConcurrency'] = Object.getOwnPropertyDescriptor(
      navigator,
      'hardwareConcurrency',
    );
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: overrides.hardwareConcurrency,
      configurable: true,
      writable: true,
    });
  }

  return () => {
    for (const [key, descriptor] of Object.entries(originalDescriptors)) {
      if (descriptor) {
        Object.defineProperty(navigator, key, descriptor);
      } else {
        // Property didn't exist originally — delete it
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (navigator as Record<string, unknown>)[key];
      }
    }
  };
}

// ─── detectDevice ─────────────────────────────────────────────────────────────

describe('detectDevice', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  describe('mobile classification', () => {
    it('should classify as mobile when deviceMemory < 4', () => {
      cleanup = mockNavigator({ deviceMemory: 2, hardwareConcurrency: 8 });
      const profile = detectDevice();

      expect(profile.isMobile).toBe(true);
      expect(profile.deviceMemory).toBe(2);
      expect(profile.sequential).toBe(true);
      expect(profile.maxConcurrentWorkers).toBe(1);
      expect(profile.maxProcessingMemory).toBe(50 * 1024 * 1024);
    });

    it('should classify as mobile when hardwareConcurrency <= 4', () => {
      cleanup = mockNavigator({ deviceMemory: 8, hardwareConcurrency: 4 });
      const profile = detectDevice();

      expect(profile.isMobile).toBe(true);
      expect(profile.sequential).toBe(true);
      expect(profile.maxConcurrentWorkers).toBe(1);
    });

    it('should classify as mobile when hardwareConcurrency is 2 (low-end)', () => {
      cleanup = mockNavigator({ deviceMemory: 1, hardwareConcurrency: 2 });
      const profile = detectDevice();

      expect(profile.isMobile).toBe(true);
      expect(profile.deviceMemory).toBe(1);
      expect(profile.maxProcessingMemory).toBe(50 * 1024 * 1024);
    });

    it('should classify as mobile with deviceMemory = 0.25 (lowest Chrome value)', () => {
      cleanup = mockNavigator({ deviceMemory: 0.25, hardwareConcurrency: 2 });
      const profile = detectDevice();

      expect(profile.isMobile).toBe(true);
      expect(profile.deviceMemory).toBe(0.25);
    });
  });

  describe('desktop classification', () => {
    it('should classify as desktop when deviceMemory >= 4 and cores > 4', () => {
      cleanup = mockNavigator({ deviceMemory: 8, hardwareConcurrency: 8 });
      const profile = detectDevice();

      expect(profile.isMobile).toBe(false);
      expect(profile.sequential).toBe(false);
      expect(profile.maxProcessingMemory).toBe(500 * 1024 * 1024);
    });

    it('should classify as desktop with high core count', () => {
      cleanup = mockNavigator({ deviceMemory: 16, hardwareConcurrency: 16 });
      const profile = detectDevice();

      expect(profile.isMobile).toBe(false);
      expect(profile.deviceMemory).toBe(16);
      expect(profile.hardwareConcurrency).toBe(16);
    });

    it('should classify as desktop with deviceMemory = 4 and cores = 5 (boundary)', () => {
      cleanup = mockNavigator({ deviceMemory: 4, hardwareConcurrency: 5 });
      const profile = detectDevice();

      // deviceMemory = 4 is NOT < 4, and cores = 5 is NOT <= 4
      expect(profile.isMobile).toBe(false);
    });
  });

  describe('worker concurrency limits', () => {
    it('should cap maxConcurrentWorkers at 3 on desktop', () => {
      cleanup = mockNavigator({ deviceMemory: 16, hardwareConcurrency: 16 });
      const profile = detectDevice();

      expect(profile.maxConcurrentWorkers).toBe(3);
    });

    it('should set maxConcurrentWorkers = cores - 1 when cores <= 4 on desktop', () => {
      // Need deviceMemory >= 4 and cores > 4 for desktop
      cleanup = mockNavigator({ deviceMemory: 8, hardwareConcurrency: 5 });
      const profile = detectDevice();

      expect(profile.isMobile).toBe(false);
      expect(profile.maxConcurrentWorkers).toBe(3); // min(5-1, 3) = 3
    });

    it('should set maxConcurrentWorkers = 1 on mobile', () => {
      cleanup = mockNavigator({ deviceMemory: 2, hardwareConcurrency: 2 });
      const profile = detectDevice();

      expect(profile.maxConcurrentWorkers).toBe(1);
    });

    it('should ensure at least 1 worker on desktop even with 1 core', () => {
      // deviceMemory >= 4 forces desktop even with 1 core... but 1 core <= 4 => mobile
      // So let's test with deviceMemory >= 4, cores = 5 (minimum for desktop)
      cleanup = mockNavigator({ deviceMemory: 8, hardwareConcurrency: 5 });
      const profile = detectDevice();

      expect(profile.maxConcurrentWorkers).toBeGreaterThanOrEqual(1);
    });
  });

  describe('deviceMemory fallback heuristic', () => {
    it('should estimate 2 GB for 1-2 cores when deviceMemory unavailable', () => {
      cleanup = mockNavigator({ deviceMemory: undefined, hardwareConcurrency: 2 });
      const profile = detectDevice();

      expect(profile.deviceMemory).toBe(2);
      expect(profile.isMobile).toBe(true); // 2 < 4 and 2 <= 4
    });

    it('should estimate 4 GB for 3-4 cores when deviceMemory unavailable', () => {
      cleanup = mockNavigator({ deviceMemory: undefined, hardwareConcurrency: 4 });
      const profile = detectDevice();

      expect(profile.deviceMemory).toBe(4);
      // 4 is NOT < 4 for memory, but 4 <= 4 for cores => mobile
      expect(profile.isMobile).toBe(true);
    });

    it('should estimate 8 GB for 5-8 cores when deviceMemory unavailable', () => {
      cleanup = mockNavigator({ deviceMemory: undefined, hardwareConcurrency: 8 });
      const profile = detectDevice();

      expect(profile.deviceMemory).toBe(8);
      // 8 >= 4, and 8 > 4 => desktop
      expect(profile.isMobile).toBe(false);
    });

    it('should estimate 16 GB for 9+ cores when deviceMemory unavailable', () => {
      cleanup = mockNavigator({ deviceMemory: undefined, hardwareConcurrency: 12 });
      const profile = detectDevice();

      expect(profile.deviceMemory).toBe(16);
      expect(profile.isMobile).toBe(false);
    });
  });

  describe('return value structure', () => {
    it('should return all required DeviceProfile fields', () => {
      cleanup = mockNavigator({ deviceMemory: 8, hardwareConcurrency: 8 });
      const profile = detectDevice();

      expect(profile).toHaveProperty('deviceMemory');
      expect(profile).toHaveProperty('hardwareConcurrency');
      expect(profile).toHaveProperty('isMobile');
      expect(profile).toHaveProperty('maxProcessingMemory');
      expect(profile).toHaveProperty('maxConcurrentWorkers');
      expect(profile).toHaveProperty('sequential');
      expect(typeof profile.deviceMemory).toBe('number');
      expect(typeof profile.hardwareConcurrency).toBe('number');
      expect(typeof profile.isMobile).toBe('boolean');
      expect(typeof profile.maxProcessingMemory).toBe('number');
      expect(typeof profile.maxConcurrentWorkers).toBe('number');
      expect(typeof profile.sequential).toBe('boolean');
    });
  });
});

// ─── getArgon2Params ──────────────────────────────────────────────────────────

describe('getArgon2Params', () => {
  it('should return mobile parameters for mobile devices', () => {
    const mobileProfile: DeviceProfile = {
      deviceMemory: 2,
      hardwareConcurrency: 4,
      isMobile: true,
      maxProcessingMemory: 50 * 1024 * 1024,
      maxConcurrentWorkers: 1,
      sequential: true,
    };

    const params = getArgon2Params(mobileProfile);

    expect(params.memory).toBe(19 * 1024); // 19 MB in KB
    expect(params.iterations).toBe(4);
    expect(params.parallelism).toBe(1);
  });

  it('should return desktop parameters for desktop devices', () => {
    const desktopProfile: DeviceProfile = {
      deviceMemory: 8,
      hardwareConcurrency: 8,
      isMobile: false,
      maxProcessingMemory: 500 * 1024 * 1024,
      maxConcurrentWorkers: 3,
      sequential: false,
    };

    const params = getArgon2Params(desktopProfile);

    expect(params.memory).toBe(64 * 1024); // 64 MB in KB
    expect(params.iterations).toBe(3);
    expect(params.parallelism).toBe(4);
  });

  it('should use isMobile flag only (not memory/cores) for decision', () => {
    // High specs but flagged as mobile — should still get mobile params
    const highSpecMobile: DeviceProfile = {
      deviceMemory: 16,
      hardwareConcurrency: 16,
      isMobile: true,
      maxProcessingMemory: 50 * 1024 * 1024,
      maxConcurrentWorkers: 1,
      sequential: true,
    };

    const params = getArgon2Params(highSpecMobile);

    expect(params.memory).toBe(19 * 1024);
    expect(params.iterations).toBe(4);
    expect(params.parallelism).toBe(1);
  });

  it('should return all required Argon2Params fields', () => {
    const profile: DeviceProfile = {
      deviceMemory: 8,
      hardwareConcurrency: 8,
      isMobile: false,
      maxProcessingMemory: 500 * 1024 * 1024,
      maxConcurrentWorkers: 3,
      sequential: false,
    };

    const params = getArgon2Params(profile);

    expect(params).toHaveProperty('memory');
    expect(params).toHaveProperty('iterations');
    expect(params).toHaveProperty('parallelism');
    expect(typeof params.memory).toBe('number');
    expect(typeof params.iterations).toBe('number');
    expect(typeof params.parallelism).toBe('number');
    expect(params.memory).toBeGreaterThan(0);
    expect(params.iterations).toBeGreaterThan(0);
    expect(params.parallelism).toBeGreaterThan(0);
  });

  it('should give mobile lower memory cost than desktop', () => {
    const mobile: DeviceProfile = {
      deviceMemory: 2,
      hardwareConcurrency: 2,
      isMobile: true,
      maxProcessingMemory: 50 * 1024 * 1024,
      maxConcurrentWorkers: 1,
      sequential: true,
    };
    const desktop: DeviceProfile = {
      deviceMemory: 8,
      hardwareConcurrency: 8,
      isMobile: false,
      maxProcessingMemory: 500 * 1024 * 1024,
      maxConcurrentWorkers: 3,
      sequential: false,
    };

    const mobileParams = getArgon2Params(mobile);
    const desktopParams = getArgon2Params(desktop);

    expect(mobileParams.memory).toBeLessThan(desktopParams.memory);
    expect(mobileParams.parallelism).toBeLessThan(desktopParams.parallelism);
  });
});

// ─── MemoryGovernor ───────────────────────────────────────────────────────────

describe('MemoryGovernor', () => {
  const MAX_MEMORY = 100 * 1024 * 1024; // 100 MB

  describe('constructor', () => {
    it('should create with valid positive maxMemory', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      const stats = governor.getStats();

      expect(stats.maxMemory).toBe(MAX_MEMORY);
      expect(stats.currentUsage).toBe(0);
      expect(stats.usagePct).toBe(0);
    });

    it('should throw on zero maxMemory', () => {
      expect(() => new MemoryGovernor(0)).toThrow();
    });

    it('should throw on negative maxMemory', () => {
      expect(() => new MemoryGovernor(-1)).toThrow();
    });

    it('should throw on NaN maxMemory', () => {
      expect(() => new MemoryGovernor(NaN)).toThrow();
    });

    it('should throw on Infinity maxMemory', () => {
      expect(() => new MemoryGovernor(Infinity)).toThrow();
    });
  });

  describe('canAllocate', () => {
    it('should return true when allocation fits within limit', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);

      expect(governor.canAllocate(50 * 1024 * 1024)).toBe(true);
    });

    it('should return true for zero-byte allocation', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);

      expect(governor.canAllocate(0)).toBe(true);
    });

    it('should return true when allocation exactly equals remaining capacity', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);

      expect(governor.canAllocate(MAX_MEMORY)).toBe(true);
    });

    it('should return false when allocation exceeds limit', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);

      expect(governor.canAllocate(MAX_MEMORY + 1)).toBe(false);
    });

    it('should return false when allocation exceeds remaining capacity', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(60 * 1024 * 1024);

      // 60 MB used + 50 MB requested = 110 MB > 100 MB
      expect(governor.canAllocate(50 * 1024 * 1024)).toBe(false);
    });

    it('should return true after partial release makes room', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(80 * 1024 * 1024);

      // 80 MB used, want 30 MB => 110 MB > 100 MB
      expect(governor.canAllocate(30 * 1024 * 1024)).toBe(false);

      governor.recordRelease(50 * 1024 * 1024);

      // 30 MB used, want 30 MB => 60 MB <= 100 MB
      expect(governor.canAllocate(30 * 1024 * 1024)).toBe(true);
    });

    it('should return false for negative byte values', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);

      expect(governor.canAllocate(-1)).toBe(false);
    });
  });

  describe('recordAllocation', () => {
    it('should increase current usage', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(10 * 1024 * 1024);

      expect(governor.getStats().currentUsage).toBe(10 * 1024 * 1024);
    });

    it('should accumulate multiple allocations', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(10 * 1024 * 1024);
      governor.recordAllocation(20 * 1024 * 1024);
      governor.recordAllocation(30 * 1024 * 1024);

      expect(governor.getStats().currentUsage).toBe(60 * 1024 * 1024);
    });

    it('should ignore negative allocations', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(10 * 1024 * 1024);
      governor.recordAllocation(-5 * 1024 * 1024);

      // Negative should be ignored, usage stays at 10 MB
      expect(governor.getStats().currentUsage).toBe(10 * 1024 * 1024);
    });

    it('should allow allocation beyond limit (no enforcement in record)', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      // recordAllocation doesn't enforce — that's canAllocate's job
      governor.recordAllocation(MAX_MEMORY + 1000);

      expect(governor.getStats().currentUsage).toBe(MAX_MEMORY + 1000);
    });
  });

  describe('recordRelease', () => {
    it('should decrease current usage', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(50 * 1024 * 1024);
      governor.recordRelease(20 * 1024 * 1024);

      expect(governor.getStats().currentUsage).toBe(30 * 1024 * 1024);
    });

    it('should clamp to zero when releasing more than currently tracked', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(10 * 1024 * 1024);
      governor.recordRelease(50 * 1024 * 1024); // Release more than allocated

      expect(governor.getStats().currentUsage).toBe(0);
    });

    it('should ignore negative release values', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(10 * 1024 * 1024);
      governor.recordRelease(-5 * 1024 * 1024);

      expect(governor.getStats().currentUsage).toBe(10 * 1024 * 1024);
    });

    it('should handle release from zero usage gracefully', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordRelease(10 * 1024 * 1024);

      expect(governor.getStats().currentUsage).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct usage percentage', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(50 * 1024 * 1024); // 50% of 100 MB

      const stats = governor.getStats();

      expect(stats.currentUsage).toBe(50 * 1024 * 1024);
      expect(stats.maxMemory).toBe(MAX_MEMORY);
      expect(stats.usagePct).toBeCloseTo(0.5, 5);
    });

    it('should return 0% usage when empty', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      const stats = governor.getStats();

      expect(stats.usagePct).toBe(0);
    });

    it('should return 100% usage when at capacity', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(MAX_MEMORY);

      const stats = governor.getStats();

      expect(stats.usagePct).toBeCloseTo(1.0, 5);
    });
  });

  describe('isUnderPressure', () => {
    it('should return false at 0% usage', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);

      expect(governor.isUnderPressure()).toBe(false);
    });

    it('should return false at 50% usage', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(MAX_MEMORY * 0.5);

      expect(governor.isUnderPressure()).toBe(false);
    });

    it('should return false at exactly 80% usage (boundary)', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(MAX_MEMORY * 0.8);

      // 80% is NOT > 80%, so not under pressure
      expect(governor.isUnderPressure()).toBe(false);
    });

    it('should return true at 81% usage', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(MAX_MEMORY * 0.81);

      expect(governor.isUnderPressure()).toBe(true);
    });

    it('should return true at 100% usage', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(MAX_MEMORY);

      expect(governor.isUnderPressure()).toBe(true);
    });

    it('should transition between pressure states correctly', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);

      governor.recordAllocation(MAX_MEMORY * 0.9); // 90%
      expect(governor.isUnderPressure()).toBe(true);

      governor.recordRelease(MAX_MEMORY * 0.5); // 40%
      expect(governor.isUnderPressure()).toBe(false);

      governor.recordAllocation(MAX_MEMORY * 0.5); // 90%
      expect(governor.isUnderPressure()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should set currentUsage to 0', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(80 * 1024 * 1024);

      expect(governor.getStats().currentUsage).toBe(80 * 1024 * 1024);

      governor.reset();

      expect(governor.getStats().currentUsage).toBe(0);
      expect(governor.isUnderPressure()).toBe(false);
    });

    it('should preserve maxMemory after reset', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(80 * 1024 * 1024);
      governor.reset();

      expect(governor.getStats().maxMemory).toBe(MAX_MEMORY);
    });

    it('should allow new allocations after reset', () => {
      const governor = new MemoryGovernor(MAX_MEMORY);
      governor.recordAllocation(MAX_MEMORY); // At capacity
      expect(governor.canAllocate(1)).toBe(false);

      governor.reset();

      expect(governor.canAllocate(MAX_MEMORY)).toBe(true);
    });
  });

  describe('integration: full lifecycle', () => {
    it('should handle a complete allocation-check-release cycle', () => {
      const governor = new MemoryGovernor(50 * 1024 * 1024); // 50 MB

      const fileSize = 20 * 1024 * 1024; // 20 MB

      // First file
      expect(governor.canAllocate(fileSize)).toBe(true);
      governor.recordAllocation(fileSize);
      expect(governor.getStats().usagePct).toBeCloseTo(0.4, 5);

      // Second file
      expect(governor.canAllocate(fileSize)).toBe(true);
      governor.recordAllocation(fileSize);
      expect(governor.getStats().usagePct).toBeCloseTo(0.8, 5);
      expect(governor.isUnderPressure()).toBe(false); // exactly 80% => not > 80%

      // Third file would exceed
      expect(governor.canAllocate(fileSize)).toBe(false);

      // Release first file
      governor.recordRelease(fileSize);
      expect(governor.getStats().usagePct).toBeCloseTo(0.4, 5);

      // Now third file fits
      expect(governor.canAllocate(fileSize)).toBe(true);

      // Reset everything
      governor.reset();
      expect(governor.getStats().currentUsage).toBe(0);
    });
  });
});
