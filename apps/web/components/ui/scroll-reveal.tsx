"use client";

import { useMemo } from "react";
import { m, type Variants } from "framer-motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
}

const directionOffsets: Record<
  NonNullable<ScrollRevealProps["direction"]>,
  { x: number; y: number }
> = {
  up: { x: 0, y: 30 },
  down: { x: 0, y: -30 },
  left: { x: 30, y: 0 },
  right: { x: -30, y: 0 },
};

/**
 * Framer Motion wrapper for scroll-triggered reveal animations.
 * Wraps children in a `m.div` that fades in and slides from
 * the specified direction when the element enters the viewport.
 */
export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.5,
  className,
  once = true,
}: ScrollRevealProps) {
  const offset = directionOffsets[direction];

  const variants: Variants = useMemo(
    () => ({
      hidden: {
        opacity: 0,
        x: offset.x,
        y: offset.y,
      },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
      },
    }),
    [direction],
  );

  return (
    <m.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-50px" }}
      variants={variants}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </m.div>
  );
}
