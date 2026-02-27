"use client";

import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";

/**
 * Wraps children in Framer Motion's LazyMotion with domAnimation features
 * and MotionConfig with reducedMotion="user", so:
 * - Only the domAnimation feature bundle (~25KB) is loaded instead of the full
 *   framer-motion bundle (~120KB), reducing initial page weight.
 * - ALL nested Framer Motion animations automatically respect the user's
 *   `prefers-reduced-motion` OS/browser setting.
 *
 * NOTE: For optimal tree-shaking, child components can use `m` (from
 * framer-motion) instead of `motion`. Components using `motion.*` still
 * work and benefit from lazy-loaded features, but `m.*` allows additional
 * bundle size savings.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
