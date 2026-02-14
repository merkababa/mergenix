import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const {
        initial, animate, exit, transition, variants,
        whileHover, whileTap, ...htmlProps
      } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => <svg data-testid="icon-alert-triangle" {...props} />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, isLoading, className, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || isLoading} className={className} {...props}>
      {children}
    </button>
  ),
}));

// ─── Store mock ────────────────────────────────────────────────────────────────

const mockSetChipLimitationAcknowledged = vi.fn();

const mockStoreState: Record<string, any> = {
  setChipLimitationAcknowledged: mockSetChipLimitationAcknowledged,
};

vi.mock('@/lib/stores/legal-store', () => ({
  useLegalStore: Object.assign(
    (selector: (state: any) => any) => selector(mockStoreState),
    { getState: () => mockStoreState, setState: vi.fn() },
  ),
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { ChipDisclosureModal } from '../../../components/legal/chip-disclosure-modal';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ChipDisclosureModal', () => {
  const defaultProps = {
    isOpen: true,
    onContinue: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  it('renders modal when isOpen is true', () => {
    render(<ChipDisclosureModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Important: Test Limitations')).toBeInTheDocument();
  });

  it('does NOT render modal when isOpen is false', () => {
    render(<ChipDisclosureModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has correct ARIA attributes (role="dialog", aria-modal)', () => {
    render(<ChipDisclosureModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'chip-disclosure-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'chip-disclosure-description');
  });

  it('displays the chip limitation text', () => {
    render(<ChipDisclosureModal {...defaultProps} />);

    expect(screen.getByText(/Direct-to-consumer genetic tests analyze approximately 600,000 to 700,000/)).toBeInTheDocument();
  });

  it('checkbox starts unchecked', () => {
    render(<ChipDisclosureModal {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('Continue to Analysis button is disabled until checkbox is checked', () => {
    render(<ChipDisclosureModal {...defaultProps} />);

    const continueButton = screen.getByRole('button', { name: /continue to analysis/i });
    expect(continueButton).toBeDisabled();

    // Check the checkbox
    fireEvent.click(screen.getByRole('checkbox'));
    expect(continueButton).not.toBeDisabled();
  });

  it('Cancel button is always enabled', () => {
    render(<ChipDisclosureModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).not.toBeDisabled();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ChipDisclosureModal {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onContinue and records acknowledgment when Continue is clicked', () => {
    const onContinue = vi.fn();
    render(<ChipDisclosureModal {...defaultProps} onContinue={onContinue} />);

    // Check checkbox
    fireEvent.click(screen.getByRole('checkbox'));

    // Click Continue to Analysis
    fireEvent.click(screen.getByRole('button', { name: /continue to analysis/i }));

    expect(mockSetChipLimitationAcknowledged).toHaveBeenCalledWith(true);
    expect(onContinue).toHaveBeenCalled();
  });

  it('locks body scroll when modal is open and restores on unmount', async () => {
    const { unmount } = render(<ChipDisclosureModal {...defaultProps} />);

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('hidden');
    });

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('calls onCancel when Escape key is pressed', () => {
    const onCancel = vi.fn();
    render(<ChipDisclosureModal {...defaultProps} onCancel={onCancel} />);

    // Dispatch Escape keydown event on document
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onCancel).toHaveBeenCalled();
  });

  it('resets checkbox when modal closes and reopens', () => {
    const { rerender } = render(<ChipDisclosureModal {...defaultProps} />);

    // Check checkbox
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();

    // Close modal
    rerender(<ChipDisclosureModal {...defaultProps} isOpen={false} />);

    // Reopen modal
    rerender(<ChipDisclosureModal {...defaultProps} isOpen={true} />);

    // Checkbox should be reset
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('checkbox toggles when clicked multiple times', () => {
    render(<ChipDisclosureModal {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});
