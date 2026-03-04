"use client";

import { useCallback, useMemo, useState } from "react";
import {
  m,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
  type Variants,
} from "motion/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScrollRevealType = "fade" | "blur" | "clip" | "scale" | "rotate";

export interface ScrollRevealProps {
  children: React.ReactNode;
  /** Animation variant. Defaults to "fade" (backward-compatible). */
  type?: ScrollRevealType;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
}

export interface ScrollProgressResult {
  /** Raw 0→1 scroll progress for the target element */
  scrollYProgress: MotionValue<number>;
  /** Derived opacity: 0 at scroll start, 1 at 30% scroll, stays 1 */
  opacity: MotionValue<number>;
  /** Derived y offset: 40px at scroll start, 0px at 30% scroll */
  y: MotionValue<number>;
}

// ---------------------------------------------------------------------------
// Constants (hoisted outside component bodies — checklist §3)
// ---------------------------------------------------------------------------

type Direction = NonNullable<ScrollRevealProps["direction"]>;

/** Translation offsets for slide-based animations. */
const DIRECTION_OFFSETS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 30 },
  down: { x: 0, y: -30 },
  left: { x: 30, y: 0 },
  right: { x: -30, y: 0 },
};

/** clip-path hidden states per direction. */
const CLIP_HIDDEN: Record<Direction, string> = {
  up: "inset(100% 0% 0% 0%)",
  down: "inset(0% 0% 100% 0%)",
  left: "inset(0% 100% 0% 0%)",
  right: "inset(0% 0% 0% 100%)",
};

const CLIP_VISIBLE = "inset(0% 0% 0% 0%)";

/** Rotation direction: left/right entries rotate on the Z axis; up/down keep 0. */
const ROTATE_HIDDEN: Record<Direction, number> = {
  up: -3,
  down: 3,
  left: -3,
  right: 3,
};

// ---------------------------------------------------------------------------
// Variant builders (pure functions — no closures over component state)
// ---------------------------------------------------------------------------

function buildFadeVariants(offset: { x: number; y: number }): Variants {
  return {
    hidden: { opacity: 0, x: offset.x, y: offset.y },
    visible: { opacity: 1, x: 0, y: 0 },
  };
}

function buildBlurVariants(offset: { x: number; y: number }): Variants {
  return {
    hidden: { opacity: 0, filter: "blur(10px)", x: offset.x, y: offset.y },
    visible: { opacity: 1, filter: "blur(0px)", x: 0, y: 0 },
  };
}

function buildClipVariants(direction: Direction): Variants {
  return {
    hidden: { opacity: 0, clipPath: CLIP_HIDDEN[direction] },
    visible: { opacity: 1, clipPath: CLIP_VISIBLE },
  };
}

function buildScaleVariants(offset: { x: number; y: number }): Variants {
  return {
    hidden: { opacity: 0, scale: 0.9, x: offset.x, y: offset.y },
    visible: { opacity: 1, scale: 1, x: 0, y: 0 },
  };
}

function buildRotateVariants(
  offset: { x: number; y: number },
  direction: Direction,
): Variants {
  return {
    hidden: {
      opacity: 0,
      rotate: ROTATE_HIDDEN[direction],
      x: offset.x,
      y: offset.y,
    },
    visible: { opacity: 1, rotate: 0, x: 0, y: 0 },
  };
}

/** Reduced-motion fallback: simple opacity toggle, no movement. */
const REDUCED_MOTION_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// ---------------------------------------------------------------------------
// ScrollReveal component
// ---------------------------------------------------------------------------

/**
 * Motion wrapper for scroll-triggered reveal animations.
 *
 * Supports five animation types: "fade" (default), "blur", "clip", "scale", "rotate".
 * All types respect `prefers-reduced-motion` — reduced to a simple opacity fade.
 * `will-change` is applied only during animation and removed on completion.
 *
 * Existing usage (without `type` prop) is 100% backward-compatible.
 */
export function ScrollReveal({
  children,
  type = "fade",
  direction = "up",
  delay = 0,
  duration = 0.5,
  className,
  once = true,
}: ScrollRevealProps) {
  const prefersReduced = useReducedMotion();
  const [animating, setAnimating] = useState(true);

  const offset = DIRECTION_OFFSETS[direction];

  const variants: Variants = useMemo(() => {
    if (prefersReduced) return REDUCED_MOTION_VARIANTS;
    switch (type) {
      case "blur":
        return buildBlurVariants(offset);
      case "clip":
        return buildClipVariants(direction);
      case "scale":
        return buildScaleVariants(offset);
      case "rotate":
        return buildRotateVariants(offset, direction);
      case "fade":
      default:
        return buildFadeVariants(offset);
    }
    // `offset` is derived from `direction` (via DIRECTION_OFFSETS) and never
    // changes independently — including it would cause spurious re-computations.
  }, [type, direction, prefersReduced]);

  const handleAnimationComplete = useCallback(() => {
    setAnimating(false);
  }, []);

  // When once=false, re-entering the viewport starts a new animation cycle —
  // restore will-change so the GPU layer is re-promoted for the incoming animation.
  const handleViewportEnter = useCallback(() => {
    if (!once) {
      setAnimating(true);
    }
  }, [once]);

  return (
    <m.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-50px" }}
      variants={variants}
      transition={{
        duration: prefersReduced ? 0.15 : duration,
        delay: prefersReduced ? 0 : delay,
        ease: "easeOut" as const,
      }}
      style={animating ? { willChange: "transform, opacity" } : undefined}
      onAnimationComplete={handleAnimationComplete}
      onViewportEnter={handleViewportEnter}
      className={className}
    >
      {children}
    </m.div>
  );
}

// ---------------------------------------------------------------------------
// useScrollProgress hook
// ---------------------------------------------------------------------------

/**
 * Hook that tracks an element's scroll progress through the viewport and
 * derives smooth opacity and y-offset values from it.
 *
 * Intended for use by parallax sections, timeline reveals, and similar
 * scroll-driven UI.
 *
 * @example
 * ```tsx
 * // Create a typed ref directly with useRef:
 * const ref = useRef<HTMLDivElement>(null);
 * const { scrollYProgress, opacity, y } = useScrollProgress(ref);
 *
 * return (
 *   <m.div ref={ref} style={{ opacity, y }}>
 *     ...
 *   </m.div>
 * );
 * ```
 */
export function useScrollProgress(
  ref: React.RefObject<HTMLElement | null>,
): ScrollProgressResult {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Fade in as element enters viewport (0% → 30% scroll progress)
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  // Slide up as element enters viewport
  const y = useTransform(scrollYProgress, [0, 0.3], [40, 0]);

  return { scrollYProgress, opacity, y };
}
