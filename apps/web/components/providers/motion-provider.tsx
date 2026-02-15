"use client";

import { MotionConfig } from "framer-motion";

/**
 * Wraps children in Framer Motion's MotionConfig with reducedMotion="user",
 * so ALL nested Framer Motion animations automatically respect the user's
 * `prefers-reduced-motion` OS/browser setting.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
