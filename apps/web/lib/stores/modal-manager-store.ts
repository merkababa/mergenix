"use client";

import { create } from "zustand";

// ── Types ─────────────────────────────────────────────────────────────────

interface ModalManagerState {
  /** Stack of currently open modal IDs (most recent on top). */
  modalStack: string[];

  /** Whether any modal is currently open. */
  isAnyOpen: boolean;

  /**
   * Open a modal by ID. Pushes it onto the stack.
   * Sets aria-hidden="true" on #main-content.
   */
  openModal: (id: string) => void;

  /**
   * Close a modal by ID. Removes it from the stack.
   * When the stack is empty, removes aria-hidden from #main-content.
   */
  closeModal: (id: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function setMainContentHidden(hidden: boolean): void {
  if (typeof document === "undefined") return;
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  if (hidden) {
    mainContent.setAttribute("aria-hidden", "true");
  } else {
    mainContent.removeAttribute("aria-hidden");
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useModalManager = create<ModalManagerState>()((set, get) => ({
  modalStack: [],
  isAnyOpen: false,

  openModal: (id) => {
    const { modalStack } = get();
    // Prevent duplicate entries for the same modal
    if (modalStack.includes(id)) return;

    const newStack = [...modalStack, id];
    set({ modalStack: newStack, isAnyOpen: true });
    setMainContentHidden(true);
  },

  closeModal: (id) => {
    const { modalStack } = get();
    const newStack = modalStack.filter((modalId) => modalId !== id);
    const isAnyOpen = newStack.length > 0;
    set({ modalStack: newStack, isAnyOpen });
    setMainContentHidden(isAnyOpen);
  },
}));
