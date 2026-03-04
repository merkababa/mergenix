import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

import { mockLucideIcons, mockGlassCardFactory, mockButtonFactory, mockBadgeFactory } from '../../__helpers__';

vi.mock('lucide-react', () => mockLucideIcons('Sparkles', 'ArrowRight', 'Shield', 'X', 'AlertCircle', 'AlertTriangle', 'Check'));

// Mock ChipDisclosureModal (rendered by UpgradeModal for chip limitation gate)
vi.mock('@/components/legal/chip-disclosure-modal', () => ({
  ChipDisclosureModal: ({ isOpen, onContinue, onCancel }: { isOpen: boolean; onContinue: () => void; onCancel: () => void }) =>
    isOpen ? (
      <div data-testid="chip-disclosure-modal">
        <button onClick={onContinue}>Continue to Payment</button>
        <button onClick={onCancel}>Cancel Disclosure</button>
      </div>
    ) : null,
}));

// Mock legal store — chip limitation defaults to acknowledged so existing tests pass unchanged
const mockLegalStoreState: Record<string, any> = {
  chipLimitationAcknowledged: true,
};

vi.mock('@/lib/stores/legal-store', () => ({
  useLegalStore: Object.assign(
    (selector: (state: any) => any) => selector(mockLegalStoreState),
    { getState: () => mockLegalStoreState, setState: vi.fn() },
  ),
}));

vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());

vi.mock('@/components/ui/badge', () => mockBadgeFactory({ includeVariant: true }));

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
    // Premium is $14.99, Pro is $34.99, difference is $20.00
    expect(screen.getByText('$20.00')).toBeInTheDocument();
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
    // $14.99 appears both in the plan comparison area and in the price display
    const priceElements = screen.getAllByText('$14.99');
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

  // ── Chip disclosure gate tests ────────────────────────────────────────

  describe('chip disclosure gate', () => {
    it('shows ChipDisclosureModal when chipLimitationAcknowledged is false and Confirm is clicked', async () => {
      // Override the legal store mock to indicate chip limitation is NOT acknowledged
      mockLegalStoreState.chipLimitationAcknowledged = false;

      render(<UpgradeModal {...defaultProps} />);

      const confirmButton = screen.getByText('Confirm Upgrade');

      await act(async () => {
        fireEvent.click(confirmButton);
      });

      // ChipDisclosureModal should now be visible
      expect(screen.getByTestId('chip-disclosure-modal')).toBeInTheDocument();

      // createCheckout should NOT have been called yet (blocked by disclosure gate)
      expect(mockCreateCheckout).not.toHaveBeenCalled();

      // Restore default for subsequent tests
      mockLegalStoreState.chipLimitationAcknowledged = true;
    });

    it('proceeds to checkout after acknowledging chip limitation', async () => {
      mockLegalStoreState.chipLimitationAcknowledged = false;
      mockCreateCheckout.mockResolvedValue({
        checkoutUrl: 'https://stripe.com/checkout',
        sessionId: 'sess_1',
      });

      // Mock window.location.href
      const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        href: '',
      } as Location);

      render(<UpgradeModal {...defaultProps} />);

      // Step 1: Click Confirm Upgrade — should show chip disclosure
      const confirmButton = screen.getByText('Confirm Upgrade');
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      expect(screen.getByTestId('chip-disclosure-modal')).toBeInTheDocument();

      // Step 2: Click "Continue to Payment" in the ChipDisclosureModal mock
      const continueButton = screen.getByText('Continue to Payment');
      await act(async () => {
        fireEvent.click(continueButton);
      });

      // Checkout should now have been called
      await waitFor(() => {
        expect(mockCreateCheckout).toHaveBeenCalledWith('pro');
      });

      locationSpy.mockRestore();
      mockLegalStoreState.chipLimitationAcknowledged = true;
    });
  });
});
