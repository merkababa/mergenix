'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Hook that animates a number from 0 to `target` with an ease-out
 * cubic curve. Animation starts when the attached `ref` element
 * scrolls into view (IntersectionObserver, threshold 0.3).
 *
 * Compatible with React StrictMode (handles double-mount cleanup).
 *
 * @param target  - final number to count up to
 * @param duration - animation duration in ms (default 2000)
 */
export function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startTime: number | null = null;

    const step = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(Math.max(elapsed / duration, 0), 1);
      // Ease-out cubic for a satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        rafIdRef.current = null;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          rafIdRef.current = requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // Reset count so animation restarts cleanly on re-mount (StrictMode)
      setCount(0);
    };
  }, [target, duration]);

  return { count, ref };
}
