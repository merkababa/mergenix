import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HighContrastToggle } from "../../../components/a11y/high-contrast-toggle";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("HighContrastToggle", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    document.documentElement.removeAttribute("data-contrast");
  });

  it("renders a toggle button", () => {
    render(<HighContrastToggle />);

    const button = screen.getByRole("button", { name: /high contrast/i });
    expect(button).toBeInTheDocument();
  });

  it("has aria-pressed=false by default", () => {
    render(<HighContrastToggle />);

    const button = screen.getByRole("button", { name: /high contrast/i });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles aria-pressed on click", async () => {
    render(<HighContrastToggle />);

    const button = screen.getByRole("button", { name: /high contrast/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute("aria-pressed", "true");
    });

    fireEvent.click(button);
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("sets data-contrast attribute on document element when enabled", async () => {
    render(<HighContrastToggle />);

    const button = screen.getByRole("button", { name: /high contrast/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-contrast")).toBe("high");
    });
  });

  it("removes data-contrast attribute when disabled", async () => {
    render(<HighContrastToggle />);

    const button = screen.getByRole("button", { name: /high contrast/i });
    fireEvent.click(button); // enable
    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-contrast")).toBe("high");
    });

    fireEvent.click(button); // disable
    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-contrast")).toBeNull();
    });
  });

  it("persists preference to localStorage", async () => {
    render(<HighContrastToggle />);

    const button = screen.getByRole("button", { name: /high contrast/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "mergenix-high-contrast",
        "true",
      );
    });
  });

  it("restores preference from localStorage on mount", async () => {
    localStorageMock.getItem.mockReturnValueOnce("true");

    render(<HighContrastToggle />);

    const button = screen.getByRole("button", { name: /high contrast/i });
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(document.documentElement.getAttribute("data-contrast")).toBe("high");
    });
  });

  it("accepts custom className", () => {
    render(<HighContrastToggle className="my-custom-class" />);

    const button = screen.getByRole("button", { name: /high contrast/i });
    expect(button.className).toContain("my-custom-class");
  });

  // ─── Gap 3: localStorage persistence details ──────────────────────────

  describe("localStorage persistence", () => {
    it("calls localStorage.setItem with 'false' on initial render (default state)", async () => {
      render(<HighContrastToggle />);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "mergenix-high-contrast",
          "false",
        );
      });
    });

    it("calls localStorage.setItem with 'true' when toggled on, then 'false' when toggled off", async () => {
      render(<HighContrastToggle />);

      const button = screen.getByRole("button", { name: /high contrast/i });

      fireEvent.click(button); // toggle on
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "mergenix-high-contrast",
          "true",
        );
      });

      fireEvent.click(button); // toggle off
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "mergenix-high-contrast",
          "false",
        );
      });
    });

    it("calls localStorage.getItem with the correct key on mount", () => {
      render(<HighContrastToggle />);

      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        "mergenix-high-contrast",
      );
    });

    it("does NOT set enabled state when localStorage returns null", async () => {
      localStorageMock.getItem.mockReturnValueOnce(null as unknown as string);

      render(<HighContrastToggle />);

      const button = screen.getByRole("button", { name: /high contrast/i });
      await waitFor(() => {
        expect(button).toHaveAttribute("aria-pressed", "false");
      });
    });

    it("does NOT set enabled state when localStorage returns 'false'", async () => {
      localStorageMock.getItem.mockReturnValueOnce("false");

      render(<HighContrastToggle />);

      const button = screen.getByRole("button", { name: /high contrast/i });
      await waitFor(() => {
        expect(button).toHaveAttribute("aria-pressed", "false");
      });
    });

    it("aria-pressed toggles correctly through multiple cycles", async () => {
      render(<HighContrastToggle />);

      const button = screen.getByRole("button", { name: /high contrast/i });

      // Cycle 1: off → on → off
      expect(button).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(button);
      await waitFor(() => {
        expect(button).toHaveAttribute("aria-pressed", "true");
      });

      fireEvent.click(button);
      await waitFor(() => {
        expect(button).toHaveAttribute("aria-pressed", "false");
      });

      // Cycle 2: off → on
      fireEvent.click(button);
      await waitFor(() => {
        expect(button).toHaveAttribute("aria-pressed", "true");
      });
    });
  });
});
