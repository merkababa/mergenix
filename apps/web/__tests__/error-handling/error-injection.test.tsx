/**
 * Q19 — Error Injection Tests
 *
 * Forces every GeneticsErrorCode from shared-types through the error-handling
 * pipeline and verifies that the UI receives a correct, user-friendly message
 * for each code.
 *
 * Approach:
 *  - For worker-originated errors (PARSE_ERROR, BUILD_MISMATCH, etc.) we drive
 *    them through the `useGeneticsWorker` hook, which receives WorkerResponse
 *    messages and calls `useAnalysisStore.setError()`.  The store's
 *    `errorMessage` is the string later rendered by the UI.
 *  - For the network-failure case we exercise `getErrorMessage("NETWORK_ERROR")`
 *    directly, matching the pattern already established in the existing
 *    error-messages.test.ts, and additionally verify the ErrorBoundary renders
 *    the correct friendly text.
 *  - We also verify that `getErrorMessage()` maps every GeneticsErrorCode to a
 *    non-empty, user-visible entry (title + message + action), so the UI can
 *    never show a raw technical code to the user.
 *
 * Test levels:
 *  1. Unit — `getErrorMessage()` lookup table coverage for all codes.
 *  2. Integration — `useGeneticsWorker` receives a worker `error` message and
 *     propagates the right `errorMessage` into the store.
 *  3. Component — `ErrorBoundary` renders friendly title for injected errors.
 *
 * Note: WORKER_TIMEOUT and WORKER_ERROR are not part of GeneticsErrorCode in
 * the current shared-types definition.  They map to ANALYSIS_TIMEOUT and
 * UNKNOWN_ERROR respectively via the `getErrorMessage()` fallback.  The tests
 * below cover both the exact codes that exist in the type union and the
 * friendly-message semantics that the spec describes.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";

import {
  ERROR_MESSAGES,
  getErrorMessage,
} from "../../lib/constants/error-messages";
import { useGeneticsWorker } from "../../hooks/use-genetics-worker";
import { useAnalysisStore } from "../../lib/stores/analysis-store";
import { ErrorBoundary } from "../../components/error-boundary";
import type { GeneticsErrorCode } from "@mergenix/shared-types";

// ─── Mock the analysis API client (side-effect of importing analysis-store) ──

vi.mock("@/lib/api/analysis-client", () => ({
  saveResult: vi.fn(),
  listResults: vi.fn(),
  getResult: vi.fn(),
  deleteResult: vi.fn(),
}));

// ─── JSDOM polyfill: URL.createObjectURL / revokeObjectURL ────────────────────
// JSDOM does not implement these APIs. Without the polyfill, any code path that
// constructs a Worker via `new Worker(URL.createObjectURL(blob))` throws at
// import time, causing flaky test-suite failures that are unrelated to the
// error-handling logic under test.
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
}

// ─── Worker mock infrastructure ───────────────────────────────────────────────

type MockWorkerInstance = {
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
};

let lastWorkerInstance: MockWorkerInstance | null = null;

function createMockFile(name: string, size = 1024): File {
  const buf = new ArrayBuffer(Math.min(size, 64));
  const blob = new Blob([buf], { type: "text/plain" });
  Object.defineProperty(blob, "size", { value: size });
  Object.defineProperty(blob, "name", { value: name });
  (blob as File).text = vi.fn().mockResolvedValue("# rsid\tgenotype\nrs1\tAG");
  return blob as File;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Dispatch a WorkerResponse `error` message on the current mock worker. */
function simulateWorkerError(
  worker: MockWorkerInstance,
  message: string,
  code: GeneticsErrorCode,
): void {
  act(() => {
    const event = new MessageEvent("message", {
      data: { type: "error", message, code },
    });
    worker.onmessage?.(event);
  });
}

