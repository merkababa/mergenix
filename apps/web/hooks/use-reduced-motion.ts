"use client";

import { useState, useEffect } from "react";

/**
 * Returns `true` if the user prefers reduced motion via their OS/browser setting.
 *
 * Uses `window.matchMedia('(prefers-reduced-motion: reduce)')` with a change
 * listener so the value updates in real-time if the user toggles the setting.
 *
 * SSR-safe: returns `false` on the server (animations enabled by default).
 *
 * Note: Motion ships its own `useReducedMotion()` hook, and this
 * project's `MotionProvider` already sets `reducedMotion="user"` on
 * `<MotionConfig>`, which means Motion animations automatically respect
 * the preference. This hook is for non-Motion animations (CSS class
 * toggles, conditional rendering, etc.).
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReduced;
}
