import '@testing-library/jest-dom/vitest';

// Mock Web Worker globally
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(_data: unknown): void {
    // Tests can override this via vi.spyOn
  }

  terminate(): void {
    // No-op
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean { return false; }
}

// @ts-expect-error -- mock Worker
globalThis.Worker = MockWorker;

// Mock URL constructor for worker bundling
globalThis.URL = class extends URL {
  constructor(url: string | URL, base?: string | URL) {
    super(typeof url === 'string' ? url : url.toString(), base || 'http://localhost');
  }
} as typeof URL;