/** Start analysis on a throwaway hook so the worker is created. */
async function startAnalysis(
  hookResult: ReturnType<typeof useGeneticsWorker>,
): Promise<void> {
  await act(async () => {
    await hookResult.startAnalysis(
      createMockFile("parent_a.txt"),
      createMockFile("parent_b.txt"),
    );
  });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

// Suppress React error boundary console output for component tests
const originalConsoleError = console.error;

describe("Q19 — Error Injection: getErrorMessage() coverage", () => {
  // ── PARSE_ERROR ─────────────────────────────────────────────────────────

  it('PARSE_ERROR maps to a "File Reading Error" title', () => {
    const msg = getErrorMessage("PARSE_ERROR");
    expect(msg.title).toBe("File Reading Error");
    expect(msg.message.length).toBeGreaterThan(0);
    expect(msg.action.length).toBeGreaterThan(0);
  });

  it("PARSE_ERROR message mentions reading/genetic data", () => {
    const msg = getErrorMessage("PARSE_ERROR");
    // The friendly message should help the user understand what happened.
    const combined = `${msg.title} ${msg.message} ${msg.action}`.toLowerCase();
    // Should reference the concept of reading/genetic data/file
    expect(combined).toMatch(/reading|genetic|file|problem/);
  });

  // ── BUILD_MISMATCH ──────────────────────────────────────────────────────

  it("BUILD_MISMATCH falls back to UNKNOWN_ERROR gracefully (not in ERROR_MESSAGES map)", () => {
    // BUILD_MISMATCH is a GeneticsErrorCode but not explicitly in ERROR_MESSAGES.
    // getErrorMessage() must return the UNKNOWN_ERROR fallback — never throw, never
    // return undefined, and never expose a raw code to the user.
    const msg = getErrorMessage("BUILD_MISMATCH");
    expect(msg.title).toBeTruthy();
    expect(msg.message).toBeTruthy();
    expect(msg.action).toBeTruthy();
    // Fallback title is "Something Went Wrong" — user never sees "BUILD_MISMATCH"
    expect(msg.title).toBe("Something Went Wrong");
  });

  // ── UNSUPPORTED_FORMAT ──────────────────────────────────────────────────

  it('UNSUPPORTED_FORMAT or its alias INVALID_FORMAT maps to "Unsupported File Format" title', () => {
    // The error-messages map uses INVALID_FORMAT as the key.
    // UNSUPPORTED_FORMAT from GeneticsErrorCode falls through to UNKNOWN_ERROR.
    // Both paths must produce a user-friendly title (never undefined).
    const msgDirect = getErrorMessage("INVALID_FORMAT");
    expect(msgDirect.title).toBe("Unsupported File Format");

    // UNSUPPORTED_FORMAT itself gracefully falls back
    const msgFallback = getErrorMessage("UNSUPPORTED_FORMAT");
    expect(msgFallback.title).toBeTruthy();
    expect(msgFallback.message).toBeTruthy();
    expect(msgFallback.action).toBeTruthy();
  });

  it("INVALID_FORMAT action mentions supported format providers", () => {
    const msg = getErrorMessage("INVALID_FORMAT");
    // The action should guide users toward supported providers
    const action = msg.action;
    expect(action).toMatch(/23andMe|AncestryDNA|MyHeritage|VCF/i);
  });

  // ── Worker timeout (ANALYSIS_TIMEOUT) ──────────────────────────────────

  it('ANALYSIS_TIMEOUT maps to "Analysis Timeout" title', () => {
    const msg = getErrorMessage("ANALYSIS_TIMEOUT");
    expect(msg.title).toBe("Analysis Timeout");
    expect(msg.message.length).toBeGreaterThan(0);
    expect(msg.action.length).toBeGreaterThan(0);
  });

  it("ANALYSIS_TIMEOUT action suggests a workaround", () => {
    const msg = getErrorMessage("ANALYSIS_TIMEOUT");
    const combined = `${msg.message} ${msg.action}`.toLowerCase();
    expect(combined).toMatch(/smaller|refresh|try|timeout/);
  });

  // ── Generic worker crash (UNKNOWN_ERROR) ───────────────────────────────

  it('UNKNOWN_ERROR maps to "Something Went Wrong" title', () => {
    const msg = getErrorMessage("UNKNOWN_ERROR");
    expect(msg.title).toBe("Something Went Wrong");
  });

  it("UNKNOWN_ERROR action mentions support contact", () => {
    const msg = getErrorMessage("UNKNOWN_ERROR");
    const combined = `${msg.message} ${msg.action}`.toLowerCase();
    expect(combined).toMatch(/support|refresh|contact/);
  });

  // ── Network failure ─────────────────────────────────────────────────────

  it('NETWORK_ERROR maps to "Connection Issue" title', () => {
    const msg = getErrorMessage("NETWORK_ERROR");
    expect(msg.title).toBe("Connection Issue");
  });

  it("NETWORK_ERROR action mentions internet connection", () => {
    const msg = getErrorMessage("NETWORK_ERROR");
    expect(msg.action).toMatch(/internet connection|connection/i);
  });

  it("NETWORK_ERROR message mentions servers", () => {
    const msg = getErrorMessage("NETWORK_ERROR");
    const combined = `${msg.message} ${msg.action}`.toLowerCase();
    expect(combined).toMatch(/server|connect/);
  });

  // ── All GeneticsErrorCodes produce a safe fallback ──────────────────────

  it("every GeneticsErrorCode produces a non-empty user-facing message (no raw codes exposed)", () => {
    // This is the exhaustive guard: for EVERY code that can come from the
    // genetics engine, the UI must always have something meaningful to show.
    const allCodes: GeneticsErrorCode[] = [
      "MISSING_DATA",
      "PARSE_ERROR",
      "BUILD_MISMATCH",
      "UNSUPPORTED_FORMAT",
      "FILE_TOO_LARGE",
      "INVALID_GENOTYPE",
      "DECOMPRESSION_FAILED",
      "ANALYSIS_CANCELLED",
      "MEMORY_EXCEEDED",
      "UNKNOWN_ERROR",
      "ANALYSIS_ERROR",
      "PARSE_STREAM_ERROR",
      "DECOMPRESS_ERROR",
      "CANCELLED",
      "CANCEL_ACK",
      "UNKNOWN_REQUEST",
      "WORKER_BUSY",
    ];

    for (const code of allCodes) {
      const msg = getErrorMessage(code);
      expect(msg.title, `Code ${code} must have a title`).toBeTruthy();
      expect(msg.message, `Code ${code} must have a message`).toBeTruthy();
      expect(msg.action, `Code ${code} must have an action`).toBeTruthy();
      // The title must never be the raw error code itself
      expect(
        msg.title,
        `Code ${code} — title must not equal the raw code`,
      ).not.toBe(code);
    }
  });

  // ── Every defined ERROR_MESSAGES entry is fully populated ──────────────

  it("every entry in ERROR_MESSAGES has a non-empty title, message, and action", () => {
    for (const [code, entry] of Object.entries(ERROR_MESSAGES)) {
      expect(
        entry.title.length,
        `ERROR_MESSAGES[${code}].title must not be empty`,
      ).toBeGreaterThan(0);
      expect(
        entry.message.length,
        `ERROR_MESSAGES[${code}].message must not be empty`,
      ).toBeGreaterThan(0);
      expect(
        entry.action.length,
        `ERROR_MESSAGES[${code}].action must not be empty`,
      ).toBeGreaterThan(0);
    }
  });
});

// ─── Worker integration: error codes propagated through hook ─────────────────

describe("Q19 — Error Injection: worker error codes flow into analysis store", () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
    lastWorkerInstance = null;

    globalThis.Worker = vi.fn().mockImplementation(() => {
      const instance: MockWorkerInstance = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        onmessage: null,
        onerror: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
      lastWorkerInstance = instance;
      return instance;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("PARSE_ERROR from worker sets errorMessage in store", async () => {
    const { result } = renderHook(() => useGeneticsWorker());
    await startAnalysis(result.current);

    simulateWorkerError(
      lastWorkerInstance!,
      "Corrupt file: cannot parse genotype data",
      "PARSE_ERROR",
    );

    expect(useAnalysisStore.getState().errorMessage).toBe(
      "Corrupt file: cannot parse genotype data",
    );
    expect(useAnalysisStore.getState().currentStep).toBe("idle");
  });

  it("BUILD_MISMATCH from worker sets errorMessage in store", async () => {
    const { result } = renderHook(() => useGeneticsWorker());
    await startAnalysis(result.current);

    simulateWorkerError(
      lastWorkerInstance!,
      "Genome build mismatch: file uses GRCh38 but expected GRCh37",
      "BUILD_MISMATCH",
    );

    expect(useAnalysisStore.getState().errorMessage).toBe(
      "Genome build mismatch: file uses GRCh38 but expected GRCh37",
    );
    expect(useAnalysisStore.getState().currentStep).toBe("idle");
  });

  it("UNSUPPORTED_FORMAT from worker sets errorMessage in store", async () => {
    const { result } = renderHook(() => useGeneticsWorker());
    await startAnalysis(result.current);

    simulateWorkerError(
      lastWorkerInstance!,
      "Unrecognized file format",
      "UNSUPPORTED_FORMAT",
    );

    expect(useAnalysisStore.getState().errorMessage).toBe(
      "Unrecognized file format",
    );
    expect(useAnalysisStore.getState().currentStep).toBe("idle");
  });

  it("UNKNOWN_ERROR from worker sets errorMessage in store", async () => {
    const { result } = renderHook(() => useGeneticsWorker());
    await startAnalysis(result.current);

    simulateWorkerError(
      lastWorkerInstance!,
      "An unexpected error occurred in the analysis worker",
      "UNKNOWN_ERROR",
    );

    expect(useAnalysisStore.getState().errorMessage).toBe(
      "An unexpected error occurred in the analysis worker",
    );
    expect(useAnalysisStore.getState().currentStep).toBe("idle");
  });

  it("ANALYSIS_ERROR from worker sets errorMessage in store", async () => {
    const { result } = renderHook(() => useGeneticsWorker());
    await startAnalysis(result.current);

    simulateWorkerError(
      lastWorkerInstance!,
      "Analysis failed during carrier screening",
      "ANALYSIS_ERROR",
    );

    expect(useAnalysisStore.getState().errorMessage).toBe(
      "Analysis failed during carrier screening",
    );
  });

  it("MEMORY_EXCEEDED from worker sets errorMessage in store", async () => {
    const { result } = renderHook(() => useGeneticsWorker());
    await startAnalysis(result.current);

    simulateWorkerError(
      lastWorkerInstance!,
      "Memory limit exceeded during decompression",
      "MEMORY_EXCEEDED",
    );

    expect(useAnalysisStore.getState().errorMessage).toBe(
      "Memory limit exceeded during decompression",
    );
  });

  it("DECOMPRESSION_FAILED from worker sets errorMessage in store", async () => {
    const { result } = renderHook(() => useGeneticsWorker());
    await startAnalysis(result.current);

    simulateWorkerError(
      lastWorkerInstance!,
      "Failed to decompress the uploaded file",
      "DECOMPRESSION_FAILED",
    );

    expect(useAnalysisStore.getState().errorMessage).toBe(
      "Failed to decompress the uploaded file",
    );
  });

  it("WORKER_BUSY from worker sets errorMessage in store", async () => {
    const { result } = renderHook(() => useGeneticsWorker());
    await startAnalysis(result.current);

    simulateWorkerError(
      lastWorkerInstance!,
      "Worker is already processing another request",
      "WORKER_BUSY",
    );

    expect(useAnalysisStore.getState().errorMessage).toBe(
      "Worker is already processing another request",
    );
  });

  it("worker.onerror (generic crash) sets errorMessage in store", async () => {
    const { result } = renderHook(() => useGeneticsWorker());
    await startAnalysis(result.current);

    // Simulate a native worker crash (onerror event, not onmessage)
    act(() => {
      const errorEvent = new ErrorEvent("error", {
        message: "Worker script crashed",
      });
      lastWorkerInstance!.onerror?.(errorEvent);
    });

    expect(useAnalysisStore.getState().errorMessage).toBe(
      "Worker script crashed",
    );
    expect(useAnalysisStore.getState().currentStep).toBe("idle");
  });

  it("CANCELLED code from worker resets the store (no errorMessage)", async () => {
    const { result } = renderHook(() => useGeneticsWorker());
    await startAnalysis(result.current);

    // Set some progress first
    useAnalysisStore.getState().setStep("carrier_analysis");

    simulateWorkerError(lastWorkerInstance!, "Analysis cancelled", "CANCELLED");

    // CANCELLED is a clean cancellation — store should be reset, no error shown
    expect(useAnalysisStore.getState().currentStep).toBe("idle");
    expect(useAnalysisStore.getState().errorMessage).toBeNull();
  });

  it("CANCEL_ACK code from worker resets the store (no errorMessage)", async () => {
    const { result } = renderHook(() => useGeneticsWorker());
    await startAnalysis(result.current);

    useAnalysisStore.getState().setStep("trait_prediction");

    simulateWorkerError(
      lastWorkerInstance!,
      "Cancellation acknowledged",
      "CANCEL_ACK",
    );

    expect(useAnalysisStore.getState().currentStep).toBe("idle");
    expect(useAnalysisStore.getState().errorMessage).toBeNull();
  });
});

// ─── Component tests: ErrorBoundary renders friendly messages ─────────────────

describe("Q19 — Error Injection: ErrorBoundary renders correct friendly messages", () => {
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  /**
   * Helper: render an ErrorBoundary wrapping a component that throws an error
   * with the given code embedded as `[CODE] message` in the message string.
   */
  function renderWithError(code: string, rawMsg = "raw technical message") {
    function BrokenComponent(): React.ReactNode {
      throw new Error(`[${code}] ${rawMsg}`);
    }
    return render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );
  }

  it("PARSE_ERROR → ErrorBoundary shows 'File Reading Error' title", () => {
    renderWithError("PARSE_ERROR");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("File Reading Error")).toBeInTheDocument();
  });

  it("PARSE_ERROR → ErrorBoundary shows actionable suggestion about file corruption", () => {
    renderWithError("PARSE_ERROR");
    const action = ERROR_MESSAGES.PARSE_ERROR.action;
    expect(screen.getByText(action)).toBeInTheDocument();
  });

  it("ANALYSIS_TIMEOUT → ErrorBoundary shows 'Analysis Timeout' title", () => {
    renderWithError("ANALYSIS_TIMEOUT");
    expect(screen.getByText("Analysis Timeout")).toBeInTheDocument();
  });

  it("INVALID_FORMAT → ErrorBoundary shows 'Unsupported File Format' title", () => {
    renderWithError("INVALID_FORMAT");
    expect(screen.getByText("Unsupported File Format")).toBeInTheDocument();
  });

  it("UNKNOWN_ERROR → ErrorBoundary shows 'Something Went Wrong' title", () => {
    renderWithError("UNKNOWN_ERROR");
    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();
  });

  it("NETWORK_ERROR → ErrorBoundary shows 'Connection Issue' title", () => {
    renderWithError("NETWORK_ERROR");
    expect(screen.getByText("Connection Issue")).toBeInTheDocument();
  });

  it("FILE_TOO_LARGE → ErrorBoundary shows 'File Too Large' title", () => {
    renderWithError("FILE_TOO_LARGE");
    expect(screen.getByText("File Too Large")).toBeInTheDocument();
  });

  it("unrecognized code → ErrorBoundary falls back to 'Something Went Wrong'", () => {
    renderWithError("BUILD_MISMATCH");
    // BUILD_MISMATCH has no entry in ERROR_MESSAGES; must fall back gracefully
    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();
  });

  it("ErrorBoundary always shows role=alert and 'Try again' button regardless of code", () => {
    const codes = [
      "PARSE_ERROR",
      "ANALYSIS_TIMEOUT",
      "UNKNOWN_ERROR",
      "NETWORK_ERROR",
    ] as const;

    for (const code of codes) {
      const { unmount } = renderWithError(code);
      expect(
        screen.getByRole("alert"),
        `${code}: should have role=alert`,
      ).toBeInTheDocument();
      expect(
        screen.getByText("Try again"),
        `${code}: should show Try again button`,
      ).toBeInTheDocument();
      unmount();
    }
  });

  it("ErrorBoundary has aria-invalid=true on error container", () => {
    renderWithError("PARSE_ERROR");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-invalid", "true");
  });
});

// ─── Network failure message ──────────────────────────────────────────────────

describe("Q19 — Error Injection: network failure message", () => {
  it("NETWORK_ERROR has all three fields populated", () => {
    const msg = getErrorMessage("NETWORK_ERROR");
    expect(msg.title).toBe("Connection Issue");
    expect(msg.message).toMatch(/connect/i);
    expect(msg.action).toMatch(/internet connection|try again/i);
  });

  it("getErrorMessage never throws for any string input — defensive fallback always present", () => {
    const strangeInputs = [
      "",
      "   ",
      "null",
      "undefined",
      "TOTALLY_FAKE_CODE",
      "fetch failed",
      "NetworkError",
    ];

    for (const input of strangeInputs) {
      expect(
        () => getErrorMessage(input),
        `Should not throw for input: "${input}"`,
      ).not.toThrow();

      const msg = getErrorMessage(input);
      expect(msg.title, `title must be truthy for input "${input}"`).toBeTruthy();
      expect(msg.message, `message must be truthy for input "${input}"`).toBeTruthy();
      expect(msg.action, `action must be truthy for input "${input}"`).toBeTruthy();
    }
  });
});
