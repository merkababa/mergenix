import { vi } from 'vitest';

/**
 * Creates a simple MotionValue-like object for use in Framer Motion mocks.
 * Supports get/set/onChange/on like a real MotionValue.
 */
export function mockMotionValue(initial: number) {
  let current = initial;
  return {
    get: () => current,
    set: (v: number) => { current = v; },
    get current() { return current; },
    onChange: vi.fn(),
    on: vi.fn(),
  };
}

/**
 * Returns a mock result matching the ScrollProgressResult interface from scroll-reveal.
 * Use when mocking useScrollProgress() in scroll-timeline / bento-features tests.
 *
 * @example
 * vi.mock('@/components/ui/scroll-reveal', () => ({
 *   ScrollReveal: ...,
 *   useScrollProgress: () => mockScrollProgressResult(),
 * }));
 */
export function mockScrollProgressResult() {
  return {
    scrollYProgress: mockMotionValue(0),
    opacity: mockMotionValue(1),
    y: mockMotionValue(0),
  };
}
