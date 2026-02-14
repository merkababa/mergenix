import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ErrorAnnouncer } from "../../../components/a11y/error-announcer";
import { useAnnouncerStore } from "../../../lib/stores/announcer-store";

describe("ErrorAnnouncer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAnnouncerStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Rendering ──────────────────────────────────────────────────────────

  it("renders two aria-live regions", () => {
    render(<ErrorAnnouncer />);

    const assertiveRegion = screen.getByTestId("announcer-assertive");
    const politeRegion = screen.getByTestId("announcer-polite");

    expect(assertiveRegion).toBeInTheDocument();
    expect(politeRegion).toBeInTheDocument();
  });

  it("assertive region has correct aria attributes", () => {
    render(<ErrorAnnouncer />);

    const region = screen.getByTestId("announcer-assertive");
    expect(region).toHaveAttribute("role", "alert");
    expect(region).toHaveAttribute("aria-live", "assertive");
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("polite region has correct aria attributes", () => {
    render(<ErrorAnnouncer />);

    const region = screen.getByTestId("announcer-polite");
    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("both regions are visually hidden", () => {
    render(<ErrorAnnouncer />);

    const assertiveRegion = screen.getByTestId("announcer-assertive");
    const politeRegion = screen.getByTestId("announcer-polite");

    // Check visually hidden styles
    expect(assertiveRegion.style.position).toBe("absolute");
    expect(assertiveRegion.style.width).toBe("1px");
    expect(assertiveRegion.style.height).toBe("1px");
    expect(assertiveRegion.style.overflow).toBe("hidden");

    expect(politeRegion.style.position).toBe("absolute");
    expect(politeRegion.style.width).toBe("1px");
    expect(politeRegion.style.height).toBe("1px");
    expect(politeRegion.style.overflow).toBe("hidden");
  });

  // ── Content ────────────────────────────────────────────────────────────

  it("renders empty when no messages are set", () => {
    render(<ErrorAnnouncer />);

    expect(screen.getByTestId("announcer-assertive").textContent).toBe("");
    expect(screen.getByTestId("announcer-polite").textContent).toBe("");
  });

  it("displays assertive message from store", () => {
    useAnnouncerStore.getState().announce("Upload failed", "assertive");

    render(<ErrorAnnouncer />);

    expect(screen.getByTestId("announcer-assertive").textContent).toBe("Upload failed");
    expect(screen.getByTestId("announcer-polite").textContent).toBe("");
  });

  it("displays polite message from store", () => {
    useAnnouncerStore.getState().announce("Analysis started", "polite");

    render(<ErrorAnnouncer />);

    expect(screen.getByTestId("announcer-polite").textContent).toBe("Analysis started");
    expect(screen.getByTestId("announcer-assertive").textContent).toBe("");
  });

  it("displays both messages simultaneously", () => {
    useAnnouncerStore.getState().announce("Error occurred", "assertive");
    useAnnouncerStore.getState().announce("Processing...", "polite");

    render(<ErrorAnnouncer />);

    expect(screen.getByTestId("announcer-assertive").textContent).toBe("Error occurred");
    expect(screen.getByTestId("announcer-polite").textContent).toBe("Processing...");
  });
});
