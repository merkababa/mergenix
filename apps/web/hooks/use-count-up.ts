"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook that animates a number from 0 to `target` with an ease-out
 * cubic curve. Animation starts when the attached `ref` element
 * scrolls into view (IntersectionObserver, threshold 0.3).
 *
 * IMPORTANT: properly cancels the requestAnimationFrame loop on
 * unmount to prevent state updates on unmounted components.
 *
 * @param target  - final number to count up to
 * @param duration - animation duration in ms (default 2000)
 */
export function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const rafIdRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (hasAnimated) return;
    setHasAnimated(true);

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for a satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = requestAnimationFrame(step);
  }, [hasAnimated, target, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          start();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      // Cancel any in-flight rAF to prevent updates after unmount
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [start]);

  return { count, ref };
}
