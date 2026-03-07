import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAnnouncerStore } from '../../lib/stores/announcer-store';

describe('useAnnouncerStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store to initial state
    useAnnouncerStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Initial State ──────────────────────────────────────────────────────

  it('has empty messages initially', () => {
    const state = useAnnouncerStore.getState();
    expect(state.assertiveMessage).toBe('');
    expect(state.politeMessage).toBe('');
  });

  // ── announce() ─────────────────────────────────────────────────────────

  describe('announce', () => {
    it('sets assertive message by default', () => {
      useAnnouncerStore.getState().announce('Error occurred');

      expect(useAnnouncerStore.getState().assertiveMessage).toBe('Error occurred');
      expect(useAnnouncerStore.getState().politeMessage).toBe('');
    });

    it("sets assertive message when priority is 'assertive'", () => {
      useAnnouncerStore.getState().announce('Critical error', 'assertive');

      expect(useAnnouncerStore.getState().assertiveMessage).toBe('Critical error');
      expect(useAnnouncerStore.getState().politeMessage).toBe('');
    });

    it("sets polite message when priority is 'polite'", () => {
      useAnnouncerStore.getState().announce('Status update', 'polite');

      expect(useAnnouncerStore.getState().politeMessage).toBe('Status update');
      expect(useAnnouncerStore.getState().assertiveMessage).toBe('');
    });

    it('auto-clears assertive message after 5 seconds', () => {
      useAnnouncerStore.getState().announce('Error', 'assertive');
      expect(useAnnouncerStore.getState().assertiveMessage).toBe('Error');

      vi.advanceTimersByTime(5000);
      expect(useAnnouncerStore.getState().assertiveMessage).toBe('');
    });

    it('auto-clears polite message after 5 seconds', () => {
      useAnnouncerStore.getState().announce('Info', 'polite');
      expect(useAnnouncerStore.getState().politeMessage).toBe('Info');

      vi.advanceTimersByTime(5000);
      expect(useAnnouncerStore.getState().politeMessage).toBe('');
    });

    it('replaces and restarts timer for assertive messages', () => {
      useAnnouncerStore.getState().announce('First error', 'assertive');

      // Advance 3 seconds (not enough to auto-clear)
      vi.advanceTimersByTime(3000);
      expect(useAnnouncerStore.getState().assertiveMessage).toBe('First error');

      // Replace with new message — timer restarts
      useAnnouncerStore.getState().announce('Second error', 'assertive');
      expect(useAnnouncerStore.getState().assertiveMessage).toBe('Second error');

      // Advance 3 more seconds (6 total from first, 3 from second)
      vi.advanceTimersByTime(3000);
      expect(useAnnouncerStore.getState().assertiveMessage).toBe('Second error');

      // Advance 2 more seconds (5 total from second)
      vi.advanceTimersByTime(2000);
      expect(useAnnouncerStore.getState().assertiveMessage).toBe('');
    });

    it('replaces and restarts timer for polite messages', () => {
      useAnnouncerStore.getState().announce('First info', 'polite');

      vi.advanceTimersByTime(3000);
      useAnnouncerStore.getState().announce('Second info', 'polite');

      vi.advanceTimersByTime(4999);
      expect(useAnnouncerStore.getState().politeMessage).toBe('Second info');

      vi.advanceTimersByTime(1);
      expect(useAnnouncerStore.getState().politeMessage).toBe('');
    });

    it('handles assertive and polite messages independently', () => {
      useAnnouncerStore.getState().announce('Error', 'assertive');
      useAnnouncerStore.getState().announce('Status', 'polite');

      expect(useAnnouncerStore.getState().assertiveMessage).toBe('Error');
      expect(useAnnouncerStore.getState().politeMessage).toBe('Status');

      vi.advanceTimersByTime(5000);
      expect(useAnnouncerStore.getState().assertiveMessage).toBe('');
      expect(useAnnouncerStore.getState().politeMessage).toBe('');
    });
  });

  // ── clear() ────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('clears both messages', () => {
      useAnnouncerStore.getState().announce('Error', 'assertive');
      useAnnouncerStore.getState().announce('Status', 'polite');

      useAnnouncerStore.getState().clear();

      expect(useAnnouncerStore.getState().assertiveMessage).toBe('');
      expect(useAnnouncerStore.getState().politeMessage).toBe('');
    });

    it('cancels pending timers so auto-clear does not fire', () => {
      useAnnouncerStore.getState().announce('Error', 'assertive');
      useAnnouncerStore.getState().announce('Status', 'polite');

      useAnnouncerStore.getState().clear();

      // Set new messages after clear
      useAnnouncerStore.getState().announce('New error', 'assertive');
      useAnnouncerStore.getState().announce('New status', 'polite');

      // Old timers should not have fired — only the new timer matters
      vi.advanceTimersByTime(4999);
      expect(useAnnouncerStore.getState().assertiveMessage).toBe('New error');
      expect(useAnnouncerStore.getState().politeMessage).toBe('New status');
    });
  });
});
