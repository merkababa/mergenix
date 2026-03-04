import { vi } from 'vitest';

/**
 * Simple: just captures entries; observe/unobserve/disconnect are no-ops.
 * Use in most marketing page tests that render ScrollReveal components.
 */
export function installSimpleIntersectionObserver() {
  const mockIntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);
  return mockIntersectionObserver;
}

/**
 * Stateful: captures the callback so tests can manually fire intersection events.
 * Use when a test needs to trigger the IntersectionObserver callback explicitly.
 *
 * @example
 * const { triggerIntersection } = installStatefulIntersectionObserver();
 * render(<MyComponent />);
 * triggerIntersection([{ isIntersecting: true, target: element }]);
 */
export function installStatefulIntersectionObserver() {
  let observerCallback: IntersectionObserverCallback | null = null;
  const mockObserve = vi.fn();
  const mockUnobserve = vi.fn();
  const mockDisconnect = vi.fn();

  const mockIntersectionObserver = vi.fn().mockImplementation((callback: IntersectionObserverCallback) => {
    observerCallback = callback;
    return { observe: mockObserve, unobserve: mockUnobserve, disconnect: mockDisconnect };
  });
  vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);

  return {
    mockIntersectionObserver,
    triggerIntersection: (entries: Partial<IntersectionObserverEntry>[]) => {
      observerCallback?.(entries as IntersectionObserverEntry[], {} as IntersectionObserver);
    },
    mockObserve,
    mockUnobserve,
    mockDisconnect,
  };
}

/**
 * Immediate: auto-fires the callback with isIntersecting=true when observe() is called.
 * Use for hooks/components that need to "enter the viewport" immediately in tests
 * (e.g., useCountUp, scroll-triggered animations).
 */
export function installImmediateIntersectionObserver() {
  const mockIntersectionObserver = vi.fn().mockImplementation((callback: IntersectionObserverCallback) => ({
    observe: vi.fn().mockImplementation((element: Element) => {
      callback(
        [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    }),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);
  return mockIntersectionObserver;
}
