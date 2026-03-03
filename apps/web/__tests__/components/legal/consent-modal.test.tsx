import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => ({
  FileSearch: (props: any) => <svg data-testid="icon-file-search" {...props} />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, isLoading, className, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || isLoading} className={className} {...props}>
      {children}
    </button>
  ),
}));

// ─── Store mock ────────────────────────────────────────────────────────────────

const mockSetGeneticDataConsent = vi.fn();
const mockRecordConsent = vi.fn().mockResolvedValue({});

const mockStoreState: Record<string, any> = {
  setGeneticDataConsent: mockSetGeneticDataConsent,
  recordConsent: mockRecordConsent,
};

vi.mock('@/lib/stores/legal-store', () => ({
  useLegalStore: Object.assign(
    (selector: (state: any) => any) => selector(mockStoreState),
    { getState: () => mockStoreState, setState: vi.fn() },
  ),
}));

// ─── IntersectionObserver mock ───────────────────────────────────────────────

let intersectionCallback: IntersectionObserverCallback;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    intersectionCallback = callback;
  }
  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
  root = null;
  rootMargin = '';
  thresholds = [0];
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  value: MockIntersectionObserver,
  writable: true,
});

// ─── Import component after mocks ─────────────────────────────────────────────

import { ConsentModal } from '../../../components/legal/consent-modal';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConsentModal', () => {
  const defaultProps = {
    isOpen: true,
    onAccept: vi.fn(),
    onDecline: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  it('renders modal when isOpen is true', () => {
    render(<ConsentModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Consent for Genetic Data Processing')).toBeInTheDocument();
  });

  it('does NOT render modal when isOpen is false', () => {
    render(<ConsentModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has correct ARIA attributes (role="dialog", aria-modal)', () => {
    render(<ConsentModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'consent-modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'consent-modal-description');
  });

  it('checkbox starts disabled before scrolling to bottom', () => {
    render(<ConsentModal {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('checkbox becomes enabled after scrolling to bottom (IntersectionObserver fires)', () => {
    render(<ConsentModal {...defaultProps} />);

    // Simulate IntersectionObserver detecting the sentinel
    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeDisabled();
  });

  it('Accept button is disabled until checkbox is checked', () => {
    render(<ConsentModal {...defaultProps} />);

    // Simulate scroll to bottom
    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    const acceptButton = screen.getByRole('button', { name: /accept/i });
    expect(acceptButton).toBeDisabled();

    // Check the checkbox
    fireEvent.click(screen.getByRole('checkbox'));
    expect(acceptButton).not.toBeDisabled();
  });

  it('Decline button is always enabled', () => {
    render(<ConsentModal {...defaultProps} />);

    const declineButton = screen.getByRole('button', { name: /decline/i });
    expect(declineButton).not.toBeDisabled();
  });

  it('calls onDecline when Decline button is clicked', () => {
    const onDecline = vi.fn();
    render(<ConsentModal {...defaultProps} onDecline={onDecline} />);

    fireEvent.click(screen.getByRole('button', { name: /decline/i }));
    expect(onDecline).toHaveBeenCalled();
  });

  it('calls onAccept and records consent when Accept is clicked', () => {
    const onAccept = vi.fn();
    render(<ConsentModal {...defaultProps} onAccept={onAccept} />);

    // Scroll to bottom
    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    // Check checkbox
    fireEvent.click(screen.getByRole('checkbox'));

    // Click Accept
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    expect(mockSetGeneticDataConsent).toHaveBeenCalledWith(true);
    expect(mockRecordConsent).toHaveBeenCalledWith("genetic_data_processing", expect.any(String));
    expect(onAccept).toHaveBeenCalled();
  });

  it('locks body scroll when modal is open and restores on unmount', async () => {
    const { unmount } = render(<ConsentModal {...defaultProps} />);

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('hidden');
    });

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('displays the consent text in a scrollable area', () => {
    render(<ConsentModal {...defaultProps} />);

    // Consent text should be visible
    expect(screen.getByText(/explicit.*consent to the processing of.*genetic data/i)).toBeInTheDocument();
  });

  it('calls onDecline when Escape key is pressed', () => {
    const onDecline = vi.fn();
    render(<ConsentModal {...defaultProps} onDecline={onDecline} />);

    // Dispatch Escape keydown event on document
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onDecline).toHaveBeenCalled();
  });

  it('resets checkbox and scroll state when modal closes and reopens', () => {
    const { rerender } = render(<ConsentModal {...defaultProps} />);

    // Scroll to bottom and check checkbox
    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();

    // Close modal
    rerender(<ConsentModal {...defaultProps} isOpen={false} />);

    // Reopen modal
    rerender(<ConsentModal {...defaultProps} isOpen={true} />);

    // Checkbox should be reset
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
