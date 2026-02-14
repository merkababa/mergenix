import { create } from "zustand";

// ── Types ─────────────────────────────────────────────────────────────────

interface AnnouncerState {
  assertiveMessage: string;
  politeMessage: string;
  announce: (message: string, priority?: "polite" | "assertive") => void;
  clear: () => void;
}

// ── Timer tracking ────────────────────────────────────────────────────────

let assertiveTimer: ReturnType<typeof setTimeout> | null = null;
let politeTimer: ReturnType<typeof setTimeout> | null = null;

/** Auto-clear delay in milliseconds. */
const AUTO_CLEAR_MS = 5000;

// ── Store ─────────────────────────────────────────────────────────────────

export const useAnnouncerStore = create<AnnouncerState>()((set) => ({
  assertiveMessage: "",
  politeMessage: "",

  announce: (message, priority = "assertive") => {
    if (priority === "assertive") {
      // Clear any existing assertive timer
      if (assertiveTimer !== null) {
        clearTimeout(assertiveTimer);
      }
      set({ assertiveMessage: message });
      assertiveTimer = setTimeout(() => {
        set({ assertiveMessage: "" });
        assertiveTimer = null;
      }, AUTO_CLEAR_MS);
    } else {
      // Clear any existing polite timer
      if (politeTimer !== null) {
        clearTimeout(politeTimer);
      }
      set({ politeMessage: message });
      politeTimer = setTimeout(() => {
        set({ politeMessage: "" });
        politeTimer = null;
      }, AUTO_CLEAR_MS);
    }
  },

  clear: () => {
    if (assertiveTimer !== null) {
      clearTimeout(assertiveTimer);
      assertiveTimer = null;
    }
    if (politeTimer !== null) {
      clearTimeout(politeTimer);
      politeTimer = null;
    }
    set({ assertiveMessage: "", politeMessage: "" });
  },
}));
