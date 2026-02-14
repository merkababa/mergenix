import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReducedMotion } from "../../hooks/use-reduced-motion";

describe("useReducedMotion", () => {
  let originalMatchMedia: typeof window.matchMedia;
  let changeListeners: Array<(event: MediaQueryListEvent) => void>;

  function createMockMatchMedia(matches: boolean) {
    changeListeners = [];

    return vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === "change") {
          changeListeners.push(listener);
        }
      }),
      removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === "change") {
          changeListeners = changeListeners.filter((l) => l !== listener);
        }
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("returns false when prefers-reduced-motion is not set", () => {
    window.matchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when prefers-reduced-motion: reduce is active", () => {
    window.matchMedia = createMockMatchMedia(true);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("updates when the media query changes", () => {
    window.matchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    // Simulate the user enabling reduced motion
    act(() => {
      changeListeners.forEach((listener) =>
        listener({ matches: true } as MediaQueryListEvent),
      );
    });

    expect(result.current).toBe(true);
  });

  it("updates back to false when reduced motion is disabled", () => {
    window.matchMedia = createMockMatchMedia(true);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);

    // Simulate the user disabling reduced motion
    act(() => {
      changeListeners.forEach((listener) =>
        listener({ matches: false } as MediaQueryListEvent),
      );
    });

    expect(result.current).toBe(false);
  });

  it("cleans up the event listener on unmount", () => {
    const mockMediaQuery = createMockMatchMedia(false);
    window.matchMedia = mockMediaQuery;

    const { unmount } = renderHook(() => useReducedMotion());
    const mediaQueryResult = mockMediaQuery.mock.results[0].value;

    unmount();

    expect(mediaQueryResult.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("calls matchMedia with the correct query string", () => {
    const mockMediaQuery = createMockMatchMedia(false);
    window.matchMedia = mockMediaQuery;

    renderHook(() => useReducedMotion());

    expect(mockMediaQuery).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });
});
