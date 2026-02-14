import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useFocusTrap } from "../../hooks/use-focus-trap";

// ── Helpers ──────────────────────────────────────────────────────────────

/** Create a container div with focusable buttons and attach it to the DOM. */
function createTestContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = `
    <button id="btn-first">First</button>
    <button id="btn-second">Second</button>
    <button id="btn-last">Last</button>
  `;
  document.body.appendChild(container);
  return container;
}

function getButton(id: string): HTMLElement {
  return document.getElementById(id)!;
}

/** Dispatch a keydown event on the document. */
function pressKey(key: string, shiftKey = false) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("useFocusTrap", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createTestContainer();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ── Tab wrapping ────────────────────────────────────────────────────

  it("wraps focus from last to first focusable element on Tab", () => {
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref, true);
      return ref;
    });

    // Focus the last button
    const lastBtn = getButton("btn-last");
    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    // Press Tab (no shift) while last element is focused — should wrap to first
    act(() => {
      pressKey("Tab", false);
    });

    expect(document.activeElement).toBe(getButton("btn-first"));

    unmount();
  });

  // ── Shift+Tab wrapping ──────────────────────────────────────────────

  it("wraps focus from first to last focusable element on Shift+Tab", () => {
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref, true);
      return ref;
    });

    // Focus the first button
    const firstBtn = getButton("btn-first");
    firstBtn.focus();
    expect(document.activeElement).toBe(firstBtn);

    // Press Shift+Tab while first element is focused — should wrap to last
    act(() => {
      pressKey("Tab", true);
    });

    expect(document.activeElement).toBe(getButton("btn-last"));

    unmount();
  });

  // ── Escape key blocked when allowEscape=false ───────────────────────

  it("blocks Escape key when allowEscape is false", () => {
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref, true, false);
      return ref;
    });

    const preventDefaultSpy = vi.fn();
    const stopPropagationSpy = vi.fn();

    // Manually create and dispatch a KeyboardEvent, spy on preventDefault/stopPropagation
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "preventDefault", { value: preventDefaultSpy });
    Object.defineProperty(event, "stopPropagation", { value: stopPropagationSpy });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();

    unmount();
  });

  // ── Escape key allowed when allowEscape=true ────────────────────────

  it("allows Escape key when allowEscape is true (default)", () => {
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref, true, true);
      return ref;
    });

    const preventDefaultSpy = vi.fn();
    const stopPropagationSpy = vi.fn();

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "preventDefault", { value: preventDefaultSpy });
    Object.defineProperty(event, "stopPropagation", { value: stopPropagationSpy });

    act(() => {
      document.dispatchEvent(event);
    });

    // Neither preventDefault nor stopPropagation should be called for Escape
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(stopPropagationSpy).not.toHaveBeenCalled();

    unmount();
  });

  // ── Focus restoration on deactivation ───────────────────────────────

  it("restores focus to previously focused element on deactivation", () => {
    // Create an external button that was focused before the trap activated
    const externalButton = document.createElement("button");
    externalButton.id = "btn-external";
    externalButton.textContent = "External";
    document.body.appendChild(externalButton);
    externalButton.focus();
    expect(document.activeElement).toBe(externalButton);

    // Activate the focus trap
    const { rerender, unmount } = renderHook(
      ({ isActive }: { isActive: boolean }) => {
        const ref = useRef<HTMLDivElement>(container);
        useFocusTrap(ref, isActive);
        return ref;
      },
      { initialProps: { isActive: true } },
    );

    // Now deactivate the trap by re-rendering with isActive=false
    // The cleanup function runs, which should restore focus to externalButton
    rerender({ isActive: false });

    expect(document.activeElement).toBe(externalButton);

    unmount();
    document.body.removeChild(externalButton);
  });

  // ── Does not trap when inactive ─────────────────────────────────────

  it("does not trap focus when isActive is false", () => {
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref, false);
      return ref;
    });

    // Focus the last button
    const lastBtn = getButton("btn-last");
    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    // Press Tab — focus should NOT be trapped (no wrapping)
    // Since the hook is inactive, the handler was never registered,
    // so the browser's default behavior applies (nothing happens in jsdom).
    act(() => {
      pressKey("Tab", false);
    });

    // activeElement should still be lastBtn (jsdom doesn't move focus on Tab naturally)
    expect(document.activeElement).toBe(lastBtn);

    unmount();
  });
});
