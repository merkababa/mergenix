import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useModalManager } from '../../hooks/use-modal-manager';

describe('useModalManager', () => {
  let mainContent: HTMLElement;

  beforeEach(() => {
    // Create a #main-content element in the DOM
    mainContent = document.createElement('main');
    mainContent.id = 'main-content';
    document.body.appendChild(mainContent);

    // Reset store
    useModalManager.setState({ modalStack: [], isAnyOpen: false });
  });

  afterEach(() => {
    document.body.removeChild(mainContent);
  });

  // ── Initial State ──────────────────────────────────────────────────────

  it('has empty modal stack initially', () => {
    const state = useModalManager.getState();
    expect(state.modalStack).toEqual([]);
    expect(state.isAnyOpen).toBe(false);
  });

  // ── openModal ──────────────────────────────────────────────────────────

  describe('openModal', () => {
    it('adds modal ID to the stack', () => {
      useModalManager.getState().openModal('cookie-consent');

      const state = useModalManager.getState();
      expect(state.modalStack).toEqual(['cookie-consent']);
      expect(state.isAnyOpen).toBe(true);
    });

    it('sets aria-hidden on #main-content', () => {
      useModalManager.getState().openModal('age-verify');

      expect(mainContent.getAttribute('aria-hidden')).toBe('true');
    });

    it('supports nested modals (stacking)', () => {
      useModalManager.getState().openModal('age-verify');
      useModalManager.getState().openModal('confirmation');

      const state = useModalManager.getState();
      expect(state.modalStack).toEqual(['age-verify', 'confirmation']);
      expect(state.isAnyOpen).toBe(true);
    });

    it('prevents duplicate entries for the same modal ID', () => {
      useModalManager.getState().openModal('cookie-consent');
      useModalManager.getState().openModal('cookie-consent');

      expect(useModalManager.getState().modalStack).toEqual(['cookie-consent']);
    });
  });

  // ── closeModal ─────────────────────────────────────────────────────────

  describe('closeModal', () => {
    it('removes modal ID from the stack', () => {
      useModalManager.getState().openModal('cookie-consent');
      useModalManager.getState().closeModal('cookie-consent');

      const state = useModalManager.getState();
      expect(state.modalStack).toEqual([]);
      expect(state.isAnyOpen).toBe(false);
    });

    it('removes aria-hidden from #main-content when all modals close', () => {
      useModalManager.getState().openModal('cookie-consent');
      expect(mainContent.getAttribute('aria-hidden')).toBe('true');

      useModalManager.getState().closeModal('cookie-consent');
      expect(mainContent.getAttribute('aria-hidden')).toBeNull();
    });

    it('keeps aria-hidden when nested modals remain open', () => {
      useModalManager.getState().openModal('age-verify');
      useModalManager.getState().openModal('confirmation');

      useModalManager.getState().closeModal('confirmation');

      expect(useModalManager.getState().modalStack).toEqual(['age-verify']);
      expect(useModalManager.getState().isAnyOpen).toBe(true);
      expect(mainContent.getAttribute('aria-hidden')).toBe('true');
    });

    it('handles closing a modal not in the stack gracefully', () => {
      useModalManager.getState().openModal('age-verify');
      useModalManager.getState().closeModal('nonexistent');

      expect(useModalManager.getState().modalStack).toEqual(['age-verify']);
      expect(useModalManager.getState().isAnyOpen).toBe(true);
    });

    it('closes modals in any order (not just LIFO)', () => {
      useModalManager.getState().openModal('first');
      useModalManager.getState().openModal('second');
      useModalManager.getState().openModal('third');

      // Close middle modal
      useModalManager.getState().closeModal('second');

      expect(useModalManager.getState().modalStack).toEqual(['first', 'third']);
      expect(useModalManager.getState().isAnyOpen).toBe(true);
    });
  });
});
