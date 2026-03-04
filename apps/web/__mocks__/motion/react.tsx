import React from 'react';
import { vi } from 'vitest';

/**
 * Shared motion/react mock for all test files.
 * Vitest auto-resolves __mocks__/ folders adjacent to node_modules.
 * Provides a minimal implementation of motion components and hooks used in tests.
 */

// Motion element factory — accepts any motion tag and returns a stripped-down version
const createMotionElement = (tag: React.ElementType) => {
  return React.forwardRef<
    HTMLElement,
    { children?: React.ReactNode; [key: string]: unknown }
  >(({ children, ...props }, ref) => {
    // Strip motion props, keep only HTML attributes
    const {
      variants,
      initial,
      whileInView,
      viewport,
      animate,
      exit,
      transition,
      whileHover,
      whileTap,
      layoutId,
      style,
      ...htmlProps
    } = props;
    // Void the props to prevent unused variable warnings
    void variants;
    void initial;
    void whileInView;
    void viewport;
    void animate;
    void exit;
    void transition;
    void whileHover;
    void whileTap;
    void layoutId;
    void style;
    // React.createElement is used instead of JSX here because the `tag` is a
    // dynamically chosen React.ElementType (div, section, path, etc.). JSX
    // cannot resolve per-element prop types for a runtime-determined tag, so
    // TypeScript would infer `children` as `unknown` via the index signature.
    // createElement accepts (type, props, ...children) without JSX's strict
    // per-element type narrowing, keeping the ref and children types correct.
    return React.createElement(tag, { ref, ...(htmlProps as Record<string, unknown>) }, children as React.ReactNode);
  });
};

export const motion = {
  div: createMotionElement('div'),
  section: createMotionElement('section'),
  span: createMotionElement('span'),
  p: createMotionElement('p'),
  h1: createMotionElement('h1'),
  h2: createMotionElement('h2'),
  h3: createMotionElement('h3'),
  h4: createMotionElement('h4'),
  h5: createMotionElement('h5'),
  h6: createMotionElement('h6'),
  button: createMotionElement('button'),
  article: createMotionElement('article'),
  nav: createMotionElement('nav'),
  header: createMotionElement('header'),
  footer: createMotionElement('footer'),
  path: createMotionElement('path'),
  g: createMotionElement('g'),
  ul: createMotionElement('ul'),
  li: createMotionElement('li'),
} as const;

// Short alias 'm' for backward compatibility with existing mocks
export const m = motion;

// AnimatePresence — render children without animation
export const AnimatePresence = ({ children }: { children?: React.ReactNode }) => (
  <>{children}</>
);

// LazyMotion — render children without animation
export const LazyMotion = ({ children }: { children?: React.ReactNode }) => (
  <>{children}</>
);

// MotionConfig — pass through children without configuration
export const MotionConfig = ({ children }: { children?: React.ReactNode }) => (
  <>{children}</>
);

// domAnimation — empty object (used by LazyMotion)
export const domAnimation = {};

// MotionValue-like object that implements the required interface
const createMotionValue = (initial: unknown = 0) => {
  let val = initial;
  return {
    get: () => val,
    set: (v: unknown) => { val = v; },
    on: vi.fn((_type: string, _callback: (v: unknown) => void) => {
      // Return unsubscribe function
      return () => {};
    }),
    current: val,
  };
};

// Motion hooks — return MotionValue-like objects suitable for tests
export const useTransform = () => createMotionValue(0);
export const useMotionValue = (initial: unknown = 0) => createMotionValue(initial);
export const useScroll = () => ({
  scrollYProgress: createMotionValue(0),
  scrollY: createMotionValue(0),
  scrollX: createMotionValue(0),
});
export const useInView = (_ref?: React.RefObject<Element | null>, _options?: Record<string, unknown>): boolean => false;
export const useAnimation = () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() });
export const useSpring = (value: unknown) => createMotionValue(value);
export const useReducedMotion = () => false;
