/**
 * CPRA SPI Modal — integration tests.
 *
 * TDD: Tests written FIRST (RED), then implementation (GREEN).
 *
 * Coverage:
 * - Modal renders with correct ARIA attributes
 * - Close button fires onClose
 * - Backdrop click fires onClose
 * - Escape key fires onClose
 * - Focus is moved into the modal on open (focus trap active)
 * - Tab key cycles within modal (focus trap behavior via useFocusTrap)
 * - Shift+Tab wraps back to last focusable element
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { mockLucideIcons } from '../../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => mockLucideIcons('X', 'Shield'));

vi.mock('@/lib/constants/legal-placeholders', () => ({
  CPRA_SPI_NOTICE: 'Title\n\nParagraph one text.\n\n• Bullet item one\n• Bullet item two',
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { CpraSpiModal } from '../../../components/legal/cpra-spi-modal';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CpraSpiModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders the modal dialog with correct ARIA attributes', () => {
    render(<CpraSpiModal onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
  });

  it('renders the title text', () => {
    render(<CpraSpiModal onClose={onClose} />);
    expect(
      screen.getByText('Limit the Use of My Sensitive Personal Information'),
    ).toBeInTheDocument();
  });

  it('renders CPRA subtitle', () => {
    render(<CpraSpiModal onClose={onClose} />);
    expect(screen.getByText('California Privacy Rights Act (CPRA)')).toBeInTheDocument();
  });

  // ── Close behaviour ──────────────────────────────────────────────────────

  it('calls onClose when the close button is clicked', () => {
    render(<CpraSpiModal onClose={onClose} />);
    const closeButton = screen.getByLabelText('Close SPI notice');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<CpraSpiModal onClose={onClose} />);
    // The backdrop is role="presentation"
    const backdrop = document.querySelector('[role="presentation"]')!;
    expect(backdrop).toBeTruthy();
    // Simulate click where target === currentTarget (direct backdrop click)
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<CpraSpiModal onClose={onClose} />);
    const backdrop = document.querySelector('[role="presentation"]')!;
    fireEvent.keyDown(backdrop, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when a non-Escape key is pressed', () => {
    render(<CpraSpiModal onClose={onClose} />);
    const backdrop = document.querySelector('[role="presentation"]')!;
    fireEvent.keyDown(backdrop, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── Focus management ─────────────────────────────────────────────────────

  it('moves focus into the modal (or dialog panel) on mount', () => {
    render(<CpraSpiModal onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    // Focus should be somewhere inside the dialog after mount
    const activeEl = document.activeElement;
    expect(activeEl).not.toBeNull();
    expect(activeEl).not.toBe(document.body);
    // Active element should be inside the dialog container or be the dialog itself
    expect(dialog.contains(activeEl) || activeEl === dialog).toBe(true);
  });

  it('Tab key wraps focus from last focusable element to first (focus trap)', () => {
    render(<CpraSpiModal onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    // There should be at least one focusable element (the close button)
    expect(focusable.length).toBeGreaterThan(0);

    const lastFocusable = focusable[focusable.length - 1];
    lastFocusable.focus();
    expect(document.activeElement).toBe(lastFocusable);

    // Tab from last should wrap to first
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true }),
      );
    });

    expect(document.activeElement).toBe(focusable[0]);
  });

  it('Shift+Tab key wraps focus from first focusable element to last (focus trap)', () => {
    render(<CpraSpiModal onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    expect(focusable.length).toBeGreaterThan(0);

    const firstFocusable = focusable[0];
    firstFocusable.focus();
    expect(document.activeElement).toBe(firstFocusable);

    // Shift+Tab from first should wrap to last
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
      );
    });

    expect(document.activeElement).toBe(focusable[focusable.length - 1]);
  });
});
