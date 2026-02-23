import { describe, it, expect } from "vitest";
import { parseTier } from "../../lib/utils/parse-tier";

describe("parseTier", () => {
  // ── Valid tiers ─────────────────────────────────────────────────────────

  it("returns 'free' when given 'free'", () => {
    expect(parseTier("free")).toBe("free");
  });

  it("returns 'premium' when given 'premium'", () => {
    expect(parseTier("premium")).toBe("premium");
  });

  it("returns 'pro' when given 'pro'", () => {
    expect(parseTier("pro")).toBe("pro");
  });

  // ── Invalid strings fall back to 'free' ────────────────────────────────

  it("returns 'free' for an unknown string like 'admin'", () => {
    expect(parseTier("admin")).toBe("free");
  });

  it("returns 'free' for an empty string", () => {
    expect(parseTier("")).toBe("free");
  });

  it("returns 'free' for a mixed-case string like 'Free' (case-sensitive)", () => {
    expect(parseTier("Free")).toBe("free");
  });

  it("returns 'free' for a whitespace-padded tier string", () => {
    expect(parseTier(" free ")).toBe("free");
  });

  // ── Non-string types fall back to 'free' ───────────────────────────────

  it("returns 'free' for null", () => {
    expect(parseTier(null)).toBe("free");
  });

  it("returns 'free' for undefined", () => {
    expect(parseTier(undefined)).toBe("free");
  });

  it("returns 'free' for a number", () => {
    expect(parseTier(1)).toBe("free");
  });

  it("returns 'free' for a boolean", () => {
    expect(parseTier(true)).toBe("free");
  });

  it("returns 'free' for a plain object", () => {
    expect(parseTier({ tier: "premium" })).toBe("free");
  });

  it("returns 'free' for an array", () => {
    expect(parseTier(["pro"])).toBe("free");
  });
});
