import { useEffect, useRef, type RefObject } from "react";

/**
 * Custom hook that traps keyboard focus within a container element.
 *
 * When active, Tab/Shift+Tab cycling wraps around the focusable elements
 * inside the container. Useful for modals and dialogs that require
 * keyboard accessibility compliance.
 *
 * **Focus restoration:** When the trap activates, the currently focused
 * element is saved. When the trap deactivates, focus is restored to
 * that element (unless it was removed from the DOM).
 *
 * @param containerRef - Ref to the container element
 * @param isActive - Whether the focus trap is currently active
 * @param allowEscape - Whether pressing Escape is allowed (default: true).
 *   When false, the Escape key is blocked entirely.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  allowEscape: boolean = true,
) {
  // Store the element that had focus before the trap was activated
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Save the currently focused element for restoration
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !allowEscape) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      // Restore focus to the previously focused element
      const previous = previousFocusRef.current;
      if (previous && typeof previous.focus === "function" && document.contains(previous)) {
        previous.focus();
      }
      previousFocusRef.current = null;
    };
  }, [containerRef, isActive, allowEscape]);
}
