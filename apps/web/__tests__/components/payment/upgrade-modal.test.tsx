import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Sparkles: (props: Record<string, unknown>) => <svg data-testid="icon-sparkles" {...props} />,
  ArrowRight: (props: Record<string, unknown>) => <svg data-testid="icon-arrow-right" {...props} />,
  Shield: (props: Record<string, unknown>) => <svg data-testid="icon-shield" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="icon-x" {...props} />,
  AlertCircle: (props: Record<string, unknown>) => <svg data-testid="icon-alert" {...props} />,
  Check: (props: Record<string, unknown>) => <svg data-testid="icon-check" {...props} />,
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
    <div data-testid="glass-card" className={className} {...props}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, isLoading, ...props }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; isLoading?: boolean; [key: string]: unknown }) => (
    <button onClick={onClick} disabled={disabled || isLoading} {...props}>
      {isLoading && <span data-testid="loading-spinner" />}
      {children}
    </button>
  ),
  buttonVariants: () => 'mock-button-class',
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: { children: React.ReactNode; variant?: string; [key: string]: unknown }) => (
    <span data-testid={`badge-${variant}`} {...props}>{children}</span>
  ),
}));

// ─── Store mock ───────────────────────────────────────────────────────────────

const mockCreateCheckout = vi.fn();

vi.mock('@/lib/stores/payment-store', () => ({
  usePaymentStore: vi.fn(),
}));

import { usePaymentStore } from '@/lib/stores/payment-store';

const mockUsePaymentStore = vi.mocked(usePaymentStore);

// ─── Import component after mocks ─────────────────────────────────────────────

import { UpgradeModal } from '../../../components/payment/upgrade-modal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupPaymentStore(overrides: Record<string, unknown> = {}) {
  const defaultState = {
    createCheckout: mockCreateCheckout,
    isCheckoutLoading: false,
    ...overrides,
  };

  mockUsePaymentStore.mockImplementation((selector?: any) => {
    if (selector) return selector(defaultState);
    return defaultState;
  });
}

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  targetTier: 'pro' as const,
  currentTier: 'premium' as const,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UpgradeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPaymentStore();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <UpgradeModal {...defaultProps} isOpen={false} />,
    );
    // Modal should not be in the document
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should show target tier name in heading', () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
  });

  it('should show current plan vs target plan comparison', () => {
    render(<UpgradeModal {...defaultProps} />);
    // Current tier badge
    expect(screen.getByTestId('badge-premium')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    // Target tier badge
    expect(screen.getByTestId('badge-pro')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    // Arrow between them
    expect(screen.getByTestId('icon-arrow-right')).toBeInTheDocument();
  });

  it('should show "Pay the difference" for Premium->Pro upgrade', () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText('Pay the difference')).toBeInTheDocument();
    // Premium is $12.90, Pro is $29.90, difference is $17.00
    expect(screen.getByText('$17.00')).toBeInTheDocument();
  });

  it('should show full price for Free->Premium upgrade', () => {
    render(
      <UpgradeModal
        {...defaultProps}
        currentTier="free"
        targetTier="premium"
      />,
    );
    expect(screen.getByText('One-time payment')).toBeInTheDocument();
    // $12.90 appears both in the plan comparison area and in the price display
    const priceElements = screen.getAllByText('$12.90');
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should show new features list', () => {
    render(<UpgradeModal {...defaultProps} />);
    // "What you get" heading
    expect(screen.getByText('What you get')).toBeInTheDocument();
    // Pro has features that Premium doesn't have. Check for at least one unique Pro feature.
    expect(screen.getByText('PDF export')).toBeInTheDocument();
  });

  it('should call createCheckout on confirm click', async () => {
    mockCreateCheckout.mockResolvedValue({ checkoutUrl: 'https://stripe.com/checkout', sessionId: 'sess_1' });

    // Mock window.location.href
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
    } as Location);

    render(<UpgradeModal {...defaultProps} />);

    const confirmButton = screen.getByText('Confirm Upgrade');

    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockCreateCheckout).toHaveBeenCalledWith('pro');
    });

    locationSpy.mockRestore();
  });

  it('should show loading state during checkout', () => {
    setupPaymentStore({ isCheckoutLoading: true });

    render(<UpgradeModal {...defaultProps} />);

    // Confirm button shows "Processing..." and is disabled
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    const confirmButton = screen.getByText('Processing...').closest('button')!;
    expect(confirmButton).toBeDisabled();
  });

  it('should show error message when checkout fails', async () => {
    mockCreateCheckout.mockRejectedValue(new Error('Payment processing failed'));

    render(<UpgradeModal {...defaultProps} />);

    const confirmButton = screen.getByText('Confirm Upgrade');

    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Payment processing failed')).toBeInTheDocument();
  });

  it('should call onClose when cancel button clicked', () => {
    const onClose = vi.fn();
    render(<UpgradeModal {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when Escape key pressed', () => {
    const onClose = vi.fn();
    render(<UpgradeModal {...defaultProps} onClose={onClose} />);

    // Dispatch Escape keydown event on document
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onClose).toHaveBeenCalled();
  });
});
